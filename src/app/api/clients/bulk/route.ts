import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';
import { apiError } from '@/lib/api/error-response';
import { requirePermission } from '@/lib/auth/authorize';

export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        const permError = requirePermission(auth.role, 'client:create');
        if (permError) return permError;

        const companyId = await getCompanyIdFromRequest(request, auth.userId);
        if (!companyId) return NextResponse.json({ error: 'Empresa requerida' }, { status: 400 });

        const body = await request.json();
        const { clients = [] } = body;

        if (!Array.isArray(clients) || clients.length === 0) {
            return NextResponse.json({ error: 'Se requiere una lista de clientes' }, { status: 400 });
        }

        const created = await prisma.$transaction(
            clients.map((c: any) => prisma.accountClient.create({
                data: {
                    name: c.name,
                    email: c.email,
                    phone: c.phone,
                    nit: c.nit,
                    dui: c.dui,
                    address: c.address,
                    type: c.type || 'INDIVIDUAL',
                    role: c.role || 'CLIENT',
                    companyId
                }
            }))
        );

        return NextResponse.json({ count: created.length }, { status: 201 });
    } catch (error) {
        return apiError('Error en carga masiva de clientes', 500, error);
    }
}
