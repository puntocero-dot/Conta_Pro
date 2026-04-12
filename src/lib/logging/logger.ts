import { maskSensitiveData } from '../encryption/crypto';

/**
 * Sistema de logging seguro que enmascara datos sensibles
 */

export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    SECURITY = 'SECURITY',
}

export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    message: string;
    metadata?: Record<string, unknown>;
    userId?: string;
    ip?: string;
    action?: string;
}

/**
 * Lista de campos que siempre deben ser enmascarados
 */
const SENSITIVE_FIELDS = [
    'password',
    'token',
    'apiKey',
    'secret',
    'creditCard',
    'ssn',
    'taxId',
    'bankAccount',
    'cvv',
    'pin',
    'privateKey',
];

/**
 * Enmascara datos sensibles en un objeto recursivamente
 */
function maskSensitiveFields(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj === 'string') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => maskSensitiveFields(item));
    }

    if (typeof obj === 'object') {
        const masked: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            const lowerKey = key.toLowerCase();
            const isSensitive = SENSITIVE_FIELDS.some(field => lowerKey.includes(field));

            if (isSensitive && typeof value === 'string') {
                masked[key] = maskSensitiveData(value, 2);
            } else if (typeof value === 'object' && value !== null) {
                masked[key] = maskSensitiveFields(value);
            } else {
                masked[key] = value;
            }
        }
        return masked;
    }

    return obj;
}

/**
 * Clase principal de logging
 */
class Logger {
    private serviceName: string;

    constructor(serviceName: string = 'conta_pro') {
        this.serviceName = serviceName;
    }

    private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
        const entry: LogEntry = {
            timestamp: new Date(),
            level,
            message,
            metadata: metadata ? (maskSensitiveFields(metadata) as Record<string, unknown>) : undefined,
        };

        // En producción, esto debería enviarse a un servicio de logging (CloudWatch, Datadog, etc.)
        const logString = JSON.stringify({
            service: this.serviceName,
            ...entry,
        });

        switch (level) {
            case LogLevel.ERROR:
            case LogLevel.SECURITY:
                console.error(logString);
                break;
            case LogLevel.WARN:
                console.warn(logString);
                break;
            case LogLevel.DEBUG:
                if (process.env.NODE_ENV === 'development') {
                    console.debug(logString);
                }
                break;
            default:
                console.log(logString);
        }
    }

    public debug(message: string, metadata?: Record<string, unknown>): void {
        this.log(LogLevel.DEBUG, message, metadata);
    }

    public info(message: string, metadata?: Record<string, unknown>): void {
        this.log(LogLevel.INFO, message, metadata);
    }

    public warn(message: string, metadata?: Record<string, unknown>): void {
        this.log(LogLevel.WARN, message, metadata);
    }

    public error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
        this.log(LogLevel.ERROR, message, {
            ...metadata,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
            } : undefined,
        });
    }

    /**
     * Log específico para eventos de seguridad
     */
    public security(action: string, metadata?: Record<string, unknown>): void {
        this.log(LogLevel.SECURITY, `Security Event: ${action}`, metadata);
    }

    /**
     * Log de acceso a datos sensibles
     */
    public dataAccess(userId: string, action: string, resource: string): void {
        this.security('Data Access', {
            userId: maskSensitiveData(userId, 4),
            action,
            resource,
        });
    }

    /**
     * Log de autenticación
     */
    public auth(event: 'login' | 'logout' | 'mfa_enabled' | 'password_changed', userId?: string): void {
        this.security(`Auth: ${event}`, {
            userId: userId ? maskSensitiveData(userId, 4) : undefined,
        });
    }

    /**
     * Log de cambios en datos críticos
     */
    public auditChange(
        userId: string,
        entity: string,
        entityId: string,
        changes: Record<string, { old: unknown; new: unknown }>
    ): void {
        this.security('Data Modified', {
            userId: maskSensitiveData(userId, 4),
            entity,
            entityId,
            changes: maskSensitiveFields(changes),
        });
    }
}

// Exportar instancia singleton
export const logger = new Logger();

/**
 * Middleware para logging de requests (Next.js)
 */
export function createRequestLogger() {
    return (req: Request) => {
        const start = Date.now();

        logger.info('Request received', {
            method: req.method,
            url: req.url,
            userAgent: req.headers.get('user-agent'),
        });

        return () => {
            const duration = Date.now() - start;
            logger.info('Request completed', {
                method: req.method,
                url: req.url,
                duration: `${duration}ms`,
            });
        };
    };
}
