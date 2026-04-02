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
import { calcAmortization } from '@/lib/sv-payroll';
import styles from './loans.module.css';

interface Loan {
    id: string;
    bankName: string;
    description?: string;
    originalAmount: number;
    balance: number;
    interestRate: number;
    termMonths: number;
    startDate: string;
    status: 'ACTIVE' | 'CLOSED';
    _count?: { payments: number };
}

export default function LoansPage() {
    const { activeCompanyId, isLoading: companyLoading } = useCompany();
    const { showToast } = useToast();
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

    const fetchLoans = useCallback(async () => {
        if (!activeCompanyId) return;
        setLoading(true);
        try {
            const res = await fetch('/api/loans', {
                headers: { 'x-company-id': activeCompanyId, 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (res.ok) { const d = await res.json(); setLoans(d.loans || []); }
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [activeCompanyId]);

    useEffect(() => {
        if (activeCompanyId) fetchLoans();
        else { setLoans([]); setLoading(false); }
    }, [activeCompanyId, fetchLoans]);

    const totalDebt = loans.filter(l => l.status === 'ACTIVE').reduce((s, l) => s + l.balance, 0);
    const totalOriginal = loans.reduce((s, l) => s + l.originalAmount, 0);

    if (companyLoading || (loading && !loans.length && activeCompanyId)) {
        return (
            <div>
                <PageHeader title="Préstamos" subtitle="Control de deuda bancaria y amortización" />
                <div className={styles.loading}><div className={styles.spinner} /></div>
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title="Préstamos"
                subtitle="Seguimiento de deuda bancaria con separación capital vs intereses"
            >
                <button onClick={() => setShowNewModal(true)} className="btn btn-primary" disabled={!activeCompanyId}>
                    <PlusIcon size={16} /> Nuevo Préstamo
                </button>
            </PageHeader>

            {!activeCompanyId ? (
                <EmptyState icon="🏢" title="Sin empresa seleccionada" description="Selecciona una empresa para gestionar sus préstamos." />
            ) : (
                <>
                    <div className={styles.statsGrid}>
                        <StatCard label="Deuda Total Vigente" value={formatCurrency(totalDebt)} icon={<WalletIcon size={16} />} variant="expense" />
                        <StatCard label="Capital Original" value={formatCurrency(totalOriginal)} icon={<WalletIcon size={16} />} variant="neutral" />
                        <StatCard label="Préstamos Activos" value={loans.filter(l => l.status === 'ACTIVE').length} variant="default" />
                    </div>

                    {loans.length === 0 ? (
                        <EmptyState
                            icon="🏦"
                            title="Sin préstamos registrados"
                            description="Registra tus préstamos bancarios para controlar capital e intereses automáticamente."
                            actionLabel="Nuevo Préstamo"
                            onAction={() => setShowNewModal(true)}
                        />
                    ) : (
                        <div className={styles.loanList}>
                            {loans.map(loan => {
                                const progress = loan.originalAmount > 0
                                    ? ((loan.originalAmount - loan.balance) / loan.originalAmount) * 100
                                    : 0;
                                return (
                                    <div key={loan.id} className={`${styles.loanCard} ${loan.status === 'CLOSED' ? styles.closed : ''}`}>
                                        <div className={styles.loanHeader}>
                                            <div>
                                                <h3>{loan.bankName}</h3>
                                                {loan.description && <p className={styles.loanDesc}>{loan.description}</p>}
                                            </div>
                                            <span className={`${styles.statusBadge} ${loan.status === 'ACTIVE' ? styles.active : styles.closedBadge}`}>
                                                {loan.status === 'ACTIVE' ? 'Vigente' : 'Cancelado'}
                                            </span>
                                        </div>

                                        <div className={styles.loanAmounts}>
                                            <div>
                                                <span className={styles.amtLabel}>Saldo actual</span>
                                                <span className={styles.amtValue + ' ' + styles.red}>{formatCurrency(loan.balance)}</span>
                                            </div>
                                            <div>
                                                <span className={styles.amtLabel}>Capital original</span>
                                                <span className={styles.amtValue}>{formatCurrency(loan.originalAmount)}</span>
                                            </div>
                                            <div>
                                                <span className={styles.amtLabel}>Tasa anual</span>
                                                <span className={styles.amtValue}>{loan.interestRate}%</span>
                                            </div>
                                            <div>
                                                <span className={styles.amtLabel}>Plazo</span>
                                                <span className={styles.amtValue}>{loan.termMonths} meses</span>
                                            </div>
                                        </div>

                                        <div className={styles.progressBar}>
                                            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                                        </div>
                                        <p className={styles.progressLabel}>{progress.toFixed(1)}% pagado</p>

                                        <div className={styles.loanActions}>
                                            <button onClick={() => setSelectedLoan(loan)} className="btn btn-secondary">
                                                Ver Amortización
                                            </button>
                                            {loan.status === 'ACTIVE' && (
                                                <PaymentButton loan={loan} companyId={activeCompanyId!} onSuccess={() => { fetchLoans(); showToast('Pago registrado', 'success'); }} onError={(msg) => showToast(msg, 'error')} />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {showNewModal && activeCompanyId && (
                <NewLoanModal
                    companyId={activeCompanyId}
                    onClose={() => setShowNewModal(false)}
                    onSuccess={() => { setShowNewModal(false); fetchLoans(); showToast('Préstamo registrado', 'success'); }}
                    onError={(msg) => showToast(msg, 'error')}
                />
            )}

            {selectedLoan && (
                <AmortizationModal
                    loan={selectedLoan}
                    companyId={activeCompanyId!}
                    onClose={() => setSelectedLoan(null)}
                />
            )}
        </div>
    );
}

// ── New Loan Modal ─────────────────────────────────────────────────────────────

function NewLoanModal({ companyId, onClose, onSuccess, onError }: {
    companyId: string; onClose: () => void; onSuccess: () => void; onError: (m: string) => void;
}) {
    const [form, setForm] = useState({ bankName: '', description: '', originalAmount: '', interestRate: '', termMonths: '', startDate: new Date().toISOString().split('T')[0] });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/loans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-company-id': companyId, 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify(form),
            });
            if (res.ok) onSuccess();
            else { const d = await res.json().catch(() => ({})); onError(d.error || 'Error'); }
        } catch { onError('Error de conexión'); }
        finally { setSubmitting(false); }
    };

    const up = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }));
    const monthlyPayment = form.originalAmount && form.interestRate && form.termMonths
        ? calcAmortization(parseFloat(form.originalAmount), parseFloat(form.interestRate), parseInt(form.termMonths))[0]?.payment
        : null;

    return (
        <Modal isOpen onClose={onClose} title="Nuevo Préstamo" size="md">
            <form onSubmit={handleSubmit}>
                <div className="form-group"><label className="label">Banco / Institución</label>
                    <input type="text" className="input" value={form.bankName} onChange={e => up('bankName', e.target.value)} placeholder="Banco Agrícola, DAVIVIENDA..." required />
                </div>
                <div className="form-group"><label className="label">Descripción</label>
                    <input type="text" className="input" value={form.description} onChange={e => up('description', e.target.value)} placeholder="Capital de trabajo, vehículo..." />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group"><label className="label">Monto original ($)</label>
                        <input type="number" className="input" step="0.01" min="1" value={form.originalAmount} onChange={e => up('originalAmount', e.target.value)} required />
                    </div>
                    <div className="form-group"><label className="label">Tasa anual (%)</label>
                        <input type="number" className="input" step="0.01" min="0" max="100" value={form.interestRate} onChange={e => up('interestRate', e.target.value)} placeholder="8.5" required />
                    </div>
                    <div className="form-group"><label className="label">Plazo (meses)</label>
                        <input type="number" className="input" min="1" max="360" value={form.termMonths} onChange={e => up('termMonths', e.target.value)} placeholder="60" required />
                    </div>
                    <div className="form-group"><label className="label">Fecha de inicio</label>
                        <input type="date" className="input" value={form.startDate} onChange={e => up('startDate', e.target.value)} required />
                    </div>
                </div>
                {monthlyPayment && (
                    <div className={styles.cuotaPreview}>
                        Cuota mensual estimada: <strong>{formatCurrency(monthlyPayment)}</strong>
                    </div>
                )}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                    <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 2 }}>
                        {submitting ? 'Registrando...' : 'Registrar Préstamo'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// ── Payment Button ─────────────────────────────────────────────────────────────

function PaymentButton({ loan, companyId, onSuccess, onError }: { loan: Loan; companyId: string; onSuccess: () => void; onError: (msg: string, type: string) => void }) {
    const [show, setShow] = useState(false);
    const [form, setForm] = useState({ paymentDate: new Date().toISOString().split('T')[0], totalPayment: '', notes: '' });
    const [submitting, setSubmitting] = useState(false);

    const monthlyRate = loan.interestRate / 100 / 12;
    const interest = Math.round(loan.balance * monthlyRate * 100) / 100;
    const amort = calcAmortization(loan.balance, loan.interestRate, loan.termMonths - (loan._count?.payments || 0));
    const suggestedPayment = amort[0]?.payment?.toFixed(2) || '';

    if (!show) return <button onClick={() => setShow(true)} className="btn btn-primary">Registrar Pago</button>;

    const handlePay = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(`/api/loans/${loan.id}/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-company-id': companyId, 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify(form),
            });
            if (res.ok) { setShow(false); onSuccess(); }
            else { const d = await res.json().catch(() => ({})); onError(d.error || 'Error', 'error'); }
        } catch { onError('Error de conexión', 'error'); }
        finally { setSubmitting(false); }
    };

    return (
        <Modal isOpen onClose={() => setShow(false)} title="Registrar Pago" size="sm">
            <form onSubmit={handlePay}>
                <p className={styles.paymentHint}>Intereses del mes: <strong>{formatCurrency(interest)}</strong> | Cuota sugerida: <strong>{formatCurrency(parseFloat(suggestedPayment))}</strong></p>
                <div className="form-group"><label className="label">Fecha de pago</label>
                    <input type="date" className="input" value={form.paymentDate} onChange={e => setForm(p => ({ ...p, paymentDate: e.target.value }))} required />
                </div>
                <div className="form-group"><label className="label">Total pagado ($)</label>
                    <input type="number" className="input" step="0.01" min="0.01" value={form.totalPayment} onChange={e => setForm(p => ({ ...p, totalPayment: e.target.value }))} placeholder={suggestedPayment} required />
                </div>
                <div className="form-group"><label className="label">Referencia</label>
                    <input type="text" className="input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="No. comprobante..." />
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button type="button" onClick={() => setShow(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                    <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 2 }}>
                        {submitting ? 'Registrando...' : 'Registrar Pago'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// ── Amortization Modal ─────────────────────────────────────────────────────────

function AmortizationModal({ loan, companyId, onClose }: { loan: Loan; companyId: string; onClose: () => void }) {
    const rows = calcAmortization(loan.originalAmount, loan.interestRate, loan.termMonths);
    const totalInterest = rows.reduce((s, r) => s + r.interest, 0);

    return (
        <Modal isOpen onClose={onClose} title={`Tabla de Amortización — ${loan.bankName}`} size="lg">
            <p className={styles.amortSummary}>Capital: {formatCurrency(loan.originalAmount)} | Tasa: {loan.interestRate}% anual | {loan.termMonths} meses | Total intereses: <strong style={{ color: '#dc2626' }}>{formatCurrency(totalInterest)}</strong></p>
            <div className={styles.amortTable}>
                <table>
                    <thead>
                        <tr><th>#</th><th>Cuota</th><th>Capital</th><th>Interés</th><th>Saldo</th></tr>
                    </thead>
                    <tbody>
                        {rows.map(r => (
                            <tr key={r.month} className={r.balance === 0 ? styles.lastRow : ''}>
                                <td>{r.month}</td>
                                <td>{formatCurrency(r.payment)}</td>
                                <td className={styles.green}>{formatCurrency(r.principal)}</td>
                                <td className={styles.red}>{formatCurrency(r.interest)}</td>
                                <td>{formatCurrency(r.balance)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button onClick={onClose} className="btn btn-secondary">Cerrar</button>
            </div>
        </Modal>
    );
}
