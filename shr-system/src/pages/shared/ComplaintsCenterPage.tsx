import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRightCircle, MessageSquareWarning, Send, ShieldAlert } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks';
import { getScopedComplaintsForUser } from '../../services/accessScope';
import {
  buildComplaintTicketId,
  COMPLAINT_DEPARTMENTS,
  COMPLAINT_SEVERITIES,
  complaintSeverityToAlertType,
  inferForwardRoleFromDepartment,
  isComplaintAssignedToUserOrRoleQueue,
  shouldTriggerAdminAlert,
} from '../../services/complaints';
import { pushNotification } from '../../services/notifications';
import { create, createAuditEntry, getAll, StorageKey, update } from '../../services/storage';
import type {
  Complaint,
  ComplaintSeverity,
  ComplaintStatus,
  SystemAlert,
  SystemUser,
  UserRole,
} from '../../types/types';

const STATUS_STYLES: Record<ComplaintStatus, string> = {
  Submitted: 'bg-blue-100 text-blue-700',
  'Under Review': 'bg-amber-100 text-amber-700',
  Forwarded: 'bg-purple-100 text-purple-700',
  'Awaiting Department Feedback': 'bg-orange-100 text-orange-700',
  Resolved: 'bg-emerald-100 text-emerald-700',
  Closed: 'bg-slate-200 text-slate-700',
};

const SEVERITY_STYLES: Record<ComplaintSeverity, string> = {
  Low: 'bg-slate-100 text-slate-700',
  Moderate: 'bg-amber-100 text-amber-700',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
};

function notificationSeverityFromComplaint(severity: ComplaintSeverity): 'info' | 'warning' | 'critical' {
  if (severity === 'Critical') return 'critical';
  if (severity === 'High') return 'warning';
  return 'info';
}

function getAdminUserIds(users: SystemUser[]): string[] {
  return users
    .filter((user) => user.isActive && user.role === 'admin')
    .map((user) => user.id);
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + (value.codePointAt(index) ?? 0)) >>> 0;
  }
  return hash;
}

function getDeterministicDepartmentAssignee(
  users: SystemUser[],
  role: UserRole | undefined,
  complaintId: string,
): SystemUser | undefined {
  if (!role) return undefined;

  const departmentUsers = users
    .filter((user) => user.isActive && user.role === role)
    .sort((left, right) => left.id.localeCompare(right.id));

  if (departmentUsers.length === 0) return undefined;

  const index = hashString(complaintId) % departmentUsers.length;
  return departmentUsers[index];
}

