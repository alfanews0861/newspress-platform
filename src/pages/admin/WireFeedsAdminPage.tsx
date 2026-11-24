/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NewsPress Admin — Marketplace Wire Feeds & Syndication Sources Console
 * Route: /admin/wire-feeds
 * Manages RSS/Atom feeds and news website URLs organized by Language & Category
 * for the Google Compute Engine e2-micro editorial wire worker.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Globe,
  Rss,
  Pause,
  Play,
  Pencil,
  Trash2,
  Server,
  Activity,
  Copy,
  Check,
  Lock,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';
import { wireFeedService } from '../../services/wireFeedService';
import { validateExternalFeedUrl } from '../../utils/urlSafety';
import { formatDate } from '../../utils/formatters';
import { firebaseConfig } from '../../config/firebase';
import {
  WireFeedSource,
  WireScraperRun,
  WireWorkerStatus,
  WireFeedType,
  WireLanguageCode,
  WIRE_LANGUAGES,
  WIRE_CATEGORIES,
} from '../../types/wireFeed';

const FEED_TYPE_LABELS: Record<WireFeedType, string> = {
  auto: 'Auto-Detect (RSS or Web)',
  rss: 'RSS / Atom Feed',
  website_section: 'Website Section Page',
  article: 'Single Article Page',
};

const POLL_INTERVAL_OPTIONS = [
  { value: 15, label: 'Every 15 minutes' },
  { value: 30, label: 'Every 30 minutes' },
  { value: 60, label: 'Every 60 minutes' },
  { value: 180, label: 'Every 3 hours' },
];

type ConsoleTab = 'sources' | 'activity' | 'deployment';

