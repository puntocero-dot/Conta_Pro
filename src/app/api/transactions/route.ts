import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';
import { LedgerService } from '@/lib/accounting/ledger';
import { apiError } from '@/lib/api/error-response';
import { requirePermission } from '@/lib/auth/authorize';

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const permError = requirePermission(auth.role, 'transaction:read');
        if (permError) return permError;

        const companyId = await getCompanyIdFromRequest(request, auth.userId);

        if (!companyId) {
            return NextResponse.json(
                { error: 'No se encontró una empresa asociada' },
                { status: 400 }
            );
        }

        const { searchParams } = new URL(request.url);
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '100')));

        const dateFilter = startDateParam && endDateParam ? {
            gte: new Date(startDateParam + 'T00:00:00.000Z'),
            lte: new Date(endDateParam + 'T23:59:59.999Z'),
        } : undefined;

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where: { companyId, ...(dateFilter ? { date: dateFilter } : {}) },
                include: { category: true },
                orderBy: { date: 'desc' },
                take: limit,
                skip: (page - 1) * limit,
            }),
            prisma.transaction.count({
                where: { companyId, ...(dateFilter ? { date: dateFilter } : {}) },
            }),
        ]);

        return NextResponse.json({ transactions, total, page, limit });
    } catch (error) {
        console.error('Error in GET /api/transactions:', error);
        return apiError('Error al obtener transacciones', 500, error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const permError = requirePermission(auth.role, 'transaction:create');
        if (permError) return permError;

        const body = await request.json();
        const { type, amount, description, date, categoryId, clientId } = body;

        if (!type || !amount || !description || !date) {
            return NextResponse.json(
                { error: 'Datos incompletos requeridos (tipo, monto, descripción, fecha)' },
                { status: 400 }
            );
        }

        const companyId = await getCompanyIdFromRequest(request, auth.userId);

        if (!companyId) {
            return NextResponse.json(
                { error: 'El usuario debe tener una empresa vinculada para registrar transacciones' },
                { status: 400 }
            );
        }

        // Validar u obtener categoría por defecto
        let finalCategoryId = categoryId;
        if (!categoryId) {
            const defaultCategory = await prisma.category.upsert({
                where: {
                    id: `default-${type.toLowerCase()}-${companyId}`.substring(0, 36)
                },
                update: {},
                create: {
                    id: `default-${type.toLowerCase()}-${companyId}`.substring(0, 36),
                    name: type === 'INGRESO' ? 'Ingresos Generales' : 'Gastos Generales',
                    type,
                    color: type === 'INGRESO' ? '#10b981' : '#ef4444',
                    icon: type === 'INGRESO' ? '💰' : '💸',
                    companyId,
                },
            });
            finalCategoryId = defaultCategory.id;
        }

        // Crear la transacción
        const transaction = await (prisma.transaction as any).create({
            data: {
                type,
                amount: parseFloat(amount.toString()),
                description,
                date: new Date(date),
                categoryId: finalCategoryId,
                companyId,
                userId: auth.userId,
                clientId: clientId || null,
            },
            include: {
                category: true,
                client: true,
            },
        });

        // Procesar en el Ledger (Contabilidad Invisible)
        try {
            const trans = transaction as any;
            await LedgerService.processTransaction({
                companyId,
                amount: transaction.amount,
                category: trans.category?.name || 'Varios',
                description,
                reference: transaction.id,
                date: transaction.date,
            });
        } catch (ledgerError: any) {
            console.warn('⚠️ Ledger Warning:', ledgerError.message);
            // No bloqueamos la respuesta si falla la contabilidad automática
        }

        return NextResponse.json({ transaction }, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/transactions:', error);
        return apiError('Error al crear transacción', 500, error);
    }
}
