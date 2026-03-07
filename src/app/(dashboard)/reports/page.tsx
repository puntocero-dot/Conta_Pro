'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import styles from './reports.module.css';

interface ReportData {
    totalIngresos: number;
    totalEgresos: number;
    balance: number;
    iva: number;
    transactionCount: number;
    byCategory: Array<{
        name: string;
        amount: number;
        percentage: number;
    }>;
}

export default function ReportsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        } else if (user) {
            fetchReport();
        }
    }, [user, authLoading, month, year, router]);

    const fetchReport = async () => {
        try {
            const response = await fetch(`/api/reports?month=${month}&year=${year}`);
            if (response.ok) {
                const data = await response.json();
                setReportData(data);
            }
        } catch (error) {
            console.error('Error fetching report:', error);
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = () => {
        alert('Funcionalidad de PDF próximamente');
    };

    if (authLoading || loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Generando reporte...</p>
            </div>
        );
    }

    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                <div>
                    <h1>Reportes Financieros</h1>
                    <p>Estados de resultados y análisis periódico</p>
                </div>
                <button onClick={downloadPDF} className="btn btn-secondary">
                    📄 Descargar PDF
                </button>
            </div>

            {/* Period Selector */}
            <div className={styles.periodSelector}>
                <div className={styles.selectGroup}>
                    <label>Período</label>
                    <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
                        {monthNames.map((name, index) => (
                            <option key={index} value={index + 1}>{name}</option>
                        ))}
                    </select>
                </div>
                <div className={styles.selectGroup}>
                    <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
                        {[2024, 2025, 2026].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {reportData && (
                <>
                    {/* Summary Cards */}
                    <div className={styles.summaryGrid}>
                        <div className={`${styles.summaryCard} ${styles.income}`}>
                            <div className={styles.cardIcon}>📈</div>
                            <div className={styles.cardContent}>
                                <p>Ingresos</p>
                                <h2>${reportData.totalIngresos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h2>
                            </div>
                        </div>

                        <div className={`${styles.summaryCard} ${styles.expense}`}>
                            <div className={styles.cardIcon}>📉</div>
                            <div className={styles.cardContent}>
                                <p>Egresos</p>
                                <h2>${reportData.totalEgresos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h2>
                            </div>
                        </div>

                        <div className={`${styles.summaryCard} ${styles.balance}`}>
                            <div className={styles.cardIcon}>💰</div>
                            <div className={styles.cardContent}>
                                <p>Balance</p>
                                <h2 className={reportData.balance >= 0 ? styles.positive : styles.negative}>
                                    ${reportData.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </h2>
                            </div>
                        </div>

                        <div className={`${styles.summaryCard} ${styles.tax}`}>
                            <div className={styles.cardIcon}>🏛️</div>
                            <div className={styles.cardContent}>
                                <p>IVA 13%</p>
                                <h2>${reportData.iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h2>
                            </div>
                        </div>
                    </div>

                    {/* Category Breakdown */}
                    <div className={styles.section}>
                        <h3>📁 Desglose por Categoría</h3>
                        <div className={styles.categoryList}>
                            {reportData.byCategory.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>No hay datos para este período</p>
                            ) : (
                                reportData.byCategory.map((cat, index) => (
                                    <div key={index} className={styles.categoryItem}>
                                        <div className={styles.categoryInfo}>
                                            <span className={styles.categoryName}>{cat.name}</span>
                                            <span className={styles.categoryAmount}>
                                                ${cat.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className={styles.progressBar}>
                                            <div
                                                className={styles.progressFill}
                                                style={{ width: `${cat.percentage}%` }}
                                            ></div>
                                        </div>
                                        <span className={styles.percentage}>{cat.percentage.toFixed(1)}%</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Statistics */}
                    <div className={styles.section}>
                        <h3>📊 Métricas de Eficiencia</h3>
                        <div className={styles.statsList}>
                            <div className={styles.statItem}>
                                <span>Operaciones</span>
                                <strong>{reportData.transactionCount}</strong>
                            </div>
                            <div className={styles.statItem}>
                                <span>Ticket Promedio</span>
                                <strong>
                                    ${(reportData.totalIngresos / (reportData.transactionCount || 1)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </strong>
                            </div>
                            <div className={styles.statItem}>
                                <span>Margen Neto</span>
                                <strong className={reportData.balance >= 0 ? styles.positive : styles.negative}>
                                    {((reportData.balance / (reportData.totalIngresos || 1)) * 100).toFixed(1)}%
                                </strong>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
