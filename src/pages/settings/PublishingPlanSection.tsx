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
      <Card className="bg-slate-900 border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
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
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-sans mt-1">
              Editorial AI Capabilities & Production Entitlements
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Governs generative AI editorial assistance, model tiers, and copy fitting engine access.
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-500 dark:text-slate-400 block">Monthly AI Operations</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
              {usageStats.currentMonthlyUsage} <span className="text-slate-400 text-base">/ {usageStats.monthlyOperationsLimit === 0 ? '0 (Disabled)' : usageStats.monthlyOperationsLimit}</span>
            </span>
          </div>
        </div>

        {/* Usage Progress Bar */}
        {usageStats.monthlyOperationsLimit > 0 && (
          <div className="pt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Cycle Usage Progress</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">{usageStats.remainingOperations} operations remaining</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200 dark:border-slate-700">
              <div
                className={`h-full transition-all ${
                  usagePercent > 85 ? 'bg-rose-500' : usagePercent > 60 ? 'bg-amber-500' : 'bg-blue-600'
                }`}
                style={{ width: `${usagePercent}%` }}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* BASIC PLAN */}
        <Card
          className={`relative border transition-all ${
            currentEntitlement.planId === 'BASIC'
              ? 'bg-slate-900 border-slate-600 ring-1 ring-slate-500/50'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-slate-500 dark:text-slate-400" /> BASIC
              </span>
              {currentEntitlement.planId === 'BASIC' && (
                <Badge variant="default">Active</Badge>
              )}
            </div>

            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">Content As Submitted</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Authoritative human editorial text. No generative AI rewriting or fact alterations.</p>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Deterministic spelling warnings
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Page overflow & grid fitting
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Broadsheet & Tabloid templates
              </div>
              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                <span className="w-3.5 h-3.5 text-center font-bold">✕</span> No Generative AI Operations
              </div>
            </div>

            <Button
              onClick={() => handleSwitchPlan('BASIC')}
              disabled={currentEntitlement.planId === 'BASIC' || updating}
              variant="outline"
              className="w-full mt-2"
            >
              {currentEntitlement.planId === 'BASIC' ? 'Current Plan' : 'Select Basic Plan'}
            </Button>
          </div>
        </Card>

        {/* STANDARD PLAN */}
        <Card
          className={`relative border transition-all ${
            currentEntitlement.planId === 'STANDARD'
              ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-500 ring-2 ring-blue-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" /> STANDARD
              </span>
              {currentEntitlement.planId === 'STANDARD' && (
                <Badge variant="primary">Active</Badge>
              )}
            </div>

            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">Light AI Assistance</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Lightweight headline lab, copy-fitting suggestions, and summary options with fact integrity guard.</p>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> 500 Monthly AI Operations
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Headline Lab Options (A, B, C)
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Summary Generation (30, 50, 60, 80w)
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Copy-Fitting Height Shortener
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> FactLedger & Discrepancy Diff
              </div>
            </div>

            <Button
              onClick={() => handleSwitchPlan('STANDARD')}
              disabled={currentEntitlement.planId === 'STANDARD' || updating}
              className="w-full mt-2"
              variant={currentEntitlement.planId === 'STANDARD' ? 'secondary' : 'primary'}
            >
              {currentEntitlement.planId === 'STANDARD' ? 'Current Plan' : 'Select Standard Plan'}
            </Button>
          </div>
        </Card>

        {/* PREMIUM PLAN */}
        <Card
          className={`relative border transition-all ${
            currentEntitlement.planId === 'PREMIUM'
              ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-600 ring-2 ring-blue-500/40 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-blue-600 dark:text-blue-400" /> PREMIUM
              </span>
              {currentEntitlement.planId === 'PREMIUM' && (
                <Badge variant="primary">Active</Badge>
              )}
            </div>

            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">Advanced AI Desk</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Advanced copy restructuring, photo quality intelligence, non-generative optical enhancement, & full capacity.</p>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2 font-medium">
                <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> 2,500 Monthly AI Operations
              </div>
              <div className="flex items-center gap-2 font-medium">
                <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Advanced Restructuring & Pyramid Lead
              </div>
              <div className="flex items-center gap-2 font-medium">
                <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Photo Quality Diagnostics & DPI
              </div>
              <div className="flex items-center gap-2 font-medium">
                <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Non-Generative Optical Enhancer
              </div>
              <div className="flex items-center gap-2 font-medium">
                <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Intelligent Photo Selection & Captions
              </div>
            </div>

            <Button
              onClick={() => handleSwitchPlan('PREMIUM')}
              disabled={currentEntitlement.planId === 'PREMIUM' || updating}
              className="w-full mt-2"
              variant={currentEntitlement.planId === 'PREMIUM' ? 'secondary' : 'primary'}
            >
              {currentEntitlement.planId === 'PREMIUM' ? 'Current Plan' : 'Select Premium Plan'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
