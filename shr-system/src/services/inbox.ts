import type { RoleInboxTask, SlaStatus } from '../types/enhancements';
import type { UserRole } from '../types/types';
import { getAll, StorageKey } from './storage';

const INBOX_KEY = 'shr_role_inbox_tasks';
const SLA_CONFIG_HOURS: Record<UserRole, { dueSoon: number; overdue: number }> = {
  student: { dueSoon: 24, overdue: 48 },
  medical_staff: { dueSoon: 4, overdue: 12 },
  technician: { dueSoon: 3, overdue: 8 },
  pharmacy: { dueSoon: 2, overdue: 6 },
  specialist: { dueSoon: 8, overdue: 24 },
  admin: { dueSoon: 24, overdue: 72 },
};

function readInbox(): RoleInboxTask[] {
  try {
    const raw = localStorage.getItem(INBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RoleInboxTask[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeInbox(tasks: RoleInboxTask[]): void {
  localStorage.setItem(INBOX_KEY, JSON.stringify(tasks.slice(-1000)));
}

function computeSlaStatus(dueAt: string, role: UserRole): SlaStatus {
  const dueMs = new Date(dueAt).getTime();
  const now = Date.now();
  const hoursLeft = (dueMs - now) / 1000 / 3600;
  const cfg = SLA_CONFIG_HOURS[role];

  if (hoursLeft <= 0) return 'overdue';
  if (hoursLeft <= cfg.dueSoon) return 'due-soon';
  return 'on-track';
}

export function seedRoleInboxIfNeeded(): void {
  if (readInbox().length > 0) return;

  const now = Date.now();
  const plusHours = (h: number) => new Date(now + h * 3600 * 1000).toISOString();

  const initial: RoleInboxTask[] = [
    {
      id: crypto.randomUUID(),
      role: 'medical_staff',
      title: 'Review Urgent Requisition',
      description: 'Urgent symptom request requires triage and medication decision.',
      priority: 'urgent',
      status: 'open',
      sourceType: 'requisition',
      sourceId: 'req-001',
      createdAt: new Date(now - 2 * 3600 * 1000).toISOString(),
      dueAt: plusHours(2),
      slaStatus: 'due-soon',
      escalationPath: 'Escalate to on-call physician and admin after SLA breach.',
    },
    {
      id: crypto.randomUUID(),
      role: 'specialist',
      title: 'Accept or Decline Cardiology Referral',
      description: 'Referral pending specialist decision with urgency marker.',
      priority: 'high',
      status: 'open',
      sourceType: 'referral',
      sourceId: 'ref-001',
      createdAt: new Date(now - 5 * 3600 * 1000).toISOString(),
      dueAt: plusHours(6),
      slaStatus: 'due-soon',
      escalationPath: 'Escalate to department lead after 24h unresolved.',
    },
    {
      id: crypto.randomUUID(),
      role: 'pharmacy',
      title: 'Dispense Approved Medication',
      description: 'Approved item ready for fulfillment with allergy check required.',
      priority: 'high',
      status: 'open',
      sourceType: 'requisition',
      sourceId: 'req-004',
      createdAt: new Date(now - 1 * 3600 * 1000).toISOString(),
      dueAt: plusHours(2),
      slaStatus: 'due-soon',
      escalationPath: 'Escalate to medical staff if stock block persists.',
    },
    {
      id: crypto.randomUUID(),
      role: 'technician',
      title: 'Upload Flagged Diagnostic Result',
      description: 'Critical lab result pending upload and clinician notification.',
      priority: 'urgent',
      status: 'open',
      sourceType: 'result',
      sourceId: 'res-001',
      createdAt: new Date(now - 30 * 60 * 1000).toISOString(),
      dueAt: plusHours(1),
      slaStatus: 'due-soon',
      escalationPath: 'Escalate immediately to clinician and admin when overdue.',
    },
    {
      id: crypto.randomUUID(),
      role: 'admin',
      title: 'Review Data Rights Ticket',
      description: 'A pending legal data request requires governance decision.',
      priority: 'normal',
      status: 'open',
      sourceType: 'data-request',
      sourceId: 'dr-002',
      createdAt: new Date(now - 24 * 3600 * 1000).toISOString(),
      dueAt: plusHours(24),
      slaStatus: 'on-track',
      escalationPath: 'Escalate to compliance lead if overdue by 72h.',
    },
    {
      id: crypto.randomUUID(),
      role: 'student',
      title: 'Complete Follow-Up Appointment',
      description: 'Follow-up visit recommended after recent encounter.',
      priority: 'normal',
      status: 'open',
      sourceType: 'custom',
      sourceId: 'appt-001',
      createdAt: new Date(now - 3 * 3600 * 1000).toISOString(),
      dueAt: plusHours(36),
      slaStatus: 'on-track',
      escalationPath: 'Escalate to clinic if symptoms worsen before appointment.',
    },
  ];

  writeInbox(initial);
}

export function getRoleInbox(role: UserRole): RoleInboxTask[] {
  const list = readInbox()
    .filter((item) => item.role === role)
    .map((item) => ({
      ...item,
      slaStatus: computeSlaStatus(item.dueAt, item.role),
    }))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

  writeInbox([...readInbox().filter((item) => item.role !== role), ...list]);
  return list;
}

export function updateInboxTaskStatus(taskId: string, status: RoleInboxTask['status']): RoleInboxTask | null {
  const list = readInbox();
  const task = list.find((item) => item.id === taskId);
  if (!task) return null;
  task.status = status;
  task.slaStatus = computeSlaStatus(task.dueAt, task.role);
  writeInbox(list);
  return task;
}

export function pushTask(task: Omit<RoleInboxTask, 'id' | 'createdAt' | 'slaStatus'>): RoleInboxTask {
  const list = readInbox();
  const next: RoleInboxTask = {
    ...task,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    slaStatus: computeSlaStatus(task.dueAt, task.role),
  };
  list.push(next);
  writeInbox(list);
  return next;
}

export function deriveInboxFromData(): void {
  const requisitions = getAll<{ id: string; status: string; priority: 'Normal' | 'Urgent' }>(StorageKey.REQUISITIONS);
  const pendingUrgent = requisitions.filter((item) => item.status === 'Pending Review' && item.priority === 'Urgent');

  if (pendingUrgent.length === 0) return;

  const existing = readInbox();
  const hasAggregate = existing.some((item) => item.sourceType === 'custom' && item.sourceId === 'derived-urgent-staff');
  if (hasAggregate) return;

  pushTask({
    role: 'medical_staff',
    title: 'Urgent Queue Aggregate Alert',
    description: `${pendingUrgent.length} urgent requisition(s) require immediate review.`,
    priority: 'urgent',
    status: 'open',
    sourceType: 'custom',
    sourceId: 'derived-urgent-staff',
    dueAt: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    escalationPath: 'Escalate to admin if unresolved after 2 hours.',
  });
}
