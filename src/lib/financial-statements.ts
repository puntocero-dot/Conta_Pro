import { prisma } from '@/lib/prisma';
import { calcReservaLegal, type CompanyTypeKey } from '@/lib/sv-legal-config';

export interface AccountBalance {
  code: string;
  name: string;
  type: string;
  group: string;
  debit: number;
  credit: number;
  balance: number; // saldo neto según naturaleza de la cuenta
}

// Cuentas de naturaleza deudora (saldo = débitos - créditos)
const DEBIT_NATURE = ['ACTIVO', 'COSTO', 'GASTO'];

// Suma todos los movimientos de JournalEntryLine agrupados por cuenta
export async function getAccountBalances(
  companyId: string,
  endDate?: Date,
  startDate?: Date
): Promise<AccountBalance[]> {
  const dateFilter: any = {};
  if (startDate) dateFilter.gte = startDate;
  if (endDate) dateFilter.lte = endDate;

  const lines = await prisma.journalEntryLine.findMany({
    where: {
      account: { companyId },
      ...(Object.keys(dateFilter).length > 0
        ? { journalEntry: { date: dateFilter } }
        : {}),
    },
    include: { account: true },
  });

  const map = new Map<
    string,
    { code: string; name: string; type: string; debit: number; credit: number }
  >();

  for (const line of lines) {
    const key = line.account.code;
    if (!map.has(key)) {
      map.set(key, {
        code: line.account.code,
        name: line.account.name,
        type: line.account.type,
        debit: 0,
        credit: 0,
      });
    }
    const entry = map.get(key)!;
    entry.debit += line.debit;
    entry.credit += line.credit;
  }

  // Enrich with group info from catalog (fallback to code prefix)
  const result: AccountBalance[] = [];
  for (const [, acc] of map) {
    const isDebitNature = DEBIT_NATURE.includes(acc.type);
    const balance = isDebitNature ? acc.debit - acc.credit : acc.credit - acc.debit;

    result.push({
      code: acc.code,
      name: acc.name,
      type: acc.type,
      group: inferGroup(acc.code, acc.type),
      debit: acc.debit,
      credit: acc.credit,
      balance,
    });
  }

  return result.sort((a, b) => a.code.localeCompare(b.code));
}

function inferGroup(code: string, type: string): string {
  const prefix = code.substring(0, 2);
  if (prefix === '11') return 'Activo Corriente';
  if (prefix === '12') return 'Activo No Corriente';
  if (prefix === '21') return 'Pasivo Corriente';
  if (prefix === '22') return 'Pasivo No Corriente';
  if (prefix === '31') return 'Patrimonio';
  if (prefix === '41') return 'Ingresos Operacionales';
  if (prefix === '42' || prefix === '43' || prefix === '44') return 'Ingresos No Operacionales';
  if (prefix === '51' || prefix === '52') return 'Costos';
  if (prefix === '61') return 'Gastos de Operación';
  if (prefix === '62') return 'Gastos Financieros';
  if (prefix === '63') return 'Otros Gastos';
  return type;
}

// ─── BALANCE GENERAL ──────────────────────────────────────────────────────────

export interface BalanceSheet {
  date: string;
  assets: {
    current: { total: number; accounts: AccountBalance[] };
    nonCurrent: { total: number; accounts: AccountBalance[] };
    total: number;
  };
  liabilities: {
    current: { total: number; accounts: AccountBalance[] };
    nonCurrent: { total: number; accounts: AccountBalance[] };
    total: number;
  };
  equity: { total: number; accounts: AccountBalance[] };
  totalLiabilitiesAndEquity: number;
  balanced: boolean;
}

export async function buildBalanceSheet(companyId: string, date: Date): Promise<BalanceSheet> {
  const balances = await getAccountBalances(companyId, date);

  const assetsCurrent = balances.filter(a => a.type === 'ACTIVO' && a.group === 'Activo Corriente');
  const assetsNonCurrent = balances.filter(a => a.type === 'ACTIVO' && a.group === 'Activo No Corriente');
  const liabCurrent = balances.filter(a => a.type === 'PASIVO' && a.group === 'Pasivo Corriente');
  const liabNonCurrent = balances.filter(a => a.type === 'PASIVO' && a.group === 'Pasivo No Corriente');
  const equityAccounts = balances.filter(a => a.type === 'PATRIMONIO');

  const sum = (arr: AccountBalance[]) => arr.reduce((s, a) => s + a.balance, 0);

  const totalAssets = sum(assetsCurrent) + sum(assetsNonCurrent);
  const totalLiab = sum(liabCurrent) + sum(liabNonCurrent);
  const totalEquity = sum(equityAccounts);
  const totalLE = totalLiab + totalEquity;

  return {
    date: date.toISOString().split('T')[0],
    assets: {
      current: { total: sum(assetsCurrent), accounts: assetsCurrent },
      nonCurrent: { total: sum(assetsNonCurrent), accounts: assetsNonCurrent },
      total: totalAssets,
    },
    liabilities: {
      current: { total: sum(liabCurrent), accounts: liabCurrent },
      nonCurrent: { total: sum(liabNonCurrent), accounts: liabNonCurrent },
      total: totalLiab,
    },
    equity: { total: totalEquity, accounts: equityAccounts },
    totalLiabilitiesAndEquity: totalLE,
    balanced: Math.abs(totalAssets - totalLE) < 0.01,
  };
}

