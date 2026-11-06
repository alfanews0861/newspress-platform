/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 8 — Staff Management & Seat Entitlement Console
 */

import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, Shield, AlertTriangle, CheckCircle, XCircle, Clock, Copy, Trash2, Ban } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { NewsroomStaffService } from '../../services/newsroomStaffService';
import { ReporterInvitationService } from '../../services/reporterInvitationService';
import { SubscriptionEntitlementService } from '../../services/subscriptionEntitlementService';
import { NewsroomMember, ReporterInvitation, NewsroomRole, ReporterEmploymentType } from '../../types/newsroom';

export const StaffManagementPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { can } = usePermission();

  const [members, setMembers] = useState<NewsroomMember[]>([]);
  const [invitations, setInvitations] = useState<ReporterInvitation[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState<NewsroomRole>('STAFF_REPORTER');
  const [inviteEmployment, setInviteEmployment] = useState<ReporterEmploymentType>('STAFF');
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  const loadData = () => {
    if (!currentTenant?.tenantId) return;
    const staff = NewsroomStaffService.getTenantMembers(currentTenant.tenantId);
    const invs = ReporterInvitationService.getTenantInvitations(currentTenant.tenantId);
    setMembers(staff);
    setInvitations(invs);
  };

  useEffect(() => {
    loadData();
  }, [currentTenant?.tenantId]);

  const entitlements = SubscriptionEntitlementService.getEffectiveEntitlements(currentTenant.tenantId);
  const staffLimit = entitlements.limits.staffMemberLimit;
  const reporterLimit = entitlements.limits.reporterLimit;
  const activeStaffCount = NewsroomStaffService.getActiveStaffCount(currentTenant.tenantId);
  const activeReporterCount = NewsroomStaffService.getActiveReporterCount(currentTenant.tenantId);

  const canAddStaff = SubscriptionEntitlementService.canAddStaffMember(currentTenant.tenantId, activeStaffCount);
  const canAddReporter = SubscriptionEntitlementService.canAddReporter(currentTenant.tenantId, activeReporterCount);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setGeneratedInviteLink(null);

    try {
      const result = await ReporterInvitationService.createInvitation({
        tenantId: currentTenant.tenantId,
        email: inviteEmail,
        phone: invitePhone,
        role: inviteRole,
        employmentType: inviteEmployment,
        invitedBy: user?.uid || 'user-admin',
        invitedByName: user?.displayName || 'Newsroom Admin',
      });

      const inviteUrl = `${window.location.origin}/invite?token=${result.rawToken}`;
      setGeneratedInviteLink(inviteUrl);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create invitation.');
    }
  };

  const handleDeactivate = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to deactivate this staff member? Historical stories and assignments will remain intact.')) return;
    try {
      await NewsroomStaffService.deactivateStaffMember(
        currentTenant.tenantId,
        memberId,
        user?.uid || 'admin',
        user?.displayName || 'Admin'
      );
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Newsroom Staff & Seat Management"
        subtitle={`Manage staff roles, seat capacity limits, and reporter accreditations for ${currentTenant.organizationName}.`}
        breadcrumbs={[
          { label: 'Newsroom', href: '#' },
          { label: 'Staff Management' },
        ]}
        actions={
          can('staff.manage') ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<UserPlus className="w-4 h-4" />}
              onClick={() => {
                setErrorMsg(null);
                setGeneratedInviteLink(null);
                setIsInviteModalOpen(true);
              }}
            >
              Invite Staff / Reporter
            </Button>
          ) : undefined
        }
      />

      {/* Subscription Capacity Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="editorial" className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-950/60 border border-blue-800/80 text-blue-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono text-slate-400 block uppercase">Staff Seats Used</span>
              <span className="text-xl font-bold font-mono text-slate-100">
                {activeStaffCount} / {staffLimit <= 0 ? 'Unlimited' : staffLimit}
              </span>
            </div>
          </div>
          <Badge variant={canAddStaff.allowed ? 'emerald' : 'rose'}>
            {canAddStaff.allowed ? 'Capacity Available' : 'Limit Reached'}
          </Badge>
        </Card>

        <Card variant="editorial" className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-amber-950/60 border border-amber-800/80 text-amber-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono text-slate-400 block uppercase">Reporter Seats Used</span>
              <span className="text-xl font-bold font-mono text-slate-100">
                {activeReporterCount} / {reporterLimit <= 0 ? 'Unlimited' : reporterLimit}
              </span>
            </div>
          </div>
          <Badge variant={canAddReporter.allowed ? 'emerald' : 'rose'}>
            {canAddReporter.allowed ? 'Capacity Available' : 'Limit Reached'}
          </Badge>
        </Card>
      </div>

      {/* Staff Members List */}
      <Card variant="editorial">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold font-sans text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Active Newsroom Staff & Editors ({members.length})
          </h3>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {members.map((m) => (
            <div key={m.memberId} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-bold font-sans text-blue-600 dark:text-blue-400">
                  {m.designation.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm font-sans">{m.designation}</span>
                    <Badge variant={m.status === 'ACTIVE' ? 'emerald' : 'rose'} size="sm">
                      {m.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>Role: {m.role}</span>
                    <span>•</span>
                    <span>Dept: {m.department}</span>
                  </div>
                </div>
              </div>

              {can('staff.manage') && m.status === 'ACTIVE' && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Ban className="w-3.5 h-3.5 text-rose-400" />}
                  onClick={() => handleDeactivate(m.memberId)}
                >
                  Deactivate
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Invitations List */}
      <Card variant="editorial">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold font-sans text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Pending & Past Invitations ({invitations.length})
          </h3>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs font-mono">
          {invitations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono">No invitations sent yet.</div>
          ) : (
            invitations.map((inv) => (
              <div key={inv.invitationId} className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200">{inv.email}</span>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    Role: {inv.role} | Type: {inv.employmentType} | Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                  </div>
                </div>
                <Badge
                  variant={
                    inv.status === 'PENDING'
                      ? 'blue'
                      : inv.status === 'ACCEPTED'
                      ? 'emerald'
                      : 'rose'
                  }
                >
                  {inv.status}
                </Badge>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Invite Staff Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Newsroom Staff / Reporter"
      >
        <form onSubmit={handleSendInvite} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded bg-rose-950/80 border border-rose-800 text-rose-200 text-xs">
              {errorMsg}
            </div>
          )}

          <Input
            label="Email Address"
            type="email"
            required
            placeholder="journalist@newspress.org"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />

          <Input
            label="Phone Number (Optional)"
            type="tel"
            placeholder="+1-555-0192"
            value={invitePhone}
            onChange={(e) => setInvitePhone(e.target.value)}
          />

          <Select
            label="Newsroom Role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as NewsroomRole)}
            options={[
              { value: 'STAFF_REPORTER', label: 'Staff Reporter' },
              { value: 'CHIEF_REPORTER', label: 'Chief Reporter' },
              { value: 'DESK_EDITOR', label: 'Desk Editor' },
              { value: 'NEWS_EDITOR', label: 'News Editor' },
              { value: 'EDITOR_IN_CHIEF', label: 'Editor-in-Chief' },
              { value: 'COPY_EDITOR', label: 'Copy Editor' },
              { value: 'PHOTO_EDITOR', label: 'Photo Editor' },
              { value: 'ACCOUNTANT', label: 'Financial Accountant' },
            ]}
          />

          <Select
            label="Employment Type"
            value={inviteEmployment}
            onChange={(e) => setInviteEmployment(e.target.value as ReporterEmploymentType)}
            options={[
              { value: 'STAFF', label: 'STAFF (Permanent Correspondent)' },
              { value: 'FREELANCE', label: 'FREELANCE (Independent Journalist)' },
              { value: 'STRINGER', label: 'STRINGER (Regional Field Stringer)' },
              { value: 'CONTRIBUTOR', label: 'CONTRIBUTOR (Special Guest Columnist)' },
            ]}
          />

          {generatedInviteLink && (
            <div className="p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-emerald-300">
                <span className="font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Invitation Token Generated!
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Send this secure single-use invitation link to the recipient:
              </p>
              <div className="flex items-center gap-2">
                <Input value={generatedInviteLink} readOnly className="text-xs font-mono" />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(generatedInviteLink)}
                  leftIcon={<Copy className="w-3.5 h-3.5" />}
                >
                  {copiedToken ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsInviteModalOpen(false)}>
              Close
            </Button>

            {!generatedInviteLink && (
              <Button type="submit" variant="primary">
                Generate Invitation
              </Button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
};
