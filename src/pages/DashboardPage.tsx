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
  Sparkles,
  ChevronDown,
  ChevronUp,
  Youtube,
  UploadCloud,
  Sliders,
} from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
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
    setTimeout(() => setToastMessage(null), 3500);
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
      showToast('New story saved to your newsroom.');
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
  const ytSettings = YouTubeService.getSettings();

  const approvedOwnCount = articles.filter((a) =>
    ['approved', 'published', 'marketplace_listed'].includes(a.editorialStatus)
  ).length;
  const totalReadyForPaper = approvedOwnCount + purchasedCount;
  const targetStoryCount = Math.max(8, (activeBrand.pageCount || 4) * 5);
  const storyShortfall = Math.max(0, targetStoryCount - totalReadyForPaper);

  const handleFastApprove = async (e: React.MouseEvent, item: EditorialReviewItem) => {
    e.stopPropagation();
    try {
      await newsSubmissionService.approveArticle(
        item.articleId,
        user?.uid || 'user-news-editor',
        'Approved from Dashboard'
      );
      reloadData();
      showToast(`Approved "${item.headline.slice(0, 36)}..."`);
    } catch (err: any) {
      showToast(`Could not approve story: ${err.message}`);
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
      showToast('Story returned to reporter for edits.');
    } catch (err: any) {
      showToast(`Could not update story: ${err.message}`);
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
    <div className="space-y-6 max-w-7xl mx-auto" key={refreshTick}>
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar: Clean Workspace Greeting & Direct 1-Click Actions */}
      <div className="bg-white dark:bg-[#28292a] border border-[#dadce0] dark:border-[#444746] rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] uppercase tracking-wider font-semibold bg-[#e8f0fe] dark:bg-[#004a77] text-[#1a73e8] dark:text-[#a8c7fa] px-3 py-0.5 rounded-full border border-[#d2e3fc] dark:border-[#1a73e8]">
              {currentTenant.organizationName}
            </span>
            <span className="text-xs text-[#5f6368] dark:text-[#8e918f]">
              Paper: <strong className="text-[#202124] dark:text-[#f2f2f2]">{activeBrand.name}</strong>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#202124] dark:text-[#f2f2f2] mt-1.5">
            Welcome back, {user?.displayName || 'Editor'}
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] dark:text-[#c4c7c5] mt-1 max-w-2xl">
            Publish YouTube news bulletins, assemble reporter stories into your newspaper, or buy & sell verified stories in the Marketplace. Your channel and paper settings stay saved automatically.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap w-full md:w-auto shrink-0">
          <button
            onClick={() => onNavigate('/newsroom/youtube-studio')}
            className="flex-1 sm:flex-none justify-center inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-[#fce8e6] hover:bg-[#fad2cf] text-[#d93025] dark:bg-[#3c1410] dark:text-[#f28b82] font-medium text-xs border border-[#f5c2c7] dark:border-[#d93025] transition-all cursor-pointer whitespace-nowrap"
          >
            <Youtube className="w-4 h-4 text-[#d93025]" />
            <span>Create YouTube Video</span>
          </button>

          <button
            onClick={() => setIsQuickStoryOpen(true)}
            className="flex-1 sm:flex-none justify-center inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium text-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Write Story</span>
          </button>

          <button
            onClick={() => onNavigate('/newspaper/page-designer')}
            className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-white dark:bg-[#1f1f1f] hover:bg-[#f8fafd] border border-[#dadce0] dark:border-[#444746] text-[#1a73e8] dark:text-[#a8c7fa] font-medium text-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <BookOpen className="w-4 h-4" />
            <span>Read Newspaper</span>
          </button>
        </div>
      </div>

      {/* 4 Core Workflow Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. YouTube News Video */}
        <div
          onClick={() => onNavigate('/newsroom/youtube-studio')}
          className="p-5 rounded-2xl bg-white dark:bg-[#28292a] border border-[#dadce0] dark:border-[#444746] shadow-xs hover:border-[#bdc1c6] hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#5f6368] dark:text-[#a8aaad]">
                YouTube News Studio
              </span>
              <div className="p-2 rounded-full bg-[#fce8e6] dark:bg-[#3c1410] text-[#d93025] dark:text-[#f28b82]">
                <Youtube className="w-4 h-4" />
              </div>
            </div>
            <div className="text-base font-bold text-[#202124] dark:text-[#f2f2f2] mt-2 truncate">
              {ytAccount.isConnected ? ytAccount.channelTitle || 'Channel Connected' : 'Connect Channel Once'}
            </div>
            <p className="text-[11px] text-[#5f6368] dark:text-[#a8aaad] mt-1">
              Voice: {ytSettings.voiceGender} • {ytSettings.defaultLanguage.toUpperCase()} • Logo & intro remembered
            </p>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#dadce0] dark:border-[#444746] text-xs">
            <span className="text-[#5f6368] dark:text-[#a8aaad]">
              {ytAccount.isConnected ? 'Ready to publish' : 'One-time setup'}
            </span>
            <span className="text-[#d93025] dark:text-[#f28b82] font-medium flex items-center group-hover:translate-x-0.5 transition-transform">
              Open <ArrowRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>

        {/* 2. Newspaper Builder */}
        <div
          onClick={() => onNavigate('/newspaper/editions')}
          className="p-5 rounded-2xl bg-white dark:bg-[#28292a] border border-[#dadce0] dark:border-[#444746] shadow-xs hover:border-[#bdc1c6] hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#5f6368] dark:text-[#a8aaad]">
                Newspaper Assembly
              </span>
              <div className="p-2 rounded-full bg-[#e6f4ea] dark:bg-[#0d2818] text-[#1e8e3e] dark:text-[#81c995]">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="text-base font-bold text-[#202124] dark:text-[#f2f2f2] mt-2">
              {totalReadyForPaper} / {targetStoryCount} Stories Ready
            </div>
            <p className="text-[11px] text-[#5f6368] dark:text-[#a8aaad] mt-1">
              {storyShortfall > 0
                ? `Short by ${storyShortfall} stories — fill from Marketplace`
                : 'Full edition ready to assemble & read'}
            </p>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#dadce0] dark:border-[#444746] text-xs">
            <span className="text-[#1e8e3e] dark:text-[#81c995] font-medium">
              {activeBrand.pageCount || 4} pages • {activeBrand.paperSize}
            </span>
            <span className="text-[#1e8e3e] dark:text-[#81c995] font-medium flex items-center group-hover:translate-x-0.5 transition-transform">
              Build <ArrowRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>

        {/* 3. Stories & Reporters */}
        <div
          onClick={() => onNavigate('/newsroom/news')}
          className="p-5 rounded-2xl bg-white dark:bg-[#28292a] border border-[#dadce0] dark:border-[#444746] shadow-xs hover:border-[#bdc1c6] hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#5f6368] dark:text-[#a8aaad]">
                Newsroom Stories
              </span>
              <div className="p-2 rounded-full bg-[#e8f0fe] dark:bg-[#004a77] text-[#1a73e8] dark:text-[#a8c7fa]">
                <Newspaper className="w-4 h-4" />
              </div>
            </div>
            <div className="text-base font-bold text-[#202124] dark:text-[#f2f2f2] mt-2">
              {articles.length} Total Stories
            </div>
            <p className="text-[11px] text-[#5f6368] dark:text-[#a8aaad] mt-1">
              {queueItems.length > 0
                ? `${queueItems.length} reporter dispatches waiting for review`
                : `${approvedOwnCount} approved stories ready`}
            </p>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#dadce0] dark:border-[#444746] text-xs">
            <span className="text-[#5f6368] dark:text-[#a8aaad]">Reporters & Desk</span>
            <span className="text-[#1a73e8] dark:text-[#8ab4f8] font-medium flex items-center group-hover:translate-x-0.5 transition-transform">
              Manage <ArrowRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>

        {/* 4. Independent Reporter Marketplace */}
        <div
          onClick={() => onNavigate('/marketplace')}
          className="p-5 rounded-2xl bg-white dark:bg-[#28292a] border border-[#dadce0] dark:border-[#444746] shadow-xs hover:border-[#bdc1c6] hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#5f6368] dark:text-[#a8aaad]">
                News Marketplace
              </span>
              <div className="p-2 rounded-full bg-[#fef7e0] dark:bg-[#382c00] text-[#b06000] dark:text-[#fdd663]">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-base font-bold text-[#202124] dark:text-[#f2f2f2] mt-2">
              {marketplaceListingsCount} Available Stories
            </div>
            <p className="text-[11px] text-[#5f6368] dark:text-[#a8aaad] mt-1">
              {purchasedCount} licensed in your paper • Reporters can publish & earn
            </p>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#dadce0] dark:border-[#444746] text-xs">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('/marketplace/my-listings');
              }}
              className="inline-flex items-center gap-1 text-[#1a73e8] dark:text-[#8ab4f8] font-medium hover:underline cursor-pointer"
            >
              <UploadCloud className="w-3 h-3" />
              Sell Story
            </button>
            <span className="text-[#b06000] dark:text-[#fdd663] font-medium flex items-center group-hover:translate-x-0.5 transition-transform">
              Browse <ArrowRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Reporter Review & Published Stories */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-[#dadce0] dark:border-[#444746] pb-3 gap-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setActiveTab('queue')}
                className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeTab === 'queue'
                    ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#004a77] dark:text-[#a8c7fa] font-semibold'
                    : 'text-[#5f6368] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#28292a]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1e8e3e]" />
                <span>Pending Review</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] ${
                    activeTab === 'queue'
                      ? 'bg-[#1a73e8] text-white'
                      : 'bg-[#f1f3f4] dark:bg-[#333537] text-[#3c4043] dark:text-[#e3e3e3]'
                  }`}
                >
                  {queueItems.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('dispatches')}
                className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeTab === 'dispatches'
                    ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#004a77] dark:text-[#a8c7fa] font-semibold'
                    : 'text-[#5f6368] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#28292a]'
                }`}
              >
                <Newspaper className="w-3.5 h-3.5" />
                <span>Latest Stories ({articles.length})</span>
              </button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                onNavigate(activeTab === 'queue' ? '/newsroom/editorial-queue' : '/newsroom/news')
              }
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="self-end sm:self-auto text-xs"
            >
              View All
            </Button>
          </div>

          {activeTab === 'queue' ? (
            <div className="space-y-3">
              {queueItems.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#28292a] border border-[#dadce0] dark:border-[#444746] space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <h3 className="text-sm font-bold text-[#202124] dark:text-[#f2f2f2]">
                    No stories pending review
                  </h3>
                  <p className="text-xs text-[#5f6368] dark:text-[#a8aaad] max-w-sm mx-auto">
                    All submitted reporter dispatches are reviewed. Write a new story or assemble your newspaper edition.
                  </p>
                </div>
              ) : (
                queueItems.map((item) => {
                  const isExpanded = expandedStoryId === item.reviewId;
                  const fullArticle = articles.find((a) => a.articleId === item.articleId);
                  return (
                    <div
                      key={item.reviewId}
                      className="p-4 rounded-xl bg-white dark:bg-[#28292a] border border-[#dadce0] dark:border-[#444746] shadow-xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-[#1a73e8] dark:text-[#8ab4f8] bg-[#e8f0fe] dark:bg-[#004a77] px-2 py-0.5 rounded-md">
                              {item.desk}
                            </span>
                            <span className="text-xs text-[#5f6368] dark:text-[#a8aaad]">
                              By <strong className="text-[#202124] dark:text-[#f2f2f2]">{item.authorName}</strong>
                            </span>
                            <span className="text-xs text-[#5f6368] dark:text-[#a8aaad]">
                              • {item.wordCount} words
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-[#202124] dark:text-[#f2f2f2] leading-snug">
                            {item.headline}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                          <button
                            onClick={(e) => handleFastApprove(e, item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                            title="Approve story"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>

                          <button
                            onClick={(e) => handleFastReject(e, item)}
                            className="p-1.5 rounded-lg border border-[#dadce0] dark:border-[#444746] text-[#5f6368] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Return for edits"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setExpandedStoryId(isExpanded ? null : item.reviewId)}
                            className="p-1.5 rounded-lg border border-[#dadce0] dark:border-[#444746] text-[#5f6368] hover:text-[#202124] dark:hover:text-white transition-colors cursor-pointer"
                            title="Preview story"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-3 rounded-lg bg-[#f8fafd] dark:bg-[#1f1f1f] border border-[#dadce0] dark:border-[#444746] text-xs text-[#3c4043] dark:text-[#c4c7c5] space-y-2">
                          <p className="leading-relaxed">
                            {fullArticle?.leadParagraph || item.headline}
                          </p>
                          <div className="flex items-center justify-between pt-1 text-[11px] text-[#5f6368]">
                            <span>Status: {item.originalityStatus}</span>
                            <button
                              onClick={() => onNavigate('/newsroom/editorial-queue')}
                              className="text-[#1a73e8] hover:underline font-medium cursor-pointer"
                            >
                              Open Full Review →
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-white dark:bg-[#28292a] border border-[#dadce0] dark:border-[#444746] divide-y divide-[#dadce0] dark:divide-[#444746] overflow-hidden">
              {articles.slice(0, 6).map((article) => (
                <div
                  key={article.articleId}
                  onClick={() => onNavigate('/newsroom/news')}
                  className="p-3.5 hover:bg-[#f8fafd] dark:hover:bg-[#333537] transition-colors cursor-pointer flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] dark:text-[#a8aaad] bg-[#f1f3f4] dark:bg-[#1f1f1f] px-2 py-0.5 rounded-md">
                        {article.category}
                      </span>
                      <span className="text-xs text-[#5f6368] dark:text-[#a8aaad]">By {article.byline}</span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-semibold text-[#202124] dark:text-[#f2f2f2] leading-snug">
                      {article.headline}
                    </h4>
                    <p className="text-xs text-[#5f6368] dark:text-[#a8aaad] line-clamp-1">
                      {article.leadParagraph}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusBadge status={article.editorialStatus} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Active Print Edition Summary */}
        <div className="space-y-5">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#28292a] border border-[#dadce0] dark:border-[#444746] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#5f6368] dark:text-[#a8aaad] uppercase tracking-wider">
                  Current Newspaper
                </span>
                <h3 className="text-base font-bold text-[#202124] dark:text-[#f2f2f2] mt-0.5">
                  {activeBrand.name}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-[#e8f0fe] dark:bg-[#004a77] text-[#1a73e8] dark:text-[#a8c7fa]">
                <Printer className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#f8fafd] dark:bg-[#1f1f1f] border border-[#dadce0] dark:border-[#444746] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#5f6368] dark:text-[#a8aaad]">Edition:</span>
                <span className="font-mono font-bold text-[#202124] dark:text-[#f2f2f2]">
                  {activeEdition?.editionCode || `${activeBrand.code}-${activeBrand.issueNumber}`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5f6368] dark:text-[#a8aaad]">Pages & Format:</span>
                <span className="font-medium text-[#202124] dark:text-[#f2f2f2] capitalize">
                  {totalEditionPages} pages • {activeBrand.paperSize}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5f6368] dark:text-[#a8aaad]">Placed Stories:</span>
                <span className="font-semibold text-[#1e8e3e] dark:text-[#81c995]">
                  {placedCount} placed
                </span>
              </div>
              {activeEdition?.printDeadline && (
                <div className="flex items-center justify-between">
                  <span className="text-[#5f6368] dark:text-[#a8aaad]">Print Deadline:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {formatTimeLeft(activeEdition.printDeadline)}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => onNavigate('/newspaper/page-designer')}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-bold transition-all cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Open Readable Newspaper</span>
              </button>

              <button
                onClick={() => onNavigate('/newspaper/editions')}
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-[#dadce0] dark:border-[#444746] hover:bg-[#f8fafd] dark:hover:bg-[#333537] text-[#202124] dark:text-[#f2f2f2] text-xs font-semibold transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#1a73e8]" />
                <span>Assemble / Fill Shortfall</span>
              </button>

              <button
                onClick={() => onNavigate('/newspaper/brands')}
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-[#5f6368] dark:text-[#a8aaad] hover:bg-[#f1f3f4] dark:hover:bg-[#333537] text-xs font-medium transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Change Paper & Masthead Settings</span>
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
          showToast('New story saved and ready.');
        }}
      />
    </div>
  );
};
