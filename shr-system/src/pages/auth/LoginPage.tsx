import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAll, StorageKey } from '../../services/storage';
import type { SystemUser } from '../../types/types';
import { useToast } from '../../hooks';
import { IosInstallGuideModal } from '../../components/shared';
import {
  isPwaInstallAvailable,
  PWA_EVENT_INSTALL_AVAILABILITY,
  promptPwaInstall,
} from '../../services/registerServiceWorker';

interface DemoCredential {
  label: string;
  email: string;
  password: string;
}

interface ResourceLink {
  title: string;
  to: string;
  description: string;
}

const DEMO_CREDENTIALS: DemoCredential[] = [
  { label: 'Student', email: 'student@babcock.edu.ng', password: 'password' },
  { label: 'Medical Staff', email: 'doctor@babcock.edu.ng', password: 'password' },
  { label: 'Technician', email: 'technician@babcock.edu.ng', password: 'password' },
  { label: 'Pharmacist', email: 'pharmacist@babcock.edu.ng', password: 'password' },
  { label: 'Specialist', email: 'specialist@babcock.edu.ng', password: 'password' },
  { label: 'Administrator', email: 'admin@babcock.edu.ng', password: 'password' },
];

const ROLE_REDIRECT: Record<string, string> = {
  student: '/student/dashboard',
  medical_staff: '/staff/dashboard',
  technician: '/technician/upload',
  pharmacy: '/pharmacy/queue',
  specialist: '/specialist/dashboard',
  admin: '/admin/dashboard',
};

const RESOURCE_LINKS: ResourceLink[] = [
  {
    title: 'Legal Center',
    to: '/legal',
    description: 'Policy hub and compliance pages.',
  },
  {
    title: 'Role FAQs',
    to: '/legal/faq',
    description: 'Role-based platform guidance.',
  },
  {
    title: 'Privacy Policy',
    to: '/legal/privacy',
    description: 'How health data is protected.',
  },
  {
    title: 'Terms',
    to: '/legal/terms',
    description: 'Usage terms and responsibilities.',
  },
  {
    title: 'Data Rights',
    to: '/legal/data-rights',
    description: 'Access, correction, and deletion rights.',
  },
  {
    title: 'PWA Diagnostics',
    to: '/legal/pwa-diagnostics',
    description: 'Check app install readiness.',
  },
  {
    title: 'Settings',
    to: '/settings',
    description: 'Technical and system tools.',
  },
];

type InstallCtaMode = 'none' | 'prompt' | 'ios-manual' | 'https-required';
type LoginRouteState = {
  from?: {
    pathname?: string;
    search?: string;
    hash?: string;
  };
};

function getInstallCtaLabel(mode: InstallCtaMode): string {
  if (mode === 'prompt') return 'Install App';
  if (mode === 'ios-manual') return 'Add to Home Screen';
  return 'Install Help';
}

