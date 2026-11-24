/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Newspaper Editions & Assembly Desk
 */

import React, { useState, useMemo } from 'react';
import {
  Plus,
  Layers,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
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

  const marketplaceFillCandidates: MarketplaceListing[] = useMemo(() => {
    const ownedNewsIds = new Set(combinedStories.map((s) => s.articleId.replace(/^syndicated_/, '')));
    return marketplaceService
      .getListings({ status: 'ACTIVE' })
      .filter((l) => !ownedNewsIds.has(l.newsId))
      .slice(0, 3);
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
        message: `Added "${listing.title}" to your edition pool.`,
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
        `Assembled ${planned.pages.length}-page edition (${planned.summary.placedCount} stories)`
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
    <div className="space-y-5">
      <PageHeader
        title="Editions"
        subtitle={`${activeBrand.name} · ${activeBrand.pageCount || 4} pages`}
        actions={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 sm:flex-none"
              leftIcon={<Settings className="w-4 h-4" />}
              onClick={() => navigateTo('/newspaper/brands')}
            >
              Paper Setup
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={handleAssembleNewspaper}
              disabled={isAssembling || combinedStories.length === 0}
            >
              {isAssembling ? 'Building...' : 'Build Paper'}
            </Button>
          </div>
        }
      />

      {assemblyFeedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            assemblyFeedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          {assemblyFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{assemblyFeedback.message}</span>
        </div>
      )}

      {/* Today's Edition Readiness */}
      <Card className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-[#1a73e8] dark:text-[#8ab4f8] shrink-0" />
              <h2 className="text-base font-semibold text-[#202124] dark:text-white">
                {activeBrand.name}
              </h2>
              <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6] capitalize">
                · {activeBrand.paperSize || 'broadsheet'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#5f6368] dark:text-[#9aa0a6] flex-wrap tabular-nums">
              <span>
                Own: <strong className="text-[#202124] dark:text-white">{ownApprovedStories.length}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Purchased: <strong className="text-[#1a73e8] dark:text-[#8ab4f8]">{licensedStories.length}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Target: <strong className="text-[#202124] dark:text-white">{targetStoryCount}</strong>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {shortfallCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#b06000] dark:text-[#fdd663]">
                <AlertCircle className="w-3.5 h-3.5" />
                Need {shortfallCount} more
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#137333] dark:text-[#81c995]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ready ({combinedStories.length} stories)
              </span>
            )}
            <Button
              variant="primary"
              size="sm"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={handleAssembleNewspaper}
              disabled={isAssembling || combinedStories.length === 0}
            >
              Open Page Designer
            </Button>
          </div>
        </div>

        {/* Quick Marketplace Fill */}
        {marketplaceFillCandidates.length > 0 && (
          <div className="pt-4 border-t border-[#eceff1] dark:border-[#3c4043] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#202124] dark:text-white">
                <ShoppingBag className="w-3.5 h-3.5 text-[#1a73e8] dark:text-[#8ab4f8]" />
                <span>Add Marketplace Stories</span>
              </div>
              <button
                type="button"
                onClick={() => navigateTo('/marketplace')}
                className="text-xs font-medium text-[#1a73e8] dark:text-[#8ab4f8] hover:underline whitespace-nowrap cursor-pointer"
              >
                Browse all
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {marketplaceFillCandidates.map((listing) => (
                <div
                  key={listing.listingId}
                  className="p-3.5 rounded-xl border border-[#e0e3e7] dark:border-[#3c4043] bg-[#f8f9fa] dark:bg-[#1b1c1f] flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-[#1a73e8] dark:text-[#8ab4f8] truncate">
                        {listing.category}
                      </span>
                      <span className="font-bold text-[#202124] dark:text-white shrink-0 tabular-nums">
                        {formatINR(listing.price)}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-[#202124] dark:text-white line-clamp-2 leading-snug">
                      {listing.title}
                    </h4>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => handleBuyAndAddToPaper(listing)}
                    disabled={buyingListingId === listing.listingId}
                    className="w-full"
                  >
                    {buyingListingId === listing.listingId ? 'Adding...' : 'Add to Paper'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Saved Editions — Mobile List + Desktop Table */}
      <Card title="Saved Editions">
        {/* Mobile stacked list */}
        <div className="md:hidden px-4 py-3 divide-y divide-[#eceff1] dark:divide-[#3c4043]">
          {editions.length === 0 ? (
            <p className="py-6 text-center text-xs text-[#5f6368] dark:text-[#9aa0a6]">
              No saved editions yet.
            </p>
          ) : (
            editions.map((ed) => (
              <div key={ed.editionId} className="py-3.5 first:pt-0 last:pb-0 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#202124] dark:text-white truncate">
                      {ed.brandName}
                    </div>
                    <div className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5 tabular-nums">
                      Issue #{ed.issueNumber} · {ed.totalPages} pages · {ed.placedArticlesCount} stories
                    </div>
                  </div>
                  <StatusBadge status={ed.status} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">
                    {ed.publicationDate}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Layers className="w-3.5 h-3.5" />}
                    onClick={() => handleOpenEdition(ed)}
                  >
                    Open
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <DataTable
            data={editions}
            keyExtractor={(row) => row.editionId}
            columns={[
              {
                key: 'edition',
                header: 'Edition',
                render: (row) => (
                  <div>
                    <div className="font-medium text-[#202124] dark:text-white text-sm">
                      {row.brandName}
                    </div>
                    <div className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">
                      Issue #{row.issueNumber} · {row.publicationDate}
                    </div>
                  </div>
                ),
              },
              {
                key: 'format',
                header: 'Format',
                width: '120px',
                render: (row) => (
                  <span className="text-xs capitalize text-[#5f6368] dark:text-[#9aa0a6]">
                    {row.pressSpecs?.format || 'broadsheet'}
                  </span>
                ),
              },
              {
                key: 'pages',
                header: 'Content',
                width: '140px',
                render: (row) => (
                  <span className="text-xs text-[#3c4043] dark:text-[#e8eaed] tabular-nums">
                    {row.totalPages} pages · {row.placedArticlesCount} stories
                  </span>
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
                width: '130px',
                render: (row) => (
                  <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6] tabular-nums">
                    {formatTimeLeft(row.printDeadline)}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: 'Action',
                width: '120px',
                render: (row) => (
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Layers className="w-3.5 h-3.5" />}
                    onClick={() => handleOpenEdition(row)}
                  >
                    Open
                  </Button>
                ),
              },
            ]}
          />
        </div>
      </Card>
    </div>
  );
};
