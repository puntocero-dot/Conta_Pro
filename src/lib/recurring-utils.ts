export function calcNextRunDate(frequency: string, dayOfMonth: number | null, from: Date = new Date()): Date {
    const base = new Date(from);
    switch (frequency) {
        case 'DAILY':
            base.setDate(base.getDate() + 1);
            return base;
        case 'WEEKLY':
            base.setDate(base.getDate() + 7);
            return base;
        case 'MONTHLY': {
            const next = new Date(base.getFullYear(), base.getMonth() + 1, dayOfMonth || base.getDate());
            return next;
        }
        case 'QUARTERLY': {
            const next = new Date(base.getFullYear(), base.getMonth() + 3, dayOfMonth || base.getDate());
            return next;
        }
        case 'ANNUAL': {
            const next = new Date(base.getFullYear() + 1, base.getMonth(), dayOfMonth || base.getDate());
            return next;
        }
        default:
            return base;
    }
}

export function startOfDay(date: Date = new Date()): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function endOfDay(date: Date = new Date()): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}
