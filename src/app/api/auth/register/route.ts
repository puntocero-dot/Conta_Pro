import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { validatePassword } from '@/lib/auth/password-policy';
import { generateToken, AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS } from '@/lib/auth/jwt';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        // 1. Validate Input
        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email y contraseña son requeridos' },
                { status: 400 }
            );
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return NextResponse.json(
                { error: passwordValidation.errors[0] },
                { status: 400 }
            );
        }

        // 2. Verificar que no exista ya
        const existingUser = await prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'El email ya está registrado' },
                { status: 409 }
            );
        }

        // 3. Hash password con bcrypt
        const passwordHash = await bcrypt.hash(password, 12);

        // 4. Crear usuario en DB
        const newUser = await prisma.user.create({
            data: {
                email: email.trim().toLowerCase(),
                passwordHash,
                role: 'CLIENTE', // Default role
            },
        });

        // 5. Generar JWT y cookie
        const token = generateToken({
            userId: newUser.id,
            email: newUser.email,
            role: newUser.role,
        });

        const response = NextResponse.json({
            message: 'Usuario registrado exitosamente',
            user: {
                id: newUser.id,
                email: newUser.email,
                role: newUser.role,
            },
        });

        response.cookies.set(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);

        return response;
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
