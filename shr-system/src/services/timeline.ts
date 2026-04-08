import type { TimelineEvent } from '../types/enhancements';
import { getAll, StorageKey } from './storage';

function parseDate(value?: string): number {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
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

export function searchTimeline(query: string): TimelineEvent[] {
  const students = getAll<{ id: string }>(StorageKey.STUDENTS);
  const all: TimelineEvent[] = [];

  for (const student of students) {
    all.push(...buildStudentTimeline(student.id));
  }

  const q = query.trim().toLowerCase();
  if (!q) return all;

  return all.filter((item) => `${item.title} ${item.details} ${item.studentName}`.toLowerCase().includes(q));
}

export function getTimelineRoleCounts(): Array<{ role: TimelineEvent['role']; count: number }> {
  const events = searchTimeline('');
  const map = new Map<TimelineEvent['role'], number>();

  for (const event of events) {
    map.set(event.role, (map.get(event.role) ?? 0) + 1);
  }

  return Array.from(map.entries()).map(([role, count]) => ({ role, count }));
}
