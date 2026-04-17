import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';
import { apiError } from '@/lib/api/error-response';
import { requirePermission } from '@/lib/auth/authorize';

import { calcNextRunDate } from '@/lib/recurring-utils';

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        const companyId = await getCompanyIdFromRequest(request, auth.userId);
        if (!companyId) return NextResponse.json({ error: 'Empresa requerida' }, { status: 400 });

        const recurring = await (prisma.recurringTransaction as any).findMany({
            where: { companyId },
            include: {
                category: { select: { id: true, name: true, icon: true, color: true } },
                client: { select: { id: true, name: true } },
                _count: { select: { transactions: true } },
            },
            orderBy: [{ isActive: 'desc' }, { nextRunDate: 'asc' }],
        });

        return NextResponse.json({ recurring });
    } catch (error) {
        return apiError('Error al obtener recurrentes', 500, error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        const permError = requirePermission(auth.role, 'transaction:create');
        if (permError) return permError;

        const companyId = await getCompanyIdFromRequest(request, auth.userId);
        if (!companyId) return NextResponse.json({ error: 'Empresa requerida' }, { status: 400 });

        const body = await request.json();
        const { type, amount, description, frequency, dayOfMonth, cutoffDay, startDate, endDate, categoryId, clientId, notifyBefore, notifyOnDue } = body;

        if (!type || !amount || !description || !frequency || !startDate) {
            return NextResponse.json({ error: 'Faltan campos requeridos: tipo, monto, descripción, frecuencia, fecha inicio' }, { status: 400 });
        }

        const start = new Date(startDate);
        const nextRunDate = calcNextRunDate(frequency, dayOfMonth || null, start);

        const recurring = await (prisma.recurringTransaction as any).create({
            data: {
                companyId,
                type,
                amount: parseFloat(amount),
                description,
                frequency,
                dayOfMonth: dayOfMonth ? parseInt(dayOfMonth) : null,
                cutoffDay: cutoffDay ? parseInt(cutoffDay) : null,
                startDate: start,
                endDate: endDate ? new Date(endDate) : null,
                nextRunDate,
                categoryId: categoryId || null,
                clientId: clientId || null,
                notifyBefore: notifyBefore !== false,
                notifyOnDue: notifyOnDue !== false,
                createdBy: auth.userId,
            },
            include: {
                category: { select: { id: true, name: true, icon: true, color: true } },
                client: { select: { id: true, name: true } },
            },
        });

        return NextResponse.json({ recurring }, { status: 201 });
    } catch (error) {
        return apiError('Error al crear recurrente', 500, error);
    }
}
