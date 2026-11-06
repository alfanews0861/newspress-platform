/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MarketplacePurchaseHistoryPage Component
 * Route: /marketplace/purchases
 * Phase 12 — Public Marketplace, Publisher Acquisition Portal & Licensed Content Workspace
 */

import React, { useState, useEffect } from 'react';
import { ShoppingBag, FileText, CheckCircle, ExternalLink, Calendar, CreditCard } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { useTenant } from '../../hooks/useTenant';
import { marketplaceService } from '../../services/marketplaceService';
import { MarketplacePurchase, NewsLicense } from '../../types/marketplace';
import { formatINR, formatDate } from '../../utils/formatters';

interface PurchaseHistoryRow {
  purchase: MarketplacePurchase;
  license?: NewsLicense;
}

export const MarketplacePurchaseHistoryPage: React.FC = () => {
  const { currentTenant } = useTenant();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [purchases, setPurchases] = useState<PurchaseHistoryRow[]>([]);

  useEffect(() => {
    if (currentTenant) {
      const allPurchases = marketplaceService.getAllPurchases().filter(
        (p: MarketplacePurchase) => p.buyerTenantId === currentTenant.tenantId
      );

      const rows: PurchaseHistoryRow[] = allPurchases.map((purchase: MarketplacePurchase) => ({
        purchase,
        license: marketplaceService.getLicenseById(purchase.licenseId)
      }));

      setPurchases(rows);
    }
  }, [currentTenant]);

  const filteredRows = purchases.filter(({ purchase }) => {
    if (filterStatus !== 'all' && purchase.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Publisher Purchase & Licensing History"
        subtitle="Auditable record of all completed syndication orders, payment transactions, and license certificates."
        breadcrumbs={[
          { label: 'Marketplace', href: '#/marketplace' },
          { label: 'Purchase History' }
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 font-sans">
        <span className="text-xs text-slate-600 dark:text-slate-400">
          Showing <strong className="text-blue-600 dark:text-blue-400 font-semibold">{filteredRows.length}</strong> completed transactions for {currentTenant?.organizationName}
        </span>

        <div className="w-44 shrink-0">
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'completed', label: 'Completed' },
              { value: 'authorized', label: 'Authorized' },
              { value: 'refunded', label: 'Refunded' },
            ]}
          />
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <Card variant="bordered" className="text-center py-12 space-y-3 font-sans">
          <ShoppingBag className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Purchase History Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Your organization has not completed any paid purchases or invoice transactions yet.
          </p>
          <Button variant="primary" size="sm" onClick={() => (window.location.hash = '#/marketplace')}>
            Acquire Rights on Wire
          </Button>
        </Card>
      ) : (
        <div className="space-y-4 font-sans">
          {filteredRows.map(({ purchase, license }) => (
            <Card
              key={purchase.purchaseId}
              variant="bordered"
              className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    {purchase.status.toUpperCase()}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">{purchase.licenseType || 'DIGITAL_AND_PRINT'}</span>
                  <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
                  <span className="text-slate-500 dark:text-slate-400">Order ID: {purchase.purchaseId}</span>
                </div>

                <h3 className="text-base font-semibold text-slate-900 dark:text-white font-sans leading-snug">
                  {purchase.articleTitle || 'Syndicated Wire Story'}
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span>Purchased: {formatDate(purchase.purchasedAt)}</span>
                  <span>·</span>
                  <span>Reporter: {purchase.reporterName || purchase.reporterId}</span>
                  <span>·</span>
                  <span>License ID: {purchase.licenseId}</span>
                </div>
              </div>

              <div className="text-right shrink-0 space-y-2">
                <div>
                  <span className="text-lg font-bold font-sans text-slate-900 dark:text-white block">
                    {formatINR(purchase.grossAmount)}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">
                    {purchase.pricingModel.replace(/_/g, ' ')}
                  </span>
                </div>

                {license && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => (window.location.hash = `#/marketplace/license/${license.licenseId}`)}
                  >
                    View Certificate
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
