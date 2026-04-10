import type {
  Complaint,
  ComplaintEscalationRoute,
  ComplaintOwnershipStatus,
  ComplaintSeverity,
  ComplaintStatus,
  ComplaintTimelineEvent,
  SystemAlert,
  UserRole,
} from '../types/types';

export const COMPLAINT_DEPARTMENTS = [
  'Medical Staff',
  'Pharmacy',
  'Laboratory / Technician',
  'Specialist',
  'Information Technology / Technical Support',
  'Administration',
] as const;

export const COMPLAINT_SEVERITIES: ComplaintSeverity[] = ['Low', 'Moderate', 'High', 'Critical'];

type ComplaintDepartmentKey = 'medical_staff' | 'pharmacy' | 'technician' | 'specialist' | 'it_support' | 'administration';

const COMPLAINT_DEPARTMENT_LABELS: Record<ComplaintDepartmentKey, string> = {
  medical_staff: 'Medical Staff',
  pharmacy: 'Pharmacy',
  technician: 'Laboratory / Technician',
  specialist: 'Specialist',
  it_support: 'Information Technology / Technical Support',
  administration: 'Administration',
};

export interface ComplaintSlaMatrixRow {
  department: string;
  slaHours: Record<ComplaintSeverity, number>;
}

export interface ComplaintResponseTemplate {
  key: string;
  title: string;
  departmentKey: ComplaintDepartmentKey | 'general';
  body: string;
  knowledgeHint: string;
}

const SLA_MATRIX_HOURS: Record<ComplaintDepartmentKey, Record<ComplaintSeverity, number>> = {
  medical_staff: { Low: 48, Moderate: 24, High: 8, Critical: 2 },
  pharmacy: { Low: 24, Moderate: 12, High: 6, Critical: 1 },
  technician: { Low: 36, Moderate: 18, High: 8, Critical: 2 },
  specialist: { Low: 48, Moderate: 24, High: 8, Critical: 2 },
  it_support: { Low: 48, Moderate: 24, High: 12, Critical: 2 },
  administration: { Low: 72, Moderate: 36, High: 12, Critical: 4 },
};

const ESCALATION_STEP_HOURS = {
  toAdminLead: 4,
  toEmergency: 2,
} as const;

export const OWNERSHIP_ACK_WINDOW_HOURS = 2;

export function getComplaintSlaMatrixRows(): ComplaintSlaMatrixRow[] {
  return (Object.keys(SLA_MATRIX_HOURS) as ComplaintDepartmentKey[]).map((departmentKey) => ({
    department: COMPLAINT_DEPARTMENT_LABELS[departmentKey],
    slaHours: SLA_MATRIX_HOURS[departmentKey],
  }));
}

export function getEscalationLadderConfig(): {
  ownershipAckWindowHours: number;
  toAdminLeadHours: number;
  toEmergencyHours: number;
} {
  return {
    ownershipAckWindowHours: OWNERSHIP_ACK_WINDOW_HOURS,
    toAdminLeadHours: ESCALATION_STEP_HOURS.toAdminLead,
    toEmergencyHours: ESCALATION_STEP_HOURS.toEmergency,
  };
}

export const COMPLAINT_RESPONSE_TEMPLATES: ComplaintResponseTemplate[] = [
  {
    key: 'medical-triage',
    title: 'Medical Triage Delay',
    departmentKey: 'medical_staff',
    body: 'We have escalated your case to the duty clinician for immediate triage review. You will receive a status update shortly.',
    knowledgeHint: 'Confirm triage queue position, duty roster, and any pending vitals or encounter blockers.',
  },
  {
    key: 'pharmacy-dispense-delay',
    title: 'Pharmacy Dispense Delay',
    departmentKey: 'pharmacy',
    body: 'Your medication request has been escalated to the pharmacy lead. We are actively resolving stock and dispensing updates.',
    knowledgeHint: 'Check stock reconciliation, approved requisition state, and pickup readiness timestamp.',
  },
  {
    key: 'technical-outage',
    title: 'Technical Outage Resolution',
    departmentKey: 'it_support',
    body: 'Our technical team has acknowledged the outage and is applying a fix. We will keep you informed until full restoration.',
    knowledgeHint: 'Review uptime logs, client console errors, service-worker state, and integration health checks.',
  },
  {
    key: 'policy-clarification',
    title: 'Policy Clarification',
    departmentKey: 'administration',
    body: 'Thank you for your report. We have reviewed the policy context and provided clarifications with corrective next steps.',
    knowledgeHint: 'Validate policy version, legal notes, and prior governance decisions before final response.',
  },
  {
    key: 'general-follow-up',
    title: 'General Follow-up',
    departmentKey: 'general',
    body: 'Your complaint is under active review. We have escalated it to the relevant team and will share updates promptly.',
    knowledgeHint: 'Summarize current status, owner, ETA, and any immediate safety mitigation.',
  },
];

