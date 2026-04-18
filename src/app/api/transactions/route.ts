import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';
import { LedgerService } from '@/lib/accounting/ledger';
import { createAutoJournalEntry } from '@/lib/auto-journal';
import { apiError } from '@/lib/api/error-response';
import { requirePermission } from '@/lib/auth/authorize';
import { checkTransactionCompliance } from '@/lib/sv-compliance';

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
        const statusParam = searchParams.get('status'); // 'ANNULLED' para ver solo anuladas
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '100')));

        const dateFilter = startDateParam && endDateParam ? {
            gte: new Date(startDateParam + 'T00:00:00.000Z'),
            lte: new Date(endDateParam + 'T23:59:59.999Z'),
        } : undefined;

        // Por defecto excluir anuladas; si piden ?status=ANNULLED mostrar solo anuladas
        const statusFilter = statusParam === 'ANNULLED'
            ? { status: 'ANNULLED' as const }
            : { status: { not: 'ANNULLED' as const } };

        const whereClause = {
            companyId,
            ...(dateFilter ? { date: dateFilter } : {}),
            ...statusFilter,
        };

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where: whereClause,
                include: { category: true, client: true },
                orderBy: { date: 'desc' },
                take: limit,
                skip: (page - 1) * limit,
            }),
            prisma.transaction.count({ where: whereClause }),
        ]);

        // Enriquecer con nombre del usuario que registró cada transacción
        const userIds = [...new Set(transactions.map(t => t.userId).filter(Boolean))];
        const users = userIds.length > 0
            ? await (prisma.user as any).findMany({
                where: { id: { in: userIds } },
                select: { id: true, name: true, email: true },
              })
            : [];
        const userMap = new Map((users as any[]).map((u: any) => [u.id, u]));
        const enriched = transactions.map(t => ({
            ...t,
            createdBy: userMap.get(t.userId) ?? { id: t.userId, name: 'Desconocido', email: '' },
        }));

        return NextResponse.json({ transactions: enriched, total, page, limit });
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
        const { type, amount, description, date, categoryId, clientId, dueDate, isPaid, creditDays, bypassToken } = body;

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

        // ── Verificación de Cumplimiento (Bloqueante) ────────────────────────
        const complianceResult = await checkTransactionCompliance(
            companyId,
            parseFloat(amount.toString()),
            clientId,
            description,
            bypassToken
        );

        if (!complianceResult.allowed) {
            return NextResponse.json({
                error: 'Transacción bloqueada por cumplimiento AML',
                compliance: complianceResult,
                message: 'Las transacciones ≥$10,000 requieren KYC verificado o un token de bypass del administrador.'
            }, { status: 403 });
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

        // CLIENTE siempre crea en PENDING_APPROVAL para que el Contador apruebe
        const initialStatus = auth.role === 'CLIENTE' ? 'PENDING_APPROVAL' : 'ACTIVE';

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
                dueDate: dueDate ? new Date(dueDate) : null,
                isPaid: isPaid !== undefined ? Boolean(isPaid) : true,
                creditDays: creditDays ? parseInt(creditDays.toString()) : null,
                status: initialStatus,
            },
            include: {
                category: true,
                client: true,
            },
        });

        // Auto-asiento contable usando catálogo SV
        const trans = transaction as any;
        await createAutoJournalEntry(
            {
                id: transaction.id,
                amount: transaction.amount,
                description,
                date: transaction.date,
                companyId,
                type,
            },
            {
                name: trans.category?.name || 'Varios',
                debitAccountCode: trans.category?.debitAccountCode || null,
                creditAccountCode: trans.category?.creditAccountCode || null,
            }
        );

        // Registro de auditoría para creación
        try {
            await (prisma.auditLog as any).create({
                data: {
                    userId: auth.userId,
                    companyId,
                    action: 'TRANSACTION_CREATED',
                    resource: 'Transaction',
                    resourceId: transaction.id,
                    ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
                    userAgent: request.headers.get('user-agent') || 'Unknown',
                    newData: {
                        id: transaction.id,
                        type,
                        amount: transaction.amount,
                        description,
                        date: transaction.date,
                        status: initialStatus,
                        category: (transaction as any).category?.name,
                    },
                    result: 'SUCCESS',
                },
            });
        } catch (auditErr) {
            console.warn('Audit log warning (create):', auditErr);
        }

        // Ledger legacy (mantener por compatibilidad)
        try {
            await LedgerService.processTransaction({
                companyId,
                amount: transaction.amount,
                category: trans.category?.name || 'Varios',
                description,
                reference: transaction.id,
                date: transaction.date,
            });
        } catch (ledgerError: unknown) {
            console.warn('⚠️ Ledger Legacy Warning:', ledgerError instanceof Error ? ledgerError.message : ledgerError);
        }

        return NextResponse.json({ transaction }, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/transactions:', error);
        return apiError('Error al crear transacción', 500, error);
    }
}
