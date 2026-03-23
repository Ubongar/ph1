import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { createAuditEntry, getAll, StorageKey, update } from '../../services/storage';
import type { Referral } from '../../types/types';
import { useToast } from '../../components/shared';

export default function ReferralDetail() {
  const { referralId } = useParams<{ referralId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
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

  function logAction(action: 'ACCEPT_REFERRAL' | 'DECLINE_REFERRAL' | 'COMPLETE_REFERRAL', description: string) {
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
    });
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
    });
    logAction('DECLINE_REFERRAL', `Declined referral for ${activeReferral.studentName}`);
    toast('Referral declined', 'warning');
    setBusy(false);
    navigate('/specialist/dashboard');
  }

  async function handleComplete() {
    setBusy(true);
    update<Referral>(StorageKey.REFERRALS, activeReferral.id, {
      status: 'Completed',
      consultationNotes: notes.trim() || undefined,
      reviewedAt: new Date().toISOString(),
    });
    logAction('COMPLETE_REFERRAL', `Completed referral consultation for ${activeReferral.studentName}`);
    toast('Consultation completed', 'success');
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
            <button
              type="button"
              onClick={() => void handleComplete()}
              disabled={busy}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg disabled:opacity-50"
            >
              Mark Completed
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
