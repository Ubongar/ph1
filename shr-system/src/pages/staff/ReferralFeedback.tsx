import { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAll, StorageKey } from '../../services/storage';
import type { Referral } from '../../types/types';
import { PageHeader } from '../../components/shared';

const outcomeBadgeClass: Record<NonNullable<Referral['consultationOutcome']>, string> = {
  Resolved: 'bg-green-100 text-green-700',
  Improved: 'bg-blue-100 text-blue-700',
  'No Change': 'bg-yellow-100 text-yellow-700',
  Escalated: 'bg-orange-100 text-orange-700',
  'Follow-up Required': 'bg-purple-100 text-purple-700',
};

export default function ReferralFeedback() {
  const { currentUser } = useAuth();
  const allReferrals = getAll<Referral>(StorageKey.REFERRALS);

  const myReferrals = useMemo(
    () => allReferrals
      .filter((r) => r.requestingStaffId === currentUser?.id)
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()),
    [allReferrals, currentUser?.id],
  );

  return (
    <div className="p-6">
      <PageHeader title="Referral Feedback" subtitle="Outcomes returned from specialist consultations" />

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              {['Student', 'Specialty', 'Specialist', 'Status', 'Outcome', 'Notes'].map((h) => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {myReferrals.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="px-4 py-3 font-medium text-gray-900">{r.studentName}</td>
                <td className="px-4 py-3 text-gray-700">{r.specialty}</td>
                <td className="px-4 py-3 text-gray-700">{r.specialistName ?? 'Unassigned'}</td>
                <td className="px-4 py-3 text-gray-600">{r.status}</td>
                <td className="px-4 py-3">
                  {r.consultationOutcome ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${outcomeBadgeClass[r.consultationOutcome]}`}>
                      {r.consultationOutcome}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Pending</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {r.consultationNotes ?? r.technicianReviewNotes ?? '—'}
                </td>
              </tr>
            ))}
            {myReferrals.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  No referrals created yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
