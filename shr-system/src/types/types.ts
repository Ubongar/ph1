export type UserRole = 'student' | 'medical_staff' | 'technician' | 'pharmacy' | 'specialist' | 'admin';

export interface User {
  id: string; name: string; role: UserRole; email: string;
  avatarInitials: string; department?: string; staffId?: string;
}
export interface Student {
  id: string; userId: string; name: string; dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other'; department: string; level: string;
  phoneNumber: string; email: string;
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  genotype: 'AA' | 'AS' | 'SS' | 'AC';
  allergies: Allergy[]; chronicConditions: string[];
  emergencyContact: EmergencyContact;
}
export interface Allergy {
  id: string; allergen: string;
  severity: 'Mild' | 'Moderate' | 'Severe' | 'Life-threatening';
  reaction: string; dateRecorded: string;
}
export interface EmergencyContact { name: string; relationship: string; phoneNumber: string; }
export interface Encounter {
  id: string; studentId: string; date: string;
  facility: 'Amphi Clinic' | 'BUTH' | 'Radiology' | 'Lab';
  attendingStaffId: string; attendingStaffName: string;
  chiefComplaint: string; subjectiveNotes: string; objectiveNotes: string;
  vitals: Vitals; diagnoses: Diagnosis[]; treatmentPlan: string;
  prescriptions: Prescription[]; followUpRequired: boolean;
  followUpDate?: string; status: 'Active' | 'Resolved' | 'Referred';
}
export interface Vitals {
  bloodPressureSystolic: number; bloodPressureDiastolic: number;
  heartRate: number; temperature: number; respiratoryRate: number;
  oxygenSaturation: number; weight: number; height: number; bmi?: number;
}
export interface Diagnosis {
  id: string; icd10Code: string; description: string;
  type: 'Primary' | 'Secondary' | 'Differential';
}
export interface Prescription {
  id: string; medicationName: string; dosage: string;
  frequency: string; duration: string;
  route: 'Oral' | 'Topical' | 'Intravenous' | 'Intramuscular' | 'Inhaled';
  notes?: string;
}
export type RequisitionStatus =
  'Pending Review' | 'Approved' | 'Rejected' | 'Ready for Pickup' | 'Dispensed' | 'Cancelled';
export interface MedicationRequisition {
  id: string; studentId: string; studentName: string; submittedAt: string;
  symptoms: string[]; symptomDescription: string;
  severity: 'Mild' | 'Moderate'; requestedMedications: string[];
  status: RequisitionStatus; reviewedByStaffId?: string;
  reviewedByStaffName?: string; reviewedAt?: string; doctorNotes?: string;
  approvedMedications?: ApprovedMedication[];
  pharmacyNotes?: string; dispensedAt?: string;
  priority: 'Normal' | 'Urgent';
}
export interface ApprovedMedication {
  name: string; dosage: string; quantity: number; frequency: string; duration: string;
}
export type ReferralPriority = 'Routine' | 'Urgent' | 'Emergency';
export type ReferralStatus = 'Requested' | 'Under Review' | 'Accepted' | 'Declined' | 'In Consultation' | 'Completed' | 'Cancelled';
export interface Referral {
  id: string;
  studentId: string;
  studentName: string;
  requestingStaffId: string;
  requestingStaffName: string;
  specialistId?: string;
  specialistName?: string;
  parentReferralId?: string;
  specialty: string;
  reason: string;
  priority: ReferralPriority;
  status: ReferralStatus;
  requestedAt: string;
  reviewedAt?: string;
  consultationDate?: string;
  consultationDurationMinutes?: number;
  consultationOutcome?: 'Resolved' | 'Improved' | 'No Change' | 'Escalated' | 'Follow-up Required';
  complianceStatus?: 'Compliant' | 'Delayed' | 'Overdue';
  consultationNotes?: string;
  technicianReviewedById?: string;
  technicianReviewedByName?: string;
  technicianReviewedAt?: string;
  technicianReviewNotes?: string;
}
export type ResultType = 'Blood Test' | 'Urinalysis' | 'Imaging' | 'Microbiology' | 'Histology' | 'ECG' | 'Other';
export type ResultStatus = 'Pending' | 'Processing' | 'Completed' | 'Flagged' | 'Requires Review';
export interface DiagnosticResult {
  id: string; studentId: string; requestingStaffId: string; requestingStaffName: string;
  type: ResultType; testName: string; facility: 'Radiology' | 'Lab';
  uploadedByTechnicianId: string; uploadedByTechnicianName: string;
  uploadedAt: string; status: ResultStatus; findings: string;
  fileSimulatedUrl: string; fileType: 'PDF' | 'JPEG' | 'PNG' | 'DICOM';
  criticalFlag: boolean; criticalFlagReason?: string;
}
export type AuditAction =
  'LOGIN' | 'LOGOUT' | 'VIEW_RECORD' | 'EDIT_RECORD' | 'CREATE_RECORD'
  | 'APPROVE_REQUISITION' | 'REJECT_REQUISITION' | 'UPLOAD_RESULT'
  | 'DISPENSE_MEDICATION' | 'CREATE_USER' | 'DEACTIVATE_USER'
  | 'RESET_PASSWORD' | 'EXPORT_REPORT' | 'VIEW_AUDIT_LOG'
  | 'CREATE_REFERRAL' | 'ACCEPT_REFERRAL' | 'COMPLETE_REFERRAL' | 'DECLINE_REFERRAL'
  | 'SUBMIT_CONSULTATION_NOTES' | 'REFER_TO_SPECIALIST' | 'CLOSE_REFERRAL' | 'GENERATE_QA_REPORT'
  | 'SUBMIT_DATA_REQUEST' | 'REVIEW_DATA_REQUEST' | 'UPDATE_POLICY_VERSION' | 'ACCEPT_POLICY_UPDATE'
  | 'SUBMIT_COMPLAINT' | 'FORWARD_COMPLAINT' | 'SUBMIT_COMPLAINT_FEEDBACK' | 'RESPOND_COMPLAINT';
