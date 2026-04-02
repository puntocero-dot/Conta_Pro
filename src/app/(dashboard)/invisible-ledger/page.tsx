'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { useFilter } from '@/context/FilterContext';
import { formatCurrency, formatDateTime } from '@/lib/formatting';
import { SkeletonStatsGrid } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { WalletIcon, ShieldIcon, SparklesIcon } from '@/components/icons';
import styles from './invisible-ledger.module.css';

interface LedgerEntry {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'DEBIT' | 'CREDIT';
    account: { name: string };
    createdAt: string;
}

export default function InvisibleLedgerPage() {
    const { activeCompanyId, isLoading: companyLoading } = useCompany();
    const { startDate, endDate } = useFilter();
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [stats, setStats] = useState({ balance: 0, change: 0 });
    const [loading, setLoading] = useState(true);

    const fetchLedger = useCallback(async () => {
        if (!activeCompanyId) return;
        setLoading(true);
        try {
            const url = `/api/ledger?startDate=${startDate}&endDate=${endDate}`;
            const response = await fetch(url, {
                headers: {
                    'x-company-id': activeCompanyId,
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            if (response.ok) {
                const data = await response.json();
                const rawEntries = data.entries || [];

                const mappedEntries: LedgerEntry[] = rawEntries.map((je: any) => {
                    const mainLine = je.lines?.[0] || { debit: 0, credit: 0, account: { name: 'Cuenta desconocida' } };
                    const isCredit = mainLine.credit > 0;
                    return {
                        id: je.id,
                        date: je.date,
                        description: je.description,
                        amount: isCredit ? mainLine.credit : mainLine.debit,
                        type: isCredit ? 'CREDIT' : 'DEBIT',
                        account: { name: mainLine.account?.name || 'Desconocida' },
                        createdAt: je.createdAt,
                    };
                });

                setEntries(mappedEntries);
                const balance = mappedEntries.reduce((acc: number, curr: LedgerEntry) =>
                    curr.type === 'CREDIT' ? acc + (curr.amount || 0) : acc - (curr.amount || 0), 0
                );
                setStats({ balance, change: 12 });
            }
        } catch (error) {
            console.error('Error fetching ledger:', error);
        } finally {
            setLoading(false);
        }
    }, [activeCompanyId, startDate, endDate]);

    useEffect(() => {
        if (activeCompanyId) {
            fetchLedger();
        } else {
            setEntries([]);
            setLoading(false);
        }
    }, [activeCompanyId, startDate, endDate, fetchLedger]);

    const getHumanInterpretation = (entry: LedgerEntry) => {
        if (entry.type === 'CREDIT') {
            return `Ingreso registrado en ${entry.account.name}. Los balances financieros han sido actualizados automáticamente.`;
        }
        return `Gasto detectado en ${entry.account.name}. Clasificado para optimización fiscal.`;
    };

    if (companyLoading || (loading && entries.length === 0)) {
        return (
            <div>
                <PageHeader title="Bienestar Financiero" subtitle="Contabilidad automática de partida doble" />
                <SkeletonStatsGrid count={1} />
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title="Bienestar Financiero"
                subtitle="Tu contabilidad sucede en silencio. Partida doble automática lista para auditorías."
            >
                <span className={`badge badge-success`}><ShieldIcon size={12} /> AML Activo</span>
                <span className={`badge badge-info`}><SparklesIcon size={12} /> IA Lista</span>
            </PageHeader>

            {!activeCompanyId ? (
                <EmptyState
                    icon="🏢"
                    title="Sin empresa seleccionada"
                    description="Selecciona una empresa para ver su bienestar financiero."
                />
            ) : (
                <>
                    <div className={styles.statsRow}>
                        <StatCard
                            label="Balance Contable"
                            value={formatCurrency(stats.balance)}
                            icon={<WalletIcon size={16} />}
                            variant={stats.balance >= 0 ? 'neutral' : 'expense'}
                        />
                    </div>

                    <div className={styles.ledgerSection}>
                        <h2 className={styles.ledgerTitle}>Libro Mayor Invisible</h2>

                        {entries.length === 0 ? (
                            <EmptyState
                                icon="📒"
                                title="Sin actividad contable"
                                description="No hay asientos contables registrados. Las transacciones aparecerán aquí automáticamente."
                            />
                        ) : (
                            <div className={styles.entriesList}>
                                {entries.map(entry => (
                                    <div key={entry.id} className={styles.ledgerEntry}>
                                        <div className={entry.type === 'CREDIT' ? styles.entryIconCredit : styles.entryIconDebit}>
                                            {entry.type === 'CREDIT' ? '↙' : '↗'}
                                        </div>
                                        <div className={styles.entryInfo}>
                                            <p className={styles.entryDescription}>{entry.description}</p>
                                            <p className={styles.entryMeta}>{entry.account.name} · {formatDateTime(entry.createdAt)}</p>
                                        </div>
                                        <div className={styles.entryRight}>
                                            <span className={entry.type === 'CREDIT' ? styles.entryAmountCredit : styles.entryAmountDebit}>
                                                {entry.type === 'CREDIT' ? '+' : '-'}{formatCurrency(entry.amount || 0)}
                                            </span>
                                            <span className={`badge badge-neutral ${styles.autoBadge}`}>Auto</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
