import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';
import { buildEquityStatement } from '@/lib/financial-statements';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const companyId = await getCompanyIdFromRequest(request, auth.userId);
    if (!companyId) return NextResponse.json({ error: 'Sin empresa' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()));

    const statement = await buildEquityStatement(companyId, year);
    return NextResponse.json(statement);
  } catch (error) {
    console.error('GET equity-statement error:', error);
    return NextResponse.json({ error: 'Error al generar estado de capital contable' }, { status: 500 });
  }
}