// ─── ESTADO DE RESULTADOS ─────────────────────────────────────────────────────

export interface IncomeStatement {
  startDate: string;
  endDate: string;
  revenue: number;
  revenueAccounts: AccountBalance[];
  costOfSales: number;
  costAccounts: AccountBalance[];
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: number;        // 6101-6115, 6118 (sin depreciaciones)
  operatingExpenseAccounts: AccountBalance[];
  ebitda: number;
  ebitdaMargin: number;
  depreciation: number;             // 6116 + 6117
  depreciationAccounts: AccountBalance[];
  ebit: number;
  financialExpenses: number;        // 6201-6202
  financialAccounts: AccountBalance[];
  otherExpenses: number;            // 6301-6302
  ebt: number;
  isr: number;                      // 25% (o 30% si > $150k)
  netIncome: number;
  reservaLegal: number;             // 7%
  distributableIncome: number;
}

export async function buildIncomeStatement(
  companyId: string,
  startDate: Date,
  endDate: Date
): Promise<IncomeStatement> {
  const balances = await getAccountBalances(companyId, endDate, startDate);

  const revenueAccounts = balances.filter(a => a.type === 'INGRESO');
  const costAccounts = balances.filter(a => a.type === 'COSTO');
  const deprAccounts = balances.filter(a => ['6116', '6117'].includes(a.code));
  const financialAccounts = balances.filter(a => a.group === 'Gastos Financieros');
  const otherExpenseAccounts = balances.filter(a => a.group === 'Otros Gastos');
  const operatingAccounts = balances.filter(
    a =>
      a.type === 'GASTO' &&
      !['6116', '6117'].includes(a.code) &&
      a.group !== 'Gastos Financieros' &&
      a.group !== 'Otros Gastos'
  );

  const sum = (arr: AccountBalance[]) => arr.reduce((s, a) => s + a.balance, 0);

  const revenue = sum(revenueAccounts);
  const costOfSales = sum(costAccounts);
  const grossProfit = revenue - costOfSales;
  const operatingExpenses = sum(operatingAccounts);
  const ebitda = grossProfit - operatingExpenses;
  const depreciation = sum(deprAccounts);
  const ebit = ebitda - depreciation;
  const financialExpenses = sum(financialAccounts);
  const otherExpenses = sum(otherExpenseAccounts);
  const ebt = ebit - financialExpenses - otherExpenses;

  // ISR El Salvador: 25% si renta ≤ $150,000; 30% si > $150,000 (anual)
  const isrRate = revenue > 150000 ? 0.30 : 0.25;
  const isr = ebt > 0 ? ebt * isrRate : 0;
  const netIncome = ebt - isr;

  // Reserva Legal dinámica según tipo de sociedad
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { companyType: true, metadata: true },
  });
  const companyType = (company?.companyType as CompanyTypeKey) ?? 'SA';
  const metadata = company?.metadata as Record<string, unknown> | null;
  const capitalSocial = typeof metadata?.shareCapital === 'number' ? metadata.shareCapital : 0;

  // Obtener reserva acumulada (saldo de cuenta 3102)
  const reservaAccount = balances.find(a => a.code === '3102');
  const reservaAcumulada = reservaAccount?.balance ?? 0;

  const reservaResult = calcReservaLegal(netIncome, companyType, capitalSocial, reservaAcumulada);
  const reservaLegal = reservaResult.amount;
  const distributableIncome = netIncome - reservaLegal;

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    revenue,
    revenueAccounts,
    costOfSales,
    costAccounts,
    grossProfit,
    grossMargin: revenue > 0 ? grossProfit / revenue : 0,
    operatingExpenses,
    operatingExpenseAccounts: operatingAccounts,
    ebitda,
    ebitdaMargin: revenue > 0 ? ebitda / revenue : 0,
    depreciation,
    depreciationAccounts: deprAccounts,
    ebit,
    financialExpenses,
    financialAccounts,
    otherExpenses,
    ebt,
    isr,
    netIncome,
    reservaLegal,
    distributableIncome,
  };
}

// ─── FLUJO DE EFECTIVO (Método Indirecto — NIIF PYMES §7) ────────────────────

