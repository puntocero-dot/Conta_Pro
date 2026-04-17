import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';
import { LedgerService } from '@/lib/accounting/ledger';
import { apiError } from '@/lib/api/error-response';
import { requirePermission } from '@/lib/auth/authorize';

interface BulkRow {
    type?: string;
    amount?: string | number;
    description?: string;
    date?: string;
    categoryId?: string;
    proveedor?: string;
}

interface FailedRow {
    row: number;
    reason: string;
    data: BulkRow;
}

const VALID_TYPES = ['INGRESO', 'EGRESO'];

function validateRow(row: BulkRow, index: number): string | null {
    const amount = parseFloat(row.amount?.toString() || '0');
    if (!row.type || !VALID_TYPES.includes(row.type.toUpperCase())) {
        return `tipo inválido ("${row.type}"). Debe ser INGRESO o EGRESO`;
    }
    if (isNaN(amount) || amount <= 0) {
        return `monto inválido ("${row.amount}"). Debe ser un número mayor a 0`;
    }
    if (!row.description?.trim()) {
        return 'descripcion es obligatoria';
    }
    if (!row.date) {
        return 'fecha es obligatoria';
    }
    const parsed = new Date(row.date);
    if (isNaN(parsed.getTime())) {
        return `fecha inválida ("${row.date}"). Formato esperado: YYYY-MM-DD`;
    }
    return null;
}

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

        const successRows: any[] = [];
        const failedRows: FailedRow[] = [];

        // Resolve category names to IDs if needed
        const companyCategories = await (prisma.category as any).findMany({
            where: { companyId },
            select: { id: true, name: true },
        });
        const categoryByName = new Map<string, string>(companyCategories.map((c: any) => [c.name.toLowerCase() as string, c.id as string]));

        for (let i = 0; i < transactions.length; i++) {
            const row: BulkRow = transactions[i];
            const rowNum = i + 2; // 1-indexed + header row

            // Normalize type
            if (row.type) row.type = row.type.toString().toUpperCase().trim();

            const validationError = validateRow(row, i);
            if (validationError) {
                failedRows.push({ row: rowNum, reason: validationError, data: row });
                continue;
            }

            // Resolve categoryId: accept ID or category name
            let categoryId: string | null = row.categoryId || null;
            if (categoryId) {
                const byName = categoryByName.get(categoryId.toLowerCase());
                if (byName) {
                    categoryId = byName;
                } else {
                    // Check it's a valid UUID for this company
                    const exists = companyCategories.find((c: any) => c.id === categoryId);
                    if (!exists) {
                        failedRows.push({ row: rowNum, reason: `categoría no encontrada: "${row.categoryId}"`, data: row });
                        continue;
                    }
                }
            }

            try {
                const amount = parseFloat(row.amount!.toString());
                const transaction = await (prisma.transaction as any).create({
                    data: {
                        type: row.type as 'INGRESO' | 'EGRESO',
                        amount,
                        description: row.description!.trim(),
                        date: new Date(row.date!),
                        companyId,
                        userId: auth.userId,
                        categoryId,
                    },
                });

                try {
                    await LedgerService.processTransaction({
                        companyId,
                        amount,
                        category: 'Carga Masiva',
                        description: row.description!.trim(),
                        reference: transaction.id,
                        date: transaction.date,
                    });
                } catch {
                    // Non-fatal: ledger error doesn't roll back the transaction
                }

                successRows.push(transaction);
            } catch (err: any) {
                failedRows.push({ row: rowNum, reason: err?.message || 'Error al guardar en base de datos', data: row });
            }
        }

        return NextResponse.json({
            successCount: successRows.length,
            failedCount: failedRows.length,
            failed: failedRows,
        }, { status: 201 });
    } catch (error) {
        return apiError('Error en carga masiva de transacciones', 500, error);
    }
}
