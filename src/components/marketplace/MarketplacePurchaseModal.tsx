/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MarketplacePurchaseModal Component
 * Phase 12 — Public Marketplace, Publisher Acquisition Portal & Licensed Content Workspace
 */

import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, Lock, ShieldCheck, CreditCard, ArrowRight, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { MarketplaceListing, LicenseType, MarketplacePurchase, NewsLicense } from '../../types/marketplace';
import { marketplacePurchaseFlowService } from '../../services/marketplacePurchaseFlowService';
import { LicenseComparisonPanel } from './LicenseComparisonPanel';
import { formatINR } from '../../utils/formatters';

interface MarketplacePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: MarketplaceListing;
  buyerTenantId: string;
  buyerTenantName?: string;
  buyerUserId: string;
  buyerUserName?: string;
  onSuccess?: (result: { purchase: MarketplacePurchase; license: NewsLicense }) => void;
}

export const MarketplacePurchaseModal: React.FC<MarketplacePurchaseModalProps> = ({
  isOpen,
  onClose,
  listing,
  buyerTenantId,
  buyerTenantName = 'Buyer Organization',
  buyerUserId,
  buyerUserName = 'Authorized Buyer',
  onSuccess
}) => {
  const [step, setStep] = useState<number>(1);
  const [selectedLicense, setSelectedLicense] = useState<LicenseType>(listing.licenseOptions[0] || 'DIGITAL_AND_PRINT');
  const [territory, setTerritory] = useState<string>(listing.district || 'National');
  const [exclusiveDays, setExclusiveDays] = useState<number>(7);
  const [useEntitlement, setUseEntitlement] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'mock' | 'stripe' | 'razorpay'>('mock');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedResult, setCompletedResult] = useState<{ purchase: MarketplacePurchase; license: NewsLicense } | null>(null);

  const checkoutId = React.useMemo(() => `chk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, [listing.listingId]);

  // Preflight validation check
  const validation = marketplacePurchaseFlowService.validatePurchase({
    checkoutId,
    listingId: listing.listingId,
    buyerTenantId,
    buyerTenantName,
    buyerUserId,
    buyerUserName,
    selectedLicense,
    territory,
    durationDays: selectedLicense === 'EXCLUSIVE' ? exclusiveDays : 365,
    useSubscriptionEntitlement: useEntitlement
  });

  const handleExecuteCheckout = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setStep(4); // Payment

    try {
      // Simulate step progress smoothly
      setTimeout(() => setStep(5), 600); // Payment Confirmation
      setTimeout(() => setStep(6), 1200); // License Creation
      setTimeout(() => setStep(7), 1800); // Content Entitlement

      const result = await marketplacePurchaseFlowService.executePurchase({
        checkoutId,
        listingId: listing.listingId,
        buyerTenantId,
        buyerTenantName,
        buyerUserId,
        buyerUserName,
        selectedLicense,
        territory,
        durationDays: selectedLicense === 'EXCLUSIVE' ? exclusiveDays : 365,
        paymentMethod,
        useSubscriptionEntitlement: useEntitlement
      });

      setCompletedResult(result);
      setStep(8); // Purchase Complete
      if (onSuccess) onSuccess(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Purchase processing failed.');
      setStep(3); // Reset to confirmation step on error
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Syndication Acquisition: ${listing.title}`}
      subtitle="Complete publisher entitlement checkout and receive official license certificate."
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Progress Bar (8 Steps) */}
        <div className="grid grid-cols-8 gap-1.5 pt-1">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s === step
                  ? 'bg-blue-600'
                  : s < step
                  ? 'bg-emerald-600'
                  : 'bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Errors */}
        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {validation.duplicateWarning && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{validation.duplicateWarning}</span>
          </div>
        )}

        {/* STEP 1: Select License */}
        {step === 1 && (
          <div className="space-y-5">
            <LicenseComparisonPanel
              availableLicenses={listing.licenseOptions}
              basePrice={listing.price}
              selectedLicense={selectedLicense}
              onSelectLicense={setSelectedLicense}
            />

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setStep(2)}>
                Next: Review Terms <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Review Terms */}
        {step === 2 && (
          <div className="space-y-5">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white font-sans">Review Legal Rights & Territorial Terms</h4>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block font-sans text-[11px] font-medium uppercase tracking-wider">SELECTED LICENSE</span>
                  <span className="text-slate-900 dark:text-white font-bold text-sm font-sans">{selectedLicense}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block font-sans text-[11px] font-medium uppercase tracking-wider">CALCULATED COST</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold text-sm font-sans">{formatINR(listing.price)}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <label className="text-slate-700 dark:text-slate-200 block font-medium font-sans">Territory Allocation:</label>
                <Select
                  value={territory}
                  onChange={(e) => setTerritory(e.target.value)}
                  options={[
                    { value: listing.district || 'Nellore District', label: `District (${listing.district || 'Local'})` },
                    { value: 'Andhra Pradesh', label: 'Statewide (Andhra Pradesh)' },
                    { value: 'National', label: 'National (All States)' },
                  ]}
                />
              </div>

              {selectedLicense === 'EXCLUSIVE' && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-2">
                  <span className="text-blue-700 dark:text-blue-300 font-semibold flex items-center gap-1.5 font-sans">
                    <Lock className="w-4 h-4" /> Exclusive Territorial Window:
                  </span>
                  <Select
                    value={String(exclusiveDays)}
                    onChange={(e) => setExclusiveDays(Number(e.target.value))}
                    options={[
                      { value: '7', label: '7 Days Exclusive Lock' },
                      { value: '14', label: '14 Days Exclusive Lock' },
                      { value: '30', label: '30 Days Exclusive Lock' },
                    ]}
                  />
                </div>
              )}

              <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs font-sans">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Byline credit mandatory: <em>"{listing.reporterByline} / NewsPress Wire"</em></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Editorial layout adaptation permitted for print broadsheet geometry</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Immediate unlocking of full dispatch & print-resolution photographs</span>
                </li>
              </ul>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between gap-3">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button variant="primary" onClick={() => setStep(3)}>
                Next: Confirm Checkout <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Confirm Price & Payment Channel */}
        {step === 3 && (
          <div className="space-y-5">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white font-sans">Confirm Price & Payment Gateway</h4>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between text-xs font-sans">
                <span className="text-slate-500 dark:text-slate-400">Story Title:</span>
                <span className="text-slate-900 dark:text-white font-semibold truncate max-w-xs">{listing.title}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-sans">
                <span className="text-slate-500 dark:text-slate-400">License Type:</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">{selectedLicense}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-sans pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-700 dark:text-slate-200 font-semibold">Total Amount Due:</span>
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400 font-sans">{formatINR(listing.price)}</span>
              </div>
            </div>

            {validation.canUseSubscription && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 block font-sans">Subscription Pack Available!</span>
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-sans">You can redeem 1 monthly pack unit instead of cash payment.</span>
                </div>
                <Button
                  variant={useEntitlement ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setUseEntitlement(!useEntitlement)}
                >
                  {useEntitlement ? 'Redeeming Pack' : 'Use Pack Unit'}
                </Button>
              </div>
            )}

            {!useEntitlement && (
              <div className="space-y-2">
                <label className="text-xs text-slate-600 dark:text-slate-400 font-medium font-sans block">Select Payment Channel:</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mock')}
                    className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === 'mock'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-600/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Instant Credit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('razorpay')}
                    className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === 'razorpay'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-600/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Razorpay UPI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('stripe')}
                    className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === 'stripe'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-600/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Stripe Card</span>
                  </button>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between gap-3">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                variant="primary"
                onClick={handleExecuteCheckout}
                disabled={!validation.valid || isProcessing}
              >
                {isProcessing
                  ? 'Processing...'
                  : useEntitlement
                  ? 'Confirm 1 Unit Redemption'
                  : `Authorize Payment (${formatINR(listing.price)})`}
              </Button>
            </div>
          </div>
        )}

        {/* STEPS 4 - 7: Processing Stages */}
        {step >= 4 && step < 8 && (
          <div className="py-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 animate-spin flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-base font-semibold text-slate-900 dark:text-white font-sans">
              {step === 4 && 'Processing Gateway Payment...'}
              {step === 5 && 'Verifying Payment Capture & Revenue Split...'}
              {step === 6 && 'Generating Official Syndication License Certificate...'}
              {step === 7 && 'Configuring Publisher Workspace Content Entitlement...'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
              Idempotency Key: {marketplacePurchaseFlowService.generateIdempotencyKey(buyerTenantId, listing.listingId, checkoutId)}
            </p>
          </div>
        )}

        {/* STEP 8: Purchase Complete */}
        {step === 8 && completedResult && (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white font-sans">
              Acquisition & Entitlement Complete!
            </h3>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left text-xs font-sans space-y-2 max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Purchase ID:</span>
                <span className="text-slate-900 dark:text-white font-medium">{completedResult.purchase.purchaseId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">License ID:</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold">{completedResult.license.licenseId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">License Type:</span>
                <span className="text-slate-800 dark:text-slate-200">{completedResult.license.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Territory:</span>
                <span className="text-slate-800 dark:text-slate-200">{completedResult.license.territory}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-center gap-3">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  window.location.hash = '#/marketplace/licensed';
                }}
              >
                Open in Licensed Workspace
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
