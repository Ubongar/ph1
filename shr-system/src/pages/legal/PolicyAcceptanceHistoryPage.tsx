import { useMemo } from 'react';
import LegalPageFrame from './LegalPageFrame';
import { useAuth } from '../../context/AuthContext';
import { getLatestPolicyVersion, POLICY_METADATA } from '../../services/compliance';
import { getAll, StorageKey } from '../../services/storage';
import type { PolicyAcceptance } from '../../types/types';

export default function PolicyAcceptanceHistoryPage() {
  const { currentUser } = useAuth();

  const history = useMemo(() => {
    if (!currentUser) return [];
    return getAll<PolicyAcceptance>(StorageKey.POLICY_ACCEPTANCES)
      .filter((entry) => entry.userId === currentUser.id)
      .sort((a, b) => new Date(b.acceptedAt).getTime() - new Date(a.acceptedAt).getTime());
  }, [currentUser]);

  return (
    <LegalPageFrame
      title="Policy Acceptance History"
      subtitle="Review every terms/privacy acceptance recorded for your account."
      lastUpdated="April 7, 2026"
    >
      {currentUser ? (
        <section className="space-y-4 text-sm text-slate-700">
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            Account: <span className="font-semibold text-slate-900">{currentUser.name}</span>
          </p>

          {history.length === 0 ? (
            <p className="text-slate-500">No acceptance records found for this account.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Policy</th>
                    <th className="px-3 py-2">Accepted Version</th>
                    <th className="px-3 py-2">Current Version</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Accepted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {history.map((entry) => {
                    const latest = getLatestPolicyVersion(entry.policyType);
                    const isCurrent = latest ? latest.version === entry.acceptedVersion : true;

                    return (
                      <tr key={entry.id}>
                        <td className="px-3 py-2 font-medium text-slate-900">{POLICY_METADATA[entry.policyType].title}</td>
                        <td className="px-3 py-2 text-slate-700">v{entry.acceptedVersion}</td>
                        <td className="px-3 py-2 text-slate-700">{latest ? `v${latest.version}` : 'N/A'}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${isCurrent ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {isCurrent ? 'Current' : 'Outdated'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{new Date(entry.acceptedAt).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <p className="text-slate-500">Sign in to view policy acceptance history.</p>
      )}
    </LegalPageFrame>
  );
}
