'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useFilter } from '@/context/FilterContext';
import { useCompany } from '@/context/CompanyContext';
import styles from './financial-metrics.module.css';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(n ?? 0);
const fmtPct = (n: number) => `${((n ?? 0) * 100).toFixed(1)}%`;
const fmtRatio = (n: number) => (n ?? 0).toFixed(2);
const fmtDays = (n: number) => `${Math.round(n ?? 0)} días`;

function MetricCard({ label, value, sub, status }: {
  label: string; value: string; sub?: string; status?: 'good' | 'warn' | 'bad' | 'neutral';
}) {
  return (
    <div className={`${styles.metricCard} ${status ? styles[status] : ''}`}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>{value}</span>
      {sub && <span className={styles.metricSub}>{sub}</span>}
    </div>
  );
}

function ratingCurrentRatio(v: number): 'good' | 'warn' | 'bad' {
  if (v >= 2) return 'good';
  if (v >= 1) return 'warn';
  return 'bad';
}
function ratingDebtEquity(v: number): 'good' | 'warn' | 'bad' {
  if (v <= 1) return 'good';
  if (v <= 2) return 'warn';
  return 'bad';
}
function ratingMargin(v: number): 'good' | 'warn' | 'bad' {
  if (v >= 0.15) return 'good';
  if (v >= 0.05) return 'warn';
  return 'bad';
}

