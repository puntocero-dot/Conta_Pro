import React from 'react';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
    icon?: string;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function EmptyState({ icon = '📂', title, description, actionLabel, onAction }: EmptyStateProps) {
    return (
        <div className={styles.container}>
            <div className={styles.iconWrapper}>{icon}</div>
            <h3 className={styles.title}>{title}</h3>
            {description && <p className={styles.description}>{description}</p>}
            {actionLabel && onAction && (
                <button className={styles.action} onClick={onAction}>
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
