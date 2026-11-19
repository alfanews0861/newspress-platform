/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Newspaper,
  Plus,
  Search,
  Filter,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  Megaphone,
  FileText,
  List,
  LayoutGrid,
  RotateCcw,
  SlidersHorizontal,
  ArrowUpDown
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { usePermission } from '../../hooks/usePermission';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { NewsArticle } from '../../types/news';
import { newsSubmissionService } from '../../services/newsSubmissionService';
import { AdvertisementUploadManager } from '../../components/advertising/AdvertisementUploadManager';

export const NewsPage: React.FC = () => {
  const { can } = usePermission();
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  const [activeMainTab, setActiveMainTab] = useState<'news_articles' | 'advertisements'>('news_articles');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEditorialStatus, setSelectedEditorialStatus] = useState<string>('all');
  const [selectedOriginality, setSelectedOriginality] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'words_desc'>('newest');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isNewArticleModalOpen, setIsNewArticleModalOpen] = useState(false);

  // New story modal state
  const [headline, setHeadline] = useState('');
  const [leadParagraph, setLeadParagraph] = useState('');
  const [category, setCategory] = useState('Metro & Transit');
  const [bodyContent, setBodyContent] = useState('');
  const [location, setLocation] = useState('Central District');
  const [modalError, setModalError] = useState<string | null>(null);

  const reload = () => {
    setArticles(newsSubmissionService.getArticles(currentTenant.tenantId));
  };

  useEffect(() => {
    reload();
  }, [currentTenant.tenantId]);

  const filteredArticles = articles
    .filter((a) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        a.headline.toLowerCase().includes(q) ||
        a.byline.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        (a.district && a.district.toLowerCase().includes(q)) ||
        (a.location && a.location.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === 'all' ||
        (selectedCategory === 'national' && (a.category.toLowerCase().includes('national') || a.category.includes('జాతీయం'))) ||
        (selectedCategory === 'state' && (a.category.toLowerCase().includes('state') || a.category.includes('రాష్ట్రీయం'))) ||
        (selectedCategory === 'district' && (a.category.toLowerCase().includes('district') || a.category.includes('జిల్లా'))) ||
        (selectedCategory === 'metro_transit' && a.category.toLowerCase().includes('metro')) ||
        (selectedCategory === 'city_hall' && a.category.toLowerCase().includes('city')) ||
        (selectedCategory === 'commerce' && (a.category.toLowerCase().includes('commerce') || a.category.toLowerCase().includes('shipping'))) ||
        (selectedCategory === 'investigative' && a.category.toLowerCase().includes('investigat')) ||
        a.category.toLowerCase() === selectedCategory.toLowerCase();

      const matchesStatus =
        selectedEditorialStatus === 'all' || a.editorialStatus === selectedEditorialStatus;

      const matchesOriginality =
        selectedOriginality === 'all' ||
        (a.originalityStatus && a.originalityStatus.toLowerCase() === selectedOriginality.toLowerCase());

      return matchesSearch && matchesCategory && matchesStatus && matchesOriginality;
    })
    .sort((a, b) => {
      if (sortBy === 'oldest') {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      }
      if (sortBy === 'words_desc') {
        return (b.wordCount || 0) - (a.wordCount || 0);
      }
      return new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime();
    });

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'all' ||
    selectedEditorialStatus !== 'all' ||
    selectedOriginality !== 'all' ||
    sortBy !== 'newest';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedEditorialStatus('all');
    setSelectedOriginality('all');
    setSortBy('newest');
  };

  const categories = [
    { id: 'all', label: 'All Desks' },
    { id: 'national', label: 'National' },
    { id: 'state', label: 'State' },
    { id: 'district', label: 'District News' },
    { id: 'metro_transit', label: 'Metro & Transit' },
    { id: 'city_hall', label: 'City Hall' },
    { id: 'commerce', label: 'Commerce & Shipping' },
    { id: 'investigative', label: 'Investigative' }
  ];

  const handleCreateArticle = async () => {
    if (!headline || !leadParagraph) return;
    setModalError(null);

    try {
      await newsSubmissionService.submitNews({
        articleId: (await newsSubmissionService.createDraft({
          tenantId: currentTenant.tenantId,
          authorId: user?.uid || 'user-sofia-chen',
          byline: user?.displayName || 'Sofia Chen',
          headline,
          summary: leadParagraph,
          leadParagraph,
          bodyContent: bodyContent || leadParagraph,
          category,
          location,
          reporterDeclaration: 'original_field_report'
        })).articleId,
        reporterId: user?.uid || 'user-sofia-chen',
        declaration: 'original_field_report',
        clientCapturedAt: new Date().toISOString()
      });

      reload();
      setIsNewArticleModalOpen(false);
      setHeadline('');
      setLeadParagraph('');
      setBodyContent('');
    } catch (err: any) {
      setModalError(`Error creating article: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="News Dispatch & Wire"
        subtitle={`Tenant-scoped newsroom story pipeline for ${currentTenant.organizationName}. Stories undergo algorithmic originality indexing and multi-factor verification prior to publishing.`}
        breadcrumbs={[
          { label: 'Newsroom', href: '#' },
          { label: 'News Dispatch' },
        ]}
        actions={
          activeMainTab === 'news_articles' && can('news.create') ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsNewArticleModalOpen(true)}
            >
              Draft New Story
            </Button>
          ) : undefined
        }
      />

      {/* Main Switcher: News Stories Wire vs. Advertisements Upload Tab */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveMainTab('news_articles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeMainTab === 'news_articles'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>News Stories & Wire</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-white/20 text-white">
            {articles.length}
          </span>
        </button>

        <button
          onClick={() => setActiveMainTab('advertisements')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeMainTab === 'advertisements'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Advertisements Desk</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-white/20 text-white">
            New
          </span>
        </button>
      </div>

      {/* RENDER ADVERTISEMENTS DESK WHEN TAB IS ACTIVE */}
      {activeMainTab === 'advertisements' ? (
        <AdvertisementUploadManager />
      ) : (
        <>
          {/* Enhanced Filter and Control Toolbar */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            {/* Top Row: Search and Category Pills */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="w-full lg:w-80 shrink-0">
                <Input
                  placeholder="Search headline, reporter byline, district..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                />
              </div>

              {/* Categories / Desks Rail */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-sans font-medium transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                      selectedCategory === cat.id
                        ? 'bg-blue-600 text-white shadow-xs font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Row: Secondary Filters (Status, Originality, Sort, Reset, View Mode Toggle) */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {/* Editorial Status Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Status:</span>
                  <select
                    value={selectedEditorialStatus}
                    onChange={(e) => setSelectedEditorialStatus(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="submitted">Submitted</option>
                    <option value="in_review">In Review</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>

                {/* Originality Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Originality:</span>
                  <select
                    value={selectedOriginality}
                    onChange={(e) => setSelectedOriginality(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="all">All Originality</option>
                    <option value="verified_original">Verified Original</option>
                    <option value="pending">Pending</option>
                    <option value="flagged_plagiarism">Flagged Plagiarism</option>
                  </select>
                </div>

                {/* Sort selector */}
                <div className="flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="words_desc">Longest (Word Count)</option>
                  </select>
                </div>

                {/* Reset Button */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 hover:underline px-2 py-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 ml-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Compact List View"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>List View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Grid View</span>
                </button>
              </div>
            </div>
          </div>

          {/* Results Count Banner */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <span>
              Showing <strong className="text-slate-800 dark:text-slate-200 font-semibold">{filteredArticles.length}</strong> of {articles.length} news stories
              {hasActiveFilters && ' (filtered)'}
            </span>
            <span className="text-[11px] text-slate-400">
              Mode: {viewMode === 'list' ? 'Compact List Items' : 'Standard Grid Cards'}
            </span>
          </div>

          {/* Articles Display: List View (Compact small boxes) vs Grid View */}
          {filteredArticles.length === 0 ? (
            <div className="text-center py-12 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <Newspaper className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No stories match your filter</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try adjusting your search query, desk category or editorial status.</p>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="mt-3 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : viewMode === 'list' ? (
            /* COMPACT LIST ITEMS (చిన్న బాక్సులు) */
            <div className="space-y-3">
              {filteredArticles.map((article) => (
                <div
                  key={article.articleId}
                  className="p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-500 transition-all shadow-xs hover:shadow-sm flex flex-col sm:flex-row gap-4 items-start font-sans"
                >
                  {/* Small Thumbnail */}
                  {article.imageUrl ? (
                    <div className="w-full sm:w-32 h-28 sm:h-24 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 relative group">
                      <img
                        src={article.imageUrl}
                        alt={article.headline}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {article.district && (
                        <span className="absolute bottom-1 left-1 bg-black/75 backdrop-blur-xs text-[10px] text-white px-1.5 py-0.5 rounded font-sans flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5" /> {article.district}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="w-full sm:w-32 h-20 sm:h-24 rounded-lg shrink-0 border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center text-slate-400">
                      <Newspaper className="w-5 h-5 stroke-1 mb-1 text-slate-400" />
                      <span className="text-[10px] text-slate-400">No Photo</span>
                    </div>
                  )}

                  {/* Main Details */}
                  <div className="flex-1 min-w-0 space-y-1.5 w-full">
                    {/* Badges line */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <Badge variant="primary" size="sm">
                        {article.category}
                      </Badge>
                      <StatusBadge status={article.editorialStatus} />
                      <StatusBadge status={article.originalityStatus || 'UNVERIFIED'} />
                      {article.district && !article.imageUrl && (
                        <span className="inline-flex items-center text-xs font-semibold text-blue-700 dark:text-blue-400 gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{article.district}</span>
                          {article.state && <span className="text-slate-400 font-normal">({article.state})</span>}
                        </span>
                      )}
                      {article.isMarketplaceEligible && (
                        <span className="ml-auto text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                          Marketplace Eligible
                        </span>
                      )}
                    </div>

                    {/* Headline */}
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-sans leading-snug line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      {article.headline}
                    </h3>

                    {/* Lead Excerpt */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-1 sm:line-clamp-2 font-normal font-sans">
                      {article.leadParagraph}
                    </p>

                    {/* Footer Meta */}
                    <div className="pt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 flex-wrap gap-2 border-t border-slate-100 dark:border-slate-800/60 mt-2">
                      <div className="flex items-center gap-2 flex-wrap text-[11px]">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Byline: {article.byline}</span>
                        <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                        <span className="capitalize">{article.authorType} Reporter</span>
                        <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{article.wordCount} words</span>
                      </div>

                      {article.tags && article.tags.length > 0 && (
                        <div className="hidden sm:flex items-center gap-1">
                          {article.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                            >
                              #{tag}
                            </span>
                          ))}
                          {article.tags.length > 3 && (
                            <span className="text-[10px] text-slate-400">+{article.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* GRID VIEW (పెద్ద బాక్సులు) */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredArticles.map((article) => (
                <Card
                  key={article.articleId}
                  variant="default"
                  className="flex flex-col justify-between hover:border-slate-400 dark:hover:border-slate-700 transition-all hover:shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="primary" size="sm">
                        {article.category}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={article.editorialStatus} />
                        <StatusBadge status={article.originalityStatus || 'UNVERIFIED'} />
                      </div>
                    </div>

                    {article.imageUrl && (
                      <div className="relative w-full h-44 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                        <img
                          src={article.imageUrl}
                          alt={article.headline}
                          className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
                          loading="lazy"
                        />
                        {article.imageCaption && (
                          <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 backdrop-blur-xs text-[11px] text-slate-200 px-2 py-1 line-clamp-1 font-sans">
                            📷 {article.imageCaption}
                          </div>
                        )}
                      </div>
                    )}

                    {article.district && (
                      <div className="flex items-center text-xs font-semibold text-blue-700 dark:text-blue-400 gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{article.district}</span>
                        {article.state && <span className="text-slate-400">({article.state})</span>}
                      </div>
                    )}

                    <h3 className="text-base font-bold text-black dark:text-white font-sans leading-snug">
                      {article.headline}
                    </h3>

                    <p className="text-xs text-black dark:text-slate-300 leading-relaxed line-clamp-3 font-normal">
                      {article.leadParagraph}
                    </p>

                    <div className="pt-1 flex flex-wrap gap-1.5">
                      {article.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] font-sans px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-black dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-black dark:text-slate-400 font-sans">
                    <div>
                      <span className="text-black dark:text-white font-semibold">Byline: {article.byline}</span>
                      <span className="text-black dark:text-slate-400 block text-[11px] capitalize font-medium">{article.authorType} Reporter</span>
                    </div>
                    <div className="text-right">
                      <span className="text-black dark:text-slate-300 font-medium">{article.wordCount} words</span>
                      {article.isMarketplaceEligible && (
                        <span className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-400">Marketplace Eligible</span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* New Story Modal */}
      <Modal
        isOpen={isNewArticleModalOpen}
        onClose={() => setIsNewArticleModalOpen(false)}
        title="File Story Dispatch"
        subtitle={`Filing into ${currentTenant.organizationName} editorial desk`}
        maxWidth="xl"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsNewArticleModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateArticle}>
              Submit to Editorial Desk
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 font-medium">
              {modalError}
            </div>
          )}
          <Input
            label="Article Headline"
            placeholder="e.g. Municipal Transit Authority Approves Clean Fleet Timetable"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-black dark:text-slate-200">
                Editorial Desk / Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-black dark:text-slate-100 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-sans"
              >
                <option value="Metro & Transit">Metro & Transit</option>
                <option value="City Hall">City Hall</option>
                <option value="Commerce & Shipping">Commerce & Shipping</option>
                <option value="Investigative">Investigative</option>
                <option value="National">National</option>
              </select>
            </div>

            <Input
              label="Location / Landmark"
              placeholder="e.g. City Hall West Annex"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-black dark:text-slate-200">
              Lead Paragraph (Inverted Pyramid)
            </label>
            <textarea
              rows={3}
              placeholder="State the core news hook: who, what, when, where, and why..."
              value={leadParagraph}
              onChange={(e) => setLeadParagraph(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-black dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-sans transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-black dark:text-slate-200">
              Story Body & Sourced Quotes
            </label>
            <textarea
              rows={6}
              placeholder="Provide background context, attribution, documentary evidence, and secondary sources..."
              value={bodyContent}
              onChange={(e) => setBodyContent(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-black dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-sans transition-colors"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-xs text-black dark:text-blue-300 flex items-center gap-2.5 font-sans font-medium">
            <Sparkles className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span>
              All submissions undergo algorithmic originality indexing and metadata attribution checks upon desk submission.
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
};
