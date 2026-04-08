import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const REQUIRED_PAGES = [
  {
    title: 'Privacy Policy',
    to: '/legal/privacy',
    reason: 'Explains what health and account data you collect, why you collect it, and lawful basis.',
  },
  {
    title: 'Terms and Conditions',
    to: '/legal/terms',
    reason: 'Defines acceptable use, responsibilities, service scope, and legal limitations.',
  },
  {
    title: 'Data Rights and Access',
    to: '/legal/data-rights',
    reason: 'Covers patient rights to access, correction, deletion requests, and complaint channels.',
  },
  {
    title: 'Consent and Sensitive Data Notice',
    to: '/legal/consent',
    reason: 'Informs users how explicit consent is obtained and when consent can be withdrawn.',
  },
  {
    title: 'Cookie and Tracking Notice',
    to: '/legal/cookies',
    reason: 'Separates strictly necessary session storage from optional analytics and preferences.',
  },
  {
    title: 'Security and Retention',
    to: '/legal/security',
    reason: 'Describes safeguards, breach response expectations, and retention/deletion timelines.',
  },
  {
    title: 'Role-Based Privacy Matrix',
    to: '/legal/role-matrix',
    reason: 'Defines access limits and obligations for students, staff, technicians, pharmacists, specialists, and admins.',
  },
  {
    title: 'Medical Disclaimer',
    to: '/legal/medical-disclaimer',
    reason: 'Clarifies that the platform does not replace emergency or direct clinical judgement.',
  },
  {
    title: 'Data Request Center',
    to: '/legal/data-requests',
    reason: 'Submit access, correction, and deletion requests with audit ticket IDs and status tracking.',
  },
  {
    title: 'Policy Acceptance History',
    to: '/legal/acceptance-history',
    reason: 'Shows terms and privacy acceptance records tied to your user account.',
  },
  {
    title: 'Policy Update Acceptance',
    to: '/legal/policy-updates',
    reason: 'Re-accept terms and privacy updates before continuing to role dashboards.',
  },
  {
    title: 'PWA Install Diagnostics',
    to: '/legal/pwa-diagnostics',
    reason: 'Checks install readiness on current device and explains why install prompt may be missing.',
  },
] as const;

const LIVE_FEATURES = [
  'Printable policy pages with browser Save as PDF support',
  'Text export for each policy page snapshot',
  'Self-service request forms for access, correction, and deletion',
  'Admin review workflow for legal data requests',
  'Audit ticket IDs attached to every data-rights request',
  'Policy version publishing and mandatory in-app re-acceptance',
  'Per-user policy acceptance history timeline',
] as const;

export default function LegalCenter() {
  const { currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const roleHome: Record<string, string> = {
    student: '/student/dashboard',
    medical_staff: '/staff/dashboard',
    technician: '/technician/upload',
    pharmacy: '/pharmacy/queue',
    specialist: '/specialist/dashboard',
    admin: '/admin/dashboard',
  };

  const fallbackPath = currentUser ? (roleHome[currentUser.role] ?? '/') : '/';

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

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-4 flex items-center justify-between gap-2">
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
          <p className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
            Compliance Foundation
          </p>
          <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
            Legal and Patient Data Pages
          </h1>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">
            This legal center provides the complete policy experience for the Student Health Records platform, including rights management, policy versioning, and acceptance tracking.
          </p>

          <div className="mt-6 grid gap-3">
            {REQUIRED_PAGES.map((page) => (
              <Link
                key={page.to}
                to={page.to}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50"
              >
                <h2 className="text-base font-semibold text-slate-900">{page.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{page.reason}</p>
              </Link>
            ))}
          </div>

          <section className="mt-7 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <h2 className="text-base font-semibold text-emerald-900">Compliance Features Enabled</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-800">
              {LIVE_FEATURES.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </section>

          <p className="mt-6 text-xs text-slate-500">
            Policy lifecycle is active: users can submit data requests, admins can process tickets, and acceptance history is tracked per account.
          </p>
        </div>
      </main>
    </div>
  );
}
