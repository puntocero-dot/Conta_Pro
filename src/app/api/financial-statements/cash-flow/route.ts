import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';
import { buildCashFlow } from '@/lib/financial-statements';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const companyId = await getCompanyIdFromRequest(request, auth.userId);
    if (!companyId) return NextResponse.json({ error: 'Sin empresa' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const firstOfYear = new Date(now.getFullYear(), 0, 1);

    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')! + 'T00:00:00Z')
      : firstOfYear;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')! + 'T23:59:59Z')
      : now;

    const statement = await buildCashFlow(companyId, startDate, endDate);
    return NextResponse.json(statement);
  } catch (error) {
    console.error('GET cash-flow error:', error);
    return NextResponse.json({ error: 'Error al generar flujo de efectivo' }, { status: 500 });
  }
}
