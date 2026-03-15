'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/context/CompanyContext';
import styles from './reports.module.css';

interface ReportData {
    totalIngresos: number;
    totalEgresos: number;
    balance: number;
    iva: number;
    ivaDebito: number;
    ivaCredito: number;
    pagoACuenta: number;
    rentaEstimada: number;
    transactionCount: number;
    byCategory: Array<{
        name: string;
        amount: number;
        percentage: number;
    }>;
}

export default function ReportsPage() {
    const { user, loading: authLoading } = useAuth();
    const { activeCompanyId, isLoading: companyLoading } = useCompany();
    const router = useRouter();
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    const fetchReport = useCallback(async () => {
        if (!activeCompanyId) return;
        setLoading(true);
        try {
            const response = await fetch(`/api/reports?month=${month}&year=${year}`, {
                headers: {
                    'x-company-id': activeCompanyId
                }
            });
            if (response.ok) {
                const data = await response.json();
                setReportData(data);
            }
        } catch (error) {
            console.error('Error fetching report:', error);
        } finally {
            setLoading(false);
        }
    }, [activeCompanyId, month, year]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (activeCompanyId) {
            fetchReport();
        } else {
            setReportData(null);
            setLoading(false);
        }
    }, [activeCompanyId, fetchReport]);

    const downloadPDF = () => {
        alert('Funcionalidad de PDF próximamente');
    };

    if (authLoading || companyLoading || (loading && !reportData)) {
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
                <button
                    onClick={downloadPDF}
                    className="btn btn-secondary"
                    disabled={!activeCompanyId}
                >
                    📄 Descargar PDF
                </button>
            </div>

            {!activeCompanyId && (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', border: '1px dashed #cbd5e1', marginBottom: '2rem' }}>
                    <p>Selecciona una empresa en el panel lateral para ver sus reportes financieros.</p>
                </div>
            )}

            {activeCompanyId && (
                <>
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
                                        <h2>${(reportData.totalIngresos ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h2>
                                    </div>
                                </div>

                                <div className={`${styles.summaryCard} ${styles.expense}`}>
                                    <div className={styles.cardIcon}>📉</div>
                                    <div className={styles.cardContent}>
                                        <p>Egresos</p>
                                        <h2>${(reportData.totalEgresos ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h2>
                                    </div>
                                </div>

                                <div className={`${styles.summaryCard} ${styles.balance}`}>
                                    <div className={styles.cardIcon}>💰</div>
                                    <div className={styles.cardContent}>
                                        <p>Balance</p>
                                        <h2 className={reportData.balance >= 0 ? styles.positive : styles.negative}>
                                            ${(reportData.balance ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </h2>
                                    </div>
                                </div>

                                <div className={`${styles.summaryCard} ${styles.tax}`}>
                                    <div className={styles.cardIcon}>🏛️</div>
                                    <div className={styles.cardContent}>
                                        <p>IVA Neto (13%)</p>
                                        <h2>${(reportData.iva ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h2>
                                        <small style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                            Débito: ${reportData.ivaDebito.toFixed(2)} | Crédito: ${reportData.ivaCredito.toFixed(2)}
                                        </small>
                                    </div>
                                </div>

                                <div className={`${styles.summaryCard} ${styles.tax}`}>
                                    <div className={styles.cardIcon}>🏧</div>
                                    <div className={styles.cardContent}>
                                        <p>Pago a Cuenta (1.75%)</p>
                                        <h2>${(reportData.pagoACuenta ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h2>
                                        <small style={{ fontSize: '0.7rem' }}>Obligación mensual SV</small>
                                    </div>
                                </div>

                                <div className={`${styles.summaryCard} ${styles.balance}`}>
                                    <div className={styles.cardIcon}>📝</div>
                                    <div className={styles.cardContent}>
                                        <p>Est. Renta Anual</p>
                                        <h2>${(reportData.rentaEstimada ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h2>
                                        <small style={{ fontSize: '0.7rem' }}>Proyección sobre utilidad</small>
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
                                                        ${(cat.amount ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
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
                                            ${((reportData.totalIngresos ?? 0) / (reportData.transactionCount || 1)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
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
                </>
            )}
        </div>
    );
}
