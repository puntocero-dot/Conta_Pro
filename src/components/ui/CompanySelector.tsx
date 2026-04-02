'use client';

import React from 'react';
import { useCompany } from '@/context/CompanyContext';
import styles from './CompanySelector.module.css';

interface CompanySelectorProps {
    isCollapsed: boolean;
}

export function CompanySelector({ isCollapsed }: CompanySelectorProps) {
    const { companies, companyGroups, ungroupedCompanies, activeCompanyId, setActiveCompanyId, isLoading } = useCompany();

    if (isLoading) {
        return <div className={styles.skeleton}>{!isCollapsed && 'Cargando empresas...'}</div>;
    }

    if (companies.length === 0) {
        return <div className={styles.noCompanies}>{!isCollapsed && 'Sin empresas'}</div>;
    }

    const hasGroups = companyGroups.length > 0;

    return (
        <div className={`${styles.container} ${isCollapsed ? styles.collapsed : ''}`}>
            {!isCollapsed && <label className={styles.label}>Empresa Activa</label>}
            <select
                value={activeCompanyId || ''}
                onChange={(e) => setActiveCompanyId(e.target.value)}
                className={styles.select}
            >
                {hasGroups ? (
                    <>
                        {companyGroups.map((group) =>
                            group.companies.length > 0 ? (
                                <optgroup key={group.id} label={isCollapsed ? '' : group.name}>
                                    {group.companies.map((company) => (
                                        <option key={company.id} value={company.id}>
                                            {isCollapsed ? company.name.charAt(0) : company.name}
                                        </option>
                                    ))}
                                </optgroup>
                            ) : null
                        )}
                        {ungroupedCompanies.length > 0 && (
                            <optgroup label={isCollapsed ? '' : 'Sin grupo'}>
                                {ungroupedCompanies.map((company) => (
                                    <option key={company.id} value={company.id}>
                                        {isCollapsed ? company.name.charAt(0) : company.name}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                    </>
                ) : (
                    companies.map((company) => (
                        <option key={company.id} value={company.id}>
                            {isCollapsed ? company.name.charAt(0) : company.name}
                        </option>
                    ))
                )}
            </select>
        </div>
    );
}
