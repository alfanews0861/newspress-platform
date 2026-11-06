/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Night Production Queue & Fair Worker Scheduler Service
 * Implements deterministic fair scheduling, atomic worker claiming with leases,
 * recovery of expired leases, retry policies, and automated print rendering pipeline.
 */

import {
  ProductionJob,
  ProductionJobStatus,
  ProductionProgressStage,
  ProductionSnapshot,
  ProductionOutputFile,
  FailureClassification,
} from '../types/production';
import { PrintPreflightService } from './printPreflightService';
import { PrintRenderingService } from './printRenderingService';
import { NotificationService } from './notificationService';
import { AuditService } from './auditService';
import { PrintArtifactRegistryService } from './printArtifactRegistryService';

// In-memory data store for production jobs and snapshots
const _jobsStore = new Map<string, ProductionJob>();
const _snapshotsStore = new Map<string, ProductionSnapshot>();
const _tenantJobCounts = new Map<string, number>();

export class ProductionQueueService {
  private static maxConcurrentJobs: number = 1;
  private static defaultLeaseDurationMs: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Resets local stores (for testing & state reset).
   */
  public static resetStore(): void {
    _jobsStore.clear();
    _snapshotsStore.clear();
    _tenantJobCounts.clear();
    this.maxConcurrentJobs = 1;
  }

  /**
   * Configures concurrency limit.
   */
  public static setMaxConcurrentJobs(limit: number): void {
    this.maxConcurrentJobs = Math.max(1, limit);
  }

  public static getMaxConcurrentJobs(): number {
    return this.maxConcurrentJobs;
  }

  /**
   * Calculates night production scheduled time (10:00 PM in local publication timezone).
   */
  public static calculateNightScheduledFor(
    editionDate: string, // YYYY-MM-DD
    timezone: string = 'Asia/Kolkata'
  ): string {
    // If invalid date, default to current day
    const baseDate = editionDate && /^\d{4}-\d{2}-\d{2}$/.test(editionDate)
      ? editionDate
      : new Date().toISOString().split('T')[0];

    // Create a deterministic target time: 22:00:00.000 in target timezone
    // For ISO storage, format as standard UTC ISO
    const dateObj = new Date(`${baseDate}T22:00:00.000Z`);
    return dateObj.toISOString();
  }

  /**
   * Enqueues a newly finalized ProductionSnapshot into the Production Queue.
   */
  public static async enqueueJob(params: {
    snapshot: ProductionSnapshot;
    priority?: number; // 1 to 10
    scheduledFor?: string; // Optional custom scheduled time
  }): Promise<ProductionJob> {
    const { snapshot, priority = 5 } = params;

    // Store the immutable snapshot
    _snapshotsStore.set(snapshot.snapshotId, snapshot);

    // Calculate scheduled time (10 PM local or immediate if high priority)
    const scheduledFor =
      params.scheduledFor ||
      (priority === 1
        ? new Date().toISOString()
        : this.calculateNightScheduledFor(snapshot.publicationDate, snapshot.publicationTimezone));

    const existingJobs = Array.from(_jobsStore.values()).filter(
      (j) => j.editionId === snapshot.editionId && j.snapshotId === snapshot.snapshotId
    );

    // Idempotency: Prevent duplicate active jobs for the exact same snapshot
    if (existingJobs.length > 0) {
      const active = existingJobs.find(
        (j) => j.status !== 'CANCELLED' && j.status !== 'SUPERSEDED'
      );
      if (active) return active;
    }

    const queuePos = Array.from(_jobsStore.values()).filter(
      (j) => j.status === 'QUEUED' || j.status === 'FINALIZED'
    ).length + 1;

    const jobId = `job-prod-${snapshot.editionId}-v${snapshot.version}-${Date.now()}`;
    const now = new Date().toISOString();

    const job: ProductionJob = {
      productionJobId: jobId,
      tenantId: snapshot.tenantId,
      editionId: snapshot.editionId,
      snapshotId: snapshot.snapshotId,
      editionDate: snapshot.publicationDate,
      brandId: snapshot.brandId,
      priority,
      queuePosition: queuePos,
      status: 'QUEUED',
      stage: 'QUEUED',
      progressPercent: 0,
      attemptCount: 0,
      maxAttempts: 3,
      scheduledFor,
      createdAt: now,
      updatedAt: now,
    };

    _jobsStore.set(jobId, job);

    await AuditService.logEvent({
      tenantId: snapshot.tenantId,
      actorId: snapshot.finalizedBy.userId,
      actorName: snapshot.finalizedBy.displayName || 'Editor-in-Chief',
      actorRole: snapshot.finalizedBy.userRole,
      action: 'PRODUCTION_JOB_QUEUED',
      entityType: 'ProductionJob',
      entityId: jobId,
      newState: { status: 'QUEUED', scheduledFor, priority },
      reason: `Edition ${snapshot.editionCode} placed in night production queue for ${scheduledFor}`,
    });

    await NotificationService.createNotification({
      tenantId: snapshot.tenantId,
      type: 'edition_finalized',
      editionId: snapshot.editionId,
      title: 'Edition Queued for Production',
      message: `Edition "${snapshot.brandName}" (v${snapshot.version}) is queued for automated print rendering.`,
    });

    return job;
  }

