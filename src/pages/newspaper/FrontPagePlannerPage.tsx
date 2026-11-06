/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 9 — Front Page Planner
 * Dedicated Front Page A1 composition workbench:
 * Lead story, secondary stories, hero photo, column briefs, and visual balance preview.
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Flame,
  Layout,
  CheckCircle2,
  Sliders,
  FileText,
  AlertTriangle,
  Megaphone,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { EditionPlanningService } from '../../services/editionPlanningService';
import { EditionReservationService } from '../../services/editionReservationService';
import { PagePlanningEngine } from '../../services/pagePlanningEngine';
import {
  MOCK_CURRENT_EDITION,
  MOCK_TEMPLATES,
  MOCK_NEWS_ARTICLES,
  MOCK_BRANDS,
} from '../../services/mockDataService';

export const FrontPagePlannerPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  const [leadStoryId, setLeadStoryId] = useState(MOCK_NEWS_ARTICLES[0].articleId);
  const [secondaryStoryId, setSecondaryStoryId] = useState(MOCK_NEWS_ARTICLES[1]?.articleId || '');
  const [heroImagePlacement, setHeroImagePlacement] = useState<'top' | 'left' | 'hero'>('hero');
  const [hasAdSlot, setHasAdSlot] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const leadStory = MOCK_NEWS_ARTICLES.find((a) => a.articleId === leadStoryId) || MOCK_NEWS_ARTICLES[0];
  const secondaryStory = MOCK_NEWS_ARTICLES.find((a) => a.articleId === secondaryStoryId);

  const handleApplyFrontPage = () => {
    // Reserve lead story
    EditionPlanningService.reserveContent({
      tenantId: currentTenant.tenantId,
      editionId: MOCK_CURRENT_EDITION.editionId,
      newsId: leadStory.articleId,
      reservedBy: user?.uid || 'editor-1',
      priority: 'FRONT_PAGE_LEAD',
      pageIntent: 1,
      sectionIntent: 'Front Page',
      bylineCredit: leadStory.byline,
    });

    if (secondaryStory) {
      EditionPlanningService.reserveContent({
        tenantId: currentTenant.tenantId,
        editionId: MOCK_CURRENT_EDITION.editionId,
        newsId: secondaryStory.articleId,
        reservedBy: user?.uid || 'editor-1',
        priority: 'FRONT_PAGE_SECONDARY',
        pageIntent: 1,
        sectionIntent: 'Front Page',
        bylineCredit: secondaryStory.byline,
      });
    }

    setFeedback('Front page composition applied to PagePlanningEngine.');
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Front Page (Page A1) Master Planner"
        subtitle="Visual hierarchy calibration for the most critical broadsheet display: Lead banner, off-lead dispatches, hero photography, and ear ads."
        breadcrumbs={[
          { label: 'Newspaper', href: '#' },
          { label: 'Front Page Planner' },
        ]}
        actions={
          <Button
            variant="primary"
            leftIcon={<Sliders className="w-4 h-4" />}
            onClick={handleApplyFrontPage}
          >
            Apply to Page 1
          </Button>
        }
      />

      {feedback && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Story & Photo Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card
            variant="editorial"
            title="Front Page Lead & Secondary Selection"
            subtitle="Authoritative editorial placement choices."
          >
            <div className="space-y-4 text-xs">
              <Select
                label="Front-Page Lead Story (FRONT_PAGE_LEAD)"
                value={leadStoryId}
                onChange={(e) => setLeadStoryId(e.target.value)}
                options={MOCK_NEWS_ARTICLES.map((a) => ({
                  value: a.articleId,
                  label: `${(a.title || a.headline || a.articleId).slice(0, 45)}... (${a.wordCount} words)`,
                }))}
              />

              <Select
                label="Off-Lead Secondary Story (FRONT_PAGE_SECONDARY)"
                value={secondaryStoryId}
                onChange={(e) => setSecondaryStoryId(e.target.value)}
                options={[
                  { value: '', label: '-- None (Solo Banner Lead) --' },
                  ...MOCK_NEWS_ARTICLES.filter((a) => a.articleId !== leadStoryId).map((a) => ({
                    value: a.articleId,
                    label: `${(a.title || a.headline || a.articleId).slice(0, 45)}...`,
                  })),
                ]}
              />

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Hero Photo Treatment"
                  value={heroImagePlacement}
                  onChange={(e) => setHeroImagePlacement(e.target.value as any)}
                  options={[
                    { value: 'hero', label: 'Full 5-Column Hero' },
                    { value: 'top', label: 'Headline Top Anchor' },
                    { value: 'left', label: 'Side Column Wrap' },
                  ]}
                />
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Commercial Strip
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasAdSlot}
                      onChange={(e) => setHasAdSlot(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Bottom Ad Anchor (40mm)</span>
                  </label>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Page 1 Hierarchy Guidelines" variant="bordered">
            <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
              <p>
                • <strong>Lead Headline:</strong> Rendered in 48pt-72pt serif typography commanding 5-8 columns above the fold.
              </p>
              <p>
                • <strong>Off-Lead:</strong> Balances the right-hand column with 28pt-36pt secondary typography.
              </p>
              <p>
                • <strong>Ear Advertisements:</strong> Top left & right masthead corners reserved for commercial rate card sponsors.
              </p>
            </div>
          </Card>
        </div>

        {/* Right Column: Broadsheet Front Page Mock Preview (7 cols) */}
        <div className="lg:col-span-7">
          <Card
            variant="editorial"
            title="Front Page Layout Preview (A1 Broadsheet)"
            subtitle="Real-time visual hierarchy canvas preview."
          >
            <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              {/* Masthead */}
              <div className="text-center pb-4 border-b-2 border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-sans text-slate-500 dark:text-slate-400">
                  <span>VOL. XLII NO. 101</span>
                  <span className="font-bold tracking-wider">{currentTenant.organizationName.toUpperCase()}</span>
                  <span>PRICE ₹5.00</span>
                </div>
                <h1 className="text-3xl font-black font-sans tracking-tight text-slate-900 dark:text-white">
                  {currentTenant.organizationName}
                </h1>
                <div className="text-[10px] font-sans text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1">
                  Daily Morning Edition • October 5, 2026 • Verified Wire
                </div>
              </div>

              {/* Lead Headline & Hero Photo */}
              <div className="space-y-3">
                <Badge variant="blue" size="sm">
                  FRONT PAGE LEAD
                </Badge>
                <h2 className="text-2xl font-black font-sans leading-tight text-slate-900 dark:text-white">
                  {leadStory.title}
                </h2>
                <div className="text-xs font-sans text-slate-500 dark:text-slate-400">
                  By {leadStory.byline || 'Staff Reporter'} • {leadStory.wordCount} words
                </div>

                {leadStory.imageUrl && (
                  <div className="w-full h-44 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 relative bg-slate-100 dark:bg-slate-800">
                    <img
                      src={leadStory.imageUrl}
                      alt={leadStory.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-900/80 p-2 text-[10px] font-sans text-white">
                      High-Resolution Press Photo Package Attached
                    </div>
                  </div>
                )}

                <p className="text-xs font-sans text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-3">
                  {leadStory.synopsis || leadStory.content?.slice(0, 200)}...
                </p>
              </div>

              {/* Secondary Lead Story if selected */}
              {secondaryStory && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <Badge variant="outline" size="sm">
                    SECONDARY LEAD
                  </Badge>
                  <h3 className="text-base font-bold font-sans text-slate-800 dark:text-slate-200">
                    {secondaryStory.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {secondaryStory.synopsis || secondaryStory.content?.slice(0, 120)}...
                  </p>
                </div>
              )}

              {/* Ad Banner Strip */}
              {hasAdSlot && (
                <div className="p-3 rounded-lg border border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 text-center text-xs font-sans text-blue-700 dark:text-blue-400">
                  Commercially Reserved Advertisement Strip (Full Width • 40mm Height)
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
