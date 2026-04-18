'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useCompany } from '@/context/CompanyContext';
import styles from './fixed-assets.module.css';

const ACCOUNT_LABELS: Record<string, string> = {
  '1202': 'Edificios y Construcciones (5%)',
  '1203': 'Maquinaria y Equipo (20%)',
  '1204': 'Vehículos (25%)',
  '1205': 'Mobiliario y Equipo de Oficina (50%)',
  '1206': 'Equipo de Cómputo (50%)',
  '1207': 'Activos Intangibles (20%)',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(n);

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default function FixedAssetsPage() {
  const { activeCompanyId } = useCompany();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [depreciating, setDepreciating] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [form, setForm] = useState({
    name: '',
    accountCode: '1206',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseCost: '',
    residualValue: '0',
    notes: '',
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAssets = useCallback(async () => {
    if (!activeCompanyId) {
      setAssets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await fetch('/api/fixed-assets?status=ALL', {
      headers: { 'x-company-id': activeCompanyId, 'X-Requested-With': 'XMLHttpRequest' },
    });
    const data = await res.json();
    setAssets(data.assets ?? []);
    setLoading(false);
  }, [activeCompanyId]);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId) return;
    const res = await fetch('/api/fixed-assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-company-id': activeCompanyId, 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({
        ...form,
        purchaseCost: parseFloat(form.purchaseCost),
        residualValue: parseFloat(form.residualValue),
      }),
    });
    if (res.ok) {
      showToast('Activo fijo registrado correctamente');
      setShowModal(false);
      setForm({ name: '', accountCode: '1206', purchaseDate: new Date().toISOString().split('T')[0], purchaseCost: '', residualValue: '0', notes: '' });
      loadAssets();
    } else {
      const d = await res.json();
      showToast(d.error || 'Error al crear activo', 'error');
    }
  };

  const handleDepreciate = async (assetId: string) => {
    if (!activeCompanyId) return;
    setDepreciating(assetId);
    const res = await fetch(`/api/fixed-assets/${assetId}/depreciate`, {
      method: 'POST',
      headers: { 'x-company-id': activeCompanyId, 'X-Requested-With': 'XMLHttpRequest' },
    });
    const data = await res.json();
    if (res.ok) {
      showToast(`Depreciación registrada: ${fmt(data.depreciation.amount)}`);
      loadAssets();
    } else {
      showToast(data.error || 'Error al depreciar', 'error');
    }
    setDepreciating(null);
  };

  const totalCost = assets.reduce((s, a) => s + a.purchaseCost, 0);
  const totalDepr = assets.reduce((s, a) => s + a.accumulatedDepr, 0);
  const totalBook = assets.reduce((s, a) => s + a.bookValue, 0);

  return (
    <div className={styles.page}>
      {toast && (
        <div className={`${styles.toast} ${styles[toast.type]}`}>{toast.msg}</div>
      )}

      <PageHeader title="Activos Fijos" subtitle="Depreciación según Ley ISR El Salvador (Art. 30)">
        <button className={styles.btnPrimary} onClick={() => setShowModal(true)}>
          + Nuevo Activo
        </button>
      </PageHeader>

      {/* Summary */}
      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Costo Total</span>
          <span className={styles.statValue}>{fmt(totalCost)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Dep. Acumulada</span>
          <span className={`${styles.statValue} ${styles.expense}`}>{fmt(totalDepr)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Valor en Libros</span>
          <span className={`${styles.statValue} ${styles.income}`}>{fmt(totalBook)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Activos Registrados</span>
          <span className={styles.statValue}>{assets.length}</span>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p className={styles.loading}>Cargando...</p>
      ) : assets.length === 0 ? (
        <div className={styles.empty}>
          <p>No hay activos fijos registrados.</p>
          <button className={styles.btnPrimary} onClick={() => setShowModal(true)}>Registrar primer activo</button>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table>
            <thead>
              <tr>
                <th>Activo</th>
                <th>Tipo</th>
                <th>Fecha Compra</th>
                <th>Costo</th>
                <th>Dep. Acumulada</th>
                <th>Valor Libros</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {assets.map(asset => {
                const deprPct = asset.purchaseCost > 0 ? asset.accumulatedDepr / asset.purchaseCost : 0;
                return (
                  <tr key={asset.id}>
                    <td>
                      <strong>{asset.name}</strong>
                      {asset.notes && <div className={styles.notes}>{asset.notes}</div>}
                    </td>
                    <td className={styles.small}>{ACCOUNT_LABELS[asset.accountCode] ?? asset.accountCode}</td>
                    <td>{new Date(asset.purchaseDate).toLocaleDateString('es-SV')}</td>
                    <td>{fmt(asset.purchaseCost)}</td>
                    <td>
                      {fmt(asset.accumulatedDepr)}
                      <div className={styles.progress}>
                        <div className={styles.progressBar} style={{ width: `${Math.min(100, deprPct * 100)}%` }} />
                      </div>
                      <span className={styles.pct}>{fmtPct(deprPct)}</span>
                    </td>
                    <td className={asset.bookValue <= 0 ? styles.zero : ''}>{fmt(asset.bookValue)}</td>
                    <td>
                      <span className={`${styles.badge} ${asset.status === 'ACTIVE' ? styles.active : styles.inactive}`}>
                        {asset.status === 'ACTIVE' ? 'Activo' : asset.status === 'FULLY_DEPRECIATED' ? 'Depreciado' : asset.status}
                      </span>
                    </td>
                    <td>
                      {asset.status === 'ACTIVE' && asset.bookValue > 0 && (
                        <button
                          className={styles.btnDepr}
                          onClick={() => handleDepreciate(asset.id)}
                          disabled={depreciating === asset.id}
                        >
                          {depreciating === asset.id ? '...' : 'Depreciar Mes'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>Nuevo Activo Fijo</h3>
            <form onSubmit={handleCreate}>
              <div className={styles.field}>
                <label>Nombre del Activo *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Ej: Laptop Dell XPS 15" />
              </div>
              <div className={styles.field}>
                <label>Tipo de Activo *</label>
                <select value={form.accountCode} onChange={e => setForm({ ...form, accountCode: e.target.value })}>
                  {Object.entries(ACCOUNT_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Fecha de Compra *</label>
                  <input type="date" value={form.purchaseDate} onChange={e => setForm({ ...form, purchaseDate: e.target.value })} required />
                </div>
                <div className={styles.field}>
                  <label>Costo de Adquisición *</label>
                  <input type="number" step="0.01" min="0" value={form.purchaseCost} onChange={e => setForm({ ...form, purchaseCost: e.target.value })} required placeholder="0.00" />
                </div>
              </div>
              <div className={styles.field}>
                <label>Valor Residual</label>
                <input type="number" step="0.01" min="0" value={form.residualValue} onChange={e => setForm({ ...form, residualValue: e.target.value })} />
              </div>
              <div className={styles.field}>
                <label>Notas</label>
                <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Descripción adicional..." />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary}>Registrar Activo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
