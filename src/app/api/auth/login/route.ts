import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { generateToken, AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS } from '@/lib/auth/jwt';
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from '@/lib/auth/rate-limiter';

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

        const identifier = email.trim().toLowerCase();

        // Verificar rate limit antes de procesar
        const rateCheck = checkRateLimit(identifier);
        if (!rateCheck.allowed) {
            return NextResponse.json(
                {
                    error: 'Demasiados intentos fallidos. Por favor intente más tarde.',
                    retryAfter: rateCheck.retryAfter,
                },
                { status: 429 }
            );
        }

        // Buscar usuario
        const user = await prisma.user.findUnique({
            where: { email: identifier },
        });

        if (!user) {
            recordFailedAttempt(identifier);
            return NextResponse.json(
                { error: 'Credenciales inválidas' },
                { status: 401 }
            );
        }

        // Verificar password
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            recordFailedAttempt(identifier);
            return NextResponse.json(
                { error: 'Credenciales inválidas' },
                { status: 401 }
            );
        }

        // Login exitoso: limpiar rate limit
        clearRateLimit(identifier);

        // Generar JWT
        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

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
    } catch (error) {
        console.error('[Login] Error interno:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
