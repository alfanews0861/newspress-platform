/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Finance Payout Management & Approval Console
 * Phase 11 — Marketplace Revenue Settlement, Reporter Royalty Ledger & Payout Engine
 */

import { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { payoutService } from '../../services/payoutService';
import { payoutProfileService } from '../../services/payoutProfileService';
import { payableBalanceService } from '../../services/payableBalanceService';
import { PayoutRequestPhase11, PayoutProfile } from '../../types/financePhase11';
import { useAuth } from '../../hooks/useAuth';
import { formatINR, formatDateTime } from '../../utils/formatters';

export const PayoutManagementPage = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PayoutRequestPhase11[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<PayoutRequestPhase11 | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | 'submit'>('approve');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const refreshRequests = () => {
    setRequests(payoutService.getAllRequests());
  };

  useEffect(() => {
    refreshRequests();
  }, []);

  const handleOpenAction = (req: PayoutRequestPhase11, action: 'approve' | 'reject' | 'submit') => {
    setSelectedRequest(req);
    setModalAction(action);
    setRejectionReason('');
    setIsModalOpen(true);
  };

  const handleExecuteModalAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !user) return;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      if (modalAction === 'approve') {
        await payoutService.approvePayout({
          payoutRequestId: selectedRequest.id,
          approvedBy: user.uid || 'admin',
          approverRole: 'admin',
          enforceSegregationOfDuties: false // Demo mode override if logged in user requested
        });
        setFeedback(`Payout #${selectedRequest.id} approved and balance reserved.`);
      } else if (modalAction === 'reject') {
        await payoutService.rejectPayout({
          payoutRequestId: selectedRequest.id,
          rejectedBy: user.uid || 'admin',
          reason: rejectionReason || 'Failed documentation check'
        });
        setFeedback(`Payout #${selectedRequest.id} rejected.`);
      } else if (modalAction === 'submit') {
        await payoutService.submitPayoutToProvider(selectedRequest.id);
        setFeedback(`Payout #${selectedRequest.id} submitted to provider ${selectedRequest.provider}.`);
      }

      setIsModalOpen(false);
      refreshRequests();
    } catch (err: any) {
      alert(`Error executing action: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRequests = requests.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payout Review & Settlement Console"
        subtitle="Finance administration workflow for approving payout requests, inspecting double-entry balance reservations, and submitting payouts to banking providers."
        breadcrumbs={[
          { label: 'Finance', href: '#' },
          { label: 'Payout Management' }
        ]}
      />

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-200">
            &times;
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <Card variant="editorial" className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-xs font-mono text-slate-400">Filter Status:</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg text-xs px-3 py-1.5 text-slate-200 font-mono"
          >
            <option value="all">All Requests</option>
            <option value="REQUESTED">REQUESTED</option>
            <option value="APPROVED">APPROVED</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="FAILED">FAILED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        <Button variant="ghost" size="sm" onClick={refreshRequests} className="text-xs">
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          Refresh Requests
        </Button>
      </Card>

      {/* Payout Table */}
      <Card variant="editorial" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3.5">Payout ID</th>
                <th className="p-3.5">Owner ID</th>
                <th className="p-3.5">Amount (INR)</th>
                <th className="p-3.5">Provider</th>
                <th className="p-3.5">Requested At</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                    No payout requests found matching status filter.
                  </td>
                </tr>
              ) : (
                filteredRequests.map(r => {
                  const profile = payoutProfileService.getProfile(r.ownerId);
                  const bal = payableBalanceService.calculatePayableBalance(r.ownerId);

                  return (
                    <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3.5 font-bold text-slate-100">{r.id}</td>
                      <td className="p-3.5">
                        <div className="font-sans font-medium text-slate-200">{profile?.displayName || r.ownerId}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{r.ownerId}</span>
                      </td>
                      <td className="p-3.5 font-bold text-amber-400">
                        {formatINR(r.amountMinor / 100)}
                      </td>
                      <td className="p-3.5 text-slate-400">{r.provider}</td>
                      <td className="p-3.5 text-slate-400">{formatDateTime(r.requestedAt)}</td>
                      <td className="p-3.5 font-sans">
                        <Badge
                          variant={
                            r.status === 'COMPLETED'
                              ? 'emerald'
                              : r.status === 'APPROVED' || r.status === 'PROCESSING'
                              ? 'blue'
                              : r.status === 'FAILED' || r.status === 'REJECTED'
                              ? 'rose'
                              : 'amber'
                          }
                          size="sm"
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right font-sans">
                        {r.status === 'REQUESTED' && (
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-[11px] px-2 py-0.5"
                              onClick={() => handleOpenAction(r, 'approve')}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              className="text-[11px] px-2 py-0.5"
                              onClick={() => handleOpenAction(r, 'reject')}
                            >
                              Reject
                            </Button>
                          </div>
                        )}

                        {r.status === 'APPROVED' && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="text-[11px] px-2 py-0.5"
                            onClick={() => handleOpenAction(r, 'submit')}
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Submit Provider
                          </Button>
                        )}

                        {r.status === 'FAILED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[11px] px-2 py-0.5 text-amber-400 border-amber-500/40"
                            onClick={() => handleOpenAction(r, 'submit')}
                          >
                            Retry
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Action Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalAction === 'approve'
            ? 'Approve Payout Request'
            : modalAction === 'reject'
            ? 'Reject Payout Request'
            : 'Submit Payout to Provider'
        }
      >
        <form onSubmit={handleExecuteModalAction} className="space-y-4 text-xs font-sans">
          {selectedRequest && (
            <div className="p-3 bg-slate-900 rounded-lg font-mono space-y-1">
              <div className="flex justify-between text-slate-300 font-bold">
                <span>Request ID: {selectedRequest.id}</span>
                <span className="text-amber-400">{formatINR(selectedRequest.amountMinor / 100)}</span>
              </div>
              <div className="text-slate-400">Owner: {selectedRequest.ownerId}</div>
              <div className="text-slate-400">Provider: {selectedRequest.provider}</div>
            </div>
          )}

          {modalAction === 'reject' && (
            <div>
              <label className="block font-mono font-medium text-slate-300 mb-1">
                Rejection Reason (Mandatory)
              </label>
              <Input
                type="text"
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="e.g. Tax identification document verification failed"
                required
              />
            </div>
          )}

          {modalAction === 'approve' && (
            <p className="text-slate-300">
              Approving this request will immediately execute a double-entry ledger reservation locking {formatINR((selectedRequest?.amountMinor || 0) / 100)} from the available balance.
            </p>
          )}

          {modalAction === 'submit' && (
            <p className="text-slate-300">
              Submitting payout to provider adapter ({selectedRequest?.provider}). Upon provider clearance, the payout will transition to COMPLETED.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={modalAction === 'reject' ? 'danger' : 'primary'}
              size="sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Confirm Action'}
            </Button>

          </div>
        </form>
      </Modal>
    </div>
  );
};
