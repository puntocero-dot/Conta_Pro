import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';
import { buildIncomeStatement } from '@/lib/financial-statements';
import { TaxRuleService } from '@/lib/tax-rules';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const companyId = await getCompanyIdFromRequest(request, auth.userId);
    if (!companyId) return NextResponse.json({ error: 'Sin empresa' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    // 1. Obtener resultado contable NIIF (el que genera el sistema por defecto)
    const incomeStatement = await buildIncomeStatement(companyId, startDate, endDate);
    const utilidadContable = incomeStatement.ebt;

    // 2. Obtener depreciaciones del año (FISCAL vs NIIF)
    const depreciations = await prisma.assetDepreciation.findMany({
      where: {
        asset: { companyId },
        year,
      },
      select: { amount: true, depreciationType: true },
    });

    const totalDeprFiscal = depreciations
      .filter(d => d.depreciationType === 'FISCAL')
      .reduce((s, d) => s + d.amount, 0);
    
    const totalDeprContable = depreciations
      .filter(d => d.depreciationType === 'NIIF')
      .reduce((s, d) => s + d.amount, 0);

    // Diferencia en depreciación (Ajuste a la renta neta)
    // Si Fiscal > Contable = Gasto adicional deducible (disminuye renta)
    // Si Contable > Fiscal = Gasto no deducible (aumenta renta)
    const ajusteDepreciacion = totalDeprContable - totalDeprFiscal;

    // 3. Obtener deterioro de cartera (Generalmente no deducible hasta que es incobrable)
    // Buscamos transacciones con impairment del periodo
    const receivables = await prisma.transaction.findMany({
      where: {
        companyId,
        type: 'INGRESO',
        status: 'ACTIVE',
        date: { gte: startDate, lte: endDate },
        metadata: { path: ['impairmentAmount'], not: Prisma.DbNull }
      }
    });
    
    const totalDeterioro = receivables.reduce((s, tx) => {
      const meta = tx.metadata as any;
      return s + (meta.impairmentAmount || 0);
    }, 0);

    // El deterioro NIIF es un gasto contable pero NO es deducible fiscalmente (Art. 31 Ley ISR)
    // Por lo tanto, se REINTEGRA a la utilidad contable
    const ajusteDeterioro = totalDeterioro;

    // 4. Calcular Renta Imponible
    const rentaImponible = utilidadContable + ajusteDepreciacion + ajusteDeterioro;
    
    // 5. Calcular ISR Fiscal Real
    const isrRate = await TaxRuleService.getISRRate(companyId, incomeStatement.revenue);
    const isrFiscal = rentaImponible > 0 ? rentaImponible * isrRate : 0;
    
    // 6. Conciliación con ISR Contable (NIIF)
    const isrContable = incomeStatement.isr;
    const diferenciaISR = isrFiscal - isrContable;

    return NextResponse.json({
      utilidadContable,
      ajustes: [
        { concept: 'Diferencia en Depreciación (NIIF vs Fiscal)', amount: ajusteDepreciacion },
        { concept: 'Deterioro de Cuentas por Cobrar (No Deducible)', amount: ajusteDeterioro },
      ],
      rentaImponible,
      isrFiscal,
      isrContable,
      diferenciaISR,
      year,
      taxRate: isrRate,
    });
  } catch (error) {
    console.error('GET tax-reconciliation error:', error);
    return NextResponse.json({ error: 'Error al generar conciliación tributaria' }, { status: 500 });
  }
}
