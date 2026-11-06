/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Developer Portal — Webhook Delivery Logs & Replay Console
 * Phase 15 Implementation
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertOctagon,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { useTenant } from '../../hooks/useTenant';
import { webhookDispatcherService } from '../../services/webhookDispatcherService';
import { WebhookDelivery } from '../../types/enterpriseApi';

export const WebhookDeliveriesPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.tenantId || 'tenant-metro-chronicle';

  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [inspectingDelivery, setInspectingDelivery] = useState<WebhookDelivery | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replaySuccessMessage, setReplaySuccessMessage] = useState<string | null>(null);

  const loadDeliveries = () => {
    const list = webhookDispatcherService.listDeliveries(tenantId, 100);
    setDeliveries(list);
  };

  useEffect(() => {
    loadDeliveries();
  }, [tenantId]);

  const handleReplay = (deliveryId: string) => {
    setIsReplaying(true);
    setReplaySuccessMessage(null);
    try {
      const replayed = webhookDispatcherService.replayDelivery(
        deliveryId,
        tenantId,
        'user-console-admin'
      );
      setReplaySuccessMessage(`Replay delivery queued successfully (ID: ${replayed.deliveryId})`);
      loadDeliveries();
      setTimeout(() => setReplaySuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to replay webhook delivery.');
    } finally {
      setIsReplaying(false);
    }
  };

  const getStatusBadge = (status: WebhookDelivery['status']) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <Badge variant="emerald">
            <CheckCircle2 className="w-3 h-3 mr-1 inline" />
            DELIVERED
          </Badge>
        );
      case 'RETRY_SCHEDULED':
        return (
          <Badge variant="amber">
            <Clock className="w-3 h-3 mr-1 inline" />
            RETRY_SCHEDULED
          </Badge>
        );
      case 'DEAD_LETTER':
        return (
          <Badge variant="rose">
            <AlertOctagon className="w-3 h-3 mr-1 inline" />
            DEAD_LETTER
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="rose">
            <XCircle className="w-3 h-3 mr-1 inline" />
            FAILED
          </Badge>
        );
      default:
        return <Badge variant="blue">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <PageHeader
        title="Webhook Delivery History & Event Replay"
        subtitle="Inspect outbound HTTP response codes, latency diagnostics, retry schedules, and dead-letter event queues."
        actions={
          <Button variant="outline" onClick={loadDeliveries}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Log
          </Button>
        }
      />

      {replaySuccessMessage && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-md text-sm text-emerald-200 flex items-center justify-between">
          <span>{replaySuccessMessage}</span>
        </div>
      )}

      {/* Deliveries Table */}
      <Card className="bg-slate-900/80 border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-slate-950/60">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase text-slate-400">Delivery ID & Event</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase text-slate-400">Destination URL</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase text-slate-400">Status</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase text-slate-400">HTTP Status</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase text-slate-400">Attempts</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase text-slate-400">Timestamp</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {deliveries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    No webhook deliveries have been dispatched yet. Send a test ping from Webhooks page.
                  </td>
                </tr>
              ) : (
                deliveries.map((del) => (
                  <tr key={del.deliveryId} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs text-indigo-400 font-bold">{del.eventType}</div>
                      <div className="font-mono text-xs text-slate-400 mt-0.5">{del.deliveryId}</div>
                      {del.isReplay && (
                        <span className="text-[10px] bg-purple-900/60 text-purple-200 border border-purple-700/60 px-1.5 py-0.2 rounded font-mono mt-1 inline-block">
                          REPLAY
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-xs font-mono text-slate-300 truncate max-w-xs" title={del.destinationUrl}>
                        {del.destinationUrl}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {getStatusBadge(del.status)}
                    </td>

                    <td className="px-6 py-4">
                      {del.responseStatusCode ? (
                        <span
                          className={`font-mono text-xs font-bold ${
                            del.responseStatusCode >= 200 && del.responseStatusCode < 300
                              ? 'text-emerald-400'
                              : 'text-red-400'
                          }`}
                        >
                          {del.responseStatusCode}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4 font-mono text-xs text-slate-300">
                      {del.attemptNumber} / {del.maxAttempts}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(del.requestTimestamp).toLocaleTimeString()}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setInspectingDelivery(del)}
                          title="Inspect Payload & Response"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Inspect
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isReplaying}
                          onClick={() => handleReplay(del.deliveryId)}
                          title="Replay Event Dispatch"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" />
                          Replay
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Inspect Delivery Payload & Response */}
      <Modal
        isOpen={Boolean(inspectingDelivery)}
        onClose={() => setInspectingDelivery(null)}
        title={`Inspect Delivery — ${inspectingDelivery?.deliveryId}`}
      >
        {inspectingDelivery && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-950/60 p-3 rounded border border-slate-800">
              <div>
                <span className="text-slate-400 block">Event Type:</span>
                <span className="font-mono text-white font-bold">{inspectingDelivery.eventType}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Destination:</span>
                <span className="font-mono text-slate-200 truncate block">{inspectingDelivery.destinationUrl}</span>
              </div>
              <div>
                <span className="text-slate-400 block">HTTP Response:</span>
                <span className="font-mono font-bold text-slate-200">
                  {inspectingDelivery.responseStatusCode || 'None (Connection Error)'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Status:</span>
                <span className="font-mono text-slate-200">{inspectingDelivery.status}</span>
              </div>
            </div>

            {inspectingDelivery.errorDetails && (
              <div className="p-3 bg-red-950/40 border border-red-800/70 rounded text-xs text-red-200 font-mono">
                Error: {inspectingDelivery.errorDetails}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Response Body Preview
              </label>
              <pre className="p-3 bg-slate-950 rounded border border-slate-800 text-xs font-mono text-slate-300 max-h-40 overflow-y-auto">
                {inspectingDelivery.responseBody || '(No response body returned)'}
              </pre>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleReplay(inspectingDelivery.deliveryId);
                  setInspectingDelivery(null);
                }}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Replay This Delivery
              </Button>
              <Button variant="primary" onClick={() => setInspectingDelivery(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
