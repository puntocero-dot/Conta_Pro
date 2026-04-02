import { NextResponse } from 'next/server';
import { hasPermission, Role } from './rbac';

/**
 * Verifica si un rol tiene el permiso indicado.
 * Retorna una respuesta 403 si no tiene permiso, null si tiene permiso.
 */
export function requirePermission(role: string, permission: string): NextResponse | null {
    if (!hasPermission(role as Role, permission)) {
        return NextResponse.json(
            { error: 'No tienes permiso para realizar esta acción' },
            { status: 403 }
        );
    }
    return null;
}
