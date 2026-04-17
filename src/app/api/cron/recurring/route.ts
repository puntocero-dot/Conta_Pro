import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateCronSecret, cronUnauthorized } from '@/lib/cron-auth';
import { calcNextRunDate } from '@/lib/recurring-utils';
import { LedgerService } from '@/lib/accounting/ledger';

export async function POST(request: NextRequest) {
    if (!validateCronSecret(request)) return cronUnauthorized();

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    let processed = 0;
    const errors: { id: string; error: string }[] = [];

    try {
        const due = await (prisma.recurringTransaction as any).findMany({
            where: {
                isActive: true,
                nextRunDate: { lte: today },
                OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
            },
        });

        for (const rt of due) {
            try {
                const now = new Date();
                await (prisma.transaction as any).create({
                    data: {
                        type: rt.type,
                        amount: rt.amount,
                        description: rt.description,
                        date: now,
                        companyId: rt.companyId,
                        userId: rt.createdBy,
                        categoryId: rt.categoryId,
                        clientId: rt.clientId,
                        recurringId: rt.id,
                        metadata: {
                            accountingMonth: now.getMonth() + 1,
                            accountingYear: now.getFullYear(),
                            generatedFromRecurring: true,
                            cronRun: true,
                        },
                    },
                });

                const nextRun = calcNextRunDate(rt.frequency, rt.dayOfMonth, now);
                await (prisma.recurringTransaction as any).update({
                    where: { id: rt.id },
                    data: { nextRunDate: nextRun },
                });

                try {
                    await LedgerService.processTransaction({
                        companyId: rt.companyId,
                        amount: rt.amount,
                        category: 'Recurrente',
                        description: rt.description,
                        reference: rt.id,
                        date: now,
                    });
                } catch { /* non-fatal */ }

                processed++;
            } catch (err: any) {
                errors.push({ id: rt.id, error: err?.message || 'Error desconocido' });
            }
        }

        return NextResponse.json({ processed, errors, total: due.length });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
