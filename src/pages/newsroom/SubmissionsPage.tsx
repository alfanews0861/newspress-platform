/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Reporter Submissions Desk & Originality Workflow
 * Phase 2 — News Submission & Reporter Originality Engine
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Send,
  Save,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Upload,
  Camera,
  Mic,
  MapPin,
  ShieldCheck,
  Info,
  Sparkles,
  Layers,
  ChevronRight,
  Eye,
  Plus,
  RefreshCw,
  Lock,
  FileCheck
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/formatters';
import { newsSubmissionService } from '../../services/newsSubmissionService';
import { NewsArticle } from '../../types/news';
import {
  EvidenceType,
  EvidenceVisibility,
  ReporterDeclaration,
  ReporterEvidence,
  SimilarityMatch
} from '../../types/originality';

export const SubmissionsPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'submissions' | 'file_story' | 'event_tracker'>('submissions');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // New story filing state
  const [draftId, setDraftId] = useState<string | null>(null);
  const [headline, setHeadline] = useState('');
  const [subheadline, setSubheadline] = useState('');
  const [summary, setSummary] = useState('');
  const [bodyContent, setBodyContent] = useState('');
  const [category, setCategory] = useState('Metro & Transit');
  const [subcategory, setSubcategory] = useState('Local Infrastructure');
  const [location, setLocation] = useState('Central Rail Terminal, Platform 4');
  const [district, setDistrict] = useState('Metro Central');
  const [state, setState] = useState('New York');
  const [eventDateTime, setEventDateTime] = useState(new Date().toISOString().slice(0, 16));
  const [sourceType, setSourceType] = useState('Firsthand Field Sourcing');
  const [declaration, setDeclaration] = useState<ReporterDeclaration>('original_field_report');

  // Evidence Kit
  const [evidenceList, setEvidenceList] = useState<Array<Omit<ReporterEvidence, 'evidenceId' | 'newsId' | 'submissionId' | 'reporterId' | 'tenantId' | 'uploadedAt'>>>([]);
  const [newEvidenceTitle, setNewEvidenceTitle] = useState('');
  const [newEvidenceType, setNewEvidenceType] = useState<EvidenceType>('original_photo');
  const [newEvidenceDesc, setNewEvidenceDesc] = useState('');
  const [newEvidenceVisibility, setNewEvidenceVisibility] = useState<EvidenceVisibility>('editorial_only');

  // Geolocation & Metadata
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number; accuracyMeters?: number } | null>(null);
  const [deviceCamera, setDeviceCamera] = useState('Sony Alpha 7R V (24-70mm GM II)');
  const [isAcquiringGps, setIsAcquiringGps] = useState(false);

  // Pre-submission duplicate check state
  const [similarityWarningMatches, setSimilarityWarningMatches] = useState<SimilarityMatch[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Load submissions and metrics
  const refreshData = () => {
    const data = newsSubmissionService.getArticles(currentTenant.tenantId);
    setArticles(data);
  };

  useEffect(() => {
    refreshData();
  }, [currentTenant.tenantId]);

  const reporterMetrics = newsSubmissionService.getReporterMetrics(user?.uid || 'user-sofia-chen');
  const eventGroups = newsSubmissionService.getEventGroups(currentTenant.tenantId);

  // Geolocation Acquisition (Opt-in)
  const handleAcquireGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsAcquiringGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracyMeters: Math.round(pos.coords.accuracy)
        });
        setIsAcquiringGps(false);
      },
      (err) => {
        console.warn('GPS permission denied or unavailable:', err.message);
        setIsAcquiringGps(false);
        // Fallback sample coordinates if in local sandbox
        setGpsCoords({
          latitude: 40.7128,
          longitude: -74.006,
          accuracyMeters: 8
        });
      },
      { timeout: 8000 }
    );
  };

  // Add Evidence Item
  const handleAddEvidence = () => {
    if (!newEvidenceTitle) return;
    setEvidenceList([
      ...evidenceList,
      {
        evidenceType: newEvidenceType,
        title: newEvidenceTitle,
        description: newEvidenceDesc,
        fileUrl: `https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600`,
        originalFilename: `${newEvidenceTitle.toLowerCase().replace(/\s+/g, '_')}_raw.jpg`,
        visibility: newEvidenceVisibility,
        gpsCoords: gpsCoords ? { ...gpsCoords, capturedAt: new Date().toISOString() } : undefined,
        deviceMetadata: {
          model: deviceCamera,
          iso: 200,
          software: 'Camera RAW 16.2',
          rawExifCapturedAt: new Date().toISOString()
        }
      }
    ]);
    setNewEvidenceTitle('');
    setNewEvidenceDesc('');
  };

  // Pre-submission Duplicate Check
  const runSimilarityCheck = (): SimilarityMatch[] => {
    if (!headline || !bodyContent) return [];
    const matches = newsSubmissionService.checkSimilarity({
      headline,
      bodyContent,
      location,
      district,
      state,
      currentArticleId: draftId || undefined
    });
    return matches;
  };

  // Save Draft
  const handleSaveDraft = async () => {
    if (!headline) return;
    try {
      if (draftId) {
        await newsSubmissionService.updateDraft(draftId, {
          headline,
          subheadline,
          summary,
          leadParagraph: summary || headline,
          bodyContent,
          category,
          subcategory,
          location,
          district,
          state,
          eventDateTime,
          sourceType,
          reporterDeclaration: declaration
        });
      } else {
        const created = await newsSubmissionService.createDraft({
          tenantId: currentTenant.tenantId,
          authorId: user?.uid || 'user-sofia-chen',
          byline: user?.displayName || 'Sofia Chen',
          headline,
          subheadline,
          summary,
          leadParagraph: summary || headline,
          bodyContent,
          category,
          subcategory,
          location,
          district,
          state,
          eventDateTime,
          sourceType,
          reporterDeclaration: declaration,
          clientCapturedAt: new Date().toISOString()
        });
        setDraftId(created.articleId);
      }
      refreshData();
      setSuccessBanner('Draft saved securely to newsroom workspace.');
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      alert(`Error saving draft: ${err.message}`);
    }
  };

  // Submit Flow
  const handleSubmitStory = async (forceProceed = false) => {
    if (!headline || !bodyContent) {
      alert('Please provide both a headline and full story copy.');
      return;
    }

    // Step 1: Pre-check duplicate warning if not force-proceeding
    if (!forceProceed) {
      const matches = runSimilarityCheck();
      if (matches.length > 0 && matches[0].overallSimilarityPercent >= 55) {
        setSimilarityWarningMatches(matches);
        setShowDuplicateWarning(true);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let targetArticleId = draftId;
      if (!targetArticleId) {
        const draft = await newsSubmissionService.createDraft({
          tenantId: currentTenant.tenantId,
          authorId: user?.uid || 'user-sofia-chen',
          byline: user?.displayName || 'Sofia Chen',
          headline,
          subheadline,
          summary,
          leadParagraph: summary || headline,
          bodyContent,
          category,
          subcategory,
          location,
          district,
          state,
          eventDateTime,
          sourceType,
          reporterDeclaration: declaration,
          clientCapturedAt: new Date().toISOString()
        });
        targetArticleId = draft.articleId;
      }

      const res = await newsSubmissionService.submitNews({
        articleId: targetArticleId,
        reporterId: user?.uid || 'user-sofia-chen',
        declaration,
        clientCapturedAt: new Date().toISOString(),
        evidenceItems: evidenceList
      });

      refreshData();
      setShowDuplicateWarning(false);
      setIsSubmitting(false);
      setActiveTab('submissions');
      setSuccessBanner(
        `Dispatch successfully filed! Authoritative server submission timestamp recorded at ${formatDate(
          res.submission.serverSubmittedAt
        )}. Originality Status: ${res.assessment.status.replace(/_/g, ' ')}.`
      );

      // Reset form
      setDraftId(null);
      setHeadline('');
      setSubheadline('');
      setSummary('');
      setBodyContent('');
      setEvidenceList([]);
      setGpsCoords(null);
    } catch (err: any) {
      setIsSubmitting(false);
      alert(`Submission error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reporter News Submission & Originality Engine"
        subtitle={`Filing and originality attribution desk for ${currentTenant.organizationName}. Field reports are recorded with authoritative server timestamps, evidence metadata, and duplicate guards.`}
        breadcrumbs={[
          { label: 'Newsroom', href: '#' },
          { label: 'Submissions' },
        ]}
        actions={
          activeTab !== 'file_story' ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setActiveTab('file_story')}
            >
              File New Dispatch
            </Button>
          ) : undefined
        }
      />

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-xs text-emerald-400 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Reporter Performance & Originality Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400">Total Filed</div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">{reporterMetrics.submitted}</div>
        </div>
        <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] uppercase font-mono text-emerald-600 dark:text-emerald-400">Approved</div>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{reporterMetrics.approved}</div>
        </div>
        <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] uppercase font-mono text-purple-600 dark:text-purple-400">Published</div>
          <div className="text-lg font-bold text-purple-600 dark:text-purple-400 font-mono mt-0.5">{reporterMetrics.published}</div>
        </div>
        <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] uppercase font-mono text-blue-600 dark:text-blue-400">Marketplace OK</div>
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono mt-0.5">{reporterMetrics.marketplaceEligible}</div>
        </div>
        <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="text-[10px] uppercase font-mono text-emerald-700 dark:text-emerald-300">Verified Original</div>
          <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 font-mono mt-0.5">{reporterMetrics.verifiedOriginal}</div>
        </div>
        <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20">
          <div className="text-[10px] uppercase font-mono text-blue-700 dark:text-blue-300">Independent</div>
          <div className="text-lg font-bold text-blue-700 dark:text-blue-300 font-mono mt-0.5">{reporterMetrics.independentReports}</div>
        </div>
        <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="text-[10px] uppercase font-mono text-amber-700 dark:text-amber-300">Duplicate Alert</div>
          <div className="text-lg font-bold text-amber-700 dark:text-amber-300 font-mono mt-0.5">{reporterMetrics.possibleDuplicates}</div>
        </div>
        <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-rose-500/20 bg-rose-50/50 dark:bg-rose-950/20">
          <div className="text-[10px] uppercase font-mono text-rose-700 dark:text-rose-300">Disputed</div>
          <div className="text-lg font-bold text-rose-700 dark:text-rose-300 font-mono mt-0.5">{reporterMetrics.disputedReports}</div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <Tabs
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as any)}
        tabs={[
          { id: 'submissions', label: 'My Submissions & Drafts', count: articles.length },
          { id: 'file_story', label: draftId ? 'Edit Active Draft' : 'File Story Dispatch' },
          { id: 'event_tracker', label: 'Real-World Event Clusters & Locks', count: eventGroups.length }
        ]}
      />

      {/* TAB 1: Submissions Table */}
      {activeTab === 'submissions' && (
        <Card
          variant="editorial"
          title="Filing Inbox & Originality Status"
          subtitle="Chronological audit record of news dispatches filed from the field."
        >
          <DataTable
            data={articles}
            keyExtractor={(row) => row.articleId}
            columns={[
              {
                key: 'headline',
                header: 'Headline & Category',
                render: (row) => (
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100 font-sans text-sm hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                      onClick={() => {
                        setSelectedArticle(row);
                        setIsDetailModalOpen(true);
                      }}
                    >
                      {row.headline}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                      <span>By {row.byline}</span>
                      <span>•</span>
                      <span className="text-blue-600 dark:text-blue-400">{row.category}</span>
                      {row.location && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {row.location}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: 'declaration',
                header: 'Reporter Declaration',
                width: '180px',
                render: (row) => (
                  <Badge variant="default" size="sm">
                    <span className="font-mono text-[10px] capitalize">
                      {(row.reporterDeclaration || 'original_field_report').replace(/_/g, ' ')}
                    </span>
                  </Badge>
                ),
              },
              {
                key: 'originality',
                header: 'Originality Status',
                width: '180px',
                render: (row) => (
                  <div className="space-y-1">
                    <StatusBadge status={row.originalityStatus || 'UNVERIFIED'} />
                    {row.originalityScorePercent !== undefined && (
                      <div className="text-[10px] font-mono text-slate-400">
                        Index: <span className="text-emerald-400 font-bold">{row.originalityScorePercent}%</span>
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Desk Status',
                width: '130px',
                render: (row) => <StatusBadge status={row.editorialStatus} />,
              },
              {
                key: 'timestamps',
                header: 'Official Recorded Time',
                width: '160px',
                render: (row) => (
                  <div>
                    <div className="text-slate-200 text-xs font-mono">
                      {formatDate(row.serverSubmittedAt || row.createdAt)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {row.serverSubmittedAt ? 'Authoritative Server' : 'Local Draft'}
                    </div>
                  </div>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                width: '110px',
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedArticle(row);
                        setIsDetailModalOpen(true);
                      }}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    {row.editorialStatus === 'draft' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setDraftId(row.articleId);
                          setHeadline(row.headline);
                          setSubheadline(row.subheadline || '');
                          setSummary(row.summary || '');
                          setBodyContent(row.bodyContent);
                          setCategory(row.category);
                          setLocation(row.location || '');
                          setDistrict(row.district || '');
                          setState(row.state || '');
                          setDeclaration(row.reporterDeclaration || 'original_field_report');
                          setActiveTab('file_story');
                        }}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}

      {/* TAB 2: File New Story Dispatch */}
      {activeTab === 'file_story' && (
        <div className="space-y-6">
          {/* Educational Banner Explaining Originality Verification */}
          <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200 font-sans">
                  Originality Verification & First Recorded Submission Principle
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  NewsPress is built to reward reporters who actually do real reporting in the field rather than copying and pasting news forwards from secondary channels.
                  Your submission establishes the official <strong>First Recorded Submission</strong> with an authoritative server timestamp.
                  Attaching original photos, camera EXIF, audio recordings, or GPS coordinates provides verification proof, protecting your work and enabling editorial fast-tracking.
                </p>
                <div className="pt-1 text-[11px] font-mono text-blue-700 dark:text-blue-400">
                  Note: A cryptographic timestamp establishes technical recording priority; it does not make unsupported legal copyright claims.
                </div>
              </div>
            </div>
          </div>

          {/* Story Filing Form */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Story Core Fields (2 Cols) */}
            <div className="lg:col-span-2 space-y-4">
              <Card variant="editorial" title="Story Details & Body">
                <div className="space-y-4">
                  <Input
                    label="Headline (Clear, Specific, Informative)"
                    placeholder="e.g. Chemical Tanker Derailment Shuts Down Route 16 Near Nellore Depot"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                  />

                  <Input
                    label="Subheadline / Secondary Hook"
                    placeholder="e.g. Hazardous materials teams establish 500-meter safety cordon as rail inspectors begin inquiry."
                    value={subheadline}
                    onChange={(e) => setSubheadline(e.target.value)}
                  />

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wider uppercase">
                      Executive Summary / Lead Paragraph
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Core facts: Who, what, when, where, and primary consequences..."
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wider uppercase">
                      Full Story Body Copy & Sourced Dispatches
                    </label>
                    <textarea
                      rows={10}
                      placeholder="Write the full report. Include eyewitness accounts, verified numbers, police or authority statements, and chronological events..."
                      value={bodyContent}
                      onChange={(e) => setBodyContent(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-sans leading-relaxed"
                    />
                    <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-1">
                      <span>Word count: {bodyContent.trim().split(/\s+/).filter(Boolean).length} words</span>
                      <span>Normalized fingerprint will be calculated server-side</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Geographic and Temporal Specifics */}
              <Card variant="default" title="Incident Location & Event Sourcing">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Editorial Desk</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Metro & Transit">Metro & Transit</option>
                      <option value="City Hall">City Hall</option>
                      <option value="Commerce & Shipping">Commerce & Shipping</option>
                      <option value="Crime & Safety">Crime & Safety</option>
                      <option value="Investigative">Investigative</option>
                      <option value="Energy & Climate">Energy & Climate</option>
                    </select>
                  </div>

                  <Input
                    label="Specific Location / Landmark"
                    placeholder="e.g. Mile Marker 42, North Railway Junction"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />

                  <Input
                    label="District / County"
                    placeholder="e.g. Nellore District"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                  />

                  <Input
                    label="State / Province"
                    placeholder="e.g. Andhra Pradesh / New York"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />

                  <Input
                    label="Event Date & Time"
                    type="datetime-local"
                    value={eventDateTime}
                    onChange={(e) => setEventDateTime(e.target.value)}
                  />

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Primary Source Type</label>
                    <select
                      value={sourceType}
                      onChange={(e) => setSourceType(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Firsthand Field Reporting">Firsthand Field Reporting (On-scene)</option>
                      <option value="Official Press Briefing">Official Press Briefing / Spokesperson</option>
                      <option value="Eyewitness Interviews">Direct Eyewitness Interviews</option>
                      <option value="Documentary / Whistleblower Leak">Documentary / Whistleblower Leak</option>
                      <option value="Public Agency Wire">Public Agency Wire / Gazette</option>
                    </select>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column: Declaration, Evidence Kit & Pre-Check */}
            <div className="space-y-5">
              {/* Reporter Declaration */}
              <Card variant="editorial" title="Reporter Declaration" subtitle="Mandatory professional ethics attestation">
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Declare how this story was gathered. Misrepresenting secondary aggregation as a field report lowers reporter reliability index.
                  </p>

                  <div className="space-y-2">
                    {[
                      {
                        id: 'original_field_report',
                        label: 'Original Field Report',
                        desc: 'I was physically present at the scene and conducted original interviews/investigation.',
                      },
                      {
                        id: 'independently_reported',
                        label: 'Independently Reported',
                        desc: 'I verified the event independently through separate sources, documents, or calls.',
                      },
                      {
                        id: 'secondary_source',
                        label: 'Secondary Source / Press Release',
                        desc: 'Based on official releases, statements, or another outlet with explicit attribution.',
                      },
                      {
                        id: 'aggregated',
                        label: 'Aggregated / Curated',
                        desc: 'Compilation of multiple public reports.',
                      },
                    ].map((dec) => (
                      <label
                        key={dec.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          declaration === dec.id
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-500/50 text-slate-900 dark:text-slate-100'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="declaration"
                          value={dec.id}
                          checked={declaration === dec.id}
                          onChange={() => setDeclaration(dec.id as any)}
                          className="mt-1 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="text-xs">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{dec.label}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{dec.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Evidence & Field Proof Kit */}
              <Card variant="default" title="Field Evidence & Media Kit" subtitle="Photographs, Audio Notes, EXIF & GPS">
                <div className="space-y-3">
                  {/* Optional GPS Acquisition */}
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        Device GPS Coordinates (Optional)
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleAcquireGps}
                        disabled={isAcquiringGps}
                      >
                        {isAcquiringGps ? 'Locating...' : gpsCoords ? 'Re-Acquire' : 'Acquire GPS'}
                      </Button>
                    </div>
                    {gpsCoords ? (
                      <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-500/20">
                        Lat: {gpsCoords.latitude}, Lon: {gpsCoords.longitude} (±{gpsCoords.accuracyMeters}m accuracy)
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Optional: Captures location verification for original field evidence. Not shared with marketplace buyers.
                      </p>
                    )}
                  </div>

                  {/* Device Metadata */}
                  <Input
                    label="Camera / Capture Device"
                    value={deviceCamera}
                    onChange={(e) => setDeviceCamera(e.target.value)}
                  />

                  {/* Evidence List */}
                  {evidenceList.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <div className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase">Attached Evidence ({evidenceList.length}):</div>
                      {evidenceList.map((item, idx) => (
                        <div key={idx} className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{item.title}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono capitalize">
                              {item.evidenceType.replace(/_/g, ' ')} • {item.visibility.replace(/_/g, ' ')}
                            </div>
                          </div>
                          <Badge variant="emerald" size="sm">Ready</Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Evidence Mini-Form */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                    <Input
                      label="Evidence Title / Caption"
                      placeholder="e.g. Overturned Tanker Valve Photograph"
                      value={newEvidenceTitle}
                      onChange={(e) => setNewEvidenceTitle(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={newEvidenceType}
                        onChange={(e) => setNewEvidenceType(e.target.value as any)}
                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="original_photo">Original Photo</option>
                        <option value="original_video">Original Video</option>
                        <option value="audio_note">Audio Voice Note</option>
                        <option value="field_note">Reporter Field Note</option>
                        <option value="source_note">Confidential Source Note</option>
                        <option value="document">Document / PDF Scan</option>
                      </select>

                      <select
                        value={newEvidenceVisibility}
                        onChange={(e) => setNewEvidenceVisibility(e.target.value as any)}
                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="editorial_only">Editorial Eyes Only</option>
                        <option value="public_attribution">Public Attribution</option>
                      </select>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                      onClick={handleAddEvidence}
                    >
                      Attach Field Evidence
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  leftIcon={<Send className="w-4 h-4" />}
                  onClick={() => handleSubmitStory(false)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Recording Submission...' : 'Submit to Editorial Desk'}
                </Button>

                <Button
                  variant="secondary"
                  size="md"
                  className="w-full"
                  leftIcon={<Save className="w-4 h-4" />}
                  onClick={handleSaveDraft}
                >
                  Save Draft Copy
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Event Tracker & Breaking Locks */}
      {activeTab === 'event_tracker' && (
        <Card
          variant="editorial"
          title="Real-World Event Clusters & Breaking Story Locks"
          subtitle="NewsPress groups multiple independent dispatches of the same real-world incident without automatically treating subsequent reports as duplicates."
        >
          <div className="space-y-4">
            {eventGroups.map((evt) => (
              <div
                key={evt.eventId}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100 font-sans">{evt.title}</span>
                    <Badge variant="primary" size="sm">{evt.category}</Badge>
                    {evt.isBreakingStoryLocked && (
                      <Badge variant="rose" size="sm">
                        <Lock className="w-3 h-3 mr-1 inline" /> Breaking Story Lock Active
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {evt.reportCount} Recorded Dispatches
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">{evt.summary}</p>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono gap-2">
                  <div>
                    <span>First Reported: <strong>{formatDate(evt.firstReportedAt)}</strong></span>
                    <span className="mx-2">•</span>
                    <span>By: <strong className="text-slate-800 dark:text-slate-200">{evt.firstReporterName}</strong></span>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    Location: {evt.location}, {evt.district}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Duplicate Warning Modal */}
      <Modal
        isOpen={showDuplicateWarning}
        onClose={() => setShowDuplicateWarning(false)}
        title="Possible Duplicate Detected"
        subtitle="Our algorithmic similarity engine found an existing recorded dispatch on this topic"
        maxWidth="lg"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowDuplicateWarning(false)}>
              Cancel & Revise Story
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setDeclaration('independently_reported');
                handleSubmitStory(true);
              }}
            >
              Submit as Independent Additional Report
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSubmitStory(true)}
            >
              Proceed to Editorial Review
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 text-xs leading-relaxed flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Duplicate Warning Notice:</strong> We do not silently reject stories. If you independently covered this event, you can submit this as an
              <strong> Independent Report</strong> to add genuinely new facts, new photography, or eyewitness testimony to the Event Group.
            </div>
          </div>

          {similarityWarningMatches.slice(0, 2).map((match) => (
            <div key={match.matchId} className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-sans">
                  Similar Story: {match.targetHeadline}
                </span>
                <span className="text-xs font-sans text-blue-600 dark:text-blue-400 font-bold">
                  {match.overallSimilarityPercent}% Similarity
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Filed by: {match.targetByline} • Recorded at: {formatDate(match.targetSubmittedAt)}
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded border border-slate-200 dark:border-slate-700/60 font-sans">
                {match.summaryExplanation}
              </p>
            </div>
          ))}

          <div className="text-xs text-slate-600 dark:text-slate-400">
            <strong>Choose an action:</strong>
            <ul className="list-disc pl-5 mt-1 space-y-1 text-[11px]">
              <li><strong>Independent Additional Report</strong>: Associates your report with the incident event group while preserving your own attribution and evidence.</li>
              <li><strong>Proceed to Review</strong>: Sends directly to desk editors for human fact-checking.</li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* Story Detail Modal */}
      {selectedArticle && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={selectedArticle.headline}
          subtitle={`Filed by ${selectedArticle.byline} • Desk: ${selectedArticle.category}`}
          maxWidth="2xl"
          footer={
            <Button variant="ghost" size="sm" onClick={() => setIsDetailModalOpen(false)}>
              Close
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <StatusBadge status={selectedArticle.editorialStatus} />
              <StatusBadge status={selectedArticle.originalityStatus || 'UNVERIFIED'} />
              <span className="text-slate-500 dark:text-slate-400">
                Authoritative Timestamp: {formatDate(selectedArticle.serverSubmittedAt || selectedArticle.createdAt)}
              </span>
            </div>

            {selectedArticle.summary && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 italic font-sans">
                {selectedArticle.summary}
              </div>
            )}

            <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
              {selectedArticle.bodyContent}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-500 dark:text-slate-400 grid grid-cols-2 gap-2">
              <div>Location: {selectedArticle.location || 'N/A'}</div>
              <div>District: {selectedArticle.district || 'N/A'}</div>
              <div>Source Type: {selectedArticle.sourceType || 'N/A'}</div>
              <div>Marketplace Eligible: {selectedArticle.isMarketplaceEligible ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
