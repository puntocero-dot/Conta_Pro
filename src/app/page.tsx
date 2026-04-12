'use client';

import React from 'react';
import Link from 'next/link';
import { ThreeBackground } from '@/components/ui/ThreeBackground';
import styles from './landing.module.css';

export default function LandingPage() {
    React.useEffect(() => {
        console.log("🚀 Conta_pro Landing Active - Modern Identity System");
    }, []);

    return (

        <div className={styles.container}>
            <ThreeBackground />
            
            <nav className={styles.nav}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>◈</div>
                    <span>Conta_pro</span>
                </div>
                <div className={styles.navLinks}>
                    <a href="#soluciones">Soluciones</a>
                    <a href="#precios">Precios</a>
                    <a href="#seguridad">Seguridad</a>
                    <Link href="/login" className={styles.btnPrimary}>Acceder</Link>
                </div>
            </nav>

            <main className={styles.hero}>
                <div className={styles.heroContent}>
                    <div className={styles.badge}>Sistema de Próxima Generación</div>
                    <h1 className={styles.title}>
                        Contabilidad del <span className={styles.gradientText}>Futuro</span>, hoy.
                    </h1>
                    <p className={styles.description}>
                        La plataforma contable más avanzada para El Salvador. Punto Cero impulsa tu negocio con automatización inteligente y seguridad de nivel bancario.
                    </p>
                    <div className={styles.ctaGroup}>
                        <Link href="/register" className={styles.mainBtn}>Empezar Gratis</Link>
                        <button className={styles.secondaryBtn}>Ver Demo</button>
                    </div>
                </div>

                <div className={styles.heroVisual}>
                    <div className={styles.glassCard}>
                        <div className={styles.cardHeader}>
                            <div className={`${styles.dot} ${styles.red}`} />
                            <div className={`${styles.dot} ${styles.yellow}`} />
                            <div className={`${styles.dot} ${styles.green}`} />
                        </div>
                        <div className={styles.chartLine} style={{ width: '80%' }} />
                        <div className={styles.chartLine} style={{ width: '60%' }} />
                        <div className={styles.chartLine} style={{ width: '90%' }} />
                        <div className={styles.chartLine} style={{ width: '40%' }} />
                    </div>
                </div>
            </main>

            <section id="features" className={styles.features}>
                <div className={styles.featureGrid}>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>⚡</div>
                        <h3>Automatización</h3>
                        <p>Optimiza tus procesos con cierres contables instantáneos y reportes automáticos.</p>
                    </div>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>🛡️</div>
                        <h3>Seguridad</h3>
                        <p>Protección perimetral y encriptación de grado militar para tus datos financieros.</p>
                    </div>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>📊</div>
                        <h3>Inteligencia</h3>
                        <p>Toma decisiones basadas en datos reales con nuestro dashboard de métricas avanzado.</p>
                    </div>
                </div>
            </section>

            <footer className={styles.footer}>
                <p>© 2026 Conta_pro. Una solución de <strong>Punto Cero</strong>.</p>
                <div className={styles.socials}>
                    <span>El Salvador</span>
                    <span className={styles.divider}>|</span>
                    <span>Modern Accounting Stack</span>
                </div>
            </footer>
        </div>
    );
}
