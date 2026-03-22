import type { Student, MedicationRequisition, AuditLog, AuditAction } from '../types/types';

export enum StorageKey {
  STUDENTS = 'shr_students',
  USERS = 'shr_system_users',
  ENCOUNTERS = 'shr_encounters',
  REQUISITIONS = 'shr_requisitions',
  RESULTS = 'shr_diagnostic_results',
  AUDIT_LOGS = 'shr_audit_logs',
  ALERTS = 'shr_system_alerts',
  AUTH_SESSION = 'shr_auth_session',
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

export function create<T extends { id: string }>(key: StorageKey, item: T): T {
  const items = getAll<T>(key);
  items.push(item);
  localStorage.setItem(key, JSON.stringify(items));
  return item;
}

export function update<T extends { id: string }>(
  key: StorageKey,
  id: string,
  updates: Partial<T>,
): T | null {
  const items = getAll<T>(key);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const updated = { ...items[index], ...updates } as T;
  items[index] = updated;
  localStorage.setItem(key, JSON.stringify(items));
  return updated;
}

export function deleteById(key: StorageKey, id: string): boolean {
  const items = getAll<{ id: string }>(key);
  const filtered = items.filter((item) => item.id !== id);
  if (filtered.length === items.length) return false;
  localStorage.setItem(key, JSON.stringify(filtered));
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
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
    sessionId: `sess-${Date.now()}`,
  };
  create(StorageKey.AUDIT_LOGS, newLog);
}
