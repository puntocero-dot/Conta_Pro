'use client';

import { useFilter, DatePreset } from '@/context/FilterContext';
import styles from './DateRangePicker.module.css';

const PRESETS: { value: DatePreset; label: string }[] = [
    { value: 'THIS_MONTH', label: 'Este mes' },
    { value: 'LAST_MONTH', label: 'Mes anterior' },
    { value: 'THIS_QUARTER', label: 'Este trimestre' },
    { value: 'THIS_YEAR', label: 'Este año' },
    { value: 'LAST_7_DAYS', label: 'Últimos 7 días' },
    { value: 'LAST_30_DAYS', label: 'Últimos 30 días' },
    { value: 'CUSTOM', label: 'Personalizado' },
];

export function DateRangePicker() {
    const { startDate, endDate, preset, setDateRange, setPreset } = useFilter();

    return (
        <div className={styles.container}>
            <select
                className={styles.presetSelect}
                value={preset}
                onChange={e => setPreset(e.target.value as DatePreset)}
                aria-label="Período"
            >
                {PRESETS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                ))}
            </select>
            <div className={styles.dates}>
                <input
                    type="date"
                    className={styles.dateInput}
                    value={startDate}
                    max={endDate}
                    onChange={e => setDateRange(e.target.value, endDate)}
                    aria-label="Fecha inicio"
                />
                <span className={styles.separator}>—</span>
                <input
                    type="date"
                    className={styles.dateInput}
                    value={endDate}
                    min={startDate}
                    onChange={e => setDateRange(startDate, e.target.value)}
                    aria-label="Fecha fin"
                />
            </div>
        </div>
    );
}
