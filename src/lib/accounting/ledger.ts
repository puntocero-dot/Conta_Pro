import { prisma } from '@/lib/prisma';
import { AMLService } from '@/lib/fintech/aml';

export interface AccountingTransactionInput {
    companyId: string;
    amount: number;
    category: string; // Ej: "Combustible", "Pago a Proveedor"
    description: string;
    reference?: string;
    date?: Date;
    country?: string;
}

export interface LedgerRule {
    debit: string;
    credit: string;
    tax?: number;
    aml_limit?: number;
}

/**
 * Servicio de Contabilidad Invisible
 * Automatiza la creación de partidas dobles basadas en reglas de negocio.
 */
export class LedgerService {
    /**
     * Procesa una transacción y genera el asiento contable correspondiente.
     */
    static async processTransaction(input: AccountingTransactionInput) {
        const { companyId, amount, category, description, country = 'SV' } = input;

        // 1. Escudo AML (Análisis de Riesgo)
        const amlResult = await AMLService.analyzeTransaction(companyId, amount, description);
        if (amlResult.isSuspicious) {
            await AMLService.logAlert(companyId, amlResult, {
                id: input.reference,
                amount,
                description
            });
        }

        // 2. Buscar Regla en el Motor de Reglas
        const rule = await prisma.countryRule.findFirst({
            where: {
                country,
                triggerText: {
                    contains: category,
                    mode: 'insensitive',
                },
            },
        });

        if (!rule) {
            // No lanzamos error para no bloquear la transacción principal, solo advertimos
            console.warn(`[Ledger] No se encontró una regla contable para la categoría: ${category}`);
            return null;
        }

        const rulesJson = (rule.rules as unknown) as LedgerRule;
        const taxRate = rulesJson.tax || 0;
        const iva = amount * taxRate;
        const subtotal = amount - iva;

        // 3. Generar el Asiento Contable (Journal Entry)
        const entry = await prisma.journalEntry.create({
            data: {
                companyId,
                description,
                reference: input.reference,
                date: input.date || new Date(),
                metadata: {
                    category,
                    ruleId: rule.id,
                    automated: true,
                },
                lines: {
                    create: [
                        {
                            accountId: await this.getAccountIdByCode(companyId, rulesJson.debit),
                            debit: parseFloat(subtotal.toFixed(2)),
                            credit: 0,
                        },
                        {
                            accountId: await this.getAccountIdByCode(companyId, '110601'), // IVA Crédito Fiscal por defecto
                            debit: parseFloat(iva.toFixed(2)),
                            credit: 0,
                        },
                        {
                            accountId: await this.getAccountIdByCode(companyId, rulesJson.credit),
                            debit: 0,
                            credit: parseFloat(amount.toFixed(2)),
                        },
                    ],
                },
            },
            include: {
                lines: true,
            },
        });

        return entry;
    }

    /**
     * Obtiene o crea una cuenta contable por código para una empresa.
     */
    private static async getAccountIdByCode(companyId: string, code: string) {
        let account = await prisma.account.findUnique({
            where: {
                companyId_code: { companyId, code },
            },
        });

        if (!account) {
            // Si la cuenta no existe, la creamos (Modo "Auto-setup" para este MVP)
            account = await prisma.account.create({
                data: {
                    companyId,
                    code,
                    name: this.getDefaultAccountName(code),
                    type: this.getAccountType(code),
                },
            });
        }

        return account.id;
    }

    private static getDefaultAccountName(code: string): string {
        const map: Record<string, string> = {
            '1101': 'Caja / Efectivo',
            '1106': 'IVA Crédito Fiscal',
            '5102': 'Gastos de Operación',
            '4101': 'Ventas de Bienes y Servicios',
            '1102': 'Bancos / Cuentas Corrientes',
            '2101': 'Proveedores locales',
            '5103': 'Gastos Administrativos',
            '5104': 'Gastos de Venta',
            '1103': 'Cuentas por Cobrar Clientes',
        };

        // Intenta match exacto primero, luego por los primeros 4 dígitos
        return map[code] || map[code.substring(0, 4)] || `Cuenta ${code}`;
    }

    private static getAccountType(code: string): string {
        const firstDigit = code[0];
        const types: Record<string, string> = {
            '1': 'Activo',
            '2': 'Pasivo',
            '3': 'Patrimonio',
            '4': 'Ingreso',
            '5': 'Gasto',
        };
        return types[firstDigit] || 'Otros';
    }

    private static async logSecurityAlert(companyId: string, amount: number, type: string) {
        console.warn(`[AML ALERT] ${type} for company ${companyId}: $${amount}`);
        // Aquí se conectaría con el dashboard del Auditor
    }
}
