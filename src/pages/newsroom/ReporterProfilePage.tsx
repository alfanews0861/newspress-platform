/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 8 — Comprehensive Journalist & Reporter Profile Page
 * Factual operational metrics and assignment history without subjective quality scores.
 */

import { useState, useEffect } from 'react';
import { ReporterProfile } from '../../types/reporter';
import { StaffReporterDetails, NewsAssignment } from '../../types/newsroom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Tabs } from '../../components/ui/Tabs';
import { NewsroomStaffService } from '../../services/newsroomStaffService';
import { NewsAssignmentService } from '../../services/newsAssignmentService';
import { newsSubmissionService } from '../../services/newsSubmissionService';
import { ReporterVerificationService } from '../../services/reporterVerificationService';
import { useTenant } from '../../hooks/useTenant';

export const ReporterProfilePage: React.FC<{ reporterId?: string }> = ({ reporterId: propReporterId }) => {
  const { currentTenant } = useTenant();
  const reporterId = propReporterId || 'rep_sofia_chen';

  const [profile, setProfile] = useState<ReporterProfile | undefined>(undefined);
  const [extension, setExtension] = useState<StaffReporterDetails | undefined>(undefined);
  const [assignments, setAssignments] = useState<NewsAssignment[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    NewsroomStaffService.seedDefaultStaff(currentTenant.tenantId);
    const prof = NewsroomStaffService.getReporterProfile(reporterId);
    const ext = NewsroomStaffService.getReporterExtension(reporterId);
    const asgs = NewsAssignmentService.getReporterAssignments(reporterId, currentTenant.tenantId);
    setProfile(prof);
    setExtension(ext);
    setAssignments(asgs);
  }, [reporterId, currentTenant.tenantId]);

  if (!profile) {
    return (
      <div className="p-8 text-center text-slate-400 font-mono">
        Loading reporter profile...
      </div>
    );
  }

  const submissions = newsSubmissionService.getReporterSubmissions(reporterId, currentTenant.tenantId);
  const verifications = ReporterVerificationService.getReporterVerifications(reporterId);

  const completedAssignments = assignments.filter((a) => a.status === 'COMPLETED').length;
  const overdueAssignments = assignments.filter((a) => a.deadlineState === 'OVERDUE').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={profile.byline}
        subtitle={`${extension?.designation || 'Journalist'} • ${extension?.assignedBureau || 'Central Newsroom'}`}
        breadcrumbs={[
          { label: 'Newsroom', href: '#' },
          { label: 'Reporters', href: '#' },
          { label: profile.byline },
        ]}
      />

      {/* Header Profile Card */}
      <Card variant="editorial" className="p-6">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-500 flex items-center justify-center font-bold font-sans text-blue-600 dark:text-blue-400 text-2xl shrink-0">
              {profile.byline.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-sans text-slate-900 dark:text-slate-100">{profile.byline}</h2>
                <Badge variant={extension?.employmentType === 'STAFF' ? 'blue' : 'purple'}>
                  {extension?.employmentType || profile.reporterType}
                </Badge>
                <StatusBadge status={profile.verificationStatus} />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">{profile.bio}</p>

              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400 mt-3">
                <span>Bureau: <strong className="text-slate-800 dark:text-slate-200">{extension?.assignedBureau || 'Metro'}</strong></span>
                <span>•</span>
                <span>Employee ID: <strong className="text-slate-800 dark:text-slate-200">{extension?.employeeCode || 'N/A'}</strong></span>
                <span>•</span>
                <span>Press Card: <strong className="text-slate-800 dark:text-slate-200">{profile.pressCardNumber || 'N/A'}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0 border-l border-slate-200 dark:border-slate-800 pl-6">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase">Originality Index</span>
            <span className="text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{profile.originalityScore}%</span>
            <span className="text-[10px] font-mono text-slate-400">Algorithmic Triage Score</span>
          </div>
        </div>
      </Card>

      {/* Tabs Navigation */}
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'overview', label: 'Factual Operational Metrics' },
          { id: 'assignments', label: `Field Assignments (${assignments.length})` },
          { id: 'submissions', label: `Submitted Dispatches (${submissions.length})` },
          { id: 'verifications', label: `Press Credentials (${verifications.length})` },
        ]}
      />

      {/* Tab Content: Overview Metrics */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card variant="editorial" className="p-4">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 block uppercase">Dispatches Filed</span>
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 block">{submissions.length}</span>
            <span className="text-[10px] text-slate-400 font-mono mt-1 block">Total news submissions</span>
          </Card>

          <Card variant="editorial" className="p-4">
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 block uppercase">Approved Stories</span>
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
              {submissions.filter((s) => s.editorialStatus === 'approved').length}
            </span>
            <span className="text-[10px] text-slate-400 font-mono mt-1 block">Approved for layout</span>
          </Card>

          <Card variant="editorial" className="p-4">
            <span className="text-xs font-mono text-blue-600 dark:text-blue-400 block uppercase">Assignments Completed</span>
            <span className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1 block">{completedAssignments}</span>
            <span className="text-[10px] text-slate-400 font-mono mt-1 block">Fulfilling desk briefs</span>
          </Card>

          <Card variant="editorial" className="p-4">
            <span className="text-xs font-mono text-rose-600 dark:text-rose-400 block uppercase">Assignments Overdue</span>
            <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1 block">{overdueAssignments}</span>
            <span className="text-[10px] text-slate-400 font-mono mt-1 block">Late submission records</span>
          </Card>
        </div>
      )}

      {/* Tab Content: Field Assignments */}
      {activeTab === 'assignments' && (
        <Card variant="editorial">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold font-sans text-slate-900 dark:text-slate-100">Assigned Desk Briefs</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {assignments.map((asg) => (
              <div key={asg.assignmentId} className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm font-sans">{asg.title}</span>
                    <Badge variant={asg.priority === 'URGENT' ? 'rose' : 'blue'} size="sm">
                      {asg.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{asg.brief}</p>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                    Beat: {asg.beat} | District: {asg.district} | Deadline: {new Date(asg.deadline).toLocaleString()}
                  </div>
                </div>
                <Badge
                  variant={
                    asg.status === 'COMPLETED'
                      ? 'emerald'
                      : asg.deadlineState === 'OVERDUE'
                      ? 'rose'
                      : 'blue'
                  }
                >
                  {asg.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab Content: Submitted Dispatches */}
      {activeTab === 'submissions' && (
        <Card variant="editorial">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold font-sans text-slate-900 dark:text-slate-100">Filed Dispatches</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {submissions.map((sub) => (
              <div key={sub.articleId} className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm font-sans">{sub.headline}</h4>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                    Submitted: {new Date(sub.createdAt).toLocaleString()} | Words: {sub.wordCount}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={sub.editorialStatus === 'approved' ? 'emerald' : 'blue'}>
                    {sub.editorialStatus}
                  </Badge>
                  <StatusBadge status={sub.originalityStatus || 'pending'} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab Content: Verifications */}
      {activeTab === 'verifications' && (
        <Card variant="editorial">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold font-sans text-slate-900 dark:text-slate-100">Identity & Press Accreditation Records</h3>
          </div>
          <div className="p-4 space-y-3 font-mono text-xs">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">Identity Verification</span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">Government Issued Identification & Press Card</p>
              </div>
              <Badge variant="emerald">VERIFIED</Badge>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">Organization Association</span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">Accredited Staff Journalist for {currentTenant.organizationName}</p>
              </div>
              <Badge variant="emerald">VERIFIED</Badge>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
