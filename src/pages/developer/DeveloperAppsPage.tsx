/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Developer Portal — API Applications Management
 * Phase 15 Implementation
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Plus,
  ExternalLink,
  Layers,
  Globe,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Terminal,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { useTenant } from '../../hooks/useTenant';
import { apiCredentialService } from '../../services/apiCredentialService';
import { ApiApplication, ApiScope, ALL_API_SCOPES, RateLimitTier } from '../../types/enterpriseApi';

export const DeveloperAppsPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.tenantId || 'tenant-metro-chronicle';

  const [apps, setApps] = useState<ApiApplication[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [appName, setAppName] = useState('');
  const [appDescription, setAppDescription] = useState('');
  const [appEnvironment, setAppEnvironment] = useState<'TEST' | 'LIVE'>('LIVE');
  const [selectedScopes, setSelectedScopes] = useState<ApiScope[]>([
    'news:read',
    'news:submit',
    'marketplace:listings:read',
    'licenses:read',
    'editions:read',
  ]);
  const [appTier, setAppTier] = useState<RateLimitTier>('PRO');
  const [formError, setFormError] = useState<string | null>(null);

  const loadApps = () => {
    const list = apiCredentialService.listApps(tenantId);
    setApps(list);
  };

  useEffect(() => {
    loadApps();
  }, [tenantId]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleScope = (scope: ApiScope) => {
    if (selectedScopes.includes(scope)) {
      setSelectedScopes(selectedScopes.filter((s) => s !== scope));
    } else {
      setSelectedScopes([...selectedScopes, scope]);
    }
  };

  const handleCreateApp = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!appName.trim()) {
      setFormError('Application name is required.');
      return;
    }

    if (selectedScopes.length === 0) {
      setFormError('Select at least one API scope.');
      return;
    }

    try {
      apiCredentialService.createApp({
        tenantId,
        name: appName.trim(),
        description: appDescription.trim(),
        environment: appEnvironment,
        allowedScopes: selectedScopes,
        rateLimitTier: appTier,
        createdBy: 'user-console-admin',
      });

      setIsCreateModalOpen(false);
      setAppName('');
      setAppDescription('');
      loadApps();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create application.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <PageHeader
        title="API Applications & Integrations"
        subtitle="Manage authorized machine-to-machine clients, publisher syndication gateways, and external CMS connectors."
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('navigate', { detail: '/developer/docs' }));
              }}
            >
              <Terminal className="w-4 h-4 mr-2" />
              API Reference
            </Button>
            <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Register API Application
            </Button>
          </div>
        }
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Total Applications</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{apps.length}</div>
          <p className="mt-1 text-xs text-slate-400">Active machine-to-machine integrations</p>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Live Production Apps</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">
            {apps.filter((a) => a.environment === 'LIVE').length}
          </div>
          <p className="mt-1 text-xs text-slate-400">Scoped to live tenant production</p>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Sandbox / Test Apps</span>
            <Globe className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400">
            {apps.filter((a) => a.environment === 'TEST').length}
          </div>
          <p className="mt-1 text-xs text-slate-400">Isolated testing sandbox</p>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Gateway Base URL</span>
            <Terminal className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-sm font-mono text-slate-200 truncate">/api/v1</div>
          <p className="mt-1 text-xs text-slate-400">Enforces scope & tenant boundaries</p>
        </Card>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {apps.length === 0 ? (
          <Card className="p-12 text-center bg-slate-900/40 border-slate-800">
            <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-200">No API Applications Registered</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mt-1 mb-4">
              Create an application to generate scoped API keys for external syndication or newsroom integrations.
            </p>
            <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Register Your First App
            </Button>
          </Card>
        ) : (
          apps.map((app) => (
            <Card key={app.appId} className="p-6 bg-slate-900/80 border-slate-800 hover:border-slate-700 transition">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-white tracking-tight">{app.name}</h3>
                    <Badge variant={app.environment === 'LIVE' ? 'emerald' : 'amber'}>
                      {app.environment}
                    </Badge>
                    <Badge variant={app.status === 'ACTIVE' ? 'blue' : 'rose'}>
                      {app.status}
                    </Badge>
                    <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                      Tier: {app.rateLimitTier}
                    </span>
                  </div>
                  {app.description && <p className="text-sm text-slate-300">{app.description}</p>}
                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                    <div className="flex items-center gap-1">
                      <span>App ID:</span>
                      <code className="text-slate-200 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                        {app.appId}
                      </code>
                      <button
                        onClick={() => handleCopy(app.appId, app.appId)}
                        className="text-slate-400 hover:text-white transition"
                        title="Copy App ID"
                      >
                        {copiedId === app.appId ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <span>•</span>
                    <span>Created: {new Date(app.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>Tenant: {app.tenantId}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('navigate', { detail: '/developer/api-keys' }));
                    }}
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Manage Keys
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('navigate', { detail: '/developer/api-usage' }));
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Usage & Limits
                  </Button>
                </div>
              </div>

              {/* Granted Scopes Badge Container */}
              <div className="mt-4 pt-4 border-t border-slate-800/60">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Granted Scopes ({app.allowedScopes.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {app.allowedScopes.map((scope) => (
                    <span
                      key={scope}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-slate-800/90 text-indigo-300 border border-slate-700/60"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 mr-1" />
                      {scope}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal: Register New Application */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Register Enterprise API Application"
      >
        <form onSubmit={handleCreateApp} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-950/50 border border-red-800/60 rounded text-sm text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Application Name
            </label>
            <Input
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="e.g. Metro Mobile News App Connector"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Description / Integration Purpose
            </label>
            <Input
              value={appDescription}
              onChange={(e) => setAppDescription(e.target.value)}
              placeholder="e.g. Ingests published wire dispatches into external native mobile client"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Environment
              </label>
              <select
                value={appEnvironment}
                onChange={(e) => setAppEnvironment(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="LIVE">LIVE (Production Data)</option>
                <option value="TEST">TEST (Sandbox Testing)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Rate Limit Tier
              </label>
              <select
                value={appTier}
                onChange={(e) => setAppTier(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="STARTER">Starter (60 rpm / 5k rpd)</option>
                <option value="PRO">Pro (300 rpm / 50k rpd)</option>
                <option value="ENTERPRISE">Enterprise (1,200 rpm / 500k rpd)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Allowed API Scopes
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-950/70 border border-slate-800 rounded-md">
              {ALL_API_SCOPES.map((scope) => {
                const checked = selectedScopes.includes(scope);
                return (
                  <label
                    key={scope}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-800/60 cursor-pointer text-xs font-mono text-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleScope(scope)}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{scope}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Keys created under this app cannot exceed these assigned scopes.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Register Application
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
