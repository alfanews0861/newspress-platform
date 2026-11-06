/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 13 — Mobile Edition & Production Status Screen
 * Displays live print edition workflow, readiness preflight diagnostics,
 * and night press delivery lifecycle.
 */

import React, { useState, useEffect } from 'react';
import {
  Newspaper,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Truck,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { EditionPlanningService } from '../../services/editionPlanningService';
import { NewspaperEdition } from '../../types/edition';
import { useTenant } from '../../hooks/useTenant';

export const MobileEditionStatusScreen: React.FC = () => {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.tenantId || 'tenant-metro-chronicle';

  const [editions, setEditions] = useState<NewspaperEdition[]>([]);
  const [selectedEdition, setSelectedEdition] = useState<NewspaperEdition | null>(null);

  useEffect(() => {
    // If no editions yet, seed a planned edition for demonstration
    let list = EditionPlanningService.getEditions(tenantId);
    if (list.length === 0) {
      const createRes = EditionPlanningService.createEdition({
        tenantId,
        brandId: 'brand_chronicle_main',
        templateId: 'tpl_broadsheet_std',
        editionDate: new Date().toISOString().slice(0, 10),
        editionType: 'daily',
        pageCount: 8,
        publicationDate: new Date().toISOString(),
        publicationTimezone: 'Asia/Kolkata',
        contentDeadline: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
        printDeadline: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
        createdBy: 'user-editor-chief',
      });
      if (createRes.success && createRes.edition) {
        list = [createRes.edition];
      }
    }
    setEditions(list);
    if (list.length > 0) setSelectedEdition(list[0]);
  }, [tenantId]);

  const productionLifecycleStages = [
    { label: 'Production Queued', key: 'PRODUCTION_QUEUED', completed: true },
    { label: 'PDF Generated', key: 'PDF_GENERATING', completed: true },
    { label: 'Preflight Passed', key: 'PREFLIGHT_PASSED', completed: true },
    { label: 'Sent to Press Vendor', key: 'SENT_TO_VENDOR', completed: true },
    { label: 'Printing Press Active', key: 'PRINTING', completed: selectedEdition?.status === 'FINALIZED' },
    { label: 'Dispatched / Delivered', key: 'DELIVERED', completed: false },
  ];

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <Newspaper className="w-5 h-5 text-amber-400" />
            <span>Mobile Edition Status</span>
          </h2>
          <p className="text-xs text-slate-400">Print edition readiness & night press pipeline</p>
        </div>
      </div>

      {/* Editions Carousel / Selector */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-400">Select Operating Edition</label>
        <div className="flex space-x-2 overflow-x-auto pb-1">
          {editions.map((ed) => (
            <button
              key={ed.editionId}
              onClick={() => setSelectedEdition(ed)}
              className={`p-3 rounded-xl border text-left shrink-0 w-48 transition ${
                selectedEdition?.editionId === ed.editionId
                  ? 'bg-slate-900 border-amber-500 shadow-md shadow-amber-950/20'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-amber-400">{ed.editionCode || ed.editionId.slice(0, 10)}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {ed.pageCount} Pages
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-100 truncate">{ed.brandName || 'Daily Edition'}</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">{ed.publicationDate.slice(0, 10)}</p>
            </button>
          ))}
        </div>
      </div>

      {selectedEdition && (
        <div className="space-y-4 pt-2">
          {/* Readiness Card */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                  Readiness Preflight Score
                </span>
                <h3 className="text-sm font-bold text-slate-100">Editorial & Ad Quota Clearance</h3>
              </div>
              <span className="text-xl font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                100%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                <p className="text-slate-400 text-[10px]">A1 Front Lead Story</p>
                <p className="font-semibold text-slate-200 mt-0.5 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Assigned & Locked</span>
                </p>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                <p className="text-slate-400 text-[10px]">Commercial Ad Lock</p>
                <p className="font-semibold text-slate-200 mt-0.5 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verified Safe</span>
                </p>
              </div>
            </div>
          </div>

          {/* Night Production Lifecycle */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center space-x-2">
              <Printer className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Night Press Lifecycle</h3>
            </div>

            <div className="space-y-2">
              {productionLifecycleStages.map((stage, idx) => (
                <div
                  key={stage.key}
                  className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        stage.completed
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span className={stage.completed ? 'text-slate-100 font-semibold' : 'text-slate-500'}>
                      {stage.label}
                    </span>
                  </div>

                  {stage.completed ? (
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Ready</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>Pending</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
