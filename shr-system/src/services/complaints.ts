import type { Complaint, ComplaintSeverity, SystemAlert, UserRole } from '../types/types';

export const COMPLAINT_DEPARTMENTS = [
  'Medical Staff',
  'Pharmacy',
  'Laboratory / Technician',
  'Specialist',
  'IT / Technical Support',
  'Administration',
] as const;

export const COMPLAINT_SEVERITIES: ComplaintSeverity[] = ['Low', 'Moderate', 'High', 'Critical'];

export function buildComplaintTicketId(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `CMP-${datePart}-${randomPart}`;
}

export function shouldTriggerAdminAlert(severity: ComplaintSeverity): boolean {
  return severity === 'High' || severity === 'Critical';
}

export function complaintSeverityToAlertType(severity: ComplaintSeverity): SystemAlert['type'] {
  return severity === 'Critical' ? 'Critical' : 'Warning';
}

export function inferForwardRoleFromDepartment(department: string): UserRole | undefined {
  const normalized = department.trim().toLowerCase();

  if (normalized.includes('medical')) return 'medical_staff';
  if (normalized.includes('pharmacy')) return 'pharmacy';
  if (normalized.includes('laboratory') || normalized.includes('technician') || normalized.includes('lab')) {
    return 'technician';
  }
  if (normalized.includes('specialist')) return 'specialist';

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
