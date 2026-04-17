import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption/crypto';
import { TransactionType } from '@prisma/client';
import { getAuthFromRequest } from '@/lib/auth/jwt';
import { apiError } from '@/lib/api/error-response';
import { requirePermission } from '@/lib/auth/authorize';
import { SV_CHART_OF_ACCOUNTS } from '@/lib/sv-chart-of-accounts';

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);

        if (!auth) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        // Buscar empresas vinculadas al usuario
        const companies = await prisma.company.findMany({
            where: {
                users: {
                    some: { id: auth.userId }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Desencriptar taxId (NIT) para mostrarlo en la UI
        const decryptedCompanies = companies.map(company => {
            try {
                return {
                    ...company,
                    taxId: decrypt(company.taxId)
                };
            } catch (e) {
                console.error(`Error decrypting taxId for company ${company.id}:`, e);
                return company; // Fallback al valor encriptado si falla
            }
        });

        return NextResponse.json({ companies: decryptedCompanies });
    } catch (error) {
        console.error('Error in GET /api/companies:', error);
        return apiError('Error al obtener empresas', 500, error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);

        if (!auth) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const permError = requirePermission(auth.role, 'company:update');
        if (permError) return permError;

        const body = await request.json();
        const { legalForm, name, nit, nrc, address, economicActivity, shareCapital, municipality, department, country } = body;

        // Validación de campos obligatorios
        const isPersonaNatural = legalForm === 'PERSONA_NATURAL';
        if (!name || !nit || (!isPersonaNatural && !nrc) || !legalForm || !economicActivity || !address || !department || !municipality) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }

        // Validación simple del NIT (acepta cualquier formato con 13+ dígitos)
        const nitClean = nit.replace(/[^0-9]/g, '');
        if (nitClean.length < 13) {
            return NextResponse.json({ error: 'NIT debe tener al menos 13 dígitos' }, { status: 400 });
        }

        const encryptedTaxId = encrypt(nit);

        const company = await prisma.company.create({
            data: {
                name,
                taxId: encryptedTaxId,
                country: country || 'SV',
                metadata: {
                    legalForm, nrc, address, economicActivity, shareCapital, municipality, department, nit
                },
                // Conectar con el usuario que la crea
                users: {
                    connect: { id: auth.userId }
                }
            }
        });

        // Crear categorías por defecto con mapeo contable SV
        const categories = [
            // INGRESOS
            { name: 'Ventas de Bienes',         type: 'INGRESO' as TransactionType, icon: '💰', color: '#10b981', debitAccountCode: '1101', creditAccountCode: '4101' },
            { name: 'Prestación de Servicios',  type: 'INGRESO' as TransactionType, icon: '🛠', color: '#3b82f6', debitAccountCode: '1101', creditAccountCode: '4102' },
            { name: 'Intereses Ganados',         type: 'INGRESO' as TransactionType, icon: '📈', color: '#6366f1', debitAccountCode: '1101', creditAccountCode: '4201' },
            { name: 'Ganancia Cambiaria',        type: 'INGRESO' as TransactionType, icon: '💱', color: '#8b5cf6', debitAccountCode: '1101', creditAccountCode: '4202' },
            { name: 'Otros Ingresos',            type: 'INGRESO' as TransactionType, icon: '💹', color: '#a855f7', debitAccountCode: '1101', creditAccountCode: '4104' },
            // EGRESOS — Gastos Operativos
            { name: 'Sueldos y Salarios',        type: 'EGRESO' as TransactionType,  icon: '👥', color: '#ef4444', debitAccountCode: '6101', creditAccountCode: '1101' },
            { name: 'Cargas Sociales',           type: 'EGRESO' as TransactionType,  icon: '🏛', color: '#f59e0b', debitAccountCode: '6102', creditAccountCode: '1101' },
            { name: 'Honorarios Profesionales',  type: 'EGRESO' as TransactionType,  icon: '🎓', color: '#7c3aed', debitAccountCode: '6103', creditAccountCode: '1101' },
            { name: 'Alquiler',                  type: 'EGRESO' as TransactionType,  icon: '🏢', color: '#6b7280', debitAccountCode: '6107', creditAccountCode: '1101' },
            { name: 'Servicios Básicos',         type: 'EGRESO' as TransactionType,  icon: '💡', color: '#f97316', debitAccountCode: '6108', creditAccountCode: '1101' },
            { name: 'Telecomunicaciones',        type: 'EGRESO' as TransactionType,  icon: '📱', color: '#06b6d4', debitAccountCode: '6110', creditAccountCode: '1101' },
            { name: 'Papelería y Útiles',        type: 'EGRESO' as TransactionType,  icon: '📄', color: '#84cc16', debitAccountCode: '6111', creditAccountCode: '1101' },
            { name: 'Publicidad',                type: 'EGRESO' as TransactionType,  icon: '📢', color: '#ec4899', debitAccountCode: '6112', creditAccountCode: '1101' },
            { name: 'Mantenimiento',             type: 'EGRESO' as TransactionType,  icon: '🔧', color: '#78716c', debitAccountCode: '6113', creditAccountCode: '1101' },
            { name: 'Impuestos Municipales',     type: 'EGRESO' as TransactionType,  icon: '🏙', color: '#0891b2', debitAccountCode: '6114', creditAccountCode: '1101' },
            { name: 'Impuestos Fiscales',        type: 'EGRESO' as TransactionType,  icon: '🧾', color: '#0284c7', debitAccountCode: '6115', creditAccountCode: '1101' },
            { name: 'Seguros',                   type: 'EGRESO' as TransactionType,  icon: '🛡', color: '#4f46e5', debitAccountCode: '6116', creditAccountCode: '1101' },
            { name: 'Combustible y Lubricantes', type: 'EGRESO' as TransactionType,  icon: '⛽', color: '#92400e', debitAccountCode: '6117', creditAccountCode: '1101' },
            { name: 'Viáticos y Representación', type: 'EGRESO' as TransactionType,  icon: '✈️', color: '#0f766e', debitAccountCode: '6118', creditAccountCode: '1101' },
            { name: 'Capacitación',              type: 'EGRESO' as TransactionType,  icon: '📚', color: '#b45309', debitAccountCode: '6119', creditAccountCode: '1101' },
            { name: 'Suscripciones y Software',  type: 'EGRESO' as TransactionType,  icon: '💻', color: '#0369a1', debitAccountCode: '6121', creditAccountCode: '1101' },
            // EGRESOS — Gastos Financieros
            { name: 'Intereses Bancarios',       type: 'EGRESO' as TransactionType,  icon: '🏦', color: '#dc2626', debitAccountCode: '6201', creditAccountCode: '1101' },
            { name: 'Comisiones Bancarias',      type: 'EGRESO' as TransactionType,  icon: '💳', color: '#b91c1c', debitAccountCode: '6202', creditAccountCode: '1101' },
            // EGRESOS — Otros
            { name: 'Depreciación',              type: 'EGRESO' as TransactionType,  icon: '📉', color: '#475569', debitAccountCode: '6301', creditAccountCode: '1601' },
            { name: 'Gastos Generales',          type: 'EGRESO' as TransactionType,  icon: '💸', color: '#94a3b8', debitAccountCode: '6302', creditAccountCode: '1101' },
        ];

        await prisma.category.createMany({
            data: categories.map(cat => ({ ...cat, companyId: company.id })),
            skipDuplicates: true,
        });

        // Sembrar catálogo de cuentas SV automáticamente
        await prisma.account.createMany({
            data: SV_CHART_OF_ACCOUNTS.map(a => ({
                code: a.code,
                name: a.name,
                type: a.type,
                companyId: company.id,
            })),
            skipDuplicates: true,
        });

        // Crear membresía del creador como CONTADOR
        await prisma.companyMember.create({
            data: {
                userId: auth.userId,
                companyId: company.id,
                role: 'CONTADOR',
            },
        }).catch(() => {}); // Ignorar si ya existe

        return NextResponse.json({ company }, { status: 201 });
    } catch (error: any) {
        console.error('Error in POST /api/companies:', error);

        // Manejar error de duplicado (P2002 es el código de Prisma para Unique Constraint)
        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Ya existe una empresa registrada con este NIT' },
                { status: 409 }
            );
        }

        return apiError('Error interno al crear empresa', 500, error);
    }
}
