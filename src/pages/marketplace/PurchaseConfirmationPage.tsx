/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PurchaseConfirmationPage Component
 * Route: /marketplace/purchase-confirmation/:purchaseId
 * Phase 12 — Public Marketplace, Publisher Acquisition Portal & Licensed Content Workspace
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, ShieldCheck, FileText, Layers, ExternalLink, ChevronLeft } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useTenant } from '../../hooks/useTenant';
import { marketplaceService } from '../../services/marketplaceService';
import { MarketplacePurchase, NewsLicense } from '../../types/marketplace';
import { formatINR, formatDate } from '../../utils/formatters';

export const PurchaseConfirmationPage: React.FC = () => {
  const { currentTenant } = useTenant();

  const getPurchaseIdFromHash = (): string => {
    const hash = window.location.hash;
    const parts = hash.split('/marketplace/purchase-confirmation/');
    return parts[1] ? parts[1].split('?')[0] : '';
  };

  const purchaseId = getPurchaseIdFromHash();
  const [purchase, setPurchase] = useState<MarketplacePurchase | undefined>(undefined);
  const [license, setLicense] = useState<NewsLicense | undefined>(undefined);

  useEffect(() => {
    if (purchaseId) {
      const p = marketplaceService.getPurchaseById(purchaseId);
      setPurchase(p);
      if (p?.licenseId) {
        setLicense(marketplaceService.getLicenseById(p.licenseId));
      }
    }
  }, [purchaseId]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => (window.location.hash = '#/marketplace')}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Return to Wire
        </Button>
      </div>

      <PageHeader
        title="Purchase & Rights Confirmation"
        subtitle="Receipt, payment confirmation, and official syndication license certificate."
        breadcrumbs={[
          { label: 'Marketplace', href: '#/marketplace' },
          { label: 'Confirmation' }
        ]}
      />

      <Card variant="editorial" className="p-8 space-y-6 text-center border border-slate-200 dark:border-slate-800">
        <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2 max-w-lg mx-auto">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white font-sans">
            Syndication Entitlement Acquired!
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
            Your publication <strong className="text-slate-900 dark:text-white font-semibold">{currentTenant?.organizationName}</strong> has been granted authorized syndication rights.
          </p>
        </div>

        {/* Transaction Summary Card */}
        <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left text-xs font-sans space-y-3 max-w-md mx-auto">
          <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <span className="text-slate-500 dark:text-slate-400">Transaction ID:</span>
            <span className="text-slate-900 dark:text-white font-medium">{purchaseId || 'purch_recorded'}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <span className="text-slate-500 dark:text-slate-400">Story Title:</span>
            <span className="text-slate-900 dark:text-white font-semibold truncate max-w-[200px]">{purchase?.articleTitle || 'Syndicated Dispatch'}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <span className="text-slate-500 dark:text-slate-400">License ID:</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold">{license?.licenseId || 'lic_active'}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <span className="text-slate-500 dark:text-slate-400">License Category:</span>
            <span className="text-slate-800 dark:text-slate-200">{license?.type || 'DIGITAL_AND_PRINT'}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <span className="text-slate-500 dark:text-slate-400">Territory Scope:</span>
            <span className="text-slate-800 dark:text-slate-200">{license?.territory || 'National'}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <span className="text-slate-500 dark:text-slate-400">Amount Paid:</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold text-sm font-sans">{formatINR(purchase?.grossAmount || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Grant Timestamp:</span>
            <span className="text-slate-800 dark:text-slate-200">{formatDate(license?.grantedAt || new Date().toISOString())}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap justify-center gap-3">
          {license && (
            <Button
              variant="primary"
              onClick={() => (window.location.hash = `#/marketplace/story/${license.listingId}`)}
            >
              <FileText className="w-4 h-4 mr-1.5" /> OPEN STORY
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={() => (window.location.hash = '#/newspaper/edition-planning')}
          >
            <Layers className="w-4 h-4 mr-1.5" /> ADD TO EDITION
          </Button>

          <Button
            variant="secondary"
            onClick={() => (window.location.hash = '#/marketplace/licensed')}
          >
            VIEW LICENSED WORKSPACE
          </Button>
        </div>
      </Card>
    </div>
  );
};
