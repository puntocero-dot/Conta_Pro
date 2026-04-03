import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';
import { buildIncomeStatement } from '@/lib/financial-statements';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const companyId = await getCompanyIdFromRequest(request, auth.userId);
    if (!companyId) return NextResponse.json({ error: 'Sin empresa' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()));

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const is = await buildIncomeStatement(companyId, startDate, endDate);

    // ISR El Salvador (Art. 37 Ley ISR):
    // Si renta neta ≤ $150,000: 25%
    // Si renta neta > $150,000: 30%
    const rentaNeta = Math.max(0, is.ebt);
    const isrRate = rentaNeta > 150000 ? 0.30 : 0.25;
    const isrCausado = rentaNeta * isrRate;

    // Pagos a cuenta acumulados (1.75% mensual de ingresos brutos)
    const pagoACuentaAnual = is.revenue * 0.0175;
    const isrLiquido = Math.max(0, isrCausado - pagoACuentaAnual);
    const saldoFavor = Math.max(0, pagoACuentaAnual - isrCausado);

    return NextResponse.json({
      year,
      ingresosBrutos: is.revenue,
      costoYGastos: is.costOfSales + is.operatingExpenses + is.financialExpenses,
      rentaNeta,
      tasa: isrRate,
      isrCausado,
      pagoACuentaDeducible: pagoACuentaAnual,
      isrLiquido,
      saldoFavor,
      status: isrLiquido > 0 ? 'PAGAR' : 'SALDO_A_FAVOR',
      reservaLegal: is.reservaLegal,
      utilidadNeta: is.netIncome,
      formulario: 'F-11',
      vencimiento: `30 de abril del año ${year + 1}`,
      desglose: {
        revenue: is.revenue,
        costOfSales: is.costOfSales,
        grossProfit: is.grossProfit,
        operatingExpenses: is.operatingExpenses,
        ebitda: is.ebitda,
        depreciation: is.depreciation,
        ebit: is.ebit,
        financialExpenses: is.financialExpenses,
        ebt: is.ebt,
      },
    });
  } catch (error) {
    console.error('GET tax-reports/isr error:', error);
    return NextResponse.json({ error: 'Error al generar declaración ISR' }, { status: 500 });
  }
}
