import type {
  Student, SystemUser, Encounter, MedicationRequisition,
  DiagnosticResult, AuditLog, SystemAlert, Referral, PolicyVersion, PolicyAcceptance, DataRequest, Complaint,
} from '../types/types';
import { StorageKey } from '../services/storage';

const INITIALIZED_KEY = 'shr_initialized';
const SPECIALIST_USER_ID = 'specialist-001';
const APPOINTMENTS_KEY = 'shr_follow_up_appointments';
const INBOX_KEY = 'shr_role_inbox_tasks';
const NOTIFICATIONS_KEY = 'shr_notifications';

const LEGACY_STUDENT_NAME_PATTERNS = [/\bAdaeze Okonkwo\b/gi, /\bAdazeze Okonkwo\b/gi, /\bAdaeze\b/gi];
const CANONICAL_STUDENT_NAME = 'Simioluwa Okonkwo';

function readStoredUsersSafely(): SystemUser[] {
  try {
    const raw = localStorage.getItem(StorageKey.USERS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SystemUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + (value.codePointAt(index) ?? 0)) >>> 0;
  }
  return hash;
}

function replaceLegacyStudentName(value: string): string {
  let next = value;
  for (const pattern of LEGACY_STUDENT_NAME_PATTERNS) {
    next = next.replace(pattern, CANONICAL_STUDENT_NAME);
  }
  return next;
}

function deepReplaceLegacyStudentName<T>(value: T): T {
  if (typeof value === 'string') {
    return replaceLegacyStudentName(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => deepReplaceLegacyStudentName(entry)) as T;
  }

  if (value && typeof value === 'object') {
    const nextEntries = Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
      key,
      deepReplaceLegacyStudentName(entryValue),
    ]);
    return Object.fromEntries(nextEntries) as T;
  }

  return value;
}

function migrateLegacyStudentNameAcrossStorage(): void {
  const keysToMigrate = [
    ...Object.values(StorageKey),
    APPOINTMENTS_KEY,
    INBOX_KEY,
    NOTIFICATIONS_KEY,
  ];

  for (const key of keysToMigrate) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as unknown;
      const migrated = deepReplaceLegacyStudentName(parsed);
      const serialized = JSON.stringify(migrated);
      if (serialized !== raw) {
        localStorage.setItem(key, serialized);
      }
    } catch {
      // Ignore non-JSON values.
    }
  }
}

function migratePendingResultAssignments(): void {
  const users = readStoredUsersSafely();
  const activeTechnicians = users
    .filter((user) => user.isActive && user.role === 'technician')
    .sort((left, right) => left.id.localeCompare(right.id));

  if (activeTechnicians.length === 0) return;

  const raw = localStorage.getItem(StorageKey.RESULTS);
  if (!raw) return;

  try {
    const results = JSON.parse(raw) as DiagnosticResult[];
    if (!Array.isArray(results)) return;

    let changed = false;
    const migrated = results.map((result) => {
      const isPending = result.status === 'Pending' || result.status === 'Processing' || result.status === 'Requires Review';
      const isUnassigned = !result.uploadedByTechnicianId || result.uploadedByTechnicianId === '—';
      if (!isPending || !isUnassigned) return result;

      const assignedIndex = hashString(result.id) % activeTechnicians.length;
      const assignedTechnician = activeTechnicians[assignedIndex];
      if (!assignedTechnician) return result;

      changed = true;
      return {
        ...result,
        uploadedByTechnicianId: assignedTechnician.id,
        uploadedByTechnicianName: assignedTechnician.name,
      };
    });

    if (changed) {
      localStorage.setItem(StorageKey.RESULTS, JSON.stringify(migrated));
    }
  } catch {
    // Ignore malformed payloads.
  }
}

function runStorageMigrations(): void {
  migrateLegacyStudentNameAcrossStorage();
  migratePendingResultAssignments();
}

