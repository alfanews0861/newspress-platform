/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 9 — Edition Review & Editor-in-Chief Finalize Desk
 * Senior editorial review interface:
 * Page thumbnails, full-page preview, content list, ad lock states,
 * and authoritative sign-off actions.
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  FileCheck,
  AlertTriangle,
  ArrowRight,
  Printer,
  Undo2,
  Eye,
  Lock,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { EditionPlanningService } from '../../services/editionPlanningService';
import { EditionReadinessService } from '../../services/editionReadinessService';
import { EditionReservationService } from '../../services/editionReservationService';
import { EditionAdvertisementService } from '../../services/editionAdvertisementService';
import {
  MOCK_CURRENT_EDITION,
  MOCK_NEWS_ARTICLES,
  MOCK_LICENSES,
  MOCK_TEMPLATES,
  MOCK_BRANDS,
} from '../../services/mockDataService';

interface EditionReviewPageProps {
  onNavigate?: (path: string) => void;
}

export const EditionReviewPage: React.FC<EditionReviewPageProps> = ({ onNavigate }) => {
  const { currentTenant } = useTenant();
  const { user, currentMembership } = useAuth();
  const { can, isPlatformAdmin } = usePermission();
  const isEditorInChief = currentMembership?.organizationRole === 'editor_in_chief' || currentMembership?.organizationRole === 'owner' || isPlatformAdmin;

  const [selectedEditionId, setSelectedEditionId] = useState(MOCK_CURRENT_EDITION.editionId);
  const [activePreviewPage, setActivePreviewPage] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modals
  const [showSendBackModal, setShowSendBackModal] = useState(false);
  const [sendBackNotes, setSendBackNotes] = useState('');
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const edition = EditionPlanningService.getEdition(selectedEditionId) || MOCK_CURRENT_EDITION;
  const reservations = EditionReservationService.getReservationsForEdition(selectedEditionId);
  const ads = EditionAdvertisementService.getAdvertisementsForEdition(selectedEditionId);

  const readiness = EditionReadinessService.evaluateReadiness({
    edition,
    pages: edition.pages || [],
    articles: MOCK_NEWS_ARTICLES,
    licenses: MOCK_LICENSES,
  });

  const handleSendBack = () => {
    const res = EditionPlanningService.sendBackToDesign(
      currentTenant.tenantId,
      selectedEditionId,
      user?.uid || 'editor-1',
      sendBackNotes
    );

    if (res.success) {
      setFeedback('Edition returned to Design desk for revisions.');
      setShowSendBackModal(false);
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setFeedback(`Error: ${res.error}`);
    }
  };

  const handleApproveFinalize = async () => {
    setIsFinalizing(true);
    try {
      const userRole = currentMembership?.organizationRole || (isPlatformAdmin ? 'super_admin' : 'editor_in_chief');
      const res = await EditionPlanningService.finalizeEdition(
        currentTenant.tenantId,
        selectedEditionId,
        user?.uid || 'editor-1',
        userRole,
        MOCK_TEMPLATES[0],
        MOCK_BRANDS[0],
        MOCK_NEWS_ARTICLES,
        MOCK_LICENSES
      );

      if (res.success) {
        setFeedback('Edition successfully FINALIZED! Production Snapshot frozen and dispatched to Night Press Queue.');
        setShowFinalizeModal(false);
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setFeedback(`Finalization rejected: ${res.errors?.join(' ')}`);
      }
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editor-in-Chief Pre-Flight Review & Finalization Desk"
        subtitle={`Authoritative broadsheet proof inspection and press sign-off for ${edition.editionCode}.`}
        breadcrumbs={[
          { label: 'Newspaper', href: '#' },
          { label: 'Edition Review' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              leftIcon={<RotateCcw className="w-4 h-4" />}
              onClick={() => setShowSendBackModal(true)}
            >
              Send Back to Design
            </Button>
            <Button
              variant="primary"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={() => setShowFinalizeModal(true)}
              disabled={edition.status === 'FINALIZED'}
            >
              {edition.status === 'FINALIZED' ? 'Edition Finalized (Press Locked)' : 'Approve for FINALIZE'}
            </Button>
          </div>
        }
      />

      {feedback && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {feedback}
        </div>
      )}

      {/* Main Grid: Thumbnails & Live Page Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Thumbnails Navigator (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Page Spreads ({edition.pageCount || 2} Pages)
          </h3>

          {[1, 2].map((pNum) => {
            const isSelected = activePreviewPage === pNum;
            const pageStories = reservations.filter((r) => r.pageIntent === pNum);
            const pageAds = ads.filter((a) => a.pageNumber === pNum);

            return (
              <button
                key={pNum}
                onClick={() => setActivePreviewPage(pNum)}
                className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-600 text-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-sans font-bold">Page {pNum}</span>
                  <Badge variant={isSelected ? 'primary' : 'outline'} size="sm">
                    {pNum === 1 ? 'A1 Front' : 'A2 National'}
                  </Badge>
                </div>
                <div className="text-[10px] font-sans text-slate-500 dark:text-slate-400">
                  {pageStories.length} Stories • {pageAds.length} Ad Slots
                </div>
              </button>
            );
          })}

          <Card variant="bordered" className="p-3 text-xs space-y-2">
            <div className="font-semibold text-slate-700 dark:text-slate-300 font-sans">Edition Integrity State</div>
            <div className="flex items-center justify-between font-sans text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">Status:</span>
              <StatusBadge status={edition.status} />
            </div>
            <div className="flex items-center justify-between font-sans text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">Readiness:</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">{readiness.overallScorePercent}%</span>
            </div>
            <div className="flex items-center justify-between font-sans text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">Print Deadline:</span>
              <span className="text-blue-600 dark:text-blue-400 font-medium">{edition.printDeadline?.slice(11, 16) || '10:00'}</span>
            </div>
          </Card>
        </div>

        {/* Live Page Preview (9 cols) */}
        <div className="lg:col-span-9">
          <Card
            variant="editorial"
            title={`Full Page Proof — Page ${activePreviewPage} (${activePreviewPage === 1 ? 'Front Page Lead' : 'National Bureau'})`}
            subtitle="CMYK pre-press rendering preview."
            action={
              <Badge variant="emerald" size="sm">
                PDF/X-1a Preflight Verified
              </Badge>
            }
          >
            <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm min-h-[550px] space-y-4">
              {activePreviewPage === 1 ? (
                <>
                  {/* Masthead Header */}
                  <div className="text-center pb-3 border-b-2 border-slate-200 dark:border-slate-700">
                    <h1 className="text-2xl font-black font-sans text-slate-900 dark:text-white">
                      {currentTenant.organizationName}
                    </h1>
                    <div className="text-[10px] font-sans text-slate-500 dark:text-slate-400">
                      October 5, 2026 • Morning Daily Edition • Page 1
                    </div>
                  </div>

                  {/* Stories on Page 1 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Badge variant="blue" size="sm">
                        FRONT PAGE LEAD
                      </Badge>
                      <h2 className="text-lg font-bold font-sans text-slate-900 dark:text-white leading-snug">
                        {MOCK_NEWS_ARTICLES[0].title}
                      </h2>
                      <div className="text-[10px] font-sans text-slate-500 dark:text-slate-400">
                        By {MOCK_NEWS_ARTICLES[0].byline}
                      </div>
                      <p className="text-xs font-sans text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-4">
                        {MOCK_NEWS_ARTICLES[0].content}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {MOCK_NEWS_ARTICLES[0].imageUrl && (
                        <div className="w-full h-36 rounded-lg overflow-hidden border border-slate-800">
                          <img
                            src={MOCK_NEWS_ARTICLES[0].imageUrl}
                            alt="Lead"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                        <Badge variant="outline" size="sm">
                          BRIEF
                        </Badge>
                        <h4 className="text-xs font-bold text-slate-200">
                          {MOCK_NEWS_ARTICLES[2]?.title || 'Regional Dispatch'}
                        </h4>
                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {MOCK_NEWS_ARTICLES[2]?.synopsis || 'Brief summary'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 text-center text-xs font-sans text-blue-700 dark:text-blue-400">
                    Commercially Locked Base Advertisement (Gold Rate Card Sponsor)
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center justify-between text-xs font-sans text-slate-500 dark:text-slate-400">
                    <span>SECTION A — PAGE 2</span>
                    <span>NATIONAL & REGIONAL DESK</span>
                  </div>

                  <div className="space-y-3">
                    <Badge variant="blue" size="sm">
                      NATIONAL LEAD
                    </Badge>
                    <h3 className="text-base font-bold font-sans text-slate-900 dark:text-slate-200">
                      {MOCK_NEWS_ARTICLES[1]?.title || 'National Bureau Reporting'}
                    </h3>
                    <div className="text-[10px] font-sans text-slate-500 dark:text-slate-400">
                      By {MOCK_NEWS_ARTICLES[1]?.byline || 'Staff Bureau'}
                    </div>
                    <p className="text-xs font-sans text-slate-700 dark:text-slate-300 leading-relaxed">
                      {MOCK_NEWS_ARTICLES[1]?.content?.slice(0, 350)}...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Send Back Modal */}
      <Modal
        isOpen={showSendBackModal}
        onClose={() => setShowSendBackModal(false)}
        title="Return Edition to Design Desk"
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowSendBackModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSendBack}>
              Confirm Return
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Provide revision instructions or correction requirements for the layout design desk:
          </p>
          <Input
            label="Correction / Rebalance Instructions"
            value={sendBackNotes}
            onChange={(e) => setSendBackNotes(e.target.value)}
            placeholder="e.g. Adjust headline leading on page 1, reflow brief on page 2..."
            required
          />
        </div>
      </Modal>

      {/* Approve for FINALIZE Modal */}
      <Modal
        isOpen={showFinalizeModal}
        onClose={() => setShowFinalizeModal(false)}
        title="Authorize Edition Finalization & Press Handoff"
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowFinalizeModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleApproveFinalize}
              isLoading={isFinalizing}
            >
              Sign Off & Finalize Edition
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
              <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Permanent Press Lock
            </div>
            <p className="text-[11px] leading-relaxed">
              Finalizing freezes an immutable Production Snapshot and transmits the raster plate instructions to the Night Press Queue. Ordinary page edits will be blocked.
            </p>
          </div>

          <div className="space-y-1 pt-2 font-sans text-[11px]">
            <div>• Edition Code: <strong className="text-slate-900 dark:text-slate-100">{edition.editionCode}</strong></div>
            <div>• Planned Pages: <strong className="text-slate-900 dark:text-slate-100">{edition.pageCount || 2}</strong></div>
            <div>• Authorized Sign-off: <strong className="text-slate-900 dark:text-slate-100">{user?.displayName || 'Editor-in-Chief'}</strong></div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
