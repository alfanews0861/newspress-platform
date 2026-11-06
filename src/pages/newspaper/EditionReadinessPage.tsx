/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 9 — Edition Readiness Dashboard
 * Visualizes the 5 Pillars of Publishing Readiness:
 * Content, Advertising, Editorial, Layout, and Licensing.
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  FileText,
  DollarSign,
  Layers,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { EditionPlanningService } from '../../services/editionPlanningService';
import { EditionReadinessService } from '../../services/editionReadinessService';
import {
  MOCK_CURRENT_EDITION,
  MOCK_NEWS_ARTICLES,
  MOCK_LICENSES,
} from '../../services/mockDataService';

interface EditionReadinessPageProps {
  onNavigate?: (path: string) => void;
}

export const EditionReadinessPage: React.FC<EditionReadinessPageProps> = ({ onNavigate }) => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { can } = usePermission();

  const [selectedEditionId, setSelectedEditionId] = useState(MOCK_CURRENT_EDITION.editionId);
  const [feedback, setFeedback] = useState<string | null>(null);

  const edition = EditionPlanningService.getEdition(selectedEditionId) || MOCK_CURRENT_EDITION;
  const pagePlans = EditionPlanningService.getPagePlans(selectedEditionId);

  const readiness = EditionReadinessService.evaluateReadiness({
    edition,
    pages: edition.pages || [],
    pagePlans,
    articles: MOCK_NEWS_ARTICLES,
    licenses: MOCK_LICENSES,
  });

  const handleMarkReadyToFinalize = () => {
    const res = EditionPlanningService.markReadyToFinalize(
      currentTenant.tenantId,
      selectedEditionId,
      user?.uid || 'editor-1',
      MOCK_NEWS_ARTICLES,
      MOCK_LICENSES
    );

    if (res.success) {
      setFeedback('Edition marked READY_TO_FINALIZE! Eligible for Night Production spooling.');
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setFeedback(`Cannot mark ready: ${res.error}`);
    }
  };

  const getProgressColor = (percent: number, status: string) => {
    if (status === 'BLOCKING') return 'bg-rose-500';
    if (status === 'WARNING') return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edition Readiness & Pre-Flight Diagnostics"
        subtitle={`5-Pillar integrity analysis for ${edition.editionCode} (${edition.editionType}).`}
        breadcrumbs={[
          { label: 'Newspaper', href: '#' },
          { label: 'Readiness' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {can('edition.approve_finalize') && (
              <Button
                variant={readiness.canApproveForFinalize ? 'primary' : 'outline'}
                leftIcon={<ShieldCheck className="w-4 h-4" />}
                onClick={handleMarkReadyToFinalize}
                disabled={!readiness.canApproveForFinalize}
              >
                Mark Ready to Finalize
              </Button>
            )}
            <Button
              variant="secondary"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => onNavigate?.('/newspaper/review')}
            >
              Go to Final Review
            </Button>
          </div>
        }
      />

      {feedback && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {feedback}
        </div>
      )}

      {/* Overall Score Card */}
      <Card variant="editorial">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl font-bold font-sans text-slate-900 dark:text-slate-100">
                Overall Publishing Readiness: {readiness.overallScorePercent}%
              </span>
              <StatusBadge status={readiness.overallStatus} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
              Evaluated: {new Date(readiness.evaluatedAt).toLocaleTimeString()} • {readiness.blockersCount} Blockers • {readiness.warningsCount} Warnings
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-sans uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Night Press Cutoff Status
            </span>
            <span
              className={`text-sm font-bold font-sans ${
                readiness.canApproveForFinalize ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {readiness.canApproveForFinalize ? 'CLEARED FOR FINALIZATION' : 'BLOCKED BY QUALITY CONTROLS'}
            </span>
          </div>
        </div>
      </Card>

      {/* 5-Pillar Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { key: 'content', label: '1. Content', icon: <FileText className="w-4 h-4" />, data: readiness.categories.content },
          { key: 'advertising', label: '2. Advertising', icon: <DollarSign className="w-4 h-4" />, data: readiness.categories.advertising },
          { key: 'editorial', label: '3. Editorial', icon: <Sparkles className="w-4 h-4" />, data: readiness.categories.editorial },
          { key: 'layout', label: '4. Layout', icon: <Layers className="w-4 h-4" />, data: readiness.categories.layout },
          { key: 'licensing', label: '5. Licensing', icon: <ShieldCheck className="w-4 h-4" />, data: readiness.categories.licensing },
        ].map((pillar) => (
          <Card key={pillar.key} variant="bordered" className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 font-sans">
                {pillar.icon} {pillar.label}
              </span>
              <span className="font-sans font-bold text-blue-600 dark:text-blue-400">
                {pillar.data.scorePercent}%
              </span>
            </div>

            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${getProgressColor(
                  pillar.data.scorePercent,
                  pillar.data.status
                )}`}
                style={{ width: `${pillar.data.scorePercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
              <span>{pillar.data.blockingIssues.length} Blockers</span>
              <span>{pillar.data.warnings.length} Warnings</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Blocking Issues and Warnings with Deep Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Blocking Issues */}
        <Card
          variant="editorial"
          title={`Blocking Quality Injunctions (${readiness.blockersCount})`}
          subtitle="All blocking issues must be resolved before marking READY_TO_FINALIZE."
        >
          {readiness.blockersCount === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-emerald-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto" />
              <div>Zero blocking issues detected. All hard quality constraints satisfied.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.values(readiness.categories).flatMap((cat) =>
                cat.blockingIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/40 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-rose-400 uppercase text-[10px] flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" /> {issue.source}
                      </span>
                      {issue.pageNumber && (
                        <Badge variant="outline" size="sm">
                          Page {issue.pageNumber}
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-200">{issue.description}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </Card>

        {/* Right: Warnings */}
        <Card
          variant="bordered"
          title={`Advisory Warnings (${readiness.warningsCount})`}
          subtitle="Non-blocking recommendations for layout refinement and copy-fitting."
        >
          {readiness.warningsCount === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
              <div>No warnings detected. Edition is in pristine publishing shape.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.values(readiness.categories).flatMap((cat) =>
                cat.warnings.map((warn) => (
                  <div
                    key={warn.id}
                    className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs space-y-1 font-sans"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-sans font-bold text-amber-800 dark:text-amber-300 uppercase text-[10px] flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> {warn.source}
                      </span>
                      {warn.pageNumber && (
                        <Badge variant="outline" size="sm">
                          Page {warn.pageNumber}
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">{warn.description}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
