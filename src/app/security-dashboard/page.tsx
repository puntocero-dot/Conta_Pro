'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import styles from './security-dashboard.module.css';

interface AuditStats {
    totalLogs: number;
    failedActions: number;
    suspiciousActivity: number;
    recentLogins: number;
}

interface AuditLog {
    id: string;
    timestamp: string;
    action: string;
    resource: string;
    result: string;
    ipAddress: string;
    user?: {
        email: string;
        role: string;
    };
}

export default function SecurityDashboard() {
    const { user, role, loading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<AuditStats | null>(null);
    const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        if (!loading && (!user || role !== 'SUPER_ADMIN')) {
            router.push('/dashboard');
        }
    }, [user, role, loading, router]);

    useEffect(() => {
        if (user && role === 'SUPER_ADMIN') {
            fetchDashboardData();
        }
    }, [user, role]);

    const fetchDashboardData = async () => {
        try {
            const [statsRes, logsRes] = await Promise.all([
                fetch('/api/audit/stats'),
                fetch('/api/audit/logs?limit=10'),
            ]);

            if (statsRes.ok && logsRes.ok) {
                const statsData = await statsRes.json();
                const logsData = await logsRes.json();

                setStats(statsData);
                setRecentLogs(logsData.logs);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoadingData(false);
        }
    };

    if (loading || loadingData) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Cargando Security Dashboard...</p>
            </div>
        );
    }

    if (!user || role !== 'SUPER_ADMIN') {
        return null;
    }

    const getResultColor = (result: string) => {
        switch (result) {
            case 'success':
                return styles.success;
            case 'failure':
                return styles.failure;
            case 'blocked':
                return styles.blocked;
            case 'warning':
                return styles.warning;
            default:
                return '';
        }
    };

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: '1rem' }}>
                <button
                    className="btn btn-ghost"
                    onClick={() => router.push('/dashboard')}
                    style={{ fontSize: '0.875rem', color: '#64748b', paddingLeft: 0 }}
                >
                    ← Volver al Dashboard
                </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.25rem' }}>Security Dashboard</h1>
                    <p>Monitoreo preventivo y auditoría de accesos</p>
                </div>
                <button className="btn btn-outline" onClick={fetchDashboardData}>
                    🔄 Actualizar
                </button>
            </div>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                <div className="card shadow-sm">
                    <div className={styles.statHeader}>
                        <span style={{ fontSize: '1.5rem' }}>📊</span>
                        <span className={styles.statLabel}>Registros Totales</span>
                    </div>
                    <div className={styles.statValue}>{stats?.totalLogs || 0}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>Logs históricos</div>
                </div>

                <div className="card shadow-sm">
                    <div className={styles.statHeader}>
                        <span style={{ fontSize: '1.5rem' }}>🔐</span>
                        <span className={styles.statLabel}>Logins (24h)</span>
                    </div>
                    <div className={styles.statValue}>{stats?.recentLogins || 0}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>Sesiones activas</div>
                </div>

                <div className="card shadow-sm" style={{ borderLeft: '4px solid var(--warning)' }}>
                    <div className={styles.statHeader}>
                        <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                        <span className={styles.statLabel}>Fallos de Auth</span>
                    </div>
                    <div className={styles.statValue} style={{ color: 'var(--warning)' }}>{stats?.failedActions || 0}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>Intentos denegados</div>
                </div>

                <div className="card shadow-sm" style={{ borderLeft: '4px solid var(--error)' }}>
                    <div className={styles.statHeader}>
                        <span style={{ fontSize: '1.5rem' }}>🚨</span>
                        <span className={styles.statLabel}>Alertas Críticas</span>
                    </div>
                    <div className={styles.statValue} style={{ color: 'var(--error)' }}>{stats?.suspiciousActivity || 0}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>Acciones bloqueadas</div>
                </div>
            </div>

            {/* Recent Logs Section */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>📋 Actividad Reciente</h3>
                    <button onClick={() => router.push('/security/audit-logs')} className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>
                        Ver todo el historial →
                    </button>
                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Fecha y Hora</th>
                                <th>Usuario</th>
                                <th>Acción</th>
                                <th>Recurso</th>
                                <th>IP Address</th>
                                <th>Resultado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentLogs.map((log) => (
                                <tr key={log.id}>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 500 }}>{new Date(log.timestamp).toLocaleDateString()}</span>
                                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className={styles.userCell}>
                                            <span className={styles.email}>{log.user?.email || 'Sistema'}</span>
                                            {log.user?.role && (
                                                <span className={styles.roleBadge}>{log.user.role}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td><code className={styles.code}>{log.action}</code></td>
                                    <td><span style={{ color: '#64748b' }}>{log.resource}</span></td>
                                    <td><code className={styles.code}>{log.ipAddress}</code></td>
                                    <td>
                                        <span className={`${styles.badge} ${getResultColor(log.result)}`}>
                                            {log.result === 'success' ? 'Éxito' : log.result}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {recentLogs.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                            No hay actividad reciente registrada
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
                <h3 style={{ marginBottom: '1.25rem' }}>⚡ Acciones Rápidas</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <button className="btn btn-outline" onClick={() => router.push('/security/audit-logs')}>
                        📜 Auditoría Completa
                    </button>
                    <button className="btn btn-outline" onClick={() => router.push('/security/users')}>
                        👥 Gestionar Usuarios
                    </button>
                    <button className="btn btn-outline" onClick={() => router.push('/security/alerts')}>
                        🔔 Configurar Alertas
                    </button>
                    <button className="btn btn-primary" onClick={fetchDashboardData}>
                        🔄 Sincronizar Datos
                    </button>
                </div>
            </div>
        </div>
    );
}
