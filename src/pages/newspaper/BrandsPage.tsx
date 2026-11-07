/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Newspaper Brands & Paper Settings Management Page
 * National SaaS interface for configuring multi-lingual newspaper brands,
 * 5 readymade masthead templates, custom designed logo artwork as the sole title (plain text optional),
 * logo upload & positioning (Left, Center, Right, Full Banner), physical dimensions, and Indian PRB Act statutory imprints.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  BookOpen,
  Layers,
  Type,
  Globe,
  Sliders,
  Check,
  Edit3,
  Trash2,
  Calendar,
  Sparkles,
  ShieldCheck,
  Printer,
  FileText,
  DollarSign,
  AlertCircle,
  Copy,
  CheckCircle2,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Maximize2,
  X,
  Palette,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useTenant } from '../../hooks/useTenant';
import { usePermission } from '../../hooks/usePermission';
import {
  NewspaperBrand,
  PublicationFrequency,
  PaperSizeFormat,
  StatutoryImprintDetails,
  LogoPlacement,
} from '../../types/edition';
import { brandManagementService } from '../../services/brandManagementService';
import { NewspaperMastheadRenderer } from '../../components/newspaper/NewspaperMastheadRenderer';
import { READYMADE_MASTHEAD_TEMPLATES, ReadymadeTemplate } from '../../data/readymadeMastheadTemplates';

const PAPER_SIZES: { id: PaperSizeFormat; name: string; dims: string; cols: number }[] = [
  { id: 'broadsheet', name: 'Broadsheet (Standard Daily)', dims: '350 × 540 mm', cols: 8 },
  { id: 'tabloid', name: 'Tabloid (Compact Daily)', dims: '280 × 380 mm', cols: 5 },
  { id: 'berliner', name: 'Berliner Format', dims: '315 × 470 mm', cols: 6 },
  { id: 'a3', name: 'A3 Compact Format', dims: '297 × 420 mm', cols: 6 },
  { id: 'a4', name: 'A4 Digital / Print Edition', dims: '210 × 297 mm', cols: 4 },
];

const FREQUENCIES: { id: PublicationFrequency; name: string; desc: string }[] = [
  { id: 'daily', name: 'Daily Morning', desc: 'Published 7 days a week' },
  { id: 'evening', name: 'Evening Daily', desc: 'Published 6 days a week in afternoon' },
  { id: 'weekly', name: 'Weekly Magazine', desc: 'Published once a week' },
  { id: 'biweekly', name: 'Fortnightly', desc: 'Published every two weeks' },
  { id: 'monthly', name: 'Monthly Journal', desc: 'Published once a month' },
];

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English (National Language of Record)' },
  { code: 'hi', label: 'Hindi (हिन्दी)' },
  { code: 'te', label: 'Telugu (తెలుగు)' },
  { code: 'mixed', label: 'Bilingual / Multi-language Edition' },
  { code: 'ta', label: 'Tamil (தமிழ்)' },
  { code: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
  { code: 'mr', label: 'Marathi (मराठी)' },
  { code: 'bn', label: 'Bengali (বাংলা)' },
  { code: 'gu', label: 'Gujarati (ગુજરાતી)' },
  { code: 'ml', label: 'Malayalam (മലയാളം)' },
  { code: 'pa', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'ur', label: 'Urdu (اردو)' },
  { code: 'or', label: 'Odia (ଓଡ଼ିଆ)' },
  { code: 'as', label: 'Assamese (অসমీయా)' },
];

