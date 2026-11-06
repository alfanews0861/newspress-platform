/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 14 — Advanced Analytics, MIS & Executive Intelligence Master Hub
 * Route: /analytics
 */

import React, { useState } from 'react';
import {
  BarChart3,
  Building2,
  Newspaper,
  Users,
  BookOpen,
  Printer,
  FileSpreadsheet,
  ShieldAlert,
  Crown,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { TenantExecutiveDashboard } from './TenantExecutiveDashboard';
import { ExecutiveIntelligenceDashboard } from './ExecutiveIntelligenceDashboard';
import { NewsroomAnalyticsPage } from './NewsroomAnalyticsPage';
import { ReporterAnalyticsPage } from './ReporterAnalyticsPage';
import { EditionAnalyticsPage } from './EditionAnalyticsPage';
import { ProductionAnalyticsPage } from './ProductionAnalyticsPage';
import { MISReportBuilderPage } from './MISReportBuilderPage';
import { AnalyticsDataQualityPage } from './AnalyticsDataQualityPage';
import { Badge } from '../../components/ui/Badge';

type AnalyticsTab =
  | 'tenant'
  | 'executive'
  | 'newsroom'
  | 'reporter'
  | 'editions'
  | 'production'
  | 'mis_reports'
  | 'data_quality';

export const AnalyticsPage: React.FC = () => {
  const { can } = usePermission();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('tenant');

  const canViewExecutive = can('analytics.executive.view') || can('system.admin');
  const canViewFinancial = can('analytics.financial.view') || can('system.admin');
  const canViewAdmin = can('analytics.admin') || can('system.admin');

  return (
    <div className="space-y-6">
      {/* Top Tab Navigation */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 flex flex-wrap gap-1.5 overflow-x-auto font-sans">
        <button
          onClick={() => setActiveTab('tenant')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer select-none ${
            activeTab === 'tenant'
              ? 'bg-blue-600 text-white font-medium shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Tenant Overview
        </button>

        {canViewExecutive && (
          <button
            onClick={() => setActiveTab('executive')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer select-none ${
              activeTab === 'executive'
                ? 'bg-blue-600 text-white font-medium shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            Executive Intelligence
          </button>
        )}

        <button
          onClick={() => setActiveTab('newsroom')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer select-none ${
            activeTab === 'newsroom'
              ? 'bg-blue-600 text-white font-medium shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <Newspaper className="w-3.5 h-3.5" />
          Newsroom
        </button>

        <button
          onClick={() => setActiveTab('reporter')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer select-none ${
            activeTab === 'reporter'
              ? 'bg-blue-600 text-white font-medium shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Reporter
        </button>

        <button
          onClick={() => setActiveTab('editions')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer select-none ${
            activeTab === 'editions'
              ? 'bg-blue-600 text-white font-medium shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Editions
        </button>

        <button
          onClick={() => setActiveTab('production')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer select-none ${
            activeTab === 'production'
              ? 'bg-blue-600 text-white font-medium shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          Press & Logistics
        </button>

        <button
          onClick={() => setActiveTab('mis_reports')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer select-none ${
            activeTab === 'mis_reports'
              ? 'bg-blue-600 text-white font-medium shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          MIS Builder & Catalogs
        </button>

        {canViewAdmin && (
          <button
            onClick={() => setActiveTab('data_quality')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer select-none ${
              activeTab === 'data_quality'
                ? 'bg-blue-600 text-white font-medium shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Data Quality
          </button>
        )}
      </div>

      {/* Tab Content Display */}
      {activeTab === 'tenant' && <TenantExecutiveDashboard />}
      {activeTab === 'executive' && <ExecutiveIntelligenceDashboard />}
      {activeTab === 'newsroom' && <NewsroomAnalyticsPage />}
      {activeTab === 'reporter' && <ReporterAnalyticsPage />}
      {activeTab === 'editions' && <EditionAnalyticsPage />}
      {activeTab === 'production' && <ProductionAnalyticsPage />}
      {activeTab === 'mis_reports' && <MISReportBuilderPage />}
      {activeTab === 'data_quality' && <AnalyticsDataQualityPage />}
    </div>
  );
};
