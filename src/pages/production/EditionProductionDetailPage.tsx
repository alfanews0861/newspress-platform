/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Edition Production Detail Page (Phase 10)
 * Deep inspection of a single edition's production lifecycle:
 *  - Edition metadata & Press Specs
 *  - Production & Artifact Registry (SHA-256 Checksum, Page count, DPI, Download links)
 *  - Vendor & Regional Dispatch Status
 *  - Multi-region Distribution breakdown
 *  - Immutable Chronological Event Timeline
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import {
  Printer,
  Truck,
  CheckCircle,
  AlertTriangle,
  Clock,
  Shield,
  FileCheck,
  Send,
  Layers,
  MapPin,
  Download,
  Copy,
  Check,
  RefreshCw,
  ArrowLeft,
  FileText,
  Building,
} from 'lucide-react';
import { ProductionJob, PrintProductionArtifact, PrintVendor, ProductionRegion, PrintVendorDispatch, PrintDistribution } from '../../types/production';
import { ProductionQueueService } from '../../services/productionQueueService';
import { PrintArtifactRegistryService } from '../../services/printArtifactRegistryService';
import { PrintVendorService } from '../../services/printVendorService';
import { ProductionRegionService } from '../../services/productionRegionService';
import { VendorDispatchService } from '../../services/vendorDispatchService';
import { PrintDistributionService } from '../../services/printDistributionService';
import { AuditService } from '../../services/auditService';
import { Button, Badge, StatusBadge } from '../../components/ui';

interface Props {
  editionId?: string;
  onBack?: () => void;
}

