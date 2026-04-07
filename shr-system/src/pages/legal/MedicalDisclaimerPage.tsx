import LegalPageFrame from './LegalPageFrame';

export default function MedicalDisclaimerPage() {
  return (
    <LegalPageFrame
      title="Medical Disclaimer"
      subtitle="Important safety notice about using this system for communication and records."
      lastUpdated="April 7, 2026"
    >
      <section className="space-y-4 text-sm leading-6 text-slate-700">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
          <h2 className="text-lg font-semibold">Emergency Warning</h2>
          <p className="mt-1">Do not use this platform for emergencies. Contact emergency services or immediate clinical support for urgent symptoms.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">1. Not a Substitute for Medical Advice</h2>
          <p>Information in this system supports workflows and communication but does not replace in-person diagnosis or treatment decisions.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">2. Clinical Judgement Prevails</h2>
          <p>Licensed professionals remain responsible for medical decisions and patient care plans.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">3. Limitation of Liability</h2>
          <p>Service limitations, outages, and user-input errors can affect data timeliness. Always verify critical information using approved clinical protocols.</p>
        </div>
      </section>
    </LegalPageFrame>
  );
}
