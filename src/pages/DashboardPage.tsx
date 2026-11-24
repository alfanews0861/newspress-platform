/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Newspaper,
  ShoppingBag,
  BookOpen,
  ArrowRight,
  Printer,
  CheckCircle2,
  XCircle,
  Plus,
  ChevronDown,
  ChevronUp,
  Youtube,
  Sliders,
} from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { QuickStoryModal } from '../components/editorial/QuickStoryModal';
import { useTenant } from '../hooks/useTenant';
import { useAuth } from '../hooks/useAuth';
import { formatTimeLeft } from '../utils/formatters';
import { newsSubmissionService } from '../services/newsSubmissionService';
import { marketplaceService } from '../services/marketplaceService';
import { EditionPersistenceService } from '../services/editionPersistenceService';
import { brandManagementService } from '../services/brandManagementService';
import { YouTubeService } from '../services/youtubeService';
import { EditorialReviewItem, NewsArticle } from '../types/news';
import { NewspaperEdition } from '../types/edition';
import { readLocalString } from '../utils/localStore';

export interface DashboardPageProps {
  onNavigate: (href: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  const [queueItems, setQueueItems] = useState<EditorialReviewItem[]>([]);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [activeEdition, setActiveEdition] = useState<NewspaperEdition | null>(null);
  const [marketplaceListingsCount, setMarketplaceListingsCount] = useState(0);
  const [purchasedCount, setPurchasedCount] = useState(0);

  const [isQuickStoryOpen, setIsQuickStoryOpen] = useState(false);
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'dispatches'>('queue');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const reloadData = useCallback(() => {
    const tenantId = currentTenant.tenantId;
    const freshArticles = newsSubmissionService.getArticles(tenantId);
    const freshQueue = newsSubmissionService.getEditorialQueueItems(tenantId);
    const allEditions = EditionPersistenceService.getAllEditions(tenantId);
    const savedActiveEditionId = readLocalString('newspress_active_edition_id_v1', '');
    const currentBrand = brandManagementService.getActiveBrand();
    const resolvedEdition =
      allEditions.find((e) => e.editionId === savedActiveEditionId) ||
      allEditions.find((e) => e.brandId === currentBrand?.brandId) ||
      allEditions[0] ||
      null;

    setArticles(freshArticles);
    setQueueItems(freshQueue);
    setActiveEdition(resolvedEdition);
    setMarketplaceListingsCount(marketplaceService.getListings({}).length);
    setPurchasedCount(
      marketplaceService
        .getPurchasedNewsForTenant(tenantId)
        .filter((item) => item.license.status === 'ACTIVE').length
    );
    setRefreshTick((t) => t + 1);
  }, [currentTenant.tenantId]);

  useEffect(() => {
    reloadData();
    const handleStoryCreated = () => {
      reloadData();
      showToast('Story saved.');
    };
    window.addEventListener('story_created', handleStoryCreated);
    window.addEventListener('newspress:brands-updated', reloadData);
    return () => {
      window.removeEventListener('story_created', handleStoryCreated);
      window.removeEventListener('newspress:brands-updated', reloadData);
    };
  }, [reloadData]);

  const activeBrand = brandManagementService.getActiveBrand();
  const ytAccount = YouTubeService.getConnectedAccount();

  const approvedOwnCount = articles.filter((a) =>
    ['approved', 'published', 'marketplace_listed'].includes(a.editorialStatus)
  ).length;
  const totalReadyForPaper = approvedOwnCount + purchasedCount;
  const targetStoryCount = Math.max(8, (activeBrand.pageCount || 4) * 5);

  const handleFastApprove = async (e: React.MouseEvent, item: EditorialReviewItem) => {
    e.stopPropagation();
    try {
      await newsSubmissionService.approveArticle(
        item.articleId,
        user?.uid || 'user-news-editor',
        'Approved from Dashboard'
      );
      reloadData();
      showToast('Story approved.');
    } catch (err: any) {
      showToast(err?.message || 'Could not approve story.');
    }
  };

  const handleFastReject = async (e: React.MouseEvent, item: EditorialReviewItem) => {
    e.stopPropagation();
    try {
      await newsSubmissionService.rejectArticle(
        item.articleId,
        user?.uid || 'user-news-editor',
        'Returned for edits'
      );
      reloadData();
      showToast('Returned for edits.');
    } catch (err: any) {
      showToast(err?.message || 'Could not update story.');
    }
  };

  const totalEditionPages = activeEdition?.totalPages || activeBrand.pageCount || 4;
  const editionPages = activeEdition
    ? EditionPersistenceService.getPagesForEdition(activeEdition.editionId)
    : [];
  const placedCount =
    editionPages.reduce((sum, p) => sum + (p.blocks?.length || 0), 0) ||
    activeEdition?.placedArticlesCount ||
    0;

  return (
    <div className="space-y-5 max-w-7xl mx-auto" key={refreshTick}>
      {toastMessage && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:right-6 z-50 bg-[#202124] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-medium border border-[#3c4043]">
          <CheckCircle2 className="w-4 h-4 text-[#34a853] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Greeting & Quick Actions */}
      <div className="bg-white dark:bg-[#242629] border border-[#e0e3e7] dark:border-[#3c4043] rounded-2xl overflow-hidden">
        <div className="h-1 w-full google-spectrum-bar" />
        <div className="p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="text-xs text-[#5f6368] dark:text-[#9aa0a6] truncate">
              <span className="font-semibold text-[#1a73e8] dark:text-[#8ab4f8]">
                {currentTenant.organizationName}
              </span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>{activeBrand.name}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#202124] dark:text-[#f8f9fa]">
              Welcome, {user?.displayName?.split(' ')[0] || 'Editor'}
            </h1>
          </div>

          <div className="grid grid-cols-3 sm:flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsQuickStoryOpen(true)}
              className="min-h-[42px] px-3 sm:px-4 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Write</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('/newsroom/youtube-studio')}
              className="min-h-[42px] px-3 sm:px-4 rounded-full bg-[#fce8e6] hover:bg-[#fad2cf] text-[#c5221f] dark:bg-[#3c1816] dark:text-[#f28b82] font-semibold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Youtube className="w-4 h-4 shrink-0" />
              <span>Studio</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('/newspaper/page-designer')}
              className="min-h-[42px] px-3 sm:px-4 rounded-full bg-[#e6f4ea] hover:bg-[#ceead6] text-[#137333] dark:bg-[#13311e] dark:text-[#81c995] font-semibold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Paper</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Compact Workflow Cards (2x2 on mobile, 4-col on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => onNavigate('/newsroom/youtube-studio')}
          className="text-left rounded-2xl border google-surface-red overflow-hidden hover:shadow-sm transition-shadow cursor-pointer flex flex-col justify-between"
        >
          <div className="h-1 w-full bg-[#ea4335]" />
          <div className="p-3.5 sm:p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#c5221f] dark:text-[#f28b82] truncate">
                Broadcast
              </span>
              <Youtube className="w-4 h-4 text-[#ea4335] dark:text-[#f28b82] shrink-0" />
            </div>
            <div className="text-sm sm:text-base font-bold text-[#202124] dark:text-[#f8f9fa] truncate">
              {ytAccount.isConnected ? ytAccount.channelTitle || 'Connected' : 'Setup Channel'}
            </div>
            <div className="text-[11px] text-[#5f6368] dark:text-[#bdc1c6] flex items-center justify-between">
              <span>{ytAccount.isConnected ? 'Ready' : 'Not linked'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#c5221f] dark:text-[#f28b82]" />
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('/newspaper/editions')}
          className="text-left rounded-2xl border google-surface-green overflow-hidden hover:shadow-sm transition-shadow cursor-pointer flex flex-col justify-between"
        >
          <div className="h-1 w-full bg-[#34a853]" />
          <div className="p-3.5 sm:p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#137333] dark:text-[#81c995] truncate">
                Editions
              </span>
              <BookOpen className="w-4 h-4 text-[#1e8e3e] dark:text-[#81c995] shrink-0" />
            </div>
            <div className="text-sm sm:text-base font-bold tabular-nums text-[#202124] dark:text-[#f8f9fa]">
              {totalReadyForPaper} / {targetStoryCount} Ready
            </div>
            <div className="text-[11px] text-[#5f6368] dark:text-[#bdc1c6] flex items-center justify-between">
              <span className="tabular-nums">{activeBrand.pageCount || 4} pages</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#137333] dark:text-[#81c995]" />
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('/newsroom/news')}
          className="text-left rounded-2xl border google-surface-blue overflow-hidden hover:shadow-sm transition-shadow cursor-pointer flex flex-col justify-between"
        >
          <div className="h-1 w-full bg-[#4285f4]" />
          <div className="p-3.5 sm:p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#1a73e8] dark:text-[#8ab4f8] truncate">
                Stories
              </span>
              <Newspaper className="w-4 h-4 text-[#1a73e8] dark:text-[#8ab4f8] shrink-0" />
            </div>
            <div className="text-sm sm:text-base font-bold tabular-nums text-[#202124] dark:text-[#f8f9fa]">
              {articles.length} Total
            </div>
            <div className="text-[11px] text-[#5f6368] dark:text-[#bdc1c6] flex items-center justify-between">
              <span className="tabular-nums">{queueItems.length} pending</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#1a73e8] dark:text-[#8ab4f8]" />
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('/marketplace')}
          className="text-left rounded-2xl border google-surface-yellow overflow-hidden hover:shadow-sm transition-shadow cursor-pointer flex flex-col justify-between"
        >
          <div className="h-1 w-full bg-[#fbbc04]" />
          <div className="p-3.5 sm:p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#b06000] dark:text-[#fdd663] truncate">
                Marketplace
              </span>
              <ShoppingBag className="w-4 h-4 text-[#e37400] dark:text-[#fdd663] shrink-0" />
            </div>
            <div className="text-sm sm:text-base font-bold tabular-nums text-[#202124] dark:text-[#f8f9fa]">
              {marketplaceListingsCount} Wire Stories
            </div>
            <div className="text-[11px] text-[#5f6368] dark:text-[#bdc1c6] flex items-center justify-between">
              <span className="tabular-nums">{purchasedCount} licensed</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#b06000] dark:text-[#fdd663]" />
            </div>
          </div>
        </button>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Left 2 Cols: Review Queue & Latest Stories */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-[#e0e3e7] dark:border-[#3c4043] pb-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab('queue')}
                className={`min-h-[38px] px-3.5 rounded-full text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeTab === 'queue'
                    ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#173054] dark:text-[#8ab4f8]'
                    : 'text-[#5f6368] dark:text-[#bdc1c6] hover:bg-[#f1f3f4] dark:hover:bg-[#2e3135]'
                }`}
              >
                <span>Pending Review</span>
                <span className="font-mono tabular-nums opacity-80">({queueItems.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('dispatches')}
                className={`min-h-[38px] px-3.5 rounded-full text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeTab === 'dispatches'
                    ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#173054] dark:text-[#8ab4f8]'
                    : 'text-[#5f6368] dark:text-[#bdc1c6] hover:bg-[#f1f3f4] dark:hover:bg-[#2e3135]'
                }`}
              >
                <span>Latest</span>
                <span className="font-mono tabular-nums opacity-80">({articles.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                onNavigate(activeTab === 'queue' ? '/newsroom/editorial-queue' : '/newsroom/news')
              }
              className="text-xs font-semibold text-[#1a73e8] dark:text-[#8ab4f8] hover:underline inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeTab === 'queue' ? (
            queueItems.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#242629] border border-[#e0e3e7] dark:border-[#3c4043] space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#1e8e3e] mx-auto" />
                <h3 className="text-sm font-semibold text-[#202124] dark:text-[#f8f9fa]">
                  All caught up
                </h3>
                <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">
                  No reporter stories waiting for approval.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl bg-white dark:bg-[#242629] border border-[#e0e3e7] dark:border-[#3c4043] divide-y divide-[#e0e3e7] dark:divide-[#3c4043] overflow-hidden">
                {queueItems.map((item) => {
                  const isExpanded = expandedStoryId === item.reviewId;
                  const fullArticle = articles.find((a) => a.articleId === item.articleId);
                  return (
                    <div key={item.reviewId} className="p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap text-xs text-[#5f6368] dark:text-[#9aa0a6]">
                            <span className="font-semibold text-[#1a73e8] dark:text-[#8ab4f8]">
                              {item.desk}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{item.authorName}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{item.wordCount} words</span>
                          </div>
                          <h3 className="text-sm font-semibold text-[#202124] dark:text-[#f8f9fa] leading-snug">
                            {item.headline}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleFastApprove(e, item)}
                            className="min-h-[38px] px-3.5 rounded-full bg-[#1e8e3e] hover:bg-[#137333] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleFastReject(e, item)}
                            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-full border border-[#dadce0] dark:border-[#3c4043] text-[#5f6368] hover:text-[#d93025] hover:bg-[#fce8e6] dark:hover:bg-[#3c1816] transition-colors cursor-pointer"
                            title="Return for edits"
                            aria-label="Return for edits"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedStoryId(isExpanded ? null : item.reviewId)}
                            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-full border border-[#dadce0] dark:border-[#3c4043] text-[#5f6368] hover:text-[#202124] dark:hover:text-white transition-colors cursor-pointer"
                            title="Preview story"
                            aria-label="Preview story"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="pt-2 border-t border-[#e0e3e7] dark:border-[#3c4043] text-xs text-[#3c4043] dark:text-[#dadce0] space-y-2">
                          <p className="leading-relaxed">
                            {fullArticle?.leadParagraph || item.headline}
                          </p>
                          <button
                            type="button"
                            onClick={() => onNavigate('/newsroom/editorial-queue')}
                            className="text-[#1a73e8] dark:text-[#8ab4f8] hover:underline font-semibold cursor-pointer"
                          >
                            Open full review →
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="rounded-2xl bg-white dark:bg-[#242629] border border-[#e0e3e7] dark:border-[#3c4043] divide-y divide-[#e0e3e7] dark:divide-[#3c4043] overflow-hidden">
              {articles.slice(0, 6).map((article) => (
                <button
                  key={article.articleId}
                  type="button"
                  onClick={() => onNavigate('/newsroom/news')}
                  className="w-full text-left p-4 hover:bg-[#f8fafd] dark:hover:bg-[#2e3135] transition-colors cursor-pointer flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs text-[#5f6368] dark:text-[#9aa0a6]">
                      <span className="font-medium text-[#1a73e8] dark:text-[#8ab4f8]">
                        {article.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{article.byline}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-[#202124] dark:text-[#f8f9fa] leading-snug line-clamp-2">
                      {article.headline}
                    </h4>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={article.editorialStatus} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Current Edition */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#242629] border border-[#e0e3e7] dark:border-[#3c4043] space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6]">
                Active Edition
              </span>
              <h3 className="text-base font-bold text-[#202124] dark:text-[#f8f9fa] truncate mt-0.5">
                {activeBrand.name}
              </h3>
            </div>
            <Printer className="w-5 h-5 text-[#1a73e8] dark:text-[#8ab4f8] shrink-0" />
          </div>

          <div className="divide-y divide-[#e0e3e7] dark:divide-[#3c4043] text-xs border-y border-[#e0e3e7] dark:border-[#3c4043]">
            <div className="py-2.5 flex items-center justify-between gap-2">
              <span className="text-[#5f6368] dark:text-[#9aa0a6]">Code</span>
              <span className="font-mono font-semibold text-[#202124] dark:text-[#f8f9fa]">
                {activeEdition?.editionCode || `${activeBrand.code}-${activeBrand.issueNumber}`}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-2">
              <span className="text-[#5f6368] dark:text-[#9aa0a6]">Format</span>
              <span className="font-medium text-[#202124] dark:text-[#f8f9fa] capitalize tabular-nums">
                {totalEditionPages} pages · {activeBrand.paperSize}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-2">
              <span className="text-[#5f6368] dark:text-[#9aa0a6]">Placed</span>
              <span className="font-semibold text-[#1e8e3e] dark:text-[#81c995] tabular-nums">
                {placedCount} stories
              </span>
            </div>
            {activeEdition?.printDeadline && (
              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-[#5f6368] dark:text-[#9aa0a6]">Deadline</span>
                <span className="font-semibold text-[#e37400] dark:text-[#fdd663] tabular-nums">
                  {formatTimeLeft(activeEdition.printDeadline)}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onNavigate('/newspaper/page-designer')}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Open Page Designer</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onNavigate('/newspaper/editions')}
                className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 rounded-full border border-[#dadce0] dark:border-[#3c4043] hover:bg-[#f8fafd] dark:hover:bg-[#2e3135] text-[#202124] dark:text-[#f8f9fa] text-xs font-medium transition-colors cursor-pointer"
              >
                <span>Build Edition</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('/newspaper/brands')}
                className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 rounded-full border border-[#dadce0] dark:border-[#3c4043] hover:bg-[#f8fafd] dark:hover:bg-[#2e3135] text-[#5f6368] dark:text-[#bdc1c6] text-xs font-medium transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Paper Setup</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <QuickStoryModal
        isOpen={isQuickStoryOpen}
        onClose={() => setIsQuickStoryOpen(false)}
        onStoryCreated={() => {
          reloadData();
          showToast('Story saved.');
        }}
      />
    </div>
  );
};
