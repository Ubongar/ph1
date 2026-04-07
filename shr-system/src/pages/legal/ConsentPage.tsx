import LegalPageFrame from './LegalPageFrame';

export default function ConsentPage() {
  return (
    <LegalPageFrame
      title="Consent and Sensitive Data Notice"
      subtitle="How consent is captured, managed, and withdrawn for health-related processing activities."
      lastUpdated="April 7, 2026"
    >
      <section className="space-y-4 text-sm leading-6 text-slate-700">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">1. Consent Principles</h2>
          <p>Consent must be informed, specific, and voluntary. Users are told what data is collected and why before submission.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">2. Special Category Data</h2>
          <p>Health details are processed under heightened safeguards and only for approved clinical or operational reasons.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">3. Withdrawal of Consent</h2>
          <p>Users can withdraw consent for non-essential processing. Some data may still be retained where legal obligations require retention.</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <h3 className="text-base font-semibold">Clinical Limitation</h3>
          <p className="mt-1">Withdrawal of consent cannot retroactively remove records already needed for medical safety, legal defense, or required audit trails.</p>
        </div>
      </section>
    </LegalPageFrame>
  );
}
