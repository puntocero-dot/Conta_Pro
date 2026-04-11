import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';
import { requirePermission } from '@/lib/auth/authorize';
import { SV_INITIAL_TAX_RULES } from '@/lib/tax-rules';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get('country') || 'SV';

    const rules = await prisma.taxRule.findMany({
      where: { countryCode },
      orderBy: [{ ruleType: 'asc' }, { effectiveFrom: 'desc' }],
    });

    return NextResponse.json({ rules, country: countryCode });
  } catch (error) {
    console.error('GET /api/tax-rules error:', error);
    return NextResponse.json({ error: 'Error al obtener reglas fiscales' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const permError = requirePermission(auth.role, 'company:update');
    if (permError) return permError;

    const body = await request.json();
    const { action } = body;

    // Acción especial: Sembrar reglas SV iniciales
    if (action === 'SEED_SV') {
      const results = [];
      for (const rule of SV_INITIAL_TAX_RULES) {
        try {
          const created = await prisma.taxRule.create({ data: rule });
          results.push(created);
        } catch {
          // Skip si ya existe (unique constraint)
        }
      }
      return NextResponse.json({
        message: `${results.length} reglas SV creadas`,
        rules: results,
      }, { status: 201 });
    }

    // Crear regla individual
    const { countryCode, ruleType, name, rate, threshold, maxBase, effectiveFrom, effectiveTo } = body;

    if (!countryCode || !ruleType || !name || rate === undefined || !effectiveFrom) {
      return NextResponse.json(
        { error: 'Campos requeridos: countryCode, ruleType, name, rate, effectiveFrom' },
        { status: 400 }
      );
    }

    const rule = await prisma.taxRule.create({
      data: {
        countryCode,
        ruleType,
        name,
        rate: parseFloat(rate),
        threshold: threshold ? parseFloat(threshold) : null,
        maxBase: maxBase ? parseFloat(maxBase) : null,
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      },
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error: unknown) {
    console.error('POST /api/tax-rules error:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe una regla con ese país, tipo y fecha de vigencia' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Error al crear regla fiscal' }, { status: 500 });
  }
}
