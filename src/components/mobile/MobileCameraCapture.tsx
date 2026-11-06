/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 13 — Mobile Camera Capture & Evidence Component
 * Simulates mobile camera shutter, gallery selection, user-disclosed GPS tagging,
 * and media metadata preservation with zero generative AI manipulation.
 */

import React, { useState } from 'react';
import { Camera, Image as ImageIcon, MapPin, Check, X, ShieldAlert, Sparkles } from 'lucide-react';
import { MobileEvidenceItem, EvidenceLocation } from '../../types/mobile';
import { MobileUploadManager } from '../../services/mobileUploadManager';

interface MobileCameraCaptureProps {
  tenantId: string;
  reporterId: string;
  storyId?: string;
  assignmentId?: string;
  onEvidenceCaptured: (item: MobileEvidenceItem) => void;
  onCancel?: () => void;
}

const SAMPLE_PHOTO_PRESETS = [
  {
    title: 'Metro Transit Platform Incident',
    uri: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=80',
    location: { latitude: 40.7527, longitude: -73.9772, label: 'Grand Central Station Platform 4B', timestamp: new Date().toISOString(), disclosedByUser: true },
  },
  {
    title: 'City Council Public Hearing',
    uri: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80',
    location: { latitude: 40.7128, longitude: -74.0060, label: 'City Hall Chamber Room 302', timestamp: new Date().toISOString(), disclosedByUser: true },
  },
  {
    title: 'High Street Bridge Repair Site',
    uri: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80',
    location: { latitude: 40.7061, longitude: -73.9969, label: 'Brooklyn Bridge Northern Pylon', timestamp: new Date().toISOString(), disclosedByUser: true },
  },
];

export const MobileCameraCapture: React.FC<MobileCameraCaptureProps> = ({
  tenantId,
  reporterId,
  storyId,
  assignmentId,
  onEvidenceCaptured,
  onCancel,
}) => {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [caption, setCaption] = useState<string>('Uncropped field photograph');
  const [includeGps, setIncludeGps] = useState<boolean>(true);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);

  const handleSnapPhoto = () => {
    const preset = SAMPLE_PHOTO_PRESETS[selectedPresetIndex];
    setCapturedPhotoUri(preset.uri);
    setCaption(preset.title);
  };

  const handleAttach = () => {
    if (!capturedPhotoUri) return;

    const preset = SAMPLE_PHOTO_PRESETS[selectedPresetIndex];
    const loc: EvidenceLocation | undefined = includeGps
      ? {
          latitude: preset.location.latitude,
          longitude: preset.location.longitude,
          label: preset.location.label,
          accuracyMeters: 4.5,
          timestamp: new Date().toISOString(),
          disclosedByUser: true,
        }
      : undefined;

    const item = MobileUploadManager.createEvidenceItem({
      tenantId,
      reporterId,
      type: 'PHOTO',
      fileName: `field_photo_${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
      fileSizeBytes: 2450000,
      dataUri: capturedPhotoUri,
      caption,
      notes: `Captured via Mobile Lens. GPS Tagged: ${includeGps ? 'YES' : 'NO'}`,
      storyId,
      assignmentId,
      location: loc,
    });

    onEvidenceCaptured(item);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-full bg-amber-500/20 text-amber-400">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-slate-100">Field Camera & Evidence Capture</h4>
            <p className="text-xs text-slate-400">Authentic unmanipulated photo verification</p>
          </div>
        </div>
      </div>

      {!capturedPhotoUri ? (
        <div className="space-y-3">
          <label className="block text-xs font-medium text-slate-400">Select Field Scene / Lens Target</label>
          <div className="grid grid-cols-3 gap-2">
            {SAMPLE_PHOTO_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedPresetIndex(idx)}
                className={`relative rounded-lg overflow-hidden border-2 transition-all p-1 text-left ${
                  selectedPresetIndex === idx
                    ? 'border-amber-500 bg-slate-800/80'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                }`}
              >
                <img
                  src={preset.uri}
                  alt={preset.title}
                  className="w-full h-16 object-cover rounded"
                />
                <p className="text-[10px] text-slate-300 font-medium truncate mt-1">{preset.title}</p>
              </button>
            ))}
          </div>

          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={handleSnapPhoto}
              className="flex items-center space-x-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold rounded-lg text-sm transition shadow-lg shadow-amber-950/40"
            >
              <Camera className="w-4 h-4" />
              <span>Capture Photo Evidence</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Photo Preview */}
          <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 max-h-56">
            <img
              src={capturedPhotoUri}
              alt="Preview"
              className="w-full h-44 object-cover"
            />
            <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded text-[10px] text-slate-300 font-mono border border-slate-800">
              Raw JPEG • 2.45 MB
            </div>
          </div>

          {/* Caption Input */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Caption / Field Description</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Describe what this photograph documents..."
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* GPS Location Opt-in */}
          <div className="flex items-start space-x-2 p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
            <input
              type="checkbox"
              id="gps-opt"
              checked={includeGps}
              onChange={(e) => setIncludeGps(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
            />
            <label htmlFor="gps-opt" className="text-xs text-slate-300 cursor-pointer">
              <span className="font-semibold text-slate-100 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>Attach GPS Verification Coordinates</span>
              </span>
              <span className="block text-[11px] text-slate-400 mt-0.5">
                {SAMPLE_PHOTO_PRESETS[selectedPresetIndex].location.label} (40.75°N, -73.97°W)
              </span>
            </label>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => setCapturedPhotoUri(null)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
            >
              Retake
            </button>
            <div className="flex space-x-2">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleAttach}
                className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold rounded-lg text-xs transition"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Evidence to Story</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