export interface AuditLog {
  id: string; timestamp: string; userId: string; userName: string;
  userRole: UserRole; action: AuditAction;
  resourceType: 'Student' | 'Requisition' | 'DiagnosticResult' | 'User' | 'System' | 'Report' | 'Referral' | 'DataRequest' | 'Policy' | 'Complaint';
  resourceId?: string; resourceDescription: string;
  ipAddress: string; sessionId: string; changeDetails?: string;
  status: 'Success' | 'Failed' | 'Suspicious';
}
export interface SystemUser {
  id: string; name: string; email: string; role: UserRole;
  department?: string; staffId?: string; matricNumber?: string;
  isActive: boolean; createdAt: string; lastLogin?: string; createdBy: string;
}
export interface SystemAlert {
  id: string; type: 'Critical' | 'Warning' | 'Info';
  title: string; message: string; timestamp: string;
  isResolved: boolean; resolvedBy?: string;
}
export interface SystemMetrics {
  totalStudents: number; activeUsers: number; pendingRequisitions: number;
  pendingResults: number; systemUptime: number;
  lastBackup: string; totalEncountersThisMonth: number; criticalAlerts: number;
}

export type DataRequestType = 'Access' | 'Correction' | 'Deletion';
export type DataRequestStatus = 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Completed';

export interface DataRequest {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  requestType: DataRequestType;
  requestDetails: string;
  auditTicketId: string;
  status: DataRequestStatus;
  createdAt: string;
  updatedAt: string;
  adminReviewerId?: string;
  adminReviewerName?: string;
  adminNotes?: string;
}

export type ComplaintSeverity = 'Low' | 'Moderate' | 'High' | 'Critical';
export type ComplaintStatus = 'Submitted' | 'Under Review' | 'Forwarded' | 'Awaiting Department Feedback' | 'Resolved' | 'Closed';

export type ComplaintEscalationRoute = 'department-lead' | 'admin-lead' | 'emergency';
export type ComplaintOwnershipStatus = 'Unassigned' | 'Pending Acknowledgement' | 'Acknowledged' | 'Timed Out';
export type ComplaintContactChannel = 'in-app' | 'sms' | 'email' | 'call';

export interface ComplaintEvidenceItem {
  id: string;
  label: string;
  url: string;
  uploadedAt: string;
  uploadedByUserId: string;
  uploadedByUserName: string;
  note?: string;
}

export interface ComplaintTimelineEvent {
  id: string;
  createdAt: string;
  actorUserId: string;
  actorName: string;
  actorRole: UserRole | 'system';
  eventType:
    | 'Submitted'
    | 'Forwarded'
    | 'Escalated'
    | 'Acknowledged'
    | 'OwnershipTimedOut'
    | 'DepartmentFeedback'
    | 'ThreadMessage'
    | 'AdminResponse'
    | 'ReadReceipt'
    | 'EvidenceAdded'
    | 'RootCauseUpdated'
    | 'ResolutionRated'
    | 'CriticalIncidentTriggered';
  note: string;
  metadata?: string;
}

