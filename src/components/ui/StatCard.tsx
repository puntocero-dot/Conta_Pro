import { ReactNode } from 'react';
import styles from './StatCard.module.css';

interface StatCardProps {
    label: string;
    value: string | number;
    icon?: ReactNode;
    delta?: number; // percentage change vs previous period
    variant?: 'default' | 'income' | 'expense' | 'neutral';
    formatValue?: (v: string | number) => string;
}

export function StatCard({ label, value, icon, delta, variant = 'default', formatValue }: StatCardProps) {
    const displayValue = formatValue ? formatValue(value) : value;
    const hasDelta = delta !== undefined && delta !== null && !isNaN(delta);
    const deltaPositive = hasDelta && delta! > 0;
    const deltaNeutral = hasDelta && delta === 0;

    return (
        <div className={`${styles.card} ${styles[variant]}`}>
            <div className={styles.top}>
                <span className={styles.label}>{label}</span>
                {icon && <span className={styles.icon}>{icon}</span>}
            </div>
            <div className={styles.value}>{displayValue}</div>
            {hasDelta && (
                <div className={`${styles.delta} ${deltaNeutral ? styles.neutral : deltaPositive ? styles.positive : styles.negative}`}>
                    <span className={styles.arrow}>{deltaNeutral ? '→' : deltaPositive ? '↑' : '↓'}</span>
                    <span>{Math.abs(delta!).toFixed(1)}% vs periodo anterior</span>
                </div>
            )}
        </div>
    );
}