export const BrandsPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { can } = usePermission();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [brands, setBrands] = useState<NewspaperBrand[]>(() => brandManagementService.getBrands());
  const [selectedBrand, setSelectedBrand] = useState<NewspaperBrand>(() => brandManagementService.getActiveBrand());
  const [activeBrandId, setActiveBrandId] = useState<string>(() => brandManagementService.getActiveBrand().brandId);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [activeModalTab, setActiveModalTab] = useState<'templates' | 'masthead' | 'basic' | 'dimensions' | 'imprint'>('templates');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<NewspaperBrand>>({});
  const [editionsInput, setEditionsInput] = useState('');

  // Reload brands on custom event
  useEffect(() => {
    const handleUpdate = () => {
      const refreshed = brandManagementService.getBrands();
      setBrands(refreshed);
      const active = brandManagementService.getActiveBrand();
      setActiveBrandId(active.brandId);
      if (!selectedBrand || !refreshed.find((b) => b.brandId === selectedBrand.brandId)) {
        setSelectedBrand(active);
      } else {
        const updatedSelected = refreshed.find((b) => b.brandId === selectedBrand.brandId);
        if (updatedSelected) setSelectedBrand(updatedSelected);
      }
    };

    window.addEventListener('newspress:brands-updated', handleUpdate);
    return () => window.removeEventListener('newspress:brands-updated', handleUpdate);
  }, [selectedBrand]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalMode('create');
    setActiveModalTab('templates');
    const defaultTmpl = READYMADE_MASTHEAD_TEMPLATES[0];
    setFormData({
      tenantId: currentTenant.tenantId,
      name: 'The National Chronicle Daily',
      code: 'NC',
      tagline: defaultTmpl.subtitle,
      language: 'en',
      frequency: 'daily',
      volumeNumber: defaultTmpl.defaultVolume,
      issueNumber: defaultTmpl.defaultIssue,
      autoIncrementIssue: true,
      paperSize: 'broadsheet',
      pageCount: 16,
      price: defaultTmpl.defaultPrice,
      defaultColumnCount: 8,
      defaultMargins: { top: 20, bottom: 20, left: 20, right: 20 },
      defaultGutters: 4,
      logoUrl: defaultTmpl.logoUrl,
      masthead: {
        title: 'THE NATIONAL CHRONICLE',
        subtitle: defaultTmpl.subtitle,
        fontFamily: defaultTmpl.fontFamily,
        fontSizePt: defaultTmpl.fontSizePt,
        style: 'classic_blackletter',
        showDate: true,
        showEditionNumber: true,
        showPrice: true,
        priceText: defaultTmpl.defaultPrice,
        borderColor: defaultTmpl.borderColor,
        showLogo: true,
        showTitleText: false, // Custom artwork logo is the sole title!
        logoUrl: defaultTmpl.logoUrl,
        logoPlacement: defaultTmpl.logoPlacement,
        logoHeightPx: defaultTmpl.logoHeightPx,
        templatePreset: defaultTmpl.id,
      },
      imprint: {
        rniNumber: 'RNI No. DELENG/1982/10294',
        titleCode: 'DELENG00188',
        editorName: 'Arthur J. Pendelton (Editor-in-Chief)',
        publisherName: 'Chronicle Media Group Ltd. by Rajeshwar Rao',
        ownerName: 'Chronicle Media Trust Holdings',
        printingPressName: 'Apex Web Rotary Offset Presses Pvt. Ltd.',
        printingPressAddress: 'Plot 12, Industrial Area Phase II, Okhla, New Delhi - 110020',
        publishedAtAddress: 'Press House, 4/12 Asaf Ali Road, New Delhi - 110002',
        placeOfPublication: 'New Delhi',
        contactPhone: '+91 11-23278890',
        contactEmail: 'desk@nationalchronicle.com',
        legalJurisdiction: 'Disputes subject to High Court of Delhi Jurisdiction',
      },
      editionsList: ['National Capital Main', 'Mumbai Financial Bureau', 'Bengaluru Tech Edition', 'Hyderabad Bureau', 'Chennai Edition'],
    });
    setEditionsInput('National Capital Main, Mumbai Financial Bureau, Bengaluru Tech Edition, Hyderabad Bureau, Chennai Edition');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (brandToEdit: NewspaperBrand = selectedBrand) => {
    setModalMode('edit');
    setActiveModalTab('templates');
    const cloned = JSON.parse(JSON.stringify(brandToEdit));
    if (!cloned.masthead.logoPlacement) {
      cloned.masthead.logoPlacement = 'center';
    }
    if (!cloned.masthead.logoUrl && cloned.logoUrl) {
      cloned.masthead.logoUrl = cloned.logoUrl;
    }
    if (cloned.masthead.showLogo === undefined) {
      cloned.masthead.showLogo = true;
    }
    // Default showTitleText to false if logo is present
    if (cloned.masthead.showTitleText === undefined) {
      cloned.masthead.showTitleText = !cloned.masthead.logoUrl;
    }
    setFormData(cloned);
    setEditionsInput((brandToEdit.editionsList || ['Main Edition', 'Metro City']).join(', '));
    setIsModalOpen(true);
  };

  // Apply one of the 5 readymade templates
  const handleApplyReadymadeTemplate = (tmpl: ReadymadeTemplate) => {
    setFormData((prev) => ({
      ...prev,
      price: tmpl.defaultPrice,
      volumeNumber: tmpl.defaultVolume,
      issueNumber: tmpl.defaultIssue,
      tagline: tmpl.subtitle,
      logoUrl: tmpl.logoUrl,
      masthead: {
        ...(prev.masthead || {
          title: prev.name || 'NEWSPAPER TITLE',
          showDate: true,
          showEditionNumber: true,
          showPrice: true,
        }),
        templatePreset: tmpl.id,
        templateLayout: tmpl.layoutStyle,
        logoPlacement: tmpl.logoPlacement,
        showLogo: true,
        showTitleText: tmpl.showTitleText, // Custom artwork logo is the title
        logoUrl: tmpl.logoUrl,
        bannerImageUrl: tmpl.bannerImageUrl || '',
        logoHeightPx: tmpl.logoHeightPx,
        borderColor: tmpl.borderColor,
        subtitle: tmpl.subtitle,
        fontFamily: tmpl.fontFamily,
        fontSizePt: tmpl.fontSizePt,
        priceText: tmpl.defaultPrice,
      },
    }));
  };

  // Handle Logo File Upload (converts to DataURL)
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      setFormData((prev) => ({
        ...prev,
        logoUrl: dataUrl,
        masthead: {
          ...(prev.masthead || ({} as any)),
          logoUrl: dataUrl,
          showLogo: true,
          showTitleText: false, // Use uploaded custom logo as the main title!
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  // Handle Full Banner File Upload
  const handleBannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      setFormData((prev) => ({
        ...prev,
        masthead: {
          ...(prev.masthead || ({} as any)),
          bannerImageUrl: dataUrl,
          logoPlacement: 'full',
          showLogo: true,
          showTitleText: false,
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  // Remove Logo
  const handleRemoveLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logoUrl: '',
      masthead: {
        ...(prev.masthead || ({} as any)),
        logoUrl: '',
        showLogo: false,
        showTitleText: true, // Fallback to text title if logo removed
        bannerImageUrl: '',
      },
    }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (bannerInputRef.current) bannerInputRef.current.value = '';
  };

  // Handle Save
  const handleSaveBrand = () => {
    if (!formData.name?.trim()) {
      alert('Please enter a valid Publication Full Name.');
      return;
    }

    const processedEditions = editionsInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const imprintData = formData.imprint || {
      editorName: 'Editor-in-Chief',
      publisherName: 'NewsPress Publications Ltd.',
      ownerName: 'Media Trust Holdings',
      printingPressName: 'Apex Rotary Press',
      printingPressAddress: 'Industrial Area Phase II',
      publishedAtAddress: 'Press House Office',
      placeOfPublication: 'New Delhi',
    };

    const autoDeclaration = brandManagementService.generateImprintDeclaration(
      imprintData,
      formData.language || 'en'
    );

    const mergedImprint: StatutoryImprintDetails = {
      ...imprintData,
      declarationText: imprintData.declarationText || autoDeclaration,
    };

    if (modalMode === 'create') {
      const created = brandManagementService.createBrand({
        ...formData,
        editionsList: processedEditions,
        imprint: mergedImprint,
      });
      setSelectedBrand(created);
      setActiveBrandId(created.brandId);
      setSaveSuccessMsg(`Publication brand '${created.name}' was created successfully!`);
    } else {
      const updated = brandManagementService.saveBrand({
        ...(formData as NewspaperBrand),
        editionsList: processedEditions,
        imprint: mergedImprint,
      });
      setSelectedBrand(updated);
      setSaveSuccessMsg(`Settings for '${updated.name}' have been saved successfully!`);
    }

    setIsModalOpen(false);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Set as Active
  const handleSetActive = (brandId: string) => {
    brandManagementService.setActiveBrandId(brandId);
    setActiveBrandId(brandId);
    setSaveSuccessMsg('Publication activated as the primary active imprint.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Delete Brand
  const handleDeleteBrand = (brandId: string) => {
    if (brands.length <= 1) {
      alert('At least one publication brand must remain active. You cannot delete the last brand.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete the publication brand '${selectedBrand.name}'?`)) {
      brandManagementService.deleteBrand(brandId);
      const remaining = brandManagementService.getBrands();
      setBrands(remaining);
      setSelectedBrand(remaining[0]);
    }
  };

  // Reset Defaults
  const handleResetDefaults = () => {
    if (window.confirm('Reset all newspaper brand settings to factory default presets?')) {
      const refreshed = brandManagementService.resetToDefaults();
      setBrands(refreshed);
      setSelectedBrand(refreshed[0]);
      setActiveBrandId(refreshed[0].brandId);
    }
  };

  const previewBrand: NewspaperBrand = {
    ...(selectedBrand || {}),
    ...(formData as any),
    masthead: {
      ...(selectedBrand?.masthead || {}),
      ...(formData.masthead || {}),
    },
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <PageHeader
        title="Newspaper Brands & Paper Settings"
        subtitle={`Configure print mastheads, 5 readymade templates, custom logo artwork, publication frequency, issue numbering, and Indian PRB Act statutory imprints.`}
        breadcrumbs={[
          { label: 'Newspaper', href: '#' },
          { label: 'Paper Settings & Brands' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={handleResetDefaults}
              title="Reset to factory presets"
            >
              Reset Presets
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={handleOpenCreate}
            >
              + Create New Paper Brand
            </Button>
          </div>
        }
      />

      {/* Success Notification */}
      {saveSuccessMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 p-3.5 rounded-xl flex items-center justify-between text-emerald-800 dark:text-emerald-200 text-sm shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold">{saveSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMsg(null)}
            className="text-xs text-emerald-600 hover:text-emerald-900 font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Brand List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              Configured Publications ({brands.length})
            </h3>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
              Click paper to edit
            </span>
          </div>

          <div className="space-y-2.5">
            {brands.map((brand) => {
              const isSelected = selectedBrand.brandId === brand.brandId;
              const isActive = activeBrandId === brand.brandId;

              return (
                <div
                  key={brand.brandId}
                  onClick={() => setSelectedBrand(brand)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-600 shadow-sm ring-1 ring-blue-500'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-sans font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {brand.name}
                        </h4>
                        {isActive && (
                          <Badge variant="primary" className="text-[9px] py-0 px-1.5 font-bold uppercase">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {brand.tagline || brand.masthead?.subtitle}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono font-bold uppercase shrink-0">
                      {brand.code}
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-sans text-slate-600 dark:text-slate-400 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-medium">
                      {brand.defaultColumnCount || 8} Cols
                    </span>
                    <span className="capitalize bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-medium">
                      {brand.frequency || 'Daily'}
                    </span>
                    <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-medium">
                      Artwork: {brand.masthead?.logoPlacement?.toUpperCase() || 'CENTER'}
                    </span>
                    <span className="text-amber-700 dark:text-amber-400 font-bold ml-auto">
                      {brand.masthead?.priceText || brand.price || '₹5.00'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center text-xs border-dashed"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={handleOpenCreate}
          >
            + Add New Publication Brand
          </Button>
        </div>

        {/* Right Section: Details, Live Masthead Canvas & Imprint Preview */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            variant="editorial"
            title={
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base">{selectedBrand.name}</span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {selectedBrand.code}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {activeBrandId !== selectedBrand.brandId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleSetActive(selectedBrand.brandId)}
                    >
                      Make Active Publication
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                    onClick={() => handleOpenEdit(selectedBrand)}
                  >
                    Edit Paper Settings
                  </Button>
                  {brands.length > 1 && (
                    <button
                      onClick={() => handleDeleteBrand(selectedBrand.brandId)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Delete this publication brand"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            }
            subtitle="Custom-designed calligraphic logo artwork title, dual-ear panels, and Indian PRB Act statutory imprint statement."
          >
            {/* 1. Live Masthead Canvas Preview using NewspaperMastheadRenderer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  1. Live Custom Masthead Canvas Preview
                </span>
                <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                  Artwork Title ({selectedBrand.masthead?.logoPlacement?.toUpperCase() || 'CENTER'})
                </span>
              </div>

              {/* Rendered Live Canvas */}
              <NewspaperMastheadRenderer
                brand={selectedBrand}
                publicationDate="Friday, November 7, 2026"
                editionName={selectedBrand.editionsList?.[0] || 'Main Metro Edition'}
              />
            </div>

            {/* 2. Indian Statutory Imprint Box (PRB Act Statement) */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  2. Indian Press & Registration of Periodicals (PRB Act) Statutory Imprint
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {selectedBrand.imprint?.rniNumber || 'RNI Registered'}
                </span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-sans space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-slate-500 block text-[10px]">EDITOR-IN-CHIEF:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {selectedBrand.imprint?.editorName || 'Editor Name'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">RNI REGISTRATION NUMBER:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                      {selectedBrand.imprint?.rniNumber || 'RNI No. DELENG/2026/0001'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">PRINTING PRESS:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {selectedBrand.imprint?.printingPressName} — {selectedBrand.imprint?.printingPressAddress}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">PUBLICATION OFFICE (PUBLISHED AT):</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {selectedBrand.imprint?.publishedAtAddress}, {selectedBrand.imprint?.placeOfPublication}
                    </span>
                  </div>
                </div>

                {/* Official Declaration Text Box */}
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                  <span className="font-bold text-slate-900 dark:text-white block mb-0.5">
                    Statutory Imprint Statement (PRB Act):
                  </span>
                  {selectedBrand.imprint?.declarationText ||
                    brandManagementService.generateImprintDeclaration(
                      selectedBrand.imprint || {},
                      selectedBrand.language
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
                  <span>Jurisdiction: {selectedBrand.imprint?.legalJurisdiction || 'High Court of Jurisdiction'}</span>
                  <span>Phone: {selectedBrand.imprint?.contactPhone || 'N/A'}</span>
                  <span>Email: {selectedBrand.imprint?.contactEmail || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* 3. Physical Specs & Typography Summary */}
            <div className="mt-6 space-y-3">
              <h4 className="text-xs font-sans uppercase font-bold text-slate-700 dark:text-slate-300 tracking-wider">
                3. Physical Page Dimensions & Publication Specifications
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans">
                <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 block text-[10px]">PAPER SIZE</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold text-sm uppercase">
                    {selectedBrand.paperSize || 'Broadsheet'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {PAPER_SIZES.find((p) => p.id === selectedBrand.paperSize)?.dims || '350 × 540 mm'}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 block text-[10px]">PAGE COUNT</span>
                  <span className="text-slate-900 dark:text-slate-200 font-bold text-sm">
                    {selectedBrand.pageCount || 8} Pages
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {selectedBrand.defaultColumnCount || 8} Columns per page
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 block text-[10px]">ARTWORK PLACEMENT</span>
                  <span className="text-slate-900 dark:text-slate-200 font-bold text-sm uppercase">
                    {selectedBrand.masthead?.logoPlacement || 'CENTER'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Height: {selectedBrand.masthead?.logoHeightPx || 64}px
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 block text-[10px]">RETAIL COVER PRICE</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    {selectedBrand.masthead?.priceText || selectedBrand.price || '₹5.00'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Indian National Rupee (INR)
                  </span>
                </div>
              </div>

              {/* Regional Editions List */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1.5">
                  Configured Regional Editions:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedBrand.editionsList || ['Main Edition', 'Metro City']).map(
                    (ed, i) => (
                      <span
                        key={i}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-[11px] font-medium text-slate-800 dark:text-slate-200"
                      >
                        {ed}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COMPREHENSIVE PAPER SETTINGS & BRAND CREATION / EDITING MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalMode === 'create'
            ? 'Create New Publication Brand'
            : `Edit Paper Settings: ${formData.name || ''}`
        }
        subtitle="Select from 5 readymade masthead templates, upload your custom designed logo artwork, and configure PRB imprint."
        maxWidth="5xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-500 font-sans">
              * All changes are saved automatically to your workspace cache.
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Check className="w-4 h-4" />}
                onClick={handleSaveBrand}
              >
                {modalMode === 'create' ? 'Create Publication Brand' : 'Save Settings'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Modal Tabs Header */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto gap-2">
            <button
              onClick={() => setActiveModalTab('templates')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeModalTab === 'templates'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Palette className="w-4 h-4" />
              1. 5 Readymade Masthead Templates
            </button>

            <button
              onClick={() => setActiveModalTab('masthead')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeModalTab === 'masthead'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              2. Custom Logo Artwork & Alignment
            </button>

            <button
              onClick={() => setActiveModalTab('basic')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeModalTab === 'basic'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              3. Publication Details
            </button>

            <button
              onClick={() => setActiveModalTab('dimensions')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeModalTab === 'dimensions'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Sliders className="w-4 h-4" />
              4. Dimensions & Issue Sequencing
            </button>

            <button
              onClick={() => setActiveModalTab('imprint')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeModalTab === 'imprint'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              5. Indian PRB Statutory Imprint
            </button>
          </div>

          {/* TAB 1: 5 READYMADE MASTHEAD TEMPLATES */}
          {activeModalTab === 'templates' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Choose from 5 Professional Readymade Masthead Templates
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Each template uses an authentic custom designed vector logo artwork (no plain computer font), with calibrated ear panels and borders.
                  </p>
                </div>
              </div>

              {/* 5 Templates Grid */}
              <div className="grid grid-cols-1 gap-3.5">
                {READYMADE_MASTHEAD_TEMPLATES.map((tmpl) => {
                  const isCurrent =
                    formData.masthead?.templateLayout === tmpl.layoutStyle ||
                    formData.masthead?.templatePreset === tmpl.id ||
                    formData.masthead?.logoUrl === tmpl.logoUrl;

                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => handleApplyReadymadeTemplate(tmpl)}
                      className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                        isCurrent
                          ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-600 ring-2 ring-blue-500 shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-700">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {tmpl.name}
                            </span>
                            <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold">
                              {tmpl.layoutName}
                            </span>
                            {isCurrent && (
                              <Badge variant="primary" className="text-[9px] uppercase font-bold">
                                Active Layout
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11.5px] text-slate-600 dark:text-slate-300 mt-1 font-medium">
                            {tmpl.layoutDescription}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant={isCurrent ? 'primary' : 'outline'}
                          size="sm"
                          className="shrink-0 text-xs"
                          leftIcon={isCurrent ? <Check className="w-3.5 h-3.5" /> : undefined}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyReadymadeTemplate(tmpl);
                          }}
                        >
                          {isCurrent ? 'Applied Design' : 'Select This Design'}
                        </Button>
                      </div>

                      {/* Key Architectural Features Tags */}
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {tmpl.features.map((feat, fIdx) => (
                          <span
                            key={fIdx}
                            className="bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900 px-2 py-0.5 rounded text-[10px] font-medium"
                          >
                            ✓ {feat}
                          </span>
                        ))}
                      </div>

                      {/* Visual Artwork Thumbnail */}
                      <div className="mt-2.5 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                        <img
                          src={tmpl.logoUrl}
                          alt={tmpl.name}
                          className="max-h-[52px] object-contain"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Live Preview */}
              <div className="space-y-1.5 pt-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Live Masthead Canvas with Selected Readymade Template:
                </span>
                <NewspaperMastheadRenderer
                  brand={previewBrand}
                  isCompact={true}
                  publicationDate="Friday, November 7, 2026"
                  editionName={previewBrand.editionsList?.[0] || 'National Main Edition'}
                />
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOM LOGO ARTWORK & ALIGNMENT */}
          {activeModalTab === 'masthead' && (
            <div className="space-y-5">
              {/* LOGO UPLOAD & POSITIONING BOX */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      Custom Designed Logo Artwork (Primary Title)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Upload your publication's stylized logo artwork. Modern newspapers use custom designed logos as their primary title.
                    </p>
                  </div>

                  <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={formData.masthead?.showLogo !== false}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          masthead: { ...(prev.masthead || ({} as any)), showLogo: e.target.checked },
                        }))
                      }
                      className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Enable Logo Artwork</span>
                  </label>
                </div>

                {/* Plain Text Title Toggle (Disabled by default!) */}
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.masthead?.showTitleText === true}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          masthead: { ...(prev.masthead || ({} as any)), showTitleText: e.target.checked },
                        }))
                      }
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                        Also display plain font computer text alongside logo (Optional)
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Leave unchecked (recommended) so your custom designed logo artwork acts as the sole, clean newspaper title.
                      </span>
                    </div>
                  </label>
                </div>

                {/* LOGO PLACEMENT BUTTONS (LEFT, CENTER, RIGHT, FULL) */}
                <div>
                  <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Logo Artwork Placement / Alignment:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {/* LEFT */}
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          masthead: { ...(prev.masthead || ({} as any)), logoPlacement: 'left' },
                        }))
                      }
                      className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        (formData.masthead?.logoPlacement || 'center') === 'left'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-slate-400'
                      }`}
                    >
                      <AlignLeft className="w-4 h-4" />
                      <span>Left Side</span>
                    </button>

                    {/* CENTER */}
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          masthead: { ...(prev.masthead || ({} as any)), logoPlacement: 'center' },
                        }))
                      }
                      className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        (formData.masthead?.logoPlacement || 'center') === 'center'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-slate-400'
                      }`}
                    >
                      <AlignCenter className="w-4 h-4" />
                      <span>Centered (Classic)</span>
                    </button>

                    {/* RIGHT */}
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          masthead: { ...(prev.masthead || ({} as any)), logoPlacement: 'right' },
                        }))
                      }
                      className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        formData.masthead?.logoPlacement === 'right'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-slate-400'
                      }`}
                    >
                      <AlignRight className="w-4 h-4" />
                      <span>Right Side</span>
                    </button>

                    {/* FULL */}
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          masthead: { ...(prev.masthead || ({} as any)), logoPlacement: 'full' },
                        }))
                      }
                      className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        formData.masthead?.logoPlacement === 'full'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-slate-400'
                      }`}
                    >
                      <Maximize2 className="w-4 h-4" />
                      <span>Full Header Banner</span>
                    </button>
                  </div>
                </div>

                {/* 5 DISTINCT ARCHITECTURAL LAYOUT DESIGNS SELECTOR */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Masthead Architectural Design & Layout Structure:
                  </span>
                  <p className="text-[11px] text-slate-500 mb-2.5">
                    Your logo artwork adapts automatically into any of these 5 distinct newspaper header architectures:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {[
                      {
                        id: 'broadsheet_classic',
                        name: 'Design 1: Century Broadsheet',
                        sub: 'Twin ears (Weather & Bullion) + Oxford double rules',
                        badge: 'Traditional Broadsheet',
                      },
                      {
                        id: 'vernacular_ribbon',
                        name: 'Design 2: Vernacular Dual-Ear Ribbon',
                        sub: 'Red top ribbon + Front-page ear ads (Eenadu/Sakshi style)',
                        badge: 'Indian Regional Daily',
                      },
                      {
                        id: 'modern_tabloid',
                        name: 'Design 3: Modern Tabloid & Metro',
                        sub: 'Cobalt hero brand block + 3-story preview pointers',
                        badge: 'Urban Tabloid',
                      },
                      {
                        id: 'royal_herald',
                        name: 'Design 4: Imperial Royal Herald',
                        sub: 'Burgundy & gold + Flanked editorial charter medallions',
                        badge: 'Victorian Prestige',
                      },
                      {
                        id: 'commercial_banner',
                        name: 'Design 5: Commercial Header Plate',
                        sub: 'Top leaderboard ad banner + Multi-city tabs & barcode',
                        badge: 'Commercial Full',
                      },
                    ].map((layout) => {
                      const isSelected =
                        (formData.masthead?.templateLayout || formData.masthead?.templatePreset) === layout.id;
                      return (
                        <button
                          key={layout.id}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              masthead: {
                                ...(prev.masthead || ({} as any)),
                                templateLayout: layout.id,
                              },
                            }))
                          }
                          className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 ring-2 ring-blue-500'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                            <span className="text-[11.5px]">{layout.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                          </div>
                          <span className="text-[9px] uppercase font-bold text-blue-600 dark:text-blue-400 block mt-0.5">
                            {layout.badge}
                          </span>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                            {layout.sub}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* UPLOAD & CONTROLS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Upload Custom Logo Artwork from Computer
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        leftIcon={<Upload className="w-3.5 h-3.5" />}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Choose Logo Image File...
                      </Button>
                      {(formData.masthead?.logoUrl || formData.logoUrl) && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="text-xs text-red-600 hover:text-red-700 font-semibold p-1.5 flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" /> Remove
                        </button>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Replaces template logo with your custom design. Supports PNG, SVG, JPG, WebP.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Logo Height / Scale ({formData.masthead?.logoHeightPx || 64}px)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={30}
                        max={120}
                        step={2}
                        value={formData.masthead?.logoHeightPx || 64}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            masthead: {
                              ...(prev.masthead || ({} as any)),
                              logoHeightPx: Number(e.target.value),
                            },
                          }))
                        }
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-blue-600"
                      />
                      <span className="text-xs font-mono font-bold w-12 text-right">
                        {formData.masthead?.logoHeightPx || 64}px
                      </span>
                    </div>
                  </div>
                </div>

                {/* If Full Banner is selected, also offer full header artwork banner upload */}
                {formData.masthead?.logoPlacement === 'full' && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-300 dark:border-blue-900 text-xs space-y-2">
                    <span className="font-bold text-blue-900 dark:text-blue-200 block">
                      Full Graphic Artwork Header Banner
                    </span>
                    <p className="text-[11px] text-blue-800 dark:text-blue-300">
                      Upload a ready-designed graphic header banner covering the entire horizontal width of the broadsheet.
                    </p>
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleBannerFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      leftIcon={<Upload className="w-3.5 h-3.5" />}
                      onClick={() => bannerInputRef.current?.click()}
                    >
                      Upload Full Header Artwork Image...
                    </Button>
                  </div>
                )}
              </div>

              {/* Subtitle & Borders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Masthead Subtitle / Tagline Strip
                  </label>
                  <input
                    type="text"
                    value={formData.masthead?.subtitle || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        masthead: { ...(prev.masthead || ({} as any)), subtitle: e.target.value },
                      }))
                    }
                    placeholder="e.g. THE INDEPENDENT VOICE OF RECORD SINCE 1894"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Border Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.masthead?.borderColor || '#0f172a'}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          masthead: { ...(prev.masthead || ({} as any)), borderColor: e.target.value },
                        }))
                      }
                      className="w-14 h-10 p-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer"
                    />
                    <span className="text-xs font-mono font-bold text-slate-600">
                      {formData.masthead?.borderColor || '#0f172a'}
                    </span>
                  </div>
                </div>
              </div>

              {/* LIVE PREVIEW RIGHT IN MODAL */}
              <div className="space-y-1.5 pt-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Live Masthead Canvas Preview:
                </span>
                <NewspaperMastheadRenderer
                  brand={previewBrand}
                  isCompact={true}
                  publicationDate="Friday, November 7, 2026"
                  editionName={previewBrand.editionsList?.[0] || 'National Main Edition'}
                />
              </div>
            </div>
          )}

          {/* TAB 3: BASIC INFO */}
          {activeModalTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Publication Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        name: e.target.value,
                        masthead: {
                          ...(prev.masthead || ({} as any)),
                          title: prev.masthead?.title || e.target.value,
                        },
                      }))
                    }
                    placeholder="e.g. The National Chronicle / Dainik Navbharat / Andhra Prabha"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Short Imprint Code (e.g. NC, MC, AP) *
                  </label>
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="NC"
                    maxLength={5}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white uppercase font-mono focus:ring-1 focus:ring-blue-500 outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tagline / Motto
                </label>
                <input
                  type="text"
                  value={formData.tagline || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tagline: e.target.value }))}
                  placeholder="e.g. The Independent Voice of Truth, Investigative Rigor & Public Record"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Language
                  </label>
                  <select
                    value={formData.language || 'en'}
                    onChange={(e) => setFormData((prev) => ({ ...prev, language: e.target.value }))}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Publication Frequency
                  </label>
                  <select
                    value={formData.frequency || 'daily'}
                    onChange={(e) => setFormData((prev) => ({ ...prev, frequency: e.target.value as any }))}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} — ({f.desc})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Retail Cover Price (INR)
                  </label>
                  <input
                    type="text"
                    value={formData.price || formData.masthead?.priceText || '₹5.00'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        price: val,
                        masthead: {
                          ...(prev.masthead || ({} as any)),
                          priceText: val,
                        },
                      }));
                    }}
                    placeholder="₹5.00"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Configured Regional Editions (Comma separated)
                </label>
                <input
                  type="text"
                  value={editionsInput}
                  onChange={(e) => setEditionsInput(e.target.value)}
                  placeholder="e.g. National Capital Main, Mumbai Financial Bureau, Bengaluru Tech, Hyderabad Bureau"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Separate regional edition names with commas. Each edition can be dispatched separately to local printing presses.
                </span>
              </div>
            </div>
          )}

          {/* TAB 4: DIMENSIONS & ISSUE NO */}
          {activeModalTab === 'dimensions' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Paper Size Format
                  </label>
                  <select
                    value={formData.paperSize || 'broadsheet'}
                    onChange={(e) => {
                      const sz = e.target.value as PaperSizeFormat;
                      const matched = PAPER_SIZES.find((p) => p.id === sz);
                      setFormData((prev) => ({
                        ...prev,
                        paperSize: sz,
                        defaultColumnCount: matched ? matched.cols : prev.defaultColumnCount,
                      }));
                    }}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    {PAPER_SIZES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.dims}) — {p.cols} Columns
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Default Page Count per Issue
                  </label>
                  <select
                    value={formData.pageCount || 8}
                    onChange={(e) => setFormData((prev) => ({ ...prev, pageCount: Number(e.target.value) }))}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    <option value={4}>4 Pages (Compact / Supplement)</option>
                    <option value={8}>8 Pages (Standard Daily Issue)</option>
                    <option value={12}>12 Pages (City + Regional Bureau Issue)</option>
                    <option value={16}>16 Pages (Full National Broadsheet)</option>
                    <option value={20}>20 Pages (Sunday Weekend Special)</option>
                    <option value={24}>24 Pages (Mega Bumper Issue)</option>
                  </select>
                </div>
              </div>

              {/* Volume & Issue Number */}
              <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900 space-y-3">
                <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  Volume & Issue Number Sequencing
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Current Volume Number
                    </label>
                    <input
                      type="number"
                      value={formData.volumeNumber || 1}
                      onChange={(e) => setFormData((prev) => ({ ...prev, volumeNumber: Number(e.target.value) }))}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Current Issue Number
                    </label>
                    <input
                      type="number"
                      value={formData.issueNumber || 1}
                      onChange={(e) => setFormData((prev) => ({ ...prev, issueNumber: Number(e.target.value) }))}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none font-bold"
                    />
                  </div>
                </div>

                {/* Continue / Auto-increment tick option */}
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer bg-white dark:bg-slate-900 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <input
                      type="checkbox"
                      checked={formData.autoIncrementIssue !== false}
                      onChange={(e) => setFormData((prev) => ({ ...prev, autoIncrementIssue: e.target.checked }))}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">
                        Continue & Auto-increment from this issue sequence
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                        Automatically increments the publication issue number (+1) for every daily night-press publishing run.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Columns & Margins */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Columns Count
                  </label>
                  <select
                    value={formData.defaultColumnCount || 8}
                    onChange={(e) => setFormData((prev) => ({ ...prev, defaultColumnCount: Number(e.target.value) }))}
                    className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value={4}>4 Columns</option>
                    <option value={5}>5 Columns</option>
                    <option value={6}>6 Columns</option>
                    <option value={8}>8 Columns (Indian Daily Standard)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Top Margin (mm)
                  </label>
                  <input
                    type="number"
                    value={formData.defaultMargins?.top ?? 20}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        defaultMargins: {
                          ...(prev.defaultMargins || { top: 20, bottom: 20, left: 20, right: 20 }),
                          top: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bottom Margin (mm)
                  </label>
                  <input
                    type="number"
                    value={formData.defaultMargins?.bottom ?? 20}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        defaultMargins: {
                          ...(prev.defaultMargins || { top: 20, bottom: 20, left: 20, right: 20 }),
                          bottom: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Column Gutter (mm)
                  </label>
                  <input
                    type="number"
                    value={formData.defaultGutters ?? 4}
                    onChange={(e) => setFormData((prev) => ({ ...prev, defaultGutters: Number(e.target.value) }))}
                    className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: INDIAN STATUTORY PRB ACT IMPRINT */}
          {activeModalTab === 'imprint' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-300 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  Indian Press and Registration of Periodicals (PRB Act) Regulatory Compliance
                </span>
                <p className="text-[11px] mt-1 leading-relaxed">
                  Under the Indian Press and Registration of Books / Periodicals Act, every newspaper issue must carry an official statutory imprint line identifying the Editor, Publisher, Owner, and Printing Press address with RNI registration details.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Editor-in-Chief Name *
                  </label>
                  <input
                    type="text"
                    value={formData.imprint?.editorName || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        imprint: { ...(prev.imprint || ({} as any)), editorName: e.target.value },
                      }))
                    }
                    placeholder="e.g. Arthur J. Pendelton / కె. వెంకటేశ్వరరావు"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none font-bold"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    *Responsible for selection of news under the PRB Act
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    RNI Registration Number (RNI No.)
                  </label>
                  <input
                    type="text"
                    value={formData.imprint?.rniNumber || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        imprint: { ...(prev.imprint || ({} as any)), rniNumber: e.target.value },
                      }))
                    }
                    placeholder="e.g. RNI No. DELENG/1982/10294"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Printed & Published By *
                  </label>
                  <input
                    type="text"
                    value={formData.imprint?.publisherName || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        imprint: { ...(prev.imprint || ({} as any)), publisherName: e.target.value },
                      }))
                    }
                    placeholder="e.g. NewsPress Publications Ltd. by Rajeshwar Rao"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Owner / Publishing Company Name
                  </label>
                  <input
                    type="text"
                    value={formData.imprint?.ownerName || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        imprint: { ...(prev.imprint || ({} as any)), ownerName: e.target.value },
                      }))
                    }
                    placeholder="e.g. Chronicle Media Trust Holdings"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Printing Press Name *
                  </label>
                  <input
                    type="text"
                    value={formData.imprint?.printingPressName || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        imprint: { ...(prev.imprint || ({} as any)), printingPressName: e.target.value },
                      }))
                    }
                    placeholder="e.g. Apex Web Rotary Offset Presses Pvt. Ltd."
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Place of Publication (City / State) *
                  </label>
                  <input
                    type="text"
                    value={formData.imprint?.placeOfPublication || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        imprint: { ...(prev.imprint || ({} as any)), placeOfPublication: e.target.value },
                      }))
                    }
                    placeholder="e.g. New Delhi / Hyderabad / Mumbai"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Printing Press Full Address *
                </label>
                <textarea
                  rows={2}
                  value={formData.imprint?.printingPressAddress || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      imprint: { ...(prev.imprint || ({} as any)), printingPressAddress: e.target.value },
                    }))
                  }
                  placeholder="e.g. Plot 12, Industrial Area Phase II, Okhla, New Delhi - 110020"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Publication Office Full Address (Published From) *
                </label>
                <textarea
                  rows={2}
                  value={formData.imprint?.publishedAtAddress || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      imprint: { ...(prev.imprint || ({} as any)), publishedAtAddress: e.target.value },
                    }))
                  }
                  placeholder="e.g. Press House, 4/12 Asaf Ali Road, New Delhi - 110002"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={formData.imprint?.contactPhone || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        imprint: { ...(prev.imprint || ({} as any)), contactPhone: e.target.value },
                      }))
                    }
                    placeholder="+91 11-23278890"
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Editorial / Desk Email
                  </label>
                  <input
                    type="email"
                    value={formData.imprint?.contactEmail || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        imprint: { ...(prev.imprint || ({} as any)), contactEmail: e.target.value },
                      }))
                    }
                    placeholder="editor@nationalchronicle.com"
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Legal Court Jurisdiction
                  </label>
                  <input
                    type="text"
                    value={formData.imprint?.legalJurisdiction || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        imprint: { ...(prev.imprint || ({} as any)), legalJurisdiction: e.target.value },
                      }))
                    }
                    placeholder="e.g. High Court of Delhi"
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
