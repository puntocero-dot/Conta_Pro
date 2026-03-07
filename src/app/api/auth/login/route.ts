import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { generateToken, AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS } from '@/lib/auth/jwt';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email y contraseña son requeridos' },
                { status: 400 }
            );
        }

        // Buscar usuario
        const user = await prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() },
        });

        if (!user) {
            console.log(`[AUTH DEBUG] Login fallido: Usuario no encontrado (${email})`);
            return NextResponse.json(
                { error: 'Credenciales inválidas - Usuario no encontrado' },
                { status: 401 }
            );
        }

        // Verificar password
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            console.log(`[AUTH DEBUG] Login fallido: Password incorrecto para ${email}`);
            return NextResponse.json(
                { error: 'Credenciales inválidas - Contraseña incorrecta' },
                { status: 401 }
            );
        }

        // Generar JWT
        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        // Crear response con cookie
        const response = NextResponse.json({
            message: 'Login exitoso',
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
        });

        response.cookies.set(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);

        return response;
    } catch (error: any) {
        console.error('Login error detail:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        return NextResponse.json(
            {
                error: 'Error interno del servidor',
                debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
                detail: error.message // Temporarily expose for live debugging
            },
            { status: 500 }
        );
    }
}
