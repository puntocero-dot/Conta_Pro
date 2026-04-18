import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth/jwt';
import { apiError } from '@/lib/api/error-response';
import { requirePermission } from '@/lib/auth/authorize';

const PROVISION_LABELS: Record<string, string> = {
    VACATION: 'Vacaciones',
    AGUINALDO: 'Aguinaldo',
    INDEMNIZACION: 'Indemnización',
    BONO_SEMESTRAL: 'Bono Semestral',
    OTHER: 'Otras Previsiones',
};

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        const companyId = request.headers.get('x-company-id');
        if (!companyId) return NextResponse.json({ error: 'Empresa requerida' }, { status: 400 });

        const { searchParams } = new URL(request.url);
        const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear();

        const provisions = await prisma.provision.findMany({
            where: { companyId, year },
            orderBy: [{ month: 'asc' }, { type: 'asc' }],
        });

        // Group by type for summary
        const summary = Object.keys(PROVISION_LABELS).map(type => {
            const items = provisions.filter(p => p.type === type);
            return {
                type,
                label: PROVISION_LABELS[type],
                totalAccrued: items.reduce((s, p) => s + p.accruedAmount, 0),
                totalPaid: items.reduce((s, p) => s + p.paidAmount, 0),
                count: items.length,
            };
        }).filter(s => s.count > 0);

        return NextResponse.json({ provisions, summary, year });
    } catch (error) {
        return apiError('Error al obtener previsiones', 500, error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        const permError = requirePermission(auth.role, 'provision:create');
        if (permError) return permError;

        const companyId = request.headers.get('x-company-id');
        if (!companyId) return NextResponse.json({ error: 'Empresa requerida' }, { status: 400 });

        const body = await request.json();
        const { type, description, year, month, accruedAmount, notes, createTransaction } = body;

        if (!type || !description || !year || !month || accruedAmount === undefined) {
            return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
        }

        const provision = await prisma.provision.create({
            data: {
                companyId,
                type,
                description,
                year: parseInt(year),
                month: parseInt(month),
                accruedAmount: parseFloat(accruedAmount),
                notes,
            },
        });

        // Optionally create a non-cash EGRESO transaction (marcada como previsión)
        if (createTransaction) {
            const catName = `Previsión ${PROVISION_LABELS[type] || type}`;
            let cat = await prisma.category.findFirst({ where: { companyId, name: catName, type: 'EGRESO' } });
            if (!cat) {
                cat = await prisma.category.create({ data: { name: catName, type: 'EGRESO', color: '#f59e0b', icon: '📅', companyId } });
            }

            await prisma.transaction.create({
                data: {
                    companyId,
                    type: 'EGRESO',
                    amount: parseFloat(accruedAmount),
                    description: `${PROVISION_LABELS[type]} — ${description} ${String(month).padStart(2, '0')}/${year}`,
                    date: new Date(`${year}-${String(month).padStart(2, '0')}-28T12:00:00.000Z`),
                    categoryId: cat.id,
                    userId: auth.userId,
                    metadata: {
                        cashFlowCategory: 'OPERATING',
                        affectsCash: false,
                        provisionId: provision.id,
                        concept: 'PROVISION',
                    },
                },
            });
        }

        return NextResponse.json({ provision }, { status: 201 });
    } catch (error) {
        return apiError('Error al crear previsión', 500, error);
    }
}
