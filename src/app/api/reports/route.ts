import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';
import { apiError } from '@/lib/api/error-response';

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
        const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

        const companyId = await getCompanyIdFromRequest(request, auth.userId);

        if (!companyId) {
            return NextResponse.json({
                totalIngresos: 0,
                totalEgresos: 0,
                balance: 0,
                iva: 0,
                transactionCount: 0,
                byCategory: [],
            });
        }

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

        // --- CÁLCULOS FISCALES SV ---
        // IVA Débito (Ventas)
        const ivaDebito = totalIngresos * 0.13;
        // IVA Crédito (Compras/Gastos) - Estimado sobre el total de egresos
        const ivaCredito = totalEgresos * 0.13;
        // IVA a Pagar (Si es positivo)
        const ivaNeto = Math.max(0, ivaDebito - ivaCredito);

        // Pago a Cuenta (1.75% de Ingresos Brutos en SV)
        const pagoACuenta = totalIngresos * 0.0175;

        // Estimación de Renta (25% o 30% sobre utilidad - simplificado al 25% para este MVP)
        const utilidadNeta = Math.max(0, totalIngresos - totalEgresos);
        const rentaEstimada = utilidadNeta * 0.25;

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
                percentage: (amount / (totalIngresos + totalEgresos || 1)) * 100,
            }))
            .sort((a, b) => b.amount - a.amount);

        return NextResponse.json({
            totalIngresos,
            totalEgresos,
            balance,
            iva: ivaNeto,
            ivaDebito,
            ivaCredito,
            pagoACuenta,
            rentaEstimada,
            transactionCount: transactions.length,
            byCategory,
        });
    } catch (error) {
        console.error('Error generating report:', error);
        return apiError('Error al generar reporte financiero', 500, error);
    }
}
