/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Headline Lab Modal Component
 * Phase 6 — Interactive AI Headline Generator & Fit Analyzer
 */

import React, { useState } from 'react';
import { Sparkles, Check, AlertTriangle, ArrowRight, ShieldCheck, RefreshCw, Type } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { NewsArticle } from '../../types/news';
import { HeadlineOption, AISuggestion } from '../../types/editorialAi';
import { AIEditorialEngine } from '../../services/aiEditorialEngine';
import { EditorialVersioningService } from '../../services/editorialVersioningService';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';

interface HeadlineLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: NewsArticle;
  onApplied?: (updatedArticle: NewsArticle) => void;
}

export const HeadlineLabModal: React.FC<HeadlineLabModalProps> = ({
  isOpen,
  onClose,
  article,
  onApplied,
}) => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<HeadlineOption[]>([]);
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [selectedHeadline, setSelectedHeadline] = useState(article.headline);
  const [customHeadline, setCustomHeadline] = useState(article.headline);
  const [columnSpan, setColumnSpan] = useState<number>(4);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!currentTenant || !user) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await AIEditorialEngine.generateHeadlineSuggestions({
        tenantId: currentTenant.tenantId,
        userId: user.uid,
        userName: user.displayName || user.email || 'Editor',
        userRole: 'editor',
        article,
        targetColumnCount: columnSpan,
      });

      if (res.success && res.headlineOptions && res.suggestion) {
        setOptions(res.headlineOptions);
        setSuggestion(res.suggestion);
        if (res.headlineOptions.length > 0) {
          setSelectedHeadline(res.headlineOptions[0].headline);
          setCustomHeadline(res.headlineOptions[0].headline);
        }
      } else {
        setError(res.error || 'Failed to generate headlines.');
      }
    } catch (err: any) {
      setError(err.message || 'Error executing Headline Lab.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!currentTenant || !user) return;

    try {
      if (suggestion) {
        if (customHeadline !== selectedHeadline) {
          // Manual edit
          const res = EditorialVersioningService.modifyAndAcceptAISuggestion({
            newsId: article.articleId,
            tenantId: currentTenant.tenantId,
            suggestionId: suggestion.suggestionId,
            editorId: user.uid,
            editorName: user.displayName || 'Editor',
            editorRole: 'editor',
            modifiedHeadline: customHeadline,
            changeSummary: 'Manually edited headline choice in Headline Lab',
          });
          onApplied?.({ ...article, headline: res.version.headline });
        } else {
          // Accept exact choice
          const res = EditorialVersioningService.acceptAISuggestion({
            newsId: article.articleId,
            tenantId: currentTenant.tenantId,
            suggestionId: suggestion.suggestionId,
            editorId: user.uid,
            editorName: user.displayName || 'Editor',
            editorRole: 'editor',
            appliedHeadline: selectedHeadline,
            changeSummary: 'Selected AI headline from Headline Lab',
          });
          onApplied?.({ ...article, headline: res.version.headline });
        }
      } else {
        // Direct custom save
        const res = EditorialVersioningService.createHumanEditVersion({
          newsId: article.articleId,
          tenantId: currentTenant.tenantId,
          editorId: user.uid,
          editorName: user.displayName || 'Editor',
          editorRole: 'editor',
          headline: customHeadline,
          leadParagraph: article.leadParagraph,
          bodyContent: article.bodyContent,
          changeSummary: 'Updated headline in Headline Lab',
        });
        onApplied?.({ ...article, headline: res.headline });
      }

      setSuccessMsg('Headline applied successfully to active editorial version!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to apply headline.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Headline Lab & Fitting Analyzer"
      subtitle="AI-assisted headline suggestions with broadsheet column fit diagnostics & fact integrity."
      maxWidth="xl"
    >
      <div className="space-y-6 font-sans">
        {/* Original Headline Banner */}
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Current Authoritative Headline
            </span>
            <Badge variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              {article.headline.length} chars
            </Badge>
          </div>
          <p className="text-base font-semibold text-slate-900 dark:text-white font-sans leading-snug">{article.headline}</p>
        </div>

        {/* Column Width Selector & Generate Trigger */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 gap-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Target Column Span</label>
              <select
                value={columnSpan}
                onChange={(e) => setColumnSpan(Number(e.target.value))}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={2}>2 Columns (~180px)</option>
                <option value={3}>3 Columns (~280px)</option>
                <option value={4}>4 Columns (~380px - Lead)</option>
                <option value={6}>6 Columns (~600px - Full Banner)</option>
              </select>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <p>Fit Target: Max 3 lines at 24pt</p>
              <p className="text-slate-400 dark:text-slate-500">Fact Integrity Guard: Enabled</p>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            isLoading={loading}
            leftIcon={<Sparkles className="w-4 h-4 text-white" />}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs shrink-0"
          >
            {options.length > 0 ? 'Regenerate Options' : 'Generate Headline Options'}
          </Button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* AI Options Grid */}
        {options.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              AI Editorial Options (Select or Modify)
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {options.map((opt, idx) => {
                const isSelected = selectedHeadline === opt.headline;
                return (
                  <div
                    key={opt.optionId || idx}
                    onClick={() => {
                      setSelectedHeadline(opt.headline);
                      setCustomHeadline(opt.headline);
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-500 ring-1 ring-blue-500'
                        : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                            Option {String.fromCharCode(65 + idx)} ({opt.style})
                          </span>
                          <Badge
                            variant={opt.fitVerdict === 'OPTIMAL' ? 'emerald' : 'amber'}
                            className={
                              opt.fitVerdict === 'OPTIMAL'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800/60'
                                : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800/60'
                            }
                          >
                            {opt.fitVerdict} FIT ({opt.estimatedLines} Lines)
                          </Badge>
                          {opt.factIntegrityStatus === 'PASSED' && (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                              <ShieldCheck className="w-3.5 h-3.5" /> Fact Verified
                            </span>
                          )}
                        </div>
                        <p className="text-base font-semibold text-slate-900 dark:text-white font-sans leading-snug">
                          {opt.headline}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs text-slate-500 dark:text-slate-400 block">{opt.characterCount} chars</span>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">
                            <Check className="w-3.5 h-3.5" /> Selected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected / Custom Editor Input */}
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Final Headline Output (Editor Overrides Permitted)
          </label>
          <input
            type="text"
            value={customHeadline}
            onChange={(e) => setCustomHeadline(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-sans font-semibold text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type or refine headline..."
          />
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span>
              Length: <strong className="text-slate-900 dark:text-slate-200">{customHeadline.length}</strong> characters
            </span>
            <span className="text-slate-400 dark:text-slate-500">
              Note: Editor acceptance will record an immutable EditorialContentVersion.
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button variant="ghost" onClick={onClose} className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
            leftIcon={<Check className="w-4 h-4" />}
          >
            Apply & Accept Headline
          </Button>
        </div>
      </div>
    </Modal>
  );
};
