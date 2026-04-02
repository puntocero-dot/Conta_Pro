'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCompany } from '@/context/CompanyContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { ColorPicker } from '@/components/ui/ColorPicker';
import styles from './settings.module.css';

interface CompanyTheme {
    primaryColor: string;
    sidebarBg: string;
    sidebarFg: string;
    logoUrl: string;
}

const DEFAULTS: CompanyTheme = {
    primaryColor: '#2563eb',
    sidebarBg: '#0c1220',
    sidebarFg: '#e5e7eb',
    logoUrl: '',
};

export default function CompanySettingsPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { activeCompanyId } = useCompany();
    const { showToast } = useToast();
    const [theme, setTheme] = useState<CompanyTheme>(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchTheme = useCallback(async () => {
        try {
            const res = await fetch(`/api/companies/${id}/theme`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (res.ok) {
                const data = await res.json();
                setTheme({ ...DEFAULTS, ...data.theme });
            }
        } catch {
            // use defaults
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchTheme();
    }, [fetchTheme]);

    // Live preview: apply CSS vars as user picks
    useEffect(() => {
        const root = document.documentElement;
        if (theme.primaryColor) root.style.setProperty('--primary', theme.primaryColor);
        if (theme.sidebarBg) root.style.setProperty('--sidebar-bg', theme.sidebarBg);
        if (theme.sidebarFg) root.style.setProperty('--sidebar-fg', theme.sidebarFg);
    }, [theme]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/companies/${id}/theme`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(theme),
            });
            if (res.ok) {
                showToast('Tema guardado correctamente', 'success');
            } else {
                const data = await res.json().catch(() => ({}));
                showToast(data.error || 'Error al guardar', 'error');
            }
        } catch {
            showToast('Error de conexión', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setTheme(DEFAULTS);
    };

    if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

    return (
        <div>
            <PageHeader
                title="Personalización"
                subtitle="Configura colores, logo y apariencia de esta empresa."
            >
                <button onClick={() => router.back()} className="btn btn-secondary">
                    ← Volver
                </button>
            </PageHeader>

            <div className={styles.grid}>
                {/* Colors section */}
                <div className="card">
                    <h2 className={styles.sectionTitle}>Colores</h2>
                    <div className={styles.colorGrid}>
                        <ColorPicker
                            label="Color Principal"
                            value={theme.primaryColor}
                            onChange={v => setTheme(p => ({ ...p, primaryColor: v }))}
                        />
                        <ColorPicker
                            label="Fondo del Sidebar"
                            value={theme.sidebarBg}
                            onChange={v => setTheme(p => ({ ...p, sidebarBg: v }))}
                        />
                        <ColorPicker
                            label="Texto del Sidebar"
                            value={theme.sidebarFg}
                            onChange={v => setTheme(p => ({ ...p, sidebarFg: v }))}
                        />
                    </div>
                </div>

                {/* Logo section */}
                <div className="card">
                    <h2 className={styles.sectionTitle}>Logo</h2>
                    <div className="form-group">
                        <label className="label">URL del Logo (PNG/SVG recomendado)</label>
                        <input
                            type="url"
                            className="input"
                            placeholder="https://ejemplo.com/logo.png"
                            value={theme.logoUrl}
                            onChange={e => setTheme(p => ({ ...p, logoUrl: e.target.value }))}
                        />
                    </div>
                    {theme.logoUrl && (
                        <div className={styles.logoPreview}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={theme.logoUrl} alt="Logo preview" className={styles.logoImg} />
                        </div>
                    )}
                </div>

                {/* Preview */}
                <div className="card">
                    <h2 className={styles.sectionTitle}>Vista Previa</h2>
                    <div className={styles.preview} style={{ background: theme.sidebarBg }}>
                        <div className={styles.previewLogoRow}>
                            <div className={styles.previewLogoIcon} style={{ background: theme.primaryColor }}>
                                {theme.logoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={theme.logoUrl} alt="logo" style={{ width: 16, height: 16, objectFit: 'contain' }} />
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                        <polyline points="9 22 9 12 15 12 15 22" />
                                    </svg>
                                )}
                            </div>
                            <span style={{ color: theme.sidebarFg, fontWeight: 700, fontSize: '0.9rem' }}>Conta Pro</span>
                        </div>
                        {['Dashboard', 'Transacciones', 'Reportes'].map((item, i) => (
                            <div
                                key={item}
                                className={styles.previewNavItem}
                                style={{
                                    color: i === 0 ? '#fff' : theme.sidebarFg,
                                    borderLeft: i === 0 ? `2px solid ${theme.primaryColor}` : '2px solid transparent',
                                    paddingLeft: i === 0 ? 'calc(0.875rem - 2px)' : '0.875rem',
                                }}
                            >
                                {item}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className={styles.actions}>
                <button onClick={handleReset} className="btn btn-outline">
                    Restablecer predeterminados
                </button>
                <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>
        </div>
    );
}
