'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Toast.module.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

const ICONS: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
};

interface ToastProps {
    toasts: ToastItem[];
    onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastProps) {
    const [exiting, setExiting] = useState<Set<string>>(new Set());

    const handleRemove = (id: string) => {
        setExiting(prev => new Set(prev).add(id));
        setTimeout(() => {
            onRemove(id);
            setExiting(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }, 250);
    };

    if (typeof window === 'undefined') return null;

    return createPortal(
        <div className={styles.container}>
            {toasts.map(toast => (
                <AutoDismissToast
                    key={toast.id}
                    toast={toast}
                    exiting={exiting.has(toast.id)}
                    onRemove={handleRemove}
                />
            ))}
        </div>,
        document.body
    );
}

function AutoDismissToast({
    toast,
    exiting,
    onRemove,
}: {
    toast: ToastItem;
    exiting: boolean;
    onRemove: (id: string) => void;
}) {
    useEffect(() => {
        const duration = toast.duration ?? 4000;
        if (duration <= 0) return;
        const timer = setTimeout(() => onRemove(toast.id), duration);
        return () => clearTimeout(timer);
    }, [toast.id, toast.duration, onRemove]);

    return (
        <div
            className={`${styles.toast} ${styles[toast.type]} ${exiting ? styles.exiting : ''}`}
            role="alert"
        >
            <span className={styles.icon}>{ICONS[toast.type]}</span>
            <div className={styles.content}>
                <p className={styles.message}>{toast.message}</p>
            </div>
            <button
                className={styles.close}
                onClick={() => onRemove(toast.id)}
                aria-label="Cerrar notificación"
            >
                ✕
            </button>
        </div>
    );
}
