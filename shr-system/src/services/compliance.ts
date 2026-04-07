import type { PolicyAcceptance, PolicyType, PolicyVersion, SystemUser } from '../types/types';
import { StorageKey, create, getAll } from './storage';

export const POLICY_METADATA: Record<PolicyType, { title: string; route: string }> = {
  privacy: { title: 'Privacy Policy', route: '/legal/privacy' },
  terms: { title: 'Terms and Conditions', route: '/legal/terms' },
};

export function getLatestPolicyVersion(policyType: PolicyType): PolicyVersion | null {
  const versions = getAll<PolicyVersion>(StorageKey.POLICY_VERSIONS)
    .filter((version) => version.policyType === policyType)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return versions[0] ?? null;
}

export function getPendingPolicyTypes(userId: string): PolicyType[] {
  const acceptances = getAll<PolicyAcceptance>(StorageKey.POLICY_ACCEPTANCES).filter((item) => item.userId === userId);

  return (Object.keys(POLICY_METADATA) as PolicyType[]).filter((policyType) => {
    const latest = getLatestPolicyVersion(policyType);
    if (!latest) return false;

    return !acceptances.some(
      (item) => item.policyType === policyType && item.acceptedVersion === latest.version,
    );
  });
}

export function acceptLatestPolicies(user: SystemUser, policyTypes: PolicyType[]): void {
  policyTypes.forEach((policyType) => {
    const latest = getLatestPolicyVersion(policyType);
    if (!latest) return;

    const acceptances = getAll<PolicyAcceptance>(StorageKey.POLICY_ACCEPTANCES);
    const alreadyAccepted = acceptances.some(
      (item) => item.userId === user.id && item.policyType === policyType && item.acceptedVersion === latest.version,
    );

    if (alreadyAccepted) return;

    create<PolicyAcceptance>(
      StorageKey.POLICY_ACCEPTANCES,
      {
        userId: user.id,
        policyType,
        acceptedVersion: latest.version,
        acceptedAt: new Date().toISOString(),
        method: 'in-app',
      },
      { autoAudit: false },
    );
  });
}

export function buildDataRequestTicketId(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `DR-${datePart}-${randomPart}`;
}
