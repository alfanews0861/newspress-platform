/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
} from 'lucide-react';

export type LegalTabKey =
  | 'privacy'
  | 'terms'
  | 'editorial'
  | 'grievance'
  | 'cookies'
  | 'marketplace';

interface LegalCenterPageProps {
  initialTab?: LegalTabKey;
  onNavigate?: (path: string) => void;
}

export const LegalCenterPage: React.FC<LegalCenterPageProps> = ({
  initialTab = 'privacy',
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<LegalTabKey>(initialTab);
  const [lang, setLang] = useState<'en' | 'hi'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('newspress_lang');
      return saved === 'hi' ? 'hi' : 'en';
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

  // Default to LIGHT mode as requested
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

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const navigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.dispatchEvent(new CustomEvent('navigate', { detail: path }));
    }
  };

  const tabs = [
    {
      id: 'privacy' as LegalTabKey,
      label: lang === 'hi' ? 'गोपनीयता नीति' : 'Privacy Policy',
      sublabel: 'DPDP Act 2023 & IT Act 2000',
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      id: 'terms' as LegalTabKey,
      label: lang === 'hi' ? 'सेवा की शर्तें' : 'Terms of Service',
      sublabel: 'SaaS Agreement & Night Press SLA',
      icon: <Scale className="w-4 h-4" />,
    },
    {
      id: 'editorial' as LegalTabKey,
      label: lang === 'hi' ? 'संपादकीय नीति व आचार संहिता' : 'Editorial & Ethics Policy',
      sublabel: 'Press Council of India (PCI) Norms',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'grievance' as LegalTabKey,
      label: lang === 'hi' ? 'शिकायत निवारण तंत्र' : 'Grievance Redressal',
      sublabel: 'Rule 11, IT Rules 2021',
      icon: <AlertCircle className="w-4 h-4" />,
    },
    {
      id: 'cookies' as LegalTabKey,
      label: lang === 'hi' ? 'कुकी और ट्रैकिंग नीति' : 'Cookie & Tracking Policy',
      sublabel: 'Analytics & Readership Privacy',
      icon: <Cookie className="w-4 h-4" />,
    },
    {
      id: 'marketplace' as LegalTabKey,
      label: lang === 'hi' ? 'न्यूज वायर और रॉयल्टी शर्तें' : 'Wire & Royalty Terms',
      sublabel: 'Section 194J & Instant UPI',
      icon: <Coins className="w-4 h-4" />,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#202124] text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* Unified Platform Header (Exact same header across all pages) */}
      <UnifiedPlatformHeader currentPath="/legal" onNavigate={navigate} />

      {/* Hero Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#202124] py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                <Scale className="w-4 h-4" />
                <span>Statutory Governance & Press Regulations</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {lang === 'hi'
                  ? 'कानूनी, संपादकीय और शिकायत निवारण केंद्र'
                  : 'Legal, Editorial & Grievance Governance Center'}
              </h1>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
                {lang === 'hi'
                  ? 'भारतीय प्रेस परिषद (PCI) के दिशानिर्देश, डिजिटल पर्सनल डेटा प्रोटेक्शन एक्ट (DPDP 2023) और डिजिटल मीडिया एथिक्स कोड 2021 के अंतर्गत अनिवार्य कानूनी नीतियां।'
                  : 'Comprehensive statutory terms aligned with the Press Council of India (PCI) Norms, Digital Personal Data Protection Act (DPDP Act 2023), and the Information Technology (Digital Media Ethics Code) Rules, 2021.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-slate-900 dark:text-white">Certified Compliant</div>
                  <div className="text-slate-600 dark:text-slate-400">PCI, RNI & DPDP 2023</div>
                </div>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div>Last Revised: <strong className="text-slate-900 dark:text-white">October 2026</strong></div>
                <div>Status: <strong className="text-emerald-600 dark:text-emerald-400">Release v2.4-IND</strong></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column: Policy Navigation */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 mb-3">
                {lang === 'hi' ? 'नीतियां और नियम' : 'Policies & Regulations'}
              </h3>
              <nav className="space-y-1.5" aria-label="Policies">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 font-bold border-l-4 border-blue-600'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <div className={`mt-0.5 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                        {tab.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs sm:text-sm font-semibold truncate">{tab.label}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate">{tab.sublabel}</div>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 shrink-0 mt-0.5 transition-transform ${
                          isActive ? 'text-blue-600 dark:text-blue-400 translate-x-0.5' : 'text-transparent'
                        }`}
                      />
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Grievance Officer Quick Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400 uppercase">
                <AlertCircle className="w-4 h-4" />
                <span>Resident Grievance Officer</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Appointed pursuant to Rule 11(2)(a) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.
              </p>
              <div className="space-y-2 text-xs border-t border-slate-200 dark:border-slate-800 pt-3">
                <div className="font-bold text-slate-900 dark:text-white">Sri K. Ramanjaneyulu</div>
                <div className="text-slate-600 dark:text-slate-400">Chief Grievance Officer (India)</div>
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
                  <Mail className="w-3.5 h-3.5" />
                  <span>grievance@newspress-india.org</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Phone className="w-3.5 h-3.5" />
                  <span>+91 40 2388 9911</span>
                </div>
                <div className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>Press Towers, HITEC City, Hyderabad, TG - 500081</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Column: Policy Details */}
          <main className="lg:col-span-3">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-sm">
              {activeTab === 'privacy' && <PrivacyPolicyContent lang={lang} />}
              {activeTab === 'terms' && <TermsOfServiceContent lang={lang} />}
              {activeTab === 'editorial' && <EditorialPolicyContent lang={lang} />}
              {activeTab === 'grievance' && <GrievancePolicyContent lang={lang} />}
              {activeTab === 'cookies' && <CookiePolicyContent lang={lang} />}
              {activeTab === 'marketplace' && <MarketplaceTermsContent lang={lang} />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   1. PRIVACY POLICY
   ========================================================================= */
const PrivacyPolicyContent: React.FC<{ lang: 'en' | 'hi' }> = ({ lang }) => (
  <article className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
    <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
      <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
        Statutory Document • DPDP Act 2023 Compliant
      </div>
      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
        {lang === 'hi' ? 'डिजिटल गोपनीयता नीति (Privacy Policy)' : 'Digital Privacy Policy'}
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Effective Date: October 15, 2026 | Covers Indian News Organizations, Stringers, and Subscribers
      </p>
    </div>

    {lang === 'hi' ? (
      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200">
        <strong>हिंदी सारांश: </strong> न्यूज़प्रेस प्लेटफॉर्म भारत के डिजिटल पर्सनल डेटा प्रोटेक्शन एक्ट (DPDP 2023) और आईटी एक्ट 2000 के तहत सभी पत्रकारों, संवाददाताओं और संपादकीय कर्मचारियों के डेटा की पूर्ण सुरक्षा करता है। पत्रकारों की प्रेस आईडी, बैंक खाते, यूपीआई विवरण और समाचार कभी भी अनधिकृत रूप से तीसरे पक्ष को नहीं बेचे जाते हैं।
      </div>
    ) : (
      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200">
        <strong>Executive Summary: </strong> NewsPress Platform complies strictly with India&apos;s Digital Personal Data Protection Act, 2023 (DPDP Act) and the Information Technology Act, 2000. Reporter accreditations, phone numbers, banking/UPI credentials, and confidential draft dispatches are protected with enterprise-grade encryption and never sold to third-party ad brokers.
      </div>
    )}

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">1. Data Fiduciary and Platform Scope</h3>
      <p>
        NewsPress Platform operates as a Data Fiduciary and Data Processor under the Digital Personal Data Protection Act, 2023 for all news organizations (&quot;Tenants&quot;), freelance stringers, accredited journalists, and editorial staff utilizing our newspaper cloud and syndication services.
      </p>
      <p>
        Registered corporate address: <strong>NewsPress Publishing Technologies Pvt. Ltd., 4th Floor, Press Club Towers, HITEC City, Hyderabad, Telangana 500081, India</strong>.
      </p>
    </section>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">2. Categories of Data Collected</h3>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>Journalist & Stringer Identity:</strong> Full legal name, official press accreditation number (issued by PIB or State Information & Public Relations Departments), government photo ID mask (PAN for TDS compliance), and contact information.</li>
        <li><strong>Financial Settlement Credentials:</strong> UPI Virtual Payment Address (VPA) and Bank Account/IFSC details used exclusively for disbursing wire story royalties via RazorpayX.</li>
        <li><strong>Newsroom Tenant Assets:</strong> Organization name, RNI registration number, editorial roster, web-offset print facility locations, and daily edition circulation targets.</li>
        <li><strong>Cryptographic & Telemetry Logs:</strong> Tenant-isolated access logs, IP hashes, and SHA-256 digital signatures required to preserve night press lock integrity.</li>
      </ul>
    </section>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">3. Lawful Processing and Consent</h3>
      <p>
        In accordance with Section 6 of the DPDP Act 2023, personal data is processed solely for legitimate publishing operations:
      </p>
      <ol className="list-decimal pl-5 space-y-1">
        <li>Authenticating reporters and editorial staff for story dispatch and night press finalization.</li>
        <li>Executing wire syndication licensing and depositing payments via UPI.</li>
        <li>Verifying editorial originality, anti-plagiarism checks, and PCI ethical screening.</li>
        <li>Complying with statutory filings under Section 194J of the Income Tax Act, 1961 (TDS on royalties).</li>
      </ol>
    </section>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">4. Data Sovereignty & CERT-In Compliance</h3>
      <p>
        All NewsPress Platform databases, edition archives, and financial ledgers are hosted strictly on MeitY-empanelled Google Cloud Mumbai (asia-south1) and Delhi (asia-south2) data centers located within the Republic of India.
      </p>
    </section>
  </article>
);

/* =========================================================================
   2. TERMS OF SERVICE
   ========================================================================= */
const TermsOfServiceContent: React.FC<{ lang: 'en' | 'hi' }> = ({ lang }) => (
  <article className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
    <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
      <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
        Service Agreement • Multi-Tenant Newsroom Terms
      </div>
      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
        {lang === 'hi' ? 'सेवा की शर्तें (Terms of Service)' : 'Terms of Service'}
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Governs Newspaper Publishing Subscriptions, Regional Editions, and Night Press Operations
      </p>
    </div>

    {lang === 'hi' && (
      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200">
        <strong>हिंदी सारांश: </strong> यह समझौता समाचार पत्र प्रकाशकों, संवाददाताओं और प्रिंटिंग प्रेसों के बीच अधिकारों और जिम्मेदारियों को परिभाषित करता है। 99.98% नाइट प्रेस उपलब्धता गारंटी और PCI नैतिक नियमों का पालन अनिवार्य है।
      </div>
    )}

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">1. Provisioning & Tenant Isolation</h3>
      <p>
        Each news organization operates within a cryptographically isolated tenant boundary. NewsPress mathematically guarantees that draft articles, commercial advertising schedules, and subscriber lists cannot be accessed by competing media publications.
      </p>
    </section>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">2. Night Press Lock & Uptime SLA</h3>
      <p>
        Daily newspaper printing schedules operate under rigid midnight distribution windows across Indian cities:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>NewsPress guarantees a <strong>99.98% Service Level Agreement (SLA)</strong> during the critical night press window (8:00 PM to 2:00 AM IST).</li>
        <li>Automated preflight checks verify font embedding, Indic script glyph shaping, CMYK vector separation, and image DPI before generating final press-ready PDFs.</li>
        <li>Once finalized by the Editor-in-Chief, the production snapshot is cryptographically frozen. Late changes require issuing a formal version revision with audit logging.</li>
      </ul>
    </section>
  </article>
);

/* =========================================================================
   3. EDITORIAL POLICY & PCI ETHICS CODE
   ========================================================================= */
const EditorialPolicyContent: React.FC<{ lang: 'en' | 'hi' }> = ({ lang }) => (
  <article className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
    <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
      <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
        Press Council of India (PCI) Norms of Journalistic Conduct
      </div>
      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
        {lang === 'hi' ? 'संपादकीय नीति और आचार संहिता' : 'Editorial Code & PCI Ethics Policy'}
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Mandatory Standards for Editorial Desks, Bureau Chiefs, and Syndicated Contributors
      </p>
    </div>

    {lang === 'hi' && (
      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200">
        <strong>हिंदी सारांश: </strong> भारतीय प्रेस परिषद (PCI) के नियमों के अनुसार खबरों की सत्यता और निष्पक्षता सर्वोपरि है। किसी भी समाचार को प्रकाशित करने से पहले कम से कम दो विश्वसनीय स्रोतों से पुष्टि करना अनिवार्य है। साहित्यिक चोरी (Plagiarism) को रोकने के लिए 85% मौलिकता स्कोर आवश्यक है।
      </div>
    )}

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">1. Core Journalistic Standards</h3>
      <p>
        All reporting, news dispatches, and syndicated wire listings hosted on NewsPress must adhere to the <strong>Norms of Journalistic Conduct</strong> published by the Press Council of India:
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>Factual Verification:</strong> Reports must be corroborated with primary evidence. Unverified social media rumors cannot be published as established facts.</li>
        <li><strong>Impartiality:</strong> Factual news dispatches must be kept distinct from editorial opinion pieces.</li>
        <li><strong>Right of Reply:</strong> Individuals facing adverse allegations must be provided a fair opportunity to respond prior to edition lockdown.</li>
      </ul>
    </section>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">2. Originality Threshold (≥85%)</h3>
      <p>
        NewsPress automatically computes an Originality Detection Score (0-100) using phrase fingerprinting and Indic language semantics:
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
   4. GRIEVANCE REDRESSAL MECHANISM
   ========================================================================= */
const GrievancePolicyContent: React.FC<{ lang: 'en' | 'hi' }> = ({ lang }) => (
  <article className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
    <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
      <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">
        Statutory Compliance • Rule 11 of IT Rules 2021
      </div>
      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
        {lang === 'hi' ? 'शिकायत निवारण तंत्र (Grievance Redressal)' : 'Grievance Redressal Mechanism'}
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021
      </p>
    </div>

    {lang === 'hi' && (
      <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-900 dark:text-red-200">
        <strong>हिंदी सारांश: </strong> सूचना प्रौद्योगिकी नियम 2021 के नियम 11 के तहत किसी भी प्रकाशित समाचार पर आपत्ति होने पर हमारे रेजिडेंट ग्रीवेंस अधिकारी को शिकायत दर्ज की जा सकती है। शिकायत की पावती 24 घंटे में दी जाएगी और 15 दिनों में समाधान किया जाएगा।
      </div>
    )}

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">Three-Tier Grievance Framework</h3>
      <p>
        In compliance with Rule 11 of the Digital Media Ethics Code Rules, 2021:
      </p>

      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase text-blue-700 dark:text-blue-400">Level I: Publisher Grievance Officer</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold">
            24 Hr Ack / 15 Days Disposal
          </span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Complainants may submit objections regarding inaccurate reporting, defamation, or ethical violations directly to our designated officer:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2">
          <div><strong className="text-slate-900 dark:text-white">Officer:</strong> Sri K. Ramanjaneyulu</div>
          <div><strong className="text-slate-900 dark:text-white">Designation:</strong> Chief Grievance Officer</div>
          <div><strong className="text-slate-900 dark:text-white">Email:</strong> grievance@newspress-india.org</div>
          <div><strong className="text-slate-900 dark:text-white">Phone:</strong> +91 40 2388 9911</div>
          <div className="sm:col-span-2"><strong className="text-slate-900 dark:text-white">Office:</strong> NewsPress House, HITEC City, Hyderabad, TG - 500081</div>
        </div>
      </div>

      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-1.5">
        <span className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400">Level II: Self-Regulating Body</span>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          If unresolved within 15 days, appeals may be submitted to the Digital News Publishers Association (DNPA) / Press Council Self-Regulatory Body.
        </p>
      </div>

      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-1.5">
        <span className="text-xs font-bold uppercase text-blue-700 dark:text-blue-400">Level III: Ministry of I&B Oversight</span>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Oversight mechanism operated by the Ministry of Information & Broadcasting, Government of India.
        </p>
      </div>
    </section>
  </article>
);

/* =========================================================================
   5. COOKIE & TRACKING POLICY
   ========================================================================= */
const CookiePolicyContent: React.FC<{ lang: 'en' | 'hi' }> = ({ lang }) => (
  <article className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
    <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
      <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
        Transparency & Telemetry Disclosures
      </div>
      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
        {lang === 'hi' ? 'कुकी और सर्कुलेशन एनालिटिक्स नीति' : 'Cookie & Circulation Analytics Policy'}
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Transparent Disclosure of Session Tokens and Readership Telemetry
      </p>
    </div>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">Strictly Necessary Operations</h3>
      <p>
        NewsPress uses essential cryptographic tokens strictly to preserve multi-tenant security and save user preferences (dark/light theme, Indic font scale). We <strong>never sell</strong> reader information to advertising networks.
      </p>
    </section>
  </article>
);

/* =========================================================================
   6. WIRE & ROYALTY TERMS (SECTION 194J & UPI)
   ========================================================================= */
const MarketplaceTermsContent: React.FC<{ lang: 'en' | 'hi' }> = ({ lang }) => (
  <article className="space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
    <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
      <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
        Marketplace & Wire Licensing Terms
      </div>
      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
        {lang === 'hi' ? 'न्यूज वायर और स्ट्रिंगर रॉयल्टी अनुबंध' : 'Syndicated News Wire & Royalty Agreement'}
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Indian Copyright Act 1957, Section 194J TDS Withholding, and Instant UPI Settlements
      </p>
    </div>

    {lang === 'hi' && (
      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200">
        <strong>हिंदी सारांश: </strong> स्वतंत्र और जिला पत्रकारों के समाचार जब राज्य स्तरीय समाचार पत्रों द्वारा खरीदे जाते हैं, तो रॉयल्टी की राशि तुरंत सीधे पत्रकार के यूपीआई (UPI) या बैंक खाते में जमा की जाती है। आयकर अधिनियम की धारा 194J के अनुसार टीडीएस काटा जाता है और फॉर्म 16A डिजिटल रूप से जारी किया जाता है।
      </div>
    )}

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">1. Instant UPI Settlement via RazorpayX</h3>
      <p>
        When an Editor-in-Chief licenses a wire dispatch, funds are disbursed in real time to the reporter&apos;s registered UPI ID (e.g. `journalist@upi`) with zero escrow holdback.
      </p>
    </section>

    <section className="space-y-3">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">2. Statutory TDS Deductions (Section 194J)</h3>
      <p>
        Royalties disbursed to resident journalists exceeding statutory thresholds have Tax Deducted at Source (TDS) under Section 194J of the Indian Income Tax Act. Form 16A certificates are automatically generated each quarter.
      </p>
    </section>
  </article>
);
