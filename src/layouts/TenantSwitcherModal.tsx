/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useTenant } from '../hooks/useTenant';
import { Building2, Check, Clock, Globe } from 'lucide-react';

export interface TenantSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TenantSwitcherModal: React.FC<TenantSwitcherModalProps> = ({ isOpen, onClose }) => {
  const { currentTenant, allTenants, switchTenant } = useTenant();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Switch News Organization Tenant"
      subtitle="Select an isolated newsroom organization workspace"
      maxWidth="lg"
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-3">
        {allTenants.map((t) => {
          const isSelected = t.tenantId === currentTenant.tenantId;
          return (
            <div
              key={t.tenantId}
              onClick={() => {
                switchTenant(t.tenantId);
                onClose();
              }}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                isSelected
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 shadow-xs'
                  : 'bg-slate-50/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                  {t.logoUrl ? (
                    <img src={t.logoUrl} alt={t.organizationName} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-black dark:text-white font-sans">
                      {t.organizationName}
                    </h4>
                    {isSelected && (
                      <Badge variant="primary" size="sm">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-black dark:text-slate-300 font-medium line-clamp-1">{t.tagline || t.legalName}</p>
                  <div className="flex items-center gap-3 text-[11px] text-black dark:text-slate-300 mt-1 font-sans font-medium">
                    <span className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-black dark:text-slate-500" />
                      {t.contact.city}, {t.contact.country}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-black dark:text-slate-500" />
                      {t.primaryTimezone}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" size="sm">
                  {t.subscriptionPlan.replace(/_/g, ' ')}
                </Badge>
                {isSelected && <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
};
