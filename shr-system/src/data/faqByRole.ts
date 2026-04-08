import type { UserRole } from '../types/types';

export type FaqCategory =
  | 'Getting Started'
  | 'Account and Access'
  | 'Security and Privacy'
  | 'PWA and Mobile'
  | 'Offline and Sync'
  | 'Workflow and Operations'
  | 'Troubleshooting';

export interface FaqItem {
  question: string;
  answer: string;
  category: FaqCategory;
}

export const FAQ_ROLE_ORDER: UserRole[] = [
  'student',
  'medical_staff',
  'technician',
  'pharmacy',
  'specialist',
  'admin',
];

export const FAQ_ROLE_LABELS: Record<UserRole, string> = {
  student: 'Student',
  medical_staff: 'Medical Staff',
  technician: 'Technician',
  pharmacy: 'Pharmacy',
  specialist: 'Specialist',
  admin: 'Administrator',
};

const COMMON_FAQS: FaqItem[] = [
  {
    category: 'Getting Started',
    question: 'What is SHR and who should use it?',
    answer:
      'SHR is the Student Health Records platform for Babcock University workflows. Students, medical staff, technicians, pharmacy teams, specialists, and administrators each have role-specific access.',
  },
  {
    category: 'Account and Access',
    question: 'How do I sign in if I forgot my exact account type?',
    answer:
      'Use the Demo Role Switcher on login in this environment, or ask system support to confirm your assigned role in production. Your role determines what pages and actions are available.',
  },
  {
    category: 'Account and Access',
    question: 'Why can I not open some pages even after login?',
    answer:
      'Role guards block pages that are outside your assigned role permissions. This is expected for data protection and least-privilege access.',
  },
  {
    category: 'Security and Privacy',
    question: 'How is patient data protected in this system?',
    answer:
      'Access is role-based, sensitive actions are audit logged, and legal/privacy policy pages define user obligations, consent handling, and data rights.',
  },
  {
    category: 'Security and Privacy',
    question: 'Where can I see legal policies and data rights information?',
    answer:
      'Open Legal Center from login or sidebar. It links privacy policy, terms, consent notice, security/retention, role privacy matrix, and data request pages.',
  },
  {
    category: 'Security and Privacy',
    question: 'How do I request data access, correction, or deletion?',
    answer:
      'Open Data Request Center and submit the request type with enough details. The request receives a ticket and moves through an admin review workflow.',
  },
  {
    category: 'PWA and Mobile',
    question: 'Can I install SHR as an app on my phone?',
    answer:
      'Yes. On supported browsers you can use Install App. On iOS Safari use Share then Add to Home Screen. If install is missing, open PWA Diagnostics for readiness checks.',
  },
  {
    category: 'PWA and Mobile',
    question: 'Why is install not showing on my mobile browser?',
    answer:
      'Typical reasons are unsupported browser behavior, insecure context, already installed app mode, or install prompt not yet captured. The diagnostics page explains each condition.',
  },
  {
    category: 'PWA and Mobile',
    question: 'What is the PWA Diagnostics page for?',
    answer:
      'It validates secure context, manifest metadata, service worker registration, and install prompt readiness so users can quickly identify install blockers.',
  },
  {
    category: 'Offline and Sync',
    question: 'What happens when I lose internet while using SHR?',
    answer:
      'Offline mode keeps local changes in queue where supported. Once online, queued changes can sync automatically or through explicit Sync actions in the app shell.',
  },
  {
    category: 'Offline and Sync',
    question: 'How do I know whether there are unsynced changes?',
    answer:
      'The shell displays pending sync counts and online/offline banners. You can manually trigger sync when connectivity returns.',
  },
  {
    category: 'Offline and Sync',
    question: 'What should I do if sync fails repeatedly?',
    answer:
      'Check connectivity first, retry sync, and if failures continue report the issue to administrators with time, role, and steps you performed.',
  },
  {
    category: 'Troubleshooting',
    question: 'I see a blank or broken page. What should I do first?',
    answer:
      'Reload the page, verify network, and re-open from the login route. If persistent, report exact route and browser details so support can inspect logs.',
  },
  {
    category: 'Troubleshooting',
    question: 'Why was I redirected to policy updates?',
    answer:
      'When policy acceptance is pending, protected routes redirect to policy updates until the required legal acknowledgements are accepted.',
  },
  {
    category: 'Troubleshooting',
    question: 'What does unauthorized mean in SHR?',
    answer:
      'Unauthorized indicates your role does not have required permission for that action or page.',
  },
  {
    category: 'Workflow and Operations',
    question: 'Are actions in SHR tracked for audit?',
    answer:
      'Yes. Security-sensitive actions and workflow transitions are logged to support accountability, compliance, and incident review.',
  },
  {
    category: 'Workflow and Operations',
    question: 'How can I quickly find the right feature page?',
    answer:
      'Use sidebar navigation for role workflows, command palette where available, and Legal Center links for compliance or policy-related tasks.',
  },
  {
    category: 'Troubleshooting',
    question: 'Where should I report a bug or suspicious behavior?',
    answer:
      'Report to admin/support with your role, timestamp, page URL, and what happened. Include screenshots when possible to speed up diagnosis.',
  },
];

