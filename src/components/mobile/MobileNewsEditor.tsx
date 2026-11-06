/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 13 — Mobile News Editor Component
 * Offline-first field article authoring with autosave, versioning, evidence attachment,
 * word count metrics, and server originality validation bridge.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  Send,
  Camera,
  Mic,
  MapPin,
  Clock,
  Tag,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  ChevronLeft,
  X,
  FileText,
} from 'lucide-react';
import { MobileDraftArticle, MobileEvidenceItem } from '../../types/mobile';
import { OfflineReportingStore } from '../../services/mobileOfflineStore';
import { MobileSyncService } from '../../services/mobileSyncService';
import { FieldEvidenceCaptureModal } from './FieldEvidenceCaptureModal';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';

interface MobileNewsEditorProps {
  initialDraftId?: string;
  assignmentId?: string;
  initialHeadline?: string;
  initialBeat?: string;
  initialLocation?: string;
  onBack?: () => void;
  onSubmitSuccess?: () => void;
}

export const MobileNewsEditor: React.FC<MobileNewsEditorProps> = ({
  initialDraftId,
  assignmentId,
  initialHeadline = '',
  initialBeat = 'General',
  initialLocation = 'Metro Central',
  onBack,
  onSubmitSuccess,
}) => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.tenantId || 'tenant-metro-chronicle';
  const reporterId = user?.uid || user?.userId || 'rep_sofia_chen';

  const [draftId, setDraftId] = useState<string>(
    initialDraftId || `draft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  );
  const [headline, setHeadline] = useState<string>(initialHeadline);
  const [subheadline, setSubheadline] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [category, setCategory] = useState<string>(initialBeat);
  const [location, setLocation] = useState<string>(initialLocation);
  const [eventDateTime, setEventDateTime] = useState<string>(new Date().toISOString().slice(0, 16));
  const [reporterNotes, setReporterNotes] = useState<string>('');
  const [sourceNotes, setSourceNotes] = useState<string>('');
  const [isBreaking, setIsBreaking] = useState<boolean>(false);
  const [attachedEvidence, setAttachedEvidence] = useState<MobileEvidenceItem[]>([]);
  const [version, setVersion] = useState<number>(1);
  const [lastSaved, setLastSaved] = useState<string>('Just now');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState<boolean>(false);

  // Load existing draft if provided
  useEffect(() => {
    if (initialDraftId) {
      const existing = OfflineReportingStore.getDraft(initialDraftId, tenantId);
      if (existing) {
        setHeadline(existing.headline);
        setSubheadline(existing.subheadline);
        setBody(existing.body);
        setCategory(existing.category);
        setLocation(existing.location);
        setEventDateTime(existing.eventDateTime);
        setReporterNotes(existing.reporterNotes);
        setSourceNotes(existing.sourceNotes);
        setIsBreaking(existing.isBreaking);
        setVersion(existing.version);

        // Load evidence
        const evs = existing.evidenceIds
          .map((id) => OfflineReportingStore.getEvidence(id, tenantId))
          .filter(Boolean) as MobileEvidenceItem[];
        setAttachedEvidence(evs);
      }
    }
  }, [initialDraftId, tenantId]);

  // Autosave handler (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      const draft: MobileDraftArticle = {
        draftId,
        tenantId,
        reporterId,
        assignmentId,
        headline,
        subheadline,
        body,
        category,
        location,
        eventDateTime,
        reporterNotes,
        sourceNotes,
        wordCount: body.trim() ? body.trim().split(/\s+/).length : 0,
        evidenceIds: attachedEvidence.map((e) => e.localId),
        isBreaking,
        version,
        lastSavedLocallyAt: new Date().toISOString(),
        syncStatus: 'MODIFIED_OFFLINE',
      };

      OfflineReportingStore.saveDraft(draft);
      setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 800);

    return () => clearTimeout(timer);
  }, [
    headline,
    subheadline,
    body,
    category,
    location,
    eventDateTime,
    reporterNotes,
    sourceNotes,
    isBreaking,
    attachedEvidence,
    draftId,
    tenantId,
    reporterId,
    assignmentId,
    version,
  ]);

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;
  const charCount = body.length;

  const handleEvidenceAdded = (item: MobileEvidenceItem) => {
    setAttachedEvidence((prev) => [...prev, item]);
  };

  const handleRemoveEvidence = (localId: string) => {
    setAttachedEvidence((prev) => prev.filter((e) => e.localId !== localId));
  };

  const handleSubmit = async () => {
    if (!headline.trim() || headline.trim().length < 5) {
      setSubmitError('Headline is required and must be at least 5 characters long.');
      return;
    }
    if (!body.trim() || wordCount < 10) {
      setSubmitError('Article body is too short (minimum 10 words required for editorial review).');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const isOnline = OfflineReportingStore.getNetworkState() !== 'OFFLINE';

      // Enqueue submission operation in mobile sync queue
      const op = MobileSyncService.enqueue({
        tenantId,
        userId: reporterId,
        entityId: draftId,
        operationType: 'SUBMIT_STORY',
        payload: {
          draftId,
          assignmentId,
          headline,
          subheadline,
          body,
          category,
          location,
          eventDateTime,
          reporterNotes,
          sourceNotes,
          isBreaking,
          evidenceIds: attachedEvidence.map((e) => e.localId),
        },
      });

      if (isOnline) {
        const syncResult = await MobileSyncService.processQueue(tenantId);
        if (syncResult.failed > 0) {
          setSubmitSuccessMsg('Story queued for background sync (network temporary retry).');
        } else {
          setSubmitSuccessMsg('Story successfully submitted for Editorial Review & Originality Check!');
        }
      } else {
        setSubmitSuccessMsg('Device is OFFLINE. Story safely stored locally and queued for automatic sync!');
      }

      setTimeout(() => {
        if (onSubmitSuccess) onSubmitSuccess();
      }, 1200);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit article.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-950 text-white min-h-full flex flex-col">
      {/* Top Action Bar */}
      <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <span>Mobile Field Editor</span>
              {isBreaking && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center space-x-1">
                  <Flame className="w-3 h-3" />
                  <span>BREAKING</span>
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-400">
              Autosaved locally • <span className="text-amber-400">{lastSaved}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs transition shadow-lg shadow-amber-950/40"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Submitting...' : 'Submit Story'}</span>
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {submitError && (
        <div className="m-3 p-3 bg-rose-500/20 border border-rose-500/50 rounded-xl flex items-center space-x-2 text-rose-200 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{submitError}</span>
        </div>
      )}

      {submitSuccessMsg && (
        <div className="m-3 p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl flex items-center space-x-2 text-emerald-200 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{submitSuccessMsg}</span>
        </div>
      )}

      {/* Editor Main Content */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto max-w-2xl mx-auto w-full">
        {/* Assignment Link Badge */}
        {assignmentId && (
          <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Linked Assignment:</span>
            <span className="font-mono text-amber-400 font-semibold">{assignmentId}</span>
          </div>
        )}

        {/* Breaking News Toggle */}
        <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
          <div className="flex items-center space-x-2">
            <Flame className={`w-4 h-4 ${isBreaking ? 'text-rose-500' : 'text-slate-500'}`} />
            <div>
              <p className="text-xs font-semibold text-slate-200">Flag as Breaking News Alert</p>
              <p className="text-[10px] text-slate-400">Priority advisory broadcast for editorial desk</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsBreaking(!isBreaking)}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              isBreaking ? 'bg-rose-600' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                isBreaking ? 'translate-x-5' : 'translate-x-0.5'
              } top-0.5 absolute`}
            />
          </button>
        </div>

        {/* Headline */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Headline *</label>
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Lead headline for wire and print..."
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Subheadline / Dek */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Subheadline / Standfirst</label>
          <input
            type="text"
            value={subheadline}
            onChange={(e) => setSubheadline(e.target.value)}
            placeholder="Contextual summary or secondary deck..."
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Category & Location Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Beat / Desk</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">District / Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Body Textarea */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-400">Story Body Dispatch *</label>
            <span className="text-[11px] font-mono text-amber-400">
              {wordCount} words • {charCount} chars
            </span>
          </div>
          <textarea
            rows={12}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Draft story dispatch from the scene. Include firsthand observations, quotes, timeline, and critical figures..."
            className="w-full p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-sm leading-relaxed text-slate-100 focus:outline-none focus:border-amber-500 font-sans"
          />
        </div>

        {/* Attached Evidence Section */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Attached Field Evidence ({attachedEvidence.length})</span>
            </span>
            <button
              type="button"
              onClick={() => setIsEvidenceModalOpen(true)}
              className="flex items-center space-x-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold rounded-lg text-xs transition"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>+ Add Media</span>
            </button>
          </div>

          {attachedEvidence.length === 0 ? (
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl text-center">
              <p className="text-xs text-slate-400">No field evidence attached yet.</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Attach raw camera photos, audio interviews, or document PDFs to boost originality verification.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {attachedEvidence.map((ev) => (
                <div
                  key={ev.localId}
                  className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between space-x-2"
                >
                  <div className="flex items-center space-x-2 overflow-hidden">
                    {ev.type === 'PHOTO' && <Camera className="w-4 h-4 text-amber-400 shrink-0" />}
                    {ev.type === 'AUDIO' && <Mic className="w-4 h-4 text-rose-400 shrink-0" />}
                    {ev.type === 'DOCUMENT' && <FileText className="w-4 h-4 text-sky-400 shrink-0" />}
                    {ev.type === 'FIELD_NOTE' && <FileText className="w-4 h-4 text-emerald-400 shrink-0" />}
                    <div className="truncate">
                      <p className="text-xs text-slate-200 font-medium truncate">{ev.caption || ev.fileName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {ev.type} • {ev.uploadStatus}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveEvidence(ev.localId)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Source & Field Notes Accordion */}
        <div className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Confidential Source Notes (Internal Only)</label>
            <input
              type="text"
              value={sourceNotes}
              onChange={(e) => setSourceNotes(e.target.value)}
              placeholder="Background source credentials, verified phone numbers, or off-the-record caveats..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Reporter Observations / Desk Notes</label>
            <input
              type="text"
              value={reporterNotes}
              onChange={(e) => setReporterNotes(e.target.value)}
              placeholder="Notes for the desk editor regarding follow-ups or press briefings..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Field Evidence Capture Modal */}
      <FieldEvidenceCaptureModal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
        tenantId={tenantId}
        reporterId={reporterId}
        storyId={draftId}
        assignmentId={assignmentId}
        onEvidenceAdded={handleEvidenceAdded}
      />
    </div>
  );
};
