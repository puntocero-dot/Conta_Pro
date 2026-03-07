'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import styles from './companies.module.css';

interface Company {
    id: string;
    name: string;
    taxId: string;
    country: string;
    legalForm?: string;
    nrc?: string;
    address?: string;
    economicActivity?: string;
    shareCapital?: number;
}

export default function CompaniesPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        } else if (user) {
            fetchCompanies();
        }
    }, [user, authLoading, router]);

    const fetchCompanies = async () => {
        try {
            const response = await fetch('/api/companies');
            if (response.ok) {
                const data = await response.json();
                setCompanies(data.companies || []);
            }
        } catch (error) {
            console.error('Error fetching companies:', error);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Cargando empresas...</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.25rem' }}>Empresas</h1>
                    <p>Entidades legales y configuraciones fiscales</p>
                </div>
                <button onClick={() => setShowNewModal(true)} className="btn btn-primary">
                    <span style={{ fontSize: '1.2rem' }}>+</span> Nueva Empresa
                </button>
            </div>

            <div className={styles.companiesList}>
                {companies.length === 0 ? (
                    <div className="card shadow-sm" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1.5rem', opacity: 0.5 }}>🏢</div>
                        <h3>Sin empresas</h3>
                        <p style={{ color: '#64748b', marginBottom: '2rem' }}>Comienza registrando tu primera entidad legal.</p>
                        <button onClick={() => setShowNewModal(true)} className="btn btn-primary">
                            Registrar Mi Empresa
                        </button>
                    </div>
                ) : (
                    companies.map(company => (
                        <div key={company.id} className={styles.companyCard}>
                            <div className={styles.cardHeader}>
                                <div className={styles.icon}>🏢</div>
                                <div>
                                    <h3>{company.name}</h3>
                                    <p className={styles.legalForm}>{company.legalForm || 'Persona Jurídica'}</p>
                                </div>
                            </div>

                            <div className={styles.details}>
                                <div className={styles.detailRow}>
                                    <span style={{ fontWeight: 600, color: '#1e293b', minWidth: '40px' }}>NIT:</span>
                                    <span>{company.taxId}</span>
                                </div>
                                {company.nrc && (
                                    <div className={styles.detailRow}>
                                        <span style={{ fontWeight: 600, color: '#1e293b', minWidth: '40px' }}>NRC:</span>
                                        <span>{company.nrc}</span>
                                    </div>
                                )}
                                {company.economicActivity && (
                                    <div className={styles.detailRow}>
                                        <span style={{ fontWeight: 600, color: '#1e293b', minWidth: '40px' }}>Giro:</span>
                                        <span>{company.economicActivity}</span>
                                    </div>
                                )}
                            </div>

                            <button className={styles.selectBtn}>
                                Gestionar Entidad
                            </button>
                        </div>
                    ))
                )}
            </div>

            {showNewModal && (
                <NewCompanyModal
                    onClose={() => setShowNewModal(false)}
                    onSuccess={() => {
                        setShowNewModal(false);
                        fetchCompanies();
                    }}
                />
            )}
        </div>
    );
}

function NewCompanyModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [formData, setFormData] = useState({
        legalForm: 'SA',
        name: '',
        nit: '',
        nrc: '',
        address: '',
        economicActivity: '',
        shareCapital: '',
        municipality: '',
        department: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const legalForms = [
        { value: 'SA', label: 'Sociedad Anónima (S.A.)' },
        { value: 'SRL', label: 'Sociedad de Responsabilidad Limitada (S. de R.L.)' },
        { value: 'EIRL', label: 'Empresa Individual de Responsabilidad Limitada (E.I.R.L.)' },
        { value: 'SC', label: 'Sociedad Colectiva' },
        { value: 'SCS', label: 'Sociedad en Comandita Simple' },
    ];

    const departments = [
        'San Salvador', 'La Libertad', 'Santa Ana', 'Sonsonate', 'San Miguel',
        'Usulután', 'La Paz', 'Chalatenango', 'Cuscatlán', 'Ahuachapán',
        'La Unión', 'Morazán', 'Cabañas', 'San Vicente'
    ];

    const economicActivities = [
        'Comercio al por mayor y menor',
        'Servicios profesionales',
        'Construcción',
        'Manufactura',
        'Agricultura',
        'Transporte',
        'Restaurantes y hoteles',
        'Servicios financieros',
        'Tecnología e informática',
    ];

    const validateNIT = (nit: string) => {
        const clean = nit.replace(/[^0-9]/g, '');
        return clean.length >= 13;
    };

    const validateNRC = (nrc: string) => {
        const clean = nrc.replace(/[^0-9]/g, '');
        return clean.length >= 6 && clean.length <= 8;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!validateNIT(formData.nit)) {
            setError('NIT inválido. Formato sugerido: XXXX-XXXXXX-XXX-X');
            return;
        }

        if (!validateNRC(formData.nrc)) {
            setError('NRC inválido. Debe contener entre 6 y 8 dígitos');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/companies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    shareCapital: formData.shareCapital ? parseFloat(formData.shareCapital) : null,
                    country: 'SV',
                }),
            });

            const data = await response.json();

            if (response.ok) {
                onSuccess();
            } else {
                setError(data.error || 'Error al crear empresa');
            }
        } catch (err) {
            setError('Error de conexión al servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3 style={{ margin: 0 }}>🏢 Registrar Entidad Legal</h3>
                    <button onClick={onClose} className={styles.closeBtn}>✕</button>
                </div>

                <form onSubmit={handleSubmit} className={styles.modalForm}>
                    <div className="form-group">
                        <label className="label">Tipo de Entidad *</label>
                        <select
                            className="input"
                            value={formData.legalForm}
                            onChange={(e) => setFormData({ ...formData, legalForm: e.target.value })}
                            required
                        >
                            {legalForms.map(form => (
                                <option key={form.value} value={form.value}>{form.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="label">Razón Social o Nombre Legal *</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ej: Inversiones ABC S.A. de C.V."
                            required
                        />
                    </div>

                    <div className={styles.formRow}>
                        <div className="form-group">
                            <label className="label">NIT *</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.nit}
                                onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                                placeholder="0614-210188-101-2"
                                maxLength={17}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="label">NRC *</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.nrc}
                                onChange={(e) => setFormData({ ...formData, nrc: e.target.value })}
                                placeholder="123456-7"
                                maxLength={10}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="label">Giro o Actividad Económica *</label>
                        <select
                            className="input"
                            value={formData.economicActivity}
                            onChange={(e) => setFormData({ ...formData, economicActivity: e.target.value })}
                            required
                        >
                            <option value="">Seleccionar actividad...</option>
                            {economicActivities.map(activity => (
                                <option key={activity} value={activity}>{activity}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="label">Dirección Fiscal *</label>
                        <textarea
                            className="input"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Dirección completa exacta"
                            rows={2}
                            required
                        />
                    </div>

                    <div className={styles.formRow}>
                        <div className="form-group">
                            <label className="label">Departamento *</label>
                            <select
                                className="input"
                                value={formData.department}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                required
                            >
                                <option value="">Seleccionar...</option>
                                {departments.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="label">Municipio *</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.municipality}
                                onChange={(e) => setFormData({ ...formData, municipality: e.target.value })}
                                placeholder="Ej: Antiguo Cuscatlán"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className={styles.error}>
                            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
                            Cerrar
                        </button>
                        <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 2 }}>
                            {loading ? 'Registrando...' : 'Finalizar Registro'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
