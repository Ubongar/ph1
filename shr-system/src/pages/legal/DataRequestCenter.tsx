import { useState } from 'react';
import { FileBadge2, ShieldCheck } from 'lucide-react';
import LegalPageFrame from './LegalPageFrame';
import { useAuth } from '../../context/AuthContext';
import { buildDataRequestTicketId } from '../../services/compliance';
import { create, createAuditEntry, getAll, StorageKey } from '../../services/storage';
import type { DataRequest, DataRequestStatus, DataRequestType } from '../../types/types';
import { useToast } from '../../hooks';

const REQUEST_TYPES: DataRequestType[] = ['Access', 'Correction', 'Deletion'];

const STATUS_CLASS: Record<DataRequestStatus, string> = {
  Submitted: 'bg-blue-100 text-blue-700',
  'Under Review': 'bg-amber-100 text-amber-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-rose-100 text-rose-700',
  Completed: 'bg-slate-200 text-slate-700',
};

export default function DataRequestCenter() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [requestType, setRequestType] = useState<DataRequestType>('Access');
  const [requestDetails, setRequestDetails] = useState('');
  const [, setRefreshKey] = useState(0);

  const myRequests = (() => {
    if (!currentUser) return [];

    return getAll<DataRequest>(StorageKey.DATA_REQUESTS)
      .filter((request) => request.userId === currentUser.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  })();

  function handleSubmitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser) return;

    const trimmedDetails = requestDetails.trim();
    if (trimmedDetails.length < 12) {
      toast('Please include a few more details so admin can process your request.', 'warning');
      return;
    }

    const ticketId = buildDataRequestTicketId();

    const created = create<DataRequest>(
      StorageKey.DATA_REQUESTS,
      {
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        requestType,
        requestDetails: trimmedDetails,
        auditTicketId: ticketId,
        status: 'Submitted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { autoAudit: false },
    );

    createAuditEntry({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'SUBMIT_DATA_REQUEST',
      resourceType: 'DataRequest',
      resourceId: created.id,
      resourceDescription: `Submitted ${requestType} request (${ticketId})`,
      status: 'Success',
      changeDetails: JSON.stringify({ requestType, auditTicketId: ticketId }),
    });

    setRequestDetails('');
    setRequestType('Access');
    setRefreshKey((value) => value + 1);
    toast(`Request submitted. Audit Ticket ID: ${ticketId}`, 'success');
  }

  return (
    <LegalPageFrame
      title="Data Request Center"
      subtitle="Submit access, correction, or deletion requests. Each request gets a unique audit ticket and enters admin review workflow."
      lastUpdated="April 7, 2026"
    >
      <div className="space-y-6 text-sm text-slate-700">
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="font-semibold text-blue-900">How this works</p>
          <p className="mt-1 text-blue-800">
            Submit a request, receive a trackable ticket ID, and monitor status updates here. Admin reviewers may ask for clarification before approval.
          </p>
        </section>

        <form onSubmit={handleSubmitRequest} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Request Type</label>
            <select
              aria-label="Select request type"
              value={requestType}
              onChange={(event) => setRequestType(event.target.value as DataRequestType)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {REQUEST_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Details</label>
            <textarea
              value={requestDetails}
              onChange={(event) => setRequestDetails(event.target.value)}
              rows={4}
              placeholder="Describe exactly what data should be provided, corrected, or deleted."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <FileBadge2 className="h-4 w-4" />
            Submit Request
          </button>
        </form>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-900">My Request History</h2>
          {myRequests.length === 0 ? (
            <p className="mt-3 text-slate-500">No requests submitted yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {myRequests.map((request) => (
                <article key={request.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {request.requestType}
                      </span>
                      <span className={`rounded-md px-2 py-1 text-xs font-semibold ${STATUS_CLASS[request.status]}`}>
                        {request.status}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-600">{request.auditTicketId}</span>
                  </div>
                  <p className="mt-2 text-slate-700">{request.requestDetails}</p>
                  {request.adminNotes && (
                    <p className="mt-2 rounded-md bg-slate-50 p-2 text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">Admin note:</span> {request.adminNotes}
                    </p>
                  )}
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Updated {new Date(request.updatedAt).toLocaleString()}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </LegalPageFrame>
  );
}
