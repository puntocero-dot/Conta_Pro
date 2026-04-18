'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useFilter } from '@/context/FilterContext';
import { useCompany } from '@/context/CompanyContext';
import styles from './financial-statements.module.css';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(n ?? 0);
const fmtPct = (n: number) => `${((n ?? 0) * 100).toFixed(1)}%`;

type Tab = 'balance' | 'income' | 'cashflow' | 'equity';

function Row({ label, amount, bold, indent, positive, separator }: {
  label?: string; amount?: number; bold?: boolean; indent?: number; positive?: boolean; separator?: boolean;
}) {
  if (separator) return <tr className={styles.separator}><td colSpan={2}><hr /></td></tr>;
  const cls = [bold ? styles.bold : '', positive !== undefined ? (positive ? styles.income : styles.expense) : ''].join(' ');
  return (
    <tr className={cls}>
      <td style={{ paddingLeft: `${(indent ?? 0) * 1.25 + 1}rem` }}>{label}</td>
      <td className={styles.amount}>{amount !== undefined ? fmt(amount) : ''}</td>
    </tr>
  );
}

function BalanceTab({ data }: { data: any }) {
  if (!data) return <p className={styles.loading}>Cargando...</p>;
  const { assets, liabilities, equity } = data;
  return (
    <div className={styles.statements}>
      <div className={`${styles.equationBadge} ${data.balanced ? styles.balanced : styles.unbalanced}`}>
        {data.balanced ? '✓ Ecuación contable cuadra' : '⚠ Ecuación no cuadra — revisa asientos'}
      </div>
      <div className={styles.statementGrid}>
        {/* ACTIVOS */}
        <div className={styles.statementSection}>
          <h3>ACTIVOS</h3>
          <table className={styles.stmtTable}>
            <tbody>
              <Row label="Activo Corriente" bold />
              {assets.current.accounts.map((a: any) => (
                <Row key={a.code} label={`${a.code} ${a.name}`} amount={a.balance} indent={1} />
              ))}
              <Row label="Total Activo Corriente" amount={assets.current.total} bold />
              <Row separator />
              <Row label="Activo No Corriente" bold />
              {assets.nonCurrent.accounts.map((a: any) => (
                <Row key={a.code} label={`${a.code} ${a.name}`} amount={a.balance} indent={1} positive={!a.code.includes('D')} />
              ))}
              <Row label="Total Activo No Corriente" amount={assets.nonCurrent.total} bold />
              <Row separator />
              <Row label="TOTAL ACTIVOS" amount={assets.total} bold positive />
            </tbody>
          </table>
        </div>
        {/* PASIVOS + PATRIMONIO */}
        <div className={styles.statementSection}>
          <h3>PASIVOS</h3>
          <table className={styles.stmtTable}>
            <tbody>
              <Row label="Pasivo Corriente" bold />
              {liabilities.current.accounts.map((a: any) => (
                <Row key={a.code} label={`${a.code} ${a.name}`} amount={a.balance} indent={1} />
              ))}
              <Row label="Total Pasivo Corriente" amount={liabilities.current.total} bold />
              <Row separator />
              <Row label="Pasivo No Corriente" bold />
              {liabilities.nonCurrent.accounts.map((a: any) => (
                <Row key={a.code} label={`${a.code} ${a.name}`} amount={a.balance} indent={1} />
              ))}
              <Row label="Total Pasivo No Corriente" amount={liabilities.nonCurrent.total} bold />
              <Row separator />
              <Row label="TOTAL PASIVOS" amount={liabilities.total} bold positive={false} />
              <Row separator />
              <h3 style={{ padding: '0.5rem 1rem', margin: 0 }}>PATRIMONIO</h3>
              {equity.accounts.map((a: any) => (
                <Row key={a.code} label={`${a.code} ${a.name}`} amount={a.balance} indent={1} />
              ))}
              <Row label="TOTAL PATRIMONIO" amount={equity.total} bold positive />
              <Row separator />
              <Row label="TOTAL PASIVOS + PATRIMONIO" amount={data.totalLiabilitiesAndEquity} bold positive />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function IncomeTab({ data }: { data: any }) {
  if (!data) return <p className={styles.loading}>Cargando...</p>;
  return (
    <div className={styles.singleStatement}>
      <table className={styles.stmtTable}>
        <tbody>
          <Row label="INGRESOS" bold />
          {data.revenueAccounts?.map((a: any) => (
            <Row key={a.code} label={`${a.code} ${a.name}`} amount={a.balance} indent={1} positive />
          ))}
          <Row label="Total Ingresos" amount={data.revenue} bold positive />
          <Row separator />
          <Row label="COSTOS" bold />
          {data.costAccounts?.map((a: any) => (
            <Row key={a.code} label={`${a.code} ${a.name}`} amount={a.balance} indent={1} positive={false} />
          ))}
          <Row label="(–) Costo de Ventas/Servicios" amount={-data.costOfSales} indent={1} />
          <Row label="UTILIDAD BRUTA" amount={data.grossProfit} bold positive={data.grossProfit >= 0} />
          <Row label={`Margen Bruto: ${fmtPct(data.grossMargin)}`} indent={1} />
          <Row separator />
          <Row label="GASTOS DE OPERACIÓN (sin depreciación)" bold />
          {data.operatingExpenseAccounts?.map((a: any) => (
            <Row key={a.code} label={`${a.code} ${a.name}`} amount={-a.balance} indent={1} />
          ))}
          <Row label="EBITDA" amount={data.ebitda} bold positive={data.ebitda >= 0} />
          <Row label={`Margen EBITDA: ${fmtPct(data.ebitdaMargin)}`} indent={1} />
          <Row separator />
          <Row label="Depreciaciones y Amortizaciones" amount={-data.depreciation} indent={1} positive={false} />
          <Row label="EBIT (Utilidad Operativa)" amount={data.ebit} bold positive={data.ebit >= 0} />
          <Row separator />
          <Row label="Gastos Financieros" amount={-data.financialExpenses} indent={1} positive={false} />
          <Row label="Otros Gastos" amount={-data.otherExpenses} indent={1} positive={false} />
          <Row label="EBT (Utilidad antes ISR)" amount={data.ebt} bold positive={data.ebt >= 0} />
          <Row separator />
          <Row label="ISR (25% / 30%)" amount={-data.isr} indent={1} positive={false} />
          <Row label="UTILIDAD NETA" amount={data.netIncome} bold positive={data.netIncome >= 0} />
          <Row label="Reserva Legal (7%)" amount={-data.reservaLegal} indent={1} positive={false} />
          <Row label="UTILIDAD DISTRIBUIBLE" amount={data.distributableIncome} bold positive={data.distributableIncome >= 0} />
        </tbody>
      </table>
    </div>
  );
}

function CashFlowTab({ data }: { data: any }) {
  if (!data) return <p className={styles.loading}>Cargando...</p>;
  return (
    <div className={styles.singleStatement}>
      <table className={styles.stmtTable}>
        <tbody>
          <Row label="ACTIVIDADES DE OPERACIÓN" bold />
          <Row label="Utilidad Neta" amount={data.operating.netIncome} indent={1} positive={data.operating.netIncome >= 0} />
          {data.operating.addBack.map((i: any, idx: number) => (
            <Row key={idx} label={`+ ${i.label}`} amount={i.amount} indent={1} positive />
          ))}
          {data.operating.workingCapitalChanges.map((i: any, idx: number) => (
            <Row key={idx} label={i.label} amount={i.amount} indent={1} positive={i.amount >= 0} />
          ))}
          <Row label="Flujo Neto de Operación" amount={data.operating.total} bold positive={data.operating.total >= 0} />
          <Row separator />
          <Row label="ACTIVIDADES DE INVERSIÓN" bold />
          {data.investing.items.map((i: any, idx: number) => (
            <Row key={idx} label={i.label} amount={i.amount} indent={1} positive={i.amount >= 0} />
          ))}
          <Row label="Flujo Neto de Inversión" amount={data.investing.total} bold positive={data.investing.total >= 0} />
          <Row separator />
          <Row label="ACTIVIDADES DE FINANCIAMIENTO" bold />
          {data.financing.items.map((i: any, idx: number) => (
            <Row key={idx} label={i.label} amount={i.amount} indent={1} positive={i.amount >= 0} />
          ))}
          <Row label="Flujo Neto de Financiamiento" amount={data.financing.total} bold positive={data.financing.total >= 0} />
          <Row separator />
          <Row label="VARIACIÓN NETA DE EFECTIVO" amount={data.netChange} bold positive={data.netChange >= 0} />
          <Row label="Saldo Inicial de Caja" amount={data.openingCash} indent={1} />
          <Row label="SALDO FINAL DE CAJA" amount={data.closingCash} bold positive={data.closingCash >= 0} />
        </tbody>
      </table>
    </div>
  );
}

function EquityTab({ data }: { data: any }) {
  if (!data) return <p className={styles.loading}>Cargando...</p>;
  return (
    <div className={styles.singleStatement}>
      <table className={styles.stmtTable}>
        <tbody>
          <Row label={`Saldo Inicial Patrimonio (${data.year - 1})`} amount={data.openingEquity} bold />
          <Row label="+ Aportaciones del Período" amount={data.capitalContributions} indent={1} positive />
          <Row label="+ Utilidad Neta del Período" amount={data.netIncome} indent={1} positive={data.netIncome >= 0} />
          <Row label="– Distribución de Utilidades" amount={-data.dividends} indent={1} positive={false} />
          <Row label="+ Reserva Legal Constituida (7%)" amount={data.reservaLegal} indent={1} />
          <Row separator />
          <Row label={`Saldo Final Patrimonio (${data.year})`} amount={data.closingEquity} bold positive={data.closingEquity >= 0} />
          <Row separator />
          {data.accounts?.map((a: any) => (
            <Row key={a.code} label={`${a.code} ${a.name}`} amount={a.balance} indent={1} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FinancialStatementsPage() {
  const { startDate, endDate } = useFilter();
  const { activeCompanyId } = useCompany();
  const [tab, setTab] = useState<Tab>('balance');
  const [balance, setBalance] = useState<any>(null);
  const [income, setIncome] = useState<any>(null);
  const [cashflow, setCashflow] = useState<any>(null);
  const [equity, setEquity] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!activeCompanyId) {
      setBalance(null); setIncome(null); setCashflow(null); setEquity(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const params = `startDate=${startDate}&endDate=${endDate}`;
    const year = new Date(endDate).getFullYear();
    const headers = { 'x-company-id': activeCompanyId, 'X-Requested-With': 'XMLHttpRequest' };

    const [bs, is, cf, eq] = await Promise.all([
      fetch(`/api/financial-statements/balance-sheet?date=${endDate}`, { headers }).then(r => r.json()),
      fetch(`/api/financial-statements/income-statement?${params}`, { headers }).then(r => r.json()),
      fetch(`/api/financial-statements/cash-flow?${params}`, { headers }).then(r => r.json()),
      fetch(`/api/financial-statements/equity-statement?year=${year}`, { headers }).then(r => r.json()),
    ]);

    setBalance(bs);
    setIncome(is);
    setCashflow(cf);
    setEquity(eq);
    setLoading(false);
  }, [startDate, endDate, activeCompanyId]);

  useEffect(() => { load(); }, [load]);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'balance',   label: 'Balance General' },
    { key: 'income',    label: 'Estado de Resultados' },
    { key: 'cashflow',  label: 'Flujo de Efectivo' },
    { key: 'equity',    label: 'Capital Contable' },
  ];

  return (
    <div className={styles.page}>
      <PageHeader title="Estados Financieros" subtitle="NIIF PYMES — El Salvador">
        <button className={styles.btnPrint} onClick={() => window.print()}>
          Imprimir / PDF
        </button>
      </PageHeader>

      <div className={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t.key}
            className={tab === t.key ? styles.tabActive : styles.tab}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className={styles.loading}>Calculando...</p>}

      {!loading && tab === 'balance'  && <BalanceTab data={balance} />}
      {!loading && tab === 'income'   && <IncomeTab data={income} />}
      {!loading && tab === 'cashflow' && <CashFlowTab data={cashflow} />}
      {!loading && tab === 'equity'   && <EquityTab data={equity} />}
    </div>
  );
}
