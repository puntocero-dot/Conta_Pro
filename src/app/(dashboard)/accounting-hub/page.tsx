'use client';

import { HubGrid } from '@/components/ui/HubGrid';
import { BuildingIcon, WalletIcon, FileTextIcon, BarChartIcon } from '@/components/icons';

export default function AccountingHub() {
    const items = [
        {
            path: '/fixed-assets',
            icon: <BuildingIcon size={24} />,
            label: 'Activos Fijos',
            description: 'Control de depreciaciones, inventario de activos y bajas contables.'
        },
        {
            path: '/receivables',
            icon: <WalletIcon size={24} />,
            label: 'CxC / CxP',
            description: 'Gestión de cuentas por cobrar y pagar, control de antigüedad de saldos.'
        },
        {
            path: '/financial-statements',
            icon: <FileTextIcon size={24} />,
            label: 'Estados Financieros',
            description: 'Generación de Balances, Estados de Resultados y Flujo de Caja en tiempo real.'
        },
        {
            path: '/financial-metrics',
            icon: <BarChartIcon size={24} />,
            label: 'Métricas EBITDA',
            description: 'Análisis profundo de rentabilidad, margen operativo y salud financiera.'
        }
    ];

    return (
        <div>
            <HubGrid items={items} />
        </div>
    );
}
