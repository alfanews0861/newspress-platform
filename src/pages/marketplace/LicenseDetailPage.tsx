/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LicenseDetailPage Component
 * Route: /marketplace/license/:licenseId
 * Phase 12 — Public Marketplace, Publisher Acquisition Portal & Licensed Content Workspace
 */

import React, { useState, useEffect } from 'react';
import { Award, ShieldCheck, CheckCircle, Clock, ChevronLeft, Layers, Lock, FileText } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useTenant } from '../../hooks/useTenant';
import {
  marketplaceLicenseViewService,
  DetailedLicenseView
} from '../../services/marketplaceLicenseViewService';
import { formatDate } from '../../utils/formatters';

export const LicenseDetailPage: React.FC = () => {
  const { currentTenant } = useTenant();

  const getLicenseIdFromHash = (): string => {
    const hash = window.location.hash;
    const parts = hash.split('/marketplace/license/');
    return parts[1] ? parts[1].split('?')[0] : '';
  };

  const licenseId = getLicenseIdFromHash();
  const [detail, setDetail] = useState<DetailedLicenseView | undefined>(undefined);

  useEffect(() => {
    if (licenseId) {
      const data = marketplaceLicenseViewService.getDetailedLicenseView(licenseId);
      setDetail(data);
      if (data) {
        document.title = `License Certificate ${licenseId} | NewsPress`;
      }
    }
  }, [licenseId]);

  if (!detail) {
    return (
      <div className="p-12 text-center space-y-4">
        <Award className="w-10 h-10 text-amber-400 mx-auto" />
        <h3 className="text-lg font-bold text-slate-100 font-serif">License Certificate Not Found</h3>
        <p className="text-xs text-slate-400">The requested license certificate ID was not found or is restricted.</p>
        <Button variant="secondary" size="sm" onClick={() => (window.location.hash = '#/marketplace/licensed')}>
          Return to Licensed Content
        </Button>
      </div>
    );
  }

  const { license, purchase, statusInfo, usageMilestones, linkedEditions } = detail;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => (window.location.hash = '#/marketplace/licensed')}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Licensed Content
        </Button>
      </div>

      <PageHeader
        title={`Syndication License Certificate: ${license.licenseId}`}
        subtitle={`Story: "${license.articleTitle}" • Licensor: ${license.sellerReporterName || 'Correspondent'}`}
        breadcrumbs={[
          { label: 'Marketplace', href: '#/marketplace' },
          { label: 'License Detail' }
        ]}
      />

      {/* Official Certificate Box */}
      <Card className="p-6 md:p-8 space-y-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs rounded-xl font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-sans uppercase tracking-wider text-blue-600 dark:text-blue-400 block font-semibold">
                Official Syndication License Certificate
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-sans">{license.articleTitle}</h2>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs">
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 inline-block">
              Status: {statusInfo.status}
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-xs block mt-1">
              {statusInfo.daysRemaining} days remaining
            </span>
          </div>
        </div>

        {/* License Grid Specs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs font-sans">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block font-medium mb-0.5">License Type</span>
            <span className="text-slate-900 dark:text-slate-100 font-semibold">{license.type}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block font-medium mb-0.5">Territory</span>
            <span className="text-slate-900 dark:text-slate-100 font-semibold">{license.territory}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block font-medium mb-0.5">Exclusivity</span>
            <span className="text-slate-900 dark:text-slate-100 font-semibold">{license.exclusivity ? 'Protected Exclusive' : 'Non-Exclusive'}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block font-medium mb-0.5">Byline Credit</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold">Mandatory</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block font-medium mb-0.5">Granted At</span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">{formatDate(license.grantedAt)}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block font-medium mb-0.5">Expires At</span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">{formatDate(license.expiresAt || '')}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block font-medium mb-0.5">Derivative Edits</span>
            <span className={statusInfo.derivativeEditingAllowed ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-semibold'}>
              {statusInfo.derivativeEditingAllowed ? 'Allowed' : 'Blocked'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block font-medium mb-0.5">Licensed Tenant</span>
            <span className="text-slate-700 dark:text-slate-300 font-medium truncate block">{license.buyerTenantName || license.buyerTenantId}</span>
          </div>
        </div>

        {/* Usage Milestones Timeline */}
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h4 className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
            Audit & Usage Timeline
          </h4>

          <div className="space-y-3">
            {usageMilestones.map((m, idx) => (
              <div key={idx} className="flex items-start gap-3 text-xs font-sans">
                <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400 mt-0.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-200">{m.stage.replace(/_/g, ' ')}</span>
                    <span className="text-[11px] text-slate-500">{formatDate(m.timestamp)}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-xs">{m.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
          <Button
            variant="primary"
            onClick={() => (window.location.hash = `#/marketplace/story/${license.listingId}`)}
          >
            <FileText className="w-4 h-4 mr-1.5" /> Open Full Story
          </Button>
        </div>
      </Card>
    </div>
  );
};
