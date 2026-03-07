import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
        const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

        // Get user's company
        const userRecord = await prisma.user.findUnique({
            where: { id: auth.userId },
            include: { companies: true },
        });

        if (!userRecord || userRecord.companies.length === 0) {
            return NextResponse.json({
                totalIngresos: 0,
                totalEgresos: 0,
                balance: 0,
                iva: 0,
                transactionCount: 0,
                byCategory: [],
            });
        }

        const companyId = userRecord.companies[0].id;

        // Calculate date range
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        // Get transactions for period
        const transactions = await prisma.transaction.findMany({
            where: {
                companyId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                category: true,
            },
        });

        // Calculate totals
        const totalIngresos = transactions
            .filter(t => t.type === 'INGRESO')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalEgresos = transactions
            .filter(t => t.type === 'EGRESO')
            .reduce((sum, t) => sum + t.amount, 0);

        const balance = totalIngresos - totalEgresos;

        // IVA = 13% of ingresos (El Salvador rate)
        const iva = totalIngresos * 0.13;

        // Group by category
        const categoryMap = new Map<string, number>();
        transactions.forEach(t => {
            const current = categoryMap.get(t.category.name) || 0;
            categoryMap.set(t.category.name, current + t.amount);
        });

        const byCategory = Array.from(categoryMap.entries())
            .map(([name, amount]) => ({
                name,
                amount,
                percentage: (amount / (totalIngresos + totalEgresos)) * 100,
            }))
            .sort((a, b) => b.amount - a.amount);

        return NextResponse.json({
            totalIngresos,
            totalEgresos,
            balance,
            iva,
            transactionCount: transactions.length,
            byCategory,
        });
    } catch (error) {
        console.error('Error generating report:', error);
        return NextResponse.json(
            { error: 'Error al generar reporte' },
            { status: 500 }
        );
    }
}
