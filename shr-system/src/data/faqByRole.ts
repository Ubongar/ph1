import type { UserRole } from '../types/types';

export type FaqCategory =
  | 'Getting Started'
  | 'Account and Access'
  | 'Security and Privacy'
  | 'Progressive Web App and Mobile'
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
    category: 'Progressive Web App and Mobile',
    question: 'Can I install SHR as an app on my phone?',
    answer:
      'Yes. On supported browsers you can use Install App. On iOS Safari use Share then Add to Home Screen. If install is missing, open Progressive Web App Diagnostics for readiness checks.',
  },
  {
    category: 'Progressive Web App and Mobile',
    question: 'Why is install not showing on my mobile browser?',
    answer:
      'Typical reasons are unsupported browser behavior, insecure context, already installed app mode, or install prompt not yet captured. The diagnostics page explains each condition.',
  },
  {
    category: 'Progressive Web App and Mobile',
    question: 'What is the Progressive Web App Diagnostics page for?',
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

const makeFaq = (category: FaqCategory, question: string, answer: string): FaqItem => ({ category, question, answer });

const ROLE_SPECIFIC_FAQS: Record<UserRole, FaqItem[]> = {
  student: [
    makeFaq('Workflow and Operations', 'How do I submit a new symptom request?', 'Open New Request, complete symptom details carefully, and submit once. The request enters the medical staff review flow.'),
    makeFaq('Workflow and Operations', 'Where do I track request progress after submission?', 'Use My Requests to monitor status changes from submitted to review and pharmacy outcomes.'),
    makeFaq('Workflow and Operations', 'What happens if I accidentally submit the same symptom twice?', 'Leave both records visible and report duplication in a follow-up note so staff can reconcile the correct clinical thread.'),
    makeFaq('Workflow and Operations', 'How do I indicate that symptoms are urgent?', 'Include clear severity language and timeline in your symptom description so triage can prioritize appropriately.'),
    makeFaq('Workflow and Operations', 'What if my request was approved but I still cannot collect medication?', 'Check queue status timing first, then contact health center desk with your request ID for pharmacy handoff verification.'),
    makeFaq('Workflow and Operations', 'Why would a request be rejected?', 'Requests may be rejected for insufficient clinical detail, duplicate entries, or mismatch with required review criteria.'),
    makeFaq('Workflow and Operations', 'Can I change a submitted request?', 'Do not overwrite silently. Submit a correction or follow-up request that references the original record for traceability.'),
    makeFaq('Workflow and Operations', 'How can I view outcomes from a specialist referral?', 'Open your related request timeline to see referral outcome updates once they are finalized by care teams.'),
    makeFaq('Workflow and Operations', 'What if I submitted under the wrong complaint category?', 'Submit a follow-up clarification immediately to reduce triage delay and prevent incorrect routing.'),
    makeFaq('Workflow and Operations', 'Can I submit multiple different symptoms on the same day?', 'Yes, but separate unrelated complaints clearly so clinicians can triage each pathway safely.'),
    makeFaq('Account and Access', 'I changed devices. Will my records still be there?', 'Yes. Records are tied to your account, not the specific phone or laptop you use to sign in.'),
    makeFaq('Account and Access', 'Why am I redirected to policy updates before dashboard access?', 'Your account has pending legal acceptance requirements that must be completed before protected routes are available.'),
    makeFaq('Account and Access', 'What should I do if I cannot open My Requests page?', 'Refresh, sign in again, and verify your role session. If still blocked, report route and timestamp to support.'),
    makeFaq('Account and Access', 'Can I continue from where I stopped after timeout or logout?', 'Sign in again and reopen the relevant page. Previously saved records remain tied to your account history.'),
    makeFaq('Security and Privacy', 'Who can access my student medical profile?', 'Only authorized role holders with workflow need can view portions required for care delivery and operations.'),
    makeFaq('Security and Privacy', 'How do I request correction of an inaccurate record entry?', 'Submit a data correction request in Data Request Center with exact field details and supporting context.'),
    makeFaq('Security and Privacy', 'How do I request deletion of specific personal data?', 'Use Data Request Center deletion flow and specify what should be removed and why.'),
    makeFaq('Security and Privacy', 'Can I know whether someone viewed my record?', 'Audit visibility is managed by administrators; raise a privacy concern with date, time, and suspected page context.'),
    makeFaq('Security and Privacy', 'What if I see data that does not look like mine?', 'Stop editing immediately and report a potential identity mismatch so administrators can investigate safely.'),
    makeFaq('Progressive Web App and Mobile', 'Can I install SHR to my home screen as a student?', 'Yes. Use Install App where available, or iOS Share then Add to Home Screen in Safari.'),
    makeFaq('Progressive Web App and Mobile', 'Installed app opens but shows stale information. What should I do?', 'Reconnect to internet and use Sync or refresh actions so pending updates are fetched and applied.'),
    makeFaq('Offline and Sync', 'What if I submitted while offline and closed the app?', 'Your pending changes queue locally and sync when you return online and reopen the app.'),
    makeFaq('Offline and Sync', 'How do I know if my offline change actually synced?', 'Look for pending count returning to zero in sync indicators and confirm updated status in the target page.'),
    makeFaq('Troubleshooting', 'What should I do if page buttons do not respond on mobile?', 'Reload first, then reopen from login if needed. If persistent, report device model, browser, and route.'),
    makeFaq('Troubleshooting', 'When should I use emergency services instead of SHR?', 'Use emergency channels for urgent life-threatening situations. SHR is not a substitute for immediate emergency response.'),
  ],
  medical_staff: [
    makeFaq('Workflow and Operations', 'How do I start a patient review quickly from the queue?', 'Open Review Queue, sort by urgency, and launch patient context before documenting any encounter actions.'),
    makeFaq('Workflow and Operations', 'What if patient search returns no results?', 'Validate identifiers, spelling, and role permissions. Escalate to admin if the record should exist but is not retrievable.'),
    makeFaq('Workflow and Operations', 'How do I handle possible duplicate patient records?', 'Do not merge manually in notes. Flag duplication and send to admin reconciliation with both record references.'),
    makeFaq('Workflow and Operations', 'Which fields are critical in a new encounter?', 'Document complaint, subjective and objective findings, diagnosis, and treatment plan with enough detail for continuity.'),
    makeFaq('Workflow and Operations', 'Can I save an encounter if some sections are incomplete?', 'Complete required fields first. Missing mandatory data can block workflow transition or downstream actions.'),
    makeFaq('Workflow and Operations', 'How should I handle severe allergy conflicts in treatment decisions?', 'Prioritize patient safety, document conflict rationale, and adjust treatment route according to allergy risk profile.'),
    makeFaq('Workflow and Operations', 'How do I approve requisitions consistently?', 'Use symptom severity, clinical evidence, and care protocol alignment before approving medication or referral pathways.'),
    makeFaq('Workflow and Operations', 'What is best practice when rejecting a requisition?', 'Provide clear clinical reason and actionable guidance so students or staff can submit corrected follow-up details.'),
    makeFaq('Workflow and Operations', 'How do I prioritize urgent versus routine requests?', 'Process emergency and urgent records first, then maintain queue fairness for routine cases.'),
    makeFaq('Workflow and Operations', 'When should I refer to a specialist?', 'Refer when case complexity, risk profile, or specialty intervention exceeds routine primary workflow scope.'),
    makeFaq('Workflow and Operations', 'What if referral form details are insufficient?', 'Return with required clarification notes before specialist assignment to avoid unsafe or delayed care decisions.'),
    makeFaq('Workflow and Operations', 'How do I close a referral loop after specialist feedback?', 'Review referral feedback, update encounter plan, and communicate follow-up actions in patient-facing records.'),
    makeFaq('Workflow and Operations', 'Can I update an encounter after initial submission?', 'Use permitted update workflows and avoid overwriting key chronology so audit trail remains clinically reliable.'),
    makeFaq('Workflow and Operations', 'What if diagnostic results are pending but treatment must continue?', 'Document interim plan, risk controls, and explicit follow-up trigger once results become available.'),
    makeFaq('Account and Access', 'Why am I seeing unauthorized on another department workflow?', 'Role restrictions and scoped access apply. Request proper authorization through admin governance if required.'),
    makeFaq('Account and Access', 'Why do I keep getting redirected to policy updates?', 'Your account has mandatory acceptance pending and cannot continue to protected clinical routes until completed.'),
    makeFaq('Security and Privacy', 'Can medical staff view all records across the institution?', 'No. Access should remain minimum-necessary for active treatment and approved workflow responsibilities.'),
    makeFaq('Security and Privacy', 'How should I respond to patient correction requests?', 'Direct formal correction actions through Data Request Center while documenting clinical clarifications in encounter notes.'),
    makeFaq('Security and Privacy', 'How do I avoid accidental privacy exposure during shared workstations?', 'Sign out when idle, avoid leaving records open, and confirm patient identity before discussing chart details.'),
    makeFaq('Offline and Sync', 'What if I was writing notes during network loss?', 'Finish safely, reconnect, and verify that pending sync items cleared before assuming final save success.'),
    makeFaq('Offline and Sync', 'How do I handle sync conflicts on edited clinical records?', 'Do not guess. Escalate conflicting entries with timestamps to admin reconciliation for controlled resolution.'),
    makeFaq('Troubleshooting', 'Why are encounter action buttons disabled?', 'Required fields, status state, or policy gating can disable actions. Resolve each blocking condition first.'),
    makeFaq('Troubleshooting', 'What if specialist feedback appears inconsistent with initial diagnosis?', 'Document discrepancy, coordinate directly with specialist, and update plan with transparent rationale.'),
    makeFaq('Troubleshooting', 'How do I escalate suspected medication misuse patterns?', 'Record objective findings and escalate through institutional clinical governance and safety channels.'),
    makeFaq('Troubleshooting', 'What should I do during partial system outage in clinic hours?', 'Use downtime protocols, record essential notes safely, and synchronize structured updates once service is restored.'),
  ],
  technician: [
    makeFaq('Workflow and Operations', 'What is the correct sequence for uploading a diagnostic result?', 'Select test type, provide clinician context, attach file, add findings, then submit once validation passes.'),
    makeFaq('Workflow and Operations', 'What if I selected the wrong patient before upload?', 'Stop and correct patient context before submission. Never upload under uncertain identity mapping.'),
    makeFaq('Workflow and Operations', 'How do I handle very large diagnostic files?', 'Prefer stable network, retry if interrupted, and confirm upload completion before leaving the record.'),
    makeFaq('Workflow and Operations', 'How do I mark findings as critical?', 'Enable critical flag and document concise, high-risk reason so clinical teams can triage immediately.'),
    makeFaq('Workflow and Operations', 'What if critical reason text is incomplete?', 'Update with specific abnormal findings and urgency indicators to reduce escalation delay.'),
    makeFaq('Workflow and Operations', 'Can I submit results if requisition details are incomplete?', 'Do not proceed with uncertain mapping. Escalate to requesting staff for clarification before final upload.'),
    makeFaq('Workflow and Operations', 'How should I correct an uploaded result with wrong metadata?', 'Create a traceable correction flow using re-upload or update mechanisms without deleting audit context.'),
    makeFaq('Workflow and Operations', 'What if I accidentally uploaded the same file twice?', 'Flag duplication in notes and escalate for reconciliation so downstream teams avoid duplicate interpretation.'),
    makeFaq('Workflow and Operations', 'How do I choose between test categories when uncertain?', 'Use the clinically intended test pathway and coordinate with requesting clinician if category is ambiguous.'),
    makeFaq('Workflow and Operations', 'What should I do if doctor name is unavailable at upload time?', 'Use best available verified request context and escalate missing ownership details for correction promptly.'),
    makeFaq('Workflow and Operations', 'How do I handle unreadable or low-quality scanned results?', 'Request a clearer source or re-scan; do not mark complete if findings cannot be interpreted reliably.'),
    makeFaq('Workflow and Operations', 'Can technicians change referral status directly?', 'Only follow permitted status transitions in your scope and include mandatory notes when changes are allowed.'),
    makeFaq('Workflow and Operations', 'What if turnaround targets are at risk due to backlog?', 'Prioritize by urgency, critical flags, and request age, then escalate workload pressure to operations lead.'),
    makeFaq('Account and Access', 'Why can I not open staff or specialist pages?', 'Role controls restrict cross-role workflows. Access outside technician scope requires approved role change.'),
    makeFaq('Account and Access', 'Why do I get redirected after login to policy page?', 'Pending policy acceptance blocks protected routes until legal updates are acknowledged.'),
    makeFaq('Security and Privacy', 'Can I browse full patient history while uploading?', 'Technician access is limited to diagnostic workflow context, not unrestricted longitudinal chart review.'),
    makeFaq('Security and Privacy', 'How should I protect PHI on shared lab devices?', 'Lock screen when unattended, avoid local copies, and ensure uploads occur in authorized sessions only.'),
    makeFaq('Security and Privacy', 'What if I suspect result tampering or unauthorized edits?', 'Report immediately with record IDs and timestamps for audit-led investigation.'),
    makeFaq('Offline and Sync', 'What if upload started then internet disconnected?', 'Reconnect and retry, then verify queue and status so incomplete transmissions are not treated as final.'),
    makeFaq('Offline and Sync', 'How do I verify offline queued actions eventually synced?', 'Check pending count and reopen affected record to ensure status and metadata reflect intended final state.'),
    makeFaq('Offline and Sync', 'What if sync fails repeatedly for one specific result?', 'Collect identifiers and error context, then escalate to admin reconciliation rather than repeated blind retries.'),
    makeFaq('Troubleshooting', 'Why is referral review status change blocked?', 'Current status may not allow transition or required notes may be missing. Complete prerequisites first.'),
    makeFaq('Troubleshooting', 'How do I escalate life-threatening findings if system is slow?', 'Use immediate clinical escalation channels first, then complete system documentation as soon as stable.'),
    makeFaq('Troubleshooting', 'What if uploaded file preview does not load?', 'Confirm file type and integrity, then re-upload from source copy if corruption is suspected.'),
    makeFaq('Troubleshooting', 'What should I do at shift handoff with pending uploads?', 'Leave clear queue notes, pending item references, and critical alerts to avoid loss of continuity.'),
  ],
  pharmacy: [
    makeFaq('Workflow and Operations', 'How do I triage the dispensing queue at start of shift?', 'Sort by urgency and request age, then validate each approved medication set before dispensing actions.'),
    makeFaq('Workflow and Operations', 'What checks are mandatory before dispensing?', 'Confirm patient identity, approved drug details, dosage, frequency, allergies, and any clinician instructions.'),
    makeFaq('Workflow and Operations', 'What if allergy profile conflicts with approved medication?', 'Pause dispensing and escalate back to prescribing clinician for safe amendment before fulfillment.'),
    makeFaq('Workflow and Operations', 'How should I handle insufficient stock for an approved item?', 'Record stock exception, notify requesting clinician, and follow approved alternative or deferred fulfillment workflow.'),
    makeFaq('Workflow and Operations', 'Can I partially dispense and complete later?', 'Use permitted queue states and detailed notes so remaining quantity is traceable and clinically safe.'),
    makeFaq('Workflow and Operations', 'What if substitution is needed but not pre-approved?', 'Do not substitute without clinical authorization. Escalate and wait for documented approval.'),
    makeFaq('Workflow and Operations', 'How do I mark medication as ready for pickup?', 'Use queue action that sets readiness and confirms all verification checks are complete.'),
    makeFaq('Workflow and Operations', 'How do I finalize dispensed status correctly?', 'Complete dispense action only after handoff confirmation to maintain accurate timestamped audit continuity.'),
    makeFaq('Workflow and Operations', 'What if the student arrives without valid identity confirmation?', 'Do not dispense until identity is verified according to institutional policy.'),
    makeFaq('Workflow and Operations', 'What if the wrong student appears for pickup?', 'Hold medication and verify request details. Never release under uncertain identity conditions.'),
    makeFaq('Workflow and Operations', 'How should I return questionable prescriptions to staff review?', 'Use rejection or return workflow with precise pharmacy notes describing safety or quality concerns.'),
    makeFaq('Workflow and Operations', 'How are emergency and urgent medications prioritized?', 'Emergency and urgent requests should be processed ahead of routine queue items.'),
    makeFaq('Workflow and Operations', 'How should I document patient counseling during dispense?', 'Record concise counseling notes where workflow supports it to preserve clinical communication context.'),
    makeFaq('Workflow and Operations', 'What if medication expires before pending pickup?', 'Block dispense, update queue notes, and escalate to clinical staff for replacement or plan adjustment.'),
    makeFaq('Account and Access', 'Why can I not open specialist or admin pages?', 'Role-based restrictions limit access to pharmacy workflow pages only.'),
    makeFaq('Account and Access', 'Why am I redirected to legal updates when signing in?', 'Pending policy acceptance must be completed before accessing protected pharmacy routes.'),
    makeFaq('Security and Privacy', 'What patient information can pharmacy access?', 'Only data required for safe dispensing and medication workflow completion should be viewed.'),
    makeFaq('Security and Privacy', 'How do I prevent privacy leakage at busy counters?', 'Avoid speaking sensitive details loudly and confirm identity discreetly before discussing therapy specifics.'),
    makeFaq('Security and Privacy', 'Are dispensing actions traceable?', 'Yes. Queue transitions and key actions are tracked for audit and compliance review.'),
    makeFaq('Offline and Sync', 'What if connectivity drops while marking dispensed?', 'Reconnect and verify pending sync clears before assuming dispense status is final in system.'),
    makeFaq('Offline and Sync', 'How do I handle conflict when two users update same queue item?', 'Escalate to reconciliation with timestamps rather than repeatedly toggling statuses.'),
    makeFaq('Offline and Sync', 'What if queue changes do not appear after sync?', 'Refresh route, confirm online state, and report affected request IDs if mismatch persists.'),
    makeFaq('Troubleshooting', 'Why is a queue item stuck and not moving states?', 'A required prerequisite may be incomplete. Recheck verification and required notes first.'),
    makeFaq('Troubleshooting', 'How do I report adverse reaction concerns discovered at pickup?', 'Escalate immediately to clinical team and document the concern with request context.'),
    makeFaq('Troubleshooting', 'What should be handed over at end of pharmacy shift?', 'Include pending urgent items, stock exceptions, and any unresolved safety escalations.'),
  ],
  specialist: [
    makeFaq('Workflow and Operations', 'Where do I review all incoming referrals?', 'Use the Referrals page to triage by urgency, specialty fit, and request chronology.'),
    makeFaq('Workflow and Operations', 'How do I decide whether to accept or decline a referral?', 'Use scope fit, available information, and clinical appropriateness, then include rationale in decision notes.'),
    makeFaq('Workflow and Operations', 'What if referral context is incomplete at review time?', 'Request clarification before final decision so consultation quality and safety are not compromised.'),
    makeFaq('Workflow and Operations', 'How do I document consultation outcomes properly?', 'Complete consultation notes, choose outcome status, and capture follow-up requirements clearly.'),
    makeFaq('Workflow and Operations', 'What does follow-up required mean in specialist workflow?', 'It indicates further specialist or staff action is needed before referral can be fully closed.'),
    makeFaq('Workflow and Operations', 'How should I handle emergency referrals requiring immediate action?', 'Escalate through urgent clinical channels first, then update referral status and notes in SHR promptly.'),
    makeFaq('Workflow and Operations', 'What if a referral is overdue before I can review it?', 'Prioritize aged urgent records and document any delay reason for compliance visibility.'),
    makeFaq('Workflow and Operations', 'Can I reopen a referral marked completed in error?', 'Use approved correction pathways and include justification to preserve audit integrity.'),
    makeFaq('Workflow and Operations', 'How do I hand back recommendations to medical staff?', 'Finalize specialist notes with actionable plan so staff can continue care without ambiguity.'),
    makeFaq('Workflow and Operations', 'What if a student misses consultation timing?', 'Record no-show context and adjust referral workflow according to policy and urgency.'),
    makeFaq('Workflow and Operations', 'How do I handle conflicting information from prior encounters?', 'Document discrepancy objectively and coordinate with originating clinician before final closure.'),
    makeFaq('Workflow and Operations', 'How do analytics help specialist operations?', 'Use analytics to monitor turnaround time, completion rate, and workload pressure for planning.'),
    makeFaq('Workflow and Operations', 'What if referral priority appears too low for observed risk?', 'Escalate priority with supporting clinical rationale and notify originating team immediately.'),
    makeFaq('Account and Access', 'Why can I not open non-specialist operational pages?', 'Role permissions restrict access to specialist scope and approved supporting workflows.'),
    makeFaq('Account and Access', 'Why am I redirected to policy acceptance after login?', 'Pending legal updates must be accepted before specialist protected routes are accessible.'),
    makeFaq('Security and Privacy', 'Can specialists browse records without active referral context?', 'No. Access should align with referral scope and minimum necessary data principles.'),
    makeFaq('Security and Privacy', 'How should I handle sensitive details not needed in final notes?', 'Document only clinically necessary information and avoid excess personal data exposure.'),
    makeFaq('Security and Privacy', 'Are specialist decisions auditable?', 'Yes. Status transitions and consultation submissions are captured for governance and compliance.'),
    makeFaq('Offline and Sync', 'What if I lose internet while drafting consultation notes?', 'Resume once online and ensure pending sync completes before considering notes finalized.'),
    makeFaq('Offline and Sync', 'How do I handle note conflicts after reconnecting?', 'Escalate conflicting versions for controlled resolution instead of manual guesswork.'),
    makeFaq('Offline and Sync', 'How can I confirm referral completion synced successfully?', 'Verify pending count returns to zero and referral status reflects final completion state.'),
    makeFaq('Troubleshooting', 'Why is complete referral action disabled?', 'Required fields or allowed status transitions are missing. Resolve blockers before completion.'),
    makeFaq('Troubleshooting', 'How do I escalate suspected data inconsistency across referrals?', 'Capture affected IDs and escalate to admin reconciliation with concise evidence.'),
    makeFaq('Troubleshooting', 'What if analytics metrics look inconsistent with my activity?', 'Confirm date range and statuses first, then report discrepancy to administrators for audit review.'),
    makeFaq('Troubleshooting', 'What should I do during specialist module slowdown?', 'Prioritize urgent cases through fallback communication channels and synchronize in-app updates when stable.'),
  ],
  admin: [
    makeFaq('Workflow and Operations', 'How do I onboard a new user role correctly?', 'Create account, assign minimal required role, and verify access boundaries before activation.'),
    makeFaq('Workflow and Operations', 'How do I deactivate and later reactivate staff accounts?', 'Use user management actions that preserve audit history while changing active access state.'),
    makeFaq('Workflow and Operations', 'What if a user was assigned the wrong role?', 'Correct role assignment immediately and review audit trail for any access performed before correction.'),
    makeFaq('Workflow and Operations', 'How do I investigate unusual activity from audit logs?', 'Filter by user, action, timestamp, and resource to reconstruct sequence and identify risk patterns.'),
    makeFaq('Workflow and Operations', 'When should I use Server Audit Trail versus standard Audit Logs?', 'Use server trail for backend event investigation and standard logs for user workflow action tracking.'),
    makeFaq('Workflow and Operations', 'How do I process legal data requests within governance expectations?', 'Review request details, determine lawful response path, record decision notes, and update final status.'),
    makeFaq('Workflow and Operations', 'How do I publish policy updates without disrupting compliance?', 'Publish through policy versioning and monitor mandatory acceptance completion before enforcing changes broadly.'),
    makeFaq('Workflow and Operations', 'What is the safest way to run reconciliation on conflicts?', 'Review local versus remote evidence, apply documented resolution, and preserve traceability of each decision.'),
    makeFaq('Workflow and Operations', 'How do I manage referral compliance oversight?', 'Use referral compliance dashboards and intervene on overdue trends with operational escalation.'),
    makeFaq('Workflow and Operations', 'How should I respond to repeated unresolved sync conflicts?', 'Escalate from operational support into structured reconciliation workflow with impacted record inventory.'),
    makeFaq('Workflow and Operations', 'How do I support departments with role expansion requests?', 'Apply least privilege first, then validate necessity and monitor with targeted audit checks.'),
    makeFaq('Workflow and Operations', 'How do I handle duplicate user records discovered post-onboarding?', 'Lock risky accounts, reconcile identity ownership, then retain one canonical active profile.'),
    makeFaq('Workflow and Operations', 'How do I prepare evidence for compliance review or accreditation?', 'Export relevant reports, policy acceptance history, and audit extracts for the requested period.'),
    makeFaq('Account and Access', 'What should I do when many users report unauthorized errors suddenly?', 'Check role assignment integrity, recent policy changes, and deployment impacts before mass remediation.'),
    makeFaq('Account and Access', 'How do I manage emergency temporary access requests?', 'Grant time-bounded minimal privileges with explicit approval and mandatory post-incident revocation review.'),
    makeFaq('Account and Access', 'Why are users redirected to policy updates after a release?', 'New policy versions enforce re-acceptance before protected route access.'),
    makeFaq('Security and Privacy', 'Can administrators access all patient details by default?', 'Administrative authority should remain governance-focused and follow minimum necessary data principles.'),
    makeFaq('Security and Privacy', 'How should I handle suspected privacy breach reports?', 'Preserve evidence, scope impact, and trigger formal incident process according to institutional policy.'),
    makeFaq('Security and Privacy', 'How do I review client-side crash telemetry safely?', 'Use client error reports with route, timestamp, and role context while avoiding unnecessary personal data exposure.'),
    makeFaq('Security and Privacy', 'How do I validate that policy acceptance records are intact?', 'Review acceptance history by user and version to confirm immutable timeline continuity.'),
    makeFaq('Offline and Sync', 'How do I triage widespread offline sync failures?', 'Check service health, identify common failure pattern, and communicate mitigation steps to all roles quickly.'),
    makeFaq('Offline and Sync', 'What if queue states diverge between users on the same record?', 'Use reconciliation tooling and authoritative audit chronology to resolve state ownership.'),
    makeFaq('Offline and Sync', 'How do I verify that a sync incident is fully resolved?', 'Confirm pending counters normalize, conflict backlog clears, and affected records reconcile to expected states.'),
    makeFaq('Troubleshooting', 'How should I respond to broad Progressive Web App install complaints?', 'Direct users to diagnostics page, compare browser context, and validate manifest and service worker readiness.'),
    makeFaq('Troubleshooting', 'What is the escalation chain for major SHR outage?', 'Trigger incident response, communicate status cadence, prioritize safety-critical workflows, and record restoration timeline.'),
  ],
};

export const ROLE_FAQS: Record<UserRole, FaqItem[]> = {
  student: [...ROLE_SPECIFIC_FAQS.student],
  medical_staff: [...ROLE_SPECIFIC_FAQS.medical_staff],
  technician: [...ROLE_SPECIFIC_FAQS.technician],
  pharmacy: [...ROLE_SPECIFIC_FAQS.pharmacy],
  specialist: [...ROLE_SPECIFIC_FAQS.specialist],
  admin: [...ROLE_SPECIFIC_FAQS.admin],
};

export const SHARED_FAQS: FaqItem[] = [...COMMON_FAQS];
