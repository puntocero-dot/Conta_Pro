'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/context/CompanyContext';
import styles from './transactions.module.css';

interface Transaction {
    id: string;
    type: 'INGRESO' | 'EGRESO';
    amount: number;
    description: string;
    date: string;
    category: {
        name: string;
        icon: string;
        color: string;
    };
}

export default function TransactionsPage() {
    const { user, loading: authLoading } = useAuth();
    const { activeCompanyId, isLoading: companyLoading } = useCompany();
    const router = useRouter();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    const [filter, setFilter] = useState<'ALL' | 'INGRESO' | 'EGRESO'>('ALL');

    const fetchTransactions = useCallback(async () => {
        if (!activeCompanyId) return;
        setLoading(true);
        try {
            const response = await fetch('/api/transactions', {
                headers: {
                    'x-company-id': activeCompanyId
                }
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
    }, [activeCompanyId]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (activeCompanyId) {
            fetchTransactions();
        } else {
            setTransactions([]);
            setLoading(false);
        }
    }, [activeCompanyId, fetchTransactions]);

    const filteredTransactions = transactions.filter(t =>
        filter === 'ALL' || t.type === filter
    );

    const totalIngresos = transactions
        .filter(t => t.type === 'INGRESO')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalEgresos = transactions
        .filter(t => t.type === 'EGRESO')
        .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIngresos - totalEgresos;

    if (authLoading || companyLoading || (loading && transactions.length === 0)) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Cargando transacciones...</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                <div>
                    <h1>Transacciones</h1>
                    <p>Historial financiero y control de caja</p>
                </div>
                <button
                    onClick={() => setShowNewModal(true)}
                    className="btn btn-primary"
                    disabled={!activeCompanyId}
                >
                    <span style={{ fontSize: '1.2rem' }}>+</span> Nueva Transacción
                </button>
            </div>

            {!activeCompanyId && (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', border: '1px dashed #cbd5e1' }}>
                    <p>Selecciona una empresa en el panel lateral para ver sus transacciones.</p>
                </div>
            )}

            {activeCompanyId && (
                <>
                    {/* Stats Cards */}
                    <div className={styles.statsGrid}>
                        <div className={`${styles.statCard} ${styles.income}`}>
                            <div className={styles.statIcon}>📈</div>
                            <div className={styles.statContent}>
                                <p className={styles.statLabel}>Ingresos</p>
                                <h3 className={styles.statValue}>${totalIngresos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h3>
                            </div>
                        </div>

                        <div className={`${styles.statCard} ${styles.expense}`}>
                            <div className={styles.statIcon}>📉</div>
                            <div className={styles.statContent}>
                                <p className={styles.statLabel}>Egresos</p>
                                <h3 className={styles.statValue}>${totalEgresos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h3>
                            </div>
                        </div>

                        <div className={`${styles.statCard} ${balance >= 0 ? styles.positive : styles.negative}`}>
                            <div className={styles.statIcon}>{balance >= 0 ? '✅' : '⚠️'}</div>
                            <div className={styles.statContent}>
                                <p className={styles.statLabel}>Balance Neto</p>
                                <h3 className={styles.statValue}>${balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h3>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className={styles.filters}>
                        <button
                            className={filter === 'ALL' ? styles.filterActive : styles.filterBtn}
                            onClick={() => setFilter('ALL')}
                        >
                            Todas
                        </button>
                        <button
                            className={filter === 'INGRESO' ? styles.filterActive : styles.filterBtn}
                            onClick={() => setFilter('INGRESO')}
                        >
                            Ingresos
                        </button>
                        <button
                            className={filter === 'EGRESO' ? styles.filterActive : styles.filterBtn}
                            onClick={() => setFilter('EGRESO')}
                        >
                            Egresos
                        </button>
                    </div>

                    {/* Transactions List */}
                    <div className={styles.transactionsList}>
                        {filteredTransactions.length === 0 ? (
                            <div className="card" style={{ textAlign: 'center', padding: '5rem 2rem', border: 'none' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1.5rem', opacity: 0.5 }}>📭</div>
                                <h3>Sin transacciones</h3>
                                <p style={{ color: '#64748b', marginBottom: '2rem' }}>No se encontraron registros para este filtro.</p>
                                <button
                                    onClick={() => setShowNewModal(true)}
                                    className="btn btn-secondary"
                                    disabled={!activeCompanyId}
                                >
                                    Crear Transacción
                                </button>
                            </div>
                        ) : (
                            filteredTransactions.map(transaction => (
                                <div key={transaction.id} className={styles.transactionCard}>
                                    <div className={styles.transactionIcon} style={{ background: transaction.category?.color || '#f1f5f9' }}>
                                        {transaction.category?.icon || '💰'}
                                    </div>
                                    <div className={styles.transactionInfo}>
                                        <h4>{transaction.description}</h4>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <span className={styles.transactionCategory}>{transaction.category?.name || 'General'}</span>
                                            <span style={{ color: '#cbd5e1' }}>•</span>
                                            <span className={styles.transactionDate}>
                                                {new Date(transaction.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`${styles.transactionAmount} ${transaction.type === 'INGRESO' ? styles.amountIncome : styles.amountExpense}`}>
                                        {transaction.type === 'INGRESO' ? '+' : '-'}
                                        ${transaction.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* New Transaction Modal */}
            {showNewModal && activeCompanyId && (
                <NewTransactionModal
                    companyId={activeCompanyId}
                    onClose={() => setShowNewModal(false)}
                    onSuccess={() => {
                        setShowNewModal(false);
                        fetchTransactions();
                    }}
                />
            )}
        </div>
    );
}

function NewTransactionModal({
    companyId,
    onClose,
    onSuccess
}: {
    companyId: string;
    onClose: () => void;
    onSuccess: () => void
}) {
    const [formData, setFormData] = useState({
        type: 'INGRESO' as 'INGRESO' | 'EGRESO',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        categoryId: '',
        clientId: '',
    });
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const response = await fetch('/api/clients', {
                    headers: { 'x-company-id': companyId }
                });
                if (response.ok) {
                    const data = await response.json();
                    setClients(data.clients || []);
                }
            } catch (error) {
                console.error('Error fetching clients:', error);
            }
        };
        fetchClients();
    }, [companyId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-company-id': companyId
                },
                body: JSON.stringify({
                    ...formData,
                    amount: parseFloat(formData.amount),
                }),
            });

            if (response.ok) {
                onSuccess();
            } else {
                alert('Error al crear transacción');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3 style={{ margin: 0 }}>Nueva Transacción</h3>
                    <button onClick={onClose} className={styles.closeBtn}>✕</button>
                </div>

                <form onSubmit={handleSubmit} className={styles.modalForm}>
                    <div className="form-group">
                        <label className="label">Tipo de Movimiento</label>
                        <div className={styles.typeButtons}>
                            <button
                                type="button"
                                className={formData.type === 'INGRESO' ? styles.typeActive : ''}
                                onClick={() => setFormData({ ...formData, type: 'INGRESO' })}
                            >
                                📈 Ingreso
                            </button>
                            <button
                                type="button"
                                className={formData.type === 'EGRESO' ? styles.typeActive : ''}
                                onClick={() => setFormData({ ...formData, type: 'EGRESO' })}
                            >
                                📉 Egreso
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="label">Monto (USD)</label>
                        <input
                            type="number"
                            className="input"
                            step="0.01"
                            required
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            placeholder="0.00"
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">Cliente / Entidad (Opcional)</label>
                        <select
                            className="input"
                            value={formData.clientId}
                            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                        >
                            <option value="">Seleccionar entidad...</option>
                            {clients.map(client => (
                                <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="label">Descripción</label>
                        <input
                            type="text"
                            className="input"
                            required
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Ej: Cobro factura #123"
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">Fecha</label>
                        <input
                            type="date"
                            className="input"
                            required
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
                            Cerrar
                        </button>
                        <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 2 }}>
                            {loading ? 'Guardando...' : 'Registrar Movimiento'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
