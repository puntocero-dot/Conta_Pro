/**
 * Cálculos de planilla para El Salvador
 * Basado en:
 *  - Ley del Sistema de Ahorro para Pensiones (SAP)
 *  - Ley del Seguro Social (ISSS)
 *  - INSAFORP (1% patronal)
 *  - Código Tributario — Retención ISR Art. 154
 *  - Código de Trabajo — Vacaciones, Aguinaldo, Indemnización
 */

export const SV = {
    // ── AFP ─────────────────────────────────────────────────
    AFP_LABORAL: 0.0725,        // 7.25% descuento al empleado
    AFP_PATRONAL: 0.0875,       // 8.75% carga patronal

    // ── ISSS ─────────────────────────────────────────────────
    ISSS_LABORAL: 0.03,         // 3% descuento al empleado
    ISSS_PATRONAL: 0.075,       // 7.5% carga patronal
    ISSS_MAX_BASE: 1000,        // salario máximo para base ISSS ($1,000)

    // ── INSAFORP ─────────────────────────────────────────────
    INSAFORP_RATE: 0.01,        // 1% patronal
    INSAFORP_MAX_BASE: 1000,    // misma base que ISSS

    // ── PROVISIONES ──────────────────────────────────────────
    VACATION_DAYS: 15,          // días de vacaciones por año
    VACATION_RECARGO: 0.30,     // 30% recargo sobre el salario de vacaciones
    // Aguinaldo por años de servicio:
    AGUINALDO_DAYS: (years: number) => years >= 10 ? 18 : years >= 3 ? 15 : 10,
    INDEMNIZACION_DAYS: 15,     // días de salario por año de servicio
} as const;

// ── ISR Retención en la fuente (mensual) ────────────────────────────────────
// Tabla Art. 154 Código Tributario — salario mensual
export function calcISRMensual(salarioBrutoMensual: number): number {
    const anual = salarioBrutoMensual * 12;

    if (anual <= 4897.23) return 0;

    // Tramos anuales (2024)
    let isrAnual: number;
    if (anual <= 9142.86) {
        isrAnual = (anual - 4064.01) * 0.10 + 186.07;
    } else if (anual <= 22857.14) {
        isrAnual = (anual - 9142.87) * 0.20 + 604.37;
    } else {
        isrAnual = (anual - 22857.15) * 0.30 + 3343.32;
    }

    return Math.max(0, isrAnual / 12);
}

export interface PayrollEmployeeInput {
    employeeName: string;
    dui?: string;
    nup?: string;
    afpName?: string;
    clientId?: string;
    salary: number;          // salario mensual bruto
    otrosIngresos?: number;  // comisiones, horas extra, etc.
}

export interface PayrollEmployeeCalc {
    employeeName: string;
    dui?: string;
    nup?: string;
    afpName?: string;
    clientId?: string;
    salary: number;
    otrosIngresos: number;
    totalBruto: number;
    // Descuentos al empleado
    afpLaboral: number;
    isssLaboral: number;
    isrRetencion: number;
    totalDescuentos: number;
    salarioNeto: number;
    // Carga patronal (costo empresa)
    afpPatronal: number;
    isssPatronal: number;
    insaforp: number;
    costoTotalEmpleado: number; // salarioBruto + cargaPatronal
}

export function calcEmployee(input: PayrollEmployeeInput): PayrollEmployeeCalc {
    const { salary, otrosIngresos = 0 } = input;
    const totalBruto = salary + otrosIngresos;

    // ── Descuentos laborales ──────────────────────────
    const afpLaboral = round2(totalBruto * SV.AFP_LABORAL);

    const isssBase = Math.min(totalBruto, SV.ISSS_MAX_BASE);
    const isssLaboral = round2(isssBase * SV.ISSS_LABORAL);

    const isrRetencion = round2(calcISRMensual(totalBruto));

    const totalDescuentos = round2(afpLaboral + isssLaboral + isrRetencion);
    const salarioNeto = round2(totalBruto - totalDescuentos);

    // ── Carga patronal ────────────────────────────────
    const afpPatronal = round2(totalBruto * SV.AFP_PATRONAL);
    const isssPatronal = round2(isssBase * SV.ISSS_PATRONAL);

    const insaforpBase = Math.min(totalBruto, SV.INSAFORP_MAX_BASE);
    const insaforp = round2(insaforpBase * SV.INSAFORP_RATE);

    const costoTotalEmpleado = round2(totalBruto + afpPatronal + isssPatronal + insaforp);

    return {
        employeeName: input.employeeName,
        dui: input.dui,
        nup: input.nup,
        afpName: input.afpName,
        clientId: input.clientId,
        salary,
        otrosIngresos,
        totalBruto,
        afpLaboral,
        isssLaboral,
        isrRetencion,
        totalDescuentos,
        salarioNeto,
        afpPatronal,
        isssPatronal,
        insaforp,
        costoTotalEmpleado,
    };
}

