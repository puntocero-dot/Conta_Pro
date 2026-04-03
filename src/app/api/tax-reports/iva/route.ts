import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';

const IVA_RATE = 0.13;

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const companyId = await getCompanyIdFromRequest(request, auth.userId);
    if (!companyId) return NextResponse.json({ error: 'Sin empresa' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1));
    const year = parseInt(searchParams.get('year') ?? String(now.getFullYear()));

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Ingresos del mes (base para Débito Fiscal)
    const ingresos = await prisma.transaction.findMany({
      where: {
        companyId,
        type: 'INGRESO',
        status: 'ACTIVE',
        date: { gte: startDate, lte: endDate },
      },
      include: { category: true },
    });

    // Egresos del mes (base para Crédito Fiscal — compras con IVA)
    const egresos = await prisma.transaction.findMany({
      where: {
        companyId,
        type: 'EGRESO',
        status: 'ACTIVE',
        date: { gte: startDate, lte: endDate },
      },
      include: { category: true },
    });

    const totalVentas = ingresos.reduce((s, t) => s + t.amount, 0);
    const totalCompras = egresos.reduce((s, t) => s + t.amount, 0);

    // Débito Fiscal = IVA cobrado en ventas
    const debitoFiscal = totalVentas * IVA_RATE;
    // Crédito Fiscal = IVA pagado en compras (no todas las compras tienen IVA, estimado)
    const creditoFiscal = totalCompras * IVA_RATE;

    const saldoAPagar = Math.max(0, debitoFiscal - creditoFiscal);
    const remanente = Math.max(0, creditoFiscal - debitoFiscal);

    return NextResponse.json({
      period: { month, year, label: `${month}/${year}` },
      ventas: {
        total: totalVentas,
        transactions: ingresos.length,
        debitoFiscal,
      },
      compras: {
        total: totalCompras,
        transactions: egresos.length,
        creditoFiscal,
      },
      resumen: {
        debitoFiscal,
        creditoFiscal,
        saldoAPagar,
        remanente,
        status: saldoAPagar > 0 ? 'PAGAR' : 'REMANENTE',
      },
      ivaTasa: IVA_RATE,
      formulario: 'F-07',
    });
  } catch (error) {
    console.error('GET tax-reports/iva error:', error);
    return NextResponse.json({ error: 'Error al generar reporte IVA' }, { status: 500 });
  }
}
