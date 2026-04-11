import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth/jwt';
import { apiError } from '@/lib/api/error-response';
import { requirePermission } from '@/lib/auth/authorize';

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);

        if (!auth) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        // Solo Super Admins pueden ver estadísticas globales
        const permError = requirePermission(auth.role, 'admin:read');
        if (auth.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'No tienes permisos de administrador global' }, { status: 403 });
        }

        const [companyCount, userCount, transactionStats] = await Promise.all([
            prisma.company.count(),
            prisma.user.count(),
            prisma.transaction.aggregate({
                _sum: {
                    amount: true
                },
                _count: {
                    id: true
                },
                where: {
                    status: 'ACTIVE'
                }
            })
        ]);

        // Obtener ingresos y egresos globales
        const globalIncome = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { type: 'INGRESO', status: 'ACTIVE' }
        });

        const globalExpense = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { type: 'EGRESO', status: 'ACTIVE' }
        });

        return NextResponse.json({
            totalCompanies: companyCount,
            totalUsers: userCount,
            totalTransactions: transactionStats._count.id,
            totalVolume: transactionStats._sum.amount || 0,
            globalIncome: globalIncome._sum.amount || 0,
            globalExpense: globalExpense._sum.amount || 0,
            systemHealth: 'HEALTHY'
        });
    } catch (error) {
        console.error('Error in GET /api/admin/global-stats:', error);
        return apiError('Error al obtener estadísticas globales', 500, error);
    }
}
