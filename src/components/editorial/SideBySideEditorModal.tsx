/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Side-by-Side AI Editorial Comparison & Fact Check Diff Modal
 * Phase 6 — Human-in-the-Loop Editorial Decision Interface
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  X,
  AlertTriangle,
  ShieldCheck,
  Edit3,
  ArrowRight,
  FileText,
  UserCheck,
  AlertOctagon,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { NewsArticle } from '../../types/news';
import { AISuggestion, FactIntegrityReport } from '../../types/editorialAi';
import { AIEditorialEngine } from '../../services/aiEditorialEngine';
import { EditorialVersioningService } from '../../services/editorialVersioningService';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';

interface SideBySideEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: NewsArticle;
  onApplied?: (updatedArticle: NewsArticle) => void;
}

export const SideBySideEditorModal: React.FC<SideBySideEditorModalProps> = ({
  isOpen,
  onClose,
  article,
  onApplied,
}) => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [factReport, setFactReport] = useState<FactIntegrityReport | null>(null);

  // Editable suggestion fields
  const [editedHeadline, setEditedHeadline] = useState(article.headline);
  const [editedLead, setEditedLead] = useState(article.leadParagraph);
  const [editedBody, setEditedBody] = useState(article.bodyContent);

  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleRunCopyEdit = async () => {
    if (!currentTenant || !user) return;
    setLoading(true);
    setError(null);

    try {
      const res = await AIEditorialEngine.copyEditArticle({
        tenantId: currentTenant.tenantId,
        userId: user.uid,
        userName: user.displayName || user.email || 'Editor',
        userRole: 'editor',
        article,
      });

      if (res.success && res.suggestion && res.factReport) {
        setSuggestion(res.suggestion);
        setFactReport(res.factReport);
        const data = res.suggestion.outputData;
        setEditedHeadline(data.suggestedHeadline || article.headline);
        setEditedLead(data.suggestedLeadParagraph || article.leadParagraph);
        setEditedBody(data.suggestedBodyContent || article.bodyContent);
      } else {
        setError(res.error || 'Failed to generate AI copy edit.');
      }
    } catch (err: any) {
      setError(err.message || 'Error running AI Editorial assistant.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (!currentTenant || !user || !suggestion) return;

    try {
      const isModified =
        editedHeadline !== suggestion.outputData.suggestedHeadline ||
        editedLead !== suggestion.outputData.suggestedLeadParagraph ||
        editedBody !== suggestion.outputData.suggestedBodyContent;

      if (isModified) {
        const res = EditorialVersioningService.modifyAndAcceptAISuggestion({
          newsId: article.articleId,
          tenantId: currentTenant.tenantId,
          suggestionId: suggestion.suggestionId,
          editorId: user.uid,
          editorName: user.displayName || 'Editor',
          editorRole: 'editor',
          modifiedHeadline: editedHeadline,
          modifiedLeadParagraph: editedLead,
          modifiedBodyContent: editedBody,
          changeSummary: 'Editor modified and accepted AI copy edit',
        });
        onApplied?.({
          ...article,
          headline: res.version.headline,
          leadParagraph: res.version.leadParagraph,
          bodyContent: res.version.bodyContent,
        });
      } else {
        const res = EditorialVersioningService.acceptAISuggestion({
          newsId: article.articleId,
          tenantId: currentTenant.tenantId,
          suggestionId: suggestion.suggestionId,
          editorId: user.uid,
          editorName: user.displayName || 'Editor',
          editorRole: 'editor',
          appliedHeadline: editedHeadline,
          appliedLeadParagraph: editedLead,
          appliedBodyContent: editedBody,
          changeSummary: 'Editor accepted AI copy edit',
        });
        onApplied?.({
          ...article,
          headline: res.version.headline,
          leadParagraph: res.version.leadParagraph,
          bodyContent: res.version.bodyContent,
        });
      }

      setStatusMsg('Accepted! Created immutable EditorialContentVersion.');
      setTimeout(onClose, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to accept suggestion.');
    }
  };

  const handleReject = () => {
    if (!currentTenant || !user || !suggestion) return;
    try {
      EditorialVersioningService.rejectAISuggestion({
        newsId: article.articleId,
        tenantId: currentTenant.tenantId,
        suggestionId: suggestion.suggestionId,
        editorId: user.uid,
        editorName: user.displayName || 'Editor',
        editorRole: 'editor',
        reason: 'Editor rejected AI suggestions',
      });
      setStatusMsg('AI suggestion rejected. Original reporter content remains untouched.');
      setTimeout(onClose, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to reject suggestion.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Editorial Comparison & Fact Check Diff"
      subtitle="Side-by-side review: Source reporter text vs AI suggested polish with fact preservation audit."
      maxWidth="2xl"
    >
      <div className="space-y-6 font-sans">
        {/* Top Trigger Banner if suggestion not generated yet */}
        {!suggestion && (
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center space-y-3">
            <div className="inline-flex items-center justify-center p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-full text-blue-600 dark:text-blue-400 mb-1">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white font-sans">Run AI Editorial Assistant</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Generates lightweight spelling, grammar, readability, and structural copy polish suggestions.
              Extracts factual entities (names, numbers, quotes, dates) into a FactLedger to prevent silent changes.
            </p>
            <Button
              onClick={handleRunCopyEdit}
              isLoading={loading}
              leftIcon={<Sparkles className="w-4 h-4 text-white" />}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs"
            >
              Analyze & Generate Suggestions
            </Button>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {statusMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Fact Integrity Banner if suggestion exists */}
        {factReport && (
          <div
            className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
              factReport.passed
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {factReport.passed ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold">
                    Fact Integrity Audit: {factReport.status.replace(/_/g, ' ')}
                  </h4>
                  <Badge variant={factReport.passed ? 'emerald' : 'rose'} className={factReport.passed ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200' : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900 dark:text-rose-200'}>
                    Score: {factReport.confidenceScore}%
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{factReport.details}</p>

                {factReport.discrepancies.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {factReport.discrepancies.map((d, i) => (
                      <div key={i} className="text-xs font-mono bg-white dark:bg-slate-950/60 p-2 rounded border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300">
                        <strong>[{d.discrepancyType}]</strong> {d.description} (Original: "{d.originalValue}" → Suggested: "{d.suggestedValue}")
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Side-by-Side Comparison Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* LEFT: Authoritative Source Content */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" /> SOURCE REPORTER CONTENT
              </span>
              <Badge variant="outline" className="border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50">
                Authoritative (v1)
              </Badge>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Original Headline</label>
              <p className="text-base font-sans font-semibold text-slate-900 dark:text-slate-100 mt-1">{article.headline}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Original Lead</label>
              <p className="text-sm font-sans text-slate-800 dark:text-slate-300 mt-1 leading-relaxed bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                {article.leadParagraph}
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Original Body Content</label>
              <div className="text-sm font-sans text-slate-800 dark:text-slate-300 mt-1 leading-relaxed bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800 max-h-72 overflow-y-auto whitespace-pre-wrap">
                {article.bodyContent}
              </div>
            </div>

            <div className="text-xs text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
              <span>Byline: {article.byline}</span>
              <span>Words: {article.bodyContent.split(/\s+/).length}</span>
            </div>
          </div>

          {/* RIGHT: AI Suggestion & Interactive Editor */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> AI EDITORIAL SUGGESTION
              </span>
              <Badge variant="outline" className="border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50">
                Advisory (Pending Review)
              </Badge>
            </div>

            {suggestion ? (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Suggested Headline</label>
                  <input
                    type="text"
                    value={editedHeadline}
                    onChange={(e) => setEditedHeadline(e.target.value)}
                    className="w-full text-base font-sans font-semibold bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Suggested Lead</label>
                  <textarea
                    rows={3}
                    value={editedLead}
                    onChange={(e) => setEditedLead(e.target.value)}
                    className="w-full text-sm font-sans bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Suggested Body Copy</label>
                  <textarea
                    rows={8}
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    className="w-full text-sm font-sans bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg">
                  Model: {suggestion.aiProvider} ({suggestion.aiModel}) • Token Est: ~{Math.round(editedBody.length / 4)}
                </div>
              </>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <Edit3 className="w-8 h-8 text-slate-400" />
                <p className="text-sm font-medium">Click "Analyze & Generate Suggestions" above to compare AI recommendations side-by-side.</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        {suggestion && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="outline"
              onClick={handleReject}
              leftIcon={<X className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
              className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/40"
            >
              Reject AI Suggestion
            </Button>

            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={onClose} className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
                Cancel
              </Button>
              <Button
                onClick={handleAccept}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                leftIcon={<UserCheck className="w-4 h-4" />}
              >
                Accept & Finalize Version
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
