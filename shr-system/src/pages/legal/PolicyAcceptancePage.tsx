import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import LegalPageFrame from './LegalPageFrame';
import { useAuth } from '../../context/AuthContext';
import { acceptLatestPolicies, getLatestPolicyVersion, getPendingPolicyTypes, POLICY_METADATA } from '../../services/compliance';
import { createAuditEntry } from '../../services/storage';
import type { PolicyType } from '../../types/types';
import { useToast } from '../../hooks';

const ROLE_HOME: Record<string, string> = {
  student: '/student/dashboard',
  medical_staff: '/staff/dashboard',
  technician: '/technician/upload',
  pharmacy: '/pharmacy/queue',
  specialist: '/specialist/dashboard',
  admin: '/admin/dashboard',
};

export default function PolicyAcceptancePage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [confirmChecked, setConfirmChecked] = useState(false);

  const pendingPolicies = useMemo(() => {
    if (!currentUser) return [] as PolicyType[];
    return getPendingPolicyTypes(currentUser.id);
  }, [currentUser]);

  if (!currentUser) {
    return null;
  }

  const user = currentUser;

  function handleContinue() {
    navigate(ROLE_HOME[user.role] ?? '/');
  }

  function handleAcceptUpdates() {
    if (!confirmChecked) {
      toast('Please confirm you have reviewed the updated policies.', 'warning');
      return;
    }

    acceptLatestPolicies(user, pendingPolicies);

    pendingPolicies.forEach((policyType) => {
      const latest = getLatestPolicyVersion(policyType);
      if (!latest) return;

      createAuditEntry({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'ACCEPT_POLICY_UPDATE',
        resourceType: 'Policy',
        resourceId: latest.id,
        resourceDescription: `Accepted ${latest.title} v${latest.version}`,
        status: 'Success',
      });
    });

    toast('Policy acceptance recorded successfully.', 'success');
    handleContinue();
  }

  return (
    <LegalPageFrame
      title="Policy Update Acceptance"
      subtitle="Updated terms and privacy policies require re-acceptance before continuing to role dashboards."
      lastUpdated="April 7, 2026"
    >
      {pendingPolicies.length === 0 ? (
        <section className="space-y-4">
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            You are fully up to date. No policy re-acceptance is required.
          </p>
          <button
            type="button"
            onClick={handleContinue}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Continue to Dashboard
          </button>
        </section>
      ) : (
        <section className="space-y-5 text-sm text-slate-700">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <p className="font-semibold">Action required before access</p>
            <p className="mt-1">Please review and accept the policy updates listed below.</p>
          </div>

          <div className="space-y-3">
            {pendingPolicies.map((policyType) => {
              const latest = getLatestPolicyVersion(policyType);
              if (!latest) return null;

              return (
                <article key={policyType} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-base font-semibold text-slate-900">{latest.title}</h2>
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                      Version {latest.version}
                    </span>
                  </div>
                  <p className="mt-2 text-slate-600">{latest.summary}</p>
                  <p className="mt-2 text-xs text-slate-500">Effective {new Date(latest.effectiveFrom).toLocaleString()}</p>
                  <Link to={POLICY_METADATA[policyType].route} className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:text-blue-800">
                    Open policy document
                  </Link>
                </article>
              );
            })}
          </div>

          <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3">
            <input
              type="checkbox"
              checked={confirmChecked}
              onChange={(event) => setConfirmChecked(event.target.checked)}
              className="mt-1 rounded"
            />
            <span>
              I have reviewed the updated policies and agree to continue using this service under the latest terms.
            </span>
          </label>

          <button
            type="button"
            onClick={handleAcceptUpdates}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <CheckCircle2 className="h-4 w-4" />
            Accept and Continue
          </button>
        </section>
      )}
    </LegalPageFrame>
  );
}
