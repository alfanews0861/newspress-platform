/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MarketplaceAnalyticsDashboard Component
 * Route: /marketplace/analytics
 * Phase 12 — Public Marketplace, Publisher Acquisition Portal & Licensed Content Workspace
 */

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Package, Globe, Layers, Award } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import {
  marketplaceAnalyticsService,
  MarketplaceAnalyticsSummary
} from '../../services/marketplaceAnalyticsService';
import { formatINR } from '../../utils/formatters';

export const MarketplaceAnalyticsDashboard: React.FC = () => {
  const [summary, setSummary] = useState<MarketplaceAnalyticsSummary | null>(null);

  useEffect(() => {
    const data = marketplaceAnalyticsService.getAnalyticsSummary();
    setSummary(data);
    document.title = 'Marketplace Analytics & Demand Intelligence | NewsPress';
  }, []);

  if (!summary) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace & Demand Intelligence Dashboard"
        subtitle="Real-time syndication volume, category performance, regional news demand, and financial settlement analytics."
        breadcrumbs={[
          { label: 'Marketplace', href: '#/marketplace' },
          { label: 'Analytics' }
        ]}
      />

      {/* Top Level Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-sans">
        <Card variant="bordered" className="p-4 space-y-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium block">
            Active Wire Listings
          </span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white block">
            {summary.totalActiveListings}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Across all beats</span>
        </Card>

        <Card variant="bordered" className="p-4 space-y-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium block">
            Total Completed Sales
          </span>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 block">
            {summary.totalPurchases}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Paid orders</span>
        </Card>

        <Card variant="bordered" className="p-4 space-y-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium block">
            Gross Sales Volume
          </span>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 block">
            {formatINR(summary.totalGrossSalesINR)}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Phase 11 Ledger verified</span>
        </Card>

        <Card variant="bordered" className="p-4 space-y-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium block">
            Subscription Redemptions
          </span>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 block">
            {summary.totalSubscriptionRedemptions}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Pack units redeemed</span>
        </Card>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
        {/* Category Performance */}
        <Card className="p-5 space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs rounded-xl">
          <h4 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Beat & Category Performance</span>
          </h4>

          <div className="space-y-3 text-xs">
            {summary.categoryBreakdown.map((cat) => (
              <div key={cat.category} className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                <div className="flex justify-between font-semibold text-slate-900 dark:text-slate-100">
                  <span>{cat.category}</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">{formatINR(cat.grossRevenue)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Listings: {cat.listingsCount}</span>
                  <span>Purchases: {cat.purchasesCount}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Regional Demand */}
        <Card className="p-5 space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs rounded-xl">
          <h4 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Regional District Demand</span>
          </h4>

          <div className="space-y-3 text-xs">
            {summary.regionalDemand.map((reg) => (
              <div key={reg.region} className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 block">{reg.region}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">{reg.purchasesCount} Syndication Orders</span>
                </div>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{formatINR(reg.grossRevenue)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
