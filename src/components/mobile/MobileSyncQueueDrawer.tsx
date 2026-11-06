/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 13 — Mobile Sync Queue Drawer & Conflict Resolver
 * Real-time monitoring of offline sync operations, manual trigger, and deterministic conflict handling.
 */

import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  Flame,
  ShieldAlert,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { SyncQueueItem, ConflictRecord } from '../../types/mobile';
import { OfflineReportingStore } from '../../services/mobileOfflineStore';
import { MobileSyncService } from '../../services/mobileSyncService';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';

interface MobileSyncQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileSyncQueueDrawer: React.FC<MobileSyncQueueDrawerProps> = ({ isOpen, onClose }) => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const tenantId = currentTenant?.tenantId || 'tenant-metro-chronicle';
  const userId = user?.uid || user?.userId || 'rep_sofia_chen';

  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const loadData = () => {
    setQueueItems(OfflineReportingStore.getQueueItems(tenantId));
    setConflicts(OfflineReportingStore.getConflicts(tenantId));
  };

  useEffect(() => {
    loadData();
    const unsub = OfflineReportingStore.subscribe(() => {
      loadData();
    });
    return unsub;
  }, [tenantId]);

  if (!isOpen) return null;

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setSyncStatusMsg(null);

    const result = await MobileSyncService.processQueue(tenantId);
    setIsSyncing(false);
    setSyncStatusMsg(`Sync completed: ${result.succeeded} succeeded, ${result.failed} failed, ${result.conflicts} conflicts.`);
    loadData();
  };

  const handleResolveConflict = (conflictId: string, strategy: 'LOCAL_WINS' | 'SERVER_WINS') => {
    MobileSyncService.resolveConflictManually({
      conflictId,
      strategy,
      tenantId,
      userId,
    });
    loadData();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100">Offline Sync Queue</h3>
              <p className="text-[11px] text-slate-400">Idempotent background replication engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Controls */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-300">
              {queueItems.filter((i) => i.status === 'PENDING' || i.status === 'FAILED').length} Pending Operations
            </span>
            <p className="text-[10px] text-slate-500">Auto-retries on network reconnect</p>
          </div>
          <button
            type="button"
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs transition"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync All Now'}</span>
          </button>
        </div>

        {syncStatusMsg && (
          <div className="m-3 p-2.5 bg-sky-500/20 text-sky-300 border border-sky-500/40 rounded-xl text-xs">
            {syncStatusMsg}
          </div>
        )}

        {/* Conflicts Alert */}
        {conflicts.length > 0 && (
          <div className="p-3 m-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 text-xs">
            <div className="flex items-center space-x-1.5 text-rose-400 font-bold">
              <ShieldAlert className="w-4 h-4" />
              <span>{conflicts.length} Sync Conflicts Detected</span>
            </div>
            {conflicts.map((c) => (
              <div key={c.conflictId} className="p-2 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <p className="text-slate-300 font-medium">Entity: {c.entityType} ({c.entityId})</p>
                <p className="text-[11px] text-slate-400">Server copy was modified or approved concurrently.</p>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleResolveConflict(c.conflictId, 'LOCAL_WINS')}
                    className="px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded font-semibold text-[11px]"
                  >
                    Keep Local Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolveConflict(c.conflictId, 'SERVER_WINS')}
                    className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded font-semibold text-[11px]"
                  >
                    Accept Server Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Queue Items List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {queueItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
              <span>Offline queue is empty. All local edits synchronized.</span>
            </div>
          ) : (
            queueItems.map((item) => (
              <div
                key={item.localOperationId}
                className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">{item.operationType}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.status === 'SYNCED'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : item.status === 'FAILED'
                        ? 'bg-rose-500/20 text-rose-400'
                        : item.status === 'CONFLICT'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono truncate">
                  Idempotency: {item.idempotencyKey}
                </p>
                {item.lastError && (
                  <p className="text-[11px] text-rose-400 bg-rose-950/40 p-1.5 rounded">
                    {item.lastError}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
