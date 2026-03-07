import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
    const auth = await getAuthFromRequest(request);

    if (!auth) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    try {
        const dbUser = await prisma.user.findUnique({
            where: { id: auth.userId },
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });

        if (!dbUser) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        return NextResponse.json(dbUser);
    } catch (error) {
        console.error('Error fetching user:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
