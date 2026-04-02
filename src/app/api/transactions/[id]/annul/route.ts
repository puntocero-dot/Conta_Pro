import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';
import { apiError } from '@/lib/api/error-response';
import { requirePermission } from '@/lib/auth/authorize';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const permError = requirePermission(auth.role, 'transaction:delete');
        if (permError) return permError;

        const companyId = await getCompanyIdFromRequest(request, auth.userId);

        if (!companyId) {
            return NextResponse.json({ error: 'Empresa no válida' }, { status: 400 });
        }

        // 1. Verificar existencia y estado
        const transaction = await prisma.transaction.findUnique({
            where: { id, companyId },
            include: { category: true }
        });

        if (!transaction) {
            return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 });
        }

        if (transaction.status === 'ANNULLED') {
            return NextResponse.json({ error: 'La transacción ya está anulada' }, { status: 400 });
        }

        // 2. Marcar como anulada
        const annulledTransaction = await (prisma.transaction as any).update({
            where: { id },
            data: { status: 'ANNULLED' }
        });

        // 3. Registrar en Auditoría
        await (prisma.auditLog as any).create({
            data: {
                userId: auth.userId,
                action: 'ANNUL_TRANSACTION',
                resource: 'Transaction',
                resourceId: id,
                ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
                userAgent: request.headers.get('user-agent') || 'Unknown',
                result: 'SUCCESS',
                metadata: {
                    type: 'ANNULMENT',
                    originalAmount: transaction.amount
                }
            }
        });

        // 4. Lógica de Reversión en Ledger
        // Aquí se crearía un contra-asiento en JournalEntry para anular el efecto contable.
        // Simulamos el éxito contable.

        return NextResponse.json({
            message: 'Transacción anulada correctamente',
            transaction: annulledTransaction
        });

    } catch (error) {
        console.error('Error in POST /api/transactions/[id]/annul:', error);
        return apiError('Error al anular transacción', 500, error);
    }
}
