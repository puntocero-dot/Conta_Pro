'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/context/CompanyContext';
import { useFilter } from '@/context/FilterContext';
import { BalanceCard } from '@/components/ui/BalanceCard';
import { MiniChart } from '@/components/ui/MiniChart';
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
    byCategory: Array<{ name: string; amount: number; percentage: number; type?: string }>;
    topClients?: Array<{ name: string; amount: number; count: number }>;
    previousPeriod?: { totalIngresos: number; totalEgresos: number; balance: number };
}

function fmt(n: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);
}

function delta(current: number, prev?: number) {
    if (!prev) return null;
    const d = ((current - prev) / Math.abs(prev)) * 100;
    return d;
}

interface KpiCardProps {
    label: string;
    value: string;
    delta?: number | null;
    sub?: string;
    variant?: 'default' | 'green' | 'red' | 'blue';
}

function KpiCard({ label, value, delta: d, sub, variant = 'default' }: KpiCardProps) {
    return (
        <div className={`${styles.kpiCard} ${styles[variant]}`}>
            <p className={styles.kpiLabel}>{label}</p>
            <p className={styles.kpiValue}>{value}</p>
            {d !== null && d !== undefined && (
                <span className={`${styles.kpiDelta} ${d >= 0 ? styles.up : styles.down}`}>
                    {d >= 0 ? '↑' : '↓'} {Math.abs(d).toFixed(1)}%
                </span>
            )}
            {sub && <p className={styles.kpiSub}>{sub}</p>}
        </div>
    );
}

export default function ReportsPage() {
    const { user, loading: authLoading } = useAuth();
    const { activeCompanyId, isLoading: companyLoading } = useCompany();
    const { startDate, endDate } = useFilter();
    const router = useRouter();
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchReport = useCallback(async () => {
        if (!activeCompanyId) return;
        setLoading(true);
        try {
            const response = await fetch(`/api/reports?startDate=${startDate}&endDate=${endDate}`, {
                headers: { 'x-company-id': activeCompanyId, 'X-Requested-With': 'XMLHttpRequest' }
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
    }, [activeCompanyId, startDate, endDate]);

    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
    }, [user, authLoading, router]);

    useEffect(() => {
        if (activeCompanyId) {
            fetchReport();
        } else {
            setReportData(null);
            setLoading(false);
        }
    }, [activeCompanyId, startDate, endDate, fetchReport]);

    if (authLoading || companyLoading || (loading && !reportData)) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Generando reporte...</p>
            </div>
        );
    }

    const prev = reportData?.previousPeriod;

    return (
        <div className="animate-fade-in">
            <div className={styles.pageHeader}>
                <div>
                    <h1>Reportes Financieros</h1>
                    <p className={styles.subtitle}>{startDate} → {endDate}</p>
                </div>
                <button onClick={() => window.print()} className="btn btn-secondary" disabled={!activeCompanyId}>
                    📄 Imprimir
                </button>
            </div>

            {!activeCompanyId && (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', border: '1px dashed #cbd5e1' }}>
                    <p>Selecciona una empresa en el panel lateral para ver sus reportes financieros.</p>
                </div>
            )}

            {activeCompanyId && reportData && (
                <>
                    {/* HERO: Balance Card */}
                    <BalanceCard
                        balance={reportData.balance}
                        ingresos={reportData.totalIngresos}
                        egresos={reportData.totalEgresos}
                        previousBalance={prev?.balance}
                    />

                    {/* KPI Row */}
                    <div className={styles.kpiGrid}>
                        <KpiCard
                            label="Ingresos"
                            value={fmt(reportData.totalIngresos)}
                            delta={delta(reportData.totalIngresos, prev?.totalIngresos)}
                            variant="green"
                        />
                        <KpiCard
                            label="Egresos"
                            value={fmt(reportData.totalEgresos)}
                            delta={delta(reportData.totalEgresos, prev?.totalEgresos)}
                            variant="red"
                        />
                        <KpiCard
                            label="IVA Neto (13%)"
                            value={fmt(reportData.iva)}
                            sub={`Déb: ${fmt(reportData.ivaDebito)} | Cré: ${fmt(reportData.ivaCredito)}`}
                            variant="blue"
                        />
                        <KpiCard
                            label="Pago a Cuenta"
                            value={fmt(reportData.pagoACuenta)}
                            sub="1.75% sobre ingresos brutos SV"
                        />
                    </div>

                    {/* Detail Grid */}
                    <div className={styles.detailGrid}>
                        {/* Categories */}
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>Desglose por Categoría</h3>
                            <MiniChart
                                data={reportData.byCategory.map(c => ({
                                    label: c.name,
                                    value: c.amount,
                                    type: c.type,
                                }))}
                            />
                        </div>

                        {/* Right column */}
                        <div className={styles.rightCol}>
                            {/* Top Clients */}
                            {reportData.topClients && reportData.topClients.length > 0 && (
                                <div className={styles.section}>
                                    <h3 className={styles.sectionTitle}>Top Clientes</h3>
                                    <MiniChart
                                        data={reportData.topClients.map(c => ({
                                            label: c.name,
                                            value: c.amount,
                                        }))}
                                    />
                                </div>
                            )}

                            {/* Tax Summary */}
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>Resumen Fiscal</h3>
                                <div className={styles.taxTable}>
                                    <div className={styles.taxRow}>
                                        <span>Operaciones</span>
                                        <strong>{reportData.transactionCount}</strong>
                                    </div>
                                    <div className={styles.taxRow}>
                                        <span>Ticket promedio</span>
                                        <strong>{fmt((reportData.totalIngresos) / (reportData.transactionCount || 1))}</strong>
                                    </div>
                                    <div className={styles.taxRow}>
                                        <span>Margen neto</span>
                                        <strong className={reportData.balance >= 0 ? styles.posText : styles.negText}>
                                            {((reportData.balance / (reportData.totalIngresos || 1)) * 100).toFixed(1)}%
                                        </strong>
                                    </div>
                                    <div className={styles.taxDivider} />
                                    <div className={styles.taxRow}>
                                        <span>IVA Débito</span>
                                        <strong>{fmt(reportData.ivaDebito)}</strong>
                                    </div>
                                    <div className={styles.taxRow}>
                                        <span>IVA Crédito</span>
                                        <strong>{fmt(reportData.ivaCredito)}</strong>
                                    </div>
                                    <div className={styles.taxRow}>
                                        <span>IVA a Pagar</span>
                                        <strong className={styles.posText}>{fmt(reportData.iva)}</strong>
                                    </div>
                                    <div className={styles.taxDivider} />
                                    <div className={styles.taxRow}>
                                        <span>Pago a Cuenta</span>
                                        <strong>{fmt(reportData.pagoACuenta)}</strong>
                                    </div>
                                    <div className={styles.taxRow}>
                                        <span>Est. Renta Anual</span>
                                        <strong>{fmt(reportData.rentaEstimada)}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeCompanyId && !loading && !reportData && (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <p>No hay datos para el período seleccionado.</p>
                </div>
            )}
        </div>
    );
}
