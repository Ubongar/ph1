import type { MedicationRequisition, Student } from '../types/types';
import { getAll, StorageKey } from './storage';

export interface SafetyIssue {
  id: string;
  type: 'allergy-conflict' | 'duplicate-medication' | 'dosage-risk' | 'interaction-risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  details: string;
  recommendation: string;
}

const DOSAGE_RISK_HINTS = ['500mg', '1000mg', 'q6h', 'every 4 hours'];
const INTERACTION_PAIRS = [
  ['ibuprofen', 'diclofenac'],
  ['aspirin', 'warfarin'],
  ['prednisolone', 'ibuprofen'],
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function runSafetyChecksForRequisition(requisitionId: string): SafetyIssue[] {
  const requisitions = getAll<MedicationRequisition>(StorageKey.REQUISITIONS);
  const students = getAll<Student>(StorageKey.STUDENTS);

  const req = requisitions.find((item) => item.id === requisitionId);
  if (!req) return [];

  const student = students.find((item) => item.id === req.studentId);
  if (!student) return [];

  return runSafetyChecks(req, student);
}

export function runSafetyChecks(req: MedicationRequisition, student: Student): SafetyIssue[] {
  const issues: SafetyIssue[] = [];
  const meds = req.requestedMedications.map(normalize);

  for (const allergy of student.allergies) {
    for (const med of meds) {
      if (med.includes(normalize(allergy.allergen)) || normalize(allergy.allergen).includes(med)) {
        issues.push({
          id: crypto.randomUUID(),
          type: 'allergy-conflict',
          severity: allergy.severity === 'Life-threatening' ? 'critical' : 'high',
          title: `Allergy conflict: ${allergy.allergen}`,
          details: `${student.name} has ${allergy.severity} reaction history for ${allergy.allergen}.`,
          recommendation: 'Do not approve until alternative medication is reviewed by clinician.',
        });
      }
    }
  }

  const seen = new Set<string>();
  for (const med of meds) {
    if (seen.has(med)) {
      issues.push({
        id: crypto.randomUUID(),
        type: 'duplicate-medication',
        severity: 'medium',
        title: `Duplicate medication request: ${med}`,
        details: 'Same medication appears multiple times in request payload.',
        recommendation: 'Consolidate duplicate lines before approval.',
      });
    }
    seen.add(med);
  }

  for (const med of meds) {
    for (const hint of DOSAGE_RISK_HINTS) {
      if (med.includes(hint)) {
        issues.push({
          id: crypto.randomUUID(),
          type: 'dosage-risk',
          severity: 'high',
          title: 'Potential dosage risk pattern',
          details: `Medication text "${med}" includes high-intensity dosage hint (${hint}).`,
          recommendation: 'Require explicit prescriber dosage confirmation.',
        });
      }
    }
  }

  for (const [a, b] of INTERACTION_PAIRS) {
    if (meds.some((m) => m.includes(a)) && meds.some((m) => m.includes(b))) {
      issues.push({
        id: crypto.randomUUID(),
        type: 'interaction-risk',
        severity: 'high',
        title: 'Potential interaction risk',
        details: `Requested medications include ${a} and ${b}.`,
        recommendation: 'Review interaction risk and consider safer combination.',
      });
    }
  }

  return issues;
}

export function summarizeSafety(issues: SafetyIssue[]): { critical: number; high: number; total: number } {
  const critical = issues.filter((item) => item.severity === 'critical').length;
  const high = issues.filter((item) => item.severity === 'high').length;
  return { critical, high, total: issues.length };
}
