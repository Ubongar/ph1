import type { TimelineEvent } from '../types/enhancements';
import type { UserRole } from '../types/types';
import { getAll, StorageKey } from './storage';

function parseDate(value?: string): number {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function resolveStudentIdFromUserId(userId: string): string | null {
  const students = getAll<{ id: string; userId: string }>(StorageKey.STUDENTS);
  return students.find((student) => student.userId === userId)?.id ?? null;
}

function filterByQuery(events: TimelineEvent[], query: string): TimelineEvent[] {
  const q = query.trim().toLowerCase();
  if (!q) return events;
  return events.filter((item) => `${item.title} ${item.details} ${item.studentName}`.toLowerCase().includes(q));
}

function buildGlobalTimeline(): TimelineEvent[] {
  const students = getAll<{ id: string }>(StorageKey.STUDENTS);
  const all: TimelineEvent[] = [];

  for (const student of students) {
    all.push(...buildStudentTimeline(student.id));
  }

  return all.sort((a, b) => parseDate(b.timestamp) - parseDate(a.timestamp));
}

export function buildStudentTimeline(studentId: string): TimelineEvent[] {
  const student = getAll<{ id: string; name: string }>(StorageKey.STUDENTS).find((s) => s.id === studentId);
  const studentName = student?.name ?? 'Unknown Student';

  const encounters = getAll<{ id: string; studentId: string; date: string; chiefComplaint: string; attendingStaffName: string }>(StorageKey.ENCOUNTERS)
    .filter((item) => item.studentId === studentId)
    .map<TimelineEvent>((item) => ({
      id: `enc-${item.id}`,
      studentId,
      studentName,
      eventType: 'encounter',
      title: 'Clinical Encounter',
      details: `${item.chiefComplaint} • attended by ${item.attendingStaffName}`,
      timestamp: item.date,
      role: 'medical_staff',
      sourceId: item.id,
    }));

  const requisitions = getAll<{ id: string; studentId: string; status: string; submittedAt: string; symptomDescription: string }>(StorageKey.REQUISITIONS)
    .filter((item) => item.studentId === studentId)
    .map<TimelineEvent>((item) => ({
      id: `req-${item.id}`,
      studentId,
      studentName,
      eventType: 'requisition',
      title: `Requisition ${item.status}`,
      details: item.symptomDescription,
      timestamp: item.submittedAt,
      role: 'student',
      sourceId: item.id,
    }));

  const referrals = getAll<{ id: string; studentId: string; status: string; requestedAt: string; specialty: string }>(StorageKey.REFERRALS)
    .filter((item) => item.studentId === studentId)
    .map<TimelineEvent>((item) => ({
      id: `ref-${item.id}`,
      studentId,
      studentName,
      eventType: 'referral',
      title: `Referral ${item.status}`,
      details: `Specialty: ${item.specialty}`,
      timestamp: item.requestedAt,
      role: 'specialist',
      sourceId: item.id,
    }));

  const diagnostics = getAll<{ id: string; studentId: string; uploadedAt: string; testName: string; status: string }>(StorageKey.RESULTS)
    .filter((item) => item.studentId === studentId)
    .map<TimelineEvent>((item) => ({
      id: `res-${item.id}`,
      studentId,
      studentName,
      eventType: 'diagnostic',
      title: `Diagnostic ${item.status}`,
      details: item.testName,
      timestamp: item.uploadedAt,
      role: 'technician',
      sourceId: item.id,
    }));

  const combined = [...encounters, ...requisitions, ...referrals, ...diagnostics];

  return combined.sort((a, b) => parseDate(b.timestamp) - parseDate(a.timestamp));
}

function buildMedicalStaffTimeline(userId: string): TimelineEvent[] {
  const students = getAll<{ id: string; name: string }>(StorageKey.STUDENTS);
  const studentNameById = new Map(students.map((student) => [student.id, student.name]));

  const encounters = getAll<{
    id: string;
    studentId: string;
    date: string;
    chiefComplaint: string;
    attendingStaffId: string;
    attendingStaffName: string;
  }>(StorageKey.ENCOUNTERS)
    .filter((item) => item.attendingStaffId === userId)
    .map<TimelineEvent>((item) => ({
      id: `enc-${item.id}`,
      studentId: item.studentId,
      studentName: studentNameById.get(item.studentId) ?? 'Unknown Student',
      eventType: 'encounter',
      title: 'Clinical Encounter',
      details: `${item.chiefComplaint} • attended by ${item.attendingStaffName}`,
      timestamp: item.date,
      role: 'medical_staff',
      sourceId: item.id,
    }));

  const requisitions = getAll<{
    id: string;
    studentId: string;
    studentName: string;
    status: string;
    symptomDescription: string;
    reviewedAt?: string;
    reviewedByStaffId?: string;
    submittedAt: string;
  }>(StorageKey.REQUISITIONS)
    .filter((item) => item.reviewedByStaffId === userId)
    .map<TimelineEvent>((item) => ({
      id: `req-review-${item.id}`,
      studentId: item.studentId,
      studentName: item.studentName,
      eventType: 'requisition',
      title: `Reviewed Requisition ${item.status}`,
      details: item.symptomDescription,
      timestamp: item.reviewedAt ?? item.submittedAt,
      role: 'medical_staff',
      sourceId: item.id,
    }));

  const referrals = getAll<{
    id: string;
    studentId: string;
    studentName: string;
    status: string;
    requestedAt: string;
    specialty: string;
    requestingStaffId: string;
  }>(StorageKey.REFERRALS)
    .filter((item) => item.requestingStaffId === userId)
    .map<TimelineEvent>((item) => ({
      id: `ref-staff-${item.id}`,
      studentId: item.studentId,
      studentName: item.studentName,
      eventType: 'referral',
      title: `Referral ${item.status}`,
      details: `Specialty: ${item.specialty}`,
      timestamp: item.requestedAt,
      role: 'medical_staff',
      sourceId: item.id,
    }));

  return [...encounters, ...requisitions, ...referrals].sort((a, b) => parseDate(b.timestamp) - parseDate(a.timestamp));
}

function buildTechnicianTimeline(userId: string): TimelineEvent[] {
  const students = getAll<{ id: string; name: string }>(StorageKey.STUDENTS);
  const studentNameById = new Map(students.map((student) => [student.id, student.name]));

  const diagnostics = getAll<{
    id: string;
    studentId: string;
    uploadedAt: string;
    testName: string;
    status: string;
    uploadedByTechnicianId: string;
  }>(StorageKey.RESULTS)
    .filter((item) => item.uploadedByTechnicianId === userId)
    .map<TimelineEvent>((item) => ({
      id: `res-tech-${item.id}`,
      studentId: item.studentId,
      studentName: studentNameById.get(item.studentId) ?? 'Unknown Student',
      eventType: 'diagnostic',
      title: `Diagnostic ${item.status}`,
      details: item.testName,
      timestamp: item.uploadedAt,
      role: 'technician',
      sourceId: item.id,
    }));

  const referrals = getAll<{
    id: string;
    studentId: string;
    studentName: string;
    status: string;
    technicianReviewedById?: string;
    technicianReviewedAt?: string;
  }>(StorageKey.REFERRALS)
    .filter((item) => item.technicianReviewedById === userId)
    .map<TimelineEvent>((item) => ({
      id: `ref-tech-${item.id}`,
      studentId: item.studentId,
      studentName: item.studentName,
      eventType: 'referral',
      title: `Referral ${item.status}`,
      details: 'Technician review update logged.',
      timestamp: item.technicianReviewedAt ?? new Date().toISOString(),
      role: 'technician',
      sourceId: item.id,
    }));

  return [...diagnostics, ...referrals].sort((a, b) => parseDate(b.timestamp) - parseDate(a.timestamp));
}

function buildPharmacyTimeline(userId: string): TimelineEvent[] {
  const requisitions = getAll<{
    id: string;
    studentId: string;
    studentName: string;
    status: string;
    reviewedAt?: string;
    dispensedAt?: string;
    dispensedByPharmacyId?: string;
  }>(StorageKey.REQUISITIONS)
    .filter((item) => item.dispensedByPharmacyId === userId)
    .map<TimelineEvent>((item) => ({
      id: `pharm-${item.id}`,
      studentId: item.studentId,
      studentName: item.studentName,
      eventType: 'dispense',
      title: `Medication ${item.status}`,
      details: 'Pharmacy fulfillment activity.',
      timestamp: item.dispensedAt ?? item.reviewedAt ?? new Date().toISOString(),
      role: 'pharmacy',
      sourceId: item.id,
    }));

  return requisitions.sort((a, b) => parseDate(b.timestamp) - parseDate(a.timestamp));
}

function buildSpecialistTimeline(userId: string): TimelineEvent[] {
  const referrals = getAll<{
    id: string;
    studentId: string;
    studentName: string;
    status: string;
    requestedAt: string;
    specialty: string;
    specialistId?: string;
  }>(StorageKey.REFERRALS)
    .filter((item) => item.specialistId === userId)
    .map<TimelineEvent>((item) => ({
      id: `ref-specialist-${item.id}`,
      studentId: item.studentId,
      studentName: item.studentName,
      eventType: 'referral',
      title: `Referral ${item.status}`,
      details: `Specialty: ${item.specialty}`,
      timestamp: item.requestedAt,
      role: 'specialist',
      sourceId: item.id,
    }));

  return referrals.sort((a, b) => parseDate(b.timestamp) - parseDate(a.timestamp));
}

function buildRoleTimeline(role: UserRole, userId: string): TimelineEvent[] {
  if (role === 'admin') return buildGlobalTimeline();
  if (role === 'student') {
    const studentId = resolveStudentIdFromUserId(userId);
    return studentId ? buildStudentTimeline(studentId) : [];
  }
  if (role === 'medical_staff') return buildMedicalStaffTimeline(userId);
  if (role === 'technician') return buildTechnicianTimeline(userId);
  if (role === 'pharmacy') return buildPharmacyTimeline(userId);
  if (role === 'specialist') return buildSpecialistTimeline(userId);
  return [];
}

export function searchTimeline(query: string): TimelineEvent[] {
  return filterByQuery(buildGlobalTimeline(), query);
}

export function searchTimelineForUser(query: string, role: UserRole, userId: string): TimelineEvent[] {
  return filterByQuery(buildRoleTimeline(role, userId), query);
}

export function getTimelineRoleCounts(): Array<{ role: TimelineEvent['role']; count: number }> {
  const events = buildGlobalTimeline();
  const map = new Map<TimelineEvent['role'], number>();

  for (const event of events) {
    map.set(event.role, (map.get(event.role) ?? 0) + 1);
  }

  return Array.from(map.entries()).map(([role, count]) => ({ role, count }));
}
