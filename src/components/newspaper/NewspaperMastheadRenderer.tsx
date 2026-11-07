/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Newspaper Masthead Renderer
 * Renders 5 fundamentally distinct newspaper masthead architectural designs:
 * 1. Classic Century Broadsheet (Twin Ears & Oxford Rules)
 * 2. Vernacular Dual-Ear Ribbon (Indian Regional Standard - Eenadu / Sakshi / Bhaskar style)
 * 3. Modern Tabloid & Metro Compact (Asymmetric Hero Block + "Inside Today" Story Pointers)
 * 4. Imperial Royal Herald (Tri-Partite Flanked Editorial Medallion & Audit Crest)
 * 5. Commercial Header Plate (Top Leaderboard Banner Ad + Full-Bleed Artwork + Multi-City Tabs)
 */

import React from 'react';
import { NewspaperBrand } from '../../types/edition';

export interface NewspaperMastheadRendererProps {
  brand: NewspaperBrand;
  publicationDate?: string;
  editionName?: string;
  isCompact?: boolean;
  className?: string;
}

export const NewspaperMastheadRenderer: React.FC<NewspaperMastheadRendererProps> = ({
  brand,
  publicationDate = 'Friday, November 7, 2026',
  editionName,
  isCompact = false,
  className = '',
}) => {
  const masthead = brand.masthead || {
    title: brand.name,
    fontFamily: 'Cinzel, serif',
    fontSizePt: 52,
    style: 'classic_blackletter',
    showDate: true,
    showEditionNumber: true,
    showPrice: true,
    borderColor: '#0f172a',
  };

  const isTelugu = brand.language === 'te' || brand.name?.includes('తెలుగు') || brand.name?.includes('ఆంధ్ర');
  const logoUrl = masthead.logoUrl || brand.logoUrl;
  const hasLogo = !!logoUrl;
  const showLogo = masthead.showLogo !== false && hasLogo;
  
  // Custom-designed logo is the primary title! Text title is optional (defaults to false when logo is present)
  const showTitleText = masthead.showTitleText === true || (!showLogo && !hasLogo);
  
  const logoPlacement = masthead.logoPlacement || 'center';
  const logoHeight = masthead.logoHeightPx || (isCompact ? 46 : 64);
  const borderColor = masthead.borderColor || '#0f172a';
  const titleColor = brand.colors?.primary || '#0f172a';

  const vol = brand.volumeNumber || 132;
  const issue = brand.issueNumber || 47822;
  const price = masthead.priceText || brand.price || '₹5.00';
  const frequencyLabel = (brand.frequency || 'daily').toUpperCase() + ' MORNING EDITION';
  const displayEdition = editionName || (brand.editionsList?.[0] || (isTelugu ? 'హైదరాబాద్ మెయిన్ ఎడిషన్' : 'METROPOLITAN MAIN EDITION'));

  // Detect which of the 5 layout designs is active
  // Fallbacks support templatePreset or templateLayout
  const activePreset = masthead.templateLayout || masthead.templatePreset || '';
  
  const isDesign2Vernacular = 
    activePreset === 'vernacular_ribbon' || 
    activePreset === 'template-andhra-prabha' ||
    (isTelugu && activePreset !== 'template-national-chronicle' && activePreset !== 'template-metro-express' && activePreset !== 'template-royal-herald' && activePreset !== 'template-full-banner-plate');

  const isDesign3Tabloid = 
    activePreset === 'modern_tabloid' || 
    activePreset === 'template-metro-express';

  const isDesign4Royal = 
    activePreset === 'royal_herald' || 
    activePreset === 'template-royal-herald';

  const isDesign5Commercial = 
    activePreset === 'commercial_banner' || 
    activePreset === 'template-full-banner-plate' ||
    logoPlacement === 'full';

  // Default is Design 1: Classic Century Broadsheet

  // =========================================================================
  // DESIGN 2: VERNACULAR DUAL-EAR RIBBON (Eenadu / Sakshi / Bhaskar Indian Style)
  // =========================================================================
  if (isDesign2Vernacular) {
    return (
      <div className={`bg-white text-slate-900 border-2 border-red-800 shadow-xs relative overflow-hidden select-none font-sans ${className}`}>
        {/* Top Solid Crimson Header Ribbon */}
        <div className="bg-red-800 text-white text-[10px] px-3 py-1 flex items-center justify-between font-bold tracking-wide">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wider">
              {isTelugu ? 'సత్యమేవ జయతే' : 'TRUTH ALONE TRIUMPHS'}
            </span>
            <span className="hidden sm:inline">
              {isTelugu ? '• సమగ్ర జాతీయ, రాష్ట్ర దినపత్రిక' : '• Leading National Regional Daily'}
            </span>
          </div>
          <div className="text-amber-200 font-extrabold uppercase tracking-wider text-[10.5px]">
            {isTelugu ? 'ప్రజా పక్షాన.. నిరంతరం మీతో!' : 'THE PEOPLE’S VOICE • MORNING DAILY'}
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-red-100 text-[9px]">e-Paper: epaper.daily.in</span>
            <span className="bg-amber-400 text-red-950 px-2 py-0.2 rounded font-black text-[9.5px]">
              వెల: {price}
            </span>
          </div>
        </div>

        {/* Middle Deck: Left Front-Page Ear AD + Center Calligraphic Logo & Circular Edition Seal + Right Ad Box */}
        <div className="px-3 py-2 flex items-center justify-between gap-3 bg-red-50/15">
          {/* LEFT FRONT-PAGE SPONSOR EAR AD (4cm x 5cm) */}
          <div className="hidden sm:flex flex-col justify-between w-[130px] h-[75px] border-2 border-dashed border-red-700/60 bg-red-50/50 p-1.5 text-center shrink-0 rounded">
            <div className="text-[7.5px] font-bold text-red-800 uppercase tracking-widest border-b border-red-200 pb-0.5">
              {isTelugu ? 'ముందు పేజీ ప్రకటన స్థలం' : 'FRONT-PAGE EAR AD'}
            </div>
            <div className="text-[8.5px] font-semibold text-slate-700 leading-tight">
              {isTelugu ? 'ఈ స్థలంలో మీ వ్యాపార ప్రకటనకు సంప్రదించండి' : 'Your Brand Ad Spotlight Here (4cm × 5cm)'}
            </div>
            <div className="text-[7.5px] font-bold text-red-900 bg-red-100/80 rounded py-0.2">
              📞 1800-200-NEWS
            </div>
          </div>

          {/* CENTER: LOGO ARTWORK + CIRCULAR STAMPED EDITION BADGE */}
          <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-3 text-center px-1">
            {/* Logo in Center */}
            <div className="flex flex-col items-center justify-center">
              {showLogo && (
                <img
                  src={logoUrl}
                  alt="Vernacular Masthead Logo"
                  style={{ maxHeight: `${logoHeight + 4}px` }}
                  className="object-contain max-w-[95%] drop-shadow-2xs"
                />
              )}

              {/* Optional Text Title */}
              {showTitleText && (
                <h1
                  className="font-bold tracking-tight uppercase leading-none my-1"
                  style={{
                    fontFamily: masthead.fontFamily || "'Ramabhadra', serif",
                    fontSize: `${isCompact ? 32 : masthead.fontSizePt * 0.75}px`,
                    color: '#991b1b',
                  }}
                >
                  {masthead.title || brand.name}
                </h1>
              )}

              {masthead.subtitle && (
                <p className="text-[10px] font-bold text-slate-700 mt-0.5">
                  {masthead.subtitle}
                </p>
              )}
            </div>

            {/* Circular Stamped Regional Edition Badge (Authentic Indian newspaper hallmark) */}
            <div className="hidden md:flex flex-col items-center justify-center w-[68px] h-[68px] rounded-full border-2 border-red-800 bg-red-50 text-red-950 p-1 shadow-xs shrink-0 text-center">
              <span className="text-[7px] font-bold uppercase tracking-wider text-red-700">EDITION</span>
              <span className="text-[9.5px] font-black leading-tight text-red-900">{isTelugu ? 'హైదరాబాద్' : 'HYD'}</span>
              <span className="text-[6.5px] font-semibold text-slate-600 mt-0.5">ESTD 1894</span>
            </div>
          </div>

          {/* RIGHT FRONT-PAGE EAR AD / BULLION BOX */}
          <div className="hidden sm:flex flex-col justify-between w-[130px] h-[75px] border-2 border-red-800/40 bg-white p-1.5 text-center shrink-0 rounded">
            <div className="text-[7.5px] font-bold text-red-900 uppercase tracking-widest border-b border-red-200 pb-0.5">
              {isTelugu ? 'నేటి మార్కెట్ విశేషాలు' : 'TODAY’S MARKETS'}
            </div>
            <div className="text-[8px] text-slate-700 space-y-0.5 text-left pl-1">
              <div>{isTelugu ? 'బంగారం 24K: ₹78,850 ▲' : 'Gold 24K: ₹78,850 ▲'}</div>
              <div>{isTelugu ? 'వెండి 1kg: ₹92,400 ▲' : 'Silver 1kg: ₹92,400 ▲'}</div>
              <div>{isTelugu ? 'సెన్సెక్స్: 82,410 (+420)' : 'Sensex: 82,410 ▲'}</div>
            </div>
            <div className="text-[7px] text-slate-500 font-medium text-right pr-1">
              {isTelugu ? 'హైదరాబాద్ బులియన్' : 'Bullion Rates'}
            </div>
          </div>
        </div>

        {/* Bottom Solid Crimson Triple Rule Dateline Bar */}
        <div className="bg-red-900 text-white text-[9.5px] font-bold px-3 py-1 flex justify-between items-center border-t-2 border-red-950">
          <span>{publicationDate}</span>
          <span className="tracking-widest uppercase">
            {displayEdition} • సంపుటి: {vol} • సంచిక: {issue} • పేజీలు: {brand.pageCount || 16}
          </span>
          <span className="text-amber-300 font-mono text-[9px]">
            {brand.imprint?.rniNumber || 'RNI: AP/TEL/1894/01'}
          </span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // DESIGN 3: MODERN TABLOID & METRO COMPACT (The Guardian / Metro Urban Style)
  // =========================================================================
  if (isDesign3Tabloid) {
    return (
      <div className={`bg-white text-slate-900 border border-slate-300 shadow-xs relative overflow-hidden select-none font-sans ${className}`}>
        {/* Asymmetrical 2-Block Grid Header */}
        <div className="grid grid-cols-1 md:grid-cols-12 border-b border-slate-300">
          {/* LEFT 5 COLS: HERO BRAND BLOCK (Solid Cobalt Blue) */}
          <div className="md:col-span-5 bg-blue-700 text-white p-3 flex flex-col justify-between relative">
            <div className="flex items-center justify-between text-[9px] uppercase tracking-wider font-bold text-blue-200 border-b border-blue-600/60 pb-1 mb-2">
              <span>{frequencyLabel}</span>
              <span className="bg-amber-400 text-blue-950 font-black px-1.5 py-0.2 rounded text-[8.5px]">PRICE: {price}</span>
            </div>

            <div className="my-1 flex items-center justify-center md:justify-start">
              {showLogo && (
                <img
                  src={logoUrl}
                  alt="Metro Tabloid Logo"
                  style={{ maxHeight: `${logoHeight + 6}px` }}
                  className="object-contain max-w-full drop-shadow"
                />
              )}
              {showTitleText && (
                <h1 className="text-2xl font-black tracking-tight text-white uppercase leading-none">
                  {masthead.title || brand.name}
                </h1>
              )}
            </div>

            <div className="text-[9.5px] text-blue-100 font-medium tracking-wide mt-1">
              {masthead.subtitle || 'THE FASTEST DAILY URBAN MORNING CHRONICLE'}
            </div>
          </div>

          {/* RIGHT 7 COLS: "INSIDE TODAY" BREAKING STORY POINTERS (3 Cards Grid) */}
          <div className="md:col-span-7 bg-slate-50 p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-200">
              <span className="text-[10px] font-black uppercase text-blue-900 tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                TODAY’S TOP DISPATCHES & INDEX
              </span>
              <span className="text-[9px] font-bold text-slate-500">24 PAGES TODAY</span>
            </div>

            {/* 3 Story Preview Cards */}
            <div className="grid grid-cols-3 gap-2 text-left">
              <div className="bg-white p-1.5 rounded border border-slate-200 shadow-2xs">
                <span className="bg-red-100 text-red-800 text-[7px] font-black uppercase px-1 rounded block w-fit mb-0.5">EXCLUSIVE</span>
                <p className="text-[8.5px] font-bold text-slate-900 line-clamp-2 leading-tight">
                  State Unveils ₹4,500 Cr Clean Energy Infra Push
                </p>
                <span className="text-[8px] font-bold text-blue-600 block mt-1">PAGE 04 →</span>
              </div>

              <div className="bg-white p-1.5 rounded border border-slate-200 shadow-2xs">
                <span className="bg-blue-100 text-blue-800 text-[7px] font-black uppercase px-1 rounded block w-fit mb-0.5">SPORT</span>
                <p className="text-[8.5px] font-bold text-slate-900 line-clamp-2 leading-tight">
                  India Squad Announced for World Championship
                </p>
                <span className="text-[8px] font-bold text-blue-600 block mt-1">PAGE 12 →</span>
              </div>

              <div className="bg-white p-1.5 rounded border border-slate-200 shadow-2xs">
                <span className="bg-emerald-100 text-emerald-800 text-[7px] font-black uppercase px-1 rounded block w-fit mb-0.5">BUSINESS</span>
                <p className="text-[8.5px] font-bold text-slate-900 line-clamp-2 leading-tight">
                  Tech IPOs Surge 24% on Strong Q3 Inflows
                </p>
                <span className="text-[8px] font-bold text-blue-600 block mt-1">PAGE 08 →</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Minimalist Modern Folio */}
        <div className="bg-slate-100 text-slate-700 text-[9.5px] px-3 py-1 flex items-center justify-between font-semibold">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">{publicationDate}</span>
            <span>•</span>
            <span className="bg-blue-100 text-blue-900 px-1.5 py-0.2 rounded text-[9px] font-bold">
              {displayEdition}
            </span>
            <span>•</span>
            <span>VOL. {vol} • ISSUE #{issue}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-emerald-700 font-bold">AQI: 78 (Good)</span>
            <span>•</span>
            <span>Weather: 28°C Clear</span>
            <span>•</span>
            <span className="font-mono text-[9px]">{brand.imprint?.rniNumber || 'RNI REGISTRATION'}</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // DESIGN 4: IMPERIAL ROYAL HERALD (Victorian Prestige Flanked Columns)
  // =========================================================================
  if (isDesign4Royal) {
    return (
      <div className={`bg-[#fdfbf7] text-[#2c1810] border-2 border-[#7f1d1d] shadow-sm relative overflow-hidden select-none font-serif ${className}`}>
        {/* Top Filigree Line */}
        <div className="text-[9.5px] uppercase tracking-widest bg-[#7f1d1d] text-amber-100 px-3 py-1 flex justify-between font-bold border-b border-[#b45309]">
          <span>┌── ESTABLISHED MDCCCXCIV ──┐</span>
          <span className="tracking-widest font-black text-amber-300">★ ★ ★ THE VOICE OF DIPLOMACY & COMMERCE ★ ★ ★</span>
          <span>PRICE: {price}</span>
        </div>

        {/* Tri-Partite Main Deck */}
        <div className="px-3 py-2.5 flex items-center justify-between gap-3 bg-[#fbf7f0]">
          {/* LEFT FLANKED BOX: EDITORIAL FOUNDING MEDALLION */}
          <div className="hidden sm:block w-[140px] text-center p-1.5 border border-[#b45309]/50 bg-[#fffdf9] rounded shrink-0">
            <div className="text-[7.5px] font-bold uppercase tracking-widest text-[#7f1d1d] border-b border-[#b45309]/30 pb-0.5 mb-1">
              EDITORIAL CHARTER
            </div>
            <p className="text-[8px] italic leading-tight text-[#4a2e18]">
              "Fiat Justitia Ruat Caelum — Truth, Honor & Constitutional Integrity Since 1894."
            </p>
            <div className="text-[7px] text-[#b45309] font-bold mt-1">VOL. {vol} • NO. {issue}</div>
          </div>

          {/* CENTER ROYAL CREST & TITLE */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
            {showLogo && (
              <img
                src={logoUrl}
                alt="Royal Herald Logo"
                style={{ maxHeight: `${logoHeight + 4}px` }}
                className="object-contain max-w-[90%] drop-shadow"
              />
            )}
            {showTitleText && (
              <h1 className="text-3xl font-black tracking-widest text-[#7f1d1d] uppercase my-1">
                {masthead.title || brand.name}
              </h1>
            )}
            {masthead.subtitle && (
              <p className="text-[10px] font-bold text-[#b45309] uppercase tracking-widest mt-0.5">
                ◆ ◆ ◆ {masthead.subtitle} ◆ ◆ ◆
              </p>
            )}
          </div>

          {/* RIGHT FLANKED BOX: OFFICIAL PRESS AUDIT GUARANTEE */}
          <div className="hidden sm:block w-[140px] text-center p-1.5 border border-[#b45309]/50 bg-[#fffdf9] rounded shrink-0">
            <div className="text-[7.5px] font-bold uppercase tracking-widest text-[#7f1d1d] border-b border-[#b45309]/30 pb-0.5 mb-1">
              PRESS GUARANTEE
            </div>
            <p className="text-[8px] font-bold text-[#2c1810] leading-tight">
              Audit Bureau of Circulations (ABC) Certified Class-A Daily Newspaper.
            </p>
            <div className="text-[7px] text-[#b45309] font-mono mt-1 font-bold">
              {brand.imprint?.rniNumber || 'RNI REGISTERED'}
            </div>
          </div>
        </div>

        {/* Bottom Gilded Triple Rule Dateline */}
        <div className="bg-[#7f1d1d] text-amber-100 text-[9.5px] px-3 py-1 flex justify-between items-center font-bold border-t-2 border-[#b45309]">
          <span>{publicationDate}</span>
          <span className="tracking-widest uppercase text-amber-200">
            {displayEdition} • {brand.paperSize?.toUpperCase() || 'BROADSHEET'} 8-COLS • {brand.pageCount || 16} PAGES
          </span>
          <span className="text-amber-300">GOVERNMENT GAZETTE REGISTERED</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // DESIGN 5: COMMERCIAL HEADER PLATE (Top Leaderboard Banner Ad + Multi-City Tabs)
  // =========================================================================
  if (isDesign5Commercial) {
    const fullBannerSrc = masthead.bannerImageUrl || logoUrl;
    return (
      <div className={`bg-white text-slate-900 border border-slate-400 shadow-xs relative overflow-hidden select-none font-sans ${className}`}>
        {/* Top Full-Width Leaderboard Ad Banner (728x60 Print Style) */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 px-3 py-1 flex items-center justify-between text-[10px] font-bold border-b border-amber-600">
          <div className="flex items-center gap-2">
            <span className="bg-red-700 text-white px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase">
              📢 MEGA PROMO
            </span>
            <span className="font-extrabold">
              Book Classifieds & Commercial Display Ads Online | Instant Publishing
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline font-mono font-bold">Toll-Free: 1800-425-NEWS</span>
            <span className="bg-slate-900 text-amber-300 px-2 py-0.2 rounded text-[9px] uppercase tracking-wider font-black">
              BOOK NOW →
            </span>
          </div>
        </div>

        {/* Full Image Banner Plate */}
        <div className="w-full flex items-center justify-center p-1 bg-slate-950">
          <img
            src={fullBannerSrc}
            alt={masthead.title || 'Masthead Banner'}
            className="w-full object-contain max-h-[125px] rounded"
          />
        </div>

        {/* Bottom Multi-City Edition Tabs & Barcode Strip */}
        <div className="bg-slate-900 text-slate-200 text-[9.5px] px-3 py-1 flex flex-col sm:flex-row items-center justify-between gap-1 border-t border-slate-700 font-medium">
          {/* Multi-City Edition Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto text-[8.5px] font-bold">
            <span className="text-amber-400 mr-1 uppercase">EDITIONS:</span>
            <span className="bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded">★ HYDERABAD</span>
            <span className="bg-slate-800 hover:bg-slate-700 px-1.5 py-0.2 rounded">VIJAYAWADA</span>
            <span className="bg-slate-800 hover:bg-slate-700 px-1.5 py-0.2 rounded">VISAKHAPATNAM</span>
            <span className="bg-slate-800 hover:bg-slate-700 px-1.5 py-0.2 rounded">BENGALURU</span>
            <span className="bg-slate-800 hover:bg-slate-700 px-1.5 py-0.2 rounded">NEW DELHI</span>
          </div>

          {/* Right Barcode & Live Dateline */}
          <div className="flex items-center gap-2 text-[9px]">
            <span>{publicationDate}</span>
            <span>•</span>
            <span className="font-mono text-amber-300">VOL. {vol} / ISSUE #{issue}</span>
            <span>•</span>
            <span className="font-mono tracking-widest text-[8px] bg-white text-slate-950 px-1 py-0.2 font-black rounded">
              |||| ||| |||| | ||
            </span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // DESIGN 1 (DEFAULT): CLASSIC CENTURY BROADSHEET (Twin Ears & Oxford Rules)
  // =========================================================================
  return (
    <div
      className={`bg-[#fdfdfc] text-slate-900 border border-slate-300 shadow-xs relative overflow-hidden select-none font-serif ${className}`}
      style={{
        borderTop: `4px solid ${borderColor}`,
        borderBottom: `2px solid ${borderColor}`,
      }}
    >
      {/* Top Hairline Folio Bar */}
      <div className="text-[9.5px] uppercase tracking-widest border-b border-slate-200 px-3 py-1 flex justify-between text-slate-700 bg-slate-50/70 font-sans font-semibold">
        <div className="flex items-center gap-2">
          <span>FOUNDED 1894 • THE VOICE OF RECORD</span>
          <span>•</span>
          <span>VOL. {vol}</span>
          <span>•</span>
          <span>ISSUE #{issue}</span>
        </div>
        <span className="text-slate-900 font-bold tracking-widest">{frequencyLabel}</span>
        <span className="font-bold text-slate-900">PRICE: {price}</span>
      </div>

      {/* Main Masthead Container with Twin Classical Ears */}
      <div className="px-3 py-2 flex items-center justify-between gap-3">
        {/* LEFT EAR (Almanac & Regional Weather) */}
        <div className="hidden sm:block w-[135px] text-[8.5px] leading-tight border-r border-slate-200 pr-2 text-slate-700 text-left shrink-0 font-sans">
          <div className="font-bold text-slate-900 border-b border-slate-200 pb-0.5 mb-0.5 tracking-wider">
            {isTelugu ? 'పంచాంగం & వాతావరణం' : 'ALMANAC & WEATHER'}
          </div>
          <div>{isTelugu ? 'సూర్యోదయం: 06:12 • అస్తమయం: 17:48' : 'Sunrise: 06:12 • Sunset: 17:48'}</div>
          <div className="font-semibold text-slate-800 mt-0.5">
            {isTelugu ? 'హైదరాబాద్: గరిష్ఠం 31°C • కనిష్ఠం 21°C' : 'Capital: Max 31°C • Min 21°C'}
          </div>
        </div>

        {/* CENTER / BRAND MASTHEAD SECTION */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-1 overflow-hidden">
          {/* Logo in CENTER (Primary Title Artwork) */}
          {showLogo && logoPlacement === 'center' && (
            <div className="my-1 flex items-center justify-center w-full">
              <img
                src={logoUrl}
                alt="Newspaper Masthead Logo"
                style={{ maxHeight: `${logoHeight}px` }}
                className="object-contain max-w-[85%] rounded drop-shadow-2xs"
              />
            </div>
          )}

          {/* Left/Right Placements */}
          <div className="flex items-center justify-center gap-4 w-full">
            {showLogo && logoPlacement === 'left' && (
              <div className="shrink-0 flex items-center">
                <img
                  src={logoUrl}
                  alt="Newspaper Masthead Logo"
                  style={{ maxHeight: `${logoHeight}px` }}
                  className="object-contain max-w-[320px] rounded drop-shadow-2xs"
                />
              </div>
            )}

            {showTitleText && (
              <div className="flex-1 text-center">
                <h1
                  className="font-bold tracking-tight uppercase leading-none my-0 py-0.5 select-none"
                  style={{
                    fontFamily: masthead.fontFamily || 'Cinzel, serif',
                    fontSize: `${isCompact ? Math.min(36, masthead.fontSizePt * 0.6) : masthead.fontSizePt * 0.75}px`,
                    color: titleColor,
                  }}
                >
                  {masthead.title || brand.name}
                </h1>
              </div>
            )}

            {showLogo && logoPlacement === 'right' && (
              <div className="shrink-0 flex items-center">
                <img
                  src={logoUrl}
                  alt="Newspaper Masthead Logo"
                  style={{ maxHeight: `${logoHeight}px` }}
                  className="object-contain max-w-[320px] rounded drop-shadow-2xs"
                />
              </div>
            )}
          </div>

          {/* Subtitle */}
          {masthead.subtitle && (
            <p className="text-[10px] font-medium text-slate-700 mt-0.5 tracking-wider uppercase font-sans">
              {masthead.subtitle}
            </p>
          )}
        </div>

        {/* RIGHT EAR (Markets & Financial Ticker) */}
        <div className="hidden sm:block w-[135px] text-[8.5px] leading-tight border-l border-slate-200 pl-2 text-slate-700 text-right shrink-0 font-sans">
          <div className="font-bold text-slate-900 border-b border-slate-200 pb-0.5 mb-0.5 tracking-wider">
            {isTelugu ? 'బులియన్ & మార్కెట్లు' : 'MARKETS & BULLION'}
          </div>
          <div>{isTelugu ? 'బి.ఎస్.ఇ సెన్సెక్స్: 82,410 ▲' : 'BSE Sensex: 82,410 ▲ +420'}</div>
          <div className="font-semibold text-amber-800 mt-0.5">
            {isTelugu ? 'బంగారం: ₹78,850 • వెండి: ₹92,400' : 'Gold (24K): ₹78,850 ▲'}
          </div>
        </div>
      </div>

      {/* Bottom Oxford Double Rule Dateline */}
      <div
        className="text-[9.5px] uppercase tracking-wider pt-1 pb-1 px-3 flex justify-between text-slate-700 font-semibold bg-slate-50/50 font-sans"
        style={{
          borderTop: `2px solid ${borderColor}`,
        }}
      >
        <span>{publicationDate}</span>
        <span className="font-bold text-slate-900">
          {displayEdition} • {brand.paperSize?.toUpperCase() || 'BROADSHEET'} 8-COLS • {brand.pageCount || 16} PAGES
        </span>
        <span className="font-mono text-slate-600">
          {brand.imprint?.rniNumber || 'RNI REGISTERED'}
        </span>
      </div>
    </div>
  );
};