function getInstallCtaMode(installAvailable: boolean): InstallCtaMode {
  if (globalThis.window === undefined) return installAvailable ? 'prompt' : 'none';

  const nav = globalThis.navigator as Navigator & { standalone?: boolean };
  const userAgent = nav.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isMobile = /android|iphone|ipad|ipod/.test(userAgent);
  const isStandalone = globalThis.window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;

  if (isStandalone) return 'none';
  if (installAvailable) return 'prompt';
  if (isIOS) return 'ios-manual';
  if (isMobile && !globalThis.isSecureContext) return 'https-required';

  return 'none';
}

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDemo, setSelectedDemo] = useState('');
  const [iosInstallGuideOpen, setIosInstallGuideOpen] = useState(false);
  const [installMode, setInstallMode] = useState<InstallCtaMode>(() => getInstallCtaMode(isPwaInstallAvailable()));
  const installCtaLabel = getInstallCtaLabel(installMode);

  useEffect(() => {
    function refreshInstallMode() {
      setInstallMode(getInstallCtaMode(isPwaInstallAvailable()));
    }

    function onInstallAvailability(event: Event) {
      const customEvent = event as CustomEvent<{ available?: boolean }>;
      setInstallMode(getInstallCtaMode(Boolean(customEvent.detail?.available)));
    }

    refreshInstallMode();
    globalThis.addEventListener('focus', refreshInstallMode);
    globalThis.addEventListener('appinstalled', refreshInstallMode);
    globalThis.addEventListener(PWA_EVENT_INSTALL_AVAILABILITY, onInstallAvailability);

    return () => {
      globalThis.removeEventListener('focus', refreshInstallMode);
      globalThis.removeEventListener('appinstalled', refreshInstallMode);
      globalThis.removeEventListener(PWA_EVENT_INSTALL_AVAILABILITY, onInstallAvailability);
    };
  }, []);

  function handleDemoSelect(value: string) {
    setSelectedDemo(value);
    if (!value) return;
    const cred = DEMO_CREDENTIALS.find((c) => c.email === value);
    if (cred) {
      setEmail(cred.email);
      setPassword(cred.password);
      setError('');
    }
  }

  async function handleInstallApp() {
    if (installMode === 'ios-manual') {
      setIosInstallGuideOpen(true);
      return;
    }

    if (installMode === 'https-required') {
      toast('Install on mobile requires HTTPS. Open the app with an https:// URL.', 'warning');
      return;
    }

    const outcome = await promptPwaInstall();
    if (outcome === 'accepted') {
      toast('Installing app...', 'info');
      return;
    }
    if (outcome === 'dismissed') {
      toast('Install prompt dismissed.', 'warning');
      return;
    }
    toast('Install is not available yet. Browse for a few seconds and try again.', 'warning');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    // Demo-mode auth: password is collected for realistic UX but not verified server-side.
    const users = getAll<SystemUser>(StorageKey.USERS);
    const matchedUser = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    const user = matchedUser ? await login(matchedUser.id) : null;
    setLoading(false);
    if (!user) {
      setError('Invalid email or account not found. Try a demo credential below.');
      return;
    }
    const state = location.state as LoginRouteState | null;
    const from = state?.from;
    if (from?.pathname && from.pathname !== '/login' && from.pathname !== '/onboarding') {
      const to = `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`;
      navigate(to, { replace: true });
      return;
    }
    navigate(ROLE_REDIRECT[user.role] ?? '/', { replace: true });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100">
      <div className="pointer-events-none absolute -left-20 top-16 h-60 w-60 rounded-full bg-blue-300/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-8 h-72 w-72 rounded-full bg-indigo-300/35 blur-3xl" />

      <div className="relative min-h-screen md:grid md:grid-cols-[42%_58%]">
        <aside className="hidden md:flex flex-col justify-between bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-10 text-white lg:p-12">
          <div>
            <div className="inline-flex items-center rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-lg font-bold tracking-wider">
              SHR
            </div>
            <h1 className="mt-8 text-4xl font-bold leading-tight">Student Health Records Portal</h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-blue-100">
              Secure sign-in for students and care teams with role-based workflows, policy compliance, and mobile-ready access.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="text-xs uppercase tracking-wide text-blue-100">Platform Scope</p>
              <p className="mt-1 text-sm font-semibold">Records, referrals, pharmacy, lab, and governance</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="text-xs uppercase tracking-wide text-blue-100">Access</p>
              <p className="mt-1 text-sm font-semibold">Students, medical staff, technicians, pharmacists, specialists, and administrators</p>
            </div>
          </div>
        </aside>

        <main className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-xl">
            <div className="mb-5 flex items-center justify-center gap-3 md:hidden">
              <div className="rounded-xl bg-blue-600 px-4 py-2 text-base font-bold tracking-wider text-white">SHR</div>
              <p className="text-sm font-medium text-slate-600">Babcock University</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-300/40 sm:p-8">
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 text-xs text-slate-700">
                <span className="font-semibold">New here?</span>{' '}
                <Link to="/" className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-800">
                  Open onboarding (or your dashboard if signed in)
                </Link>
              </div>

              <div className="mt-6">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Sign in</h2>
                <p className="mt-1 text-sm text-slate-500">Use a demo role for quick access or enter your credentials manually.</p>
              </div>

              <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label htmlFor="demo-role-select" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Demo Role Quick Access
                </label>
                <select
                  id="demo-role-select"
                  aria-label="Demo role switcher"
                  value={selectedDemo}
                  onChange={(e) => handleDemoSelect(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a demo role</option>
                  {DEMO_CREDENTIALS.map((c) => (
                    <option key={c.email} value={c.email}>
                      {c.label} ({c.email})
                    </option>
                  ))}
                </select>
              </section>

              <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
                <div className="h-px flex-1 bg-slate-200" />
                <span>Manual sign in</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@babcock.edu.ng"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>

                {installMode !== 'none' && (
                  <button
                    type="button"
                    onClick={() => void handleInstallApp()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 py-2.5 font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    <Download className="h-4 w-4" />
                    {installCtaLabel}
                  </button>
                )}
              </form>

              <p className="mt-5 text-center text-xs text-slate-500">
                Demo system: all demo passwords are{' '}
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700">password</span>
              </p>

              <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-800">Legal and support pages</h3>
                <p className="mt-1 text-xs text-slate-500">Quick access to required policies and technical support tools.</p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {RESOURCE_LINKS.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 transition-colors hover:border-blue-200 hover:bg-blue-50"
                    >
                      <p className="text-xs font-semibold text-slate-800">{item.title}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{item.description}</p>
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
      <IosInstallGuideModal open={iosInstallGuideOpen} onClose={() => setIosInstallGuideOpen(false)} />
    </div>
  );
}
