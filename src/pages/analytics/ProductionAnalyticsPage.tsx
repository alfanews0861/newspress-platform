/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 14 — Production, Print Vendor & Regional Analytics Page
 * Displays Night Production throughput, rotary vendor SLAs, and regional fulfillment.
 */

import React, { useState, useEffect } from 'react';
import {
  Printer,
  Truck,
  CheckCircle2,
  Clock,
  Building2,
  MapPin,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { useTenant } from '../../hooks/useTenant';
import { ProductionAnalyticsService } from '../../services/productionAnalyticsService';
import {
  ProductionAnalyticsSummary,
  PrintVendorAnalyticsSummary,
  RegionalAnalyticsSummary,
} from '../../types/analytics';
import { Badge } from '../../components/ui/Badge';

export const ProductionAnalyticsPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const activeTenantId = currentTenant?.tenantId;
  const [productionSummary, setProductionSummary] = useState<ProductionAnalyticsSummary | null>(null);
  const [vendors, setVendors] = useState<PrintVendorAnalyticsSummary[]>([]);
  const [regions, setRegions] = useState<RegionalAnalyticsSummary[]>([]);

  useEffect(() => {
    const prod = ProductionAnalyticsService.getProductionSummary({ tenantId: activeTenantId });
    const vList = ProductionAnalyticsService.getVendorAnalytics(activeTenantId);
    const rList = ProductionAnalyticsService.getRegionalAnalytics(activeTenantId);

    setProductionSummary(prod);
    setVendors(vList);
    setRegions(rList);
  }, [activeTenantId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-serif font-bold text-slate-100">Production, Press & Distribution Operations</h1>
          <Badge variant="outline" size="sm">Phase 10 Operations</Badge>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Night Press render queues, preflight pass rates, rotary printing facilities, and regional fulfillment.
        </p>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-xs font-mono text-slate-400 uppercase">Preflight Pass Rate</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {productionSummary?.preflightPassRate || 0}%
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Failure: {productionSummary?.preflightFailureRate}%</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-xs font-mono text-slate-400 uppercase">Vendor Ack Time</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">
              {productionSummary?.averageVendorAcknowledgementMinutes || 0}m
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Dispatch success: {productionSummary?.vendorDispatchSuccessRate}%</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-xs font-mono text-slate-400 uppercase">Delivery Fulfillment</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-sky-400">
              {productionSummary?.deliverySuccessRate || 0}%
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Copies: {productionSummary?.totalCopiesDelivered.toLocaleString()} delivered</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-xs font-mono text-slate-400 uppercase">Press Reprint Rate</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">
              {productionSummary?.reprintRate || 0}%
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Wastage copies: {productionSummary?.totalCopiesWasted.toLocaleString()}</span>
        </div>
      </div>

      {/* Section 21: Print Vendor Operational KPIs */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-slate-200">Rotary Print Vendor Performance & SLA Tracking</h2>
          </div>
          <Badge variant="outline" size="sm">Measurable KPIs Only</Badge>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 font-mono text-[11px] text-slate-400 uppercase border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Vendor Name</th>
                <th className="py-2.5 px-3">Jobs Assigned</th>
                <th className="py-2.5 px-3">Accepted</th>
                <th className="py-2.5 px-3">Avg Ack (min)</th>
                <th className="py-2.5 px-3">Avg Completion (min)</th>
                <th className="py-2.5 px-3">Reprints</th>
                <th className="py-2.5 px-3">Delivery Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {vendors.map((v) => (
                <tr key={v.vendorId} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-sans font-semibold text-slate-200">{v.vendorName}</td>
                  <td className="py-2.5 px-3">{v.assignedJobs}</td>
                  <td className="py-2.5 px-3 text-emerald-400">{v.acceptedJobs}</td>
                  <td className="py-2.5 px-3">{v.averageAcknowledgementMinutes}m</td>
                  <td className="py-2.5 px-3">{v.averagePrintCompletionMinutes}m</td>
                  <td className="py-2.5 px-3 text-amber-400">{v.reprintsCount}</td>
                  <td className="py-2.5 px-3 text-sky-400">{v.deliverySuccessRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 22: Regional Distribution & Circulation */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-slate-200">Regional Distribution & Circulation Fulfillment</h2>
          </div>
          <Badge variant="outline" size="sm">Phase 10 Regions</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {regions.map((r) => (
            <div key={r.regionId} className="bg-slate-950 border border-slate-800 rounded p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">{r.regionName}</span>
                <span className="font-mono text-emerald-400 font-bold">{r.fulfillmentRate}%</span>
              </div>
              <div className="mt-2 space-y-1 text-slate-400 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span>Planned Print:</span>
                  <span>{r.printQuantity.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivered:</span>
                  <span className="text-slate-200">{r.deliveredQuantity.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Wastage:</span>
                  <span className="text-amber-400">{r.wastageQuantity.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
