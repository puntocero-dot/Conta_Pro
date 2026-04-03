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
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')! + 'T00:00:00Z')
      : firstOfMonth;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')! + 'T23:59:59Z')
      : now;

    const statement = await buildIncomeStatement(companyId, startDate, endDate);
    return NextResponse.json(statement);
  } catch (error) {
    console.error('GET income-statement error:', error);
    return NextResponse.json({ error: 'Error al generar estado de resultados' }, { status: 500 });
  }
}
