import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Accounting Rules for El Salvador (SV)...');

    const rules = [
        {
            country: 'SV',
            triggerText: 'Combustible',
            rules: {
                debit: '510201', // Gasto Combustible
                credit: '110101', // Efectivo/Caja
                tax: 0.13,        // IVA SV
                aml_limit: 10000,
            },
        },
        {
            country: 'SV',
            triggerText: 'Ventas',
            rules: {
                debit: '110101',  // Caja
                credit: '410101', // Ingresos por Ventas
                tax: 0.13,
                aml_limit: 10000,
            },
        },
        {
            country: 'SV',
            triggerText: 'Alimentación',
            rules: {
                debit: '510202',  // Gasto Alimentación
                credit: '110101', // Caja
                tax: 0.13,
                aml_limit: 10000,
            },
        },
        {
            country: 'SV',
            triggerText: 'Servicios',
            rules: {
                debit: '510203',  // Gasto Servicios Públicos
                credit: '110101', // Caja
                tax: 0.13,
                aml_limit: 10000,
            },
        },
        {
            country: 'SV',
            triggerText: 'Alquiler',
            rules: {
                debit: '510301',  // Gasto Alquiler
                credit: '110101', // Caja
                tax: 0.13,
                aml_limit: 10000,
            },
        },
        {
            country: 'SV',
            triggerText: 'Honorarios',
            rules: {
                debit: '510302',  // Gasto Honorarios Profesionales
                credit: '110101', // Caja
                tax: 0.13,
                aml_limit: 10000,
            },
        },
    ];

    // Limpiar reglas existentes para evitar duplicados en el seed
    await prisma.countryRule.deleteMany({
        where: { country: 'SV' }
    });

    for (const rule of rules) {
        await prisma.countryRule.create({
            data: {
                id: `rule-sv-${rule.triggerText.toLowerCase()}`,
                ...rule,
            },
        });
    }

    console.log('✅ Rules seeded successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
