import { NextResponse } from 'next/server';

/**
 * Retorna una respuesta de error segura.
 * En desarrollo muestra detalles del error; en producción solo el mensaje genérico.
 */
export function apiError(message: string, status: number, error?: unknown): NextResponse {
    const isDev = process.env.NODE_ENV === 'development';
    const body: Record<string, unknown> = { error: message };

    if (isDev && error) {
        body.details = error instanceof Error ? error.message : String(error);
    }

    return NextResponse.json(body, { status });
}
