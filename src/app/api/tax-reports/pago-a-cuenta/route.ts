import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';

const PAGO_A_CUENTA_RATE = 0.0175; // 1.75% Art. 72 Código Tributario SV

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const companyId = await getCompanyIdFromRequest(request, auth.userId);
    if (!companyId) return NextResponse.json({ error: 'Sin empresa' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1));
    const year = parseInt(searchParams.get('year') ?? String(now.getFullYear()));

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Ingresos brutos del mes
    const ingresos = await prisma.transaction.findMany({
      where: {
        companyId,
        type: 'INGRESO',
        status: 'ACTIVE',
        date: { gte: startDate, lte: endDate },
      },
      select: { amount: true, description: true, date: true },
    });

    const ingresosBrutos = ingresos.reduce((s, t) => s + t.amount, 0);
    const pagoACuenta = ingresosBrutos * PAGO_A_CUENTA_RATE;

    // Acumulado del año para comparar con ISR estimado anual
    const startOfYear = new Date(year, 0, 1);
    const ingresosAnuales = await prisma.transaction.aggregate({
      where: {
        companyId,
        type: 'INGRESO',
        status: 'ACTIVE',
        date: { gte: startOfYear, lte: endDate },
      },
      _sum: { amount: true },
    });

    const totalAnualAcumulado = ingresosAnuales._sum.amount ?? 0;
    const pagoACuentaAcumulado = totalAnualAcumulado * PAGO_A_CUENTA_RATE;
    // ISR estimado anual (25% renta neta aproximada — 30% gastos deducibles estimados)
    const rentaNetaEstimada = totalAnualAcumulado * 0.70; // 70% es renta neta (estimado)
    const isrAnualEstimado = rentaNetaEstimada > 150000
      ? rentaNetaEstimada * 0.30
      : rentaNetaEstimada * 0.25;

    return NextResponse.json({
      period: { month, year, label: `${month}/${year}` },
      ingresosBrutos,
      tasa: PAGO_A_CUENTA_RATE,
      pagoACuentaMes: pagoACuenta,
      acumuladoAnual: {
        ingresos: totalAnualAcumulado,
        pagoACuenta: pagoACuentaAcumulado,
        isrAnualEstimado,
        saldoFavorable: Math.max(0, pagoACuentaAcumulado - isrAnualEstimado),
        saldoAPagar: Math.max(0, isrAnualEstimado - pagoACuentaAcumulado),
      },
      formulario: 'F-14',
      vencimiento: `31 del mes siguiente (antes del ${new Date(year, month, 31).toLocaleDateString('es-SV')})`,
    });
  } catch (error) {
    console.error('GET tax-reports/pago-a-cuenta error:', error);
    return NextResponse.json({ error: 'Error al generar reporte Pago a Cuenta' }, { status: 500 });
  }
}
