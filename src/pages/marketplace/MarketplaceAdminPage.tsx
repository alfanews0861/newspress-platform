/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MarketplaceAdminPage Component
 * Route: /marketplace/admin
 * Phase 12 — Public Marketplace, Publisher Acquisition Portal & Licensed Content Workspace
 */

import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Lock, RefreshCw, Layers } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { marketplaceService } from '../../services/marketplaceService';
import { marketplaceAccessControlService, ModerationStatus } from '../../services/marketplaceAccessControlService';
import { MarketplaceListing } from '../../types/marketplace';
import { useAuth } from '../../hooks/useAuth';
import { formatINR } from '../../utils/formatters';

export const MarketplaceAdminPage: React.FC = () => {
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [moderationReason, setModerationReason] = useState<string>('');

  const refreshListings = () => {
    setListings(marketplaceService.getListings());
  };

  useEffect(() => {
    refreshListings();
    document.title = 'Marketplace Moderation Console | NewsPress Admin';
  }, []);

  const handleApplyModeration = (newStatus: ModerationStatus) => {
    if (!selectedListing || !user) return;

    marketplaceAccessControlService.moderateListing({
      listingId: selectedListing.listingId,
      newStatus,
      reason: moderationReason || `Admin status changed to ${newStatus}`,
      adminUserId: user.uid
    });

    setSelectedListing(null);
    setModerationReason('');
    refreshListings();
  };

  const filteredListings = listings.filter(l => {
    if (filterStatus !== 'all' && l.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace Admin & Moderation Console"
        subtitle="Global marketplace wire governance. Review pending listings, manage territorial exclusivity conflicts, and enforce pricing standards."
        breadcrumbs={[
          { label: 'Admin', href: '#/admin' },
          { label: 'Marketplace Moderation' }
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 font-sans">
        <span className="text-xs text-slate-600 dark:text-slate-400">
          Total Listings: <strong className="text-blue-600 dark:text-blue-400 font-semibold">{listings.length}</strong>
        </span>

        <div className="w-44 shrink-0">
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'ACTIVE', label: 'ACTIVE' },
              { value: 'SUSPENDED', label: 'SUSPENDED' },
              { value: 'ARCHIVED', label: 'ARCHIVED' },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 font-sans">
        {filteredListings.map((item) => (
          <Card
            key={item.listingId}
            variant="bordered"
            className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
          >
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 text-xs">
                <span className={`font-semibold px-2 py-0.5 rounded border ${
                  item.status === 'ACTIVE'
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-800'
                    : 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-800'
                }`}>
                  STATUS: {item.status}
                </span>
                <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
                <span className="text-slate-600 dark:text-slate-300 font-medium">{item.listingType}</span>
                <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">{formatINR(item.price)}</span>
              </div>

              <h3 className="text-base font-semibold text-slate-900 dark:text-white font-sans leading-snug">
                {item.title}
              </h3>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span>Byline: {item.reporterByline || item.reporterName}</span>
                <span>·</span>
                <span>Category: {item.category}</span>
                <span>·</span>
                <span>District: {item.district || 'Regional'}</span>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedListing(item)}
            >
              Moderate Listing
            </Button>
          </Card>
        ))}
      </div>

      {/* Moderation Modal */}
      {selectedListing && (
        <Modal
          isOpen={Boolean(selectedListing)}
          onClose={() => setSelectedListing(null)}
          title={`Moderate Listing: ${selectedListing.title}`}
          subtitle="Change operational status or withdraw from syndication wire."
          maxWidth="md"
        >
          <div className="space-y-4 font-sans">
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1">
              <span className="text-slate-600 dark:text-slate-400 block font-medium">CURRENT STATUS: {selectedListing.status}</span>
              <span className="text-blue-600 dark:text-blue-400 block font-bold">PRICE: {formatINR(selectedListing.price)}</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-700 dark:text-slate-300 font-medium block">Moderation Reason / Note:</label>
              <input
                type="text"
                placeholder="Enter audit reason..."
                value={moderationReason}
                onChange={(e) => setModerationReason(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 justify-end">
              <Button variant="secondary" onClick={() => setSelectedListing(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => handleApplyModeration('ACTIVE')}>
                Approve (ACTIVE)
              </Button>
              <Button variant="secondary" onClick={() => handleApplyModeration('SUSPENDED')}>
                Suspend
              </Button>
              <Button variant="danger" onClick={() => handleApplyModeration('WITHDRAWN')}>
                Withdraw
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
