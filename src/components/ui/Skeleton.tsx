import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonLineProps {
    width?: 'short' | 'medium' | 'full';
    className?: string;
}

export function SkeletonLine({ width = 'full', className }: SkeletonLineProps) {
    return (
        <div
            className={`${styles.skeleton} ${styles.line} ${styles[width]} ${className || ''}`}
        />
    );
}

export function SkeletonCard() {
    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <div className={`${styles.skeleton} ${styles.avatar}`} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <SkeletonLine width="medium" />
                    <SkeletonLine width="short" />
                </div>
            </div>
            <SkeletonLine width="full" />
            <SkeletonLine width="medium" />
        </div>
    );
}

interface SkeletonTableProps {
    rows?: number;
    cols?: 3 | 4 | 5;
}

export function SkeletonTable({ rows = 5, cols = 4 }: SkeletonTableProps) {
    return (
        <div>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className={`${styles.tableRow} ${styles[`cols${cols}`]}`}>
                    {Array.from({ length: cols }).map((_, j) => (
                        <SkeletonLine
                            key={j}
                            width={j === 0 ? 'medium' : j === cols - 1 ? 'short' : 'full'}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function SkeletonStatsGrid({ count = 3 }: { count?: number }) {
    return (
        <div className={styles.statsGrid}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}
