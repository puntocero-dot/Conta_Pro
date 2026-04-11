/**
 * Motor de Reglas Fiscales Configurables
 * Reemplaza valores hardcoded (IVA 13%, ISR 25%, etc.) por un sistema
 * basado en base de datos, configurable por país y vigencia temporal.
 * 
 * Soporta expansión a Guatemala, Honduras, etc.
 * Fallback a constantes SV cuando no hay regla en DB.
 */

import { prisma } from '@/lib/prisma';

// ── Constantes fallback SV (se usan si no hay regla en DB) ──────────────────

const SV_FALLBACK_RATES: Record<string, number> = {
  IVA: 0.13,
  ISR_25: 0.25,
  ISR_30: 0.30,
  ISR_THRESHOLD: 150_000,
  PAGO_A_CUENTA: 0.0175,
  AFP_LABORAL: 0.0725,
  AFP_PATRONAL: 0.0875,
  ISSS_LABORAL: 0.03,
  ISSS_PATRONAL: 0.075,
  ISSS_MAX_BASE: 1000,
  INSAFORP: 0.01,
  INSAFORP_MAX_BASE: 1000,
};

// ── Servicio principal ──────────────────────────────────────────────────────────

export class TaxRuleService {
  /**
   * Obtiene la tasa vigente para un tipo de regla en un país
   * @param countryCode Código del país (SV, GT, HN)
   * @param ruleType Tipo de regla (IVA, ISR, AFP_LABORAL, etc.)
   * @param date Fecha de referencia (default: hoy)
   */
  static async getRate(
    countryCode: string,
    ruleType: string,
    date?: Date
  ): Promise<number> {
    const referenceDate = date ?? new Date();

    try {
      const rule = await prisma.taxRule.findFirst({
        where: {
          countryCode,
          ruleType,
          effectiveFrom: { lte: referenceDate },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: referenceDate } },
          ],
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (rule) return rule.rate;
    } catch {
      // Si la tabla no existe aún o hay error, usar fallback
    }

    // Fallback a constantes SV
    return SV_FALLBACK_RATES[ruleType] ?? 0;
  }

  /**
   * Obtiene la tasa de ISR según el tramo de ingresos
   */
  static async getISRRate(
    countryCode: string,
    annualRevenue: number,
    date?: Date
  ): Promise<number> {
    const referenceDate = date ?? new Date();

    try {
      // Buscar reglas ISR ordenadas por threshold desc
      const rules = await prisma.taxRule.findMany({
        where: {
          countryCode,
          ruleType: { startsWith: 'ISR' },
          effectiveFrom: { lte: referenceDate },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: referenceDate } },
          ],
        },
        orderBy: { threshold: 'desc' },
      });

      if (rules.length > 0) {
        // Encontrar la regla cuyo threshold aplique
        for (const rule of rules) {
          if (rule.threshold && annualRevenue > rule.threshold) {
            return rule.rate;
          }
        }
        // Si ningún threshold aplica, usar la tasa más baja
        return rules[rules.length - 1].rate;
      }
    } catch {
      // Fallback
    }

    // Fallback SV: 25% ≤ $150k, 30% > $150k
    return annualRevenue > (SV_FALLBACK_RATES.ISR_THRESHOLD ?? 150000)
      ? SV_FALLBACK_RATES.ISR_30
      : SV_FALLBACK_RATES.ISR_25;
  }

  /**
   * Obtiene el máximo de base imponible para una regla (ej. ISSS max $1000)
   */
  static async getMaxBase(
    countryCode: string,
    ruleType: string,
    date?: Date
  ): Promise<number | null> {
    const referenceDate = date ?? new Date();

    try {
      const rule = await prisma.taxRule.findFirst({
        where: {
          countryCode,
          ruleType,
          effectiveFrom: { lte: referenceDate },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: referenceDate } },
          ],
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (rule) return rule.maxBase;
    } catch {
      // Fallback
    }

    return SV_FALLBACK_RATES[`${ruleType}_MAX_BASE`] ?? null;
  }

  /**
   * Obtiene todas las reglas activas para un país
   */
  static async getAllRules(countryCode: string, date?: Date) {
    const referenceDate = date ?? new Date();

    try {
      return await prisma.taxRule.findMany({
        where: {
          countryCode,
          effectiveFrom: { lte: referenceDate },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: referenceDate } },
          ],
        },
        orderBy: [{ ruleType: 'asc' }, { effectiveFrom: 'desc' }],
      });
    } catch {
      return [];
    }
  }
}

// ── Seed de reglas SV iniciales ─────────────────────────────────────────────────

export const SV_INITIAL_TAX_RULES = [
  { countryCode: 'SV', ruleType: 'IVA', name: 'IVA El Salvador', rate: 0.13, effectiveFrom: new Date('2000-01-01') },
  { countryCode: 'SV', ruleType: 'ISR_25', name: 'ISR Tramo Base', rate: 0.25, threshold: 0, effectiveFrom: new Date('2000-01-01') },
  { countryCode: 'SV', ruleType: 'ISR_30', name: 'ISR Tramo Alto', rate: 0.30, threshold: 150000, effectiveFrom: new Date('2000-01-01') },
  { countryCode: 'SV', ruleType: 'PAGO_A_CUENTA', name: 'Pago a Cuenta', rate: 0.0175, effectiveFrom: new Date('2000-01-01') },
  { countryCode: 'SV', ruleType: 'AFP_LABORAL', name: 'AFP Laboral', rate: 0.0725, effectiveFrom: new Date('2000-01-01') },
  { countryCode: 'SV', ruleType: 'AFP_PATRONAL', name: 'AFP Patronal', rate: 0.0875, effectiveFrom: new Date('2000-01-01') },
  { countryCode: 'SV', ruleType: 'ISSS_LABORAL', name: 'ISSS Laboral', rate: 0.03, maxBase: 1000, effectiveFrom: new Date('2000-01-01') },
  { countryCode: 'SV', ruleType: 'ISSS_PATRONAL', name: 'ISSS Patronal', rate: 0.075, maxBase: 1000, effectiveFrom: new Date('2000-01-01') },
  { countryCode: 'SV', ruleType: 'INSAFORP', name: 'INSAFORP', rate: 0.01, maxBase: 1000, effectiveFrom: new Date('2000-01-01') },
];
