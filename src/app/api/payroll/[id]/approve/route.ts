import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth/jwt';
import { apiError } from '@/lib/api/error-response';

/**
 * POST /api/payroll/[id]/approve
 * Aprueba la planilla y genera las transacciones EGRESO correspondientes:
 *  1. Pago neto de sueldos (salida de caja)
 *  2. Cotizaciones AFP (laboral + patronal) → cuentas por pagar AFP
 *  3. Cotizaciones ISSS (laboral + patronal) → cuentas por pagar ISSS
 *  4. INSAFORP → cuentas por pagar INSAFORP
 *  5. ISR retenido → cuentas por pagar DGI
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        const companyId = request.headers.get('x-company-id');
        if (!companyId) return NextResponse.json({ error: 'Empresa requerida' }, { status: 400 });

        const payroll = await prisma.payroll.findFirst({
            where: { id, companyId },
            include: { employees: true },
        });
        if (!payroll) return NextResponse.json({ error: 'Planilla no encontrada' }, { status: 404 });
        if (payroll.status !== 'DRAFT') {
            return NextResponse.json({ error: 'Solo se pueden aprobar planillas en estado BORRADOR' }, { status: 409 });
        }

        const body = await request.json().catch(() => ({}));
        const paymentDate = body.paymentDate || new Date().toISOString().split('T')[0];

        // Find or create EGRESO categories for payroll concepts
        const getOrCreateCategory = async (name: string, color: string) => {
            let cat = await prisma.category.findFirst({ where: { companyId, name, type: 'EGRESO' } });
            if (!cat) {
                cat = await prisma.category.create({
                    data: { name, type: 'EGRESO', color, icon: '💼', companyId },
                });
            }
            return cat;
        };

        const [catSueldos, catAfp, catIsss, catInsaforp, catIsr] = await Promise.all([
            getOrCreateCategory('Sueldos y Salarios', '#6366f1'),
            getOrCreateCategory('AFP Patronal', '#8b5cf6'),
            getOrCreateCategory('ISSS Patronal', '#06b6d4'),
            getOrCreateCategory('INSAFORP', '#f59e0b'),
            getOrCreateCategory('ISR Retenido Empleados', '#ef4444'),
        ]);

        const period = payroll.period; // "2025-01"
        const [year, month] = period.split('-');
        const periodLabel = `${month}/${year}`;

        // Create transactions in bulk
        const transactions = await prisma.$transaction([
            // 1. Pago neto de sueldos
            prisma.transaction.create({
                data: {
                    companyId,
                    type: 'EGRESO',
                    amount: payroll.totalNeto,
                    description: `Pago de planilla ${periodLabel} — salarios netos (${payroll.employees.length} empleados)`,
                    date: new Date(paymentDate + 'T12:00:00.000Z'),
                    categoryId: catSueldos.id,
                    userId: auth.userId,
                    metadata: {
                        cashFlowCategory: 'OPERATING',
                        payrollId: payroll.id,
                        concept: 'SUELDOS_NETOS',
                    },
                },
            }),
            // 2. AFP total (laboral + patronal)
            prisma.transaction.create({
                data: {
                    companyId,
                    type: 'EGRESO',
                    amount: payroll.totalAFPLaboral + payroll.totalAFPPatronal,
                    description: `AFP planilla ${periodLabel} — laboral $${payroll.totalAFPLaboral.toFixed(2)} + patronal $${payroll.totalAFPPatronal.toFixed(2)}`,
                    date: new Date(paymentDate + 'T12:00:00.000Z'),
                    categoryId: catAfp.id,
                    userId: auth.userId,
                    metadata: {
                        cashFlowCategory: 'OPERATING',
                        payrollId: payroll.id,
                        concept: 'AFP',
                        afpLaboral: payroll.totalAFPLaboral,
                        afpPatronal: payroll.totalAFPPatronal,
                    },
                },
            }),
            // 3. ISSS total (laboral + patronal)
            prisma.transaction.create({
                data: {
                    companyId,
                    type: 'EGRESO',
                    amount: payroll.totalISSSLaboral + payroll.totalISSSPatronal,
                    description: `ISSS planilla ${periodLabel} — laboral $${payroll.totalISSSLaboral.toFixed(2)} + patronal $${payroll.totalISSSPatronal.toFixed(2)}`,
                    date: new Date(paymentDate + 'T12:00:00.000Z'),
                    categoryId: catIsss.id,
                    userId: auth.userId,
                    metadata: {
                        cashFlowCategory: 'OPERATING',
                        payrollId: payroll.id,
                        concept: 'ISSS',
                    },
                },
            }),
            // 4. INSAFORP
            ...(payroll.totalINSAFORP > 0 ? [prisma.transaction.create({
                data: {
                    companyId,
                    type: 'EGRESO',
                    amount: payroll.totalINSAFORP,
                    description: `INSAFORP planilla ${periodLabel}`,
                    date: new Date(paymentDate + 'T12:00:00.000Z'),
                    categoryId: catInsaforp.id,
                    userId: auth.userId,
                    metadata: {
                        cashFlowCategory: 'OPERATING',
                        payrollId: payroll.id,
                        concept: 'INSAFORP',
                    },
                },
            })] : []),
            // 5. ISR retenido
            ...(payroll.totalISR > 0 ? [prisma.transaction.create({
                data: {
                    companyId,
                    type: 'EGRESO',
                    amount: payroll.totalISR,
                    description: `ISR retenido empleados planilla ${periodLabel}`,
                    date: new Date(paymentDate + 'T12:00:00.000Z'),
                    categoryId: catIsr.id,
                    userId: auth.userId,
                    metadata: {
                        cashFlowCategory: 'OPERATING',
                        payrollId: payroll.id,
                        concept: 'ISR_RETENIDO',
                    },
                },
            })] : []),
        ]);

        // Mark payroll as PAID
        const updated = await prisma.payroll.update({
            where: { id },
            data: {
                status: 'PAID',
                transactionId: transactions[0].id,
            },
            include: { employees: true },
        });

        return NextResponse.json({ payroll: updated, transactionCount: transactions.length });
    } catch (error) {
        return apiError('Error al aprobar planilla', 500, error);
    }
}
