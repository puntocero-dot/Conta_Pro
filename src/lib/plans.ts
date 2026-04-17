export interface Plan {
    id: string;
    name: string;
    price: string;
    priceNote?: string;
    description: string;
    features: string[];
    color: string;
    popular?: boolean;
}

export const PLANS: Plan[] = [
    {
        id: 'STARTER',
        name: 'Emprendedor',
        price: '$29',
        priceNote: '/mes',
        description: 'Ideal para personas naturales y pequeños negocios.',
        features: ['1 Empresa', 'Registro de Ingresos/Egresos', 'Reportes Básicos', 'Soporte vía Ticket'],
        color: '#64748b',
    },
    {
        id: 'PROFESSIONAL',
        name: 'Profesional',
        price: '$59',
        priceNote: '/mes',
        description: 'Perfecto para PyMEs y Sociedades en crecimiento.',
        features: ['Hasta 3 Empresas', 'Planillas de Sueldos', 'Métricas Financieras', 'Soporte Premium'],
        color: '#3b82f6',
        popular: true,
    },
    {
        id: 'ENTERPRISE',
        name: 'Corporativo',
        price: '$99',
        priceNote: '/mes',
        description: 'Para grupos empresariales y holdings.',
        features: ['Empresas Ilimitadas', 'Libros Legales Digitales', 'Oficial de Cumplimiento', 'API Access'],
        color: '#fbbf24',
    },
];
