import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';
import { apiError } from '@/lib/api/error-response';
import { requirePermission } from '@/lib/auth/authorize';
import { LedgerService } from '@/lib/accounting/ledger';

import { calcNextRunDate } from '@/lib/recurring-utils';

async function getRecurring(id: string, companyId: string) {
    return (prisma.recurringTransaction as any).findFirst({ where: { id, companyId } });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        const companyId = await getCompanyIdFromRequest(request, auth.userId);
        if (!companyId) return NextResponse.json({ error: 'Empresa requerida' }, { status: 400 });

        const recurring = await (prisma.recurringTransaction as any).findFirst({
            where: { id, companyId },
            include: {
                category: true,
                client: { select: { id: true, name: true } },
                transactions: { orderBy: { date: 'desc' }, take: 10, select: { id: true, date: true, amount: true, status: true } },
            },
        });
        if (!recurring) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
        return NextResponse.json({ recurring });
    } catch (error) {
        return apiError('Error al obtener recurrente', 500, error);
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        const permError = requirePermission(auth.role, 'transaction:create');
        if (permError) return permError;
        const companyId = await getCompanyIdFromRequest(request, auth.userId);
        if (!companyId) return NextResponse.json({ error: 'Empresa requerida' }, { status: 400 });

        const existing = await getRecurring(id, companyId);
        if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

        const body = await request.json();
        const { amount, description, dayOfMonth, cutoffDay, endDate, categoryId, clientId, isActive, notifyBefore, notifyOnDue } = body;

        const updated = await (prisma.recurringTransaction as any).update({
            where: { id },
            data: {
                ...(amount !== undefined && { amount: parseFloat(amount) }),
                ...(description !== undefined && { description }),
                ...(dayOfMonth !== undefined && { dayOfMonth: dayOfMonth ? parseInt(dayOfMonth) : null }),
                ...(cutoffDay !== undefined && { cutoffDay: cutoffDay ? parseInt(cutoffDay) : null }),
                ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
                ...(categoryId !== undefined && { categoryId: categoryId || null }),
                ...(clientId !== undefined && { clientId: clientId || null }),
                ...(isActive !== undefined && { isActive }),
                ...(notifyBefore !== undefined && { notifyBefore }),
                ...(notifyOnDue !== undefined && { notifyOnDue }),
            },
            include: { category: { select: { id: true, name: true, icon: true, color: true } }, client: { select: { id: true, name: true } } },
        });

        return NextResponse.json({ recurring: updated });
    } catch (error) {
        return apiError('Error al actualizar recurrente', 500, error);
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        const permError = requirePermission(auth.role, 'transaction:create');
        if (permError) return permError;
        const companyId = await getCompanyIdFromRequest(request, auth.userId);
        if (!companyId) return NextResponse.json({ error: 'Empresa requerida' }, { status: 400 });

        const existing = await getRecurring(id, companyId);
        if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

        await (prisma.recurringTransaction as any).delete({ where: { id } });
        return NextResponse.json({ ok: true });
    } catch (error) {
        return apiError('Error al eliminar recurrente', 500, error);
    }
}

// POST /api/recurring-transactions/[id]/execute — genera la transacción ahora
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        const permError = requirePermission(auth.role, 'transaction:create');
        if (permError) return permError;
        const companyId = await getCompanyIdFromRequest(request, auth.userId);
        if (!companyId) return NextResponse.json({ error: 'Empresa requerida' }, { status: 400 });

        const rt = await getRecurring(id, companyId);
        if (!rt) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
        if (!rt.isActive) return NextResponse.json({ error: 'El recurrente está inactivo' }, { status: 400 });

        const today = new Date();
        const transaction = await (prisma.transaction as any).create({
            data: {
                type: rt.type,
                amount: rt.amount,
                description: rt.description,
                date: today,
                companyId,
                userId: auth.userId,
                categoryId: rt.categoryId,
                clientId: rt.clientId,
                recurringId: rt.id,
                metadata: {
                    accountingMonth: today.getMonth() + 1,
                    accountingYear: today.getFullYear(),
                    generatedFromRecurring: true,
                },
            },
        });

        // Advance nextRunDate
        const nextRun = calcNextRunDate(rt.frequency, rt.dayOfMonth, today);
        await (prisma.recurringTransaction as any).update({
            where: { id },
            data: { nextRunDate: nextRun },
        });

        try {
            await LedgerService.processTransaction({
                companyId,
                amount: rt.amount,
                category: 'Recurrente',
                description: rt.description,
                reference: transaction.id,
                date: today,
            });
        } catch { /* non-fatal */ }

        return NextResponse.json({ transaction, nextRunDate: nextRun });
    } catch (error) {
        return apiError('Error al ejecutar recurrente', 500, error);
    }
}
