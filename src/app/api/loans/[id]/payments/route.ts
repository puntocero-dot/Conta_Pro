import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth/jwt';
import { apiError } from '@/lib/api/error-response';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        const companyId = request.headers.get('x-company-id');
        if (!companyId) return NextResponse.json({ error: 'Empresa requerida' }, { status: 400 });

        const loan = await prisma.loan.findFirst({ where: { id, companyId } });
        if (!loan) return NextResponse.json({ error: 'Préstamo no encontrado' }, { status: 404 });

        const payments = await prisma.loanPayment.findMany({
            where: { loanId: id },
            orderBy: { paymentDate: 'asc' },
        });

        return NextResponse.json({ loan, payments });
    } catch (error) {
        return apiError('Error al obtener pagos', 500, error);
    }
}

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

        const loan = await prisma.loan.findFirst({ where: { id, companyId } });
        if (!loan) return NextResponse.json({ error: 'Préstamo no encontrado' }, { status: 404 });
        if (loan.status === 'CLOSED') return NextResponse.json({ error: 'Préstamo ya cerrado' }, { status: 409 });

        const body = await request.json();
        const { paymentDate, totalPayment, notes } = body;

        if (!paymentDate || !totalPayment) {
            return NextResponse.json({ error: 'Fecha y monto requeridos' }, { status: 400 });
        }

        const monthlyRate = loan.interestRate / 100 / 12;
        const interest = Math.round(loan.balance * monthlyRate * 100) / 100;
        const principal = Math.round((totalPayment - interest) * 100) / 100;
        const newBalance = Math.max(0, Math.round((loan.balance - principal) * 100) / 100);

        // Get or create categories
        const getOrCreateCategory = async (name: string, color: string) => {
            let cat = await prisma.category.findFirst({ where: { companyId, name, type: 'EGRESO' } });
            if (!cat) cat = await prisma.category.create({ data: { name, type: 'EGRESO', color, icon: '🏦', companyId } });
            return cat;
        };

        const [catPrincipal, catIntereses] = await Promise.all([
            getOrCreateCategory('Abono a Capital — Préstamos', '#3b82f6'),
            getOrCreateCategory('Intereses Bancarios', '#f97316'),
        ]);

        // Record transactions and payment in a single DB transaction
        const [paymentRecord] = await prisma.$transaction([
            prisma.loanPayment.create({
                data: {
                    loanId: id,
                    paymentDate: new Date(paymentDate + 'T12:00:00.000Z'),
                    totalPayment: parseFloat(totalPayment),
                    principal,
                    interest,
                    balance: newBalance,
                    notes,
                },
            }),
            // Transaction for capital repayment
            prisma.transaction.create({
                data: {
                    companyId,
                    type: 'EGRESO',
                    amount: principal,
                    description: `Abono capital — ${loan.bankName}${notes ? ` (${notes})` : ''}`,
                    date: new Date(paymentDate + 'T12:00:00.000Z'),
                    categoryId: catPrincipal.id,
                    userId: auth.userId,
                    metadata: { cashFlowCategory: 'FINANCING', loanId: id, concept: 'LOAN_PRINCIPAL' },
                },
            }),
            // Transaction for interest
            ...(interest > 0 ? [prisma.transaction.create({
                data: {
                    companyId,
                    type: 'EGRESO',
                    amount: interest,
                    description: `Intereses — ${loan.bankName}${notes ? ` (${notes})` : ''}`,
                    date: new Date(paymentDate + 'T12:00:00.000Z'),
                    categoryId: catIntereses.id,
                    userId: auth.userId,
                    metadata: { cashFlowCategory: 'OPERATING', loanId: id, concept: 'LOAN_INTEREST' },
                },
            })] : []),
            // Update loan balance
            prisma.loan.update({
                where: { id },
                data: {
                    balance: newBalance,
                    status: newBalance === 0 ? 'CLOSED' : 'ACTIVE',
                },
            }),
        ]);

        return NextResponse.json({ payment: paymentRecord }, { status: 201 });
    } catch (error) {
        return apiError('Error al registrar pago', 500, error);
    }
}
