import LegalPageFrame from './LegalPageFrame';

export default function DataRightsPage() {
  return (
    <LegalPageFrame
      title="Patient Data Rights and Access"
      subtitle="How students and patients can request access, correction, portability, restriction, and deletion of personal data."
      lastUpdated="April 7, 2026"
    >
      <section className="space-y-4 text-sm leading-6 text-slate-700">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">1. Your Rights</h2>
          <p>You may request a copy of your data, correction of inaccuracies, restricted processing, or deletion where legally permitted.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">2. Request Channels</h2>
          <p>Submit a request through institutional support channels, student health desk, or designated data protection contact points.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-base font-semibold text-slate-900">Standard Response Timeline</h3>
          <p className="mt-1">We target acknowledgement within 3 business days and completion within 30 days unless legal exemptions apply.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">3. Verification and Safety</h2>
          <p>Identity verification is required before disclosure to prevent unauthorized access to sensitive health information.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">4. Complaints and Escalation</h2>
          <p>If you are dissatisfied with the response, you may escalate to institutional compliance offices or relevant data protection authorities.</p>
        </div>
      </section>
    </LegalPageFrame>
  );
}
