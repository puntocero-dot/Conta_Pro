'use client';

import React from 'react';
import Link from 'next/link';
import { ThreeBackground } from '@/components/ui/ThreeBackground';
import styles from './landing.module.css';

export default function LandingPage() {
    React.useEffect(() => {
        console.log("🚀 Conta2Go Landing Active - Modern Identity System");
    }, []);

    return (

        <div className={styles.container}>
            <ThreeBackground />
            
            <nav className={styles.nav}>
                <div className={styles.logo}>
                    <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
                        <rect width="48" height="48" rx="12" fill="var(--primary)" />
                        <path d="M24 12L34 18V30L24 36L14 30V18L24 12Z" fill="white" />
                    </svg>
                    <span>Conta<span style={{ color: 'var(--primary-light)' }}>2</span>Go</span>
                </div>
                <div className={styles.navLinks}>
                    <Link href="/login">Iniciar Sesión</Link>
                    <Link href="/register" className={styles.btnPrimary}>Comenzar Gratis</Link>
                </div>
            </nav>

            <main className={styles.hero}>
                <div className={styles.heroContent}>
                    <div className={styles.badge}>Powered by Punto Cero</div>
                    <h1 className={styles.title}>
                        Contabilidad del <span className={styles.gradientText}>Futuro</span>, hoy.
                    </h1>
                    <p className={styles.description}>
                        Gestiona tu empresa con la velocidad y precisión de la Inteligencia Artificial. 
                        Automatización real, métricas en tiempo real y cumplimiento total en El Salvador.
                    </p>
                    <div className={styles.ctaGroup}>
                        <Link href="/register" className={styles.mainBtn}>Crear mi cuenta</Link>
                        <button className={styles.secondaryBtn}>Ver Demo Interactiva</button>
                    </div>
                </div>

                <div className={styles.heroVisual}>
                    <div className={styles.glassCard}>
                        <div className={styles.cardHeader}>
                            <div className={styles.dot} style={{ background: '#ff5f56' }}></div>
                            <div className={styles.dot} style={{ background: '#ffbd2e' }}></div>
                            <div className={styles.dot} style={{ background: '#27c93f' }}></div>
                        </div>
                        <div className={styles.cardContent}>
                            <div className={styles.chartLine}></div>
                            <div className={styles.chartLine} style={{ width: '60%' }}></div>
                            <div className={styles.chartLine} style={{ width: '85%' }}></div>
                        </div>
                    </div>
                </div>
            </main>

            <section className={styles.features}>
                <div className={styles.featureGrid}>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>⚡</div>
                        <h3>Procesamiento IA</h3>
                        <p>OCR avanzado para capturar facturas y gastos en segundos.</p>
                    </div>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>📊</div>
                        <h3>Métricas Vivas</h3>
                        <p>Balance, Estado de Resultados y Flujo de Caja al instante.</p>
                    </div>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>⚖️</div>
                        <h3>Cumplimiento Legal</h3>
                        <p>Libros legales y reportes fiscales automáticos (IVA, Pago a Cuenta).</p>
                    </div>
                </div>
            </section>

            <footer className={styles.footer}>
                <p>© 2026 Conta2Go. Una solución de <strong>Punto Cero</strong>.</p>
                <div className={styles.socials}>
                    <span>El Salvador</span>
                    <span className={styles.divider}>|</span>
                    <span>Modern Accounting Stack</span>
                </div>
            </footer>
        </div>
    );
}
