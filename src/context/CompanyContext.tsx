'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface Company {
    id: string;
    name: string;
    taxId: string;
    country: string;
    groupId?: string | null;
    metadata?: Record<string, unknown>;
}

interface CompanyGroup {
    id: string;
    name: string;
    ownerId: string;
    companies: Company[];
}

interface CompanyContextType {
    companies: Company[];
    companyGroups: CompanyGroup[];
    ungroupedCompanies: Company[];
    activeCompany: Company | null;
    activeCompanyId: string | null;
    setActiveCompanyId: (id: string) => void;
    isLoading: boolean;
    refreshCompanies: () => Promise<void>;
}

const STORAGE_KEY = 'contapro_active_company';

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [companyGroups, setCompanyGroups] = useState<CompanyGroup[]>([]);
    const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasHydrated, setHasHydrated] = useState(false);

    useEffect(() => {
        setHasHydrated(true);
    }, []);

    const fetchCompanies = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const [companiesRes, groupsRes] = await Promise.all([
                fetch('/api/companies', { headers: { 'X-Requested-With': 'XMLHttpRequest' } }),
                fetch('/api/company-groups', { headers: { 'X-Requested-With': 'XMLHttpRequest' } }),
            ]);

            const companiesData = await companiesRes.json();
            if (companiesData.companies) {
                setCompanies(companiesData.companies);

                const savedId = localStorage.getItem(STORAGE_KEY);
                if (savedId && companiesData.companies.some((c: Company) => c.id === savedId)) {
                    setActiveCompanyIdState(savedId);
                } else if (companiesData.companies.length > 0) {
                    const firstId = companiesData.companies[0].id;
                    setActiveCompanyIdState(firstId);
                    localStorage.setItem(STORAGE_KEY, firstId);
                }
            }

            if (groupsRes.ok) {
                const groupsData = await groupsRes.json();
                setCompanyGroups(groupsData.groups || []);
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
            setCompanyGroups([]);
            setActiveCompanyIdState(null);
            setIsLoading(false);
        }
    }, [user, fetchCompanies]);

    const setActiveCompanyId = (id: string) => {
        setActiveCompanyIdState(id);
        localStorage.setItem(STORAGE_KEY, id);
    };

    const activeCompany = companies.find(c => c.id === activeCompanyId) || null;

    // Companies not in any group
    const groupedCompanyIds = new Set(companyGroups.flatMap(g => g.companies.map(c => c.id)));
    const ungroupedCompanies = companies.filter(c => !groupedCompanyIds.has(c.id));

    if (!hasHydrated) {
        return null;
    }

    return (
        <CompanyContext.Provider value={{
            companies,
            companyGroups,
            ungroupedCompanies,
            activeCompany,
            activeCompanyId,
            setActiveCompanyId,
            isLoading,
            refreshCompanies: fetchCompanies,
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
