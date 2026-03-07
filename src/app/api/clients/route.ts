import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        // Get user's company
        const userRecord = await prisma.user.findUnique({
            where: { id: auth.userId },
            include: { companies: true },
        });

        if (!userRecord || userRecord.companies.length === 0) {
            return NextResponse.json({ clients: [] });
        }

        const companyId = userRecord.companies[0].id;

        // For now, return mock data until we add Client model
        const mockClients = [
            {
                id: '1',
                name: 'Juan Pérez',
                email: 'juan@example.com',
                phone: '+503 7123-4567',
                nit: '0614-210188-101-2',
                dui: '01234567-8',
                address: 'San Salvador',
                type: 'INDIVIDUAL',
                balance: 1500.00,
                companyId,
            }
        ];

        return NextResponse.json({ clients: mockClients });
    } catch (error) {
        console.error('Error fetching clients:', error);
        return NextResponse.json(
            { error: 'Error al obtener clientes' },
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
        const { name, email, phone, nit, dui, address, type } = body;

        // Validations
        if (!name || !type) {
            return NextResponse.json(
                { error: 'Nombre y tipo son requeridos' },
                { status: 400 }
            );
        }

        // Get user's company
        const userRecord = await prisma.user.findUnique({
            where: { id: auth.userId },
            include: { companies: true },
        });

        if (!userRecord || userRecord.companies.length === 0) {
            return NextResponse.json(
                { error: 'Usuario sin empresa asignada' },
                { status: 400 }
            );
        }

        const companyId = userRecord.companies[0].id;

        // TODO: Create client when model is added
        const client = {
            id: Date.now().toString(),
            name,
            email,
            phone,
            nit,
            dui,
            address,
            type,
            balance: 0,
            companyId,
        };

        return NextResponse.json({ client }, { status: 201 });
    } catch (error) {
        console.error('Error creating client:', error);
        return NextResponse.json(
            { error: 'Error al crear cliente' },
            { status: 500 }
        );
    }
}
