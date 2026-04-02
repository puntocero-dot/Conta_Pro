import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth/jwt';
import { apiError } from '@/lib/api/error-response';

const VALID_ROLES = ['SUPER_ADMIN', 'CONTADOR', 'AUDITOR', 'CLIENTE'];

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        if (auth.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Solo SUPER_ADMIN puede cambiar roles' }, { status: 403 });
        }

        const { role } = await request.json();
        if (!role || !VALID_ROLES.includes(role)) {
            return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
        }

        // Prevent demoting yourself
        if (id === auth.userId && role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'No puedes cambiar tu propio rol' }, { status: 400 });
        }

        const user = await prisma.user.update({
            where: { id },
            data: { role: role as any },
            select: { id: true, email: true, role: true },
        });

        return NextResponse.json({ user });
    } catch (error) {
        return apiError('Error al actualizar usuario', 500, error);
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

        if (auth.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Solo SUPER_ADMIN puede eliminar usuarios' }, { status: 403 });
        }

        if (id === auth.userId) {
            return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 });
        }

        await prisma.user.delete({ where: { id } });

        return NextResponse.json({ ok: true });
    } catch (error) {
        return apiError('Error al eliminar usuario', 500, error);
    }
}
