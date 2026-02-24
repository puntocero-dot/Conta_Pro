import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase/client';
import { LedgerService } from '@/lib/accounting/ledger';

export async function GET(request: NextRequest) {
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        // Get user's company (simplificado - en producción usar la empresa actual del usuario)
        const userRecord = await prisma.user.findUnique({
            where: { id: user.id },
            include: { companies: true },
        });

        if (!userRecord || userRecord.companies.length === 0) {
            return NextResponse.json({ transactions: [] });
        }

        const companyId = userRecord.companies[0].id;

        const transactions = await prisma.transaction.findMany({
            where: { companyId },
            include: {
                category: true,
            },
            orderBy: { date: 'desc' },
            take: 100,
        });

        return NextResponse.json({ transactions });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return NextResponse.json(
            { error: 'Error al obtener transacciones' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const body = await request.json();
        const { type, amount, description, date, categoryId } = body;

        // Validations
        if (!type || !amount || !description || !date) {
            return NextResponse.json(
                { error: 'Datos incompletos' },
                { status: 400 }
            );
        }

        // Get user's company
        const userRecord = await prisma.user.findUnique({
            where: { id: user.id },
            include: { companies: true },
        });

        if (!userRecord || userRecord.companies.length === 0) {
            return NextResponse.json(
                { error: 'Usuario sin empresa asignada' },
                { status: 400 }
            );
        }

        const companyId = userRecord.companies[0].id;

        // Get or create default category
        let finalCategoryId = categoryId;
        if (!categoryId) {
            // Create default category if doesn't exist
            const defaultCategory = await prisma.category.upsert({
                where: {
                    id: `default-${type.toLowerCase()}-${companyId}`.substring(0, 36)
                },
                update: {},
                create: {
                    id: `default-${type.toLowerCase()}-${companyId}`.substring(0, 36),
                    name: type === 'INGRESO' ? 'Ingresos Generales' : 'Gastos Generales',
                    type,
                    color: type === 'INGRESO' ? '#10b981' : '#ef4444',
                    icon: type === 'INGRESO' ? '💰' : '💸',
                    companyId,
                },
            });
            finalCategoryId = defaultCategory.id;
        }

        // Create transaction
        const transaction = await prisma.transaction.create({
            data: {
                type,
                amount,
                description,
                date: new Date(date),
                categoryId: finalCategoryId,
                companyId,
                userId: user.id,
            },
            include: {
                category: true,
            },
        });

        // Create Ledger Entry (Invisible Accounting)
        try {
            await LedgerService.processTransaction({
                companyId,
                amount,
                category: transaction.category.name,
                description,
                reference: transaction.id,
                date: transaction.date,
            });
        } catch (ledgerError) {
            console.warn('⚠️ No se pudo generar el asiento contable:', ledgerError);
        }

        return NextResponse.json({ transaction }, { status: 201 });
    } catch (error) {
        console.error('Error creating transaction:', error);
        return NextResponse.json(
            { error: 'Error al crear transacción' },
            { status: 500 }
        );
    }
}
