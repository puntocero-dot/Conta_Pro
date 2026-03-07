import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth/jwt';

export async function POST() {
    const response = NextResponse.json({ message: 'Sesión cerrada' });

    response.cookies.set(AUTH_COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0, // Eliminar cookie inmediatamente
    });

    return response;
}
