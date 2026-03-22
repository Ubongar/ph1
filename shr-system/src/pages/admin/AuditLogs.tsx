import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Eye, Download, AlertTriangle } from 'lucide-react';
import { getAll, StorageKey } from '../../services/storage';
import type { AuditLog, UserRole, AuditAction } from '../../types/types';
import { useToast } from '../../components/shared/Toast';
import { PageHeader } from '../../components/shared/PageHeader';

const ROLES: UserRole[] = ['student','medical_staff','technician','pharmacy','admin'];
const ROLE_LABELS: Record<UserRole, string> = { student:'Student', medical_staff:'Medical Staff', technician:'Technician', pharmacy:'Pharmacy', admin:'Admin' };
const ROLE_COLORS: Record<UserRole, string> = { student:'bg-blue-100 text-blue-700', medical_staff:'bg-green-100 text-green-700', technician:'bg-purple-100 text-purple-700', pharmacy:'bg-orange-100 text-orange-700', admin:'bg-red-100 text-red-700' };
const ALL_ACTIONS: AuditAction[] = ['LOGIN','LOGOUT','VIEW_RECORD','EDIT_RECORD','CREATE_RECORD','APPROVE_REQUISITION','REJECT_REQUISITION','UPLOAD_RESULT','DISPENSE_MEDICATION','CREATE_USER','DEACTIVATE_USER','RESET_PASSWORD','EXPORT_REPORT','VIEW_AUDIT_LOG'];
const ACTION_COLORS: Record<string, string> = { LOGIN:'bg-blue-100 text-blue-700', LOGOUT:'bg-gray-100 text-gray-600', VIEW_RECORD:'bg-cyan-100 text-cyan-700', EDIT_RECORD:'bg-yellow-100 text-yellow-700', CREATE_RECORD:'bg-green-100 text-green-700', APPROVE_REQUISITION:'bg-green-100 text-green-700', REJECT_REQUISITION:'bg-red-100 text-red-700', UPLOAD_RESULT:'bg-purple-100 text-purple-700', DISPENSE_MEDICATION:'bg-orange-100 text-orange-700', CREATE_USER:'bg-green-100 text-green-700', DEACTIVATE_USER:'bg-red-100 text-red-700', RESET_PASSWORD:'bg-yellow-100 text-yellow-700', EXPORT_REPORT:'bg-blue-100 text-blue-700', VIEW_AUDIT_LOG:'bg-gray-100 text-gray-600' };
const PAGE_SIZE = 20;
const RESOURCE_TYPES = ['Student','Requisition','DiagnosticResult','User','System','Report'] as const;

type SortCol = 'timestamp' | 'userName' | 'action';
type SortDir = 'asc' | 'desc';

function defaultStart() {
  const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0];
}

