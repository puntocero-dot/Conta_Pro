'use client';

import { HubGrid } from '@/components/ui/HubGrid';
import { ShieldIcon, UsersIcon, ClipboardIcon, AlertTriangleIcon } from '@/components/icons';

export default function SecurityHub() {
    const items = [
        {
            path: '/security-dashboard',
            icon: <ShieldIcon size={24} />,
            label: 'Seguridad',
            description: 'Monitoreo de accesos, intentos fallidos y configuración de protección perimétrica.'
        },
        {
            path: '/security/users',
            icon: <UsersIcon size={24} />,
            label: 'Gestión de Usuarios',
            description: 'Control de accesos y asignación de roles para el personal de la empresa.'
        },
        {
            path: '/security/audit-logs',
            icon: <ClipboardIcon size={24} />,
            label: 'Auditoría',
            description: 'Registro histórico de todas las operaciones y cambios realizados en el sistema.'
        },
        {
            path: '/security/alerts',
            icon: <AlertTriangleIcon size={24} />,
            label: 'Alertas',
            description: 'Notificaciones críticas sobre movimientos inusuales o fallos de seguridad.'
        }
    ];

    return (
        <div>
            <HubGrid items={items} />
        </div>
    );
}