const ROLE_SPECIFIC_FAQS: Record<UserRole, FaqItem[]> = {
  student: [
    {
      category: 'Workflow and Operations',
      question: 'How do I submit a new symptom request?',
      answer:
        'Open New Request, complete symptom details, and submit. Your request enters clinical review queues for staff processing.',
    },
    {
      category: 'Workflow and Operations',
      question: 'Where do I track the status of my requisitions?',
      answer:
        'Go to My Requests to see request statuses such as pending review, approved, ready for pickup, or dispensed.',
    },
    {
      category: 'Workflow and Operations',
      question: 'Can I update my profile and emergency details?',
      answer:
        'Use My Profile for personal and medical context fields as available in your role view.',
    },
    {
      category: 'Workflow and Operations',
      question: 'How do I know if medication was approved?',
      answer:
        'Request status updates in My Requests reflect approval or rejection decisions and can include reviewer notes.',
    },
    {
      category: 'Workflow and Operations',
      question: 'How do I see diagnostic or referral outcomes relevant to me?',
      answer:
        'Open related request and encounter timelines in your student views. Staff-driven updates become visible as they are published to your record.',
    },
    {
      category: 'Security and Privacy',
      question: 'Who can see my health record?',
      answer:
        'Only authorized clinical or operations roles can access specific portions of your record required for care workflow completion.',
    },
    {
      category: 'Security and Privacy',
      question: 'Can I ask for correction if my record has an error?',
      answer:
        'Yes. Submit a correction request through Data Request Center and include precise fields needing correction.',
    },
    {
      category: 'Troubleshooting',
      question: 'What if I submitted the wrong symptom details?',
      answer:
        'Submit a correction or follow-up request and clearly reference the original record so staff can reconcile appropriately.',
    },
  ],
  medical_staff: [
    {
      category: 'Workflow and Operations',
      question: 'How do I search for a patient before consultation?',
      answer:
        'Use Search Patients and open the profile to review history, allergies, ongoing encounters, and requisition context.',
    },
    {
      category: 'Workflow and Operations',
      question: 'Where do I create a new encounter note?',
      answer:
        'From patient profile, start New Encounter and document complaint, subjective/objective notes, diagnosis, and plan.',
    },
    {
      category: 'Workflow and Operations',
      question: 'How do I process pending requisitions efficiently?',
      answer:
        'Use Review Queue to triage by urgency, validate symptoms, approve or reject with notes, and route next actions.',
    },
    {
      category: 'Workflow and Operations',
      question: 'How do referrals to specialists work?',
      answer:
        'Create referral with priority and reason. Specialist teams then review, accept, decline, or complete consultation outcomes.',
    },
    {
      category: 'Workflow and Operations',
      question: 'Where can I review referral feedback from specialists?',
      answer:
        'Open Referral Feedback to view outcomes, compliance signals, and follow-up recommendations.',
    },
    {
      category: 'Security and Privacy',
      question: 'Can medical staff edit any patient field?',
      answer:
        'No. Editing should align with treatment workflow and your permissions. Role matrix and audit logs enforce accountability.',
    },
    {
      category: 'Troubleshooting',
      question: 'What if a patient does not appear in search results?',
      answer:
        'Confirm identifiers, role permissions, and data synchronization status. Escalate if record creation or sync appears incomplete.',
    },
    {
      category: 'Troubleshooting',
      question: 'Why are some actions disabled in encounter screens?',
      answer:
        'Actions may depend on required fields, encounter status, or policy acceptance state. Complete required fields first.',
    },
  ],
  technician: [
    {
      category: 'Workflow and Operations',
      question: 'How do I upload diagnostic results?',
      answer:
        'Open Upload Results, select test type, attach file, enter findings, and submit with the correct patient/request context.',
    },
    {
      category: 'Workflow and Operations',
      question: 'Which file formats are expected for result uploads?',
      answer:
        'Upload workflow supports common imaging and report file variants configured in the technician form.',
    },
    {
      category: 'Workflow and Operations',
      question: 'How do I mark a result as critical?',
      answer:
        'Use the Critical Flag toggle and provide clear reason notes so reviewing clinicians can prioritize immediately.',
    },
    {
      category: 'Workflow and Operations',
      question: 'Can I edit a result after submission?',
      answer:
        'Follow permitted workflow for correction or re-upload. Avoid silent overwrites; use traceable updates where supported.',
    },
    {
      category: 'Workflow and Operations',
      question: 'How should I handle incomplete requisition details?',
      answer:
        'Do not guess. Flag the issue in notes and escalate back to requesting staff for clarification.',
    },
    {
      category: 'Security and Privacy',
      question: 'Can technicians view full longitudinal patient history?',
      answer:
        'Technician access is scoped to diagnostic workflow requirements and not full unrestricted chart access.',
    },
    {
      category: 'Troubleshooting',
      question: 'What if upload fails near completion?',
      answer:
        'Retry with stable connection, verify file size and format, and reattempt sync if working in intermittent connectivity.',
    },
    {
      category: 'Troubleshooting',
      question: 'Why is my referral status update blocked?',
      answer:
        'Status transitions depend on valid workflow stages. Confirm current status and mandatory notes before updating.',
    },
  ],
  pharmacy: [
    {
      category: 'Workflow and Operations',
      question: 'How do I process the dispensing queue?',
      answer:
        'Open Dispensing Queue, verify approved medication details, and progress each item through ready and dispensed stages.',
    },
    {
      category: 'Workflow and Operations',
      question: 'What should I check before dispensing medication?',
      answer:
        'Confirm patient identity, approved dosage, frequency, duration, allergies, and any doctor notes before final dispense.',
    },
    {
      category: 'Workflow and Operations',
      question: 'How do I mark an item as dispensed?',
      answer:
        'Use queue actions to finalize dispensing and ensure timestamped workflow status is saved for audit continuity.',
    },
    {
      category: 'Workflow and Operations',
      question: 'Can I reject or return a requisition to staff?',
      answer:
        'Use available queue decision actions and include notes if stock, safety, or order-quality issues are discovered.',
    },
    {
      category: 'Workflow and Operations',
      question: 'How are urgent medication requests prioritized?',
      answer:
        'Urgent markers should appear in queue triage. Process emergency and urgent items before routine requests.',
    },
    {
      category: 'Security and Privacy',
      question: 'What data can pharmacy view?',
      answer:
        'Pharmacy views are limited to medication fulfillment context needed for safe dispensing and continuity.',
    },
    {
      category: 'Troubleshooting',
      question: 'What if a dispensed status does not persist?',
      answer:
        'Check network and pending sync indicators, then retry update. Report persistent status conflicts to admin support.',
    },
    {
      category: 'Troubleshooting',
      question: 'What if stock constraints block fulfillment?',
      answer:
        'Add clear pharmacy notes, avoid unsafe substitution without clinical authorization, and escalate to requesting clinician.',
    },
  ],
  specialist: [
    {
      category: 'Workflow and Operations',
      question: 'Where do I review incoming referrals?',
      answer:
        'Open Referrals to review specialty requests, urgency, history context, and decide accept or decline actions.',
    },
    {
      category: 'Workflow and Operations',
      question: 'How do I complete a specialist consultation?',
      answer:
        'Open referral detail, add consultation findings and outcome, then complete status transition with required notes.',
    },
    {
      category: 'Workflow and Operations',
      question: 'How do I track consultation analytics?',
      answer:
        'Use Analytics to inspect turnaround trends, completion rates, and outcome signals relevant to specialist workload.',
    },
    {
      category: 'Workflow and Operations',
      question: 'Can I reassign or defer a referral?',
      answer:
        'Follow configured referral workflow statuses and include rationale notes so staff and admin teams can trace decisions.',
    },
    {
      category: 'Workflow and Operations',
      question: 'How are overdue or delayed referrals flagged?',
      answer:
        'Compliance and status indicators highlight delayed pathways; use those cues to prioritize pending specialist actions.',
    },
    {
      category: 'Security and Privacy',
      question: 'Do specialists have unrestricted access to all records?',
      answer:
        'No. Specialist access is bounded to referral and consultation scope needed for care decisions.',
    },
    {
      category: 'Troubleshooting',
      question: 'Why can I not complete a referral?',
      answer:
        'Required fields such as consultation notes or outcome may be missing, or referral status may not permit completion yet.',
    },
    {
      category: 'Troubleshooting',
      question: 'What if referral details look inconsistent?',
      answer:
        'Document inconsistency in notes and coordinate with requesting staff to reconcile clinical context before closure.',
    },
  ],
  admin: [
    {
      category: 'Workflow and Operations',
      question: 'How do I manage user accounts and roles?',
      answer:
        'Use Users to create, activate/deactivate, and monitor role assignments with proper governance controls.',
    },
    {
      category: 'Workflow and Operations',
      question: 'Where can I review system audit trails?',
      answer:
        'Use Audit Logs and Server Audit Trail pages for action visibility, investigation, and compliance reporting.',
    },
    {
      category: 'Workflow and Operations',
      question: 'How do I process legal data requests?',
      answer:
        'Open Data Requests in admin views to review submissions, add decisions, and track request lifecycle completion.',
    },
    {
      category: 'Workflow and Operations',
      question: 'How do policy version updates work?',
      answer:
        'Use Policy Versions to publish updates; users with pending acceptance are redirected to policy updates on next access.',
    },
    {
      category: 'Workflow and Operations',
      question: 'What is Reconciliation used for?',
      answer:
        'Reconciliation supports investigation and conflict resolution for out-of-sync or disputed record states.',
    },
    {
      category: 'Security and Privacy',
      question: 'Can admins view all patient data by default?',
      answer:
        'Admin capabilities focus on governance and system operations. Data access should follow minimum necessary principles.',
    },
    {
      category: 'Troubleshooting',
      question: 'How do I investigate repeated client-side errors?',
      answer:
        'Review server-side collected client error reports and correlate with audit logs, route paths, and timestamps.',
    },
    {
      category: 'Troubleshooting',
      question: 'What if users report install or offline issues?',
      answer:
        'Direct users to PWA Diagnostics, confirm browser/device context, and compare with service worker and manifest readiness indicators.',
    },
  ],
};

export const ROLE_FAQS: Record<UserRole, FaqItem[]> = {
  student: [...COMMON_FAQS, ...ROLE_SPECIFIC_FAQS.student],
  medical_staff: [...COMMON_FAQS, ...ROLE_SPECIFIC_FAQS.medical_staff],
  technician: [...COMMON_FAQS, ...ROLE_SPECIFIC_FAQS.technician],
  pharmacy: [...COMMON_FAQS, ...ROLE_SPECIFIC_FAQS.pharmacy],
  specialist: [...COMMON_FAQS, ...ROLE_SPECIFIC_FAQS.specialist],
  admin: [...COMMON_FAQS, ...ROLE_SPECIFIC_FAQS.admin],
};
