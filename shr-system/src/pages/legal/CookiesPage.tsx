import LegalPageFrame from './LegalPageFrame';

export default function CookiesPage() {
  return (
    <LegalPageFrame
      title="Cookie and Local Storage Notice"
      subtitle="How session and preference storage is used in this application and what controls users can expect."
      lastUpdated="April 7, 2026"
    >
      <section className="space-y-4 text-sm leading-6 text-slate-700">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">1. Essential Storage</h2>
          <p>We use browser storage for session persistence, role state, and essential functionality such as alerts and page preferences.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">2. Optional Analytics</h2>
          <p>If analytics is introduced in production, it should be configured with opt-in or legally required consent controls.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">3. User Controls</h2>
          <p>Users can clear browser storage; however, this may sign out sessions and reset local preferences.</p>
        </div>
      </section>
    </LegalPageFrame>
  );
}
