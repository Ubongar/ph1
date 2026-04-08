import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAll, StorageKey } from '../../services/storage';
import type { Referral } from '../../types/types';
import { PageHeader } from '../../components/shared/PageHeader';

const STATUS_FILTERS: Array<'All' | Referral['status']> = [
  'All',
  'Requested',
  'Under Review',
  'Accepted',
  'In Consultation',
  'Completed',
  'Declined',
  'Cancelled',
];

function getStatusClass(status: Referral['status']): string {
  const byStatus: Record<Referral['status'], string> = {
    Requested: 'bg-yellow-100 text-yellow-700',
    'Under Review': 'bg-blue-100 text-blue-700',
    Accepted: 'bg-indigo-100 text-indigo-700',
    Declined: 'bg-red-100 text-red-700',
    'In Consultation': 'bg-purple-100 text-purple-700',
    Completed: 'bg-green-100 text-green-700',
    Cancelled: 'bg-gray-100 text-gray-700',
  };

  return byStatus[status];
}

function getReferralAgeHours(requestedAt: string): number {
  const ageMs = Date.now() - new Date(requestedAt).getTime();
  return Math.max(0, Math.floor(ageMs / (1000 * 60 * 60)));
}

export default function SpecialistReferrals() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<'All' | Referral['status']>('All');

  const allReferrals = getAll<Referral>(StorageKey.REFERRALS).sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
  );

  const myReferrals = useMemo(
    () => allReferrals.filter((referral) => !referral.specialistId || referral.specialistId === currentUser?.id),
    [allReferrals, currentUser?.id],
  );

  const filteredReferrals = useMemo(() => {
    if (statusFilter === 'All') return myReferrals;
    return myReferrals.filter((referral) => referral.status === statusFilter);
  }, [myReferrals, statusFilter]);

  const queueHealth = useMemo(() => {
    const openItems = myReferrals.filter((referral) => referral.status === 'Requested' || referral.status === 'Under Review');
    const overdueItems = openItems.filter((referral) => getReferralAgeHours(referral.requestedAt) > 48);
    const urgentItems = openItems.filter((referral) => referral.priority === 'Emergency' || referral.priority === 'Urgent');

    return {
      openCount: openItems.length,
      overdueCount: overdueItems.length,
      urgentCount: urgentItems.length,
    };
  }, [myReferrals]);

  return (
    <div className="p-6">
      <PageHeader
        title="Specialist Referral Worklist"
        subtitle="Triage and process assigned referrals independently from dashboard summaries"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase">Open Queue</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{queueHealth.openCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase">Urgent Priority</p>
          <p className="text-2xl font-bold text-orange-700 mt-1">{queueHealth.urgentCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase">Over 48 Hours</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{queueHealth.overdueCount}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
            <Filter className="w-4 h-4" />
            Filter by status
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === filter
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              {['Student', 'Specialty', 'Priority', 'Queue Age', 'Status', 'Action'].map((heading) => (
                <th key={heading} className="px-4 py-3 text-left">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredReferrals.map((referral) => {
              const ageHours = getReferralAgeHours(referral.requestedAt);
              const ageClass = ageHours > 48 ? 'text-red-600' : ageHours > 24 ? 'text-orange-600' : 'text-gray-600';

              return (
                <tr key={referral.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{referral.studentName}</td>
                  <td className="px-4 py-3 text-gray-700">{referral.specialty}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      referral.priority === 'Emergency'
                        ? 'bg-red-100 text-red-700'
                        : referral.priority === 'Urgent'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                    }`}>
                      {referral.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${ageClass}`}>
                      <Clock3 className="w-3.5 h-3.5" />
                      {ageHours}h
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClass(referral.status)}`}>
                      {referral.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/specialist/referral/${referral.id}`)}
                      className="text-blue-600 hover:underline text-xs font-medium"
                    >
                      Open Case
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredReferrals.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  No referrals match this status filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
