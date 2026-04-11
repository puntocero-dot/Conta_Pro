/**
 * Motor de Cumplimiento Anti-Lavado de Dinero (ALD)
 * Basado en: Ley Contra el Lavado de Dinero y Activos (El Salvador)
 * UIF — Unidad de Investigación Financiera
 * 
 * Funcionalidades:
 * 1. Detección de transacciones que superan umbral de $10,000 USD
 * 2. Detección de patrones de estructuración (transacciones fraccionadas)
 * 3. Verificación de KYC (Know Your Customer) — bloqueante con token admin
 * 4. Generación de alertas para el Oficial de Cumplimiento
 */

import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// ── Configuración AML (Anti Money Laundering) ──────────────────────────────────

export const AML_CONFIG = {
  /** Umbral en efectivo para alertas (Ley ALD Art. 9) */
  CASH_THRESHOLD: 10_000,
  /** Ventana de días para detectar estructuración */
  STRUCTURING_WINDOW_DAYS: 30,
  /** Monto acumulado sospechoso en ventana temporal */
  STRUCTURING_THRESHOLD: 25_000,
  /** Umbral bajo el cual se sospecha fraccionamiento intencional */
  STRUCTURING_INDIVIDUAL_MAX: 9_500,
  /** Cantidad mínima de transacciones para sospechar estructuración */
  STRUCTURING_MIN_COUNT: 3,
} as const;

// ── Tipos ────────────────────────────────────────────────────────────────────────

export type AlertType = 'THRESHOLD_EXCEEDED' | 'STRUCTURING_SUSPECTED' | 'KYC_MISSING' | 'MANUAL';
export type AlertStatus = 'PENDING' | 'REVIEWED' | 'REPORTED' | 'DISMISSED';

export interface ComplianceCheckResult {
  allowed: boolean;
  alerts: { alertType: AlertType; description: string; amount: number }[];
  requiresKYC: boolean;
  bypassToken?: string;
}

// ── Verificación principal de transacción ────────────────────────────────────────

/**
 * Verifica una transacción contra las reglas de cumplimiento AML.
 * Retorna si la operación está permitida o bloqueada.
 */
export async function checkTransactionCompliance(
  companyId: string,
  amount: number,
  clientId: string | null | undefined,
  description: string,
  bypassToken?: string
): Promise<ComplianceCheckResult> {
  const alerts: ComplianceCheckResult['alerts'] = [];
  let requiresKYC = false;
  let allowed = true;

  // ── 1. Verificar umbral de $10,000 ────────────────────────────────────
  if (amount >= AML_CONFIG.CASH_THRESHOLD) {
    alerts.push({
      alertType: 'THRESHOLD_EXCEEDED',
      description: `Transacción de $${amount.toLocaleString()} supera el umbral de $${AML_CONFIG.CASH_THRESHOLD.toLocaleString()} (Ley ALD Art. 9)`,
      amount,
    });

    // Verificar KYC del cliente si existe
    if (clientId) {
      const kycRecord = await prisma.kYCRecord.findFirst({
        where: {
          clientId,
          companyId,
          status: 'VERIFIED',
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      });

      if (!kycRecord) {
        requiresKYC = true;
        allowed = false; // BLOQUEANTE: sin KYC verificado no se permite

        alerts.push({
          alertType: 'KYC_MISSING',
          description: `Cliente sin expediente KYC verificado. Transacciones ≥$10,000 requieren KYC válido.`,
          amount,
        });
      }
    } else {
      // Sin cliente asociado + monto alto = requiere KYC
      requiresKYC = true;
      allowed = false;

      alerts.push({
        alertType: 'KYC_MISSING',
        description: `Transacción ≥$10,000 sin cliente asociado. Debe vincular un cliente con KYC verificado.`,
        amount,
      });
    }
  }

  // ── 2. Detectar patrones de estructuración ─────────────────────────────
  if (clientId && amount < AML_CONFIG.CASH_THRESHOLD && amount >= AML_CONFIG.STRUCTURING_INDIVIDUAL_MAX) {
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - AML_CONFIG.STRUCTURING_WINDOW_DAYS);

    const recentTransactions = await prisma.transaction.findMany({
      where: {
        companyId,
        clientId,
        status: 'ACTIVE',
        date: { gte: windowStart },
      },
      select: { amount: true },
    });

    const totalRecent = recentTransactions.reduce((s, t) => s + t.amount, 0) + amount;
    const count = recentTransactions.length + 1;

    if (totalRecent >= AML_CONFIG.STRUCTURING_THRESHOLD && count >= AML_CONFIG.STRUCTURING_MIN_COUNT) {
      alerts.push({
        alertType: 'STRUCTURING_SUSPECTED',
        description: `Patrón sospechoso: ${count} transacciones sumando $${totalRecent.toLocaleString()} en ${AML_CONFIG.STRUCTURING_WINDOW_DAYS} días con el mismo cliente. Posible estructuración.`,
        amount: totalRecent,
      });
    }
  }

  // ── 3. Verificar bypass token del admin ────────────────────────────────
  if (!allowed && bypassToken) {
    const validToken = await validateAdminBypassToken(companyId, bypassToken);
    if (validToken) {
      allowed = true;
      // Se permite pero se mantienen las alertas para registro
    }
  }

  // ── 4. Persistir alertas en la base de datos ──────────────────────────
  for (const alert of alerts) {
    await prisma.complianceAlert.create({
      data: {
        companyId,
        alertType: alert.alertType,
        amount: alert.amount,
        description: alert.description,
        status: 'PENDING',
        metadata: {
          originalAmount: amount,
          clientId,
          transactionDescription: description,
          bypassUsed: !!(bypassToken && allowed),
        },
      },
    });
  }

  return { allowed, alerts, requiresKYC };
}

