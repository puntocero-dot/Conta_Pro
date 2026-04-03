import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const companyId = await getCompanyIdFromRequest(request, auth.userId);
    if (!companyId) return NextResponse.json({ error: 'Sin empresa' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // INGRESO | EGRESO | null (all)

    const categories = await (prisma.category as any).findMany({
      where: {
        companyId,
        ...(type ? { type } : {}),
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener categorías' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const companyId = await getCompanyIdFromRequest(request, auth.userId);
    if (!companyId) return NextResponse.json({ error: 'Sin empresa' }, { status: 400 });

    const body = await request.json();
    const { name, type, color, icon, debitAccountCode, creditAccountCode } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'Nombre y tipo son requeridos' }, { status: 400 });
    }

    const category = await (prisma.category as any).create({
      data: {
        name,
        type,
        color: color || '#3b82f6',
        icon: icon || '📁',
        companyId,
        debitAccountCode: debitAccountCode || null,
        creditAccountCode: creditAccountCode || null,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear categoría' }, { status: 500 });
  }
}
