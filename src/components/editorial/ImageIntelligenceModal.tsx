/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Image Intelligence & Non-Generative Optical Enhancement Modal
 * Phase 6 — Technical Diagnostics & Print Image Derivation
 */

import React, { useState } from 'react';
import { Sliders, Sparkles, Check, ShieldCheck, AlertCircle, Eye, Image as ImageIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ImageAnalysisDiagnostics, EnhancedImageDerivative, ImageEnhancementOperation } from '../../types/editorialAi';
import { ImageIntelligenceService } from '../../services/imageIntelligenceService';
import { ImageEnhancementService } from '../../services/imageEnhancementService';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';

interface ImageIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  mediaId?: string;
}

export const ImageIntelligenceModal: React.FC<ImageIntelligenceModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  mediaId = 'media-01',
}) => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const [diagnostics] = useState<ImageAnalysisDiagnostics>(() =>
    ImageIntelligenceService.analyzeImage({ imageUrl, width: 2400, height: 1600 })
  );

  const [selectedOperation, setSelectedOperation] = useState<ImageEnhancementOperation>('sharpen');
  const [enhancing, setEnhancing] = useState(false);
  const [derivative, setDerivative] = useState<EnhancedImageDerivative | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEnhance = async () => {
    if (!currentTenant || !user) return;
    setEnhancing(true);
    setError(null);

    try {
      const result = await ImageEnhancementService.enhanceImage({
        tenantId: currentTenant.tenantId,
        userId: user.uid,
        userName: user.displayName || user.email || 'Editor',
        userRole: 'editor',
        sourceMediaId: mediaId,
        sourceImageUrl: imageUrl,
        operation: selectedOperation,
      });

      setDerivative(result);
    } catch (err: any) {
      setError(err.message || 'Image enhancement failed.');
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Image Intelligence & Non-Generative Optical Enhancer"
      subtitle="Technical photo diagnostics, broadsheet print DPI rating, and non-manipulative optical processing."
      maxWidth="xl"
    >
      <div className="space-y-6 font-sans">
        {/* Technical Diagnostics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Resolution</span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{diagnostics.resolution.width}x{diagnostics.resolution.height}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">{diagnostics.resolution.megapixels} MP</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Print DPI (3-Col)</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{diagnostics.printDpiSuitability.effectiveDpiAt3Col} DPI</span>
            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
              {diagnostics.printDpiSuitability.printQualityRating}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Tonal Balance</span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-200">B: {diagnostics.brightness}% / C: {diagnostics.contrast}%</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">Sharpness: {diagnostics.sharpness}%</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Crop Suitability</span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{diagnostics.cropSuitability.broadsheetLead}%</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">Broadsheet Lead</span>
          </div>
        </div>

        {/* Disclaimer Banner */}
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 p-3 rounded-xl flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{diagnostics.journalisticDisclaimer}</span>
        </div>

        {/* Optical Processing Controls */}
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Non-Generative Optical Processing Options
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { id: 'sharpen', name: 'Smart Unsharp Mask', desc: 'Sharpen high-frequency edges for newsprint' },
              { id: 'brightness', name: 'Shadow Recovery', desc: 'Lift shadow detail for dark press paper' },
              { id: 'contrast', name: 'High-Contrast Press', desc: 'Boost midtone contrast for monochrome/CMYK' },
              { id: 'noiseReduction', name: 'Noise Denoising', desc: 'Reduce ISO digital grain' },
              { id: 'smartCrop', name: 'Headline Rule Crop', desc: 'Calculates rule of thirds focal center' },
              { id: 'upscale', name: 'Print Super-Res', desc: 'Vector-guided optical upscale to 300 DPI' },
            ].map((op) => (
              <div
                key={op.id}
                onClick={() => setSelectedOperation(op.id as ImageEnhancementOperation)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedOperation === op.id
                    ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-500 ring-1 ring-blue-500'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">{op.name}</span>
                  {selectedOperation === op.id && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{op.desc}</p>
              </div>
            ))}
          </div>

          <Button
            onClick={handleEnhance}
            isLoading={enhancing}
            leftIcon={<Sparkles className="w-4 h-4 text-white" />}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            Process Optical Derivative
          </Button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Enhanced Result Preview */}
        {derivative && (
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Check className="w-4 h-4" /> Optical Derivative Created Separately
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                Safety Verified (Non-Generative)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Original Photo (Untouched)</span>
                <img src={imageUrl} alt="Original" className="w-full h-36 object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
              </div>
              <div>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium block mb-1">Enhanced Derivative ({derivative.operation})</span>
                <img src={derivative.outputUrl} alt="Enhanced" className="w-full h-36 object-cover rounded-lg border border-blue-400 dark:border-blue-600" />
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
              Derivative Reference: <code className="text-slate-700 dark:text-slate-300 font-mono">{derivative.derivativeId}</code> • Original source photo remains preserved in asset registry.
            </p>
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
