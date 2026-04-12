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
