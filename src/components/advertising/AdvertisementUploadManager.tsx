/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Advertisement Upload & Page Planning Component
 * Allows uploading commercial advertisement images (JPEG/PNG/WebP),
 * selecting authentic print newspaper ad sizes (2 col x 10 cm, full page, half page, quarter page, etc.),
 * and choosing exact destination pages (Front Page, Back Page, Specific Page #).
 * Automatically updates and adapts the page designer canvas.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles,
  ArrowRight,
  Eye,
  Trash2,
  Layout,
  Tag,
  Sliders,
  ExternalLink
} from 'lucide-react';
import { navigateTo } from '../../utils/navigation';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { EditionAdvertisementService } from '../../services/editionAdvertisementService';
import { AdvertisementLayoutAdapter, AdSizePreset, getDynamicAdSizeOptions, type AdSizeOption } from '../../services/advertisementLayoutAdapter';
import { GridCalculationService } from '../../services/gridCalculationService';
import { brandManagementService } from '../../services/brandManagementService';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { EditionAdvertisementReservation } from '../../types/editionWorkflow';
import { NewspaperBrand } from '../../types/edition';

export type { AdSizeOption };

export const AdvertisementUploadManager: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  // Active Brand and Dynamic Grid State derived from user's Paper Settings
  const [activeBrand, setActiveBrand] = useState<NewspaperBrand>(() => {
    return brandManagementService.getActiveBrand();
  });

  useEffect(() => {
    const handleBrandsUpdate = () => {
      setActiveBrand(brandManagementService.getActiveBrand());
    };
    window.addEventListener('newspress:brands-updated', handleBrandsUpdate);
    return () => window.removeEventListener('newspress:brands-updated', handleBrandsUpdate);
  }, []);

  const activeTemplate = useMemo(() => {
    return GridCalculationService.getTemplateForBrand(activeBrand);
  }, [activeBrand]);

  const activeGrid = useMemo(() => {
    return GridCalculationService.calculatePageGrid(activeTemplate);
  }, [activeTemplate]);

  const dynamicAdSizes = useMemo(() => {
    return getDynamicAdSizeOptions(activeGrid, activeBrand.paperSize || 'broadsheet');
  }, [activeGrid, activeBrand]);

  const totalPages = activeBrand.pageCount || 4;

  // Form State
  const [sponsorName, setSponsorName] = useState('');
  const [selectedSize, setSelectedSize] = useState<AdSizePreset>('2col_10cm');
  const [targetPageType, setTargetPageType] = useState<'front_page' | 'back_page' | 'specific'>('front_page');
  const [specificPageNum, setSpecificPageNum] = useState<number>(2);
  const [rateText, setRateText] = useState('₹25,000');
  const [notes, setNotes] = useState('');

  // Image Upload State
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Existing Reservations
  const [adsList, setAdsList] = useState<EditionAdvertisementReservation[]>(() => {
    return EditionAdvertisementService.getAdvertisementsForTenant(currentTenant.tenantId);
  });

  // Handle Image File Input (JPEG / PNG / WebP only, reject heavy TIFF/BMP)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Supported formats check: JPEG, PNG, WebP
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Please upload JPEG, PNG, or WebP images only. (TIFF and BMP files are not supported).');
      return;
    }

    // Size limit: Max 10 MB
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must not exceed 10 MB.');
      return;
    }

    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateAdvertisement = () => {
    if (!sponsorName.trim()) {
      setUploadError('Please enter the sponsor or client name.');
      return;
    }

    const resolvedPageNumber =
      targetPageType === 'front_page' ? 1 : targetPageType === 'back_page' ? totalPages : specificPageNum;

    // 1. Reserve advertisement in service
    const res = EditionAdvertisementService.reserveAdvertisement({
      tenantId: currentTenant.tenantId,
      editionId: 'ed-andhra-prabha-today',
      advertisementId: `ad-${Date.now().toString(36)}`,
      pageNumber: resolvedPageNumber,
      zoneId: `zone-${selectedSize}`,
      sponsorName: sponsorName.trim(),
      imageUrl: imagePreview || `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="320" viewBox="0 0 800 320"><rect width="800" height="320" fill="#fef3c7"/><rect x="12" y="12" width="776" height="296" fill="none" stroke="#d97706" stroke-width="4"/><text x="400" y="145" text-anchor="middle" fill="#92400e" font-family="serif" font-size="32" font-weight="700">${sponsorName.trim().slice(0, 32)}</text><text x="400" y="192" text-anchor="middle" fill="#b45309" font-family="sans-serif" font-size="16" font-weight="600">SPONSORED PRINT ADVERTISEMENT</text></svg>`)}`,
      sizePreset: selectedSize,
      reservedBy: user?.displayName || 'Ad Desk',
    });

    if (res.success && res.reservation) {
      // 2. Compute dynamic geometry against the user's active paper grid
      const adResult = AdvertisementLayoutAdapter.calculateAdPlacement(
        activeGrid,
        {
          advertisementId: res.reservation.reservationId,
          sponsorName: res.reservation.sponsorName,
          imageUrl: res.reservation.imageUrl,
          targetPage: resolvedPageNumber === 1 ? 'front_page' : resolvedPageNumber === totalPages ? 'back_page' : resolvedPageNumber,
          sizePreset: selectedSize,
        },
        totalPages
      );

      // 3. Dispatch custom window event with calculated adResult so PageDesignerPage immediately adapts layout!
      window.dispatchEvent(
        new CustomEvent('newspress:advertisement-placed', {
          detail: {
            reservation: res.reservation,
            targetPage: resolvedPageNumber,
            sizePreset: selectedSize,
            adResult,
          },
        })
      );

      // Refresh local list
      setAdsList(EditionAdvertisementService.getAdvertisementsForTenant(currentTenant.tenantId));
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 5000);

      // Reset form
      setSponsorName('');
      setImagePreview(null);
      setImageFileName('');
      setNotes('');
    } else {
      setUploadError(res.error || 'Failed to save advertisement reservation.');
    }
  };

  const handleDeleteAd = (resId: string) => {
    EditionAdvertisementService.cancelAdvertisement(resId);
    setAdsList(EditionAdvertisementService.getAdvertisementsForTenant(currentTenant.tenantId));
    window.dispatchEvent(new CustomEvent('newspress:advertisement-removed', { detail: { reservationId: resId } }));
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-red-600 to-amber-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>Commercial Advertisements</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Newspaper Advertisement Upload & Management
          </h2>
          <p className="text-sm text-amber-100 max-w-2xl leading-relaxed">
            Upload commercial advertisement creatives, select target print page and standard dimensions. 
            The page planning engine automatically positions the ad and reflows news content around it.
          </p>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-white/5 transform skew-x-12 pointer-events-none" />
      </div>

      {/* Success Notification */}
      {isSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-3 shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-sm font-semibold">
            Advertisement successfully scheduled! Placed on target page canvas and news articles automatically reflowed.
          </div>
        </div>
      )}

      {/* Main Grid: Upload Form + Real-time Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Specifications & Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-6 space-y-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b pb-3">
              <Tag className="w-4 h-4 text-red-600" />
              <span>1. Advertisement Details & Client Info</span>
            </h3>

            <div className="space-y-4">
              <Input
                label="Sponsor / Client Name"
                placeholder="e.g., Lalitha Jewellery / Krishna Real Estate / Apex Tech University"
                value={sponsorName}
                onChange={(e) => setSponsorName(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Ad Tariff / Price"
                  placeholder="₹25,000"
                  value={rateText}
                  onChange={(e) => setRateText(e.target.value)}
                />
                <Input
                  label="Client Contact / Reference"
                  placeholder="Phone number or billing order #"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Step 2: Target Page Selection */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-100">
                2. Target Newspaper Page
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setTargetPageType('front_page')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    targetPageType === 'front_page'
                      ? 'border-red-600 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 font-bold ring-2 ring-red-500/20'
                      : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700'
                  }`}
                >
                  <div className="text-sm font-semibold">Front Page</div>
                  <div className="text-[11px] opacity-75">Page 1 (Cover)</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetPageType('back_page')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    targetPageType === 'back_page'
                      ? 'border-red-600 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 font-bold ring-2 ring-red-500/20'
                      : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700'
                  }`}
                >
                  <div className="text-sm font-semibold">Back Page</div>
                  <div className="text-[11px] opacity-75">Page {totalPages} (Last Page)</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetPageType('specific')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    targetPageType === 'specific'
                      ? 'border-red-600 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 font-bold ring-2 ring-red-500/20'
                      : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700'
                  }`}
                >
                  <div className="text-sm font-semibold">Specific Page #</div>
                  <div className="text-[11px] opacity-75">Inside Editorial Page</div>
                </button>
              </div>

              {targetPageType === 'specific' && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 animate-in fade-in">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Select Page Number:
                  </span>
                  {Array.from({ length: Math.max(1, totalPages - 1) }, (_, i) => i + 2).map((pNum) => (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setSpecificPageNum(pNum)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        specificPageNum === pNum
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-700 text-slate-800 border border-slate-300'
                      }`}
                    >
                      Page {pNum}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 3: Size Preset Selector */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-100">
                3. Select Standard Ad Size
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                {dynamicAdSizes.map((opt) => {
                  const isSelected = selectedSize === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setSelectedSize(opt.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{opt.title}</span>
                          <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
                            {opt.cols}
                          </span>
                        </div>
                        <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300 mt-1">
                          {opt.subtitle}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-2 flex justify-between items-center border-t pt-1.5 border-slate-200 dark:border-slate-800">
                        <span className="font-medium text-slate-600 dark:text-slate-400">{opt.dimensionsText}</span>
                        <span className="italic opacity-80">{opt.popularPlacement}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Form: Image Upload & Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 space-y-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b pb-3">
              <ImageIcon className="w-4 h-4 text-blue-600" />
              <span>4. Upload Ad Artwork (JPEG / PNG / WebP)</span>
            </h3>

            {/* Drag & Drop / File Input Box */}
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-blue-500 transition-colors bg-slate-50/50 dark:bg-slate-800/40">
              <input
                type="file"
                id="ad-image-file"
                accept=".jpeg,.jpg,.png,.webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="ad-image-file"
                className="cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Choose an image file or drag here
                </div>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  Supported formats: <strong>JPEG, PNG, WebP</strong> (Max size: 10 MB). 
                  <span className="text-red-500 block">TIFF and BMP files are not supported.</span>
                </p>
              </label>
            </div>

            {/* Error Message */}
            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-300 text-red-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Live Image Preview Card */}
            {imagePreview ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Uploaded Creative Preview:</span>
                  <span className="text-slate-500 truncate max-w-[180px]">{imageFileName}</span>
                </div>
                <div className="rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 relative group aspect-video flex items-center justify-center">
                  <img
                    src={imagePreview}
                    alt="Uploaded Advertisement"
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setImageFileName('');
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    title="Remove Image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                ℹ️ <strong>Note:</strong> If no image artwork is uploaded, a professional typographic ad block with sponsor name and tariff will be generated automatically.
              </div>
            )}

            {/* Submit & Schedule Action Button */}
            <Button
              variant="primary"
              size="lg"
              className="w-full justify-center bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-md cursor-pointer"
              leftIcon={<CheckCircle2 className="w-5 h-5" />}
              onClick={handleCreateAdvertisement}
            >
              Schedule Ad on Page Canvas
            </Button>
          </Card>
        </div>
      </div>

      {/* Active Placed Advertisements Table */}
      <Card className="p-6 space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Scheduled Commercial Advertisements
            </h3>
            <p className="text-xs text-slate-500">
              The following advertisements are locked into specific print page coordinates.
            </p>
          </div>
          <Badge variant="primary" size="sm">
            {adsList.length} Ads Active
          </Badge>
        </div>

        {adsList.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            No commercial advertisements scheduled yet. Use the form above to add an advertisement.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {adsList.map((ad) => (
              <div key={ad.reservationId} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {ad.imageUrl ? (
                    <img
                      src={ad.imageUrl}
                      alt={ad.sponsorName}
                      className="w-16 h-12 object-cover rounded-lg border border-slate-200"
                    />
                  ) : (
                    <div className="w-16 h-12 rounded-lg bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center text-center p-1">
                      Ad Slot
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {ad.sponsorName}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="font-semibold text-red-600">Page {ad.pageNumber}</span>
                      <span>•</span>
                      <span>Size: {ad.sizePreset || 'Standard'}</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-medium">Locked on Page</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => handleDeleteAd(ad.reservationId)}
                  >
                    Remove Ad
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
