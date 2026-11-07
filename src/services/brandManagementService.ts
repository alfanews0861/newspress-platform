/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Newspaper Brand & Paper Settings Management Service
 * Provides persistent storage (localStorage + memory) for newspaper brands, mastheads,
 * physical paper specifications, issue numbering, and PRB Act statutory imprints.
 */

import { NewspaperBrand, StatutoryImprintDetails } from '../types/edition';
import { MOCK_BRANDS } from './mockDataService';

const BRANDS_STORAGE_KEY = 'newspress_newspaper_brands_v3';
const ACTIVE_BRAND_KEY = 'newspress_active_brand_id';
const EVENT_NAME = 'newspress:brands-updated';

class BrandManagementService {
  private inMemoryBrands: NewspaperBrand[] = [];

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') {
      this.inMemoryBrands = [...MOCK_BRANDS];
      return;
    }

    try {
      const stored = localStorage.getItem(BRANDS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.inMemoryBrands = parsed;
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to read brands from localStorage, using defaults', e);
    }

    this.inMemoryBrands = [...MOCK_BRANDS];
    this.persist();
  }

  private persist() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(BRANDS_STORAGE_KEY, JSON.stringify(this.inMemoryBrands));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { brands: this.inMemoryBrands } }));
    } catch (e) {
      console.error('Failed to persist brands to localStorage', e);
    }
  }

  public getBrands(): NewspaperBrand[] {
    if (this.inMemoryBrands.length === 0) {
      this.init();
    }
    return [...this.inMemoryBrands];
  }

  public getBrandById(brandId: string): NewspaperBrand | undefined {
    return this.inMemoryBrands.find((b) => b.brandId === brandId);
  }

  public getActiveBrand(): NewspaperBrand {
    const brands = this.getBrands();
    const activeId = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_BRAND_KEY) : null;
    if (activeId) {
      const found = brands.find((b) => b.brandId === activeId);
      if (found) return found;
    }
    return brands[0] || MOCK_BRANDS[0];
  }

  public setActiveBrandId(brandId: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_BRAND_KEY, brandId);
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { activeBrandId: brandId } }));
    }
  }

  public saveBrand(brand: NewspaperBrand): NewspaperBrand {
    const index = this.inMemoryBrands.findIndex((b) => b.brandId === brand.brandId);
    const updatedBrand: NewspaperBrand = {
      ...brand,
      updatedAt: new Date().toISOString(),
    };

    if (index >= 0) {
      this.inMemoryBrands[index] = updatedBrand;
    } else {
      this.inMemoryBrands.push(updatedBrand);
    }

    this.persist();
    return updatedBrand;
  }

  public createBrand(data: Partial<NewspaperBrand>): NewspaperBrand {
    const brandId = `brand-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const isTelugu = data.language === 'te' || data.name?.includes('తెలుగు') || false;

    const newBrand: NewspaperBrand = {
      brandId,
      tenantId: data.tenantId || 'tenant-metro-chronicle',
      name: data.name || (isTelugu ? 'ఆంధ్ర ప్రభ దినపత్రిక' : 'The National Chronicle Daily'),
      code: data.code || (isTelugu ? 'AP' : 'NC'),
      tagline: data.tagline || (isTelugu ? 'తెలుగు ప్రజల విశ్వసనీయ వార్తా దినపత్రిక' : 'The Independent Voice of Record & Integrity'),
      logoUrl: data.logoUrl || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=120&auto=format&fit=crop&q=80',
      frequency: data.frequency || 'daily',
      volumeNumber: data.volumeNumber || 1,
      issueNumber: data.issueNumber || 1,
      autoIncrementIssue: data.autoIncrementIssue !== undefined ? data.autoIncrementIssue : true,
      paperSize: data.paperSize || 'broadsheet',
      pageCount: data.pageCount || 8,
      price: data.price || '₹5.00',
      editionsList: data.editionsList && data.editionsList.length > 0 
        ? data.editionsList 
        : (isTelugu ? ['హైదరాబాద్ మెయిన్ (Hyderabad Main)', 'విజయవాడ (Vijayawada)', 'విశాఖపట్నం (Visakhapatnam)'] : ['City Main Edition', 'National Edition', 'Metropolitan Suburbs']),
      imprint: data.imprint || {
        rniNumber: isTelugu ? 'RNI No. AP/TEL/2026/0001' : 'RNI No. DELENG/2026/0042',
        titleCode: isTelugu ? 'TEL001' : 'DELENG0042',
        editorName: isTelugu ? 'కె. వెంకటేశ్వరరావు' : 'Editor-in-Chief',
        publisherName: isTelugu ? 'న్యూస్‌ప్రెస్ పబ్లిషర్స్' : 'NewsPress Media Publications Ltd.',
        ownerName: isTelugu ? 'మీడియా ట్రస్ట్ గ్రూప్' : 'National Chronicle Media Trust',
        printingPressName: isTelugu ? 'శ్రీ సత్యసాయి రోటరీ ఆఫ్సెట్ ప్రెస్' : 'Apex Rotary Web Offset Press',
        printingPressAddress: isTelugu ? 'ప్లాట్ 12, ఇండస్ట్రియల్ ఏరియా, హైదరాబాద్ - 500076' : 'Plot 42, Industrial Area Phase II, New Delhi - 110020',
        publishedAtAddress: isTelugu ? 'ప్రెస్ భవన్, హైదరాబాద్ - 500033' : 'Press Enclave, Bahadur Shah Zafar Marg, New Delhi - 110002',
        placeOfPublication: isTelugu ? 'హైదరాబాద్ (Hyderabad)' : 'New Delhi',
        contactPhone: '+91 11-23456789',
        contactEmail: 'editor@nationalchronicle.com',
        legalJurisdiction: isTelugu ? 'హైదరాబాద్ న్యాయపరిధి' : 'Disputes subject to New Delhi Jurisdiction',
        declarationText: this.generateImprintDeclaration({
          editorName: isTelugu ? 'కె. వెంకటేశ్వరరావు' : 'Arthur J. Pendelton',
          publisherName: isTelugu ? 'న్యూస్‌ప్రెస్ పబ్లిషర్స్' : 'NewsPress Media Publications Ltd.',
          ownerName: isTelugu ? 'మీడియా ట్రస్ట్ గ్రూప్' : 'National Chronicle Media Trust',
          printingPressName: isTelugu ? 'శ్రీ సత్యసాయి రోటరీ ఆఫ్సెట్ ప్రెస్' : 'Apex Rotary Web Offset Press',
          printingPressAddress: isTelugu ? 'ప్లాట్ 12, ఇండస్ట్రియల్ ఏరియా, హైదరాబాద్ - 500076' : 'Plot 42, Industrial Area Phase II, New Delhi - 110020',
          publishedAtAddress: isTelugu ? 'ప్రెస్ భవన్, హైదరాబాద్ - 500033' : 'Press Enclave, BSZ Marg, New Delhi - 110002',
          placeOfPublication: isTelugu ? 'హైదరాబాద్' : 'New Delhi',
        }, isTelugu ? 'te' : 'en'),
      },
      masthead: data.masthead || {
        title: data.name || (isTelugu ? 'ఆంధ్ర ప్రభ' : 'THE NATIONAL CHRONICLE'),
        subtitle: data.tagline || (isTelugu ? 'దినపత్రిక • సమగ్ర వార్తా స్రవంతి' : 'DAILY MORNING NEWSPAPER • NATIONAL & WORLD DISPATCHES'),
        fontFamily: isTelugu ? "'Ramabhadra', 'Noto Serif Telugu', serif" : 'Cinzel, serif',
        fontSizePt: 52,
        style: isTelugu ? 'bilingual_banner' : 'classic_blackletter',
        showDate: true,
        showEditionNumber: true,
        showPrice: true,
        priceText: data.price ? String(data.price) : '₹5.00',
        borderColor: '#991b1b',
        showLogo: true,
        logoPlacement: 'left',
        logoHeightPx: 58,
      },
      language: data.language || (isTelugu ? 'te' : 'en'),
      defaultFonts: data.defaultFonts || {
        headlineFont: isTelugu ? "'Ramabhadra', 'Mallanna', serif" : 'Newsreader, serif',
        bodyFont: isTelugu ? "'Mallanna', sans-serif" : 'Inter, sans-serif',
        accentFont: isTelugu ? "'Mallanna', sans-serif" : 'Cinzel, serif',
        mastheadFont: isTelugu ? "'Ramabhadra', 'Noto Serif Telugu', serif" : 'Cinzel, serif',
      },
      colors: data.colors || {
        primary: '#991b1b',
        secondary: '#b91c1c',
        defaultText: '#0f172a',
        pageBackground: '#ffffff',
        accent: '#dc2626',
      },
      defaultColumnCount: data.defaultColumnCount || 8,
      defaultMargins: data.defaultMargins || {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20,
      },
      defaultGutters: data.defaultGutters !== undefined ? data.defaultGutters : 4,
      defaultTypographyScale: data.defaultTypographyScale || {
        leadHeadline: 32,
        secondaryLeadHeadline: 24,
        featureHeadline: 20,
        standardHeadline: 18,
        briefHeadline: 14,
        subheadline: 12,
        body: 10.5,
        briefBody: 9,
        caption: 8,
        byline: 9,
      },
      headerFooterRules: data.headerFooterRules || {
        showHeader: true,
        showFooter: true,
        headerRuleStyle: 'solid',
        footerRuleStyle: 'thin',
        pageNumberFormat: 'PAGE {n} OF {total}',
      },
      sectionStyles: data.sectionStyles || {},
      createdAt: now,
      updatedAt: now,
    };

    return this.saveBrand(newBrand);
  }

  public deleteBrand(brandId: string): boolean {
    if (this.inMemoryBrands.length <= 1) {
      return false; // Prevent deleting the last brand
    }
    const initialLength = this.inMemoryBrands.length;
    this.inMemoryBrands = this.inMemoryBrands.filter((b) => b.brandId !== brandId);
    if (this.inMemoryBrands.length !== initialLength) {
      this.persist();
      return true;
    }
    return false;
  }

  public resetToDefaults(): NewspaperBrand[] {
    this.inMemoryBrands = [...MOCK_BRANDS];
    this.persist();
    return this.getBrands();
  }

  public generateImprintDeclaration(imprint: Partial<StatutoryImprintDetails>, language = 'te'): string {
    const pub = imprint.publisherName || 'ప్రచురణకర్త';
    const owner = imprint.ownerName || 'యాజమాన్యం';
    const press = imprint.printingPressName || 'ముద్రణాలయం';
    const pressAddr = imprint.printingPressAddress || 'చిరునామా';
    const pubAddr = imprint.publishedAtAddress || 'ప్రచురణ కార్యాలయం';
    const place = imprint.placeOfPublication || 'హైదరాబాద్';
    const ed = imprint.editorName || 'సంపాదకుడు';

    if (language === 'te' || language === 'mixed') {
      return `ప్రచురణకర్త & ముద్రణకర్త: ${pub} చే ${owner} తరపున ముద్రించబడి ప్రచురించబడింది. ముద్రణాలయం: ${press}, ${pressAddr}. ప్రచురణ స్థలం: ${pubAddr}, ${place}. సంపాదకుడు: ${ed}* (*పి.ఆర్.బి. చట్టం ప్రకారం వార్తల ఎంపికకు బాధ్యులు).`;
    }

    return `Printed and Published by ${pub} on behalf of ${owner}. Printed at ${press}, ${pressAddr} and Published from ${pubAddr}, ${place}. Editor: ${ed}* (*Responsible for selection of news under the PRB Act).`;
  }
}

export const brandManagementService = new BrandManagementService();
