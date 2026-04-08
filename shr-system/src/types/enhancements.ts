import type { UserRole } from './types';

export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  createdAt: string;
  roleTargets: UserRole[];
  userTargetIds?: string[];
  isReadBy: string[];
  actionPath?: string;
}

export type SlaStatus = 'on-track' | 'due-soon' | 'overdue';

export interface RoleInboxTask {
  id: string;
  role: UserRole;
  title: string;
  description: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'blocked' | 'done';
  sourceType: 'requisition' | 'referral' | 'result' | 'data-request' | 'policy' | 'custom';
  sourceId: string;
  createdAt: string;
  dueAt: string;
  slaStatus: SlaStatus;
  escalationPath: string;
  ownerUserId?: string;
}

export interface FollowUpAppointment {
  id: string;
  studentId: string;
  studentName: string;
  scheduledByUserId: string;
  scheduledByRole: UserRole;
  assignedRole: UserRole;
  assignedUserId?: string;
  reason: string;
  scheduledFor: string;
  status: 'scheduled' | 'completed' | 'missed' | 'cancelled';
  reminderSentAt?: string;
  notes?: string;
}

export interface TimelineEvent {
  id: string;
  studentId: string;
  studentName: string;
  eventType:
    | 'encounter'
    | 'requisition'
    | 'referral'
    | 'diagnostic'
    | 'dispense'
    | 'policy'
    | 'data-request';
  title: string;
  details: string;
  timestamp: string;
  role: UserRole;
  sourceId: string;
}

export interface DataQualityIssue {
  id: string;
  ruleId: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  entityType: string;
  entityId: string;
  detectedAt: string;
  suggestedAction: string;
}

export interface SecurityEvent {
  id: string;
  category: 'auth' | 'authorization' | 'session' | 'privacy' | 'admin';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  userId?: string;
  role?: UserRole;
  route?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type PermissionKey =
  | 'inbox.view'
  | 'notifications.view'
  | 'appointments.manage'
  | 'timeline.view'
  | 'clinical-safety.run'
  | 'reconciliation.resolve'
  | 'quality.view'
  | 'reports.export'
  | 'security.manage'
  | 'permissions.manage'
  | 'observability.view';

export interface PermissionOverride {
  role: UserRole;
  allow: PermissionKey[];
  deny: PermissionKey[];
  updatedAt: string;
}

export interface TelemetryEvent {
  id: string;
  name: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  role?: UserRole;
  userId?: string;
  route?: string;
  context?: Record<string, unknown>;
  createdAt: string;
}

export interface KpiReportSnapshot {
  id: string;
  generatedAt: string;
  metrics: Array<{
    key: string;
    label: string;
    value: number;
    trend: 'up' | 'down' | 'flat';
  }>;
}
