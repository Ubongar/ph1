import type { Complaint, ComplaintSeverity, ComplaintStatus, SystemAlert, UserRole } from '../types/types';

export const COMPLAINT_DEPARTMENTS = [
  'Medical Staff',
  'Pharmacy',
  'Laboratory / Technician',
  'Specialist',
  'IT / Technical Support',
  'Administration',
] as const;

export const COMPLAINT_SEVERITIES: ComplaintSeverity[] = ['Low', 'Moderate', 'High', 'Critical'];
export const PHARMACY_COMPLAINT_SLA_HOURS = 24;

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

function isComplaintTerminal(status: ComplaintStatus): boolean {
  return status === 'Resolved' || status === 'Closed';
}

function isPharmacyComplaint(complaint: Complaint): boolean {
  const concernedDepartment = complaint.concernedDepartment.trim().toLowerCase();
  const forwardedDepartment = complaint.forwardedToDepartment?.trim().toLowerCase() ?? '';

  return concernedDepartment.includes('pharmacy') || forwardedDepartment.includes('pharmacy');
}

export function getComplaintSlaHours(complaint: Complaint): number | null {
  if (isPharmacyComplaint(complaint)) return PHARMACY_COMPLAINT_SLA_HOURS;
  return null;
}

export function hasComplaintBreachedSla(complaint: Complaint, now: Date = new Date()): boolean {
  if (isComplaintTerminal(complaint.status)) return false;
  if (complaint.slaEscalatedAt) return false;

  const slaHours = getComplaintSlaHours(complaint);
  if (!slaHours) return false;

  const updatedAtMs = new Date(complaint.updatedAt).getTime();
  if (Number.isNaN(updatedAtMs)) return false;

  const elapsedMs = now.getTime() - updatedAtMs;
  return elapsedMs >= slaHours * 60 * 60 * 1000;
}
