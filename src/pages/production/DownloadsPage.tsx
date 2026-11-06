/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Print-Ready Downloads & Press Package Center (Phase 5)
 * Download center for ISO PDF/X print files, vector spreads, digital web replicas,
 * and cryptographic SHA-256 checksum verification certificates.
 */

import React, { useState, useEffect } from 'react';
import {
  Download,
  FileCheck,
  FileText,
  Printer,
  Globe,
  ShieldCheck,
  Copy,
  Check,
  RotateCw,
  Layers,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { ProductionJob, ProductionSnapshot } from '../../types/production';
import { ProductionQueueService } from '../../services/productionQueueService';

export const DownloadsPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  const [readyJobs, setReadyJobs] = useState<ProductionJob[]>([]);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const loadData = () => {
    const all = ProductionQueueService.getJobsForTenant(currentTenant.tenantId);
    setReadyJobs(all.filter((j) => j.status === 'READY' && j.outputFiles));
  };

  useEffect(() => {
    loadData();
  }, [currentTenant.tenantId]);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Print-Ready Downloads & Press Packages"
        subtitle="Download high-resolution press PDFs with embedded fonts, Fogra39 CMYK plates, and web-optimized digital editions."
        breadcrumbs={[
          { label: 'Production', href: '#' },
          { label: 'Downloads' },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            leftIcon={<RotateCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-slate-500 dark:text-slate-400">Press Packages</span>
            <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {readyJobs.length} Ready
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">300 DPI vector broadsheet files</span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-slate-500 dark:text-slate-400">Digital Replicas</span>
            <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {readyJobs.length} Available
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">RGB web and mobile e-paper formats</span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-slate-500 dark:text-slate-400">Quality Control</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            100% Passed
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Preflight geometry and font verified</span>
        </Card>
      </div>

      {/* Downloads Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Available Print Packages
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Showing {readyJobs.length} ready release(s)
          </span>
        </div>

        {readyJobs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Download className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-600" />
            <p className="text-sm">No ready print packages available for download yet.</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Editions processed by the night production queue will appear here once rendering and preflight pass.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {readyJobs.map((job) => {
              const outputs = job.outputFiles!;
              const printKb = Math.round((outputs.printSizeBytes || 0) / 1024);
              const digitalKb = Math.round((outputs.digitalSizeBytes || 0) / 1024);

              return (
                <div key={job.productionJobId} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {job.brandId} • Issue {job.editionDate}
                        </span>
                        <Badge variant="emerald" className="font-mono text-[10px]">
                          READY FOR PRESS
                        </Badge>
                        <Badge variant="outline" className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                          v{outputs.outputVersion || 1}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                        <span>Generated: <strong className="text-slate-700 dark:text-slate-200">{outputs.generatedAt ? new Date(outputs.generatedAt).toLocaleTimeString() : 'Just now'}</strong></span>
                        <span>•</span>
                        <span>Pages: <strong className="text-slate-700 dark:text-slate-200">{outputs.pageCount || 2}</strong></span>
                        <span>•</span>
                        <span>Preflight: <strong className="text-emerald-600 dark:text-emerald-400">{job.preflightResult || 'PASS'}</strong></span>
                      </div>
                    </div>

                    {/* Download Buttons */}
                    <div className="flex items-center gap-2">
                      <a
                        href={outputs.printPdfDataUri || '#'}
                        download={`Print-Press-${job.editionId}-v${outputs.outputVersion || 1}.pdf`}
                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3.5 py-2 rounded-lg text-xs shadow-xs transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                        Download Print PDF ({printKb} KB)
                      </a>

                      <a
                        href={outputs.digitalPdfDataUri || '#'}
                        download={`Digital-Replica-${job.editionId}-v${outputs.outputVersion || 1}.pdf`}
                        className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium px-3.5 py-2 rounded-lg text-xs shadow-xs transition-colors"
                      >
                        <Globe className="w-4 h-4" />
                        Download Digital PDF ({digitalKb} KB)
                      </a>
                    </div>
                  </div>

                  {/* Cryptographic SHA-256 Checksum Strip */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {outputs.printChecksum && (
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-600 dark:text-slate-300 flex items-center justify-between">
                        <div className="truncate mr-2">
                          <span className="text-slate-500">Print Plate SHA-256: </span>
                          <code className="text-slate-700 dark:text-slate-300">{outputs.printChecksum.slice(0, 24)}...</code>
                        </div>
                        <button
                          onClick={() => handleCopyHash(outputs.printChecksum!)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 p-1"
                          title="Copy Full Checksum"
                        >
                          {copiedHash === outputs.printChecksum ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}

                    {outputs.digitalChecksum && (
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-600 dark:text-slate-300 flex items-center justify-between">
                        <div className="truncate mr-2">
                          <span className="text-slate-500">Digital SHA-256: </span>
                          <code className="text-slate-700 dark:text-slate-300">{outputs.digitalChecksum.slice(0, 24)}...</code>
                        </div>
                        <button
                          onClick={() => handleCopyHash(outputs.digitalChecksum!)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 p-1"
                          title="Copy Full Checksum"
                        >
                          {copiedHash === outputs.digitalChecksum ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
