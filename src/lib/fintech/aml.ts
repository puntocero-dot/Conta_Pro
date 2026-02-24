import { prisma } from '@/lib/prisma';

export interface AMLCheckResult {
    isSuspicious: boolean;
    score: number;
    reasons: string[];
}

/**
 * Servicio de Cumplimiento AML/CFT (Anti-Lavado de Dinero)
 */
export class AMLService {
    private static THRESHOLD_USD = 10000;

    /**
     * Realiza un análisis de riesgo sobre una transacción.
     */
    static async analyzeTransaction(companyId: string, amount: number, description: string): Promise<AMLCheckResult> {
        const reasons: string[] = [];
        let score = 0;

        // 1. Verificación de Umbral (Reporte obligatorio UIF)
        if (amount >= this.THRESHOLD_USD) {
            reasons.push('THRESHOLD_EXCEEDED: Transacción superior a $10,000.');
            score += 80;
        }

        // 2. Detección de Fraccionamiento ("Pitufeo")
        // Buscamos transacciones similares en las últimas 24 horas
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentTransactions = await prisma.transaction.findMany({
            where: {
                companyId,
                date: { gte: oneDayAgo },
                amount: { gte: 5000, lt: 10000 }, // Transacciones "casi" en el límite
            },
        });

        if (recentTransactions.length >= 2) {
            reasons.push('STRUCTURING_DETECTED: Múltiples transacciones cercanas al límite en 24h.');
            score += 50;
        }

        // 3. Análisis de Palabras Clave (Sensibles)
        const sensitiveKeywords = ['casino', 'crypto exchange', 'limpieza', 'donación anónima'];
        if (sensitiveKeywords.some(kw => description.toLowerCase().includes(kw))) {
            reasons.push('SENSITIVE_KEYWORD: Descripción contiene términos de alto riesgo.');
            score += 40;
        }

        return {
            isSuspicious: score >= 50,
            score,
            reasons,
        };
    }

    /**
     * Registra una alerta en el log de auditoría.
     */
    static async logAlert(companyId: string, result: AMLCheckResult, transactionData: any) {
        if (result.isSuspicious) {
            await prisma.auditLog.create({
                data: {
                    action: 'AML_ALERT',
                    resource: 'Transaction',
                    resourceId: transactionData.id,
                    result: 'WARNING',
                    ipAddress: 'SYSTEM',
                    userAgent: 'Conta2go-AML-Engine',
                    metadata: {
                        score: result.score,
                        reasons: result.reasons,
                        transactionAmount: transactionData.amount,
                    },
                },
            });
        }
    }
}
