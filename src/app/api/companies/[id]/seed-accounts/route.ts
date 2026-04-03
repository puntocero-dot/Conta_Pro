import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth/jwt';
import { SV_CHART_OF_ACCOUNTS } from '@/lib/sv-chart-of-accounts';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id: companyId } = await params;

    // Verificar membresía
    const member = await prisma.companyMember.findFirst({
      where: { companyId, userId: auth.userId },
    });
    if (!member && auth.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Sin acceso a esta empresa' }, { status: 403 });
    }

    // Verificar si ya tiene cuentas
    const existingCount = await prisma.account.count({ where: { companyId } });
    if (existingCount > 0) {
      return NextResponse.json(
        { message: `La empresa ya tiene ${existingCount} cuentas contables. Use force=true para re-sembrar.`, existingCount },
        { status: 200 }
      );
    }

    // Sembrar catálogo completo
    const data = SV_CHART_OF_ACCOUNTS.map(account => ({
      code: account.code,
      name: account.name,
      type: account.type,
      companyId,
    }));

    await prisma.account.createMany({ data, skipDuplicates: true });

    const created = await prisma.account.count({ where: { companyId } });

    return NextResponse.json(
      { message: `Catálogo SV sembrado: ${created} cuentas creadas`, count: created },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error seeding accounts:', error);
    return NextResponse.json({ error: 'Error al sembrar catálogo de cuentas' }, { status: 500 });
  }
}

// Force re-seed (sobrescribe cuentas existentes)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (auth.role !== 'SUPER_ADMIN' && auth.role !== 'CONTADOR') {
      return NextResponse.json({ error: 'Solo CONTADOR o SUPER_ADMIN pueden re-sembrar cuentas' }, { status: 403 });
    }

    const { id: companyId } = await params;

    const data = SV_CHART_OF_ACCOUNTS.map(account => ({
      code: account.code,
      name: account.name,
      type: account.type,
      companyId,
    }));

    await prisma.account.createMany({ data, skipDuplicates: true });

    const total = await prisma.account.count({ where: { companyId } });

    return NextResponse.json({ message: `Catálogo re-sembrado. Total: ${total} cuentas`, count: total });
  } catch (error) {
    console.error('Error re-seeding accounts:', error);
    return NextResponse.json({ error: 'Error al re-sembrar catálogo' }, { status: 500 });
  }
}
