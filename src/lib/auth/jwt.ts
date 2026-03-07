import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const TOKEN_EXPIRY = '7d';
const COOKIE_NAME = 'conta2go_token';

export interface AuthPayload {
    userId: string;
    email: string;
    role: string;
}

/**
 * Genera un JWT firmado con los datos del usuario
 */
export function generateToken(payload: AuthPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Verifica y decodifica un JWT
 */
export function verifyToken(token: string): AuthPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as AuthPayload;
    } catch {
        return null;
    }
}

/**
 * Extrae el token de auth de una request (cookie o header Authorization)
 */
export async function getAuthFromRequest(request: NextRequest): Promise<AuthPayload | null> {
    // 1. Intentar desde cookie
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get(COOKIE_NAME)?.value;
    if (cookieToken) {
        const payload = verifyToken(cookieToken);
        if (payload) return payload;
    }

    // 2. Intentar desde header Authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        return verifyToken(token);
    }

    return null;
}

/**
 * Nombre de la cookie de auth (para set/delete)
 */
export const AUTH_COOKIE_NAME = COOKIE_NAME;
export const AUTH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 días
};
