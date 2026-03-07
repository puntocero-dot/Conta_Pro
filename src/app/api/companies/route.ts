import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { encrypt } from '@/lib/encryption/crypto';
import { TransactionType } from '@prisma/client';
import { getAuthFromRequest } from '@/lib/auth/jwt';

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

        return NextResponse.json({ companies });
    } catch (error: any) {
        console.error('Error in GET /api/companies:', error);
        return NextResponse.json(
            { error: 'Error al obtener empresas', details: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);

        if (!auth) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

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

        return NextResponse.json(
            { error: 'Error interno al crear empresa', details: error.message },
            { status: 500 }
        );
    }
}
