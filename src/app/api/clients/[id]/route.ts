import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';
import { apiError } from '@/lib/api/error-response';
import { requirePermission } from '@/lib/auth/authorize';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        const companyId = await getCompanyIdFromRequest(request, auth.userId);
        if (!companyId) return NextResponse.json({ error: 'No se encontró empresa' }, { status: 400 });

        const client = await prisma.accountClient.findFirst({
            where: { id, companyId },
        });
        if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

        return NextResponse.json({ client });
    } catch (error) {
        return apiError('Error al obtener cliente', 500, error);
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        const permError = requirePermission(auth.role, 'client:update');
        if (permError) return permError;

        const companyId = await getCompanyIdFromRequest(request, auth.userId);
        if (!companyId) return NextResponse.json({ error: 'No se encontró empresa' }, { status: 400 });

        const existing = await prisma.accountClient.findFirst({
            where: { id, companyId },
        });
        if (!existing) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

        const body = await request.json();
        const { name, email, phone, nit, dui, address, type, role } = body;

        const updated = await prisma.accountClient.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(email !== undefined && { email }),
                ...(phone !== undefined && { phone }),
                ...(nit !== undefined && { nit }),
                ...(dui !== undefined && { dui }),
                ...(address !== undefined && { address }),
                ...(type && { type }),
                ...(role && { role }),
            },
        });

        return NextResponse.json({ client: updated });
    } catch (error) {
        return apiError('Error al actualizar cliente', 500, error);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        const permError = requirePermission(auth.role, 'client:delete');
        if (permError) return permError;

        const companyId = await getCompanyIdFromRequest(request, auth.userId);
        if (!companyId) return NextResponse.json({ error: 'No se encontró empresa' }, { status: 400 });

        const existing = await prisma.accountClient.findFirst({
            where: { id, companyId },
        });
        if (!existing) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

        await prisma.accountClient.delete({ where: { id } });

        return NextResponse.json({ ok: true });
    } catch (error) {
        return apiError('Error al eliminar cliente', 500, error);
    }
}