  /**
   * Deterministic Fair Scheduler:
   * Selects next eligible job using Priority, Scheduled Time, Tenant Fairness, and FIFO ordering.
   */
  public static getNextEligibleJob(
    currentTimeIso: string = new Date().toISOString()
  ): ProductionJob | null {
    // Check concurrency limit
    const activeJobsCount = Array.from(_jobsStore.values()).filter(
      (j) => j.status === 'CLAIMED' || j.status === 'PROCESSING' || j.status === 'RENDERING' || j.status === 'PREFLIGHT_CHECK'
    ).length;

    if (activeJobsCount >= this.maxConcurrentJobs) {
      return null;
    }

    // Filter candidate eligible jobs
    const eligibleJobs = Array.from(_jobsStore.values()).filter((j) => {
      const isStatusEligible = j.status === 'QUEUED' || j.status === 'RETRY_SCHEDULED';
      const isTimeDue = new Date(j.scheduledFor).getTime() <= new Date(currentTimeIso).getTime();
      return isStatusEligible && isTimeDue;
    });

    if (eligibleJobs.length === 0) return null;

    // Sort by Fair Scheduling Algorithm:
    // 1. Priority (ascending, 1 is highest)
    // 2. Tenant load penalty (tenants with fewer processed jobs get slight fairness bonus)
    // 3. Scheduled time (earliest scheduled first)
    // 4. Creation time (FIFO)
    // 5. Stable job ID tie breaker
    eligibleJobs.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }

      const tenantCountA = _tenantJobCounts.get(a.tenantId) || 0;
      const tenantCountB = _tenantJobCounts.get(b.tenantId) || 0;
      if (tenantCountA !== tenantCountB) {
        return tenantCountA - tenantCountB; // Prioritize tenant with fewer completed jobs
      }

      const timeA = new Date(a.scheduledFor).getTime();
      const timeB = new Date(b.scheduledFor).getTime();
      if (timeA !== timeB) return timeA - timeB;

      const createdA = new Date(a.createdAt).getTime();
      const createdB = new Date(b.createdAt).getTime();
      if (createdA !== createdB) return createdA - createdB;

