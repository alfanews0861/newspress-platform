/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Newspaper Production & Layout Engine Domain Types
 * Phase 4 Core Data Models: Brands, Templates, Grids, Placements, Diagnostics & Revisions
 */

export type PageFormat = 'A4' | 'Broadsheet' | 'Tabloid' | 'Custom';
export type PageOrientation = 'portrait' | 'landscape';

export type EditionStatus =
  | 'PLANNED'
  | 'OPEN'
  | 'CONTENT_COLLECTION'
  | 'DESIGNING'
  | 'EDITORIAL_REVIEW'
  | 'READY_TO_FINALIZE'
  | 'FINALIZED'
  | 'IN_PRODUCTION'
  | 'READY'
  | 'PUBLISHED'
  | 'CANCELLED'
  | 'SUPERSEDED'
  | 'DRAFT'
  | 'REVIEW'
  | 'QUEUED'
  | 'PROCESSING'
  | 'FAILED'
  | 'ARCHIVED'
  | 'planning'
  | 'layout_in_progress'
  | 'editorial_lock'
  | 'preflight_check'
  | 'finalized'
  | 'queued_for_press'
  | 'printed'
  | 'distributed';

export type StoryLayoutRole =
  | 'LEAD'
  | 'SECONDARY_LEAD'
  | 'FEATURE'
  | 'STANDARD'
  | 'BRIEF'
  | 'SIDEBAR'
  | 'BOTTOM_STRIP'
  | 'PHOTO_STORY'
  | 'BREAKING'
  | 'OPINION'
  | 'ADJACENT';

export type LayoutBlockType =
  | 'masthead'
  | 'sectionHeader'
  | 'headline'
  | 'subheadline'
  | 'bodyText'
  | 'image'
  | 'imageCaption'
  | 'byline'
  | 'dateline'
  | 'quote'
  | 'factBox'
  | 'infographic'
  | 'advertisement'
  | 'divider'
  | 'pageNumber'
  | 'footer'
  | 'weather'
  | 'stockTicker'
  | 'editorialNote';

export interface StoryLayoutPriority {
  editorialPriority: number; // 1 to 10 scale
  breakingStatus: boolean;
  articleType: string;
  freshnessHours: number;
  section: string;
  wordCount: number;
  hasImage: boolean;
  publisherPriority: number;
  editorOverridePriority?: number;
  calculatedScore: number;
}

export interface SectionStyle {
  name: string;
  headingFont: string;
  accentColor: string;
  dividerStyle: 'solid' | 'double' | 'dotted' | 'thick_thin' | 'none';
  defaultLayoutRules?: {
    allowHeroImage?: boolean;
    columns?: number;
    defaultRole?: StoryLayoutRole;
  };
}

export interface AdvertisementZone {
  zoneId: string;
  name: string;
  columnStart: number;
  columnSpan: number;
  rowStart: number;
  rowSpan: number;
  rateInr?: number;
  sponsor?: string;
}

export interface StatutoryImprintDetails {
  rniNumber?: string;              // RNI / PRB Registration No. (ఆర్.ఎన్.ఐ రిజిస్ట్రేషన్ సంఖ్య)
  titleCode?: string;              // Title Code (టైటిల్ కోడ్)
  editorName: string;              // Editor Name (పి.ఆర్.బి చట్టం ప్రకారం వార్తల ఎంపికకు బాధ్యులు)
  publisherName: string;           // Printed & Published By (ప్రచురణకర్త / ముద్రణకర్త)
  ownerName: string;               // Owned by (యాజమాన్యం)
  printingPressName: string;       // Press Name (ముద్రణాలయం పేరు)
  printingPressAddress: string;    // Printing Press Address (ముద్రణాలయం చిరునామా)
  publishedAtAddress: string;      // Published From Address (ప్రచురణ స్థలం కార్యాలయ చిరునామా)
  placeOfPublication: string;      // City / District (ఉదా: హైదరాబాద్, విజయవాడ)
  contactPhone?: string;           // Phone
  contactEmail?: string;           // Email
  legalJurisdiction?: string;      // Disputes subject to jurisdiction of ... Courts
  declarationText?: string;        // Full combined imprint statement
}

export type PublicationFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'evening';
export type PaperSizeFormat = 'broadsheet' | 'tabloid' | 'berliner' | 'a3' | 'a4';
export type LogoPlacement = 'left' | 'center' | 'right' | 'full';

