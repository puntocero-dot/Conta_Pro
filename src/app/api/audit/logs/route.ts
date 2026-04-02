import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs, AuditAction, AuditResult } from '@/lib/audit/audit-service';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';
import { apiError } from '@/lib/api/error-response';
import { requirePermission } from '@/lib/auth/authorize';

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const permError = requirePermission(auth.role, 'audit_log:read');
        if (permError) return permError;

        const searchParams = request.nextUrl.searchParams;
        const queryUserId = searchParams.get('userId') || undefined;
        const queryAction = searchParams.get('action') as AuditAction | undefined;
        const queryResource = searchParams.get('resource') || undefined;
        const queryResult = searchParams.get('result') as AuditResult | undefined;
        const queryLimit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
        const queryOffset = parseInt(searchParams.get('offset') || '0');

        const queryStartDate = searchParams.get('startDate')
            ? new Date(searchParams.get('startDate')!)
            : undefined;
        const queryEndDate = searchParams.get('endDate')
            ? new Date(searchParams.get('endDate')!)
            : undefined;

        // Obtener companyId para aislamiento de tenant
        const companyId = await getCompanyIdFromRequest(request, auth.userId);

        const logFilters = {
            // SUPER_ADMIN puede filtrar por cualquier usuario, otros solo ven los suyos
            userId: auth.role !== 'SUPER_ADMIN' ? auth.userId : queryUserId,
            // Non-SUPER_ADMIN siempre filtran por su empresa
            companyId: auth.role !== 'SUPER_ADMIN' ? (companyId || undefined) : undefined,
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
        return apiError('Error al obtener registros de auditoría', 500, error);
    }
}
