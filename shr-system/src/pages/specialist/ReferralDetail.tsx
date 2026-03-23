import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { create, createAuditEntry, getAll, StorageKey, update } from '../../services/storage';
import type { Referral } from '../../types/types';
import { useToast } from '../../components/shared';

export default function ReferralDetail() {
  const { referralId } = useParams<{ referralId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [consultationDate, setConsultationDate] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [outcome, setOutcome] = useState<NonNullable<Referral['consultationOutcome']>>('Improved');
  const [busy, setBusy] = useState(false);

  const referral = useMemo(() => {
    const referrals = getAll<Referral>(StorageKey.REFERRALS);
    return referrals.find((r) => r.id === referralId) ?? null;
  }, [referralId]);

  if (!referral) {
    return (
      <div className="p-6">
        <button type="button" onClick={() => navigate('/specialist/dashboard')} className="text-sm text-blue-600 hover:underline">
          Back
        </button>
        <div className="mt-4 bg-white border border-gray-200 rounded-xl p-6 text-sm text-gray-600">
          Referral not found.
        </div>
      </div>
    );
  }
  const activeReferral = referral;

  if (!currentUser) {
    return (
      <div className="p-6">
        <button type="button" onClick={() => navigate('/login')} className="text-sm text-blue-600 hover:underline">
          Back
        </button>
        <div className="mt-4 bg-white border border-red-200 rounded-xl p-6 text-sm text-red-700">
          You must be signed in to manage referrals.
        </div>
      </div>
    );
  }

  const canManageReferral = !activeReferral.specialistId || activeReferral.specialistId === currentUser.id;

  if (!canManageReferral) {
    return (
      <div className="p-6">
        <button type="button" onClick={() => navigate('/specialist/dashboard')} className="text-sm text-blue-600 hover:underline">
          Back
        </button>
        <div className="mt-4 bg-white border border-red-200 rounded-xl p-6 text-sm text-red-700">
          You are not authorized to manage this referral.
        </div>
      </div>
    );
  }

  function logAction(
    action:
      | 'ACCEPT_REFERRAL'
      | 'DECLINE_REFERRAL'
      | 'COMPLETE_REFERRAL'
      | 'SUBMIT_CONSULTATION_NOTES'
      | 'REFER_TO_SPECIALIST'
      | 'CLOSE_REFERRAL',
    description: string,
  ) {
    if (!currentUser) return;
    createAuditEntry({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      resourceType: 'Referral',
      resourceId: activeReferral.id,
      resourceDescription: description,
      status: 'Success',
    });
  }

  async function handleAccept() {
    if (!currentUser) return;
    setBusy(true);
    update<Referral>(StorageKey.REFERRALS, activeReferral.id, {
      status: 'Accepted',
      specialistId: currentUser.id,
      specialistName: currentUser.name,
      reviewedAt: new Date().toISOString(),
    }, { autoAudit: false });
    logAction('ACCEPT_REFERRAL', `Accepted referral for ${activeReferral.studentName}`);
    toast('Referral accepted', 'success');
    setBusy(false);
    navigate('/specialist/dashboard');
  }

  async function handleDecline() {
    setBusy(true);
    update<Referral>(StorageKey.REFERRALS, activeReferral.id, {
      status: 'Declined',
      reviewedAt: new Date().toISOString(),
    }, { autoAudit: false });
    logAction('DECLINE_REFERRAL', `Declined referral for ${activeReferral.studentName}`);
    toast('Referral declined', 'warning');
    setBusy(false);
    navigate('/specialist/dashboard');
  }

  async function handleComplete() {
    setBusy(true);
    const normalizedDuration = Number.parseInt(durationMinutes, 10);
    const reviewedAt = new Date().toISOString();
    const requestedAtTime = new Date(activeReferral.requestedAt).getTime();
    const reviewedAtTime = new Date(reviewedAt).getTime();
    const hoursToReview = (reviewedAtTime - requestedAtTime) / (1000 * 60 * 60);
    const complianceStatus: NonNullable<Referral['complianceStatus']> =
      hoursToReview > 72 ? 'Overdue' : hoursToReview > 48 ? 'Delayed' : 'Compliant';
    update<Referral>(StorageKey.REFERRALS, activeReferral.id, {
      status: 'Completed',
      consultationNotes: notes.trim() || undefined,
      reviewedAt,
      consultationDate: consultationDate || undefined,
      consultationDurationMinutes: Number.isFinite(normalizedDuration) && normalizedDuration > 0
        ? normalizedDuration
        : undefined,
      consultationOutcome: outcome,
      complianceStatus,
    }, { autoAudit: false });
    logAction('SUBMIT_CONSULTATION_NOTES', `Submitted consultation notes for ${activeReferral.studentName}`);
    logAction('COMPLETE_REFERRAL', `Completed referral consultation for ${activeReferral.studentName}`);
    logAction('CLOSE_REFERRAL', `Closed referral for ${activeReferral.studentName}`);
    toast('Consultation completed', 'success');
    setBusy(false);
    navigate('/specialist/dashboard');
  }

  async function handleEscalateReferral() {
    if (!currentUser) return;
    setBusy(true);
    const escalated = getAll<Referral>(StorageKey.REFERRALS).find((r) =>
      r.parentReferralId === activeReferral.id && r.status !== 'Cancelled',
    );
    if (escalated) {
      toast('An escalation referral already exists', 'warning');
      setBusy(false);
      return;
    }
    const specialists = getAll<{ id: string; name: string; role: string; isActive: boolean; department?: string }>(StorageKey.USERS)
      .filter((u) => u.role === 'specialist' && u.isActive && u.id !== currentUser.id);
    if (specialists.length === 0) {
      toast('No other specialist is available for escalation', 'error');
      setBusy(false);
      return;
    }
    const fallbackSpecialist = specialists[0];
    const matching = specialists.find((s) =>
      (s.department ?? '').toLowerCase().includes(activeReferral.specialty.toLowerCase()),
    ) ?? fallbackSpecialist;
    const now = new Date().toISOString();
    const escalatedReferral: Omit<Referral, 'id'> = {
      studentId: activeReferral.studentId,
      studentName: activeReferral.studentName,
      requestingStaffId: activeReferral.requestingStaffId,
      requestingStaffName: activeReferral.requestingStaffName,
      parentReferralId: activeReferral.id,
      specialty: activeReferral.specialty,
      reason: activeReferral.reason,
      priority: activeReferral.priority,
      specialistId: matching.id,
      specialistName: matching.name,
      status: 'Requested',
      requestedAt: now,
      reviewedAt: undefined,
      consultationDate: undefined,
      consultationDurationMinutes: undefined,
      consultationOutcome: 'Escalated',
      consultationNotes: notes.trim() || undefined,
      complianceStatus: 'Compliant',
    };
    create<Referral>(StorageKey.REFERRALS, escalatedReferral, { autoAudit: false });
    update<Referral>(StorageKey.REFERRALS, activeReferral.id, {
      consultationOutcome: 'Escalated',
      status: 'Completed',
      reviewedAt: now,
      consultationNotes: notes.trim() || activeReferral.consultationNotes,
      complianceStatus: 'Compliant',
    }, { autoAudit: false });
    logAction('REFER_TO_SPECIALIST', `Escalated referral for ${activeReferral.studentName} to ${matching.name}`);
    logAction('COMPLETE_REFERRAL', `Completed original referral after escalation for ${activeReferral.studentName}`);
    toast('Referral escalated to another specialist', 'success');
    setBusy(false);
    navigate('/specialist/dashboard');
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        type="button"
        onClick={() => navigate('/specialist/dashboard')}
        className="mb-4 flex items-center gap-2 text-sm text-blue-600 hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Referral Detail</h1>
          <p className="text-sm text-gray-500">Manage specialist referral lifecycle</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Student</span><p className="font-medium text-gray-900">{referral.studentName}</p></div>
          <div><span className="text-gray-500">Specialty</span><p className="font-medium text-gray-900">{referral.specialty}</p></div>
          <div><span className="text-gray-500">Priority</span><p className="font-medium text-gray-900">{referral.priority}</p></div>
          <div><span className="text-gray-500">Status</span><p className="font-medium text-gray-900">{referral.status}</p></div>
          <div className="md:col-span-2"><span className="text-gray-500">Reason</span><p className="font-medium text-gray-900">{referral.reason}</p></div>
        </div>

        <div>
          <label htmlFor="consultationDate" className="block text-sm font-medium text-gray-700 mb-1">Consultation Date</label>
          <input
            id="consultationDate"
            type="date"
            value={consultationDate}
            onChange={(e) => setConsultationDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="durationMinutes" className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
            <input
              id="durationMinutes"
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="e.g. 30"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="consultationOutcome" className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
            <select
              id="consultationOutcome"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as NonNullable<Referral['consultationOutcome']>)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {['Resolved', 'Improved', 'No Change', 'Escalated', 'Follow-up Required'].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Consultation Notes</label>
          <textarea
            id="notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add consultation findings and recommendations..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {(referral.status === 'Requested' || referral.status === 'Under Review') && (
            <>
              <button
                type="button"
                onClick={() => void handleAccept()}
                disabled={busy}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-50"
              >
                Accept Referral
              </button>
              <button
                type="button"
                onClick={() => void handleDecline()}
                disabled={busy}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg disabled:opacity-50"
              >
                Decline
              </button>
            </>
          )}
          {(referral.status === 'Accepted' || referral.status === 'In Consultation') && (
            <>
              <button
                type="button"
                onClick={() => void handleComplete()}
                disabled={busy}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg disabled:opacity-50"
              >
                Mark Completed
              </button>
              <button
                type="button"
                onClick={() => void handleEscalateReferral()}
                disabled={busy}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg disabled:opacity-50"
              >
                Escalate to Specialist
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
