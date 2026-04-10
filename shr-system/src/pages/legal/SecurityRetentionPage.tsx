import LegalPageFrame from './LegalPageFrame';

export default function SecurityRetentionPage() {
  return (
    <LegalPageFrame
      title="Security and Data Retention"
      subtitle="Security controls, access boundaries, and lifecycle rules for healthcare records and operational logs."
      lastUpdated="April 7, 2026"
    >
      <section className="space-y-4 text-sm leading-6 text-slate-700">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">1. Security Controls</h2>
          <p>Recommended production controls include encrypted transit/storage, strict role-based access control, least privilege, log monitoring, and incident playbooks.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">2. Retention Schedule</h2>
          <p>Records should be retained according to institutional and regulatory requirements, then securely archived or deleted at end-of-life.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-base font-semibold text-slate-900">Suggested Operational Baseline</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Clinical encounter records: 7 to 10 years minimum, based on policy</li>
            <li>Audit logs: 2 to 6 years for accountability and investigations</li>
            <li>Support tickets: 1 to 3 years unless tied to unresolved legal matters</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">3. Breach Response</h2>
          <p>Suspected incidents should be investigated immediately, documented, and reported within legally required timelines.</p>
        </div>
      </section>
    </LegalPageFrame>
  );
}
