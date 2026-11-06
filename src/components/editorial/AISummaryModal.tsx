/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * AI Summary Generator Modal
 * Phase 6 — Executive Teaser & Summary Options (30, 50, 60, 80 words)
 */

import React, { useState } from 'react';
import { Sparkles, Copy, Check, FileText } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { NewsArticle } from '../../types/news';
import { SummaryOption } from '../../types/editorialAi';
import { AIEditorialEngine } from '../../services/aiEditorialEngine';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';

interface AISummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: NewsArticle;
}

export const AISummaryModal: React.FC<AISummaryModalProps> = ({ isOpen, onClose, article }) => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const [loading, setLoading] = useState(false);
  const [summaries, setSummaries] = useState<SummaryOption[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!currentTenant || !user) return;
    setLoading(true);
    setError(null);

    try {
      const res = await AIEditorialEngine.generateSummary({
        tenantId: currentTenant.tenantId,
        userId: user.uid,
        userName: user.displayName || user.email || 'Editor',
        userRole: 'editor',
        article,
        targetWordCounts: [30, 50, 60, 80],
      });

      if (res.success && res.summaryOptions) {
        setSummaries(res.summaryOptions);
      } else {
        setError(res.error || 'Failed to generate summary.');
      }
    } catch (err: any) {
      setError(err.message || 'Error generating summary.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Summary & Teaser Generator"
      subtitle="Generate 30, 50, 60, and 80-word executive teasers for front page promos and digital syndication."
      maxWidth="xl"
    >
      <div className="space-y-6 font-sans">
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white font-sans">{article.headline}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Original Word Count: {article.bodyContent.split(/\s+/).length} words</p>
          </div>
          <Button
            onClick={handleGenerate}
            isLoading={loading}
            leftIcon={<Sparkles className="w-4 h-4 text-white" />}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium shrink-0"
          >
            {summaries.length > 0 ? 'Regenerate' : 'Generate Summaries'}
          </Button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl">
            {error}
          </div>
        )}

        {summaries.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {summaries.map((s, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                      {s.targetWordCount} Words Target
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Actual: {s.actualWordCount} words</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopy(s.summaryText, idx)}
                    className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                    leftIcon={copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copiedIdx === idx ? 'Copied' : 'Copy Teaser'}
                  </Button>
                </div>
                <p className="text-sm font-sans text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  {s.summaryText}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button variant="ghost" onClick={onClose} className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
