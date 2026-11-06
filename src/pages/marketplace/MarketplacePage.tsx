/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Marketplace & Syndication Wire Page
 * Phase 3 — News Marketplace, Licensing & Reporter Revenue Engine
 * 
 * Strict Principle: THERE ARE NO FREE NEWS ITEMS.
 * Every marketplace item requires individual payment or consumption of an active subscription pack.
 */

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Tag,
  ShieldCheck,
  Camera,
  CheckCircle,
  AlertTriangle,
  Lock,
  Package,
  Layers,
  Sparkles,
  ExternalLink,
  Info
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { marketplaceService } from '../../services/marketplaceService';
import { exclusivityValidationService } from '../../services/exclusivityValidationService';
import {
  MarketplaceListing,
  LicenseType,
  MarketplaceSubscriptionPlan,
  MarketplaceEntitlement
} from '../../types/marketplace';
import { formatINR, formatDate } from '../../utils/formatters';

export const MarketplacePage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'all' | 'standard' | 'premium' | 'exclusive' | 'subscriptions'>('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');

  // Purchase modal state
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [selectedLicense, setSelectedLicense] = useState<LicenseType>('DIGITAL_AND_PRINT');
  const [selectedTerritory, setSelectedTerritory] = useState('Nellore District');
  const [exclusiveDays, setExclusiveDays] = useState(7);
  const [useEntitlement, setUseEntitlement] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<{ licenseId: string; title: string } | null>(null);

  // Subscription packs state
  const [plans, setPlans] = useState<MarketplaceSubscriptionPlan[]>([]);
  const [entitlement, setEntitlement] = useState<MarketplaceEntitlement | undefined>(undefined);
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Load listings and subscription data
  const [listings, setListings] = useState<MarketplaceListing[]>([]);

  const refreshData = () => {
    if (currentTenant) {
      setEntitlement(marketplaceService.getTenantEntitlement(currentTenant.tenantId));
    }
    setPlans(marketplaceService.getSubscriptionPlans());
    setListings(marketplaceService.getListings());
  };

  useEffect(() => {
    refreshData();
  }, [currentTenant]);

  // Filter listings based on active tab and search
  const filteredListings = listings.filter((l) => {
    // Tab filter
    if (activeTab === 'standard' && l.listingType !== 'STANDARD') return false;
    if (activeTab === 'premium' && l.listingType !== 'PREMIUM') return false;
    if (activeTab === 'exclusive' && l.listingType !== 'EXCLUSIVE') return false;

    // Category filter
    if (categoryFilter !== 'all' && l.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;

    // District filter
    if (districtFilter !== 'all' && l.district?.toLowerCase() !== districtFilter.toLowerCase()) return false;

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        l.title.toLowerCase().includes(q) ||
        l.shortDescription.toLowerCase().includes(q) ||
        l.reporterByline?.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  // Open purchase modal
  const handleOpenPurchase = (item: MarketplaceListing) => {
    setSelectedListing(item);
    setPurchaseError(null);
    setPurchaseSuccess(null);
    const defaultLic = item.licenseOptions[0] || 'DIGITAL_AND_PRINT';
    setSelectedLicense(defaultLic);
    setSelectedTerritory(item.district || 'Nellore District');
    // If standard and has entitlement, pre-select entitlement
    if (item.listingType === 'STANDARD' && entitlement && entitlement.remainingUnits > 0) {
      setUseEntitlement(true);
    } else {
      setUseEntitlement(false);
    }
  };

  // Execute purchase
  const handleConfirmPurchase = async () => {
    if (!selectedListing || !currentTenant || !user) return;
    setIsPurchasing(true);
    setPurchaseError(null);

    const idempotencyKey = `buy_${currentTenant.tenantId}_${selectedListing.listingId}_${Date.now()}`;

    try {
      if (useEntitlement && selectedListing.listingType === 'STANDARD') {
        // Entitlement Redemption
        const res = await marketplaceService.redeemSubscriptionEntitlement({
          idempotencyKey,
          buyerTenantId: currentTenant.tenantId,
          buyerTenantName: currentTenant.organizationName,
          buyerUserId: user.uid,
          buyerUserName: user.displayName,
          listingId: selectedListing.listingId
        });

        setPurchaseSuccess({
          licenseId: res.license.licenseId,
          title: selectedListing.title
        });
        refreshData();
      } else {
        // Individual Cash / Invoice Purchase
        const res = await marketplaceService.purchaseNews({
          idempotencyKey,
          listingId: selectedListing.listingId,
          buyerTenantId: currentTenant.tenantId,
          buyerTenantName: currentTenant.organizationName,
          buyerUserId: user.uid,
          buyerUserName: user.displayName,
          selectedLicense,
          territory: selectedTerritory,
          durationDays: selectedLicense === 'EXCLUSIVE' ? exclusiveDays : 365
        });

        setPurchaseSuccess({
          licenseId: res.license.licenseId,
          title: selectedListing.title
        });
        refreshData();
      }
    } catch (err: any) {
      setPurchaseError(err.message || 'Purchase failed.');
    } finally {
      setIsPurchasing(false);
    }
  };

  // Subscribe to plan
  const handleSubscribePlan = async (planId: string) => {
    if (!currentTenant || !user) return;
    setIsSubscribing(true);
    try {
      await marketplaceService.subscribeToPlan({
        buyerTenantId: currentTenant.tenantId,
        buyerTenantName: currentTenant.organizationName,
        buyerUserId: user.uid,
        planId
      });
      refreshData();
      setActiveTab('all');
    } catch (err: any) {
      alert(`Subscription failed: ${err.message}`);
    } finally {
      setIsSubscribing(false);
    }
  };

  // Exclusivity collision check helper
  const isExclusiveCollision =
    selectedListing?.listingType === 'EXCLUSIVE' && selectedLicense === 'EXCLUSIVE'
      ? exclusivityValidationService.checkCollision({
          newsId: selectedListing.newsId,
          territory: selectedTerritory,
          validFrom: new Date().toISOString(),
          validUntil: new Date(Date.now() + exclusiveDays * 24 * 60 * 60 * 1000).toISOString(),
          candidateBuyerTenantId: currentTenant?.tenantId || 'unknown'
        }).hasCollision
      : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="News Marketplace & Syndication Wire"
        subtitle="Licensing and wire syndication engine. There are NO free news items — all stories require a paid license or monthly subscription pack entitlement."
        breadcrumbs={[
          { label: 'Marketplace', href: '#' },
          { label: 'Syndication Wire' },
        ]}
      />

      {/* Subscription Entitlement Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-sans uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                Organization Standard News Entitlement:
              </span>
              <Badge variant={entitlement && entitlement.remainingUnits > 0 ? 'emerald' : 'outline'} size="sm">
                {entitlement && entitlement.remainingUnits > 0 ? 'ACTIVE PACK' : 'NO ACTIVE PACK'}
              </Badge>
            </div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5 font-sans">
              {entitlement ? (
                <span>
                  <strong className="text-blue-600 dark:text-blue-400 font-bold text-base">{entitlement.remainingUnits}</strong> of{' '}
                  <span className="text-slate-500 dark:text-slate-400">{entitlement.totalUnits}</span> Standard News remaining this cycle
                </span>
              ) : (
                'No active monthly news package. Subscribe to a pack for bulk discounted redemptions.'
              )}
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setActiveTab('subscriptions')}
          className="shrink-0"
        >
          <Layers className="w-4 h-4 mr-2" />
          {entitlement ? 'Manage News Packs' : 'Subscribe to Standard Pack'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-xs font-medium font-sans rounded-full transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          All Marketplace Wire
        </button>
        <button
          onClick={() => setActiveTab('standard')}
          className={`px-4 py-2 text-xs font-medium font-sans rounded-full transition-all cursor-pointer ${
            activeTab === 'standard'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Standard News (₹5 / ₹10)
        </button>
        <button
          onClick={() => setActiveTab('premium')}
          className={`px-4 py-2 text-xs font-medium font-sans rounded-full transition-all cursor-pointer ${
            activeTab === 'premium'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Premium Investigations
        </button>
        <button
          onClick={() => setActiveTab('exclusive')}
          className={`px-4 py-2 text-xs font-medium font-sans rounded-full transition-all cursor-pointer ${
            activeTab === 'exclusive'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Exclusive Territorial Rights
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`px-4 py-2 text-xs font-medium font-sans rounded-full transition-all cursor-pointer ${
            activeTab === 'subscriptions'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Monthly News Packs
        </button>
      </div>

      {activeTab === 'subscriptions' ? (
        /* Monthly Subscription Plans Showcase */
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white font-sans">Marketplace Monthly Standard News Packages</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
              Publishers can subscribe to recurring news packs to redeem verified standard stories at predictable discounted rates instead of individual pay-per-article invoices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrent = entitlement?.subscriptionId.includes(plan.planId);
              return (
                <Card
                  key={plan.planId}
                  variant={isCurrent ? 'editorial' : 'bordered'}
                  className={`flex flex-col justify-between p-6 space-y-4 relative ${
                    isCurrent ? 'border-blue-600 bg-blue-50/20 dark:bg-blue-950/20 ring-2 ring-blue-600/20' : ''
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute top-4 right-4">
                      <Badge variant="emerald" size="sm">Current Plan</Badge>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Badge variant="blue" size="sm">MONTHLY STANDARD PACK</Badge>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white font-sans">{plan.name}</h4>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold font-sans text-blue-600 dark:text-blue-400">
                        {formatINR(plan.monthlyPrice)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">/ month</span>
                    </div>

                    <ul className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 font-sans">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span><strong>{plan.includedStandardNews} Standard News</strong> redemptions</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Effective rate: ~{formatINR(Math.round(plan.monthlyPrice / plan.includedStandardNews))} / story</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{plan.premiumDiscountPercent}% Discount on Premium Dispatches</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Print & Digital broadsheet syndication clearance</span>
                      </li>
                    </ul>
                  </div>

                  <Button
                    variant={isCurrent ? 'secondary' : 'primary'}
                    onClick={() => handleSubscribePlan(plan.planId)}
                    disabled={isSubscribing}
                    className="w-full mt-4"
                  >
                    {isCurrent ? 'Renew / Top-Up Pack' : 'Activate News Pack'}
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        /* Wire Listings Search & Grid */
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="w-full md:w-80">
              <Input
                placeholder="Search headlines, beats, or reporters..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="w-36">
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Beats' },
                    { value: 'Public Works', label: 'Public Works' },
                    { value: 'Agriculture & Transit', label: 'Agriculture' },
                    { value: 'Investigative & Infrastructure', label: 'Investigative' },
                    { value: 'Investigation', label: 'Investigation' },
                  ]}
                />
              </div>

              <div className="w-36">
                <Select
                  value={districtFilter}
                  onChange={(e) => setDistrictFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Districts' },
                    { value: 'Nellore District', label: 'Nellore' },
                    { value: 'Regional', label: 'Regional' },
                  ]}
                />
              </div>

              <span className="text-xs text-slate-500 dark:text-slate-400 font-sans ml-auto">
                Showing <strong className="text-blue-600 dark:text-blue-400 font-medium">{filteredListings.length}</strong> items
              </span>
            </div>
          </div>

          {/* Listings Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredListings.map((item) => {
              const isExclusive = item.listingType === 'EXCLUSIVE';
              const isPremium = item.listingType === 'PREMIUM';
              const isStandard = item.listingType === 'STANDARD';

              return (
                <Card
                  key={item.listingId}
                  variant="default"
                  className="flex flex-col justify-between p-5 space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all hover:shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={isExclusive ? 'rose' : isPremium ? 'amber' : 'blue'}
                          size="sm"
                        >
                          {item.listingType}
                        </Badge>
                        <Badge variant="outline" size="sm">
                          {item.category}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {item.originalityStatus && (
                          <span className="text-[11px] font-sans font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50">
                            {item.originalityStatus.replace(/_/g, ' ')}
                          </span>
                        )}
                        {isExclusive && (
                          <span className="flex items-center gap-1 text-[11px] font-sans font-medium text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800/50">
                            <Lock className="w-3 h-3" /> Territorial Exclusive
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-base font-semibold text-slate-900 dark:text-white font-sans leading-snug">
                      {item.title}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                      {item.shortDescription}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-sans pt-1">
                      <span>{item.wordCount} words</span>
                      <span>•</span>
                      <span>{item.district}, {item.state}</span>
                      {item.hasPhotography && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                            <Camera className="w-3.5 h-3.5" /> {item.photoCount} High-Res Images
                          </span>
                        </>
                      )}
                    </div>

                    {/* Available License Types */}
                    <div className="pt-1">
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1.5 font-sans">
                        Available Rights:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {item.licenseOptions.map((lic) => (
                          <span
                            key={lic}
                            className="text-[11px] font-sans px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          >
                            {lic.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Byline, Price & Action */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">Byline:</span>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white font-sans">{item.reporterByline}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-lg font-bold font-sans text-slate-900 dark:text-white">
                          {formatINR(item.price)}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">
                          {isStandard && entitlement && entitlement.remainingUnits > 0
                            ? 'or 1 pack unit'
                            : 'cash / invoice'}
                        </span>
                      </div>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenPurchase(item)}
                      >
                        Acquire Rights
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Purchase & Licensing Modal */}
      {selectedListing && (
        <Modal
          isOpen={Boolean(selectedListing)}
          onClose={() => setSelectedListing(null)}
          title={`Syndication Acquisition: ${selectedListing.title}`}
          subtitle={`Select licensing scope and payment options for this ${selectedListing.listingType} news item.`}
          maxWidth="lg"
        >
          {purchaseSuccess ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white font-sans">
                Syndication Rights Granted!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto font-sans">
                Authorized license created with ID <strong className="font-mono text-blue-600 dark:text-blue-400 font-medium">{purchaseSuccess.licenseId}</strong>.
                The full story and high-res media package are now unlocked in your organization's Purchased News feed.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <Button variant="secondary" onClick={() => setSelectedListing(null)}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {purchaseError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 font-sans">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{purchaseError}</span>
                </div>
              )}

              {/* Story Summary */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5 font-sans">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Byline: {selectedListing.reporterByline}</span>
                  <span>Category: {selectedListing.category}</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                  "{selectedListing.shortDescription}"
                </p>
              </div>

              {/* Payment / Entitlement Choice */}
              {selectedListing.listingType === 'STANDARD' && entitlement && entitlement.remainingUnits > 0 ? (
                <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-xs font-sans text-slate-700 dark:text-slate-300 font-medium block">
                    Acquisition Method:
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setUseEntitlement(true)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        useEntitlement
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white font-sans">Redeem Monthly Pack</span>
                        <CheckCircle className={`w-4 h-4 ${useEntitlement ? 'text-emerald-600' : 'text-slate-400'}`} />
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans block mt-1">
                        Consumes 1 unit ({entitlement.remainingUnits} remaining)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setUseEntitlement(false)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        !useEntitlement
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white font-sans">Pay Individually</span>
                        <CheckCircle className={`w-4 h-4 ${!useEntitlement ? 'text-blue-600' : 'text-slate-400'}`} />
                      </div>
                      <span className="text-[11px] text-blue-600 dark:text-blue-400 font-sans font-medium block mt-1">
                        {formatINR(selectedListing.price)} Cash / Invoice
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-center justify-between font-sans">
                  <div>
                    <span className="text-xs text-blue-700 dark:text-blue-300 font-medium block">
                      Individual Purchase Rate:
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedListing.listingType} stories require individual purchase.
                    </span>
                  </div>
                  <span className="text-xl font-bold font-sans text-slate-900 dark:text-white">
                    {formatINR(selectedListing.price)}
                  </span>
                </div>
              )}

              {/* License Scope Selection */}
              <div className="space-y-2">
                <span className="text-xs font-sans text-slate-700 dark:text-slate-300 font-medium block">
                  Select Syndication License:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {selectedListing.licenseOptions.map((lic) => {
                    const isSelected = selectedLicense === lic;
                    return (
                      <button
                        key={lic}
                        type="button"
                        onClick={() => setSelectedLicense(lic)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <span className="text-xs font-semibold text-slate-900 dark:text-white font-sans block">
                          {lic.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans block mt-0.5">
                          {lic === 'EXCLUSIVE'
                            ? 'Exclusive territorial freeze'
                            : lic === 'PRINT_ONLY'
                            ? 'Broadsheet print release'
                            : 'Digital web and print broadcast'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Exclusive Parameters */}
              {selectedLicense === 'EXCLUSIVE' && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-3 font-sans">
                  <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                    <Lock className="w-4 h-4" />
                    <span>Exclusive Territorial Window Configuration</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-700 dark:text-slate-300 block mb-1">Protected Territory:</label>
                      <Select
                        value={selectedTerritory}
                        onChange={(e) => setSelectedTerritory(e.target.value)}
                        options={[
                          { value: 'Nellore District', label: 'Nellore District' },
                          { value: 'Andhra Pradesh', label: 'Andhra Pradesh (State)' },
                          { value: 'National', label: 'National (All Districts)' },
                        ]}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-700 dark:text-slate-300 block mb-1">Duration Window:</label>
                      <Select
                        value={String(exclusiveDays)}
                        onChange={(e) => setExclusiveDays(Number(e.target.value))}
                        options={[
                          { value: '7', label: '7 Days Lock' },
                          { value: '14', label: '14 Days Lock' },
                          { value: '30', label: '30 Days Lock' },
                        ]}
                      />
                    </div>
                  </div>

                  {isExclusiveCollision && (
                    <div className="text-[11px] text-rose-700 dark:text-rose-300 font-sans">
                      ⚠️ Warning: Exclusive rights conflict detected for this territory/time. Purchase will be blocked.
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <Button variant="secondary" onClick={() => setSelectedListing(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirmPurchase}
                  disabled={isPurchasing || isExclusiveCollision}
                >
                  {isPurchasing
                    ? 'Processing Rights...'
                    : useEntitlement
                    ? 'Confirm 1 Unit Redemption'
                    : `Confirm Purchase (${formatINR(selectedListing.price)})`}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
