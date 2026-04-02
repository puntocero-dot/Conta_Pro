import { useState } from 'react';
import styles from './ColorPicker.module.css';

const SWATCHES = [
    '#2563eb', '#7c3aed', '#db2777', '#dc2626',
    '#ea580c', '#16a34a', '#0891b2', '#0c1220',
];

interface ColorPickerProps {
    label: string;
    value: string;
    onChange: (color: string) => void;
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
    const [hex, setHex] = useState(value || '');

    const handleHexInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setHex(v);
        if (/^#[0-9a-fA-F]{6}$/.test(v)) {
            onChange(v);
        }
    };

    const handleNative = (e: React.ChangeEvent<HTMLInputElement>) => {
        setHex(e.target.value);
        onChange(e.target.value);
    };

    return (
        <div className={styles.wrapper}>
            <label className={styles.label}>{label}</label>
            <div className={styles.row}>
                <input
                    type="color"
                    className={styles.native}
                    value={value || '#2563eb'}
                    onChange={handleNative}
                />
                <input
                    type="text"
                    className={`input ${styles.hexInput}`}
                    value={hex}
                    onChange={handleHexInput}
                    placeholder="#000000"
                    maxLength={7}
                />
            </div>
            <div className={styles.swatches}>
                {SWATCHES.map(s => (
                    <button
                        key={s}
                        type="button"
                        className={`${styles.swatch} ${value === s ? styles.swatchActive : ''}`}
                        style={{ background: s }}
                        onClick={() => { setHex(s); onChange(s); }}
                        title={s}
                    />
                ))}
            </div>
        </div>
    );
}
