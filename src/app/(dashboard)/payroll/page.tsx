'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { WalletIcon, PlusIcon, CheckIcon, TrashIcon, UsersIcon } from '@/components/icons';
import { formatCurrency } from '@/lib/formatting';
import { calcEmployee, calcPayrollTotals, PayrollEmployeeInput } from '@/lib/sv-payroll';
import styles from './payroll.module.css';

interface Payroll {
    id: string;
    period: string;
    status: 'DRAFT' | 'APPROVED' | 'PAID' | 'CANCELLED';
    totalBruto: number;
    totalNeto: number;
    totalCargaPatronal: number;
    totalAFPLaboral: number;
    totalAFPPatronal: number;
    totalISSSLaboral: number;
    totalISSSPatronal: number;
    totalINSAFORP: number;
    totalISR: number;
    notes?: string;
    _count?: { employees: number };
    employees?: PayrollEmployee[];
}

interface PayrollEmployee {
    id: string;
    employeeName: string;
    dui?: string;
    nup?: string;
    afpName?: string;
    salary: number;
    otrosIngresos: number;
    totalBruto: number;
    afpLaboral: number;
    isssLaboral: number;
    isrRetencion: number;
    totalDescuentos: number;
    salarioNeto: number;
    afpPatronal: number;
    isssPatronal: number;
    insaforp: number;
}

const STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Borrador',
    APPROVED: 'Aprobada',
    PAID: 'Pagada',
    CANCELLED: 'Cancelada',
};

const STATUS_COLORS: Record<string, string> = {
    DRAFT: '#f59e0b',
    APPROVED: '#3b82f6',
    PAID: '#059669',
    CANCELLED: '#6b7280',
};