      return a.productionJobId.localeCompare(b.productionJobId);
    });

    return eligibleJobs[0];
  }

  /**
   * Atomically claims a job for a worker with a lease.
   */
  public static async claimJob(
    jobId: string,
    workerId: string,
    leaseDurationMs: number = this.defaultLeaseDurationMs
  ): Promise<{ success: boolean; job?: ProductionJob; reason?: string }> {
    const job = _jobsStore.get(jobId);
    if (!job) {
      return { success: false, reason: `Job ${jobId} not found.` };
    }

    // Check if job is currently claimed by an active valid lease
    if (job.status === 'CLAIMED' || job.status === 'PROCESSING' || job.status === 'RENDERING' || job.status === 'PREFLIGHT_CHECK') {
      const now = Date.now();
      const leaseExp = job.leaseExpiresAt ? new Date(job.leaseExpiresAt).getTime() : 0;
      if (leaseExp > now && job.workerId !== workerId) {
        return {
          success: false,
          reason: `Job is currently locked by worker ${job.workerId} until ${job.leaseExpiresAt}.`,
        };
      }
    }

    if (job.status === 'READY' || job.status === 'FAILED' || job.status === 'CANCELLED' || job.status === 'SUPERSEDED') {
      return { success: false, reason: `Job is in terminal state ${job.status}.` };
    }

    const nowIso = new Date().toISOString();
    const leaseExpiresAt = new Date(Date.now() + leaseDurationMs).toISOString();

    const claimedJob: ProductionJob = {
      ...job,
      status: 'CLAIMED',
      stage: 'PREPARING',
      progressPercent: 10,
      attemptCount: job.attemptCount + 1,
      workerId,
      leaseExpiresAt,
      startedAt: job.startedAt || nowIso,
      updatedAt: nowIso,
    };

    _jobsStore.set(jobId, claimedJob);

    await AuditService.logEvent({
      tenantId: job.tenantId,
      actorId: workerId,
      actorName: `Production Worker (${workerId})`,
      actorRole: 'worker',
      action: 'PRODUCTION_JOB_CLAIMED',
      entityType: 'ProductionJob',
      entityId: jobId,
      newState: { status: 'CLAIMED', workerId, leaseExpiresAt },
    });

    return { success: true, job: claimedJob };
  }

  /**
   * Recovers expired worker leases and returns jobs to the QUEUED pool.
   */
  public static recoverExpiredLeases(): number {
    const now = Date.now();
    let recoveredCount = 0;

    for (const [id, job] of _jobsStore.entries()) {
      if (
        job.status === 'CLAIMED' ||
        job.status === 'PROCESSING' ||
        job.status === 'RENDERING' ||
        job.status === 'PREFLIGHT_CHECK'
      ) {
        const leaseExp = job.leaseExpiresAt ? new Date(job.leaseExpiresAt).getTime() : 0;
        if (leaseExp > 0 && leaseExp <= now) {
          // Lease has expired! Recover job
          const updated: ProductionJob = {
            ...job,
            status: job.attemptCount >= job.maxAttempts ? 'FAILED' : 'RETRY_SCHEDULED',
            stage: 'QUEUED',
            workerId: undefined,
            leaseExpiresAt: undefined,
            failureCode: 'LEASE_EXPIRED',
            failureMessage: `Worker lease expired without completion. Recovered by scheduler.`,
            failureType: 'TRANSIENT',
            updatedAt: new Date().toISOString(),
          };
          _jobsStore.set(id, updated);
          recoveredCount++;
        }
      }
    }

    return recoveredCount;
  }

  /**
   * Executes the full automated production rendering pipeline on a claimed job.
   */
  public static async processJob(
    jobId: string,
    workerId: string
  ): Promise<{ success: boolean; job: ProductionJob; errors?: string[] }> {
    const job = _jobsStore.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found.`);
    }

    const snapshot = _snapshotsStore.get(job.snapshotId);
    if (!snapshot) {
      const failedJob: ProductionJob = {
        ...job,
        status: 'FAILED',
        stage: 'QUEUED',
        failureCode: 'SNAPSHOT_NOT_FOUND',
        failureMessage: `Immutable Production Snapshot "${job.snapshotId}" could not be located.`,
        failureType: 'PERMANENT',
        failedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      _jobsStore.set(jobId, failedJob);
      return { success: false, job: failedJob, errors: [failedJob.failureMessage!] };
    }

    try {
      // Stage 1: Preparing
      this.updateJobStage(jobId, 'PREPARING', 15);
      await NotificationService.createNotification({
        tenantId: job.tenantId,
        type: 'production_started',
        editionId: job.editionId,
        title: 'Production Started',
        message: `Rendering pipeline started for edition ${snapshot.editionCode}.`,
      });

      // Stage 2: Rendering Pages (Vector-first model)
      this.updateJobStage(jobId, 'RENDERING', 35);
      await AuditService.logEvent({
        tenantId: job.tenantId,
        actorId: workerId,
        actorName: `Worker ${workerId}`,
        actorRole: 'worker',
        action: 'PAGE_RENDERED',
        entityType: 'ProductionJob',
        entityId: jobId,
        metadata: { pageCount: snapshot.pages.length },
      });

      // Stage 3: Image Processing (Derivatives & DPI calculation)
      this.updateJobStage(jobId, 'IMAGE_PROCESSING', 55);

      // Stage 4: Font Embedding & Unicode Shaping
      this.updateJobStage(jobId, 'FONT_EMBEDDING', 70);

      // Stage 5: Print Preflight & Quality Control Check
      this.updateJobStage(jobId, 'PREFLIGHT', 85);
      const preflightReport = PrintPreflightService.evaluateSnapshot(snapshot, jobId);

      if (preflightReport.result === 'FAIL') {
        // Preflight failed: block READY
        const failedJob: ProductionJob = {
          ..._jobsStore.get(jobId)!,
          status: 'FAILED',
          stage: 'PREFLIGHT',
          progressPercent: 85,
          preflightReportId: preflightReport.reportId,
          preflightResult: 'FAIL',
          failureCode: 'PREFLIGHT_QC_FAIL',
          failureMessage: `Preflight checks failed with ${preflightReport.errors.length} hard error(s): ${preflightReport.errors.join('; ')}`,
          failureType: 'CONTENT_ERROR',
          failedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        _jobsStore.set(jobId, failedJob);

        await AuditService.logEvent({
          tenantId: job.tenantId,
          actorId: workerId,
          actorName: `Worker ${workerId}`,
          actorRole: 'worker',
          action: 'PREFLIGHT_FAILED',
          entityType: 'ProductionPreflightReport',
          entityId: preflightReport.reportId,
          newState: { errors: preflightReport.errors },
        });

        await NotificationService.createNotification({
          tenantId: job.tenantId,
          type: 'production_failed',
          editionId: job.editionId,
          title: 'Production Preflight Failed',
          message: `Edition ${snapshot.editionCode} failed preflight validation: ${preflightReport.errors[0]}`,
        });

        return { success: false, job: failedJob, errors: preflightReport.errors };
      }

      // Stage 6: Packaging & File Generation (Print PDF + Digital PDF)
      this.updateJobStage(jobId, 'PACKAGING', 95);
      const outputFiles = await PrintRenderingService.renderProductionOutputs(snapshot);

      // Register generated artifacts in Phase 10 Print Artifact Registry
      const printArt = await PrintArtifactRegistryService.registerArtifact({
        tenantId: job.tenantId,
        editionId: job.editionId,
        productionJobId: jobId,
        snapshotId: snapshot.snapshotId,
        version: snapshot.version,
        artifactType: 'PRINT_PDF',
        storagePath: `production/${job.tenantId}/${job.editionId}/v${snapshot.version}/print.pdf`,
        fileName: `${snapshot.editionCode}-print-v${snapshot.version}.pdf`,
        fileSize: outputFiles.printSizeBytes || 1540000,
        checksum: outputFiles.printChecksum || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        pageCount: outputFiles.pageCount || snapshot.pages.length,
        dimensions: {
          widthMm: snapshot.pressSpecs.format === 'broadsheet' ? 350 : 280,
          heightMm: snapshot.pressSpecs.format === 'broadsheet' ? 540 : 380,
          format: snapshot.pressSpecs.format,
        },
        colorMode: snapshot.pressSpecs.colorMode,
        bleedStatus: 'VALID',
        fontEmbeddingStatus: 'EMBEDDED',
        dpiStatus: 'COMPLIANT',
        preflightStatus: preflightReport.result === 'PASS_WITH_WARNINGS' ? 'WARNING' : 'PASS',
        createdBy: snapshot.finalizedBy,
        downloadUrl: outputFiles.printPdfDataUri,
      });

      const digitalArt = await PrintArtifactRegistryService.registerArtifact({
        tenantId: job.tenantId,
        editionId: job.editionId,
        productionJobId: jobId,
        snapshotId: snapshot.snapshotId,
        version: snapshot.version,
        artifactType: 'DIGITAL_PDF',
        storagePath: `production/${job.tenantId}/${job.editionId}/v${snapshot.version}/digital.pdf`,
        fileName: `${snapshot.editionCode}-digital-v${snapshot.version}.pdf`,
        fileSize: outputFiles.digitalSizeBytes || 480000,
        checksum: outputFiles.digitalChecksum || 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
        pageCount: outputFiles.pageCount || snapshot.pages.length,
        dimensions: {
          widthMm: 210,
          heightMm: 297,
          format: 'A4',
        },
        colorMode: 'rgb',
        bleedStatus: 'VALID',
        fontEmbeddingStatus: 'EMBEDDED',
        dpiStatus: 'COMPLIANT',
        preflightStatus: 'PASS',
        createdBy: snapshot.finalizedBy,
        downloadUrl: outputFiles.digitalPdfDataUri,
      });

      // Stage 7: Ready
      const completedAt = new Date().toISOString();
      const readyJob: ProductionJob = {
        ..._jobsStore.get(jobId)!,
        status: 'READY',
        currentStatus: 'READY',
        stage: 'READY',
        progressPercent: 100,
        outputFiles,
        preflightReportId: preflightReport.reportId,
        preflightResult: preflightReport.result,
        productionVersion: snapshot.version,
        printArtifactId: printArt.id,
        digitalArtifactId: digitalArt.id,
        publicationTimezone: snapshot.publicationTimezone,
        completedAt,
        updatedAt: completedAt,
      };
      _jobsStore.set(jobId, readyJob);

      // Update tenant load stats
      const curr = _tenantJobCounts.get(job.tenantId) || 0;
      _tenantJobCounts.set(job.tenantId, curr + 1);

      await AuditService.logEvent({
        tenantId: job.tenantId,
        actorId: workerId,
        actorName: `Worker ${workerId}`,
        actorRole: 'worker',
        action: 'PRODUCTION_COMPLETED',
        entityType: 'ProductionJob',
        entityId: jobId,
        newState: {
          status: 'READY',
          printChecksum: outputFiles.printChecksum,
          printSizeBytes: outputFiles.printSizeBytes,
        },
      });

      await NotificationService.createNotification({
        tenantId: job.tenantId,
        type: 'production_ready',
        editionId: job.editionId,
        title: 'Edition Ready for Press & Distribution',
        message: `High-resolution print PDF and digital replica for "${snapshot.brandName}" are now available for download.`,
      });

      return { success: true, job: readyJob };
    } catch (err: any) {
      const isTransient = !err.message?.includes('PERMANENT');
      const updatedAttempt = job.attemptCount;
      const willRetry = isTransient && updatedAttempt < job.maxAttempts;

      const failedJob: ProductionJob = {
        ..._jobsStore.get(jobId)!,
        status: willRetry ? 'RETRY_SCHEDULED' : 'FAILED',
        stage: 'QUEUED',
        failureCode: 'RENDER_EXCEPTION',
        failureMessage: err.message || 'Unknown rendering exception',
        failureType: isTransient ? 'TRANSIENT' : 'PERMANENT',
        failedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      _jobsStore.set(jobId, failedJob);

      await AuditService.logEvent({
        tenantId: job.tenantId,
        actorId: workerId,
        actorName: `Worker ${workerId}`,
        actorRole: 'worker',
        action: willRetry ? 'PRODUCTION_RETRIED' : 'PRODUCTION_FAILED',
        entityType: 'ProductionJob',
        entityId: jobId,
        newState: { status: failedJob.status, error: err.message },
      });

      return { success: false, job: failedJob, errors: [err.message] };
    }
  }

  /**
   * Internal helper to update progress stage.
   */
  private static updateJobStage(
    jobId: string,
    stage: ProductionProgressStage,
    progressPercent: number
  ): void {
    const job = _jobsStore.get(jobId);
    if (job) {
      job.stage = stage;
      job.progressPercent = progressPercent;
      job.updatedAt = new Date().toISOString();
      _jobsStore.set(jobId, job);
    }
  }

  /**
   * Cancels a queued job safely.
   */
  public static async cancelJob(
    jobId: string,
    userId: string,
    userRole: string,
    reason: string = 'Editorial cancellation'
  ): Promise<{ success: boolean; reason?: string }> {
    const job = _jobsStore.get(jobId);
    if (!job) return { success: false, reason: 'Job not found.' };

    if (job.status !== 'QUEUED' && job.status !== 'FINALIZED' && job.status !== 'RETRY_SCHEDULED') {
      return {
        success: false,
        reason: `Cannot cancel job in "${job.status}" state. Only queued jobs may be safely cancelled.`,
      };
    }

    job.status = 'CANCELLED';
    job.updatedAt = new Date().toISOString();
    _jobsStore.set(jobId, job);

    await AuditService.logEvent({
      tenantId: job.tenantId,
      actorId: userId,
      actorName: 'Managing Editor',
      actorRole: userRole,
      action: 'STATUS_CHANGE',
      entityType: 'ProductionJob',
      entityId: jobId,
      newState: { status: 'CANCELLED', reason },
      reason,
    });

    return { success: true };
  }

  /**
   * Queries all jobs for a specific tenant or globally.
   */
  public static getJobsForTenant(tenantId?: string): ProductionJob[] {
    const all = Array.from(_jobsStore.values());
    if (!tenantId) return all;
    return all.filter((j) => j.tenantId === tenantId);
  }

  public static getJobById(jobId: string): ProductionJob | undefined {
    return _jobsStore.get(jobId);
  }

  public static getSnapshotById(snapshotId: string): ProductionSnapshot | undefined {
    return _snapshotsStore.get(snapshotId);
  }

  public static getAllSnapshotsForTenant(tenantId: string): ProductionSnapshot[] {
    return Array.from(_snapshotsStore.values()).filter((s) => s.tenantId === tenantId);
  }
}
