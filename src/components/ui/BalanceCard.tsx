'use client';

import styles from './BalanceCard.module.css';

interface BalanceCardProps {
    balance: number;
    ingresos: number;
    egresos: number;
    previousBalance?: number;
    label?: string;
}

function formatCurrency(n: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export function BalanceCard({ balance, ingresos, egresos, previousBalance, label = 'Balance del período' }: BalanceCardProps) {
    const total = ingresos + egresos;
    const ingresoPct = total > 0 ? (ingresos / total) * 100 : 50;
    const isPositive = balance >= 0;

    let delta: number | null = null;
    if (previousBalance !== undefined && previousBalance !== 0) {
        delta = ((balance - previousBalance) / Math.abs(previousBalance)) * 100;
    }

    const marginPct = ingresos > 0 ? ((balance / ingresos) * 100) : 0;

    return (
        <div className={`${styles.card} ${isPositive ? styles.positive : styles.negative}`}>
            <div className={styles.topRow}>
                <div>
                    <p className={styles.label}>{label}</p>
                    <p className={styles.amount}>{formatCurrency(balance)}</p>
                </div>
                <div className={styles.meta}>
                    {delta !== null && (
                        <span className={`${styles.delta} ${delta >= 0 ? styles.up : styles.down}`}>
                            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}% vs período anterior
                        </span>
                    )}
                    <span className={styles.margin}>
                        Margen {marginPct.toFixed(1)}%
                    </span>
                </div>
            </div>

            <div className={styles.bar}>
                <div className={styles.barInner} style={{ width: `${ingresoPct}%` }} />
            </div>

            <div className={styles.breakdown}>
                <div className={styles.breakdownItem}>
                    <span className={styles.dot} style={{ background: '#10b981' }} />
                    <span className={styles.breakdownLabel}>Ingresos</span>
                    <span className={styles.breakdownAmount}>{formatCurrency(ingresos)}</span>
                </div>
                <div className={styles.breakdownItem}>
                    <span className={styles.dot} style={{ background: '#ef4444' }} />
                    <span className={styles.breakdownLabel}>Egresos</span>
                    <span className={styles.breakdownAmount}>{formatCurrency(egresos)}</span>
                </div>
            </div>
        </div>
    );
}
