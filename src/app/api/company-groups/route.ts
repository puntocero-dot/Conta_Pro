import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth/jwt';
import { apiError } from '@/lib/api/error-response';

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        const groups = await (prisma as any).companyGroup.findMany({
            where: { ownerId: auth.userId },
            include: {
                companies: {
                    select: { id: true, name: true, taxId: true, country: true, metadata: true },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json({ groups });
    } catch (error) {
        return apiError('Error al obtener grupos', 500, error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        const { name } = await request.json();
        if (!name?.trim()) {
            return NextResponse.json({ error: 'El nombre del grupo es requerido' }, { status: 400 });
        }

        const group = await (prisma as any).companyGroup.create({
            data: { name: name.trim(), ownerId: auth.userId },
        });

        return NextResponse.json({ group }, { status: 201 });
    } catch (error) {
        return apiError('Error al crear grupo', 500, error);
    }
}
