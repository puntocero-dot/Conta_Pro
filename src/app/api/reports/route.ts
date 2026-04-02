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
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');

        const companyId = await getCompanyIdFromRequest(request, auth.userId);

        if (!companyId) {
            return NextResponse.json({
                totalIngresos: 0, totalEgresos: 0, balance: 0, iva: 0,
                transactionCount: 0, byCategory: [],
                previousPeriod: { totalIngresos: 0, totalEgresos: 0, balance: 0 },
            });
        }

        // Calcular rango de fechas
        let startDate: Date;
        let endDate: Date;

        if (startDateParam && endDateParam) {
            startDate = new Date(startDateParam + 'T00:00:00.000Z');
            endDate = new Date(endDateParam + 'T23:59:59.999Z');
        } else {
            const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
            const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0, 23, 59, 59);
        }

        // Calcular periodo anterior (misma duración)
        const durationMs = endDate.getTime() - startDate.getTime();
        const prevEndDate = new Date(startDate.getTime() - 1);
        const prevStartDate = new Date(prevEndDate.getTime() - durationMs);

        const [transactions, prevTransactions] = await Promise.all([
            prisma.transaction.findMany({
                where: { companyId, date: { gte: startDate, lte: endDate } },
                include: { category: true, client: true },
            }),
            prisma.transaction.findMany({
                where: { companyId, date: { gte: prevStartDate, lte: prevEndDate } },
                select: { type: true, amount: true },
            }),
        ]);

        // Totales periodo actual
        const totalIngresos = transactions.filter(t => t.type === 'INGRESO').reduce((s, t) => s + t.amount, 0);
        const totalEgresos = transactions.filter(t => t.type === 'EGRESO').reduce((s, t) => s + t.amount, 0);
        const balance = totalIngresos - totalEgresos;

        // Totales periodo anterior
        const prevIngresos = prevTransactions.filter(t => t.type === 'INGRESO').reduce((s, t) => s + t.amount, 0);
        const prevEgresos = prevTransactions.filter(t => t.type === 'EGRESO').reduce((s, t) => s + t.amount, 0);
        const prevBalance = prevIngresos - prevEgresos;

        // Cálculos fiscales SV
        const ivaDebito = totalIngresos * 0.13;
        const ivaCredito = totalEgresos * 0.13;
        const ivaNeto = Math.max(0, ivaDebito - ivaCredito);
        const pagoACuenta = totalIngresos * 0.0175;
        const utilidadNeta = Math.max(0, balance);
        const rentaEstimada = utilidadNeta * 0.25;

        // Agrupar por categoría
        const categoryMap = new Map<string, { amount: number; type: string }>();
        transactions.forEach(t => {
            const key = t.category.name;
            const cur = categoryMap.get(key) || { amount: 0, type: t.type };
            categoryMap.set(key, { amount: cur.amount + t.amount, type: t.type });
        });
        const byCategory = Array.from(categoryMap.entries())
            .map(([name, { amount, type }]) => ({
                name, amount, type,
                percentage: (amount / (totalIngresos + totalEgresos || 1)) * 100,
            }))
            .sort((a, b) => b.amount - a.amount);

        // Top clientes por volumen
        const clientMap = new Map<string, { name: string; amount: number; count: number }>();
        transactions.forEach(t => {
            const c = t.client as any;
            if (!c) return;
            const cur = clientMap.get(c.id) || { name: c.name, amount: 0, count: 0 };
            clientMap.set(c.id, { name: c.name, amount: cur.amount + t.amount, count: cur.count + 1 });
        });
        const topClients = Array.from(clientMap.values())
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        return NextResponse.json({
            totalIngresos, totalEgresos, balance,
            iva: ivaNeto, ivaDebito, ivaCredito, pagoACuenta, rentaEstimada,
            transactionCount: transactions.length,
            byCategory, topClients,
            previousPeriod: {
                totalIngresos: prevIngresos,
                totalEgresos: prevEgresos,
                balance: prevBalance,
            },
        });
    } catch (error) {
        console.error('Error generating report:', error);
        return apiError('Error al generar reporte financiero', 500, error);
    }
}
