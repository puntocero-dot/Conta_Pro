import { ReactNode } from 'react';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    children?: ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
    return (
        <div className={styles.header}>
            <div className={styles.text}>
                <h1>{title}</h1>
                {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
            {children && <div className={styles.actions}>{children}</div>}
        </div>
    );
}
