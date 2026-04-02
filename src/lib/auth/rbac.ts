export enum Role {
    SUPER_ADMIN = 'SUPER_ADMIN',
    CONTADOR = 'CONTADOR',
    CLIENTE = 'CLIENTE',
    AUDITOR = 'AUDITOR',
}

export const PERMISSIONS = {
    [Role.SUPER_ADMIN]: ['*'],
    [Role.CONTADOR]: [
        'company:read',
        'company:update', // Assigned companies only
        'transaction:create',
        'transaction:read',
        'transaction:update',
        'transaction:delete',
        'client:create',
        'client:read',
        'client:update',
        'client:delete',
        'report:generate',
    ],
    [Role.CLIENTE]: [
        'company:read', // Own company only
        'dashboard:read',
        'report:export',
    ],
    [Role.AUDITOR]: [
        'company:read',
        'transaction:read',
        'client:read',
        'report:read',
        'audit_log:read',
    ],
};

export function hasPermission(role: Role, permission: string): boolean {
    if (role === Role.SUPER_ADMIN) return true;
    const rolePermissions = PERMISSIONS[role] || [];
    return rolePermissions.includes(permission);
}
