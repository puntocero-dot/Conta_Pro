'use client';

import styles from './MiniChart.module.css';

interface ChartItem {
    label: string;
    value: number;
    color?: string;
    type?: string;
}

interface MiniChartProps {
    data: ChartItem[];
    formatValue?: (v: number) => string;
}

const COLORS_BY_TYPE: Record<string, string> = {
    INGRESO: '#10b981',
    EGRESO: '#ef4444',
};

const DEFAULT_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#14b8a6', '#f97316'];

function formatCurrency(n: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export function MiniChart({ data, formatValue = formatCurrency }: MiniChartProps) {
    if (!data || data.length === 0) {
        return <p className={styles.empty}>Sin datos para este período</p>;
    }

    const max = Math.max(...data.map(d => d.value));

    return (
        <div className={styles.chart}>
            {data.map((item, i) => {
                const color = item.color || (item.type ? COLORS_BY_TYPE[item.type] : null) || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
                const pct = max > 0 ? (item.value / max) * 100 : 0;
                return (
                    <div key={i} className={styles.row}>
                        <span className={styles.label} title={item.label}>{item.label}</span>
                        <div className={styles.barTrack}>
                            <div
                                className={styles.bar}
                                style={{ width: `${pct}%`, background: color }}
                            />
                        </div>
                        <span className={styles.value}>{formatValue(item.value)}</span>
                    </div>
                );
            })}
        </div>
    );
}
