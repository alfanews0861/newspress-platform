/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Purchased News & Wire Feed Page
 * Phase 3 — News Marketplace, Licensing & Reporter Revenue Engine
 * 
 * Displays licensed stories for the buyer tenant with full reading access.
 * Enforces security invariant: Confidential reporter evidence (GPS, private contacts,
 * internal notes) is strictly redacted from buyers.
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  Calendar,
  Lock,
  Download,
  Copy,
  Check,
  ExternalLink,
  Eye,
  AlertCircle
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { marketplaceService } from '../../services/marketplaceService';
import { NewsLicense, MarketplaceListing } from '../../types/marketplace';
import { NewsArticle } from '../../types/news';
import { formatDate, formatDateTime } from '../../utils/formatters';

interface PurchasedItem {
  license: NewsLicense;
  listing?: MarketplaceListing;
  article?: NewsArticle;
}

export const PurchasedNewsPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  const [purchasedItems, setPurchasedItems] = useState<PurchasedItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<PurchasedItem | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (currentTenant) {
      const items = marketplaceService.getPurchasedNewsForTenant(currentTenant.tenantId);
      setPurchasedItems(items);
    }
  }, [currentTenant]);

  const handleOpenReader = (item: PurchasedItem) => {
    setSelectedItem(item);
    setCopied(false);
  };

  const handleCopyText = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Authoritative content retrieval with redaction check
  const storyContent = selectedItem && currentTenant && user
    ? marketplaceService.getAuthorizedStoryContent({
        newsId: selectedItem.license.newsId,
        requestingTenantId: currentTenant.tenantId,
        requestingUserId: user.uid
      })
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchased News & Wire Feed"
        subtitle="Full syndication dispatches, publication rights certificates, and print-ready editorial copy acquired by your newsroom."
        breadcrumbs={[
          { label: 'Marketplace', href: '#' },
          { label: 'Purchased News' },
        ]}
      />

      {purchasedItems.length === 0 ? (
        <Card variant="bordered" className="text-center py-12 space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto text-slate-500">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white font-sans">No Purchased Stories Yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 font-sans">
              Your organization has not yet licensed any dispatches from the syndication wire or redeemed monthly pack units.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => (window.location.hash = '#/marketplace/wire')}>
            Browse Syndication Wire
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-sans">
            Showing <strong className="text-blue-600 dark:text-blue-400 font-semibold">{purchasedItems.length}</strong> active licensed dispatches for {currentTenant?.organizationName}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {purchasedItems.map((item) => (
              <Card
                key={item.license.licenseId}
                variant="editorial"
                className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-200 dark:border-slate-800"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="blue" size="sm">
                      {item.license.type.replace(/_/g, ' ')}
                    </Badge>
                    <Badge variant="outline" size="sm">
                      {item.license.territory}
                    </Badge>
                    <span className="text-[10px] font-sans font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/40 dark:border-emerald-800 px-2 py-0.5 rounded">
                      License Active: {item.license.licenseId}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-slate-900 dark:text-white font-sans leading-snug">
                    {item.license.articleTitle}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-sans">
                    <span>Byline: <strong className="text-slate-700 dark:text-slate-200 font-medium">{item.license.sellerReporterName}</strong></span>
                    <span>•</span>
                    <span>Granted: {formatDate(item.license.grantedAt)}</span>
                    {item.license.expiresAt && (
                      <>
                        <span>•</span>
                        <span>Expires: {formatDate(item.license.expiresAt)}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenReader(item)}
                  >
                    <Eye className="w-4 h-4 mr-1.5" />
                    Read Full Story
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Full Story Reader & Rights Manifest Modal */}
      {selectedItem && storyContent && (
        <Modal
          isOpen={Boolean(selectedItem)}
          onClose={() => setSelectedItem(null)}
          title={storyContent.headline}
          subtitle={`Byline: ${storyContent.byline} • Licensed under ${selectedItem.license.type} (${selectedItem.license.licenseId})`}
          maxWidth="2xl"
        >
          <div className="space-y-5">
            {/* Confidential Evidence Redaction Assurance Banner */}
            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs flex items-center justify-between font-sans">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>
                  <strong>Syndication Clearance Active:</strong> Rights verified for {currentTenant?.organizationName}. Private reporter evidence (GPS coordinates, private contacts, confidential notes) is protected and redacted.
                </span>
              </div>
            </div>

            {/* License Terms Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-sans">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">LICENSE TYPE</span>
                <span className="text-slate-900 dark:text-white font-semibold">{selectedItem.license.type}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">TERRITORY</span>
                <span className="text-slate-900 dark:text-white font-semibold">{selectedItem.license.territory}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">ATTRIBUTION</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold">Required Byline</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">EXCLUSIVITY</span>
                <span className="text-slate-900 dark:text-white font-semibold">
                  {selectedItem.license.exclusivity ? 'Protected Exclusive' : 'Non-Exclusive'}
                </span>
              </div>
            </div>

            {/* Story Text Box */}
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4 max-h-96 overflow-y-auto font-sans">
              <p className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed italic border-l-2 border-blue-600 pl-3">
                {storyContent.leadParagraph}
              </p>

              <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-3 font-sans">
                {storyContent.bodyContent ? (
                  storyContent.bodyContent.split('\n\n').map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))
                ) : (
                  <p>Full content loading...</p>
                )}
              </div>
            </div>

            {/* Reader Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between font-sans">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Mandatory credit: <em>"{storyContent.byline} / NewsPress Wire"</em>
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    handleCopyText(
                      `${storyContent.headline}\nBy ${storyContent.byline}\n\n${storyContent.leadParagraph}\n\n${storyContent.bodyContent}`
                    )
                  }
                >
                  {copied ? <Check className="w-4 h-4 mr-1 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copied ? 'Copied to Clipboard' : 'Copy Editorial Text'}
                </Button>
                <Button variant="primary" size="sm" onClick={() => setSelectedItem(null)}>
                  Done
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
