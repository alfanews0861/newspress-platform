/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 8 — Reporter & Staff Invitation Acceptance Page
 */

import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { ReporterInvitationService } from '../../services/reporterInvitationService';
import { useAuth } from '../../hooks/useAuth';

export const ReporterInvitationPage: React.FC = () => {
  const { user } = useAuth();
  const [rawToken, setRawToken] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    if (tokenFromUrl) {
      setRawToken(tokenFromUrl);
    }
  }, []);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    try {
      await ReporterInvitationService.acceptInvitation({
        rawToken,
        userId: user?.uid || `user_invited_${Date.now()}`,
        personId: `person_${Date.now()}`,
        displayName: user?.displayName || 'Invited Journalist',
      });

      setStatusMsg({
        type: 'success',
        text: 'Invitation accepted successfully! You are now accredited to this news organization.',
      });
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Failed to accept invitation token.',
      });
    }
  };

  return (
    <div className="max-w-xl mx-auto py-12 px-4 space-y-6">
      <Card variant="editorial" className="p-8 space-y-6 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Mail className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-2xl font-bold font-sans text-slate-900 dark:text-slate-100">Newsroom Accreditation Invitation</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Accept your invitation to join the newsroom staff or reporter affiliation network.
          </p>
        </div>

        {statusMsg && (
          <div
            className={`p-4 rounded-lg text-xs font-mono flex items-center gap-2 text-left ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleAccept} className="space-y-4 text-left">
          <Input
            label="Invitation Token"
            required
            placeholder="Paste your invitation token (e.g., inv_...)"
            value={rawToken}
            onChange={(e) => setRawToken(e.target.value)}
          />

          <Button type="submit" variant="primary" className="w-full">
            Accept Invitation & Accredit Profile
          </Button>
        </form>
      </Card>
    </div>
  );
};
