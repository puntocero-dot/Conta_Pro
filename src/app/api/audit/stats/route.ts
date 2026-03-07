import { NextRequest, NextResponse } from 'next/server';
import { getAuditStats } from '@/lib/audit/audit-service';
import { getAuthFromRequest } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        // Verificar que sea SUPER_ADMIN
        if (auth.role !== 'SUPER_ADMIN') {
            return NextResponse.json(
                { error: 'Forbidden - Admin access required' },
                { status: 403 }
            );
        }

        const stats = await getAuditStats();

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error fetching audit stats:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
