'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { PlusIcon } from '@/components/icons';
import { formatCurrency, formatDate } from '@/lib/formatting';

interface RecurringTx {
    id: string;
    type: 'INGRESO' | 'EGRESO';
    amount: number;
    description: string;
    frequency: string;
    dayOfMonth: number | null;
    cutoffDay: number | null;
    nextRunDate: string;
    startDate: string;
    endDate: string | null;
    isActive: boolean;
    notifyBefore: boolean;
    notifyOnDue: boolean;
    category: { id: string; name: string; icon: string; color: string } | null;
    client: { id: string; name: string } | null;
    _count: { transactions: number };
}

const FREQ_LABELS: Record<string, string> = {
    DAILY: 'Diario',
    WEEKLY: 'Semanal',
    MONTHLY: 'Mensual',
    QUARTERLY: 'Trimestral',
    ANNUAL: 'Anual',
};

const FREQ_COLORS: Record<string, string> = {
    DAILY: '#0891b2',
    WEEKLY: '#7c3aed',
    MONTHLY: '#2563eb',
    QUARTERLY: '#0f766e',
    ANNUAL: '#b45309',
};

export default function RecurringPage() {
    const { activeCompanyId, isLoading: companyLoading } = useCompany();
    const { showToast } = useToast();
    const [recurring, setRecurring] = useState<RecurringTx[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<RecurringTx | null>(null);
    const [executingId, setExecutingId] = useState<string | null>(null);

    const fetchRecurring = useCallback(async () => {
        if (!activeCompanyId) return;
        setLoading(true);
        try {
            const res = await fetch('/api/recurring-transactions', {
                headers: { 'x-company-id': activeCompanyId, 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (res.ok) {
                const data = await res.json();
                setRecurring(data.recurring || []);
            }
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [activeCompanyId]);

    useEffect(() => { fetchRecurring(); }, [fetchRecurring]);

    const handleToggleActive = async (item: RecurringTx) => {
        const res = await fetch(`/api/recurring-transactions/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-company-id': activeCompanyId!, 'X-Requested-With': 'XMLHttpRequest' },
            body: JSON.stringify({ isActive: !item.isActive }),
        });
        if (res.ok) {
            showToast(item.isActive ? 'Recurrente pausado' : 'Recurrente activado', 'success');
            fetchRecurring();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta plantilla? Las transacciones ya generadas no se afectan.')) return;
        const res = await fetch(`/api/recurring-transactions/${id}`, {
            method: 'DELETE',
            headers: { 'x-company-id': activeCompanyId!, 'X-Requested-With': 'XMLHttpRequest' },
        });
        if (res.ok) {
            showToast('Plantilla eliminada', 'success');
            fetchRecurring();
        }
    };

    const handleExecute = async (item: RecurringTx) => {
        setExecutingId(item.id);
        try {
            const res = await fetch(`/api/recurring-transactions/${item.id}`, {
                method: 'PATCH',
                headers: { 'x-company-id': activeCompanyId!, 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (res.ok) {
                const data = await res.json();
                showToast(`✓ Transacción generada. Próxima ejecución: ${formatDate(data.nextRunDate)}`, 'success');
                fetchRecurring();
            } else {
                const d = await res.json().catch(() => ({}));
                showToast(d.error || 'Error al ejecutar', 'error');
            }
        } catch { showToast('Error de conexión', 'error'); }
        finally { setExecutingId(null); }
    };

    const active = recurring.filter(r => r.isActive);
    const paused = recurring.filter(r => !r.isActive);

    if (companyLoading || (loading && !recurring.length && activeCompanyId)) {
        return (
            <div>
                <PageHeader title="Pagos Recurrentes" subtitle="Automatiza gastos e ingresos periódicos" />
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Cargando...</div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <PageHeader title="Pagos Recurrentes" subtitle={`${active.length} activos · ${paused.length} pausados`}>
                <button className="btn btn-primary" onClick={() => { setEditingItem(null); setShowForm(true); }} disabled={!activeCompanyId}>
                    <PlusIcon size={16} /> Nueva Plantilla
                </button>
            </PageHeader>

            {!activeCompanyId ? (
                <EmptyState icon="🏢" title="Sin empresa seleccionada" description="Selecciona una empresa para gestionar pagos recurrentes." />
            ) : recurring.length === 0 && !loading ? (
                <EmptyState
                    icon="🔄"
                    title="Sin pagos recurrentes"
                    description="Crea una plantilla para automatizar pagos de tarjeta, alquiler, servicios, etc."
                    actionLabel="Crear Plantilla"
                    onAction={() => setShowForm(true)}
                />
            ) : (
                <>
                    {/* Info banner */}
                    <div className="card" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: '1.5rem', padding: '1rem 1.25rem', fontSize: '0.875rem', color: '#1d4ed8' }}>
                        💡 <strong>Cómo funciona:</strong> Cada plantilla representa un pago periódico. El botón "▶ Ejecutar ahora" genera la transacción y avanza la fecha al siguiente período. El cron automático hará esto diariamente (PR4).
                    </div>

                    {/* Active */}
                    {active.length > 0 && (
                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ marginBottom: '1rem', color: '#1e293b' }}>Activos ({active.length})</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {active.map(item => (
                                    <RecurringCard key={item.id} item={item} onEdit={() => { setEditingItem(item); setShowForm(true); }}
                                        onToggle={() => handleToggleActive(item)} onDelete={() => handleDelete(item.id)}
                                        onExecute={() => handleExecute(item)} executing={executingId === item.id} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Paused */}
                    {paused.length > 0 && (
                        <div>
                            <h3 style={{ marginBottom: '1rem', color: '#94a3b8' }}>Pausados ({paused.length})</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {paused.map(item => (
                                    <RecurringCard key={item.id} item={item} onEdit={() => { setEditingItem(item); setShowForm(true); }}
                                        onToggle={() => handleToggleActive(item)} onDelete={() => handleDelete(item.id)}
                                        onExecute={() => handleExecute(item)} executing={executingId === item.id} />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {showForm && activeCompanyId && (
                <RecurringFormModal
                    companyId={activeCompanyId}
                    initialData={editingItem}
                    onClose={() => { setShowForm(false); setEditingItem(null); }}
                    onSuccess={(msg) => { showToast(msg, 'success'); setShowForm(false); setEditingItem(null); fetchRecurring(); }}
                    onError={(msg) => showToast(msg, 'error')}
                />
            )}
        </div>
    );
}

function RecurringCard({ item, onEdit, onToggle, onDelete, onExecute, executing }: {
    item: RecurringTx;
    onEdit: () => void;
    onToggle: () => void;
    onDelete: () => void;
    onExecute: () => void;
    executing: boolean;
}) {
    const freqColor = FREQ_COLORS[item.frequency] || '#64748b';
    const isOverdue = new Date(item.nextRunDate) < new Date();
    return (
        <div className="card" style={{ padding: '1rem 1.25rem', opacity: item.isActive ? 1 : 0.6, borderLeft: `4px solid ${item.type === 'INGRESO' ? '#10b981' : '#ef4444'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'center', minWidth: '52px' }}>
                        <div style={{ fontSize: '1.5rem' }}>{item.category?.icon || (item.type === 'INGRESO' ? '💰' : '💸')}</div>
                        <div style={{ fontSize: '0.625rem', fontWeight: 700, color: freqColor, textTransform: 'uppercase' }}>{FREQ_LABELS[item.frequency]}</div>
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9375rem' }}>{item.description}</div>
                        <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.15rem' }}>
                            {item.category?.name && <span style={{ marginRight: '0.75rem' }}>{item.category.name}</span>}
                            {item.client?.name && <span>· {item.client.name}</span>}
                            {item.dayOfMonth && <span style={{ marginLeft: '0.5rem' }}>· Día {item.dayOfMonth}</span>}
                            {item._count.transactions > 0 && <span style={{ marginLeft: '0.5rem', color: '#10b981' }}>· {item._count.transactions} generadas</span>}
                        </div>
                        <div style={{ fontSize: '0.8125rem', marginTop: '0.2rem', color: isOverdue ? '#dc2626' : '#64748b' }}>
                            {isOverdue ? '⚠ Vencida · ' : ''}Próxima: {formatDate(item.nextRunDate)}
                            {item.notifyBefore && <span style={{ marginLeft: '0.75rem', color: '#2563eb' }}>🔔 recordatorio</span>}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: item.type === 'INGRESO' ? '#10b981' : '#ef4444' }}>
                            {item.type === 'EGRESO' ? '-' : '+'}{formatCurrency(item.amount)}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-primary" style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem' }}
                            onClick={onExecute} disabled={executing || !item.isActive} title="Generar transacción ahora">
                            {executing ? '...' : '▶ Ejecutar'}
                        </button>
                        <button className="btn btn-ghost" style={{ fontSize: '0.8125rem' }} onClick={onEdit}>Editar</button>
                        <button className="btn btn-ghost" style={{ fontSize: '0.8125rem', color: item.isActive ? '#f59e0b' : '#10b981' }} onClick={onToggle}>
                            {item.isActive ? '⏸ Pausar' : '▶ Activar'}
                        </button>
                        <button className="btn btn-ghost" style={{ fontSize: '0.8125rem', color: '#dc2626' }} onClick={onDelete}>✕</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RecurringFormModal({ companyId, initialData, onClose, onSuccess, onError }: {
    companyId: string;
    initialData: RecurringTx | null;
    onClose: () => void;
    onSuccess: (msg: string) => void;
    onError: (msg: string) => void;
}) {
    const [categories, setCategories] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        type: initialData?.type || 'EGRESO',
        amount: initialData?.amount.toString() || '',
        description: initialData?.description || '',
        frequency: initialData?.frequency || 'MONTHLY',
        dayOfMonth: initialData?.dayOfMonth?.toString() || '',
        cutoffDay: initialData?.cutoffDay?.toString() || '',
        startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : '',
        categoryId: initialData?.category?.id || '',
        clientId: initialData?.client?.id || '',
        notifyBefore: initialData?.notifyBefore !== false,
        notifyOnDue: initialData?.notifyOnDue !== false,
    });

    useEffect(() => {
        Promise.all([
            fetch(`/api/categories?type=${form.type}`, { headers: { 'x-company-id': companyId, 'X-Requested-With': 'XMLHttpRequest' } }),
            fetch('/api/clients', { headers: { 'x-company-id': companyId, 'X-Requested-With': 'XMLHttpRequest' } }),
        ]).then(async ([catsRes, clientsRes]) => {
            if (catsRes.ok) { const d = await catsRes.json(); setCategories(d.categories || []); }
            if (clientsRes.ok) { const d = await clientsRes.json(); setClients(d.clients || []); }
        });
    }, [companyId, form.type]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.amount || parseFloat(form.amount) <= 0) { onError('El monto debe ser mayor a 0'); return; }
        setSubmitting(true);
        try {
            const url = initialData ? `/api/recurring-transactions/${initialData.id}` : '/api/recurring-transactions';
            const method = initialData ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'x-company-id': companyId, 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                onSuccess(initialData ? 'Plantilla actualizada' : 'Plantilla creada correctamente');
            } else {
                const d = await res.json().catch(() => ({}));
                onError(d.error || 'Error al guardar');
            }
        } catch { onError('Error de conexión'); }
        finally { setSubmitting(false); }
    };

    const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

    return (
        <Modal isOpen onClose={onClose} title={initialData ? 'Editar Plantilla Recurrente' : 'Nueva Plantilla Recurrente'} size="md">
            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                        <label className="label">Tipo</label>
                        <select className="input" value={form.type} onChange={e => set('type', e.target.value)} disabled={!!initialData}>
                            <option value="EGRESO">Egreso (Gasto)</option>
                            <option value="INGRESO">Ingreso</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="label">Monto (USD)</label>
                        <input type="number" className="input" step="0.01" min="0.01" required value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" />
                    </div>
                </div>

                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label className="label">Descripción</label>
                    <input type="text" className="input" required value={form.description} onChange={e => set('description', e.target.value)} placeholder="Ej: Alquiler oficina, Tarjeta Visa, Suscripción..." />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <div className="form-group">
                        <label className="label">Frecuencia</label>
                        <select className="input" value={form.frequency} onChange={e => set('frequency', e.target.value)}>
                            <option value="DAILY">Diario</option>
                            <option value="WEEKLY">Semanal</option>
                            <option value="MONTHLY">Mensual</option>
                            <option value="QUARTERLY">Trimestral</option>
                            <option value="ANNUAL">Anual</option>
                        </select>
                    </div>
                    {(form.frequency === 'MONTHLY' || form.frequency === 'QUARTERLY' || form.frequency === 'ANNUAL') && (
                        <div className="form-group">
                            <label className="label">Día del mes (pago)</label>
                            <input type="number" className="input" min="1" max="31" value={form.dayOfMonth} onChange={e => set('dayOfMonth', e.target.value)} placeholder="Ej: 5" />
                        </div>
                    )}
                </div>

                {form.frequency === 'MONTHLY' && (
                    <div className="form-group" style={{ marginTop: '0.75rem' }}>
                        <label className="label">Día de corte (tarjeta de crédito, opcional)</label>
                        <input type="number" className="input" min="1" max="31" value={form.cutoffDay} onChange={e => set('cutoffDay', e.target.value)} placeholder="Ej: 25" />
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <div className="form-group">
                        <label className="label">Categoría</label>
                        <select className="input" value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
                            <option value="">Sin categoría</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="label">Proveedor / Cliente</label>
                        <select className="input" value={form.clientId} onChange={e => set('clientId', e.target.value)}>
                            <option value="">Sin asignar</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <div className="form-group">
                        <label className="label">Fecha inicio</label>
                        <input type="date" className="input" required value={form.startDate} onChange={e => set('startDate', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="label">Fecha fin (opcional)</label>
                        <input type="date" className="input" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                        <input type="checkbox" checked={form.notifyBefore} onChange={e => set('notifyBefore', e.target.checked)} />
                        🔔 Avisar un día antes por Telegram
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                        <input type="checkbox" checked={form.notifyOnDue} onChange={e => set('notifyOnDue', e.target.checked)} />
                        🔔 Avisar el día del pago
                    </label>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                    <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 2 }}>
                        {submitting ? 'Guardando...' : initialData ? 'Guardar cambios' : 'Crear Plantilla'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