export const EditionProductionDetailPage: React.FC<Props> = ({ editionId: propEditionId, onBack }) => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.tenantId || 'tenant-metro-chronicle';

  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [selectedEditionId, setSelectedEditionId] = useState<string>(propEditionId || '');
  const [artifacts, setArtifacts] = useState<PrintProductionArtifact[]>([]);
  const [dispatches, setDispatches] = useState<PrintVendorDispatch[]>([]);
  const [distributions, setDistributions] = useState<PrintDistribution[]>([]);
  const [vendors, setVendors] = useState<PrintVendor[]>([]);
  const [regions, setRegions] = useState<ProductionRegion[]>([]);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [copiedChecksum, setCopiedChecksum] = useState(false);

  const loadData = () => {
    PrintVendorService.seedDefaultVendors(tenantId);
    ProductionRegionService.seedDefaultRegions(tenantId);

    const allJobs = ProductionQueueService.getJobsForTenant(tenantId);
    setJobs(allJobs);

    const targetEdId = propEditionId || selectedEditionId || (allJobs.length > 0 ? allJobs[0].editionId : '');
    setSelectedEditionId(targetEdId);

    if (targetEdId) {
      const artList = PrintArtifactRegistryService.getArtifactsForEdition(tenantId, targetEdId);
      const dispList = VendorDispatchService.getDispatchesForEdition(tenantId, targetEdId);
      const distList = PrintDistributionService.getDistributionsForEdition(tenantId, targetEdId);
      const vList = PrintVendorService.getVendorsForTenant(tenantId);
      const rList = ProductionRegionService.getRegionsForTenant(tenantId);
      const allEvents = AuditService.getEventsForTenant(tenantId).filter(
        (e) => (e.entityId && e.entityId.includes(targetEdId)) || (e.newState && typeof e.newState === 'object' && ((e.newState as any).editionId === targetEdId || (e.newState as any).editionCode?.includes(targetEdId)))
      );

      setArtifacts(artList);
      setDispatches(dispList);
      setDistributions(distList);
      setVendors(vList);
      setRegions(rList);
      setAuditEvents(allEvents);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantId, propEditionId, selectedEditionId]);

  const activeJob = jobs.find((j) => j.editionId === selectedEditionId) || jobs[0];
  const primaryPrintArtifact = artifacts.find((a) => a.artifactType === 'PRINT_PDF' || a.artifactType === 'CORRECTED_PRINT_PDF');
  const latestDispatch = dispatches[0];
  const assignedVendor = vendors.find((v) => v.id === activeJob?.assignedVendorId || v.id === latestDispatch?.vendorId);
  const assignedRegion = regions.find((r) => r.id === activeJob?.assignedRegionId || r.id === latestDispatch?.regionId);

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedChecksum(true);
    setTimeout(() => setCopiedChecksum(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack} className="p-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-sans">
                Production Tracking: {activeJob?.brandId || 'Newspaper Edition'}
              </h1>
              <Badge variant="outline" className="font-mono text-xs">
                {selectedEditionId || 'No Edition'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cryptographic press integrity, vendor dispatch audit trail, and multi-region logistics tracker.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {jobs.length > 1 && (
            <select
              value={selectedEditionId}
              onChange={(e) => setSelectedEditionId(e.target.value)}
              className="text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500"
            >
              {jobs.map((j) => (
                <option key={j.productionJobId} value={j.editionId}>
                  {j.brandId || j.editionId} (Job: {j.productionJobId.slice(-8)})
                </option>
              ))}
            </select>
          )}

          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Main Grid Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Edition, Artifacts, Vendor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Edition & Press Specifications */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h2 className="font-semibold text-slate-900 dark:text-white font-sans">1. Edition & Press Profile</h2>
              </div>
              {activeJob && <StatusBadge status={activeJob.status} />}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 dark:text-slate-500 block uppercase font-semibold">Tenant</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">{tenantId}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-semibold">Publication Date</span>
                <span className="text-slate-800 font-medium">{activeJob?.editionDate || '2026-10-04'}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-semibold">Timezone</span>
                <span className="text-slate-800 font-medium">{activeJob?.publicationTimezone || 'Asia/Kolkata'}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-semibold">Press Format</span>
                <span className="text-slate-800 font-medium">Broadsheet (350x540mm)</span>
              </div>
            </div>
          </div>

          {/* Section 2: Sealed Print Artifacts Registry */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="font-semibold text-slate-900 dark:text-white font-sans">2. Sealed Print Production Artifacts</h2>
              </div>
              <Badge variant="default" className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-xs">
                Immutable Registry
              </Badge>
            </div>

            {artifacts.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-4 text-center">
                Artifacts are generated during automated Night Production queue execution.
              </p>
            ) : (
              <div className="space-y-3">
                {artifacts.map((art) => (
                  <div key={art.id} className="p-3.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">{art.fileName}</span>
                        <Badge variant="outline" className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                          {art.artifactType} v{art.version}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {art.downloadUrl && (
                          <a
                            href={art.downloadUrl}
                            download={art.fileName}
                            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                          >
                            <Download className="h-3 w-3" /> Download
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg font-mono">
                      <div className="truncate mr-2">
                        <span className="text-slate-400">SHA-256: </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{art.checksum}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(art.checksum)}
                        className="text-slate-500 hover:text-slate-900 dark:hover:text-white shrink-0 flex items-center gap-1 text-[11px]"
                      >
                        {copiedChecksum ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedChecksum ? 'Copied' : 'Copy'}
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-1">
                      <div>Pages: {art.pageCount}</div>
                      <div>DPI: {art.dpiStatus}</div>
                      <div>Bleed: {art.bleedStatus}</div>
                      <div>Fonts: {art.fontEmbeddingStatus}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Print Vendor & Dispatch Tracking */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h2 className="font-semibold text-slate-900 dark:text-white font-sans">3. Assigned Print Vendor & Dispatch</h2>
              </div>
              <Badge variant="outline" className="text-xs">
                {assignedVendor ? assignedVendor.vendorType : 'UNASSIGNED'}
              </Badge>
            </div>

            {assignedVendor ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <span className="text-slate-400 dark:text-slate-500 block font-semibold uppercase">Vendor Information</span>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm mt-1">{assignedVendor.name}</p>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">{assignedVendor.address}</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">Contact: {assignedVendor.contactName} ({assignedVendor.phone})</p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <span className="text-slate-400 dark:text-slate-500 block font-semibold uppercase">Dispatch Acknowledgement</span>
                  {latestDispatch ? (
                    <div className="space-y-1 mt-1 font-mono">
                      <div>Status: <span className="font-bold text-slate-900 dark:text-white">{latestDispatch.dispatchStatus}</span></div>
                      <div className="text-slate-600 dark:text-slate-300">Ref No: {latestDispatch.vendorReferenceNumber || 'PENDING'}</div>
                      <div className="text-slate-500 dark:text-slate-400">Dispatched: {latestDispatch.dispatchedAt ? new Date(latestDispatch.dispatchedAt).toLocaleTimeString() : 'N/A'}</div>
                      <div className="text-slate-500 dark:text-slate-400">Acknowledged: {latestDispatch.acknowledgedAt ? new Date(latestDispatch.acknowledgedAt).toLocaleTimeString() : 'Awaiting Ack'}</div>
                    </div>
                  ) : (
                    <p className="text-slate-400 dark:text-slate-500 italic mt-1">Dispatch not yet transmitted to vendor</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 italic py-2">No vendor assigned yet for this production job.</p>
            )}
          </div>
        </div>

        {/* Right 1 Col: Event Timeline & Regional Distribution */}
        <div className="space-y-6">
          {/* Regional Distribution */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Truck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="font-semibold text-slate-900 dark:text-white font-sans">Regional Distribution</h2>
            </div>

            {distributions.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2">No regional distribution planned yet.</p>
            ) : (
              <div className="space-y-3">
                {distributions.map((dist) => (
                  <div key={dist.id} className="p-3.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-white">
                      <span>{dist.regionId}</span>
                      <Badge variant="outline">{dist.deliveryStatus}</Badge>
                    </div>
                    <div className="text-slate-600 dark:text-slate-300 font-mono">
                      Quantity: {dist.quantity.toLocaleString()} copies
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Carrier: {dist.carrier}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Immutable Chronological Timeline */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="font-semibold text-slate-900 dark:text-white font-sans">Production Audit Trail</h2>
            </div>

            <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-700 space-y-4 text-xs">
              <div className="relative">
                <div className="absolute -left-[31px] top-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                <div className="font-semibold text-slate-900 dark:text-white">Edition Finalized</div>
                <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">Snapshot v1 created & sealed</div>
              </div>

              <div className="relative">
                <div className="absolute -left-[31px] top-0.5 h-3 w-3 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900" />
                <div className="font-semibold text-slate-900 dark:text-white">PDF Generated & Preflight Passed</div>
                <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">SHA-256 seal computed</div>
              </div>

              {activeJob?.approvedAt && (
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 h-3 w-3 rounded-full bg-indigo-500 border-2 border-white dark:border-slate-900" />
                  <div className="font-semibold text-slate-900 dark:text-white">Production Approved</div>
                  <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{new Date(activeJob.approvedAt).toLocaleTimeString()}</div>
                </div>
              )}

              {activeJob?.dispatchedAt && (
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 h-3 w-3 rounded-full bg-purple-500 border-2 border-white dark:border-slate-900" />
                  <div className="font-semibold text-slate-900 dark:text-white">Vendor Dispatched</div>
                  <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{new Date(activeJob.dispatchedAt).toLocaleTimeString()}</div>
                </div>
              )}

              {activeJob?.acknowledgedAt && (
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                  <div className="font-semibold text-slate-900 dark:text-white">Vendor Acknowledged</div>
                  <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">SHA-256 verified by vendor</div>
                </div>
              )}

              {activeJob?.printedAt && (
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 h-3 w-3 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900" />
                  <div className="font-semibold text-slate-900 dark:text-white">Rotary Press Printing</div>
                  <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{new Date(activeJob.printedAt).toLocaleTimeString()}</div>
                </div>
              )}

              {activeJob?.deliveredAt && (
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 h-3 w-3 rounded-full bg-emerald-600 border-2 border-white dark:border-slate-900" />
                  <div className="font-semibold text-slate-900 dark:text-white">Delivered to Centers</div>
                  <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{new Date(activeJob.deliveredAt).toLocaleTimeString()}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditionProductionDetailPage;
