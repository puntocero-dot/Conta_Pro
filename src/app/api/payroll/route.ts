import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth/jwt';
import { apiError } from '@/lib/api/error-response';
import { calcEmployee, calcPayrollTotals, PayrollEmployeeInput } from '@/lib/sv-payroll';

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        const companyId = request.headers.get('x-company-id');
        if (!companyId) return NextResponse.json({ error: 'Empresa requerida' }, { status: 400 });

        const payrolls = await prisma.payroll.findMany({
            where: { companyId },
            include: {
                employees: true,
                _count: { select: { employees: true } },
            },
            orderBy: { period: 'desc' },
        });

        return NextResponse.json({ payrolls });
    } catch (error) {
        return apiError('Error al obtener planillas', 500, error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        const companyId = request.headers.get('x-company-id');
        if (!companyId) return NextResponse.json({ error: 'Empresa requerida' }, { status: 400 });

        const body = await request.json();
        const { period, notes, employees: employeesInput = [] } = body;

        if (!period || !/^\d{4}-\d{2}$/.test(period)) {
            return NextResponse.json({ error: 'Período inválido. Formato: YYYY-MM' }, { status: 400 });
        }

        // Check duplicate period
        const existing = await prisma.payroll.findFirst({
            where: { companyId, period },
        });
        if (existing) {
            return NextResponse.json({ error: `Ya existe una planilla para ${period}` }, { status: 409 });
        }

        // Calculate employees
        const calculated = employeesInput.map((e: PayrollEmployeeInput) => calcEmployee(e));
        const { costoTotalPlanilla, ...payrollTotals } = calcPayrollTotals(calculated);

        const payroll = await prisma.payroll.create({
            data: {
                companyId,
                period,
                notes,
                ...payrollTotals,
                employees: {
                    create: calculated.map((e: ReturnType<typeof calcEmployee>) => ({
                        employeeName: e.employeeName,
                        jobTitle: e.jobTitle,
                        employeeNumber: e.employeeNumber,
                        dui: e.dui,
                        nup: e.nup,
                        afpName: e.afpName,
                        clientId: e.clientId,
                        salary: e.salary,
                        otrosIngresos: e.otrosIngresos,
                        totalBruto: e.totalBruto,
                        afpLaboral: e.afpLaboral,
                        isssLaboral: e.isssLaboral,
                        isrRetencion: e.isrRetencion,
                        totalDescuentos: e.totalDescuentos,
                        salarioNeto: e.salarioNeto,
                        afpPatronal: e.afpPatronal,
                        isssPatronal: e.isssPatronal,
                        insaforp: e.insaforp,
                    })),
                },
            },
            include: { employees: true },
        });

        return NextResponse.json({ payroll }, { status: 201 });
    } catch (error) {
        return apiError('Error al crear planilla', 500, error);
    }
}
