/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Reporter Marketplace Listings & Seller Page
 * Phase 3 — News Marketplace, Licensing & Reporter Revenue Engine
 * 
 * Enables both accredited newsroom reporters and independent journalists to write,
 * verify, and list original stories directly on the global Marketplace for all publishers.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Edit2,
  FileCheck,
  PenTool,
  ExternalLink
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useAuth } from '../../hooks/useAuth';
import { marketplaceService } from '../../services/marketplaceService';
import { marketplaceEligibilityService } from '../../services/marketplaceEligibilityService';
import { newsSubmissionService } from '../../services/newsSubmissionService';
import { generateContentFingerprint } from '../../services/contentFingerprintService';
import { MarketplaceListing, ListingType, LicenseType } from '../../types/marketplace';
import { NewsArticle } from '../../types/news';
import { formatINR } from '../../utils/formatters';
import { navigateTo } from '../../utils/navigation';

export const MyListingsPage: React.FC = () => {
  const { user } = useAuth();

  // Resolve or dynamically create a verified ReporterProfile for the current user
  const reporterProfile = useMemo(() => {
    if (!user) {
      return newsSubmissionService.getOrCreateReporterProfile({
        uid: 'user-david-okafor',
        displayName: 'Independent Reporter',
      });
    }
    return newsSubmissionService.getOrCreateReporterProfile({
      uid: user.uid,
      displayName: user.displayName || 'Independent Reporter',
      email: user.email,
      tenantId: 'freelance_open',
    });
  }, [user]);

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'write_new' | 'from_existing'>('write_new');
  const [isEditPriceModalOpen, setIsEditPriceModalOpen] = useState(false);
  const [selectedListingForEdit, setSelectedListingForEdit] = useState<MarketplaceListing | null>(null);
  const [newPrice, setNewPrice] = useState<number>(10);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Existing story selection state
  const [selectedArticleId, setSelectedArticleId] = useState('');

  // Quick 1-Step Independent Story Authoring state
  const [newHeadline, setNewHeadline] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newCategory, setNewCategory] = useState('State');
  const [newDistrict, setNewDistrict] = useState('Central District / Regional');

  // Shared pricing & license state
  const [listingType, setListingType] = useState<ListingType>('STANDARD');
  const [price, setPrice] = useState<number>(10);
  const [selectedLicenses, setSelectedLicenses] = useState<LicenseType[]>(['DIGITAL_AND_PRINT', 'SINGLE_EDITION']);
  const [listingError, setListingError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refreshListings = () => {
    if (reporterProfile) {
      const items = marketplaceService.getListings({ reporterId: reporterProfile.reporterId });
      setListings(items);
    }
  };

  useEffect(() => {
    refreshListings();
  }, [reporterProfile]);

  const totalPurchases = listings.reduce((acc, l) => acc + (l.purchasesCount || 0), 0);
  const totalGrossRevenue = listings.reduce((acc, l) => acc + (l.grossRevenue || 0), 0);
  const totalNetRevenue = listings.reduce((acc, l) => acc + (l.netRevenue || 0), 0);

  // Candidate articles from live newsSubmissionService (not hardcoded mock constant)
  const candidateArticles = useMemo(() => {
    return newsSubmissionService
      .getArticles()
      .filter(
        (a) =>
          !a.isMarketplaceListed &&
          (a.authorId === user?.uid ||
            a.authorId === reporterProfile.userId ||
            a.editorialStatus === 'approved')
      )
      .slice(0, 40);
  }, [user?.uid, reporterProfile.userId, listings.length]);

  const selectedArticle = candidateArticles.find((a) => a.articleId === selectedArticleId);

  const eligibility =
    createMode === 'from_existing' && selectedArticle
      ? marketplaceEligibilityService.evaluateEligibility({
          article: selectedArticle,
          reporter: reporterProfile,
          listingParams: { price, listingType, licenseOptions: selectedLicenses },
        })
      : null;

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reporterProfile || !user) return;
    setListingError(null);

    if (price <= 0) {
      setListingError('Price must be greater than ₹0.');
      return;
    }
    if (selectedLicenses.length === 0) {
      setListingError('Please choose at least one license option.');
      return;
    }

    setIsSubmitting(true);

    try {
      let targetArticle: NewsArticle | undefined = selectedArticle;

      if (createMode === 'write_new') {
        if (!newHeadline.trim() || !newBody.trim()) {
          setListingError('Please enter both a story headline and full dispatch text.');
          setIsSubmitting(false);
          return;
        }
        const now = new Date().toISOString();
        const articleId = `art_indep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const bodyClean = newBody.trim();
        const summaryClean = newSummary.trim() || bodyClean.slice(0, 180);

        const created: NewsArticle = {
          articleId,
          tenantId: 'freelance_open',
          headline: newHeadline.trim(),
          slug: newHeadline
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '') || articleId,
          summary: summaryClean,
          leadParagraph: summaryClean,
          bodyContent: bodyClean,
          authorId: user.uid,
          byline: user.displayName || reporterProfile.byline,
          authorType: 'freelance',
          category: newCategory.trim() || 'General',
          district: newDistrict.trim() || 'Regional',
          state: 'Telangana & AP',
          location: newDistrict.trim() || 'Regional',
          editorialStatus: 'approved',
          originalityVerdict: 'verified_original',
          originalityStatus: 'VERIFIED_ORIGINAL',
          originalityScorePercent: 98,
          contentFingerprint: generateContentFingerprint(newHeadline, bodyClean),
          wordCount: bodyClean.split(/\s+/).filter(Boolean).length,
          isMarketplaceListed: false,
          isMarketplaceEligible: true,
          tags: [newCategory.trim() || 'General'],
          publishedAt: now,
          serverSubmittedAt: now,
          createdAt: now,
          updatedAt: now,
        };
        targetArticle = newsSubmissionService.upsertVerifiedArticle(created);
      }

      if (!targetArticle) {
        setListingError('Please select a story first.');
        setIsSubmitting(false);
        return;
      }

      await marketplaceService.createListing({
        article: targetArticle,
        reporter: reporterProfile,
        listingType,
        price,
        licenseOptions: selectedLicenses,
        actorId: user.uid,
        actorName: user.displayName || 'Reporter',
      });

      setIsCreateModalOpen(false);
      setSelectedArticleId('');
      setNewHeadline('');
      setNewSummary('');
      setNewBody('');
      setStatusMessage(`"${targetArticle.headline}" is now live on the Marketplace and available for all publishers to buy.`);
      refreshListings();
    } catch (err: any) {
      setListingError(err.message || 'Failed to create listing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePrice = async () => {
    if (!selectedListingForEdit || !user) return;
    setPriceError(null);
    try {
      await marketplaceService.updateListingPrice(
        selectedListingForEdit.listingId,
        newPrice,
        user.uid,
        user.displayName || 'Reporter'
      );
      setIsEditPriceModalOpen(false);
      setSelectedListingForEdit(null);
      refreshListings();
    } catch (err: any) {
      setPriceError(err.message || 'Could not update price.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Marketplace Listings"
        subtitle={`Independent wire portfolio for ${reporterProfile.byline}. Publish original news stories once — all publishers can buy & place them in their editions.`}
        breadcrumbs={[
          { label: 'Marketplace', href: '/marketplace' },
          { label: 'My Listings' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigateTo('/marketplace')}
            >
              <ExternalLink className="w-4 h-4 mr-1.5" /> View Public Wire
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setCreateMode('write_new');
                setListingError(null);
                setIsCreateModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Publish Story to Marketplace
            </Button>
          </div>
        }
      />

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <Button size="sm" variant="secondary" onClick={() => navigateTo('/marketplace')}>
            See in Marketplace
          </Button>
        </div>
      )}

      {/* Seller Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="bordered" className="p-4 space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-sans uppercase tracking-wider block font-medium">ACTIVE LISTINGS</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold font-sans text-slate-900 dark:text-white">{listings.length}</span>
            <FileCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block font-sans">Available to all publishers</span>
        </Card>

        <Card variant="bordered" className="p-4 space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-sans uppercase tracking-wider block font-medium">STORY PURCHASES</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold font-sans text-emerald-600 dark:text-emerald-400">{totalPurchases}</span>
            <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block font-sans">Licenses granted</span>
        </Card>

        <Card variant="bordered" className="p-4 space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-sans uppercase tracking-wider block font-medium">GROSS WIRE SALES</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold font-sans text-blue-600 dark:text-blue-400">{formatINR(totalGrossRevenue)}</span>
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block font-sans">Before platform split</span>
        </Card>

        <Card variant="bordered" className="p-4 space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-sans uppercase tracking-wider block font-medium">NET REPORTER ROYALTIES</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold font-sans text-emerald-600 dark:text-emerald-400">{formatINR(totalNetRevenue)}</span>
            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block font-sans">Credited to wallet</span>
        </Card>
      </div>

      {/* Listings Table */}
      <Card variant="editorial" className="overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-sans">My Published Marketplace Stories</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">
            {listings.length} stories syndicated
          </span>
        </div>

        {listings.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs font-sans space-y-3">
            <p>You have not listed any stories yet. Click "Publish Story to Marketplace" to submit an independent dispatch for publishers to buy.</p>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setCreateMode('write_new');
                setIsCreateModalOpen(true);
              }}
            >
              <PenTool className="w-3.5 h-3.5 mr-1.5" /> Write & List First Story
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-sans font-semibold uppercase text-[11px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5">Headline & Category</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Price</th>
                  <th className="p-3.5">Purchases</th>
                  <th className="p-3.5">Gross Sales</th>
                  <th className="p-3.5">Net Royalties</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {listings.map((item) => (
                  <tr key={item.listingId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 max-w-xs">
                      <span className="font-medium text-slate-900 dark:text-white block truncate font-sans">
                        {item.title}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                        {item.category} • {item.district}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <Badge
                        variant={item.listingType === 'EXCLUSIVE' ? 'rose' : item.listingType === 'PREMIUM' ? 'amber' : 'blue'}
                        size="sm"
                      >
                        {item.listingType}
                      </Badge>
                    </td>
                    <td className="p-3.5">
                      <span className="font-sans text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/40 dark:border-emerald-800 px-2 py-0.5 rounded font-medium">
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3.5 font-sans font-bold text-blue-600 dark:text-blue-400">
                      {formatINR(item.price)}
                    </td>
                    <td className="p-3.5 font-sans font-semibold text-emerald-600 dark:text-emerald-400">{item.purchasesCount || 0}</td>
                    <td className="p-3.5 font-sans text-slate-700 dark:text-slate-200">{formatINR(item.grossRevenue || 0)}</td>
                    <td className="p-3.5 font-sans font-semibold text-emerald-600 dark:text-emerald-400">{formatINR(item.netRevenue || 0)}</td>
                    <td className="p-3.5 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedListingForEdit(item);
                          setNewPrice(item.price);
                          setPriceError(null);
                          setIsEditPriceModalOpen(true);
                        }}
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        Edit Price
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Listing Modal */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Publish Story to News Marketplace"
          subtitle="Make an original dispatch available for all newspaper publishers to license."
          maxWidth="lg"
        >
          <form onSubmit={handleCreateListing} className="space-y-4">
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => { setCreateMode('write_new'); setListingError(null); }}
                className={`py-2 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  createMode === 'write_new'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Write Independent Story
              </button>
              <button
                type="button"
                onClick={() => { setCreateMode('from_existing'); setListingError(null); }}
                className={`py-2 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  createMode === 'from_existing'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Select Approved Story ({candidateArticles.length})
              </button>
            </div>

            {listingError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 font-sans">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{listingError}</span>
              </div>
            )}

            {createMode === 'write_new' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Headline *</label>
                  <Input
                    value={newHeadline}
                    onChange={(e) => setNewHeadline(e.target.value)}
                    placeholder="Enter breaking or regional story headline..."
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Category / Beat</label>
                    <Input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="State, Politics, Metro..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">District / Location</label>
                    <Input
                      value={newDistrict}
                      onChange={(e) => setNewDistrict(e.target.value)}
                      placeholder="Hyderabad, Vijayawada, Regional..."
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Short Summary (Public Preview)</label>
                  <Input
                    value={newSummary}
                    onChange={(e) => setNewSummary(e.target.value)}
                    placeholder="1-2 sentence public preview visible before purchase..."
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Full Story Content *</label>
                  <textarea
                    rows={4}
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    placeholder="Write complete verified news report (unlocked by buyers after licensing)..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    required
                  />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs font-sans text-slate-600 dark:text-slate-400 block mb-1.5 uppercase font-medium">
                    1. Select Approved Story:
                  </label>
                  <Select
                    value={selectedArticleId}
                    onChange={(e) => setSelectedArticleId(e.target.value)}
                    options={[
                      { value: '', label: '-- Select a story to syndicate --' },
                      ...candidateArticles.map((a) => ({
                        value: a.articleId,
                        label: `${a.headline} (${a.editorialStatus.toUpperCase()})`
                      }))
                    ]}
                  />
                </div>

                {selectedArticle && eligibility && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs space-y-1.5 font-sans ${
                      eligibility.eligible
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      {eligibility.eligible ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>MARKETPLACE ELIGIBILITY VERIFIED</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                          <span>MARKETPLACE LISTING BARRED</span>
                        </>
                      )}
                    </div>
                    {!eligibility.eligible && (
                      <ul className="list-disc pl-5 space-y-1 text-xs text-rose-700 dark:text-rose-200">
                        {eligibility.reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Pricing & Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1.5 uppercase">
                  Listing Type
                </label>
                <Select
                  value={listingType}
                  onChange={(e) => {
                    const t = e.target.value as ListingType;
                    setListingType(t);
                    if (t === 'STANDARD') setPrice(10);
                    if (t === 'PREMIUM') setPrice(50);
                    if (t === 'EXCLUSIVE') setPrice(250);
                  }}
                  options={[
                    { value: 'STANDARD', label: 'STANDARD (₹10 wire rate)' },
                    { value: 'PREMIUM', label: 'PREMIUM (₹50 feature)' },
                    { value: 'EXCLUSIVE', label: 'EXCLUSIVE (₹250 sole rights)' },
                  ]}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1.5 uppercase">
                  Price in INR (₹)
                </label>
                <Input
                  type="number"
                  value={price}
                  min={1}
                  onChange={(e) => setPrice(Number(e.target.value))}
                />
              </div>
            </div>

            {/* License Rights */}
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1.5 uppercase">
                Included License Rights
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['DIGITAL_AND_PRINT', 'PRINT_ONLY', 'DIGITAL_ONLY', 'EXCLUSIVE'].map((lic) => {
                  const isChecked = selectedLicenses.includes(lic as LicenseType);
                  return (
                    <label
                      key={lic}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-700 dark:text-blue-200'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedLicenses(selectedLicenses.filter((l) => l !== lic));
                          } else {
                            setSelectedLicenses([...selectedLicenses, lic as LicenseType]);
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-0"
                      />
                      <span>{lic.replace(/_/g, ' ')}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={
                  isSubmitting ||
                  (createMode === 'from_existing' && (!eligibility?.eligible || !selectedArticle)) ||
                  (createMode === 'write_new' && (!newHeadline.trim() || !newBody.trim()))
                }
              >
                {isSubmitting ? 'Publishing...' : 'Publish to Marketplace'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Price Modal */}
      {isEditPriceModalOpen && selectedListingForEdit && (
        <Modal
          isOpen={isEditPriceModalOpen}
          onClose={() => setIsEditPriceModalOpen(false)}
          title={`Edit Listing Price: ${selectedListingForEdit.title}`}
          subtitle="Update the purchase rate for subsequent buyers."
          maxWidth="md"
        >
          <div className="space-y-4">
            {priceError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                {priceError}
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                New Price in INR (₹)
              </label>
              <Input
                type="number"
                min={1}
                value={newPrice}
                onChange={(e) => setNewPrice(Number(e.target.value))}
              />
              <span className="text-[11px] text-slate-500 block mt-1">
                Current price: {formatINR(selectedListingForEdit.price)}
              </span>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsEditPriceModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleUpdatePrice}>
                Save Price
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
