import type { KpiReportSnapshot, SecurityEvent, TelemetryEvent } from '../types/enhancements';
import { getAll, StorageKey } from './storage';

const TELEMETRY_KEY = 'shr_observability_events';
const SECURITY_EVENTS_KEY = 'shr_security_events';
const KPI_SNAPSHOTS_KEY = 'shr_kpi_snapshots';

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]): void {
  localStorage.setItem(key, JSON.stringify(value.slice(-1500)));
}

export function trackTelemetry(input: Omit<TelemetryEvent, 'id' | 'createdAt'>): void {
  const list = read<TelemetryEvent>(TELEMETRY_KEY);
  list.push({ ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  write(TELEMETRY_KEY, list);
}

export function trackSecurityEvent(input: Omit<SecurityEvent, 'id' | 'createdAt'>): void {
  const list = read<SecurityEvent>(SECURITY_EVENTS_KEY);
  list.push({ ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  write(SECURITY_EVENTS_KEY, list);
}

export function getTelemetry(): TelemetryEvent[] {
  return read<TelemetryEvent>(TELEMETRY_KEY)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getSecurityEvents(): SecurityEvent[] {
  return read<SecurityEvent>(SECURITY_EVENTS_KEY)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function generateKpiSnapshot(): KpiReportSnapshot {
  const requisitions = getAll<{ status: string; submittedAt: string; reviewedAt?: string }>(StorageKey.REQUISITIONS);
  const referrals = getAll<{ status: string; requestedAt: string; reviewedAt?: string }>(StorageKey.REFERRALS);
  const dataRequests = getAll<{ status: string }>(StorageKey.DATA_REQUESTS);

  const pendingReq = requisitions.filter((item) => item.status === 'Pending Review').length;
  const overdueReferrals = referrals.filter((item) => item.status === 'Requested' && Date.now() - new Date(item.requestedAt).getTime() > 48 * 3600 * 1000).length;
  const openDataRequests = dataRequests.filter((item) => item.status === 'Submitted' || item.status === 'Under Review').length;

  const snapshot: KpiReportSnapshot = {
    id: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    metrics: [
      { key: 'pending_requisitions', label: 'Pending Requisitions', value: pendingReq, trend: pendingReq > 6 ? 'up' : 'flat' },
      { key: 'overdue_referrals', label: 'Overdue Referrals', value: overdueReferrals, trend: overdueReferrals > 0 ? 'up' : 'flat' },
      { key: 'open_data_requests', label: 'Open Data Requests', value: openDataRequests, trend: openDataRequests > 0 ? 'up' : 'flat' },
    ],
  };

  const all = read<KpiReportSnapshot>(KPI_SNAPSHOTS_KEY);
  all.push(snapshot);
  write(KPI_SNAPSHOTS_KEY, all);

  return snapshot;
}

export function getKpiSnapshots(): KpiReportSnapshot[] {
  return read<KpiReportSnapshot>(KPI_SNAPSHOTS_KEY)
    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
}
