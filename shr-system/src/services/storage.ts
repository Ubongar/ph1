import type { Student, MedicationRequisition, AuditLog, AuditAction } from '../types/types';
import { enqueueOfflineMutation } from './offlineSync';

export enum StorageKey {
  STUDENTS = 'shr_students',
  USERS = 'shr_system_users',
  ENCOUNTERS = 'shr_encounters',
  REQUISITIONS = 'shr_requisitions',
  REFERRALS = 'shr_referrals',
  RESULTS = 'shr_diagnostic_results',
  AUDIT_LOGS = 'shr_audit_logs',
  ALERTS = 'shr_system_alerts',
  COMPLAINTS = 'shr_complaints',
  DATA_REQUESTS = 'shr_data_requests',
  POLICY_VERSIONS = 'shr_policy_versions',
  POLICY_ACCEPTANCES = 'shr_policy_acceptances',
  AUTH_SESSION = 'shr_auth_session',
}

type AuditResourceType = AuditLog['resourceType'];
const MAX_AUDIT_CHANGE_DETAILS_LENGTH = 500;
const AUDIT_CHANGE_DETAILS_ELLIPSIS = '...';

const KEY_TO_RESOURCE_TYPE: Partial<Record<StorageKey, AuditResourceType>> = {
  [StorageKey.STUDENTS]: 'Student',
  [StorageKey.USERS]: 'User',
  [StorageKey.REQUISITIONS]: 'Requisition',
  [StorageKey.REFERRALS]: 'Referral',
  [StorageKey.RESULTS]: 'DiagnosticResult',
  [StorageKey.ALERTS]: 'System',
  [StorageKey.COMPLAINTS]: 'Complaint',
  [StorageKey.ENCOUNTERS]: 'Student',
  [StorageKey.DATA_REQUESTS]: 'DataRequest',
  [StorageKey.POLICY_VERSIONS]: 'Policy',
  [StorageKey.POLICY_ACCEPTANCES]: 'Policy',
};

function getCurrentAuditUser(): Pick<AuditLog, 'userId' | 'userName' | 'userRole'> {
  const sessionUserId = localStorage.getItem(StorageKey.AUTH_SESSION);
  const users = getAll<{ id: string; name: string; role: AuditLog['userRole'] }>(StorageKey.USERS);
  const currentUser = sessionUserId ? users.find((user) => user.id === sessionUserId) : null;

  if (currentUser) {
    return {
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
    };
  }

  return {
    userId: 'system',
    userName: 'System',
    userRole: 'admin',
  };
}

function appendAuditLog(log: AuditLog): void {
  const logs = getAll<AuditLog>(StorageKey.AUDIT_LOGS);
  logs.push(log);
  localStorage.setItem(StorageKey.AUDIT_LOGS, JSON.stringify(logs));
}

function createAutoAuditEntry(
  key: StorageKey,
  action: Extract<AuditAction, 'CREATE_RECORD' | 'EDIT_RECORD'>,
  resourceId: string,
  changeDetails?: string,
): void {
  if (key === StorageKey.AUDIT_LOGS || key === StorageKey.AUTH_SESSION) return;

  const resourceType = KEY_TO_RESOURCE_TYPE[key] ?? 'System';
  const user = getCurrentAuditUser();

  createAuditEntry({
    ...user,
    action,
    resourceType,
    resourceId,
    resourceDescription: `${action.replace('_', ' ')} on ${resourceType}`,
    status: 'Success',
    changeDetails,
  });
}

interface StorageMutationOptions {
  autoAudit?: boolean;
  auditChangeDetails?: string;
}

function toAuditChangeDetails(value: unknown): string | undefined {
  try {
    const raw = JSON.stringify(value);
    if (!raw) return undefined;
    const maxContentLength = MAX_AUDIT_CHANGE_DETAILS_LENGTH - AUDIT_CHANGE_DETAILS_ELLIPSIS.length;
    return raw.length > MAX_AUDIT_CHANGE_DETAILS_LENGTH
      ? `${raw.slice(0, maxContentLength)}${AUDIT_CHANGE_DETAILS_ELLIPSIS}`
      : raw;
  } catch {
    return undefined;
  }
}

