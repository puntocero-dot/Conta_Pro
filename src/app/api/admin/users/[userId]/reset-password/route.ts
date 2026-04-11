import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth/jwt';
import { hash } from 'bcryptjs';
import { requirePermission } from '@/lib/auth/authorize';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const auth = await getAuthFromRequest(request);

        if (!auth) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        // Solo Super Admins o Contadores con permiso pueden resetear claves de usuarios
        const permError = requirePermission(auth.role, 'users:update');
        if (permError && auth.role !== 'CONTADOR') return permError;

        const { newPassword } = await request.json();

        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
        }

        const passwordHash = await hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash }
        });

        return NextResponse.json({ success: true, message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        console.error('Error resetting password:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
