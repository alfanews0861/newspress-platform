/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Newspaper,
  Plus,
  Search,
  Megaphone,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
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
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'words_desc'>('newest');
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

      return matchesSearch && matchesCategory && matchesStatus;
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
    sortBy !== 'newest';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedEditorialStatus('all');
    setSortBy('newest');
  };

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'national', label: 'National' },
    { id: 'state', label: 'State' },
    { id: 'district', label: 'District' },
    { id: 'metro_transit', label: 'Metro' },
    { id: 'city_hall', label: 'City' },
    { id: 'commerce', label: 'Business' },
    { id: 'investigative', label: 'Investigative' },
  ];

  const handleCreateArticle = async () => {
    if (!headline.trim() || !leadParagraph.trim()) {
      setModalError('Headline and lead paragraph are required.');
      return;
    }
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
          reporterDeclaration: 'original_field_report',
        })).articleId,
        reporterId: user?.uid || 'user-sofia-chen',
        declaration: 'original_field_report',
        clientCapturedAt: new Date().toISOString(),
      });

      reload();
      setIsNewArticleModalOpen(false);
      setHeadline('');
      setLeadParagraph('');
      setBodyContent('');
    } catch (err: any) {
      setModalError(err?.message || 'Could not submit story.');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Stories"
        subtitle={currentTenant.organizationName}
        actions={
          activeMainTab === 'news_articles' && can('news.create') ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsNewArticleModalOpen(true)}
            >
              New Story
            </Button>
          ) : undefined
        }
      />

      {/* Clean Desk Switcher */}
      <div className="flex items-center gap-1 border-b border-[#e0e3e7] dark:border-[#3c4043]">
        <button
          type="button"
          onClick={() => setActiveMainTab('news_articles')}
          className={`min-h-[44px] px-4 text-sm font-medium inline-flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeMainTab === 'news_articles'
              ? 'border-[#1a73e8] text-[#1a73e8] dark:text-[#8ab4f8]'
              : 'border-transparent text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Stories</span>
          <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6] tabular-nums">({articles.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('advertisements')}
          className={`min-h-[44px] px-4 text-sm font-medium inline-flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeMainTab === 'advertisements'
              ? 'border-[#1a73e8] text-[#1a73e8] dark:text-[#8ab4f8]'
              : 'border-transparent text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-white'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Ads</span>
        </button>
      </div>

      {activeMainTab === 'advertisements' ? (
        <AdvertisementUploadManager />
      ) : (
        <>
          {/* Compact Filter Bar */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#242629] border border-[#e0e3e7] dark:border-[#3c4043] space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="flex-1">
                <Input
                  placeholder="Search headline, reporter, or district..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                />
              </div>

              <div className="grid grid-cols-2 sm:flex items-center gap-2">
                <select
                  aria-label="Filter by status"
                  value={selectedEditorialStatus}
                  onChange={(e) => setSelectedEditorialStatus(e.target.value)}
                  className="min-h-[44px] sm:min-h-[40px] px-3 rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#1b1c1f] text-xs font-medium text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:border-[#1a73e8] cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="approved">Approved</option>
                  <option value="submitted">Submitted</option>
                  <option value="in_review">In Review</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>

                <select
                  aria-label="Sort stories"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="min-h-[44px] sm:min-h-[40px] px-3 rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#1b1c1f] text-xs font-medium text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:border-[#1a73e8] cursor-pointer"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="words_desc">Longest</option>
                </select>
              </div>
            </div>

            {/* Horizontally Scrollable Desk Rail */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`min-h-[36px] px-3 rounded-xl text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-[#1a73e8] text-white font-semibold'
                      : 'bg-[#f1f3f4] dark:bg-[#1b1c1f] text-[#3c4043] dark:text-[#bdc1c6] hover:bg-[#e8eaed] dark:hover:bg-[#2f3136] font-medium'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Subtle Results Count */}
            <div className="pt-2 border-t border-[#eceff1] dark:border-[#3c4043] flex items-center justify-between text-xs text-[#5f6368] dark:text-[#9aa0a6] tabular-nums">
              <span>
                <strong className="text-[#202124] dark:text-white font-semibold">{filteredArticles.length}</strong> of {articles.length} stories
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 text-[#1a73e8] dark:text-[#8ab4f8] font-medium hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Stories Feed */}
          {filteredArticles.length === 0 ? (
            <div className="text-center py-12 px-5 rounded-2xl border border-dashed border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#242629]">
              <Newspaper className="w-9 h-9 mx-auto text-[#9aa0a6] mb-2.5 stroke-1.5" />
              <h4 className="text-sm font-semibold text-[#202124] dark:text-white">No stories found</h4>
              <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-1">
                Adjust your search or clear active filters.
              </p>
              {hasActiveFilters && (
                <div className="mt-4">
                  <Button variant="secondary" size="sm" onClick={resetFilters}>
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredArticles.map((article) => (
                <article
                  key={article.articleId}
                  className="p-3.5 sm:p-4 rounded-2xl border border-[#e0e3e7] dark:border-[#3c4043] bg-white dark:bg-[#242629] hover:border-[#bdc1c6] dark:hover:border-[#5f6368] transition-colors flex flex-col sm:flex-row gap-3.5 items-start"
                >
                  {article.imageUrl && (
                    <div className="w-full sm:w-32 h-36 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-[#f1f3f4] dark:bg-[#1b1c1f]">
                      <img
                        src={article.imageUrl}
                        alt={article.headline}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-1.5 w-full">
                    <div className="flex items-center justify-between gap-2 text-xs text-[#5f6368] dark:text-[#9aa0a6]">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <span className="font-semibold text-[#1a73e8] dark:text-[#8ab4f8]">{article.category}</span>
                        {article.district && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{article.district}</span>
                          </>
                        )}
                      </div>
                      <StatusBadge status={article.editorialStatus} />
                    </div>

                    <h3 className="text-[15px] sm:text-base font-semibold text-[#202124] dark:text-[#f8f9fa] leading-snug line-clamp-2">
                      {article.headline}
                    </h3>

                    <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] leading-relaxed line-clamp-2">
                      {article.leadParagraph}
                    </p>

                    <div className="pt-1 flex items-center gap-2 text-xs text-[#5f6368] dark:text-[#9aa0a6] flex-wrap tabular-nums">
                      <span className="font-medium text-[#3c4043] dark:text-[#e8eaed]">{article.byline}</span>
                      <span aria-hidden="true">·</span>
                      <span>{article.wordCount} words</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* New Story Modal */}
      <Modal
        isOpen={isNewArticleModalOpen}
        onClose={() => setIsNewArticleModalOpen(false)}
        title="New Story"
        subtitle={currentTenant.organizationName}
        maxWidth="lg"
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
              Submit Story
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
            label="Headline"
            placeholder="Enter story headline..."
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#3c4043] dark:text-[#e8eaed]">
                Desk
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-[44px] sm:min-h-[40px] bg-white dark:bg-[#1b1c1f] border border-[#dadce0] dark:border-[#3c4043] rounded-xl px-3.5 text-sm text-[#202124] dark:text-[#f8f9fa] focus:outline-none focus:border-[#1a73e8]"
              >
                <option value="Metro & Transit">Metro &amp; Transit</option>
                <option value="City Hall">City Hall</option>
                <option value="Commerce & Shipping">Business</option>
                <option value="Investigative">Investigative</option>
                <option value="National">National</option>
              </select>
            </div>

            <Input
              label="Location"
              placeholder="City or district"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#3c4043] dark:text-[#e8eaed]">
              Lead Paragraph
            </label>
            <textarea
              rows={3}
              placeholder="Core summary of the story..."
              value={leadParagraph}
              onChange={(e) => setLeadParagraph(e.target.value)}
              className="w-full bg-white dark:bg-[#1b1c1f] border border-[#dadce0] dark:border-[#3c4043] rounded-xl px-3.5 py-2.5 text-sm text-[#202124] dark:text-[#f8f9fa] placeholder-[#5f6368] dark:placeholder-[#9aa0a6] focus:outline-none focus:border-[#1a73e8]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#3c4043] dark:text-[#e8eaed]">
              Body
            </label>
            <textarea
              rows={5}
              placeholder="Full story text and quotes..."
              value={bodyContent}
              onChange={(e) => setBodyContent(e.target.value)}
              className="w-full bg-white dark:bg-[#1b1c1f] border border-[#dadce0] dark:border-[#3c4043] rounded-xl px-3.5 py-2.5 text-sm text-[#202124] dark:text-[#f8f9fa] placeholder-[#5f6368] dark:placeholder-[#9aa0a6] focus:outline-none focus:border-[#1a73e8]"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
