'use client';

import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/context/CompanyContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './dashboard.module.css';

interface DashboardStats {
    totalIngresos: number;
    totalEgresos: number;
    balance: number;
    transactionCount: number;
}

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const { activeCompanyId, isLoading: companyLoading } = useCompany();
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isFetching, setIsFetching] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!activeCompanyId) return;

            setIsFetching(true);
            try {
                const response = await fetch('/api/reports', {
                    headers: {
                        'x-company-id': activeCompanyId
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                }
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
            } finally {
                setIsFetching(false);
            }
        };

        if (activeCompanyId) {
            fetchDashboardData();
        }
    }, [activeCompanyId]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const loading = authLoading || companyLoading || (isFetching && !stats);

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>Cargando datos financieros...</p>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="animate-fade-in">
            <main className={styles.main}>
                <div className={styles.welcome}>
                    <h2>¡Bienvenido! 👋</h2>
                    <p>Sistema de Contabilidad con Seguridad de Nivel Bancario</p>
                </div>

                <div className={styles.quickActions}>
                    <button
                        onClick={() => router.push('/transactions')}
                        className={`${styles.actionCard} ${styles.primary}`}
                    >
                        <div className={styles.actionIcon}>💸</div>
                        <h3>Nueva Transacción</h3>
                        <p>Registra ingresos y egresos</p>
                    </button>

                    <button
                        onClick={() => router.push('/reports')}
                        className={`${styles.actionCard} ${styles.secondary}`}
                    >
                        <div className={styles.actionIcon}>📈</div>
                        <h3>Ver Reportes</h3>
                        <p>Análisis financiero mensual</p>
                    </button>

                    <button
                        onClick={() => router.push('/companies')}
                        className={`${styles.actionCard} ${styles.accent}`}
                    >
                        <div className={styles.actionIcon}>🏢</div>
                        <h3>Empresas</h3>
                        <p>Gestiona tus empresas</p>
                    </button>
                </div>

                <div className={styles.statsCards}>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>💰</div>
                        <div className={styles.statContent}>
                            <p>Ingresos</p>
                            <h3>{formatCurrency(stats?.totalIngresos || 0)}</h3>
                            <span>Este mes</span>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>📊</div>
                        <div className={styles.statContent}>
                            <p>Egresos</p>
                            <h3>{formatCurrency(stats?.totalEgresos || 0)}</h3>
                            <span>Este mes</span>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>📈</div>
                        <div className={styles.statContent}>
                            <p>Balance</p>
                            <h3 style={{ color: (stats?.balance || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                                {formatCurrency(stats?.balance || 0)}
                            </h3>
                            <span>Neto</span>
                        </div>
                    </div>
                </div>

                <div className={styles.securityBanner}>
                    <div className={styles.securityIcon}>🛡️</div>
                    <div className={styles.securityContent}>
                        <h4>Protección Activa</h4>
                        <p>Tus datos están encriptados con AES-256</p>
                        <p style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '4px' }}>
                            Sesión segura para: {user.email}
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