export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__shr_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function getAll<T>(key: StorageKey): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

export function getById<T extends { id: string }>(key: StorageKey, id: string): T | null {
  const items = getAll<T>(key);
  return items.find((item) => item.id === id) ?? null;
}

export function create<T extends { id: string }>(
  key: StorageKey,
  item: Omit<T, 'id'> & Partial<Pick<T, 'id'>>,
  options: StorageMutationOptions = {},
): T {
  const items = getAll<T>(key);
  const newItem = { ...item, id: item.id ?? crypto.randomUUID() } as T;
  items.push(newItem);
  localStorage.setItem(key, JSON.stringify(items));
  enqueueOfflineMutation({
    storageKey: key,
    entityId: newItem.id,
    action: 'create',
    payload: newItem,
  });
  if (options.autoAudit !== false) {
    createAutoAuditEntry(key, 'CREATE_RECORD', newItem.id, options.auditChangeDetails);
  }
  return newItem;
}

export function update<T extends { id: string }>(
  key: StorageKey,
  id: string,
  updates: Partial<T>,
  options: StorageMutationOptions = {},
): T | null {
  const items = getAll<T>(key);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const before = items[index];
  const updated = { ...items[index], ...updates } as T;
  items[index] = updated;
  localStorage.setItem(key, JSON.stringify(items));
  enqueueOfflineMutation({
    storageKey: key,
    entityId: updated.id,
    action: 'update',
    payload: updates,
    beforeSnapshot: before,
  });
  if (options.autoAudit !== false) {
    const changeDetails = options.auditChangeDetails ?? toAuditChangeDetails(updates);
    createAutoAuditEntry(key, 'EDIT_RECORD', updated.id, changeDetails);
  }
  return updated;
}

export function deleteById(key: StorageKey, id: string): boolean {
  const items = getAll<{ id: string }>(key);
  const toDelete = items.find((item) => item.id === id);
  const filtered = items.filter((item) => item.id !== id);
  if (filtered.length === items.length) return false;
  localStorage.setItem(key, JSON.stringify(filtered));
  enqueueOfflineMutation({
    storageKey: key,
    entityId: id,
    action: 'delete',
    payload: { deleted: true },
    beforeSnapshot: toDelete,
  });
  createAutoAuditEntry(key, 'EDIT_RECORD', id, JSON.stringify({ deleted: true }));
  return true;
}

export function getStudentByUserId(userId: string): Student | null {
  const students = getAll<Student>(StorageKey.STUDENTS);
  return students.find((s) => s.userId === userId) ?? null;
}

export function getRequisitionsByStudentId(studentId: string): MedicationRequisition[] {
  const requisitions = getAll<MedicationRequisition>(StorageKey.REQUISITIONS);
  return requisitions.filter((r) => r.studentId === studentId);
}

export function getPendingRequisitions(): MedicationRequisition[] {
  const requisitions = getAll<MedicationRequisition>(StorageKey.REQUISITIONS);
  return requisitions.filter((r) => r.status === 'Pending Review');
}

export function getAuditLogs(filters?: {
  userId?: string;
  action?: AuditAction;
  startDate?: string;
  endDate?: string;
}): AuditLog[] {
  let logs = getAll<AuditLog>(StorageKey.AUDIT_LOGS);
  if (!filters) return logs;

  if (filters.userId) {
    logs = logs.filter((l) => l.userId === filters.userId);
  }
  if (filters.action) {
    logs = logs.filter((l) => l.action === filters.action);
  }
  if (filters.startDate) {
    const start = new Date(filters.startDate).getTime();
    logs = logs.filter((l) => new Date(l.timestamp).getTime() >= start);
  }
  if (filters.endDate) {
    const end = new Date(filters.endDate).getTime();
    logs = logs.filter((l) => new Date(l.timestamp).getTime() <= end);
  }
  return logs;
}

export function createAuditEntry(
  entry: Omit<AuditLog, 'id' | 'timestamp' | 'ipAddress' | 'sessionId'>,
): void {
  const newLog: AuditLog = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
    sessionId: crypto.randomUUID(),
  };
  appendAuditLog(newLog);
}
