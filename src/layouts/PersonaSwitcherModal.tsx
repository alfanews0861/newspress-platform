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
        <Button variant="secondary" size="sm" onClick={onClose}>
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
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                isSelected
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 shadow-xs'
                  : 'bg-slate-50/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={u.avatarUrl}
                  alt={u.displayName}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-black dark:text-white font-sans">{u.displayName}</h4>
                    {isSelected && (
                      <Badge variant="primary" size="sm">
                        Current
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-black dark:text-slate-300 font-sans font-medium">{u.email}</p>
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
              <div>{isSelected && <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />}</div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
};
