'use client';

import Link from 'next/link';
import styles from './HubGrid.module.css';

interface HubItem {
    path: string;
    icon: React.ReactNode;
    label: string;
    description: string;
}

interface HubGridProps {
    items: HubItem[];
}

export function HubGrid({ items }: HubGridProps) {
    return (
        <div className={styles.container}>
            <div className={styles.grid}>
                {items.map((item) => (
                    <Link key={item.path} href={item.path} className={styles.card}>
                        <div className={styles.iconWrapper}>
                            {item.icon}
                        </div>
                        <div className={styles.content}>
                            <h3>{item.label}</h3>
                            <p>{item.description}</p>
                        </div>
                        <div className={styles.arrow}>
                            <span>Explorar</span>
                            <span>→</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
