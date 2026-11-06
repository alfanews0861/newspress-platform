/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 13 — Field Evidence Capture Modal
 * Unifies camera photos, audio field notes, document attachments, and upload progress.
 */

import React, { useState } from 'react';
import { Camera, Mic, FileText, Upload, Check, AlertCircle, Play, Pause, RotateCcw, Trash2, X, MapPin } from 'lucide-react';
import { MobileEvidenceItem, EvidenceMediaType } from '../../types/mobile';
import { MobileCameraCapture } from './MobileCameraCapture';
import { FieldAudioRecorder } from './FieldAudioRecorder';
import { MobileUploadManager } from '../../services/mobileUploadManager';
import { OfflineReportingStore } from '../../services/mobileOfflineStore';

interface FieldEvidenceCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  reporterId: string;
  storyId?: string;
  assignmentId?: string;
  onEvidenceAdded: (item: MobileEvidenceItem) => void;
}

export const FieldEvidenceCaptureModal: React.FC<FieldEvidenceCaptureModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  reporterId,
  storyId,
  assignmentId,
  onEvidenceAdded,
}) => {
  const [activeTab, setActiveTab] = useState<'PHOTO' | 'AUDIO' | 'DOCUMENT' | 'NOTE'>('PHOTO');
  const [noteContent, setNoteContent] = useState<string>('');
  const [noteTitle, setNoteTitle] = useState<string>('');

  if (!isOpen) return null;

  const handleEvidenceCaptured = async (item: MobileEvidenceItem) => {
    onEvidenceAdded(item);
    // Trigger upload if online
    if (OfflineReportingStore.getNetworkState() !== 'OFFLINE') {
      try {
        await MobileUploadManager.startUpload(item.localId, tenantId);
      } catch (e) {
        console.warn('Upload deferred or failed', e);
      }
    }
    onClose();
  };

  const handleAddFieldNote = () => {
    if (!noteTitle.trim() || !noteContent.trim()) return;

    const item = MobileUploadManager.createEvidenceItem({
      tenantId,
      reporterId,
      type: 'FIELD_NOTE',
      fileName: `field_note_${Date.now()}.txt`,
      mimeType: 'text/plain',
      fileSizeBytes: noteContent.length,
      caption: noteTitle,
      notes: noteContent,
      storyId,
      assignmentId,
    });

    handleEvidenceCaptured(item);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/50 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-sans">Capture Field Evidence</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Cryptographically signed on-the-scene proof</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-4 p-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 gap-1 font-sans">
          <button
            onClick={() => setActiveTab('PHOTO')}
            className={`flex flex-col items-center py-2 px-1 rounded-lg text-xs font-medium transition ${
              activeTab === 'PHOTO'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <Camera className="w-4 h-4 mb-1" />
            <span>Photo</span>
          </button>
          <button
            onClick={() => setActiveTab('AUDIO')}
            className={`flex flex-col items-center py-2 px-1 rounded-lg text-xs font-medium transition ${
              activeTab === 'AUDIO'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <Mic className="w-4 h-4 mb-1" />
            <span>Audio Note</span>
          </button>
          <button
            onClick={() => setActiveTab('DOCUMENT')}
            className={`flex flex-col items-center py-2 px-1 rounded-lg text-xs font-medium transition ${
              activeTab === 'DOCUMENT'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 mb-1" />
            <span>Document</span>
          </button>
          <button
            onClick={() => setActiveTab('NOTE')}
            className={`flex flex-col items-center py-2 px-1 rounded-lg text-xs font-medium transition ${
              activeTab === 'NOTE'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 mb-1" />
            <span>Field Note</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 overflow-y-auto flex-1">
          {activeTab === 'PHOTO' && (
            <MobileCameraCapture
              tenantId={tenantId}
              reporterId={reporterId}
              storyId={storyId}
              assignmentId={assignmentId}
              onEvidenceCaptured={handleEvidenceCaptured}
              onCancel={onClose}
            />
          )}

          {activeTab === 'AUDIO' && (
            <FieldAudioRecorder
              tenantId={tenantId}
              reporterId={reporterId}
              storyId={storyId}
              assignmentId={assignmentId}
              onAudioCaptured={handleEvidenceCaptured}
              onCancel={onClose}
            />
          )}

          {activeTab === 'DOCUMENT' && (
            <div className="space-y-4 font-sans">
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer bg-slate-50 dark:bg-slate-950/40">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Tap to Select Document / PDF</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Court records, transcripts, council meeting agenda</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quick Sample Attachments</p>
                <button
                  type="button"
                  onClick={() => {
                    const item = MobileUploadManager.createEvidenceItem({
                      tenantId,
                      reporterId,
                      type: 'DOCUMENT',
                      fileName: 'Subway_Signal_Inspection_Report.pdf',
                      mimeType: 'application/pdf',
                      fileSizeBytes: 420000,
                      caption: 'Official MTA Signaling Diagnostic Report',
                      storyId,
                      assignmentId,
                    });
                    handleEvidenceCaptured(item);
                  }}
                  className="w-full text-left p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 flex items-center justify-between transition"
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200">Subway_Signal_Inspection_Report.pdf</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">PDF Document • 420 KB</p>
                    </div>
                  </div>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Attach</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'NOTE' && (
            <div className="space-y-3 font-sans">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Note Title / Source Tag</label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="e.g. Eyewitness On-Site Interview with Conductor"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Field Observation Notes</label>
                <textarea
                  rows={5}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Write raw observations, quotes, badge numbers, or timeline markers..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddFieldNote}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs transition shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Attach Field Note</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
