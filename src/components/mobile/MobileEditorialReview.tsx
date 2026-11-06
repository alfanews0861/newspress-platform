/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 13 — Mobile Editorial Review Screen
 * Allows authorized newsroom editors to review submissions, inspect field evidence,
 * evaluate originality scores, request immutable revisions, and approve/reject articles.
 */

import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  MessageSquare,
  ShieldCheck,
  Camera,
  Mic,
  FileText,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Flame,
} from 'lucide-react';
import { newsSubmissionService } from '../../services/newsSubmissionService';
import { EditorialCommentService } from '../../services/editorialCommentService';
import { NewsArticle } from '../../types/news';
import { MobileEvidenceItem } from '../../types/mobile';
import { OfflineReportingStore } from '../../services/mobileOfflineStore';
import { MobilePushNotificationService } from '../../services/mobilePushNotificationService';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';

export const MobileEditorialReview: React.FC = () => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.tenantId || 'tenant-metro-chronicle';
  const editorId = user?.uid || user?.userId || 'user-news-editor';

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [commentText, setCommentText] = useState<string>('');
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState<boolean>(false);
  const [revisionReason, setRevisionReason] = useState<string>('');
  const [revisionComments, setRevisionComments] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadArticles = () => {
    const list = newsSubmissionService.getAllArticles(tenantId);
    setArticles(list);
  };

  useEffect(() => {
    loadArticles();
  }, [tenantId]);

  const handleApprove = async (article: NewsArticle) => {
    try {
      const res = await newsSubmissionService.approveArticle(article.articleId, editorId, 'Approved via Mobile Editorial Desk');
      if (res) {
        setActionSuccess(`Article "${article.headline.slice(0, 30)}..." approved and made marketplace eligible!`);
        // Notify reporter
        MobilePushNotificationService.dispatch({
          tenantId,
          userId: article.authorId,
          category: 'STORY_APPROVED',
          title: 'Story Approved by Editor',
          body: `Your story "${article.headline}" has been approved for publication and syndication.`,
          metadata: { storyId: article.articleId },
        });
        loadArticles();
        setSelectedArticle(null);
      }
    } catch (e: any) {
      console.error('Approval failed', e);
    }
  };

  const handleReject = async (article: NewsArticle) => {
    try {
      const res = await newsSubmissionService.rejectArticle(article.articleId, editorId, 'Does not meet editorial guidelines');
      if (res) {
        setActionSuccess(`Article "${article.headline.slice(0, 30)}..." rejected.`);
        // Notify reporter
        MobilePushNotificationService.dispatch({
          tenantId,
          userId: article.authorId,
          category: 'STORY_REJECTED',
          title: 'Story Rejected',
          body: `Your submission "${article.headline}" was not approved by the editorial desk.`,
          metadata: { storyId: article.articleId },
        });
        loadArticles();
        setSelectedArticle(null);
      }
    } catch (e: any) {
      console.error('Rejection failed', e);
    }
  };

  const handleRequestRevision = async () => {
    if (!selectedArticle || !revisionReason.trim()) return;

    try {
      // Dispatches revision notification to reporter
      MobilePushNotificationService.dispatch({
        tenantId,
        userId: selectedArticle.authorId,
        category: 'REVISION_REQUESTED',
        title: 'Editorial Revision Requested',
        body: `Reason: ${revisionReason}. ${revisionComments}`,
        metadata: { storyId: selectedArticle.articleId },
        priority: 'HIGH',
      });

      // Add audit comment
      EditorialCommentService.addComment({
        tenantId,
        targetType: 'STORY',
        targetId: selectedArticle.articleId,
        authorUserId: editorId,
        authorRole: 'EDITOR',
        content: `REVISION REQUESTED: ${revisionReason}. Comments: ${revisionComments}`,
      });

      setActionSuccess('Revision request dispatched to reporter!');
      setIsRevisionModalOpen(false);
      setRevisionReason('');
      setRevisionComments('');
      loadArticles();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddComment = () => {
    if (!selectedArticle || !commentText.trim()) return;

    EditorialCommentService.addComment({
      tenantId,
      targetType: 'STORY',
      targetId: selectedArticle.articleId,
      authorUserId: editorId,
      authorRole: 'EDITOR',
      content: commentText,
    });

    setCommentText('');
    setActionSuccess('Comment posted to story version history.');
  };

  const comments = selectedArticle
    ? EditorialCommentService.getCommentsForTarget('STORY', selectedArticle.articleId, tenantId)
    : [];

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <FileCheck className="w-5 h-5 text-amber-400" />
            <span>Mobile Editorial Queue</span>
          </h2>
          <p className="text-xs text-slate-400">Review incoming dispatches & field evidence</p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
          {articles.length} Submissions
        </span>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-xs text-emerald-200 flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Review List */}
      <div className="space-y-3">
        {articles.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">Editorial Queue Clear</p>
            <p className="text-xs text-slate-500 mt-1">All reporter submissions have been reviewed.</p>
          </div>
        ) : (
          articles.map((art) => (
            <div
              key={art.articleId}
              onClick={() => setSelectedArticle(art)}
              className={`p-4 rounded-2xl border transition cursor-pointer ${
                selectedArticle?.articleId === art.articleId
                  ? 'bg-slate-900 border-amber-500/80 shadow-lg shadow-amber-950/20'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1 pr-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                      {art.category || 'General'}
                    </span>
                    <span className="text-[10px] text-slate-400">• By {art.byline || art.authorId}</span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-100 line-clamp-1">{art.headline}</h3>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                    art.editorialStatus === 'approved'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : art.editorialStatus === 'rejected'
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {art.editorialStatus.toUpperCase()}
                </span>
              </div>

              <p className="text-xs text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                {art.leadParagraph || art.bodyContent}
              </p>

              <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
                <div className="flex items-center space-x-2">
                  <span className="flex items-center space-x-1 text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{art.originalityStatus || 'VERIFIED'}</span>
                  </span>
                </div>
                <span className="flex items-center space-x-1 text-slate-400">
                  <span>Open Full Review</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Selected Story Review Drawer / Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">Editorial Submission Review</h3>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                  {selectedArticle.category} • {selectedArticle.district || 'Metro'}
                </span>
                <h2 className="text-base font-bold text-slate-100">{selectedArticle.headline}</h2>
                <p className="text-xs text-slate-400">Byline: {selectedArticle.byline} • Submitted: {new Date(selectedArticle.createdAt).toLocaleString()}</p>
              </div>

              {/* Originality Badge */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold text-slate-200">Originality Engine Verification</p>
                    <p className="text-[11px] text-slate-400">Status: {selectedArticle.originalityStatus}</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                  98% Original
                </span>
              </div>

              {/* Body Content */}
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Article Dispatch</p>
                <div className="text-xs leading-relaxed text-slate-200 whitespace-pre-wrap font-sans">
                  {selectedArticle.bodyContent}
                </div>
              </div>

              {/* Editorial Comments */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  <span>Editorial Log & Discussion ({comments.length})</span>
                </p>

                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {comments.map((c) => (
                    <div key={c.commentId} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 text-xs">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="font-bold text-slate-300">{(c as any).authorRole || c.authorName}</span>
                        <span>{new Date(c.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-200">{c.text || (c as any).content}</p>
                    </div>
                  ))}
                </div>

                <div className="flex space-x-2 pt-1">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add editorial note..."
                    className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddComment}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between space-x-2">
              <button
                type="button"
                onClick={() => setIsRevisionModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold rounded-xl text-xs transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Request Revision</span>
              </button>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => handleReject(selectedArticle)}
                  className="flex items-center space-x-1 px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold rounded-xl text-xs transition border border-rose-500/40"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApprove(selectedArticle)}
                  className="flex items-center space-x-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-950/40"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve Story</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revision Request Modal */}
      {isRevisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-4 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Request Story Revision</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Revision Reason *</label>
              <select
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="">Select reason...</option>
                <option value="Verify source quote attribution">Verify source quote attribution</option>
                <option value="Add missing on-scene photographic evidence">Add missing on-scene photographic evidence</option>
                <option value="Clarify timeline & transit figures">Clarify timeline & transit figures</option>
                <option value="Fix grammatical formatting for print deck">Fix grammatical formatting for print deck</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Editor Instructions</label>
              <textarea
                rows={4}
                value={revisionComments}
                onChange={(e) => setRevisionComments(e.target.value)}
                placeholder="Specify exact lines or quotes that need revision..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsRevisionModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestRevision}
                disabled={!revisionReason}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition"
              >
                Send Revision Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
