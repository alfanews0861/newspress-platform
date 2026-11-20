/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { MOCK_USERS, MOCK_TENANT_MEMBERS } from '../services/mockDataService';
import { Check, ShieldCheck, UserCheck } from 'lucide-react';

export interface PersonaSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PersonaSwitcherModal: React.FC<PersonaSwitcherModalProps> = ({ isOpen, onClose }) => {
  const { simulatedUserId, switchSimulatedPersona, user } = useAuth();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Interactive RBAC Persona Switcher"
      subtitle="Experience the platform under different newsroom roles and permission boundaries"
      maxWidth="lg"
      footer={
        <Button variant="secondary" size="sm" onClick={onClose} className="w-full sm:w-auto justify-center">
          Done
        </Button>
      }
    >
      <div className="space-y-3">
        {MOCK_USERS.map((u) => {
          const isSelected = u.uid === simulatedUserId;
          const membership = MOCK_TENANT_MEMBERS.find((m) => m.userId === u.uid);

          return (
            <div
              key={u.uid}
              onClick={() => {
                switchSimulatedPersona(u.uid);
                onClose();
              }}
              className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 sm:gap-4 ${
                isSelected
                  ? 'bg-[#e8f0fe] dark:bg-[#004a77]/30 border-[#1a73e8] shadow-xs'
                  : 'bg-white dark:bg-[#28292a] border-[#dadce0] dark:border-[#444746] hover:border-[#bdc1c6] hover:bg-[#f8fafd] dark:hover:bg-[#333537]'
              }`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={u.avatarUrl}
                  alt={u.displayName}
                  className="w-10 h-10 rounded-full object-cover border border-[#dadce0] dark:border-[#444746] shrink-0 shadow-none"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-[#202124] dark:text-[#f2f2f2] font-sans">{u.displayName}</h4>
                    {isSelected && (
                      <Badge variant="primary" size="sm">
                        Current
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-[#5f6368] dark:text-[#8e918f] font-sans font-normal">{u.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {u.platformRole !== 'none' && (
                      <Badge variant="purple" size="sm">
                        Platform: {u.platformRole}
                      </Badge>
                    )}
                    {membership && (
                      <Badge variant="blue" size="sm">
                        Org: {membership.organizationRole}
                      </Badge>
                    )}
                    {membership?.reporterRole !== 'none' && (
                      <Badge variant="emerald" size="sm">
                        {membership?.reporterRole}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div>{isSelected && <Check className="w-5 h-5 text-[#1a73e8] dark:text-[#8ab4f8] shrink-0" />}</div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
};
