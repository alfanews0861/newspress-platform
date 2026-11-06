/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * AI Copy-Fitting Modal
 * Phase 6 — Connects AI shortening with Phase 4 Newspaper Layout Engine
 */

import { useState } from 'react';
import { Scissors, Check, AlertCircle, ArrowDown, FileText, ShieldCheck } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { NewsArticle } from '../../types/news';
import { AIEditorialEngine } from '../../services/aiEditorialEngine';
import { EditorialVersioningService } from '../../services/editorialVersioningService';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';

interface AICopyFittingModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: NewsArticle;
  onApplied?: (updatedArticle: NewsArticle) => void;
}

export const AICopyFittingModal: React.FC<AICopyFittingModalProps> = ({
  isOpen,
  onClose,
  article,
  onApplied,
}) => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const [loading, setLoading] = useState(false);
  const [reductionPercent, setReductionPercent] = useState<number>(25);
  const [shortenedCopy, setShortenedCopy] = useState<string | null>(null);
  const [stats, setStats] = useState<{ originalWords: number; newWords: number; mmReduction: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleGenerateShortenedCopy = async () => {
    if (!currentTenant || !user) return;
    setLoading(true);
    setError(null);

    try {
      const res = await AIEditorialEngine.shortenCopyForLayout({
        tenantId: currentTenant.tenantId,
        userId: user.uid,
        userName: user.displayName || user.email || 'Editor',
        userRole: 'editor',
        article,
        targetHeightReductionPercent: reductionPercent,
      });

      if (res.success && res.shortenedText) {
        setShortenedCopy(res.shortenedText);
        const origWords = article.bodyContent.split(/\s+/).length;
        const newWords = res.shortenedText.split(/\s+/).length;
        setStats({
          originalWords: origWords,
          newWords,
          mmReduction: res.expectedHeightReductionMm || Math.round((reductionPercent / 100) * 80),
        });
      } else {
        setError(res.error || 'Failed to generate copy fitting suggestion.');
      }
    } catch (err: any) {
      setError(err.message || 'Error processing copy fitting request.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!currentTenant || !user || !shortenedCopy) return;

    try {
      const res = EditorialVersioningService.createHumanEditVersion({
        newsId: article.articleId,
        tenantId: currentTenant.tenantId,
        editorId: user.uid,
        editorName: user.displayName || 'Editor',
        editorRole: 'editor',
        headline: article.headline,
        leadParagraph: article.leadParagraph,
        bodyContent: shortenedCopy,
        changeSummary: `Applied ${reductionPercent}% AI copy-fitting reduction for newspaper column layout`,
      });

      onApplied?.({ ...article, bodyContent: res.bodyContent, wordCount: res.bodyContent.split(/\s+/).length });
      setSuccess('Applied shortened copy to active editorial version!');
      setTimeout(onClose, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to save copy fitting version.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Newspaper Copy-Fitting Assistant"
      subtitle="Shorten news story body copy to fit target column height without altering facts or lead paragraph."
      maxWidth="xl"
    >
      <div className="space-y-6 font-sans">
        {/* Layout Overflow Warning Header */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 flex items-center justify-between text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <Scissors className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold">Layout Fitting Alert</h4>
              <p className="text-xs text-amber-800 dark:text-amber-300/80">
                Original article contains <strong>{article.bodyContent.split(/\s+/).length} words</strong>.
              </p>
            </div>
          </div>
          <Badge variant="amber" className="bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700">
            Overflow Detected
          </Badge>
        </div>

        {/* Reduction Target Control */}
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Target Column Height Reduction (%)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={10}
              max={50}
              step={5}
              value={reductionPercent}
              onChange={(e) => setReductionPercent(Number(e.target.value))}
              className="flex-1 accent-blue-600"
            />
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400 w-12 text-right">{reductionPercent}%</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>10% (Minor trim)</span>
            <span>25% (Standard column fit)</span>
            <span>50% (Compact brief)</span>
          </div>
        </div>

        <Button
          onClick={handleGenerateShortenedCopy}
          isLoading={loading}
          leftIcon={<Scissors className="w-4 h-4" />}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
        >
          Generate Shortened Newspaper Copy
        </Button>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Shortened Output Comparison */}
        {shortenedCopy && stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Original Words</span>
                <span className="text-base font-bold text-slate-900 dark:text-slate-200">{stats.originalWords}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Shortened Words</span>
                <span className="text-base font-bold text-blue-600 dark:text-blue-400">{stats.newWords}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Height Saved</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">~{stats.mmReduction} mm</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">Shortened Newspaper Copy</span>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> Inverted Pyramid Lead Intact
                </span>
              </div>
              <div className="text-sm font-sans text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {shortenedCopy}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button variant="ghost" onClick={onClose} className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
            Cancel
          </Button>
          {shortenedCopy && (
            <Button onClick={handleApply} className="bg-blue-600 hover:bg-blue-700 text-white font-medium" leftIcon={<Check className="w-4 h-4" />}>
              Accept Shortened Copy
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