export default function FinancialMetricsPage() {
  const { startDate, endDate } = useFilter();
  const { activeCompanyId } = useCompany();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeCompanyId) {
      setMetrics(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/financial-metrics?startDate=${startDate}&endDate=${endDate}`, {
      headers: { 'x-company-id': activeCompanyId, 'X-Requested-With': 'XMLHttpRequest' },
    });
    const data = await res.json();
    setMetrics(data.metrics);
    setLoading(false);
  }, [startDate, endDate, activeCompanyId]);

  useEffect(() => { load(); }, [load]);

  const m = metrics ?? {};

  return (
    <div className={styles.page}>
      <PageHeader title="Métricas Financieras" subtitle="EBITDA · Liquidez · Endeudamiento · Impuestos SV" />

      {loading ? (
        <p className={styles.loading}>Calculando métricas...</p>
      ) : (
        <>
          {/* KPIs principales */}
          <div className={styles.heroGrid}>
            <div className={styles.heroCard}>
              <span className={styles.heroLabel}>Ingresos</span>
              <span className={styles.heroValue}>{fmt(m.revenue)}</span>
            </div>
            <div className={styles.heroCard}>
              <span className={styles.heroLabel}>EBITDA</span>
              <span className={`${styles.heroValue} ${m.ebitda >= 0 ? styles.positive : styles.negative}`}>{fmt(m.ebitda)}</span>
              <span className={styles.heroSub}>{fmtPct(m.ebitdaMargin)} del ingreso</span>
            </div>
            <div className={styles.heroCard}>
              <span className={styles.heroLabel}>Utilidad Neta</span>
              <span className={`${styles.heroValue} ${m.netIncome >= 0 ? styles.positive : styles.negative}`}>{fmt(m.netIncome)}</span>
              <span className={styles.heroSub}>{fmtPct(m.netMargin)} margen neto</span>
            </div>
            <div className={styles.heroCard}>
              <span className={styles.heroLabel}>Utilidad Bruta</span>
              <span className={styles.heroValue}>{fmt(m.grossProfit)}</span>
              <span className={styles.heroSub}>{fmtPct(m.grossMargin)} margen bruto</span>
            </div>
          </div>

          {/* Rentabilidad */}
          <h3 className={styles.sectionTitle}>Rentabilidad</h3>
          <div className={styles.metricsGrid}>
            <MetricCard label="EBITDA" value={fmt(m.ebitda)} sub={fmtPct(m.ebitdaMargin)} status={ratingMargin(m.ebitdaMargin)} />
            <MetricCard label="EBIT (Utilidad Operativa)" value={fmt(m.ebit)} status={m.ebit >= 0 ? 'good' : 'bad'} />
            <MetricCard label="Margen Bruto" value={fmtPct(m.grossMargin)} status={ratingMargin(m.grossMargin)} />
            <MetricCard label="Margen Neto" value={fmtPct(m.netMargin)} status={ratingMargin(m.netMargin)} />
          </div>

          {/* Liquidez */}
          <h3 className={styles.sectionTitle}>Liquidez</h3>
          <div className={styles.metricsGrid}>
            <MetricCard label="Razón Corriente" value={fmtRatio(m.currentRatio)} sub="Ideal ≥ 2.0" status={ratingCurrentRatio(m.currentRatio)} />
            <MetricCard label="Prueba Ácida" value={fmtRatio(m.quickRatio)} sub="Ideal ≥ 1.0" status={m.quickRatio >= 1 ? 'good' : m.quickRatio >= 0.5 ? 'warn' : 'bad'} />
            <MetricCard label="Razón de Efectivo" value={fmtRatio(m.cashRatio)} sub="Ideal ≥ 0.5" status={m.cashRatio >= 0.5 ? 'good' : m.cashRatio >= 0.2 ? 'warn' : 'bad'} />
          </div>

          {/* Endeudamiento */}
          <h3 className={styles.sectionTitle}>Endeudamiento</h3>
          <div className={styles.metricsGrid}>
            <MetricCard label="Deuda / Patrimonio" value={fmtRatio(m.debtToEquity)} sub="Ideal ≤ 1.0" status={ratingDebtEquity(m.debtToEquity)} />
            <MetricCard label="Deuda / Activos" value={fmtPct(m.debtToAssets)} sub="Ideal ≤ 50%" status={m.debtToAssets <= 0.5 ? 'good' : m.debtToAssets <= 0.7 ? 'warn' : 'bad'} />
            <MetricCard label="Cobertura Intereses" value={fmtRatio(m.coverageRatio)} sub="Ideal ≥ 3.0" status={m.coverageRatio >= 3 ? 'good' : m.coverageRatio >= 1.5 ? 'warn' : 'bad'} />
          </div>

          {/* Actividad */}
          <h3 className={styles.sectionTitle}>Actividad</h3>
          <div className={styles.metricsGrid}>
            <MetricCard label="Días CxC (Cobro)" value={fmtDays(m.daysReceivable)} sub="Menor es mejor" status={m.daysReceivable <= 30 ? 'good' : m.daysReceivable <= 60 ? 'warn' : 'bad'} />
            <MetricCard label="Días CxP (Pago)" value={fmtDays(m.daysPayable)} sub="Mayor puede ser mejor" status="neutral" />
          </div>

          {/* Impuestos SV */}
          <h3 className={styles.sectionTitle}>Impuestos El Salvador</h3>
          <div className={styles.metricsGrid}>
            <MetricCard label="IVA Débito Fiscal (13%)" value={fmt(m.ivaDebitoEstimado)} status="neutral" />
            <MetricCard label="IVA Crédito Fiscal" value={fmt(m.ivaCreditoEstimado)} status="neutral" />
            <MetricCard label="IVA Balance Neto (F-07)" value={fmt(m.ivaBalance)} sub={m.ivaBalance >= 0 ? 'A pagar' : 'Remanente'} status={m.ivaBalance >= 0 ? 'warn' : 'good'} />
            <MetricCard label="Pago a Cuenta (1.75%) F-14" value={fmt(m.pagoACuenta)} status="neutral" />
            <MetricCard label="ISR Estimado (F-11)" value={fmt(m.isrEstimado)} status="neutral" />
            <MetricCard label="Reserva Legal (7%)" value={fmt(m.reservaLegal)} sub="Código de Comercio Art. 123" status="neutral" />
          </div>
        </>
      )}
    </div>
  );
}
