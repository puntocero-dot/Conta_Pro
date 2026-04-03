import { BalanceSheet, IncomeStatement, CashFlowStatement } from './financial-statements';

export interface FinancialMetrics {
  // Rentabilidad
  ebitda: number;
  ebitdaMargin: number;
  ebit: number;
  grossMargin: number;
  netMargin: number;

  // Liquidez
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;

  // Endeudamiento
  debtToEquity: number;
  debtToAssets: number;
  coverageRatio: number; // EBIT / Gastos Financieros

  // Actividad
  daysReceivable: number;
  daysPayable: number;

  // Impuestos SV
  ivaDebitoEstimado: number;   // 13% sobre ingresos
  ivaCreditoEstimado: number;  // IVA en compras (aproximado)
  ivaBalance: number;          // Débito - Crédito
  pagoACuenta: number;         // 1.75% ingresos brutos
  isrEstimado: number;
  reservaLegal: number;        // 7% utilidad neta

  // Revenue
  revenue: number;
  netIncome: number;
  grossProfit: number;
}

export function calcFinancialMetrics(
  bs: BalanceSheet,
  is: IncomeStatement,
  _cf: CashFlowStatement
): FinancialMetrics {
  const currentAssets = bs.assets.current.total;
  const currentLiabilities = bs.liabilities.current.total;
  const totalAssets = bs.assets.total;
  const totalLiabilities = bs.liabilities.total;
  const equity = bs.equity.total;

  // Inventarios desde cuentas corrientes (código 1104)
  const inventories = bs.assets.current.accounts.find(a => a.code === '1104')?.balance ?? 0;
  // Caja desde código 1101
  const cash = bs.assets.current.accounts.find(a => a.code === '1101')?.balance ?? 0;
  // CxC desde 1102
  const receivables = bs.assets.current.accounts.find(a => a.code === '1102')?.balance ?? 0;
  // CxP desde 2101
  const payables = bs.liabilities.current.accounts.find(a => a.code === '2101')?.balance ?? 0;

  // Liquidez
  const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
  const quickRatio = currentLiabilities > 0 ? (currentAssets - inventories) / currentLiabilities : 0;
  const cashRatio = currentLiabilities > 0 ? cash / currentLiabilities : 0;

  // Endeudamiento
  const debtToEquity = equity > 0 ? totalLiabilities / equity : 0;
  const debtToAssets = totalAssets > 0 ? totalLiabilities / totalAssets : 0;
  const coverageRatio = is.financialExpenses > 0 ? is.ebit / is.financialExpenses : 0;

  // Actividad (días)
  const dailyRevenue = is.revenue / 365;
  const dailyCost = is.costOfSales / 365;
  const daysReceivable = dailyRevenue > 0 ? receivables / dailyRevenue : 0;
  const daysPayable = dailyCost > 0 ? payables / dailyCost : 0;

  // Impuestos SV
  const IVA_RATE = 0.13;
  const ivaDebitoEstimado = is.revenue * IVA_RATE;
  const ivaCreditoEstimado = is.costOfSales * IVA_RATE;
  const ivaBalance = ivaDebitoEstimado - ivaCreditoEstimado;
  const pagoACuenta = is.revenue * 0.0175;

  return {
    ebitda: is.ebitda,
    ebitdaMargin: is.ebitdaMargin,
    ebit: is.ebit,
    grossMargin: is.grossMargin,
    netMargin: is.revenue > 0 ? is.netIncome / is.revenue : 0,
    currentRatio,
    quickRatio,
    cashRatio,
    debtToEquity,
    debtToAssets,
    coverageRatio,
    daysReceivable,
    daysPayable,
    ivaDebitoEstimado,
    ivaCreditoEstimado,
    ivaBalance,
    pagoACuenta,
    isrEstimado: is.isr,
    reservaLegal: is.reservaLegal,
    revenue: is.revenue,
    netIncome: is.netIncome,
    grossProfit: is.grossProfit,
  };
}
