/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Readymade Newspaper Masthead Templates
 * 5 fundamentally distinct newspaper masthead architectural designs:
 * 1. Classic Century Broadsheet (Twin Ears & Oxford Rules)
 * 2. Vernacular Dual-Ear Ribbon (Indian Regional Standard - Eenadu / Sakshi / Bhaskar style)
 * 3. Modern Tabloid & Metro Compact (Asymmetric Hero Block + "Inside Today" Story Pointers)
 * 4. Imperial Royal Herald (Tri-Partite Flanked Editorial Medallion & Audit Crest)
 * 5. Commercial Header Plate (Top Leaderboard Banner Ad + Full-Bleed Artwork + Multi-City Tabs)
 */

import { LogoPlacement } from '../types/edition';

export type MastheadLayoutStyle = 
  | 'broadsheet_classic' 
  | 'vernacular_ribbon' 
  | 'modern_tabloid' 
  | 'royal_herald' 
  | 'commercial_banner';

export interface ReadymadeTemplate {
  id: string;
  name: string;
  tagline: string;
  desc: string;
  layoutStyle: MastheadLayoutStyle;
  layoutName: string;
  layoutDescription: string;
  features: string[];
  logoPlacement: LogoPlacement;
  showTitleText: boolean; // False by default so the custom artwork logo is the sole title!
  logoUrl: string; // Ready-made SVG artwork
  bannerImageUrl?: string;
  logoHeightPx: number;
  borderColor: string;
  primaryColor: string;
  fontFamily: string;
  fontSizePt: number;
  subtitle: string;
  defaultPrice: string;
  defaultVolume: number;
  defaultIssue: number;
}

// 1. Classic Broadsheet National Heraldic Logo (Crisp Vector SVG)
const SVG_NATIONAL_CHRONICLE = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 110" width="760" height="110">
  <defs>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#b45309" />
      <stop offset="50%" stop-color="#d97706" />
      <stop offset="100%" stop-color="#78350f" />
    </linearGradient>
  </defs>
  <!-- Central Heraldic Shield -->
  <g transform="translate(380, 26) scale(0.75)">
    <path d="M-24,-24 C0,-30 0,-30 24,-24 C24,6 18,24 0,36 C-18,24 -24,6 -24,-24 Z" fill="#0f172a" stroke="url(#gold)" stroke-width="2.5" />
    <path d="M-10,-10 L10,10 M-10,10 L10,-10" stroke="#f8fafc" stroke-width="2" />
    <circle cx="0" cy="0" r="4" fill="url(#gold)" />
    <!-- Flourish wings -->
    <path d="M-28,-14 C-44,-30 -60,-14 -46,4 C-36,12 -28,6 -28,6" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M28,-14 C44,-30 60,-14 46,4 C36,12 28,6 28,6" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>
  </g>
  <!-- Main Title: The National Chronicle in Majestic Stylized Lettering -->
  <text x="380" y="88" text-anchor="middle" font-family="'Cinzel', 'Times New Roman', serif" font-size="46" font-weight="900" fill="#0f172a" letter-spacing="4">THE NATIONAL CHRONICLE</text>
  <!-- Fine Underline Flourish -->
  <line x1="160" y1="102" x2="600" y2="102" stroke="#0f172a" stroke-width="1.5" />
  <circle cx="380" cy="102" r="3" fill="#b45309" />
  <line x1="220" y1="106" x2="540" y2="106" stroke="#0f172a" stroke-width="0.8" />
</svg>
`)}`;

