import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, ShieldCheck, Server } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/shared/PageHeader';
import { useToast } from '../../components/shared/Toast';
import { fetchServerAdminAuditLogs, type ServerAdminAuditLog } from '../../services/offlineSync';

type DecisionFilter = '' | 'keep_local' | 'keep_remote';

export default function AdminResolutionAuditLogs() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<ServerAdminAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const serverLogs = await fetchServerAdminAuditLogs();
      setLogs(serverLogs);
    } catch {
      toast('Could not fetch server audit logs. Ensure backend API is available.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return logs
      .filter((item) => {
        if (decisionFilter && item.decision !== decisionFilter) return false;
        if (!normalized) return true;
        return (
          item.adminUserId.toLowerCase().includes(normalized)
          || item.storageKey.toLowerCase().includes(normalized)
          || item.entityId.toLowerCase().includes(normalized)
          || item.conflictId.toLowerCase().includes(normalized)
        );
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, decisionFilter, searchTerm]);

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Admin Resolution Audit"
        subtitle="Immutable backend records of conflict-resolution decisions by admins."
        actions={(
          <div className="flex items-center gap-2">
            <Link to="/admin/reconciliation" className="px-3 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-sm font-medium">
              Reconciliation Center
            </Link>
            <button
              type="button"
              onClick={() => void loadLogs()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-gray-500">Total Decisions</p>
          <p className="text-2xl font-semibold text-gray-900">{logs.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-gray-500">Keep Local</p>
          <p className="text-2xl font-semibold text-blue-700">{logs.filter((item) => item.decision === 'keep_local').length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-gray-500">Keep Remote</p>
          <p className="text-2xl font-semibold text-gray-700">{logs.filter((item) => item.decision === 'keep_remote').length}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3">
          <select
            aria-label="Filter by reconciliation decision"
            value={decisionFilter}
            onChange={(event) => setDecisionFilter(event.target.value as DecisionFilter)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All decisions</option>
            <option value="keep_local">Keep Local</option>
            <option value="keep_remote">Keep Remote</option>
          </select>
          <input
            aria-label="Search audit log entries"
            type="text"
            placeholder="Search by admin, storage key, entity ID, or conflict ID"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-3 text-left">Timestamp</th>
                <th className="px-3 py-3 text-left">Admin</th>
                <th className="px-3 py-3 text-left">Decision</th>
                <th className="px-3 py-3 text-left">Entity</th>
                <th className="px-3 py-3 text-left">Reason</th>
                <th className="px-3 py-3 text-left">Conflict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                    <div className="inline-flex items-center gap-2"><Server className="w-4 h-4" />No backend audit entries found.</div>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{new Date(item.timestamp).toLocaleString()}</td>
                    <td className="px-3 py-2 text-gray-900">
                      <div className="inline-flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
                        <span className="font-medium">{item.adminUserId}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${item.decision === 'keep_local' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                        {item.decision === 'keep_local' ? 'Keep Local' : 'Keep Remote'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      <span className="font-medium">{item.storageKey}</span> / {item.entityId}
                    </td>
                    <td className="px-3 py-2 text-gray-600 max-w-[340px] truncate" title={item.reason}>{item.reason}</td>
                    <td className="px-3 py-2 font-mono text-gray-500">{item.conflictId.slice(0, 12)}...</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
