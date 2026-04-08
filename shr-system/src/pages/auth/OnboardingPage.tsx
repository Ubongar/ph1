import { ArrowRight, CheckCircle2, ShieldCheck, Smartphone, Stethoscope } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const ROLE_GUIDE = [
  { role: 'Student', description: 'Submit symptoms, track requisitions, and access your profile safely.' },
  { role: 'Medical Staff', description: 'Review records, run encounters, and coordinate specialist referrals.' },
  { role: 'Technician & Pharmacy', description: 'Process lab uploads and medication queues with clear workflows.' },
  { role: 'Specialist & Admin', description: 'Handle consultations, governance, and system-wide compliance oversight.' },
];

export default function OnboardingPage() {
  const location = useLocation();

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-cyan-500/25 blur-3xl animate-pulse motion-reduce:animate-none" />
      <div className="pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl animate-pulse motion-reduce:animate-none [animation-delay:1.4s]" />
      <div className="pointer-events-none absolute bottom-6 left-1/4 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl animate-pulse motion-reduce:animate-none [animation-delay:2.2s]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-10 md:px-10">
        <header className="mb-10 flex items-center justify-between">
          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-lg font-semibold tracking-wider">SHR</div>
          <div className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium tracking-wide text-blue-100">
            PWA Ready · iPhone + Android
          </div>
        </header>

        <main className="grid flex-1 gap-8 lg:grid-cols-[1.2fr_1fr]">
          <section className="rounded-3xl border border-white/15 bg-white/10 p-7 shadow-2xl backdrop-blur-xl md:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-400/15 px-3 py-1 text-xs font-semibold tracking-wide text-cyan-100">
              Health platform onboarding
            </div>
            <h1 className="text-3xl font-bold leading-tight md:text-5xl">
              Welcome to the Student Health Records System
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-blue-100 md:text-base">
              Manage visits, prescriptions, lab flow, referrals, and compliance in one secure system with a smooth
              cross-device experience before you sign in.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/15 bg-slate-900/45 p-4 transition hover:-translate-y-0.5 hover:bg-slate-900/65">
                <div className="mb-2 flex items-center gap-2 text-cyan-200"><ShieldCheck className="h-4 w-4" /> Secure by design</div>
                <p className="text-sm text-slate-200">Privacy-focused records, role-based access, and policy controls.</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-slate-900/45 p-4 transition hover:-translate-y-0.5 hover:bg-slate-900/65">
                <div className="mb-2 flex items-center gap-2 text-emerald-200"><Stethoscope className="h-4 w-4" /> Clinical workflow</div>
                <p className="text-sm text-slate-200">Built for real care teams from triage to specialist review.</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-slate-900/45 p-4 transition hover:-translate-y-0.5 hover:bg-slate-900/65">
                <div className="mb-2 flex items-center gap-2 text-violet-200"><Smartphone className="h-4 w-4" /> Mobile first</div>
                <p className="text-sm text-slate-200">Installable app behavior with offline support for mobile devices.</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-slate-900/45 p-4 transition hover:-translate-y-0.5 hover:bg-slate-900/65">
                <div className="mb-2 flex items-center gap-2 text-amber-200"><CheckCircle2 className="h-4 w-4" /> Guided usage</div>
                <p className="text-sm text-slate-200">Clear role pathways and legal center links before login.</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                state={location.state}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
              >
                Continue to Login <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/legal/pwa-diagnostics"
                className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-blue-100 transition hover:bg-white/20"
              >
                Installation Diagnostics
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-2">
                <p className="text-lg font-bold text-emerald-200">6+</p>
                <p className="text-xs text-emerald-100/90">Role-aware workflows</p>
              </div>
              <div className="rounded-xl border border-violet-300/30 bg-violet-500/10 px-3 py-2">
                <p className="text-lg font-bold text-violet-200">PWA</p>
                <p className="text-xs text-violet-100/90">Mobile install support</p>
              </div>
              <div className="rounded-xl border border-amber-300/30 bg-amber-500/10 px-3 py-2">
                <p className="text-lg font-bold text-amber-200">24/7</p>
                <p className="text-xs text-amber-100/90">Anytime record access</p>
              </div>
            </div>
          </section>

          <aside className="rounded-3xl border border-white/15 bg-white/10 p-7 shadow-2xl backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-blue-100">Quick Role Guide</h2>
            <ul className="mt-4 space-y-3">
              {ROLE_GUIDE.map((item) => (
                <li key={item.role} className="rounded-xl border border-white/15 bg-slate-900/45 p-3">
                  <p className="text-sm font-semibold text-white">{item.role}</p>
                  <p className="mt-1 text-xs text-slate-200">{item.description}</p>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl border border-white/15 bg-slate-900/45 p-4 text-xs text-blue-100">
              iPhone: open in Safari and use <span className="font-semibold">Add to Home Screen</span>. Android:
              use <span className="font-semibold">Install app</span> from Chrome prompt or browser menu.
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-blue-100/90">
              <Link to="/legal/privacy" className="hover:text-white">Privacy</Link>
              <Link to="/legal/terms" className="hover:text-white">Terms</Link>
              <Link to="/legal/faq" className="hover:text-white">FAQs</Link>
              <Link to="/legal" className="hover:text-white">Legal Center</Link>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