export const PHARMACY_COMPLAINT_SLA_HOURS = SLA_MATRIX_HOURS.pharmacy.High;

export function buildComplaintTicketId(): string {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `CMP-${datePart}-${randomPart}`;
}

export function shouldTriggerAdminAlert(severity: ComplaintSeverity): boolean {
  return severity === 'High' || severity === 'Critical';
}

export function complaintSeverityToAlertType(severity: ComplaintSeverity): SystemAlert['type'] {
  return severity === 'Critical' ? 'Critical' : 'Warning';
}

export function getComplaintDepartmentKey(department: string): ComplaintDepartmentKey {
  const normalized = department.trim().toLowerCase();

  if (normalized.includes('medical')) return 'medical_staff';
  if (normalized.includes('pharmacy')) return 'pharmacy';
  if (normalized.includes('laboratory') || normalized.includes('technician') || normalized.includes('lab')) return 'technician';
  if (normalized.includes('specialist')) return 'specialist';
  if (/\bit\b/.test(normalized) || normalized.includes('technical')) return 'it_support';

  return 'administration';
}

export function inferForwardRoleFromDepartment(department: string): UserRole | undefined {
  const key = getComplaintDepartmentKey(department);

  if (key === 'medical_staff') return 'medical_staff';
  if (key === 'pharmacy') return 'pharmacy';
  if (key === 'technician') return 'technician';
  if (key === 'specialist') return 'specialist';

  return undefined;
}

export function isComplaintAssignedToUserOrRoleQueue(
  complaint: Complaint,
  role: UserRole,
  userId: string,
): boolean {
  if (complaint.forwardedToUserId) {
    return complaint.forwardedToUserId === userId;
  }

  return Boolean(complaint.forwardedToRole && complaint.forwardedToRole === role);
}

function isComplaintTerminal(status: ComplaintStatus): boolean {
  return status === 'Resolved' || status === 'Closed';
}

function isPharmacyComplaint(complaint: Complaint): boolean {
  const concernedDepartment = complaint.concernedDepartment.trim().toLowerCase();
  const forwardedDepartment = complaint.forwardedToDepartment?.trim().toLowerCase() ?? '';

  return concernedDepartment.includes('pharmacy') || forwardedDepartment.includes('pharmacy');
}

export function getComplaintSlaHours(complaint: Complaint): number | null {
  const key = getComplaintDepartmentKey(complaint.forwardedToDepartment ?? complaint.concernedDepartment);
  return SLA_MATRIX_HOURS[key][complaint.severity];
}

export function hasComplaintBreachedSla(complaint: Complaint, now: Date = new Date()): boolean {
  if (isComplaintTerminal(complaint.status)) return false;

  const slaHours = getComplaintSlaHours(complaint);
  if (!slaHours) return false;

  const updatedAtMs = new Date(complaint.updatedAt).getTime();
  if (Number.isNaN(updatedAtMs)) return false;

  const elapsedMs = now.getTime() - updatedAtMs;
  return elapsedMs >= slaHours * 60 * 60 * 1000;
}

export function getOwnershipStatus(complaint: Complaint): ComplaintOwnershipStatus {
  return complaint.ownershipStatus ?? 'Unassigned';
}