export interface PayrollTotals {
    totalBruto: number;
    totalNeto: number;
    totalAFPLaboral: number;
    totalAFPPatronal: number;
    totalISSSLaboral: number;
    totalISSSPatronal: number;
    totalINSAFORP: number;
    totalISR: number;
    totalCargaPatronal: number;
    costoTotalPlanilla: number;
}

export function calcPayrollTotals(employees: PayrollEmployeeCalc[]): PayrollTotals {
    const sum = (fn: (e: PayrollEmployeeCalc) => number) =>
        round2(employees.reduce((acc, e) => acc + fn(e), 0));

    const totalCargaPatronal = sum(e => e.afpPatronal + e.isssPatronal + e.insaforp);

    return {
        totalBruto: sum(e => e.totalBruto),
        totalNeto: sum(e => e.salarioNeto),
        totalAFPLaboral: sum(e => e.afpLaboral),
        totalAFPPatronal: sum(e => e.afpPatronal),
        totalISSSLaboral: sum(e => e.isssLaboral),
        totalISSSPatronal: sum(e => e.isssPatronal),
        totalINSAFORP: sum(e => e.insaforp),
        totalISR: sum(e => e.isrRetencion),
        totalCargaPatronal,
        costoTotalPlanilla: round2(sum(e => e.totalBruto) + totalCargaPatronal),
    };
}

// ── Provisiones mensuales ────────────────────────────────────────────────────

export interface ProvisionCalc {
    vacation: number;      // provisión mensual vacaciones
    aguinaldo: number;     // provisión mensual aguinaldo
    indemnizacion: number; // provisión mensual indemnización
}

export function calcMonthlyProvisions(
    monthlySalary: number,
    yearsOfService: number = 0
): ProvisionCalc {
    // Vacaciones: 15 días × 130% / 12 meses
    const dailySalary = monthlySalary / 30;
    const vacation = round2(dailySalary * SV.VACATION_DAYS * (1 + SV.VACATION_RECARGO) / 12);

    // Aguinaldo: N días de salario / 12 meses
    const aguinaldoDays = SV.AGUINALDO_DAYS(yearsOfService);
    const aguinaldo = round2((monthlySalary / 30) * aguinaldoDays / 12);

    // Indemnización: 15 días de salario / 12 meses
    const indemnizacion = round2((monthlySalary / 30) * SV.INDEMNIZACION_DAYS / 12);

    return { vacation, aguinaldo, indemnizacion };
}

// ── Tabla de amortización de préstamo ────────────────────────────────────────

export interface AmortizationRow {
    month: number;
    payment: number;
    principal: number;
    interest: number;
    balance: number;
}

export function calcAmortization(
    principal: number,
    annualRate: number,  // en porcentaje (ej: 8.5)
    termMonths: number
): AmortizationRow[] {
    const monthlyRate = annualRate / 100 / 12;
    const payment = monthlyRate === 0
        ? principal / termMonths
        : principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -termMonths));

    const rows: AmortizationRow[] = [];
    let balance = principal;

    for (let m = 1; m <= termMonths; m++) {
        const interest = round2(balance * monthlyRate);
        const principalPmt = round2(payment - interest);
        balance = round2(balance - principalPmt);
        rows.push({
            month: m,
            payment: round2(payment),
            principal: principalPmt,
            interest,
            balance: Math.max(0, balance),
        });
    }

    return rows;
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}
