import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';
import { LedgerService } from '@/lib/accounting/ledger';

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const companyId = await getCompanyIdFromRequest(request, auth.userId);

        if (!companyId) {
            return NextResponse.json(
                { error: 'No se encontró una empresa asociada' },
                { status: 400 }
            );
        }

        const transactions = await prisma.transaction.findMany({
            where: { companyId },
            include: {
                category: true,
            },
            orderBy: { date: 'desc' },
            take: 100,
        });

        return NextResponse.json({ transactions });
    } catch (error: any) {
        console.error('Error in GET /api/transactions:', error);
        return NextResponse.json(
            { error: 'Error al obtener transacciones', details: error.message },
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
        const { type, amount, description, date, categoryId, clientId } = body;

        if (!type || !amount || !description || !date) {
            return NextResponse.json(
                { error: 'Datos incompletos requeridos (tipo, monto, descripción, fecha)' },
                { status: 400 }
            );
        }

        const companyId = await getCompanyIdFromRequest(request, auth.userId);

        if (!companyId) {
            return NextResponse.json(
                { error: 'El usuario debe tener una empresa vinculada para registrar transacciones' },
                { status: 400 }
            );
        }

        // Validar u obtener categoría por defecto
        let finalCategoryId = categoryId;
        if (!categoryId) {
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

        // Crear la transacción
        const transaction = await prisma.transaction.create({
            data: {
                type,
                amount: parseFloat(amount.toString()),
                description,
                date: new Date(date),
                categoryId: finalCategoryId,
                companyId,
                userId: auth.userId,
                metadata: clientId ? { clientId } : undefined,
            },
            include: {
                category: true,
            },
        });

        // Procesar en el Ledger (Contabilidad Invisible)
        try {
            await LedgerService.processTransaction({
                companyId,
                amount: transaction.amount,
                category: transaction.category.name,
                description,
                reference: transaction.id,
                date: transaction.date,
            });
        } catch (ledgerError: any) {
            console.warn('⚠️ Ledger Warning:', ledgerError.message);
            // No bloqueamos la respuesta si falla la contabilidad automática
        }

        return NextResponse.json({ transaction }, { status: 201 });
    } catch (error: any) {
        console.error('Error in POST /api/transactions:', error);
        return NextResponse.json(
            { error: 'Error al crear transacción', details: error.message },
            { status: 500 }
        );
    }
}
