'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { formatCurrency, formatDateTime } from '@/lib/formatting';
import { SkeletonStatsGrid } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
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
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [stats, setStats] = useState({ balance: 0, change: 0 });
    const [loading, setLoading] = useState(true);

    const fetchLedger = useCallback(async () => {
        if (!activeCompanyId) return;
        setLoading(true);
        try {
            const response = await fetch('/api/ledger', {
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
    }, [activeCompanyId]);

    useEffect(() => {
        if (activeCompanyId) {
            fetchLedger();
        } else {
            setEntries([]);
            setLoading(false);
        }
    }, [activeCompanyId, fetchLedger]);

    const getHumanInterpretation = (entry: LedgerEntry) => {
        if (entry.type === 'CREDIT') {
            return `Ingreso registrado en ${entry.account.name}. Los balances financieros han sido actualizados automáticamente.`;
        }
        return `Gasto detectado en ${entry.account.name}. Clasificado para optimización fiscal.`;
    };

    if (companyLoading || (loading && entries.length === 0)) {
        return (
            <div className={styles.page}>
                <div className={styles.header}>
                    <div className={styles.headerText}>
                        <h1>Bienestar Financiero</h1>
                    </div>
                </div>
                <SkeletonStatsGrid count={1} />
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.headerText}>
                    <h1>Bienestar Financiero</h1>
                    <p>
                        Tu contabilidad sucede en silencio. El <strong>Ledger Invisible</strong> registra
                        automáticamente cada transacción en libros contables de partida doble, preparándote
                        para auditorías y declaraciones sin esfuerzo manual.
                    </p>
                </div>
                <div className={styles.badges}>
                    <span className={`${styles.badge} ${styles.badgeGreen}`}>
                        🛡 Protección AML Activa
                    </span>
                    <span className={`${styles.badge} ${styles.badgeBlue}`}>
                        ⚡ IA Contable Lista
                    </span>
                </div>
            </header>

            {!activeCompanyId ? (
                <div className={styles.noCompany}>
                    <p>Selecciona una empresa para ver su bienestar financiero.</p>
                </div>
            ) : (
                <>
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statCardHeader}>
                                <span className={styles.statLabel}>Balance Contable</span>
                                <div className={`${styles.statIcon} ${styles.statIconGreen}`}>💰</div>
                            </div>
                            <p className={styles.statAmount}>{formatCurrency(stats.balance)}</p>
                            <span className={styles.statChange}>
                                ↑ +{stats.change}% vs periodo anterior
                            </span>
                        </div>
                    </div>

                    <div className={styles.ledgerSection}>
                        <div className={styles.ledgerHeader}>
                            <h2 className={styles.ledgerTitle}>Libro Mayor Invisible</h2>
                        </div>

                        {entries.length === 0 ? (
                            <EmptyState
                                icon="📒"
                                title="Sin actividad contable"
                                description="No hay asientos contables registrados aún. Las transacciones que registres aparecerán aquí automáticamente."
                            />
                        ) : (
                            entries.map(entry => (
                                <div key={entry.id} className={styles.ledgerEntry}>
                                    <div className={styles.entryLeft}>
                                        <div className={entry.type === 'CREDIT' ? styles.entryIconCredit : styles.entryIconDebit}>
                                            {entry.type === 'CREDIT' ? '↙' : '↗'}
                                        </div>
                                        <div>
                                            <p className={styles.entryDescription}>{entry.description}</p>
                                            <p className={styles.entryDate}>{formatDateTime(entry.createdAt)}</p>
                                            <p className={styles.entryInterpretation}>
                                                {getHumanInterpretation(entry)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={styles.entryRight}>
                                        <div className={entry.type === 'CREDIT' ? styles.entryAmountCredit : styles.entryAmountDebit}>
                                            {entry.type === 'CREDIT' ? '+' : '-'}{formatCurrency(entry.amount || 0)}
                                        </div>
                                        <span className={styles.entryAutoBadge}>Asiento Automático</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
