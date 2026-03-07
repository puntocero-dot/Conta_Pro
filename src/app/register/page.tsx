'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { validatePassword } from '@/lib/auth/password-policy';
import styles from './register.module.css';
import Link from 'next/link';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
    const [securityWarnings, setSecurityWarnings] = useState<string[]>([]);
    const router = useRouter();

    const handlePasswordChange = (value: string) => {
        setPassword(value);
        const validation = validatePassword(value);
        setPasswordErrors(validation.errors);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validar contraseña
        const validation = validatePassword(password);
        if (!validation.valid) {
            setError(validation.errors[0]);
            setLoading(false);
            return;
        }

        // Verificar que las contraseñas coincidan
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            setLoading(false);
            return;
        }

        // Validar seguridad de la contraseña con HIBP (cliente)
        try {
            const hibpResponse = await fetch('/api/auth/validate-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            const hibpData = await hibpResponse.json();

            if (!hibpData.isSecure) {
                setSecurityWarnings(hibpData.warnings);
                setError('La contraseña no es segura. Revisa las advertencias.');
                setLoading(false);
                return;
            }
        } catch (err) {
            console.error('Error validating password with HIBP:', err);
        }

        // Registrar con API propia
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Error al crear cuenta');
                setLoading(false);
                return;
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

            <div className={styles.registerCard}>
                <div className={styles.header}>
                    <div className={styles.logo}>
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="48" height="48" rx="12" fill="var(--primary)" />
                            <path d="M24 12L34 18V30L24 36L14 30V18L24 12Z" fill="white" fillOpacity="0.9" />
                            <circle cx="24" cy="24" r="4" fill="var(--primary)" />
                        </svg>
                    </div>
                    <h1>Crear Cuenta</h1>
                    <p className={styles.subtitle}>Únete a Conta<span className={styles.highlight}>2</span>Go</p>
                </div>

                <form onSubmit={handleRegister} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="email">Correo Electrónico</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tu@empresa.com"
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
                            onChange={(e) => handlePasswordChange(e.target.value)}
                            placeholder="Mínimo 12 caracteres"
                            required
                            className={styles.input}
                        />
                        {passwordErrors.length > 0 && (
                            <div className={styles.passwordHints}>
                                {passwordErrors.map((err, idx) => (
                                    <p key={idx} className={styles.hint}>⚠️ {err}</p>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="confirmPassword">Confirmar Contraseña</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repite tu contraseña"
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

                    {securityWarnings.length > 0 && (
                        <div className={styles.securityWarnings}>
                            <strong>⚠️ Advertencias de seguridad:</strong>
                            {securityWarnings.map((warning, idx) => (
                                <p key={idx} className={styles.warningText}>{warning}</p>
                            ))}
                        </div>
                    )}

                    <button type="submit" disabled={loading || passwordErrors.length > 0} className={styles.button}>
                        {loading ? (
                            <>
                                <span className={styles.spinner}></span>
                                Creando cuenta...
                            </>
                        ) : (
                            'Registrarse'
                        )}
                    </button>
                </form>

                <div className={styles.footer}>
                    <p>¿Ya tienes cuenta? <Link href="/login" className={styles.link}>Inicia sesión aquí</Link></p>
                </div>

                <div className={styles.securityNote}>
                    <p>🔒 Tu contraseña será encriptada con AES-256</p>
                </div>
            </div>
        </div>
    );
}
