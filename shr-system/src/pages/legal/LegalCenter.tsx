import { Link } from 'react-router-dom';

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
] as const;

const EXTRA_FEATURES = [
  'Downloadable PDF exports of each legal policy',
  'Consent history timeline in each patient profile',
  'Self-service request forms for access, correction, and deletion',
  'Role-specific privacy highlights (Student, Staff, Specialist, Admin)',
  'Audit receipt IDs for legal requests submitted in-app',
  'Automated reminders for policy re-acceptance when terms change',
] as const;

export default function LegalCenter() {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
            Compliance Foundation
          </p>
          <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
            Legal and Patient Data Pages
          </h1>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">
            For a health-related system, these pages should exist before production rollout. They are written in a production-style format so you can carry them forward when this mock system becomes a real service.
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
            <h2 className="text-base font-semibold text-emerald-900">Recommended Next Features</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-800">
              {EXTRA_FEATURES.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </section>

          <p className="mt-6 text-xs text-slate-500">
            Important: This content is a strong baseline template and should be reviewed by legal/compliance experts before production use.
          </p>
        </div>
      </main>
    </div>
  );
}
