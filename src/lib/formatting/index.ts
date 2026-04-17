/**
 * Utilidades de formateo consistente para Conta Pro.
 * El Salvador usa USD como moneda oficial.
 */

/**
 * Formatea un monto en USD con 2 decimales.
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Formatea una fecha en formato legible en español (es-SV).
 */
export function formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-SV', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

/**
 * Formatea fecha y hora en español.
 */
export function formatDateTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('es-SV', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

/**
 * Devuelve el período contable en formato "Marzo 2026" de forma consistente.
 * Acepta un Date, una cadena ISO, o un objeto {month: 1-12, year: 4 digits}.
 * Usar siempre esta función en reportes — nunca texto libre del usuario.
 */
export function formatAccountingMonth(input: Date | string | { month: number; year: number }): string {
    if (typeof input === 'object' && 'month' in input) {
        return `${MONTHS_ES[input.month - 1]} ${input.year}`;
    }
    const d = typeof input === 'string' ? new Date(input) : input;
    return `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Formatea una fecha en formato relativo (ej: "hace 2 horas").
 */
export function formatRelativeTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = Date.now();
    const diff = now - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'ahora mismo';
    if (minutes < 60) return `hace ${minutes} min`;
    if (hours < 24) return `hace ${hours}h`;
    if (days < 7) return `hace ${days}d`;
    return formatDate(d);
}
