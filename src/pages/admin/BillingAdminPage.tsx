/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 7 — Platform Admin Billing Console
 */

import { useState, useEffect, ReactElement } from 'react';
import {
  Shield,
  Zap,
  Crown,
  Check,
  Award,
  Layers,
  Users,
  Plus,
  Edit,
  BarChart3,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PlanCatalogService } from '../../services/planCatalogService';
import { SubscriptionEntitlementService } from '../../services/subscriptionEntitlementService';
import { EntitlementGrantService } from '../../services/entitlementGrantService';
import { InvoiceService } from '../../services/invoiceService';
import { UsageMeteringService } from '../../services/usageMeteringService';
import { PlanRecord, PublishingPlanId, Invoice } from '../../types/billing';
import { useAuth } from '../../hooks/useAuth';

export const BillingAdminPage = (): ReactElement => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'plans' | 'grants' | 'invoices' | 'analytics'>('plans');
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<PlanRecord | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editAiLimit, setEditAiLimit] = useState<number>(0);
  const [editEditionLimit, setEditEditionLimit] = useState<number>(0);
  const [showEditModal, setShowEditModal] = useState(false);

  // Promo Grant Modal state
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantTenantId, setGrantTenantId] = useState('tenant-metro-chronicle');
  const [grantReason, setGrantReason] = useState('Partner Promotional Trial');
  const [grantDays, setGrantDays] = useState(30);

  const [notice, setNotice] = useState<string | null>(null);

  const loadAdminData = () => {
    setPlans(PlanCatalogService.getAllPlans());
    setInvoices(InvoiceService.getAllInvoices());
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleOpenEditPlan = (plan: PlanRecord) => {
    setSelectedPlanForEdit(plan);
    setEditPrice(plan.price);
    setEditAiLimit(plan.limits.monthlyAIUsageLimit);
    setEditEditionLimit(plan.limits.editionLimit);
    setShowEditModal(true);
  };

  const handleSavePlanUpdates = () => {
    if (!selectedPlanForEdit) return;

    PlanCatalogService.updatePlanConfig(
      selectedPlanForEdit.planId,
      {
        price: editPrice,
        limits: {
          ...selectedPlanForEdit.limits,
          monthlyAIUsageLimit: editAiLimit,
          editionLimit: editEditionLimit,
        },
      },
      user?.uid || 'super_admin',
      user?.displayName || 'Super Admin'
    );

    setNotice(`Updated plan ${selectedPlanForEdit.planId} to new version!`);
    setShowEditModal(false);
    loadAdminData();
  };

  const handleCreateGrant = () => {
    if (!grantTenantId) return;

    const startsAt = new Date().toISOString();
    const endsAt = new Date(Date.now() + grantDays * 86400 * 1000).toISOString();

    EntitlementGrantService.createGrant({
      tenantId: grantTenantId,
      source: 'PROMOTION',
      reason: grantReason,
      grantedBy: user?.uid || 'super_admin',
      startsAt,
      endsAt,
      limits: {
        monthlyAIUsageLimit: 5000,
      },
    });

    setNotice(`Granted promotional bonus to tenant ${grantTenantId}!`);
    setShowGrantModal(false);
    loadAdminData();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-sans">Platform Billing & Catalog Console</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Super-admin tools for publishing plan versions, promotional grants, invoices, and platform usage analytics.
          </p>
        </div>

        <Button variant="outline" onClick={loadAdminData} className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh Data
        </Button>
      </div>

      {notice && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm rounded-xl flex items-center justify-between">
          <span>{notice}</span>
          <Button size="sm" variant="outline" onClick={() => setNotice(null)} className="border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
            Dismiss
          </Button>
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('plans')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'plans' ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Plan Catalog & Versions
        </button>

        <button
          onClick={() => setActiveTab('grants')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'grants' ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Promotional Grants
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'invoices' ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          System Invoices
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'analytics' ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Usage Analytics
        </button>
      </div>

      {/* Tab 1: Plan Catalog */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.planId} className="p-6 space-y-4">
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
                  <Badge variant="blue">v{plan.version}</Badge>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white font-sans">{plan.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{plan.description}</p>
                </div>

                <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                  ₹{plan.price.toLocaleString()} <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">/ mo</span>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Monthly AI Limit:</span>
                    <span className="font-mono">{plan.limits.monthlyAIUsageLimit} ops</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Edition Limit:</span>
                    <span className="font-mono">{plan.limits.editionLimit} / mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Staff / Reporters:</span>
                    <span className="font-mono">{plan.limits.staffMemberLimit} / {plan.limits.reporterLimit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Storage:</span>
                    <span className="font-mono">{Math.round(plan.limits.storageLimitMb / 1000)} GB</span>
                  </div>
                </div>

                <Button onClick={() => handleOpenEditPlan(plan)} variant="outline" className="w-full border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  <Edit className="w-3.5 h-3.5 mr-2" /> Configure Version
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Promotional Grants */}
      {activeTab === 'grants' && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-sans">Promotional & Administrative Grants</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Issue temporary entitlement overrides or bonus usage quotas to tenants.</p>
            </div>
            <Button onClick={() => setShowGrantModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> Issue Grant
            </Button>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-400">
            Promotional grants dynamically override tenant entitlement snapshots for the specified duration with full audit logging.
          </div>
        </Card>
      )}

      {/* Tab 3: System Invoices */}
      {activeTab === 'invoices' && (
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white font-sans">Global Invoice Ledger</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">All tenant subscription invoices generated across the platform.</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Tenant ID</th>
                  <th className="p-3">Provider</th>
                  <th className="p-3">Subtotal</th>
                  <th className="p-3">Tax</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-slate-400 dark:text-slate-500">No invoices recorded yet.</td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.invoiceId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-mono text-slate-900 dark:text-slate-200">{inv.invoiceNumber}</td>
                      <td className="p-3">{inv.tenantId}</td>
                      <td className="p-3 uppercase font-mono text-slate-500 dark:text-slate-400">{inv.provider}</td>
                      <td className="p-3 font-mono">₹{inv.subtotal.toLocaleString()}</td>
                      <td className="p-3 font-mono text-slate-500 dark:text-slate-400">₹{inv.tax.toLocaleString()}</td>
                      <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">₹{inv.total.toLocaleString()}</td>
                      <td className="p-3">
                        <Badge variant={inv.status === 'PAID' ? 'emerald' : 'blue'}>{inv.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Edit Plan Modal */}
      {showEditModal && selectedPlanForEdit && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title={`Update Version for ${selectedPlanForEdit.planId}`}
        >
          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
            <div>
              <label className="block font-semibold mb-1">Monthly Price (INR):</label>
              <input
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(Number(e.target.value))}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2.5 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Monthly AI Operation Limit:</label>
              <input
                type="number"
                value={editAiLimit}
                onChange={(e) => setEditAiLimit(Number(e.target.value))}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2.5 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Monthly Newspaper Edition Limit:</label>
              <input
                type="number"
                value={editEditionLimit}
                onChange={(e) => setEditEditionLimit(Number(e.target.value))}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2.5 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button onClick={handleSavePlanUpdates} className="bg-blue-600 hover:bg-blue-700 text-white">
                Save New Version
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Grant Modal */}
      {showGrantModal && (
        <Modal
          isOpen={showGrantModal}
          onClose={() => setShowGrantModal(false)}
          title="Issue Administrative Promotional Grant"
        >
          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
            <div>
              <label className="block font-semibold mb-1">Target Tenant ID:</label>
              <input
                type="text"
                value={grantTenantId}
                onChange={(e) => setGrantTenantId(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2.5 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Grant Reason:</label>
              <input
                type="text"
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2.5 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Duration (Days):</label>
              <input
                type="number"
                value={grantDays}
                onChange={(e) => setGrantDays(Number(e.target.value))}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2.5 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" onClick={() => setShowGrantModal(false)}>Cancel</Button>
              <Button onClick={handleCreateGrant} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Issue Grant
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
