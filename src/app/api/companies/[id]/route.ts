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

        const company = await prisma.company.findFirst({
            where: { id, users: { some: { id: auth.userId } } },
        });
        if (!company) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });

        return NextResponse.json({ company });
    } catch (error) {
        return apiError('Error al obtener empresa', 500, error);
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

        if (!['CONTADOR', 'SUPER_ADMIN'].includes(auth.role)) {
            return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
        }

        const company = await prisma.company.findFirst({
            where: { id, users: { some: { id: auth.userId } } },
        });
        if (!company) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });

        const body = await request.json();
        const { name, metadata } = body;

        const updated = await prisma.company.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(metadata && { metadata }),
            },
        });

        return NextResponse.json({ company: updated });
    } catch (error) {
        return apiError('Error al actualizar empresa', 500, error);
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
            return NextResponse.json({ error: 'Solo SUPER_ADMIN puede eliminar empresas' }, { status: 403 });
        }

        const company = await prisma.company.findUnique({ where: { id } });
        if (!company) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });

        await prisma.company.delete({ where: { id } });

        return NextResponse.json({ ok: true });
    } catch (error) {
        return apiError('Error al eliminar empresa', 500, error);
    }
}
