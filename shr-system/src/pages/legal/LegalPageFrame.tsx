import { useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, FileClock, Printer } from 'lucide-react';
import { getLatestPolicyVersion } from '../../services/compliance';
import type { PolicyType } from '../../types/types';
import { useAuth } from '../../context/AuthContext';

interface LegalPageFrameProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  policyType?: PolicyType;
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
  { label: 'Data Request Center', to: '/legal/data-requests' },
  { label: 'Acceptance History', to: '/legal/acceptance-history' },
  { label: 'Policy Updates', to: '/legal/policy-updates' },
] as const;

export default function LegalPageFrame({ title, subtitle, lastUpdated, policyType, children }: LegalPageFrameProps) {
  const { currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const articleRef = useRef<HTMLElement | null>(null);

  const roleHome: Record<string, string> = {
    student: '/student/dashboard',
    medical_staff: '/staff/dashboard',
    technician: '/technician/upload',
    pharmacy: '/pharmacy/queue',
    specialist: '/specialist/dashboard',
    admin: '/admin/dashboard',
  };

  const fallbackPath = currentUser ? (roleHome[currentUser.role] ?? '/') : '/';

  const currentVersion = useMemo(
    () => (policyType ? getLatestPolicyVersion(policyType) : null),
    [policyType],
  );

  function handlePrint() {
    window.print();
  }

  function handleShrClick() {
    navigate(fallbackPath);
  }

  function handleReturnClick() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallbackPath);
  }

  function handleDownload() {
    const articleText = articleRef.current?.innerText?.trim();
    if (!articleText) return;

    const headerLines = [
      title,
      `Last updated: ${lastUpdated}`,
      currentVersion ? `Version: ${currentVersion.version}` : undefined,
      '---',
      articleText,
    ].filter(Boolean);

    const blob = new Blob([headerLines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    anchor.href = url;
    anchor.download = `${safeName}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <div className="mb-3 flex items-center justify-between gap-2 print:hidden">
            <button
              type="button"
              onClick={handleShrClick}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-bold tracking-wider text-white hover:bg-blue-700"
            >
              SHR
            </button>
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleReturnClick}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Return to Previous Page
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Link to={isAuthenticated ? fallbackPath : '/login'} className="font-medium text-blue-700 hover:text-blue-800">
              {isAuthenticated ? 'Dashboard' : 'Login'}
            </Link>
            <span>/</span>
            <Link to="/legal" className="font-medium text-blue-700 hover:text-blue-800">Legal Center</Link>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">{subtitle}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <span>Last updated: {lastUpdated}</span>
            {currentVersion && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                <FileClock className="h-3.5 w-3.5" />
                Version {currentVersion.version}
              </span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              Download Text Export
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-6 sm:px-6 md:grid-cols-[1fr_220px]">
        <article ref={articleRef} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {children}
        </article>
        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
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
