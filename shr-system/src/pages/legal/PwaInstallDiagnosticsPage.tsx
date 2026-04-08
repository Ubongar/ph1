import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, RefreshCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks';
import {
  isPwaInstallAvailable,
  PWA_EVENT_INSTALL_AVAILABILITY,
  promptPwaInstall,
} from '../../services/registerServiceWorker';
import { IosInstallGuideModal } from '../../components/shared/IosInstallGuideModal';

type InstallCtaMode = 'none' | 'prompt' | 'ios-manual' | 'https-required';

type CheckStatus = 'pass' | 'warn' | 'fail';

interface ManifestInsights {
  hasManifestLink: boolean;
  hasRequiredIcons: boolean;
  hasShortcuts: boolean;
  hasScreenshots: boolean;
  startUrl: string | null;
}

const ROLE_HOME: Record<string, string> = {
  student: '/student/dashboard',
  medical_staff: '/staff/dashboard',
  technician: '/technician/upload',
  pharmacy: '/pharmacy/queue',
  specialist: '/specialist/dashboard',
  admin: '/admin/dashboard',
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

function statusClass(status: CheckStatus): string {
  if (status === 'pass') return 'bg-green-50 text-green-700 border-green-200';
  if (status === 'warn') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  return 'bg-red-50 text-red-700 border-red-200';
}

export default function PwaInstallDiagnosticsPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [installAvailable, setInstallAvailable] = useState(() => isPwaInstallAvailable());
  const [manifestInsights, setManifestInsights] = useState<ManifestInsights>({
    hasManifestLink: false,
    hasRequiredIcons: false,
    hasShortcuts: false,
    hasScreenshots: false,
    startUrl: null,
  });
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);
  const [openIosGuide, setOpenIosGuide] = useState(false);
  const backTarget = currentUser ? (ROLE_HOME[currentUser.role] ?? '/login') : '/login';
  const backLabel = currentUser ? 'Back to Dashboard' : 'Back to Login';

  const installMode = useMemo(() => getInstallCtaMode(installAvailable), [installAvailable]);

  useEffect(() => {
    async function inspectManifest() {
      const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
      if (!link?.href) {
        setManifestInsights({
          hasManifestLink: false,
          hasRequiredIcons: false,
          hasShortcuts: false,
          hasScreenshots: false,
          startUrl: null,
        });
        return;
      }

      try {
        const response = await fetch(link.href, { cache: 'no-store' });
        const manifest = await response.json() as {
          icons?: Array<{ sizes?: string }>;
          shortcuts?: Array<{ name?: string; url?: string }>;
          screenshots?: Array<{ src?: string }>;
          start_url?: string;
        };

        const sizes = (manifest.icons ?? []).map((icon) => icon.sizes ?? '');
        const has192 = sizes.some((size) => size.includes('192x192'));
        const has512 = sizes.some((size) => size.includes('512x512'));

        setManifestInsights({
          hasManifestLink: true,
          hasRequiredIcons: has192 && has512,
          hasShortcuts: (manifest.shortcuts?.length ?? 0) > 0,
          hasScreenshots: (manifest.screenshots?.length ?? 0) > 0,
          startUrl: manifest.start_url ?? null,
        });
      } catch {
        setManifestInsights({
          hasManifestLink: true,
          hasRequiredIcons: false,
          hasShortcuts: false,
          hasScreenshots: false,
          startUrl: null,
        });
      }
    }

    async function inspectServiceWorker() {
      if (!('serviceWorker' in navigator)) {
        setServiceWorkerReady(false);
        return;
      }

      try {
        const registration = await navigator.serviceWorker.getRegistration();
        setServiceWorkerReady(Boolean(registration));
      } catch {
        setServiceWorkerReady(false);
      }
    }

    function onInstallAvailability(event: Event) {
      const customEvent = event as CustomEvent<{ available?: boolean }>;
      setInstallAvailable(Boolean(customEvent.detail?.available));
    }

    setInstallAvailable(isPwaInstallAvailable());
    void inspectManifest();
    void inspectServiceWorker();

    window.addEventListener('focus', inspectManifest);
    window.addEventListener('focus', inspectServiceWorker);
    window.addEventListener(PWA_EVENT_INSTALL_AVAILABILITY, onInstallAvailability);

    return () => {
      window.removeEventListener('focus', inspectManifest);
      window.removeEventListener('focus', inspectServiceWorker);
      window.removeEventListener(PWA_EVENT_INSTALL_AVAILABILITY, onInstallAvailability);
    };
  }, []);

  async function handleInstallAttempt() {
    if (installMode === 'ios-manual') {
      setOpenIosGuide(true);
      return;
    }

    if (installMode === 'https-required') {
      toast('Install on mobile requires HTTPS. Open the app with an https:// URL.', 'warning');
      return;
    }

    const outcome = await promptPwaInstall();
    if (outcome === 'accepted') {
      toast('Install flow started.', 'success');
      return;
    }
    if (outcome === 'dismissed') {
      toast('Install prompt dismissed.', 'warning');
      return;
    }

    toast('Install prompt is not ready yet.', 'warning');
  }

  function handleBackNavigation() {
    navigate(backTarget);
  }

  const checks = [
    {
      label: 'Secure Context',
      value: window.isSecureContext ? 'Yes' : 'No',
      status: window.isSecureContext ? 'pass' : 'fail',
      hint: 'Mobile install prompts require HTTPS except localhost.',
    },
    {
      label: 'Manifest Linked',
      value: manifestInsights.hasManifestLink ? 'Yes' : 'No',
      status: manifestInsights.hasManifestLink ? 'pass' : 'fail',
      hint: 'A rel=manifest link is required for installability.',
    },
    {
      label: 'Required Icons (192 & 512)',
      value: manifestInsights.hasRequiredIcons ? 'Present' : 'Missing',
      status: manifestInsights.hasRequiredIcons ? 'pass' : 'fail',
      hint: 'Android and Chrome rely on these icon sizes.',
    },
    {
      label: 'Manifest Shortcuts',
      value: manifestInsights.hasShortcuts ? 'Configured' : 'Not Configured',
      status: manifestInsights.hasShortcuts ? 'pass' : 'warn',
      hint: 'Shortcuts improve quick actions from app icon.',
    },
    {
      label: 'Manifest Screenshots',
      value: manifestInsights.hasScreenshots ? 'Configured' : 'Not Configured',
      status: manifestInsights.hasScreenshots ? 'pass' : 'warn',
      hint: 'Screenshots improve install dialog quality on Android.',
    },
    {
      label: 'Service Worker Registered',
      value: serviceWorkerReady ? 'Yes' : 'No',
      status: serviceWorkerReady ? 'pass' : 'warn',
      hint: 'Offline and update flow depend on registration.',
    },
    {
      label: 'Install Prompt Captured',
      value: installAvailable ? 'Yes' : 'No',
      status: installAvailable ? 'pass' : 'warn',
      hint: 'Prompt appears after some user interaction on supported browsers.',
    },
    {
      label: 'Manifest Start URL',
      value: manifestInsights.startUrl ?? 'Not Found',
      status: manifestInsights.startUrl ? 'pass' : 'warn',
      hint: 'Defines entry point when launched from home screen.',
    },
  ] as Array<{ label: string; value: string; status: CheckStatus; hint: string }>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">PWA Diagnostics</p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900">Installability Checker</h1>
              <p className="mt-2 text-sm text-gray-600">
                Use this page on your phone or laptop to quickly see what blocks installation.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleBackNavigation}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <ArrowLeft className="h-4 w-4" />
                {backLabel}
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh Checks
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3">
            {checks.map((check) => (
              <div key={check.label} className="rounded-xl border border-gray-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{check.label}</p>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(check.status)}`}>
                    {check.value}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-600">{check.hint}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleInstallAttempt()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              {installMode === 'prompt' ? 'Try Install Prompt' : installMode === 'ios-manual' ? 'Open iOS Install Guide' : 'Install Help'}
            </button>
            <span className="text-xs text-gray-500">
              Current mode: {installMode}
            </span>
          </div>
        </div>
      </div>

      <IosInstallGuideModal open={openIosGuide} onClose={() => setOpenIosGuide(false)} />
    </div>
  );
}
