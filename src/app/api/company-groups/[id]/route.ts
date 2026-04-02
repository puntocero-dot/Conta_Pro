import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth/jwt';
import { apiError } from '@/lib/api/error-response';

export async function PUT(
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

        const { name } = await request.json();
        if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });

        const updated = await (prisma as any).companyGroup.update({
            where: { id },
            data: { name: name.trim(), updatedAt: new Date() },
        });

        return NextResponse.json({ group: updated });
    } catch (error) {
        return apiError('Error al actualizar grupo', 500, error);
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

        const group = await (prisma as any).companyGroup.findUnique({ where: { id } });
        if (!group) return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
        if (group.ownerId !== auth.userId) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

        // Desvincular empresas del grupo antes de borrar
        await prisma.company.updateMany({
            where: { groupId: id },
            data: { groupId: null },
        });

        await (prisma as any).companyGroup.delete({ where: { id } });

        return NextResponse.json({ ok: true });
    } catch (error) {
        return apiError('Error al eliminar grupo', 500, error);
    }
}