export function initializeMockData(): void {
  runStorageMigrations();

  if (localStorage.getItem(INITIALIZED_KEY)) {
    const users = readStoredUsersSafely();
    if (!users.some((u) => u.id === SPECIALIST_USER_ID)) {
      users.push({
        id: SPECIALIST_USER_ID,
        name: 'Dr. Nnenna Udeh',
        email: 'specialist@babcock.edu.ng',
        role: 'specialist',
        department: 'Cardiology',
        staffId: 'BU-SPC-001',
        isActive: true,
        createdAt: '2020-04-12T08:00:00Z',
        lastLogin: '2024-01-15T08:45:00Z',
        createdBy: 'admin-001',
      });
      localStorage.setItem(StorageKey.USERS, JSON.stringify(users));
    }
    if (!localStorage.getItem(StorageKey.REFERRALS)) {
      const referrals: Referral[] = [
        {
          id: 'ref-001',
          studentId: 'stu-002',
          studentName: 'Emeka Nwosu',
          requestingStaffId: 'staff-001',
          requestingStaffName: 'Dr. Olusegun Bello',
          specialistId: SPECIALIST_USER_ID,
          specialistName: 'Dr. Nnenna Udeh',
          specialty: 'Cardiology',
          reason: 'Persistent hypertension with LVH pattern on ECG requiring specialist evaluation.',
          priority: 'Urgent',
          status: 'Requested',
          requestedAt: '2024-01-15T09:20:00Z',
        },
      ];
      localStorage.setItem(StorageKey.REFERRALS, JSON.stringify(referrals));
    }

    if (!localStorage.getItem(StorageKey.POLICY_VERSIONS)) {
      const policyVersions: PolicyVersion[] = [
        {
          id: 'policy-privacy-v1',
          policyType: 'privacy',
          version: '1.0',
          title: 'Privacy Policy',
          summary: 'Initial privacy framework for student health records handling.',
          effectiveFrom: '2024-01-01T00:00:00Z',
          publishedByUserId: 'admin-001',
          publishedByUserName: 'Chidi Okwu',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'policy-terms-v1',
          policyType: 'terms',
          version: '1.0',
          title: 'Terms and Conditions',
          summary: 'Initial terms governing acceptable use and responsibilities.',
          effectiveFrom: '2024-01-01T00:00:00Z',
          publishedByUserId: 'admin-001',
          publishedByUserName: 'Chidi Okwu',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];
      localStorage.setItem(StorageKey.POLICY_VERSIONS, JSON.stringify(policyVersions));
    }

    if (!localStorage.getItem(StorageKey.POLICY_ACCEPTANCES)) {
      const policyAcceptances: PolicyAcceptance[] = users.flatMap((user) => [
        {
          id: `${user.id}-privacy-v1`,
          userId: user.id,
          policyType: 'privacy',
          acceptedVersion: '1.0',
          acceptedAt: '2024-01-10T08:00:00Z',
          method: 'in-app',
        },
        {
          id: `${user.id}-terms-v1`,
          userId: user.id,
          policyType: 'terms',
          acceptedVersion: '1.0',
          acceptedAt: '2024-01-10T08:05:00Z',
          method: 'in-app',
        },
      ]);
      localStorage.setItem(StorageKey.POLICY_ACCEPTANCES, JSON.stringify(policyAcceptances));
    }

    if (!localStorage.getItem(StorageKey.DATA_REQUESTS)) {
      const dataRequests: DataRequest[] = [
        {
          id: 'dr-001',
          userId: 'student-001',
          userName: 'Simioluwa Okonkwo',
          userRole: 'student',
          requestType: 'Access',
          requestDetails: 'Requesting complete copy of my encounter history for scholarship documentation.',
          auditTicketId: 'DR-20260110-3021',
          status: 'Completed',
          createdAt: '2026-01-10T09:15:00Z',
          updatedAt: '2026-01-14T13:40:00Z',
          adminReviewerId: 'admin-001',
          adminReviewerName: 'Chidi Okwu',
          adminNotes: 'Identity verified and encrypted export delivered through secure channel.',
        },
        {
          id: 'dr-002',
          userId: 'student-001',
          userName: 'Simioluwa Okonkwo',
          userRole: 'student',
          requestType: 'Correction',
          requestDetails: 'My emergency contact phone number should be updated to 08087654322.',
          auditTicketId: 'DR-20260208-4493',
          status: 'Under Review',
          createdAt: '2026-02-08T10:05:00Z',
          updatedAt: '2026-02-08T10:05:00Z',
        },
      ];
      localStorage.setItem(StorageKey.DATA_REQUESTS, JSON.stringify(dataRequests));
    }

    if (!localStorage.getItem(StorageKey.COMPLAINTS)) {
      const complaints: Complaint[] = [
        {
          id: 'cmp-001',
          ticketId: 'CMP-20260321-5512',
          submittedByUserId: 'student-001',
          submittedByName: 'Simioluwa Okonkwo',
          submittedByRole: 'student',
          subject: 'No update on medication tracking for over 24 hours',
          details: 'My approved inhaler request has had no tracking update for 24+ hours. Breathing episodes are getting worse.',
          concernedDepartment: 'Pharmacy',
          severity: 'Critical',
          status: 'Resolved',
          createdAt: '2026-03-21T09:00:00Z',
          updatedAt: '2026-03-21T12:15:00Z',
          adminReviewerId: 'admin-001',
          adminReviewerName: 'Chidi Okwu',
          forwardNote: 'Please confirm queue position and expected pickup time urgently.',
          forwardedAt: '2026-03-21T09:20:00Z',
          forwardedToDepartment: 'Pharmacy',
          forwardedToRole: 'pharmacy',
          forwardedToUserId: 'pharm-001',
          forwardedToUserName: 'Pharmacist Remi Soyinka',
          departmentFeedback: 'Medication was held due to stock reconciliation. Replacement stock arrived and item is now ready.',
          departmentFeedbackAt: '2026-03-21T11:05:00Z',
          departmentFeedbackByUserId: 'pharm-001',
          departmentFeedbackByUserName: 'Pharmacist Remi Soyinka',
          adminResponse: 'Your medication is now marked ready for pickup. We have also tightened urgent queue escalation checks.',
          adminRespondedAt: '2026-03-21T12:15:00Z',
          adminResponderId: 'admin-001',
          adminResponderName: 'Chidi Okwu',
        },
      ];
      localStorage.setItem(StorageKey.COMPLAINTS, JSON.stringify(complaints));
    }
    return;
  }

  const students: Student[] = [
    {
      id: 'stu-001', userId: 'student-001', name: 'Simioluwa Okonkwo',
      dateOfBirth: '2002-03-15', gender: 'Female', department: 'Computer Science',
      level: '300', phoneNumber: '08012345678', email: 'student@babcock.edu.ng',
      bloodGroup: 'O+', genotype: 'AS',
      allergies: [
        { id: 'alg-001', allergen: 'Penicillin', severity: 'Life-threatening', reaction: 'Anaphylaxis', dateRecorded: '2020-06-10' },
        { id: 'alg-002', allergen: 'Peanuts', severity: 'Severe', reaction: 'Urticaria and angioedema', dateRecorded: '2019-01-20' },
      ],
      chronicConditions: ['Asthma'],
      emergencyContact: { name: 'Chioma Okonkwo', relationship: 'Mother', phoneNumber: '08087654321' },
    },
    {
      id: 'stu-002', userId: 'stu-user-002', name: 'Emeka Nwosu',
      dateOfBirth: '2001-07-22', gender: 'Male', department: 'Medicine',
      level: '500', phoneNumber: '08023456789', email: 'emeka.nwosu@babcock.edu.ng',
      bloodGroup: 'A+', genotype: 'AA',
      allergies: [],
      chronicConditions: ['Hypertension'],
      emergencyContact: { name: 'Obiageli Nwosu', relationship: 'Father', phoneNumber: '07098765432' },
    },
    {
      id: 'stu-003', userId: 'stu-user-003', name: 'Fatima Aliyu',
      dateOfBirth: '2003-11-05', gender: 'Female', department: 'Pharmacy',
      level: '200', phoneNumber: '08034567890', email: 'fatima.aliyu@babcock.edu.ng',
      bloodGroup: 'B+', genotype: 'AA',
      allergies: [
        { id: 'alg-003', allergen: 'Sulfonamides', severity: 'Moderate', reaction: 'Skin rash', dateRecorded: '2021-09-14' },
      ],
      chronicConditions: [],
      emergencyContact: { name: 'Aisha Aliyu', relationship: 'Mother', phoneNumber: '07076543210' },
    },
    {
      id: 'stu-004', userId: 'stu-user-004', name: 'Tunde Adeyemi',
      dateOfBirth: '2000-05-30', gender: 'Male', department: 'Engineering',
      level: '400', phoneNumber: '08045678901', email: 'tunde.adeyemi@babcock.edu.ng',
      bloodGroup: 'AB+', genotype: 'AS',
      allergies: [],
      chronicConditions: ['Asthma', 'Eczema'],
      emergencyContact: { name: 'Bola Adeyemi', relationship: 'Father', phoneNumber: '08065432109' },
    },
    {
      id: 'stu-005', userId: 'stu-user-005', name: 'Ngozi Eze',
      dateOfBirth: '2002-08-19', gender: 'Female', department: 'Law',
      level: '300', phoneNumber: '08056789012', email: 'ngozi.eze@babcock.edu.ng',
      bloodGroup: 'O-', genotype: 'AA',
      allergies: [
        { id: 'alg-004', allergen: 'Penicillin', severity: 'Severe', reaction: 'Anaphylactoid reaction', dateRecorded: '2022-03-08' },
      ],
      chronicConditions: [],
      emergencyContact: { name: 'Chukwuemeka Eze', relationship: 'Father', phoneNumber: '07054321098' },
    },
    {
      id: 'stu-006', userId: 'stu-user-006', name: 'Ibrahim Musa',
      dateOfBirth: '2001-12-01', gender: 'Male', department: 'Business Administration',
      level: '400', phoneNumber: '08067890123', email: 'ibrahim.musa@babcock.edu.ng',
      bloodGroup: 'B-', genotype: 'AC',
      allergies: [],
      chronicConditions: ['Sickle Cell Trait'],
      emergencyContact: { name: 'Halima Musa', relationship: 'Mother', phoneNumber: '08043210987' },
    },
    {
      id: 'stu-007', userId: 'stu-user-007', name: 'Chidinma Obi',
      dateOfBirth: '2003-04-25', gender: 'Female', department: 'Nursing',
      level: '200', phoneNumber: '08078901234', email: 'chidinma.obi@babcock.edu.ng',
      bloodGroup: 'A-', genotype: 'AA',
      allergies: [
        { id: 'alg-005', allergen: 'Latex', severity: 'Mild', reaction: 'Contact dermatitis', dateRecorded: '2023-01-15' },
      ],
      chronicConditions: [],
      emergencyContact: { name: 'Innocent Obi', relationship: 'Father', phoneNumber: '08032109876' },
    },
    {
      id: 'stu-008', userId: 'stu-user-008', name: 'Seun Adeola',
      dateOfBirth: '2000-09-10', gender: 'Male', department: 'Accounting',
      level: '500', phoneNumber: '08089012345', email: 'seun.adeola@babcock.edu.ng',
      bloodGroup: 'O+', genotype: 'AA',
      allergies: [],
      chronicConditions: ['Hypertension'],
      emergencyContact: { name: 'Yetunde Adeola', relationship: 'Mother', phoneNumber: '08021098765' },
    },
  ];

  const systemUsers: SystemUser[] = [
    {
      id: 'student-001', name: 'Simioluwa Okonkwo', email: 'student@babcock.edu.ng',
      role: 'student', department: 'Computer Science', matricNumber: 'BU/21/CS/001',
      isActive: true, createdAt: '2023-09-01T08:00:00Z', lastLogin: '2024-01-15T09:30:00Z',
      createdBy: 'admin-001',
    },
    {
      id: 'staff-001', name: 'Dr. Olusegun Bello', email: 'doctor@babcock.edu.ng',
      role: 'medical_staff', department: 'Amphi Clinic', staffId: 'BU-MED-001',
      isActive: true, createdAt: '2020-01-15T08:00:00Z', lastLogin: '2024-01-15T07:45:00Z',
      createdBy: 'admin-001',
    },
    {
      id: 'tech-001', name: 'Amaka Okafor', email: 'technician@babcock.edu.ng',
      role: 'technician', department: 'Laboratory', staffId: 'BU-TECH-001',
      isActive: true, createdAt: '2021-03-10T08:00:00Z', lastLogin: '2024-01-14T16:00:00Z',
      createdBy: 'admin-001',
    },
    {
      id: 'pharm-001', name: 'Pharmacist Remi Soyinka', email: 'pharmacist@babcock.edu.ng',
      role: 'pharmacy', department: 'Pharmacy', staffId: 'BU-PHARM-001',
      isActive: true, createdAt: '2020-06-20T08:00:00Z', lastLogin: '2024-01-15T08:20:00Z',
      createdBy: 'admin-001',
    },
    {
      id: 'admin-001', name: 'Chidi Okwu', email: 'admin@babcock.edu.ng',
      role: 'admin', department: 'IT Administration', staffId: 'BU-ADM-001',
      isActive: true, createdAt: '2019-05-01T08:00:00Z', lastLogin: '2024-01-15T06:00:00Z',
      createdBy: 'admin-001',
    },
    {
      id: SPECIALIST_USER_ID, name: 'Dr. Nnenna Udeh', email: 'specialist@babcock.edu.ng',
      role: 'specialist', department: 'Cardiology', staffId: 'BU-SPC-001',
      isActive: true, createdAt: '2020-04-12T08:00:00Z', lastLogin: '2024-01-15T08:45:00Z',
      createdBy: 'admin-001',
    },
  ];

  const encounters: Encounter[] = [
    {
      id: 'enc-001', studentId: 'stu-001', date: '2024-01-10T10:30:00Z',
      facility: 'Amphi Clinic', attendingStaffId: 'staff-001', attendingStaffName: 'Dr. Olusegun Bello',
      chiefComplaint: 'Shortness of breath and wheezing',
      subjectiveNotes: 'Patient reports worsening asthma symptoms over the past 3 days. Using rescue inhaler more frequently.',
      objectiveNotes: 'Wheezing noted on auscultation. SpO2 94% on room air.',
      vitals: { bloodPressureSystolic: 118, bloodPressureDiastolic: 76, heartRate: 92, temperature: 36.8, respiratoryRate: 22, oxygenSaturation: 94, weight: 58, height: 165, bmi: 21.3 },
      diagnoses: [{ id: 'diag-001', icd10Code: 'J45.40', description: 'Moderate persistent asthma, uncomplicated', type: 'Primary' }],
      treatmentPlan: 'Administer nebulised salbutamol. Increase inhaled corticosteroid dose. Review in 1 week.',
      prescriptions: [
        { id: 'rx-001', medicationName: 'Salbutamol Inhaler', dosage: '100mcg', frequency: '4 times daily', duration: '7 days', route: 'Inhaled' },
        { id: 'rx-002', medicationName: 'Prednisolone', dosage: '30mg', frequency: 'Once daily', duration: '5 days', route: 'Oral' },
      ],
      followUpRequired: true, followUpDate: '2024-01-17', status: 'Active',
    },
    {
      id: 'enc-002', studentId: 'stu-002', date: '2024-01-08T14:00:00Z',
      facility: 'Amphi Clinic', attendingStaffId: 'staff-001', attendingStaffName: 'Dr. Olusegun Bello',
      chiefComplaint: 'Severe headache and blurred vision',
      subjectiveNotes: 'Patient reports persistent headache for 2 days. History of hypertension.',
      objectiveNotes: 'BP significantly elevated. No focal neurological deficits.',
      vitals: { bloodPressureSystolic: 168, bloodPressureDiastolic: 102, heartRate: 88, temperature: 36.9, respiratoryRate: 18, oxygenSaturation: 98, weight: 82, height: 178, bmi: 25.9 },
      diagnoses: [
        { id: 'diag-002', icd10Code: 'I10', description: 'Essential hypertension', type: 'Primary' },
        { id: 'diag-003', icd10Code: 'G44.309', description: 'Post-traumatic headache, unspecified', type: 'Secondary' },
      ],
      treatmentPlan: 'Optimise antihypertensive therapy. Refer to BUTH for further evaluation.',
      prescriptions: [
        { id: 'rx-003', medicationName: 'Amlodipine', dosage: '10mg', frequency: 'Once daily', duration: '30 days', route: 'Oral' },
        { id: 'rx-004', medicationName: 'Losartan', dosage: '50mg', frequency: 'Once daily', duration: '30 days', route: 'Oral', notes: 'Monitor BP daily' },
      ],
      followUpRequired: true, followUpDate: '2024-01-15', status: 'Referred',
    },
    {
      id: 'enc-003', studentId: 'stu-003', date: '2024-01-05T09:15:00Z',
      facility: 'Amphi Clinic', attendingStaffId: 'staff-001', attendingStaffName: 'Dr. Olusegun Bello',
      chiefComplaint: 'Nausea, vomiting and abdominal pain',
      subjectiveNotes: 'Student reports onset of symptoms 12 hours ago. Ate outside campus food.',
      objectiveNotes: 'Mild epigastric tenderness. Mild dehydration noted.',
      vitals: { bloodPressureSystolic: 108, bloodPressureDiastolic: 68, heartRate: 102, temperature: 37.8, respiratoryRate: 16, oxygenSaturation: 99, weight: 55, height: 162, bmi: 20.9 },
      diagnoses: [{ id: 'diag-004', icd10Code: 'A08.4', description: 'Viral intestinal infection, unspecified', type: 'Primary' }],
      treatmentPlan: 'Oral rehydration. Antiemetics. Light diet. Rest.',
      prescriptions: [
        { id: 'rx-005', medicationName: 'Metoclopramide', dosage: '10mg', frequency: '3 times daily', duration: '3 days', route: 'Oral' },
        { id: 'rx-006', medicationName: 'Oral Rehydration Salts', dosage: '1 sachet', frequency: 'After each loose stool', duration: '3 days', route: 'Oral' },
      ],
      followUpRequired: false, status: 'Resolved',
    },
    {
      id: 'enc-004', studentId: 'stu-004', date: '2023-12-20T11:00:00Z',
      facility: 'BUTH', attendingStaffId: 'staff-001', attendingStaffName: 'Dr. Olusegun Bello',
      chiefComplaint: 'Skin rash and itching',
      subjectiveNotes: 'Extensive eczematous rash on arms and torso. History of eczema.',
      objectiveNotes: 'Dry, scaly patches on bilateral forearms. No secondary infection.',
      vitals: { bloodPressureSystolic: 120, bloodPressureDiastolic: 78, heartRate: 75, temperature: 36.5, respiratoryRate: 14, oxygenSaturation: 99, weight: 75, height: 180, bmi: 23.1 },
      diagnoses: [{ id: 'diag-005', icd10Code: 'L20.89', description: 'Atopic dermatitis, other', type: 'Primary' }],
      treatmentPlan: 'Topical corticosteroid application. Emollient moisturiser. Avoid known triggers.',
      prescriptions: [
        { id: 'rx-007', medicationName: 'Hydrocortisone Cream 1%', dosage: 'Thin layer', frequency: 'Twice daily', duration: '14 days', route: 'Topical' },
        { id: 'rx-008', medicationName: 'Chlorphenamine', dosage: '4mg', frequency: 'At night', duration: '7 days', route: 'Oral' },
      ],
      followUpRequired: true, followUpDate: '2024-01-03', status: 'Active',
    },
    {
      id: 'enc-005', studentId: 'stu-005', date: '2023-12-15T16:30:00Z',
      facility: 'Amphi Clinic', attendingStaffId: 'staff-001', attendingStaffName: 'Dr. Olusegun Bello',
      chiefComplaint: 'Fever and sore throat',
      subjectiveNotes: 'High-grade fever for 2 days. Painful swallowing. No cough.',
      objectiveNotes: 'Tonsillar exudates noted. Cervical lymphadenopathy. Temperature 38.9°C.',
      vitals: { bloodPressureSystolic: 112, bloodPressureDiastolic: 72, heartRate: 98, temperature: 38.9, respiratoryRate: 18, oxygenSaturation: 98, weight: 62, height: 168, bmi: 22.0 },
      diagnoses: [{ id: 'diag-006', icd10Code: 'J03.00', description: 'Acute streptococcal tonsillitis, unspecified', type: 'Primary' }],
      treatmentPlan: 'Throat swab sent. Empirical antibiotic therapy. Analgesics for pain.',
      prescriptions: [
        { id: 'rx-009', medicationName: 'Azithromycin', dosage: '500mg', frequency: 'Once daily', duration: '5 days', route: 'Oral', notes: 'Patient allergic to Penicillin — DO NOT prescribe amoxicillin' },
        { id: 'rx-010', medicationName: 'Paracetamol', dosage: '1000mg', frequency: 'Every 6 hours', duration: '5 days', route: 'Oral' },
      ],
      followUpRequired: false, status: 'Resolved',
    },
    {
      id: 'enc-006', studentId: 'stu-006', date: '2024-01-12T13:45:00Z',
      facility: 'Amphi Clinic', attendingStaffId: 'staff-001', attendingStaffName: 'Dr. Olusegun Bello',
      chiefComplaint: 'Joint pain and fatigue',
      subjectiveNotes: 'Bilateral knee pain worsening over 3 weeks. Excessive fatigue. Sickle cell carrier.',
      objectiveNotes: 'Mild joint effusion in left knee. No fever.',
      vitals: { bloodPressureSystolic: 115, bloodPressureDiastolic: 74, heartRate: 80, temperature: 36.7, respiratoryRate: 15, oxygenSaturation: 97, weight: 70, height: 175, bmi: 22.9 },
      diagnoses: [
        { id: 'diag-007', icd10Code: 'M25.561', description: 'Pain in right knee', type: 'Primary' },
        { id: 'diag-008', icd10Code: 'D57.3', description: 'Sickle-cell trait', type: 'Secondary' },
      ],
      treatmentPlan: 'Physiotherapy referral. NSAIDs for pain management. Avoid dehydration.',
      prescriptions: [
        { id: 'rx-011', medicationName: 'Ibuprofen', dosage: '400mg', frequency: 'Three times daily with food', duration: '7 days', route: 'Oral' },
        { id: 'rx-012', medicationName: 'Folic Acid', dosage: '5mg', frequency: 'Once daily', duration: '30 days', route: 'Oral' },
      ],
      followUpRequired: true, followUpDate: '2024-01-26', status: 'Active',
    },
    {
      id: 'enc-007', studentId: 'stu-007', date: '2024-01-03T10:00:00Z',
      facility: 'Amphi Clinic', attendingStaffId: 'staff-001', attendingStaffName: 'Dr. Olusegun Bello',
      chiefComplaint: 'Urinary burning and frequency',
      subjectiveNotes: 'Dysuria and increased urinary frequency for 3 days. No fever.',
      objectiveNotes: 'Suprapubic tenderness on palpation. Urine dipstick positive for nitrites.',
      vitals: { bloodPressureSystolic: 116, bloodPressureDiastolic: 70, heartRate: 78, temperature: 37.2, respiratoryRate: 16, oxygenSaturation: 99, weight: 54, height: 160, bmi: 21.1 },
      diagnoses: [{ id: 'diag-009', icd10Code: 'N30.00', description: 'Acute cystitis without haematuria', type: 'Primary' }],
      treatmentPlan: 'Short course antibiotics. Increase fluid intake. Urine M/C/S sent.',
      prescriptions: [
        { id: 'rx-013', medicationName: 'Nitrofurantoin', dosage: '100mg', frequency: 'Twice daily', duration: '7 days', route: 'Oral' },
      ],
      followUpRequired: false, status: 'Resolved',
    },
    {
      id: 'enc-008', studentId: 'stu-008', date: '2023-11-28T08:30:00Z',
      facility: 'BUTH', attendingStaffId: 'staff-001', attendingStaffName: 'Dr. Olusegun Bello',
      chiefComplaint: 'Chest pain on exertion',
      subjectiveNotes: 'History of hypertension. Intermittent chest tightness during exercise.',
      objectiveNotes: 'BP elevated. ECG ordered. No acute changes noted.',
      vitals: { bloodPressureSystolic: 158, bloodPressureDiastolic: 96, heartRate: 86, temperature: 36.6, respiratoryRate: 17, oxygenSaturation: 97, weight: 88, height: 182, bmi: 26.6 },
      diagnoses: [
        { id: 'diag-010', icd10Code: 'I10', description: 'Essential hypertension', type: 'Primary' },
        { id: 'diag-011', icd10Code: 'R07.9', description: 'Chest pain, unspecified', type: 'Secondary' },
      ],
      treatmentPlan: 'ECG and echocardiogram. Optimise antihypertensives. Cardiology review.',
      prescriptions: [
        { id: 'rx-014', medicationName: 'Bisoprolol', dosage: '5mg', frequency: 'Once daily', duration: '30 days', route: 'Oral' },
      ],
      followUpRequired: true, followUpDate: '2023-12-12', status: 'Referred',
    },
    {
      id: 'enc-009', studentId: 'stu-001', date: '2023-11-15T15:00:00Z',
      facility: 'Amphi Clinic', attendingStaffId: 'staff-001', attendingStaffName: 'Dr. Olusegun Bello',
      chiefComplaint: 'Follow-up for asthma',
      subjectiveNotes: 'Symptom control improved. Using rescue inhaler only once weekly now.',
      objectiveNotes: 'Clear chest on auscultation. SpO2 99%.',
      vitals: { bloodPressureSystolic: 114, bloodPressureDiastolic: 72, heartRate: 76, temperature: 36.4, respiratoryRate: 14, oxygenSaturation: 99, weight: 57, height: 165, bmi: 20.9 },
      diagnoses: [{ id: 'diag-012', icd10Code: 'J45.40', description: 'Moderate persistent asthma, uncomplicated', type: 'Primary' }],
      treatmentPlan: 'Continue current regimen. Patient education on trigger avoidance.',
      prescriptions: [],
      followUpRequired: true, followUpDate: '2024-02-15', status: 'Resolved',
    },
    {
      id: 'enc-010', studentId: 'stu-002', date: '2023-10-20T11:30:00Z',
      facility: 'BUTH', attendingStaffId: 'staff-001', attendingStaffName: 'Dr. Olusegun Bello',
      chiefComplaint: 'Routine hypertension review',
      subjectiveNotes: 'BP better controlled on current medication. No headaches.',
      objectiveNotes: 'BP 138/88 — improved. Well-controlled.',
      vitals: { bloodPressureSystolic: 138, bloodPressureDiastolic: 88, heartRate: 82, temperature: 36.7, respiratoryRate: 15, oxygenSaturation: 99, weight: 81, height: 178, bmi: 25.6 },
      diagnoses: [{ id: 'diag-013', icd10Code: 'I10', description: 'Essential hypertension', type: 'Primary' }],
      treatmentPlan: 'Continue Amlodipine. Dietary salt restriction. Repeat in 3 months.',
      prescriptions: [
        { id: 'rx-015', medicationName: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: '90 days', route: 'Oral' },
      ],
      followUpRequired: true, followUpDate: '2024-01-20', status: 'Resolved',
    },
    {
      id: 'enc-011', studentId: 'stu-003', date: '2023-10-05T14:00:00Z',
      facility: 'Amphi Clinic', attendingStaffId: 'staff-001', attendingStaffName: 'Dr. Olusegun Bello',
      chiefComplaint: 'Menstrual cramps and heavy bleeding',
      subjectiveNotes: 'Dysmenorrhoea and menorrhagia since starting university. No previous investigation.',
      objectiveNotes: 'Mild lower abdominal tenderness. Haemoglobin within normal limits.',
      vitals: { bloodPressureSystolic: 106, bloodPressureDiastolic: 66, heartRate: 84, temperature: 36.6, respiratoryRate: 15, oxygenSaturation: 99, weight: 55, height: 162, bmi: 20.9 },
      diagnoses: [{ id: 'diag-014', icd10Code: 'N94.6', description: 'Dysmenorrhoea, unspecified', type: 'Primary' }],
      treatmentPlan: 'NSAIDs during menstruation. Gynaecology referral if no improvement.',
      prescriptions: [
        { id: 'rx-016', medicationName: 'Mefenamic Acid', dosage: '500mg', frequency: 'Three times daily', duration: '5 days', route: 'Oral' },
      ],
      followUpRequired: false, status: 'Resolved',
    },
    {
      id: 'enc-012', studentId: 'stu-004', date: '2023-09-18T09:00:00Z',
      facility: 'Amphi Clinic', attendingStaffId: 'staff-001', attendingStaffName: 'Dr. Olusegun Bello',
      chiefComplaint: 'Allergic reaction — accidental peanut exposure',
      subjectiveNotes: 'Accidental ingestion of peanuts at a social event. Hives developing rapidly.',
      objectiveNotes: 'Generalised urticaria. Mild wheeze. No angioedema. BP stable.',
      vitals: { bloodPressureSystolic: 122, bloodPressureDiastolic: 80, heartRate: 110, temperature: 37.0, respiratoryRate: 20, oxygenSaturation: 97, weight: 74, height: 180, bmi: 22.8 },
      diagnoses: [{ id: 'diag-015', icd10Code: 'T78.1XXA', description: 'Other adverse food reactions, initial encounter', type: 'Primary' }],
      treatmentPlan: 'Intramuscular adrenaline administered. IV antihistamine. Monitored for 4 hours. Discharged stable.',
      prescriptions: [
        { id: 'rx-017', medicationName: 'Adrenaline (Epinephrine)', dosage: '0.5mg', frequency: 'Once (IM)', duration: '1 dose', route: 'Intramuscular' },
        { id: 'rx-018', medicationName: 'Cetirizine', dosage: '10mg', frequency: 'Once daily', duration: '7 days', route: 'Oral' },
      ],
      followUpRequired: true, followUpDate: '2023-09-25', status: 'Resolved',
    },
    {
      id: 'enc-013', studentId: 'stu-005', date: '2023-09-01T16:00:00Z',
      facility: 'Amphi Clinic', attendingStaffId: 'staff-001', attendingStaffName: 'Dr. Olusegun Bello',
      chiefComplaint: 'Lower back pain',
      subjectiveNotes: 'Lower back pain following long hours studying. No radiation to legs.',
      objectiveNotes: 'Muscle spasm in lumbar region. No neurological signs.',
      vitals: { bloodPressureSystolic: 110, bloodPressureDiastolic: 70, heartRate: 72, temperature: 36.5, respiratoryRate: 14, oxygenSaturation: 99, weight: 62, height: 168, bmi: 22.0 },
      diagnoses: [{ id: 'diag-016', icd10Code: 'M54.5', description: 'Low back pain', type: 'Primary' }],
      treatmentPlan: 'Physiotherapy. Analgesics. Ergonomic advice for studying posture.',
      prescriptions: [
        { id: 'rx-019', medicationName: 'Diclofenac', dosage: '50mg', frequency: 'Twice daily with food', duration: '7 days', route: 'Oral' },
      ],
      followUpRequired: false, status: 'Resolved',
    },
    {
      id: 'enc-014', studentId: 'stu-007', date: '2023-08-15T10:30:00Z',
      facility: 'Amphi Clinic', attendingStaffId: 'staff-001', attendingStaffName: 'Dr. Olusegun Bello',
      chiefComplaint: 'Malaria symptoms — fever and chills',
      subjectiveNotes: 'High intermittent fever with chills and rigors for 4 days. RDT positive for malaria.',
      objectiveNotes: 'Temperature 39.2°C. Pallor noted. Spleen not palpable.',
      vitals: { bloodPressureSystolic: 104, bloodPressureDiastolic: 64, heartRate: 108, temperature: 39.2, respiratoryRate: 22, oxygenSaturation: 96, weight: 54, height: 160, bmi: 21.1 },
      diagnoses: [{ id: 'diag-017', icd10Code: 'B54', description: 'Unspecified malaria', type: 'Primary' }],
      treatmentPlan: 'ACT artemether/lumefantrine. IV fluids if unable to tolerate oral. Monitor FBC.',
      prescriptions: [
        { id: 'rx-020', medicationName: 'Artemether/Lumefantrine', dosage: '80/480mg', frequency: 'Twice daily', duration: '3 days', route: 'Oral' },
        { id: 'rx-021', medicationName: 'Paracetamol', dosage: '1000mg', frequency: 'Every 6 hours', duration: '3 days', route: 'Oral' },
      ],
      followUpRequired: false, status: 'Resolved',
    },
    {
      id: 'enc-015', studentId: 'stu-008', date: '2023-07-22T09:00:00Z',
      facility: 'BUTH', attendingStaffId: 'staff-001', attendingStaffName: 'Dr. Olusegun Bello',
      chiefComplaint: 'Dental pain — referred from Amphi Clinic',
      subjectiveNotes: 'Severe right lower molar pain. Unable to eat. Referred from Amphi Clinic.',
      objectiveNotes: 'Right lower third molar caries. Periapical abscess suspected.',
      vitals: { bloodPressureSystolic: 148, bloodPressureDiastolic: 92, heartRate: 90, temperature: 37.1, respiratoryRate: 16, oxygenSaturation: 99, weight: 87, height: 182, bmi: 26.3 },
      diagnoses: [{ id: 'diag-018', icd10Code: 'K02.9', description: 'Dental caries, unspecified', type: 'Primary' }],
      treatmentPlan: 'Dental review. Antibiotics pending culture. Analgesia.',
      prescriptions: [
        { id: 'rx-022', medicationName: 'Metronidazole', dosage: '400mg', frequency: 'Three times daily', duration: '7 days', route: 'Oral' },
        { id: 'rx-023', medicationName: 'Co-codamol', dosage: '30/500mg', frequency: 'Every 6 hours', duration: '5 days', route: 'Oral' },
      ],
      followUpRequired: true, followUpDate: '2023-07-29', status: 'Resolved',
    },
  ];

  const requisitions: MedicationRequisition[] = [
    {
      id: 'req-001', studentId: 'stu-001', studentName: 'Simioluwa Okonkwo',
      submittedAt: '2024-01-14T08:30:00Z',
      symptoms: ['Headache', 'Fever'], symptomDescription: 'Mild headache and low-grade fever since yesterday. No other symptoms.',
      severity: 'Mild', requestedMedications: ['Paracetamol', 'Ibuprofen'],
      status: 'Pending Review', priority: 'Normal',
    },
    {
      id: 'req-002', studentId: 'stu-002', studentName: 'Emeka Nwosu',
      submittedAt: '2024-01-13T14:00:00Z',
      symptoms: ['Cough', 'Sore Throat'], symptomDescription: 'Dry cough and sore throat for 3 days.',
      severity: 'Mild', requestedMedications: ['Cough Syrup', 'Lozenges'],
      status: 'Approved', reviewedByStaffId: 'staff-001', reviewedByStaffName: 'Dr. Olusegun Bello',
      reviewedAt: '2024-01-13T16:00:00Z',
      doctorNotes: 'Likely viral URTI. Symptomatic treatment appropriate.',
      approvedMedications: [
        { name: 'Pholcodine Linctus', dosage: '5ml', quantity: 1, frequency: 'Three times daily', duration: '5 days' },
        { name: 'Benzocaine Lozenges', dosage: '1 lozenge', quantity: 12, frequency: 'Every 3–4 hours as needed', duration: '5 days' },
      ],
      priority: 'Normal',
    },
    {
      id: 'req-003', studentId: 'stu-003', studentName: 'Fatima Aliyu',
      submittedAt: '2024-01-12T10:00:00Z',
      symptoms: ['Nausea', 'Vomiting', 'Diarrhoea'], symptomDescription: 'Gastroenteritis symptoms since last night after eating off campus.',
      severity: 'Moderate', requestedMedications: ['ORS', 'Antiemetic'],
      status: 'Ready for Pickup', reviewedByStaffId: 'staff-001', reviewedByStaffName: 'Dr. Olusegun Bello',
      reviewedAt: '2024-01-12T11:30:00Z',
      doctorNotes: 'ORS and antiemetic prescribed. Return if symptoms worsen.',
      approvedMedications: [
        { name: 'ORS Sachet', dosage: '1 sachet in 1L water', quantity: 5, frequency: 'After each loose stool', duration: '3 days' },
        { name: 'Metoclopramide', dosage: '10mg', quantity: 9, frequency: 'Three times daily', duration: '3 days' },
      ],
      priority: 'Normal',
    },
    {
      id: 'req-004', studentId: 'stu-004', studentName: 'Tunde Adeyemi',
      submittedAt: '2024-01-11T09:00:00Z',
      symptoms: ['Wheezing', 'Shortness of Breath'], symptomDescription: 'Asthma flare-up. Running low on inhaler.',
      severity: 'Moderate', requestedMedications: ['Salbutamol Inhaler'],
      status: 'Dispensed', reviewedByStaffId: 'staff-001', reviewedByStaffName: 'Dr. Olusegun Bello',
      reviewedAt: '2024-01-11T10:00:00Z',
      doctorNotes: 'Asthma exacerbation. Approve inhaler refill. Follow up in clinic.',
      approvedMedications: [
        { name: 'Salbutamol Inhaler', dosage: '100mcg', quantity: 1, frequency: 'As needed up to 4 times daily', duration: '30 days' },
      ],
      pharmacyNotes: 'Dispensed 1x Salbutamol 100mcg inhaler. Counselled on inhaler technique.',
      dispensedAt: '2024-01-11T15:30:00Z',
      priority: 'Urgent',
    },
    {
      id: 'req-005', studentId: 'stu-005', studentName: 'Ngozi Eze',
      submittedAt: '2024-01-10T07:45:00Z',
      symptoms: ['Stomach Pain', 'Bloating'], symptomDescription: 'Abdominal bloating and cramping around period time.',
      severity: 'Mild', requestedMedications: ['Mefenamic Acid', 'Buscopan'],
      status: 'Rejected', reviewedByStaffId: 'staff-001', reviewedByStaffName: 'Dr. Olusegun Bello',
      reviewedAt: '2024-01-10T09:00:00Z',
      doctorNotes: 'Please attend clinic for proper examination before medication can be dispensed for recurring abdominal pain.',
      priority: 'Normal',
    },
    {
      id: 'req-006', studentId: 'stu-006', studentName: 'Ibrahim Musa',
      submittedAt: '2024-01-09T13:00:00Z',
      symptoms: ['Fever', 'Fatigue', 'Body Aches'], symptomDescription: 'Feeling very unwell — high fever and whole body aching. Concerned about sickle cell crisis.',
      severity: 'Moderate', requestedMedications: ['Paracetamol', 'Folic Acid'],
      status: 'Approved', reviewedByStaffId: 'staff-001', reviewedByStaffName: 'Dr. Olusegun Bello',
      reviewedAt: '2024-01-09T14:00:00Z',
      doctorNotes: 'Likely febrile illness. Approve paracetamol. Ensure hydration. Attend clinic if no improvement.',
      approvedMedications: [
        { name: 'Paracetamol', dosage: '1000mg', quantity: 20, frequency: 'Every 6 hours', duration: '5 days' },
        { name: 'Folic Acid', dosage: '5mg', quantity: 30, frequency: 'Once daily', duration: '30 days' },
      ],
      priority: 'Urgent',
    },
    {
      id: 'req-007', studentId: 'stu-007', studentName: 'Chidinma Obi',
      submittedAt: '2024-01-08T16:00:00Z',
      symptoms: ['Eye Irritation', 'Discharge'], symptomDescription: 'Itchy red eyes with yellowish discharge for 2 days.',
      severity: 'Mild', requestedMedications: ['Eye Drops'],
      status: 'Pending Review', priority: 'Normal',
    },
    {
      id: 'req-008', studentId: 'stu-008', studentName: 'Seun Adeola',
      submittedAt: '2024-01-07T11:30:00Z',
      symptoms: ['Headache', 'Dizziness'], symptomDescription: 'Morning headaches and slight dizziness. History of hypertension.',
      severity: 'Moderate', requestedMedications: ['Paracetamol'],
      status: 'Dispensed', reviewedByStaffId: 'staff-001', reviewedByStaffName: 'Dr. Olusegun Bello',
      reviewedAt: '2024-01-07T12:00:00Z',
      doctorNotes: 'May be related to BP. Dispensed paracetamol. Must attend clinic to check BP.',
      approvedMedications: [
        { name: 'Paracetamol', dosage: '500mg', quantity: 16, frequency: 'Every 4–6 hours as needed', duration: '4 days' },
      ],
      pharmacyNotes: 'Dispensed. Counselled patient to attend clinic for BP check.',
      dispensedAt: '2024-01-07T14:00:00Z',
      priority: 'Normal',
    },
    {
      id: 'req-009', studentId: 'stu-001', studentName: 'Simioluwa Okonkwo',
      submittedAt: '2023-12-20T09:00:00Z',
      symptoms: ['Cough', 'Wheezing'], symptomDescription: 'Asthma worsening. Cold weather triggering symptoms.',
      severity: 'Moderate', requestedMedications: ['Salbutamol Inhaler'],
      status: 'Dispensed', reviewedByStaffId: 'staff-001', reviewedByStaffName: 'Dr. Olusegun Bello',
      reviewedAt: '2023-12-20T10:00:00Z',
      doctorNotes: 'Approved. Patient has known asthma. Ensure warm clothing and avoid cold triggers.',
      approvedMedications: [
        { name: 'Salbutamol Inhaler', dosage: '100mcg', quantity: 1, frequency: 'As needed', duration: '30 days' },
      ],
      pharmacyNotes: 'Dispensed 1x Salbutamol inhaler.',
      dispensedAt: '2023-12-20T13:00:00Z',
      priority: 'Urgent',
    },
    {
      id: 'req-010', studentId: 'stu-002', studentName: 'Emeka Nwosu',
      submittedAt: '2023-12-05T14:30:00Z',
      symptoms: ['Insomnia', 'Anxiety'], symptomDescription: 'Exam stress causing insomnia and anxiety.',
      severity: 'Mild', requestedMedications: ['Antihistamine for sleep'],
      status: 'Rejected', reviewedByStaffId: 'staff-001', reviewedByStaffName: 'Dr. Olusegun Bello',
      reviewedAt: '2023-12-05T16:00:00Z',
      doctorNotes: 'Sedative antihistamines not appropriate for stress-related insomnia. Please attend wellness clinic.',
      priority: 'Normal',
    },
    {
      id: 'req-011', studentId: 'stu-003', studentName: 'Fatima Aliyu',
      submittedAt: '2023-11-22T08:00:00Z',
      symptoms: ['Cold', 'Runny Nose', 'Sneezing'], symptomDescription: 'Common cold symptoms. Runny nose and sneezing.',
      severity: 'Mild', requestedMedications: ['Antihistamine', 'Decongestant'],
      status: 'Dispensed', reviewedByStaffId: 'staff-001', reviewedByStaffName: 'Dr. Olusegun Bello',
      reviewedAt: '2023-11-22T09:30:00Z',
      approvedMedications: [
        { name: 'Loratadine', dosage: '10mg', quantity: 7, frequency: 'Once daily', duration: '7 days' },
        { name: 'Pseudoephedrine', dosage: '60mg', quantity: 14, frequency: 'Twice daily', duration: '7 days' },
      ],
      pharmacyNotes: 'Dispensed. Advised to stay hydrated.',
      dispensedAt: '2023-11-22T11:00:00Z',
      priority: 'Normal',
    },
    {
      id: 'req-012', studentId: 'stu-004', studentName: 'Tunde Adeyemi',
      submittedAt: '2023-11-10T10:00:00Z',
      symptoms: ['Skin Rash', 'Itching'], symptomDescription: 'Eczema flare-up on forearms. Very itchy.',
      severity: 'Moderate', requestedMedications: ['Hydrocortisone Cream', 'Antihistamine'],
      status: 'Cancelled', priority: 'Normal',
    },
  ];

  const diagnosticResults: DiagnosticResult[] = [
    {
      id: 'res-001', studentId: 'stu-001', requestingStaffId: 'staff-001', requestingStaffName: 'Dr. Olusegun Bello',
      type: 'Blood Test', testName: 'Full Blood Count (FBC)', facility: 'Lab',
      uploadedByTechnicianId: 'tech-001', uploadedByTechnicianName: 'Amaka Okafor',
      uploadedAt: '2024-01-11T14:00:00Z', status: 'Completed',
      findings: 'Eosinophilia noted (eosinophils 0.8 x10⁹/L). Consistent with allergic condition. All other parameters within normal limits.',
      fileSimulatedUrl: '/results/fbc-stu001-jan24.pdf', fileType: 'PDF',
      criticalFlag: false,
    },
    {
      id: 'res-002', studentId: 'stu-002', requestingStaffId: 'staff-001', requestingStaffName: 'Dr. Olusegun Bello',
      type: 'Blood Test', testName: 'Urea, Electrolytes and Creatinine (U&E)', facility: 'Lab',
      uploadedByTechnicianId: 'tech-001', uploadedByTechnicianName: 'Amaka Okafor',
      uploadedAt: '2024-01-09T10:30:00Z', status: 'Flagged',
      findings: 'Creatinine elevated at 145 μmol/L (normal 60–110). eGFR 52 mL/min/1.73m². Possible early renal impairment. Potassium 5.6 mmol/L — mildly elevated.',
      fileSimulatedUrl: '/results/ue-stu002-jan24.pdf', fileType: 'PDF',
      criticalFlag: true, criticalFlagReason: 'Elevated creatinine and hyperkalaemia — potential renal impairment in hypertensive patient',
    },
    {
      id: 'res-003', studentId: 'stu-003', requestingStaffId: 'staff-001', requestingStaffName: 'Dr. Olusegun Bello',
      type: 'Urinalysis', testName: 'Midstream Urine M/C/S', facility: 'Lab',
      uploadedByTechnicianId: 'tech-001', uploadedByTechnicianName: 'Amaka Okafor',
      uploadedAt: '2024-01-06T09:00:00Z', status: 'Completed',
      findings: 'E. coli grown — >10⁵ CFU/mL. Sensitive to Nitrofurantoin and Trimethoprim. Resistant to Ampicillin.',
      fileSimulatedUrl: '/results/urine-stu003-jan24.pdf', fileType: 'PDF',
      criticalFlag: false,
    },
    {
      id: 'res-004', studentId: 'stu-004', requestingStaffId: 'staff-001', requestingStaffName: 'Dr. Olusegun Bello',
      type: 'Imaging', testName: 'Chest X-Ray', facility: 'Radiology',
      uploadedByTechnicianId: 'tech-001', uploadedByTechnicianName: 'Amaka Okafor',
      uploadedAt: '2024-01-04T15:00:00Z', status: 'Completed',
      findings: 'Hyperinflation of lung fields consistent with asthma. No consolidation, effusion or pneumothorax. Heart size normal.',
      fileSimulatedUrl: '/results/cxr-stu004-dec23.png', fileType: 'PNG',
      criticalFlag: false,
    },
    {
      id: 'res-005', studentId: 'stu-005', requestingStaffId: 'staff-001', requestingStaffName: 'Dr. Olusegun Bello',
      type: 'Microbiology', testName: 'Throat Swab M/C/S', facility: 'Lab',
      uploadedByTechnicianId: 'tech-001', uploadedByTechnicianName: 'Amaka Okafor',
      uploadedAt: '2023-12-18T11:00:00Z', status: 'Completed',
      findings: 'Group A Streptococcus (GAS) isolated. Sensitive to Azithromycin and Erythromycin. Penicillin sensitivity noted — patient is Penicillin-allergic.',
      fileSimulatedUrl: '/results/throat-stu005-dec23.pdf', fileType: 'PDF',
      criticalFlag: false,
    },
    {
      id: 'res-006', studentId: 'stu-006', requestingStaffId: 'staff-001', requestingStaffName: 'Dr. Olusegun Bello',
      type: 'Blood Test', testName: 'Haemoglobin Electrophoresis', facility: 'Lab',
      uploadedByTechnicianId: 'tech-001', uploadedByTechnicianName: 'Amaka Okafor',
      uploadedAt: '2024-01-14T08:00:00Z', status: 'Requires Review',
      findings: 'HbAC pattern confirmed — sickle cell trait (AC genotype). Haemoglobin 11.2 g/dL — mild anaemia.',
      fileSimulatedUrl: '/results/hbelectro-stu006-jan24.pdf', fileType: 'PDF',
      criticalFlag: true, criticalFlagReason: 'Mild anaemia in AC genotype patient — requires clinical correlation and monitoring',
    },
    {
      id: 'res-007', studentId: 'stu-007', requestingStaffId: 'staff-001', requestingStaffName: 'Dr. Olusegun Bello',
      type: 'Urinalysis', testName: 'Urine Dipstick + Microscopy', facility: 'Lab',
      uploadedByTechnicianId: 'tech-001', uploadedByTechnicianName: 'Amaka Okafor',
      uploadedAt: '2024-01-04T16:00:00Z', status: 'Completed',
      findings: 'Nitrites positive, leucocytes 3+, RBCs 1+. Microscopy: Pus cells >50/HPF. Consistent with acute cystitis.',
      fileSimulatedUrl: '/results/urine-stu007-jan24.pdf', fileType: 'PDF',
      criticalFlag: false,
    },
    {
      id: 'res-008', studentId: 'stu-008', requestingStaffId: 'staff-001', requestingStaffName: 'Dr. Olusegun Bello',
      type: 'ECG', testName: '12-Lead ECG', facility: 'Radiology',
      uploadedByTechnicianId: 'tech-001', uploadedByTechnicianName: 'Amaka Okafor',
      uploadedAt: '2023-11-30T10:00:00Z', status: 'Flagged',
      findings: 'Left ventricular hypertrophy pattern (Sokolow-Lyon criteria met). QTc 445ms — borderline prolonged. Consistent with hypertensive heart disease.',
      fileSimulatedUrl: '/results/ecg-stu008-nov23.pdf', fileType: 'PDF',
      criticalFlag: true, criticalFlagReason: 'LVH in young hypertensive patient — urgent cardiology review required',
    },
    {
      id: 'res-009', studentId: 'stu-001', requestingStaffId: 'staff-001', requestingStaffName: 'Dr. Olusegun Bello',
      type: 'Blood Test', testName: 'Total IgE and RAST Panel', facility: 'Lab',
      uploadedByTechnicianId: 'tech-001', uploadedByTechnicianName: 'Amaka Okafor',
      uploadedAt: '2023-11-20T12:00:00Z', status: 'Completed',
      findings: 'Total IgE markedly elevated at 480 IU/mL. RAST: Penicillin class 6 (highest), Peanut class 5. Confirms severe atopic sensitisation.',
      fileSimulatedUrl: '/results/ige-stu001-nov23.pdf', fileType: 'PDF',
      criticalFlag: false,
    },
    {
      id: 'res-010', studentId: 'stu-002', requestingStaffId: 'staff-001', requestingStaffName: 'Dr. Olusegun Bello',
      type: 'Imaging', testName: 'Renal Ultrasound', facility: 'Radiology',
      uploadedByTechnicianId: 'tech-001', uploadedByTechnicianName: 'Amaka Okafor',
      uploadedAt: '2024-01-12T14:00:00Z', status: 'Pending',
      findings: 'Pending radiologist report.',
      fileSimulatedUrl: '/results/pending', fileType: 'JPEG',
      criticalFlag: false,
    },
  ];

  const auditLogs: AuditLog[] = [
    { id: 'aud-001', timestamp: '2024-01-15T07:45:00Z', userId: 'staff-001', userName: 'Dr. Olusegun Bello', userRole: 'medical_staff', action: 'LOGIN', resourceType: 'System', resourceDescription: 'User logged in', ipAddress: '192.168.1.42', sessionId: 'sess-001', status: 'Success' },
    { id: 'aud-002', timestamp: '2024-01-15T08:00:00Z', userId: 'staff-001', userName: 'Dr. Olusegun Bello', userRole: 'medical_staff', action: 'VIEW_RECORD', resourceType: 'Student', resourceId: 'stu-001', resourceDescription: 'Viewed patient record: Simioluwa Okonkwo', ipAddress: '192.168.1.42', sessionId: 'sess-001', status: 'Success' },
    { id: 'aud-003', timestamp: '2024-01-15T08:15:00Z', userId: 'staff-001', userName: 'Dr. Olusegun Bello', userRole: 'medical_staff', action: 'CREATE_RECORD', resourceType: 'Student', resourceId: 'enc-001', resourceDescription: 'Created encounter for Simioluwa Okonkwo', ipAddress: '192.168.1.42', sessionId: 'sess-001', status: 'Success' },
    { id: 'aud-004', timestamp: '2024-01-15T09:00:00Z', userId: 'pharm-001', userName: 'Pharmacist Remi Soyinka', userRole: 'pharmacy', action: 'LOGIN', resourceType: 'System', resourceDescription: 'User logged in', ipAddress: '192.168.1.55', sessionId: 'sess-002', status: 'Success' },
    { id: 'aud-005', timestamp: '2024-01-15T09:10:00Z', userId: 'pharm-001', userName: 'Pharmacist Remi Soyinka', userRole: 'pharmacy', action: 'DISPENSE_MEDICATION', resourceType: 'Requisition', resourceId: 'req-004', resourceDescription: 'Dispensed medication for Tunde Adeyemi — Salbutamol Inhaler', ipAddress: '192.168.1.55', sessionId: 'sess-002', changeDetails: 'Status changed from Approved to Dispensed', status: 'Success' },
    { id: 'aud-006', timestamp: '2024-01-15T09:30:00Z', userId: 'student-001', userName: 'Simioluwa Okonkwo', userRole: 'student', action: 'LOGIN', resourceType: 'System', resourceDescription: 'Student logged in', ipAddress: '192.168.1.88', sessionId: 'sess-003', status: 'Success' },
    { id: 'aud-007', timestamp: '2024-01-15T09:35:00Z', userId: 'student-001', userName: 'Simioluwa Okonkwo', userRole: 'student', action: 'VIEW_RECORD', resourceType: 'Student', resourceId: 'stu-001', resourceDescription: 'Student viewed own health record', ipAddress: '192.168.1.88', sessionId: 'sess-003', status: 'Success' },
    { id: 'aud-008', timestamp: '2024-01-15T09:40:00Z', userId: 'student-001', userName: 'Simioluwa Okonkwo', userRole: 'student', action: 'CREATE_RECORD', resourceType: 'Requisition', resourceId: 'req-001', resourceDescription: 'Submitted medication requisition — Headache/Fever', ipAddress: '192.168.1.88', sessionId: 'sess-003', status: 'Success' },
    { id: 'aud-009', timestamp: '2024-01-15T10:00:00Z', userId: 'tech-001', userName: 'Amaka Okafor', userRole: 'technician', action: 'LOGIN', resourceType: 'System', resourceDescription: 'Technician logged in', ipAddress: '192.168.1.71', sessionId: 'sess-004', status: 'Success' },
    { id: 'aud-010', timestamp: '2024-01-15T10:15:00Z', userId: 'tech-001', userName: 'Amaka Okafor', userRole: 'technician', action: 'UPLOAD_RESULT', resourceType: 'DiagnosticResult', resourceId: 'res-001', resourceDescription: 'Uploaded FBC result for Simioluwa Okonkwo', ipAddress: '192.168.1.71', sessionId: 'sess-004', status: 'Success' },
    { id: 'aud-011', timestamp: '2024-01-14T16:00:00Z', userId: 'admin-001', userName: 'Chidi Okwu', userRole: 'admin', action: 'LOGIN', resourceType: 'System', resourceDescription: 'Admin logged in', ipAddress: '192.168.1.10', sessionId: 'sess-005', status: 'Success' },
    { id: 'aud-012', timestamp: '2024-01-14T16:10:00Z', userId: 'admin-001', userName: 'Chidi Okwu', userRole: 'admin', action: 'VIEW_AUDIT_LOG', resourceType: 'System', resourceDescription: 'Viewed system audit logs', ipAddress: '192.168.1.10', sessionId: 'sess-005', status: 'Success' },
    { id: 'aud-013', timestamp: '2024-01-14T16:20:00Z', userId: 'admin-001', userName: 'Chidi Okwu', userRole: 'admin', action: 'CREATE_USER', resourceType: 'User', resourceId: 'stu-user-008', resourceDescription: 'Created user account for Seun Adeola', ipAddress: '192.168.1.10', sessionId: 'sess-005', changeDetails: 'New student account created', status: 'Success' },
    { id: 'aud-014', timestamp: '2024-01-14T16:30:00Z', userId: 'admin-001', userName: 'Chidi Okwu', userRole: 'admin', action: 'EXPORT_REPORT', resourceType: 'Report', resourceDescription: 'Exported monthly health statistics report — January 2024', ipAddress: '192.168.1.10', sessionId: 'sess-005', status: 'Success' },
    { id: 'aud-015', timestamp: '2024-01-13T14:00:00Z', userId: 'staff-001', userName: 'Dr. Olusegun Bello', userRole: 'medical_staff', action: 'APPROVE_REQUISITION', resourceType: 'Requisition', resourceId: 'req-002', resourceDescription: 'Approved requisition for Emeka Nwosu — Cough/Sore Throat', ipAddress: '192.168.1.42', sessionId: 'sess-006', changeDetails: 'Status changed from Pending Review to Approved', status: 'Success' },
    { id: 'aud-016', timestamp: '2024-01-13T14:10:00Z', userId: 'staff-001', userName: 'Dr. Olusegun Bello', userRole: 'medical_staff', action: 'VIEW_RECORD', resourceType: 'Student', resourceId: 'stu-002', resourceDescription: 'Viewed patient record: Emeka Nwosu', ipAddress: '192.168.1.42', sessionId: 'sess-006', status: 'Success' },
    { id: 'aud-017', timestamp: '2024-01-12T11:30:00Z', userId: 'staff-001', userName: 'Dr. Olusegun Bello', userRole: 'medical_staff', action: 'APPROVE_REQUISITION', resourceType: 'Requisition', resourceId: 'req-003', resourceDescription: 'Approved requisition for Fatima Aliyu — Gastroenteritis', ipAddress: '192.168.1.42', sessionId: 'sess-007', changeDetails: 'Status changed from Pending Review to Approved', status: 'Success' },
    { id: 'aud-018', timestamp: '2024-01-11T10:00:00Z', userId: 'staff-001', userName: 'Dr. Olusegun Bello', userRole: 'medical_staff', action: 'APPROVE_REQUISITION', resourceType: 'Requisition', resourceId: 'req-004', resourceDescription: 'Approved urgent requisition for Tunde Adeyemi — Asthma', ipAddress: '192.168.1.42', sessionId: 'sess-008', status: 'Success' },
    { id: 'aud-019', timestamp: '2024-01-10T09:00:00Z', userId: 'staff-001', userName: 'Dr. Olusegun Bello', userRole: 'medical_staff', action: 'REJECT_REQUISITION', resourceType: 'Requisition', resourceId: 'req-005', resourceDescription: 'Rejected requisition for Ngozi Eze — Abdominal Pain', ipAddress: '192.168.1.42', sessionId: 'sess-009', changeDetails: 'Status changed from Pending Review to Rejected', status: 'Success' },
    { id: 'aud-020', timestamp: '2024-01-09T14:00:00Z', userId: 'staff-001', userName: 'Dr. Olusegun Bello', userRole: 'medical_staff', action: 'APPROVE_REQUISITION', resourceType: 'Requisition', resourceId: 'req-006', resourceDescription: 'Approved urgent requisition for Ibrahim Musa — Fever', ipAddress: '192.168.1.42', sessionId: 'sess-010', status: 'Success' },
    { id: 'aud-021', timestamp: '2024-01-09T12:00:00Z', userId: 'tech-001', userName: 'Amaka Okafor', userRole: 'technician', action: 'UPLOAD_RESULT', resourceType: 'DiagnosticResult', resourceId: 'res-002', resourceDescription: 'Uploaded U&E results for Emeka Nwosu — CRITICAL FLAG RAISED', ipAddress: '192.168.1.71', sessionId: 'sess-011', status: 'Success' },
    { id: 'aud-022', timestamp: '2024-01-08T15:00:00Z', userId: 'tech-001', userName: 'Amaka Okafor', userRole: 'technician', action: 'UPLOAD_RESULT', resourceType: 'DiagnosticResult', resourceId: 'res-008', resourceDescription: 'Uploaded ECG for Seun Adeola — LVH flagged', ipAddress: '192.168.1.71', sessionId: 'sess-012', status: 'Success' },
    { id: 'aud-023', timestamp: '2024-01-07T14:00:00Z', userId: 'pharm-001', userName: 'Pharmacist Remi Soyinka', userRole: 'pharmacy', action: 'DISPENSE_MEDICATION', resourceType: 'Requisition', resourceId: 'req-008', resourceDescription: 'Dispensed medication for Seun Adeola — Paracetamol', ipAddress: '192.168.1.55', sessionId: 'sess-013', changeDetails: 'Status: Approved → Dispensed', status: 'Success' },
    { id: 'aud-024', timestamp: '2024-01-06T16:00:00Z', userId: 'admin-001', userName: 'Chidi Okwu', userRole: 'admin', action: 'RESET_PASSWORD', resourceType: 'User', resourceId: 'stu-user-003', resourceDescription: 'Reset password for Fatima Aliyu (student)', ipAddress: '192.168.1.10', sessionId: 'sess-014', status: 'Success' },
    { id: 'aud-025', timestamp: '2024-01-05T09:00:00Z', userId: 'staff-001', userName: 'Dr. Olusegun Bello', userRole: 'medical_staff', action: 'EDIT_RECORD', resourceType: 'Student', resourceId: 'stu-003', resourceDescription: 'Updated allergy record for Fatima Aliyu', ipAddress: '192.168.1.42', sessionId: 'sess-015', changeDetails: 'Added Sulfonamide allergy', status: 'Success' },
    { id: 'aud-026', timestamp: '2024-01-04T11:00:00Z', userId: 'admin-001', userName: 'Chidi Okwu', userRole: 'admin', action: 'DEACTIVATE_USER', resourceType: 'User', resourceDescription: 'Deactivated former student account (graduated)', ipAddress: '192.168.1.10', sessionId: 'sess-016', changeDetails: 'Account deactivated — graduation', status: 'Success' },
    { id: 'aud-027', timestamp: '2024-01-03T08:00:00Z', userId: 'tech-001', userName: 'Amaka Okafor', userRole: 'technician', action: 'UPLOAD_RESULT', resourceType: 'DiagnosticResult', resourceId: 'res-007', resourceDescription: 'Uploaded urine microscopy for Chidinma Obi', ipAddress: '192.168.1.71', sessionId: 'sess-017', status: 'Success' },
    { id: 'aud-028', timestamp: '2024-01-02T16:30:00Z', userId: 'student-001', userName: 'Simioluwa Okonkwo', userRole: 'student', action: 'VIEW_RECORD', resourceType: 'DiagnosticResult', resourceId: 'res-001', resourceDescription: 'Student viewed own lab result', ipAddress: '192.168.1.99', sessionId: 'sess-018', status: 'Success' },
    { id: 'aud-029', timestamp: '2023-12-28T10:00:00Z', userId: 'admin-001', userName: 'Chidi Okwu', userRole: 'admin', action: 'EXPORT_REPORT', resourceType: 'Report', resourceDescription: 'Exported end-of-year summary report — December 2023', ipAddress: '192.168.1.10', sessionId: 'sess-019', status: 'Success' },
    { id: 'aud-030', timestamp: '2023-12-20T13:00:00Z', userId: 'pharm-001', userName: 'Pharmacist Remi Soyinka', userRole: 'pharmacy', action: 'DISPENSE_MEDICATION', resourceType: 'Requisition', resourceId: 'req-009', resourceDescription: 'Dispensed Salbutamol inhaler for Simioluwa Okonkwo', ipAddress: '192.168.1.55', sessionId: 'sess-020', status: 'Success' },
    { id: 'aud-031', timestamp: '2023-12-15T09:00:00Z', userId: 'staff-001', userName: 'Dr. Olusegun Bello', userRole: 'medical_staff', action: 'CREATE_RECORD', resourceType: 'Student', resourceId: 'enc-005', resourceDescription: 'Created encounter for Ngozi Eze — Tonsillitis', ipAddress: '192.168.1.42', sessionId: 'sess-021', status: 'Success' },
    { id: 'aud-032', timestamp: '2023-12-05T17:00:00Z', userId: 'staff-001', userName: 'Dr. Olusegun Bello', userRole: 'medical_staff', action: 'REJECT_REQUISITION', resourceType: 'Requisition', resourceId: 'req-010', resourceDescription: 'Rejected requisition for Emeka Nwosu — Insomnia/Anxiety', ipAddress: '192.168.1.42', sessionId: 'sess-022', status: 'Success' },
    { id: 'aud-033', timestamp: '2023-11-30T10:30:00Z', userId: 'tech-001', userName: 'Amaka Okafor', userRole: 'technician', action: 'UPLOAD_RESULT', resourceType: 'DiagnosticResult', resourceId: 'res-006', resourceDescription: 'Uploaded Hb electrophoresis for Ibrahim Musa', ipAddress: '192.168.1.71', sessionId: 'sess-023', status: 'Success' },
    { id: 'aud-034', timestamp: '2023-11-20T14:00:00Z', userId: 'admin-001', userName: 'Chidi Okwu', userRole: 'admin', action: 'CREATE_USER', resourceType: 'User', resourceId: 'stu-user-007', resourceDescription: 'Created user account for Chidinma Obi', ipAddress: '192.168.1.10', sessionId: 'sess-024', status: 'Success' },
    { id: 'aud-035', timestamp: '2023-11-10T08:00:00Z', userId: 'pharm-001', userName: 'Pharmacist Remi Soyinka', userRole: 'pharmacy', action: 'DISPENSE_MEDICATION', resourceType: 'Requisition', resourceId: 'req-011', resourceDescription: 'Dispensed antihistamine for Fatima Aliyu', ipAddress: '192.168.1.55', sessionId: 'sess-025', status: 'Success' },
  ];

  const systemAlerts: SystemAlert[] = [
    {
      id: 'alert-001', type: 'Critical', title: 'Critical Lab Result — Emeka Nwosu',
      message: 'U&E results for Emeka Nwosu show elevated creatinine (145 μmol/L) and hyperkalaemia (K+ 5.6). Immediate clinical review required.',
      timestamp: '2024-01-09T12:05:00Z', isResolved: false,
    },
    {
      id: 'alert-002', type: 'Critical', title: 'LVH on ECG — Seun Adeola',
      message: 'ECG for Seun Adeola shows left ventricular hypertrophy pattern. Urgent cardiology review needed for this hypertensive patient.',
      timestamp: '2023-11-30T10:30:00Z', isResolved: false,
    },
    {
      id: 'alert-003', type: 'Warning', title: '5 Requisitions Pending Review',
      message: 'There are currently 5 medication requisitions awaiting medical staff review. Oldest pending request is 48 hours old.',
      timestamp: '2024-01-14T08:00:00Z', isResolved: false,
    },
    {
      id: 'alert-004', type: 'Warning', title: 'Penicillin Allergy Alert — Simioluwa Okonkwo',
      message: 'Patient Simioluwa Okonkwo (stu-001) has a life-threatening Penicillin allergy on record. Ensure all prescribers are aware before prescribing.',
      timestamp: '2024-01-10T09:00:00Z', isResolved: false,
    },
    {
      id: 'alert-005', type: 'Info', title: 'System Backup Completed',
      message: 'Scheduled system backup completed successfully at 02:00 WAT. All data is secure.',
      timestamp: '2024-01-15T02:00:00Z', isResolved: true, resolvedBy: 'System',
    },
  ];

  const referrals: Referral[] = [
    {
      id: 'ref-001',
      studentId: 'stu-002',
      studentName: 'Emeka Nwosu',
      requestingStaffId: 'staff-001',
      requestingStaffName: 'Dr. Olusegun Bello',
      specialistId: SPECIALIST_USER_ID,
      specialistName: 'Dr. Nnenna Udeh',
      specialty: 'Cardiology',
      reason: 'Persistent hypertension with LVH pattern on ECG requiring specialist evaluation.',
      priority: 'Urgent',
      status: 'Requested',
      requestedAt: '2024-01-15T09:20:00Z',
    },
    {
      id: 'ref-002',
      studentId: 'stu-008',
      studentName: 'Seun Adeola',
      requestingStaffId: 'staff-001',
      requestingStaffName: 'Dr. Olusegun Bello',
      specialistId: SPECIALIST_USER_ID,
      specialistName: 'Dr. Nnenna Udeh',
      specialty: 'Cardiology',
      reason: 'Follow-up specialist review for exertional chest pain and chronic hypertension.',
      priority: 'Routine',
      status: 'Accepted',
      requestedAt: '2024-01-12T12:00:00Z',
      reviewedAt: '2024-01-13T08:15:00Z',
    },
  ];

  const policyVersions: PolicyVersion[] = [
    {
      id: 'policy-privacy-v1',
      policyType: 'privacy',
      version: '1.0',
      title: 'Privacy Policy',
      summary: 'Initial privacy framework for student health records handling.',
      effectiveFrom: '2024-01-01T00:00:00Z',
      publishedByUserId: 'admin-001',
      publishedByUserName: 'Chidi Okwu',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'policy-terms-v1',
      policyType: 'terms',
      version: '1.0',
      title: 'Terms and Conditions',
      summary: 'Initial terms governing acceptable use and responsibilities.',
      effectiveFrom: '2024-01-01T00:00:00Z',
      publishedByUserId: 'admin-001',
      publishedByUserName: 'Chidi Okwu',
      createdAt: '2024-01-01T00:00:00Z',
    },
  ];

  const policyAcceptances: PolicyAcceptance[] = systemUsers.flatMap((user) => [
    {
      id: `${user.id}-privacy-v1`,
      userId: user.id,
      policyType: 'privacy',
      acceptedVersion: '1.0',
      acceptedAt: '2024-01-10T08:00:00Z',
      method: 'in-app',
    },
    {
      id: `${user.id}-terms-v1`,
      userId: user.id,
      policyType: 'terms',
      acceptedVersion: '1.0',
      acceptedAt: '2024-01-10T08:05:00Z',
      method: 'in-app',
    },
  ]);

  const dataRequests: DataRequest[] = [
    {
      id: 'dr-001',
      userId: 'student-001',
      userName: 'Simioluwa Okonkwo',
      userRole: 'student',
      requestType: 'Access',
      requestDetails: 'Requesting complete copy of my encounter history for scholarship documentation.',
      auditTicketId: 'DR-20260110-3021',
      status: 'Completed',
      createdAt: '2026-01-10T09:15:00Z',
      updatedAt: '2026-01-14T13:40:00Z',
      adminReviewerId: 'admin-001',
      adminReviewerName: 'Chidi Okwu',
      adminNotes: 'Identity verified and encrypted export delivered through secure channel.',
    },
    {
      id: 'dr-002',
      userId: 'student-001',
      userName: 'Simioluwa Okonkwo',
      userRole: 'student',
      requestType: 'Correction',
      requestDetails: 'My emergency contact phone number should be updated to 08087654322.',
      auditTicketId: 'DR-20260208-4493',
      status: 'Under Review',
      createdAt: '2026-02-08T10:05:00Z',
      updatedAt: '2026-02-08T10:05:00Z',
    },
  ];

  const complaints: Complaint[] = [
    {
      id: 'cmp-001',
      ticketId: 'CMP-20260321-5512',
      submittedByUserId: 'student-001',
      submittedByName: 'Simioluwa Okonkwo',
      submittedByRole: 'student',
      subject: 'No update on medication tracking for over 24 hours',
      details: 'My approved inhaler request has had no tracking update for 24+ hours. Breathing episodes are getting worse.',
      concernedDepartment: 'Pharmacy',
      severity: 'Critical',
      status: 'Resolved',
      createdAt: '2026-03-21T09:00:00Z',
      updatedAt: '2026-03-21T12:15:00Z',
      adminReviewerId: 'admin-001',
      adminReviewerName: 'Chidi Okwu',
      forwardNote: 'Please confirm queue position and expected pickup time urgently.',
      forwardedAt: '2026-03-21T09:20:00Z',
      forwardedToDepartment: 'Pharmacy',
      forwardedToRole: 'pharmacy',
      forwardedToUserId: 'pharm-001',
      forwardedToUserName: 'Pharmacist Remi Soyinka',
      departmentFeedback: 'Medication was held due to stock reconciliation. Replacement stock arrived and item is now ready.',
      departmentFeedbackAt: '2026-03-21T11:05:00Z',
      departmentFeedbackByUserId: 'pharm-001',
      departmentFeedbackByUserName: 'Pharmacist Remi Soyinka',
      adminResponse: 'Your medication is now marked ready for pickup. We have also tightened urgent queue escalation checks.',
      adminRespondedAt: '2026-03-21T12:15:00Z',
      adminResponderId: 'admin-001',
      adminResponderName: 'Chidi Okwu',
    },
    {
      id: 'cmp-002',
      ticketId: 'CMP-20260325-8840',
      submittedByUserId: 'tech-001',
      submittedByName: 'Amaka Okafor',
      submittedByRole: 'technician',
      subject: 'Intermittent scanner outage in Laboratory bay 2',
      details: 'Image scanner in bay 2 keeps disconnecting every 15-20 minutes and delays upload workflow.',
      concernedDepartment: 'IT / Technical Support',
      severity: 'Moderate',
      status: 'Under Review',
      createdAt: '2026-03-25T08:40:00Z',
      updatedAt: '2026-03-25T08:40:00Z',
    },
  ];

  localStorage.setItem(StorageKey.STUDENTS, JSON.stringify(students));
  localStorage.setItem(StorageKey.USERS, JSON.stringify(systemUsers));
  localStorage.setItem(StorageKey.ENCOUNTERS, JSON.stringify(encounters));
  localStorage.setItem(StorageKey.REQUISITIONS, JSON.stringify(requisitions));
  localStorage.setItem(StorageKey.RESULTS, JSON.stringify(diagnosticResults));
  localStorage.setItem(StorageKey.REFERRALS, JSON.stringify(referrals));
  localStorage.setItem(StorageKey.AUDIT_LOGS, JSON.stringify(auditLogs));
  localStorage.setItem(StorageKey.ALERTS, JSON.stringify(systemAlerts));
  localStorage.setItem(StorageKey.POLICY_VERSIONS, JSON.stringify(policyVersions));
  localStorage.setItem(StorageKey.POLICY_ACCEPTANCES, JSON.stringify(policyAcceptances));
  localStorage.setItem(StorageKey.DATA_REQUESTS, JSON.stringify(dataRequests));
  localStorage.setItem(StorageKey.COMPLAINTS, JSON.stringify(complaints));
  localStorage.setItem(INITIALIZED_KEY, 'true');
}