export interface NewspaperBrand {
  brandId: string;
  tenantId: string;
  name: string; // Newspaper title
  code: string; // e.g. "MC", "EN"
  tagline?: string;
  logoUrl?: string;
  frequency?: PublicationFrequency;
  volumeNumber?: number | string;
  issueNumber?: number | string;
  autoIncrementIssue?: boolean;
  paperSize?: PaperSizeFormat;
  pageCount?: number;
  price?: string | number;
  editionsList?: string[];
  imprint?: StatutoryImprintDetails;
  masthead: {
    title: string;
    subtitle?: string;
    fontFamily: string;
    fontSizePt: number;
    style: 'classic_blackletter' | 'modern_serif' | 'clean_bold' | 'bilingual_banner' | 'royal_traditional' | 'contemporary_clean';
    showDate: boolean;
    showEditionNumber: boolean;
    showPrice: boolean;
    priceText?: string;
    borderColor?: string;
    showLogo?: boolean;
    showTitleText?: boolean; // When false, custom designed logo is the sole primary title artwork
    logoUrl?: string;
    logoPlacement?: LogoPlacement; // 'left' | 'center' | 'right' | 'full'
    logoHeightPx?: number;
    bannerImageUrl?: string;
    templatePreset?: string;
    templateLayout?: 'broadsheet_classic' | 'vernacular_ribbon' | 'modern_tabloid' | 'royal_herald' | 'commercial_banner' | string;
  };
  language: 'en' | 'te' | 'mixed' | 'hi' | 'ur' | 'ta' | 'kn' | string;
  defaultFonts: {
    headlineFont: string;
    bodyFont: string;
    accentFont: string;
    mastheadFont: string;
  };
  colors: {
    primary: string;
    secondary: string;
    defaultText: string;
    pageBackground: string;
    accent: string;
  };
  defaultColumnCount: number;
  defaultMargins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  defaultGutters: number;
  defaultTypographyScale: {
    leadHeadline: number;
    secondaryLeadHeadline: number;
    featureHeadline: number;
    standardHeadline: number;
    briefHeadline: number;
    subheadline: number;
    body: number;
    briefBody: number;
    caption: number;
    byline: number;
  };
  headerFooterRules: {
    showHeader: boolean;
    showFooter: boolean;
    headerRuleStyle: 'solid' | 'double' | 'thin' | 'none';
    footerRuleStyle: 'solid' | 'double' | 'thin' | 'none';
    pageNumberFormat: 'PAGE {n}' | '{n}' | 'PAGE {n} OF {total}' | 'SECTION A - {n}';
  };
  sectionStyles: Record<string, SectionStyle>;
  createdAt: string;
  updatedAt: string;
}

export interface NewspaperTemplate {
  templateId: string;
  tenantId: string;
  name: string;
  description: string;
  pageSize: PageFormat;
  pageOrientation: PageOrientation;
  pageWidthMm: number;
  pageHeightMm: number;
  pageMarginsMm: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  columnCount: number;
  columnGutterMm: number;
  baselineGridPt: number;
  headerHeightMm: number;
  footerHeightMm: number;
  allowedModules: LayoutBlockType[];
  defaultTypography: {
    headlineFont: string;
    bodyFont: string;
    accentFont: string;
    baseFontSizePt: number;
    lineHeights: Record<string, number>;
  };
  sectionStyles: Record<string, SectionStyle>;
  advertisementZones: AdvertisementZone[];
  imageTreatmentRules: {
    maxHeroHeightPercent: number;
    defaultAspectRatio: '16:9' | '4:3' | '3:2' | '1:1';
    allowGrayscale: boolean;
    borderStyle: 'none' | 'thin_black' | 'hairline';
  };
  isDefault?: boolean;
  previewThumbnailUrl?: string;
  // Backward compatibility fields
  format?: 'broadsheet' | 'tabloid' | 'berliner';
  columnsCount?: 4 | 5 | 6 | 8;
  gridGutterMm?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PageGrid {
  pageWidth: number;
  pageHeight: number;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  contentWidth: number;
  contentHeight: number;
  columnCount: number;
  columnWidth: number;
  gutterWidth: number;
  baselineGrid: number;
}

export interface ImageCropConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  mode: 'cover' | 'contain' | 'smart' | 'face';
}

