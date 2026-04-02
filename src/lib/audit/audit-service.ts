/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '../prisma';
import { logger } from '../logging/logger';
import { maskSensitiveData } from '../encryption/crypto';

/**
 * Servicio centralizado de Audit Logs
 * Registra todas las acciones críticas del sistema
 */

export enum AuditAction {
    // Autenticación
    USER_LOGIN = 'user_login',
    USER_LOGOUT = 'user_logout',
    USER_LOGIN_FAILED = 'user_login_failed',
    MFA_ENABLED = 'mfa_enabled',
    MFA_DISABLED = 'mfa_disabled',
    PASSWORD_CHANGED = 'password_changed',
    EMAIL_CHANGED = 'email_changed',

    // Datos
    COMPANY_CREATED = 'company_created',
    COMPANY_UPDATED = 'company_updated',
    COMPANY_DELETED = 'company_deleted',
    TRANSACTION_CREATED = 'transaction_created',
    TRANSACTION_UPDATED = 'transaction_updated',
    TRANSACTION_DELETED = 'transaction_deleted',

    // Reportes y Exportaciones
    REPORT_GENERATED = 'report_generated',
    DATA_EXPORTED = 'data_exported',

    // Administración
    USER_CREATED = 'user_created',
    USER_UPDATED = 'user_updated',
    USER_DELETED = 'user_deleted',
    ROLE_CHANGED = 'role_changed',
    PERMISSION_CHANGED = 'permission_changed',

    // Seguridad
    SUSPICIOUS_ACTIVITY = 'suspicious_activity',
    ACCESS_DENIED = 'access_denied',
    RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
    SESSION_EXPIRED = 'session_expired',
}

export enum AuditResult {
    SUCCESS = 'success',
    FAILURE = 'failure',
    BLOCKED = 'blocked',
    WARNING = 'warning',
}

export interface AuditLogData {
    userId?: string;
    companyId?: string;
    action: AuditAction;
    resource: string;
    resourceId?: string;
    ipAddress: string;
    userAgent: string;
    geoLocation?: {
        country?: string;
        city?: string;
        lat?: number;
        lon?: number;
    };
    oldData?: any;
    newData?: any;
    result: AuditResult;
    metadata?: any;
}

/**
 * Crea un registro de auditoría
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
    try {
        // Enmascarar datos sensibles antes de guardar
        const maskedOldData = data.oldData ? maskSensitiveFields(data.oldData) : null;
        const maskedNewData = data.newData ? maskSensitiveFields(data.newData) : null;

        // Guardar en la base de datos
        await prisma.auditLog.create({
            data: {
                userId: data.userId,
                companyId: data.companyId,
                action: data.action,
                resource: data.resource,
                resourceId: data.resourceId,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
                geoLocation: (data.geoLocation || null) as unknown as any,
                oldData: maskedOldData as any,
                newData: maskedNewData as any,
                result: data.result,
                metadata: data.metadata || null,
            },
        });

        // También loguear en el sistema de logs
        logger.security(`Audit: ${data.action}`, {
            userId: data.userId ? maskSensitiveData(data.userId, 4) : undefined,
            resource: data.resource,
            result: data.result,
        });

        // Si es una acción sospechosa o fallida, enviar alerta
        if (
            data.result === AuditResult.FAILURE ||
            data.result === AuditResult.BLOCKED ||
            data.action === AuditAction.SUSPICIOUS_ACTIVITY
        ) {
            await triggerSecurityAlert(data);
        }
    } catch (error) {
        logger.error('Failed to create audit log', error as Error, {
            action: data.action,
            resource: data.resource,
        });
    }
}

/**
 * Enmascara campos sensibles en los datos
 */
function maskSensitiveFields(data: unknown): unknown {
    if (!data || typeof data !== 'object') return data;

    const masked = { ...(data as object) } as Record<string, unknown>;
    const sensitiveFields = ['password', 'token', 'ssn', 'taxId', 'bankAccount', 'creditCard'];

    for (const [key, value] of Object.entries(masked)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
            if (typeof value === 'string') {
                masked[key] = maskSensitiveData(value, 2);
            }
        }
    }

    return masked;
}

