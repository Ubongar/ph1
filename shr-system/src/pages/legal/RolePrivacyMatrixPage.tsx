import LegalPageFrame from './LegalPageFrame';

const ROLE_GUIDANCE = [
  {
    role: 'Student',
    access: 'Own profile, own requisitions, own submission history',
    duty: 'Provide accurate symptoms, avoid sharing account access, report suspected unauthorized activity.',
  },
  {
    role: 'Medical Staff',
    access: 'Assigned patient records, encounter notes, referral and requisition decisions',
    duty: 'Use minimum necessary access, document decisions clearly, avoid discussing records in non-secure channels.',
  },
  {
    role: 'Technician',
    access: 'Relevant test and result workflow data needed for processing',
    duty: 'Upload accurate results, flag critical values quickly, avoid viewing unrelated records.',
  },
  {
    role: 'Pharmacist',
    access: 'Approved medication requisitions and dispensing logs',
    duty: 'Verify prescription context, update dispensing status promptly, maintain confidentiality at collection points.',
  },
  {
    role: 'Specialist',
    access: 'Referral package, consultation notes, specialist recommendations',
    duty: 'Record consultation rationale, return feedback on time, process only assigned referrals.',
  },
  {
    role: 'Administrator',
    access: 'System-level user management, audit logs, compliance reports',
    duty: 'Enforce least privilege, monitor anomalous access, preserve audit integrity.',
  },
] as const;

export default function RolePrivacyMatrixPage() {
  return (
    <LegalPageFrame
      title="Role-Based Privacy Responsibilities"
      subtitle="Access boundaries and data protection obligations by role across the health records workflow."
      lastUpdated="April 7, 2026"
    >
      <section className="space-y-3 text-sm leading-6 text-slate-700">
        <p>
          This page explains what each role should access and what each role must never do. It helps prevent overexposure of sensitive medical information.
        </p>

        <div className="space-y-3">
          {ROLE_GUIDANCE.map((entry) => (
            <article key={entry.role} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-base font-semibold text-slate-900">{entry.role}</h2>
              <p><span className="font-semibold text-slate-800">Allowed Access:</span> {entry.access}</p>
              <p className="mt-1"><span className="font-semibold text-slate-800">Key Responsibility:</span> {entry.duty}</p>
            </article>
          ))}
        </div>
      </section>
    </LegalPageFrame>
  );
}