export interface Complaint {
  id: string;
  ticketId: string;
  submittedByUserId: string;
  submittedByName: string;
  submittedByRole: UserRole;
  subject: string;
  details: string;
  concernedDepartment: string;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  createdAt: string;
  updatedAt: string;
  adminReviewerId?: string;
  adminReviewerName?: string;
  forwardNote?: string;
  forwardedAt?: string;
  forwardedToDepartment?: string;
  forwardedToRole?: UserRole;
  forwardedToUserId?: string;
  forwardedToUserName?: string;
  departmentFeedback?: string;
  departmentFeedbackAt?: string;
  departmentFeedbackByUserId?: string;
  departmentFeedbackByUserName?: string;
  adminResponse?: string;
  adminRespondedAt?: string;
  adminResponderId?: string;
  adminResponderName?: string;
  ownershipStatus?: ComplaintOwnershipStatus;
  ownershipDueAt?: string;
  acknowledgedAt?: string;
  acknowledgedByUserId?: string;
  acknowledgedByUserName?: string;
  acknowledgementTimeoutCount?: number;
  escalationLevel?: 0 | 1 | 2 | 3;
  escalationRoute?: ComplaintEscalationRoute;
  escalationStepDueAt?: string;
  lastEscalationAt?: string;
  slaEscalatedAt?: string;
  criticalIncidentChannels?: ComplaintContactChannel[];
  isLifeThreatening?: boolean;
  rootCauseSummary?: string;
  correctiveAction?: string;
  preventionAction?: string;
  responseTemplateKey?: string;
  complainantLastViewedAt?: string;
  assigneeLastViewedAt?: string;
  adminLastViewedAt?: string;
  resolutionRating?: 1 | 2 | 3 | 4 | 5;
  resolutionRatingComment?: string;
  resolutionRatedAt?: string;
  resolutionRatedByUserId?: string;
  evidenceItems?: ComplaintEvidenceItem[];
  timeline?: ComplaintTimelineEvent[];
}

export type PolicyType = 'privacy' | 'terms';

export interface PolicyVersion {
  id: string;
  policyType: PolicyType;
  version: string;
  title: string;
  summary: string;
  effectiveFrom: string;
  publishedByUserId: string;
  publishedByUserName: string;
  createdAt: string;
}

export interface PolicyAcceptance {
  id: string;
  userId: string;
  policyType: PolicyType;
  acceptedVersion: string;
  acceptedAt: string;
  method: 'in-app';
}

export type OfflineMutationAction = 'create' | 'update' | 'delete';
export type OfflineMutationStatus = 'pending' | 'synced' | 'failed' | 'conflict' | 'discarded';

export interface OfflineMutation {
  id: string;
  storageKey: string;
  entityId: string;
  action: OfflineMutationAction;
  payload: unknown;
  beforeSnapshot?: unknown;
  queuedAt: string;
  attempts: number;
  status: OfflineMutationStatus;
  queuedByUserId: string;
  queuedByRole: UserRole;
  deviceId: string;
  lastError?: string;
  syncedAt?: string;
}

export type OfflineConflictResolution = 'pending' | 'keep_local' | 'keep_remote';

export interface OfflineConflict {
  id: string;
  mutationId: string;
  storageKey: string;
  entityId: string;
  reason: string;
  localValue: unknown;
  remoteValue: unknown;
  detectedAt: string;
  resolution: OfflineConflictResolution;
  resolvedAt?: string;
}

export interface OfflineSyncSnapshot {
  isOnline: boolean;
  pendingCount: number;
  failedCount: number;
  conflictCount: number;
  lastSyncedAt: string | null;
  outbox: OfflineMutation[];
  conflicts: OfflineConflict[];
}

export interface OfflineSyncRunSummary {
  processed: number;
  synced: number;
  conflicts: number;
  failed: number;
  skipped: number;
  lastSyncedAt: string | null;
}

export interface OfflineSyncBundle {
  bundleVersion: 1;
  exportedAt: string;
  deviceId: string;
  saltB64: string;
  ivB64: string;
  encryptedPayloadB64: string;
}
