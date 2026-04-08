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

type InstallCtaMode = 'none' | 'prompt' | 'ios-manual' | 'https-required';
type LoginRouteState = {
  from?: {
    pathname?: string;
    search?: string;
    hash?: string;
  };
};

function getInstallCtaMode(installAvailable: boolean): InstallCtaMode {
  if (typeof window === 'undefined') return installAvailable ? 'prompt' : 'none';

  const nav = window.navigator as Navigator & { standalone?: boolean };
  const userAgent = nav.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isMobile = /android|iphone|ipad|ipod/.test(userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;

  if (isStandalone) return 'none';
  if (installAvailable) return 'prompt';
  if (isIOS) return 'ios-manual';
  if (isMobile && !window.isSecureContext) return 'https-required';

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

  useEffect(() => {
    function refreshInstallMode() {
      setInstallMode(getInstallCtaMode(isPwaInstallAvailable()));
    }

    function onInstallAvailability(event: Event) {
      const customEvent = event as CustomEvent<{ available?: boolean }>;
      setInstallMode(getInstallCtaMode(Boolean(customEvent.detail?.available)));
    }

    refreshInstallMode();
    window.addEventListener('focus', refreshInstallMode);
    window.addEventListener('appinstalled', refreshInstallMode);
    window.addEventListener(PWA_EVENT_INSTALL_AVAILABILITY, onInstallAvailability);

    return () => {
      window.removeEventListener('focus', refreshInstallMode);
      window.removeEventListener('appinstalled', refreshInstallMode);
      window.removeEventListener(PWA_EVENT_INSTALL_AVAILABILITY, onInstallAvailability);
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
    const hasValidFromPath = Boolean(
      from?.pathname && from.pathname !== '/login' && from.pathname !== '/onboarding',
    );
    if (hasValidFromPath) {
      navigate(`${from?.pathname}${from?.search ?? ''}${from?.hash ?? ''}`, { replace: true });
      return;
    }
    navigate(ROLE_REDIRECT[user.role] ?? '/', { replace: true });
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden md:flex w-[40%] bg-gradient-to-br from-blue-700 to-blue-900 flex-col items-center justify-center p-12 text-white">
        <div className="bg-white/20 rounded-2xl px-6 py-3 mb-8">
          <span className="text-3xl font-bold tracking-widest">SHR</span>
        </div>
        <h1 className="text-3xl font-bold text-center leading-tight mb-4">
          Student Health Records
        </h1>
        <p className="text-blue-200 text-center text-lg leading-relaxed">
          Babcock University Student Health Records System — secure, fast, and comprehensive
          healthcare management.
        </p>
        <div className="mt-12 grid grid-cols-2 gap-4 w-full max-w-xs text-center text-sm">
          {[
            ['🏥', 'Clinic Records'],
            ['💊', 'Pharmacy'],
            ['🔬', 'Lab Results'],
            ['🛡️', 'Secure & Private'],
          ].map(([icon, label]) => (
            <div key={label} className="bg-white/10 rounded-xl p-3">
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-blue-100 font-medium">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="md:hidden flex items-center justify-center mb-8">
            <div className="bg-blue-600 text-white rounded-xl px-4 py-2 font-bold text-xl tracking-wider">
              SHR
            </div>
            <span className="ml-3 text-gray-600 font-medium">Babcock University</span>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="mb-4 text-xs text-gray-500">
              New here? <Link to="/onboarding" className="font-medium text-blue-700 hover:text-blue-800">View system onboarding</Link>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h2>
            <p className="text-gray-500 text-sm mb-6">Access your health records portal</p>

            {/* Demo switcher */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Demo Role Switcher
              </label>
              <select
                aria-label="Demo role switcher"
                value={selectedDemo}
                onChange={(e) => handleDemoSelect(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">— Select a demo role —</option>
                {DEMO_CREDENTIALS.map((c) => (
                  <option key={c.email} value={c.email}>
                    {c.label} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs text-gray-400">
                <span className="bg-white px-2">or enter credentials manually</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@babcock.edu.ng"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="mb-5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {error && (
                <div className="mb-4 flex items-start gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

              {installMode !== 'none' && (
                <button
                  type="button"
                  onClick={() => void handleInstallApp()}
                  className="mt-3 w-full border border-blue-200 bg-blue-50 text-blue-700 font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 hover:bg-blue-100"
                >
                  <Download className="w-4 h-4" />
                  {installMode === 'prompt' ? 'Install App' : installMode === 'ios-manual' ? 'Add to Home Screen' : 'Install Help'}
                </button>
              )}
            </form>

            <p className="text-center text-xs text-gray-400 mt-6">
              Demo system — all passwords are{' '}
              <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">password</code>
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-gray-500">
              <Link to="/legal" className="hover:text-blue-700">Legal Center</Link>
              <Link to="/legal/faq" className="hover:text-blue-700">Role FAQs</Link>
              <Link to="/legal/privacy" className="hover:text-blue-700">Privacy</Link>
              <Link to="/legal/terms" className="hover:text-blue-700">Terms</Link>
              <Link to="/legal/data-rights" className="hover:text-blue-700">Data Rights</Link>
              <Link to="/legal/pwa-diagnostics" className="hover:text-blue-700">PWA Diagnostics</Link>
            </div>
          </div>
        </div>
      </div>
      <IosInstallGuideModal open={iosInstallGuideOpen} onClose={() => setIosInstallGuideOpen(false)} />
    </div>
  );
}
