/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Newspaper Editions & Auto-Assembly Desk
 * Combines reporter-submitted newsroom stories + purchased marketplace stories
 * into a complete readable newspaper according to the organization's remembered Brand Settings.
 */

import React, { useState, useMemo } from 'react';
import {
  Plus,
  Layers,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Sparkles,
  Newspaper,
  ArrowRight,
  Settings,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DataTable } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { NewspaperEdition } from '../../types/edition';
import { NewsArticle } from '../../types/news';
import { MarketplaceListing } from '../../types/marketplace';
import { EditionPersistenceService } from '../../services/editionPersistenceService';
import { brandManagementService } from '../../services/brandManagementService';
import { GridCalculationService } from '../../services/gridCalculationService';
import { PagePlanningEngine } from '../../services/pagePlanningEngine';
import { newsSubmissionService } from '../../services/newsSubmissionService';
import { marketplaceService } from '../../services/marketplaceService';
import { marketplaceContentWorkspaceService } from '../../services/marketplaceContentWorkspaceService';
import { formatINR, formatTimeLeft } from '../../utils/formatters';
import { navigateTo } from '../../utils/navigation';
import { writeLocalString } from '../../utils/localStore';

export const EditionsPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  const [refreshTick, setRefreshTick] = useState(0);
  const [assemblyFeedback, setAssemblyFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [buyingListingId, setBuyingListingId] = useState<string | null>(null);
  const [isAssembling, setIsAssembling] = useState(false);

  const activeBrand = useMemo(() => brandManagementService.getActiveBrand(), [refreshTick]);
  const editions = useMemo(
    () => EditionPersistenceService.getAllEditions(currentTenant?.tenantId),
    [currentTenant?.tenantId, refreshTick]
  );

  // Gather own approved / published stories + purchased marketplace stories for this tenant
  const { ownApprovedStories, licensedStories, combinedStories, targetStoryCount } = useMemo(() => {
    const tenantId = currentTenant?.tenantId || 'tenant-metro-chronicle';
    const isTelugu = activeBrand.language === 'te' || activeBrand.name?.includes('తెలుగు');

    const own = newsSubmissionService
      .getArticles(tenantId)
      .filter((a) => ['approved', 'published', 'marketplace_listed'].includes(a.editorialStatus))
      .filter((a) => {
        if (isTelugu) return true;
        return a.category !== 'జాతీయం' && a.category !== 'రాష్ట్రీయం' && a.category !== 'జిల్లా వార్తలు';
      });

    const purchasedRaw = marketplaceService.getPurchasedNewsForTenant(tenantId);
    const licensed: NewsArticle[] = [];
    for (const item of purchasedRaw) {
      if (item.license.status !== 'ACTIVE') continue;
      const adapted = marketplaceContentWorkspaceService.adaptToNewsroomStory({
        licenseId: item.license.licenseId,
        tenantId,
        userId: user?.uid || 'user-editor',
      });
      if (adapted.articleId && adapted.headline) {
        licensed.push({
          articleId: adapted.articleId,
          tenantId,
          headline: adapted.headline,
          slug: adapted.articleId,
          summary: adapted.leadParagraph || adapted.headline,
          leadParagraph: adapted.leadParagraph || adapted.headline,
          bodyContent: adapted.bodyContent || adapted.leadParagraph || adapted.headline,
          authorId: item.license.sellerReporterId || 'wire',
          byline: adapted.byline || 'Syndicated Wire',
          authorType: 'syndicated',
          category: adapted.category || 'General',
          district: adapted.district || 'Regional',
          editorialStatus: 'approved',
          originalityVerdict: 'verified_original',
          originalityStatus: 'VERIFIED_ORIGINAL',
          wordCount: (adapted.bodyContent || '').split(/\s+/).filter(Boolean).length || 300,
          tags: [adapted.category || 'Syndicated'],
          isMarketplaceListed: false,
          isMarketplaceEligible: false,
          createdAt: adapted.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    const seen = new Set<string>();
    const combined: NewsArticle[] = [];
    for (const s of [...own, ...licensed]) {
      if (!seen.has(s.articleId)) {
        seen.add(s.articleId);
        combined.push(s);
      }
    }

    const target = Math.max(8, (activeBrand.pageCount || 4) * 5);
    return {
      ownApprovedStories: own,
      licensedStories: licensed,
      combinedStories: combined,
      targetStoryCount: target,
    };
  }, [currentTenant?.tenantId, activeBrand, user?.uid, refreshTick]);

  const shortfallCount = Math.max(0, targetStoryCount - combinedStories.length);

  // Active marketplace listings available to buy & fill gaps
  const marketplaceFillCandidates: MarketplaceListing[] = useMemo(() => {
    const ownedNewsIds = new Set(combinedStories.map((s) => s.articleId.replace(/^syndicated_/, '')));
    return marketplaceService
      .getListings({ status: 'ACTIVE' })
      .filter((l) => !ownedNewsIds.has(l.newsId))
      .slice(0, 6);
  }, [combinedStories, refreshTick]);

  const handleBuyAndAddToPaper = async (listing: MarketplaceListing) => {
    if (!currentTenant || !user) return;
    setBuyingListingId(listing.listingId);
    setAssemblyFeedback(null);
    try {
      const selectedLic = listing.licenseOptions.includes('DIGITAL_AND_PRINT')
        ? 'DIGITAL_AND_PRINT'
        : listing.licenseOptions[0] || 'PRINT_ONLY';

      await marketplaceService.purchaseNews({
        idempotencyKey: `editions-fill-${listing.listingId}-${Date.now()}`,
        listingId: listing.listingId,
        buyerTenantId: currentTenant.tenantId,
        buyerTenantName: currentTenant.organizationName,
        buyerUserId: user.uid,
        buyerUserName: user.displayName || 'Publisher',
        selectedLicense: selectedLic,
        territory: activeBrand.imprint?.placeOfPublication || 'Regional',
      });

      setAssemblyFeedback({
        type: 'success',
        message: `Purchased "${listing.title}" and added it to your edition story pool.`,
      });
      setRefreshTick((t) => t + 1);
    } catch (err: any) {
      setAssemblyFeedback({
        type: 'error',
        message: err?.message || 'Could not license this story.',
      });
    } finally {
      setBuyingListingId(null);
    }
  };

  const handleAssembleNewspaper = async () => {
    if (!currentTenant || !user) return;
    setIsAssembling(true);
    setAssemblyFeedback(null);
    try {
      const template = GridCalculationService.getTemplateForBrand(activeBrand);
      const now = new Date();
      const todayIso = now.toISOString().split('T')[0];
      const isTelugu = activeBrand.language === 'te' || activeBrand.name?.includes('ఆంధ్ర');
      const formattedDate = isTelugu
        ? now.toLocaleDateString('te-IN', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })
        : now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const editionId = `ed-${activeBrand.brandId}-${todayIso}`;

      // Surface newly added reporter dispatches and purchased marketplace stories at the top of the assembly queue
      const orderedStories = [...combinedStories].sort((a, b) => {
        const aBoost = a.authorType === 'syndicated' || !a.articleId.startsWith('art-te-') ? 1 : 0;
        const bBoost = b.authorType === 'syndicated' || !b.articleId.startsWith('art-te-') ? 1 : 0;
        if (bBoost !== aBoost) return bBoost - aBoost;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });

      const newEdition: NewspaperEdition = {
        editionId,
        tenantId: currentTenant.tenantId,
        brandId: activeBrand.brandId,
        brandName: activeBrand.name,
        editionName: activeBrand.editionsList?.[0] || 'Main Morning Edition',
        editionCode: `${(activeBrand.code || activeBrand.name.slice(0, 3)).toUpperCase()}-${todayIso}`,
        issueNumber: Number(activeBrand.issueNumber) || Math.floor(200 + (Date.now() % 100)),
        volumeNumber: Number(activeBrand.volumeNumber) || 65,
        publicationDate: formattedDate,
        status: 'DESIGNING',
        totalPages: activeBrand.pageCount || 4,
        pageCount: activeBrand.pageCount || 4,
        placedArticlesCount: 0,
        printDeadline: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
        pressSpecs: {
          format: (activeBrand.paperSize as any) || 'broadsheet',
          colorMode: 'cmyk',
          bleedMm: 3.5,
          dpi: 300,
        },
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      const planned = PagePlanningEngine.planEditionLayout({
        edition: newEdition,
        template,
        stories: orderedStories,
        targetPageCount: activeBrand.pageCount || 4,
      });

      await EditionPersistenceService.saveEdition(
        newEdition,
        planned.pages,
        user.uid,
        `Assembled ${planned.pages.length}-page readable edition (${planned.summary.placedCount} stories)`
      );
      writeLocalString('newspress_active_edition_id_v1', newEdition.editionId);
      setRefreshTick((t) => t + 1);
      navigateTo('/newspaper/page-designer');
    } catch (err: any) {
      setAssemblyFeedback({
        type: 'error',
        message: err?.message || 'Failed to assemble edition.',
      });
    } finally {
      setIsAssembling(false);
    }
  };

  const handleOpenEdition = (ed: NewspaperEdition) => {
    writeLocalString('newspress_active_edition_id_v1', ed.editionId);
    brandManagementService.setActiveBrandId(ed.brandId);
    navigateTo('/newspaper/page-designer');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Newspaper Builder & Editions"
        subtitle={`Combine reporter dispatches and marketplace stories into a printable newspaper for ${activeBrand.name}.`}
        breadcrumbs={[
          { label: 'Newspaper', href: '/newspaper/editions' },
          { label: 'Builder & Editions' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigateTo('/newspaper/brands')}
            >
              <Settings className="w-4 h-4 mr-1.5" /> Paper Setup
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAssembleNewspaper}
              disabled={isAssembling || combinedStories.length === 0}
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              {isAssembling ? 'Assembling...' : 'Assemble & Open Newspaper'}
            </Button>
          </div>
        }
      />

      {assemblyFeedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            assemblyFeedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {assemblyFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{assemblyFeedback.message}</span>
          </div>
        </div>
      )}

      {/* Today's Newspaper Story Readiness & One-Click Assembly */}
      <Card variant="editorial" className="p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {activeBrand.name} — {activeBrand.pageCount || 4} Pages ({activeBrand.paperSize?.toUpperCase() || 'BROADSHEET'})
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Own Approved Stories: <strong className="text-slate-800 dark:text-slate-200">{ownApprovedStories.length}</strong> • Purchased Marketplace Stories:{' '}
              <strong className="text-blue-600 dark:text-blue-400">{licensedStories.length}</strong> • Target for Full Edition:{' '}
              <strong className="text-slate-800 dark:text-slate-200">{targetStoryCount}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {shortfallCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-full">
                <AlertCircle className="w-3.5 h-3.5" /> Need {shortfallCount} more stories
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready to Print ({combinedStories.length} stories)
              </span>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleAssembleNewspaper}
              disabled={isAssembling || combinedStories.length === 0}
            >
              Build Readable Paper <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>

        {/* Fill Missing Stories Directly from Marketplace */}
        {(shortfallCount > 0 || marketplaceFillCandidates.length > 0) && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  {shortfallCount > 0
                    ? `Short on news? Pick stories from Marketplace (${shortfallCount} needed)`
                    : 'Optional: Add Extra Marketplace Stories to Edition'}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigateTo('/marketplace')}>
                Browse All Marketplace Stories &rarr;
              </Button>
            </div>

            {marketplaceFillCandidates.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                All available marketplace dispatches have already been acquired by your organization.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {marketplaceFillCandidates.map((listing) => (
                  <div
                    key={listing.listingId}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col justify-between gap-2.5"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-blue-600 dark:text-blue-400 truncate">{listing.category}</span>
                        <span className="font-bold text-slate-900 dark:text-white shrink-0">{formatINR(listing.price)}</span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                        {listing.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        By {listing.reporterByline || listing.reporterName}
                      </p>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleBuyAndAddToPaper(listing)}
                      disabled={buyingListingId === listing.listingId}
                      className="w-full"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      {buyingListingId === listing.listingId ? 'Adding...' : 'Buy & Add to Paper'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Persisted Editions Table */}
      <Card
        variant="default"
        title="Saved & Active Newspaper Editions"
        subtitle="Open any assembled edition in the readable newspaper viewer and export exact print PDF."
      >
        <DataTable
          data={editions}
          keyExtractor={(row) => row.editionId}
          columns={[
            {
              key: 'edition',
              header: 'Newspaper & Issue',
              render: (row) => (
                <div>
                  <div className="font-medium text-slate-900 dark:text-white font-sans text-sm">
                    {row.brandName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                    {row.editionCode} • Issue #{row.issueNumber} ({row.publicationDate})
                  </div>
                </div>
              ),
            },
            {
              key: 'format',
              header: 'Paper Size',
              width: '130px',
              render: (row) => (
                <span className="font-sans text-xs capitalize text-slate-500 dark:text-slate-400">
                  {row.pressSpecs?.format || 'broadsheet'}
                </span>
              ),
            },
            {
              key: 'pages',
              header: 'Pages / Stories',
              width: '140px',
              render: (row) => (
                <div className="text-xs font-sans text-slate-600 dark:text-slate-300">
                  {row.totalPages} Pages • {row.placedArticlesCount} Stories
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              width: '130px',
              render: (row) => <StatusBadge status={row.status} />,
            },
            {
              key: 'deadline',
              header: 'Deadline',
              width: '140px',
              render: (row) => (
                <span className="text-xs font-sans text-slate-500 dark:text-slate-400">
                  {formatTimeLeft(row.printDeadline)}
                </span>
              ),
            },
            {
              key: 'actions',
              header: 'Open',
              width: '140px',
              render: (row) => (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenEdition(row)}
                >
                  <Layers className="w-3.5 h-3.5 mr-1.5 text-blue-600 dark:text-blue-400" />
                  Read / Print
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};
