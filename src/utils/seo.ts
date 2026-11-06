/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SEO & Multi-Page Metadata Manager
 * Dynamically synchronizes document title, meta description, canonical URL,
 * and OpenGraph/Twitter Card metadata for every route.
 */

export interface RouteSEOMetadata {
  title: string;
  description: string;
  keywords?: string;
  ogType?: 'website' | 'article';
}

export const ROUTE_SEO_MAP: Record<string, RouteSEOMetadata> = {
  '/': {
    title: 'NewsPress Platform — Multi-Tenant Newspaper SaaS & Syndicated News Wire',
    description: 'Production-grade multi-tenant SaaS newspaper production system and news marketplace platform for independent publishers, editorial desks, and accredited journalists.',
    keywords: 'newspaper publishing, newsroom cms, newspaper production, wire marketplace, editorial queue, epaper, print press',
    ogType: 'website',
  },
  '/dashboard': {
    title: 'Newsroom Overview & Executive Pulse | NewsPress',
    description: 'Real-time overview of newsroom operations, today’s dispatches, urgent approvals, edition deadlines, and wire syndication revenue.',
  },
  '/newsroom/news': {
    title: 'News Dispatch & Editorial Wire Desk | NewsPress',
    description: 'Tenant-scoped newsroom story pipeline. Stories undergo algorithmic originality indexing and multi-factor verification prior to publishing.',
  },
  '/newsroom/submissions': {
    title: 'Reporter Submissions & Originality Audit | NewsPress',
    description: 'Chronological audit record of field news dispatches, originality scores, independent reports, and real-world event cluster locks.',
  },
  '/newsroom/editorial-queue': {
    title: 'Editorial Review & Fact-Checking Queue | NewsPress',
    description: 'Desk review, fact-checking, legal clearance, and approval workflow for submitted articles before edition layout placement.',
  },
  '/newsroom/desk': {
    title: 'Newsroom Desk Operations & Live Editorial Center | NewsPress',
    description: 'Active newsroom operations console managing live desk dispatches, assignments, and urgent breaking news cycles.',
  },
  '/newsroom/assignments': {
    title: 'Field Assignments & Beat Coverage | NewsPress',
    description: 'Deploy accredited reporters to high-priority beats, districts, investigative series, and breaking news events.',
  },
  '/newsroom/reporter-dashboard': {
    title: 'Reporter Field Workspace & Draft Hub | NewsPress',
    description: 'Dedicated workspace for field journalists to draft, attach media evidence, sign originality declarations, and submit dispatches.',
  },
  '/newsroom/reporters': {
    title: 'Accredited Journalists & Stringers Directory | NewsPress',
    description: 'Verified roster of staff journalists, investigative correspondents, and accredited freelance contributors with originality ratings.',
  },
  '/newsroom/staff': {
    title: 'Staff Management & Newsroom Seats | NewsPress',
    description: 'Manage editorial seats, role assignments, press credentials, and tenant permissions across the newsroom.',
  },
  '/newsroom/desks': {
    title: 'Newsroom Desks & Bureau Management | NewsPress',
    description: 'Configure and monitor newsroom departmental desks including State Bureau, City Hall, Crime, Commerce, and Sports.',
  },
  '/newsroom/beats': {
    title: 'Beats, Districts & Regional Coverage | NewsPress',
    description: 'Geographic and thematic news beat mapping across municipal districts, state zones, and specialized industry sectors.',
  },
  '/newspaper/editions': {
    title: 'Daily Newspaper Editions Desk | NewsPress',
    description: 'Comprehensive registry of past, current, and upcoming daily morning newspaper editions and print imprints.',
  },
  '/newspaper/calendar': {
    title: 'Operating Newspaper Publishing Calendar | NewsPress',
    description: 'Schedule daily editions, print deadlines, night press locks, and special supplements across publication calendars.',
  },
  '/newspaper/edition-planning': {
    title: 'Edition Content Planning & Page Allocation | NewsPress',
    description: 'Map approved articles, photographs, infographics, and advertisements into specific newspaper pages and sections.',
  },
  '/newspaper/front-page': {
    title: 'Front Page A1 Planner & Layout Engine | NewsPress',
    description: 'Strategic page layout engine for Page A1 lead banners, second leads, anchor stories, and above-the-fold visual framing.',
  },
  '/newspaper/page-designer': {
    title: '8-Column Newspaper Layout Designer Canvas | NewsPress',
    description: 'Linotype-precise 8-column layout designer with modular typography grids, automated column flow, and crop mark previews.',
  },
  '/newspaper/readiness': {
    title: 'Edition Readiness & Preflight Verification | NewsPress',
    description: 'Automated preflight diagnostic engine ensuring zero overflow, high-resolution imagery, and statutory compliance before press lock.',
  },
  '/newspaper/review': {
    title: 'Review & Finalize Desk | NewsPress',
    description: 'Executive Editor sign-off interface to review full edition proofs, apply final approvals, and lock for rotary press printing.',
  },
  '/newspaper/templates': {
    title: 'Print & Layout Templates Library | NewsPress',
    description: 'Standardized newspaper layout templates for broadsheet, tabloid, weekly supplements, and breaking evening editions.',
  },
  '/newspaper/brands': {
    title: 'Newspaper Brands, Mastheads & Imprints | NewsPress',
    description: 'Configure multi-brand newspaper mastheads, typography rules, bilingual banners, and regional edition branding.',
  },
  '/marketplace': {
    title: 'Open News Marketplace & Syndication Wire | NewsPress',
    description: 'Browse, license, and syndicate verified original news dispatches from accredited freelance reporters across the wire.',
  },
  '/marketplace/search': {
    title: 'Search & Filter Wire Dispatches | NewsPress',
    description: 'Search syndication listings by beat, location, originality verification status, price, and publication exclusivity rights.',
  },
  '/marketplace/licensed': {
    title: 'Licensed Content Workspace | NewsPress',
    description: 'Access acquired syndicated stories, download high-resolution photo packages, and import directly into newspaper editions.',
  },
  '/marketplace/purchases': {
    title: 'Wire Purchase & License History | NewsPress',
    description: 'Audited log of news licenses acquired with legal terms, expiration windows, and instant invoice downloads.',
  },
  '/marketplace/listings': {
    title: 'My Syndication Listings | NewsPress',
    description: 'Publish and manage independent investigative reports listed for sale on the open marketplace wire.',
  },
  '/production/queue': {
    title: 'Night Press Queue & Rotary Print Operations | NewsPress',
    description: 'Live monitor for midnight print queues, CTP plate rasterization, and automated dispatch to rotary print plants.',
  },
  '/production/operations': {
    title: 'Production Operations Console | NewsPress',
    description: 'Real-time telemetry for multi-city newspaper printing presses, circulation batches, and truck distribution dispatch.',
  },
  '/production/finalized': {
    title: 'Finalized & Press-Locked Editions | NewsPress',
    description: 'Archive of fully approved, tamper-proof newspaper editions ready for archival deposit, audit, and reprint runs.',
  },
  '/production/downloads': {
    title: 'Print-Ready Vector PDF & Plate Downloads | NewsPress',
    description: 'Download CMYK 300DPI press-ready PDF/X-1a files, separation plates, and digital web epaper editions.',
  },
  '/production/vendors': {
    title: 'Certified Print Press Vendors Directory | NewsPress',
    description: 'Directory of certified rotary web press partners, contract specifications, ink formulas, and paper GSM specifications.',
  },
  '/finance/billing': {
    title: 'Subscription & Publisher Billing Console | NewsPress',
    description: 'Manage SaaS newsroom subscription plans, seat allowances, storage quotas, and monthly platform billing invoices.',
  },
  '/finance/wallet': {
    title: 'Reporter Earnings Wallet & UPI Settlements | NewsPress',
    description: 'Direct journalist compensation wallet with automated instant UPI settlement and royalty payouts.',
  },
  '/finance/transactions': {
    title: 'Financial Ledger & Audit Trail | NewsPress',
    description: 'Double-entry ledger of all newsroom subscription debits, wire syndication royalties, and print production invoices.',
  },
  '/finance/payouts': {
    title: 'Payouts & Section 194J Tax Settlement | NewsPress',
    description: 'Statutory compliance console for freelance reporter payouts with automated Form 16A generation and tax withholding.',
  },
  '/analytics': {
    title: 'Circulation, Readership & MIS Intelligence | NewsPress',
    description: 'Deep audience intelligence, district-wise circulation heatmaps, digital epaper impressions, and reporter productivity metrics.',
  },
  '/developer/apps': {
    title: 'Developer API Applications | NewsPress',
    description: 'Manage developer applications, OAuth clients, and automated news feed syndication connectors.',
  },
  '/developer/api-keys': {
    title: 'API Keys & Enterprise Credentials | NewsPress',
    description: 'Generate and rotate secure cryptographic API keys for programmatic news ingestion and press automation.',
  },
  '/developer/webhooks': {
    title: 'Real-Time Webhooks & Integration | NewsPress',
    description: 'Configure real-time webhook endpoints for story publication, edition finalization, and breaking news alerts.',
  },
  '/operations/reliability': {
    title: 'System Reliability, Security & Health | NewsPress',
    description: 'Live service uptime, security audit logs, encryption posture, and disaster recovery telemetry.',
  },
  '/login': {
    title: 'Sign In & Editorial Persona Gateway | NewsPress',
    description: 'Secure authentication gateway for newspaper publishers, editors-in-chief, desk editors, and accredited reporters.',
  },
  '/legal': {
    title: 'Legal & Statutory Compliance Center — PCI, RNI & DPDP | NewsPress',
    description: 'Official legal documentation covering Press Council of India standards, RNI registration, DPDP Act 2023 privacy, and wire terms.',
  },
};

