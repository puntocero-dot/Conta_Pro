import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';

function agingBucket(dueDate: Date | null): 'current' | 'days30' | 'days60' | 'days90' | 'over90' {
  if (!dueDate) return 'current';
  const today = new Date();
  const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'current';
  if (diffDays <= 30) return 'days30';
  if (diffDays <= 60) return 'days60';
  if (diffDays <= 90) return 'days90';
  return 'over90';
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const companyId = await getCompanyIdFromRequest(request, auth.userId);
    if (!companyId) return NextResponse.json({ error: 'Sin empresa' }, { status: 400 });

    // Cuentas por cobrar = INGRESOs pendientes de cobro
    const transactions = await (prisma.transaction as any).findMany({
      where: {
        companyId,
        type: 'INGRESO',
        isPaid: false,
        status: 'ACTIVE',
      },
      include: { category: true, client: true },
      orderBy: { dueDate: 'asc' },
    });

    const buckets: Record<string, any[]> = {
      current: [],
      days30: [],
      days60: [],
      days90: [],
      over90: [],
    };

    let totalPending = 0;

    for (const tx of transactions) {
      const bucket = agingBucket(tx.dueDate);
      buckets[bucket].push({
        id: tx.id,
        description: tx.description,
        amount: tx.amount,
        date: tx.date,
        dueDate: tx.dueDate,
        clientName: tx.client?.name ?? 'Sin cliente',
        categoryName: tx.category?.name ?? 'Sin categoría',
        creditDays: tx.creditDays,
      });
      totalPending += tx.amount;
    }

    const totals = {
      current: buckets.current.reduce((s, t) => s + t.amount, 0),
      days30: buckets.days30.reduce((s, t) => s + t.amount, 0),
      days60: buckets.days60.reduce((s, t) => s + t.amount, 0),
      days90: buckets.days90.reduce((s, t) => s + t.amount, 0),
      over90: buckets.over90.reduce((s, t) => s + t.amount, 0),
      total: totalPending,
    };

    return NextResponse.json({ aging: buckets, totals });
  } catch (error) {
    console.error('GET /api/receivables error:', error);
    return NextResponse.json({ error: 'Error al obtener cuentas por cobrar' }, { status: 500 });
  }
}
