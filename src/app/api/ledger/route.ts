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

        // Obtener entradas de diario (Ledger)
        const entries = await (prisma as any).ledgerEntry.findMany({
            where: { companyId },
            include: {
                account: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
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
