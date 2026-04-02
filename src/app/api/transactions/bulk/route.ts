import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';
import { LedgerService } from '@/lib/accounting/ledger';
import { apiError } from '@/lib/api/error-response';
import { requirePermission } from '@/lib/auth/authorize';

export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        const permError = requirePermission(auth.role, 'transaction:create');
        if (permError) return permError;

        const companyId = await getCompanyIdFromRequest(request, auth.userId);
        if (!companyId) return NextResponse.json({ error: 'Empresa requerida' }, { status: 400 });

        const body = await request.json();
        const { transactions = [] } = body;

        if (!Array.isArray(transactions) || transactions.length === 0) {
            return NextResponse.json({ error: 'Se requiere una lista de transacciones' }, { status: 400 });
        }

        // We'll process them one by one to ensure Ledger entries are generated
        const results = [];
        for (const t of transactions) {
            const amount = parseFloat(t.amount?.toString() || '0');
            if (amount <= 0 || !t.type || !t.description || !t.date) continue;

            const transaction = await (prisma.transaction as any).create({
                data: {
                    type: t.type,
                    amount,
                    description: t.description,
                    date: new Date(t.date),
                    companyId,
                    userId: auth.userId,
                    categoryId: t.categoryId || null, // Optional
                },
            });

            // Process in Ledger
            try {
                await LedgerService.processTransaction({
                    companyId,
                    amount,
                    category: (transaction as any).category?.name || 'Carga Masiva',
                    description: t.description,
                    reference: transaction.id,
                    date: transaction.date,
                });
            } catch (err) {
                console.warn('Ledger error in bulk upload:', err);
            }
            results.push(transaction);
        }

        return NextResponse.json({ count: results.length }, { status: 201 });
    } catch (error) {
        return apiError('Error en carga masiva de transacciones', 500, error);
    }
}
