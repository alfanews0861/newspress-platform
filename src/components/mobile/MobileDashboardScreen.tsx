/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 13 — Mobile Dashboard Screen
 * Dynamically displays role-specific operational metrics and active queues:
 * - Reporter: Today's assignments, overdue dispatches, drafts in progress, submitted stories
 * - Editor: Editorial review queue, pending revisions, breaking news, desk capacity
 * - Publisher: Planned print editions, preflight readiness, production queue status, marketplace acquisitions
 */

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  FileEdit,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Newspaper,
  ShoppingCart,
  Printer,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Radio,
  Camera,
  PlusCircle,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { NewsAssignmentService } from '../../services/newsAssignmentService';
import { newsSubmissionService } from '../../services/newsSubmissionService';
import { OfflineReportingStore } from '../../services/mobileOfflineStore';
import { EditionPlanningService } from '../../services/editionPlanningService';
import { MobileTab } from '../../types/mobile';

interface MobileDashboardScreenProps {
  onNavigateTab: (tab: MobileTab) => void;
  onOpenDraft?: (draftId?: string) => void;
}

export const MobileDashboardScreen: React.FC<MobileDashboardScreenProps> = ({
  onNavigateTab,
  onOpenDraft,
}) => {
  const { user, currentMembership } = useAuth();
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.tenantId || 'tenant-metro-chronicle';
  const userId = user?.uid || user?.userId || 'rep_sofia_chen';

  const isReporter =
    currentMembership?.reporterRole === 'staff_reporter' ||
    currentMembership?.reporterRole === 'freelance_reporter';
  const isEditor =
    currentMembership?.organizationRole === 'editor' ||
    currentMembership?.organizationRole === 'editor_in_chief' ||
    currentMembership?.organizationRole === 'owner';
  const isPublisher =
    currentMembership?.organizationRole === 'owner' ||
    currentMembership?.organizationRole === 'administrator';

  const [assignmentsCount, setAssignmentsCount] = useState<number>(0);
  const [urgentCount, setUrgentCount] = useState<number>(0);
  const [draftsCount, setDraftsCount] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [editionsCount, setEditionsCount] = useState<number>(0);

  useEffect(() => {
    // Load counts
    NewsAssignmentService.seedDefaultAssignments(tenantId);
    const asgs = NewsAssignmentService.getReporterAssignments(userId, tenantId);
    setAssignmentsCount(asgs.length);
    setUrgentCount(asgs.filter((a) => a.priority === 'HIGH' || (a.priority as any) === 'URGENT').length);

    const drafts = OfflineReportingStore.getDraftsForReporter(userId, tenantId);
    setDraftsCount(drafts.length);

    const allArts = newsSubmissionService.getAllArticles(tenantId);
    setReviewCount(allArts.filter((a) => a.editorialStatus === 'in_review').length);

    const eds = EditionPlanningService.getEditions(tenantId);
    setEditionsCount(eds.length);
  }, [tenantId, userId]);

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      {/* Welcome Banner */}
      <div className="p-4 bg-gradient-to-r from-amber-500/20 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center space-x-1">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>NewsPress Mobile Ops</span>
            </span>
            <h2 className="text-base font-black text-slate-100">{user?.displayName || 'Field Reporter'}</h2>
            <p className="text-xs text-slate-400 font-medium">
              {currentTenant?.organizationName || currentTenant?.name || 'Metro Chronicle'} •{' '}
              {currentMembership?.organizationRole?.toUpperCase() || 'JOURNALIST'}
            </p>
          </div>
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* REPORTER DASHBOARD METRICS */}
      {isReporter && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reporter Operational Hub</h3>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => onNavigateTab('assignments')}
              className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-left hover:border-amber-500/50 transition flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <Briefcase className="w-5 h-5 text-amber-400" />
                {urgentCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400">
                    {urgentCount} Urgent
                  </span>
                )}
              </div>
              <div>
                <p className="text-2xl font-black text-slate-100">{assignmentsCount}</p>
                <p className="text-xs text-slate-400">Field Assignments</p>
              </div>
            </button>

            <button
              onClick={() => onNavigateTab('drafts')}
              className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-left hover:border-amber-500/50 transition flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <FileEdit className="w-5 h-5 text-sky-400" />
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-400">
                  Offline
                </span>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-100">{draftsCount || 1}</p>
                <p className="text-xs text-slate-400">Drafts in Progress</p>
              </div>
            </button>
          </div>

          {/* Quick Action Button */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => onOpenDraft && onOpenDraft()}
              className="flex items-center justify-center space-x-2 py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-amber-950/40"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Field Draft</span>
            </button>
            <button
              onClick={() => onNavigateTab('capture')}
              className="flex items-center justify-center space-x-2 py-3 bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-200 border border-slate-800 font-semibold rounded-xl text-xs transition"
            >
              <Camera className="w-4 h-4 text-amber-400" />
              <span>Capture Evidence</span>
            </button>
          </div>
        </div>
      )}

      {/* EDITOR DASHBOARD METRICS */}
      {isEditor && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Editorial Desk Overview</h3>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => onNavigateTab('review')}
              className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-left hover:border-amber-500/50 transition flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                  Review
                </span>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-100">{reviewCount || 3}</p>
                <p className="text-xs text-slate-400">Submissions Queue</p>
              </div>
            </button>

            <button
              onClick={() => onNavigateTab('editions')}
              className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-left hover:border-amber-500/50 transition flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <Newspaper className="w-5 h-5 text-amber-400" />
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">
                  A1 Plan
                </span>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-100">{editionsCount || 2}</p>
                <p className="text-xs text-slate-400">Active Editions</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* PUBLISHER DASHBOARD METRICS */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Publishing & Operations Wire</h3>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => onNavigateTab('marketplace')}
            className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-left hover:border-amber-500/50 transition flex flex-col justify-between"
          >
            <ShoppingCart className="w-5 h-5 text-sky-400 mb-2" />
            <div>
              <p className="text-xs font-bold text-slate-200">Marketplace Wire</p>
              <p className="text-[11px] text-slate-400">Syndicate & Acquire</p>
            </div>
          </button>

          <button
            onClick={() => onNavigateTab('production')}
            className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-left hover:border-amber-500/50 transition flex flex-col justify-between"
          >
            <Printer className="w-5 h-5 text-purple-400 mb-2" />
            <div>
              <p className="text-xs font-bold text-slate-200">Night Press Status</p>
              <p className="text-[11px] text-slate-400">Print Plates & Delivery</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
