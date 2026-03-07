'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface Company {
    id: string;
    name: string;
    taxId: string;
    country: string;
}

interface CompanyContextType {
    companies: Company[];
    activeCompany: Company | null;
    activeCompanyId: string | null;
    setActiveCompanyId: (id: string) => void;
    isLoading: boolean;
    refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchCompanies = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const response = await fetch('/api/companies');
            const data = await response.json();
            if (data.companies) {
                setCompanies(data.companies);

                // Si no hay empresa activa, intentar cargar de localStorage o tomar la primera
                const savedId = localStorage.getItem('conta2go_active_company');
                if (savedId && data.companies.some((c: Company) => c.id === savedId)) {
                    setActiveCompanyIdState(savedId);
                } else if (data.companies.length > 0) {
                    const firstId = data.companies[0].id;
                    setActiveCompanyIdState(firstId);
                    localStorage.setItem('conta2go_active_company', firstId);
                }
            }
        } catch (error) {
            console.error('Error fetching companies:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchCompanies();
        } else {
            setCompanies([]);
            setActiveCompanyIdState(null);
            setIsLoading(false);
        }
    }, [user, fetchCompanies]);

    const setActiveCompanyId = (id: string) => {
        setActiveCompanyIdState(id);
        localStorage.setItem('conta2go_active_company', id);
    };

    const activeCompany = companies.find(c => c.id === activeCompanyId) || null;

    return (
        <CompanyContext.Provider value={{
            companies,
            activeCompany,
            activeCompanyId,
            setActiveCompanyId,
            isLoading,
            refreshCompanies: fetchCompanies
        }}>
            {children}
        </CompanyContext.Provider>
    );
}

export function useCompany() {
    const context = useContext(CompanyContext);
    if (context === undefined) {
        throw new Error('useCompany must be used within a CompanyProvider');
    }
    return context;
}
