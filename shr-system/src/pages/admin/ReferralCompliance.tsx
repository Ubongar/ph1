import { useMemo } from 'react';
import { createAuditEntry, getAll, StorageKey } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import type { Referral } from '../../types/types';
import { PageHeader } from '../../components/shared';

export default function ReferralCompliance() {
  const { currentUser } = useAuth();
  const referrals = getAll<Referral>(StorageKey.REFERRALS);

  const metrics = useMemo(() => {
    const total = referrals.length;
    const compliant = referrals.filter((r) => r.complianceStatus === 'Compliant').length;
    const delayed = referrals.filter((r) => r.complianceStatus === 'Delayed').length;
    const overdue = referrals.filter((r) => r.complianceStatus === 'Overdue').length;
    return { total, compliant, delayed, overdue };
  }, [referrals]);

  function handleGenerateReport() {
    if (!currentUser) return;
    createAuditEntry({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'GENERATE_QA_REPORT',
      resourceType: 'Report',
      resourceDescription: 'Generated referral compliance QA report',
      status: 'Success',
    });
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Referral Compliance"
        subtitle="Phase 12 quality assurance and Service Level Agreement monitoring"
        actions={(
          <button
            type="button"
            onClick={handleGenerateReport}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg"
          >
            Generate QA Report
          </button>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase">Total Referrals</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.total}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase">Compliant</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{metrics.compliant}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase">Delayed</p>
          <p className="text-2xl font-bold text-yellow-700 mt-1">{metrics.delayed}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase">Overdue</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{metrics.overdue}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              {['Student', 'Specialist', 'Requested', 'Status', 'Compliance'].map((h) => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {referrals.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{r.studentName}</td>
                <td className="px-4 py-3 text-gray-700">{r.specialistName ?? 'Unassigned'}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(r.requestedAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-700">{r.status}</td>
                <td className="px-4 py-3 text-gray-700">{r.complianceStatus ?? 'Pending'}</td>
              </tr>
            ))}
            {referrals.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                  No referral compliance records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
