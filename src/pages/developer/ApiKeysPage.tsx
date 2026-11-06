/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Developer Portal — API Key Management & Secure Secret Provisioning
 * Phase 15 Implementation
 */

import React, { useState, useEffect } from 'react';
import {
  Key,
  Plus,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Lock,
  Layers,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useTenant } from '../../hooks/useTenant';
import { apiCredentialService } from '../../services/apiCredentialService';
import { ApiApplication, ApiCredential, ApiCredentialWithSecret, ApiScope } from '../../types/enterpriseApi';

export const ApiKeysPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.tenantId || 'tenant-metro-chronicle';

  const [apps, setApps] = useState<ApiApplication[]>([]);
  const [keys, setKeys] = useState<ApiCredential[]>([]);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Create Key Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [keyName, setKeyName] = useState('');
  const [keyExpiresInDays, setKeyExpiresInDays] = useState<number>(90);
  const [selectedScopes, setSelectedScopes] = useState<ApiScope[]>([]);

  // Newly Provisioned Secret Display Modal (Shown ONCE)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiCredentialWithSecret | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);

  // Rotation Modal
  const [rotatingKey, setRotatingKey] = useState<ApiCredential | null>(null);
  const [rotationOverlapHours, setRotationOverlapHours] = useState(24);

  // Revocation Dialog
  const [revokingKey, setRevokingKey] = useState<ApiCredential | null>(null);
  const [revocationReason, setRevocationReason] = useState('Manual administrative revocation');

  const [formError, setFormError] = useState<string | null>(null);

  const loadData = () => {
    const appList = apiCredentialService.listApps(tenantId);
    setApps(appList);
    if (appList.length > 0 && !selectedAppId) {
      setSelectedAppId(appList[0].appId);
      setSelectedScopes([...appList[0].allowedScopes]);
    }

    const keyList = apiCredentialService.listAllKeysForTenant(tenantId);
    setKeys(keyList);
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const handleAppChange = (appId: string) => {
    setSelectedAppId(appId);
    const app = apps.find((a) => a.appId === appId);
    if (app) {
      setSelectedScopes([...app.allowedScopes]);
    }
  };

  const handleToggleScope = (scope: ApiScope) => {
    if (selectedScopes.includes(scope)) {
      setSelectedScopes(selectedScopes.filter((s) => s !== scope));
    } else {
      setSelectedScopes([...selectedScopes, scope]);
    }
  };

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedAppId) {
      setFormError('Select a parent application.');
      return;
    }
    if (!keyName.trim()) {
      setFormError('Key name is required.');
      return;
    }
    if (selectedScopes.length === 0) {
      setFormError('Select at least one scope.');
      return;
    }

    try {
      const created = apiCredentialService.createKey({
        appId: selectedAppId,
        tenantId,
        name: keyName.trim(),
        scopes: selectedScopes,
        createdBy: 'user-console-admin',
        expiresInDays: keyExpiresInDays > 0 ? keyExpiresInDays : undefined,
      });

      setIsCreateModalOpen(false);
      setKeyName('');
      setNewlyCreatedKey(created); // Triggers secret reveal modal
      setSecretCopied(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to generate API key.');
    }
  };

  const handleRotateKey = () => {
    if (!rotatingKey) return;

    try {
      const rotated = apiCredentialService.rotateKey({
        keyId: rotatingKey.keyId,
        tenantId,
        overlapHours: rotationOverlapHours,
        rotatedBy: 'user-console-admin',
      });

      setRotatingKey(null);
      setNewlyCreatedKey(rotated); // Shows new secret
      setSecretCopied(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Key rotation failed.');
    }
  };

  const handleRevokeKey = () => {
    if (!revokingKey) return;

    try {
      apiCredentialService.revokeKey(
        revokingKey.keyId,
        tenantId,
        'user-console-admin',
        revocationReason
      );

      setRevokingKey(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Key revocation failed.');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const currentApp = apps.find((a) => a.appId === selectedAppId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <PageHeader
        title="API Credentials & Secret Keys"
        subtitle="Issue cryptographically verified machine credentials, enforce rotation overlap windows, and monitor secret usage."
        actions={
          <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Generate New API Key
          </Button>
        }
      />

      {/* Security Guidance Banner */}
      <div className="p-4 bg-indigo-950/40 border border-indigo-800/60 rounded-lg flex items-start gap-3">
        <Lock className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
        <div className="text-sm text-slate-300 space-y-1">
          <p className="font-semibold text-white">Cryptographic Verification Architecture</p>
          <p className="text-xs text-slate-400">
            NewsPress never stores raw API secrets. Only salted HMAC-SHA256 verifiers are maintained. All incoming API tokens are verified in constant time. Make sure to record secrets upon creation.
          </p>
        </div>
      </div>

      {/* API Keys Table */}
      <Card className="bg-slate-900/80 border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-slate-950/60">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase text-slate-400">Key Name & Prefix</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase text-slate-400">App & Environment</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase text-slate-400">Scopes</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase text-slate-400">Total Calls</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase text-slate-400">Last Used</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase text-slate-400">Status</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {keys.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No API keys have been generated yet. Click &quot;Generate New API Key&quot; to begin.
                  </td>
                </tr>
              ) : (
                keys.map((key) => {
                  const parentApp = apps.find((a) => a.appId === key.appId);
                  const isRevoked = key.status === 'REVOKED';

                  return (
                    <tr key={key.keyId} className="hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{key.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            {key.keyPrefix}••••••••••••
                          </code>
                          <button
                            onClick={() => copyToClipboard(key.keyPrefix, key.keyId)}
                            className="text-slate-500 hover:text-slate-300"
                            title="Copy Key Prefix"
                          >
                            {copiedKeyId === key.keyId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-slate-200">{parentApp?.name || key.appId}</div>
                        <div className="mt-1">
                          <Badge variant={key.environment === 'LIVE' ? 'emerald' : 'amber'}>
                            {key.environment}
                          </Badge>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-xs font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                          {key.scopes.length} Scopes
                        </span>
                      </td>

                      <td className="px-6 py-4 font-mono text-slate-300">
                        {key.totalRequests.toLocaleString()}
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-400">
                        {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}
                      </td>

                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            key.status === 'ACTIVE'
                              ? 'emerald'
                              : key.status === 'REVOKED'
                              ? 'rose'
                              : 'amber'
                          }
                        >
                          {key.status}
                        </Badge>
                        {key.rotationOverlapExpiresAt && (
                          <div className="text-xs text-amber-400 mt-1 flex items-center gap-1 font-mono">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Overlap Active
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isRevoked}
                            onClick={() => setRotatingKey(key)}
                            title="Rotate Key with Overlap Window"
                          >
                            <RefreshCw className="w-3.5 h-3.5 mr-1" />
                            Rotate
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={isRevoked}
                            onClick={() => setRevokingKey(key)}
                            title="Revoke Key Immediately"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Generate New API Key */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Generate New API Key"
      >
        <form onSubmit={handleCreateKey} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-950/50 border border-red-800/60 rounded text-sm text-red-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Parent API Application
            </label>
            <select
              value={selectedAppId}
              onChange={(e) => handleAppChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              {apps.map((app) => (
                <option key={app.appId} value={app.appId}>
                  {app.name} ({app.environment})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Key Name / Purpose
            </label>
            <Input
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="e.g. Automated Wire Ingestion Cron"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Key Expiration
            </label>
            <select
              value={keyExpiresInDays}
              onChange={(e) => setKeyExpiresInDays(parseInt(e.target.value, 10))}
              className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={30}>30 Days</option>
              <option value={90}>90 Days (Recommended)</option>
              <option value={180}>180 Days</option>
              <option value={365}>1 Year</option>
              <option value={0}>No Expiration</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Assigned Scopes (Subset of App Grants)
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-950/70 border border-slate-800 rounded-md">
              {(currentApp?.allowedScopes || []).map((scope) => (
                <label
                  key={scope}
                  className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-800/60 cursor-pointer text-xs font-mono text-slate-300"
                >
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope)}
                    onChange={() => handleToggleScope(scope)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{scope}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Generate Key
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: SECRET REVEAL MODAL (Shown ONCE only) */}
      <Modal
        isOpen={Boolean(newlyCreatedKey)}
        onClose={() => setNewlyCreatedKey(null)}
        title="Save Your API Secret Key"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-950/40 border border-amber-800/70 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-200">
              <span className="font-bold">CRITICAL SECURITY WARNING:</span> Make sure to copy your API secret key now. You will never be able to view it again. We only store a cryptographic SHA-256 verifier.
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Your Secret API Key
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={newlyCreatedKey?.rawSecret || ''}
                className="w-full font-mono text-xs bg-slate-950 border border-slate-700 rounded-md py-2.5 px-3 text-emerald-400 font-bold select-all"
              />
              <Button
                variant="primary"
                onClick={() => {
                  if (newlyCreatedKey?.rawSecret) {
                    navigator.clipboard.writeText(newlyCreatedKey.rawSecret);
                    setSecretCopied(true);
                  }
                }}
              >
                {secretCopied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {secretCopied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded border border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Key ID:</span>
              <span className="font-mono text-slate-200">{newlyCreatedKey?.keyId}</span>
            </div>
            <div className="flex justify-between">
              <span>Environment:</span>
              <span className="font-mono text-slate-200">{newlyCreatedKey?.environment}</span>
            </div>
            <div className="flex justify-between">
              <span>Scopes:</span>
              <span className="font-mono text-slate-200">{newlyCreatedKey?.scopes.length} granted</span>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-800">
            <Button
              variant="primary"
              disabled={!secretCopied}
              onClick={() => setNewlyCreatedKey(null)}
            >
              I Have Saved My Secret Key
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Rotate Key */}
      <Modal
        isOpen={Boolean(rotatingKey)}
        onClose={() => setRotatingKey(null)}
        title="Rotate API Key with Overlap Window"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Rotating key <span className="font-mono font-bold text-white">{rotatingKey?.name}</span> will generate a new secret. To prevent zero-downtime service disruption for your external integration, the previous secret will remain valid for a designated overlap period.
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Overlap Grace Period
            </label>
            <select
              value={rotationOverlapHours}
              onChange={(e) => setRotationOverlapHours(parseInt(e.target.value, 10))}
              className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={1}>1 Hour (Quick swap)</option>
              <option value={24}>24 Hours (Recommended)</option>
              <option value={48}>48 Hours (Enterprise migration)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="outline" onClick={() => setRotatingKey(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRotateKey}>
              Confirm Rotation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Revoke Dialog */}
      <ConfirmDialog
        isOpen={Boolean(revokingKey)}
        onClose={() => setRevokingKey(null)}
        onConfirm={handleRevokeKey}
        title="Immediately Revoke API Key"
        message={`Are you sure you want to revoke key "${revokingKey?.name}"? All external integrations using this key will be instantly denied access (401 REVOKED_CREDENTIALS). This action is permanent and cannot be undone.`}
        confirmLabel="Revoke Key Now"
        variant="danger"
      />
    </div>
  );
};
