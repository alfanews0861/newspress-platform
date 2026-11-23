/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Google Play Store Account & Data Deletion Public Web Portal
 * Alfa New Gen Platforms - Statutory Compliance with DPDP Act 2023 & Google Play Policies
 */

import React, { useState } from 'react';
import {
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ArrowLeft,
} from 'lucide-react';
import { UnifiedPlatformHeader } from '../../components/navigation/UnifiedPlatformHeader';
import { UserPortalService } from '../../services/userPortalService';

interface AccountDeletionPageProps {
  onNavigate?: (path: string) => void;
}

export const AccountDeletionPage: React.FC<AccountDeletionPageProps> = ({ onNavigate }) => {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [reason, setReason] = useState('no_longer_needed');
  const [remarks, setRemarks] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const navigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.dispatchEvent(new CustomEvent('navigate', { detail: path }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!emailOrPhone.trim()) {
      setErrorMsg('Please enter your registered email address or mobile number');
      return;
    }
    if (!acknowledged) {
      setErrorMsg('Please confirm acknowledgment of the permanent data deletion terms');
      return;
    }

    UserPortalService.requestAccountDeletion();
    const generatedTicket = `DEL-ALFA-${Math.floor(100000 + Math.random() * 900000)}`;
    setTicketId(generatedTicket);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#202124] text-slate-900 dark:text-slate-100 font-sans transition-colors">
      <UnifiedPlatformHeader currentPath="/account-deletion" onNavigate={navigate} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Header Breadcrumb */}
        <button
          onClick={() => navigate('/user/portal')}
          className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold mb-6 hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to User Portal</span>
        </button>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            <span>Alfa New Gen Platforms • Google Play Developer Policy</span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Permanent Account &amp; Personal Data Deletion
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Statutory User Data Erasure Request Portal (DPDP Act 2023 &amp; Google Play Store Compliance)
            </p>
          </div>

          {/* Statutory Policy Disclaimer */}
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-2 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            <div className="flex items-center gap-2 font-bold uppercase">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Data Erasure Policy &amp; Terms</span>
            </div>
            <p>
              In accordance with Google Play Developer Policies and the Government of India <strong>Digital Personal Data Protection Act 2023 (DPDP Act 2023)</strong>, submitting this request triggers the following statutory actions:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your personal profile, contact information, press accreditation ID, and KYC records will be permanently erased.</li>
              <li>Your Google OAuth and YouTube OAuth access tokens will be immediately revoked.</li>
              <li>Unused balance credits in your prepaid wallet will be forfeited without cash refund.</li>
              <li>Only statutory financial invoices mandated by Section 194J of the Indian Income Tax Act will be retained for legal compliance.</li>
            </ul>
          </div>

          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Registered Email Address or Mobile Number *
                </label>
                <input
                  type="text"
                  required
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  placeholder="name@example.com or +91 98480 12345"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Reason for Account Deletion
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="no_longer_needed">No longer needed</option>
                  <option value="privacy_concerns">Privacy considerations</option>
                  <option value="switching_service">Switching to another platform</option>
                  <option value="other">Other reason</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Additional Details / Remarks (Optional)
                </label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Share feedback or reason for leaving..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    className="mt-0.5 rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300">
                    I understand and confirm that my account and personal data will be permanently erased, and any remaining wallet balance credits will be forfeited.
                  </span>
                </label>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold cursor-pointer transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Confirm Account Deletion Request</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3 text-center animate-in zoom-in-95 duration-200">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Account Deletion Request Submitted Successfully
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                Your data erasure request has been registered under reference tracking ID:
              </p>
              <div className="font-mono text-base font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 py-1.5 px-4 rounded-xl inline-block border border-slate-200 dark:border-slate-700">
                {ticketId}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mx-auto pt-2">
                In compliance with Google Play Store guidelines and Indian IT rules, your personal records will be permanently purged from active production servers within 7 business days.
              </p>
              <div className="pt-3">
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Return to Home
                </button>
              </div>
            </div>
          )}

          {/* Grievance Officer Contact Footer */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-5 text-xs text-slate-500 space-y-1">
            <div className="font-bold text-slate-700 dark:text-slate-300">
              Alfa New Gen Platforms • Grievance Redressal Office
            </div>
            <div>Chief Grievance Officer: Sri K. Ramanjaneyulu</div>
            <div>Email: <a href="mailto:grievance@alfanewgen.com" className="text-blue-600 underline">grievance@alfanewgen.com</a> | Phone: +91 40 2388 9911</div>
            <div>Press Towers, HITEC City, Hyderabad, Telangana 500081, India</div>
          </div>
        </div>
      </main>
    </div>
  );
};