export const WireFeedsAdminPage: React.FC = () => {
  const { user, isPlatformAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<ConsoleTab>('sources');
  const [sources, setSources] = useState<WireFeedSource[]>([]);
  const [runs, setRuns] = useState<WireScraperRun[]>([]);
  const [workerStatus, setWorkerStatus] = useState<WireWorkerStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterState, setFilterState] = useState<'all' | 'active' | 'paused'>('all');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<WireFeedSource | null>(null);
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formFeedType, setFormFeedType] = useState<WireFeedType>('auto');
  const [formLanguage, setFormLanguage] = useState<WireLanguageCode>('en');
  const [formCategory, setFormCategory] = useState<string>(WIRE_CATEGORIES[0]);
  const [formRegionTag, setFormRegionTag] = useState('Pan-India');
  const [formPollInterval, setFormPollInterval] = useState<number>(30);
  const [formMaxItems, setFormMaxItems] = useState<number>(5);
  const [formEnabled, setFormEnabled] = useState<boolean>(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation state
  const [pendingDelete, setPendingDelete] = useState<WireFeedSource | null>(null);
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Wire Feeds & Syndication Sources | NewsPress Admin';

    const unsubSources = wireFeedService.subscribeSources(
      (data) => {
        setSources(data);
        setLoading(false);
      },
      (err) => {
        setErrorBanner(err.message || 'Unable to load wire feed sources.');
        setLoading(false);
      }
    );

    const unsubRuns = wireFeedService.subscribeRuns(
      (data) => setRuns(data),
      () => {
        // Keep silent if runs collection is empty
      }
    );

    const unsubWorker = wireFeedService.subscribeWorkerStatus(
      (status) => setWorkerStatus(status),
      () => {}
    );

    return () => {
      unsubSources();
      unsubRuns();
      unsubWorker();
    };
  }, [user?.uid]);

  const languageLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const l of WIRE_LANGUAGES) map[l.code] = l.label;
    return map;
  }, []);

  const filteredSources = useMemo(() => {
    return sources.filter((src) => {
      if (filterLanguage !== 'all' && src.language !== filterLanguage) return false;
      if (filterCategory !== 'all' && src.category !== filterCategory) return false;
      if (filterState === 'active' && !src.enabled) return false;
      if (filterState === 'paused' && src.enabled) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const match =
          src.name.toLowerCase().includes(q) ||
          src.url.toLowerCase().includes(q) ||
          src.category.toLowerCase().includes(q) ||
          (languageLabelMap[src.language] || src.language).toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [sources, filterLanguage, filterCategory, filterState, searchQuery, languageLabelMap]);

  const metrics = useMemo(() => {
    const activeCount = sources.filter((s) => s.enabled).length;
    const languagesCovered = new Set(sources.map((s) => s.language)).size;
    const totalPublished = sources.reduce((sum, s) => sum + (s.totalPublishedCount || 0), 0);
    return {
      totalSources: sources.length,
      activeCount,
      languagesCovered,
      totalPublished,
    };
  }, [sources]);

  const workerHealth = useMemo(() => {
    if (!workerStatus?.lastHeartbeatAt) {
      return { state: 'awaiting' as const, label: 'Awaiting First Worker Heartbeat' };
    }
    const ageMs = Date.now() - new Date(workerStatus.lastHeartbeatAt).getTime();
    if (ageMs < 10 * 60 * 1000) {
      return { state: 'online' as const, label: 'Worker Connected' };
    }
    if (ageMs < 60 * 60 * 1000) {
      return { state: 'idle' as const, label: 'Worker Idle' };
    }
    return { state: 'offline' as const, label: 'Heartbeat Stale' };
  }, [workerStatus]);

  const openCreateModal = () => {
    setEditingSource(null);
    setFormName('');
    setFormUrl('');
    setFormFeedType('auto');
    setFormLanguage(filterLanguage !== 'all' ? (filterLanguage as WireLanguageCode) : 'en');
    setFormCategory(filterCategory !== 'all' ? filterCategory : WIRE_CATEGORIES[0]);
    setFormRegionTag('Pan-India');
    setFormPollInterval(30);
    setFormMaxItems(5);
    setFormEnabled(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (src: WireFeedSource) => {
    setEditingSource(src);
    setFormName(src.name);
    setFormUrl(src.url);
    setFormFeedType(src.feedType);
    setFormLanguage(src.language);
    setFormCategory(src.category);
    setFormRegionTag(src.regionTag || 'Pan-India');
    setFormPollInterval(src.pollIntervalMinutes || 30);
    setFormMaxItems(src.maxItemsPerRun || 5);
    setFormEnabled(src.enabled);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const urlCheck = validateExternalFeedUrl(formUrl);
    if (!urlCheck.valid) {
      setFormError(urlCheck.error || 'Please enter a valid public HTTP/HTTPS URL.');
      return;
    }

    if (!formName.trim()) {
      setFormError('Source name is required.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingSource) {
        await wireFeedService.updateSource(editingSource.sourceId, {
          name: formName,
          url: urlCheck.normalizedUrl!,
          feedType: formFeedType,
          language: formLanguage,
          category: formCategory,
          regionTag: formRegionTag,
          pollIntervalMinutes: formPollInterval,
          maxItemsPerRun: formMaxItems,
          enabled: formEnabled,
        });
        setSuccessNotice(`Updated wire source "${formName.trim()}".`);
      } else {
        await wireFeedService.createSource({
          name: formName,
          url: urlCheck.normalizedUrl!,
          feedType: formFeedType,
          language: formLanguage,
          category: formCategory,
          regionTag: formRegionTag,
          pollIntervalMinutes: formPollInterval,
          maxItemsPerRun: formMaxItems,
          enabled: formEnabled,
          createdBy: user?.uid || 'platform-admin',
        });
        setSuccessNotice(
          `Added "${formName.trim()}" (${languageLabelMap[formLanguage]} · ${formCategory}). The GCE worker will pick it up on the next cycle.`
        );
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'Could not save feed source.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEnabled = async (src: WireFeedSource) => {
    setErrorBanner(null);
    try {
      await wireFeedService.updateSource(src.sourceId, { enabled: !src.enabled });
      setSuccessNotice(
        !src.enabled ? `Resumed feed "${src.name}".` : `Paused feed "${src.name}".`
      );
    } catch (err: any) {
      setErrorBanner(err?.message || 'Failed to update source status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setErrorBanner(null);
    try {
      await wireFeedService.deleteSource(pendingDelete.sourceId);
      setSuccessNotice(`Removed wire source "${pendingDelete.name}".`);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Failed to delete wire source.');
    } finally {
      setPendingDelete(null);
    }
  };

  const handleCopyCommand = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBlock(key);
    setTimeout(() => setCopiedBlock(null), 2000);
  };

  if (!isPlatformAdmin) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="p-8 rounded-2xl border border-[#e0e3e7] dark:border-[#3c4043] bg-white dark:bg-[#242629] text-center space-y-3">
          <div className="w-11 h-11 rounded-full bg-[#fce8e6] dark:bg-[#5c1916] text-[#c5221f] dark:text-[#f28b82] flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold text-[#202124] dark:text-white">
            Platform Administrator Access Required
          </h2>
          <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6] max-w-md mx-auto">
            Wire feed source management and Marketplace syndication controls are restricted to platform administrators.
          </p>
        </div>
      </div>
    );
  }

  const gcpProjectId = firebaseConfig.projectId || 'alfa-news-service-test-project';
  const firestoreDbId = firebaseConfig.firestoreDatabaseId || 'ai-studio-9028c422-4dc9-4d54-bb36-aecf77ecd094';

  const provisionVmCmd = `gcloud compute instances create newspress-wire-worker \\
  --project=${gcpProjectId} \\
  --zone=us-central1-a \\
  --machine-type=e2-micro \\
  --boot-disk-size=30GB \\
  --boot-disk-type=pd-standard \\
  --image-family=debian-12 \\
  --image-project=debian-cloud \\
  --scopes=https://www.googleapis.com/auth/datastore`;

  const grantIamCmd = `PROJECT_NUMBER=$(gcloud projects describe ${gcpProjectId} --format='value(projectNumber)')
gcloud projects add-iam-policy-binding ${gcpProjectId} \\
  --member="serviceAccount:\${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \\
  --role="roles/datastore.user"`;

  const deployWorkerCmd = `gcloud compute scp --recurse services/news-wire-worker newspress-wire-worker:~/ --zone=us-central1-a --project=${gcpProjectId}
gcloud compute ssh newspress-wire-worker --zone=us-central1-a --project=${gcpProjectId} \\
  --command="cd ~/news-wire-worker && sudo bash setup-vm.sh ${gcpProjectId} ${firestoreDbId}"`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Wire Feeds & Syndication Sources"
        subtitle="Configure RSS feeds and news websites by language and category for automated editorial rewrite and subscriber-included Marketplace publishing."
        breadcrumbs={[
          { label: 'Admin', href: '#/admin/platform' },
          { label: 'Marketplace Moderation', href: '#/marketplace/admin' },
          { label: 'Wire Feeds' },
        ]}
        actions={
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Feed Source
          </Button>
        }
      />

      {errorBanner && (
        <div className="p-3.5 rounded-xl border border-[#f6aea9] dark:border-[#8c1d18] bg-[#fce8e6] dark:bg-[#3c1918] text-xs text-[#a50e0e] dark:text-[#f28b82] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-xs font-medium underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {successNotice && (
        <div className="p-3.5 rounded-xl border border-[#a8dab5] dark:border-[#1e4620] bg-[#e6f4ea] dark:bg-[#132a17] text-xs text-[#137333] dark:text-[#81c995] flex items-center justify-between gap-3">
          <span>{successNotice}</span>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            className="text-xs font-medium underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Flat Single-Elevation Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-[#e0e3e7] dark:border-[#3c4043] bg-white dark:bg-[#242629]">
          <div className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">Configured Sources</div>
          <div className="mt-1 text-2xl font-semibold text-[#202124] dark:text-white tabular-nums">
            {metrics.totalSources}
          </div>
          <div className="mt-1 text-xs text-[#5f6368] dark:text-[#9aa0a6] tabular-nums">
            {metrics.activeCount} active · {metrics.totalSources - metrics.activeCount} paused
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#e0e3e7] dark:border-[#3c4043] bg-white dark:bg-[#242629]">
          <div className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">Languages Covered</div>
          <div className="mt-1 text-2xl font-semibold text-[#202124] dark:text-white tabular-nums">
            {metrics.languagesCovered}
          </div>
          <div className="mt-1 text-xs text-[#5f6368] dark:text-[#9aa0a6]">
            of {WIRE_LANGUAGES.length} Indian editions
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#e0e3e7] dark:border-[#3c4043] bg-white dark:bg-[#242629]">
          <div className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">Wire Stories Published</div>
          <div className="mt-1 text-2xl font-semibold text-[#202124] dark:text-white tabular-nums">
            {metrics.totalPublished}
          </div>
          <div className="mt-1 text-xs text-[#5f6368] dark:text-[#9aa0a6]">
            Subscriber-included (₹0)
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#e0e3e7] dark:border-[#3c4043] bg-white dark:bg-[#242629]">
          <div className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">Worker Node (e2-micro)</div>
          <div
            className={`mt-1 text-sm font-semibold ${
              workerHealth.state === 'online'
                ? 'text-[#137333] dark:text-[#81c995]'
                : workerHealth.state === 'idle'
                ? 'text-[#b06000] dark:text-[#fdd663]'
                : 'text-[#5f6368] dark:text-[#9aa0a6]'
            }`}
          >
            {workerHealth.label}
          </div>
          <div className="mt-1.5 text-xs text-[#5f6368] dark:text-[#9aa0a6] tabular-nums truncate">
            {workerStatus?.lastHeartbeatAt
              ? `Last ping ${formatDate(workerStatus.lastHeartbeatAt)}`
              : 'Deploy worker in Setup tab'}
          </div>
        </div>
      </div>

      {/* Segmented Console Navigation */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#f1f3f4] dark:bg-[#1b1c1f] w-fit max-w-full overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('sources')}
          className={`min-h-[36px] px-3.5 rounded-lg text-xs font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'sources'
              ? 'bg-white dark:bg-[#242629] text-[#202124] dark:text-white shadow-xs font-semibold'
              : 'text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-white'
          }`}
        >
          <Rss className="w-3.5 h-3.5" />
          <span>Feed Sources ({sources.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('activity')}
          className={`min-h-[36px] px-3.5 rounded-lg text-xs font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'activity'
              ? 'bg-white dark:bg-[#242629] text-[#202124] dark:text-white shadow-xs font-semibold'
              : 'text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Ingestion Activity ({runs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('deployment')}
          className={`min-h-[36px] px-3.5 rounded-lg text-xs font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'deployment'
              ? 'bg-white dark:bg-[#242629] text-[#202124] dark:text-white shadow-xs font-semibold'
              : 'text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-white'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Server Deployment (e2-micro)</span>
        </button>
      </div>

      {/* TAB 1: FEED SOURCES */}
      {activeTab === 'sources' && (
        <div className="rounded-2xl border border-[#e0e3e7] dark:border-[#3c4043] bg-white dark:bg-[#242629] overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-[#e0e3e7] dark:border-[#3c4043] flex flex-col lg:flex-row lg:items-center gap-2.5">
            <div className="flex-1">
              <Input
                placeholder="Search source name, domain, language, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                aria-label="Filter by language"
                value={filterLanguage}
                onChange={(e) => setFilterLanguage(e.target.value)}
                className="min-h-[40px] px-3 rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#1b1c1f] text-xs font-medium text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:border-[#1a73e8] cursor-pointer"
              >
                <option value="all">All Languages</option>
                {WIRE_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by category"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="min-h-[40px] px-3 rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#1b1c1f] text-xs font-medium text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:border-[#1a73e8] cursor-pointer"
              >
                <option value="all">All Categories</option>
                {WIRE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by status"
                value={filterState}
                onChange={(e) => setFilterState(e.target.value as 'all' | 'active' | 'paused')}
                className="min-h-[40px] px-3 rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#1b1c1f] text-xs font-medium text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:border-[#1a73e8] cursor-pointer"
              >
                <option value="all">All States</option>
                <option value="active">Active Only</option>
                <option value="paused">Paused Only</option>
              </select>
            </div>
          </div>

          {/* Sources Table */}
          {loading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3].map((row) => (
                <div
                  key={row}
                  className="h-11 rounded-lg bg-[#f1f3f4] dark:bg-[#1b1c1f] animate-pulse"
                />
              ))}
            </div>
          ) : filteredSources.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Globe className="w-9 h-9 mx-auto text-[#9aa0a6] stroke-1.5" />
              <h3 className="text-sm font-semibold text-[#202124] dark:text-white">
                {sources.length === 0 ? 'No wire feed sources configured yet' : 'No feed sources match your filters'}
              </h3>
              <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] max-w-md mx-auto">
                Add RSS/Atom feeds or regional news website URLs tagged with a target language and category. Your Compute Engine worker will rewrite each fresh story with a punchy headline and publish it directly to the Marketplace.
              </p>
              <div className="pt-1">
                <Button variant="primary" size="sm" onClick={openCreateModal}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add First Feed Source
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#e0e3e7] dark:border-[#3c4043] bg-[#f8f9fa] dark:bg-[#1b1c1f] text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6]">
                    <th className="py-2.5 px-4">Source & URL</th>
                    <th className="py-2.5 px-4">Language & Category</th>
                    <th className="py-2.5 px-4">Format & Cadence</th>
                    <th className="py-2.5 px-4 text-right">Published</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eceff1] dark:divide-[#3c4043] text-xs">
                  {filteredSources.map((src) => (
                    <tr
                      key={src.sourceId}
                      className="hover:bg-[#f8f9fa] dark:hover:bg-[#2a2d31] transition-colors"
                    >
                      <td className="py-3 px-4 max-w-[300px]">
                        <div className="font-semibold text-[#202124] dark:text-white truncate">
                          {src.name}
                        </div>
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 inline-flex items-center gap-1 text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] truncate max-w-full"
                        >
                          <span className="truncate">{src.url}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-[#202124] dark:text-[#e8eaed]">
                          {languageLabelMap[src.language] || src.language}
                        </div>
                        <div className="text-[#5f6368] dark:text-[#9aa0a6]">
                          {src.category}
                          {src.regionTag ? ` · ${src.regionTag}` : ''}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                        <div className="text-[#202124] dark:text-[#e8eaed]">
                          {FEED_TYPE_LABELS[src.feedType] || src.feedType}
                        </div>
                        <div className="text-[#5f6368] dark:text-[#9aa0a6]">
                          Every {src.pollIntervalMinutes}m · up to {src.maxItemsPerRun}/run
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap tabular-nums">
                        <div className="font-semibold text-[#202124] dark:text-white">
                          {src.totalPublishedCount || 0}
                        </div>
                        <div className="text-[#5f6368] dark:text-[#9aa0a6]">
                          {src.lastPolledAt ? formatDate(src.lastPolledAt) : 'Not polled yet'}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div
                          className={`font-medium ${
                            !src.enabled
                              ? 'text-[#5f6368] dark:text-[#9aa0a6]'
                              : src.lastStatus === 'failed'
                              ? 'text-[#c5221f] dark:text-[#f28b82]'
                              : 'text-[#137333] dark:text-[#81c995]'
                          }`}
                        >
                          {!src.enabled
                            ? 'Paused'
                            : src.lastStatus === 'failed'
                            ? 'Active · Last run error'
                            : 'Active'}
                        </div>
                        {src.lastError && (
                          <div className="text-[11px] text-[#c5221f] dark:text-[#f28b82] truncate max-w-[180px]" title={src.lastError}>
                            {src.lastError}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleEnabled(src)}
                            title={src.enabled ? 'Pause feed' : 'Resume feed'}
                            className="min-h-[32px] px-2.5 rounded-lg border border-[#dadce0] dark:border-[#3c4043] text-[#3c4043] dark:text-[#e8eaed] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                          >
                            {src.enabled ? (
                              <>
                                <Pause className="w-3.5 h-3.5" />
                                <span>Pause</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5" />
                                <span>Resume</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(src)}
                            title="Edit feed source"
                            aria-label={`Edit ${src.name}`}
                            className="min-h-[32px] w-8 rounded-lg border border-[#dadce0] dark:border-[#3c4043] text-[#3c4043] dark:text-[#e8eaed] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] inline-flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setPendingDelete(src)}
                            title="Delete feed source"
                            aria-label={`Delete ${src.name}`}
                            className="min-h-[32px] w-8 rounded-lg border border-[#dadce0] dark:border-[#3c4043] text-[#c5221f] dark:text-[#f28b82] hover:bg-[#fce8e6] dark:hover:bg-[#5c1916] inline-flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INGESTION ACTIVITY */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border border-[#e0e3e7] dark:border-[#3c4043] bg-white dark:bg-[#242629] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="font-semibold text-[#202124] dark:text-white">
                {workerStatus
                  ? `${workerStatus.hostname} · ${workerStatus.machineType} (${workerStatus.region})`
                  : 'Compute Engine e2-micro Worker Not Yet Connected'}
              </div>
              <div className="text-[#5f6368] dark:text-[#9aa0a6] tabular-nums">
                {workerStatus
                  ? `Status: ${workerHealth.label} · Memory: ${workerStatus.memoryUsageMb} MB · Published today: ${workerStatus.publishedTodayCount}`
                  : 'Once deployed on your Google Compute Engine e2-micro instance, live cycle heartbeats and published story counts appear here automatically.'}
              </div>
            </div>

            {!workerStatus && (
              <Button variant="secondary" size="sm" onClick={() => setActiveTab('deployment')}>
                View e2-micro Setup Guide
              </Button>
            )}
          </div>

          <div className="rounded-2xl border border-[#e0e3e7] dark:border-[#3c4043] bg-white dark:bg-[#242629] overflow-hidden">
            {runs.length === 0 ? (
              <div className="p-12 text-center space-y-2.5">
                <RefreshCw className="w-8 h-8 mx-auto text-[#9aa0a6] stroke-1.5" />
                <h3 className="text-sm font-semibold text-[#202124] dark:text-white">
                  No ingestion runs recorded yet
                </h3>
                <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] max-w-md mx-auto">
                  Each time the e2-micro worker polls your active feed sources, rewrites new stories, and publishes them to the Marketplace, a run summary is logged here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#e0e3e7] dark:border-[#3c4043] bg-[#f8f9fa] dark:bg-[#1b1c1f] text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6]">
                      <th className="py-2.5 px-4">Source</th>
                      <th className="py-2.5 px-4">Language · Category</th>
                      <th className="py-2.5 px-4 text-right">Fetched</th>
                      <th className="py-2.5 px-4 text-right">Duplicates</th>
                      <th className="py-2.5 px-4 text-right">Published</th>
                      <th className="py-2.5 px-4 text-right">Duration</th>
                      <th className="py-2.5 px-4">Outcome</th>
                      <th className="py-2.5 px-4 text-right">Completed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eceff1] dark:divide-[#3c4043] text-xs tabular-nums">
                    {runs.map((run) => (
                      <tr key={run.runId} className="hover:bg-[#f8f9fa] dark:hover:bg-[#2a2d31]">
                        <td className="py-3 px-4 font-medium text-[#202124] dark:text-white">
                          {run.sourceName}
                        </td>
                        <td className="py-3 px-4 text-[#5f6368] dark:text-[#9aa0a6]">
                          {languageLabelMap[run.language] || run.language} · {run.category}
                        </td>
                        <td className="py-3 px-4 text-right text-[#202124] dark:text-[#e8eaed]">
                          {run.fetchedCount}
                        </td>
                        <td className="py-3 px-4 text-right text-[#5f6368] dark:text-[#9aa0a6]">
                          {run.skippedDuplicates}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-[#137333] dark:text-[#81c995]">
                          {run.publishedCount}
                        </td>
                        <td className="py-3 px-4 text-right text-[#5f6368] dark:text-[#9aa0a6]">
                          {(run.durationMs / 1000).toFixed(1)}s
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-medium ${
                              run.status === 'success'
                                ? 'text-[#137333] dark:text-[#81c995]'
                                : run.status === 'partial'
                                ? 'text-[#b06000] dark:text-[#fdd663]'
                                : 'text-[#c5221f] dark:text-[#f28b82]'
                            }`}
                          >
                            {run.status === 'success'
                              ? 'Success'
                              : run.status === 'partial'
                              ? 'Partial'
                              : 'Failed'}
                          </span>
                          {run.errorMessage && (
                            <div className="text-[11px] text-[#c5221f] dark:text-[#f28b82] truncate max-w-[200px]" title={run.errorMessage}>
                              {run.errorMessage}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-[#5f6368] dark:text-[#9aa0a6] whitespace-nowrap">
                          {formatDate(run.completedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: GCE E2-MICRO DEPLOYMENT GUIDE */}
      {activeTab === 'deployment' && (
        <div className="rounded-2xl border border-[#e0e3e7] dark:border-[#3c4043] bg-white dark:bg-[#242629] p-5 sm:p-6 space-y-6">
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-[#202124] dark:text-white">
              Google Compute Engine e2-micro Always Free Worker Setup
            </h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] leading-relaxed max-w-3xl">
              The standalone worker package is pre-built for Google Cloud&apos;s Always Free e2-micro tier (1 GB RAM, 30 GB Standard Persistent Disk in us-central1, us-west1, or us-east1). It polls all active URLs saved above, extracts the article text and lead image, rewrites the headline and copy in the target language while preserving facts, and auto-publishes directly to your Firestore Marketplace.
            </p>
          </div>

          <div className="space-y-5">
            {/* Step 1 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold text-[#202124] dark:text-white">
                  1. Create the Always Free e2-micro Instance
                </h4>
                <button
                  type="button"
                  onClick={() => handleCopyCommand('vm', provisionVmCmd)}
                  className="text-xs font-medium text-[#1a73e8] dark:text-[#8ab4f8] inline-flex items-center gap-1 hover:underline cursor-pointer whitespace-nowrap shrink-0"
                >
                  {copiedBlock === 'vm' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedBlock === 'vm' ? 'Copied' : 'Copy command'}
                </button>
              </div>
              <pre className="p-3.5 rounded-xl bg-[#f8f9fa] dark:bg-[#16171a] border border-[#e0e3e7] dark:border-[#3c4043] text-xs font-mono text-[#202124] dark:text-[#e8eaed] overflow-x-auto leading-relaxed">
                {provisionVmCmd}
              </pre>
            </div>

            {/* Step 2 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold text-[#202124] dark:text-white">
                  2. Grant Least-Privilege Firestore Access (roles/datastore.user)
                </h4>
                <button
                  type="button"
                  onClick={() => handleCopyCommand('iam', grantIamCmd)}
                  className="text-xs font-medium text-[#1a73e8] dark:text-[#8ab4f8] inline-flex items-center gap-1 hover:underline cursor-pointer whitespace-nowrap shrink-0"
                >
                  {copiedBlock === 'iam' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedBlock === 'iam' ? 'Copied' : 'Copy command'}
                </button>
              </div>
              <pre className="p-3.5 rounded-xl bg-[#f8f9fa] dark:bg-[#16171a] border border-[#e0e3e7] dark:border-[#3c4043] text-xs font-mono text-[#202124] dark:text-[#e8eaed] overflow-x-auto leading-relaxed">
                {grantIamCmd}
              </pre>
            </div>

            {/* Step 3 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold text-[#202124] dark:text-white">
                  3. Upload & Install the systemd Worker Daemon
                </h4>
                <button
                  type="button"
                  onClick={() => handleCopyCommand('deploy', deployWorkerCmd)}
                  className="text-xs font-medium text-[#1a73e8] dark:text-[#8ab4f8] inline-flex items-center gap-1 hover:underline cursor-pointer whitespace-nowrap shrink-0"
                >
                  {copiedBlock === 'deploy' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedBlock === 'deploy' ? 'Copied' : 'Copy command'}
                </button>
              </div>
              <pre className="p-3.5 rounded-xl bg-[#f8f9fa] dark:bg-[#16171a] border border-[#e0e3e7] dark:border-[#3c4043] text-xs font-mono text-[#202124] dark:text-[#e8eaed] overflow-x-auto leading-relaxed">
                {deployWorkerCmd}
              </pre>
            </div>

            {/* Step 4 */}
            <div className="pt-2 border-t border-[#eceff1] dark:border-[#3c4043] text-xs text-[#5f6368] dark:text-[#9aa0a6] space-y-1.5">
              <div className="font-semibold text-[#202124] dark:text-white">
                4. Finalize Server Environment & Start Service
              </div>
              <p>
                On the VM, configure your 4 project keys (<code className="font-mono text-[#202124] dark:text-[#e8eaed]">GEMINI_API_KEY_1</code> through{' '}
                <code className="font-mono text-[#202124] dark:text-[#e8eaed]">GEMINI_API_KEY_4</code>) inside{' '}
                <code className="font-mono text-[#202124] dark:text-[#e8eaed]">/etc/newspress-wire-worker.env</code> (root-owned permissions <code className="font-mono">0640</code>), then run{' '}
                <code className="font-mono text-[#202124] dark:text-[#e8eaed]">sudo systemctl restart newspress-wire-worker</code> and inspect logs with{' '}
                <code className="font-mono text-[#202124] dark:text-[#e8eaed]">journalctl -u newspress-wire-worker -f</code>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT SOURCE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSource ? 'Edit Wire Feed Source' : 'Add Wire Feed Source'}
        subtitle="Stories from this source are rewritten in the selected language and published automatically under the selected category."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveSource} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-[#fce8e6] dark:bg-[#3c1918] border border-[#f6aea9] dark:border-[#8c1d18] text-xs text-[#a50e0e] dark:text-[#f28b82] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#3c4043] dark:text-[#e8eaed] mb-1">
                Source Name
              </label>
              <Input
                placeholder="e.g., National Politics Wire or Regional Sports RSS"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#3c4043] dark:text-[#e8eaed] mb-1">
                Feed or Website URL (RSS, Atom, Section, or Article)
              </label>
              <Input
                type="url"
                placeholder="https://example-news.in/rss/politics.xml"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3c4043] dark:text-[#e8eaed] mb-1">
                Target Language
              </label>
              <select
                value={formLanguage}
                onChange={(e) => setFormLanguage(e.target.value as WireLanguageCode)}
                className="w-full min-h-[40px] px-3 rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#1b1c1f] text-xs font-medium text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:border-[#1a73e8]"
              >
                {WIRE_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label} ({lang.regionHint})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3c4043] dark:text-[#e8eaed] mb-1">
                Target Marketplace Category
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full min-h-[40px] px-3 rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#1b1c1f] text-xs font-medium text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:border-[#1a73e8]"
              >
                {WIRE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3c4043] dark:text-[#e8eaed] mb-1">
                Source Format
              </label>
              <select
                value={formFeedType}
                onChange={(e) => setFormFeedType(e.target.value as WireFeedType)}
                className="w-full min-h-[40px] px-3 rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#1b1c1f] text-xs font-medium text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:border-[#1a73e8]"
              >
                {(Object.keys(FEED_TYPE_LABELS) as WireFeedType[]).map((ft) => (
                  <option key={ft} value={ft}>
                    {FEED_TYPE_LABELS[ft]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3c4043] dark:text-[#e8eaed] mb-1">
                Polling Interval
              </label>
              <select
                value={formPollInterval}
                onChange={(e) => setFormPollInterval(Number(e.target.value))}
                className="w-full min-h-[40px] px-3 rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#1b1c1f] text-xs font-medium text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:border-[#1a73e8]"
              >
                {POLL_INTERVAL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3c4043] dark:text-[#e8eaed] mb-1">
                Max Stories per Cycle (1–15)
              </label>
              <Input
                type="number"
                min={1}
                max={15}
                value={String(formMaxItems)}
                onChange={(e) => setFormMaxItems(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3c4043] dark:text-[#e8eaed] mb-1">
                Region / State Label (Optional)
              </label>
              <Input
                placeholder="e.g., Pan-India, Maharashtra, Karnataka"
                value={formRegionTag}
                onChange={(e) => setFormRegionTag(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formEnabled}
              onChange={(e) => setFormEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-[#dadce0] text-[#1a73e8] focus:ring-[#1a73e8]"
            />
            <span className="text-xs text-[#3c4043] dark:text-[#e8eaed]">
              Enable immediate scheduled ingestion and direct Marketplace publishing (free for active subscribers)
            </span>
          </label>

          <div className="pt-3 border-t border-[#eceff1] dark:border-[#3c4043] flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
              {isSaving ? 'Saving...' : editingSource ? 'Save Changes' : 'Add Feed Source'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION */}
      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Remove Wire Feed Source"
        message={`Remove "${pendingDelete?.name || ''}" from the ingestion schedule? Previously published Marketplace stories will remain available.`}
        confirmLabel="Remove Source"
        variant="danger"
      />
    </div>
  );
};
