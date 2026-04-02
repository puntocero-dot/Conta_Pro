'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    size?: 'sm' | 'md' | 'lg';
    children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, size = 'md', children }: ModalProps) {
    const [shaking, setShaking] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    const handleBackdropClick = useCallback(() => {
        setShaking(true);
        setTimeout(() => setShaking(false), 400);
    }, []);

    const handleModalClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);

        // Lock body scroll
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        // Focus the modal
        modalRef.current?.focus();

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = prev;
        };
    }, [isOpen, onClose]);

    if (!isOpen || typeof window === 'undefined') return null;

    return createPortal(
        <div
            className={`${styles.overlay} ${shaking ? styles.shaking : ''}`}
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div
                ref={modalRef}
                className={`${styles.modal} ${styles[size]}`}
                onClick={handleModalClick}
                tabIndex={-1}
            >
                <div className={styles.header}>
                    <h2 id="modal-title" className={styles.title}>{title}</h2>
                    <button
                        className={styles.closeBtn}
                        onClick={onClose}
                        aria-label="Cerrar"
                    >
                        ✕
                    </button>
                </div>
                <div className={styles.body}>
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}