export function buildOwnershipDueAt(now: Date = new Date()): string {
  return new Date(now.getTime() + OWNERSHIP_ACK_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
}

export function hasOwnershipTimedOut(complaint: Complaint, now: Date = new Date()): boolean {
  const status = getOwnershipStatus(complaint);
  if (status !== 'Pending Acknowledgement') return false;
  if (!complaint.ownershipDueAt || complaint.acknowledgedAt) return false;

  const dueMs = new Date(complaint.ownershipDueAt).getTime();
  if (Number.isNaN(dueMs)) return false;
  return now.getTime() >= dueMs;
}

export interface ComplaintEscalationDecision {
  shouldEscalate: boolean;
  nextLevel: 0 | 1 | 2 | 3;
  route?: ComplaintEscalationRoute;
  reason?: string;
}

export function evaluateComplaintEscalation(
  complaint: Complaint,
  now: Date = new Date(),
): ComplaintEscalationDecision {
  if (isComplaintTerminal(complaint.status)) return { shouldEscalate: false, nextLevel: complaint.escalationLevel ?? 0 };

  const level = complaint.escalationLevel ?? 0;

  if (level === 0 && hasComplaintBreachedSla(complaint, now)) {
    return {
      shouldEscalate: true,
      nextLevel: 1,
      route: 'department-lead',
      reason: 'Service Level Agreement breached without sufficient update.',
    };
  }

  const lastEscalationAt = complaint.lastEscalationAt ?? complaint.slaEscalatedAt;
  const lastEscalationMs = lastEscalationAt ? new Date(lastEscalationAt).getTime() : Number.NaN;
  if (Number.isNaN(lastEscalationMs)) return { shouldEscalate: false, nextLevel: level };

  const elapsedSinceEscalationHours = (now.getTime() - lastEscalationMs) / (60 * 60 * 1000);

  if (level === 1 && elapsedSinceEscalationHours >= ESCALATION_STEP_HOURS.toAdminLead) {
    return {
      shouldEscalate: true,
      nextLevel: 2,
      route: 'admin-lead',
      reason: 'No action after department lead escalation.',
    };
  }

  if (
    level === 2
    && (complaint.isLifeThreatening || complaint.severity === 'Critical')
    && elapsedSinceEscalationHours >= ESCALATION_STEP_HOURS.toEmergency
  ) {
    return {
      shouldEscalate: true,
      nextLevel: 3,
      route: 'emergency',
      reason: 'Critical issue remains unresolved after admin lead escalation.',
    };
  }

  return { shouldEscalate: false, nextLevel: level };
}

export function getEscalationStepDueAt(level: 0 | 1 | 2 | 3, now: Date = new Date()): string | undefined {
  if (level === 1) {
    return new Date(now.getTime() + ESCALATION_STEP_HOURS.toAdminLead * 60 * 60 * 1000).toISOString();
  }
  if (level === 2) {
    return new Date(now.getTime() + ESCALATION_STEP_HOURS.toEmergency * 60 * 60 * 1000).toISOString();
  }
  return undefined;
}

export function shouldTriggerCriticalIncident(complaint: Complaint): boolean {
  if (complaint.isLifeThreatening) return true;

  const isClinicalDepartment = isPharmacyComplaint(complaint)
    || getComplaintDepartmentKey(complaint.concernedDepartment) === 'medical_staff';

  return isClinicalDepartment && complaint.severity === 'Critical';
}

export function createTimelineEvent(
  actorUserId: string,
  actorName: string,
  actorRole: UserRole | 'system',
  eventType: ComplaintTimelineEvent['eventType'],
  note: string,
  metadata?: string,
): ComplaintTimelineEvent {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    actorUserId,
    actorName,
    actorRole,
    eventType,
    note,
    metadata,
  };
}

export function getRecommendedResponseTemplates(complaint: Complaint): ComplaintResponseTemplate[] {
  const departmentKey = getComplaintDepartmentKey(complaint.forwardedToDepartment ?? complaint.concernedDepartment);
  const departmentTemplates = COMPLAINT_RESPONSE_TEMPLATES.filter((template) => (
    template.departmentKey === departmentKey
  ));

  const generalTemplate = COMPLAINT_RESPONSE_TEMPLATES.find((template) => template.departmentKey === 'general');
  return generalTemplate ? [...departmentTemplates, generalTemplate] : departmentTemplates;
}
