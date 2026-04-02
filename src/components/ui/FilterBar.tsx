import styles from './FilterBar.module.css';

interface FilterOption {
    value: string;
    label: string;
}

interface FilterBarProps {
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
}

export function FilterBar({ options, value, onChange }: FilterBarProps) {
    return (
        <div className={styles.bar}>
            {options.map(opt => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={`${styles.pill} ${value === opt.value ? styles.active : ''}`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}
