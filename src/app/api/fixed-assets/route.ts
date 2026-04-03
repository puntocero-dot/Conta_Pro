import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';
import { SV_DEPRECIATION_RATES } from '@/lib/sv-chart-of-accounts';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const companyId = await getCompanyIdFromRequest(request, auth.userId);
    if (!companyId) return NextResponse.json({ error: 'Sin empresa' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ACTIVE';

    const assets = await (prisma.fixedAsset as any).findMany({
      where: { companyId, ...(status !== 'ALL' ? { status } : {}) },
      include: { depreciations: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ assets });
  } catch (error) {
    console.error('GET /api/fixed-assets error:', error);
    return NextResponse.json({ error: 'Error al obtener activos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const companyId = await getCompanyIdFromRequest(request, auth.userId);
    if (!companyId) return NextResponse.json({ error: 'Sin empresa' }, { status: 400 });

    const body = await request.json();
    const { name, accountCode, purchaseDate, purchaseCost, residualValue, notes } = body;

    if (!name || !accountCode || !purchaseDate || !purchaseCost) {
      return NextResponse.json({ error: 'Campos requeridos: nombre, código cuenta, fecha compra, costo' }, { status: 400 });
    }

    const rate = SV_DEPRECIATION_RATES[accountCode];
    if (!rate) {
      return NextResponse.json(
        { error: `Código de cuenta ${accountCode} no tiene tasa de depreciación SV definida` },
        { status: 400 }
      );
    }

    const cost = parseFloat(purchaseCost.toString());
    const residual = parseFloat((residualValue || 0).toString());

    const asset = await (prisma.fixedAsset as any).create({
      data: {
        companyId,
        name,
        accountCode,
        purchaseDate: new Date(purchaseDate),
        purchaseCost: cost,
        residualValue: residual,
        usefulLifeYears: rate.years,
        accumulatedDepr: 0,
        bookValue: cost,
        notes: notes || null,
      },
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    console.error('POST /api/fixed-assets error:', error);
    return NextResponse.json({ error: 'Error al crear activo fijo' }, { status: 500 });
  }
}
