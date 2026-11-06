/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Editorial Desk Queue & Originality Verification Interface
 * Phase 2 — News Submission & Reporter Originality Engine
 * 
 * 3-Column Newsroom Review Interface:
 * - LEFT: Story content, byline, lead paragraph, full copy, categories
 * - CENTER: Field evidence, media gallery, camera EXIF, GPS capture, source notes
 * - RIGHT: Originality panel, authoritative timestamps, similarity matches, event locks, and verification controls
 */

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Check,
  ShieldAlert,
  ShieldCheck,
  MapPin,
  Camera,
  Mic,
  Lock,
  Unlock,
  AlertCircle,
  Eye,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { useTenant } from '../../hooks/useTenant';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/formatters';
import { newsSubmissionService } from '../../services/newsSubmissionService';
import { NewsArticle, EditorialReviewItem } from '../../types/news';
import { HeadlineLabModal } from '../../components/editorial/HeadlineLabModal';
import { SideBySideEditorModal } from '../../components/editorial/SideBySideEditorModal';
import { AICopyFittingModal } from '../../components/editorial/AICopyFittingModal';
import { AISummaryModal } from '../../components/editorial/AISummaryModal';
import { ImageIntelligenceModal } from '../../components/editorial/ImageIntelligenceModal';
import { Sparkles, Scissors, Type, Layers } from 'lucide-react';
import {
  EventGroup,
  OriginalityAssessment,
  OriginalityStatus,
  ReporterEvidence,
  SimilarityMatch
} from '../../types/originality';

