'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useCompany } from '@/context/CompanyContext';
import styles from './receivables.module.css';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(n);

const BUCKETS = [
  { key: 'current', label: 'Al Corriente', colorClass: 'green' },
  { key: 'days30',  label: '1–30 días',   colorClass: 'yellow' },
  { key: 'days60',  label: '31–60 días',  colorClass: 'orange' },
  { key: 'days90',  label: '61–90 días',  colorClass: 'red' },
  { key: 'over90',  label: '+90 días',    colorClass: 'darkred' },
];

function AgingTable({ data, totals, nameField }: { data: any; totals: any; nameField: string }) {
  const allTx = BUCKETS.flatMap(b => (data[b.key] ?? []).map((t: any) => ({ ...t, bucket: b })));
  if (allTx.length === 0) return <p className={styles.empty}>Sin registros pendientes.</p>;

  return (
    <div className={styles.tableWrapper}>
      <div className={styles.agingTotals}>
        {BUCKETS.map(b => (
          <div key={b.key} className={`${styles.agingCol} ${styles[b.colorClass]}`}>
            <span className={styles.agingLabel}>{b.label}</span>
            <span className={styles.agingAmount}>{fmt(totals[b.key] ?? 0)}</span>
          </div>
        ))}
        <div className={`${styles.agingCol} ${styles.total}`}>
          <span className={styles.agingLabel}>Total Pendiente</span>
          <span className={styles.agingAmount}>{fmt(totals.total ?? 0)}</span>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>{nameField === 'clientName' ? 'Cliente' : 'Proveedor'}</th>
            <th>Descripción</th>
            <th>Monto</th>
            <th>Fecha</th>
            <th>Vencimiento</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {allTx.map((tx: any) => (
            <tr key={tx.id}>
              <td><strong>{tx[nameField] ?? '—'}</strong></td>
              <td>{tx.description}</td>
              <td>{fmt(tx.amount)}</td>
              <td>{tx.date ? new Date(tx.date).toLocaleDateString('es-SV') : '—'}</td>
              <td>{tx.dueDate ? new Date(tx.dueDate).toLocaleDateString('es-SV') : '—'}</td>
              <td>
                <span className={`${styles.badge} ${styles[tx.bucket.colorClass]}`}>
                  {tx.bucket.label}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReceivablesPage() {
  const { activeCompanyId } = useCompany();
  const [tab, setTab] = useState<'cobrar' | 'pagar'>('cobrar');
  const [cxcData, setCxcData] = useState<any>(null);
  const [cxpData, setCxpData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeCompanyId) {
      setCxcData(null);
      setCxpData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const headers = { 'x-company-id': activeCompanyId, 'X-Requested-With': 'XMLHttpRequest' };
    Promise.all([
      fetch('/api/receivables', { headers }).then(r => r.json()),
      fetch('/api/payables', { headers }).then(r => r.json()),
    ]).then(([cxc, cxp]) => {
      setCxcData(cxc);
      setCxpData(cxp);
      setLoading(false);
    });
  }, [activeCompanyId]);

  return (
    <div className={styles.page}>
      <PageHeader title="Cuentas por Cobrar y Pagar" subtitle="Aging 30 / 60 / 90 días" />

      <div className={styles.tabs}>
        <button className={tab === 'cobrar' ? styles.tabActive : styles.tab} onClick={() => setTab('cobrar')}>
          Cuentas por Cobrar
        </button>
        <button className={tab === 'pagar' ? styles.tabActive : styles.tab} onClick={() => setTab('pagar')}>
          Cuentas por Pagar
        </button>
      </div>

      {loading ? (
        <p className={styles.loading}>Cargando...</p>
      ) : tab === 'cobrar' ? (
        <AgingTable data={cxcData?.aging ?? {}} totals={cxcData?.totals ?? {}} nameField="clientName" />
      ) : (
        <AgingTable data={cxpData?.aging ?? {}} totals={cxpData?.totals ?? {}} nameField="supplierName" />
      )}
    </div>
  );
}
