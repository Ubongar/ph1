import LegalPageFrame from './LegalPageFrame';

export default function TermsAndConditionsPage() {
  return (
    <LegalPageFrame
      title="Terms and Conditions"
      subtitle="Rules governing access and responsible use of the Student Health Records platform."
      lastUpdated="April 7, 2026"
      policyType="terms"
    >
      <section className="space-y-4 text-sm leading-6 text-slate-700">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">1. Service Scope</h2>
          <p>This platform supports health record workflows, referrals, and operational reporting. It is not a replacement for emergency services.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">2. User Responsibilities</h2>
          <p>Users must keep credentials private, provide accurate information, and avoid unauthorized access or tampering with medical records.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">3. Institutional Control</h2>
          <p>Authorized administrators may suspend accounts, investigate misuse, and maintain audit evidence to enforce policy and protect patients.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">4. Intellectual Property</h2>
          <p>Software, interface, and documentation remain protected assets of the service owner unless separate written agreements apply.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">5. Updates to Terms</h2>
          <p>Terms may change as operations and regulations evolve. Continued usage after updates indicates acceptance of revised terms.</p>
        </div>
      </section>
    </LegalPageFrame>
  );
}
