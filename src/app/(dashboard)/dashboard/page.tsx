'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import styles from './dashboard.module.css';

export default function DashboardPage() {
    const { user, role, loading, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>Cargando...</p>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.brand}>
                    <h1>Conta<span className={styles.highlight}>2</span>Go</h1>
                </div>
                <nav className={styles.nav}>
                    <button onClick={() => router.push('/dashboard')} className={styles.navBtn}>
                        🏠 Inicio
                    </button>
                    <button onClick={() => router.push('/transactions')} className={styles.navBtn}>
                        💰 Transacciones
                    </button>
                    <button onClick={() => router.push('/reports')} className={styles.navBtn}>
                        📊 Reportes
                    </button>
                    {role === 'SUPER_ADMIN' && (
                        <button onClick={() => router.push('/security-dashboard')} className={styles.navBtn}>
                            🔐 Seguridad
                        </button>
                    )}
                </nav>
                <div className={styles.user}>
                    <div className={styles.userInfo}>
                        <p className={styles.email}>{user.email}</p>
                        <span className={styles.badge}>{role || 'CLIENTE'}</span>
                    </div>
                    <button onClick={logout} className={styles.logoutBtn}>Cerrar Sesión</button>
                </div>
            </header>

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
                            <h3>$0.00</h3>
                            <span>Este mes</span>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>📊</div>
                        <div className={styles.statContent}>
                            <p>Egresos</p>
                            <h3>$0.00</h3>
                            <span>Este mes</span>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>📈</div>
                        <div className={styles.statContent}>
                            <p>Balance</p>
                            <h3>$0.00</h3>
                            <span>Neto</span>
                        </div>
                    </div>
                </div>

                <div className={styles.securityBanner}>
                    <div className={styles.securityIcon}>🛡️</div>
                    <div className={styles.securityContent}>
                        <h4>Protección Activa</h4>
                        <p>Tus datos están encriptados con AES-256</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
