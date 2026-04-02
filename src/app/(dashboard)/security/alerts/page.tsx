'use client';

import { useState } from 'react';
import { useToast } from '@/context/ToastContext';

interface AlertRule {
    id: string;
    label: string;
    description: string;
    enabled: boolean;
    threshold?: number;
    unit?: string;
    icon: string;
    category: 'auth' | 'transaction' | 'data';
}

const DEFAULT_RULES: AlertRule[] = [
    {
        id: 'failed_logins',
        label: 'Intentos de inicio de sesión fallidos',
        description: 'Alertar cuando se supere el umbral de intentos fallidos por IP en 10 minutos.',
        enabled: true,
        threshold: 5,
        unit: 'intentos',
        icon: '🔒',
        category: 'auth',
    },
    {
        id: 'large_transaction',
        label: 'Transacción de monto inusual',
        description: 'Alertar cuando una transacción supere el monto definido.',
        enabled: true,
        threshold: 10000,
        unit: 'USD',
        icon: '💰',
        category: 'transaction',
    },
    {
        id: 'bulk_delete',
        label: 'Eliminación masiva de registros',
        description: 'Alertar cuando se eliminen más registros del umbral en una sesión.',
        enabled: false,
        threshold: 10,
        unit: 'registros',
        icon: '🗑️',
        category: 'data',
    },
    {
        id: 'new_user',
        label: 'Registro de nuevo usuario',
        description: 'Notificar cuando se registre un nuevo usuario en el sistema.',
        enabled: true,
        icon: '👤',
        category: 'auth',
    },
    {
        id: 'company_change',
        label: 'Cambio en datos fiscales de empresa',
        description: 'Alertar cuando se modifiquen datos de NIT, NRC o razón social.',
        enabled: true,
        icon: '🏢',
        category: 'data',
    },
    {
        id: 'role_change',
        label: 'Cambio de rol de usuario',
        description: 'Notificar cuando un SUPER_ADMIN modifique el rol de cualquier usuario.',
        enabled: true,
        icon: '🛡️',
        category: 'auth',
    },
    {
        id: 'export_data',
        label: 'Exportación de datos contables',
        description: 'Alertar cuando se exporte un reporte completo de transacciones.',
        enabled: false,
        icon: '📤',
        category: 'data',
    },
];

const CATEGORY_LABELS: Record<string, string> = {
    auth: 'Autenticación y Accesos',
    transaction: 'Transacciones Financieras',
    data: 'Integridad de Datos',
};

const CATEGORY_ICONS: Record<string, string> = {
    auth: '🔐',
    transaction: '💳',
    data: '🗄️',
};

export default function SecurityAlertsPage() {
    const { showToast } = useToast();
    const [rules, setRules] = useState<AlertRule[]>(DEFAULT_RULES);
    const [saving, setSaving] = useState(false);

    const toggleRule = (id: string) => {
        setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    };

    const updateThreshold = (id: string, value: number) => {
        setRules(prev => prev.map(r => r.id === id ? { ...r, threshold: value } : r));
    };

    const handleSave = async () => {
        setSaving(true);
        // In a full implementation this would persist to DB/settings
        await new Promise(r => setTimeout(r, 600));
        setSaving(false);
        showToast('Configuración de alertas guardada', 'success');
    };

    const categories = ['auth', 'transaction', 'data'] as const;
    const enabledCount = rules.filter(r => r.enabled).length;

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.25rem' }}>Configuración de Alertas</h1>
                    <p>Define qué eventos generan notificaciones de seguridad</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
            </div>

            {/* Summary bar */}
            <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#16a34a' }} />
                    <span style={{ fontSize: '0.875rem', color: '#475569' }}>
                        <strong>{enabledCount}</strong> alertas activas de {rules.length}
                    </span>
                </div>
                <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '100px', overflow: 'hidden' }}>
                    <div style={{
                        width: `${(enabledCount / rules.length) * 100}%`,
                        height: '100%',
                        background: 'var(--primary)',
                        borderRadius: '100px',
                        transition: 'width 0.3s ease',
                    }} />
                </div>
                <span style={{ fontSize: '0.8125rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {Math.round((enabledCount / rules.length) * 100)}% cobertura
                </span>
            </div>

            {categories.map(category => {
                const catRules = rules.filter(r => r.category === category);
                return (
                    <div key={category} style={{ marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
                            {CATEGORY_ICONS[category]} {CATEGORY_LABELS[category]}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {catRules.map(rule => (
                                <div
                                    key={rule.id}
                                    className="card"
                                    style={{
                                        padding: '1.25rem 1.5rem',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '1.25rem',
                                        opacity: rule.enabled ? 1 : 0.6,
                                        transition: 'opacity 0.2s',
                                    }}
                                >
                                    <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{rule.icon}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9375rem' }}>
                                                {rule.label}
                                            </span>
                                            {rule.enabled && (
                                                <span style={{
                                                    fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase',
                                                    color: '#16a34a', background: '#dcfce7', padding: '0.15rem 0.5rem',
                                                    borderRadius: '100px', letterSpacing: '0.05em',
                                                }}>
                                                    Activa
                                                </span>
                                            )}
                                        </div>
                                        <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
                                            {rule.description}
                                        </p>
                                        {rule.threshold !== undefined && rule.enabled && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                                                <label style={{ fontSize: '0.8125rem', color: '#475569', fontWeight: 600 }}>
                                                    Umbral:
                                                </label>
                                                <input
                                                    type="number"
                                                    value={rule.threshold}
                                                    min={1}
                                                    onChange={e => updateThreshold(rule.id, Number(e.target.value))}
                                                    style={{
                                                        width: '80px', padding: '0.25rem 0.5rem',
                                                        border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                                                        fontSize: '0.875rem', textAlign: 'center',
                                                    }}
                                                />
                                                <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>{rule.unit}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ flexShrink: 0 }}>
                                        <button
                                            onClick={() => toggleRule(rule.id)}
                                            style={{
                                                width: '44px', height: '24px',
                                                borderRadius: '100px',
                                                border: 'none', cursor: 'pointer',
                                                background: rule.enabled ? 'var(--primary)' : '#cbd5e1',
                                                position: 'relative',
                                                transition: 'background 0.2s',
                                            }}
                                            aria-label={rule.enabled ? 'Desactivar alerta' : 'Activar alerta'}
                                        >
                                            <span style={{
                                                position: 'absolute',
                                                top: '3px',
                                                left: rule.enabled ? '23px' : '3px',
                                                width: '18px', height: '18px',
                                                borderRadius: '50%',
                                                background: 'white',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                                transition: 'left 0.2s',
                                            }} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}

            <div className="card" style={{ padding: '1.25rem 1.5rem', background: '#fffbeb', borderColor: '#fde68a' }}>
                <p style={{ fontSize: '0.8125rem', color: '#92400e', margin: 0 }}>
                    <strong>Nota:</strong> Las notificaciones se registran en el Registro de Auditoría. La integración con email/Slack estará disponible en una próxima versión.
                </p>
            </div>
        </div>
    );
}