export const EditorialQueuePage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { can } = usePermission();
  const { user } = useAuth();

  const [queueItems, setQueueItems] = useState<EditorialReviewItem[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  // Loaded full context for selected article
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [assessment, setAssessment] = useState<OriginalityAssessment | null>(null);
  const [evidenceList, setEvidenceList] = useState<ReporterEvidence[]>([]);
  const [eventGroup, setEventGroup] = useState<EventGroup | null>(null);

  // Confirmation dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
    confirmLabel: string;
    variant?: 'primary' | 'danger';
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
    confirmLabel: 'Confirm',
    variant: 'primary'
  });

  const [editorialNoteInput, setEditorialNoteInput] = useState('');
  const [isEventAssignModalOpen, setIsEventAssignModalOpen] = useState(false);
  const [availableEventGroups, setAvailableEventGroups] = useState<EventGroup[]>([]);

  // Phase 6 AI Modal States
  const [isHeadlineLabOpen, setIsHeadlineLabOpen] = useState(false);
  const [isSideBySideOpen, setIsSideBySideOpen] = useState(false);
  const [isCopyFittingOpen, setIsCopyFittingOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isImageIntelOpen, setIsImageIntelOpen] = useState(false);

  // Load editorial queue
  const reloadQueue = () => {
    const items = newsSubmissionService.getEditorialQueueItems(currentTenant.tenantId);
    setQueueItems(items);
    setAvailableEventGroups(newsSubmissionService.getEventGroups(currentTenant.tenantId));

    if (items.length > 0 && !selectedArticleId) {
      loadArticleDetails(items[0].articleId);
    } else if (selectedArticleId) {
      loadArticleDetails(selectedArticleId);
    }
  };

  const loadArticleDetails = (artId: string) => {
    setSelectedArticleId(artId);
    const art = newsSubmissionService.getArticle(artId);
    if (art) {
      setSelectedArticle(art);
      const assess = newsSubmissionService.getAssessmentForArticle(artId);
      setAssessment(assess || null);
      const evs = newsSubmissionService.getEvidenceForArticle(artId);
      setEvidenceList(evs);
      if (art.eventGroupId) {
        const evGrp = newsSubmissionService.getEventGroups().find((g) => g.eventId === art.eventGroupId);
        setEventGroup(evGrp || null);
      } else {
        setEventGroup(null);
      }
    }
  };

  useEffect(() => {
    reloadQueue();
  }, [currentTenant.tenantId]);

  // Editorial Action Dispatcher
  const handleEditorialAction = async (decision: any, label: string, notes = '') => {
    if (!selectedArticle) return;

    try {
      await newsSubmissionService.editorialAction({
        articleId: selectedArticle.articleId,
        editorId: user?.uid || 'user-marcus-sterling',
        editorName: user?.displayName || 'Marcus Sterling',
        decision,
        notes: notes || editorialNoteInput
      });

      reloadQueue();
      setEditorialNoteInput('');
      setConfirmDialog({ ...confirmDialog, isOpen: false });
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    }
  };

  // Toggle Breaking Story Lock
  const handleToggleBreakingLock = async (isLocked: boolean) => {
    if (!eventGroup) return;
    try {
      await newsSubmissionService.toggleBreakingLock(
        eventGroup.eventId,
        isLocked,
        user?.uid || 'user-marcus-sterling',
        user?.displayName || 'Marcus Sterling',
        'Breaking news desk priority lock'
      );
      reloadQueue();
    } catch (err: any) {
      alert(`Could not toggle lock: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editorial Desk Review & Originality Triage"
        subtitle={`Independent news verification, source corroboration, and breaking event locks for ${currentTenant.organizationName}.`}
        breadcrumbs={[
          { label: 'Newsroom', href: '#' },
          { label: 'Editorial Queue' },
        ]}
      />

      {/* Top Queue Triage Selector Strip */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Pending Stories ({queueItems.length}):
        </span>
        {queueItems.map((item) => (
          <button
            key={item.articleId}
            onClick={() => loadArticleDetails(item.articleId)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all shrink-0 cursor-pointer flex items-center gap-2 border ${
              selectedArticleId === item.articleId
                ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-500 text-blue-700 dark:text-blue-300 font-bold'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300'
            }`}
          >
            <span>{item.headline.slice(0, 32)}...</span>
            <StatusBadge status={item.originalityStatus || 'UNVERIFIED'} />
          </button>
        ))}
      </div>

      {/* Main 3-Column Newsroom Review Canvas */}
      {selectedArticle ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* COLUMN 1: Story Copy (4 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card variant="editorial" title="News Dispatch Copy">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="primary" size="sm">{selectedArticle.category}</Badge>
                    <StatusBadge status={selectedArticle.editorialStatus} />
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {selectedArticle.wordCount} words
                  </span>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans leading-snug">
                    {selectedArticle.headline}
                  </h2>
                  {selectedArticle.subheadline && (
                    <p className="text-xs font-sans text-slate-600 dark:text-slate-400 italic mt-1">
                      {selectedArticle.subheadline}
                    </p>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                  <strong className="text-blue-700 dark:text-blue-400 font-mono block text-[10px] uppercase mb-1">
                    Lead Paragraph / Dateline:
                  </strong>
                  {selectedArticle.leadParagraph}
                </div>

                <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans whitespace-pre-wrap max-h-96 overflow-y-auto pr-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  {selectedArticle.bodyContent}
                </div>

                <div className="space-y-1 text-xs font-mono text-slate-500 dark:text-slate-400">
                  <div>Byline: <strong className="text-slate-800 dark:text-slate-200">{selectedArticle.byline}</strong></div>
                  <div>Location: {selectedArticle.location || 'Metro Area'} ({selectedArticle.district || 'Unassigned'})</div>
                  <div>Event Time: {selectedArticle.eventDateTime || 'Live Filing'}</div>
                  <div>Content Fingerprint: <span className="text-blue-600 dark:text-blue-400">{selectedArticle.contentFingerprint || 'fp_pending'}</span></div>
                </div>
              </div>
            </Card>

            {/* AI Editorial Assistant Tools Bar */}
            <Card variant="default">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="text-xs font-bold font-sans text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> AI Editorial Assistant
                  </span>
                  <Badge variant="outline" className="border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[10px]">
                    Fact Integrity Guard Active
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsHeadlineLabOpen(true)}
                    className="text-xs justify-start"
                    leftIcon={<Type className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                  >
                    Headline Lab
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsSideBySideOpen(true)}
                    className="text-xs justify-start"
                    leftIcon={<Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                  >
                    Side-by-Side Review
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsCopyFittingOpen(true)}
                    className="text-xs justify-start"
                    leftIcon={<Scissors className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                  >
                    Copy Fitting
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsSummaryOpen(true)}
                    className="text-xs justify-start"
                    leftIcon={<FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                  >
                    Summary Generator
                  </Button>
                </div>

                {selectedArticle.heroImageUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsImageIntelOpen(true)}
                    className="w-full text-xs justify-center"
                    leftIcon={<Camera className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                  >
                    Image Intelligence & DPI Diagnostics
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* COLUMN 2: Evidence & Media Inspector (3 Cols) */}
          <div className="lg:col-span-3 space-y-4">
            <Card
              variant="default"
              title="Field Evidence & Media"
              subtitle={`${evidenceList.length} Attached Artifacts`}
            >
              <div className="space-y-3">
                {evidenceList.length === 0 ? (
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                    <AlertCircle className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                    No external media attached. Story relies on direct reporter attestation.
                  </div>
                ) : (
                  evidenceList.map((ev) => (
                    <div
                      key={ev.evidenceId}
                      className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 font-sans leading-tight">
                          {ev.title}
                        </span>
                        <Badge variant="blue" size="sm">
                          {ev.evidenceType.replace(/_/g, ' ')}
                        </Badge>
                      </div>

                      {ev.description && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">{ev.description}</p>
                      )}

                      {/* EXIF / Device Metadata Display */}
                      {ev.deviceMetadata && (
                        <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 font-mono text-[10px] text-slate-600 dark:text-slate-300 space-y-0.5">
                          <div className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                            <Camera className="w-3 h-3" /> EXIF Device Data
                          </div>
                          <div>Model: {ev.deviceMetadata.model || 'Unknown'}</div>
                          <div>Software: {ev.deviceMetadata.software || 'Raw Capture'}</div>
                        </div>
                      )}

                      {/* GPS Tag */}
                      {ev.gpsCoords && (
                        <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 font-mono text-[10px] text-emerald-700 dark:text-emerald-400 space-y-0.5">
                          <div className="font-bold flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> GPS Tagged
                          </div>
                          <div>Lat: {ev.gpsCoords.latitude}, Lon: {ev.gpsCoords.longitude}</div>
                          <div>Accuracy: ±{ev.gpsCoords.accuracyMeters}m</div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span>Visibility: {ev.visibility.replace(/_/g, ' ')}</span>
                        <span>{formatDate(ev.uploadedAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* COLUMN 3: Originality Engine & Verification Actions (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <Card
              variant="editorial"
              title="Originality Assessment"
              subtitle="Algorithmic analysis & human editorial verification"
            >
              <div className="space-y-4">
                {/* Authoritative Server Timestamp Notice */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs space-y-1">
                  <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Official Recorded Submission Time:</span>
                  </div>
                  <div className="text-slate-900 dark:text-slate-100 font-bold">
                    {formatDate(selectedArticle.serverSubmittedAt || selectedArticle.createdAt)}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Authoritative server timestamp (immutable receipt)
                  </div>
                </div>

                {/* Multi-Factor Score Breakdown */}
                {assessment && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-500 dark:text-slate-400">Originality Verdict:</span>
                      <StatusBadge status={assessment.status} />
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Evidence</div>
                        <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          {assessment.evidenceScore}%
                        </div>
                      </div>
                      <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Similarity</div>
                        <div className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">
                          {assessment.similarityScore}%
                        </div>
                      </div>
                      <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Confidence</div>
                        <div className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">
                          {assessment.confidenceScore}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Potential Duplicates / Similarity Warnings */}
                {assessment && assessment.similarityMatches.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center gap-1.5 font-sans">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      Similarity Comparison ({assessment.similarityMatches.length}):
                    </div>
                    {assessment.similarityMatches.slice(0, 2).map((match) => (
                      <div key={match.matchId} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 font-sans">{match.targetHeadline.slice(0, 30)}...</span>
                          <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">{match.overallSimilarityPercent}%</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">{match.summaryExplanation}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Event Group & Breaking Lock Widget */}
                <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 font-sans uppercase text-[11px]">
                      Real-World Event Group
                    </span>
                    {eventGroup?.isBreakingStoryLocked ? (
                      <Badge variant="rose" size="sm">Locked</Badge>
                    ) : (
                      <Badge variant="default" size="sm">Unlocked</Badge>
                    )}
                  </div>

                  {eventGroup ? (
                    <div className="space-y-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="text-slate-800 dark:text-slate-200 font-semibold">{eventGroup.title}</div>
                      <div>Dispatches in cluster: {eventGroup.reportCount}</div>
                      <div className="pt-2 flex gap-2">
                        {eventGroup.isBreakingStoryLocked ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Unlock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                            onClick={() => handleToggleBreakingLock(false)}
                          >
                            Release Breaking Lock
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Lock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />}
                            onClick={() => handleToggleBreakingLock(true)}
                          >
                            Set Breaking Lock
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-xs">
                      No event group linked.
                    </div>
                  )}
                </div>

                {/* Editorial Notes Input */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400">
                    Desk Verification Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Verified by phone with harbor master..."
                    value={editorialNoteInput}
                    onChange={(e) => setEditorialNoteInput(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Editorial Action Control Buttons */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-white" />}
                      onClick={() =>
                        setConfirmDialog({
                          isOpen: true,
                          title: 'Verify Original Field Report',
                          message: `Confirm that "${selectedArticle.headline}" is verified original reporting based on attached field evidence?`,
                          confirmLabel: 'Verify Original',
                          action: () => handleEditorialAction('verify_original', 'Verify Original')
                        })
                      }
                    >
                      Verify Original
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setConfirmDialog({
                          isOpen: true,
                          title: 'Mark as Independent Report',
                          message: `Mark this dispatch as an independent report of the same event without duplicate penalties?`,
                          confirmLabel: 'Mark Independent',
                          action: () => handleEditorialAction('mark_independent', 'Mark Independent')
                        })
                      }
                    >
                      Mark Independent
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setConfirmDialog({
                          isOpen: true,
                          title: 'Flag Possible Duplicate',
                          message: `Flag this story for further review due to detected similarity?`,
                          confirmLabel: 'Flag Duplicate',
                          action: () => handleEditorialAction('mark_possible_duplicate', 'Mark Possible Duplicate')
                        })
                      }
                    >
                      Flag Duplicate
                    </Button>

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        setConfirmDialog({
                          isOpen: true,
                          title: 'Confirm Plagiarism / Duplicate',
                          message: `Confirm that this submission is an uncredited duplicate? This will reject the article and record an audit infraction.`,
                          confirmLabel: 'Confirm Plagiarism',
                          variant: 'danger',
                          action: () => handleEditorialAction('confirm_duplicate', 'Confirm Duplicate')
                        })
                      }
                    >
                      Confirm Plagiarism
                    </Button>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full bg-emerald-600 hover:bg-emerald-500"
                      leftIcon={<Check className="w-4 h-4" />}
                      onClick={() =>
                        setConfirmDialog({
                          isOpen: true,
                          title: 'Approve Story for Publication',
                          message: `Approve copy for "${selectedArticle.headline}"? The article will be marked ready for page layout and marketplace syndication eligibility.`,
                          confirmLabel: 'Approve Story',
                          action: () => handleEditorialAction('approve_publication', 'Approve Publication')
                        })
                      }
                    >
                      Approve Copy
                    </Button>

                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<XCircle className="w-4 h-4" />}
                      onClick={() =>
                        setConfirmDialog({
                          isOpen: true,
                          title: 'Reject Story',
                          message: `Reject this story dispatch? The reporter will be allowed to revise or archive.`,
                          confirmLabel: 'Reject Copy',
                          variant: 'danger',
                          action: () => handleEditorialAction('reject', 'Reject')
                        })
                      }
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <Card variant="default">
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 dark:text-emerald-400 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-sans">Editorial Queue Clear</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">All reporter dispatches have been triaged and verified.</p>
          </div>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
      />
    </div>
  );
};
