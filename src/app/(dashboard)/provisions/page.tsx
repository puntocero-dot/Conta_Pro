'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { PlusIcon, WalletIcon } from '@/components/icons';
import { formatCurrency } from '@/lib/formatting';
import { calcMonthlyProvisions } from '@/lib/sv-payroll';
import styles from './provisions.module.css';

const PROVISION_TYPES = [
    { value: 'VACATION', label: 'Vacaciones', desc: '15 días + 30% recargo', color: '#10b981' },
    { value: 'AGUINALDO', label: 'Aguinaldo', desc: '10–18 días según antigüedad', color: '#6366f1' },
    { value: 'INDEMNIZACION', label: 'Indemnización', desc: '15 días por año de servicio', color: '#f59e0b' },
    { value: 'BONO_SEMESTRAL', label: 'Bono Semestral', desc: 'Beneficio adicional empresa', color: '#3b82f6' },
    { value: 'OTHER', label: 'Otras', desc: 'Otras previsiones laborales', color: '#6b7280' },
];

interface ProvisionSummary {
    type: string;
    label: string;
    totalAccrued: number;
    totalPaid: number;
    count: number;
}

interface Provision {
    id: string;
    type: string;
    description: string;
    year: number;
    month: number;
    accruedAmount: number;
    paidAmount: number;
}

