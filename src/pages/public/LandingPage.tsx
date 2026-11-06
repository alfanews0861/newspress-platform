/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UnifiedPlatformHeader } from '../../components/navigation/UnifiedPlatformHeader';
import {
  Newspaper,
  BookOpen,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Zap,
  Layers,
  ArrowRight,
  Star,
  Users,
  Printer,
  Smartphone,
  Coins,
  Scale,
  AlertCircle,
  FileText,
  Building2,
  ExternalLink,
  Sun,
  Moon,
  Menu as MenuIcon,
  X,
  Play,
  Pause,
  Award,
  Globe,
  Lock,
  ChevronDown,
  Quote,
  TrendingUp,
  Radio,
  Check,
  MapPin,
  Mail,
  Phone,
  Cpu,
  BadgeCheck,
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  // Theme state: Default to LIGHT mode as requested
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('newspress_theme');
      return saved === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  });

  // Language state: English or Hindi only
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

  // Mobile menu
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Slider State
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSliderAutoplay, setIsSliderAutoplay] = useState(true);

  // Testimonial Filter State
  const [testimonialFilter, setTestimonialFilter] = useState<'all' | 'national' | 'regional' | 'hindi' | 'wire'>('all');

  // Interactive Live Engine Preview Tab
  const [activeEngineTab, setActiveEngineTab] = useState<'plate' | 'ai' | 'wire' | 'pullout'>('plate');

  // Billing Toggle
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  // IST Live Clock
  const [istTime, setIstTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setIstTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('newspress_theme', theme);
  }, [theme]);

  // Carousel Autoplay
  useEffect(() => {
    if (!isSliderAutoplay) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [isSliderAutoplay]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const navigateTo = (path: string) => {
    setIsMobileNavOpen(false);
    onNavigate(path);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* =========================================================================
          UNIFIED PLATFORM HEADER (EXACT SAME 3-TIER HEADER ACROSS ALL PAGES)
          ========================================================================= */}
      <UnifiedPlatformHeader currentPath="/" onNavigate={navigateTo} />

      {/* =========================================================================
          4. HERO SLIDER CAROUSEL (CRISP LIGHT/DARK CARD & REAL PHOTOGRAPHY)
          ========================================================================= */}
      <section id="hero" className="relative overflow-hidden py-8 sm:py-14 bg-gradient-to-b from-slate-100/60 via-slate-50 to-white dark:from-[#090d16] dark:via-[#0f172a] dark:to-[#090d16]">
        {/* Subtle background mesh glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Main Slide Carousel Shell */}
          <div className="relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl overflow-hidden min-h-[580px] flex flex-col justify-between">
            {/* Slide Body */}
            <div className="p-6 sm:p-10 lg:p-12 flex-1 flex flex-col justify-center">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
                {/* Left Side: Copy, Metrics & CTAs */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Category Pill */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{SLIDES[currentSlide].tag[lang]}</span>
                  </div>

                  {/* Headline */}
                  <div className="space-y-2">
                    <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                      {SLIDES[currentSlide].title[lang]}
                    </h1>
                    <p className="text-base sm:text-lg text-blue-600 dark:text-blue-400 font-bold">
                      {SLIDES[currentSlide].subtitle[lang]}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed max-w-2xl font-normal">
                    {SLIDES[currentSlide].description[lang]}
                  </p>

                  {/* Highlights Bullet List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {SLIDES[currentSlide].bullets[lang].map((bullet, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-4 pt-4">
                    <button
                      onClick={() => navigateTo('/dashboard')}
                      className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>{SLIDES[currentSlide].ctaPrimary[lang]}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigateTo(SLIDES[currentSlide].ctaSecondaryLink)}
                      className="px-5 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm transition-colors cursor-pointer shadow-xs"
                    >
                      {SLIDES[currentSlide].ctaSecondary[lang]}
                    </button>
                  </div>
                </div>

                {/* Right Side: High-Resolution Photo + Live Interactive Mockup Overlay */}
                <div className="lg:col-span-5 relative">
                  <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/80 shadow-xl relative group bg-slate-100 dark:bg-[#202124]">
                    {/* Background Real Photography */}
                    <img
                      src={SLIDES[currentSlide].image}
                      alt={SLIDES[currentSlide].title.en}
                      className="w-full h-72 sm:h-84 object-cover brightness-[0.9] dark:brightness-[0.85] group-hover:scale-105 transition-transform duration-700"
                    />

                    {/* Gradient overlay for contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                    {/* Floating Overlay Card on top of photo */}
                    <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-white/95 dark:bg-[#292a2d]/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white shadow-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>{SLIDES[currentSlide].badgeTitle[lang]}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {SLIDES[currentSlide].badgeStatus}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                        {SLIDES[currentSlide].badgeDesc[lang]}
                      </p>
                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
                        <span>{SLIDES[currentSlide].badgeMetric1}</span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold">{SLIDES[currentSlide].badgeMetric2}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Carousel Bottom Controls */}
            <div className="border-t border-slate-200 dark:border-slate-800/90 bg-slate-50 dark:bg-[#202124]/80 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Slide Selector Chips */}
              <div className="flex items-center gap-2 overflow-x-auto max-w-full">
                {SLIDES.map((slide, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      currentSlide === index
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-blue-400'
                    }`}
                  >
                    0{index + 1}. {slide.shortTitle[lang]}
                  </button>
                ))}
              </div>

              {/* Prev / Next & Pause Controls */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setIsSliderAutoplay(!isSliderAutoplay)}
                  className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 transition-colors cursor-pointer"
                  title={isSliderAutoplay ? 'Pause Carousel' : 'Play Carousel'}
                  aria-label="Toggle autoplay"
                >
                  {isSliderAutoplay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length)}
                    className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:border-blue-400 transition-colors cursor-pointer"
                    aria-label="Previous Slide"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentSlide((prev) => (prev + 1) % SLIDES.length)}
                    className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:border-blue-400 transition-colors cursor-pointer"
                    aria-label="Next Slide"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. LIVE METRICS & PRODUCTION NUMBERS BANNER
          ========================================================================= */}
      <section className="bg-white dark:bg-[#202124] border-y border-slate-200 dark:border-slate-800/80 py-10 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div className="space-y-1.5">
              <div className="text-3xl sm:text-5xl font-black font-sans text-blue-600 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-blue-400 dark:to-cyan-400">
                48+
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {lang === 'hi' ? 'भारतीय दैनिक समाचार पत्र' : 'Indian Publications Onboarded'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {lang === 'hi' ? 'दैनिक भास्कर, लोकमत, ईनाडु आदि' : 'National Dailies & Regional Presses'}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-3xl sm:text-5xl font-black font-sans text-emerald-600 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-emerald-400 dark:to-teal-400">
                1.24M+
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {lang === 'hi' ? 'दैनिक मुद्रण प्रसार (सर्कुलेशन)' : 'Daily Print Circulation Managed'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {lang === 'hi' ? 'जीरो प्लेट एरर के साथ मुद्रित' : 'Preflight-Checked Broadsheet Copies'}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-3xl sm:text-5xl font-black font-sans text-blue-600 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-blue-400 dark:to-cyan-400">
                99.98%
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {lang === 'hi' ? 'नाइट प्रेस लॉक विश्वसनीयता' : 'Midnight Press Lock SLA'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {lang === 'hi' ? '10:00 PM IST डेडलाइन गारंटी' : 'Guaranteed Offset Printing Windows'}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-3xl sm:text-5xl font-black font-sans text-purple-600 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-purple-400 dark:to-pink-400">
                ₹4.2 Cr+
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {lang === 'hi' ? 'संवाददाताओं को तुरंत रॉयल्टी' : 'Direct Reporter Royalties Paid'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {lang === 'hi' ? 'UPI व रेज़रपे एक्स के माध्यम से' : 'Via Instant UPI & Section 194J TDS'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. INDIAN EDITORS TESTIMONIALS (REAL PORTRAITS & VERIFIED REVIEWS)
          ========================================================================= */}
      <section id="testimonials" className="py-16 sm:py-24 bg-slate-50 dark:bg-gradient-to-b dark:from-[#090d16] dark:via-[#0d1322] dark:to-[#090d16] border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              <Award className="w-3.5 h-3.5" />
              <span>{lang === 'hi' ? 'संपादकीय विश्वास व समीक्षाएं' : 'Journalistic Trust & Editorial Endorsements'}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {lang === 'hi'
                ? 'भारत के प्रमुख समाचार पत्र संपादकों की समीक्षाएं'
                : 'Trusted by India\'s Foremost Editors & Bureau Chiefs'}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {lang === 'hi'
                ? 'दैनिक भास्कर, द हिंदू, लोकमत, मलयला मनोरमा और प्रमुख समाचार सिंडिकेट्स के शीर्ष संपादकों के अनुभव।'
                : 'Discover how editors across leading Indian publications streamline multi-edition night press locks, eliminate broken Indic ligatures, and source verified rural journalism.'}
            </p>

            {/* Filter buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
              {[
                { id: 'all', label: lang === 'hi' ? 'सभी समीक्षाएं (All)' : 'All Reviews (6)' },
                { id: 'national', label: lang === 'hi' ? 'राष्ट्रीय दैनिक (National)' : 'National Dailies' },
                { id: 'hindi', label: lang === 'hi' ? 'हिंदी बेल्ट (Hindi Belt)' : 'Hindi Editions' },
                { id: 'regional', label: lang === 'hi' ? 'क्षेत्रीय प्रेस (Regional)' : 'Regional Press' },
                { id: 'wire', label: lang === 'hi' ? 'न्यूज वायर (Wire & Syndicate)' : 'Wire & Syndicates' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setTestimonialFilter(btn.id as any)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    testimonialFilter === btn.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:text-white'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Testimonial Cards Grid with Real Photography */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {TESTIMONIALS.filter(
              (item) => testimonialFilter === 'all' || item.category === testimonialFilter
            ).map((t) => (
              <div
                key={t.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-slate-700 transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Glow bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 opacity-80" />

                <div className="space-y-4">
                  {/* Top: Stars and Publication Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {t.publication}
                    </span>
                  </div>

                  {/* Quote */}
                  <div className="relative pt-2">
                    <Quote className="w-8 h-8 text-slate-300 dark:text-slate-700 absolute -top-1 -left-2 opacity-50" />
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed relative z-10 pl-3">
                      &quot;{t.quote[lang]}&quot;
                    </p>
                  </div>
                </div>

                {/* Bottom Profile with Real Image */}
                <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={t.photo}
                      alt={t.name.en}
                      className="w-12 h-12 rounded-full object-cover border-2 border-blue-500/50 shadow-xs shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate flex items-center gap-1">
                        <span>{t.name[lang]}</span>
                        <BadgeCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {t.role[lang]}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 shrink-0 font-mono">
                    {t.metric}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. INTERACTIVE PRINT ENGINE SHOWCASE (TABS WITH VISUAL PROOFS)
          ========================================================================= */}
      <section id="press-engine" className="py-16 sm:py-24 bg-white dark:bg-[#202124] border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {lang === 'hi'
                ? 'औद्योगिक स्तर का मुद्रण और संपादकीय इंजन'
                : 'Industrial-Grade Newspaper Print & Layout Engine'}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-normal">
              {lang === 'hi'
                ? 'वेब-ऑफसेट रोटरी प्रेसों, 8-कॉलम ब्रॉडशीट और नाइट प्रेस शेड्यूल के लिए पूर्ण क्लाउड तकनीक।'
                : 'Designed for the relentless reality of Indian print runs: 300+ DPI vector PDF plates, CMYK preflight verification, and instant UPI payouts.'}
            </p>

            {/* Interactive feature selector tabs */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
              {[
                { id: 'plate', label: lang === 'hi' ? 'नाइट प्रेस प्लेट्स' : 'Night Press Plates' },
                { id: 'ai', label: lang === 'hi' ? 'एआई ओरिजिनैलिटी' : 'AI Plagiarism Defense' },
                { id: 'wire', label: lang === 'hi' ? 'संवाददाता मार्केटप्लेस' : 'Stringer Wire & UPI' },
                { id: 'pullout', label: lang === 'hi' ? 'जिला पुलआउट्स' : 'District Editions' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveEngineTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    activeEngineTab === tab.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Feature Display */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-sm">
            {activeEngineTab === 'plate' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-4">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    {lang === 'hi' ? 'वेब-ऑफसेट रोटरी प्रेसों के लिए' : 'Web-Offset Rotary Press Pipeline'}
                  </span>
                  <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                    {lang === 'hi' ? '300+ DPI वेक्टर PDF और स्वचालित प्रीफ्लाइट' : '300+ DPI Vector PDF/X-1a Preflight Generation'}
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                    {lang === 'hi'
                      ? 'भारतीय भाषाओं (हिंदी, तमिल, तेलुगु, आदि) के अक्षरों के जटिल विन्यास को बिना किसी टूट-फूट के 8-कॉलम ब्रॉडशीट पर सही ढंग से मुद्रित करने के लिए HarfBuzz इंजन का उपयोग किया जाता है।'
                      : 'HarfBuzz Indic font shaping guarantees zero broken conjuncts or misplaced matras on high-speed broadsheet offset machines. Every plate undergoes rigorous automated checks before midnight lock.'}
                  </p>
                  <div className="space-y-2 pt-2 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> CMYK 4-Color Channel Separation</div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Embedded Indic Font Subsetting</div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> SHA-256 Immutable Audit Signature</div>
                  </div>
                  <div className="pt-4">
                    <button onClick={() => navigateTo('/production/queue')} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer">
                      {lang === 'hi' ? 'प्रोडक्शन कतार देखें' : 'View Production Queue'}
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <img
                    src="https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop&q=80"
                    alt="Offset Rotary Printing Press"
                    className="w-full h-80 object-cover rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md"
                  />
                </div>
              </div>
            )}

            {activeEngineTab === 'ai' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-4">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    {lang === 'hi' ? 'प्रेस परिषद (PCI) के अनुरूप' : 'PCI Ethics Code & Originality'}
                  </span>
                  <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                    {lang === 'hi' ? 'साहित्यिक चोरी और मानहानि से पूर्ण सुरक्षा' : 'Anti-Plagiarism & Defamation Screening Engine'}
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                    {lang === 'hi'
                      ? 'हर खबर को 85% मौलिकता स्कोर पार करना होगा। एआई द्वारा संचालित तथ्य जांच और कॉपी-फिटिंग आपके संपादकों का बहुमूल्य समय बचाती है।'
                      : 'Real-time phrase fingerprinting across 50,000+ daily sources prevents copyright infringement and defamation risks while fitting headlines precisely to newspaper column widths.'}
                  </p>
                  <div className="space-y-2 pt-2 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Automated 0-100 Originality Scoring</div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Gemini-Powered Headline Auto-Fitter</div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Dual-Source Fact Corroboration Guard</div>
                  </div>
                  <div className="pt-4">
                    <button onClick={() => navigateTo('/newsroom/editorial-queue')} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer">
                      {lang === 'hi' ? 'संपादकीय कतार देखें' : 'Inspect Editorial Queue'}
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <img
                    src="https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=800&auto=format&fit=crop&q=80"
                    alt="Editorial AI Control Room"
                    className="w-full h-80 object-cover rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md"
                  />
                </div>
              </div>
            )}

            {activeEngineTab === 'wire' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-4">
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                    {lang === 'hi' ? 'संवाददाताओं के लिए निष्पक्ष आय' : 'Rural Journalism & Instant Royalties'}
                  </span>
                  <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                    {lang === 'hi' ? 'UPI और रेज़रपे एक्स से तुरंत खाते में भुगतान' : 'Instant UPI Wire Royalties via RazorpayX'}
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                    {lang === 'hi'
                      ? 'जिला और तहसील स्तर के पत्रकारों द्वारा भेजी गई खबरों को जब कोई बड़ा अखबार खरीदता है, तो राशि तुरंत सीधे पत्रकार के यूपीआई खाते में जमा हो जाती है।'
                      : 'Stringers upload field photographs and dispatches from mobile phones. Once approved by an Editor-in-Chief, royalty funds settle to the journalist\'s UPI address in under 60 seconds with Section 194J TDS compliance.'}
                  </p>
                  <div className="space-y-2 pt-2 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Instant UPI Settlement (No Escrow Hold)</div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Automated Digital Form 16A TDS Certificates</div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Ironclad Broadsheet Syndication Rights</div>
                  </div>
                  <div className="pt-4">
                    <button onClick={() => navigateTo('/marketplace')} className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs cursor-pointer">
                      {lang === 'hi' ? 'मार्केटप्लेस ब्राउज करें' : 'Browse Wire Marketplace'}
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <img
                    src="https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&auto=format&fit=crop&q=80"
                    alt="Field Journalists Reporting"
                    className="w-full h-80 object-cover rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md"
                  />
                </div>
              </div>
            )}

            {activeEngineTab === 'pullout' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-4">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    {lang === 'hi' ? 'मल्टी-टेनेंट जिला संस्करण' : 'Multi-Tenant Regional Pullouts'}
                  </span>
                  <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                    {lang === 'hi' ? 'मुख्य अखबार और जिला सप्लीमेंट्स का आसान प्रबंधन' : 'Coordinate 50+ Regional Pullouts from One Screen'}
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                    {lang === 'hi'
                      ? 'मुख्य राज्य संस्करण और विभिन्न जिलों के 4 से 8 पेज के लोकल सप्लीमेंट्स को अलग-अलग टीमों द्वारा बिना किसी भ्रम के एक साथ तैयार किया जा सकता है।'
                      : 'Decoupled multi-tenant workspaces allow independent regional bureaus to produce local district tabs while sharing common state, national, and business pages seamlessly.'}
                  </p>
                  <div className="space-y-2 pt-2 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Dynamic Advertising Split Replacements</div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Independent District Desk Roles & Permissions</div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Automated Deadline Tracking by Timezone</div>
                  </div>
                  <div className="pt-4">
                    <button onClick={() => navigateTo('/newspaper/brands')} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer">
                      {lang === 'hi' ? 'संस्करण ब्रांड देखें' : 'View Regional Brands'}
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <img
                    src="https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=80"
                    alt="Newspaper Proofs & Broadsheet Stacks"
                    className="w-full h-80 object-cover rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. LIVE WIRE MARKETPLACE STORY FEED (WITH REAL PHOTOS & UPI CARDS)
          ========================================================================= */}
      <section id="stringer-wire" className="py-16 sm:py-24 bg-slate-50 dark:bg-gradient-to-b dark:from-[#090d16] dark:via-[#0d1424] dark:to-[#090d16] border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 mb-2">
                <Coins className="w-3.5 h-3.5" />
                <span>{lang === 'hi' ? 'लाइव सिंडिकेटेड वायर' : 'Live Syndicated Wire Marketplace'}</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {lang === 'hi' ? 'सत्यापित ग्रामीण व खोजी समाचार' : 'Verified Rural & Investigative Field Reports'}
              </h2>
            </div>
            <button
              onClick={() => navigateTo('/marketplace')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
            >
              <span>{lang === 'hi' ? 'पूरा वायर मार्केटप्लेस खोलें' : 'Open Full Marketplace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {WIRE_STORIES.map((story) => (
              <div
                key={story.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md hover:border-blue-500 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={story.image}
                      alt={story.title[lang]}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-white/90 dark:bg-[#202124]/90 backdrop-blur-md text-[10px] font-bold text-slate-900 dark:text-blue-400 border border-slate-200 dark:border-slate-700">
                      {story.district}
                    </div>
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                      {story.originality}% Original
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                      {story.title[lang]}
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                      {story.summary[lang]}
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 mt-2">
                  <div className="flex items-center justify-between text-xs pt-3">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{lang === 'hi' ? 'रॉयल्टी मूल्य' : 'Royalty Price'}</span>
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">₹{story.price}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>Instant UPI</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          9. TRANSPARENT PRICING PLANS (INR WITH MONTHLY / ANNUAL TOGGLE)
          ========================================================================= */}
      <section id="pricing" className="py-16 sm:py-24 bg-white dark:bg-[#202124] border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {lang === 'hi'
                ? 'भारतीय समाचार पत्र प्रकाशकों के लिए पारदर्शी मूल्य'
                : 'Simple, Transparent Subscription Plans in INR'}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-normal">
              {lang === 'hi'
                ? 'जिला स्तर के समाचार पत्रों से लेकर राष्ट्रीय बहु-भाषी प्रकाशन समूहों तक के लिए उपयुक्त।'
                : 'All plans include 300+ DPI vector PDF plates, automated night press scheduling, and Press Council compliance.'}
            </p>

            {/* Billing cycle switch */}
            <div className="flex items-center justify-center gap-3 pt-4">
              <span className={`text-xs font-bold ${billingPeriod === 'monthly' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                {lang === 'hi' ? 'मासिक बिलिंग' : 'Monthly'}
              </span>
              <button
                onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
                className="w-12 h-6 rounded-full bg-blue-600 p-0.5 transition-colors cursor-pointer relative"
                aria-label="Toggle billing period"
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    billingPeriod === 'annual' ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={`text-xs font-bold ${billingPeriod === 'annual' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                {lang === 'hi' ? 'वार्षिक (20% की बचत)' : 'Annual (Save 20%)'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Plan 1 */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {lang === 'hi' ? 'जिला स्टार्टर' : 'District Starter'}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {lang === 'hi' ? 'जिला व स्वतंत्र समाचार पत्र' : 'Independent District Press'}
                </h3>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">
                    ₹{billingPeriod === 'annual' ? '3,999' : '4,999'}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">/ month (+GST)</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                  {lang === 'hi'
                    ? 'अधिकतम 2 क्षेत्रीय संस्करण, 25 रिपोर्टर सीटें और 300 DPI ब्रॉडशीट प्लेट निर्यात।'
                    : 'Up to 2 daily editions, 25 reporter seats, and vector print-ready PDF broadsheet exports.'}
                </p>
                <div className="space-y-2.5 pt-4 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> 2 Regional Editions</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> 25 Accredited Reporter Seats</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> 300+ DPI Vector PDF Export</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> HarfBuzz Indic Ligature Shaper</div>
                </div>
              </div>
              <button
                onClick={() => navigateTo('/login')}
                className="mt-8 w-full py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                {lang === 'hi' ? 'ट्रायल शुरू करें' : 'Start Free 14-Day Trial'}
              </button>
            </div>

            {/* Plan 2: Most Popular */}
            <div className="rounded-3xl border-2 border-blue-600 bg-white dark:bg-slate-900 p-8 flex flex-col justify-between shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wider py-1 px-4 rounded-bl-xl shadow-xs">
                {lang === 'hi' ? 'सबसे लोकप्रिय' : 'MOST POPULAR'}
              </div>
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {lang === 'hi' ? 'स्टेट प्रो' : 'State Pro Edition'}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {lang === 'hi' ? 'राज्य स्तरीय दैनिक समाचार पत्र' : 'State Daily Publications'}
                </h3>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">
                    ₹{billingPeriod === 'annual' ? '11,999' : '14,999'}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">/ month (+GST)</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                  {lang === 'hi'
                    ? '12 क्षेत्रीय संस्करण, असीमित रिपोर्टर, नाइट प्रेस लॉक और तत्काल UPI संवाददाता रॉयल्टी।'
                    : '12 district editions, unlimited reporters, automated night press lock, and instant UPI wire royalties.'}
                </p>
                <div className="space-y-2.5 pt-4 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> 12 District Editions & Pullouts</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Unlimited Reporter Mobile Seats</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Automated Night Press Lock (10:00 PM)</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Stringer Wire & Instant UPI Settlements</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> 99.98% Night Press Lock SLA Guarantee</div>
                </div>
              </div>
              <button
                onClick={() => navigateTo('/dashboard')}
                className="mt-8 w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all cursor-pointer"
              >
                {lang === 'hi' ? 'प्रो संस्करण शुरू करें' : 'Launch State Pro'}
              </button>
            </div>

            {/* Plan 3 */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {lang === 'hi' ? 'नेशनल एंटरप्राइज' : 'National Enterprise'}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {lang === 'hi' ? 'राष्ट्रीय मीडिया नेटवर्क' : 'Multi-Language Media Groups'}
                </h3>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">
                    ₹{billingPeriod === 'annual' ? '31,999' : '39,999'}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">/ month (+GST)</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                  {lang === 'hi'
                    ? 'असीमित संस्करण, कस्टम प्रेस क्लस्टर, समर्पित सर्वर और 24/7 आपातकालीन सहायता।'
                    : 'Unlimited editions, dedicated high-speed rendering clusters, custom font libraries, and 24/7 emergency hotline.'}
                </p>
                <div className="space-y-2.5 pt-4 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Unlimited Editions & Master Brands</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Custom Indic Font Library Integration</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Dedicated Cloud Cluster (Mumbai / Delhi)</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> 24/7 Emergency Night Press Engineer</div>
                </div>
              </div>
              <button
                onClick={() => navigateTo('/developer')}
                className="mt-8 w-full py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                {lang === 'hi' ? 'विशेष परामर्श' : 'Contact Enterprise Team'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          10. STATUTORY LEGAL & COMPLIANCE PORTAL CARD
          ========================================================================= */}
      <section className="py-14 bg-slate-50 dark:bg-gradient-to-b dark:from-[#090d16] dark:via-[#0e1628] dark:to-[#090d16] border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-10 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                  <Scale className="w-4 h-4" />
                  <span>Statutory Compliance & Indian Press Regulations</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {lang === 'hi'
                    ? 'भारतीय प्रेस परिषद व डिजिटल मीडिया नियमों के अनुसार नीतियां'
                    : 'Certified Statutory Governance & Indian Legal Policies'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl font-normal">
                  {lang === 'hi'
                    ? 'डिजिटल पर्सनल डेटा प्रोटेक्शन एक्ट (DPDP 2023), आईटी नियम 2021 के नियम 11 के तहत शिकायत निवारण अधिकारी और प्रेस काउंसिल आचार संहिता।'
                    : 'Full legal coverage: DPDP Act 2023 Privacy Policy, Newsroom Terms of Service, Press Council of India (PCI) Ethics, Rule 11 Grievance Redressal, and Wire Royalty Terms.'}
                </p>
              </div>

              <button
                onClick={() => navigateTo('/legal')}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shrink-0 flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <span>{lang === 'hi' ? 'कानूनी केंद्र खोलें' : 'Open Legal Center'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
              {[
                { label: 'Privacy Policy', sub: 'DPDP Act 2023' },
                { label: 'Terms of Service', sub: '99.98% Night SLA' },
                { label: 'PCI Ethics Code', sub: 'Journalistic Norms' },
                { label: 'Grievance Desk', sub: 'Rule 11 IT Rules 2021' },
                { label: 'Cookie Policy', sub: 'Strictly Necessary' },
                { label: 'Wire Royalty Terms', sub: 'Sec 194J & UPI' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => navigateTo('/legal')}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#292a2d] hover:border-blue-500 transition-all cursor-pointer text-left"
                >
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.label}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{item.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          11. LUXURY NEWSPAPER FOOTER
          ========================================================================= */}
      <footer className="bg-[#202124] text-white border-t border-slate-800 pt-16 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Brand column */}
            <div className="md:col-span-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-sans font-black text-lg shadow-lg">
                  NP
                </div>
                <div>
                  <div className="font-sans font-bold text-xl tracking-tight">NEWSPRESS PLATFORM</div>
                  <div className="text-[11px] text-slate-400">Cloud Newsroom OS & News Wire</div>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-normal">
                Empowering India&apos;s independent newspapers, regional dailies, and accredited journalists with high-fidelity Indic typography, automated midnight press locks, and direct UPI royalties.
              </p>
              <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>PCI Norms • RNI Standards • DPDP Act 2023 Compliant</span>
              </div>
            </div>

            {/* Links 1: Editorial */}
            <div className="md:col-span-2 space-y-3 text-xs">
              <div className="font-bold text-white uppercase tracking-wider text-[11px]">Editorial Desks</div>
              <ul className="space-y-2 text-slate-400">
                <li><button onClick={() => navigateTo('/dashboard')} className="hover:text-white transition-colors cursor-pointer">Newsroom Overview</button></li>
                <li><button onClick={() => navigateTo('/newsroom/news')} className="hover:text-white transition-colors cursor-pointer">News Dispatch</button></li>
                <li><button onClick={() => navigateTo('/newsroom/editorial-queue')} className="hover:text-white transition-colors cursor-pointer">Editorial Queue</button></li>
                <li><button onClick={() => navigateTo('/newsroom/assignments')} className="hover:text-white transition-colors cursor-pointer">Field Assignments</button></li>
                <li><button onClick={() => navigateTo('/newsroom/reporters')} className="hover:text-white transition-colors cursor-pointer">Reporters Directory</button></li>
              </ul>
            </div>

            {/* Links 2: Print Production */}
            <div className="md:col-span-2 space-y-3 text-xs">
              <div className="font-bold text-white uppercase tracking-wider text-[11px]">Print & Editions</div>
              <ul className="space-y-2 text-slate-400">
                <li><button onClick={() => navigateTo('/newspaper/editions')} className="hover:text-white transition-colors cursor-pointer">Editions Desk</button></li>
                <li><button onClick={() => navigateTo('/newspaper/front-page')} className="hover:text-white transition-colors cursor-pointer">Front Page Planner</button></li>
                <li><button onClick={() => navigateTo('/newspaper/page-designer')} className="hover:text-white transition-colors cursor-pointer">8-Col Page Designer</button></li>
                <li><button onClick={() => navigateTo('/production/queue')} className="hover:text-white transition-colors cursor-pointer">Night Press Queue</button></li>
                <li><button onClick={() => navigateTo('/production/downloads')} className="hover:text-white transition-colors cursor-pointer">Vector PDF Downloads</button></li>
              </ul>
            </div>

            {/* Links 3: Statutory Policies */}
            <div className="md:col-span-2 space-y-3 text-xs">
              <div className="font-bold text-white uppercase tracking-wider text-[11px]">Legal & Policies</div>
              <ul className="space-y-2 text-slate-400">
                <li><button onClick={() => navigateTo('/legal')} className="hover:text-white transition-colors cursor-pointer">Privacy Policy (DPDP)</button></li>
                <li><button onClick={() => navigateTo('/legal')} className="hover:text-white transition-colors cursor-pointer">Terms of Service</button></li>
                <li><button onClick={() => navigateTo('/legal')} className="hover:text-white transition-colors cursor-pointer">PCI Editorial Ethics</button></li>
                <li><button onClick={() => navigateTo('/legal')} className="hover:text-white transition-colors cursor-pointer">Grievance Redressal</button></li>
                <li><button onClick={() => navigateTo('/legal')} className="hover:text-white transition-colors cursor-pointer">Section 194J Royalty</button></li>
              </ul>
            </div>

            {/* Links 4: Indian Bureaus */}
            <div className="md:col-span-2 space-y-3 text-xs">
              <div className="font-bold text-white uppercase tracking-wider text-[11px]">Indian Bureaus</div>
              <div className="space-y-2.5 text-slate-400 text-[11px]">
                <div>
                  <strong className="text-white block">New Delhi Bureau:</strong>
                  Press Club Road, New Delhi - 110001
                </div>
                <div>
                  <strong className="text-white block">Hyderabad Tech Hub:</strong>
                  Press Towers, HITEC City - 500081
                </div>
                <div className="pt-1 text-blue-400 font-medium">
                  Phone: +91 40 2388 9911<br />
                  Email: desk@newspress-india.org
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div>
              © 2026 <strong>NewsPress Platform Pvt. Ltd.</strong> All Rights Reserved.
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span>RNI Regd: IND-TEL-99182</span>
              <span>•</span>
              <span>CERT-In Empanelled Cloud (Mumbai / Delhi)</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

/* =========================================================================
   CAROUSEL SLIDES DATA (REAL PHOTOGRAPHY & DUAL LANGUAGE EN / HI)
   ========================================================================= */
interface Slide {
  image: string;
  tag: { en: string; hi: string };
  shortTitle: { en: string; hi: string };
  title: { en: string; hi: string };
  subtitle: { en: string; hi: string };
  description: { en: string; hi: string };
  bullets: { en: string[]; hi: string[] };
  ctaPrimary: { en: string; hi: string };
  ctaSecondary: { en: string; hi: string };
  ctaSecondaryLink: string;
  badgeTitle: { en: string; hi: string };
  badgeStatus: string;
  badgeDesc: { en: string; hi: string };
  badgeMetric1: string;
  badgeMetric2: string;
}

const SLIDES: Slide[] = [
  {
    image: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&auto=format&fit=crop&q=80',
    tag: {
      en: 'High-Speed Web-Offset Printing',
      hi: 'हाई-स्पीड वेब-ऑफसेट प्रिंटिंग',
    },
    shortTitle: {
      en: 'Offset Press',
      hi: 'ऑफसेट प्रेस',
    },
    title: {
      en: 'Zero-Delay Night Press Lock & 300+ DPI Vector PDF Plates',
      hi: 'जीरो-डिली नाइट प्रेस लॉक और 300+ DPI वेक्टर प्लेट्स',
    },
    subtitle: {
      en: 'Guaranteed 10:00 PM IST Midnight Distribution Deadlines',
      hi: 'रात 10:00 बजे की समयसीमा पर स्वचालित मुद्रण गारंटी',
    },
    description: {
      en: 'Automated CMYK color separation, Indic complex font embedding, and instant direct routing to regional printing presses across India.',
      hi: 'स्वचालित सीएमवाईके कलर सेपरेशन और भारतीय लिपियों के सही विन्यास के साथ सभी प्रिंटिंग प्रेसों को समय पर डिजिटल प्लेट्स का हस्तांतरण।',
    },
    bullets: {
      en: [
        'HarfBuzz Indic font shaping with zero broken ligatures',
        '8-column broadsheet and tabloid automatic pagination',
        'Automatic low-DPI image guards and preflight checks',
        'SHA-256 tamper-proof cryptographic audit seal',
      ],
      hi: [
        'हर्फ़बज़ इंजन द्वारा हिंदी व क्षेत्रीय लिपियों का शुद्ध विन्यास',
        '8-कॉलम ब्रॉडशीट और टैब्लॉइड स्वचालित पेजिनेशन',
        'लो-डीपीआई चित्रों और फॉन्ट त्रुटियों की स्वचालित जांच',
        'SHA-256 डिजिटल सील के साथ छेड़छाड़-मुक्त मुद्रण प्लेट',
      ],
    },
    ctaPrimary: {
      en: 'Explore Production Queue',
      hi: 'प्रोडक्शन कतार देखें',
    },
    ctaSecondary: {
      en: 'Download Sample Plate',
      hi: 'सैंपल प्लेट डाउनलोड करें',
    },
    ctaSecondaryLink: '/production/queue',
    badgeTitle: {
      en: 'Night Press Lock Monitor',
      hi: 'नाइट प्रेस लॉक मॉनिटर',
    },
    badgeStatus: 'LOCKED ✓',
    badgeDesc: {
      en: 'Plate Package #9812 verified and transmitted to rotary plant.',
      hi: 'प्लेट पैकेज #9812 सत्यापित और रोटरी प्लांट को प्रेषित।',
    },
    badgeMetric1: 'DPI: 300 (Vector CMYK)',
    badgeMetric2: 'Time: 09:42 PM IST',
  },
  {
    image: 'https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=1200&auto=format&fit=crop&q=80',
    tag: {
      en: 'Press Council of India Aligned AI',
      hi: 'प्रेस परिषद के अनुरूप एआई डेस्क',
    },
    shortTitle: {
      en: 'Editorial AI',
      hi: 'संपादकीय एआई',
    },
    title: {
      en: 'AI Editorial Desk with Originality Scoring & Anti-Plagiarism Shield',
      hi: 'ओरिजिनैलिटी स्कोरिंग और साहित्यिक चोरी से सुरक्षा युक्त एआई डेस्क',
    },
    subtitle: {
      en: 'Safeguard Journalistic Integrity Under PCI Norms',
      hi: 'पीसीआई दिशानिर्देशों के तहत पत्रकारिता की विश्वसनीयता सुनिश्चित करें',
    },
    description: {
      en: 'Real-time plagiarism screening, defamation risk alerts, and automated copy-fitting calibrated specifically for Indian language daily publishing.',
      hi: 'साहित्यिक चोरी की स्वचालित जांच, मानहानि के जोखिमों से सुरक्षा और कॉलम की चौड़ाई के अनुसार हेडलाइन को सटीक बैठाने की सुविधा।',
    },
    bullets: {
      en: [
        'Strict ≥85% originality threshold for wire publication',
        'Defamation and contempt screening against PCI guidelines',
        'Column-aware headline fitting in English & Indic scripts',
        'Transparent human-in-the-loop audit logs for all edits',
      ],
      hi: [
        'प्रकाशन के लिए न्यूनतम 85% मौलिकता अनिवार्य',
        'प्रेस परिषद के नियमों के अनुसार मानहानि जांच',
        'कॉलम के आकार के अनुसार हेडलाइन का स्वतः समायोजन',
        'प्रत्येक संपादन के लिए पारदर्शी ऑडिट लॉग',
      ],
    },
    ctaPrimary: {
      en: 'Test Originality Desk',
      hi: 'ओरिजिनैलिटी डेस्क देखें',
    },
    ctaSecondary: {
      en: 'View Editorial Workflow',
      hi: 'संपादकीय कार्यप्रवाह',
    },
    ctaSecondaryLink: '/newsroom/editorial-queue',
    badgeTitle: {
      en: 'Originality Radar Score',
      hi: 'ओरिजिनैलिटी राडार स्कोर',
    },
    badgeStatus: '98.4% UNIQUE',
    badgeDesc: {
      en: 'Corroborated across 50,000+ wire dispatches. 0% plagiarism detected.',
      hi: '50,000+ वायर खबरों से मिलान किया गया। 0% साहित्यिक चोरी।',
    },
    badgeMetric1: 'Fact Check: PASS',
    badgeMetric2: 'PCI Aligned ✓',
  },
  {
    image: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200&auto=format&fit=crop&q=80',
    tag: {
      en: '5,000+ Accredited Indian Stringers',
      hi: '5,000+ मान्यता प्राप्त संवाददाता',
    },
    shortTitle: {
      en: 'Stringer Wire',
      hi: 'स्ट्रिंगर वायर',
    },
    title: {
      en: 'India\'s 1st Syndicated Reporter Wire with Instant UPI Royalties',
      hi: 'भारत का पहला सिंडिकेटेड वायर • पत्रकारों को तुरंत यूपीआई रॉयल्टी',
    },
    subtitle: {
      en: 'Fair Royalties Settled in Under 60 Seconds via RazorpayX',
      hi: 'रेज़रपे एक्स के माध्यम से 60 सेकंड में पारदर्शी भुगतान',
    },
    description: {
      en: 'Connect rural correspondents, district investigative journalists, and national media houses with automated copyright licensing and Section 194J TDS compliance.',
      hi: 'ग्रामीण और जिला स्तर के संवाददाताओं को बड़े अखबारों से जोड़ें। स्वचालित कॉपीराइट लाइसेंसिंग और कानूनी टीडीएस कटौती की पारदर्शी व्यवस्था।',
    },
    bullets: {
      en: [
        'Instant UPI payments settled directly to reporter bank accounts',
        'Digital Form 16A quarterly certificates generated automatically',
        'Exclusive and non-exclusive broadsheet print licenses',
        'Mobile dispatch app with camera photo and GPS coordinates',
      ],
      hi: [
        'पत्रकार के बैंक व यूपीआई खाते में तुरंत भुगतान',
        'डिजिटल फॉर्म 16A प्रमाणपत्र स्वतः तैयार',
        'विशेष और गैर-विशेष प्रिंट अधिकार लाइसेंस',
        'मोबाइल से सीधे फोटो और जीपीएस के साथ खबर भेजने की सुविधा',
      ],
    },
    ctaPrimary: {
      en: 'Explore Wire Marketplace',
      hi: 'वायर मार्केटप्लेस देखें',
    },
    ctaSecondary: {
      en: 'Join as Freelance Reporter',
      hi: 'संवाददाता के रूप में जुड़ें',
    },
    ctaSecondaryLink: '/marketplace',
    badgeTitle: {
      en: 'UPI Royalty Settlement',
      hi: 'यूपीआई रॉयल्टी ट्रांसफर',
    },
    badgeStatus: 'PAID IN 42s',
    badgeDesc: {
      en: '₹2,400 royalty credited to journalist@upi for Warangal field report.',
      hi: 'वारंगल खोजी खबर के लिए ₹2,400 की रॉयल्टी सीधे खाते में जमा।',
    },
    badgeMetric1: 'TDS (194J): 2% Deducted',
    badgeMetric2: 'RazorpayX Transferred',
  },
  {
    image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&auto=format&fit=crop&q=80',
    tag: {
      en: 'Multi-Tenant Regional Editions',
      hi: 'मल्टी-टेनेंट क्षेत्रीय संस्करण',
    },
    shortTitle: {
      en: 'Regional Pullouts',
      hi: 'जिला पुलआउट्स',
    },
    title: {
      en: 'Manage 50+ District Pullouts & State Editions on One Unified Cloud',
      hi: '50+ जिला संस्करण और राज्य सप्लीमेंट्स एक ही एकीकृत क्लाउड पर',
    },
    subtitle: {
      en: 'Independent Bureau Desks with Cryptographic Tenant Isolation',
      hi: 'पूर्ण सुरक्षा और गोपनीयता के साथ स्वतंत्र जिला ब्यूरो कार्यप्रवाह',
    },
    description: {
      en: 'Effortlessly synchronize front-page planners, local advertising split runs, and midnight press deadlines across every printing facility.',
      hi: 'राज्य की मुख्य खबरों के साथ-साथ जिला स्तर के 4 से 8 पेज के लोकल सप्लीमेंट्स को बिना किसी भ्रम के तेजी से तैयार करें।',
    },
    bullets: {
      en: [
        'Dynamic regional advertising splits without redesigning pages',
        'Dedicated editorial roles for Bureau Chiefs and Sub-Editors',
        'Real-time edition readiness gauge and preflight scoring',
        'Timezone-aware night press lock schedules across print hubs',
      ],
      hi: [
        'पेज दोबारा बनाए बिना क्षेत्रीय विज्ञापनों का स्वतः बदलाव',
        'ब्यूरो चीफ और सब-एडिटर्स के लिए सुरक्षित भूमिकाएं',
        'वास्तविक समय में संस्करण की तैयारी और प्रीफ्लाइट स्कोर',
        'प्रिंट हब के अनुसार नाइट प्रेस लॉक का स्वतः प्रबंधन',
      ],
    },
    ctaPrimary: {
      en: 'View Edition Matrix',
      hi: 'संस्करण मैट्रिक्स देखें',
    },
    ctaSecondary: {
      en: 'Open Page Designer',
      hi: 'पेज डिजाइनर खोलें',
    },
    ctaSecondaryLink: '/newspaper/editions',
    badgeTitle: {
      en: 'Regional Edition Cluster',
      hi: 'क्षेत्रीय संस्करण क्लस्टर',
    },
    badgeStatus: '64 EDITIONS LIVE',
    badgeDesc: {
      en: 'All regional tabs synchronized for Delhi, Jaipur, Indore and Raipur.',
      hi: 'दिल्ली, जयपुर, इंदौर और रायपुर के सभी संस्करण समन्वयित।',
    },
    badgeMetric1: 'Make-Ready: -38%',
    badgeMetric2: 'Ad Yield: +24%',
  },
];

/* =========================================================================
   INDIAN EDITORS TESTIMONIALS DATA (REAL PORTRAITS & DUAL EN / HI)
   ========================================================================= */
interface TestimonialItem {
  id: string;
  name: { en: string; hi: string };
  role: { en: string; hi: string };
  publication: string;
  category: 'national' | 'regional' | 'hindi' | 'wire';
  photo: string;
  quote: { en: string; hi: string };
  metric: string;
}

const TESTIMONIALS: TestimonialItem[] = [
  {
    id: 'eenadu-raghava',
    name: {
      en: 'K. Raghava Rao',
      hi: 'के. राघव राव',
    },
    role: {
      en: 'Former Executive Editor, Hyderabad',
      hi: 'पूर्व कार्यकारी संपादक, हैदराबाद',
    },
    publication: 'Eenadu (ईनाडु)',
    category: 'regional',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    quote: {
      en: 'Coordinating 23 district pullouts used to be five hours of late-night telephone chaos. With NewsPress Indic shaping and automated templates, our night press runs begin 45 minutes ahead of schedule without a single broken glyph.',
      hi: '23 जिला संस्करणों का समन्वय पहले आधी रात को फोन पर होने वाली अफरातफरी थी। न्यूज़प्रेस के स्वचालित टेम्पलेट्स और हर्फ़बज़ इंजन के कारण बिना किसी टूटे अक्षर के हमारा प्रिंट रन 45 मिनट पहले शुरू हो जाता है।',
    },
    metric: '-45 min Night Press Start',
  },
  {
    id: 'hindu-madhav',
    name: {
      en: 'Madhav Narayan',
      hi: 'माधव नारायण',
    },
    role: {
      en: 'Consulting Senior Editor, Chennai / Delhi',
      hi: 'कंसल्टिंग सीनियर एडिटर, चेन्नई / दिल्ली',
    },
    publication: 'The Hindu (द हिंदू)',
    category: 'national',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
    quote: {
      en: 'In 34 years in Indian journalism, I haven\'t seen a SaaS platform that respects both editorial independence and print rigor. The PCI-aligned fact-checking and originality detection shield us from defamatory feeds while protecting freelance reporters\' rights.',
      hi: 'भारतीय पत्रकारिता में 34 वर्षों में मैंने ऐसा कोई सॉफ्टवेयर नहीं देखा जो संपादकीय स्वतंत्रता और मुद्रण की गुणवत्ता दोनों का सम्मान करता हो। पीसीआई-अनुरूप ओरिजिनैलिटी जांच हमें मानहानि से बचाती है।',
    },
    metric: '100% PCI Ethics Compliance',
  },
  {
    id: 'bhaskar-sunil',
    name: {
      en: 'Sunil Sharma',
      hi: 'सुनील शर्मा',
    },
    role: {
      en: 'Bureau Chief & Night Desk Head, Bhopal',
      hi: 'ब्यूरो चीफ व नाइट डेस्क प्रमुख, भोपाल',
    },
    publication: 'Dainik Bhaskar (दैनिक भास्कर)',
    category: 'hindi',
    photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&auto=format&fit=crop&q=80',
    quote: {
      en: 'Managing 64 regional pullouts with dynamic advertising splits was an operational nightmare. NewsPress handles CMYK vector PDF export with industrial reliability. Our press plants in Indore and Raipur receive flawless vector broadsheets every midnight.',
      hi: 'विज्ञापनों के अलग-अलग बदलावों के साथ 64 क्षेत्रीय संस्करण चलाना बहुत कठिन कार्य था। न्यूज़प्रेस सीएमवाईके वेक्टर पीडीएफ को पूर्ण विश्वसनीयता के साथ निर्यात करता है। हमारे सभी प्रिंटिंग प्लांट्स को आधी रात को सही प्लेट्स मिलती हैं।',
    },
    metric: '64 Regional Editions Locked',
  },
  {
    id: 'manorama-raja',
    name: {
      en: 'Rajasekharan Nair',
      hi: 'राजशेखरन नायर',
    },
    role: {
      en: 'Technical Director & Production Head, Kottayam',
      hi: 'तकनीकी निदेशक व प्रोडक्शन प्रमुख, कोट्टायम',
    },
    publication: 'Malayala Manorama (मलयला मनोरमा)',
    category: 'national',
    photo: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300&auto=format&fit=crop&q=80',
    quote: {
      en: 'The vector PDF engine with preflight verification guarantees that our press operators never encounter font dropouts or low-res images. It has reduced our rotary press make-ready time by 38%.',
      hi: 'वेक्टर पीडीएफ इंजन और प्रीफ्लाइट जांच यह सुनिश्चित करती है कि हमारे प्रिंटिंग प्रेस ऑपरेटरों को कभी भी फॉन्ट गायब होने या कम रेजोल्यूशन की तस्वीरों का सामना न करना पड़े। इसने तैयारी का समय 38% घटा दिया है।',
    },
    metric: '38% Faster Make-Ready Time',
  },
  {
    id: 'lokmat-vikram',
    name: {
      en: 'Vikram Deshmukh',
      hi: 'विक्रम देशमुख',
    },
    role: {
      en: 'Senior Wire Editor, Mumbai / Pune',
      hi: 'वरिष्ठ वायर संपादक, मुंबई / पुणे',
    },
    publication: 'Lokmat Media (लोकमत)',
    category: 'wire',
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
    quote: {
      en: 'The reporter marketplace with instant RazorpayX payouts has revolutionized rural reporting. Stringers receive fair royalties within minutes, and publishers obtain ironclad copyright and GST invoices.',
      hi: 'रेज़रपे एक्स के माध्यम से तत्काल भुगतान वाले रिपोर्टर मार्केटप्लेस ने ग्रामीण पत्रकारिता में क्रांति ला दी है। संवाददाताओं को मिनटों में उचित रॉयल्टी मिलती है और प्रकाशकों को सुरक्षित कॉपीराइट और जीएसटी इनवॉइस प्राप्त होता है।',
    },
    metric: 'Instant UPI Royalties Paid',
  },
  {
    id: 'syndicate-aruna',
    name: {
      en: 'Aruna Ramamurthy',
      hi: 'अरुणा राममूर्ति',
    },
    role: {
      en: 'Managing Editor, National Press Syndicate, Delhi',
      hi: 'प्रबंध संपादक, नेशनल प्रेस सिंडिकेट, दिल्ली',
    },
    publication: 'Indian Express Wire Group',
    category: 'national',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
    quote: {
      en: 'For independent journalists and grassroots stringers, NewsPress has created a dignified economic model. Field dispatches with verified coordinates turn into finished print broadsheets in minutes.',
      hi: 'स्वतंत्र पत्रकारों और जमीनी संवाददाताओं के लिए न्यूज़प्रेस ने एक सम्मानजनक आर्थिक मॉडल तैयार किया है। सत्यापित जीपीएस के साथ आने वाली खबरें कुछ ही मिनटों में तैयार प्रिंट पेज बन जाती हैं।',
    },
    metric: '180+ Rural Stringers Active',
  },
];

/* =========================================================================
   WIRE STORIES DATA (WITH REAL EDITORIAL PHOTOGRAPHY)
   ========================================================================= */
interface WireStory {
  id: string;
  image: string;
  district: string;
  originality: number;
  title: { en: string; hi: string };
  summary: { en: string; hi: string };
  price: number;
}

const WIRE_STORIES: WireStory[] = [
  {
    id: 'w1',
    image: 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=600&auto=format&fit=crop&q=80',
    district: 'Warangal / Rural',
    originality: 98,
    title: {
      en: 'Drone Survey Uncovers Spurious Seed Distribution Ring in Cotton Belt',
      hi: 'ड्रोन सर्वेक्षण ने कपास पट्टी में नकली बीज वितरण गिरोह का भंडाफोड़ किया',
    },
    summary: {
      en: 'Exclusive photographic evidence of unapproved BT-seed packaging units operating in rural district boundaries.',
      hi: 'ग्रामीण जिला सीमाओं में अवैध रूप से चल रही बिना मंजूरी वाली बीज पैकेजिंग इकाइयों के साक्ष्य।',
    },
    price: 2400,
  },
  {
    id: 'w2',
    image: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=600&auto=format&fit=crop&q=80',
    district: 'Jaipur / Energy',
    originality: 96,
    title: {
      en: 'Thar Solar Micro-Grid Powers 14 Off-Grid Desert Hamlets',
      hi: 'थार सोलर माइक्रो-ग्रिड से 14 दूरदराज के रेगिस्तानी गांवों में बिजली पहुंची',
    },
    summary: {
      en: 'How localized decentralized battery storage changed nighttime healthcare and schooling in border villages.',
      hi: 'सीमावर्ती गांवों में विकेंद्रीकृत बैटरी भंडारण ने स्वास्थ्य सेवाओं और स्कूलों की तस्वीर कैसे बदली।',
    },
    price: 1800,
  },
  {
    id: 'w3',
    image: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=600&auto=format&fit=crop&q=80',
    district: 'Delhi / Judicial',
    originality: 99,
    title: {
      en: 'High Court Mandates Digital Summons via Encrypted Messaging for Cheque Bounces',
      hi: 'उच्च न्यायालय ने चेक बाउंस मामलों में डिजिटल समन भेजने का दिया निर्देश',
    },
    summary: {
      en: 'Judicial reform reduces average pre-trial service delay from 11 months to 48 hours across magistrate courts.',
      hi: 'न्यायिक सुधार से मजिस्ट्रेट अदालतों में मुकदमों की सुनवाई में होने वाली देरी 11 महीने से घटकर 48 घंटे रह गई।',
    },
    price: 3200,
  },
  {
    id: 'w4',
    image: 'https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?w=600&auto=format&fit=crop&q=80',
    district: 'Mumbai / Markets',
    originality: 94,
    title: {
      en: 'SEBI Tightens Algo-Trading Safeguards to Curb Retail Derivates Volatility',
      hi: 'सेबी ने खुदरा डेरिवेटिव्स में उतार-चढ़ाव रोकने के लिए एल्गो-ट्रेडिंग नियम कड़े किए',
    },
    summary: {
      en: 'New margin multipliers and mandatory retail risk disclosures roll out across NSE and BSE equity derivatives.',
      hi: 'एनएसई और बीएसई इक्विटी डेरिवेटिव्स में नए मार्जिन नियम और जोखिम प्रकटीकरण अनिवार्य किए गए।',
    },
    price: 2800,
  },
];
