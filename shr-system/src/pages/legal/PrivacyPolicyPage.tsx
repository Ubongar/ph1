import LegalPageFrame from './LegalPageFrame';

export default function PrivacyPolicyPage() {
  return (
    <LegalPageFrame
      title="Privacy Policy"
      subtitle="How we collect, use, share, and protect patient and operational data in the Student Health Records platform."
      lastUpdated="April 7, 2026"
      policyType="privacy"
    >
      <section className="space-y-4 text-sm leading-6 text-slate-700">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">1. Data We Collect</h2>
          <p>We collect account identity data, clinical notes, requisitions, referral events, role access logs, and support interactions needed to run health workflows.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">2. Why We Use Data</h2>
          <p>Data is used for triage, diagnosis support, referrals, pharmacy dispensing, reporting, quality control, and legal compliance obligations.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">3. Sensitive Health Information</h2>
          <p>Clinical information is treated as sensitive data and processed under strict role-based access controls. Access is restricted to authorized personnel with care or operational need.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">4. Data Sharing</h2>
          <p>We share data only for healthcare operations, legal duties, or approved processors. We do not sell patient data.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">5. International and Regulatory Context</h2>
          <p>This policy aligns with healthcare privacy principles and is structured to support NDPA, GDPR, HIPAA-aligned organizational controls, and institutional governance requirements.</p>
        </div>
      </section>
    </LegalPageFrame>
  );
}
