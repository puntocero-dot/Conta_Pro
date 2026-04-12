'use client';

import { HubGrid } from '@/components/ui/HubGrid';
import { ClipboardIcon } from '@/components/icons';

export default function FiscalHub() {
    const items = [
        {
            path: '/tax-reports',
            icon: <ClipboardIcon size={24} />,
            label: 'Reportes Fiscales',
            description: 'Generación automática de Libros de IVA (Compras/Ventas), F07, F14 y anexos tributarios.'
        }
    ];

    return (
        <div>
            <HubGrid items={items} />
        </div>
    );
}
