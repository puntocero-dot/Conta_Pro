import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';
import { buildBalanceSheet, buildIncomeStatement, buildCashFlow } from '@/lib/financial-statements';
import { calcFinancialMetrics } from '@/lib/financial-metrics';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const companyId = await getCompanyIdFromRequest(request, auth.userId);
    if (!companyId) {
      return NextResponse.json({ 
        metrics: {
          currentRatio: 0, debtToEquity: 0, returnOnAssets: 0, returnOnEquity: 0,
          grossMargin: 0, netMargin: 0, revenue: 0, netIncome: 0
        }, 
        period: { startDate: new Date().toISOString(), endDate: new Date().toISOString() },
        warning: 'No se identificó una empresa activa'
      });
    }


    const { searchParams } = new URL(request.url);
    const now = new Date();
    const firstOfYear = new Date(now.getFullYear(), 0, 1);

    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')! + 'T00:00:00Z')
      : firstOfYear;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')! + 'T23:59:59Z')
      : now;

    const [bs, is, cf] = await Promise.all([
      buildBalanceSheet(companyId, endDate),
      buildIncomeStatement(companyId, startDate, endDate),
      buildCashFlow(companyId, startDate, endDate),
    ]);

    const metrics = await calcFinancialMetrics(bs, is, cf, companyId);

    return NextResponse.json({ metrics, period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() } });
  } catch (error) {
    console.error('GET financial-metrics error:', error);
    return NextResponse.json({ error: 'Error al calcular métricas financieras' }, { status: 500 });
  }
}
