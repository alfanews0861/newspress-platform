/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Platform — Phase 17 Launch Readiness Dashboard
 * Route: /admin/readiness
 */

import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import {
  LaunchReadinessService,
} from '../../services/launchReadinessService';
import {
  DeploymentReadinessService,
} from '../../services/deploymentReadinessService';
import {
  LaunchGateCheck,
  LaunchCheckStatus,
  LaunchCheckCategory,
  LaunchDecision,
} from '../../types/platformPhase17';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  Building2,
  Server,
  FileCheck2,
  Lock,
} from 'lucide-react';

export const LaunchReadinessDashboardPage: React.FC = () => {
  const { user, isPlatformAdmin } = useAuth();
  const [decision, setDecision] = useState<LaunchDecision>(
    LaunchReadinessService.evaluateLaunchDecision()
  );
  const [checks, setChecks] = useState<LaunchGateCheck[]>(
    LaunchReadinessService.getAllChecks()
  );
  const [deploymentSummary, setDeploymentSummary] = useState(
    DeploymentReadinessService.getSummary()
  );

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedCheck, setSelectedCheck] = useState<LaunchGateCheck | null>(null);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [acceptReason, setAcceptReason] = useState('');
  const [acceptDeadline, setAcceptDeadline] = useState('2026-11-15');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleRefresh = () => {
    setDecision(LaunchReadinessService.evaluateLaunchDecision());
    setChecks(LaunchReadinessService.getAllChecks());
    setDeploymentSummary(DeploymentReadinessService.getSummary());
  };

  const handleAcceptWarning = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCheck) return;
    setErrorMsg(null);
    try {
      LaunchReadinessService.acceptWarning({
        checkId: selectedCheck.checkId,
        acceptedBy: user?.email || 'admin',
        deadline: acceptDeadline,
        reason: acceptReason,
      });
      setIsAcceptModalOpen(false);
      setAcceptReason('');
      setSuccessMsg(`Warning for "${selectedCheck.title}" accepted with deadline ${acceptDeadline}.`);
      handleRefresh();
      setSelectedCheck(LaunchReadinessService.getCheckById(selectedCheck.checkId) || null);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const filteredChecks = checks.filter((c) => {
    if (selectedCategory !== 'ALL' && c.category !== selectedCategory) return false;
    if (selectedStatus !== 'ALL' && c.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.checkId.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Commercial Launch & Go-Live Readiness Matrix
            </h1>
            <Badge variant="purple" size="sm">
              Phase 17 Final
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Authoritative evaluation of 16 launch readiness categories, cloud environments, and physical press constraints.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Re-Evaluate Matrix
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-sm text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 dark:text-emerald-400 hover:opacity-80">×</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-lg text-sm text-rose-800 dark:text-rose-300 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 dark:text-rose-400 hover:opacity-80">×</button>
        </div>
      )}

      {/* Official Decision Banner */}
      <div
        className={`p-6 rounded-xl border ${
          decision.decision === 'GO'
            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
            : decision.decision === 'CONDITIONAL_GO'
            ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
            : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <span
              className={`text-xs font-mono uppercase tracking-wider font-bold ${
                decision.decision === 'GO'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : decision.decision === 'CONDITIONAL_GO'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              Overall Go-Live Determination
            </span>
            <div className="flex items-center gap-3 mt-1">
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
                {decision.decision}
              </h2>
              <Badge
                variant={
                  decision.decision === 'GO'
                    ? 'emerald'
                    : decision.decision === 'CONDITIONAL_GO'
                    ? 'amber'
                    : 'rose'
                }
                size="md"
              >
                {decision.decision === 'GO'
                  ? 'Ready for Public Traffic'
                  : decision.decision === 'CONDITIONAL_GO'
                  ? 'Conditional Exception Active'
                  : 'Commercial Launch Blocked'}
              </Badge>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 max-w-3xl leading-relaxed">
              {decision.summary}
            </p>
          </div>

          <div className="text-right text-xs font-mono text-slate-500 dark:text-slate-400">
            <div>Evaluated: {new Date(decision.evaluatedAt).toLocaleTimeString()}</div>
            <div className="mt-1 text-slate-400 dark:text-slate-500">16 Mandatory Categories</div>
          </div>
        </div>

        {/* Counter Strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 pt-5 border-t border-slate-200 dark:border-slate-800/60 text-xs font-mono">
          <div className="p-2.5 bg-white dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="text-slate-500 dark:text-slate-400">Total Checks</div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">{decision.totalChecks}</div>
          </div>
          <div className="p-2.5 bg-white dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="text-slate-500 dark:text-slate-400">Passed Gates</div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{decision.passedChecks}</div>
          </div>
          <div className="p-2.5 bg-white dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="text-slate-500 dark:text-slate-400">Warnings</div>
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">{decision.warningChecks}</div>
          </div>
          <div className="p-2.5 bg-white dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="text-slate-500 dark:text-slate-400">Critical Blockers</div>
            <div className="text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums">{decision.criticalBlockers.length}</div>
          </div>
          <div className="p-2.5 bg-white dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="text-slate-500 dark:text-slate-400">Accepted Exceptions</div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400 tabular-nums">{decision.acceptedWarnings.length}</div>
          </div>
        </div>
      </div>

      {/* Critical Blockers Panel */}
      {decision.criticalBlockers.length > 0 && (
        <Card className="p-5 border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/10">
          <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-300 mb-2 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            Unresolved Critical Blockers ({decision.criticalBlockers.length})
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
            In accordance with platform safety invariants, these checks CANNOT be manually bypassed via administrative override.
          </p>
          <div className="space-y-2">
            {decision.criticalBlockers.map((b) => (
              <div key={b.checkId} className="p-3 bg-white dark:bg-slate-850 rounded-lg border border-rose-200 dark:border-rose-900/30 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-rose-700 dark:text-rose-200">{b.title}</span>
                  <span className="font-mono text-slate-500 text-[11px]">{b.checkId}</span>
                </div>
                <div className="text-slate-600 dark:text-slate-400 mt-1">{b.reason}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Deployment Environments Overview */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Deployment Environment & Infrastructure Verification
          </h3>
          <span className="text-xs font-mono text-slate-500">
            {deploymentSummary.verifiedActive} Verified / {deploymentSummary.total} Checks
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="text-slate-600 dark:text-slate-400 font-medium">Firestore ABAC & Auth</div>
            <div className="text-emerald-600 dark:text-emerald-400 font-semibold mt-1">✓ Active (Enterprise Tier)</div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="text-slate-600 dark:text-slate-400 font-medium">Outbound Webhook SSRF</div>
            <div className="text-emerald-600 dark:text-emerald-400 font-semibold mt-1">✓ Active (Loopbacks Blocked)</div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="text-slate-600 dark:text-slate-400 font-medium">GCP Cloud PITR Backups</div>
            <div className="text-rose-600 dark:text-rose-400 font-semibold mt-1">⚠ Architectural-Only (Blocker)</div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="text-slate-600 dark:text-slate-400 font-medium">Press SFTP / PGP Transmission</div>
            <div className="text-rose-600 dark:text-rose-400 font-semibold mt-1">⚠ Mock-Only (Blocker)</div>
          </div>
        </div>
      </Card>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search launch gate checks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300 w-full md:w-auto focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="ALL">All 16 Categories</option>
          <option value="SECURITY">Security</option>
          <option value="TENANT_ISOLATION">Tenant Isolation</option>
          <option value="AUTHENTICATION">Authentication</option>
          <option value="BILLING_PAYMENTS">Billing & Payments</option>
          <option value="MARKETPLACE_LICENSING">Marketplace Licensing</option>
          <option value="FINANCIAL_INTEGRITY">Financial Integrity</option>
          <option value="REPORTER_PAYOUTS">Reporter Payouts</option>
          <option value="EDITION_PDF_PRODUCTION">Edition & PDF</option>
          <option value="VENDOR_DISPATCH">Vendor Dispatch</option>
          <option value="API_WEBHOOKS">API & Webhooks</option>
          <option value="BACKUPS_DR">Backups & DR</option>
          <option value="MONITORING_ALERTING">Monitoring & Alerts</option>
          <option value="LEGAL_CONSENT">Legal & Consent</option>
          <option value="CUSTOMER_SUPPORT">Customer Support</option>
          <option value="DOCUMENTATION">Documentation</option>
          <option value="OPERATIONAL_OWNERSHIP">Operational Ownership</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300 w-full md:w-auto focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="PASS">PASS</option>
          <option value="WARNING">WARNING</option>
          <option value="BLOCKED">BLOCKED</option>
          <option value="NOT_VERIFIED">NOT_VERIFIED</option>
        </select>
      </div>

      {/* Checks Grid Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 uppercase font-mono tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">Gate ID & Category</th>
              <th className="py-3 px-4">Verification Check</th>
              <th className="py-3 px-4">Level</th>
              <th className="py-3 px-4">Owner</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {filteredChecks.map((c) => (
              <tr key={c.checkId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="py-3 px-4 font-mono">
                  <div className="text-slate-900 dark:text-slate-200 font-semibold">{c.checkId}</div>
                  <div className="text-[11px] text-slate-500">{c.category}</div>
                </td>
                <td className="py-3 px-4 max-w-md">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{c.title}</div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 line-clamp-1">{c.description}</div>
                </td>
                <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  {c.verificationLevel}
                </td>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{c.ownerRole}</td>
                <td className="py-3 px-4">
                  <Badge
                    variant={
                      c.status === 'PASS'
                        ? 'emerald'
                        : c.status === 'WARNING'
                        ? 'amber'
                        : 'rose'
                    }
                    size="sm"
                  >
                    {c.status}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-right">
                  <Button variant="secondary" size="sm" onClick={() => setSelectedCheck(c)}>
                    View Evidence
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL: Check Evidence & Detail */}
      {selectedCheck && (
        <Modal
          isOpen={!!selectedCheck}
          onClose={() => setSelectedCheck(null)}
          title={`Readiness Gate: ${selectedCheck.title}`}
          subtitle={`Check ID: ${selectedCheck.checkId} · Category: ${selectedCheck.category}`}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <div>
                {selectedCheck.status === 'WARNING' && selectedCheck.canBeOverridden && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsAcceptModalOpen(true)}
                  >
                    Accept Warning Exception
                  </Button>
                )}
                {selectedCheck.status === 'BLOCKED' && (
                  <span className="text-xs text-rose-400 font-mono">
                    ⚠ Critical Blocker — Administrative override strictly prohibited
                  </span>
                )}
              </div>
              <Button variant="secondary" size="sm" onClick={() => setSelectedCheck(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Current Status:</span>
                <div className="mt-0.5">
                  <Badge
                    variant={selectedCheck.status === 'PASS' ? 'emerald' : selectedCheck.status === 'WARNING' ? 'amber' : 'rose'}
                    size="sm"
                  >
                    {selectedCheck.status}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Verification Level:</span>
                <div className="text-slate-900 dark:text-slate-200 font-mono font-medium mt-0.5">{selectedCheck.verificationLevel}</div>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Responsible Role:</span>
                <div className="text-slate-900 dark:text-slate-200 font-medium mt-0.5">{selectedCheck.ownerRole}</div>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Last Verified:</span>
                <div className="text-slate-900 dark:text-slate-200 font-mono mt-0.5">
                  {new Date(selectedCheck.lastCheckedAt).toLocaleString()}
                </div>
              </div>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium">Description:</span>
              <p className="text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">{selectedCheck.description}</p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800 font-mono">
              <span className="text-blue-600 dark:text-blue-400 font-semibold block mb-1">Audit Verification Evidence:</span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{selectedCheck.evidence}</p>
            </div>

            {selectedCheck.status !== 'PASS' && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-lg text-rose-800 dark:text-rose-300">
                <strong>Required Corrective Action:</strong> {selectedCheck.correctiveAction}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* MODAL: Accept Warning */}
      <Modal
        isOpen={isAcceptModalOpen}
        onClose={() => setIsAcceptModalOpen(false)}
        title="Formally Accept Operational Warning"
        subtitle="Requires documented business justification, deadline, and leadership ownership"
        maxWidth="md"
        footer={null}
      >
        <form onSubmit={handleAcceptWarning} className="space-y-3 text-xs">
          <div>
            <label className="text-slate-700 dark:text-slate-300 font-medium mb-1 block">Remediation Deadline</label>
            <Input
              type="date"
              value={acceptDeadline}
              onChange={(e) => setAcceptDeadline(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-slate-700 dark:text-slate-300 font-medium mb-1 block">Justification Reason</label>
            <textarea
              rows={3}
              value={acceptReason}
              onChange={(e) => setAcceptReason(e.target.value)}
              placeholder="State rationale for accepting this warning prior to go-live..."
              className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsAcceptModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Accept Exception
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
