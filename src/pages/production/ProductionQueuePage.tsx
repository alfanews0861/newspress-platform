/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Night Production & Press Queue Dashboard (Phase 5)
 * Real-time monitoring of automated rasterization jobs, stage progression,
 * fair tenant scheduling, worker lease recovery, and print preflight diagnostics.
 */

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Play,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  RotateCw,
  Ban,
  ShieldCheck,
  Layers,
  Cpu,
  RefreshCw,
  Printer,
  ChevronRight,
  Eye,
  Info,
  Server,
  Zap,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { ProductionJob, ProductionSnapshot, ProductionPreflightReport } from '../../types/production';
import { ProductionQueueService } from '../../services/productionQueueService';
import { PrintPreflightService } from '../../services/printPreflightService';
import { MOCK_CURRENT_EDITION, MOCK_TEMPLATES, MOCK_BRANDS } from '../../services/mockDataService';
import { EditionPersistenceService } from '../../services/editionPersistenceService';

export const ProductionQueuePage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { can } = usePermission();

  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<ProductionJob | null>(null);
  const [selectedReport, setSelectedReport] = useState<ProductionPreflightReport | null>(null);
  const [isProcessingCycle, setIsProcessingCycle] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [maxConcurrency, setMaxConcurrency] = useState<number>(1);

  // Load jobs on mount and poll
  const loadJobs = () => {
    const list = ProductionQueueService.getJobsForTenant(currentTenant.tenantId);
    setJobs([...list]);
    setMaxConcurrency(ProductionQueueService.getMaxConcurrentJobs());
  };

  useEffect(() => {
    // If no jobs present yet, initialize default demo queue job if current edition is present
    const existing = ProductionQueueService.getJobsForTenant(currentTenant.tenantId);
    if (existing.length === 0) {
      // Create an initial sample snapshot & queued job for demonstration
      EditionPersistenceService.finalizeEdition(
        MOCK_CURRENT_EDITION.editionId,
        currentTenant.tenantId,
        user?.uid || 'user-editor-in-chief',
        'editor_in_chief',
        MOCK_TEMPLATES[0],
        MOCK_BRANDS[0]
      ).then(() => {
        loadJobs();
      });
    } else {
      loadJobs();
    }
  }, [currentTenant.tenantId]);

  // Run a single worker execution cycle
  const handleTriggerWorkerCycle = async () => {
    setIsProcessingCycle(true);
    setActionMessage('Scheduler checking due jobs and worker leases...');

    try {
      // Step 1: Recover any expired leases
      const recovered = ProductionQueueService.recoverExpiredLeases();
      if (recovered > 0) {
        setActionMessage(`Recovered ${recovered} expired worker lease(s).`);
      }

      // Step 2: Claim next eligible job
      const eligible = ProductionQueueService.getNextEligibleJob();
      if (!eligible) {
        // If no job is scheduled right now, check if there are queued jobs we can process by force for testing
        const queued = jobs.find((j) => j.status === 'QUEUED' || j.status === 'RETRY_SCHEDULED');
        if (queued) {
          const workerId = `worker-cloud-east1-${Math.floor(Math.random() * 900 + 100)}`;
          setActionMessage(`Claiming queued job ${queued.productionJobId} with ${workerId}...`);
          await ProductionQueueService.claimJob(queued.productionJobId, workerId);
          loadJobs();

          setActionMessage(`Worker ${workerId} executing vector rendering pipeline...`);
          const res = await ProductionQueueService.processJob(queued.productionJobId, workerId);
          loadJobs();

          if (res.success) {
            setActionMessage(`Job completed successfully! Print PDF & Digital PDF ready.`);
          } else {
            setActionMessage(`Job preflight/rendering failed: ${res.errors?.join(', ')}`);
          }
        } else {
          setActionMessage('No pending jobs due in the current production window.');
        }
      } else {
        const workerId = `worker-cloud-east1-${Math.floor(Math.random() * 900 + 100)}`;
        await ProductionQueueService.claimJob(eligible.productionJobId, workerId);
        loadJobs();

        setActionMessage(`Worker ${workerId} rendering edition...`);
        const res = await ProductionQueueService.processJob(eligible.productionJobId, workerId);
        loadJobs();

        if (res.success) {
          setActionMessage(`Edition ${eligible.editionId} produced successfully.`);
        } else {
          setActionMessage(`Production failed: ${res.errors?.[0]}`);
        }
      }
    } catch (err: any) {
      setActionMessage(`Worker cycle error: ${err.message}`);
    } finally {
      setIsProcessingCycle(false);
      loadJobs();
    }
  };

  // Cancel a queued job
  const handleCancelJob = async (jobId: string) => {
    const res = await ProductionQueueService.cancelJob(
      jobId,
      user?.uid || 'user-editor',
      'editor_in_chief',
      'Cancelled by managing editor from Production Dashboard'
    );
    if (res.success) {
      setActionMessage(`Job ${jobId} cancelled.`);
      loadJobs();
    } else {
      alert(`Cannot cancel job: ${res.reason}`);
    }
  };

  // View preflight report
  const handleViewPreflight = (reportId?: string) => {
    if (!reportId) return;
    const rep = PrintPreflightService.getReport(reportId);
    if (rep) {
      setSelectedReport(rep);
    }
  };

  // Pipeline stage step mapping
  const PIPELINE_STAGES = [
    { key: 'QUEUED', label: 'Queued', icon: Clock },
    { key: 'PREPARING', label: 'Preparing', icon: Layers },
    { key: 'RENDERING', label: 'Rendering Pages', icon: Cpu },
    { key: 'IMAGE_PROCESSING', label: 'Processing Images', icon: RefreshCw },
    { key: 'FONT_EMBEDDING', label: 'Embedding Fonts', icon: FileText },
    { key: 'PREFLIGHT', label: 'Print Preflight', icon: ShieldCheck },
    { key: 'PACKAGING', label: 'Packaging', icon: Printer },
    { key: 'READY', label: 'Ready for Press', icon: CheckCircle2 },
  ];

  const getStageIndex = (stage: string) => {
    const idx = PIPELINE_STAGES.findIndex((s) => s.key === stage);
    return idx >= 0 ? idx : 0;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Night Production & Press Queue"
        subtitle="Monitored overnight RIP processing, automated vector page rendering, and preflight quality control."
        breadcrumbs={[
          { label: 'Production', href: '#' },
          { label: 'Production Queue' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadJobs}
              leftIcon={<RotateCw className="w-4 h-4" />}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleTriggerWorkerCycle}
              isLoading={isProcessingCycle}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
              leftIcon={<Play className="w-4 h-4 fill-current" />}
            >
              Run Worker Cycle
            </Button>
          </div>
        }
      />

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 px-4 py-3 rounded-lg flex items-center justify-between text-xs font-sans">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Zap className="w-4 h-4" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-200">
            Dismiss
          </button>
        </div>
      )}

      {/* Queue Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-slate-500 dark:text-slate-400">Queue Status</span>
            <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {jobs.filter((j) => j.status === 'QUEUED' || j.status === 'CLAIMED').length} Active
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Concurrency limit: <strong className="text-blue-600 dark:text-blue-400">{maxConcurrency} job at a time</strong>
          </span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-slate-500 dark:text-slate-400">Night Window</span>
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            10:00 PM
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Publication Timezone: <strong className="text-slate-700 dark:text-slate-300">Asia/Kolkata (IST)</strong>
          </span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-slate-500 dark:text-slate-400">Ready Editions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {jobs.filter((j) => j.status === 'READY').length}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Passed automated preflight checks</span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-slate-500 dark:text-slate-400">Failed / Blocked</span>
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
            {jobs.filter((j) => j.status === 'FAILED').length}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Requires editorial correction</span>
        </Card>
      </div>

      {/* Main Jobs Queue Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Production Jobs Pool
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Showing {jobs.length} production job(s)
          </span>
        </div>

        {jobs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Clock className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-600" />
            <p className="text-sm">The production queue is currently empty.</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Finalize an edition in the Page Designer to queue it for automated overnight rendering.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {jobs.map((job) => {
              const currentStageIdx = getStageIndex(job.stage);
              const isReady = job.status === 'READY';
              const isFailed = job.status === 'FAILED';
              const isProcessing = job.status === 'CLAIMED' || job.status === 'PROCESSING' || job.status === 'RENDERING';
              const isQueued = job.status === 'QUEUED' || job.status === 'RETRY_SCHEDULED';

              return (
                <div key={job.productionJobId} className="p-5 hover:bg-slate-850/40 transition-colors space-y-4">
                  {/* Top Job Row */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 text-sm">
                          {job.brandId} • Edition {job.editionDate}
                        </span>
                        <Badge
                          variant={
                            isReady
                              ? 'emerald'
                              : isFailed
                              ? 'rose'
                              : isProcessing
                              ? 'amber'
                              : 'default'
                          }
                          className="font-mono text-[10px]"
                        >
                          {job.status}
                        </Badge>
                        <span className="text-xs font-mono text-slate-500">
                          Priority {job.priority}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-3">
                        <span>Job ID: <code className="text-slate-300">{job.productionJobId}</code></span>
                        <span>•</span>
                        <span>Scheduled For: <strong className="text-slate-200">{new Date(job.scheduledFor).toLocaleTimeString()}</strong></span>
                        {job.attemptCount > 0 && (
                          <>
                            <span>•</span>
                            <span>Attempt: {job.attemptCount}/{job.maxAttempts}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      {job.preflightReportId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewPreflight(job.preflightReportId)}
                          leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-blue-400" />}
                          className="text-xs"
                        >
                          Preflight QC ({job.preflightResult})
                        </Button>
                      )}

                      {isReady && job.outputFiles && (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={job.outputFiles.printPdfDataUri || '#'}
                            download={`Print-${job.editionId}.pdf`}
                            className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium"
                          >
                            <Download className="w-3.5 h-3.5" /> Print PDF ({Math.round((job.outputFiles.printSizeBytes || 0) / 1024)} KB)
                          </a>
                          <a
                            href={job.outputFiles.digitalPdfDataUri || '#'}
                            download={`Digital-${job.editionId}.pdf`}
                            className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium"
                          >
                            <Download className="w-3.5 h-3.5" /> Digital PDF
                          </a>
                        </div>
                      )}

                      {isQueued && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelJob(job.productionJobId)}
                          className="text-xs text-red-400 hover:text-red-300 border-red-900/50"
                          leftIcon={<Ban className="w-3.5 h-3.5" />}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Stage-Based Progress Stepper */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
                      <span>Pipeline Progress: <strong className="text-blue-600 dark:text-blue-400">{job.stage}</strong></span>
                      <span>{job.progressPercent}% Complete</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-1">
                      {PIPELINE_STAGES.map((stg, idx) => {
                        const Icon = stg.icon;
                        const isPast = currentStageIdx > idx || isReady;
                        const isCurrent = currentStageIdx === idx && !isReady && !isFailed;
                        const isStepFailed = isFailed && currentStageIdx === idx;

                        return (
                          <div
                            key={stg.key}
                            className={`p-2 rounded-lg border text-center flex flex-col items-center gap-1 transition-all ${
                              isStepFailed
                                ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400'
                                : isPast
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-medium'
                                : isCurrent
                                ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/30 font-medium'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 opacity-60'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-mono leading-tight truncate w-full">
                              {stg.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {isFailed && job.failureMessage && (
                      <div className="mt-2 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                        <span><strong>Failure ({job.failureCode}):</strong> {job.failureMessage}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Preflight QC Modal */}
      {selectedReport && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReport(null)}
          title={`Preflight Quality Control Report (${selectedReport.result})`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-slate-800 dark:text-slate-200 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-slate-500 dark:text-slate-400 font-mono">Report ID:</span> {selectedReport.reportId}
              </div>
              <Badge
                variant={selectedReport.result === 'PASS' ? 'emerald' : selectedReport.result === 'FAIL' ? 'rose' : 'amber'}
              >
                {selectedReport.result}
              </Badge>
            </div>

            {selectedReport.errors.length > 0 && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl space-y-1">
                <span className="font-bold text-red-700 dark:text-red-400 uppercase font-mono">Hard Errors ({selectedReport.errors.length})</span>
                {selectedReport.errors.map((err, i) => (
                  <p key={i} className="text-red-700 dark:text-red-300">• {err}</p>
                ))}
              </div>
            )}

            {selectedReport.warnings.length > 0 && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1">
                <span className="font-bold text-amber-800 dark:text-amber-300 uppercase font-mono">Editorial Warnings ({selectedReport.warnings.length})</span>
                {selectedReport.warnings.map((w, i) => (
                  <p key={i} className="text-amber-800 dark:text-amber-200">• {w}</p>
                ))}
              </div>
            )}

            {/* Font Preflight Details */}
            <div className="space-y-2">
              <span className="font-bold uppercase font-mono text-slate-500 dark:text-slate-400">Typography & Script Embedding</span>
              <div className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                {selectedReport.fontResults.map((f, i) => (
                  <div key={i} className="p-2.5 flex items-center justify-between">
                    <div>
                      <strong className="text-slate-900 dark:text-slate-100">{f.fontFamily}</strong>
                      <span className="text-[11px] text-slate-500 ml-2">({f.script})</span>
                    </div>
                    <Badge variant={f.status === 'embedded' ? 'emerald' : 'rose'} className="text-[10px]">
                      {f.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Image Preflight Details */}
            {selectedReport.imageResults.length > 0 && (
              <div className="space-y-2">
                <span className="font-bold uppercase font-mono text-slate-500 dark:text-slate-400">Image Resolution & DPI Analysis</span>
                <div className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  {selectedReport.imageResults.map((img, i) => (
                    <div key={i} className="p-2.5 flex items-center justify-between">
                      <div>
                        <span className="text-slate-700 dark:text-slate-300 font-mono">{img.mediaId}</span>
                        <span className="text-[11px] text-slate-500 ml-2">
                          Effective: <strong className="text-slate-900 dark:text-slate-100">{img.effectiveDPI} DPI</strong> ({img.dimensions.widthPx}x{img.dimensions.heightPx}px)
                        </span>
                      </div>
                      <Badge variant={img.status === 'GOOD' ? 'emerald' : img.status === 'WARNING' ? 'amber' : 'rose'} className="text-[10px]">
                        {img.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
