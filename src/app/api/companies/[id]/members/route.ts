import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth/jwt';
import { apiError } from '@/lib/api/error-response';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        // Verify user belongs to this company
        const userInCompany = await prisma.company.findFirst({
            where: { id, users: { some: { id: auth.userId } } },
        });
        if (!userInCompany) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

        const members = await (prisma as any).companyMember.findMany({
            where: { companyId: id },
            include: { user: { select: { id: true, email: true, role: true } } },
            orderBy: { joinedAt: 'asc' },
        });

        return NextResponse.json({ members });
    } catch (error) {
        return apiError('Error al obtener miembros', 500, error);
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        // Only CONTADOR or SUPER_ADMIN can invite
        if (!['CONTADOR', 'SUPER_ADMIN'].includes(auth.role)) {
            return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
        }

        const { email, role } = await request.json();
        if (!email) return NextResponse.json({ error: 'email requerido' }, { status: 400 });

        const targetUser = await prisma.user.findUnique({ where: { email } });
        if (!targetUser) return NextResponse.json({ error: 'Usuario no encontrado con ese email' }, { status: 404 });

        const member = await prisma.$transaction(async (tx) => {
            const m = await (tx as any).companyMember.upsert({
                where: { userId_companyId: { userId: targetUser.id, companyId: id } },
                update: { role: role || 'CLIENTE' },
                create: { userId: targetUser.id, companyId: id, role: role || 'CLIENTE' },
                include: { user: { select: { id: true, email: true, role: true } } },
            });
            // Link M2M Company<->User so que la lista del usuario refleje la empresa
            await tx.company.update({
                where: { id },
                data: { users: { connect: { id: targetUser.id } } },
            });
            return m;
        });

        return NextResponse.json({ member }, { status: 201 });
    } catch (error) {
        return apiError('Error al agregar miembro', 500, error);
    }
}
