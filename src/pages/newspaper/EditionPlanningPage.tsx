/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 9 — Edition Planning & Content Allocation Workbench
 * Allows editors to allocate stories to sections and pages, reserve advertisements,
 * insert breaking news, and withdraw stories with mandatory reasons.
 */

import React, { useState } from 'react';
import {
  Layers,
  Plus,
  ArrowRight,
  Flame,
  ShieldCheck,
  Tag,
  AlertCircle,
  Undo2,
  Sliders,
  CheckCircle2,
  FileCheck,
  Megaphone,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { EditionPlanningService } from '../../services/editionPlanningService';
import { EditionContentPoolService } from '../../services/editionContentPoolService';
import { SectionManagementService } from '../../services/sectionManagementService';
import { EditionReservationService } from '../../services/editionReservationService';
import { EditionAdvertisementService } from '../../services/editionAdvertisementService';
import {
  EditionStoryPriority,
  StoryWithdrawalReason,
  ContentPoolStory,
} from '../../types/editionWorkflow';
import {
  MOCK_NEWS_ARTICLES,
  MOCK_LICENSES,
  MOCK_CURRENT_EDITION,
  MOCK_TEMPLATES,
} from '../../services/mockDataService';

export const EditionPlanningPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { can } = usePermission();

  const [selectedEditionId, setSelectedEditionId] = useState(MOCK_CURRENT_EDITION.editionId);
  const [filterSection, setFilterSection] = useState<string>('all');
  const [onlyEligible, setOnlyEligible] = useState<boolean>(true);

  // Modals
  const [showBreakingModal, setShowBreakingModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawingStoryId, setWithdrawingStoryId] = useState<string | null>(null);
  const [withdrawReason, setWithdrawReason] = useState<StoryWithdrawalReason>('EDITORIAL_CHANGE');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Breaking news form
  const [breakingTitle, setBreakingTitle] = useState('');
  const [breakingTargetPage, setBreakingTargetPage] = useState(1);

  // Content pool
  const contentPool = EditionContentPoolService.aggregateContentPool(
    currentTenant.tenantId,
    MOCK_NEWS_ARTICLES,
    MOCK_LICENSES,
    {
      onlyEligible,
      section: filterSection !== 'all' ? filterSection : undefined,
    }
  );

  const sections = SectionManagementService.getSections(currentTenant.tenantId);
  const pagePlans = EditionPlanningService.getPagePlans(selectedEditionId);
  const reservations = EditionReservationService.getReservationsForEdition(selectedEditionId);
  const adReservations = EditionAdvertisementService.getAdvertisementsForEdition(selectedEditionId);

  const handleReserveStory = (story: ContentPoolStory, pageNum: number = 1) => {
    const res = EditionPlanningService.reserveContent({
      tenantId: currentTenant.tenantId,
      editionId: selectedEditionId,
      newsId: story.article.articleId,
      reservedBy: user?.uid || 'editor-1',
      priority: story.suggestedPriority,
      pageIntent: pageNum,
      sectionIntent: story.suggestedSection || 'Front & Local',
      bylineCredit: story.attribution.creditLine,
    });

    if (res.success) {
      const artTitle = story.article.title || story.article.headline || story.article.articleId;
      setFeedbackMsg(`Allocated "${artTitle.slice(0, 30)}..." to Page ${pageNum}.`);
      setTimeout(() => setFeedbackMsg(null), 3000);
    } else {
      setFeedbackMsg(`Error: ${res.error}`);
    }
  };

  const handleWithdraw = () => {
    if (!withdrawingStoryId) return;

    const res = EditionPlanningService.withdrawStory({
      tenantId: currentTenant.tenantId,
      editionId: selectedEditionId,
      newsId: withdrawingStoryId,
      withdrawnBy: user?.uid || 'editor-1',
      reason: withdrawReason,
      notes: withdrawNotes,
    });

    if (res.success) {
      setFeedbackMsg(`Withdrawn story from active edition.`);
      setShowWithdrawModal(false);
      setWithdrawingStoryId(null);
      setTimeout(() => setFeedbackMsg(null), 3000);
    } else {
      setFeedbackMsg(`Withdrawal error: ${res.error}`);
    }
  };

  const handleInsertBreaking = () => {
    if (!breakingTitle.trim()) return;

    const mockBreakingArticle = {
      ...MOCK_NEWS_ARTICLES[0],
      articleId: `breaking-${Date.now()}`,
      title: breakingTitle,
      isBreaking: true,
      editorialStatus: 'approved' as const,
    };

    const res = EditionPlanningService.insertBreakingNews({
      tenantId: currentTenant.tenantId,
      editionId: selectedEditionId,
      breakingArticle: mockBreakingArticle,
      targetPage: breakingTargetPage,
      userId: user?.uid || 'editor-1',
    });

    if (res.success) {
      setFeedbackMsg(`Inserted breaking story onto Page ${breakingTargetPage}.`);
      setShowBreakingModal(false);
      setBreakingTitle('');
      setTimeout(() => setFeedbackMsg(null), 3000);
    } else {
      setFeedbackMsg(`Breaking news insertion error: ${res.error}`);
    }
  };

  const handleRebalance = () => {
    const res = EditionPlanningService.rebalancePage(
      currentTenant.tenantId,
      selectedEditionId,
      1,
      user?.uid || 'editor-1',
      MOCK_TEMPLATES[0],
      MOCK_NEWS_ARTICLES
    );

    if (res.success) {
      setFeedbackMsg('Page rebalanced successfully using PagePlanningEngine.');
      setTimeout(() => setFeedbackMsg(null), 3000);
    } else {
      setFeedbackMsg(`Rebalance error: ${res.error}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edition Content Planning & Page Allocation Workbench"
        subtitle="Bridge newsroom copy, freelance pitches, and marketplace acquisitions into structured newspaper page plans."
        breadcrumbs={[
          { label: 'Newspaper', href: '#' },
          { label: 'Content Planning' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {can('edition.breaking_insert') && (
              <Button
                variant="outline"
                leftIcon={<Flame className="w-4 h-4 text-rose-400" />}
                onClick={() => setShowBreakingModal(true)}
              >
                Insert Breaking News
              </Button>
            )}
            <Button
              variant="secondary"
              leftIcon={<Sliders className="w-4 h-4" />}
              onClick={handleRebalance}
            >
              Rebalance Pages (AUTO LAYOUT)
            </Button>
          </div>
        }
      />

      {feedbackMsg && (
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-sans flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" /> {feedbackMsg}
        </div>
      )}

      {/* Main Two-Column Planning Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Aggregated Content Pool (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card
            variant="editorial"
            title="Eligible Content Pool"
            subtitle="Approved stories ready for newspaper page allocation."
            action={
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-sans text-slate-600 dark:text-slate-400 flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyEligible}
                    onChange={(e) => setOnlyEligible(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-blue-600 focus:ring-blue-500"
                  />
                  Only Eligible
                </label>
              </div>
            }
          >
            <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
              {contentPool.map((item) => {
                const isReserved = reservations.some((r) => r.newsId === item.article.articleId);

                return (
                  <div
                    key={item.article.articleId}
                    className={`p-3 rounded-lg border transition-all text-xs space-y-2 ${
                      isReserved
                        ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                        : item.isEligible
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400 shadow-2xs'
                        : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant={item.sourceType === 'MARKETPLACE_PURCHASE' ? 'blue' : 'primary'}
                        size="sm"
                      >
                        {item.sourceType.replace(/_/g, ' ')}
                      </Badge>
                      <span className="font-sans text-[10px] text-slate-500 dark:text-slate-400">
                        {item.article.wordCount} words • {item.article.originalityScore}% Orig.
                      </span>
                    </div>

                    <h4 className="font-sans font-bold text-slate-900 dark:text-slate-100 leading-snug">
                      {item.article.title}
                    </h4>

                    <div className="text-[11px] font-sans text-slate-500 dark:text-slate-400">
                      {item.attribution.creditLine}
                    </div>

                    {!item.isEligible && (
                      <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-[10px] font-sans flex items-center gap-1 border border-rose-200 dark:border-rose-800">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        <span>{item.ineligibilityReason}</span>
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-sans font-medium text-blue-600 dark:text-blue-400">
                        Priority: {item.suggestedPriority}
                      </span>

                      {isReserved ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-400 hover:text-rose-300 text-[11px]"
                          onClick={() => {
                            setWithdrawingStoryId(item.article.articleId);
                            setShowWithdrawModal(true);
                          }}
                        >
                          Withdraw
                        </Button>
                      ) : (
                        item.isEligible && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-[11px] py-1 h-7"
                              onClick={() => handleReserveStory(item, 1)}
                            >
                              + Page 1
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[11px] py-1 h-7"
                              onClick={() => handleReserveStory(item, 2)}
                            >
                              + Page 2
                            </Button>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Column: Edition Page Plans & Allocation Grid (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card
            variant="editorial"
            title="Scheduled Edition Page Plans"
            subtitle={`Edition ${selectedEditionId} • Total Pages: ${pagePlans.length || 2}`}
          >
            <div className="space-y-4">
              {[1, 2].map((pageNum) => {
                const pageStories = reservations.filter(
                  (r) => r.pageIntent === pageNum && (r.status === 'RESERVED' || r.status === 'PLACED')
                );
                const pageAds = adReservations.filter((a) => a.pageNumber === pageNum);

                return (
                  <div
                    key={pageNum}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-sans font-bold text-xs flex items-center justify-center border border-blue-200 dark:border-blue-800">
                          {pageNum}
                        </span>
                        <div>
                          <h4 className="text-sm font-sans font-bold text-slate-900 dark:text-slate-100">
                            {pageNum === 1 ? 'Page 1 — Front Page & Lead Dispatch' : 'Page 2 — National & State'}
                          </h4>
                          <span className="text-[10px] font-sans text-slate-500 dark:text-slate-400">
                            {pageStories.length} Stories Allocated • {pageAds.length} Ad Slots
                          </span>
                        </div>
                      </div>

                      <Badge variant={pageNum === 1 ? 'primary' : 'outline'} size="sm">
                        {pageNum === 1 ? 'LEAD BROADSHEET' : 'RUN OF PAPER'}
                      </Badge>
                    </div>

                    {/* Allocated Stories List */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {pageStories.length === 0 ? (
                        <div className="text-xs font-sans text-slate-500 dark:text-slate-400 py-3 text-center">
                          No stories allocated to Page {pageNum} yet. Click &quot;+ Page {pageNum}&quot; in Content Pool.
                        </div>
                      ) : (
                        pageStories.map((res) => {
                          const art = MOCK_NEWS_ARTICLES.find((a) => a.articleId === res.newsId);

                          return (
                            <div
                              key={res.reservationId}
                              className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-0.5 truncate">
                                <div className="font-semibold text-slate-900 dark:text-slate-200 truncate">
                                  {art?.title || res.newsId}
                                </div>
                                <div className="text-[10px] font-sans text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                  <span className="text-blue-600 dark:text-blue-400 font-medium">{res.priority}</span>
                                  <span>{res.bylineCredit || 'Staff Reporter'}</span>
                                </div>
                              </div>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-rose-400 hover:text-rose-300 text-[11px] h-7"
                                onClick={() => {
                                  setWithdrawingStoryId(res.newsId);
                                  setShowWithdrawModal(true);
                                }}
                              >
                                Withdraw
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Breaking News Modal */}
      <Modal
        isOpen={showBreakingModal}
        onClose={() => setShowBreakingModal(false)}
        title="Insert Breaking News Dispatch"
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowBreakingModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleInsertBreaking}>
              Insert & Reflow Page
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-300">
            Inserting breaking news preserves existing commercially locked advertisements and editor locks, while automatically reflowing unlocked editorial content.
          </p>
          <Input
            label="Breaking News Headline"
            value={breakingTitle}
            onChange={(e) => setBreakingTitle(e.target.value)}
            placeholder="e.g. Breaking: Supreme Court Delivers Historic Verdict..."
            required
          />
          <Select
            label="Target Page"
            value={String(breakingTargetPage)}
            onChange={(e) => setBreakingTargetPage(Number(e.target.value))}
            options={[
              { value: '1', label: 'Page 1 — Front Page Lead' },
              { value: '2', label: 'Page 2 — National Bureau' },
            ]}
          />
        </div>
      </Modal>

      {/* Story Withdrawal Modal */}
      <Modal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        title="Withdraw Story from Active Edition"
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowWithdrawModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleWithdraw}>
              Confirm Withdrawal
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-300">
            A valid editorial or legal reason is strictly required to withdraw content from a planned edition. Historical records are preserved in audit logs.
          </p>
          <Select
            label="Mandatory Withdrawal Reason"
            value={withdrawReason}
            onChange={(e) => setWithdrawReason(e.target.value as StoryWithdrawalReason)}
            options={[
              { value: 'FACTUAL_CORRECTION', label: 'Factual Correction / Ongoing Verification' },
              { value: 'LEGAL_REVIEW', label: 'Legal Review / Ombudsman Injunction' },
              { value: 'DUPLICATE', label: 'Duplicate Coverage' },
              { value: 'SOURCE_WITHDRAWAL', label: 'Source Retraction' },
              { value: 'LICENSING', label: 'Licensing / Territory Scope Expiry' },
              { value: 'EDITORIAL_CHANGE', label: 'Editorial Direction Change' },
              { value: 'BREAKING_UPDATE', label: 'Superseded by Breaking Update' },
              { value: 'OTHER', label: 'Other Justified Reason' },
            ]}
          />
          <Input
            label="Editorial Notes / Justification"
            value={withdrawNotes}
            onChange={(e) => setWithdrawNotes(e.target.value)}
            placeholder="Optional notes for newsroom desk audit trail..."
          />
        </div>
      </Modal>
    </div>
  );
};
