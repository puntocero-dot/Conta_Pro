import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth/jwt';
import { apiError } from '@/lib/api/error-response';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; memberId: string }> }
) {
    try {
        const { id, memberId } = await params;
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        if (!['CONTADOR', 'SUPER_ADMIN'].includes(auth.role)) {
            return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
        }

        const { role } = await request.json();
        const member = await (prisma as any).companyMember.update({
            where: { id: memberId, companyId: id },
            data: { role },
            include: { user: { select: { id: true, email: true } } },
        });

        return NextResponse.json({ member });
    } catch (error) {
        return apiError('Error al actualizar miembro', 500, error);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; memberId: string }> }
) {
    try {
        const { id, memberId } = await params;
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        if (!['CONTADOR', 'SUPER_ADMIN'].includes(auth.role)) {
            return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
        }

        const member = await (prisma as any).companyMember.findUnique({
            where: { id: memberId },
        });
        if (!member) return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 });

        await (prisma as any).companyMember.delete({ where: { id: memberId } });

        // Remove M2M link too
        await prisma.company.update({
            where: { id },
            data: { users: { disconnect: { id: member.userId } } },
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        return apiError('Error al remover miembro', 500, error);
    }
}
