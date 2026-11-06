/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Tenant } from '../../types/tenant';
import { TenantService } from '../../services/tenantService';
import { MOCK_TENANTS } from '../../services/mockDataService';

export interface TenantContextValue {
  currentTenant: Tenant;
  allTenants: Tenant[];
  isLoadingTenants: boolean;
  switchTenant: (tenantId: string) => void;
  updateCurrentTenant: (updates: Partial<Tenant>) => Promise<void>;
  refreshTenants: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export const TenantProvider: React.FC<{
  children: (activeTenantId: string) => React.ReactNode;
}> = ({ children }) => {
  const [allTenants, setAllTenants] = useState<Tenant[]>(MOCK_TENANTS);
  const [currentTenantId, setCurrentTenantId] = useState<string>(MOCK_TENANTS[0].tenantId);
  const [isLoadingTenants, setIsLoadingTenants] = useState<boolean>(false);

  const currentTenant = allTenants.find((t) => t.tenantId === currentTenantId) || allTenants[0];

  const refreshTenants = useCallback(async () => {
    setIsLoadingTenants(true);
    try {
      const tenants = await TenantService.getAllTenants();
      setAllTenants(tenants);
    } catch (err) {
      console.error('Error fetching tenants:', err);
    } finally {
      setIsLoadingTenants(false);
    }
  }, []);

  useEffect(() => {
    refreshTenants();
  }, [refreshTenants]);

  const switchTenant = (tenantId: string) => {
    const exists = allTenants.some((t) => t.tenantId === tenantId);
    if (exists) {
      setCurrentTenantId(tenantId);
    }
  };

  const updateCurrentTenant = async (updates: Partial<Tenant>) => {
    const updated = await TenantService.updateTenant(currentTenant.tenantId, updates);
    setAllTenants((prev) => prev.map((t) => (t.tenantId === updated.tenantId ? updated : t)));
  };

  const value: TenantContextValue = {
    currentTenant,
    allTenants,
    isLoadingTenants,
    switchTenant,
    updateCurrentTenant,
    refreshTenants,
  };

  return (
    <TenantContext.Provider value={value}>
      {children(currentTenant.tenantId)}
    </TenantContext.Provider>
  );
};

export const useTenant = (): TenantContextValue => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
