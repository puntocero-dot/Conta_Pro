import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateCronSecret, cronUnauthorized } from '@/lib/cron-auth';
import { startOfDay, endOfDay } from '@/lib/recurring-utils';
import { sendMessage } from '@/lib/telegram';
import { formatCurrency } from '@/lib/formatting';

export async function POST(request: NextRequest) {
    if (!validateCronSecret(request)) return cronUnauthorized();

    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = startOfDay(tomorrow);
    const tomorrowEnd = endOfDay(tomorrow);

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    try {
        // Fetch active recurring that are due today or tomorrow
        const candidates = await (prisma.recurringTransaction as any).findMany({
            where: {
                isActive: true,
                OR: [
                    { notifyOnDue: true, nextRunDate: { gte: todayStart, lte: todayEnd } },
                    { notifyBefore: true, nextRunDate: { gte: tomorrowStart, lte: tomorrowEnd } },
                ],
            },
            include: {
                company: { select: { id: true, name: true } },
            },
        });

        for (const rt of candidates) {
            const isDueToday = rt.nextRunDate >= todayStart && rt.nextRunDate <= todayEnd;
            const notifType: 'ON_DUE' | 'BEFORE' = isDueToday ? 'ON_DUE' : 'BEFORE';

            // Get all users of this company with telegramId
            const members = await prisma.companyMember.findMany({
                where: { companyId: rt.companyId },
                include: { user: { select: { telegramId: true, email: true } } },
            });
            const directUsers = await (prisma.company as any).findUnique({
                where: { id: rt.companyId },
                select: { users: { select: { telegramId: true } } },
            });

            const telegramIds = new Set<string>();
            members.forEach((m: any) => { if (m.user?.telegramId) telegramIds.add(m.user.telegramId); });
            directUsers?.users?.forEach((u: any) => { if (u.telegramId) telegramIds.add(u.telegramId); });

            for (const telegramId of telegramIds) {
                // Idempotency: skip if already sent today
                const alreadySent = await (prisma.notificationLog as any).findFirst({
                    where: {
                        recurringId: rt.id,
                        type: notifType,
                        telegramId,
                        sentAt: { gte: todayStart, lte: todayEnd },
                    },
                });
                if (alreadySent) { skipped++; continue; }

                const amount = formatCurrency(rt.amount);
                const emoji = rt.type === 'EGRESO' ? '💳' : '💰';
                const msg = isDueToday
                    ? `${emoji} <b>Pago programado hoy</b>\n\n📋 <b>${rt.description}</b>\n💵 ${amount}\n🏢 ${rt.company.name}\n\nRecuerda registrarlo en Patrimonium si no está automatizado.`
                    : `⏰ <b>Recordatorio de pago — mañana</b>\n\n📋 <b>${rt.description}</b>\n💵 ${amount}\n🏢 ${rt.company.name}\n\nTienes tiempo de prepararlo.`;

                try {
                    await sendMessage(telegramId, msg);
                    await (prisma.notificationLog as any).create({
                        data: { recurringId: rt.id, type: notifType, telegramId, companyId: rt.companyId },
                    });
                    sent++;
                } catch (err: any) {
                    errors.push(`${telegramId}: ${err?.message}`);
                }
            }
        }

        return NextResponse.json({ sent, skipped, errors, candidates: candidates.length });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
