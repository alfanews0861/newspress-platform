/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Developer Portal — Outbound Webhooks Management
 * Phase 15 Implementation
 */

import React, { useState, useEffect } from 'react';
import {
  Radio,
  Plus,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Send,
  Eye,
  EyeOff,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useTenant } from '../../hooks/useTenant';
import { webhookDispatcherService } from '../../services/webhookDispatcherService';
import { WebhookEndpoint, WebhookEventType, ALL_WEBHOOK_EVENT_TYPES } from '../../types/enterpriseApi';

export const WebhooksPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.tenantId || 'tenant-metro-chronicle';

  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});

  // Register Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [description, setDescription] = useState('');
  const [subscribedEvents, setSubscribedEvents] = useState<WebhookEventType[]>([
    'news.submitted',
    'news.approved',
    'marketplace.purchase_completed',
    'edition.status_changed',
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  // Rotate Secret Modal State
  const [rotatingEndpoint, setRotatingEndpoint] = useState<WebhookEndpoint | null>(null);
  const [rotatedSecretInfo, setRotatedSecretInfo] = useState<{ newSecret: string } | null>(null);

  // Delete Dialog State
  const [deletingEndpoint, setDeletingEndpoint] = useState<WebhookEndpoint | null>(null);

  // Ping Testing State
  const [pingResult, setPingResult] = useState<string | null>(null);

  const loadEndpoints = () => {
    const list = webhookDispatcherService.listEndpoints(tenantId);
    setEndpoints(list);
  };

  useEffect(() => {
    loadEndpoints();
  }, [tenantId]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleRevealSecret = (endpointId: string) => {
    setRevealedSecrets((prev) => ({
      ...prev,
      [endpointId]: !prev[endpointId],
    }));
  };

  const handleToggleEvent = (event: WebhookEventType) => {
    if (subscribedEvents.includes(event)) {
      setSubscribedEvents(subscribedEvents.filter((e) => e !== event));
    } else {
      setSubscribedEvents([...subscribedEvents, event]);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!targetUrl.trim()) {
      setFormError('Destination URL is required.');
      return;
    }
    if (subscribedEvents.length === 0) {
      setFormError('Select at least one event type.');
      return;
    }

    try {
      webhookDispatcherService.registerEndpoint({
        tenantId,
        url: targetUrl.trim(),
        description: description.trim(),
        subscribedEvents,
        actorId: 'user-console-admin',
        allowHttpSandbox: true,
      });

      setIsRegisterModalOpen(false);
      setTargetUrl('');
      setDescription('');
      loadEndpoints();
    } catch (err: any) {
      setFormError(err.message || 'Registration failed.');
    }
  };

  const handleRotateSecret = () => {
    if (!rotatingEndpoint) return;
    try {
      const res = webhookDispatcherService.rotateSigningSecret(
        rotatingEndpoint.endpointId,
        tenantId,
        'user-console-admin',
        24
      );
      setRotatedSecretInfo({ newSecret: res.newSecret });
      loadEndpoints();
    } catch (err: any) {
      alert(err.message || 'Secret rotation failed.');
    }
  };

  const handleDelete = () => {
    if (!deletingEndpoint) return;
    try {
      webhookDispatcherService.deleteEndpoint(
        deletingEndpoint.endpointId,
        tenantId,
        'user-console-admin'
      );
      setDeletingEndpoint(null);
      loadEndpoints();
    } catch (err: any) {
      alert(err.message || 'Failed to delete endpoint.');
    }
  };

  const handleSendTestPing = async (ep: WebhookEndpoint) => {
    setPingResult('Dispatching test ping...');
    try {
      const event = webhookDispatcherService.emitEvent('news.submitted', tenantId, {
        test: true,
        articleId: 'art-test-ping-01',
        headline: 'Test Webhook Verification Ping from NewsPress Console',
        timestamp: new Date().toISOString(),
      });

      setPingResult(`Event ${event.id} dispatched! Queued delivery to ${ep.url}`);
      setTimeout(() => setPingResult(null), 4000);
    } catch (err: any) {
      setPingResult(`Ping failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <PageHeader
        title="Outbound Webhook Endpoints"
        subtitle="Configure event subscriptions, rotate HMAC signing secrets, and inspect real-time webhook delivery logs."
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('navigate', { detail: '/developer/webhook-deliveries' }));
              }}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Delivery Logs & Replay
            </Button>
            <Button variant="primary" onClick={() => setIsRegisterModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Webhook Endpoint
            </Button>
          </div>
        }
      />

      {pingResult && (
        <div className="p-3 bg-indigo-950/70 border border-indigo-700/80 rounded-md text-sm text-indigo-200 flex items-center justify-between">
          <span>{pingResult}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('navigate', { detail: '/developer/webhook-deliveries' }));
            }}
          >
            View Delivery Status
          </Button>
        </div>
      )}

      {/* Endpoints List */}
      <div className="space-y-4">
        {endpoints.length === 0 ? (
          <Card className="p-12 text-center bg-slate-900/40 border-slate-800">
            <Radio className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-200">No Webhook Endpoints Configured</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mt-1 mb-4">
              Add a destination URL to receive instant JSON notifications when stories are submitted, purchases complete, or editions finish production.
            </p>
            <Button variant="primary" onClick={() => setIsRegisterModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Register Endpoint
            </Button>
          </Card>
        ) : (
          endpoints.map((ep) => {
            const isRevealed = revealedSecrets[ep.endpointId];

            return (
              <Card key={ep.endpointId} className="p-6 bg-slate-900/80 border-slate-800">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-white bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                        {ep.url}
                      </span>
                      <Badge variant={ep.status === 'ACTIVE' ? 'emerald' : 'rose'}>
                        {ep.status}
                      </Badge>
                      {ep.failureCount > 0 && (
                        <Badge variant="amber">
                          {ep.failureCount} Failures
                        </Badge>
                      )}
                    </div>
                    {ep.description && <p className="text-sm text-slate-300">{ep.description}</p>}

                    {/* Signing Secret Box */}
                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <span className="text-slate-400 font-semibold">Signing Secret:</span>
                      <code className="bg-slate-950 font-mono text-slate-300 px-2 py-0.5 rounded border border-slate-800">
                        {isRevealed ? ep.signingSecret : `${ep.signingSecret.substring(0, 10)}••••••••••••`}
                      </code>
                      <button
                        onClick={() => toggleRevealSecret(ep.endpointId)}
                        className="text-slate-400 hover:text-white"
                        title={isRevealed ? 'Hide secret' : 'Reveal secret'}
                      >
                        {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleCopy(ep.signingSecret, ep.endpointId)}
                        className="text-slate-400 hover:text-white"
                        title="Copy secret"
                      >
                        {copiedId === ep.endpointId ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendTestPing(ep)}
                      title="Send Test Event"
                    >
                      <Send className="w-3.5 h-3.5 mr-1" />
                      Test Ping
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRotatingEndpoint(ep)}
                      title="Rotate HMAC Secret"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />
                      Rotate Secret
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setDeletingEndpoint(ep)}
                      title="Delete Endpoint"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Subscribed Events */}
                <div className="mt-4 pt-4 border-t border-slate-800/60">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Subscribed Events ({ep.subscribedEvents.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ep.subscribedEvents.map((evt) => (
                      <span
                        key={evt}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-indigo-300 border border-slate-700/60"
                      >
                        {evt}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal: Register Webhook Endpoint */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Register Outbound Webhook Endpoint"
      >
        <form onSubmit={handleRegister} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-950/50 border border-red-800/60 rounded text-sm text-red-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Destination URL (HTTPS Required in Production)
            </label>
            <Input
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://api.yourdomain.com/webhooks/newspress"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Protected by SSRF validation. Private IP ranges (127.0.0.1, 10.0.0.0/8, 169.254.169.254) are rejected.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Description / Destination Name
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Production CMS Newsroom Ingestion Hook"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Subscribed Event Types
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-950/70 border border-slate-800 rounded-md">
              {ALL_WEBHOOK_EVENT_TYPES.map((evt) => {
                const checked = subscribedEvents.includes(evt);
                return (
                  <label
                    key={evt}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-800/60 cursor-pointer text-xs font-mono text-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleEvent(evt)}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{evt}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsRegisterModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Register Webhook
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Rotate Signing Secret */}
      <Modal
        isOpen={Boolean(rotatingEndpoint)}
        onClose={() => {
          setRotatingEndpoint(null);
          setRotatedSecretInfo(null);
        }}
        title="Rotate HMAC Signing Secret"
      >
        <div className="space-y-4">
          {rotatedSecretInfo ? (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded text-xs text-emerald-200">
                Secret rotated successfully. The previous secret remains active for 24 hours to prevent dropped events.
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  New Secret Key
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={rotatedSecretInfo.newSecret}
                    className="w-full font-mono text-xs bg-slate-950 border border-slate-700 rounded-md py-2 px-3 text-emerald-400 font-bold"
                  />
                  <Button
                    variant="primary"
                    onClick={() => navigator.clipboard.writeText(rotatedSecretInfo.newSecret)}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              <div className="flex justify-end pt-3">
                <Button
                  variant="primary"
                  onClick={() => {
                    setRotatingEndpoint(null);
                    setRotatedSecretInfo(null);
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                Are you sure you want to rotate the HMAC secret for{' '}
                <span className="font-mono text-white font-bold">{rotatingEndpoint?.url}</span>?
              </p>
              <p className="text-xs text-slate-400">
                A 24-hour dual-signature grace window will be applied. NewsPress will sign payloads with both keys during this period.
              </p>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <Button variant="outline" onClick={() => setRotatingEndpoint(null)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleRotateSecret}>
                  Confirm Rotation
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingEndpoint)}
        onClose={() => setDeletingEndpoint(null)}
        onConfirm={handleDelete}
        title="Delete Webhook Endpoint"
        message={`Are you sure you want to delete the endpoint for "${deletingEndpoint?.url}"? Outbound deliveries to this destination will stop immediately.`}
        confirmLabel="Delete Endpoint"
        variant="danger"
      />
    </div>
  );
};
