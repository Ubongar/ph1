import type { AppNotification } from '../types/enhancements';
import type { UserRole } from '../types/types';
import { getAll, StorageKey } from './storage';

const NOTIFICATIONS_KEY = 'shr_notifications';

function readNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AppNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeNotifications(list: AppNotification[]): void {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list.slice(-300)));
}

export function seedNotificationCenterIfNeeded(): void {
  if (readNotifications().length > 0) return;

  const now = new Date().toISOString();

  const initial: AppNotification[] = [
    {
      id: crypto.randomUUID(),
      title: 'Urgent Referral Waiting',
      message: 'A specialist referral is marked urgent and requires review.',
      severity: 'critical',
      createdAt: now,
      roleTargets: ['specialist', 'medical_staff', 'admin'],
      isReadBy: [],
      actionPath: '/specialist/referrals',
    },
    {
      id: crypto.randomUUID(),
      title: 'Pending Data Request Review',
      message: 'A legal data request requires administrator decision.',
      severity: 'warning',
      createdAt: now,
      roleTargets: ['admin'],
      isReadBy: [],
      actionPath: '/admin/data-requests',
    },
    {
      id: crypto.randomUUID(),
      title: 'Policy Version Update Published',
      message: 'Policy acceptance is required for all users on next sign-in.',
      severity: 'info',
      createdAt: now,
      roleTargets: ['student', 'medical_staff', 'technician', 'pharmacy', 'specialist', 'admin'],
      isReadBy: [],
      actionPath: '/legal/policy-updates',
    },
  ];

  writeNotifications(initial);
}

export function getNotificationsForRole(role: UserRole): AppNotification[] {
  return readNotifications()
    .filter((item) => item.roleTargets.includes(role))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function markNotificationRead(notificationId: string, userId: string): void {
  const list = readNotifications();
  const item = list.find((entry) => entry.id === notificationId);
  if (!item) return;
  if (!item.isReadBy.includes(userId)) {
    item.isReadBy.push(userId);
    writeNotifications(list);
  }
}

export function markAllNotificationsRead(role: UserRole, userId: string): void {
  const list = readNotifications();
  let changed = false;

  for (const item of list) {
    if (!item.roleTargets.includes(role)) continue;
    if (!item.isReadBy.includes(userId)) {
      item.isReadBy.push(userId);
      changed = true;
    }
  }

  if (changed) writeNotifications(list);
}

export function pushNotification(input: Omit<AppNotification, 'id' | 'createdAt' | 'isReadBy'>): AppNotification {
  const list = readNotifications();
  const next: AppNotification = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    isReadBy: [],
  };
  list.push(next);
  writeNotifications(list);
  return next;
}

export function pushEscalationNotification(role: UserRole, title: string, message: string, actionPath?: string): void {
  pushNotification({
    title,
    message,
    severity: 'critical',
    roleTargets: [role, 'admin'],
    actionPath,
  });
}

export function deriveQueueNotifications(): void {
  const requisitions = getAll<{ id: string; priority: 'Normal' | 'Urgent'; status: string }>(StorageKey.REQUISITIONS);
  const urgentPending = requisitions.filter((item) => item.priority === 'Urgent' && item.status === 'Pending Review');

  if (urgentPending.length === 0) return;

  pushNotification({
    title: 'Urgent Review Queue',
    message: `${urgentPending.length} urgent requisition(s) are pending review.`,
    severity: 'warning',
    roleTargets: ['medical_staff', 'admin'],
    actionPath: '/staff/review-queue',
  });
}