export default function AuditLogs() {
  const { toast } = useToast();
  const [logs] = useState(() => getAll<AuditLog>(StorageKey.AUDIT_LOGS));
  const [startDate, setStartDate] = useState(defaultStart());
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedActions, setSelectedActions] = useState<AuditAction[]>([]);
  const [resourceType, setResourceType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState<SortCol>('timestamp');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);

  const filtered = useMemo(() => {
    let result = logs.filter(l => {
      const ts = new Date(l.timestamp).getTime();
      if (startDate && ts < new Date(startDate).getTime()) return false;
      if (endDate && ts > new Date(endDate + 'T23:59:59').getTime()) return false;
      if (roleFilter && l.userRole !== roleFilter) return false;
      if (selectedActions.length > 0 && !selectedActions.includes(l.action)) return false;
      if (resourceType && l.resourceType !== resourceType) return false;
      if (statusFilter && l.status !== statusFilter) return false;
      return true;
    });
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortCol === 'timestamp') cmp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      else if (sortCol === 'userName') cmp = a.userName.localeCompare(b.userName);
      else if (sortCol === 'action') cmp = a.action.localeCompare(b.action);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [logs, startDate, endDate, roleFilter, selectedActions, resourceType, statusFilter, sortCol, sortDir]);

  const hasSuspicious = filtered.some(l => l.status === 'Suspicious');
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const toggleAction = (a: AuditAction) => {
    setSelectedActions(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
    setPage(1);
  };

  const exportCSV = () => {
    const headers = ['Timestamp','User','Role','Action','Resource','IP','Session','Status'];
    const rows = filtered.map(l => [
      l.timestamp, l.userName, l.userRole, l.action, l.resourceDescription, l.ipAddress, l.sessionId, l.status
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href = url; a.download = `audit_log_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV exported', 'success');
  };

  const SortIcon = ({ col }: { col: SortCol }) => sortCol === col
    ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
    : <span className="w-3 h-3 inline-block" />;

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Audit Logs" actions={<button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"><Download className="w-4 h-4" />Export CSV</button>} />
      {hasSuspicious && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-300 rounded-xl text-red-700">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="font-medium">Suspicious activity detected in current filtered results.</span>
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label><input type="date" value={startDate} onChange={e=>{setStartDate(e.target.value);setPage(1)}} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">End Date</label><input type="date" value={endDate} onChange={e=>{setEndDate(e.target.value);setPage(1)}} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">User Role</label>
            <select value={roleFilter} onChange={e=>{setRoleFilter(e.target.value);setPage(1)}} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Roles</option>{ROLES.map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Resource Type</label>
            <select value={resourceType} onChange={e=>{setResourceType(e.target.value);setPage(1)}} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All</option>{RESOURCE_TYPES.map(r=><option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1)}} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All</option><option>Success</option><option>Failed</option><option>Suspicious</option>
            </select>
          </div>
        </div>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Action Types</label>
          <div className="flex flex-wrap gap-2">{ALL_ACTIONS.map(a=>(
            <label key={a} className="flex items-center gap-1 text-xs cursor-pointer">
              <input type="checkbox" checked={selectedActions.includes(a)} onChange={()=>toggleAction(a)} className="rounded" />
              {a}
            </label>
          ))}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500 uppercase">
            <tr>
              <th className="px-3 py-3 text-left cursor-pointer" onClick={()=>toggleSort('timestamp')}><span className="flex items-center gap-1">Timestamp<SortIcon col="timestamp" /></span></th>
              <th className="px-3 py-3 text-left cursor-pointer" onClick={()=>toggleSort('userName')}><span className="flex items-center gap-1">User<SortIcon col="userName" /></span></th>
              <th className="px-3 py-3 text-left">Role</th>
              <th className="px-3 py-3 text-left cursor-pointer" onClick={()=>toggleSort('action')}><span className="flex items-center gap-1">Action<SortIcon col="action" /></span></th>
              <th className="px-3 py-3 text-left">Resource</th>
              <th className="px-3 py-3 text-left">IP</th>
              <th className="px-3 py-3 text-left">Session</th>
              <th className="px-3 py-3 text-left">Status</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginated.map(l => (
              <tr key={l.id} className={`hover:bg-gray-50 ${l.status==='Suspicious'?'bg-red-50':''}`}>
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</td>
                <td className="px-3 py-2 font-medium text-gray-900">{l.userName}</td>
                <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[l.userRole]}`}>{ROLE_LABELS[l.userRole]}</span></td>
                <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[l.action] ?? 'bg-gray-100 text-gray-600'}`}>{l.action}</span></td>
                <td className="px-3 py-2 text-gray-600 max-w-xs truncate">{l.resourceDescription}</td>
                <td className="px-3 py-2 text-gray-500 font-mono">{l.ipAddress}</td>
                <td className="px-3 py-2 text-gray-400 font-mono">{l.sessionId.slice(0,12)}…</td>
                <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${l.status==='Success'?'bg-green-100 text-green-700':l.status==='Failed'?'bg-red-100 text-red-700':'bg-orange-100 text-orange-700'}`}>{l.status}</span></td>
                <td className="px-3 py-2"><button onClick={()=>setDetailLog(l)}><Eye className="w-4 h-4 text-gray-400 hover:text-blue-600" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t flex items-center justify-between text-sm text-gray-600">
          <span>Showing {filtered.length > 0 ? (page-1)*PAGE_SIZE+1 : 0}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <div className="flex gap-2">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-3 py-1.5 rounded-lg bg-gray-100 disabled:opacity-40">Previous</button>
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages} className="px-3 py-1.5 rounded-lg bg-gray-100 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {detailLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={()=>setDetailLog(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-lg z-50 max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Log Details</h2>
            <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto">{JSON.stringify(detailLog, null, 2)}</pre>
            <button onClick={()=>setDetailLog(null)} className="mt-4 px-4 py-2 bg-gray-100 rounded-lg text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
