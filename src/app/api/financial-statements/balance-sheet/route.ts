import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';
import { buildBalanceSheet } from '@/lib/financial-statements';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const companyId = await getCompanyIdFromRequest(request, auth.userId);
    if (!companyId) return NextResponse.json({ error: 'Sin empresa' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const date = dateParam ? new Date(dateParam + 'T23:59:59Z') : new Date();

    const balanceSheet = await buildBalanceSheet(companyId, date);
    return NextResponse.json(balanceSheet);
  } catch (error) {
    console.error('GET balance-sheet error:', error);
    return NextResponse.json({ error: 'Error al generar balance general' }, { status: 500 });
  }
}
