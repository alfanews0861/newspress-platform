/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Platform — Phase 17 Support and Customer Operations Console
 * Route: /admin/support
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import {
  CustomerSupportService,
} from '../../services/customerSupportService';
import {
  SupportCase,
  SupportCaseStatus,
  SupportCaseSeverity,
  SupportCategory,
} from '../../types/platformPhase17';
import {
  LifeBuoy,
  MessageSquare,
  Lock,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Send,
  Plus,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';

export const SupportOperationsPage: React.FC = () => {
  const { user, isPlatformAdmin } = useAuth();
  const { currentTenant } = useTenant();
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<SupportCase | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Forms
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);

  // New Case Form
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<SupportCategory>('BILLING_SUBSCRIPTION');
  const [newSeverity, setNewSeverity] = useState<SupportCaseSeverity>('SEV3_MEDIUM');
  const [newMessage, setNewMessage] = useState('');

  // Reply Form
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  // Resolution / Reopen Form
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [reopenReason, setReopenReason] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isSupportOrPlatformAdmin =
    isPlatformAdmin ||
    user?.platformRole === 'support_admin' ||
    user?.platformRole === 'super_admin' ||
    user?.platformRole === 'platform_admin';

  useEffect(() => {
    loadCases();
  }, [user, currentTenant]);

  const loadCases = () => {
    if (!user) return;
    const list = CustomerSupportService.getCasesForUser({
      userId: user.uid,
      tenantId: currentTenant?.tenantId || 'tenant-metro-chronicle',
      isPlatformOrSupportAdmin: !!isSupportOrPlatformAdmin,
    });
    setCases(list);
    if (selectedCase) {
      const refreshed = list.find((c) => c.caseId === selectedCase.caseId);
      if (refreshed) setSelectedCase(refreshed);
    }
  };

  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const created = CustomerSupportService.createCase({
        tenantId: currentTenant?.tenantId || 'tenant-metro-chronicle',
        tenantName: currentTenant?.organizationName || 'Newspaper Publisher',
        requesterUserId: user?.uid || 'user-anon',
        requesterEmail: user?.email || 'publisher@press.com',
        requesterName: user?.displayName || 'Newsroom Editor',
        title: newTitle,
        category: newCategory,
        severity: newSeverity,
        initialMessage: newMessage,
      });
      setIsNewCaseModalOpen(false);
      setNewTitle('');
      setNewMessage('');
      setSuccessMsg(`Support case #${created.caseId} opened successfully.`);
      loadCases();
      setSelectedCase(created);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create case.');
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !replyText.trim()) return;
    setErrorMsg(null);
    try {
      CustomerSupportService.addMessage({
        caseId: selectedCase.caseId,
        authorId: user?.uid || 'user',
        authorName: user?.displayName || 'Agent',
        authorRole: isSupportOrPlatformAdmin ? 'support_admin' : 'requester',
        content: replyText,
        isInternalNote,
        isPlatformOrSupportAdmin: !!isSupportOrPlatformAdmin,
      });
      setReplyText('');
      setIsInternalNote(false);
      loadCases();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send reply.');
    }
  };

  const handleResolveCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    setErrorMsg(null);
    try {
      const updated = CustomerSupportService.updateStatus({
        caseId: selectedCase.caseId,
        newStatus: 'RESOLVED',
        actorId: user?.uid || 'admin',
        resolutionSummary,
      });
      setIsResolveModalOpen(false);
      setResolutionSummary('');
      setSelectedCase(updated);
      setSuccessMsg(`Case #${updated.caseId} marked as RESOLVED.`);
      loadCases();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resolve case.');
    }
  };

  const handleReopenCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    setErrorMsg(null);
    try {
      const updated = CustomerSupportService.updateStatus({
        caseId: selectedCase.caseId,
        newStatus: 'IN_PROGRESS',
        actorId: user?.uid || 'admin',
        reopenReason,
      });
      setIsReopenModalOpen(false);
      setReopenReason('');
      setSelectedCase(updated);
      setSuccessMsg(`Case #${updated.caseId} REOPENED into IN_PROGRESS.`);
      loadCases();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reopen case.');
    }
  };

  const filteredCases = cases.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (severityFilter !== 'ALL' && c.severity !== severityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.caseId.toLowerCase().includes(q) ||
        c.tenantName.toLowerCase().includes(q)
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
              Customer Support & Operations Desk
            </h1>
            <Badge variant="blue" size="sm">
              Phase 17
            </Badge>
            {isSupportOrPlatformAdmin && (
              <Badge variant="purple" size="sm">
                SUPPORT_ADMIN (Cross-Tenant View)
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tenant-aware operational support, SLA escalation tracking, and confidential internal note isolation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={loadCases}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsNewCaseModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            New Ticket
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

      {/* Main Split Layout: Ticket List & Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* Ticket List Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Filters Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="TRIAGED">Triaged</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_CUSTOMER">Waiting</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Cases Container */}
          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {filteredCases.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900/20">
                No support tickets found matching current filters.
              </div>
            ) : (
              filteredCases.map((c) => {
                const isSelected = selectedCase?.caseId === c.caseId;
                return (
                  <div
                    key={c.caseId}
                    onClick={() => setSelectedCase(c)}
                    className={`p-3.5 rounded-lg border transition-all cursor-pointer text-xs ${
                      isSelected
                        ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 shadow-xs ring-1 ring-blue-500/30'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-slate-500 text-[11px]">{c.caseId}</span>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={
                            c.severity === 'SEV1_CRITICAL'
                              ? 'rose'
                              : c.severity === 'SEV2_HIGH'
                              ? 'amber'
                              : 'blue'
                          }
                          size="sm"
                        >
                          {c.severity}
                        </Badge>
                        <Badge
                          variant={
                            c.status === 'RESOLVED'
                              ? 'emerald'
                              : c.status === 'IN_PROGRESS'
                              ? 'blue'
                              : c.status === 'OPEN'
                              ? 'rose'
                              : 'default'
                          }
                          size="sm"
                        >
                          {c.status}
                        </Badge>
                      </div>
                    </div>

                    <h4 className="text-slate-900 dark:text-slate-200 font-semibold mt-1.5 line-clamp-1">{c.title}</h4>

                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                      <span>{c.tenantName}</span>
                      <span className="font-mono">{new Date(c.updatedAt).toLocaleDateString()}</span>
                    </div>

                    {c.slaBreached && (
                      <div className="mt-2 text-[10px] text-rose-600 dark:text-rose-400 flex items-center gap-1 font-mono">
                        <AlertTriangle className="w-3 h-3" /> SLA Escalation Breached ({c.slaHours}h target)
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Ticket Detail Panel (7 cols) */}
        <div className="lg:col-span-7">
          {selectedCase ? (
            <Card className="p-5 flex flex-col h-full min-h-[600px]">
              {/* Case Header */}
              <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{selectedCase.caseId}</span>
                    <Badge variant="blue" size="sm">
                      {selectedCase.category}
                    </Badge>
                    <Badge variant={selectedCase.severity === 'SEV1_CRITICAL' ? 'rose' : 'amber'} size="sm">
                      {selectedCase.severity}
                    </Badge>
                  </div>

                  {/* Status Actions */}
                  <div className="flex items-center gap-2">
                    {isSupportOrPlatformAdmin && selectedCase.status === 'OPEN' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          CustomerSupportService.assignCase(
                            selectedCase.caseId,
                            user?.uid || 'admin',
                            user?.displayName || 'Support Agent',
                            user?.uid || 'admin'
                          );
                          loadCases();
                        }}
                      >
                        Claim & Triage
                      </Button>
                    )}
                    {selectedCase.status !== 'RESOLVED' && selectedCase.status !== 'CLOSED' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsResolveModalOpen(true)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                        Resolve Case
                      </Button>
                    )}
                    {selectedCase.status === 'RESOLVED' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsReopenModalOpen(true)}
                      >
                        Reopen Ticket
                      </Button>
                    )}
                  </div>
                </div>

                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-2">{selectedCase.title}</h2>

                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-2">
                  <span>Tenant: <strong>{selectedCase.tenantName}</strong></span>
                  <span>·</span>
                  <span>Requester: {selectedCase.requesterName} ({selectedCase.requesterEmail})</span>
                  <span>·</span>
                  <span>SLA Window: {selectedCase.slaHours}h</span>
                </div>

                {selectedCase.resolutionSummary && (
                  <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-lg text-xs text-emerald-800 dark:text-emerald-300">
                    <strong>Resolution Summary:</strong> {selectedCase.resolutionSummary}
                  </div>
                )}
              </div>

              {/* Messages Timeline */}
              <div className="flex-1 py-4 space-y-3 overflow-y-auto max-h-[380px] pr-2">
                {selectedCase.messages.map((m) => (
                  <div
                    key={m.messageId}
                    className={`p-3 rounded-lg text-xs leading-relaxed ${
                      m.isInternalNote
                        ? 'bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200'
                        : 'bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-200">{m.authorName}</span>
                        {m.isInternalNote ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-mono flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Confidential Internal Staff Note
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">Customer Message</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        {new Date(m.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                ))}
              </div>

              {/* Reply Input Bar */}
              <form onSubmit={handleSendReply} className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                {isSupportOrPlatformAdmin && (
                  <div className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      id="internalNoteToggle"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="internalNoteToggle" className="text-amber-700 dark:text-amber-400 font-medium cursor-pointer flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Post as Confidential Internal Note (Hidden from Publisher)
                    </label>
                  </div>
                )}

                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={
                      isInternalNote
                        ? 'Enter confidential operational notes for support engineering team...'
                        : 'Type your message to the publisher...'
                    }
                    className="flex-1 p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    required
                  />
                  <Button variant="primary" size="sm" type="submit" className="self-end">
                    <Send className="w-4 h-4 mr-1" />
                    Send
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <Card className="p-12 text-center flex flex-col items-center justify-center min-h-[600px]">
              <LifeBuoy className="w-10 h-10 text-slate-400 dark:text-slate-600 mb-3" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Select a Support Ticket</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mt-1">
                Choose a ticket from the left panel to review message history, internal notes, and manage ticket status.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* MODAL: New Support Case */}
      <Modal
        isOpen={isNewCaseModalOpen}
        onClose={() => setIsNewCaseModalOpen(false)}
        title="Open New Support Ticket"
        subtitle="Submit technical, billing, or operational inquiry to the platform support desk"
        maxWidth="md"
        footer={null}
      >
        <form onSubmit={handleCreateCase} className="space-y-3 text-xs">
          <div>
            <label className="text-slate-300 font-medium mb-1 block">Ticket Subject</label>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Issue with edition PDF preflight fonts"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-300 font-medium mb-1 block">Category</label>
              <Select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                options={[
                  { value: 'BILLING_SUBSCRIPTION', label: 'Billing & Invoices' },
                  { value: 'MARKETPLACE_PAYOUT', label: 'Marketplace & Payouts' },
                  { value: 'EDITION_PRODUCTION', label: 'Edition & Production' },
                  { value: 'ACCESS_RBAC', label: 'Access & Permissions' },
                  { value: 'API_WEBHOOK', label: 'Enterprise API / Webhooks' },
                  { value: 'DATA_INTEGRITY', label: 'Data Quality / Repairs' },
                  { value: 'GENERAL', label: 'General Technical Inquiry' },
                ]}
              />
            </div>
            <div>
              <label className="text-slate-300 font-medium mb-1 block">Severity (SLA)</label>
              <Select
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value as any)}
                options={[
                  { value: 'SEV1_CRITICAL', label: 'SEV1 Critical (1h SLA)' },
                  { value: 'SEV2_HIGH', label: 'SEV2 High (4h SLA)' },
                  { value: 'SEV3_MEDIUM', label: 'SEV3 Medium (24h SLA)' },
                  { value: 'SEV4_LOW', label: 'SEV4 Low (72h SLA)' },
                ]}
              />
            </div>
          </div>
          <div>
            <label className="text-slate-300 font-medium mb-1 block">Detailed Description</label>
            <textarea
              rows={4}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Provide exact error messages, edition IDs, or symptoms observed..."
              className="w-full p-2.5 text-xs bg-slate-950 border border-slate-800 rounded-md text-slate-200 focus:outline-none focus:border-slate-700 resize-none"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsNewCaseModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Submit Ticket
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Resolve Case */}
      <Modal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        title="Resolve Support Case"
        subtitle="Mandatory resolution summary explaining the diagnosis and corrective action taken"
        maxWidth="md"
        footer={null}
      >
        <form onSubmit={handleResolveCase} className="space-y-3 text-xs">
          <div>
            <label className="text-slate-300 font-medium mb-1 block">Resolution Summary</label>
            <textarea
              rows={4}
              value={resolutionSummary}
              onChange={(e) => setResolutionSummary(e.target.value)}
              placeholder="Document the resolution steps, root cause, or configuration adjustments made..."
              className="w-full p-2.5 text-xs bg-slate-950 border border-slate-800 rounded-md text-slate-200 focus:outline-none focus:border-slate-700 resize-none"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsResolveModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Confirm Resolution
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Reopen Case */}
      <Modal
        isOpen={isReopenModalOpen}
        onClose={() => setIsReopenModalOpen(false)}
        title="Reopen Support Case"
        subtitle="Mandatory reason describing why additional operational work is required"
        maxWidth="md"
        footer={null}
      >
        <form onSubmit={handleReopenCase} className="space-y-3 text-xs">
          <div>
            <label className="text-slate-300 font-medium mb-1 block">Reopening Justification</label>
            <textarea
              rows={3}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="State why previous resolution was incomplete or recurred..."
              className="w-full p-2.5 text-xs bg-slate-950 border border-slate-800 rounded-md text-slate-200 focus:outline-none focus:border-slate-700 resize-none"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsReopenModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Reopen Ticket
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