export interface CashFlowStatement {
  startDate: string;
  endDate: string;
  operating: {
    netIncome: number;
    addBack: { label: string; amount: number }[];
    workingCapitalChanges: { label: string; amount: number }[];
    total: number;
  };
  investing: {
    items: { label: string; amount: number }[];
    total: number;
  };
  financing: {
    items: { label: string; amount: number }[];
    total: number;
  };
  netChange: number;
  openingCash: number;
  closingCash: number;
}

export async function buildCashFlow(
  companyId: string,
  startDate: Date,
  endDate: Date
): Promise<CashFlowStatement> {
  const incomeStmt = await buildIncomeStatement(companyId, startDate, endDate);

  // Depreciaciones (non-cash add-back)
  const addBack = [
    { label: 'Depreciaciones y Amortizaciones', amount: incomeStmt.depreciation },
  ];

  // Previsiones devengadas no pagadas (affectsCash: false)
  const provisions = await prisma.provision.findMany({
    where: {
      companyId,
      createdAt: { gte: startDate, lte: endDate },
    },
  });
  const accruedProvisions = provisions.reduce((s, p) => s + p.accruedAmount, 0);
  if (accruedProvisions > 0) {
    addBack.push({ label: 'Previsiones Devengadas (no efectivo)', amount: accruedProvisions });
  }

  // Actividades de inversión: compra de activos fijos en el período
  const assetsAcquired = await (prisma.fixedAsset as any).findMany({
    where: {
      companyId,
      purchaseDate: { gte: startDate, lte: endDate },
    },
    select: { purchaseCost: true, name: true },
  });
  const investingItems = assetsAcquired.map((a: any) => ({
    label: `Compra: ${a.name}`,
    amount: -a.purchaseCost,
  }));

  // Actividades de financiamiento: préstamos y pagos de capital
  const loanPayments = await prisma.loanPayment.findMany({
    where: {
      loan: { companyId },
      paymentDate: { gte: startDate, lte: endDate },
    },
    select: { principal: true, interest: true },
  });
  const capitalPaid = loanPayments.reduce((s, p) => s + p.principal, 0);
  const financingItems = capitalPaid > 0
    ? [{ label: 'Abono a Capital de Préstamos', amount: -capitalPaid }]
    : [];

  // Saldo de caja: cuenta 1101
  const cashAccount = await prisma.account.findFirst({
    where: { companyId, code: '1101' },
  });
  const cashBalanceNow = cashAccount
    ? await (async () => {
        const lines = await prisma.journalEntryLine.findMany({
          where: { accountId: cashAccount.id },
          select: { debit: true, credit: true },
        });
        return lines.reduce((s, l) => s + l.debit - l.credit, 0);
      })()
    : 0;

  const netOperating =
    incomeStmt.netIncome +
    addBack.reduce((s, i) => s + i.amount, 0);

  const netInvesting = investingItems.reduce((s: number, i: { label: string; amount: number }) => s + i.amount, 0);
  const netFinancing = financingItems.reduce((s: number, i: { label: string; amount: number }) => s + i.amount, 0);
  const netChange = netOperating + netInvesting + netFinancing;
  const openingCash = cashBalanceNow - netChange;

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    operating: {
      netIncome: incomeStmt.netIncome,
      addBack,
      workingCapitalChanges: [],
      total: netOperating,
    },
    investing: { items: investingItems, total: netInvesting },
    financing: { items: financingItems, total: netFinancing },
    netChange,
    openingCash,
    closingCash: cashBalanceNow,
  };
}

// ─── ESTADO DE CAPITAL CONTABLE ───────────────────────────────────────────────

export interface EquityStatement {
  year: number;
  openingEquity: number;
  capitalContributions: number;
  netIncome: number;
  dividends: number;
  reservaLegal: number;
  closingEquity: number;
  accounts: AccountBalance[];
}

export async function buildEquityStatement(
  companyId: string,
  year: number
): Promise<EquityStatement> {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);
  const prevEndOfYear = new Date(year - 1, 11, 31, 23, 59, 59);

  const [currentBalances, prevBalances, incomeStmt] = await Promise.all([
    getAccountBalances(companyId, endOfYear),
    getAccountBalances(companyId, prevEndOfYear),
    buildIncomeStatement(companyId, startOfYear, endOfYear),
  ]);

  const equityAccounts = currentBalances.filter(a => a.type === 'PATRIMONIO');
  const prevEquity = prevBalances
    .filter(a => a.type === 'PATRIMONIO')
    .reduce((s, a) => s + a.balance, 0);

  const closingEquity = equityAccounts.reduce((s, a) => s + a.balance, 0);

  return {
    year,
    openingEquity: prevEquity,
    capitalContributions: 0,
    netIncome: incomeStmt.netIncome,
    dividends: 0,
    reservaLegal: incomeStmt.reservaLegal,
    closingEquity,
    accounts: equityAccounts,
  };
}
