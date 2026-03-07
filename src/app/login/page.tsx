'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Verificar rate limiting
        try {
            const rateLimitResponse = await fetch('/api/auth/check-rate-limit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: email.trim() }),
            });

            const rateLimitData = await rateLimitResponse.json();

            if (!rateLimitData.allowed) {
                const minutes = Math.ceil(rateLimitData.retryAfter / 60);
                setError(`Demasiados intentos fallidos. Intenta nuevamente en ${minutes} minuto(s).`);
                setLoading(false);
                return;
            }
        } catch (err) {
            console.error('Error checking rate limit:', err);
        }

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Error al iniciar sesión');
                setLoading(false);

                // Registrar intento fallido
                try {
                    await fetch('/api/auth/record-failed-attempt', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ identifier: email.trim() }),
                    });
                } catch (err) {
                    console.error('Error recording failed attempt:', err);
                }
                return;
            }

            // Login exitoso, limpiar rate limit
            try {
                await fetch('/api/auth/clear-rate-limit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier: email.trim() }),
                });
            } catch (err) {
                console.error('Error clearing rate limit:', err);
            }

            router.push('/dashboard');
        } catch {
            setError('Error de conexión');
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.backgroundDecoration}>
                <div className={styles.blob1}></div>
                <div className={styles.blob2}></div>
                <div className={styles.blob3}></div>
            </div>

            <div className={styles.loginCard}>
                <div className={styles.header}>
                    <div className={styles.logo}>
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="48" height="48" rx="12" fill="var(--primary)" />
                            <path d="M24 12L34 18V30L24 36L14 30V18L24 12Z" fill="white" fillOpacity="0.9" />
                            <circle cx="24" cy="24" r="4" fill="var(--primary)" />
                        </svg>
                    </div>
                    <h1>Conta<span className={styles.highlight}>2</span>Go</h1>
                    <p className={styles.subtitle}>Sistema Contable de Nivel Bancario</p>
                </div>

                <form onSubmit={handleLogin} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="email">Correo Electrónico</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tu@email.com"
                            required
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="password">Contraseña</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••••••"
                            required
                            className={styles.input}
                        />
                    </div>

                    {error && (
                        <div className={styles.error}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM7 4h2v5H7V4zm0 6h2v2H7v-2z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <button type="submit" disabled={loading} className={styles.button}>
                        {loading ? (
                            <>
                                <span className={styles.spinner}></span>
                                Iniciando sesión...
                            </>
                        ) : (
                            'Iniciar Sesión'
                        )}
                    </button>
                </form>

                <div className={styles.footer}>
                    <p>¿No tienes cuenta? <a href="/register" className={styles.link}>Regístrate aquí</a></p>
                    <p style={{ marginTop: '0.5rem' }}>🔒 Protegido con encriptación de grado bancario</p>
                </div>
            </div>
        </div>
    );
}
