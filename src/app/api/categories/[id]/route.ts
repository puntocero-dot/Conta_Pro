import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const companyId = await getCompanyIdFromRequest(request, auth.userId);
    if (!companyId) return NextResponse.json({ error: 'Sin empresa' }, { status: 400 });

    const { id } = await params;
    const body = await request.json();
    const { name, color, icon, debitAccountCode, creditAccountCode } = body;

    const category = await (prisma.category as any).update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
        debitAccountCode: debitAccountCode ?? null,
        creditAccountCode: creditAccountCode ?? null,
      },
    });

    return NextResponse.json({ category });
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar categoría' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { id } = await params;
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar categoría' }, { status: 500 });
  }
}