// 2. Bilingual Regional / Telugu Calligraphic Masthead Artwork (Andhra Prabha Authentic Vector SVG)
const SVG_ANDHRA_PRABHA_CALLIGRAPHIC = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 115" width="760" height="115">
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="1" dy="1.5" stdDeviation="0.8" flood-color="#0c4a6e" flood-opacity="0.3" />
    </filter>
  </defs>
  <!-- Estd 1938 -->
  <text x="380" y="20" text-anchor="middle" font-family="'Times New Roman', serif" font-size="13" font-weight="bold" font-style="italic" fill="#0f172a" letter-spacing="1">Estd. 1938</text>
  
  <!-- Stylized Authentic Andhra Prabha Title Artwork in Classic Broadsheet Blue -->
  <g transform="translate(380, 72)" filter="url(#shadow)">
    <!-- Main Telugu Calligraphy Title with Classic Flourish -->
    <text x="0" y="0" text-anchor="middle" font-family="'Suranna', 'Ramabhadra', 'Noto Serif Telugu', serif" font-size="64" font-weight="900" fill="#0284c7" stroke="#0369a1" stroke-width="1.5" letter-spacing="0">ఆంధ్ర ప్రభ</text>
    <text x="0" y="0" text-anchor="middle" font-family="'Suranna', 'Ramabhadra', 'Noto Serif Telugu', serif" font-size="64" font-weight="900" fill="#0284c7" letter-spacing="0">ఆంధ్ర ప్రభ</text>
  </g>
  
  <!-- Subtitle Ribbon: Andhraprabha (left) • Journalism first! (right) -->
  <g transform="translate(380, 102)">
    <text x="-150" y="0" text-anchor="middle" font-family="'Times New Roman', 'Newsreader', serif" font-size="13" font-weight="bold" fill="#0284c7">Andhraprabha</text>
    <circle cx="0" cy="-3" r="2" fill="#0284c7" />
    <text x="150" y="0" text-anchor="middle" font-family="'Inter', sans-serif" font-size="12" font-style="italic" font-weight="bold" fill="#0369a1">Journalism first!</text>
  </g>
</svg>
`)}`;

// 2b. Prajasakti Broadsheet Header (Vijayawada Edition)
const SVG_PRAJASAKTI_BROADSHEET = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 115" width="760" height="115">
  <text x="380" y="20" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="bold" fill="#475569" letter-spacing="1">PRAJASAKTI Regd. No. 15795/68</text>
  <text x="380" y="74" text-anchor="middle" font-family="'Ramabhadra', 'Noto Serif Telugu', serif" font-size="66" font-weight="900" fill="#0284c7" stroke="#0369a1" stroke-width="1">ప్రజాశక్తి</text>
  <text x="380" y="100" text-anchor="middle" font-family="'Noto Serif Telugu', serif" font-size="13" font-weight="bold" fill="#dc2626">ప్రతి అక్షరం ప్రజల పక్షం</text>
</svg>
`)}`;

// 2c. Velugu Metro Header (Hyderabad Edition)
const SVG_VELUGU_METRO = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 115" width="760" height="115">
  <rect x="0" y="0" width="760" height="115" fill="#4a154b" />
  <text x="40" y="30" font-family="'Noto Serif Telugu', serif" font-size="14" font-weight="bold" fill="#ffffff">ప్రభాత</text>
  <text x="380" y="78" text-anchor="middle" font-family="'Ramabhadra', 'Gidugu', sans-serif" font-size="70" font-weight="900" fill="#fde047">వెలుగు</text>
  <text x="720" y="30" text-anchor="end" font-family="sans-serif" font-size="12" font-weight="bold" fill="#ffffff">14.11.2026</text>
  <line x1="20" y1="92" x2="740" y2="92" stroke="#ffffff" stroke-opacity="0.3" stroke-width="1" />
  <text x="380" y="106" text-anchor="middle" font-family="'Noto Serif Telugu', sans-serif" font-size="11" font-weight="bold" fill="#f3e8ff">శనివారం | హైదరాబాద్ • సంపుటి: 12 | సంచిక: 270 | ₹5</text>
</svg>
`)}`;

// 3. Metro Express Modern Urban Masthead (Crisp Vector SVG)
const SVG_METRO_EXPRESS = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 100" width="760" height="100">
  <!-- Dynamic Left Brand Identity with Arrow Insignia -->
  <g transform="translate(180, 50)">
    <rect x="-140" y="-34" width="72" height="68" rx="14" fill="#1d4ed8" />
    <path d="M-120,-16 L-94,0 L-120,16 Z" fill="#ffffff" />
    <path d="M-106,-16 L-80,0 L-106,16 Z" fill="#93c5fd" opacity="0.7" />
  </g>
  <!-- Modern Bold Title Artwork -->
  <text x="210" y="56" font-family="'Arial Black', 'Impact', sans-serif" font-size="48" font-weight="900" fill="#0f172a" letter-spacing="1">METRO</text>
  <text x="440" y="56" font-family="'Arial Black', 'Impact', sans-serif" font-size="48" font-weight="900" fill="#1d4ed8" letter-spacing="1">EXPRESS</text>
  <!-- Slogan Banner -->
  <rect x="212" y="66" width="370" height="18" fill="#f1f5f9" rx="4" />
  <text x="220" y="79" font-family="sans-serif" font-size="10" font-weight="bold" fill="#334155" letter-spacing="2">THE FASTEST DAILY URBAN MORNING CHRONICLE</text>
