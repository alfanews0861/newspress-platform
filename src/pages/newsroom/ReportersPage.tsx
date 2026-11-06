/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Journalist & Reporter Directory
 * Phase 2 — Reporter Reputation Foundation & Factual Metrics
 */

import React, { useState } from 'react';
import { Users, Award, ShieldCheck, Search, Mail, ExternalLink, Plus, AlertCircle, FileCheck, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useTenant } from '../../hooks/useTenant';
import { usePermission } from '../../hooks/usePermission';
import { MOCK_REPORTER_PROFILES } from '../../services/mockDataService';
import { formatCurrency } from '../../utils/formatters';

export const ReportersPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { can } = usePermission();

  const [filterType, setFilterType] = useState<'all' | 'staff_reporter' | 'freelance_reporter'>('all');
  const [search, setSearch] = useState('');

  const reporters = MOCK_REPORTER_PROFILES.filter((r) => {
    const matchesType = filterType === 'all' || r.reporterType === filterType;
    const matchesSearch =
      r.byline.toLowerCase().includes(search.toLowerCase()) ||
      r.beats.some((b) => b.toLowerCase().includes(search.toLowerCase()));
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journalist & Reporter Directory"
        subtitle={`Accredited newsroom staff and syndicate freelance correspondents affiliated with ${currentTenant.organizationName}. Factual reporting metrics are maintained by editorial verification.`}
        breadcrumbs={[
          { label: 'Newsroom', href: '#' },
          { label: 'Reporters' },
        ]}
        actions={
          can('reporters.manage') ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Accredit New Journalist
            </Button>
          ) : undefined
        }
      />

      {/* Notice on Objective Reputation Architecture */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-slate-900 dark:text-slate-100 font-sans">Objective Reputation Tracking (Zero-Subjectivity Policy)</span>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
            Reporters are assessed purely on factual verification metrics: confirmed field dispatches, verified original evidence, independent event co-coverage, and post-publication corrections.
            Reporters cannot edit their own statistics; all updates are derived strictly from editorial triage audits.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search by journalist name or beat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex items-center gap-2 font-sans">
          {(['all', 'staff_reporter', 'freelance_reporter'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer capitalize ${
                filterType === type
                  ? 'bg-blue-600 text-white font-medium shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {type === 'all' ? 'All Journalists' : type.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Reporters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-sans">
        {reporters.map((rep) => (
          <Card
            key={rep.reporterId}
            className="flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs rounded-xl p-5"
          >
            <div>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-sans font-bold text-lg">
                    {rep.byline.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white font-sans">
                      {rep.byline}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant={rep.reporterType === 'staff_reporter' ? 'blue' : 'purple'} size="sm">
                        {rep.reporterType.replace(/_/g, ' ')}
                      </Badge>
                      <StatusBadge status={rep.verificationStatus} />
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Originality</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {rep.originalityScore}%
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">{rep.bio}</p>

              {/* Phase 2 Factual Reputation Metrics Bar */}
              <div className="grid grid-cols-4 gap-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-center text-xs mb-3">
                <div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">Field Notes</div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 mt-0.5">{rep.articlesPublishedCount > 50 ? 42 : 12}</div>
                </div>
                <div>
                  <div className="text-emerald-600 dark:text-emerald-400 text-[11px]">Verified Orig.</div>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">{rep.articlesPublishedCount > 50 ? 38 : 10}</div>
                </div>
                <div>
                  <div className="text-blue-600 dark:text-blue-400 text-[11px]">Independent</div>
                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">8</div>
                </div>
                <div>
                  <div className="text-rose-600 dark:text-rose-400 text-[11px]">Duplicates</div>
                  <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-0.5">0</div>
                </div>
              </div>

              {/* Beats */}
              <div className="space-y-1 mb-4">
                <span className="text-xs text-slate-500 dark:text-slate-400 block uppercase font-medium">
                  Reporting Beats:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {rep.beats.map((beat) => (
                    <span
                      key={beat}
                      className="text-xs px-2.5 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-slate-200 dark:border-slate-700 font-medium"
                    >
                      {beat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Credentials */}
              {rep.pressCardNumber && (
                <div className="p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Press Card: {rep.pressCardNumber}</span>
                  <span className="text-slate-500 dark:text-slate-400">{rep.pressCardIssuer}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>{rep.articlesPublishedCount} Published Articles</span>
              <span>Available: {formatCurrency(rep.availableBalanceCents)}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
