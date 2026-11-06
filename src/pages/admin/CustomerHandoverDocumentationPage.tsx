/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Platform — Phase 17 Customer Documentation & Operational Handover
 * Route: /admin/docs
 */

import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  BookOpen,
  Building2,
  Users,
  DollarSign,
  ShoppingBag,
  Newspaper,
  Key,
  Webhook,
  LifeBuoy,
  Flame,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

export const CustomerHandoverDocumentationPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('onboarding');

  const sections = [
    { id: 'onboarding', label: '1. Publisher Onboarding', icon: Building2 },
    { id: 'reporters', label: '2. Reporter Network', icon: Users },
    { id: 'subscriptions', label: '3. Plans & Entitlements', icon: DollarSign },
    { id: 'marketplace', label: '4. Wire & Content Licensing', icon: ShoppingBag },
    { id: 'production', label: '5. Newspaper Press & PDF', icon: Newspaper },
    { id: 'api', label: '6. Enterprise API & Webhooks', icon: Key },
    { id: 'support', label: '7. Customer Support Desk', icon: LifeBuoy },
    { id: 'incidents', label: '8. Incident Runbooks & DR', icon: Flame },
    { id: 'limitations', label: '9. Environment Status & Limitations', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Platform Operational Handover & Documentation
          </h1>
          <Badge variant="purple" size="sm">
            Phase 17 Final
          </Badge>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Comprehensive production manual, architectural boundary contracts, operational runbooks, and known limitations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Navigation Sidebar (3 cols) */}
        <div className="md:col-span-4 space-y-1">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-colors ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Viewer (8 cols) */}
        <div className="md:col-span-8">
          <Card className="p-6 border-slate-800 bg-slate-900/30 space-y-6 text-xs text-slate-300 leading-relaxed">
            {activeSection === 'onboarding' && (
              <div>
                <h2 className="text-lg font-bold text-slate-100 mb-2">
                  1. Publisher Onboarding & Tenant Provisioning
                </h2>
                <p className="text-slate-400 mb-4">
                  Newspaper organizations undergo a strictly controlled 6-stage lifecycle progression before production broadcasting:
                </p>
                <div className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-amber-400 mb-4 text-[11px]">
                  INVITED → REGISTRATION_PENDING → VERIFICATION_PENDING → CONFIGURATION_PENDING → TRIAL_OR_SUBSCRIPTION_ACTIVE → ONBOARDING_COMPLETE
                </div>
                <h3 className="font-semibold text-slate-200 mt-4 mb-2">Mandatory Verification Gates:</h3>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
                  <li><strong>Certificate of Incorporation & Press Registration:</strong> Must be uploaded and approved by a platform super admin. Automatic bypass is strictly blocked.</li>
                  <li><strong>Authorized Owner Account:</strong> Each publisher tenant has a root owner assigned with full organization management privileges.</li>
                  <li><strong>Publication Timezone:</strong> Sets the daily press deadline cutoff for automatic edition locking.</li>
                  <li><strong>Tenant Isolation Guarantee:</strong> Publisher A cannot inspect, search, or syndicate stories from Publisher B without an active licensed marketplace agreement.</li>
                </ul>
              </div>
            )}

            {activeSection === 'reporters' && (
              <div>
                <h2 className="text-lg font-bold text-slate-100 mb-2">
                  2. Reporter Network & Newsroom Operations
                </h2>
                <p className="text-slate-400 mb-4">
                  NewsPress supports both staff correspondents and independent freelance reporters with clear rights boundaries:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-slate-400">
                  <li><strong>Staff Reporters:</strong> Belong directly to a publisher tenant. Submissions enter the newsroom editorial review queue directly.</li>
                  <li><strong>Freelance Reporters:</strong> Retain independent copyright. Can publish stories to the public NewsPress Marketplace Wire.</li>
                  <li><strong>Field Evidence Authentication:</strong> Audio recordings and photo evidence capture SHA-256 hashes and EXIF metadata to ensure factual integrity.</li>
                  <li><strong>Editorial Review & Revisions:</strong> Desk editors can request revisions or comment with thread resolution tracking.</li>
                </ul>
              </div>
            )}

            {activeSection === 'subscriptions' && (
              <div>
                <h2 className="text-lg font-bold text-slate-100 mb-2">
                  3. Commercial Plans, Entitlements & Metering
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-4">
                  <div className="p-3 bg-slate-950 rounded border border-slate-800">
                    <div className="font-bold text-slate-200">BASIC (Free)</div>
                    <div className="text-[11px] text-slate-400 mt-1">2 Editions/mo · 3 Staff · 0 Generative AI</div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded border border-slate-800">
                    <div className="font-bold text-slate-200">STANDARD (₹4,999)</div>
                    <div className="text-[11px] text-slate-400 mt-1">20 Editions/mo · 10 Staff · Light AI (Headlines/Summary)</div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded border border-slate-800">
                    <div className="font-bold text-slate-200">PREMIUM (₹14,999)</div>
                    <div className="text-[11px] text-slate-400 mt-1">100 Editions/mo · 50 Staff · Advanced AI (Copy Fitting/Diagnostics)</div>
                  </div>
                </div>
                <p className="text-slate-400">
                  Plan limits are authoritatively enforced server-side via <code>SubscriptionEntitlementService</code>. When a quota is reached, operations fail deterministically with a structured <code>SubscriptionLimitExceededError</code>.
                </p>
              </div>
            )}

            {activeSection === 'marketplace' && (
              <div>
                <h2 className="text-lg font-bold text-slate-100 mb-2">
                  4. Marketplace Wire, Syndication & Royalty Settlement
                </h2>
                <p className="text-slate-400 mb-3">
                  The marketplace facilitates content syndication between freelance reporters and newspaper publishers:
                </p>
                <div className="space-y-2 text-slate-400">
                  <p>• <strong>Revenue Split Formula:</strong> Configured at 70% Reporter Royalties, 15% Syndication Desk, and 15% NewsPress Platform Fee.</p>
                  <p>• <strong>Settlement Escrow:</strong> Earnings enter a mandatory 7-day settlement hold window before becoming eligible for bank withdrawal.</p>
                  <p>• <strong>Territorial Exclusivity:</strong> Exclusive licenses lock out any rival publication within the designated territory (e.g. US-NY, IN-KA) for the duration of the license window.</p>
                  <p>• <strong>Double-Entry Ledger Invariant:</strong> Every transaction generates matching debits and credits in minor currency units without float drift.</p>
                </div>
              </div>
            )}

            {activeSection === 'production' && (
              <div>
                <h2 className="text-lg font-bold text-slate-100 mb-2">
                  5. Newspaper Press & Print PDF Generation
                </h2>
                <p className="text-slate-400 mb-3">
                  Newspaper editions transition through: PLANNED → OPEN → CONTENT_COLLECTION → DESIGNING → EDITORIAL_REVIEW → READY_TO_FINALIZE → FINALIZED.
                </p>
                <div className="p-3 bg-slate-950 rounded border border-slate-800 text-slate-300 space-y-2">
                  <div className="font-semibold text-amber-400">Preflight Validation Checklist:</div>
                  <p>• Resolution: Minimum 300 DPI for press plates.</p>
                  <p>• Bleed & Slug: Standard 3mm bleed margin verified.</p>
                  <p>• Font Embedding: All headline and body fonts (Newsreader, Cinzel, Inter) validated.</p>
                  <p>• Finalization Seal: Generates immutable SHA-256 plate package hash.</p>
                </div>
              </div>
            )}

            {activeSection === 'api' && (
              <div>
                <h2 className="text-lg font-bold text-slate-100 mb-2">
                  6. Enterprise API & Webhook Signatures
                </h2>
                <p className="text-slate-400 mb-3">
                  Publishers can integrate proprietary content management systems using scoped REST API keys and webhooks:
                </p>
                <div className="space-y-2 text-slate-400">
                  <p>• <strong>Authentication:</strong> <code>Authorization: Bearer np_live_...</code> verified against cryptographic SHA-256 verifier.</p>
                  <p>• <strong>Webhook Signatures:</strong> Webhook payloads include header <code>X-NewsPress-Signature: t=177...,v1=64hex</code> computed using HMAC-SHA256.</p>
                  <p>• <strong>SSRF Protections:</strong> Outbound webhook deliveries reject private RFC 1918 IPs, AWS/GCP instance metadata endpoints (169.254.169.254), and loopbacks.</p>
                </div>
              </div>
            )}

            {activeSection === 'support' && (
              <div>
                <h2 className="text-lg font-bold text-slate-100 mb-2">
                  7. Customer Support & Operational Desk
                </h2>
                <p className="text-slate-400 mb-3">
                  Ticketing service accessible at <code>/admin/support</code>:
                </p>
                <div className="space-y-2 text-slate-400">
                  <p>• <strong>SLA Escalation Matrix:</strong> SEV1 Critical (1 hour), SEV2 High (4 hours), SEV3 Medium (24 hours), SEV4 Low (72 hours).</p>
                  <p>• <strong>Confidential Internal Notes:</strong> Support engineers can leave internal notes (highlighted in amber) that are mathematically stripped from customer viewports.</p>
                  <p>• <strong>Least-Privilege Principle:</strong> Support personnel do not have access to unredacted financial keys, private reporter drafts, or payment secrets.</p>
                </div>
              </div>
            )}

            {activeSection === 'incidents' && (
              <div>
                <h2 className="text-lg font-bold text-slate-100 mb-2">
                  8. Incident Runbooks (RB 01–12) & Disaster Recovery
                </h2>
                <p className="text-slate-400 mb-3">
                  Phase 16 establishes 12 operational runbooks accessible at <code>/operations/runbooks</code>:
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">RB-01: Zero-Trust Isolation Breach</div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">RB-02: Double-Entry Ledger Imbalance</div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">RB-03: Webhook SSRF Compromise</div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">RB-04: Print Queue Worker Exhaustion</div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">RB-05: Mobile Offline Drift Conflict</div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">RB-06: API Credential Leakage</div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">RB-07: Payout Double-Disbursement</div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">RB-08: Corrupted Print Plate Hash</div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">RB-09: Disaster Recovery Restoration</div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">RB-10: PII Exfiltration Quarantine</div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">RB-11: Data Quality Anomaly Sweep</div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">RB-12: Zero-Downtime Rollback</div>
                </div>
              </div>
            )}

            {activeSection === 'limitations' && (
              <div>
                <h2 className="text-lg font-bold text-slate-100 mb-2">
                  9. Environment Status & Launch Limitations
                </h2>
                <div className="p-4 bg-rose-950/20 border border-rose-900/60 rounded-lg text-rose-300 space-y-2 mb-4">
                  <div className="font-bold flex items-center gap-2 text-rose-200">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    Known Launch Blockers & Architectural-Only Features
                  </div>
                  <p className="text-slate-300">
                    The platform currently operates in a sandboxed developer environment. In accordance with honest engineering disclosures, the following systems are verified as code/mock only:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                    <li><strong>Physical Print Press SFTP/PGP Dispatch:</strong> Mock-only. Live SFTP press facility credentials are not provisioned.</li>
                    <li><strong>GCP Cloud PITR Backups:</strong> Architectural-only. Cloud Firestore PITR schedule must be activated in a live GCP billing account.</li>
                    <li><strong>Live Payment Gateway Accounts:</strong> Sandbox-only. Live production Stripe / Razorpay merchant accounts must be configured before accepting actual public subscriber money.</li>
                    <li><strong>Legal Policies & Terms of Service:</strong> Marked as <code>DRAFT_UNREVIEWED</code>. Requires jurisdiction counsel sign-off.</li>
                  </ul>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
