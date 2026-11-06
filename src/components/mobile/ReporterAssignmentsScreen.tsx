/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 13 — Reporter Assignments Screen
 * Displays assigned field assignments with deadline countdowns, brief details,
 * one-tap "ACCEPT ASSIGNMENT" action, and direct launch into MobileNewsEditor.
 */

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
  Play,
  ArrowRight,
  Filter,
  Flame,
  ShieldCheck,
  ChevronRight,
  Radio,
} from 'lucide-react';
import { NewsAssignment, AssignmentPriority, AssignmentStatus } from '../../types/newsroom';
import { NewsAssignmentService } from '../../services/newsAssignmentService';
import { OfflineReportingStore } from '../../services/mobileOfflineStore';
import { MobileSyncService } from '../../services/mobileSyncService';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';

interface ReporterAssignmentsScreenProps {
  onSelectAssignmentForDraft?: (assignment: NewsAssignment) => void;
}

export const ReporterAssignmentsScreen: React.FC<ReporterAssignmentsScreenProps> = ({
  onSelectAssignmentForDraft,
}) => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.tenantId || 'tenant-metro-chronicle';
  const reporterId = user?.uid || user?.userId || 'rep_sofia_chen';

  const [assignments, setAssignments] = useState<NewsAssignment[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [selectedAssignment, setSelectedAssignment] = useState<NewsAssignment | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadAssignments = () => {
    // Seed defaults if empty
    NewsAssignmentService.seedDefaultAssignments(tenantId);
    const list = NewsAssignmentService.getReporterAssignments(reporterId, tenantId);
    setAssignments(list);
    OfflineReportingStore.cacheAssignments(list, tenantId);
  };

  useEffect(() => {
    loadAssignments();
    const unsub = OfflineReportingStore.subscribe(() => {
      loadAssignments();
    });
    return unsub;
  }, [tenantId, reporterId]);

  const handleAccept = async (assignment: NewsAssignment) => {
    const isOnline = OfflineReportingStore.getNetworkState() !== 'OFFLINE';

    if (isOnline) {
      try {
        const updated = await NewsAssignmentService.acceptAssignment(
          assignment.assignmentId,
          reporterId,
          user?.displayName || 'Reporter'
        );
        if (updated) {
          setActionMessage('Assignment accepted! Status updated to ACCEPTED.');
          loadAssignments();
        }
      } catch (err: any) {
        setActionMessage(`Failed to accept: ${err?.message || 'Error'}`);
      }
    } else {
      // Enqueue offline operation
      MobileSyncService.enqueue({
        tenantId,
        userId: reporterId,
        entityId: assignment.assignmentId,
        operationType: 'ACCEPT_ASSIGNMENT',
        payload: { assignmentId: assignment.assignmentId },
      });

      // Optimistic update
      const updated: NewsAssignment = {
        ...assignment,
        status: 'ACCEPTED',
        acceptedAt: new Date().toISOString(),
      };
      OfflineReportingStore.updateCachedAssignment(updated);
      setActionMessage('Device OFFLINE. Assignment accepted locally and queued for synchronization!');
      loadAssignments();
    }

    setTimeout(() => setActionMessage(null), 3000);
  };

  const filtered = assignments.filter((a) => {
    if (filter === 'ALL') return true;
    if (filter === 'URGENT') return a.priority === 'URGENT' || a.priority === 'HIGH';
    if (filter === 'IN_PROGRESS') return a.status === 'IN_PROGRESS' || a.status === 'ACCEPTED';
    if (filter === 'OVERDUE') return a.status === 'OVERDUE';
    return true;
  });

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <Briefcase className="w-5 h-5 text-amber-400" />
            <span>Field Assignments</span>
          </h2>
          <p className="text-xs text-slate-400">Accredited desk reporting dispatches</p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
          {assignments.length} Total
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1.5 p-1 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto text-xs font-sans">
        {['ALL', 'URGENT', 'IN_PROGRESS', 'OVERDUE'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-lg font-medium transition shrink-0 ${
              filter === tab
                ? 'bg-blue-600 text-white font-medium shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Action Banner */}
      {actionMessage && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-center space-x-2 animate-fadeIn font-sans">
          <CheckCircle className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Assignment List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800">
            <Briefcase className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No Assignments Found</p>
            <p className="text-xs text-slate-500 mt-1">There are no field assignments matching this filter.</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.assignmentId}
              className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    {item.priority === 'URGENT' || item.priority === 'HIGH' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center space-x-1">
                        <Flame className="w-3 h-3" />
                        <span>{item.priority}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400">
                        {item.priority}
                      </span>
                    )}
                    <span className="text-[11px] font-medium text-amber-400">{item.beat}</span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-100">{item.title}</h3>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    item.status === 'SUBMITTED'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : item.status === 'OVERDUE'
                      ? 'bg-rose-500/20 text-rose-400'
                      : item.status === 'IN_PROGRESS' || item.status === 'ACCEPTED'
                      ? 'bg-sky-500/20 text-sky-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {item.status.replace('_', ' ')}
                </span>
              </div>

              {/* Brief & Expected Output */}
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                {item.brief}
              </p>

              {/* Meta details */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div className="flex items-center space-x-1 truncate">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{item.location || item.district || 'Metro Bureau'}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Due: {new Date(item.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-1 flex items-center justify-end space-x-2 border-t border-slate-200 dark:border-slate-800/80 font-sans">
                {item.status === 'ASSIGNED' && (
                  <button
                    type="button"
                    onClick={() => handleAccept(item)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-medium rounded-lg text-xs transition shadow-xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Accept Assignment</span>
                  </button>
                )}

                {(item.status === 'ACCEPTED' || item.status === 'IN_PROGRESS' || item.status === 'ASSIGNED') && onSelectAssignmentForDraft && (
                  <button
                    type="button"
                    onClick={() => onSelectAssignmentForDraft(item)}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-100 font-medium rounded-lg text-xs transition"
                  >
                    <span>Start Reporting Draft</span>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
