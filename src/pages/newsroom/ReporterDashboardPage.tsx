/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 8 — Reporter Personal Operational Dashboard
 */

import React, { useState, useEffect } from 'react';
import { ClipboardList, Clock, CheckCircle2, AlertTriangle, MessageSquare, ShieldCheck, FilePlus } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { NewsAssignmentService } from '../../services/newsAssignmentService';
import { newsSubmissionService } from '../../services/newsSubmissionService';
import { EditorialCommentService } from '../../services/editorialCommentService';
import { NewsAssignment, EditorialComment } from '../../types/newsroom';
import { NewsArticle } from '../../types/news';

export const ReporterDashboardPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const reporterId = user?.uid === 'user-sofia-chen' ? 'rep_sofia_chen' : 'rep_sofia_chen';

  const [assignments, setAssignments] = useState<NewsAssignment[]>([]);
  const [submissions, setSubmissions] = useState<NewsArticle[]>([]);
  const [comments, setComments] = useState<EditorialComment[]>([]);

  const loadData = () => {
    if (!currentTenant?.tenantId) return;
    NewsAssignmentService.seedDefaultAssignments(currentTenant.tenantId);
    const asgs = NewsAssignmentService.getReporterAssignments(reporterId, currentTenant.tenantId);
    const subs = newsSubmissionService.getReporterSubmissions(reporterId, currentTenant.tenantId);

    const allComments: EditorialComment[] = [];
    subs.forEach((s) => {
      const cmts = EditorialCommentService.getCommentsForArticle(s.articleId);
      allComments.push(...cmts);
    });

    setAssignments(asgs);
    setSubmissions(subs);
    setComments(allComments);
  };

  useEffect(() => {
    loadData();
  }, [currentTenant?.tenantId, reporterId]);

  const handleAcceptAssignment = async (assignmentId: string) => {
    try {
      await NewsAssignmentService.acceptAssignment(assignmentId, user?.uid || 'user-sofia-chen', user?.displayName || 'Sofia Chen');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStartAssignment = async (assignmentId: string) => {
    try {
      await NewsAssignmentService.startAssignment(assignmentId, user?.uid || 'user-sofia-chen', user?.displayName || 'Sofia Chen');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reporter Field Workspace"
        subtitle={`Personal assignment queue, submission status, and editorial feedback for ${user?.displayName || 'Sofia Chen'}.`}
        breadcrumbs={[
          { label: 'Newsroom', href: '#' },
          { label: 'Reporter Dashboard' },
        ]}
      />

      {/* Assignment Overview Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="editorial" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-slate-400 uppercase block">Active Assignments</span>
            <span className="text-2xl font-bold font-mono text-blue-400 mt-1 block">{assignments.length}</span>
          </div>
          <ClipboardList className="w-8 h-8 text-blue-400/60" />
        </Card>

        <Card variant="editorial" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-slate-400 uppercase block">Overdue Briefs</span>
            <span className="text-2xl font-bold font-mono text-rose-400 mt-1 block">
              {assignments.filter((a) => a.deadlineState === 'OVERDUE').length}
            </span>
          </div>
          <AlertTriangle className="w-8 h-8 text-rose-400/60" />
        </Card>

        <Card variant="editorial" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase block">Editorial Notes</span>
            <span className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1 block">{comments.length}</span>
          </div>
          <MessageSquare className="w-8 h-8 text-blue-600/60 dark:text-blue-400/60" />
        </Card>
      </div>

      {/* Today's Field Assignments */}
      <Card variant="editorial">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold font-sans text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Today's Assigned Briefs
          </h3>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {assignments.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono">No assignments active right now.</div>
          ) : (
            assignments.map((asg) => (
              <div key={asg.assignmentId} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-sans text-slate-900 dark:text-slate-100 text-sm">{asg.title}</span>
                    <Badge variant={asg.priority === 'URGENT' ? 'rose' : 'blue'}>{asg.priority}</Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl">{asg.brief}</p>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Deadline: {new Date(asg.deadline).toLocaleString()} | Location: {asg.location || 'Local'}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {asg.status === 'ASSIGNED' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAcceptAssignment(asg.assignmentId)}
                    >
                      Accept Assignment
                    </Button>
                  )}

                  {asg.status === 'ACCEPTED' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleStartAssignment(asg.assignmentId)}
                    >
                      Start Reporting
                    </Button>
                  )}

                  <Badge variant={asg.status === 'COMPLETED' ? 'emerald' : 'blue'}>
                    {asg.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* My Submissions & Originality Status */}
      <Card variant="editorial">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-bold font-sans text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            My Submissions & Server Originality Verification (Read-Only)
          </h3>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {submissions.map((sub) => (
            <div key={sub.articleId} className="p-4 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm font-sans">{sub.headline}</h4>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                  Server Timestamp: {new Date(sub.createdAt).toLocaleString()} | Status: {sub.editorialStatus}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge status={sub.originalityStatus || 'pending'} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Editorial Feedback */}
      {comments.length > 0 && (
        <Card variant="editorial">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold font-sans text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Editorial Comments & Revision Requests
            </h3>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {comments.map((c) => (
              <div key={c.commentId} className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs font-mono text-blue-700 dark:text-blue-400">
                    From: {c.authorName || 'Desk Editor'} ({c.commentType})
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200">{c.text}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
