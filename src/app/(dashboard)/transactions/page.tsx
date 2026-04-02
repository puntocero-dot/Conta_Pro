'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { useFilter } from '@/context/FilterContext';
import { useToast } from '@/context/ToastContext';
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
    status: 'ACTIVE' | 'ANNULLED' | 'CORRECTED';
    clientId?: string;
    category: {
        name: string;
        icon: string;
        color: string;
    };
}

export default function TransactionsPage() {
    const { activeCompanyId, isLoading: companyLoading } = useCompany();
    const { startDate, endDate } = useFilter();
    const { showToast } = useToast();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    const [filter, setFilter] = useState<'ALL' | 'INGRESO' | 'EGRESO'>('ALL');
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [annullingId, setAnnullingId] = useState<string | null>(null);

    const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeCompanyId) return;

        const { parseCSV, MAPPINGS } = await import('@/lib/csv-helper');
        try {
            const data = await parseCSV<any>(file, MAPPINGS.TRANSACTION);
            if (data.length === 0) return;

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
                showToast(`Se cargaron ${result.count} transacciones correctamente`, 'success');
                fetchTransactions();
            } else {
                showToast('Error en la carga masiva', 'error');
            }
        } catch (error) {
            showToast('Error al procesar el archivo CSV', 'error');
        }
    };

    const fetchTransactions = useCallback(async () => {
        if (!activeCompanyId) return;
        setLoading(true);
        try {
            const url = `/api/transactions?startDate=${startDate}&endDate=${endDate}&limit=200`;
            const response = await fetch(url, {
                headers: {
                    'x-company-id': activeCompanyId,
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            if (response.ok) {
                const data = await response.json();
                setTransactions(data.transactions || []);
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
            setLoading(false);
        }
    }, [activeCompanyId, startDate, endDate, fetchTransactions]);

    const filteredTransactions = transactions.filter(t =>
        filter === 'ALL' || t.type === filter
    );

    const totalIngresos = transactions.filter(t => t.type === 'INGRESO').reduce((s, t) => s + t.amount, 0);
    const totalEgresos = transactions.filter(t => t.type === 'EGRESO').reduce((s, t) => s + t.amount, 0);
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
                subtitle={transactions.length > 0 ? `${transactions.length} operaciones en el período` : 'Historial financiero y control de caja'}
            >
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                        📁 Carga Masiva
                        <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleBulkImport} />
                    </label>
                    <button
                        onClick={() => setShowNewModal(true)}
                        className="btn btn-primary"
                        disabled={!activeCompanyId}
                    >
                        <PlusIcon size={16} /> Nueva Transacción
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

                    {/* Filters */}
                    <div className={styles.filtersRow}>
                        <FilterBar
                            options={[
                                { value: 'ALL', label: 'Todas' },
                                { value: 'INGRESO', label: 'Ingresos' },
                                { value: 'EGRESO', label: 'Egresos' },
                            ]}
                            value={filter}
                            onChange={(v) => setFilter(v as 'ALL' | 'INGRESO' | 'EGRESO')}
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
                                        </h4>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <span className={styles.transactionCategory}>{transaction.category?.name || 'General'}</span>
                                            <span style={{ color: '#cbd5e1' }}>•</span>
                                            <span className={styles.transactionDate}>
                                                {formatDate(transaction.date)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`${styles.transactionAmount} ${transaction.type === 'INGRESO' ? styles.amountIncome : styles.amountExpense} ${transaction.status === 'ANNULLED' ? styles.statusAnnulled : ''}`}>
                                        {transaction.type === 'INGRESO' ? '+' : '-'}{formatCurrency(transaction.amount ?? 0)}
                                    </div>
                                    <div className={styles.actionBtn}>
                                        <button
                                            onClick={() => setEditingTransaction(transaction)}
                                            className="btn btn-ghost"
                                            title="Corregir"
                                            disabled={transaction.status === 'ANNULLED'}
                                        >
                                            <PencilIcon size={15} />
                                        </button>
                                        <button
                                            onClick={() => setAnnullingId(transaction.id)}
                                            className="btn btn-ghost"
                                            title="Anular"
                                            style={{ color: '#ef4444' }}
                                            disabled={transaction.status === 'ANNULLED'}
                                        >
                                            <XIcon size={15} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
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
    const [formData, setFormData] = useState({
        type: initialData?.type || ('INGRESO' as 'INGRESO' | 'EGRESO'),
        amount: initialData?.amount.toString() || '',
        description: initialData?.description || '',
        date: initialData?.date
            ? new Date(initialData.date).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
        categoryId: (initialData as any)?.categoryId || '',
        clientId: initialData?.clientId || '',
    });
    const [clients, setClients] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const res = await fetch('/api/clients', {
                    headers: { 'x-company-id': companyId, 'X-Requested-With': 'XMLHttpRequest' },
                });
                if (res.ok) {
                    const data = await res.json();
                    const targetRole = formData.type === 'INGRESO' ? 'CLIENT' : 'SUPPLIER';
                    setClients(data.clients.filter((c: any) => c.role === targetRole || c.role === 'BOTH'));
                }
            } catch (e) {
                console.error('Error fetching clients', e);
            }
        };
        fetchClients();
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
                body: JSON.stringify({ ...formData, amount }),
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
                <div className="form-group">
                    <label className="label">Fecha</label>
                    <input type="date" className="input" required value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} />
                </div>
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
