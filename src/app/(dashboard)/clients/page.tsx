'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
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
    balance: number;
}

export default function ClientsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    const [filter, setFilter] = useState<'ALL' | 'INDIVIDUAL' | 'COMPANY'>('ALL');

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        } else if (user) {
            fetchClients();
        }
    }, [user, authLoading, router]);

    const fetchClients = async () => {
        try {
            const response = await fetch('/api/clients');
            if (response.ok) {
                const data = await response.json();
                setClients(data.clients || []);
            }
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredClients = clients.filter(c =>
        filter === 'ALL' || c.type === filter
    );

    const totalBalance = clients.reduce((sum, c) => sum + c.balance, 0);

    if (authLoading || loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Cargando clientes...</p>
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
                <button onClick={() => setShowNewModal(true)} className="btn btn-primary">
                    <span style={{ fontSize: '1.2rem' }}>+</span> Nuevo Cliente
                </button>
            </div>

            {/* Stats */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>👥</div>
                    <div className={styles.statInfo}>
                        <p>Total Clientes</p>
                        <h3>{clients.length}</h3>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>🏢</div>
                    <div className={styles.statInfo}>
                        <p>Empresas</p>
                        <h3>{clients.filter(c => c.type === 'COMPANY').length}</h3>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>💰</div>
                    <div className={styles.statInfo}>
                        <p>Saldo Pendiente</p>
                        <h3>${totalBalance.toLocaleString('es-MX')}</h3>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div className={styles.filters}>
                        <button
                            className={filter === 'ALL' ? styles.filterActive : styles.filterBtn}
                            onClick={() => setFilter('ALL')}
                        >
                            Todos
                        </button>
                        <button
                            className={filter === 'INDIVIDUAL' ? styles.filterActive : styles.filterBtn}
                            onClick={() => setFilter('INDIVIDUAL')}
                        >
                            Personas
                        </button>
                        <button
                            className={filter === 'COMPANY' ? styles.filterActive : styles.filterBtn}
                            onClick={() => setFilter('COMPANY')}
                        >
                            Empresas
                        </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <input type="text" placeholder="Buscar cliente..." className="input" style={{ width: '240px', paddingLeft: '2.5rem' }} />
                        <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>🔍</span>
                    </div>
                </div>

                <div className={styles.clientsList}>
                    {filteredClients.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>👤</div>
                            <h3>Sin resultados</h3>
                            <p style={{ marginBottom: '1.5rem' }}>No se encontraron clientes para este filtro.</p>
                            <button onClick={() => setShowNewModal(true)} className="btn btn-primary">
                                Crear Primer Cliente
                            </button>
                        </div>
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
                                        {client.nit && <span>🏛️ {client.nit}</span>}
                                    </div>
                                </div>
                                <div className={styles.clientBalance}>
                                    <p>Saldo</p>
                                    <h4 className={client.balance > 0 ? styles.positive : ''}>
                                        ${client.balance.toLocaleString('es-MX')}
                                    </h4>
                                </div>
                                <button className="btn btn-ghost" style={{ fontSize: '1.25rem' }}>
                                    ⋮
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {showNewModal && (
                <NewClientModal
                    onClose={() => setShowNewModal(false)}
                    onSuccess={() => {
                        setShowNewModal(false);
                        fetchClients();
                    }}
                />
            )}
        </div>
    );
}

function NewClientModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [formData, setFormData] = useState({
        type: 'INDIVIDUAL' as 'INDIVIDUAL' | 'COMPANY',
        name: '',
        email: '',
        phone: '',
        nit: '',
        dui: '',
        address: '',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                onSuccess();
            } else {
                alert('Error al crear cliente');
            }
        } catch (error) {
            alert('Error al crear cliente');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3 style={{ margin: 0 }}>Registrar Nuevo Cliente</h3>
                    <button onClick={onClose} className={styles.closeBtn}>✕</button>
                </div>

                <form onSubmit={handleSubmit} className={styles.modalForm}>
                    <div className={styles.typeButtons}>
                        <button
                            type="button"
                            className={formData.type === 'INDIVIDUAL' ? styles.typeActive : ''}
                            onClick={() => setFormData({ ...formData, type: 'INDIVIDUAL' })}
                        >
                            👤 Persona Natural
                        </button>
                        <button
                            type="button"
                            className={formData.type === 'COMPANY' ? styles.typeActive : ''}
                            onClick={() => setFormData({ ...formData, type: 'COMPANY' })}
                        >
                            🏢 Empresa / Entidad
                        </button>
                    </div>

                    <div className="form-group">
                        <label className="label">Nombre o Razón Social</label>
                        <input
                            type="text"
                            required
                            className="input"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ej: Santiago Andre Ruballo"
                        />
                    </div>

                    <div className={styles.formRow}>
                        <div className="form-group">
                            <label className="label">Correo Electrónico</label>
                            <input
                                type="email"
                                className="input"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="usuario@gmail.com"
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Número de Teléfono</label>
                            <input
                                type="tel"
                                className="input"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="7222-6244"
                            />
                        </div>
                    </div>

                    <div className={styles.formRow}>
                        {formData.type === 'INDIVIDUAL' ? (
                            <div className="form-group">
                                <label className="label">DUI (con guiones)</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.dui}
                                    onChange={(e) => setFormData({ ...formData, dui: e.target.value })}
                                    placeholder="01234567-8"
                                    maxLength={10}
                                />
                            </div>
                        ) : (
                            <div className="form-group">
                                <label className="label">NIT (con guiones)</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.nit}
                                    onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                                    placeholder="0614-210188-101-2"
                                />
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="label">Dirección Residencial / Comercial</label>
                        <textarea
                            className="input"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Calle Principal #123, San Salvador"
                            rows={2}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 2 }}>
                            {loading ? 'Procesando...' : 'Finalizar Registro'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