</svg>
`)}`;

// 4. Royal Imperial Herald Masthead Artwork (Crisp Vector SVG)
const SVG_ROYAL_HERALD = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 115" width="760" height="115">
  <defs>
    <linearGradient id="royalGold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#b45309" />
      <stop offset="50%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
  </defs>
  <!-- Imperial Lion / Crown Insignia -->
  <g transform="translate(380, 24) scale(0.9)">
    <path d="M-18,-8 L-12,-20 L0,-12 L12,-20 L18,-8 L14,6 L-14,6 Z" fill="url(#royalGold)" />
    <circle cx="-12" cy="-20" r="2.5" fill="#7f1d1d" />
    <circle cx="0" cy="-12" r="2.5" fill="#7f1d1d" />
    <circle cx="12" cy="-20" r="2.5" fill="#7f1d1d" />
  </g>
  <!-- Main Title -->
  <text x="380" y="78" text-anchor="middle" font-family="'Cinzel', 'Playfair Display', serif" font-size="48" font-weight="900" fill="#7f1d1d" letter-spacing="5">THE ROYAL HERALD</text>
  <!-- Classical Filigree Border -->
  <path d="M120,94 C240,90 320,96 380,94 C440,96 520,90 640,94" fill="none" stroke="url(#royalGold)" stroke-width="2" />
  <circle cx="380" cy="94" r="3.5" fill="#7f1d1d" />
</svg>
`)}`;

// 5. Full-Bleed Graphic Header Plate (Crisp Vector SVG)
const SVG_FULL_BANNER_PLATE = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 130" width="1000" height="130">
  <defs>
    <linearGradient id="bannerBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#090d16" />
    </linearGradient>
    <linearGradient id="bannerGold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#d97706" />
      <stop offset="50%" stop-color="#fef3c7" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
  </defs>
  <!-- Full Background Banner Plate -->
  <rect x="0" y="0" width="1000" height="130" fill="url(#bannerBg)" />
  <!-- Ornate Border Frame -->
  <rect x="8" y="8" width="984" height="114" fill="none" stroke="url(#bannerGold)" stroke-width="2" rx="4" />
  <rect x="12" y="12" width="976" height="106" fill="none" stroke="#d97706" stroke-width="0.8" opacity="0.6" rx="2" />
  <!-- Corner Ornaments -->
  <polygon points="12,12 28,12 12,28" fill="#d97706" />
  <polygon points="988,12 972,12 988,28" fill="#d97706" />
  <polygon points="12,118 28,118 12,102" fill="#d97706" />
  <polygon points="988,118 972,118 988,102" fill="#d97706" />
  <!-- Main Calligraphic Plate Headline -->
  <text x="500" y="68" text-anchor="middle" font-family="'Cinzel', serif" font-size="46" font-weight="900" fill="url(#bannerGold)" letter-spacing="6">DAILY PRESS DISPATCH</text>
  <!-- Subtitle Strip -->
  <text x="500" y="96" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700" fill="#cbd5e1" letter-spacing="4">THE TRUSTED VOICE OF DEMOCRACY • INDEPENDENT NATIONAL NEWSPAPER</text>
</svg>
`)}`;