export interface ArticlePlacement {
  placementId: string;
  editionId: string;
  pageId: string;
  tenantId: string;
  newsId: string;
  articleTitle?: string;
  byline?: string;
  category?: string;
  leadParagraph?: string;
  bodyContent?: string;
  // Physical / canvas coordinates in design pixels
  x: number;
  y: number;
  width: number;
  height: number;
  // Logical Grid Information (Authoritative representation)
  columnStart: number; // 1-indexed (1 to columnCount)
  columnSpan: number; // 1 to columnCount
  rowStart: number; // baseline index
  rowSpan: number; // height in baseline rows
  headlineSize: number; // Font size pt / px
  bodyFontSize: number;
  imagePlacement: 'top' | 'left' | 'right' | 'bottom' | 'hero' | 'none';
  imageCrop?: ImageCropConfig;
  imageUrl?: string;
  imageCaption?: string;
  priority: StoryLayoutPriority;
  layoutRole: StoryLayoutRole;
  placementRole?: StoryLayoutRole;
  status: 'placed' | 'locked' | 'overflow' | 'flagged' | 'draft';
  locked: boolean;
  styleVariant?: 'lead_banner' | 'anchor_box' | 'photo_feature' | 'column_card' | 'sidebar_brief' | 'standard';
  kicker?: string;
  subheadline?: string;
  accentColor?: string;
  headlineFont?: string;
  headlineColor?: string;
  imageHeight?: number;
  cardBackground?: string;
  bulletPoints?: string[];
  pullQuote?: string;
  continuedOnPage?: number;
  continuedFromPage?: number;
  editorOverride?: {
    pageId?: string;
    columnStart?: number;
    columnSpan?: number;
    headlineSize?: number;
    bodyFontSize?: number;
    imagePlacement?: 'top' | 'left' | 'right' | 'bottom' | 'hero' | 'none';
    imageCrop?: ImageCropConfig;
    priority?: number;
    layoutRole?: StoryLayoutRole;
    height?: number;
    isOverridden: boolean;
  };
  generatedValue?: {
    columnStart: number;
    columnSpan: number;
    headlineSize: number;
    bodyFontSize: number;
    layoutRole: StoryLayoutRole;
    pageId: string;
  };
  finalValue?: {
    columnStart: number;
    columnSpan: number;
    headlineSize: number;
    bodyFontSize: number;
    layoutRole: StoryLayoutRole;
    pageId: string;
  };
  diagnostics?: {
    headlineFits: boolean;
    bodyFits: boolean;
    imageFits: boolean;
    overflowWords?: number;
    warnings?: string[];
  };
}

export interface AdvertisementPlacement {
  placementId: string;
  editionId: string;
  pageId: string;
  tenantId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  columnStart: number;
  columnSpan: number;
  rowStart: number;
  rowSpan: number;
  sponsorLabel: string;
  imageUrl?: string;
  linkReference?: string;
  priority: number;
  isLocked: boolean; // Advertisements act as immovable constraints
}

export interface PageDiagnostics {
  status: 'balanced' | 'slightly_sparse' | 'crowded' | 'overflow' | 'weak_hierarchy';
  occupiedAreaPercent: number;
  whitespacePercent: number;
  visualWeight: {
    topHalf: number;
    bottomHalf: number;
    leftHalf: number;
    rightHalf: number;
  };
  headlineHierarchy: {
    leadFound: boolean;
    leadFontSize: number;
    secondaryLeadFound: boolean;
    ratio: number;
    verdict: string;
  };
  imageBalance: {
    imageAreaPercent: number;
    count: number;
  };
  errors: string[];
  warnings: string[];
  info: string[];
  canFinalize: boolean;
}

export interface NewspaperPage {
  pageId: string;
  editionId: string;
  tenantId: string;
  pageNumber: number;
  sectionName?: string;
  templateId: string;
  layoutVersion: number;
  blocks: ArticlePlacement[];
  adPlacements?: AdvertisementPlacement[];
  occupiedArea: number; // Percentage 0 - 100
  diagnostics: PageDiagnostics;
  status: 'draft' | 'auto_planned' | 'editor_modified' | 'approved' | 'locked';
}

export interface EditionRevision {
  revisionId: string;
  editionId: string;
  tenantId: string;
  version: number;
  createdBy: string;
  createdAt: string;
  changeSummary: string;
  layoutSnapshot: {
    pages: NewspaperPage[];
    placements: ArticlePlacement[];
    adPlacements?: AdvertisementPlacement[];
  };
}

export interface NewspaperEdition {
  editionId: string;
  tenantId: string;
  brandId: string;
  brandName: string;
  templateId?: string;
  editionCode: string; // e.g. "NP-2026-10-04-MORNING"
  editionDate?: string; // e.g. "2026-10-04"
  editionType?: 'morning' | 'evening' | 'sunday' | 'special' | 'MORNING' | 'EVENING' | 'SPECIAL' | 'SUNDAY' | 'WEEKLY' | 'SUPPLEMENT' | 'EMERGENCY_REPRINT' | string;
  issueNumber: number;
  volumeNumber: number;
  publicationDate: string; // e.g. "2026-10-04"
  publicationTimezone?: string; // IANA Timezone string e.g. "Asia/Kolkata", "America/New_York"
  status: EditionStatus;
  pageCount?: number;
  totalPages: number; // backward compatibility
  placedArticlesCount: number;
  pages?: NewspaperPage[];
  contentDeadline?: string; // ISO 8601
  printDeadline: string; // ISO 8601
  pressSpecs: {
    format: 'broadsheet' | 'tabloid' | 'berliner';
    colorMode: 'cmyk' | 'spot' | 'grayscale';
    bleedMm: number;
    dpi: number;
  };
  pdfExportUrl?: string;
  checksum?: string;
  createdBy?: string;
  finalizedByUserId?: string;
  finalizedAt?: string;
  createdAt: string;
  updatedAt: string;
}
