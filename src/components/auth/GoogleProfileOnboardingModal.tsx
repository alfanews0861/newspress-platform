import React, { useState } from 'react';
import {
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  ShieldCheck,
  Lock,
  ArrowRight,
  Sparkles,
  X,
} from 'lucide-react';
import { UserPortalService } from '../../services/userPortalService';
import type { UserRoleType, UserPortalProfile } from '../../types/userPortal';

interface GoogleProfileOnboardingModalProps {
  isOpen: boolean;
  email: string;
  initialName?: string;
  onSuccess: (profile: UserPortalProfile) => void;
  onClose: () => void;
}

export const GoogleProfileOnboardingModal: React.FC<GoogleProfileOnboardingModalProps> = ({
  isOpen,
  email,
  initialName = '',
  onSuccess,
  onClose,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [displayName, setDisplayName] = useState(initialName);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [role, setRole] = useState<UserRoleType>('reporter');
  const [organizationName, setOrganizationName] = useState('');

  // Location
  const [state, setState] = useState('Telangana');
  const [district, setDistrict] = useState('Hyderabad');
  const [mandalOrCity, setMandalOrCity] = useState('Hyderabad');
  const [pincode, setPincode] = useState('500001');

  // KYC
  const [pressAccreditationId, setPressAccreditationId] = useState('');
  const [govtIdMasked, setGovtIdMasked] = useState('');
  const [upiId, setUpiId] = useState('');

  // Legal Consent Checkboxes
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedGoogleYouTube, setAcceptedGoogleYouTube] = useState(false);
  const [acceptedPciEthics, setAcceptedPciEthics] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSendOtp = () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number');
      return;
    }
    setErrorMsg(null);
    setOtpSent(true);
  };

  const handleVerifyOtp = () => {
    if (enteredOtp === '123456' || enteredOtp.length === 6) {
      setIsPhoneVerified(true);
      setErrorMsg(null);
    } else {
      setErrorMsg('Invalid OTP. Use demo verification code: 123456');
    }
  };

  const handleSubmitProfile = () => {
    setErrorMsg(null);
    if (!displayName.trim()) {
      setErrorMsg('Please enter your full name');
      return;
    }
    if (!phoneNumber.trim()) {
      setErrorMsg('Mobile number is required');
      return;
    }
    if (!upiId.trim() || !upiId.includes('@')) {
      setErrorMsg('Valid UPI ID is required (e.g. name@upi)');
      return;
    }
    if (!acceptedTerms || !acceptedPrivacy || !acceptedGoogleYouTube || !acceptedPciEthics) {
      setErrorMsg('You must accept all legal terms and statutory policies to continue');
      return;
    }

    setIsSaving(true);
    try {
      const updated = UserPortalService.completeOnboarding({
        displayName,
        phoneNumber,
        isPhoneVerified: true,
        role,
        organizationName,
        state,
        district,
        mandalOrCity,
        pincode,
        pressAccreditationId: role === 'reporter' || role === 'publisher' ? pressAccreditationId : undefined,
        govtIdMasked: role === 'reporter' ? govtIdMasked : undefined,
        upiId,
        hasAcceptedLegalAgreements: true,
        agreementsAcceptedAt: new Date().toISOString(),
        agreementsVersion: 'Alfa-v3.0-2026',
        acceptedPolicies: {
          termsOfService: acceptedTerms,
          privacyPolicyDPDP: acceptedPrivacy,
          googleApiUserPolicy: acceptedGoogleYouTube,
          youtubeTermsOfService: acceptedGoogleYouTube,
          playStoreUserPolicy: true,
          pciEthicsCode: acceptedPciEthics,
        },
      });

      onSuccess(updated);
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error saving verified profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 p-5 sm:p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-200">
            <Sparkles className="w-4 h-4" />
            <span>Google Login Verified • Alfa New Gen Platforms</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mt-1">
            Complete User Profile &amp; KYC
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-lg">
            Complete your profile to activate ePaper publishing, Reporter Desk, credits wallet, and automated YouTube news studio.
          </p>

          {/* Stepper */}
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/20 text-xs font-medium">
            <button
              onClick={() => setStep(1)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full cursor-pointer transition-colors ${
                step === 1 ? 'bg-white text-blue-700 font-bold' : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <span>1. Personal &amp; Role Details</span>
            </button>
            <span className="text-white/40">→</span>
            <button
              onClick={() => setStep(2)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full cursor-pointer transition-colors ${
                step === 2 ? 'bg-white text-blue-700 font-bold' : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <span>2. KYC, Settlement &amp; Compliance</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-7 space-y-6 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              {/* Google Verified Banner */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                    G
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Google OAuth Verified</div>
                    <div className="text-slate-600 dark:text-slate-400">{email}</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-semibold text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                </span>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your official full name"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Mobile Phone & OTP Verification */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  Mobile Number (for verification) *
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+91 98480 12345"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  {!isPhoneVerified ? (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer shrink-0 transition-colors"
                    >
                      {otpSent ? 'Resend OTP' : 'Send OTP'}
                    </button>
                  ) : (
                    <span className="px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0">
                      <CheckCircle2 className="w-4 h-4" /> Verified
                    </span>
                  )}
                </div>

                {otpSent && !isPhoneVerified && (
                  <div className="mt-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value)}
                      placeholder="Enter OTP (123456)"
                      className="w-36 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono tracking-widest text-center"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Verify
                    </button>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Demo Code: 123456</span>
                  </div>
                )}
              </div>

              {/* User Role Selection Cards */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
                  Select Primary Operational Role *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: 'reporter' as UserRoleType,
                      title: 'Field Reporter / Journalist',
                      desc: 'Submit grassroots news stories, press credentialing, and earn automated UPI royalties.',
                      badge: 'Popular',
                    },
                    {
                      id: 'publisher' as UserRoleType,
                      title: 'Publisher / Chief Editor',
                      desc: 'Manage and publish daily broadsheet ePaper editions with automated layout design.',
                      badge: 'Editorial Desk',
                    },
                    {
                      id: 'creator' as UserRoleType,
                      title: 'Digital Video Creator',
                      desc: 'Produce broadcast YouTube news reels and bulletins with studio news anchor voices.',
                      badge: 'Digital Media',
                    },
                    {
                      id: 'reader' as UserRoleType,
                      title: 'Reader / Subscriber',
                      desc: 'Daily digital broadsheet browsing, breaking news alerts, and article clippings.',
                      badge: 'Free Tier',
                    },
                  ].map((r) => (
                    <div
                      key={r.id}
                      onClick={() => setRole(r.id)}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left relative ${
                        role === r.id
                          ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{r.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                          {r.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">{r.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Geographic Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">State</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Telangana">Telangana</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">District</label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">City / Mandal</label>
                  <input
                    type="text"
                    value={mandalOrCity}
                    onChange={(e) => setMandalOrCity(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Pincode</label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Next Step Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md"
                >
                  <span>Next: KYC &amp; Compliance</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              {/* Journalist / Publisher KYC Card */}
              {(role === 'reporter' || role === 'publisher') && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300 uppercase">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Journalist Accreditation &amp; Press Credentials</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Press Accreditation / ID No.
                      </label>
                      <input
                        type="text"
                        value={pressAccreditationId}
                        onChange={(e) => setPressAccreditationId(e.target.value)}
                        placeholder="TS-PIB-2026-XXXX"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Masked Government ID
                      </label>
                      <input
                        type="text"
                        value={govtIdMasked}
                        onChange={(e) => setGovtIdMasked(e.target.value)}
                        placeholder="XXXX-XXXX-1234"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Settlement & UPI Payment Details */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white uppercase">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Royalty &amp; Payout Settlement Details (UPI VPA) *</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Instant automated UPI disbursements for approved news stories and wallet refunds.
                </p>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="name@okaxis or mobile@upi"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-sm text-slate-900 dark:text-white"
                />
              </div>

              {/* Comprehensive Statutory Agreements & Safe Harbor Checkboxes */}
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300 uppercase">
                  <Lock className="w-4 h-4" />
                  <span>Legal Agreements &amp; Statutory Safe Harbor</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Alfa New Gen Platforms operates as a technology intermediary protected under IT Act Section 79. Editorial responsibility remains with registered authors.
                </p>

                <div className="space-y-2.5 pt-1 text-xs text-slate-800 dark:text-slate-200">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      <strong>Alfa New Gen Platforms Terms &amp; Safe Harbor: </strong>
                      I accept IT Act 2000 Section 79 intermediary protection and statutory limitation of liability.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedPrivacy}
                      onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      <strong>DPDP Act 2023 Digital Privacy Policy: </strong>
                      I consent to secure processing of personal data on MeitY-compliant cloud infrastructure in India.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedGoogleYouTube}
                      onChange={(e) => setAcceptedGoogleYouTube(e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      <strong>Google API User Policy &amp; YouTube Community Guidelines: </strong>
                      I acknowledge YouTube automation rules and that the platform bears no liability for channel strikes or third-party content.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedPciEthics}
                      onChange={(e) => setAcceptedPciEthics(e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      <strong>Press Council of India (PCI) Code of Ethics: </strong>
                      I certify that all published content meets minimum 85% originality with verified factual grounding.
                    </span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSubmitProfile}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md disabled:opacity-50"
                >
                  {isSaving ? (
                    <span>Saving Profile...</span>
                  ) : (
                    <>
                      <span>Complete Profile &amp; Activate</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
