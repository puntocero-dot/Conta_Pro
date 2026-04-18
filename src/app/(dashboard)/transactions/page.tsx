'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { useFilter } from '@/context/FilterContext';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/hooks/useAuth';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonStatsGrid, SkeletonTable } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { FilterBar } from '@/components/ui/FilterBar';
import { PlusIcon, TrendingUpIcon, TrendingDownIcon, WalletIcon, PencilIcon, XIcon } from '@/components/icons';
import { formatCurrency, formatDate } from '@/lib/formatting';
import styles from './transactions.module.css';

interface Transaction {
    id: string;
    type: 'INGRESO' | 'EGRESO';
    amount: number;
    description: string;
    date: string;
    status: 'ACTIVE' | 'ANNULLED' | 'CORRECTED' | 'PENDING_APPROVAL';
    clientId?: string;
    isPaid: boolean;
    dueDate?: string | null;
    category: {
        name: string;
        icon: string;
        color: string;
    };
    createdBy?: {
        id: string;
        name: string;
        email: string;
    };
}

export default function TransactionsPage() {
    const { activeCompanyId, isLoading: companyLoading } = useCompany();
    const { startDate, endDate } = useFilter();
    const { showToast } = useToast();
    const { role } = useAuth();
    const isCliente = role === 'CLIENTE';
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [annulledTransactions, setAnnulledTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    const [filter, setFilter] = useState<'ALL' | 'INGRESO' | 'EGRESO' | 'PENDING_APPROVAL' | 'ANNULLED'>('ALL');
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [annullingId, setAnnullingId] = useState<string | null>(null);
    const [togglingPaid, setTogglingPaid] = useState<string | null>(null);
    const [restoringId, setRestoringId] = useState<string | null>(null);

    const [bulkResult, setBulkResult] = useState<{ successCount: number; failedCount: number; failed: { row: number; reason: string; data: any }[] } | null>(null);
    const [showBulkDocs, setShowBulkDocs] = useState(false);

    const downloadCsvTemplate = () => {
        const header = 'tipo,monto,descripcion,fecha,categoria_id,proveedor';
        const example = 'EGRESO,150.00,Compra de papelería,2026-04-01,,Librería Española';
        const blob = new Blob([header + '\n' + example], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla_transacciones.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeCompanyId) return;
        e.target.value = '';

        const { parseCSV, MAPPINGS } = await import('@/lib/csv-helper');
        try {
            const mapping = { ...MAPPINGS.TRANSACTION, proveedor: 'proveedor' };
            const data = await parseCSV<any>(file, mapping);
            if (data.length === 0) {
                showToast('El archivo está vacío o no tiene el formato correcto', 'error');
                return;
            }

            const res = await fetch('/api/transactions/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-company-id': activeCompanyId,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ transactions: data }),
            });

            if (res.ok) {
                const result = await res.json();
                setBulkResult(result);
                if (result.successCount > 0) fetchTransactions();
            } else {
                showToast('Error en la carga masiva', 'error');
            }
        } catch {
            showToast('Error al procesar el archivo CSV', 'error');
        }
    };

    const fetchTransactions = useCallback(async () => {
        if (!activeCompanyId) return;
        setLoading(true);
        try {
            const headers = { 'x-company-id': activeCompanyId, 'X-Requested-With': 'XMLHttpRequest' };
            const [activeRes, annulledRes] = await Promise.all([
                fetch(`/api/transactions?startDate=${startDate}&endDate=${endDate}&limit=200`, { headers }),
                fetch(`/api/transactions?startDate=${startDate}&endDate=${endDate}&status=ANNULLED&limit=200`, { headers }),
            ]);
            if (activeRes.ok) {
                const data = await activeRes.json();
                setTransactions(data.transactions || []);
            }
            if (annulledRes.ok) {
                const data = await annulledRes.json();
                setAnnulledTransactions(data.transactions || []);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
        }
    }, [activeCompanyId, startDate, endDate]);

    useEffect(() => {
        if (activeCompanyId) {
            fetchTransactions();
        } else {
            setTransactions([]);
            setAnnulledTransactions([]);
            setLoading(false);
        }
    }, [activeCompanyId, startDate, endDate, fetchTransactions]);

    const filteredTransactions = filter === 'ANNULLED'
        ? annulledTransactions
        : transactions.filter(t => {
            if (filter === 'ALL') return true;
            if (filter === 'PENDING_APPROVAL') return t.status === 'PENDING_APPROVAL';
            return (t.type as string) === filter;
        });

    const handleRestore = async (transactionId: string) => {
        if (!activeCompanyId) return;
        setRestoringId(transactionId);
        try {
            const res = await fetch(`/api/transactions/${transactionId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-company-id': activeCompanyId,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ status: 'ACTIVE' }),
            });
            if (res.ok) {
                showToast('Transacción restaurada correctamente ✓', 'success');
                fetchTransactions();
            } else {
                showToast('Error al restaurar la transacción', 'error');
            }
        } catch {
            showToast('Error de conexión', 'error');
        } finally {
            setRestoringId(null);
        }
    };

    const handleTogglePaid = async (tx: Transaction) => {
        if (!activeCompanyId) return;
        setTogglingPaid(tx.id);
        try {
            const res = await fetch(`/api/transactions/${tx.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-company-id': activeCompanyId,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ isPaid: !tx.isPaid }),
            });
            if (res.ok) {
                showToast(!tx.isPaid ? 'Marcado como cobrado/pagado ✓' : 'Marcado como pendiente', 'success');
                fetchTransactions();
            } else {
                showToast('Error al actualizar estado', 'error');
            }
        } catch {
            showToast('Error de conexión', 'error');
        } finally {
            setTogglingPaid(null);
        }
    };

    const totalIngresos = transactions.filter(t => t.type === 'INGRESO').reduce((s, t) => s + t.amount, 0);
    const totalEgresos = transactions.filter(t => t.type === 'EGRESO').reduce((s, t) => s + t.amount, 0);
    const pendingApprovalCount = transactions.filter(t => t.status === 'PENDING_APPROVAL').length;
    const balance = totalIngresos - totalEgresos;

    if (companyLoading || (loading && transactions.length === 0 && activeCompanyId)) {
        return (
            <div>
                <PageHeader title="Transacciones" subtitle="Historial financiero y control de caja" />
                <SkeletonStatsGrid count={3} />
                <div style={{ marginTop: '1.5rem' }}>
                    <SkeletonTable rows={5} cols={4} />
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <PageHeader
                title="Transacciones"
                subtitle={filter === 'ANNULLED'
                    ? `${annulledTransactions.length} transacciones anuladas`
                    : transactions.length > 0 ? `${transactions.length} operaciones en el período` : 'Historial financiero y control de caja'}
            >
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {!isCliente && (
                        <>
                            <button className="btn btn-ghost" style={{ fontSize: '0.8125rem' }} onClick={() => setShowBulkDocs(v => !v)} title="Ver formato de columnas">
                                ℹ️ Formato CSV
                            </button>
                            <button className="btn btn-secondary" style={{ fontSize: '0.8125rem' }} onClick={downloadCsvTemplate}>
                                ⬇ Plantilla
                            </button>
                            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                                📁 Carga Masiva
                                <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleBulkImport} />
                            </label>
                        </>
                    )}
                    <button
                        onClick={() => setShowNewModal(true)}
                        className="btn btn-primary"
                        disabled={!activeCompanyId}
                        title={isCliente ? 'La transacción quedará pendiente de aprobación del Contador' : undefined}
                    >
                        <PlusIcon size={16} /> {isCliente ? 'Solicitar Transacción' : 'Nueva Transacción'}
                    </button>
                </div>
            </PageHeader>

            {!activeCompanyId ? (
                <EmptyState
                    icon="🏢"
                    title="Sin empresa seleccionada"
                    description="Selecciona una empresa en el panel lateral para ver sus transacciones."
                />
            ) : (
                <>
                    {/* Stats */}
                    <div className={styles.statsGrid}>
                        <StatCard label="Ingresos" value={formatCurrency(totalIngresos)} icon={<TrendingUpIcon size={16} />} variant="income" />
                        <StatCard label="Egresos" value={formatCurrency(totalEgresos)} icon={<TrendingDownIcon size={16} />} variant="expense" />
                        <StatCard label="Balance neto" value={formatCurrency(balance)} icon={<WalletIcon size={16} />} variant={balance >= 0 ? 'neutral' : 'expense'} />
                    </div>

                    {/* Banner informativo para CLIENTE */}
                    {isCliente && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            background: '#eff6ff', border: '1px solid #bfdbfe',
                            borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem',
                            fontSize: '0.875rem', color: '#1d4ed8',
                        }}>
                            <span style={{ fontSize: '1.1rem' }}>ℹ️</span>
                            <span>
                                Modo <strong>solo lectura</strong>. Las transacciones que registres quedarán
                                <strong> pendientes de aprobación</strong> del Contador antes de afectar el balance.
                            </span>
                        </div>
                    )}

                    {/* Filters */}
                    <div className={styles.filtersRow}>
                        <FilterBar
                            options={[
                                { value: 'ALL', label: 'Todas' },
                                { value: 'INGRESO', label: 'Ingresos' },
                                { value: 'EGRESO', label: 'Egresos' },
                                { value: 'PENDING_APPROVAL', label: `Pendientes (${pendingApprovalCount})` },
                                { value: 'ANNULLED', label: `Anuladas (${annulledTransactions.length})` },
                            ]}
                            value={filter}
                            onChange={(v) => setFilter(v as typeof filter)}
                        />
                    </div>

                    {/* Transactions List */}
                    <div className={styles.transactionsList}>
                        {filteredTransactions.length === 0 ? (
                            <EmptyState
                                icon="📭"
                                title="Sin transacciones"
                                description="No se encontraron registros para este filtro."
                                actionLabel="Crear Transacción"
                                onAction={() => setShowNewModal(true)}
                            />
                        ) : (
                            filteredTransactions.map(transaction => (
                                <div key={transaction.id} className={styles.transactionCard}>
                                    <div
                                        className={styles.transactionIcon}
                                        style={{ background: transaction.category?.color ? `${transaction.category.color}22` : '#f1f5f9' }}
                                    >
                                        {transaction.category?.icon || '💰'}
                                    </div>
                                    <div className={styles.transactionInfo}>
                                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {transaction.description}
                                            {transaction.status === 'ANNULLED' && (
                                                <span className={styles.badgeAnnulled}>Anulada</span>
                                            )}
                                            {transaction.status === 'CORRECTED' && (
                                                <span className={styles.badgeCorrected}>Corregida</span>
                                            )}
                                            {transaction.status === 'PENDING_APPROVAL' && (
                                                <span className={styles.badgePending}>Bot: Pendiente Approval</span>
                                            )}
                                        </h4>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <span className={styles.transactionCategory}>{transaction.category?.name || 'General'}</span>
                                            <span style={{ color: '#cbd5e1' }}>•</span>
                                            <span className={styles.transactionDate}>
                                                {formatDate(transaction.date)}
                                            </span>
                                            {transaction.createdBy?.name && (
                                                <>
                                                    <span style={{ color: '#cbd5e1' }}>•</span>
                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }} title="Registrado por">
                                                        👤 {transaction.createdBy.name}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`${styles.transactionAmount} ${transaction.type === 'INGRESO' ? styles.amountIncome : styles.amountExpense} ${transaction.status === 'ANNULLED' ? styles.statusAnnulled : ''}`}>
                                        {transaction.type === 'INGRESO' ? '+' : '-'}{formatCurrency(transaction.amount ?? 0)}
                                    </div>
                                    <div className={styles.actionBtn}>
                                        {/* Vista de anuladas: solo botón Recuperar */}
                                        {filter === 'ANNULLED' ? (
                                            <button
                                                onClick={() => handleRestore(transaction.id)}
                                                className="btn btn-ghost"
                                                title="Restaurar transacción"
                                                disabled={restoringId === transaction.id}
                                                style={{ color: '#10b981', fontSize: '0.8125rem', fontWeight: 600 }}
                                            >
                                                {restoringId === transaction.id ? '...' : '↩ Recuperar'}
                                            </button>
                                        ) : isCliente ? (
                                            // CLIENTE: solo puede ver, sin editar ni anular
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                                {transaction.status === 'PENDING_APPROVAL' ? 'En revisión' : 'Solo lectura'}
                                            </span>
                                        ) : (
                                            <>
                                                {transaction.status === 'PENDING_APPROVAL' && (
                                                    <button
                                                      onClick={async () => {
                                                        if (confirm('¿Deseas aprobar esta transacción?')) {
                                                          const res = await fetch(`/api/transactions/${transaction.id}`, {
                                                            method: 'PATCH',
                                                            headers: { 'Content-Type': 'application/json', 'x-company-id': activeCompanyId || '', 'X-Requested-With': 'XMLHttpRequest' },
                                                            body: JSON.stringify({ status: 'ACTIVE' })
                                                          });
                                                          if (res.ok) { showToast('Transacción aprobada ✓', 'success'); fetchTransactions(); }
                                                        }
                                                      }}
                                                      className="btn btn-primary"
                                                      style={{ padding: '4px 12px', fontSize: 12 }}
                                                    >
                                                      Aprobar
                                                    </button>
                                                )}
                                                {transaction.status !== 'PENDING_APPROVAL' && (
                                                    <button
                                                        onClick={() => handleTogglePaid(transaction)}
                                                        className="btn btn-ghost"
                                                        title={transaction.isPaid ? 'Marcar como pendiente' : 'Marcar como cobrado/pagado'}
                                                        disabled={togglingPaid === transaction.id}
                                                        style={{ color: transaction.isPaid ? '#10b981' : '#f59e0b', fontSize: '1rem' }}
                                                    >
                                                        {transaction.isPaid ? '✓' : '○'}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setEditingTransaction(transaction)}
                                                    className="btn btn-ghost"
                                                    title="Corregir/Editar"
                                                >
                                                    <PencilIcon size={15} />
                                                </button>
                                                <button
                                                    onClick={() => setAnnullingId(transaction.id)}
                                                    className="btn btn-ghost"
                                                    title="Anular"
                                                    style={{ color: '#ef4444' }}
                                                >
                                                    <XIcon size={15} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* CSV Format Docs Panel */}
            {showBulkDocs && (
                <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem', background: '#f8fafc', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9375rem' }}>📋 Formato del archivo CSV</h4>
                        <button className="btn btn-ghost" style={{ fontSize: '0.8125rem' }} onClick={() => setShowBulkDocs(false)}>✕</button>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                        <thead>
                            <tr style={{ background: '#e2e8f0' }}>
                                {['Columna', 'Nombre en CSV', 'Requerido', 'Valores aceptados', 'Ejemplo'].map(h => (
                                    <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, color: '#475569' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { col: 'Tipo', csv: 'tipo', req: 'Sí', vals: 'INGRESO o EGRESO', ex: 'EGRESO' },
                                { col: 'Monto', csv: 'monto', req: 'Sí', vals: 'Número positivo', ex: '150.00' },
                                { col: 'Descripción', csv: 'descripcion', req: 'Sí', vals: 'Texto libre', ex: 'Compra papelería' },
                                { col: 'Fecha', csv: 'fecha', req: 'Sí', vals: 'YYYY-MM-DD', ex: '2026-04-01' },
                                { col: 'Categoría', csv: 'categoria_id', req: 'No', vals: 'ID o nombre de categoría', ex: 'Gastos Generales' },
                                { col: 'Proveedor', csv: 'proveedor', req: 'No', vals: 'Nombre del proveedor', ex: 'Librería Española' },
                            ].map(r => (
                                <tr key={r.csv} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: '#1e293b' }}>{r.col}</td>
                                    <td style={{ padding: '0.5rem 0.75rem' }}><code style={{ background: '#e2e8f0', padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.75rem' }}>{r.csv}</code></td>
                                    <td style={{ padding: '0.5rem 0.75rem', color: r.req === 'Sí' ? '#dc2626' : '#64748b' }}>{r.req}</td>
                                    <td style={{ padding: '0.5rem 0.75rem', color: '#475569' }}>{r.vals}</td>
                                    <td style={{ padding: '0.5rem 0.75rem', color: '#64748b', fontStyle: 'italic' }}>{r.ex}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Bulk Import Result Modal */}
            {bulkResult && (
                <BulkResultModal
                    result={bulkResult}
                    onClose={() => setBulkResult(null)}
                />
            )}

            {/* New / Edit Transaction Modal */}
            {(showNewModal || editingTransaction) && activeCompanyId && (
                <TransactionModal
                    companyId={activeCompanyId}
                    initialData={editingTransaction || undefined}
                    onClose={() => { setShowNewModal(false); setEditingTransaction(null); }}
                    onSuccess={(msg) => {
                        setShowNewModal(false);
                        setEditingTransaction(null);
                        fetchTransactions();
                        showToast(msg, 'success');
                    }}
                    onError={(msg) => showToast(msg, 'error')}
                />
            )}

            {/* Annul Confirmation Modal */}
            {annullingId && activeCompanyId && (
                <AnnulConfirmModal
                    transactionId={annullingId}
                    companyId={activeCompanyId}
                    onClose={() => setAnnullingId(null)}
                    onSuccess={() => {
                        setAnnullingId(null);
                        fetchTransactions();
                        showToast('Transacción anulada correctamente', 'success');
                    }}
                    onError={(msg) => showToast(msg, 'error')}
                />
            )}
        </div>
    );
}

function TransactionModal({
    companyId,
    initialData,
    onClose,
    onSuccess,
    onError,
}: {
    companyId: string;
    initialData?: Transaction;
    onClose: () => void;
    onSuccess: (msg: string) => void;
    onError: (msg: string) => void;
}) {
    const today = new Date();
    const initDate = initialData?.date ? new Date(initialData.date) : today;
    const [formData, setFormData] = useState({
        type: initialData?.type || ('INGRESO' as 'INGRESO' | 'EGRESO'),
        amount: initialData?.amount.toString() || '',
        description: initialData?.description || '',
        date: initialData?.date
            ? new Date(initialData.date).toISOString().split('T')[0]
            : today.toISOString().split('T')[0],
        categoryId: (initialData as any)?.categoryId || '',
        clientId: initialData?.clientId || '',
        dueDate: (initialData as any)?.dueDate
            ? new Date((initialData as any).dueDate).toISOString().split('T')[0]
            : '',
        isPaid: (initialData as any)?.isPaid !== false,
        creditDays: (initialData as any)?.creditDays?.toString() || '',
        accountingMonth: ((initialData as any)?.metadata?.accountingMonth ?? initDate.getMonth() + 1).toString(),
        accountingYear: ((initialData as any)?.metadata?.accountingYear ?? initDate.getFullYear()).toString(),
    });
    const [categories, setCategories] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [clientsRes, catsRes] = await Promise.all([
                    fetch('/api/clients', { headers: { 'x-company-id': companyId, 'X-Requested-With': 'XMLHttpRequest' } }),
                    fetch(`/api/categories?type=${formData.type}`, { headers: { 'x-company-id': companyId, 'X-Requested-With': 'XMLHttpRequest' } }),
                ]);
                if (clientsRes.ok) {
                    const data = await clientsRes.json();
                    const targetRole = formData.type === 'INGRESO' ? 'CLIENT' : 'SUPPLIER';
                    setClients(data.clients.filter((c: any) => c.role === targetRole || c.role === 'BOTH'));
                }
                if (catsRes.ok) {
                    const data = await catsRes.json();
                    setCategories(data.categories ?? []);
                }
            } catch (e) {
                console.error('Error fetching data', e);
            }
        };
        fetchData();
    }, [companyId, formData.type]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || amount <= 0) {
            onError('El monto debe ser un número mayor a 0');
            return;
        }
        setSubmitting(true);
        try {
            const url = initialData ? `/api/transactions/${initialData.id}` : '/api/transactions';
            const method = initialData ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-company-id': companyId,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    ...formData,
                    amount,
                    metadata: {
                        accountingMonth: parseInt(formData.accountingMonth),
                        accountingYear: parseInt(formData.accountingYear),
                    },
                }),
            });
            if (res.ok) {
                onSuccess(initialData ? 'Transacción corregida correctamente' : 'Transacción registrada correctamente');
            } else {
                const data = await res.json().catch(() => ({}));
                onError(data.error || 'Error al guardar transacción');
            }
        } catch {
            onError('Error de conexión');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={initialData ? 'Corregir Transacción' : 'Nueva Transacción'}
            size="md"
        >
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="label">Tipo de Movimiento</label>
                    <div className={styles.typeButtons}>
                        <button type="button" className={formData.type === 'INGRESO' ? styles.typeActive : ''} onClick={() => !initialData && setFormData(p => ({ ...p, type: 'INGRESO' }))} disabled={!!initialData}><TrendingUpIcon size={15} /> Ingreso</button>
                        <button type="button" className={formData.type === 'EGRESO' ? styles.typeActive : ''} onClick={() => !initialData && setFormData(p => ({ ...p, type: 'EGRESO' }))} disabled={!!initialData}><TrendingDownIcon size={15} /> Egreso</button>
                    </div>
                </div>
                <div className="form-group">
                    <label className="label">Monto (USD)</label>
                    <input type="number" className="input" step="0.01" min="0.01" max="999999999" required value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="form-group">
                    <label className="label">Categoría</label>
                    <select className="input" value={formData.categoryId} onChange={e => setFormData(p => ({ ...p, categoryId: e.target.value }))}>
                        <option value="">Sin categoría</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.icon} {c.name}{c.debitAccountCode ? ` (DB ${c.debitAccountCode} / CR ${c.creditAccountCode})` : ''}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label className="label">{formData.type === 'INGRESO' ? 'Cliente que paga' : 'Proveedor del gasto'}</label>
                    <select className="input" value={formData.clientId} onChange={e => setFormData(p => ({ ...p, clientId: e.target.value }))}>
                        <option value="">Seleccionar entidad...</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="label">Descripción</label>
                    <input type="text" className="input" required value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Ej: Cobro factura #123" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                        <label className="label">Fecha de Factura</label>
                        <input type="date" className="input" required value={formData.date} onChange={e => {
                            const d = new Date(e.target.value);
                            setFormData(p => ({
                                ...p,
                                date: e.target.value,
                                accountingMonth: (!isNaN(d.getTime()) ? d.getMonth() + 1 : p.accountingMonth).toString(),
                                accountingYear: (!isNaN(d.getTime()) ? d.getFullYear() : p.accountingYear).toString(),
                            }));
                        }} />
                    </div>
                    <div className="form-group">
                        <label className="label" title="Período al que pertenece este gasto en reportes">
                            Mes Contable ℹ
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.375rem' }}>
                            <select className="input" value={formData.accountingMonth} onChange={e => setFormData(p => ({ ...p, accountingMonth: e.target.value }))}>
                                {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
                                    <option key={i} value={i + 1}>{m}</option>
                                ))}
                            </select>
                            <input type="number" className="input" value={formData.accountingYear} min="2020" max="2099"
                                onChange={e => setFormData(p => ({ ...p, accountingYear: e.target.value }))} />
                        </div>
                    </div>
                </div>
                <div className="form-group">
                    <label className="label">
                        Estado de pago
                        <span style={{ fontWeight: 400, color: '#64748b', marginLeft: '0.5rem' }}>
                            (para control de aging CxC/CxP)
                        </span>
                    </label>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                            <input type="radio" checked={formData.isPaid} onChange={() => setFormData(p => ({ ...p, isPaid: true }))} />
                            <span style={{ color: '#10b981', fontWeight: 500 }}>✓ Cobrado/Pagado</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                            <input type="radio" checked={!formData.isPaid} onChange={() => setFormData(p => ({ ...p, isPaid: false }))} />
                            <span style={{ color: '#f59e0b', fontWeight: 500 }}>○ Pendiente</span>
                        </label>
                    </div>
                </div>
                {!formData.isPaid && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div className="form-group">
                            <label className="label">Fecha de Vencimiento</label>
                            <input type="date" className="input" value={formData.dueDate} onChange={e => setFormData(p => ({ ...p, dueDate: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="label">Días de Crédito</label>
                            <select className="input" value={formData.creditDays} onChange={e => setFormData(p => ({ ...p, creditDays: e.target.value }))}>
                                <option value="">—</option>
                                <option value="15">15 días</option>
                                <option value="30">30 días</option>
                                <option value="60">60 días</option>
                                <option value="90">90 días</option>
                            </select>
                        </div>
                    </div>
                )}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                    <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 2 }}>
                        {submitting ? 'Guardando...' : initialData ? 'Guardar Cambios' : 'Registrar'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function BulkResultModal({
    result,
    onClose,
}: {
    result: { successCount: number; failedCount: number; failed: { row: number; reason: string; data: any }[] };
    onClose: () => void;
}) {
    const downloadFailed = () => {
        const rows = result.failed.map(f =>
            `Fila ${f.row}\t${f.reason}\t${JSON.stringify(f.data)}`
        ).join('\n');
        const blob = new Blob([`Fila\tMotivo\tDatos\n${rows}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'filas_con_error.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Modal isOpen onClose={onClose} title="Resultado de Carga Masiva" size="md">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ textAlign: 'center', padding: '1.25rem', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#16a34a' }}>{result.successCount}</div>
                    <div style={{ fontSize: '0.875rem', color: '#166534', marginTop: '0.25rem' }}>Registradas exitosamente</div>
                </div>
                <div style={{ textAlign: 'center', padding: '1.25rem', background: result.failedCount > 0 ? '#fef2f2' : '#f0fdf4', borderRadius: '12px', border: `1px solid ${result.failedCount > 0 ? '#fecaca' : '#bbf7d0'}` }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: result.failedCount > 0 ? '#dc2626' : '#16a34a' }}>{result.failedCount}</div>
                    <div style={{ fontSize: '0.875rem', color: result.failedCount > 0 ? '#991b1b' : '#166534', marginTop: '0.25rem' }}>Con errores</div>
                </div>
            </div>

            {result.failed.length > 0 && (
                <>
                    <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9375rem', color: '#dc2626' }}>Filas con error</h4>
                        <button className="btn btn-ghost" style={{ fontSize: '0.8125rem' }} onClick={downloadFailed}>⬇ Descargar errores</button>
                    </div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', background: '#fef2f2', borderRadius: '8px', padding: '0.75rem' }}>
                        {result.failed.map((f, i) => (
                            <div key={i} style={{ fontSize: '0.8125rem', padding: '0.5rem 0', borderBottom: i < result.failed.length - 1 ? '1px solid #fecaca' : 'none' }}>
                                <span style={{ fontWeight: 700, color: '#dc2626' }}>Fila {f.row}:</span>{' '}
                                <span style={{ color: '#7f1d1d' }}>{f.reason}</span>
                                {f.data?.descripcion && <span style={{ color: '#94a3b8', marginLeft: '0.5rem' }}>({f.data.descripcion})</span>}
                            </div>
                        ))}
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.75rem' }}>
                        Corrige los errores y vuelve a subir solo las filas fallidas.
                    </p>
                </>
            )}

            <div style={{ marginTop: '1.5rem' }}>
                <button onClick={onClose} className="btn btn-primary" style={{ width: '100%' }}>Cerrar</button>
            </div>
        </Modal>
    );
}

function AnnulConfirmModal({
    transactionId,
    companyId,
    onClose,
    onSuccess,
    onError,
}: {
    transactionId: string;
    companyId: string;
    onClose: () => void;
    onSuccess: () => void;
    onError: (msg: string) => void;
}) {
    const [loading, setLoading] = useState(false);

    const handleAnnul = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/transactions/${transactionId}/annul`, {
                method: 'POST',
                headers: {
                    'x-company-id': companyId,
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            if (res.ok) {
                onSuccess();
            } else {
                const data = await res.json().catch(() => ({}));
                onError(data.error || 'Error al anular transacción');
            }
        } catch {
            onError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen onClose={onClose} title="Confirmar Anulación" size="sm">
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
                <p style={{ color: '#64748b', marginBottom: '2rem', lineHeight: 1.5 }}>
                    Esta acción marcará la transacción como anulada y generará una reversión en la contabilidad. <strong>No se puede deshacer.</strong>
                </p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                    <button onClick={handleAnnul} disabled={loading} className="btn btn-danger" style={{ flex: 1 }}>
                        {loading ? 'Anulando...' : 'Confirmar Anulación'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
