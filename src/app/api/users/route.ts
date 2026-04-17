import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth/jwt';
import { apiError } from '@/lib/api/error-response';
import bcrypt from 'bcryptjs';

const VALID_ROLES = ['SUPER_ADMIN', 'CONTADOR', 'AUDITOR', 'CLIENTE'];

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        if (auth.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Solo SUPER_ADMIN puede listar usuarios' }, { status: 403 });
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
                _count: { select: { companies: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ users });
    } catch (error) {
        return apiError('Error al obtener usuarios', 500, error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        if (auth.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Solo SUPER_ADMIN puede crear usuarios' }, { status: 403 });

        const { email, password, role } = await request.json();

        if (!email || !password) return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 });
        if (role && !VALID_ROLES.includes(role)) return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });

        const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
        if (existing) return NextResponse.json({ error: 'El email ya está registrado' }, { status: 409 });

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
            data: { email: email.trim().toLowerCase(), passwordHash, role: role || 'CLIENTE' },
            select: { id: true, email: true, role: true, createdAt: true },
        });

        return NextResponse.json({ user }, { status: 201 });
    } catch (error) {
        return apiError('Error al crear usuario', 500, error);
    }
}