export default function ComplaintsCenterPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const isAdmin = currentUser?.role === 'admin';

  const [refreshKey, setRefreshKey] = useState(0);
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [department, setDepartment] = useState<string>(COMPLAINT_DEPARTMENTS[0]);
  const [severity, setSeverity] = useState<ComplaintSeverity>('Moderate');

  const [activeComplaintId, setActiveComplaintId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<ComplaintSeverity | 'all'>('all');

  const [forwardDepartment, setForwardDepartment] = useState<string>(COMPLAINT_DEPARTMENTS[0]);
  const [forwardToUserId, setForwardToUserId] = useState('');
  const [forwardNote, setForwardNote] = useState('');
  const [adminResponse, setAdminResponse] = useState('');

  const [feedbackDraftByComplaint, setFeedbackDraftByComplaint] = useState<Record<string, string>>({});

  const users = useMemo(
    () => getAll<SystemUser>(StorageKey.USERS).filter((user) => user.isActive),
    [refreshKey],
  );

  const complaints = useMemo(() => {
    if (!currentUser) return [];
    return getScopedComplaintsForUser(currentUser.role, currentUser.id);
  }, [currentUser, refreshKey]);

  const adminFilteredComplaints = useMemo(() => {
    if (!isAdmin) return [];

    return complaints.filter((complaint) => {
      if (statusFilter !== 'all' && complaint.status !== statusFilter) return false;
      if (severityFilter !== 'all' && complaint.severity !== severityFilter) return false;
      return true;
    });
  }, [complaints, isAdmin, statusFilter, severityFilter]);

  const activeComplaint = useMemo(() => {
    if (!isAdmin) return null;
    if (activeComplaintId) {
      return complaints.find((item) => item.id === activeComplaintId) ?? null;
    }
    return adminFilteredComplaints[0] ?? null;
  }, [isAdmin, activeComplaintId, complaints, adminFilteredComplaints]);

  const visibleAssignedToMe = useMemo(() => {
    if (!currentUser || isAdmin) return [];
    return complaints.filter((complaint) => (
      complaint.submittedByUserId !== currentUser.id
      && isComplaintAssignedToUserOrRoleQueue(complaint, currentUser.role, currentUser.id)
    ));
  }, [complaints, currentUser, isAdmin]);

  const visibleFiledByMe = useMemo(() => {
    if (!currentUser || isAdmin) return [];
    return complaints.filter((complaint) => complaint.submittedByUserId === currentUser.id);
  }, [complaints, currentUser, isAdmin]);

  const assignableUsers = useMemo(() => {
    const role = inferForwardRoleFromDepartment(forwardDepartment);
    return users.filter((user) => {
      if (user.role === 'admin') return false;
      if (!role) return true;
      return user.role === role;
    });
  }, [forwardDepartment, users]);

  useEffect(() => {
    if (!activeComplaint) return;
    setForwardDepartment(activeComplaint.forwardedToDepartment ?? activeComplaint.concernedDepartment);
    setForwardToUserId(activeComplaint.forwardedToUserId ?? '');
    setForwardNote(activeComplaint.forwardNote ?? '');
    setAdminResponse(activeComplaint.adminResponse ?? '');
  }, [activeComplaint?.id]);

  if (!currentUser) return null;

  function refresh() {
    setRefreshKey((value) => value + 1);
  }

  function handleSubmitComplaint(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser) return;

    const trimmedSubject = subject.trim();
    const trimmedDetails = details.trim();

    if (trimmedSubject.length < 6) {
      toast('Please provide a clear complaint subject.', 'warning');
      return;
    }

    if (trimmedDetails.length < 16) {
      toast('Please provide enough details so admin can act quickly.', 'warning');
      return;
    }

    const ticketId = buildComplaintTicketId();
    const nowIso = new Date().toISOString();

    const createdComplaint = create<Complaint>(
      StorageKey.COMPLAINTS,
      {
        ticketId,
        submittedByUserId: currentUser.id,
        submittedByName: currentUser.name,
        submittedByRole: currentUser.role,
        subject: trimmedSubject,
        details: trimmedDetails,
        concernedDepartment: department,
        severity,
        status: 'Submitted',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      { autoAudit: false },
    );

    createAuditEntry({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'SUBMIT_COMPLAINT',
      resourceType: 'Complaint',
      resourceId: createdComplaint.id,
      resourceDescription: `Submitted complaint ${ticketId}`,
      status: 'Success',
      changeDetails: JSON.stringify({ severity, concernedDepartment: department }),
    });

    const adminIds = getAdminUserIds(users);

    pushNotification({
      title: `New ${severity} Complaint`,
      message: `${currentUser.name} submitted ${ticketId} for ${department}.`,
      severity: notificationSeverityFromComplaint(severity),
      roleTargets: ['admin'],
      userTargetIds: adminIds,
      actionPath: '/complaints',
    });

    if (shouldTriggerAdminAlert(severity)) {
      create<SystemAlert>(
        StorageKey.ALERTS,
        {
          type: complaintSeverityToAlertType(severity),
          title: `${severity} complaint escalation: ${ticketId}`,
          message: `${currentUser.name} raised a ${severity.toLowerCase()} complaint for ${department}. Immediate review is recommended.`,
          timestamp: nowIso,
          isResolved: false,
        },
        { autoAudit: false },
      );
    }

    setSubject('');
    setDetails('');
    setDepartment(COMPLAINT_DEPARTMENTS[0]);
    setSeverity('Moderate');
    refresh();
    toast(`Complaint submitted successfully. Ticket: ${ticketId}`, 'success');
  }

  function handleForwardComplaint() {
    if (!isAdmin || !activeComplaint || !currentUser) return;

    const selectedAssignee = forwardToUserId
      ? users.find((user) => user.id === forwardToUserId)
      : undefined;

    if (forwardToUserId && !selectedAssignee) {
      toast('Selected assignee is no longer available.', 'error');
      return;
    }

    const forwardRole = selectedAssignee?.role ?? inferForwardRoleFromDepartment(forwardDepartment);
    const queueAssignee = selectedAssignee
      ? undefined
      : getDeterministicDepartmentAssignee(users, forwardRole, activeComplaint.id);
    const assignee = selectedAssignee ?? queueAssignee;
    const nextStatus: ComplaintStatus = assignee ? 'Awaiting Department Feedback' : 'Forwarded';
    const nowIso = new Date().toISOString();

    const updatedComplaint = update<Complaint>(
      StorageKey.COMPLAINTS,
      activeComplaint.id,
      {
        status: nextStatus,
        updatedAt: nowIso,
        adminReviewerId: currentUser.id,
        adminReviewerName: currentUser.name,
        forwardedAt: nowIso,
        forwardedToDepartment: forwardDepartment,
        forwardedToRole: forwardRole,
        forwardedToUserId: assignee?.id,
        forwardedToUserName: assignee?.name,
        forwardNote: forwardNote.trim() || undefined,
        departmentFeedback: undefined,
        departmentFeedbackAt: undefined,
        departmentFeedbackByUserId: undefined,
        departmentFeedbackByUserName: undefined,
      },
      { autoAudit: false },
    );

    if (!updatedComplaint) {
      toast('Unable to forward complaint. Please retry.', 'error');
      return;
    }

    createAuditEntry({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'FORWARD_COMPLAINT',
      resourceType: 'Complaint',
      resourceId: updatedComplaint.id,
      resourceDescription: `Forwarded ${updatedComplaint.ticketId}`,
      status: 'Success',
      changeDetails: JSON.stringify({
        forwardedToDepartment: forwardDepartment,
        forwardedToUserId: assignee?.id,
        status: nextStatus,
      }),
    });

    if (assignee) {
      pushNotification({
        title: `Complaint assigned: ${updatedComplaint.ticketId}`,
        message: `Admin forwarded a complaint to you for ${forwardDepartment}.`,
        severity: 'warning',
        roleTargets: [assignee.role],
        userTargetIds: [assignee.id],
        actionPath: '/complaints',
      });
    }

    let successMessage = 'Complaint marked as forwarded to department queue.';
    if (selectedAssignee && assignee) {
      successMessage = `Complaint forwarded to ${assignee.name}.`;
    } else if (queueAssignee) {
      successMessage = `Complaint forwarded to ${forwardDepartment} and assigned to ${queueAssignee.name}.`;
    }

    refresh();
    toast(successMessage, 'success');
  }

  function handleSubmitFeedback(complaint: Complaint) {
    if (!currentUser) return;
    const assignedToCurrentUser = isComplaintAssignedToUserOrRoleQueue(
      complaint,
      currentUser.role,
      currentUser.id,
    );

    if (!assignedToCurrentUser || complaint.submittedByUserId === currentUser.id) {
      toast('Only the assigned user or department queue member can submit feedback.', 'warning');
      return;
    }

    const draft = (feedbackDraftByComplaint[complaint.id] ?? '').trim();
    if (draft.length < 10) {
      toast('Please provide more detailed feedback for admin.', 'warning');
      return;
    }

    const nowIso = new Date().toISOString();

    const updatedComplaint = update<Complaint>(
      StorageKey.COMPLAINTS,
      complaint.id,
      {
        status: 'Under Review',
        updatedAt: nowIso,
        departmentFeedback: draft,
        departmentFeedbackAt: nowIso,
        departmentFeedbackByUserId: currentUser.id,
        departmentFeedbackByUserName: currentUser.name,
      },
      { autoAudit: false },
    );

    if (!updatedComplaint) {
      toast('Could not submit department feedback.', 'error');
      return;
    }

    createAuditEntry({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'SUBMIT_COMPLAINT_FEEDBACK',
      resourceType: 'Complaint',
      resourceId: updatedComplaint.id,
      resourceDescription: `Submitted department feedback for ${updatedComplaint.ticketId}`,
      status: 'Success',
    });

    const adminIds = getAdminUserIds(users);
    pushNotification({
      title: `Feedback received: ${updatedComplaint.ticketId}`,
      message: `${currentUser.name} submitted department feedback for admin review.`,
      severity: 'info',
      roleTargets: ['admin'],
      userTargetIds: adminIds,
      actionPath: '/complaints',
    });

    setFeedbackDraftByComplaint((prev) => ({ ...prev, [complaint.id]: '' }));
    refresh();
    toast('Feedback sent to admin successfully.', 'success');
  }

  function handleSendAdminResponse() {
    if (!isAdmin || !activeComplaint || !currentUser) return;

    const trimmedResponse = adminResponse.trim();
    if (trimmedResponse.length < 10) {
      toast('Please include a complete response before sending.', 'warning');
      return;
    }

    const nowIso = new Date().toISOString();

    const updatedComplaint = update<Complaint>(
      StorageKey.COMPLAINTS,
      activeComplaint.id,
      {
        status: 'Resolved',
        updatedAt: nowIso,
        adminReviewerId: currentUser.id,
        adminReviewerName: currentUser.name,
        adminResponse: trimmedResponse,
        adminRespondedAt: nowIso,
        adminResponderId: currentUser.id,
        adminResponderName: currentUser.name,
      },
      { autoAudit: false },
    );

    if (!updatedComplaint) {
      toast('Unable to send admin response right now.', 'error');
      return;
    }

    createAuditEntry({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'RESPOND_COMPLAINT',
      resourceType: 'Complaint',
      resourceId: updatedComplaint.id,
      resourceDescription: `Responded to ${updatedComplaint.ticketId}`,
      status: 'Success',
    });

    pushNotification({
      title: `Complaint update: ${updatedComplaint.ticketId}`,
      message: 'Admin has posted an official response to your complaint.',
      severity: 'info',
      roleTargets: [updatedComplaint.submittedByRole],
      userTargetIds: [updatedComplaint.submittedByUserId],
      actionPath: '/complaints',
    });

    refresh();
    toast('Response sent to complainant.', 'success');
  }

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="Complaints Center"
        subtitle={
          isAdmin
            ? 'Review all complaints, forward them to departments or users, and publish official responses.'
            : 'Submit complaints, select the affected department, and track admin responses.'
        }
      />

      {!isAdmin && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              High and critical complaints trigger immediate admin alerts for faster triage.
              Only administrators can send final responses to complainants.
            </p>
          </div>
        </div>
      )}

      {!isAdmin && (
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Submit New Complaint</h2>
          <form onSubmit={handleSubmitComplaint} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Subject</label>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Short summary of the issue"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Affected Department</label>
              <select
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {COMPLAINT_DEPARTMENTS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Seriousness</label>
              <select
                value={severity}
                onChange={(event) => setSeverity(event.target.value as ComplaintSeverity)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {COMPLAINT_SEVERITIES.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Details</label>
              <textarea
                rows={4}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                placeholder="Explain what happened, what has been affected, and what help you need."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Send className="h-4 w-4" />
                Submit Complaint
              </button>
            </div>
          </form>
        </section>
      )}

      {isAdmin ? (
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <section className="rounded-xl border border-gray-200 bg-white">
            <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as ComplaintStatus | 'all')}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="Under Review">Under Review</option>
                <option value="Forwarded">Forwarded</option>
                <option value="Awaiting Department Feedback">Awaiting Department Feedback</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>

              <select
                value={severityFilter}
                onChange={(event) => setSeverityFilter(event.target.value as ComplaintSeverity | 'all')}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">All severities</option>
                {COMPLAINT_SEVERITIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Ticket</th>
                    <th className="px-3 py-2">Complainant</th>
                    <th className="px-3 py-2">Department</th>
                    <th className="px-3 py-2">Severity</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {adminFilteredComplaints.map((complaint) => (
                    <tr
                      key={complaint.id}
                      onClick={() => setActiveComplaintId(complaint.id)}
                      className={`cursor-pointer ${activeComplaint?.id === complaint.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-3 py-2 font-semibold text-gray-800">{complaint.ticketId}</td>
                      <td className="px-3 py-2 text-gray-700">{complaint.submittedByName}</td>
                      <td className="px-3 py-2 text-gray-700">{complaint.concernedDepartment}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${SEVERITY_STYLES[complaint.severity]}`}>
                          {complaint.severity}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${STATUS_STYLES[complaint.status]}`}>
                          {complaint.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            {activeComplaint ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Selected Complaint</p>
                  <p className="text-base font-semibold text-gray-900">{activeComplaint.ticketId}</p>
                  <p className="mt-1 text-sm text-gray-600">{activeComplaint.subject}</p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                  {activeComplaint.details}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="font-semibold text-gray-500">Submitted By</p>
                    <p className="mt-0.5 text-gray-700">{activeComplaint.submittedByName} ({activeComplaint.submittedByRole})</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-500">Concerned Department</p>
                    <p className="mt-0.5 text-gray-700">{activeComplaint.concernedDepartment}</p>
                  </div>
                </div>

                {activeComplaint.departmentFeedback && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <p className="font-semibold">Department feedback</p>
                    <p className="mt-1">{activeComplaint.departmentFeedback}</p>
                    <p className="mt-1 text-xs text-amber-700">
                      {activeComplaint.departmentFeedbackByUserName ?? 'Department user'} • {new Date(activeComplaint.departmentFeedbackAt ?? activeComplaint.updatedAt).toLocaleString()}
                    </p>
                  </div>
                )}

                <div className="space-y-2 rounded-lg border border-gray-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Forward To Department / User</p>

                  <select
                    value={forwardDepartment}
                    onChange={(event) => {
                      setForwardDepartment(event.target.value);
                      setForwardToUserId('');
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    {COMPLAINT_DEPARTMENTS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>

                  <select
                    value={forwardToUserId}
                    onChange={(event) => setForwardToUserId(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Department queue only (no specific user)</option>
                    {assignableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.role})
                      </option>
                    ))}
                  </select>

                  <textarea
                    value={forwardNote}
                    onChange={(event) => setForwardNote(event.target.value)}
                    rows={3}
                    placeholder="What should the target department/user investigate?"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />

                  <button
                    type="button"
                    onClick={handleForwardComplaint}
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    <ArrowRightCircle className="h-4 w-4" />
                    Forward Complaint
                  </button>
                </div>

                <div className="space-y-2 rounded-lg border border-gray-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Admin Final Response</p>
                  <textarea
                    rows={4}
                    value={adminResponse}
                    onChange={(event) => setAdminResponse(event.target.value)}
                    placeholder="Only admin can publish this response to the complainant."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleSendAdminResponse}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <Send className="h-4 w-4" />
                    Send Response To Complainant
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Select a complaint to review, forward, or respond.</p>
            )}
          </section>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-base font-semibold text-gray-900">My Complaints</h2>
            <div className="mt-3 space-y-3">
              {visibleFiledByMe.length === 0 && (
                <p className="text-sm text-gray-500">You have not submitted any complaints yet.</p>
              )}
              {visibleFiledByMe.map((complaint) => (
                <article key={complaint.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{complaint.ticketId}</p>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-md px-2 py-1 text-xs font-semibold ${SEVERITY_STYLES[complaint.severity]}`}>
                        {complaint.severity}
                      </span>
                      <span className={`rounded-md px-2 py-1 text-xs font-semibold ${STATUS_STYLES[complaint.status]}`}>
                        {complaint.status}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-sm font-medium text-gray-800">{complaint.subject}</p>
                  <p className="mt-1 text-xs text-gray-600">Department: {complaint.concernedDepartment}</p>
                  <p className="mt-2 text-sm text-gray-700">{complaint.details}</p>

                  {complaint.adminResponse && (
                    <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-900">
                      <p className="font-semibold">Admin response</p>
                      <p className="mt-1">{complaint.adminResponse}</p>
                      <p className="mt-1 text-xs text-emerald-700">
                        {complaint.adminResponderName ?? 'Admin'} • {new Date(complaint.adminRespondedAt ?? complaint.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-base font-semibold text-gray-900">Assigned To Me / My Department</h2>
            <div className="mt-3 space-y-3">
              {visibleAssignedToMe.length === 0 && (
                <p className="text-sm text-gray-500">No complaints are currently assigned to you.</p>
              )}

              {visibleAssignedToMe.map((complaint) => (
                <article key={complaint.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-amber-900">{complaint.ticketId}</p>
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${STATUS_STYLES[complaint.status]}`}>
                      {complaint.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-amber-900">{complaint.subject}</p>
                  <p className="mt-1 text-xs text-amber-800">Forwarded note: {complaint.forwardNote ?? 'No additional forwarding note provided.'}</p>

                  <textarea
                    rows={3}
                    value={feedbackDraftByComplaint[complaint.id] ?? complaint.departmentFeedback ?? ''}
                    onChange={(event) => setFeedbackDraftByComplaint((prev) => ({
                      ...prev,
                      [complaint.id]: event.target.value,
                    }))}
                    placeholder="Provide your feedback to admin."
                    className="mt-2 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
                  />

                  <button
                    type="button"
                    onClick={() => handleSubmitFeedback(complaint)}
                    className="mt-2 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                  >
                    <MessageSquareWarning className="h-4 w-4" />
                    Send Feedback To Admin
                  </button>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {isAdmin && complaints.some((item) => item.severity === 'Critical' && item.status !== 'Resolved' && item.status !== 'Closed') && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <p>
              Critical complaints are active. Prioritize triage and publish admin responses as soon as department feedback is available.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
