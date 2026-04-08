import { Link } from 'react-router-dom';
import { Cpu, LifeBuoy, Settings2, ShieldCheck, Smartphone } from 'lucide-react';

interface SettingsCard {
  readonly title: string;
  readonly description: string;
  readonly to: string;
  readonly cta: string;
  readonly icon: React.ComponentType<{ className?: string }>;
}

const SETTINGS_CARDS: readonly SettingsCard[] = [
  {
    title: 'PWA Install Diagnostics',
    description: 'Check install readiness, service worker status, and device/browser conditions in one place.',
    to: '/legal/pwa-diagnostics',
    cta: 'Open Diagnostics',
    icon: Smartphone,
  },
  {
    title: 'Legal Center',
    description: 'Review privacy, terms, data rights, and policy lifecycle pages from a single hub.',
    to: '/legal',
    cta: 'Open Legal Center',
    icon: ShieldCheck,
  },
  {
    title: 'Role FAQ Center',
    description: 'Find role-specific operational answers and compliance guidance.',
    to: '/legal/faq',
    cta: 'Open FAQ Center',
    icon: LifeBuoy,
  },
] as const;

export default function SettingsPage() {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <header className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
            <Settings2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">System Settings</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">Settings and Technical Tools</h1>
            <p className="mt-2 text-sm text-gray-600">
              Keep diagnostics and platform-level utilities here so daily workspace screens stay focused and uncluttered.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SETTINGS_CARDS.map(({ title, description, to, cta, icon: Icon }) => (
          <article key={to} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 inline-flex rounded-lg bg-gray-100 p-2 text-gray-700">
              <Icon className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <p className="mt-2 text-sm text-gray-600">{description}</p>
            <Link
              to={to}
              className="mt-4 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              {cta}
            </Link>
          </article>
        ))}
      </div>

      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <div className="flex items-start gap-2">
          <Cpu className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Technical tools are intentionally grouped on this page to keep dashboard and clinical workflows focused on core tasks.
          </p>
        </div>
      </section>
    </section>
  );
}
