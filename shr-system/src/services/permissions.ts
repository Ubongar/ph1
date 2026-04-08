import type { UserRole } from '../types/types';
import type { PermissionKey, PermissionOverride } from '../types/enhancements';
import { getAll, StorageKey } from './storage';

const OVERRIDES_KEY = 'shr_permission_overrides';

const BASE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  student: ['inbox.view', 'notifications.view', 'appointments.manage', 'timeline.view'],
  medical_staff: [
    'inbox.view',
    'notifications.view',
    'appointments.manage',
    'timeline.view',
    'clinical-safety.run',
    'reports.export',
  ],
  technician: ['inbox.view', 'notifications.view', 'timeline.view'],
  pharmacy: ['inbox.view', 'notifications.view', 'timeline.view'],
  specialist: [
    'inbox.view',
    'notifications.view',
    'appointments.manage',
    'timeline.view',
    'clinical-safety.run',
    'reports.export',
  ],
  admin: [
    'inbox.view',
    'notifications.view',
    'appointments.manage',
    'timeline.view',
    'clinical-safety.run',
    'reconciliation.resolve',
    'quality.view',
    'reports.export',
    'security.manage',
    'permissions.manage',
    'observability.view',
  ],
};

function readOverrides(): PermissionOverride[] {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PermissionOverride[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOverrides(overrides: PermissionOverride[]): void {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
}

export function getRolePermissions(role: UserRole): PermissionKey[] {
  const base = new Set(BASE_PERMISSIONS[role] ?? []);
  const override = readOverrides().find((item) => item.role === role);

  if (!override) return Array.from(base);

  for (const item of override.allow) {
    base.add(item);
  }

  for (const item of override.deny) {
    base.delete(item);
  }

  return Array.from(base);
}

export function hasPermission(role: UserRole, permission: PermissionKey): boolean {
  return getRolePermissions(role).includes(permission);
}

export function setRolePermissionOverride(role: UserRole, allow: PermissionKey[], deny: PermissionKey[]): void {
  const overrides = readOverrides();
  const existing = overrides.find((item) => item.role === role);

  if (existing) {
    existing.allow = allow;
    existing.deny = deny;
    existing.updatedAt = new Date().toISOString();
  } else {
    overrides.push({ role, allow, deny, updatedAt: new Date().toISOString() });
  }

  writeOverrides(overrides);
}

export function clearRolePermissionOverride(role: UserRole): void {
  const overrides = readOverrides().filter((item) => item.role !== role);
  writeOverrides(overrides);
}

export function getPermissionOverrides(): PermissionOverride[] {
  return readOverrides();
}

export function getCurrentUserRole(): UserRole | null {
  const sessionId = localStorage.getItem(StorageKey.AUTH_SESSION);
  if (!sessionId) return null;
  const users = getAll<{ id: string; role: UserRole }>(StorageKey.USERS);
  const user = users.find((item) => item.id === sessionId);
  return user?.role ?? null;
}
