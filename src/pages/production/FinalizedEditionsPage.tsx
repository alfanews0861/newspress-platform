/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Finalized Newspaper Editions Page (Phase 5)
 * Displays immutable frozen production issues, version history, cryptographic SHA-256
 * integrity hashes, and handles the post-finalization Correction Revision workflow.
 */

import React, { useState, useEffect } from 'react';
import {
  Lock,
  FileCheck,
  History,
  ShieldCheck,
  Eye,
  RefreshCw,
  PlusCircle,
  AlertCircle,
  ExternalLink,
  Download,
  Calendar,
  Layers,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { NewspaperEdition } from '../../types/edition';
import { ProductionSnapshot } from '../../types/production';
import { EditionPersistenceService } from '../../services/editionPersistenceService';
import { ProductionQueueService } from '../../services/productionQueueService';

export const FinalizedEditionsPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { can } = usePermission();

  const [editions, setEditions] = useState<NewspaperEdition[]>([]);
  const [snapshots, setSnapshots] = useState<ProductionSnapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<ProductionSnapshot | null>(null);

  // Correction Revision Modal
  const [showCorrectionModal, setShowCorrectionModal] = useState<boolean>(false);
  const [targetEdition, setTargetEdition] = useState<NewspaperEdition | null>(null);
  const [correctionSummary, setCorrectionSummary] = useState<string>('');
  const [correctionLoading, setCorrectionLoading] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadData = async () => {
    const list = await EditionPersistenceService.getFinalizedEditions(currentTenant.tenantId);
    setEditions(list);
    const snaps = ProductionQueueService.getAllSnapshotsForTenant(currentTenant.tenantId);
    setSnapshots(snaps);
  };

  useEffect(() => {
    loadData();
  }, [currentTenant.tenantId]);

  const handleOpenCorrectionModal = (edition: NewspaperEdition) => {
    setTargetEdition(edition);
    setCorrectionSummary('Factual clarification and spelling correction on lead headline.');
    setShowCorrectionModal(true);
  };

  const handleCreateCorrectionRevision = async () => {
    if (!targetEdition) return;
    setCorrectionLoading(true);

    try {
      const res = await EditionPersistenceService.createCorrectionRevision(
        targetEdition.editionId,
        currentTenant.tenantId,
        user?.uid || 'user-editor',
        can('editions.finalize') ? 'editor_in_chief' : 'editor',
        correctionSummary
      );

      if (res.success) {
        setShowCorrectionModal(false);
        setActionNotice(
          `Correction Revision (v${res.newRevision?.version}) created. Edition unlocked in Page Designer.`
        );
        await loadData();
      } else {
        alert(res.errors?.join('\n') || 'Failed to create correction revision.');
      }
    } catch (err: any) {
      alert(`Correction error: ${err.message}`);
    } finally {
      setCorrectionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Finalized Newspaper Editions"
        subtitle="Editorial-locked production issues, cryptographic checksum verification, and immutable print archives."
        breadcrumbs={[
          { label: 'Production', href: '#' },
          { label: 'Finalized Editions' },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
        }
      />

      {/* Action Notification */}
      {actionNotice && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-sans">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <Sparkles className="w-4 h-4" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200">
            Dismiss
          </button>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Locked Editions</span>
            <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {editions.length} Issues
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">Protected against post-press mutability</span>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Frozen Snapshots</span>
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {snapshots.length} Snapshots
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">Includes previous version revisions</span>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Integrity Verification</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            SHA-256
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">Cryptographically signed production plates</span>
        </Card>
      </div>

      {/* Finalized Editions List */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden font-sans">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Finalized Print Publications
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {editions.length} record(s)
          </span>
        </div>

        {editions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Lock className="w-8 h-8 mx-auto text-slate-400" />
            <p className="text-sm">No finalized editions found yet.</p>
            <p className="text-xs text-slate-400">Open an edition in the Page Designer and click &quot;FINALIZE&quot; to authorize print production.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {editions.map((ed) => {
              const matchingSnapshots = snapshots.filter((s) => s.editionId === ed.editionId);
              const latestSnap = matchingSnapshots[matchingSnapshots.length - 1];

              return (
                <div key={ed.editionId} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                          {ed.brandName}
                        </span>
                        <Badge variant="emerald" className="text-xs">
                          FINALIZED • {ed.editionCode}
                        </Badge>
                        {latestSnap && (
                          <span className="text-xs px-2 py-0.5 rounded text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 font-medium">
                            v{latestSnap.version}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                        <span>Publication Date: <strong className="text-slate-700 dark:text-slate-200">{ed.publicationDate}</strong></span>
                        <span>•</span>
                        <span>Pages: <strong className="text-slate-700 dark:text-slate-200">{ed.totalPages || ed.pageCount || 2}</strong></span>
                        <span>•</span>
                        <span>Finalized At: <strong className="text-slate-700 dark:text-slate-200">{ed.finalizedAt ? new Date(ed.finalizedAt).toLocaleTimeString() : 'N/A'}</strong></span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {latestSnap && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSnapshot(latestSnap)}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                          className="text-xs"
                        >
                          View Snapshot
                        </Button>
                      )}

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenCorrectionModal(ed)}
                        leftIcon={<PlusCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                        className="text-xs"
                      >
                        Create Correction Revision
                      </Button>
                    </div>
                  </div>

                  {/* Cryptographic SHA-256 Checksum Card */}
                  {ed.checksum && (
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-600 dark:text-slate-300 flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-slate-500">Immutable SHA-256:</span>
                        <code className="text-slate-700 dark:text-slate-200 truncate">{ed.checksum}</code>
                      </div>
                      <span className="text-emerald-600 dark:text-emerald-400 shrink-0 text-[10px] uppercase font-bold">Verified Lock</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Snapshot Inspector Modal */}
      {selectedSnapshot && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSnapshot(null)}
          title={`Immutable Production Snapshot • ${selectedSnapshot.brandName} (v${selectedSnapshot.version})`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-slate-800 dark:text-slate-200 text-xs">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
              <div className="flex justify-between font-mono">
                <span className="text-slate-500 dark:text-slate-400">Snapshot ID:</span>
                <span className="text-slate-900 dark:text-white font-bold">{selectedSnapshot.snapshotId}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-500 dark:text-slate-400">Target Timezone:</span>
                <span className="text-slate-700 dark:text-slate-300">{selectedSnapshot.publicationTimezone}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-500 dark:text-slate-400">Authorized By:</span>
                <span className="text-slate-700 dark:text-slate-300">{selectedSnapshot.finalizedBy.displayName} ({selectedSnapshot.finalizedBy.userRole})</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-500 dark:text-slate-400">Press Specifications:</span>
                <span className="text-slate-700 dark:text-slate-300">{selectedSnapshot.pressSpecs.format} • {selectedSnapshot.pressSpecs.colorMode.toUpperCase()} • {selectedSnapshot.pressSpecs.dpi} DPI</span>
              </div>
            </div>

            {/* Frozen Placed Stories */}
            <div className="space-y-2">
              <span className="font-bold uppercase font-mono text-slate-500 dark:text-slate-400">
                Frozen Content Dispatches ({Object.keys(selectedSnapshot.articlesSnapshot).length} Placements)
              </span>
              <div className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto">
                {Object.values(selectedSnapshot.articlesSnapshot).map((art, idx) => (
                  <div key={idx} className="p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-slate-900 dark:text-white">{art.headline}</strong>
                      <span className="text-slate-500 font-mono text-[10px]">{art.category}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] truncate">By {art.byline} — {art.leadParagraph}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Correction Revision Modal */}
      {showCorrectionModal && targetEdition && (
        <Modal
          isOpen={true}
          onClose={() => setShowCorrectionModal(false)}
          title={`Create Correction Revision • ${targetEdition.editionCode}`}
        >
          <div className="space-y-4 text-slate-800 dark:text-slate-200 text-xs font-sans">
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-2.5 text-blue-900 dark:text-blue-200">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block">Production Immutability Guarantee</strong>
                <span>
                  The previous production snapshot (v1) remains frozen and untouched in the archive. Creating a correction opens a new editorial draft (v2) for modified headlines or story replacements.
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                Correction Description & Reason:
              </label>
              <textarea
                value={correctionSummary}
                onChange={(e) => setCorrectionSummary(e.target.value)}
                rows={3}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                placeholder="Specify the reason for modifying this already finalized issue..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCorrectionModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateCorrectionRevision}
                isLoading={correctionLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                Create Correction Revision
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
