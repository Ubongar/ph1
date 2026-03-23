import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAll, StorageKey } from '../../services/storage';
import type { Referral } from '../../types/types';
import { PageHeader } from '../../components/shared/PageHeader';

export default function SpecialistDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const referrals = getAll<Referral>(StorageKey.REFERRALS).sort((a, b) =>
    new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
  );

  const myReferrals = useMemo(
    () => referrals.filter((r) => !r.specialistId || r.specialistId === currentUser?.id),
    [currentUser?.id, referrals],
  );

  const pendingCount = myReferrals.filter((r) => r.status === 'Requested' || r.status === 'Under Review').length;
  const acceptedCount = myReferrals.filter((r) => r.status === 'Accepted' || r.status === 'In Consultation').length;
  const completedCount = myReferrals.filter((r) => r.status === 'Completed').length;
  const followUpRequiredCount = myReferrals.filter((r) => r.consultationOutcome === 'Follow-up Required').length;
  const statusClass: Record<Referral['status'], string> = {
    Requested: 'bg-yellow-100 text-yellow-700',
    'Under Review': 'bg-blue-100 text-blue-700',
    Accepted: 'bg-indigo-100 text-indigo-700',
    Declined: 'bg-red-100 text-red-700',
    'In Consultation': 'bg-purple-100 text-purple-700',
    Completed: 'bg-green-100 text-green-700',
    Cancelled: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="p-6">
      <PageHeader title="Specialist Dashboard" subtitle="Review and manage referred students" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase">Pending Referrals</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase">Active Consultations</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{acceptedCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase">Completed</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{completedCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase">Follow-up Needed</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{followUpRequiredCount}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Recent Referrals</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              {['Student', 'Specialty', 'Priority', 'Requested', 'Status', 'Action'].map((h) => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {myReferrals.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{r.studentName}</td>
                <td className="px-4 py-3 text-gray-700">{r.specialty}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    r.priority === 'Emergency' ? 'bg-red-100 text-red-700' :
                      r.priority === 'Urgent' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                  }`}>
                    {r.priority}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{new Date(r.requestedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass[r.status]}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/specialist/referral/${r.id}`)}
                    className="text-blue-600 hover:underline text-xs font-medium"
                  >
                    Open
                  </button>
                </td>
              </tr>
            ))}
            {myReferrals.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  No referrals assigned.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
