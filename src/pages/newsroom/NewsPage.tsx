/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Newspaper, Plus, Search, Filter, Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, MapPin } from 'lucide-react';
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

export const NewsPage: React.FC = () => {
  const { can } = usePermission();
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isNewArticleModalOpen, setIsNewArticleModalOpen] = useState(false);

  // New story modal state
  const [headline, setHeadline] = useState('');
  const [leadParagraph, setLeadParagraph] = useState('');
  const [category, setCategory] = useState('Metro & Transit');
  const [bodyContent, setBodyContent] = useState('');
  const [location, setLocation] = useState('Central District');

  const reload = () => {
    setArticles(newsSubmissionService.getArticles(currentTenant.tenantId));
  };

  useEffect(() => {
    reload();
  }, [currentTenant.tenantId]);

  const filteredArticles = articles.filter((a) => {
    const matchesSearch =
      a.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.byline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.district && a.district.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.location && a.location.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || a.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    'all',
    'జాతీయం',
    'రాష్ట్రీయం',
    'జిల్లా వార్తలు',
    'Metro & Transit',
    'City Hall',
    'Commerce & Shipping',
    'Investigative'
  ];

  const handleCreateArticle = async () => {
    if (!headline || !leadParagraph) return;

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
      alert(`Error creating article: ${err.message}`);
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
          can('news.create') ? (
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search headline, reporter byline, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-sans font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-black dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {cat === 'all' ? 'All Desks' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
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
