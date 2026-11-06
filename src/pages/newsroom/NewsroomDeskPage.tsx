/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 8 — Editor Desk Dashboard & Triage Operations
 */

import React, { useState, useEffect } from 'react';
import { Layers, AlertTriangle, CheckCircle, XCircle, FileText, Sparkles, ShieldCheck, ShoppingBag, BookOpen } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { useTenant } from '../../hooks/useTenant';
import { newsSubmissionService } from '../../services/newsSubmissionService';
import { NewsAssignmentService } from '../../services/newsAssignmentService';
import { NewsroomMetricsService } from '../../services/newsroomMetricsService';
import { NewsArticle } from '../../types/news';
import { NewsAssignment } from '../../types/newsroom';

export const NewsroomDeskPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const [activeTab, setActiveTab] = useState('review');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [assignments, setAssignments] = useState<NewsAssignment[]>([]);

  const loadData = () => {
    if (!currentTenant?.tenantId) return;
    const arts = newsSubmissionService.getArticles(currentTenant.tenantId);
    const asgs = NewsAssignmentService.getAssignments(currentTenant.tenantId);
    setArticles(arts);
    setAssignments(asgs);
  };

  useEffect(() => {
    loadData();
  }, [currentTenant?.tenantId]);

  const metrics = NewsroomMetricsService.getOperationalMetrics(currentTenant.tenantId);

  const pendingSubmissions = articles.filter((a) =>
    ['submitted', 'in_review', 'fact_checking', 'originality_check'].includes(a.editorialStatus)
  );

  const approvedStories = articles.filter((a) => a.editorialStatus === 'approved');
  const rejectedStories = articles.filter((a) => a.editorialStatus === 'rejected');
  const marketplaceCandidates = articles.filter((a) => a.isMarketplaceEligible);

  const handleApprove = async (articleId: string) => {
    try {
      await newsSubmissionService.editorialAction({
        articleId,
        editorId: 'user-editor-chief',
        editorName: 'Editor-in-Chief',
        decision: 'approve_publication',
        notes: 'Approved by desk editor for layout and publication.',
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReject = async (articleId: string) => {
    try {
      await newsSubmissionService.editorialAction({
        articleId,
        editorId: 'user-editor-chief',
        editorName: 'Editor-in-Chief',
        decision: 'reject',
        notes: 'Rejected due to insufficient field verification.',
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editor Desk Triage & Operations"
        subtitle={`Operational editorial desk managing submissions, originality verification, fact integrity, and publication targets for ${currentTenant.organizationName}.`}
        breadcrumbs={[
          { label: 'Newsroom', href: '#' },
          { label: 'Desk Dashboard' },
        ]}
      />

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="editorial" className="p-4">
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 block uppercase">Pending Triage</span>
          <span className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1 block">{pendingSubmissions.length}</span>
          <span className="text-[10px] text-slate-400 font-mono mt-1 block">Articles awaiting review</span>
        </Card>

        <Card variant="editorial" className="p-4">
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 block uppercase">Approved Stories</span>
          <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">{approvedStories.length}</span>
          <span className="text-[10px] text-slate-400 font-mono mt-1 block">Ready for print & digital</span>
        </Card>

        <Card variant="editorial" className="p-4">
          <span className="text-xs font-mono text-blue-600 dark:text-blue-400 block uppercase">Active Assignments</span>
          <span className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1 block">{assignments.length}</span>
          <span className="text-[10px] text-slate-400 font-mono mt-1 block">Field reporting briefs</span>
        </Card>

        <Card variant="editorial" className="p-4">
          <span className="text-xs font-mono text-purple-600 dark:text-purple-400 block uppercase">Marketplace Eligible</span>
          <span className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1 block">{marketplaceCandidates.length}</span>
          <span className="text-[10px] text-slate-400 font-mono mt-1 block">Syndication wire ready</span>
        </Card>
      </div>

      {/* Desk Navigation Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'review', label: `Submitted Reports (${pendingSubmissions.length})` },
          { id: 'assignments', label: `Field Assignments (${assignments.length})` },
          { id: 'approved', label: `Approved Library (${approvedStories.length})` },
          { id: 'marketplace', label: `Marketplace Candidates (${marketplaceCandidates.length})` },
        ]}
      />

      {/* Review Queue */}
      {activeTab === 'review' && (
        <Card variant="editorial">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold font-sans text-slate-900 dark:text-slate-100">Editorial Review Queue</h3>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {pendingSubmissions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono">No pending submissions in queue.</div>
            ) : (
              pendingSubmissions.map((art) => (
                <div key={art.articleId} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm font-sans">{art.headline}</h4>
                      <StatusBadge status={art.originalityStatus || 'pending'} />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl">{art.leadParagraph}</p>
                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      Byline: {art.byline} | Category: {art.category} | Words: {art.wordCount}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(art.articleId)}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleApprove(art.articleId)}
                    >
                      Approve Story
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Field Assignments View */}
      {activeTab === 'assignments' && (
        <Card variant="editorial">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold font-sans text-slate-900 dark:text-slate-100">Active Field Assignments</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {assignments.map((asg) => (
              <div key={asg.assignmentId} className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-sans text-slate-900 dark:text-slate-100 text-sm">{asg.title}</span>
                    <Badge variant={asg.priority === 'URGENT' ? 'rose' : 'blue'}>{asg.priority}</Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{asg.brief}</p>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                    Deadline: {new Date(asg.deadline).toLocaleString()} | Status: {asg.status}
                  </div>
                </div>
                <Badge variant={asg.deadlineState === 'OVERDUE' ? 'rose' : 'emerald'}>
                  {asg.deadlineState}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Approved Library */}
      {activeTab === 'approved' && (
        <Card variant="editorial">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold font-sans text-slate-900 dark:text-slate-100">Approved Editorial Content</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {approvedStories.map((art) => (
              <div key={art.articleId} className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm font-sans">{art.headline}</h4>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                    Byline: {art.byline} | Category: {art.category}
                  </div>
                </div>
                <Badge variant="emerald">APPROVED</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Marketplace Candidates */}
      {activeTab === 'marketplace' && (
        <Card variant="editorial">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold font-sans text-slate-900 dark:text-slate-100">Marketplace Eligible Stories</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {marketplaceCandidates.map((art) => (
              <div key={art.articleId} className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm font-sans">{art.headline}</h4>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                    Byline: {art.byline} | Originality: {art.originalityStatus}
                  </div>
                </div>
                <Badge variant="purple">MARKETPLACE ELIGIBLE</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
