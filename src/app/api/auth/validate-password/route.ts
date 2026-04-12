import { NextRequest, NextResponse } from 'next/server';
import { validatePasswordSecurity } from '@/lib/auth/hibp-validator';
import { getAuthFromRequest } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
    try {
        // Se permite acceso público para validación durante el registro

        const { password } = await request.json();

        if (!password) {
            return NextResponse.json(
                { error: 'Password requerido' },
                { status: 400 }
            );
        }

        const result = await validatePasswordSecurity(password);

        return NextResponse.json(result);
    } catch (error) {
        console.error('[ValidatePassword] Error:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
