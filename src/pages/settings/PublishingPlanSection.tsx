/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Publishing Plan & AI Entitlements Management Section
 * Phase 6 — Organization Publishing Plans (Basic / Standard / Premium)
 */

import React, { useState } from 'react';
import { Sparkles, Check, Zap, Crown, Shield, BarChart3, AlertCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PublishingPlanId } from '../../types/editorialAi';
import { EditorialPlanService } from '../../services/editorialPlanService';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';

export const PublishingPlanSection: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  const [currentEntitlement, setCurrentEntitlement] = useState(() =>
    currentTenant ? EditorialPlanService.getTenantEntitlement(currentTenant.tenantId) : null
  );

  const [usageStats, setUsageStats] = useState(() =>
    currentTenant ? EditorialPlanService.getUsageStats(currentTenant.tenantId) : null
  );

  const [selectedPlan, setSelectedPlan] = useState<PublishingPlanId>(currentEntitlement?.planId || 'STANDARD');
  const [updating, setUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSwitchPlan = (planId: PublishingPlanId) => {
    if (!currentTenant || !user) return;
    setUpdating(true);
    try {
      const updated = EditorialPlanService.setTenantPlan(
        currentTenant.tenantId,
        planId,
        user.uid,
        user.displayName || user.email || 'Admin',
        'administrator'
      );
      setCurrentEntitlement(updated);
      setSelectedPlan(planId);
      setUsageStats(EditorialPlanService.getUsageStats(currentTenant.tenantId));
      setSuccessMsg(`Publishing plan successfully updated to ${planId}!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  if (!currentTenant || !currentEntitlement || !usageStats) {
    return null;
  }

  const usagePercent = usageStats.monthlyOperationsLimit > 0
    ? Math.min(100, Math.round((usageStats.currentMonthlyUsage / usageStats.monthlyOperationsLimit) * 100))
    : 0;

  return (
    <div className="space-y-6">
      {/* Active Plan & Usage Header */}
      <Card variant="editorial" className="p-6 bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Current Publishing Plan</span>
              <Badge
                variant={
                  currentEntitlement.planId === 'PREMIUM'
                    ? 'primary'
                    : currentEntitlement.planId === 'STANDARD'
                    ? 'blue'
                    : 'default'
                }
              >
                {currentEntitlement.planId}
              </Badge>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-sans mt-1.5">
              Editorial Desk Capabilities & Production Entitlements
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Governs editorial desk assistance, production tiers, and copy fitting engine access.
            </p>
          </div>

          <div className="text-left md:text-right shrink-0">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-0.5">Monthly Operations</span>
            <div className="flex items-baseline md:justify-end gap-1.5 font-mono">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {usageStats.currentMonthlyUsage}
              </span>
              <span className="text-slate-400 dark:text-slate-500 text-sm font-normal">
                / {usageStats.monthlyOperationsLimit === 0 ? '0 (Disabled)' : usageStats.monthlyOperationsLimit}
              </span>
            </div>
          </div>
        </div>

        {/* Usage Progress Bar */}
        {usageStats.monthlyOperationsLimit > 0 && (
          <div className="pt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Cycle Usage Progress</span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">{usageStats.remainingOperations} operations remaining</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-200 dark:border-slate-700">
              <div
                className={`h-full transition-all duration-300 ${
                  usagePercent > 85 ? 'bg-rose-500' : usagePercent > 60 ? 'bg-amber-500' : 'bg-blue-600'
                }`}
                style={{ width: `${Math.max(usagePercent, 2)}%` }}
              />
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2 font-sans">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
      </Card>

      {/* Three Publishing Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {/* BASIC PLAN */}
        <Card
          className={`relative flex flex-col justify-between p-6 transition-all ${
            currentEntitlement.planId === 'BASIC'
              ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-slate-500 dark:text-slate-400" /> BASIC
              </span>
              {currentEntitlement.planId === 'BASIC' && (
                <Badge variant="primary" size="sm">Active Plan</Badge>
              )}
            </div>

            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">Content As Submitted</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[36px] leading-relaxed">
                Authoritative human editorial text with verified factual accuracy.
              </p>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Deterministic spelling warnings</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Page overflow & grid fitting</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Broadsheet & Tabloid templates</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Standard Editorial Tools</span>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-auto">
            {currentEntitlement.planId === 'BASIC' ? (
              <Button
                disabled
                variant="outline"
                className="w-full border-blue-500/40 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold opacity-100 cursor-default"
                leftIcon={<Check className="w-4 h-4" />}
              >
                Current Plan
              </Button>
            ) : (
              <Button
                onClick={() => handleSwitchPlan('BASIC')}
                disabled={updating}
                variant="outline"
                className="w-full"
              >
                Select Basic Plan
              </Button>
            )}
          </div>
        </Card>

        {/* STANDARD PLAN */}
        <Card
          className={`relative flex flex-col justify-between p-6 transition-all ${
            currentEntitlement.planId === 'STANDARD'
              ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" /> STANDARD
              </span>
              {currentEntitlement.planId === 'STANDARD' && (
                <Badge variant="primary" size="sm">Active Plan</Badge>
              )}
            </div>

            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">Standard Editorial Suite</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[36px] leading-relaxed">
                Lightweight headline lab, copy-fitting suggestions, and summary options with fact integrity guard.
              </p>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">500 Monthly Operations</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Headline Lab Options (A, B, C)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Summary Generation (30, 50, 60, 80w)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Copy-Fitting Height Shortener</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>FactLedger & Discrepancy Diff</span>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-auto">
            {currentEntitlement.planId === 'STANDARD' ? (
              <Button
                disabled
                variant="outline"
                className="w-full border-blue-500/40 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold opacity-100 cursor-default"
                leftIcon={<Check className="w-4 h-4" />}
              >
                Current Plan
              </Button>
            ) : (
              <Button
                onClick={() => handleSwitchPlan('STANDARD')}
                disabled={updating}
                className="w-full"
                variant="primary"
              >
                Select Standard Plan
              </Button>
            )}
          </div>
        </Card>

        {/* PREMIUM PLAN */}
        <Card
          className={`relative flex flex-col justify-between p-6 transition-all ${
            currentEntitlement.planId === 'PREMIUM'
              ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-500" /> PREMIUM
              </span>
              {currentEntitlement.planId === 'PREMIUM' && (
                <Badge variant="primary" size="sm">Active Plan</Badge>
              )}
            </div>

            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">Advanced Editorial Desk</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[36px] leading-relaxed">
                Advanced copy restructuring, photo quality intelligence, non-generative optical enhancement, & full capacity.
              </p>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2 font-medium">
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">2,500 Monthly Operations</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Advanced Restructuring & Pyramid Lead</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Photo Quality Diagnostics & DPI</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Non-Generative Optical Enhancer</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Intelligent Photo Selection & Captions</span>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-auto">
            {currentEntitlement.planId === 'PREMIUM' ? (
              <Button
                disabled
                variant="outline"
                className="w-full border-blue-500/40 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold opacity-100 cursor-default"
                leftIcon={<Check className="w-4 h-4" />}
              >
                Current Plan
              </Button>
            ) : (
              <Button
                onClick={() => handleSwitchPlan('PREMIUM')}
                disabled={updating}
                className="w-full"
                variant="primary"
              >
                Select Premium Plan
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
