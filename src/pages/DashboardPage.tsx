/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Newspaper,
  Clock,
  Users,
  ShoppingBag,
  BookOpen,
  ArrowRight,
  Printer,
  CheckCircle2,
  XCircle,
  Plus,
  Eye,
  FileDown,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Youtube,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { QuickStoryModal } from '../components/editorial/QuickStoryModal';
import { useTenant } from '../hooks/useTenant';
import { useAuth } from '../hooks/useAuth';
import { usePermission } from '../hooks/usePermission';
import { formatDate, formatTimeLeft } from '../utils/formatters';
import {
  MOCK_NEWS_ARTICLES,
  MOCK_EDITORIAL_QUEUE,
  MOCK_CURRENT_EDITION,
} from '../services/mockDataService';
import { newsSubmissionService } from '../services/newsSubmissionService';
import { EditorialReviewItem, NewsArticle } from '../types/news';

export interface DashboardPageProps {
  onNavigate: (href: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { can } = usePermission();

  const [queueItems, setQueueItems] = useState<EditorialReviewItem[]>(MOCK_EDITORIAL_QUEUE);
  const [articles, setArticles] = useState<NewsArticle[]>(MOCK_NEWS_ARTICLES);
  const [isQuickStoryOpen, setIsQuickStoryOpen] = useState(false);
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'dispatches'>('queue');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const reloadData = () => {
    const freshArticles = newsSubmissionService.getArticles(currentTenant.tenantId);
    if (freshArticles && freshArticles.length > 0) {
      setArticles(freshArticles);
    }
  };

  useEffect(() => {
    reloadData();
    const handleStoryCreated = () => {
      reloadData();
      showToast('New story added to your newsroom feed!');
    };
    window.addEventListener('story_created', handleStoryCreated);
    return () => window.removeEventListener('story_created', handleStoryCreated);
  }, [currentTenant.tenantId]);

  // 1-Click Fast Approve
  const handleFastApprove = async (e: React.MouseEvent, item: EditorialReviewItem) => {
    e.stopPropagation();
    try {
      await newsSubmissionService.approveArticle(
        item.articleId,
        user?.uid || 'user-news-editor',
        'Fast approved directly from Newsroom Dashboard'
      );
      setQueueItems((prev) => prev.filter((q) => q.reviewId !== item.reviewId));
      reloadData();
      showToast(`✓ "${item.headline.slice(0, 35)}..." approved & published!`);
    } catch (err: any) {
      showToast(`Error approving story: ${err.message}`);
    }
  };

  // 1-Click Fast Reject
  const handleFastReject = async (e: React.MouseEvent, item: EditorialReviewItem) => {
    e.stopPropagation();
    try {
      await newsSubmissionService.rejectArticle(
        item.articleId,
        user?.uid || 'user-news-editor',
        'Returned for edits'
      );
      setQueueItems((prev) => prev.filter((q) => q.reviewId !== item.reviewId));
      reloadData();
      showToast(`Story returned to reporter for edits.`);
    } catch (err: any) {
      showToast(`Error updating story: ${err.message}`);
    }
  };

  // 1-Click Print PDF Download
  const handleDownloadPDF = () => {
    showToast(`Downloading print-ready PDF for ${MOCK_CURRENT_EDITION.editionCode}...`);
    setTimeout(() => {
      onNavigate('/production/downloads');
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold border border-slate-700 transition-opacity duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Welcome & Quick Actions Bar (Clean Google Style Card) */}
      <div className="bg-white dark:bg-[#28292a] border border-[#dadce0] dark:border-[#444746] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold bg-[#e8f0fe] dark:bg-[#004a77] text-[#1a73e8] dark:text-[#a8c7fa] px-3 py-0.5 rounded-full border border-[#d2e3fc] dark:border-[#1a73e8]">
              {currentTenant.organizationName}
            </span>
            <span className="text-xs text-[#5f6368] dark:text-[#8e918f]">• Simple Console</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#202124] dark:text-[#f2f2f2] mt-1.5">
            Welcome back, {user?.displayName || 'Chief Editor'}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] dark:text-[#c4c7c5] mt-1 max-w-xl font-normal">
            Everything you need in one place. File stories, approve reporters' dispatches in 1 click, and download today's print paper.
          </p>
        </div>

        {/* Minimal Effort 1-Click Action Buttons (Google Style Pills) */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            onClick={() => onNavigate('/newsroom/youtube-studio')}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#fce8e6] hover:bg-[#fad2cf] text-[#d93025] dark:bg-[#3c1410] dark:text-[#f28b82] font-medium text-xs border border-[#f5c2c7] dark:border-[#d93025] transition-all cursor-pointer"
          >
            <Youtube className="w-4 h-4 text-[#d93025]" />
            <span>YouTube Studio</span>
          </button>

          <button
            onClick={() => setIsQuickStoryOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium text-xs shadow-none hover:shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Write New Story</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-[#1f1f1f] hover:bg-[#f8fafd] border border-[#dadce0] dark:border-[#444746] text-[#1a73e8] dark:text-[#a8c7fa] font-medium text-xs transition-all cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>Download Paper PDF</span>
          </button>
        </div>
      </div>

      {/* 4 Focused Key Metric Cards (Google 4-Color Brand Design) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Dispatches (Google Blue) */}
        <div
          onClick={() => onNavigate('/newsroom/news')}
          className="p-5 rounded-2xl bg-white dark:bg-[#28292a] border border-[#dadce0] dark:border-[#444746] shadow-xs hover:border-[#bdc1c6] hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#5f6368] dark:text-[#8e918f]">Today's Stories</span>
            <div className="p-2 rounded-full bg-[#e8f0fe] dark:bg-[#004a77] text-[#1a73e8] dark:text-[#a8c7fa]">
              <Newspaper className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202124] dark:text-[#f2f2f2] mt-2">
            {articles.length} Stories
          </div>
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#dadce0] dark:border-[#444746] text-xs text-[#5f6368] dark:text-[#8e918f]">
            <span>+18% from yesterday</span>
            <span className="text-[#1a73e8] dark:text-[#8ab4f8] font-medium group-hover:translate-x-0.5 transition-transform flex items-center">
              View <ArrowRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>

        {/* Card 2: Pending Approvals (Google Yellow) */}
        <div
          onClick={() => setActiveTab('queue')}
          className="p-5 rounded-2xl bg-white dark:bg-[#28292a] border border-[#dadce0] dark:border-[#444746] shadow-xs hover:border-[#bdc1c6] hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#5f6368] dark:text-[#8e918f]">Needs Your Review</span>
            <div className="p-2 rounded-full bg-[#fef7e0] dark:bg-[#382c00] text-[#f9ab00] dark:text-[#fdd663]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202124] dark:text-[#f2f2f2] mt-2 flex items-center gap-2">
            <span>{queueItems.length} Stories</span>
            {queueItems.length > 0 && (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#fef7e0] text-[#b06000] dark:bg-[#382c00] dark:text-[#fdd663] font-medium border border-[#fce8b2]">
                Action Needed
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#dadce0] dark:border-[#444746] text-xs text-[#5f6368] dark:text-[#8e918f]">
            <span>1-click approve below</span>
            <span className="text-[#f9ab00] dark:text-[#fdd663] font-medium group-hover:translate-x-0.5 transition-transform flex items-center">
              Review <ArrowRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>

        {/* Card 3: Today's Edition (Google Green) */}
        <div
          onClick={() => onNavigate('/newspaper/editions')}
          className="p-5 rounded-2xl bg-white dark:bg-[#28292a] border border-[#dadce0] dark:border-[#444746] shadow-xs hover:border-[#bdc1c6] hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#5f6368] dark:text-[#8e918f]">Today's Print Paper</span>
            <div className="p-2 rounded-full bg-[#e6f4ea] dark:bg-[#0d2818] text-[#1e8e3e] dark:text-[#81c995]">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202124] dark:text-[#f2f2f2] mt-2">
            Issue #{MOCK_CURRENT_EDITION.issueNumber}
          </div>
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#dadce0] dark:border-[#444746] text-xs text-[#5f6368] dark:text-[#8e918f]">
            <span className="text-[#1e8e3e] dark:text-[#81c995] font-medium">{formatTimeLeft(MOCK_CURRENT_EDITION.printDeadline)}</span>
            <span className="text-[#1e8e3e] dark:text-[#81c995] font-medium group-hover:translate-x-0.5 transition-transform flex items-center">
              Open <ArrowRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>

        {/* Card 4: Syndication Revenue (Google Red) */}
        <div
          onClick={() => onNavigate('/marketplace')}
          className="p-5 rounded-2xl bg-white dark:bg-[#28292a] border border-[#dadce0] dark:border-[#444746] shadow-xs hover:border-[#bdc1c6] hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#5f6368] dark:text-[#8e918f]">Wire & Syndication</span>
            <div className="p-2 rounded-full bg-[#fce8e6] dark:bg-[#3c1410] text-[#d93025] dark:text-[#f28b82]">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202124] dark:text-[#f2f2f2] mt-2">
            ₹3,420
          </div>
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#dadce0] dark:border-[#444746] text-xs text-[#5f6368] dark:text-[#8e918f]">
            <span>18 active licenses</span>
            <span className="text-[#d93025] dark:text-[#f28b82] font-medium group-hover:translate-x-0.5 transition-transform flex items-center">
              Market <ArrowRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Stories Needing Review (Instant 1-Click Approvals) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-[#dadce0] dark:border-[#444746] pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('queue')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'queue'
                    ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#004a77] dark:text-[#a8c7fa] font-semibold shadow-xs'
                    : 'text-[#5f6368] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#28292a]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1e8e3e]" />
                <span>Pending Review</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'queue' ? 'bg-[#1a73e8] text-white' : 'bg-[#f1f3f4] dark:bg-[#333537] text-[#3c4043] dark:text-[#e3e3e3]'}`}>
                  {queueItems.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('dispatches')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'dispatches'
                    ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#004a77] dark:text-[#a8c7fa] font-semibold shadow-xs'
                    : 'text-[#5f6368] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#28292a]'
                }`}
              >
                <Newspaper className="w-3.5 h-3.5" />
                <span>Published Dispatches</span>
              </button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate(activeTab === 'queue' ? '/newsroom/editorial-queue' : '/newsroom/news')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Full Page View
            </Button>
          </div>

          {activeTab === 'queue' ? (
            <div className="space-y-3">
              {queueItems.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#1a1b1e] border border-slate-200 dark:border-slate-800 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    All caught up! No stories pending review.
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    All reporter submissions have been reviewed and approved for today's edition.
                  </p>
                </div>
              ) : (
                queueItems.map((item) => {
                  const isExpanded = expandedStoryId === item.reviewId;
                  return (
                    <div
                      key={item.reviewId}
                      className="p-4 rounded-xl bg-white dark:bg-[#1a1b1e] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-md">
                              {item.desk}
                            </span>
                            <span className="text-xs text-slate-500">
                              By <strong>{item.authorName}</strong>
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs text-slate-500">{item.wordCount} words</span>
                            {item.priority === 'urgent' && (
                              <span className="text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 px-1.5 py-0.2 rounded-md">
                                Urgent
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                            {item.headline}
                          </h3>
                        </div>

                        {/* 1-Click Fast Actions (Minimal user effort!) */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => handleFastApprove(e, item)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                            title="Approve and Publish immediately"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>

                          <button
                            onClick={(e) => handleFastReject(e, item)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Return to reporter for edits"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setExpandedStoryId(isExpanded ? null : item.reviewId)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                            title="Preview story excerpt"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Excerpt Preview */}
                      {isExpanded && (
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 space-y-2 transition-all">
                          <p className="font-serif italic leading-relaxed">
                            "{item.headline} — City transportation directors have verified that modern signal relays and platform automation have been deployed across primary transit routes..."
                          </p>
                          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                            <span>Originality: <strong className="text-emerald-600 font-semibold">98% Verified Field Report</strong></span>
                            <button
                              onClick={() => onNavigate('/newsroom/editorial-queue')}
                              className="text-blue-600 hover:underline font-medium cursor-pointer"
                            >
                              Open Advanced Inspector →
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
            <div className="rounded-xl bg-white dark:bg-[#1a1b1e] border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {articles.slice(0, 6).map((article) => (
                <div
                  key={article.articleId}
                  onClick={() => onNavigate('/newsroom/news')}
                  className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {article.category}
                      </span>
                      <span className="text-xs text-slate-500">By {article.byline}</span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                      {article.headline}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-1">
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

        {/* Right 1 Col: Today's Print Edition Status (1-Click PDF Download) */}
        <div className="space-y-5">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#1a1b1e] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Today's Print Edition
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                  {MOCK_CURRENT_EDITION.brandName}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                <Printer className="w-5 h-5" />
              </div>
            </div>

            {/* Edition Specs Pill */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Issue Code:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {MOCK_CURRENT_EDITION.editionCode}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Print Lock Deadline:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  10:30 PM (Tonight)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Specs:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">
                  {MOCK_CURRENT_EDITION.pressSpecs.format} • CMYK 300 DPI
                </span>
              </div>
            </div>

            {/* Layout Progress */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-600 dark:text-slate-400">Pages Completed</span>
                <span className="text-emerald-600 font-bold">
                  {MOCK_CURRENT_EDITION.placedArticlesCount} / {MOCK_CURRENT_EDITION.totalPages} Pages (100%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-full" />
              </div>
            </div>

            {/* Direct 1-Click Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleDownloadPDF}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                <span>Download Print Ready PDF</span>
              </button>

              <button
                onClick={() => onNavigate('/newspaper/page-designer')}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                <span>Open Page Designer</span>
              </button>
            </div>
          </div>

          {/* Quick Newsroom Tip / Stats */}
          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-bold">
              <Sparkles className="w-4 h-4" />
              <span>Newsroom Pro Tip</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              You can file a new story from any screen by clicking <strong>"+ Write Story"</strong> in the top header. Approved stories automatically flow to tonight's print layout!
            </p>
          </div>
        </div>
      </div>

      {/* Quick Story Modal */}
      <QuickStoryModal
        isOpen={isQuickStoryOpen}
        onClose={() => setIsQuickStoryOpen(false)}
        onStoryCreated={() => {
          reloadData();
          showToast('New story published successfully!');
        }}
      />
    </div>
  );
};
