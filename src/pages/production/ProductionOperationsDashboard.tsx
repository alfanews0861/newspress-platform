/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Production Operations Dashboard (Phase 10)
 * Real-time newspaper print production operations, vendor dispatch, and delivery tracking console.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import {
  Printer,
  Truck,
  CheckCircle,
  AlertTriangle,
  Clock,
  Shield,
  Send,
  FileCheck,
  RefreshCw,
  Eye,
  Filter,
  Package,
  Layers,
  Search,
  ExternalLink,
  ChevronRight,
  AlertOctagon,
  FileText,
  MapPin,
  Check,
  X,
} from 'lucide-react';
import { ProductionJob, PrintVendor, ProductionRegion, PrintProductionArtifact, PrintVendorDispatch } from '../../types/production';
import { ProductionQueueService } from '../../services/productionQueueService';
import { PrintVendorService } from '../../services/printVendorService';
import { ProductionRegionService } from '../../services/productionRegionService';
import { PrintArtifactRegistryService } from '../../services/printArtifactRegistryService';
import { VendorAssignmentService } from '../../services/vendorAssignmentService';
import { VendorDispatchService } from '../../services/vendorDispatchService';
import { ProductionApprovalService } from '../../services/productionApprovalService';
import { CorrectionReprintService } from '../../services/correctionReprintService';
import { PrintDistributionService } from '../../services/printDistributionService';
import { MockPrintVendorProvider } from '../../services/printVendorProvider';
import { Button, Modal, Badge, StatusBadge, Input, Select } from '../../components/ui';

