'use client';

import React from 'react';
import Link from 'next/link';
import { ThreeBackground } from '@/components/ui/ThreeBackground';
import styles from './landing.module.css';
import { PLANS } from '@/lib/plans';

export default function LandingPage() {
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
                        <a href="mailto:contacto@puntocero.dev" className={styles.secondaryBtn}>Solicitar Demo</a>
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

            <section id="soluciones" className={styles.features}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Todo lo que necesitas para tu empresa</h2>
                    <p className={styles.sectionSubtitle}>Una plataforma integral para gestión contable, cumplimiento fiscal y análisis financiero.</p>
                </div>
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
                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>🤖</div>
                        <h3>Bot Telegram</h3>
                        <p>Registra gastos desde tu teléfono con el bot de Telegram. Foto de recibo y listo.</p>
                    </div>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>📄</div>
                        <h3>Libros Legales</h3>
                        <p>Genera libros de IVA, compras y ventas cumpliendo con el reglamento del MH.</p>
                    </div>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>🔔</div>
                        <h3>Alertas y Recordatorios</h3>
                        <p>Recibe notificaciones antes de fechas de pago o corte de tarjetas directamente en Telegram.</p>
                    </div>
                </div>
            </section>

            <section id="precios" className={styles.pricing}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Planes para cada etapa</h2>
                    <p className={styles.sectionSubtitle}>Sin contratos de permanencia. Cancela cuando quieras.</p>
                </div>
                <div className={styles.planGrid}>
                    {PLANS.map(plan => (
                        <div
                            key={plan.id}
                            className={`${styles.planCard} ${plan.popular ? styles.planPopular : ''}`}
                            style={{ '--plan-color': plan.color } as React.CSSProperties}
                        >
                            {plan.popular && <div className={styles.popularBadge}>Más popular</div>}
                            <div className={styles.planName}>{plan.name}</div>
                            <div className={styles.planPrice}>
                                {plan.price}
                                <span className={styles.planPriceNote}>{plan.priceNote}</span>
                            </div>
                            <p className={styles.planDesc}>{plan.description}</p>
                            <ul className={styles.planFeatures}>
                                {plan.features.map(f => (
                                    <li key={f}>
                                        <span className={styles.checkmark}>✓</span> {f}
                                    </li>
                                ))}
                            </ul>
                            <Link
                                href={`/register?plan=${plan.id}`}
                                className={`${styles.planCta} ${plan.popular ? styles.planCtaPrimary : ''}`}
                            >
                                Empezar ahora
                            </Link>
                        </div>
                    ))}
                </div>
            </section>

            <section id="seguridad" className={styles.securitySection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Seguridad de nivel bancario</h2>
                    <p className={styles.sectionSubtitle}>Tus datos financieros protegidos con los más altos estándares del sector.</p>
                </div>
                <div className={styles.securityGrid}>
                    <div className={styles.securityCard}>
                        <div className={styles.securityIcon}>🔐</div>
                        <h4>Cifrado AES-256</h4>
                        <p>Todos los datos sensibles (RUC, NIT, montos) almacenados con cifrado de extremo a extremo.</p>
                    </div>
                    <div className={styles.securityCard}>
                        <div className={styles.securityIcon}>🕵️</div>
                        <h4>Auditoría completa</h4>
                        <p>Registro inmutable de cada acción: quién accedió, qué modificó y desde qué IP.</p>
                    </div>
                    <div className={styles.securityCard}>
                        <div className={styles.securityIcon}>🌐</div>
                        <h4>Acceso por roles</h4>
                        <p>SUPER_ADMIN, Contador, Auditor y Cliente con permisos granulares por empresa.</p>
                    </div>
                    <div className={styles.securityCard}>
                        <div className={styles.securityIcon}>☁️</div>
                        <h4>Backups automáticos</h4>
                        <p>Copias de seguridad diarias en la nube. Recuperación ante desastres garantizada.</p>
                    </div>
                </div>
            </section>

            <footer className={styles.footer}>
                <p>© 2026 Conta_pro. Una solución de <strong>Punto Cero</strong>.</p>
                <div className={styles.socials}>
                    <span>El Salvador</span>
                    <span className={styles.divider}>|</span>
                    <a href="mailto:contacto@puntocero.dev" style={{ color: '#64748b', textDecoration: 'none' }}>contacto@puntocero.dev</a>
                    <span className={styles.divider}>|</span>
                    <span>Modern Accounting Stack</span>
                </div>
            </footer>
        </div>
    );
}