export default function PayrollPage() {
    const { activeCompanyId, isLoading: companyLoading } = useCompany();
    const { showToast } = useToast();
    const [payrolls, setPayrolls] = useState<Payroll[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
    const [approvingId, setApprovingId] = useState<string | null>(null);

    const fetchPayrolls = useCallback(async () => {
        if (!activeCompanyId) return;
        setLoading(true);
        try {
            const res = await fetch('/api/payroll', {
                headers: { 'x-company-id': activeCompanyId, 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (res.ok) {
                const data = await res.json();
                setPayrolls(data.payrolls || []);
            }
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [activeCompanyId]);

    useEffect(() => {
        if (activeCompanyId) fetchPayrolls();
        else { setPayrolls([]); setLoading(false); }
    }, [activeCompanyId, fetchPayrolls]);

    const handleApprove = async (payrollId: string) => {
        if (!activeCompanyId) return;
        setApprovingId(payrollId);
        try {
            const res = await fetch(`/api/payroll/${payrollId}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-company-id': activeCompanyId,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ paymentDate: new Date().toISOString().split('T')[0] }),
            });
            if (res.ok) {
                showToast('Planilla aprobada — transacciones generadas', 'success');
                fetchPayrolls();
                setSelectedPayroll(null);
            } else {
                const d = await res.json().catch(() => ({}));
                showToast(d.error || 'Error al aprobar', 'error');
            }
        } catch { showToast('Error de conexión', 'error'); }
        finally { setApprovingId(null); }
    };

    const handleDelete = async (payrollId: string) => {
        if (!activeCompanyId) return;
        try {
            const res = await fetch(`/api/payroll/${payrollId}`, {
                method: 'DELETE',
                headers: { 'x-company-id': activeCompanyId, 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (res.ok) { showToast('Planilla eliminada', 'success'); fetchPayrolls(); }
            else { const d = await res.json().catch(() => ({})); showToast(d.error || 'Error', 'error'); }
        } catch { showToast('Error de conexión', 'error'); }
    };

    const totalBrutoYTD = payrolls.filter(p => p.status === 'PAID').reduce((s, p) => s + p.totalBruto, 0);
    const totalCargas = payrolls.filter(p => p.status === 'PAID').reduce((s, p) => s + p.totalCargaPatronal, 0);

    if (companyLoading || (loading && !payrolls.length && activeCompanyId)) {
        return (
            <div>
                <PageHeader title="Planillas" subtitle="Gestión de nómina según legislación de El Salvador" />
                <div className={styles.loading}><div className={styles.spinner} /></div>
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title="Planillas"
                subtitle="Cálculo automático de AFP, ISSS, INSAFORP e ISR según legislación salvadoreña"
            >
                <button onClick={() => setShowNewModal(true)} className="btn btn-primary" disabled={!activeCompanyId}>
                    <PlusIcon size={16} /> Nueva Planilla
                </button>
            </PageHeader>

            {!activeCompanyId ? (
                <EmptyState icon="🏢" title="Sin empresa seleccionada" description="Selecciona una empresa para gestionar sus planillas." />
            ) : (
                <>
                    <div className={styles.statsGrid}>
                        <StatCard label="Salarios Brutos Pagados" value={formatCurrency(totalBrutoYTD)} icon={<UsersIcon size={16} />} variant="neutral" />
                        <StatCard label="Carga Patronal Total" value={formatCurrency(totalCargas)} icon={<WalletIcon size={16} />} variant="expense" />
                        <StatCard label="Planillas del Período" value={payrolls.length} icon={<WalletIcon size={16} />} variant="default" />
                    </div>

                    {payrolls.length === 0 ? (
                        <EmptyState
                            icon="📋"
                            title="Sin planillas registradas"
                            description="Crea la primera planilla del mes. El sistema calculará automáticamente AFP, ISSS, INSAFORP e ISR."
                            actionLabel="Nueva Planilla"
                            onAction={() => setShowNewModal(true)}
                        />
                    ) : (
                        <div className={styles.payrollList}>
                            {payrolls.map(p => (
                                <div key={p.id} className={styles.payrollCard}>
                                    <div className={styles.cardMain}>
                                        <div className={styles.cardHeader}>
                                            <div>
                                                <h3 className={styles.period}>{formatPeriod(p.period)}</h3>
                                                <span className={styles.empCount}>{p._count?.employees || 0} empleados</span>
                                            </div>
                                            <span className={styles.badge} style={{ background: STATUS_COLORS[p.status] + '22', color: STATUS_COLORS[p.status] }}>
                                                {STATUS_LABELS[p.status]}
                                            </span>
                                        </div>

                                        <div className={styles.cardAmounts}>
                                            <div className={styles.amount}>
                                                <span className={styles.amountLabel}>Bruto</span>
                                                <span className={styles.amountValue}>{formatCurrency(p.totalBruto)}</span>
                                            </div>
                                            <div className={styles.amount}>
                                                <span className={styles.amountLabel}>Neto empleados</span>
                                                <span className={styles.amountValue + ' ' + styles.green}>{formatCurrency(p.totalNeto)}</span>
                                            </div>
                                            <div className={styles.amount}>
                                                <span className={styles.amountLabel}>Carga patronal</span>
                                                <span className={styles.amountValue + ' ' + styles.red}>{formatCurrency(p.totalCargaPatronal)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.cardActions}>
                                        <button onClick={() => setSelectedPayroll(p)} className="btn btn-secondary">
                                            Ver Detalle
                                        </button>
                                        {p.status === 'DRAFT' && (
                                            <>
                                                <button
                                                    onClick={() => handleApprove(p.id)}
                                                    disabled={approvingId === p.id}
                                                    className="btn btn-primary"
                                                >
                                                    <CheckIcon size={14} />
                                                    {approvingId === p.id ? 'Aprobando...' : 'Aprobar y Pagar'}
                                                </button>
                                                <button onClick={() => handleDelete(p.id)} className="btn btn-ghost" style={{ color: '#ef4444' }}>
                                                    <TrashIcon size={14} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {showNewModal && activeCompanyId && (
                <NewPayrollModal
                    companyId={activeCompanyId}
                    onClose={() => setShowNewModal(false)}
                    onSuccess={(msg) => { setShowNewModal(false); fetchPayrolls(); showToast(msg, 'success'); }}
                    onError={(msg) => showToast(msg, 'error')}
                />
            )}

            {selectedPayroll && (
                <PayrollDetailModal
                    payroll={selectedPayroll}
                    onClose={() => setSelectedPayroll(null)}
                    onApprove={() => handleApprove(selectedPayroll.id)}
                    approving={approvingId === selectedPayroll.id}
                />
            )}
        </div>
    );
}

// ── New Payroll Modal ──────────────────────────────────────────────────────────

function NewPayrollModal({ companyId, onClose, onSuccess, onError }: {
    companyId: string;
    onClose: () => void;
    onSuccess: (msg: string) => void;
    onError: (msg: string) => void;
}) {
    const now = new Date();
    const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [period, setPeriod] = useState(defaultPeriod);
    const [notes, setNotes] = useState('');
    const [employees, setEmployees] = useState<PayrollEmployeeInput[]>([
        { employeeName: '', salary: 0, otrosIngresos: 0 },
    ]);
    const [submitting, setSubmitting] = useState(false);

    const addEmployee = () => setEmployees(prev => [...prev, { employeeName: '', salary: 0, otrosIngresos: 0 }]);
    const removeEmployee = (i: number) => setEmployees(prev => prev.filter((_, idx) => idx !== i));
    const updateEmployee = (i: number, field: keyof PayrollEmployeeInput, value: string | number) =>
        setEmployees(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));

    // Live preview
    const previews = employees.map(e => {
        try { return calcEmployee({ ...e, salary: Number(e.salary) || 0, otrosIngresos: Number(e.otrosIngresos) || 0 }); }
        catch { return null; }
    });
    const totals = calcPayrollTotals(previews.filter(Boolean) as any);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (employees.some(emp => !emp.employeeName.trim() || !emp.salary)) {
            onError('Todos los empleados deben tener nombre y salario');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch('/api/payroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-company-id': companyId, 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({ period, notes, employees }),
            });
            if (res.ok) onSuccess('Planilla creada correctamente');
            else { const d = await res.json().catch(() => ({})); onError(d.error || 'Error al crear planilla'); }
        } catch { onError('Error de conexión'); }
        finally { setSubmitting(false); }
    };

    return (
        <Modal isOpen onClose={onClose} title="Nueva Planilla" size="lg">
            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                        <label className="label">Período (YYYY-MM)</label>
                        <input type="month" className="input" value={period} onChange={e => setPeriod(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label className="label">Notas</label>
                        <input type="text" className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Planilla regular, etc." />
                    </div>
                </div>

                <div className={styles.employeesSection}>
                    <div className={styles.employeesHeader}>
                        <h4>Empleados</h4>
                        <button type="button" onClick={addEmployee} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
                            <PlusIcon size={14} /> Agregar
                        </button>
                    </div>

                    {employees.map((emp, i) => (
                        <div key={i} className={styles.employeeRow}>
                            <div className={styles.empFields}>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="label">Nombre completo</label>
                                    <input type="text" className="input" value={emp.employeeName} onChange={e => updateEmployee(i, 'employeeName', e.target.value)} placeholder="Juan Pérez" required />
                                </div>
                                <div className="form-group">
                                    <label className="label">Salario mensual ($)</label>
                                    <input type="number" className="input" step="0.01" min="0" value={emp.salary || ''} onChange={e => updateEmployee(i, 'salary', parseFloat(e.target.value) || 0)} placeholder="500.00" required />
                                </div>
                                <div className="form-group">
                                    <label className="label">Otros ingresos ($)</label>
                                    <input type="number" className="input" step="0.01" min="0" value={emp.otrosIngresos || ''} onChange={e => updateEmployee(i, 'otrosIngresos', parseFloat(e.target.value) || 0)} placeholder="0.00" />
                                </div>
                                <div className="form-group">
                                    <label className="label">DUI</label>
                                    <input type="text" className="input" value={emp.dui || ''} onChange={e => updateEmployee(i, 'dui', e.target.value)} placeholder="00000000-0" />
                                </div>
                                <div className="form-group">
                                    <label className="label">AFP</label>
                                    <select className="input" value={emp.afpName || ''} onChange={e => updateEmployee(i, 'afpName', e.target.value)}>
                                        <option value="">Seleccionar...</option>
                                        <option value="AFP Crecer">AFP Crecer</option>
                                        <option value="AFP Confía">AFP Confía</option>
                                    </select>
                                </div>
                            </div>

                            {previews[i] && (
                                <div className={styles.empPreview}>
                                    <div className={styles.previewItem}><span>AFP laboral</span><span>{formatCurrency(previews[i]!.afpLaboral)}</span></div>
                                    <div className={styles.previewItem}><span>ISSS laboral</span><span>{formatCurrency(previews[i]!.isssLaboral)}</span></div>
                                    <div className={styles.previewItem}><span>ISR retenido</span><span>{formatCurrency(previews[i]!.isrRetencion)}</span></div>
                                    <div className={`${styles.previewItem} ${styles.previewTotal}`}><span>Neto a pagar</span><span>{formatCurrency(previews[i]!.salarioNeto)}</span></div>
                                </div>
                            )}

                            {employees.length > 1 && (
                                <button type="button" onClick={() => removeEmployee(i)} className="btn btn-ghost" style={{ color: '#ef4444', alignSelf: 'flex-start' }}>
                                    <TrashIcon size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Totals summary */}
                <div className={styles.totalsSummary}>
                    <h4>Resumen de la Planilla</h4>
                    <div className={styles.totalsGrid}>
                        <div className={styles.totalRow}><span>Total Bruto</span><strong>{formatCurrency(totals.totalBruto)}</strong></div>
                        <div className={styles.totalRow}><span>AFP Laboral</span><span>-{formatCurrency(totals.totalAFPLaboral)}</span></div>
                        <div className={styles.totalRow}><span>ISSS Laboral</span><span>-{formatCurrency(totals.totalISSSLaboral)}</span></div>
                        <div className={styles.totalRow}><span>ISR Retenido</span><span>-{formatCurrency(totals.totalISR)}</span></div>
                        <div className={`${styles.totalRow} ${styles.highlighted}`}><span>Total Neto Empleados</span><strong>{formatCurrency(totals.totalNeto)}</strong></div>
                        <div style={{ borderTop: '1px dashed #e5e7eb', margin: '0.5rem 0' }} />
                        <div className={styles.totalRow}><span>AFP Patronal</span><span>{formatCurrency(totals.totalAFPPatronal)}</span></div>
                        <div className={styles.totalRow}><span>ISSS Patronal</span><span>{formatCurrency(totals.totalISSSPatronal)}</span></div>
                        <div className={styles.totalRow}><span>INSAFORP (1%)</span><span>{formatCurrency(totals.totalINSAFORP)}</span></div>
                        <div className={`${styles.totalRow} ${styles.highlighted}`}><span>Carga Patronal</span><strong>{formatCurrency(totals.totalCargaPatronal)}</strong></div>
                        <div className={`${styles.totalRow} ${styles.grand}`}><span>COSTO TOTAL PLANILLA</span><strong>{formatCurrency(totals.costoTotalPlanilla)}</strong></div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                    <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 2 }}>
                        {submitting ? 'Creando...' : 'Crear Planilla'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// ── Payroll Detail Modal ───────────────────────────────────────────────────────

function PayrollDetailModal({ payroll, onClose, onApprove, approving }: {
    payroll: Payroll;
    onClose: () => void;
    onApprove: () => void;
    approving: boolean;
}) {
    const [detail, setDetail] = useState<Payroll | null>(null);
    const { activeCompanyId } = useCompany();

    useEffect(() => {
        if (!activeCompanyId) return;
        fetch(`/api/payroll/${payroll.id}`, {
            headers: { 'x-company-id': activeCompanyId, 'X-Requested-With': 'XMLHttpRequest' },
        }).then(r => r.json()).then(d => setDetail(d.payroll));
    }, [payroll.id, activeCompanyId]);

    const p = detail || payroll;

    return (
        <Modal isOpen onClose={onClose} title={`Planilla ${formatPeriod(p.period)}`} size="lg">
            <div className={styles.detailGrid}>
                <div className={styles.detailBox}>
                    <span className={styles.detailLabel}>Total Bruto</span>
                    <span className={styles.detailValue}>{formatCurrency(p.totalBruto)}</span>
                </div>
                <div className={styles.detailBox}>
                    <span className={styles.detailLabel}>Neto Empleados</span>
                    <span className={`${styles.detailValue} ${styles.green}`}>{formatCurrency(p.totalNeto)}</span>
                </div>
                <div className={styles.detailBox}>
                    <span className={styles.detailLabel}>AFP Total</span>
                    <span className={styles.detailValue}>{formatCurrency(p.totalAFPLaboral + p.totalAFPPatronal)}</span>
                </div>
                <div className={styles.detailBox}>
                    <span className={styles.detailLabel}>ISSS Total</span>
                    <span className={styles.detailValue}>{formatCurrency(p.totalISSSLaboral + p.totalISSSPatronal)}</span>
                </div>
                <div className={styles.detailBox}>
                    <span className={styles.detailLabel}>INSAFORP</span>
                    <span className={styles.detailValue}>{formatCurrency(p.totalINSAFORP)}</span>
                </div>
                <div className={styles.detailBox}>
                    <span className={styles.detailLabel}>ISR Retenido</span>
                    <span className={styles.detailValue}>{formatCurrency(p.totalISR)}</span>
                </div>
            </div>

            {p.employees && p.employees.length > 0 && (
                <div className={styles.employeeTable}>
                    <h4>Detalle por Empleado</h4>
                    <div className={styles.tableWrapper}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Empleado</th>
                                    <th>Bruto</th>
                                    <th>AFP Lab.</th>
                                    <th>ISSS Lab.</th>
                                    <th>ISR</th>
                                    <th>Neto</th>
                                    <th>Carga Pat.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {p.employees.map(e => (
                                    <tr key={e.id}>
                                        <td>{e.employeeName}</td>
                                        <td>{formatCurrency(e.totalBruto)}</td>
                                        <td className={styles.red}>{formatCurrency(e.afpLaboral)}</td>
                                        <td className={styles.red}>{formatCurrency(e.isssLaboral)}</td>
                                        <td className={styles.red}>{formatCurrency(e.isrRetencion)}</td>
                                        <td className={styles.green}><strong>{formatCurrency(e.salarioNeto)}</strong></td>
                                        <td className={styles.orange}>{formatCurrency(e.afpPatronal + e.isssPatronal + e.insaforp)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button onClick={onClose} className="btn btn-secondary">Cerrar</button>
                {p.status === 'DRAFT' && (
                    <button onClick={onApprove} disabled={approving} className="btn btn-primary">
                        <CheckIcon size={14} /> {approving ? 'Aprobando...' : 'Aprobar y Generar Transacciones'}
                    </button>
                )}
            </div>
        </Modal>
    );
}

function formatPeriod(period: string) {
    const [year, month] = period.split('-');
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${months[parseInt(month) - 1]} ${year}`;
}
