import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth/jwt';
import { apiError } from '@/lib/api/error-response';

export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        const body = await request.json();
        const { plan, name, phone, email } = body;

        // Si el usuario está autenticado, vinculamos el lead a su cuenta
        const leadData: any = {
            plan: plan || 'STARTER',
            email: email || auth?.email || 'N/A',
            name: name || auth?.userId || 'Usuario Registrado',
            phone: phone || '',
            userId: auth?.userId,
            status: 'NEW'
        };

        const lead = await prisma.lead.create({
            data: leadData
        });

        // Notificar a los Super Admins vía Telegram si están vinculados
        try {
            const superAdmins = await prisma.user.findMany({
                where: { 
                    role: 'SUPER_ADMIN',
                    telegramId: { not: null }
                },
                select: { telegramId: true }
            });

            if (superAdmins.length > 0) {
                const { sendMessage } = await import('@/lib/telegram');
                const message = `🚀 *Nuevo Prospecto (Punto Cero)*\n\n` +
                                `👤 *Nombre:* ${leadData.name}\n` +
                                `📧 *Email:* ${leadData.email}\n` +
                                `💎 *Plan:* ${leadData.plan}\n\n` +
                                `_Gestiona este lead en el panel de administración._`;
                
                await Promise.all(
                    superAdmins.map(admin => 
                        sendMessage(admin.telegramId!, message)
                    )
                );
            }
        } catch (notifyError) {
            console.error('Error notifying Super Admins via Telegram:', notifyError);
            // No bloqueamos la respuesta al usuario si falla la notificación
        }

        return NextResponse.json({ success: true, leadId: lead.id });
    } catch (error) {
        console.error('Error creating lead:', error);
        return apiError('Error al registrar interés en el plan', 500, error);
    }
}

// Opcional: El Super Admin puede ver los leads
export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth || auth.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const leads = await prisma.lead.findMany({
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(leads);
    } catch (error) {
        return apiError('Error al obtener prospectos', 500, error);
    }
}
