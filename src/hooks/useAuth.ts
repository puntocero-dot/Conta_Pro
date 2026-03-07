'use client';

import { useEffect, useState, useCallback } from 'react';
import { Role } from '@/lib/auth/rbac';

interface AuthUser {
    id: string;
    email: string;
    role: Role;
}

export function useAuth() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [role, setRole] = useState<Role | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = useCallback(async () => {
        try {
            const res = await fetch('/api/users/me');
            if (res.ok) {
                const data = await res.json();
                setUser({
                    id: data.id,
                    email: data.email,
                    role: data.role,
                });
                setRole(data.role);
            } else {
                setUser(null);
                setRole(null);
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            setUser(null);
            setRole(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const logout = useCallback(async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            setUser(null);
            setRole(null);
            window.location.href = '/login';
        } catch (error) {
            console.error('Error logging out:', error);
        }
    }, []);

    return { user, role, loading, logout, refetch: fetchUser };
}