/**
 * Obtiene logs de auditoría con filtros
 */
export async function getAuditLogs(filters: {
    userId?: string;
    companyId?: string;
    action?: AuditAction;
    resource?: string;
    result?: AuditResult;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}) {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.action) where.action = filters.action;
    if (filters.resource) where.resource = filters.resource;
    if (filters.result) where.result = filters.result;

    if (filters.startDate || filters.endDate) {
        where.timestamp = {};
        if (filters.startDate) where.timestamp.gte = filters.startDate;
        if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: filters.limit || 50,
            skip: filters.offset || 0,
            include: {
                user: {
                    select: {
                        email: true,
                        role: true,
                    },
                },
            },
        }),
        prisma.auditLog.count({ where }),
    ]);

    return {
        logs,
        total,
        hasMore: total > (filters.offset || 0) + (filters.limit || 50),
    };
}

/**
 * Obtiene estadísticas de auditoría
 */
export async function getAuditStats(userId?: string) {
    const where = userId ? { userId } : {};

    const [
        totalLogs,
        failedActions,
        suspiciousActivity,
        recentLogins,
    ] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.count({
            where: {
                ...where,
                result: AuditResult.FAILURE,
            },
        }),
        prisma.auditLog.count({
            where: {
                ...where,
                action: AuditAction.SUSPICIOUS_ACTIVITY,
            },
        }),
        prisma.auditLog.count({
            where: {
                ...where,
                action: AuditAction.USER_LOGIN,
                timestamp: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Últimas 24 horas
                },
            },
        }),
    ]);

    return {
        totalLogs,
        failedActions,
        suspiciousActivity,
        recentLogins,
    };
}

/**
 * Detecta actividad sospechosa
 */
export async function detectSuspiciousActivity(userId: string, ipAddress: string): Promise<boolean> {
    // Verificar múltiples intentos fallidos
    const recentFailures = await prisma.auditLog.count({
        where: {
            userId,
            result: AuditResult.FAILURE,
            timestamp: {
                gte: new Date(Date.now() - 15 * 60 * 1000), // Últimos 15 minutos
            },
        },
    });

    if (recentFailures >= 5) {
        await createAuditLog({
            userId,
            action: AuditAction.SUSPICIOUS_ACTIVITY,
            resource: 'security',
            ipAddress,
            userAgent: 'system',
            result: AuditResult.WARNING,
            metadata: {
                reason: 'multiple_failed_attempts',
                count: recentFailures,
            },
        });
        return true;
    }

    // Verificar accesos desde múltiples IPs en corto tiempo
    const recentIPs = await prisma.auditLog.findMany({
        where: {
            userId,
            action: AuditAction.USER_LOGIN,
            timestamp: {
                gte: new Date(Date.now() - 60 * 60 * 1000), // Última hora
            },
        },
        select: {
            ipAddress: true,
        },
        distinct: ['ipAddress'],
    });

    if (recentIPs.length >= 3) {
        await createAuditLog({
            userId,
            action: AuditAction.SUSPICIOUS_ACTIVITY,
            resource: 'security',
            ipAddress,
            userAgent: 'system',
            result: AuditResult.WARNING,
            metadata: {
                reason: 'multiple_ip_addresses',
                ips: recentIPs.map(r => r.ipAddress),
            },
        });
        return true;
    }

    return false;
}

/**
 * Trigger de alertas de seguridad
 */
async function triggerSecurityAlert(data: AuditLogData): Promise<void> {
    // TODO: Implementar envío de emails/SMS
    // Por ahora, solo loguear
    logger.security('Security Alert Triggered', {
        action: data.action,
        result: data.result,
        userId: data.userId,
    });

    // Aquí se integraría con servicios como:
    // - SendGrid para emails
    // - Twilio para SMS
    // - Slack/Discord webhooks
    // - PagerDuty para incidentes críticos
}
