/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 7 — Publisher Subscription, Billing & Usage Management Page
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Zap,
  Crown,
  Check,
  AlertTriangle,
  CreditCard,
  Download,
  Calendar,
  Layers,
  Users,
  HardDrive,
  FileText,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  XCircle,
  HelpCircle,
  Award,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { SubscriptionEntitlementService } from '../../services/subscriptionEntitlementService';
import { PlanCatalogService } from '../../services/planCatalogService';
import { SubscriptionUpgradeService } from '../../services/subscriptionUpgradeService';
import { InvoiceService } from '../../services/invoiceService';
import { EntitlementGrantService } from '../../services/entitlementGrantService';
import { PaymentProviderFactory } from '../../services/payment/PaymentProviderFactory';
import { PublishingPlanId, PublisherSubscription, Invoice, PlanRecord, EntitlementGrant } from '../../types/billing';

export const PublisherBillingPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  const [subscription, setSubscription] = useState<PublisherSubscription | null>(null);
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [grants, setGrants] = useState<EntitlementGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Upgrade/Downgrade Modal state
  const [selectedPlanForChange, setSelectedPlanForChange] = useState<PlanRecord | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Usage state
  const [aiUsage, setAiUsage] = useState({ used: 0, limit: 0, remaining: 0 });
  const [editionUsage, setEditionUsage] = useState({ used: 0, limit: 0, remaining: 0 });
  const [newsUsage, setNewsUsage] = useState({ used: 0, limit: 0, remaining: 0 });

  const loadBillingData = () => {
    if (!currentTenant) return;
    setLoading(true);

    const { subscription: sub } = SubscriptionEntitlementService.getOrCreateSubscription(currentTenant.tenantId);
    setSubscription(sub);

    const catalogPlans = PlanCatalogService.getActivePlans();
    setPlans(catalogPlans);

    const tenantInvoices = InvoiceService.getTenantInvoices(currentTenant.tenantId);
    setInvoices(tenantInvoices);

    const activeGrants = EntitlementGrantService.getActiveGrants(currentTenant.tenantId);
    setGrants(activeGrants);

    setAiUsage(SubscriptionEntitlementService.getRemainingUsage(currentTenant.tenantId, 'AI_HEADLINE'));
    setEditionUsage(SubscriptionEntitlementService.getRemainingUsage(currentTenant.tenantId, 'EDITION_CREATED'));
    setNewsUsage(SubscriptionEntitlementService.getRemainingUsage(currentTenant.tenantId, 'NEWS_PROCESSED'));

    setLoading(false);
  };

  useEffect(() => {
    loadBillingData();
  }, [currentTenant]);

  if (!currentTenant) {
    return <div className="p-8 text-slate-400">Please select an organization tenant to view billing.</div>;
  }

  const handleOpenPlanModal = (plan: PlanRecord) => {
    setSelectedPlanForChange(plan);
    setShowPlanModal(true);
    setActionError(null);
  };

  const handleConfirmPlanChange = async () => {
    if (!selectedPlanForChange || !currentTenant || !subscription) return;
    setProcessingPayment(true);
    setActionError(null);

    try {
      const isUpgrade = selectedPlanForChange.price >= subscription.price;

      if (isUpgrade) {
        // Process checkout or immediate upgrade
        const provider = PaymentProviderFactory.getProvider(subscription.provider);
        await provider.createSubscription({
          tenantId: currentTenant.tenantId,
          planId: selectedPlanForChange.planId,
          planVersion: selectedPlanForChange.version,
          billingInterval: selectedPlanForChange.billingInterval,
          currency: selectedPlanForChange.currency,
          price: selectedPlanForChange.price,
        });

        SubscriptionUpgradeService.upgradePlan(
          currentTenant.tenantId,
          selectedPlanForChange.planId,
          user?.uid || 'user-admin',
          user?.displayName || 'Publisher Admin'
        );

        setActionSuccess(`Successfully upgraded to ${selectedPlanForChange.name}!`);
      } else {
        // Downgrade
        SubscriptionUpgradeService.downgradePlan(currentTenant.tenantId, selectedPlanForChange.planId, {
          immediate: false,
          actorId: user?.uid,
          actorName: user?.displayName || 'Admin',
        });

        setActionSuccess(`Scheduled downgrade to ${selectedPlanForChange.name} at the end of your billing cycle.`);
      }

      setShowPlanModal(false);
      loadBillingData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to process plan change.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCancelSubscription = () => {
    if (!currentTenant || !subscription) return;
    if (confirm('Are you sure you want to cancel your subscription at the end of the billing period?')) {
      subscription.cancelAtPeriodEnd = true;
      subscription.updatedAt = new Date().toISOString();
      SubscriptionEntitlementService.setSubscription(currentTenant.tenantId, subscription);
      setActionSuccess('Subscription set to cancel at current period end.');
      loadBillingData();
    }
  };

  const getStatusBadge = (status: PublisherSubscription['status']) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="emerald" className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">ACTIVE</Badge>;
      case 'TRIALING':
        return <Badge variant="blue" className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">14-DAY TRIAL</Badge>;
      case 'PAST_DUE':
        return <Badge variant="amber" className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">PAST DUE</Badge>;
      case 'GRACE_PERIOD':
        return <Badge variant="rose" className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800">GRACE PERIOD</Badge>;
      case 'CANCELLED':
        return <Badge variant="default" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">CANCELLED</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-sans">Publisher Subscription & Billing</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage newsroom publishing plans, billing cycles, AI usage quotas, and invoices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadBillingData} className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm rounded-xl flex items-center gap-2">
          <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Active Subscription Banner */}
      {subscription && (
        <Card className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Current Plan</span>
                {getStatusBadge(subscription.status)}
                {subscription.remediationRequired && (
                  <Badge variant="amber" className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Remediation Required
                  </Badge>
                )}
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-sans">
                {subscription.planId} Publishing Plan
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Billing Period: {new Date(subscription.currentPeriodStart).toLocaleDateString()} —{' '}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            </div>

            <div className="flex items-center gap-6 text-right">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Subscription Fee</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                  ₹{subscription.price.toLocaleString()} <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">/ mo</span>
                </span>
              </div>

              {subscription.cancelAtPeriodEnd ? (
                <div className="text-left bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 p-3 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                  Subscription will end on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </div>
              ) : (
                <Button variant="outline" onClick={handleCancelSubscription} className="border-rose-300 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950">
                  Cancel Plan
                </Button>
              )}
            </div>
          </div>

          {/* Grace Period or Remediation Alerts */}
          {subscription.status === 'GRACE_PERIOD' && (
            <div className="p-4 bg-rose-950/60 border border-rose-800 text-rose-200 text-xs rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>
                  Your last payment failed. Your account is in a 7-day grace period ending on{' '}
                  {subscription.gracePeriodEnd ? new Date(subscription.gracePeriodEnd).toLocaleDateString() : 'soon'}. Please update your payment method to avoid service interruption.
                </span>
              </div>
              <Button size="sm" className="bg-rose-600 hover:bg-rose-500 text-white shrink-0">
                Pay Now
              </Button>
            </div>
          )}

          {/* Visual Usage Meters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {/* Meter 1: AI Operations */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" /> AI Editorial Operations
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {aiUsage.used} / {aiUsage.limit === 0 ? '0' : aiUsage.limit}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all"
                  style={{ width: `${aiUsage.limit > 0 ? Math.min(100, Math.round((aiUsage.used / aiUsage.limit) * 100)) : 0}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {aiUsage.limit === 0 ? 'Generative AI disabled on Basic' : `${aiUsage.remaining} operations remaining this cycle`}
              </p>
            </div>

            {/* Meter 2: Editions Created */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Newspaper Editions
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {editionUsage.used} / {editionUsage.limit}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full transition-all"
                  style={{ width: `${editionUsage.limit > 0 ? Math.min(100, Math.round((editionUsage.used / editionUsage.limit) * 100)) : 0}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {editionUsage.remaining} edition creations remaining
              </p>
            </div>

            {/* Meter 3: News Dispatches Processed */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" /> News Processing
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {newsUsage.used} / {newsUsage.limit}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all"
                  style={{ width: `${newsUsage.limit > 0 ? Math.min(100, Math.round((newsUsage.used / newsUsage.limit) * 100)) : 0}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {newsUsage.remaining} article dispatches available
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Active Promotional / Entitlement Grants Banner */}
      {grants.length > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold text-sm">
            <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Active Administrative Promotional Grants
          </div>
          <div className="space-y-1">
            {grants.map((g) => (
              <div key={g.grantId} className="text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between">
                <span>
                  <strong>{g.source} Grant:</strong> {g.reason}
                </span>
                <span className="text-blue-700 dark:text-blue-400 font-mono">
                  Valid until {new Date(g.endsAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Publishing Plans Comparison Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white font-sans">Available Publishing Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = subscription?.planId === plan.planId;
            return (
              <Card
                key={plan.planId}
                className={`flex flex-col justify-between border transition-all ${
                  isCurrent
                    ? 'border-blue-600 ring-2 ring-blue-500/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      {plan.planId === 'PREMIUM' ? (
                        <Crown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      ) : plan.planId === 'STANDARD' ? (
                        <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Shield className="w-4 h-4 text-slate-400" />
                      )}
                      {plan.planId}
                    </span>
                    {isCurrent && <Badge variant="blue">Active</Badge>}
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white font-sans">{plan.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{plan.description}</p>
                  </div>

                  <div className="text-3xl font-bold text-slate-900 dark:text-white font-mono pt-2">
                    ₹{plan.price.toLocaleString()}{' '}
                    <span className="text-xs font-sans font-normal text-slate-500 dark:text-slate-400">/ month</span>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{plan.limits.monthlyAIUsageLimit} Monthly AI Operations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{plan.limits.editionLimit} Newspaper Editions / mo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Up to {plan.limits.staffMemberLimit} Staff & {plan.limits.reporterLimit} Reporters</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{Math.round(plan.limits.storageLimitMb / 1000)} GB Production Storage</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Support: {plan.features.supportLevel}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <Button
                    onClick={() => handleOpenPlanModal(plan)}
                    disabled={isCurrent}
                    variant={isCurrent ? 'outline' : 'primary'}
                    className="w-full"
                  >
                    {isCurrent ? 'Current Plan' : `Switch to ${plan.planId}`}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Invoices & Billing History */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white font-sans">Billing History & Invoices</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Download official tax invoices and review transaction logs.</p>
          </div>
        </div>

        {invoices.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No historical invoices generated yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Issued Date</th>
                  <th className="p-3">Period</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Tax</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.map((inv) => (
                  <tr key={inv.invoiceId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-medium text-slate-900 dark:text-slate-200">{inv.invoiceNumber}</td>
                    <td className="p-3">{new Date(inv.issuedAt).toLocaleDateString()}</td>
                    <td className="p-3 text-slate-500 dark:text-slate-400">
                      {new Date(inv.billingPeriodStart).toLocaleDateString()} - {new Date(inv.billingPeriodEnd).toLocaleDateString()}
                    </td>
                    <td className="p-3 font-mono font-medium text-slate-900 dark:text-slate-100">₹{inv.subtotal.toLocaleString()}</td>
                    <td className="p-3 font-mono text-slate-500 dark:text-slate-400">₹{inv.tax.toLocaleString()}</td>
                    <td className="p-3">
                      <Badge variant={inv.status === 'PAID' ? 'emerald' : inv.status === 'OPEN' ? 'blue' : 'rose'}>
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline" className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                        <Download className="w-3.5 h-3.5 mr-1" /> PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Plan Change Modal */}
      {showPlanModal && selectedPlanForChange && (
        <Modal
          isOpen={showPlanModal}
          onClose={() => setShowPlanModal(false)}
          title={`Confirm Plan Change to ${selectedPlanForChange.name}`}
        >
          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
            <p>
              You are selecting the <strong>{selectedPlanForChange.name}</strong> ({selectedPlanForChange.planId}) plan priced at{' '}
              <strong className="text-slate-900 dark:text-white font-mono">₹{selectedPlanForChange.price.toLocaleString()} / month</strong>.
            </p>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Monthly Plan Rate:</span>
                <span className="font-mono text-slate-900 dark:text-white">₹{selectedPlanForChange.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Estimated GST (18%):</span>
                <span className="font-mono text-slate-900 dark:text-white">₹{Math.round(selectedPlanForChange.price * 0.18).toLocaleString()}</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                <span>Total Due:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">₹{Math.round(selectedPlanForChange.price * 1.18).toLocaleString()}</span>
              </div>
            </div>

            {actionError && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl">
                {actionError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <Button variant="outline" onClick={() => setShowPlanModal(false)} className="border-slate-700 text-slate-300">
                Cancel
              </Button>

              <Button onClick={handleConfirmPlanChange} disabled={processingPayment} className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium">
                {processingPayment ? 'Processing...' : 'Confirm & Authorize'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
