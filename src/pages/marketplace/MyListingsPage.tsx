/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Reporter Marketplace Listings & Seller Page
 * Phase 3 — News Marketplace, Licensing & Reporter Revenue Engine
 * 
 * Enables accredited reporters to list original, approved reporting on the wire.
 * Strictly enforces MarketplaceEligibilityService — cannot list ineligible or disputed stories.
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  DollarSign,
  Eye,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Tag,
  Lock,
  Edit2,
  FileCheck
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
import { MarketplaceListing, ListingType, LicenseType } from '../../types/marketplace';
import { MOCK_NEWS_ARTICLES, MOCK_REPORTER_PROFILES } from '../../services/mockDataService';
import { formatINR, formatDate } from '../../utils/formatters';

export const MyListingsPage: React.FC = () => {
  const { user } = useAuth();

  // Find reporter profile corresponding to the simulated persona
  const reporterProfile =
    MOCK_REPORTER_PROFILES.find((r) => r.userId === user?.uid) ||
    MOCK_REPORTER_PROFILES.find((r) => r.reporterId === 'rep-david-okafor') ||
    MOCK_REPORTER_PROFILES[0];

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditPriceModalOpen, setIsEditPriceModalOpen] = useState(false);
  const [selectedListingForEdit, setSelectedListingForEdit] = useState<MarketplaceListing | null>(null);
  const [newPrice, setNewPrice] = useState<number>(10);

  // New listing form state
  const [selectedArticleId, setSelectedArticleId] = useState('');
  const [listingType, setListingType] = useState<ListingType>('STANDARD');
  const [price, setPrice] = useState<number>(5);
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

  // Aggregate stats
  const totalPurchases = listings.reduce((acc, l) => acc + (l.purchasesCount || 0), 0);
  const totalGrossRevenue = listings.reduce((acc, l) => acc + (l.grossRevenue || 0), 0);
  const totalNetRevenue = listings.reduce((acc, l) => acc + (l.netRevenue || 0), 0);

  // Candidate articles by this reporter
  const candidateArticles = MOCK_NEWS_ARTICLES.filter(
    (a) => a.authorId === user?.uid || a.authorId === reporterProfile.userId || a.authorId === 'user-david-okafor'
  );

  const selectedArticle = candidateArticles.find((a) => a.articleId === selectedArticleId);

  // Real-time eligibility evaluation
  const eligibility = selectedArticle
    ? marketplaceEligibilityService.evaluateEligibility({
        article: selectedArticle,
        reporter: reporterProfile,
        listingParams: { price, listingType, licenseOptions: selectedLicenses }
      })
    : null;

  // Handle create listing submission
  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArticle || !reporterProfile || !user) return;
    setListingError(null);
    setIsSubmitting(true);

    try {
      await marketplaceService.createListing({
        article: selectedArticle,
        reporter: reporterProfile,
        listingType,
        price,
        licenseOptions: selectedLicenses,
        actorId: user.uid,
        actorName: user.displayName || 'Reporter'
      });

      setIsCreateModalOpen(false);
      setSelectedArticleId('');
      refreshListings();
    } catch (err: any) {
      setListingError(err.message || 'Failed to create listing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit price
  const handleUpdatePrice = async () => {
    if (!selectedListingForEdit || !user) return;
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
      alert(`Error updating price: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Syndication Listings & Seller Dashboard"
        subtitle={`Accredited wire portfolio for ${reporterProfile.byline}. Manage rights, configure price points, and monitor syndication revenue.`}
        breadcrumbs={[
          { label: 'Marketplace', href: '#' },
          { label: 'My Listings' },
        ]}
        actions={
          <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            List News Story
          </Button>
        }
      />

      {/* Seller Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="bordered" className="p-4 space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-sans uppercase tracking-wider block font-medium">ACTIVE LISTINGS</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold font-sans text-slate-900 dark:text-white">{listings.length}</span>
            <FileCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block font-sans">Available on wire</span>
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
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-sans">Active Wire Listings</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">
            {listings.length} stories syndicated
          </span>
        </div>

        {listings.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs font-sans">
            No active listings found. Click "List News Story" above to submit an approved story to the marketplace.
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
                  <th className="p-3.5">Views</th>
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
                    <td className="p-3.5 font-sans">{item.viewsCount || 0}</td>
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
          title="List News Story on Syndication Wire"
          subtitle="Submit approved news reporting for syndication rights acquisition by publishers."
          maxWidth="lg"
        >
          <form onSubmit={handleCreateListing} className="space-y-4">
            {listingError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 font-sans">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{listingError}</span>
              </div>
            )}

            {/* Step 1: Select Story */}
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

            {/* Real-Time Domain Eligibility Gate Notice */}
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
                  <ul className="list-disc pl-5 space-y-1 text-xs text-rose-700 dark:text-rose-200 font-sans">
                    {eligibility.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
                {eligibility.eligible && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-200 font-sans">
                    Editorial status: <strong>{selectedArticle.editorialStatus}</strong> • Originality:{' '}
                    <strong>{selectedArticle.originalityStatus}</strong>. Story clears all Phase 2 domain checks.
                  </p>
                )}
              </div>
            )}

            {/* Step 2: Listing Type & Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1.5 uppercase">
                  2. Listing Type:
                </label>
                <Select
                  value={listingType}
                  onChange={(e) => {
                    const t = e.target.value as ListingType;
                    setListingType(t);
                    if (t === 'STANDARD') setPrice(5);
                    if (t === 'PREMIUM') setPrice(50);
                    if (t === 'EXCLUSIVE') setPrice(250);
                  }}
                  options={[
                    { value: 'STANDARD', label: 'STANDARD (₹5 / ₹10 wire rate)' },
                    { value: 'PREMIUM', label: 'PREMIUM (Custom investigation)' },
                    { value: 'EXCLUSIVE', label: 'EXCLUSIVE (Territorial rights)' },
                    { value: 'FEATURE', label: 'FEATURE' },
                    { value: 'INVESTIGATION', label: 'INVESTIGATION' },
                  ]}
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1.5 uppercase">
                  3. Price in INR (₹):
                </label>
                <Input
                  type="number"
                  value={price}
                  min={1}
                  onChange={(e) => setPrice(Number(e.target.value))}
                />
                <span className="text-[10px] text-slate-500 block mt-1 font-mono">
                  There are NO free news items. Price must be &gt; ₹0.
                </span>
              </div>
            </div>

            {/* License Rights */}
            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1.5 uppercase">
                4. Included Rights:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['DIGITAL_ONLY', 'PRINT_ONLY', 'DIGITAL_AND_PRINT', 'SINGLE_EDITION', 'EXCLUSIVE'].map((lic) => {
                  const isChecked = selectedLicenses.includes(lic as LicenseType);
                  return (
                    <label
                      key={lic}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                        isChecked ? 'bg-amber-500/10 border-amber-500/40 text-slate-100' : 'bg-slate-950 border-slate-800 text-slate-400'
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
                        className="rounded border-slate-700 text-amber-500 focus:ring-0"
                      />
                      <span>{lic.replace(/_/g, ' ')}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!eligibility?.eligible || isSubmitting}
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
          subtitle="Update the purchase rate for subsequent buyers. Historical purchases will remain unchanged."
          maxWidth="md"
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1">
                New Price in INR (₹):
              </label>
              <Input
                type="number"
                min={1}
                value={newPrice}
                onChange={(e) => setNewPrice(Number(e.target.value))}
              />
              <span className="text-[10px] text-slate-500 block mt-1 font-mono">
                Current price: {formatINR(selectedListingForEdit.price)}
              </span>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
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
