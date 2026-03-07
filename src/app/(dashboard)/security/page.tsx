'use client';

import { Suspense } from 'react';
import SecurityDashboard from '@/app/security-dashboard/page';

export default function SecurityPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <SecurityDashboard />
        </Suspense>
    );
}
