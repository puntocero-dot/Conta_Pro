import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const companyId = await getCompanyIdFromRequest(request, auth.userId);
        if (!companyId) {
            return NextResponse.json({ clients: [] });
        }

        const { searchParams } = new URL(request.url);
        const role = searchParams.get('role');

        const clients = await prisma.accountClient.findMany({
            where: { 
                companyId,
                ...(role ? { role: role as any } : {})
            },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json({ clients });
    } catch (error: any) {
        console.error('Error in GET /api/clients:', error);
        return NextResponse.json(
            { error: 'Error al obtener clientes', details: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const body = await request.json();
        const { name, email, phone, nit, dui, address, type, role } = body;

        if (!name || !type) {
            return NextResponse.json(
                { error: 'Nombre y tipo son requeridos' },
                { status: 400 }
            );
        }

        const companyId = await getCompanyIdFromRequest(request, auth.userId);
        if (!companyId) {
            return NextResponse.json(
                { error: 'El usuario debe tener al menos una empresa para registrar clientes' },
                { status: 400 }
            );
        }

        const client = await (prisma.accountClient as any).create({
            data: {
                name,
                email,
                phone,
                nit,
                dui,
                address,
                type,
                role: (role as any) || 'CLIENT',
                companyId
            }
        });

        return NextResponse.json({ client }, { status: 201 });
    } catch (error: any) {
        console.error('Error in POST /api/clients:', error);
        return NextResponse.json(
            { error: 'Error al crear cliente', details: error.message },
            { status: 500 }
        );
    }
}