export const READYMADE_MASTHEAD_TEMPLATES: ReadymadeTemplate[] = [
  {
    id: 'template-national-chronicle',
    name: 'Design 1: Classic Century Broadsheet (Twin Ears & Oxford Rules)',
    tagline: 'Traditional multi-deck broadsheet with twin engraved ear panels and Oxford double rules.',
    desc: 'Top hairline dateline with founding year, boxed Weather/Almanac ear on the left, Bullion/Markets ear on the right, centered heraldic crest, and double rules.',
    layoutStyle: 'broadsheet_classic',
    layoutName: 'Classic Century Broadsheet Architecture',
    layoutDescription: 'Traditional broadsheet architecture with hairline motto, engraved weather/astronomy panel, bullion/sensex panel, and double Oxford rules.',
    features: [
      'Top Hairline Bar: Founded 1894 • Veritas Vincit • Retail Price',
      'Left Engraved Box: Almanac, Weather, Sunrise/Sunset & Tithis',
      'Right Engraved Box: Sensex, Nifty, Gold & Silver Bullion',
      'Traditional Oxford Double Rules (3pt/1pt) & Dateline Strip',
    ],
    logoPlacement: 'center',
    showTitleText: false,
    logoUrl: SVG_NATIONAL_CHRONICLE,
    logoHeightPx: 64,
    borderColor: '#0f172a',
    primaryColor: '#0f172a',
    fontFamily: 'Cinzel, serif',
    fontSizePt: 52,
    subtitle: 'THE INDEPENDENT VOICE OF RECORD SINCE 1894',
    defaultPrice: '₹5.00',
    defaultVolume: 132,
    defaultIssue: 47822,
  },
  {
    id: 'template-andhra-prabha',
    name: 'Design 2: Andhra Prabha Authentic Broadsheet (Twin Ears & Manepally Bullion Ad)',
    tagline: 'Authentic Andhra Prabha masthead with left publication ear box, central blue calligraphic title, and right bullion ear ad.',
    desc: 'Modeled precisely after Andhra Prabha broadsheet front page. Left ear holds volume, issue, edition, golden-yellow date band, publication centers, and web URL; center has Estd. 1938 and blue calligraphy logo; right ear has authentic Manepally Jewellers Gold/Silver rates sponsor ad.',
    layoutStyle: 'vernacular_ribbon',
    layoutName: 'Andhra Prabha Classic Broadsheet Masthead',
    layoutDescription: 'Tri-partite vernacular broadsheet layout with publication center ear on left, iconic blue calligraphic title in center, and commercial bullion ear on right.',
    features: [
      'Left Box: సంపుటి 65, సంచిక 203, హైదరాబాద్ / విజయవాడ, పేజీలు 10, వెల ₹5.00',
      'Amber Date Band: 14-11-2026 శనివారం & All-center publication list',
      'Center: Estd. 1938 • ఆంధ్ర ప్రభ Blue Calligraphy • Journalism first!',
      'Right Ear: Manepally Jewellers Gold & Silver Rates (24kt, 22kt, Silver)',
    ],
    logoPlacement: 'center',
    showTitleText: false,
    logoUrl: SVG_ANDHRA_PRABHA_CALLIGRAPHIC,
    logoHeightPx: 68,
    borderColor: '#0284c7',
    primaryColor: '#0284c7',
    fontFamily: "'Suranna', 'Ramabhadra', serif",
    fontSizePt: 56,
    subtitle: 'Andhraprabha • Journalism first!',
    defaultPrice: '₹5.00',
    defaultVolume: 65,
    defaultIssue: 203,
  },
  {
    id: 'template-metro-express',
    name: 'Design 3: Modern Tabloid & Metro Compact (Asymmetric Hero + Top News Pointers)',
    tagline: 'Asymmetric 2-column layout with high-contrast cobalt hero brand block and 3-story breaking teaser pointers.',
    desc: 'Dynamic urban morning tabloid layout. Features an asymmetric cobalt blue left brand block containing the logo, paired with a right-hand "INSIDE TODAY" 3-column news teaser cards grid with section tags and page numbers.',
    layoutStyle: 'modern_tabloid',
    layoutName: 'Asymmetric Split Hero & Story Pointers Architecture',
    layoutDescription: 'Modern tabloid header featuring an asymmetric left branded block and 3 horizontal teaser cards with page numbers for top lead stories.',
    features: [
      'Cobalt Blue Solid Hero Brand Block for Logo Artwork',
      '3-Column "Inside Today" Story Pointers with Page Numbers (P.04, P.08, P.12)',
      'Minimalist Modern Dateline with Clean Pill Badges & AQI Ticker',
      'Urban High-Contrast Typography & Borderless Clean Spacing',
    ],
    logoPlacement: 'left',
    showTitleText: false,
    logoUrl: SVG_METRO_EXPRESS,
    logoHeightPx: 58,
    borderColor: '#1d4ed8',
    primaryColor: '#1d4ed8',
    fontFamily: 'Inter, sans-serif',
    fontSizePt: 48,
    subtitle: 'THE FASTEST DAILY URBAN MORNING CHRONICLE',
    defaultPrice: '₹4.00',
    defaultVolume: 18,
    defaultIssue: 5420,
  },
  {
    id: 'template-royal-herald',
    name: 'Design 4: Imperial Royal Herald (Tri-Partite Flanked Editorial Medallion & Audit Crest)',
    tagline: 'Burgundy & antique burnished gold layout flanked by founding declaration medallion and ABC audit seal.',
    desc: 'Prestige broadsheet header in deep burgundy and burnished antique gold. Centered imperial crown/lion crest flanked on the left by an editorial founding declaration medallion, and on the right by an official ABC Gold Circulation certification crest.',
    layoutStyle: 'royal_herald',
    layoutName: 'Tri-Partite Column Flanked Architecture',
    layoutDescription: 'Classical European heritage broadsheet design in burgundy and gold, flanked by founding editorial motto and official ABC circulation audit guarantee.',
    features: [
      'Antique Gold & Burgundy Palette with Corner Bracket Flourishes',
      'Left Flanked Box: Founding Editorial Medallion (Estd. MDCCCXCIV)',
      'Right Flanked Box: Official ABC Circulation Audit Seal (Grade-A)',
      'Victorian Triple Rules with Diamond Fleurons (◆ ◆ ◆)',
    ],
    logoPlacement: 'center',
    showTitleText: false,
    logoUrl: SVG_ROYAL_HERALD,
    logoHeightPx: 66,
    borderColor: '#7f1d1d',
    primaryColor: '#7f1d1d',
    fontFamily: "'Playfair Display', serif",
    fontSizePt: 50,
    subtitle: 'JOURNAL OF DIPLOMACY, COMMERCE & NATIONAL INTEGRITY',
    defaultPrice: '₹6.00',
    defaultVolume: 84,
    defaultIssue: 31200,
  },
  {
    id: 'template-full-banner-plate',
    name: 'Design 5: Commercial Header Plate (Top Leaderboard Ad + Multi-City Tabs)',
    tagline: 'Top full-width commercial leaderboard ad banner, edge-to-edge masthead plate, and multi-city tabs.',
    desc: 'High-impact commercial newspaper header. Features a full-width top leaderboard advertisement bar (728x60 format), 100% full-bleed graphical artwork banner plate, multi-city interactive edition tabs, and digital QR code / barcode stamp.',
    layoutStyle: 'commercial_banner',
    layoutName: 'Full-Bleed Commercial Header Plate Architecture',
    layoutDescription: 'Comprehensive commercial newspaper header with top leaderboard ad banner, full-width artwork plate, multi-city tabs, and digital edition QR stamp.',
    features: [
      'Top Full-Width Commercial Leaderboard Ad Banner Strip',
      'Full-Bleed High-Definition Graphical Artwork Plate',
      'Multi-City Interactive Edition Navigation Tabs (Hyd, Vja, Vizag, Del)',
      'Digital E-Paper QR Stamp & Barcode Graphic Line',
    ],
    logoPlacement: 'full',
    showTitleText: false,
    logoUrl: SVG_FULL_BANNER_PLATE,
    bannerImageUrl: SVG_FULL_BANNER_PLATE,
    logoHeightPx: 96,
    borderColor: '#b45309',
    primaryColor: '#0f172a',
    fontFamily: 'Cinzel, serif',
    fontSizePt: 46,
    subtitle: 'THE TRUSTED VOICE OF DEMOCRACY • INDEPENDENT NATIONAL NEWSPAPER',
    defaultPrice: '₹5.00',
    defaultVolume: 25,
    defaultIssue: 9140,
  },
];
