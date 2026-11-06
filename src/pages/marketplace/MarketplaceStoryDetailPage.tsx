/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MarketplaceStoryDetailPage Component
 * Route: /marketplace/story/:listingId
 * Phase 12 — Public Marketplace, Publisher Acquisition Portal & Licensed Content Workspace
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Camera,
  Lock,
  CheckCircle,
  FileText,
  Copy,
  Check,
  ChevronLeft,
  Share2,
  AlertTriangle
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LicenseComparisonPanel } from '../../components/marketplace/LicenseComparisonPanel';
import { MarketplacePurchaseModal } from '../../components/marketplace/MarketplacePurchaseModal';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { marketplaceService } from '../../services/marketplaceService';
import { marketplaceContentWorkspaceService } from '../../services/marketplaceContentWorkspaceService';
import { MarketplaceListing, LicenseType } from '../../types/marketplace';
import { formatINR, formatDate } from '../../utils/formatters';

export const MarketplaceStoryDetailPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  const getListingIdFromHash = (): string => {
    const hash = window.location.hash;
    const parts = hash.split('/marketplace/story/');
    return parts[1] ? parts[1].split('?')[0] : '';
  };

  const listingId = getListingIdFromHash();
  const [listing, setListing] = useState<MarketplaceListing | undefined>(undefined);
  const [selectedLicense, setSelectedLicense] = useState<LicenseType>('DIGITAL_AND_PRINT');
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (listingId) {
      const item = marketplaceService.getListingById(listingId);
      setListing(item);
      if (item && item.licenseOptions.length > 0) {
        setSelectedLicense(item.licenseOptions[0]);
      }
      if (item) {
        document.title = `${item.title} | NewsPress Wire`;
      }
    }
  }, [listingId]);

  if (!listing) {
    return (
      <div className="p-12 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
        <h3 className="text-lg font-bold text-slate-100 font-serif">Marketplace Dispatch Not Found</h3>
        <p className="text-xs text-slate-400">The requested listing ID may have been withdrawn or archived.</p>
        <Button variant="secondary" size="sm" onClick={() => (window.location.hash = '#/marketplace')}>
          Return to Marketplace Wire
        </Button>
      </div>
    );
  }

  // Check if tenant possesses active license for full content access
  const authorizedContent = currentTenant && user
    ? marketplaceService.getAuthorizedStoryContent({
        newsId: listing.newsId,
        requestingTenantId: currentTenant.tenantId,
        requestingUserId: user.uid
      })
    : null;

  const hasFullAccess = authorizedContent?.hasFullAccess || false;

  const handleCopyByline = () => {
    navigator.clipboard.writeText(`By ${listing.reporterByline || listing.reporterName} / NewsPress Wire`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => (window.location.hash = '#/marketplace')}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Wire
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleCopyByline}>
            {copied ? <Check className="w-4 h-4 mr-1 text-emerald-400" /> : <Copy className="w-4 h-4 mr-1" />}
            {copied ? 'Byline Copied' : 'Copy Byline'}
          </Button>
        </div>
      </div>

      <PageHeader
        title={listing.title}
        subtitle={`Syndication Listing • Byline: ${listing.reporterByline || listing.reporterName} • ${listing.district}, ${listing.state}`}
        breadcrumbs={[
          { label: 'Marketplace', href: '#/marketplace' },
          { label: listing.category },
          { label: 'Dispatch Detail' }
        ]}
      />

      {/* Primary Overview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Content Preview Block with Preview Protection */}
          <Card variant="editorial" className="p-6 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-sans">
              <span>Published: {formatDate(listing.publishedAt)}</span>
              <span>Word Count: {listing.wordCount || 500} words</span>
            </div>

            {/* Lead Paragraph Preview */}
            <p className="text-sm font-normal text-slate-700 dark:text-slate-200 leading-relaxed italic border-l-2 border-blue-600 pl-3 font-sans">
              "{listing.shortDescription}"
            </p>

            {/* Content Access Banner */}
            {hasFullAccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-semibold font-sans">
                  <CheckCircle className="w-4 h-4" />
                  <span>Licensed Entitlement Active — Full Story Unlocked</span>
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans space-y-3 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                  {authorizedContent?.bodyContent?.split('\n\n').map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
                  <Lock className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white font-sans">
                  Commercial Preview Protection Active
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto font-sans leading-relaxed">
                  To protect investigative value and reporter royalties, full body text and high-resolution photo downloads require an authorized license purchase.
                </p>
                <Button variant="primary" size="sm" onClick={() => setIsPurchaseModalOpen(true)}>
                  Acquire Rights for {formatINR(listing.price)}
                </Button>
              </div>
            )}
          </Card>

          {/* License Options Comparison Panel */}
          <LicenseComparisonPanel
            availableLicenses={listing.licenseOptions}
            basePrice={listing.price}
            selectedLicense={selectedLicense}
            onSelectLicense={setSelectedLicense}
          />
        </div>

        {/* Sidebar Specifications */}
        <div className="space-y-6">
          <Card variant="bordered" className="p-5 space-y-4">
            <h4 className="text-xs uppercase font-sans tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 pb-2">
              Commercial & Rights Specs
            </h4>

            <div className="space-y-3 text-xs font-sans">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Listing Category:</span>
                <span className="text-slate-900 dark:text-white font-semibold">{listing.listingType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Base Unit Rate:</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">{formatINR(listing.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Beat Section:</span>
                <span className="text-slate-700 dark:text-slate-300">{listing.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">District Location:</span>
                <span className="text-slate-700 dark:text-slate-300">{listing.district || 'Regional'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Originality Status:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {listing.originalityStatus?.replace(/_/g, ' ') || 'VERIFIED'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Has Photography:</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {listing.hasPhotography ? `Yes (${listing.photoCount} High-Res)` : 'Text Only'}
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full mt-2"
              onClick={() => setIsPurchaseModalOpen(true)}
            >
              {hasFullAccess ? 'View / Renew Rights' : `Acquire Rights (${formatINR(listing.price)})`}
            </Button>
          </Card>

          {/* Reporter & Source Attribution Card */}
          <Card variant="bordered" className="p-5 space-y-3">
            <h4 className="text-xs uppercase font-sans tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
              Source Attribution & Credit
            </h4>
            <div className="space-y-1">
              <span className="text-sm font-semibold text-slate-900 dark:text-white block font-sans">
                {listing.reporterByline || listing.reporterName}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-sans block">
                Source Desk: {listing.sourceTenantId || 'Freelance Open Wire'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-200 dark:border-slate-800 pt-2 font-sans">
              Mandatory credit: <em>"{listing.reporterByline} / NewsPress Wire"</em> must accompany any print broadsheet or web publication.
            </p>
          </Card>
        </div>
      </div>

      {/* Interactive Purchase Modal */}
      {isPurchaseModalOpen && currentTenant && user && (
        <MarketplacePurchaseModal
          isOpen={isPurchaseModalOpen}
          onClose={() => setIsPurchaseModalOpen(false)}
          listing={listing}
          buyerTenantId={currentTenant.tenantId}
          buyerTenantName={currentTenant.organizationName}
          buyerUserId={user.uid}
          buyerUserName={user.displayName}
          onSuccess={() => {
            setIsPurchaseModalOpen(false);
            window.location.hash = '#/marketplace/licensed';
          }}
        />
      )}
    </div>
  );
};
