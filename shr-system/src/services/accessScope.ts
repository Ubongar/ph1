import { getAll, getStudentByUserId, StorageKey } from './storage';
import type {
  Complaint,
  DiagnosticResult,
  Encounter,
  MedicationRequisition,
  Referral,
  Student,
  SystemUser,
  UserRole,
} from '../types/types';

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getActiveRoleUsers(role: UserRole): SystemUser[] {
  return getAll<SystemUser>(StorageKey.USERS)
    .filter((user) => user.isActive && user.role === role)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function getDeterministicAssigneeId(role: UserRole, entityId: string): string | null {
  const assignees = getActiveRoleUsers(role);
  if (assignees.length === 0) return null;
  const index = hashString(entityId) % assignees.length;
  return assignees[index]?.id ?? null;
}

function getStudentIdForUser(userId: string): string | null {
  return getStudentByUserId(userId)?.id ?? null;
}

export function getScopedReferralsForUser(role: UserRole, userId: string): Referral[] {
  const referrals = getAll<Referral>(StorageKey.REFERRALS);

  switch (role) {
    case 'admin':
      return referrals;
    case 'student': {
      const studentId = getStudentIdForUser(userId);
      if (!studentId) return [];
      return referrals.filter((referral) => referral.studentId === studentId);
    }
    case 'medical_staff':
      return referrals.filter((referral) => referral.requestingStaffId === userId);
    case 'technician':
      return referrals.filter((referral) => {
        if (referral.technicianReviewedById === userId) return true;
        const assignedId = getDeterministicAssigneeId('technician', referral.id);
        return assignedId === userId;
      });
    case 'specialist':
      return referrals.filter((referral) => referral.specialistId === userId);
    case 'pharmacy':
      return [];
    default:
      return [];
  }
}

export function getScopedComplaintsForUser(role: UserRole, userId: string): Complaint[] {
  const complaints = getAll<Complaint>(StorageKey.COMPLAINTS)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  if (role === 'admin') return complaints;

  return complaints.filter((complaint) => {
    if (complaint.submittedByUserId === userId) return true;
    if (complaint.forwardedToUserId) return complaint.forwardedToUserId === userId;

    const queuedForRole = complaint.forwardedToRole === role;
    if (!queuedForRole) return false;

    const deterministicAssigneeId = getDeterministicAssigneeId(role, complaint.id);
    return deterministicAssigneeId === userId;
  });
}

export function getScopedRequisitionsForUser(role: UserRole, userId: string): MedicationRequisition[] {
  const requisitions = getAll<MedicationRequisition>(StorageKey.REQUISITIONS);

  switch (role) {
    case 'admin':
      return requisitions;
    case 'student': {
      const studentId = getStudentIdForUser(userId);
      if (!studentId) return [];
      return requisitions.filter((req) => req.studentId === studentId);
    }
    case 'medical_staff':
      return requisitions.filter((req) => {
        if (req.reviewedByStaffId === userId) return true;
        if (req.status !== 'Pending Review') return false;
        const assignedId = getDeterministicAssigneeId('medical_staff', req.id);
        return assignedId === userId;
      });
    case 'pharmacy':
      return requisitions.filter((req) => {
        if (req.status !== 'Approved' && req.status !== 'Ready for Pickup' && req.status !== 'Dispensed') {
          return false;
        }
        const assignedId = getDeterministicAssigneeId('pharmacy', req.id);
        return assignedId === userId;
      });
    case 'specialist': {
      const referralStudentIds = new Set(
        getScopedReferralsForUser(role, userId).map((referral) => referral.studentId),
      );
      return requisitions.filter((req) => referralStudentIds.has(req.studentId));
    }
    case 'technician': {
      const referralStudentIds = new Set(
        getScopedReferralsForUser(role, userId).map((referral) => referral.studentId),
      );
      return requisitions.filter((req) => referralStudentIds.has(req.studentId));
    }
    default:
      return [];
  }
}

export function getScopedEncountersForUser(role: UserRole, userId: string): Encounter[] {
  const encounters = getAll<Encounter>(StorageKey.ENCOUNTERS);

  switch (role) {
    case 'admin':
      return encounters;
    case 'student': {
      const studentId = getStudentIdForUser(userId);
      if (!studentId) return [];
      return encounters.filter((encounter) => encounter.studentId === studentId);
    }
    case 'medical_staff':
      return encounters.filter((encounter) => encounter.attendingStaffId === userId);
    case 'specialist': {
      const referralStudentIds = new Set(
        getScopedReferralsForUser(role, userId).map((referral) => referral.studentId),
      );
      return encounters.filter((encounter) => referralStudentIds.has(encounter.studentId));
    }
    default:
      return [];
  }
}

export function getScopedResultsForUser(role: UserRole, userId: string): DiagnosticResult[] {
  const results = getAll<DiagnosticResult>(StorageKey.RESULTS);

  switch (role) {
    case 'admin':
      return results;
    case 'student': {
      const studentId = getStudentIdForUser(userId);
      if (!studentId) return [];
      return results.filter((result) => result.studentId === studentId);
    }
    case 'medical_staff':
      return results.filter((result) => result.requestingStaffId === userId);
    case 'technician':
      return results.filter((result) => result.uploadedByTechnicianId === userId);
    case 'specialist': {
      const referralStudentIds = new Set(
        getScopedReferralsForUser(role, userId).map((referral) => referral.studentId),
      );
      return results.filter((result) => referralStudentIds.has(result.studentId));
    }
    case 'pharmacy': {
      const requisitionStudentIds = new Set(
        getScopedRequisitionsForUser(role, userId).map((req) => req.studentId),
      );
      return results.filter((result) => requisitionStudentIds.has(result.studentId));
    }
    default:
      return [];
  }
}

export function getScopedStudentsForUser(role: UserRole, userId: string): Student[] {
  const students = getAll<Student>(StorageKey.STUDENTS);

  if (role === 'admin') return students;

  if (role === 'student') {
    const student = getStudentByUserId(userId);
    return student ? [student] : [];
  }

  const visibleStudentIds = new Set<string>();

  if (role === 'medical_staff') {
    getScopedEncountersForUser(role, userId).forEach((encounter) => visibleStudentIds.add(encounter.studentId));
    getScopedRequisitionsForUser(role, userId).forEach((req) => visibleStudentIds.add(req.studentId));
    getScopedReferralsForUser(role, userId).forEach((referral) => visibleStudentIds.add(referral.studentId));
    getScopedResultsForUser(role, userId).forEach((result) => visibleStudentIds.add(result.studentId));
  }

  if (role === 'technician') {
    getScopedReferralsForUser(role, userId).forEach((referral) => visibleStudentIds.add(referral.studentId));
    getScopedResultsForUser(role, userId).forEach((result) => visibleStudentIds.add(result.studentId));
  }

  if (role === 'pharmacy') {
    getScopedRequisitionsForUser(role, userId).forEach((req) => visibleStudentIds.add(req.studentId));
  }

  if (role === 'specialist') {
    getScopedReferralsForUser(role, userId).forEach((referral) => visibleStudentIds.add(referral.studentId));
  }

  return students.filter((student) => visibleStudentIds.has(student.id));
}

export function canAccessStudentForUser(role: UserRole, userId: string, studentId: string): boolean {
  if (role === 'admin') {
    return getAll<Student>(StorageKey.STUDENTS).some((student) => student.id === studentId);
  }

  return getScopedStudentsForUser(role, userId).some((student) => student.id === studentId);
}
