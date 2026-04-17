'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { SV_CHART_OF_ACCOUNTS } from '@/lib/sv-chart-of-accounts';
import styles from './categories.module.css';

// Solo las cuentas más útiles para el selector (no depreciation)
const ACCOUNT_OPTIONS = SV_CHART_OF_ACCOUNTS.filter(a => !a.isDepreciation);

const INGRESO_ACCOUNTS = ACCOUNT_OPTIONS.filter(a => ['ACTIVO', 'INGRESO'].includes(a.type));
const EGRESO_ACCOUNTS  = ACCOUNT_OPTIONS.filter(a => ['ACTIVO', 'PASIVO', 'GASTO', 'COSTO'].includes(a.type));

interface Category {
  id: string;
  name: string;
  type: 'INGRESO' | 'EGRESO';
  color: string;
  icon: string;
  debitAccountCode?: string | null;
  creditAccountCode?: string | null;
}

const COLORS = ['#10b981','#3b82f6','#8b5cf6','#ef4444','#f59e0b','#ec4899','#06b6d4','#84cc16','#f97316','#6b7280'];

export default function CategoriesPage() {
  const { activeCompanyId } = useCompany();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [tab, setTab] = useState<'INGRESO' | 'EGRESO'>('INGRESO');
  const [saving, setSaving] = useState(false);

  // New category form
  const [newForm, setNewForm] = useState({
    name: '', type: 'INGRESO' as 'INGRESO' | 'EGRESO',
    color: '#10b981', icon: '📁',
    debitAccountCode: '', creditAccountCode: '',
  });

  const load = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    const res = await fetch('/api/categories', {
      headers: { 'x-company-id': activeCompanyId, 'X-Requested-With': 'XMLHttpRequest' },
    });
    const data = await res.json();
    setCategories(data.categories ?? []);
    setLoading(false);
  }, [activeCompanyId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-company-id': activeCompanyId!,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ ...newForm, type: tab }),
    });
    if (res.ok) {
      showToast('Categoría creada', 'success');
      setShowNew(false);
      setNewForm({ name: '', type: 'INGRESO', color: '#10b981', icon: '📁', debitAccountCode: '', creditAccountCode: '' });
      load();
    } else {
      showToast('Error al crear categoría', 'error');
    }
    setSaving(false);
  };

  const handleUpdate = async (cat: Category) => {
    setSaving(true);
    const res = await fetch(`/api/categories/${cat.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-company-id': activeCompanyId!,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        debitAccountCode: cat.debitAccountCode || null,
        creditAccountCode: cat.creditAccountCode || null,
      }),
    });
    if (res.ok) {
      showToast('Categoría actualizada — el auto-journal usará estas cuentas', 'success');
      setEditingId(null);
      load();
    } else {
      showToast('Error al actualizar', 'error');
    }
    setSaving(false);
  };

  const shown = categories.filter(c => c.type === tab);
  const accountOpts = tab === 'INGRESO' ? INGRESO_ACCOUNTS : EGRESO_ACCOUNTS;
  const allOpts = ACCOUNT_OPTIONS;

  return (
    <div className={styles.page}>
      <PageHeader title="Categorías" subtitle="Mapeo contable: cada categoría genera asientos automáticos">
        <button className={styles.btnPrimary} onClick={() => setShowNew(true)} disabled={!activeCompanyId}>
          + Nueva Categoría
        </button>
      </PageHeader>

      <div className={styles.infoBox}>
        💡 <strong>Cómo funciona:</strong> Asigna una cuenta débito y una cuenta crédito a cada categoría.
        Al registrar una transacción, el sistema genera el asiento contable automáticamente usando esas cuentas del catálogo SV.
      </div>

      <div className={styles.tabs}>
        <button className={tab === 'INGRESO' ? styles.tabActive : styles.tab} onClick={() => setTab('INGRESO')}>
          Ingresos ({categories.filter(c => c.type === 'INGRESO').length})
        </button>
        <button className={tab === 'EGRESO' ? styles.tabActive : styles.tab} onClick={() => setTab('EGRESO')}>
          Egresos ({categories.filter(c => c.type === 'EGRESO').length})
        </button>
      </div>

      {loading ? (
        <p className={styles.loading}>Cargando...</p>
      ) : (
        <div className={styles.grid}>
          {shown.map(cat => {
            const isEditing = editingId === cat.id;
            return (
              <div key={cat.id} className={`${styles.card} ${isEditing ? styles.editing : ''}`}>
                {isEditing ? (
                  <EditRow
                    cat={cat}
                    allOpts={allOpts}
                    saving={saving}
                    onSave={handleUpdate}
                    onCancel={() => setEditingId(null)}
                    onChange={updated => setCategories(prev => prev.map(c => c.id === cat.id ? updated : c))}
                  />
                ) : (
                  <ViewRow cat={cat} onEdit={() => setEditingId(cat.id)} />
                )}
              </div>
            );
          })}
          {shown.length === 0 && (
            <p className={styles.empty}>No hay categorías de tipo {tab}.</p>
          )}
        </div>
      )}

      {/* New category modal */}
      {showNew && (
        <div className={styles.overlay} onClick={() => setShowNew(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>Nueva Categoría de {tab === 'INGRESO' ? 'Ingreso' : 'Egreso'}</h3>
            <form onSubmit={handleCreate}>
              <div className={styles.field}>
                <label>Nombre *</label>
                <input value={newForm.name} onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))} required placeholder="Ej: Ventas Online" />
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Ícono</label>
                  <input value={newForm.icon} onChange={e => setNewForm(p => ({ ...p, icon: e.target.value }))} placeholder="📁" />
                </div>
                <div className={styles.field}>
                  <label>Color</label>
                  <div className={styles.colorRow}>
                    {COLORS.map(c => (
                      <button key={c} type="button" className={`${styles.swatch} ${newForm.color === c ? styles.swatchActive : ''}`}
                        style={{ background: c }} onClick={() => setNewForm(p => ({ ...p, color: c }))} />
                    ))}
                  </div>
                </div>
              </div>
              <div className={styles.accountSection}>
                <h4>Mapeo Contable (para asientos automáticos)</h4>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label>Cuenta Débito</label>
                    <select value={newForm.debitAccountCode} onChange={e => setNewForm(p => ({ ...p, debitAccountCode: e.target.value }))}>
                      <option value="">Sin mapeo</option>
                      {allOpts.map(a => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>Cuenta Crédito</label>
                    <select value={newForm.creditAccountCode} onChange={e => setNewForm(p => ({ ...p, creditAccountCode: e.target.value }))}>
                      <option value="">Sin mapeo</option>
                      {allOpts.map(a => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowNew(false)}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? 'Guardando...' : 'Crear Categoría'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ViewRow({ cat, onEdit }: { cat: Category; onEdit: () => void }) {
  const debit = cat.debitAccountCode
    ? SV_CHART_OF_ACCOUNTS.find(a => a.code === cat.debitAccountCode)
    : null;
  const credit = cat.creditAccountCode
    ? SV_CHART_OF_ACCOUNTS.find(a => a.code === cat.creditAccountCode)
    : null;
  const hasMapping = debit && credit;

  return (
    <div className={styles.viewRow}>
      <div className={styles.catIcon} style={{ background: `${cat.color}22`, color: cat.color }}>
        {cat.icon}
      </div>
      <div className={styles.catInfo}>
        <strong>{cat.name}</strong>
        {cat.name === 'Intereses Bancarios' && (
          <div style={{ fontSize: '0.75rem', color: '#0369a1', background: '#e0f2fe', borderRadius: '6px', padding: '0.3rem 0.6rem', marginTop: '0.25rem', lineHeight: 1.4 }}>
            ℹ Solo registra el interés devengado del período. El abono a capital reduce el préstamo en el módulo de Préstamos — no es gasto.
          </div>
        )}
        {cat.name === 'Comisiones Bancarias' && (
          <div style={{ fontSize: '0.75rem', color: '#7c3aed', background: '#f3e8ff', borderRadius: '6px', padding: '0.3rem 0.6rem', marginTop: '0.25rem', lineHeight: 1.4 }}>
            ℹ Comisiones por mantenimiento de cuenta, transferencias y otros cargos del banco. No confundir con intereses.
          </div>
        )}
        {hasMapping ? (
          <div className={styles.mapping}>
            <span className={styles.debitTag}>DB {cat.debitAccountCode}</span>
            <span className={styles.arrow}>→</span>
            <span className={styles.creditTag}>CR {cat.creditAccountCode}</span>
            <span className={styles.mappingDesc}>{debit?.name} / {credit?.name}</span>
          </div>
        ) : (
          <div className={styles.noMapping}>⚠ Sin mapeo contable — asiento usará cuentas por defecto</div>
        )}
      </div>
      <button className={styles.editBtn} onClick={onEdit}>Editar</button>
    </div>
  );
}

function EditRow({ cat, allOpts, saving, onSave, onCancel, onChange }: {
  cat: Category; allOpts: typeof ACCOUNT_OPTIONS; saving: boolean;
  onSave: (cat: Category) => void; onCancel: () => void;
  onChange: (cat: Category) => void;
}) {
  return (
    <div className={styles.editRow}>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label>Nombre</label>
          <input value={cat.name} onChange={e => onChange({ ...cat, name: e.target.value })} />
        </div>
        <div className={styles.field}>
          <label>Ícono</label>
          <input value={cat.icon} onChange={e => onChange({ ...cat, icon: e.target.value })} style={{ width: 60 }} />
        </div>
      </div>
      <div className={styles.accountSection}>
        <h4>Mapeo Contable</h4>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label>Cuenta Débito (se debita)</label>
            <select value={cat.debitAccountCode ?? ''} onChange={e => onChange({ ...cat, debitAccountCode: e.target.value || null })}>
              <option value="">Sin mapeo</option>
              {allOpts.map(a => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Cuenta Crédito (se acredita)</label>
            <select value={cat.creditAccountCode ?? ''} onChange={e => onChange({ ...cat, creditAccountCode: e.target.value || null })}>
              <option value="">Sin mapeo</option>
              {allOpts.map(a => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className={styles.editActions}>
        <button className={styles.btnSecondary} onClick={onCancel}>Cancelar</button>
        <button className={styles.btnPrimary} onClick={() => onSave(cat)} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar Mapeo'}
        </button>
      </div>
    </div>
  );
}
