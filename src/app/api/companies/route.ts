import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption/crypto';
import { TransactionType } from '@prisma/client';
import { getAuthFromRequest } from '@/lib/auth/jwt';
import { apiError } from '@/lib/api/error-response';
import { requirePermission } from '@/lib/auth/authorize';

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
        if (!name || !nit || !nrc || !legalForm || !economicActivity || !address || !department || !municipality) {
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

        // Crear categorías por defecto
        const categories = [
            { name: 'Ingresos', type: 'INGRESO' as TransactionType, icon: '💰', color: '#10b981' },
            { name: 'Gastos', type: 'EGRESO' as TransactionType, icon: '💸', color: '#ef4444' }
        ];

        for (const cat of categories) {
            await prisma.category.create({
                data: { ...cat, companyId: company.id }
            });
        }

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
