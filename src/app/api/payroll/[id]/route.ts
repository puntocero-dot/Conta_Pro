import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth/jwt';
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

        const companyId = request.headers.get('x-company-id');
        if (!companyId) return NextResponse.json({ error: 'Empresa requerida' }, { status: 400 });

        const payroll = await prisma.payroll.findFirst({
            where: { id, companyId },
            include: { employees: true },
        });
        if (!payroll) return NextResponse.json({ error: 'Planilla no encontrada' }, { status: 404 });

        return NextResponse.json({ payroll });
    } catch (error) {
        return apiError('Error al obtener planilla', 500, error);
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
        const permError = requirePermission(auth.role, 'payroll:delete');
        if (permError) return permError;

        const companyId = request.headers.get('x-company-id');
        if (!companyId) return NextResponse.json({ error: 'Empresa requerida' }, { status: 400 });

        const payroll = await prisma.payroll.findFirst({ where: { id, companyId } });
        if (!payroll) return NextResponse.json({ error: 'Planilla no encontrada' }, { status: 404 });
        if (payroll.status === 'PAID') {
            return NextResponse.json({ error: 'No se puede eliminar una planilla pagada' }, { status: 409 });
        }

        await prisma.payroll.delete({ where: { id } });
        return NextResponse.json({ ok: true });
    } catch (error) {
        return apiError('Error al eliminar planilla', 500, error);
    }
}