// ── Generación de token temporal de bypass ───────────────────────────────────────

/**
 * Genera un token temporal para que un admin autorice una operación
 * que normalmente sería bloqueada por KYC faltante.
 * Token válido por 1 hora.
 */
export async function generateAdminBypassToken(
  companyId: string,
  adminUserId: string,
  reason: string
): Promise<string> {
  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

  // Guardar en ComplianceAlert como registro de auditoría
  await prisma.complianceAlert.create({
    data: {
      companyId,
      alertType: 'MANUAL',
      amount: 0,
      description: `Token de bypass generado por admin: ${reason}`,
      status: 'REVIEWED',
      reviewedBy: adminUserId,
      reviewedAt: new Date(),
      metadata: {
        bypassToken: token,
        expiresAt: expiresAt.toISOString(),
        reason,
      },
    },
  });

  return token;
}

/**
 * Valida que un token de bypass sea válido y no haya expirado
 */
async function validateAdminBypassToken(companyId: string, token: string): Promise<boolean> {
  const alert = await prisma.complianceAlert.findFirst({
    where: {
      companyId,
      alertType: 'MANUAL',
      status: 'REVIEWED',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!alert?.metadata) return false;

  const meta = alert.metadata as Record<string, unknown>;
  if (meta.bypassToken !== token) return false;

  const expiresAt = new Date(meta.expiresAt as string);
  return expiresAt > new Date();
}

// ── Estadísticas de cumplimiento ─────────────────────────────────────────────────

export async function getComplianceStats(companyId: string) {
  const [pending, reviewed, reported, total] = await Promise.all([
    prisma.complianceAlert.count({ where: { companyId, status: 'PENDING' } }),
    prisma.complianceAlert.count({ where: { companyId, status: 'REVIEWED' } }),
    prisma.complianceAlert.count({ where: { companyId, status: 'REPORTED' } }),
    prisma.complianceAlert.count({ where: { companyId } }),
  ]);

  const pendingKYC = await prisma.kYCRecord.count({
    where: { companyId, status: 'PENDING' },
  });

  const expiredKYC = await prisma.kYCRecord.count({
    where: {
      companyId,
      status: 'VERIFIED',
      expiresAt: { lt: new Date() },
    },
  });

  return { pending, reviewed, reported, total, pendingKYC, expiredKYC };
}
