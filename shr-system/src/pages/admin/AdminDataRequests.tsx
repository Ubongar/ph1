import { useState } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks';
import { createAuditEntry, getAll, StorageKey, update } from '../../services/storage';
import type { DataRequest, DataRequestStatus } from '../../types/types';

const STATUS_FLOW: DataRequestStatus[] = ['Submitted', 'Under Review', 'Approved', 'Rejected', 'Completed'];

const STATUS_STYLE: Record<DataRequestStatus, string> = {
  Submitted: 'bg-blue-100 text-blue-700',
  'Under Review': 'bg-amber-100 text-amber-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-rose-100 text-rose-700',
  Completed: 'bg-slate-200 text-slate-700',
};

export default function AdminDataRequests() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [, setRefreshKey] = useState(0);
  const [adminNote, setAdminNote] = useState('');

  const requests = getAll<DataRequest>(StorageKey.DATA_REQUESTS)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const filtered = (() => {
    if (!statusFilter) return requests;
    return requests.filter((request) => request.status === statusFilter);
  })();

  const activeRequest = filtered.find((request) => request.id === activeRequestId) ?? null;

  function selectRequest(request: DataRequest) {
    setActiveRequestId(request.id);
    setAdminNote(request.adminNotes ?? '');
  }

  function updateRequestStatus(nextStatus: DataRequestStatus) {
    if (!activeRequest || !currentUser) return;

    const updated = update<DataRequest>(
      StorageKey.DATA_REQUESTS,
      activeRequest.id,
      {
        status: nextStatus,
        updatedAt: new Date().toISOString(),
        adminReviewerId: currentUser.id,
        adminReviewerName: currentUser.name,
        adminNotes: adminNote.trim() || undefined,
      },
      { autoAudit: false },
    );

    if (!updated) {
      toast('Could not update this request. Please try again.', 'error');
      return;
    }

    createAuditEntry({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'REVIEW_DATA_REQUEST',
      resourceType: 'DataRequest',
      resourceId: activeRequest.id,
      resourceDescription: `Set ${activeRequest.auditTicketId} to ${nextStatus}`,
      status: 'Success',
      changeDetails: JSON.stringify({ previousStatus: activeRequest.status, nextStatus }),
    });

    setRefreshKey((value) => value + 1);
    toast(`Request moved to ${nextStatus}.`, 'success');
  }

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="Data Request Review"
        subtitle="Review access/correction/deletion tickets and update status with audit trail notes."
      />

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Filter by status</label>
        <select
          aria-label="Filter data requests by status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          {STATUS_FLOW.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2">Ticket</th>
                  <th className="px-3 py-2">Requester</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((request) => (
                  <tr
                    key={request.id}
                    onClick={() => selectRequest(request)}
                    className={`cursor-pointer ${activeRequestId === request.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-3 py-2 font-semibold text-gray-800">{request.auditTicketId}</td>
                    <td className="px-3 py-2 text-gray-700">{request.userName}</td>
                    <td className="px-3 py-2 text-gray-700">{request.requestType}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-md px-2 py-1 text-xs font-semibold ${STATUS_STYLE[request.status]}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{new Date(request.updatedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4">
          {activeRequest ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Selected Ticket</p>
                <p className="text-base font-semibold text-gray-900">{activeRequest.auditTicketId}</p>
                <p className="mt-1 text-sm text-gray-600">{activeRequest.requestType} request from {activeRequest.userName}</p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                {activeRequest.requestDetails}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Admin Notes</label>
                <textarea
                  aria-label="Admin notes"
                  rows={4}
                  value={adminNote}
                  onChange={(event) => setAdminNote(event.target.value)}
                  placeholder="Add reviewer notes visible in request history."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {STATUS_FLOW.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => updateRequestStatus(status)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Mark {status}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Select a request ticket to review and update.</p>
          )}
        </section>
      </div>
    </div>
  );
}
