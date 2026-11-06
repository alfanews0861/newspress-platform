/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { newsSubmissionService } from '../../services/newsSubmissionService';
import { Sparkles, Send, FileEdit, CheckCircle2 } from 'lucide-react';

export interface QuickStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated?: () => void;
}

const CATEGORIES = [
  'Metro & Transit',
  'City Hall',
  'Commerce & Shipping',
  'Investigative',
  'National',
  'Sports',
  'Culture & Life',
];

export const QuickStoryModal: React.FC<QuickStoryModalProps> = ({
  isOpen,
  onClose,
  onStoryCreated,
}) => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const [headline, setHeadline] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [leadParagraph, setLeadParagraph] = useState('');
  const [bodyContent, setBodyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleReset = () => {
    setHeadline('');
    setCategory(CATEGORIES[0]);
    setLeadParagraph('');
    setBodyContent('');
    setSuccessMessage('');
  };

  const handleSubmit = async (publishImmediately: boolean = true) => {
    if (!headline.trim() || !leadParagraph.trim()) return;

    setIsSubmitting(true);
    try {
      const draft = await newsSubmissionService.createDraft({
        tenantId: currentTenant.tenantId,
        authorId: user?.uid || 'user-sofia-chen',
        byline: user?.displayName || 'Sofia Chen',
        headline: headline.trim(),
        summary: leadParagraph.trim(),
        leadParagraph: leadParagraph.trim(),
        bodyContent: (bodyContent || leadParagraph).trim(),
        category,
        location: 'Metro Desk',
        reporterDeclaration: 'original_field_report',
      });

      if (publishImmediately) {
        await newsSubmissionService.submitNews({
          articleId: draft.articleId,
          reporterId: user?.uid || 'user-sofia-chen',
          declaration: 'original_field_report',
          clientCapturedAt: new Date().toISOString(),
        });

        // Auto approve if editor
        await newsSubmissionService.approveArticle(
          draft.articleId,
          user?.uid || 'user-news-editor',
          'Quick published via Quick Story Composer'
        );
      }

      setSuccessMessage('Story successfully filed and published!');
      setTimeout(() => {
        handleReset();
        setIsSubmitting(false);
        onClose();
        if (onStoryCreated) onStoryCreated();
      }, 1000);
    } catch (err: any) {
      alert(`Could not save story: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Story Composer"
      subtitle="Type your headline, choose a category, and file your report in seconds."
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FileEdit className="w-4 h-4" />}
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || !headline.trim() || !leadParagraph.trim()}
            >
              Save as Draft
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Send className="w-4 h-4" />}
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting || !headline.trim() || !leadParagraph.trim()}
            >
              {isSubmitting ? 'Publishing...' : 'Publish Story'}
            </Button>
          </div>
        </div>
      }
    >
      {successMessage ? (
        <div className="py-8 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
          <h4 className="text-base font-bold text-slate-900 dark:text-white">
            {successMessage}
          </h4>
          <p className="text-xs text-slate-500">Updating newsroom pipeline...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Headline */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Headline <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. City Council Unanimously Approves Clean Metro Transit Expansion"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="font-medium"
              autoFocus
            />
          </div>

          {/* Category Quick Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    category === cat
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Lead Paragraph */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Lead Paragraph (Summary) <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              placeholder="1-2 sentences capturing the key facts (who, what, where, when)..."
              value={leadParagraph}
              onChange={(e) => setLeadParagraph(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 font-sans resize-none"
            />
          </div>

          {/* Full Article Body */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Story Copy / Full Content (Optional)
            </label>
            <textarea
              rows={5}
              placeholder="Write the full report or paste reporter dispatches here..."
              value={bodyContent}
              onChange={(e) => setBodyContent(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 font-sans resize-y"
            />
          </div>

          {/* Byline / Author badge */}
          <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <span>
              Byline: <strong className="text-slate-900 dark:text-white">{user?.displayName || 'Sofia Chen'}</strong>
            </span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Direct Publishing Enabled
            </span>
          </div>
        </div>
      )}
    </Modal>
  );
};
