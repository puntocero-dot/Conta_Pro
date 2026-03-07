import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs, AuditAction, AuditResult } from '@/lib/audit/audit-service';
import { getAuthFromRequest } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        // Obtener parámetros de query
        const searchParams = request.nextUrl.searchParams;
        const queryUserId = searchParams.get('userId') || undefined;
        const queryAction = searchParams.get('action') as AuditAction | undefined;
        const queryResource = searchParams.get('resource') || undefined;
        const queryResult = searchParams.get('result') as AuditResult | undefined;
        const queryLimit = parseInt(searchParams.get('limit') || '50');
        const queryOffset = parseInt(searchParams.get('offset') || '0');

        const queryStartDate = searchParams.get('startDate')
            ? new Date(searchParams.get('startDate')!)
            : undefined;
        const queryEndDate = searchParams.get('endDate')
            ? new Date(searchParams.get('endDate')!)
            : undefined;

        // Solo SUPER_ADMIN puede ver todos los logs, otros solo los suyos
        const logFilters = {
            userId: auth.role !== 'SUPER_ADMIN' ? auth.userId : queryUserId,
            action: queryAction,
            resource: queryResource,
            result: queryResult,
            startDate: queryStartDate,
            endDate: queryEndDate,
            limit: queryLimit,
            offset: queryOffset,
        };

        const logs = await getAuditLogs(logFilters);

        return NextResponse.json(logs);
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
