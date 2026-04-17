'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './onboarding.module.css';
import { PLANS } from '@/lib/plans';

export default function OnboardingPage() {
    const router = useRouter();
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

    const handleSelectPlan = async (planId: string) => {
        setLoadingPlan(planId);
        try {
            const res = await fetch('/api/admin/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: planId }),
            });
            
            if (res.ok) {
                // Por ahora, redirigimos a companies para que cree su primera empresa
                // pero ya dejamos el lead guardado.
                router.push('/companies?first=true');
            }
        } catch (error) {
            console.error('Error selecting plan:', error);
            router.push('/companies');
        } finally {
            setLoadingPlan(null);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Bienvenido a <span className={styles.brand}>Conta_pro</span></h1>

                <p>Estás a un paso de revolucionar la gestión de tu negocio. Elige el plan que mejor se adapte a ti.</p>
            </div>

            <div className={styles.plansGrid}>
                {PLANS.map((plan) => (
                    <div key={plan.id} className={`${styles.planCard} ${plan.popular ? styles.popular : ''}`}>
                        {plan.popular && <div className={styles.badge}>Más Popular</div>}
                        <h2 className={styles.planName}>{plan.name}</h2>
                        <div className={styles.price}>
                            <span className={styles.amount}>{plan.price}</span>
                            <span className={styles.period}>/mes</span>
                        </div>
                        <p className={styles.planDescription}>{plan.description}</p>
                        
                        <ul className={styles.featuresList}>
                            {plan.features.map((f, i) => (
                                <li key={i}>✅ {f}</li>
                            ))}
                        </ul>

                        <button 
                            disabled={!!loadingPlan}
                            onClick={() => handleSelectPlan(plan.id)}
                            className={styles.selectBtn}
                            style={{ background: plan.color }}
                        >
                            {loadingPlan === plan.id ? 'Procesando...' : 'Comenzar ahora'}
                        </button>
                    </div>
                ))}
            </div>

            <div className={styles.footerNote}>
                <p>¿Necesitas algo personalizado? <button className={styles.linkBtn}>Habla con un consultor de Punto Cero</button></p>
            </div>
        </div>
    );
}
