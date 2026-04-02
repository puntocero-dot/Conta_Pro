import { jwtVerify, JWTPayload } from 'jose';

function getEncodedSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error('JWT_SECRET env var debe estar definido y tener al menos 32 caracteres');
    }
    return new TextEncoder().encode(secret);
}

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
        const { payload } = await jwtVerify(token, getEncodedSecret());
        return payload as AuthPayload;
    } catch (error) {
        return null;
    }
}
