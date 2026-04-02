import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const companyId = await getCompanyIdFromRequest(request, auth.userId);

        if (!companyId) {
            return NextResponse.json({ entries: [] });
        }

        // Obtener entradas de diario (JournalEntry)
        if (!(prisma as any).journalEntry) {
            console.error('Prisma model "journalEntry" is not available in the current client');
            return NextResponse.json({ entries: [] });
        }

        const { searchParams } = new URL(request.url);
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');
        const dateFilter = startDateParam && endDateParam ? {
            gte: new Date(startDateParam + 'T00:00:00.000Z'),
            lte: new Date(endDateParam + 'T23:59:59.999Z'),
        } : undefined;

        const entries = await (prisma as any).journalEntry.findMany({
            where: { companyId, ...(dateFilter ? { date: dateFilter } : {}) },
            include: {
                lines: {
                    include: {
                        account: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });

        // Agrupar por transacción para mostrar una vista amigable
        // En un sistema real, esto se haría con una relación o agregación
        // Por ahora, devolvemos las entradas crudas filtradas

        return NextResponse.json({ entries });
    } catch (error: any) {
        console.error('Error in GET /api/ledger:', error);
        return NextResponse.json(
            { error: 'Error al obtener el libro mayor', details: error.message },
            { status: 500 }
        );
    }
}
