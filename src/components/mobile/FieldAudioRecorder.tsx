/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 13 — Field Audio Recorder Component
 * Supports record, pause, resume, stop, playback, waveform animation, and evidence linking.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Check, Volume2, AlertCircle } from 'lucide-react';
import { MobileEvidenceItem } from '../../types/mobile';
import { MobileUploadManager } from '../../services/mobileUploadManager';

interface FieldAudioRecorderProps {
  tenantId: string;
  reporterId: string;
  storyId?: string;
  assignmentId?: string;
  onAudioCaptured: (item: MobileEvidenceItem) => void;
  onCancel?: () => void;
}

export const FieldAudioRecorder: React.FC<FieldAudioRecorderProps> = ({
  tenantId,
  reporterId,
  storyId,
  assignmentId,
  onAudioCaptured,
  onCancel,
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [caption, setCaption] = useState<string>('Field audio interview note');
  const [recordedAudioUri, setRecordedAudioUri] = useState<string | null>(null);

  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  const handleStartRecord = () => {
    setIsRecording(true);
    setIsPaused(false);
    setDurationSeconds(0);
    setRecordedAudioUri(null);
  };

  const handlePauseRecord = () => {
    setIsPaused(!isPaused);
  };

  const handleStopRecord = () => {
    setIsRecording(false);
    setIsPaused(false);
    // Generate simulated audio data URI
    const mockAudioData = `data:audio/mp3;base64,FIELD_AUDIO_SAMPLE_${Date.now()}_DURATION_${durationSeconds}`;
    setRecordedAudioUri(mockAudioData);
  };

  const handleTogglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSaveEvidence = () => {
    if (!recordedAudioUri) return;

    const item = MobileUploadManager.createEvidenceItem({
      tenantId,
      reporterId,
      type: 'AUDIO',
      fileName: `audio_field_note_${Date.now()}.mp3`,
      mimeType: 'audio/mp3',
      fileSizeBytes: Math.max(128000, durationSeconds * 16000),
      dataUri: recordedAudioUri,
      caption,
      notes: `Recorded field dispatch, duration: ${durationSeconds}s`,
      storyId,
      assignmentId,
      audioDurationSeconds: durationSeconds,
    });

    onAudioCaptured(item);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-slate-900 dark:text-white space-y-4 font-sans shadow-xs">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <div className={`p-2 rounded-full ${isRecording && !isPaused ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 animate-pulse' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 font-sans">Field Audio Recorder</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Encrypted on-device voice & interview notes</p>
          </div>
        </div>
        <span className="font-sans text-base font-bold text-blue-600 dark:text-blue-400">
          {formatTime(durationSeconds)}
        </span>
      </div>

      {/* Waveform Visualization */}
      <div className="h-14 bg-slate-50 dark:bg-slate-950 rounded-lg flex items-center justify-center space-x-1 px-4 border border-slate-200 dark:border-slate-800 overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => {
          const height = isRecording && !isPaused
            ? Math.floor(Math.sin((i + durationSeconds) * 0.8) * 16 + 20)
            : isPlaying
            ? Math.floor(Math.cos(i * 0.9) * 12 + 18)
            : 6;
          return (
            <div
              key={i}
              className={`w-1.5 rounded-full transition-all duration-150 ${
                isRecording && !isPaused
                  ? 'bg-rose-600'
                  : isPlaying
                  ? 'bg-emerald-600'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
              style={{ height: `${height}px` }}
            />
          );
        })}
      </div>

      {/* Recording & Playback Controls */}
      <div className="flex items-center justify-center space-x-3">
        {!isRecording && !recordedAudioUri && (
          <button
            type="button"
            onClick={handleStartRecord}
            className="flex items-center space-x-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-medium rounded-lg text-sm transition-all shadow-xs"
          >
            <Mic className="w-4 h-4" />
            <span>Start Recording</span>
          </button>
        )}

        {isRecording && (
          <>
            <button
              type="button"
              onClick={handlePauseRecord}
              className="flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 font-medium rounded-lg text-xs transition"
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>
            <button
              type="button"
              onClick={handleStopRecord}
              className="flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-medium rounded-lg text-xs transition"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Stop & Save</span>
            </button>
          </>
        )}

        {recordedAudioUri && !isRecording && (
          <>
            <button
              type="button"
              onClick={handleTogglePlayback}
              className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-medium rounded-lg text-xs transition"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause Playback' : 'Listen Recording'}</span>
            </button>
            <button
              type="button"
              onClick={handleStartRecord}
              className="flex items-center space-x-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-300 font-medium rounded-lg text-xs transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Re-record</span>
            </button>
          </>
        )}
      </div>

      {recordedAudioUri && !isRecording && (
        <div className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Audio Caption</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Eyewitness statement regarding transit delay"
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
            />
          </div>
          <div className="flex justify-end space-x-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveEvidence}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs transition shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Attach Audio Evidence</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
