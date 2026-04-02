import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth/jwt';
import { apiError } from '@/lib/api/error-response';

// POST: add company to group
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        const group = await (prisma as any).companyGroup.findUnique({ where: { id } });
        if (!group) return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
        if (group.ownerId !== auth.userId) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

        const { companyId } = await request.json();
        if (!companyId) return NextResponse.json({ error: 'companyId requerido' }, { status: 400 });

        // Verify user owns this company
        const company = await prisma.company.findFirst({
            where: { id: companyId, users: { some: { id: auth.userId } } },
        });
        if (!company) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });

        const updated = await prisma.company.update({
            where: { id: companyId },
            data: { groupId: id },
        });

        return NextResponse.json({ company: updated });
    } catch (error) {
        return apiError('Error al agregar empresa al grupo', 500, error);
    }
}

// DELETE: remove company from group
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        const group = await (prisma as any).companyGroup.findUnique({ where: { id } });
        if (!group) return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
        if (group.ownerId !== auth.userId) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

        const { companyId } = await request.json();
        if (!companyId) return NextResponse.json({ error: 'companyId requerido' }, { status: 400 });

        await prisma.company.update({
            where: { id: companyId },
            data: { groupId: null },
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        return apiError('Error al quitar empresa del grupo', 500, error);
    }
}
