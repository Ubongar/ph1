import { useMemo, useState } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks';
import { POLICY_METADATA } from '../../services/compliance';
import { create, createAuditEntry, getAll, StorageKey } from '../../services/storage';
import type { PolicyAcceptance, PolicyType, PolicyVersion, SystemUser } from '../../types/types';

const POLICY_TYPES: PolicyType[] = ['privacy', 'terms'];

function getLatestVersions(): Record<PolicyType, PolicyVersion | null> {
  const versions = getAll<PolicyVersion>(StorageKey.POLICY_VERSIONS);
  return {
    privacy: versions
      .filter((version) => version.policyType === 'privacy')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null,
    terms: versions
      .filter((version) => version.policyType === 'terms')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null,
  };
}

export default function PolicyVersioning() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [summary, setSummary] = useState<Record<PolicyType, string>>({
    privacy: '',
    terms: '',
  });
  const [newVersion, setNewVersion] = useState<Record<PolicyType, string>>({
    privacy: '1.1',
    terms: '1.1',
  });

  const latestByType = useMemo(() => getLatestVersions(), [refreshKey]);
  const users = useMemo(() => getAll<SystemUser>(StorageKey.USERS), [refreshKey]);
  const acceptances = useMemo(() => getAll<PolicyAcceptance>(StorageKey.POLICY_ACCEPTANCES), [refreshKey]);

  function publishPolicy(policyType: PolicyType) {
    if (!currentUser) return;

    const versionToPublish = newVersion[policyType].trim();
    const summaryText = summary[policyType].trim();

    if (!versionToPublish) {
      toast('Please enter a version number.', 'warning');
      return;
    }

    if (!summaryText) {
      toast('Please include a short release summary.', 'warning');
      return;
    }

    const published = create<PolicyVersion>(
      StorageKey.POLICY_VERSIONS,
      {
        policyType,
        version: versionToPublish,
        title: POLICY_METADATA[policyType].title,
        summary: summaryText,
        effectiveFrom: new Date().toISOString(),
        publishedByUserId: currentUser.id,
        publishedByUserName: currentUser.name,
        createdAt: new Date().toISOString(),
      },
      { autoAudit: false },
    );

    createAuditEntry({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'UPDATE_POLICY_VERSION',
      resourceType: 'Policy',
      resourceId: published.id,
      resourceDescription: `Published ${published.title} v${published.version}`,
      status: 'Success',
      changeDetails: JSON.stringify({ summary: summaryText }),
    });

    setSummary((prev) => ({ ...prev, [policyType]: '' }));
    setRefreshKey((value) => value + 1);
    toast(`${POLICY_METADATA[policyType].title} v${versionToPublish} published. Users must re-accept.`, 'success');
  }

  function getOutstandingCount(policyType: PolicyType): number {
    const latest = latestByType[policyType];
    if (!latest) return 0;

    return users.filter((user) => user.isActive).filter((user) => {
      return !acceptances.some(
        (item) => item.userId === user.id && item.policyType === policyType && item.acceptedVersion === latest.version,
      );
    }).length;
  }

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="Policy Versioning"
        subtitle="Publish new terms/privacy versions. New versions automatically require in-app user re-acceptance."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {POLICY_TYPES.map((policyType) => {
          const latest = latestByType[policyType];
          const outstandingCount = getOutstandingCount(policyType);

          return (
            <section key={policyType} className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="text-base font-semibold text-gray-900">{POLICY_METADATA[policyType].title}</h2>
              <p className="mt-1 text-sm text-gray-600">
                Latest: {latest ? `v${latest.version}` : 'No published version'}
              </p>
              <p className="mt-1 text-xs text-amber-700">Outstanding re-acceptances: {outstandingCount}</p>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">New Version</label>
                  <input
                    aria-label={`New version for ${POLICY_METADATA[policyType].title}`}
                    placeholder="e.g. 1.1"
                    value={newVersion[policyType]}
                    onChange={(event) => setNewVersion((prev) => ({ ...prev, [policyType]: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Release Summary</label>
                  <textarea
                    rows={3}
                    value={summary[policyType]}
                    onChange={(event) => setSummary((prev) => ({ ...prev, [policyType]: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe what changed and why users must re-accept."
                  />
                </div>
                <button
                  type="button"
                  onClick={() => publishPolicy(policyType)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Publish Version
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
