import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';
import { apiError } from '@/lib/api/error-response';
import { requirePermission } from '@/lib/auth/authorize';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const permError = requirePermission(auth.role, 'transaction:update');
        if (permError) return permError;

        const body = await request.json();
        const { amount, description, date, categoryId, clientId } = body;

        const companyId = await getCompanyIdFromRequest(request, auth.userId);
        if (!companyId) {
            return NextResponse.json({ error: 'No se encontró la empresa' }, { status: 400 });
        }

        // 1. Obtener la transacción original para el historial
        const originalTransaction = await prisma.transaction.findUnique({
            where: { id, companyId },
            include: { category: true }
        });

        if (!originalTransaction) {
            return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 });
        }

        if (originalTransaction.status === 'ANNULLED') {
            return NextResponse.json({ error: 'No se puede editar una transacción anulada' }, { status: 400 });
        }

        // 2. Actualizar la transacción
        const updatedTransaction = await (prisma.transaction as any).update({
            where: { id },
            data: {
                amount: amount !== undefined ? parseFloat(amount.toString()) : undefined,
                description,
                date: date ? new Date(date) : undefined,
                categoryId,
                clientId: clientId || null,
                status: 'CORRECTED'
            },
            include: { category: true }
        });

        // 3. Crear registro de auditoría
        await (prisma.auditLog as any).create({
            data: {
                userId: auth.userId,
                action: 'UPDATE_TRANSACTION',
                resource: 'Transaction',
                resourceId: id,
                ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
                userAgent: request.headers.get('user-agent') || 'Unknown',
                oldData: originalTransaction as any,
                newData: updatedTransaction as any,
                result: 'SUCCESS',
                metadata: {
                    type: 'CORRECTION',
                    reason: 'Digitization error fix'
                }
            }
        });

        // 4. (Opcional) Actualizar el Ledger si el monto cambió
        // En un sistema real robusto, aquí llamaríamos a un servicio para re-generar el asiento
        // Por ahora, registramos la inconsistencia para ser auditada o simplemente actualizamos el ledger simple

        return NextResponse.json({ transaction: updatedTransaction });
    } catch (error) {
        console.error('Error in PUT /api/transactions/[id]:', error);
        return apiError('Error al actualizar transacción', 500, error);
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        const companyId = await getCompanyIdFromRequest(request, auth.userId);
        if (!companyId) return NextResponse.json({ error: 'Sin empresa' }, { status: 400 });

        const body = await request.json();

        const data: any = {};
        if (body.isPaid !== undefined) data.isPaid = Boolean(body.isPaid);
        if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
        if (body.creditDays !== undefined) data.creditDays = body.creditDays ? parseInt(body.creditDays) : null;

        // Allows: PENDING_APPROVAL → ACTIVE (bot approval) and ANNULLED → ACTIVE (restore)
        if (body.status === 'ACTIVE') data.status = 'ACTIVE';

        const transaction = await (prisma.transaction as any).update({
            where: { id, companyId },
            data,
            include: { category: true },
        });

        return NextResponse.json({ transaction });
    } catch (error) {
        return apiError('Error al actualizar transacción', 500, error);
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const companyId = await getCompanyIdFromRequest(request, auth.userId);
        if (!companyId) {
            return NextResponse.json({ error: 'No se encontró la empresa' }, { status: 400 });
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id, companyId },
            include: {
                category: true,
                client: true
            }
        });

        if (!transaction) {
            return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 });
        }

        // Obtener historial de auditoría
        const history = await prisma.auditLog.findMany({
            where: { resourceId: id },
            orderBy: { timestamp: 'desc' }
        });

        return NextResponse.json({ transaction, history });
    } catch (error) {
        return apiError('Error al obtener transacción', 500, error);
    }
}
