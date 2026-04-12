'use client';

import { HubGrid } from '@/components/ui/HubGrid';
import { BuildingIcon, UsersIcon, FileTextIcon } from '@/components/icons';

export default function AdminHub() {
    const items = [
        {
            path: '/companies',
            icon: <BuildingIcon size={24} />,
            label: 'Empresas',
            description: 'Configuración de perfiles legales, logos y catálogos de cuentas de tus empresas.'
        },
        {
            path: '/clients',
            icon: <FileTextIcon size={24} />,
            label: 'Catálogo de Terceros',
            description: 'Gestión centralizada de proveedores y clientes para el procesamiento de transacciones.'
        },
        {
            path: '/admin/prospectos',
            icon: <UsersIcon size={24} />,
            label: 'Gestión de Leads',
            description: 'Seguimiento de prospectos interesados en los servicios de Punto Cero.'
        }
    ];

    return (
        <div>
            <HubGrid items={items} />
        </div>
    );
}
