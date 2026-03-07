import { jwtVerify, JWTPayload } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const encodedSecret = new TextEncoder().encode(JWT_SECRET);

export interface AuthPayload extends JWTPayload {
    userId: string;
    email: string;
    role: string;
}

/**
 * Verifica un token JWT usando la librería 'jose' (compatible con Edge Runtime/Middleware)
 */
export async function verifyTokenEdge(token: string): Promise<AuthPayload | null> {
    try {
        const { payload } = await jwtVerify(token, encodedSecret);
        return payload as AuthPayload;
    } catch (error) {
        return null;
    }
}
