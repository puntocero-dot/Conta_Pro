'use client';

import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/context/CompanyContext';
import { useFilter } from '@/context/FilterContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BalanceCard } from '@/components/ui/BalanceCard';
import { StatCard } from '@/components/ui/StatCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { WalletIcon, BarChartIcon, BuildingIcon, TrendingUpIcon, TrendingDownIcon } from '@/components/icons';
import styles from './dashboard.module.css';

interface DashboardStats {
    totalIngresos: number;
    totalEgresos: number;
    balance: number;
    transactionCount: number;
    previousPeriod?: {
        totalIngresos: number;
        totalEgresos: number;
        balance: number;
    };
}

function calcDelta(current: number, previous: number): number | undefined {
    if (!previous) return undefined;
    return ((current - previous) / Math.abs(previous)) * 100;
}

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const { activeCompanyId, isLoading: companyLoading } = useCompany();
    const { startDate, endDate } = useFilter();
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
                const isGlobal = activeCompanyId === 'GLOBAL';
                const url = isGlobal 
                    ? '/api/admin/global-stats' 
                    : `/api/reports?startDate=${startDate}&endDate=${endDate}`;
                
                const response = await fetch(url, {
                    headers: {
                        'x-company-id': isGlobal ? '' : activeCompanyId,
                        'X-Requested-With': 'XMLHttpRequest',
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (isGlobal) {
                        setStats({
                            totalIngresos: data.globalIncome,
                            totalEgresos: data.globalExpense,
                            balance: data.globalIncome - data.globalExpense,
                            transactionCount: data.totalTransactions,
                        });
                    } else {
                        setStats(data);
                    }
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
    }, [activeCompanyId, startDate, endDate]);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    const loading = authLoading || companyLoading || (isFetching && !stats);

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner} />
                <p>Cargando...</p>
            </div>
        );
    }

    if (!user) return null;

    const prev = stats?.previousPeriod;

    return (
        <div>
            <PageHeader
                title={activeCompanyId === 'GLOBAL' ? 'Consolidado Global (Admin)' : `Hola, ${user.email?.split('@')[0]}`}
                subtitle={activeCompanyId === 'GLOBAL' 
                    ? 'Resumen administrativo de todo el sistema Conta Pro.' 
                    : "Aquí tienes un resumen del período seleccionado."}
            />

            {stats && (
                <BalanceCard
                    balance={stats.balance}
                    ingresos={stats.totalIngresos}
                    egresos={stats.totalEgresos}
                    previousBalance={prev?.balance}
                />
            )}

            <div className={styles.statsGrid}>
                <StatCard
                    label="Ingresos"
                    value={formatCurrency(stats?.totalIngresos || 0)}
                    icon={<TrendingUpIcon size={16} />}
                    variant="income"
                    delta={prev ? calcDelta(stats!.totalIngresos, prev.totalIngresos) : undefined}
                />
                <StatCard
                    label="Egresos"
                    value={formatCurrency(stats?.totalEgresos || 0)}
                    icon={<TrendingDownIcon size={16} />}
                    variant="expense"
                    delta={prev ? calcDelta(stats!.totalEgresos, prev.totalEgresos) : undefined}
                />
                <StatCard
                    label="Transacciones"
                    value={stats?.transactionCount || 0}
                    icon={<WalletIcon size={16} />}
                    variant="neutral"
                />
            </div>

            <h2 className={styles.sectionTitle}>Acciones rápidas</h2>
            <div className={styles.quickActions}>
                <button onClick={() => router.push('/transactions')} className={styles.actionCard}>
                    <span className={styles.actionIcon}><WalletIcon size={22} /></span>
                    <div>
                        <h3>Transacciones</h3>
                        <p>Registra ingresos y egresos</p>
                    </div>
                </button>
                <button onClick={() => router.push('/reports')} className={styles.actionCard}>
                    <span className={styles.actionIcon}><BarChartIcon size={22} /></span>
                    <div>
                        <h3>Reportes</h3>
                        <p>Análisis financiero del período</p>
                    </div>
                </button>
                <button onClick={() => router.push('/companies')} className={styles.actionCard}>
                    <span className={styles.actionIcon}><BuildingIcon size={22} /></span>
                    <div>
                        <h3>Empresas</h3>
                        <p>Gestiona tus empresas</p>
                    </div>
                </button>
            </div>
        </div>
    );
}