/**
 * Updates browser document title, canonical link, and OpenGraph meta tags
 */
export function updateSEO(path: string): void {
  if (typeof document === 'undefined') return;

  // Normalize path (strip query or hash for lookup)
  const normalizedPath = path.split('?')[0].split('#')[0] || '/';
  const meta = ROUTE_SEO_MAP[normalizedPath] || {
    title: `${normalizedPath.replace(/^\//, '').replace(/\//g, ' • ').replace(/-/g, ' ')} | NewsPress Platform`,
    description: 'Multi-tenant SaaS newspaper production system and syndicated news wire marketplace platform.',
  };

  // 1. Update Document Title
  document.title = meta.title;

  // 2. Helper to set or create meta tags
  const setMetaTag = (attributeName: string, attributeValue: string, content: string) => {
    let tag = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute(attributeName, attributeValue);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  };

  // 3. Helper to set or create link tags (e.g. canonical)
  const setLinkTag = (rel: string, href: string) => {
    let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', rel);
      document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  };

  const currentUrl = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;

  // Standard Meta Tags
  setMetaTag('name', 'description', meta.description);
  if (meta.keywords) {
    setMetaTag('name', 'keywords', meta.keywords);
  }

  // Canonical Link
  setLinkTag('canonical', currentUrl);

  // OpenGraph Tags for Social Sharing & Search Engine Previews
  setMetaTag('property', 'og:title', meta.title);
  setMetaTag('property', 'og:description', meta.description);
  setMetaTag('property', 'og:url', currentUrl);
  setMetaTag('property', 'og:type', meta.ogType || 'website');
  setMetaTag('property', 'og:site_name', 'NewsPress Platform');

  // Twitter Card Tags
  setMetaTag('name', 'twitter:title', meta.title);
  setMetaTag('name', 'twitter:description', meta.description);
  setMetaTag('name', 'twitter:url', currentUrl);
}
