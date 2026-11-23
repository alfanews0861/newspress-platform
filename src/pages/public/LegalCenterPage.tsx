/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Statutory Legal Center & Policy Hub
 * Alfa New Gen Platforms - Comprehensive Statutory Compliance, Intermediary Safe Harbor,
 * Google Policies, YouTube Guidelines & Play Store Regulations
 */

import React, { useState, useEffect } from 'react';
import { UnifiedPlatformHeader } from '../../components/navigation/UnifiedPlatformHeader';
import {
  ShieldCheck,
  Scale,
  FileText,
  AlertCircle,
  Cookie,
  Coins,
  ArrowLeft,
  Printer,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  Sun,
  Moon,
  Youtube,
  Play,
  Lock,
  DollarSign,
  UserX,
  ExternalLink,
  Info,
  Building2,
} from 'lucide-react';

export type LegalTabKey =
  | 'privacy'
  | 'terms'
  | 'google-youtube'
  | 'play-store'
  | 'liability-refund'
  | 'editorial'
  | 'grievance'
  | 'marketplace'
  | 'cookies';

interface LegalCenterPageProps {
  initialTab?: LegalTabKey;
  onNavigate?: (path: string) => void;
}

export const LegalCenterPage: React.FC<LegalCenterPageProps> = ({
  initialTab = 'terms',
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<LegalTabKey>(initialTab);
  const [lang, setLang] = useState<'en' | 'te' | 'hi'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('newspress_lang');
      if (saved === 'te' || saved === 'hi') return saved;
    }
    return 'en';
  });

  useEffect(() => {
    const handleLang = (e: any) => {
      if (e.detail) setLang(e.detail);
    };
    window.addEventListener('languagechange', handleLang);
    return () => window.removeEventListener('languagechange', handleLang);
  }, []);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('newspress_theme');
      return saved === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('newspress_theme', theme);
  }, [theme]);

  const navigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.dispatchEvent(new CustomEvent('navigate', { detail: path }));
    }
  };

  const tabs = [
    {
      id: 'terms' as LegalTabKey,
      label: 'Terms of Service',
      sublabel: 'IT Act Sec 79 & Safe Harbor',
      icon: <Scale className="w-4 h-4 text-blue-600" />,
    },
    {
      id: 'liability-refund' as LegalTabKey,
      label: 'Liability & Refund Protection',
      sublabel: 'Zero Financial Loss Indemnity',
      icon: <DollarSign className="w-4 h-4 text-emerald-600" />,
    },
    {
      id: 'privacy' as LegalTabKey,
      label: 'Digital Privacy Policy',
      sublabel: 'DPDP Act 2023 & IT Act 2000',
      icon: <ShieldCheck className="w-4 h-4 text-indigo-600" />,
    },
    {
      id: 'google-youtube' as LegalTabKey,
      label: 'Google & YouTube Policies',
      sublabel: 'OAuth 2.0 & Community Terms',
      icon: <Youtube className="w-4 h-4 text-red-600" />,
    },
    {
      id: 'play-store' as LegalTabKey,
      label: 'Google Play Store Policy',
      sublabel: 'User Data & Account Deletion',
      icon: <Play className="w-4 h-4 text-cyan-600" />,
    },
    {
      id: 'editorial' as LegalTabKey,
      label: 'Editorial Code & PCI Ethics',
      sublabel: 'Press Council of India Norms',
      icon: <FileText className="w-4 h-4 text-amber-600" />,
    },
    {
      id: 'grievance' as LegalTabKey,
      label: 'Grievance Redressal Mechanism',
      sublabel: 'Rule 11, IT Rules 2021',
      icon: <AlertCircle className="w-4 h-4 text-rose-600" />,
    },
    {
      id: 'marketplace' as LegalTabKey,
      label: 'Reporter Agreement & Wire Terms',
      sublabel: 'Section 194J & Instant UPI',
      icon: <Coins className="w-4 h-4 text-emerald-600" />,
    },
    {
      id: 'cookies' as LegalTabKey,
      label: 'Cookie & Security Policy',
      sublabel: 'Multi-Tenant Security Tokens',
      icon: <Cookie className="w-4 h-4 text-slate-600" />,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#202124] text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200">
      <UnifiedPlatformHeader currentPath="/legal" onNavigate={navigate} />

      {/* Hero Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e1f20] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                <Building2 className="w-4 h-4" />
                <span>Alfa New Gen Platforms • Statutory Legal & Governance Center</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Statutory Master Agreements &amp; Safe Harbor Governance
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
                Operated and governed by <strong>Alfa New Gen Platforms</strong>. Certified fully compliant with the
                Information Technology Act 2000 (Section 79 Intermediary Safe Harbor), DPDP Act 2023, Google API User
                Data Policies, YouTube Developer Guidelines, and Google Play Store Developer Policies.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-slate-900 dark:text-white">Alfa Protected</div>
                  <div className="text-slate-600 dark:text-slate-400">Zero Liability & Safe Harbor</div>
                </div>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div>Governing Entity: <strong className="text-slate-900 dark:text-white">Alfa New Gen Platforms</strong></div>
                <div>Status: <strong className="text-emerald-600 dark:text-emerald-400">Active v3.0-IND (2026)</strong></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column: Navigation Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 mb-2 sm:mb-3">
                Statutory Policies
              </h3>
              <nav className="flex flex-row overflow-x-auto lg:flex-col gap-1.5 lg:space-y-1.5 pb-1 lg:pb-0 scrollbar-none" aria-label="Policies">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`shrink-0 lg:w-full flex items-center lg:items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl text-left transition-all cursor-pointer whitespace-nowrap lg:whitespace-normal ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 font-bold border-b-2 lg:border-b-0 lg:border-l-4 border-blue-600'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:white'
                      }`}
                    >
                      <div className={`shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                        {tab.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs sm:text-sm font-semibold truncate">{tab.label}</div>
                        <div className="hidden lg:block text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate">{tab.sublabel}</div>
                      </div>
                      <ChevronRight
                        className={`hidden lg:block w-4 h-4 shrink-0 mt-0.5 transition-transform ${
                          isActive ? 'text-blue-600 dark:text-blue-400 translate-x-0.5' : 'text-transparent'
                        }`}
                      />
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Resident Grievance Officer Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400 uppercase">
                <AlertCircle className="w-4 h-4" />
                <span>Resident Grievance Officer</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Appointed pursuant to Rule 11(2)(a) of Information Technology Rules 2021 for <strong>Alfa New Gen Platforms</strong>:
              </p>
              <div className="space-y-2 text-xs border-t border-slate-200 dark:border-slate-800 pt-3">
                <div className="font-bold text-slate-900 dark:text-white">Sri K. Ramanjaneyulu</div>
                <div className="text-slate-600 dark:text-slate-400">Chief Compliance & Grievance Officer</div>
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
                  <Mail className="w-3.5 h-3.5" />
                  <span>grievance@alfanewgen.com</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Phone className="w-3.5 h-3.5" />
                  <span>+91 40 2388 9911</span>
                </div>
                <div className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>Alfa New Gen Platforms, 4th Floor, Press Towers, HITEC City, Hyderabad, TG - 500081</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Column: Policy Content Details */}
          <main className="lg:col-span-3">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-sm">
              {activeTab === 'terms' && <TermsOfServiceContent lang={lang} />}
              {activeTab === 'liability-refund' && <LiabilityAndRefundContent lang={lang} />}
              {activeTab === 'privacy' && <PrivacyPolicyContent lang={lang} />}
              {activeTab === 'google-youtube' && <GoogleYouTubePolicyContent lang={lang} />}
              {activeTab === 'play-store' && <PlayStorePolicyContent lang={lang} />}
              {activeTab === 'editorial' && <EditorialPolicyContent lang={lang} />}
              {activeTab === 'grievance' && <GrievancePolicyContent lang={lang} />}
              {activeTab === 'marketplace' && <MarketplaceTermsContent lang={lang} />}
              {activeTab === 'cookies' && <CookiePolicyContent lang={lang} />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   1. TERMS OF SERVICE & SAFE HARBOR (SECTION 79 IT ACT)
   ========================================================================= */
const TermsOfServiceContent: React.FC<{ lang: string }> = ({ lang }) => (
  <article className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
    <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
      <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
        Master Service Usage Agreement • Alfa New Gen Platforms
      </div>
      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
        Terms of Service & Intermediary Safe Harbor Agreement
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Governs All Publishers, Subscribers, Freelance Reporters, and Newsroom Software Users
      </p>
    </div>

    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200">
      <strong>Legal Safeguard Notice: </strong> Alfa New Gen Platforms operates strictly as a technology service provider and intermediary. All editorial responsibility for published news, articles, photos, videos, or advertisements remains exclusively with the respective reporters and publishers. In accordance with Section 79 of the Information Technology Act 2000, no civil, criminal, or financial liability lies against Alfa New Gen Platforms.
    </div>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">1. Company Identity & Nature of Service</h3>
      <p>
        These Terms of Service constitute a legally binding agreement between you (&quot;User&quot;, &quot;Subscriber&quot;, &quot;Reporter&quot;, or &quot;Publishing Tenant&quot;) and <strong>Alfa New Gen Platforms</strong> (&quot;Company&quot;, &quot;We&quot;, &quot;Us&quot;, &quot;Platform&quot;). Alfa New Gen Platforms develops and operates cloud-based newsroom management software, automated ePaper layout engines, Indic typography renderers, YouTube broadcast automation tools, and wire marketplace services.
      </p>
    </section>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">2. Intermediary Status & Section 79 Safe Harbor Immunity</h3>
      <p>
        In accordance with <strong>Section 79 of the Information Technology Act, 2000</strong> and the <strong>Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</strong>:
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Alfa New Gen Platforms functions strictly as an <strong>Intermediary</strong> that provides cloud infrastructure, digital storage, and automated layout computing pipelines.</li>
        <li>Alfa New Gen Platforms does <strong>NOT</strong> initiate transmissions, does not select the receiver of dispatches, and does not select or modify editorial content contained in user submissions.</li>
        <li>Alfa New Gen Platforms shall <strong>NOT be liable</strong> for any third-party information, data, news articles, photographs, video clippings, defamatory statements, copyright infringement, or hate speech uploaded or disseminated by any User, Stringer, or Publisher.</li>
        <li>Any criminal offense, civil defamation lawsuit, Press Council inquiry, or governmental notice resulting from published reports shall be defended and borne exclusively by the individual author and publishing newsroom.</li>
      </ul>
    </section>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">3. User Obligations & Content Warranties</h3>
      <p>
        By submitting any text, image, graphic, audio, or video onto Alfa New Gen Platforms, the User explicitly represents and warrants that:
      </p>
      <ol className="list-decimal pl-5 space-y-1">
        <li>They own 100% of the copyright or possess explicit written authorization to publish the content.</li>
        <li>The content does not violate any applicable Indian laws, including the Bharatiya Nyaya Sanhita (BNS), Information Technology Act 2000, Copyright Act 1957, or Press & Registration of Periodicals Act 2023.</li>
        <li>The content does not threaten the unity, integrity, defense, security, or sovereignty of India, friendly relations with foreign states, or public order.</li>
        <li>The content does not contain child sexual abuse material (CSAM), non-consensual sexual depictions, or violate the POCSO Act.</li>
      </ol>
    </section>
  </article>
);

/* =========================================================================
   2. FINANCIAL LOSS PROTECTION & LIMITATION OF LIABILITY & REFUND
   ========================================================================= */
const LiabilityAndRefundContent: React.FC<{ lang: string }> = ({ lang }) => (
  <article className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
    <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
        Statutory Protection • Financial Shield & Limitation of Liability
      </div>
      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
        Financial Loss Protection, Limitation of Liability & Refund Policy
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Absolute Legal Insulation of Alfa New Gen Platforms Against Financial Claims and Losses
      </p>
    </div>

    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200">
      <strong>Zero Financial Loss Covenant: </strong> In no event shall Alfa New Gen Platforms, its founders, or directors be liable for consequential losses, printing delays, press breakdown costs, distribution losses, or third-party platform changes. The aggregate liability of the company is strictly limited to the fees paid by the user in the preceding 30 days (capped at ₹0 or ₹499 max).
    </div>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">1. Strict Limitation of Liability (Damage Cap)</h3>
      <p>
        To the maximum extent permitted by applicable law, in no event shall <strong>Alfa New Gen Platforms</strong>, its founders, officers, directors, shareholders, employees, contractors, or affiliates be liable for:
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Any indirect, incidental, punitive, special, consequential, or exemplary damages whatsoever.</li>
        <li>Loss of advertising revenue, newspaper subscription profits, loss of goodwill, or business interruption.</li>
        <li>Night press web-offset printing plate delays, distribution failures, paper wastage, or vendor reprint costs.</li>
        <li>Account suspension, demonetization, copyright strikes, or algorithmic suppression on YouTube, Google, Facebook, or any third-party platform.</li>
        <li>Data corruption, accidental deletion, or power grid/telecom disruptions beyond the Company&apos;s reasonable control.</li>
      </ul>
      <p className="font-semibold text-slate-900 dark:text-white pt-2">
        AGGREGATE LIABILITY CAP: IN ANY CASE, THE TOTAL COMBINED LIABILITY OF ALFA NEW GEN PLATFORMS ARISING OUT OF OR IN CONNECTION WITH THE SERVICES SHALL NOT EXCEED THE TOTAL AMOUNT ACTUALLY PAID BY THE USER TO ALFA NEW GEN PLATFORMS IN THE THIRTY (30) DAYS IMMEDIATELY PRECEDING THE CLAIM, OR INR ₹1,000 (ONE THOUSAND RUPEES), WHICHEVER IS LESS.
      </p>
    </section>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">2. Broad User Indemnification</h3>
      <p>
        The User agrees to <strong>defend, indemnify, and hold harmless Alfa New Gen Platforms</strong> and its officers against any and all claims, damages, liabilities, losses, costs, penalties, legal fees, or court expenses arising from:
      </p>
      <ol className="list-decimal pl-5 space-y-1">
        <li>Any news story, report, image, or video uploaded or shared by the User.</li>
        <li>Any allegation of copyright, trademark, patent, or intellectual property infringement.</li>
        <li>Any claim of defamation, slander, libel, breach of privacy, or criminal speech.</li>
        <li>Any failure of the User to remit statutory taxes (including TDS or GST) on wire royalties earned.</li>
      </ol>
    </section>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">3. Digital Credits & Subscription Refund Policy</h3>
      <p>
        Alfa New Gen Platforms operates on digital credit quotas, SaaS software subscriptions, and cloud rendering resources:
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>No Refunds on Digital Credits:</strong> Credit recharge packages (for editorial story processing, ePaper vector plate rendering, and YouTube news reels) are digital consumption units that cannot be refunded or exchanged for cash once purchased.</li>
        <li><strong>SaaS Subscription Fees:</strong> Monthly and annual subscription plan charges are non-refundable once the billing cycle commences. Users may cancel auto-renewal at any time from their User Plan portal.</li>
        <li><strong>Anti-Chargeback Defense:</strong> Users agree to resolve billing issues directly with the Alfa New Gen Platforms billing desk (<code className="text-blue-600 dark:text-blue-400">billing@alfanewgen.com</code>). Initiating an unsubstantiated payment gateway chargeback without prior dispute notice will result in immediate account suspension.</li>
      </ul>
    </section>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">4. Force Majeure</h3>
      <p>
        Alfa New Gen Platforms shall not be in default or liable for failure or delay in performance caused by circumstances beyond its control, including but not limited to acts of God, war, government internet shutdowns, grid blackouts, telecommunication carrier failures, or Google Cloud infrastructure interruptions.
      </p>
    </section>
  </article>
);

/* =========================================================================
   3. PRIVACY POLICY (DPDP ACT 2023 & IT ACT 2000)
   ========================================================================= */
const PrivacyPolicyContent: React.FC<{ lang: string }> = ({ lang }) => (
  <article className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
    <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
      <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
        Statutory Document • DPDP Act 2023 & IT Act 2000 Compliant
      </div>
      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
        Digital Personal Data Protection & Privacy Policy
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Operated by Alfa New Gen Platforms for Readers, Journalists, and News Organizations
      </p>
    </div>

    <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200">
      <strong>Digital Personal Data Protection (DPDP Act 2023): </strong> Alfa New Gen Platforms protects user data under the highest statutory standards. Journalist press IDs, government credentials, bank details, and UPI VPAs are used solely for accreditation and royalty settlements, and are never sold to data brokers.
    </div>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">1. Data Fiduciary Identity</h3>
      <p>
        The Data Fiduciary under the Digital Personal Data Protection Act, 2023 (DPDP Act) is:
        <br />
        <strong>Alfa New Gen Platforms, 4th Floor, Press Towers, HITEC City, Hyderabad, Telangana 500081, India</strong>.
        Email: <code className="text-blue-600 dark:text-blue-400">privacy@alfanewgen.com</code>.
      </p>
    </section>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">2. Categories of Data Collected</h3>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>Google OAuth Identity:</strong> Name, verified email address, and profile picture provided via Google Sign-In.</li>
        <li><strong>Contact & Geographic Coordinates:</strong> Mobile number (OTP verified), state, district, mandal, and GPS location tagged to field dispatches.</li>
        <li><strong>Journalist KYC Data:</strong> PIB/State I&PR press accreditation number, government ID mask, and digital press badge records.</li>
        <li><strong>Financial Settlement Identifiers:</strong> UPI Virtual Payment Address (VPA) and bank account tokens used strictly for disbursing wire royalties.</li>
        <li><strong>Technical Telemetry:</strong> IP hash, browser agent, and SHA-256 session tokens.</li>
      </ul>
    </section>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">3. Lawful Processing & Purpose Limitation</h3>
      <p>
        Data is processed strictly for:
      </p>
      <ol className="list-decimal pl-5 space-y-1">
        <li>Authenticating users and maintaining role-based access control (RBAC).</li>
        <li>Verifying editorial originality and computing anti-plagiarism scores.</li>
        <li>Disbursing wire royalties via UPI and issuing statutory Form 16A certificates under Section 194J.</li>
        <li>Preventing security intrusions, bot abuse, and protecting server integrity.</li>
      </ol>
    </section>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">4. Data Localization & Sovereign Storage</h3>
      <p>
        All Alfa New Gen Platforms databases, archives, and financial ledgers are hosted exclusively in MeitY-empanelled Google Cloud regions in India: <strong>Mumbai (asia-south1)</strong> and <strong>Delhi (asia-south2)</strong>. Personal data never leaves the sovereign borders of the Republic of India.
      </p>
    </section>
  </article>
);

/* =========================================================================
   4. GOOGLE & YOUTUBE API POLICIES & LIMITED USE
   ========================================================================= */
const GoogleYouTubePolicyContent: React.FC<{ lang: string }> = ({ lang }) => (
  <article className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
    <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
      <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">
        Google API Services User Data Policy & YouTube Developer Rules
      </div>
      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
        Google OAuth 2.0 & YouTube API Services Terms
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Mandatory Disclosures for Google Sign-In and Automated YouTube Video Publishing
      </p>
    </div>

    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-900 dark:text-red-200">
      <strong>Google &amp; YouTube Protection: </strong> Alfa New Gen Platforms strictly complies with Google API Limited Use policies. Connecting a YouTube channel grants only scoped permission to publish video packages. Alfa New Gen Platforms assumes no liability for copyright strikes or community guidelines actions arising on connected channels.
    </div>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">1. Google API Services User Data Policy Compliance</h3>
      <p>
        Alfa New Gen Platforms&apos; use and transfer to any other app of information received from Google APIs will adhere to the <strong>Google API Services User Data Policy</strong>, including the <strong>Limited Use</strong> requirements:
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>Requested Scopes:</strong> We request only basic identity scopes (<code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">openid</code>, <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">profile</code>, <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">email</code>) and, if you opt into YouTube Automation, the YouTube upload scope (<code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">https://www.googleapis.com/auth/youtube.upload</code>).</li>
        <li><strong>No Sale of Google Data:</strong> We never sell, transfer, or license user data obtained via Google APIs to third parties, data brokers, or advertisement providers.</li>
        <li><strong>No Human Inspection:</strong> Humans are not permitted to read user Google data unless required for technical support with explicit user consent or to comply with law.</li>
        <li><strong>No Generalized AI Model Training:</strong> Google user data is never used to train generalized machine learning or foundational AI models.</li>
      </ul>
    </section>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">2. YouTube Terms of Service & Community Guidelines</h3>
      <p>
        By utilizing the YouTube Video Studio or automated video broadcasting features in Alfa New Gen Platforms:
      </p>
      <ol className="list-decimal pl-5 space-y-1.5">
        <li>You agree to be bound by the <strong>YouTube Terms of Service</strong> (<a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline inline-flex items-center gap-0.5">https://www.youtube.com/t/terms <ExternalLink className="w-3 h-3" /></a>) and the <strong>Google Privacy Policy</strong> (<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline inline-flex items-center gap-0.5">https://policies.google.com/privacy <ExternalLink className="w-3 h-3" /></a>).</li>
        <li>You represent that all video scripts, voiceovers, headlines, and graphics conform to <strong>YouTube Community Guidelines</strong>.</li>
        <li><strong>Zero Liability for YouTube Strikes:</strong> In the event that YouTube flags, demonetizes, restricts, age-gates, or terminates your channel due to content generated or uploaded through the software, <strong>Alfa New Gen Platforms disclaims all legal and financial liability</strong>. You acknowledge that editorial direction rests entirely with you.</li>
      </ol>
    </section>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">3. Revocation of Google Access</h3>
      <p>
        Users can inspect and revoke Alfa New Gen Platforms&apos; access to their Google Account at any time via the Google Security Settings page at:
        <br />
        <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline font-mono text-xs inline-flex items-center gap-1 mt-1">
          https://myaccount.google.com/permissions <ExternalLink className="w-3 h-3" />
        </a>
      </p>
    </section>
  </article>
);

/* =========================================================================
   5. GOOGLE PLAY STORE DEVELOPER POLICY & ACCOUNT DELETION
   ========================================================================= */
const PlayStorePolicyContent: React.FC<{ lang: string }> = ({ lang }) => (
  <article className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
    <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
      <div className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wide">
        Google Play Store Developer Program Compliance
      </div>
      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
        Google Play Store User Data & Account Deletion Policy
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Transparent Safety Standards, App Permissions, and In-App Account Deletion
      </p>
    </div>

    <div className="p-4 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-xs text-cyan-900 dark:text-cyan-200">
      <strong>Google Play Store Standards: </strong> Alfa New Gen Platforms operates in full accordance with Google Play Developer Program policies. Every registered user possesses the statutory right to request complete, permanent account and personal data deletion via in-app settings or public web portal.
    </div>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">1. Play Store User Data Safety Disclosures</h3>
      <p>
        In compliance with Google Play Developer Program Policies:
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>Location Data:</strong> Coarse and fine location is accessed only when a field stringer explicitly uploads an on-ground news dispatch to geotag the news event for verification.</li>
        <li><strong>Storage & Camera:</strong> Accessed only to attach field reporting photos and broadcast b-roll.</li>
        <li><strong>In-Transit Encryption:</strong> All network requests use TLS 1.3 encryption with certificate pinning.</li>
        <li><strong>Data Sharing:</strong> No personal or device identifiers are shared with third-party tracking or advertising SDKs.</li>
      </ul>
    </section>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">2. In-App & Web Account Deletion Requirement</h3>
      <p>
        In accordance with Google Play&apos;s Account Deletion Policy, users can request permanent deletion of their account and associated personal data directly within the app under <strong>User Portal &gt; Profile &gt; Account Security</strong> or via our dedicated deletion URL:
      </p>
      <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200">
        Web Deletion URL: https://alfanewgen.com/user/account-deletion
      </div>
      <p>
        Upon submission of an account deletion request, personal profile details, contact numbers, and KYC credentials will be completely purged from our active databases within seven (7) business days, retaining only legally required tax invoices under the Indian Income Tax Act.
      </p>
    </section>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">3. Child & Family Protection (POCSO & COPPA)</h3>
      <p>
        Alfa New Gen Platforms is strictly targeted at adult journalists, newsroom editors, and general readership aged 18 years and above. We do not knowingly collect personal information from minors.
      </p>
    </section>
  </article>
);

/* =========================================================================
   6. EDITORIAL POLICY & PCI ETHICS CODE
   ========================================================================= */
const EditorialPolicyContent: React.FC<{ lang: string }> = ({ lang }) => (
  <article className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
    <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
      <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
        Press Council of India (PCI) Norms of Journalistic Conduct
      </div>
      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
        Editorial Code & PCI Ethics Policy
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Mandatory Standards for Editorial Desks, Bureau Chiefs, and Syndicated Contributors
      </p>
    </div>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">1. Core Journalistic Standards</h3>
      <p>
        All reporting and syndicated wire dispatches hosted on Alfa New Gen Platforms must adhere to the <strong>Norms of Journalistic Conduct</strong> published by the Press Council of India:
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>Factual Verification:</strong> Reports must be corroborated with primary evidence or on-the-record statements. Unverified social media rumors cannot be published as facts.</li>
        <li><strong>Impartiality:</strong> Factual news dispatches must be kept distinct from editorial opinion pieces.</li>
        <li><strong>Right of Reply:</strong> Individuals facing adverse allegations must be provided a fair opportunity to respond prior to edition lockdown.</li>
      </ul>
    </section>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">2. Originality Threshold (≥85%)</h3>
      <p>
        Alfa New Gen Platforms automatically computes an Originality Detection Score (0-100) using phrase fingerprinting and Indic semantics:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Score <strong>≥ 85%</strong>: Approved for automatic front-page layout and wire syndication.</li>
        <li>Score <strong>60% - 84%</strong>: Requires senior desk editor review for proper attribution.</li>
        <li>Score <strong>&lt; 60%</strong>: Flagged for suspected plagiarism; blocked from print plate finalization.</li>
      </ul>
    </section>
  </article>
);

/* =========================================================================
   7. GRIEVANCE REDRESSAL MECHANISM (RULE 11 IT RULES 2021)
   ========================================================================= */
const GrievancePolicyContent: React.FC<{ lang: string }> = ({ lang }) => (
  <article className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
    <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
      <div className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">
        Statutory Compliance • Rule 11 of IT Rules 2021
      </div>
      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
        Statutory Grievance Redressal Mechanism
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Three-Tier Framework under the Information Technology (Digital Media Ethics Code) Rules, 2021
      </p>
    </div>

    <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200">
      <strong>Grievance Redressal: </strong> Objections to published content or user privacy inquiries can be directly lodged with our Resident Grievance Officer. Per statutory IT rules, acknowledgments are issued within 24 hours and final resolution rendered within 15 days.
    </div>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">Three-Tier Grievance Framework</h3>
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase text-blue-700 dark:text-blue-400">Level I: Publisher Grievance Officer</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold">
            24 Hr Ack / 15 Days Disposal
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2">
          <div><strong className="text-slate-900 dark:text-white">Officer:</strong> Sri K. Ramanjaneyulu</div>
          <div><strong className="text-slate-900 dark:text-white">Designation:</strong> Chief Grievance Officer</div>
          <div><strong className="text-slate-900 dark:text-white">Email:</strong> grievance@alfanewgen.com</div>
          <div><strong className="text-slate-900 dark:text-white">Phone:</strong> +91 40 2388 9911</div>
          <div className="sm:col-span-2"><strong className="text-slate-900 dark:text-white">Office:</strong> Alfa New Gen Platforms, 4th Floor, Press Towers, HITEC City, Hyderabad, TG - 500081</div>
        </div>
      </div>

      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-1.5">
        <span className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400">Level II: Self-Regulating Body</span>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Appeals may be escalated to the Digital News Publishers Association (DNPA) / Press Council Self-Regulatory Body.
        </p>
      </div>

      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-1.5">
        <span className="text-xs font-bold uppercase text-blue-700 dark:text-blue-400">Level III: Ministry of I&B Oversight</span>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Inter-Departmental Committee mechanism operated by the Ministry of Information & Broadcasting, Government of India.
        </p>
      </div>
    </section>
  </article>
);

/* =========================================================================
   8. REPORTER AGREEMENT & WIRE ROYALTIES (SECTION 194J)
   ========================================================================= */
const MarketplaceTermsContent: React.FC<{ lang: string }> = ({ lang }) => (
  <article className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
    <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
        Marketplace & Wire Licensing Terms • Alfa New Gen Platforms
      </div>
      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
        Freelance Stringer & Wire Royalty Agreement
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Indian Copyright Act 1957, Section 194J TDS Withholding, and Instant UPI Settlements
      </p>
    </div>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">1. Independent Contractor Status</h3>
      <p>
        Reporters and stringers operate strictly as <strong>independent contributors</strong>. Nothing in this agreement shall create an employer-employee, partnership, or agency relationship between Alfa New Gen Platforms and the contributor. The Company has zero liability for labor benefits, overtime, or workmen compensation.
      </p>
    </section>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">2. Instant UPI Royalty Settlement</h3>
      <p>
        When an authorized news desk approves and licenses a submitted dispatch for print or digital syndication, royalties are credited directly to the reporter&apos;s registered UPI VPA (e.g. `journalist@upi`).
      </p>
    </section>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">3. Statutory TDS Deductions (Section 194J)</h3>
      <p>
        Royalties disbursed to resident journalists exceeding statutory thresholds have Tax Deducted at Source (TDS) under Section 194J of the Indian Income Tax Act. Form 16A certificates are automatically generated each quarter.
      </p>
    </section>
  </article>
);

/* =========================================================================
   9. COOKIE & TRACKING POLICY
   ========================================================================= */
const CookiePolicyContent: React.FC<{ lang: string }> = ({ lang }) => (
  <article className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
    <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
      <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
        Transparency & Telemetry Disclosures
      </div>
      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
        Cookie & Security Token Policy
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Transparent Disclosure of Multi-Tenant Session Tokens and Readership Privacy
      </p>
    </div>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">Strictly Necessary Operations</h3>
      <p>
        Alfa New Gen Platforms uses cryptographic session tokens strictly to preserve multi-tenant security isolation and save user preferences (dark/light theme, Indic font scale). We <strong>never sell</strong> reader information to advertising networks.
      </p>
    </section>
  </article>
);
