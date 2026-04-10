import type { DataQualityIssue } from '../types/enhancements';
import type { MedicationRequisition, Referral, Student } from '../types/types';
import { getAll, StorageKey } from './storage';

function issue(
  ruleId: string,
  severity: DataQualityIssue['severity'],
  title: string,
  description: string,
  entityType: string,
  entityId: string,
  suggestedAction: string,
): DataQualityIssue {
  return {
    id: crypto.randomUUID(),
    ruleId,
    severity,
    title,
    description,
    entityType,
    entityId,
    detectedAt: new Date().toISOString(),
    suggestedAction,
  };
}

export function runDataQualityScan(): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];

  const students = getAll<Student>(StorageKey.STUDENTS);
  const requisitions = getAll<MedicationRequisition>(StorageKey.REQUISITIONS);
  const referrals = getAll<Referral>(StorageKey.REFERRALS);

  for (const student of students) {
    if (!student.emergencyContact?.phoneNumber) {
      issues.push(
        issue(
          'student-emergency-contact',
          'high',
          'Missing emergency contact phone',
          `${student.name} has no emergency contact phone number on record.`,
          'Student',
          student.id,
          'Update emergency contact details in profile.',
        ),
      );
    }

    if (student.allergies.length === 0) {
      issues.push(
        issue(
          'student-allergy-empty',
          'low',
          'No allergy data recorded',
          `${student.name} has no recorded allergies or no known allergy marker.`,
          'Student',
          student.id,
          'Confirm and document NKDA or specific allergy history.',
        ),
      );
    }
  }

  const seenReq = new Set<string>();
  for (const req of requisitions) {
    const dedupeKey = `${req.studentId}|${req.symptomDescription.trim().toLowerCase()}|${new Date(req.submittedAt).toDateString()}`;
    if (seenReq.has(dedupeKey)) {
      issues.push(
        issue(
          'req-duplicate-day',
          'medium',
          'Potential duplicate requisition',
          `Possible same-day duplicate for ${req.studentName}.`,
          'Requisition',
          req.id,
          'Review for duplicates and merge workflow notes where appropriate.',
        ),
      );
    } else {
      seenReq.add(dedupeKey);
    }

    if (!req.doctorNotes && (req.status === 'Approved' || req.status === 'Rejected')) {
      issues.push(
        issue(
          'req-missing-review-note',
          'high',
          'Reviewed requisition missing doctor note',
          `Requisition ${req.id} is ${req.status} without review notes.`,
          'Requisition',
          req.id,
          'Require note before final status transitions.',
        ),
      );
    }
  }

  for (const ref of referrals) {
    if (ref.status === 'Completed' && !ref.consultationNotes) {
      issues.push(
        issue(
          'ref-completed-no-notes',
          'high',
          'Completed referral missing consultation notes',
          `Referral ${ref.id} completed without consultation note payload.`,
          'Referral',
          ref.id,
          'Backfill consultation notes and audit the completion path.',
        ),
      );
    }

    if (ref.status === 'Requested' && Date.now() - new Date(ref.requestedAt).getTime() > 48 * 3600 * 1000) {
      issues.push(
        issue(
          'ref-request-stale',
          'medium',
          'Referral request stale beyond Service Level Agreement',
          `Referral ${ref.id} has remained requested for more than 48 hours.`,
          'Referral',
          ref.id,
          'Escalate to specialist inbox and admin oversight.',
        ),
      );
    }
  }

  return issues;
}