export const ProductionOperationsDashboard: React.FC = () => {
  const { user, currentMembership } = useAuth();
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.tenantId || 'tenant-metro-chronicle';

  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [vendors, setVendors] = useState<PrintVendor[]>([]);
  const [regions, setRegions] = useState<ProductionRegion[]>([]);
  const [selectedJob, setSelectedJob] = useState<ProductionJob | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'queued' | 'approved' | 'dispatched' | 'printing' | 'delivered' | 'reprint'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [vendorFilter, setVendorFilter] = useState('ALL');

  // Modals state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showSimVendorModal, setShowSimVendorModal] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  // Form states
  const [approvalDecision, setApprovalDecision] = useState<'APPROVE_FOR_PRINT' | 'REJECT_FOR_CORRECTION'>('APPROVE_FOR_PRINT');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [dispatchQuantity, setDispatchQuantity] = useState(15000);
  const [correctionType, setCorrectionType] = useState<'TYPO' | 'PHOTOGRAPH' | 'LEGAL' | 'ADVERTISEMENT' | 'DEFECT' | 'VENDOR_REJECTION'>('TYPO');
  const [correctionReason, setCorrectionReason] = useState('');
  const [deliveryStatusInput, setDeliveryStatusInput] = useState<'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED'>('DELIVERED');
  const [wastageQuantityInput, setWastageQuantityInput] = useState(0);

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = () => {
    PrintVendorService.seedDefaultVendors(tenantId);
    ProductionRegionService.seedDefaultRegions(tenantId);

    const loadedJobs = ProductionQueueService.getJobsForTenant(tenantId);
    const loadedVendors = PrintVendorService.getVendorsForTenant(tenantId);
    const loadedRegions = ProductionRegionService.getRegionsForTenant(tenantId);

    setJobs(loadedJobs);
    setVendors(loadedVendors);
    setRegions(loadedRegions);
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Tab filter
      if (activeTab === 'queued' && job.status !== 'QUEUED' && job.status !== 'PRODUCTION_QUEUED' && job.status !== 'READY') return false;
      if (activeTab === 'approved' && job.status !== 'PRODUCTION_APPROVED') return false;
      if (activeTab === 'dispatched' && job.status !== 'SENT_TO_VENDOR' && job.status !== 'VENDOR_ACKNOWLEDGED') return false;
      if (activeTab === 'printing' && job.status !== 'PRINTING' && job.status !== 'PRINT_COMPLETED') return false;
      if (activeTab === 'delivered' && job.status !== 'DISPATCHED' && job.status !== 'DELIVERED') return false;
      if (activeTab === 'reprint' && job.status !== 'REPRINT_REQUIRED' && job.status !== 'FAILED' && job.status !== 'REJECTED_BY_VENDOR') return false;

      // Region filter
      if (regionFilter !== 'ALL' && job.assignedRegionId !== regionFilter) return false;

      // Vendor filter
      if (vendorFilter !== 'ALL' && job.assignedVendorId !== vendorFilter) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          job.editionId.toLowerCase().includes(q) ||
          job.brandId.toLowerCase().includes(q) ||
          job.productionJobId.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [jobs, activeTab, regionFilter, vendorFilter, searchQuery]);

  // Operational metrics
  const metrics = useMemo(() => {
    const total = jobs.length;
    const queued = jobs.filter((j) => j.status === 'QUEUED' || j.status === 'PRODUCTION_QUEUED' || j.status === 'READY').length;
    const approved = jobs.filter((j) => j.status === 'PRODUCTION_APPROVED').length;
    const sent = jobs.filter((j) => j.status === 'SENT_TO_VENDOR' || j.status === 'VENDOR_ACKNOWLEDGED').length;
    const printing = jobs.filter((j) => j.status === 'PRINTING' || j.status === 'PRINT_COMPLETED').length;
    const delivered = jobs.filter((j) => j.status === 'DELIVERED' || j.status === 'DISPATCHED').length;
    const alerts = jobs.filter((j) => j.status === 'FAILED' || j.status === 'REJECTED_BY_VENDOR' || j.status === 'REPRINT_REQUIRED').length;

    return { total, queued, approved, sent, printing, delivered, alerts };
  }, [jobs]);

  // Handle Production Approval
  const handleApprove = async () => {
    if (!selectedJob) return;
    setActionError(null);
    setActionSuccess(null);

    const artifact = PrintArtifactRegistryService.getLatestPrintArtifact(tenantId, selectedJob.editionId);
    if (!artifact) {
      setActionError('No sealed print PDF artifact found for this job.');
      return;
    }

    const res = await ProductionApprovalService.recordApprovalDecision({
      tenantId,
      editionId: selectedJob.editionId,
      jobId: selectedJob.productionJobId,
      artifactId: artifact.id,
      decision: approvalDecision,
      approver: {
        userId: user?.uid || 'user-eic',
        userRole: user?.platformRole || 'editor_in_chief',
        displayName: user?.displayName || 'Managing Editor',
      },
      notes: approvalNotes,
    });

    if (res.success) {
      setActionSuccess(`Production approval recorded: ${approvalDecision}`);
      setShowApprovalModal(false);
      setApprovalNotes('');
      loadData();
    } else {
      setActionError(res.error || 'Approval failed');
    }
  };

  // Handle Dispatch to Vendor
  const handleDispatch = async () => {
    if (!selectedJob) return;
    setActionError(null);
    setActionSuccess(null);

    const artifact = PrintArtifactRegistryService.getLatestPrintArtifact(tenantId, selectedJob.editionId);
    if (!artifact) {
      setActionError('Print artifact missing.');
      return;
    }

    const vendorId = selectedVendorId || vendors[0]?.id;
    const regionId = selectedRegionId || regions[0]?.id;

    const res = await VendorDispatchService.dispatchToVendor({
      tenantId,
      editionId: selectedJob.editionId,
      productionJobId: selectedJob.productionJobId,
      vendorId,
      regionId,
      artifactId: artifact.id,
      actorId: user?.uid || 'user-eic',
      actorRole: currentMembership?.organizationRole || user?.platformRole || 'editor_in_chief',
    });

    if (res.success) {
      // Plan regional distribution
      await PrintDistributionService.planDistribution({
        tenantId,
        editionId: selectedJob.editionId,
        vendorDispatchId: res.dispatch?.id,
        regionId,
        quantity: dispatchQuantity,
      });

      // Update job state
      selectedJob.status = 'SENT_TO_VENDOR';
      selectedJob.assignedVendorId = vendorId;
      selectedJob.assignedRegionId = regionId;
      selectedJob.dispatchedAt = new Date().toISOString();

      setActionSuccess(`Artifact dispatched to vendor "${vendors.find((v) => v.id === vendorId)?.name}" (Ref: ${res.dispatch?.vendorReferenceNumber || 'OK'})`);
      setShowDispatchModal(false);
      loadData();
    } else {
      setActionError(res.reason || 'Dispatch failed');
    }
  };

  // Handle Simulate Vendor Ack & Print
  const handleSimulateVendorAck = async (action: 'ACKNOWLEDGE' | 'PRINTING' | 'COMPLETED' | 'REJECT') => {
    if (!selectedJob) return;
    setActionError(null);
    setActionSuccess(null);

    const dispatches = VendorDispatchService.getDispatchesForEdition(tenantId, selectedJob.editionId);
    const latestDispatch = dispatches[0];

    if (!latestDispatch) {
      setActionError('No active vendor dispatch found for this edition.');
      return;
    }

    if (action === 'ACKNOWLEDGE') {
      const ackRes = await VendorDispatchService.recordVendorAcknowledgement({
        tenantId,
        dispatchId: latestDispatch.id,
        vendorReferenceNumber: latestDispatch.vendorReferenceNumber,
        acceptedChecksum: latestDispatch.checksum,
        vendorMessage: 'High-speed rotary CTP plates created. Ready for press run.',
      });

      if (ackRes.success) {
        selectedJob.status = 'VENDOR_ACKNOWLEDGED';
        selectedJob.acknowledgedAt = new Date().toISOString();
        setActionSuccess('Vendor acknowledged print package with verified SHA-256 checksum match.');
      } else {
        setActionError(ackRes.error || 'Acknowledgement failed');
      }
    } else if (action === 'PRINTING') {
      MockPrintVendorProvider.simulateVendorStatus(latestDispatch.vendorReferenceNumber || 'REF', 'PRINTING');
      selectedJob.status = 'PRINTING';
      selectedJob.printedAt = new Date().toISOString();
      setActionSuccess('Press run started on rotary press unit.');
    } else if (action === 'COMPLETED') {
      MockPrintVendorProvider.simulateVendorStatus(latestDispatch.vendorReferenceNumber || 'REF', 'PRINT_COMPLETED');
      selectedJob.status = 'PRINT_COMPLETED';
      setActionSuccess('Press run completed. Bundled and awaiting regional carrier dispatch.');
    } else if (action === 'REJECT') {
      await VendorDispatchService.recordVendorRejection({
        tenantId,
        dispatchId: latestDispatch.id,
        rejectionReason: 'Paper profile mismatch: Broad-sheet rotary web cylinder width out of tolerance.',
      });
      selectedJob.status = 'REJECTED_BY_VENDOR';
      setActionError('Vendor rejected dispatch. Correction or re-dispatch required.');
    }

    setShowSimVendorModal(false);
    loadData();
  };

  // Handle Delivery Recording
  const handleRecordDelivery = async () => {
    if (!selectedJob) return;
    setActionError(null);
    setActionSuccess(null);

    const distributions = PrintDistributionService.getDistributionsForEdition(tenantId, selectedJob.editionId);
    const dist = distributions[0];

    if (dist) {
      await PrintDistributionService.updateDeliveryStatus({
        tenantId,
        distributionId: dist.id,
        status: deliveryStatusInput,
        wastageQuantity: wastageQuantityInput,
        notes: `Recorded by ${user?.displayName || 'Operations Desk'}`,
      });
    }

    if (deliveryStatusInput === 'DELIVERED') {
      selectedJob.status = 'DELIVERED';
      selectedJob.deliveredAt = new Date().toISOString();
      setActionSuccess('Edition marked as DELIVERED to regional news distribution centers.');
    } else {
      selectedJob.status = 'DISPATCHED';
      setActionSuccess(`Distribution updated to ${deliveryStatusInput}.`);
    }

    setShowDeliveryModal(false);
    loadData();
  };

  // Handle Correction Request
  const handleRequestCorrection = async () => {
    if (!selectedJob) return;
    setActionError(null);
    setActionSuccess(null);

    const res = await CorrectionReprintService.requestCorrection({
      tenantId,
      editionId: selectedJob.editionId,
      correctionType,
      correctionReason,
      actor: {
        userId: user?.uid || 'user-eic',
        userRole: currentMembership?.organizationRole || user?.platformRole || 'editor_in_chief',
        displayName: user?.displayName || 'Editor-in-Chief',
      },
    });

    if (res.success) {
      selectedJob.status = 'REPRINT_REQUIRED';
      setActionSuccess(`Correction revision v${res.correction?.newVersion} initiated.`);
      setShowCorrectionModal(false);
      setCorrectionReason('');
      loadData();
    } else {
      setActionError(res.error || 'Failed to request correction');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-sans">
              Print Production & Vendor Operations
            </h1>
            <Badge variant="default" className="bg-emerald-700 text-white text-xs">
              Phase 10 Operational Press
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time press lifecycle, multi-vendor dispatch, preflight gates, and regional distribution tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadData} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh Pipeline
          </Button>
        </div>
      </div>

      {/* Notifications / Alerts Banner */}
      {actionSuccess && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            <span className="text-sm font-medium">{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-600 hover:text-rose-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-lg border cursor-pointer transition ${
            activeTab === 'all' ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">All Jobs</span>
            <Layers className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">{metrics.total}</p>
        </div>

        <div
          onClick={() => setActiveTab('queued')}
          className={`p-4 rounded-lg border cursor-pointer transition ${
            activeTab === 'queued' ? 'border-blue-600 bg-blue-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">In Queue / Ready</span>
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900 mt-2 font-mono">{metrics.queued}</p>
        </div>

        <div
          onClick={() => setActiveTab('approved')}
          className={`p-4 rounded-lg border cursor-pointer transition ${
            activeTab === 'approved' ? 'border-blue-600 bg-blue-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Approved</span>
            <Shield className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-900 mt-2 font-mono">{metrics.approved}</p>
        </div>

        <div
          onClick={() => setActiveTab('dispatched')}
          className={`p-4 rounded-lg border cursor-pointer transition ${
            activeTab === 'dispatched' ? 'border-purple-600 bg-purple-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Sent to Vendor</span>
            <Send className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-900 mt-2 font-mono">{metrics.sent}</p>
        </div>

        <div
          onClick={() => setActiveTab('printing')}
          className={`p-4 rounded-lg border cursor-pointer transition ${
            activeTab === 'printing' ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Printing</span>
            <Printer className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-indigo-900 mt-2 font-mono">{metrics.printing}</p>
        </div>

        <div
          onClick={() => setActiveTab('delivered')}
          className={`p-4 rounded-lg border cursor-pointer transition ${
            activeTab === 'delivered' ? 'border-emerald-600 bg-emerald-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Delivered</span>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-900 mt-2 font-mono">{metrics.delivered}</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search edition or job ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="text-sm bg-white border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">All Regions</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="text-sm bg-white border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">All Vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Showing {filteredJobs.length} of {jobs.length} production jobs
        </div>
      </div>

      {/* Main Production Jobs Table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Edition / Job</th>
                <th className="py-3 px-4">Version</th>
                <th className="py-3 px-4">Preflight QC</th>
                <th className="py-3 px-4">Lifecycle State</th>
                <th className="py-3 px-4">Assigned Vendor / Region</th>
                <th className="py-3 px-4">Schedule / Timestamps</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Printer className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium">No production jobs match current filters</p>
                    <p className="text-xs text-slate-400 mt-1">Finalize an edition to begin the automated print pipeline</p>
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const artifact = PrintArtifactRegistryService.getLatestPrintArtifact(tenantId, job.editionId);
                  const assignedVendor = vendors.find((v) => v.id === job.assignedVendorId);
                  const assignedRegion = regions.find((r) => r.id === job.assignedRegionId);

                  return (
                    <tr key={job.productionJobId} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 font-sans">{job.brandId || 'Main Edition'}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{job.editionId}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{job.productionJobId}</div>
                      </td>

                      <td className="py-3 px-4">
                        <Badge variant="outline" className="font-mono text-xs">
                          v{job.productionVersion || 1}
                        </Badge>
                        {artifact && (
                          <div className="text-[10px] text-slate-500 mt-1 font-mono" title={artifact.checksum}>
                            SHA: {artifact.checksum.slice(0, 8)}...
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {job.preflightResult === 'PASS' || job.status === 'READY' || job.status === 'PRODUCTION_APPROVED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                            <Check className="h-3 w-3" /> PASS
                          </span>
                        ) : job.preflightResult === 'FAIL' || job.status === 'FAILED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800">
                            <AlertOctagon className="h-3 w-3" /> FAILED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                            <Clock className="h-3 w-3" /> PENDING
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={job.status} />
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {assignedVendor ? (
                          <div>
                            <div className="font-medium text-slate-800 text-xs">{assignedVendor.name}</div>
                            {assignedRegion && (
                              <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3 text-slate-400" />
                                {assignedRegion.name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-600 font-mono">
                        <div>Due: {job.scheduledFor ? new Date(job.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Night Press'}</div>
                        {job.dispatchedAt && (
                          <div className="text-[11px] text-purple-700 mt-0.5">
                            Sent: {new Date(job.dispatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                        {job.deliveredAt && (
                          <div className="text-[11px] text-emerald-700 mt-0.5">
                            Delivered: {new Date(job.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Ready -> Approve */}
                          {(job.status === 'READY' || job.status === 'QUEUED') && (
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-xs bg-slate-900 text-white"
                              onClick={() => {
                                setSelectedJob(job);
                                setShowApprovalModal(true);
                              }}
                            >
                              <Shield className="h-3 w-3 mr-1" /> Approve
                            </Button>
                          )}

                          {/* Approved -> Dispatch */}
                          {job.status === 'PRODUCTION_APPROVED' && (
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-xs bg-purple-700 text-white hover:bg-purple-800"
                              onClick={() => {
                                setSelectedJob(job);
                                setShowDispatchModal(true);
                              }}
                            >
                              <Send className="h-3 w-3 mr-1" /> Dispatch
                            </Button>
                          )}

                          {/* Sent to Vendor / In Progress -> Sim Vendor / Ack / Progress */}
                          {(job.status === 'SENT_TO_VENDOR' || job.status === 'VENDOR_ACKNOWLEDGED' || job.status === 'PRINTING') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                              onClick={() => {
                                setSelectedJob(job);
                                setShowSimVendorModal(true);
                              }}
                            >
                              <Printer className="h-3 w-3 mr-1" /> Vendor Ops
                            </Button>
                          )}

                          {/* Print Completed -> Delivery */}
                          {(job.status === 'PRINT_COMPLETED' || job.status === 'DISPATCHED') && (
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-xs bg-emerald-700 text-white hover:bg-emerald-800"
                              onClick={() => {
                                setSelectedJob(job);
                                setShowDeliveryModal(true);
                              }}
                            >
                              <Truck className="h-3 w-3 mr-1" /> Deliver
                            </Button>
                          )}

                          {/* Action to trigger reprint / correction */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-amber-700 hover:bg-amber-50"
                            title="Request Emergency Correction / Reprint"
                            onClick={() => {
                              setSelectedJob(job);
                              setShowCorrectionModal(true);
                            }}
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Production Approval Gate */}
      <Modal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        title="Production Approval Gate (Phase 10)"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Verify PDF preflight integrity and provide an immutable authorization seal before transmitting plates to rotary press vendors.
          </p>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-1 font-mono">
            <div><strong>Edition:</strong> {selectedJob?.editionId}</div>
            <div><strong>Job ID:</strong> {selectedJob?.productionJobId}</div>
            <div><strong>Preflight QC:</strong> {selectedJob?.preflightResult || 'PASS'}</div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 uppercase">Decision</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setApprovalDecision('APPROVE_FOR_PRINT')}
                className={`p-3 rounded-lg border text-left flex items-center gap-2 ${
                  approvalDecision === 'APPROVE_FOR_PRINT'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                Approve for Press
              </button>

              <button
                type="button"
                onClick={() => setApprovalDecision('REJECT_FOR_CORRECTION')}
                className={`p-3 rounded-lg border text-left flex items-center gap-2 ${
                  approvalDecision === 'REJECT_FOR_CORRECTION'
                    ? 'border-rose-600 bg-rose-50 text-rose-900 font-semibold'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                Reject for Fix
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 uppercase">Approval Notes</label>
            <textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Enter editorial sign-off verification notes..."
              rows={3}
              className="w-full text-sm border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <Button variant="outline" onClick={() => setShowApprovalModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleApprove} className="bg-slate-900 text-white">
              Confirm Decision
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: Vendor Dispatch */}
      <Modal
        isOpen={showDispatchModal}
        onClose={() => setShowDispatchModal(false)}
        title="Dispatch Print Package to Vendor"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Select an active printing vendor and regional distribution zone to dispatch the cryptographic print PDF.
          </p>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 uppercase">Select Vendor</label>
            <select
              value={selectedVendorId || vendors[0]?.id || ''}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-slate-900 bg-white"
            >
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.vendorType}) — Cap: {v.dailyCapacity.toLocaleString()} copies
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 uppercase">Target Regional Zone</label>
            <select
              value={selectedRegionId || regions[0]?.id || ''}
              onChange={(e) => setSelectedRegionId(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-slate-900 bg-white"
            >
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 uppercase">Print Run Quantity</label>
            <Input
              type="number"
              value={dispatchQuantity}
              onChange={(e) => setDispatchQuantity(Number(e.target.value))}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <Button variant="outline" onClick={() => setShowDispatchModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleDispatch} className="bg-purple-700 text-white hover:bg-purple-800">
              <Send className="h-4 w-4 mr-1.5" /> Transmit to Vendor
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: Simulate Vendor State / Ack */}
      <Modal
        isOpen={showSimVendorModal}
        onClose={() => setShowSimVendorModal(false)}
        title="Vendor Operational Console & Proofs"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Simulate or verify external print vendor state progression and digital proof confirmations.
          </p>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-1 font-mono">
            <div><strong>Edition:</strong> {selectedJob?.editionId}</div>
            <div><strong>Status:</strong> {selectedJob?.status}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="text-left justify-start border-emerald-300 text-emerald-800 hover:bg-emerald-50"
              onClick={() => handleSimulateVendorAck('ACKNOWLEDGE')}
            >
              <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />
              1. Vendor Ack (SHA-256 OK)
            </Button>

            <Button
              variant="outline"
              className="text-left justify-start border-indigo-300 text-indigo-800 hover:bg-indigo-50"
              onClick={() => handleSimulateVendorAck('PRINTING')}
            >
              <Printer className="h-4 w-4 mr-2 text-indigo-600" />
              2. Start Rotary Press
            </Button>

            <Button
              variant="outline"
              className="text-left justify-start border-blue-300 text-blue-800 hover:bg-blue-50"
              onClick={() => handleSimulateVendorAck('COMPLETED')}
            >
              <Package className="h-4 w-4 mr-2 text-blue-600" />
              3. Press Completed
            </Button>

            <Button
              variant="outline"
              className="text-left justify-start border-rose-300 text-rose-800 hover:bg-rose-50"
              onClick={() => handleSimulateVendorAck('REJECT')}
            >
              <AlertTriangle className="h-4 w-4 mr-2 text-rose-600" />
              Reject Dispatch
            </Button>
          </div>

          <div className="flex justify-end pt-3 border-t">
            <Button variant="outline" onClick={() => setShowSimVendorModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: Delivery Confirmation */}
      <Modal
        isOpen={showDeliveryModal}
        onClose={() => setShowDeliveryModal(false)}
        title="Record Regional Delivery"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Confirm physical arrival and circulation bundle handover to local regional delivery centers.
          </p>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 uppercase">Delivery Status</label>
            <select
              value={deliveryStatusInput}
              onChange={(e: any) => setDeliveryStatusInput(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="DISPATCHED">In Transit (Carrier Picked Up)</option>
              <option value="DELIVERED">Delivered to Circulation Depots</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 uppercase">Wastage Quantity (Damaged Copies)</label>
            <Input
              type="number"
              value={wastageQuantityInput}
              onChange={(e) => setWastageQuantityInput(Number(e.target.value))}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <Button variant="outline" onClick={() => setShowDeliveryModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRecordDelivery} className="bg-emerald-700 text-white hover:bg-emerald-800">
              Save Delivery Record
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 5: Emergency Correction / Reprint */}
      <Modal
        isOpen={showCorrectionModal}
        onClose={() => setShowCorrectionModal(false)}
        title="Initiate Correction / Emergency Reprint"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Opens a new immutable revision (v2) while preserving original snapshot history. If already dispatched, marks as REPRINT_REQUIRED.
          </p>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 uppercase">Correction Reason Category</label>
            <select
              value={correctionType}
              onChange={(e: any) => setCorrectionType(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="TYPO">Typographical Error / Misspelling</option>
              <option value="PHOTOGRAPH">Incorrect Photograph / Caption</option>
              <option value="LEGAL">Legal / Defamation Injunction</option>
              <option value="ADVERTISEMENT">Commercial Advertisement Replacement</option>
              <option value="DEFECT">Rotary Press Production Defect</option>
              <option value="VENDOR_REJECTION">Vendor Press Rejection</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 uppercase">Detailed Justification</label>
            <textarea
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="Describe the editorial correction required..."
              rows={3}
              className="w-full text-sm border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <Button variant="outline" onClick={() => setShowCorrectionModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleRequestCorrection}
              disabled={!correctionReason.trim()}
              className="bg-rose-700 text-white hover:bg-rose-800"
            >
              Issue Revision & Reprint
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProductionOperationsDashboard;
