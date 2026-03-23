import { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAll, StorageKey } from '../../services/storage';
import type { Referral } from '../../types/types';
import { PageHeader } from '../../components/shared';

export default function ConsultationAnalytics() {
  const { currentUser } = useAuth();
  const referrals = getAll<Referral>(StorageKey.REFERRALS).filter((r) => r.specialistId === currentUser?.id);

  const stats = useMemo(() => {
    const total = referrals.length;
    const completed = referrals.filter((r) => r.status === 'Completed').length;
    const escalated = referrals.filter((r) => r.consultationOutcome === 'Escalated').length;
    const avgDuration = referrals
      .map((r) => r.consultationDurationMinutes)
      .filter((v): v is number => typeof v === 'number' && v > 0);
    const averageMinutes = avgDuration.length > 0
      ? Math.round(avgDuration.reduce((sum, v) => sum + v, 0) / avgDuration.length)
      : 0;
    const compliant = referrals.filter((r) => r.complianceStatus === 'Compliant').length;
    const delayed = referrals.filter((r) => r.complianceStatus === 'Delayed' || r.complianceStatus === 'Overdue').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      escalated,
      averageMinutes,
      compliant,
      delayed,
      completionRate,
    };
  }, [referrals]);

  return (
    <div className="p-6">
      <PageHeader title="Consultation Analytics" subtitle="Referral workload and outcomes" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase">Total Assigned</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase">Completion Rate</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.completionRate}%</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase">Avg Consultation Time</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.averageMinutes} mins</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase">Escalated Cases</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.escalated}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase">Compliant Reviews</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.compliant}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase">Delayed / Overdue</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.delayed}</p>
        </div>
      </div>
    </div>
  );
}
