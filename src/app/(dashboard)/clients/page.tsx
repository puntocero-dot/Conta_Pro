'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonStatsGrid, SkeletonTable } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/formatting';
import styles from './clients.module.css';

interface Client {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    nit?: string;
    dui?: string;
    address?: string;
    type: 'INDIVIDUAL' | 'COMPANY';
    role: 'CLIENT' | 'SUPPLIER' | 'BOTH';
    balance?: number;
}

export default function ClientsPage() {
    const { activeCompanyId, isLoading: companyLoading } = useCompany();
    const { showToast } = useToast();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    const [filter, setFilter] = useState<'ALL' | 'INDIVIDUAL' | 'COMPANY'>('ALL');
    const [roleFilter, setRoleFilter] = useState<'ALL' | 'CLIENT' | 'SUPPLIER' | 'BOTH'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [deletingClient, setDeletingClient] = useState<Client | null>(null);

    const fetchClients = useCallback(async () => {
        if (!activeCompanyId) return;
        setLoading(true);
        try {
            const url = roleFilter === 'ALL' ? '/api/clients' : `/api/clients?role=${roleFilter}`;
            const response = await fetch(url, {
                headers: {
                    'x-company-id': activeCompanyId,
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            if (response.ok) {
                const data = await response.json();
                setClients(data.clients || []);
            }
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    }, [activeCompanyId, roleFilter]);

    useEffect(() => {
        if (activeCompanyId) {
            fetchClients();
        } else {
            setClients([]);
            setLoading(false);
        }
    }, [activeCompanyId, fetchClients]);

    const filteredClients = clients.filter(c => {
        const matchesType = filter === 'ALL' || c.type === filter;
        const matchesSearch = !searchTerm ||
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesType && matchesSearch;
    });

    const totalBalance = clients.reduce((sum, c) => sum + (c.balance ?? 0), 0);

    const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeCompanyId) return;

        const { parseCSV, MAPPINGS } = await import('@/lib/csv-helper');
        try {
            const data = await parseCSV<any>(file, MAPPINGS.CLIENT);
            if (data.length === 0) return;

            const res = await fetch('/api/clients/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-company-id': activeCompanyId,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ clients: data }),
            });

            if (res.ok) {
                const result = await res.json();
                showToast(`Se cargaron ${result.count} contactos correctamente`, 'success');
                fetchClients();
            } else {
                showToast('Error en la carga masiva', 'error');
            }
        } catch (error) {
            showToast('Error al procesar el archivo CSV', 'error');
        }
    };

    if (companyLoading || (loading && clients.length === 0 && activeCompanyId)) {
        return (
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                    <div><h1>Clientes</h1><p>Gestión de cartera y contactos</p></div>
                </div>
                <SkeletonStatsGrid count={3} />
                <div style={{ marginTop: '1.5rem' }}><SkeletonTable rows={5} cols={4} /></div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.25rem' }}>Clientes</h1>
                    <p>Gestión de cartera y contactos</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                        📁 Carga Masiva
                        <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleBulkImport} />
                    </label>
                    <button onClick={() => setShowNewModal(true)} className="btn btn-primary" disabled={!activeCompanyId}>
                        <span style={{ fontSize: '1.2rem' }}>+</span> Nuevo Cliente
                    </button>
                </div>
            </div>

            {!activeCompanyId ? (
                <EmptyState
                    icon="🏢"
                    title="Sin empresa seleccionada"
                    description="Selecciona una empresa en el panel lateral para gestionar sus clientes y proveedores."
                />
            ) : (
                <>
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>👥</div>
                            <div className={styles.statInfo}><p>Total Contactos</p><h3>{clients.length}</h3></div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>🏢</div>
                            <div className={styles.statInfo}><p>Proveedores</p><h3>{clients.filter(c => c.role === 'SUPPLIER' || c.role === 'BOTH').length}</h3></div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>💰</div>
                            <div className={styles.statInfo}><p>Saldo Pendiente</p><h3>{formatCurrency(totalBalance)}</h3></div>
                        </div>
                    </div>

                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <div className={styles.filters}>
                                {(['ALL', 'INDIVIDUAL', 'COMPANY'] as const).map(f => (
                                    <button key={f} className={filter === f ? styles.filterActive : styles.filterBtn} onClick={() => setFilter(f)}>
                                        {f === 'ALL' ? 'Todos' : f === 'INDIVIDUAL' ? 'Personas' : 'Empresas'}
                                    </button>
                                ))}
                            </div>
                            <div className={styles.filters}>
                                {(['ALL', 'CLIENT', 'SUPPLIER', 'BOTH'] as const).map(r => (
                                    <button key={r} className={roleFilter === r ? styles.filterActive : styles.filterBtn} onClick={() => setRoleFilter(r)}>
                                        {r === 'ALL' ? 'Todos los roles' : r === 'CLIENT' ? 'Clientes' : r === 'SUPPLIER' ? 'Proveedores' : 'Ambos'}
                                    </button>
                                ))}
                            </div>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    className="input"
                                    style={{ width: '220px', paddingLeft: '2.25rem' }}
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                                <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>🔍</span>
                            </div>
                        </div>

                        <div className={styles.clientsList}>
                            {filteredClients.length === 0 ? (
                                <EmptyState
                                    icon="👤"
                                    title="Sin resultados"
                                    description={clients.length === 0 ? 'Aún no has registrado clientes o proveedores.' : 'No se encontraron contactos para este filtro.'}
                                    actionLabel={clients.length === 0 ? 'Crear Primer Contacto' : undefined}
                                    onAction={clients.length === 0 ? () => setShowNewModal(true) : undefined}
                                />
                            ) : (
                                filteredClients.map(client => (
                                    <div key={client.id} className={styles.clientCard}>
                                        <div className={styles.clientAvatar}>
                                            {client.type === 'COMPANY' ? '🏢' : '👤'}
                                        </div>
                                        <div className={styles.clientInfo}>
                                            <h4>{client.name}</h4>
                                            <div className={styles.clientDetails}>
                                                {client.email && <span>✉️ {client.email}</span>}
                                                {client.phone && <span>📞 {client.phone}</span>}
                                                <span className={styles.roleBadge}>{client.role === 'CLIENT' ? 'Cliente' : client.role === 'SUPPLIER' ? 'Proveedor' : 'Ambos'}</span>
                                            </div>
                                        </div>
                                        <div className={styles.clientBalance}>
                                            <p>Saldo</p>
                                            <h4 className={(client.balance ?? 0) > 0 ? styles.positive : ''}>{formatCurrency(client.balance ?? 0)}</h4>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <button 
                                                className="btn btn-ghost" 
                                                style={{ fontSize: '1.25rem', padding: '0.25rem 0.5rem' }} 
                                                aria-label="Opciones"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMenuId(activeMenuId === client.id ? null : client.id);
                                                }}
                                            >
                                                ⋮
                                            </button>
                                            
                                            {activeMenuId === client.id && (
                                                <div className={styles.dropdownMenu}>
                                                    <button onClick={() => { setEditingClient(client); setActiveMenuId(null); }}>✏️ Editar</button>
                                                    <button 
                                                        className={styles.deleteOption} 
                                                        onClick={() => { setDeletingClient(client); setActiveMenuId(null); }}
                                                    >
                                                        🗑️ Eliminar
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Click-away listener for dropdown */}
            {activeMenuId && (
                <div 
                    style={{ position: 'fixed', inset: 0, zIndex: 40 }} 
                    onClick={() => setActiveMenuId(null)} 
                />
            )}

            {showNewModal && activeCompanyId && (
                <NewClientModal
                    companyId={activeCompanyId}
                    onClose={() => setShowNewModal(false)}
                    onSuccess={() => {
                        setShowNewModal(false);
                        fetchClients();
                        showToast('Contacto registrado correctamente', 'success');
                    }}
                    onError={msg => showToast(msg, 'error')}
                />
            )}

            {editingClient && activeCompanyId && (
                <EditClientModal
                    client={editingClient}
                    companyId={activeCompanyId}
                    onClose={() => setEditingClient(null)}
                    onSuccess={() => {
                        setEditingClient(null);
                        fetchClients();
                        showToast('Contacto actualizado', 'success');
                    }}
                    onError={msg => showToast(msg, 'error')}
                />
            )}

            {deletingClient && (
                <Modal 
                    isOpen={true} 
                    onClose={() => setDeletingClient(null)} 
                    title="Confirmar Eliminación"
                    size="sm"
                >
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                        <p style={{ marginBottom: '1.5rem', opacity: 0.8 }}>
                            ¿Estás seguro que deseas eliminar a <strong>{deletingClient.name}</strong>? 
                            Esta acción no se puede deshacer.
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeletingClient(null)}>Cancelar</button>
                            <button 
                                className="btn btn-error" 
                                style={{ flex: 1, backgroundColor: 'var(--error)', color: 'white' }}
                                onClick={async () => {
                                    try {
                                        const res = await fetch(`/api/clients/${deletingClient.id}`, { 
                                            method: 'DELETE',
                                            headers: {
                                                'x-company-id': activeCompanyId!,
                                                'X-Requested-With': 'XMLHttpRequest'
                                            }
                                        });
                                        if (res.ok) {
                                            setDeletingClient(null);
                                            fetchClients();
                                            showToast('Contacto eliminado', 'success');
                                        } else {
                                            showToast('Error al eliminar contacto', 'error');
                                        }
                                    } catch {
                                        showToast('Error de conexión', 'error');
                                    }
                                }}
                            >
                                Sí, Eliminar
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

function EditClientModal({
    client,
    companyId,
    onClose,
    onSuccess,
    onError,
}: {
    client: Client;
    companyId: string;
    onClose: () => void;
    onSuccess: () => void;
    onError: (msg: string) => void;
}) {
    const [formData, setFormData] = useState({
        type: client.type,
        name: client.name,
        email: client.email || '',
        phone: client.phone || '',
        nit: client.nit || '',
        dui: client.dui || '',
        address: client.address || '',
        role: client.role,
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(`/api/clients/${client.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-company-id': companyId,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                onSuccess();
            } else {
                const data = await res.json().catch(() => ({}));
                onError(data.error || 'Error al actualizar cliente');
            }
        } catch {
            onError('Error de conexión');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen onClose={onClose} title="Editar Contacto" size="md">
            <form onSubmit={handleSubmit}>
                <div className={styles.typeButtons} style={{ marginBottom: '1.25rem' }}>
                    <button type="button" className={formData.type === 'INDIVIDUAL' ? styles.typeActive : ''} onClick={() => setFormData(p => ({ ...p, type: 'INDIVIDUAL' }))}>👤 Persona Natural</button>
                    <button type="button" className={formData.type === 'COMPANY' ? styles.typeActive : ''} onClick={() => setFormData(p => ({ ...p, type: 'COMPANY' }))}>🏢 Empresa</button>
                </div>

                <div className="form-group">
                    <label className="label">Función en el Negocio</label>
                    <select className="input" value={formData.role} onChange={e => setFormData(p => ({ ...p, role: e.target.value as any }))}>
                        <option value="CLIENT">Cliente (recibo pagos)</option>
                        <option value="SUPPLIER">Proveedor (realizo pagos)</option>
                        <option value="BOTH">Ambos</option>
                    </select>
                </div>

                <div className="form-group">
                    <label className="label">Nombre o Razón Social</label>
                    <input type="text" required className="input" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Juan Pérez / Empresa S.A." />
                </div>

                <div className={styles.formRow}>
                    <div className="form-group">
                        <label className="label">Correo</label>
                        <input type="email" className="input" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="correo@ejemplo.com" />
                    </div>
                    <div className="form-group">
                        <label className="label">Teléfono</label>
                        <input type="tel" className="input" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="7222-6244" />
                    </div>
                </div>

                <div className="form-group">
                    <label className="label">{formData.type === 'INDIVIDUAL' ? 'DUI' : 'NIT'}</label>
                    {formData.type === 'INDIVIDUAL' ? (
                        <input type="text" className="input" value={formData.dui} onChange={e => setFormData(p => ({ ...p, dui: e.target.value }))} placeholder="01234567-8" maxLength={10} />
                    ) : (
                        <input type="text" className="input" value={formData.nit} onChange={e => setFormData(p => ({ ...p, nit: e.target.value }))} placeholder="0614-210188-101-2" />
                    )}
                </div>

                <div className="form-group">
                    <label className="label">Dirección</label>
                    <textarea className="input" value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} placeholder="Calle Principal #123, San Salvador" rows={2} />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                    <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 2 }}>
                        {submitting ? 'Guardar Cambios...' : 'Actualizar Contacto'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function NewClientModal({
    companyId,
    onClose,
    onSuccess,
    onError,
}: {
    companyId: string;
    onClose: () => void;
    onSuccess: () => void;
    onError: (msg: string) => void;
}) {
    const [formData, setFormData] = useState({
        type: 'INDIVIDUAL' as 'INDIVIDUAL' | 'COMPANY',
        name: '',
        email: '',
        phone: '',
        nit: '',
        dui: '',
        address: '',
        role: 'CLIENT' as 'CLIENT' | 'SUPPLIER' | 'BOTH',
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/clients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-company-id': companyId,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                onSuccess();
            } else {
                const data = await res.json().catch(() => ({}));
                onError(data.error || 'Error al crear cliente');
            }
        } catch {
            onError('Error de conexión');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen onClose={onClose} title="Registrar Nuevo Contacto" size="md">
            <form onSubmit={handleSubmit}>
                <div className={styles.typeButtons} style={{ marginBottom: '1.25rem' }}>
                    <button type="button" className={formData.type === 'INDIVIDUAL' ? styles.typeActive : ''} onClick={() => setFormData(p => ({ ...p, type: 'INDIVIDUAL' }))}>👤 Persona Natural</button>
                    <button type="button" className={formData.type === 'COMPANY' ? styles.typeActive : ''} onClick={() => setFormData(p => ({ ...p, type: 'COMPANY' }))}>🏢 Empresa</button>
                </div>

                <div className="form-group">
                    <label className="label">Función en el Negocio</label>
                    <select className="input" value={formData.role} onChange={e => setFormData(p => ({ ...p, role: e.target.value as any }))}>
                        <option value="CLIENT">Cliente (recibo pagos)</option>
                        <option value="SUPPLIER">Proveedor (realizo pagos)</option>
                        <option value="BOTH">Ambos</option>
                    </select>
                </div>

                <div className="form-group">
                    <label className="label">Nombre o Razón Social</label>
                    <input type="text" required className="input" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Juan Pérez / Empresa S.A." />
                </div>

                <div className={styles.formRow}>
                    <div className="form-group">
                        <label className="label">Correo</label>
                        <input type="email" className="input" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="correo@ejemplo.com" />
                    </div>
                    <div className="form-group">
                        <label className="label">Teléfono</label>
                        <input type="tel" className="input" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="7222-6244" />
                    </div>
                </div>

                <div className="form-group">
                    <label className="label">{formData.type === 'INDIVIDUAL' ? 'DUI' : 'NIT'}</label>
                    {formData.type === 'INDIVIDUAL' ? (
                        <input type="text" className="input" value={formData.dui} onChange={e => setFormData(p => ({ ...p, dui: e.target.value }))} placeholder="01234567-8" maxLength={10} />
                    ) : (
                        <input type="text" className="input" value={formData.nit} onChange={e => setFormData(p => ({ ...p, nit: e.target.value }))} placeholder="0614-210188-101-2" />
                    )}
                </div>

                <div className="form-group">
                    <label className="label">Dirección</label>
                    <textarea className="input" value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} placeholder="Calle Principal #123, San Salvador" rows={2} />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                    <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 2 }}>
                        {submitting ? 'Registrando...' : 'Finalizar Registro'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
