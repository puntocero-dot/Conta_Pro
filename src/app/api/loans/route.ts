import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth/jwt';
import { apiError } from '@/lib/api/error-response';

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        const companyId = request.headers.get('x-company-id');
        if (!companyId) return NextResponse.json({ error: 'Empresa requerida' }, { status: 400 });

        const loans = await prisma.loan.findMany({
            where: { companyId },
            include: {
                payments: { orderBy: { paymentDate: 'desc' }, take: 1 },
                _count: { select: { payments: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ loans });
    } catch (error) {
        return apiError('Error al obtener préstamos', 500, error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        const companyId = request.headers.get('x-company-id');
        if (!companyId) return NextResponse.json({ error: 'Empresa requerida' }, { status: 400 });

        const body = await request.json();
        const { bankName, description, originalAmount, interestRate, termMonths, startDate } = body;

        if (!bankName || !originalAmount || !interestRate || !termMonths || !startDate) {
            return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
        }

        const loan = await prisma.loan.create({
            data: {
                companyId,
                bankName,
                description,
                originalAmount: parseFloat(originalAmount),
                balance: parseFloat(originalAmount),
                interestRate: parseFloat(interestRate),
                termMonths: parseInt(termMonths),
                startDate: new Date(startDate),
            },
        });

        return NextResponse.json({ loan }, { status: 201 });
    } catch (error) {
        return apiError('Error al crear préstamo', 500, error);
    }
}
