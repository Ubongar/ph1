import type { FollowUpAppointment } from '../types/enhancements';
import type { UserRole } from '../types/types';
import { getAll, StorageKey } from './storage';

const APPOINTMENTS_KEY = 'shr_follow_up_appointments';

function readAppointments(): FollowUpAppointment[] {
  try {
    const raw = localStorage.getItem(APPOINTMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FollowUpAppointment[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAppointments(list: FollowUpAppointment[]): void {
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(list.slice(-500)));
}

export function seedAppointmentsIfNeeded(): void {
  if (readAppointments().length > 0) return;

  const now = Date.now();
  const seed: FollowUpAppointment[] = [
    {
      id: crypto.randomUUID(),
      studentId: 'stu-001',
      studentName: 'Adaeze Okonkwo',
      scheduledByUserId: 'staff-001',
      scheduledByRole: 'medical_staff',
      assignedRole: 'student',
      assignedUserId: 'student-001',
      reason: 'Asthma follow-up and inhaler adherence review.',
      scheduledFor: new Date(now + 2 * 24 * 3600 * 1000).toISOString(),
      status: 'scheduled',
      notes: 'Bring previous inhaler usage notes.',
    },
    {
      id: crypto.randomUUID(),
      studentId: 'stu-002',
      studentName: 'Emeka Nwosu',
      scheduledByUserId: 'specialist-001',
      scheduledByRole: 'specialist',
      assignedRole: 'specialist',
      assignedUserId: 'specialist-001',
      reason: 'Cardiology follow-up with BP trend review.',
      scheduledFor: new Date(now + 3 * 24 * 3600 * 1000).toISOString(),
      status: 'scheduled',
      notes: 'Bring home BP readings for last 7 days.',
    },
  ];

  writeAppointments(seed);
}

function resolveStudentIdFromUserId(userId: string): string | null {
  const students = getAll<{ id: string; userId: string }>(StorageKey.STUDENTS);
  return students.find((student) => student.userId === userId)?.id ?? null;
}

export function getAppointmentsForRole(role: UserRole, userId: string): FollowUpAppointment[] {
  const list = readAppointments();

  if (role === 'admin') return list.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());

  if (role === 'student') {
    const studentId = resolveStudentIdFromUserId(userId);
    if (!studentId) return [];

    return list
      .filter((item) => item.studentId === studentId || item.assignedUserId === userId)
      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
  }

  return list
    .filter((item) => item.scheduledByUserId === userId || item.assignedUserId === userId)
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
}

export function createAppointment(input: Omit<FollowUpAppointment, 'id'>): FollowUpAppointment {
  const list = readAppointments();
  const next: FollowUpAppointment = {
    ...input,
    assignedUserId: input.assignedUserId ?? input.scheduledByUserId,
    id: crypto.randomUUID(),
  };
  list.push(next);
  writeAppointments(list);
  return next;
}

export function updateAppointmentStatus(id: string, status: FollowUpAppointment['status']): FollowUpAppointment | null {
  const list = readAppointments();
  const appt = list.find((item) => item.id === id);
  if (!appt) return null;
  appt.status = status;
  if (status === 'completed') {
    appt.reminderSentAt = appt.reminderSentAt ?? new Date().toISOString();
  }
  writeAppointments(list);
  return appt;
}