export default function ProvisionsPage() {
    const { activeCompanyId, isLoading: companyLoading } = useCompany();
    const { showToast } = useToast();
    const [summary, setSummary] = useState<ProvisionSummary[]>([]);
    const [provisions, setProvisions] = useState<Provision[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    const [year, setYear] = useState(new Date().getFullYear());
    const [showCalc, setShowCalc] = useState(false);

    const fetch_ = useCallback(async () => {
        if (!activeCompanyId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/provisions?year=${year}`, {
                headers: { 'x-company-id': activeCompanyId, 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (res.ok) {
                const d = await res.json();
                setProvisions(d.provisions || []);
                setSummary(d.summary || []);
            }
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [activeCompanyId, year]);

    useEffect(() => {
        if (activeCompanyId) fetch_();
        else { setProvisions([]); setSummary([]); setLoading(false); }
    }, [activeCompanyId, year, fetch_]);

    const totalAccrued = summary.reduce((s, p) => s + p.totalAccrued, 0);
    const totalPaid = summary.reduce((s, p) => s + p.totalPaid, 0);
    const pendingPay = totalAccrued - totalPaid;

    if (companyLoading || (loading && !provisions.length && activeCompanyId)) {
        return (
            <div>
                <PageHeader title="Previsiones Laborales" subtitle="Vacaciones, aguinaldo e indemnizaciones — Código de Trabajo El Salvador" />
                <div className={styles.loading}><div className={styles.spinner} /></div>
            </div>
        );
    }

    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    return (
        <div>
            <PageHeader
                title="Previsiones Laborales"
                subtitle="Provisiones de vacaciones, aguinaldo e indemnizaciones según Código de Trabajo"
            >
                <button onClick={() => setShowCalc(true)} className="btn btn-secondary">Calculadora</button>
                <button onClick={() => setShowNewModal(true)} className="btn btn-primary" disabled={!activeCompanyId}>
                    <PlusIcon size={16} /> Nueva Previsión
                </button>
            </PageHeader>

            {!activeCompanyId ? (
                <EmptyState icon="🏢" title="Sin empresa seleccionada" description="Selecciona una empresa para gestionar sus previsiones." />
            ) : (
                <>
                    <div className={styles.statsGrid}>
                        <StatCard label="Total Provisionado" value={formatCurrency(totalAccrued)} icon={<WalletIcon size={16} />} variant="neutral" />
                        <StatCard label="Total Pagado" value={formatCurrency(totalPaid)} icon={<WalletIcon size={16} />} variant="income" />
                        <StatCard label="Pendiente de Pago" value={formatCurrency(pendingPay)} icon={<WalletIcon size={16} />} variant={pendingPay > 0 ? 'expense' : 'income'} />
                    </div>

                    {/* Year selector */}
                    <div className={styles.yearRow}>
                        <span className={styles.yearLabel}>Año:</span>
                        {[year - 1, year, year + 1].map(y => (
                            <button key={y} onClick={() => setYear(y)} className={`btn ${y === year ? 'btn-primary' : 'btn-secondary'}`} style={{ minWidth: 56 }}>
                                {y}
                            </button>
                        ))}
                    </div>

                    {provisions.length === 0 ? (
                        <EmptyState
                            icon="📅"
                            title="Sin previsiones registradas"
                            description="Registra las previsiones mensuales de vacaciones, aguinaldo e indemnización para cada empleado."
                            actionLabel="Registrar Previsión"
                            onAction={() => setShowNewModal(true)}
                        />
                    ) : (
                        <>
                            {/* Summary by type */}
                            {summary.length > 0 && (
                                <div className={styles.summaryGrid}>
                                    {summary.map(s => {
                                        const typeInfo = PROVISION_TYPES.find(t => t.value === s.type);
                                        const pending = s.totalAccrued - s.totalPaid;
                                        return (
                                            <div key={s.type} className={styles.summaryCard}>
                                                <div className={styles.summaryDot} style={{ background: typeInfo?.color }} />
                                                <div>
                                                    <h4>{s.label}</h4>
                                                    <p className={styles.summaryDesc}>Provisionado: {formatCurrency(s.totalAccrued)}</p>
                                                    {pending > 0 && <p className={styles.summaryPending}>Pendiente: {formatCurrency(pending)}</p>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Detail list */}
                            <div className={styles.provisionList}>
                                <h3 className={styles.listTitle}>Registro Mensual</h3>
                                {provisions.map(p => {
                                    const typeInfo = PROVISION_TYPES.find(t => t.value === p.type);
                                    const pending = p.accruedAmount - p.paidAmount;
                                    return (
                                        <div key={p.id} className={styles.provisionRow}>
                                            <div className={styles.rowDot} style={{ background: typeInfo?.color || '#6b7280' }} />
                                            <div className={styles.rowInfo}>
                                                <span className={styles.rowTitle}>{typeInfo?.label || p.type}</span>
                                                <span className={styles.rowDesc}>{p.description} · {months[p.month - 1]} {p.year}</span>
                                            </div>
                                            <div className={styles.rowAmounts}>
                                                <span className={styles.accrued}>{formatCurrency(p.accruedAmount)}</span>
                                                {pending > 0 ? (
                                                    <span className={styles.pending}>-{formatCurrency(pending)} pendiente</span>
                                                ) : (
                                                    <span className={styles.paid}>✓ Pagado</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </>
            )}

            {showNewModal && activeCompanyId && (
                <NewProvisionModal
                    companyId={activeCompanyId}
                    onClose={() => setShowNewModal(false)}
                    onSuccess={() => { setShowNewModal(false); fetch_(); showToast('Previsión registrada', 'success'); }}
                    onError={(msg) => showToast(msg, 'error')}
                />
            )}

            {showCalc && (
                <ProvisionCalculatorModal onClose={() => setShowCalc(false)} />
            )}
        </div>
    );
}

// ── New Provision Modal ────────────────────────────────────────────────────────

function NewProvisionModal({ companyId, onClose, onSuccess, onError }: {
    companyId: string; onClose: () => void; onSuccess: () => void; onError: (m: string) => void;
}) {
    const now = new Date();
    const [form, setForm] = useState({
        type: 'VACATION',
        description: '',
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        accruedAmount: '',
        notes: '',
        createTransaction: true,
    });
    const [submitting, setSubmitting] = useState(false);
    const up = (field: string, value: any) => setForm(p => ({ ...p, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/provisions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-company-id': companyId, 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify(form),
            });
            if (res.ok) onSuccess();
            else { const d = await res.json().catch(() => ({})); onError(d.error || 'Error'); }
        } catch { onError('Error de conexión'); }
        finally { setSubmitting(false); }
    };

    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    return (
        <Modal isOpen onClose={onClose} title="Nueva Previsión" size="md">
            <form onSubmit={handleSubmit}>
                <div className="form-group"><label className="label">Tipo de Previsión</label>
                    <select className="input" value={form.type} onChange={e => up('type', e.target.value)} required>
                        {PROVISION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>)}
                    </select>
                </div>
                <div className="form-group"><label className="label">Descripción (ej: Nombre empleado / concepto)</label>
                    <input type="text" className="input" value={form.description} onChange={e => up('description', e.target.value)} placeholder="Planilla general / Juan Pérez" required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="form-group"><label className="label">Año</label>
                        <input type="number" className="input" value={form.year} onChange={e => up('year', parseInt(e.target.value))} min="2020" max="2040" required />
                    </div>
                    <div className="form-group"><label className="label">Mes</label>
                        <select className="input" value={form.month} onChange={e => up('month', parseInt(e.target.value))} required>
                            {months.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                        </select>
                    </div>
                    <div className="form-group"><label className="label">Monto ($)</label>
                        <input type="number" className="input" step="0.01" min="0.01" value={form.accruedAmount} onChange={e => up('accruedAmount', e.target.value)} required />
                    </div>
                </div>
                <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                        <input type="checkbox" checked={form.createTransaction} onChange={e => up('createTransaction', e.target.checked)} />
                        Registrar como gasto devengado en transacciones
                    </label>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 1.5rem' }}>
                        Esto registra el gasto contable pero no mueve caja hasta el pago real.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                    <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 2 }}>
                        {submitting ? 'Guardando...' : 'Registrar Previsión'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// ── Provision Calculator ───────────────────────────────────────────────────────

function ProvisionCalculatorModal({ onClose }: { onClose: () => void }) {
    const [salary, setSalary] = useState('');
    const [years, setYears] = useState('0');
    const result = salary ? calcMonthlyProvisions(parseFloat(salary), parseInt(years)) : null;

    return (
        <Modal isOpen onClose={onClose} title="Calculadora de Previsiones" size="sm">
            <div className="form-group">
                <label className="label">Salario mensual ($)</label>
                <input type="number" className="input" value={salary} onChange={e => setSalary(e.target.value)} placeholder="600.00" step="0.01" />
            </div>
            <div className="form-group">
                <label className="label">Años de servicio (para aguinaldo)</label>
                <input type="number" className="input" value={years} onChange={e => setYears(e.target.value)} min="0" max="50" />
            </div>

            {result && (
                <div className={styles.calcResult}>
                    <h4>Provisión mensual estimada</h4>
                    <div className={styles.calcRow}>
                        <span>🏖 Vacaciones (15d +30%)</span>
                        <strong>{formatCurrency(result.vacation)}</strong>
                    </div>
                    <div className={styles.calcRow}>
                        <span>🎄 Aguinaldo ({parseInt(years) >= 10 ? '18' : parseInt(years) >= 3 ? '15' : '10'} días)</span>
                        <strong>{formatCurrency(result.aguinaldo)}</strong>
                    </div>
                    <div className={styles.calcRow}>
                        <span>📄 Indemnización (15d/año)</span>
                        <strong>{formatCurrency(result.indemnizacion)}</strong>
                    </div>
                    <div className={`${styles.calcRow} ${styles.calcTotal}`}>
                        <span>Total mensual a provisionar</span>
                        <strong>{formatCurrency(result.vacation + result.aguinaldo + result.indemnizacion)}</strong>
                    </div>
                    <p className={styles.calcNote}>Estos montos se devengan cada mes pero se pagan en las fechas establecidas por el Código de Trabajo.</p>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button onClick={onClose} className="btn btn-secondary">Cerrar</button>
            </div>
        </Modal>
    );
}
