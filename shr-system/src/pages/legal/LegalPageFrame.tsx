import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface LegalPageFrameProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  children: ReactNode;
}

const LEGAL_LINKS = [
  { label: 'Legal Center', to: '/legal' },
  { label: 'Privacy Policy', to: '/legal/privacy' },
  { label: 'Terms', to: '/legal/terms' },
  { label: 'Data Rights', to: '/legal/data-rights' },
  { label: 'Consent', to: '/legal/consent' },
  { label: 'Cookies', to: '/legal/cookies' },
  { label: 'Security & Retention', to: '/legal/security' },
  { label: 'Role Privacy Matrix', to: '/legal/role-matrix' },
  { label: 'Medical Disclaimer', to: '/legal/medical-disclaimer' },
] as const;

export default function LegalPageFrame({ title, subtitle, lastUpdated, children }: LegalPageFrameProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Link to="/login" className="font-medium text-blue-700 hover:text-blue-800">Login</Link>
            <span>/</span>
            <Link to="/legal" className="font-medium text-blue-700 hover:text-blue-800">Legal Center</Link>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">{subtitle}</p>
          <p className="mt-2 text-xs font-medium text-slate-500">Last updated: {lastUpdated}</p>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-6 sm:px-6 md:grid-cols-[1fr_220px]">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {children}
        </article>
        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-800">Policy Pages</h2>
          <nav className="space-y-1">
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="block rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>
      </main>
    </div>
  );
}
