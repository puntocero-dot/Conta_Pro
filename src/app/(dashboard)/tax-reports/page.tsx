'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import styles from './tax-reports.module.css';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(n ?? 0);
const fmtPct = (n: number) => `${((n ?? 0) * 100).toFixed(2)}%`;

const now = new Date();
const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

type Tab = 'iva' | 'pago-a-cuenta' | 'isr';

export default function TaxReportsPage() {
  const [tab, setTab] = useState<Tab>('iva');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [ivaData, setIvaData] = useState<any>(null);
  const [pacData, setPacData] = useState<any>(null);
  const [isrData, setIsrData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [iva, pac, isr] = await Promise.all([
      fetch(`/api/tax-reports/iva?month=${month}&year=${year}`).then(r => r.json()),
      fetch(`/api/tax-reports/pago-a-cuenta?month=${month}&year=${year}`).then(r => r.json()),
      fetch(`/api/tax-reports/isr?year=${year}`).then(r => r.json()),
    ]);
    setIvaData(iva);
    setPacData(pac);
    setIsrData(isr);
    setLoading(false);
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const TABS: { key: Tab; label: string; form: string }[] = [
    { key: 'iva',           label: 'IVA',          form: 'F-07' },
    { key: 'pago-a-cuenta', label: 'Pago a Cuenta', form: 'F-14' },
    { key: 'isr',           label: 'ISR Anual',    form: 'F-11' },
  ];

  return (
    <div className={styles.page}>
      <PageHeader title="Reportes Fiscales" subtitle="Declaraciones tributarias — DGII El Salvador">
        <div className={styles.periodSelector}>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}>
            {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </PageHeader>

      <div className={styles.tabs}>
        {TABS.map(t => (
          <button key={t.key} className={tab === t.key ? styles.tabActive : styles.tab} onClick={() => setTab(t.key)}>
            {t.label} <span className={styles.formBadge}>{t.form}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className={styles.loading}>Calculando...</p>
      ) : (
        <>
          {tab === 'iva' && ivaData && <IVAReport data={ivaData} />}
          {tab === 'pago-a-cuenta' && pacData && <PACReport data={pacData} />}
          {tab === 'isr' && isrData && <ISRReport data={isrData} />}
        </>
      )}
    </div>
  );
}

function IVAReport({ data }: { data: any }) {
  const r = data.resumen ?? {};
  return (
    <div className={styles.reportWrapper}>
      <div className={styles.reportHeader}>
        <h3>Declaración de IVA — Formulario F-07</h3>
        <span className={styles.period}>{data.period?.label}</span>
      </div>
      <div className={styles.reportGrid}>
        <div className={styles.reportCard}>
          <h4>Ventas (Débito Fiscal)</h4>
          <div className={styles.row}><span>Total Ventas</span><strong>{fmt(data.ventas?.total)}</strong></div>
          <div className={styles.row}><span>IVA 13% (Débito Fiscal)</span><strong className={styles.expense}>{fmt(data.ventas?.debitoFiscal)}</strong></div>
          <div className={styles.row}><span>Transacciones</span><span>{data.ventas?.transactions}</span></div>
        </div>
        <div className={styles.reportCard}>
          <h4>Compras (Crédito Fiscal)</h4>
          <div className={styles.row}><span>Total Compras</span><strong>{fmt(data.compras?.total)}</strong></div>
          <div className={styles.row}><span>IVA 13% (Crédito Fiscal)</span><strong className={styles.income}>{fmt(data.compras?.creditoFiscal)}</strong></div>
          <div className={styles.row}><span>Transacciones</span><span>{data.compras?.transactions}</span></div>
        </div>
      </div>
      <div className={`${styles.summaryCard} ${r.status === 'PAGAR' ? styles.toPay : styles.toReturn}`}>
        <div className={styles.summaryRow}><span>Débito Fiscal</span><strong>{fmt(r.debitoFiscal)}</strong></div>
        <div className={styles.summaryRow}><span>(–) Crédito Fiscal</span><strong>{fmt(r.creditoFiscal)}</strong></div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryRow}>
          <span>{r.status === 'PAGAR' ? 'IVA A PAGAR' : 'REMANENTE A FAVOR'}</span>
          <strong className={styles.bigAmount}>{fmt(r.status === 'PAGAR' ? r.saldoAPagar : r.remanente)}</strong>
        </div>
        <p className={styles.hint}>Declarar y pagar antes del 31 del mes siguiente</p>
      </div>
    </div>
  );
}

function PACReport({ data }: { data: any }) {
  const ac = data.acumuladoAnual ?? {};
  return (
    <div className={styles.reportWrapper}>
      <div className={styles.reportHeader}>
        <h3>Pago a Cuenta — Formulario F-14</h3>
        <span className={styles.period}>{data.period?.label} — Tasa {fmtPct(data.tasa ?? 0.0175)}</span>
      </div>
      <div className={styles.reportGrid}>
        <div className={styles.reportCard}>
          <h4>Mes Actual</h4>
          <div className={styles.row}><span>Ingresos Brutos del Mes</span><strong>{fmt(data.ingresosBrutos)}</strong></div>
          <div className={styles.row}><span>Pago a Cuenta (1.75%)</span><strong className={styles.expense}>{fmt(data.pagoACuentaMes)}</strong></div>
          <p className={styles.hint}>{data.vencimiento}</p>
        </div>
        <div className={styles.reportCard}>
          <h4>Acumulado del Año</h4>
          <div className={styles.row}><span>Ingresos Acumulados</span><strong>{fmt(ac.ingresos)}</strong></div>
          <div className={styles.row}><span>Pagos a Cuenta Acumulados</span><strong>{fmt(ac.pagoACuenta)}</strong></div>
          <div className={styles.row}><span>ISR Anual Estimado</span><strong>{fmt(ac.isrAnualEstimado)}</strong></div>
          <div className={styles.summaryDivider} />
          {ac.saldoFavorable > 0
            ? <div className={styles.row}><span>Saldo a Favor</span><strong className={styles.income}>{fmt(ac.saldoFavorable)}</strong></div>
            : <div className={styles.row}><span>ISR por Pagar</span><strong className={styles.expense}>{fmt(ac.saldoAPagar)}</strong></div>
          }
        </div>
      </div>
    </div>
  );
}

function ISRReport({ data }: { data: any }) {
  const d = data.desglose ?? {};
  return (
    <div className={styles.reportWrapper}>
      <div className={styles.reportHeader}>
        <h3>Declaración ISR Anual — Formulario F-11</h3>
        <span className={styles.period}>Año fiscal {data.year} · Vencimiento: {data.vencimiento}</span>
      </div>
      <div className={styles.reportCard}>
        <h4>Cálculo Renta Neta Imponible</h4>
        <div className={styles.row}><span>Ingresos Brutos</span><strong>{fmt(d.revenue)}</strong></div>
        <div className={styles.row}><span>(–) Costo de Ventas</span><strong>{fmt(-d.costOfSales)}</strong></div>
        <div className={styles.row}><span>Utilidad Bruta</span><strong>{fmt(d.grossProfit)}</strong></div>
        <div className={styles.row}><span>(–) Gastos de Operación</span><strong>{fmt(-d.operatingExpenses)}</strong></div>
        <div className={styles.row}><span>EBITDA</span><strong>{fmt(d.ebitda)}</strong></div>
        <div className={styles.row}><span>(–) Depreciaciones</span><strong>{fmt(-d.depreciation)}</strong></div>
        <div className={styles.row}><span>(–) Gastos Financieros</span><strong>{fmt(-d.financialExpenses)}</strong></div>
        <div className={styles.summaryDivider} />
        <div className={styles.row}><span>Renta Neta Imponible</span><strong>{fmt(data.rentaNeta)}</strong></div>
        <div className={styles.row}><span>Tasa ISR</span><strong>{fmtPct(data.tasa)}</strong></div>
        <div className={styles.row}><span>ISR Causado</span><strong className={styles.expense}>{fmt(data.isrCausado)}</strong></div>
        <div className={styles.row}><span>(–) Pagos a Cuenta Deducibles</span><strong>{fmt(data.pagoACuentaDeducible)}</strong></div>
        <div className={styles.summaryDivider} />
        <div className={styles.row}>
          <span>{data.status === 'PAGAR' ? 'ISR LÍQUIDO A PAGAR' : 'SALDO A FAVOR'}</span>
          <strong className={`${styles.bigAmount} ${data.status === 'PAGAR' ? styles.expense : styles.income}`}>
            {fmt(data.status === 'PAGAR' ? data.isrLiquido : data.saldoFavor)}
          </strong>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.row}><span>Utilidad Neta</span><strong>{fmt(data.utilidadNeta)}</strong></div>
        <div className={styles.row}><span>Reserva Legal (7%)</span><strong>{fmt(data.reservaLegal)}</strong></div>
      </div>
    </div>
  );
}
