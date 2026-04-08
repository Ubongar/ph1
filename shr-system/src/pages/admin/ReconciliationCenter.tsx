import { useEffect, useState } from 'react';
import { RefreshCw, Server, Smartphone, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { useToast } from '../../components/shared/Toast';
import { useOfflineSyncStatus } from '../../hooks';
import {
  fetchServerReconciliationConflicts,
  resolveOfflineConflict,
  resolveServerReconciliationConflict,
  retryFailedOfflineMutations,
  runOfflineSync,
  type ServerReconciliationConflict,
} from '../../services/offlineSync';

export default function ReconciliationCenter() {
  const { toast } = useToast();
  const offline = useOfflineSyncStatus();
  const [serverConflicts, setServerConflicts] = useState<ServerReconciliationConflict[]>([]);
  const [loadingServer, setLoadingServer] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);

  const pendingLocalConflicts = offline.conflicts.filter((item) => item.resolution === 'pending');

  const loadServerConflicts = async () => {
    setLoadingServer(true);
    try {
      const conflicts = await fetchServerReconciliationConflicts();
      setServerConflicts(conflicts);
    } catch {
      toast('Could not fetch server conflicts. Ensure the API server is running.', 'warning');
    } finally {
      setLoadingServer(false);
    }
  };

  useEffect(() => {
    void loadServerConflicts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSyncNow = async () => {
    setSyncBusy(true);
    try {
      const summary = await runOfflineSync();
      toast(
        `Sync complete: ${summary.synced} synced, ${summary.conflicts} conflicts, ${summary.failed} failed.`,
        summary.failed > 0 || summary.conflicts > 0 ? 'warning' : 'success',
      );
      await loadServerConflicts();
    } finally {
      setSyncBusy(false);
    }
  };

  const handleResolveServerConflict = async (conflictId: string, resolution: 'keep_local' | 'keep_remote') => {
    try {
      await resolveServerReconciliationConflict(conflictId, resolution);
      toast('Server conflict resolved.', 'success');
      await loadServerConflicts();
    } catch {
      toast('Failed to resolve server conflict.', 'error');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Reconciliation Center"
        subtitle="Review local and server conflicts at scale and resolve them safely."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadServerConflicts()}
              disabled={loadingServer}
              className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm"
            >
              {loadingServer ? 'Refreshing...' : 'Refresh Server Conflicts'}
            </button>
            <button
              type="button"
              onClick={() => void handleSyncNow()}
              disabled={syncBusy || !offline.isOnline}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              {syncBusy ? 'Syncing...' : 'Run Sync'}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
        <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-gray-500">Pending Queue</p><p className="font-semibold text-lg text-gray-900">{offline.pendingCount}</p></div>
        <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-gray-500">Local Conflicts</p><p className="font-semibold text-lg text-amber-700">{pendingLocalConflicts.length}</p></div>
        <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-gray-500">Server Conflicts</p><p className="font-semibold text-lg text-red-700">{serverConflicts.length}</p></div>
        <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-gray-500">Failed Queue Items</p><p className="font-semibold text-lg text-orange-700">{offline.failedCount}</p></div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 inline-flex items-center gap-2"><Smartphone className="w-4 h-4" />Local Conflict Review</h2>
          <button type="button" onClick={retryFailedOfflineMutations} className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs">Retry Failed Local Mutations</button>
        </div>

        {pendingLocalConflicts.length === 0 ? (
          <p className="text-sm text-gray-600">No unresolved local conflicts.</p>
        ) : (
          <div className="space-y-2">
            {pendingLocalConflicts.map((conflict) => (
              <div key={conflict.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 flex flex-wrap gap-2 items-center justify-between">
                <div className="text-xs text-gray-700">
                  <span className="font-semibold">{conflict.storageKey}</span> / {conflict.entityId}
                  <p className="text-amber-900 mt-1">{conflict.reason}</p>
                  <details className="mt-2 rounded border border-amber-200 bg-white p-2">
                    <summary className="cursor-pointer text-[11px] font-semibold text-amber-800">Compare local vs remote payload</summary>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-semibold text-blue-700">Local</p>
                        <pre className="mt-1 max-h-32 overflow-auto rounded bg-slate-900 p-2 text-[10px] text-slate-100">{JSON.stringify(conflict.localValue, null, 2)}</pre>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-700">Remote</p>
                        <pre className="mt-1 max-h-32 overflow-auto rounded bg-slate-900 p-2 text-[10px] text-slate-100">{JSON.stringify(conflict.remoteValue, null, 2)}</pre>
                      </div>
                    </div>
                  </details>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => resolveOfflineConflict(conflict.id, 'keep_local')} className="px-2.5 py-1 rounded bg-blue-600 text-white text-xs">Keep Local</button>
                  <button type="button" onClick={() => resolveOfflineConflict(conflict.id, 'keep_remote')} className="px-2.5 py-1 rounded bg-gray-200 text-gray-700 text-xs">Keep Remote</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 inline-flex items-center gap-2"><Server className="w-4 h-4" />Server Conflict Review</h2>
        {serverConflicts.length === 0 ? (
          <p className="text-sm text-gray-600">No unresolved server conflicts.</p>
        ) : (
          <div className="space-y-2">
            {serverConflicts.map((conflict) => (
              <div key={conflict.id} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 flex flex-wrap gap-2 items-center justify-between">
                <div className="text-xs text-gray-700">
                  <p><span className="font-semibold">{conflict.storageKey}</span> / {conflict.entityId}</p>
                  <p className="mt-1 text-red-800 inline-flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />{conflict.reason}</p>
                  <details className="mt-2 rounded border border-red-200 bg-white p-2">
                    <summary className="cursor-pointer text-[11px] font-semibold text-red-800">Compare local vs remote payload</summary>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-semibold text-blue-700">Local</p>
                        <pre className="mt-1 max-h-32 overflow-auto rounded bg-slate-900 p-2 text-[10px] text-slate-100">{JSON.stringify(conflict.localValue, null, 2)}</pre>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-700">Remote</p>
                        <pre className="mt-1 max-h-32 overflow-auto rounded bg-slate-900 p-2 text-[10px] text-slate-100">{JSON.stringify(conflict.remoteValue, null, 2)}</pre>
                      </div>
                    </div>
                  </details>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void handleResolveServerConflict(conflict.id, 'keep_local')} className="px-2.5 py-1 rounded bg-blue-600 text-white text-xs">Apply Local to Server</button>
                  <button type="button" onClick={() => void handleResolveServerConflict(conflict.id, 'keep_remote')} className="px-2.5 py-1 rounded bg-gray-200 text-gray-700 text-xs">Keep Server Version</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
