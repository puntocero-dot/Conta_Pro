'use client';

import { HubGrid } from '@/components/ui/HubGrid';
import { ShieldIcon, SparklesIcon, ClipboardIcon } from '@/components/icons';

export default function ComplianceHub() {
    const items = [
        {
            path: '/compliance',
            icon: <ShieldIcon size={24} />,
            label: 'Anti-Lavado',
            description: 'Motor de análisis de riesgos y cumplimiento AML para operaciones financieras.'
        },
        {
            path: '/compliance/telegram',
            icon: <SparklesIcon size={24} />,
            label: 'Bot de Telegram',
            description: 'Configuración y estado del bot para el registro automático de gastos vía chat.'
        },
        {
            path: '/legal-books',
            icon: <ClipboardIcon size={24} />,
            label: 'Libros Legales',
            description: 'Gestión y custodia de libros legales, actas y documentación mercantil.'
        }
    ];

    return (
        <div>
            <HubGrid items={items} />
        </div>
    );
}
