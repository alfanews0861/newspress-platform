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
        <Button variant="secondary" size="sm" onClick={onClose} className="w-full sm:w-auto justify-center">
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
              className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 sm:gap-4 ${
                isSelected
                  ? 'bg-[#e8f0fe] dark:bg-[#004a77]/30 border-[#1a73e8] shadow-xs'
                  : 'bg-white dark:bg-[#28292a] border-[#dadce0] dark:border-[#444746] hover:border-[#bdc1c6] hover:bg-[#f8fafd] dark:hover:bg-[#333537]'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f1f] border border-[#dadce0] dark:border-[#444746] flex items-center justify-center shrink-0 overflow-hidden shadow-none">
                  {t.logoUrl ? (
                    <img src={t.logoUrl} alt={t.organizationName} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-5 h-5 text-[#1a73e8] dark:text-[#8ab4f8]" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-[#202124] dark:text-[#f2f2f2] font-sans">
                      {t.organizationName}
                    </h4>
                    {isSelected && (
                      <Badge variant="primary" size="sm">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-[#5f6368] dark:text-[#8e918f] font-normal line-clamp-1">{t.tagline || t.legalName}</p>
                  <div className="flex items-center gap-3 text-[11px] text-[#70757a] dark:text-[#8e918f] mt-1 font-sans font-normal">
                    <span className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-[#5f6368]" />
                      {t.contact.city}, {t.contact.country}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#5f6368]" />
                      {t.primaryTimezone}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" size="sm">
                  {t.subscriptionPlan.replace(/_/g, ' ')}
                </Badge>
                {isSelected && <Check className="w-5 h-5 text-[#1a73e8] dark:text-[#8ab4f8] shrink-0" />}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
};
