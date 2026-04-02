'use client';

import React, { Component, ErrorInfo } from 'react';

interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[ErrorBoundary] Uncaught error:', error, info);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: undefined });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3rem',
                    gap: '1rem',
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: '2.5rem' }}>⚠️</div>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                        Algo salió mal
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, maxWidth: '360px' }}>
                        Ocurrió un error inesperado. Puedes intentar recargar la sección.
                    </p>
                    <button
                        onClick={this.handleRetry}
                        style={{
                            padding: '0.625rem 1.25rem',
                            background: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                        }}
                    >
                        Reintentar
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
