'use client';

import { HubGrid } from '@/components/ui/HubGrid';
import { UsersIcon, AlertTriangleIcon } from '@/components/icons';

export default function LaboralHub() {
    const items = [
        {
            path: '/payroll',
            icon: <UsersIcon size={24} />,
            label: 'Planillas',
            description: 'Gestión mensual de salarios, descuentos de ley (ISSS, AFP) y emisión de boletas de pago.'
        },
        {
            path: '/provisions',
            icon: <AlertTriangleIcon size={24} />,
            label: 'Previsiones',
            description: 'Cálculo de pasivos laborales, indemnizaciones, aguinaldos y vacaciones proporcionales.'
        }
    ];

    return (
        <div>
            <HubGrid items={items} />
        </div>
    );
}
