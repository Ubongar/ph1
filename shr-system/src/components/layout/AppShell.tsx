import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOfflineSyncStatus } from '../../hooks';
import { useToast } from '../../hooks/useToast';
import { runOfflineSync } from '../../services/offlineSync';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

const ROLE_THEME: Record<string, { label: string; badgeClass: string; stripClass: string }> = {
  student: {
    label: 'Student Workspace',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    stripClass: 'bg-blue-600',
  },
  medical_staff: {
    label: 'Medical Staff Workspace',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    stripClass: 'bg-emerald-600',
  },
  technician: {
    label: 'Technician Workspace',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    stripClass: 'bg-amber-600',
  },
  pharmacy: {
    label: 'Pharmacy Workspace',
    badgeClass: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    stripClass: 'bg-fuchsia-600',
  },
  specialist: {
    label: 'Specialist Workspace',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
    stripClass: 'bg-violet-600',
  },
  admin: {
    label: 'Administrator Workspace',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    stripClass: 'bg-slate-700',
  },
};

export function AppShell({ children }: AppShellProps) {
  const { currentUser } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const offline = useOfflineSyncStatus();
  const isStudent = currentUser?.role === 'student';
  const mainRef = useRef<HTMLElement | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const roleTheme = currentUser ? ROLE_THEME[currentUser.role] : null;
  const [syncingNow, setSyncingNow] = useState(false);

  useEffect(() => {
    const element = mainRef.current;
    if (!element) return;

    function onScroll() {
      const node = mainRef.current;
      if (!node) return;
      const totalScrollable = node.scrollHeight - node.clientHeight;
      const ratio = totalScrollable <= 0 ? 0 : node.scrollTop / totalScrollable;
      setScrollProgress(Math.max(0, Math.min(100, ratio * 100)));
      setShowScrollTop(node.scrollTop > 320);
    }

    onScroll();
    element.addEventListener('scroll', onScroll);
    return () => element.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const node = mainRef.current;
    if (!node) return;

    node.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  function scrollToTop() {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleRetrySync() {
    if (!offline.isOnline) {
      toast('Device is offline. Reconnect and retry sync.', 'warning');
      return;
    }

    setSyncingNow(true);
    const summary = await runOfflineSync();
    setSyncingNow(false);

    if (summary.failed > 0) {
      toast(`Sync completed with ${summary.failed} failed item(s).`, 'warning');
      return;
    }

    toast(`Sync complete: ${summary.synced} change(s) sent.`, 'success');
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      <progress
        className="h-0.5 w-full bg-gray-100 [&::-webkit-progress-bar]:bg-gray-100 [&::-webkit-progress-value]:bg-blue-600 [&::-moz-progress-bar]:bg-blue-600"
        max={100}
        value={scrollProgress}
        aria-label="Page scroll progress"
      />
      {roleTheme && (
        <div className="border-b border-gray-200 bg-white px-4 py-2 text-xs">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-2">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 font-semibold ${roleTheme.badgeClass}`}>
              {roleTheme.label}
            </span>
            <div className="flex items-center gap-2 text-gray-500">
              <span>You can open install diagnostics from Legal Center.</span>
              <Link to="/legal/pwa-diagnostics" className="font-medium text-blue-700 hover:text-blue-800">
                Open Diagnostics
              </Link>
            </div>
          </div>
          <div className={`mt-2 h-0.5 w-full ${roleTheme.stripClass}`} />
        </div>
      )}
      {!offline.isOnline && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-amber-100 border-b border-amber-300 text-amber-900 text-xs font-medium leading-relaxed">
          <span>
            Offline mode enabled. Changes are saved locally and will sync automatically when connectivity returns.
            {offline.pendingCount > 0 && ` Pending sync items: ${offline.pendingCount}.`}
          </span>
          <button
            type="button"
            onClick={() => void handleRetrySync()}
            className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-200"
          >
            Retry Sync
          </button>
        </div>
      )}
      {offline.isOnline && offline.pendingCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-blue-50 border-b border-blue-200 text-blue-800 text-xs font-medium leading-relaxed">
          <span>
            Back online. {offline.pendingCount} change(s) waiting to sync.
          </span>
          <button
            type="button"
            onClick={() => void handleRetrySync()}
            disabled={syncingNow}
            className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
          >
            {syncingNow ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main ref={mainRef} className="relative flex-1 overflow-y-auto">
          <div className={`${isStudent ? 'pb-28 md:pb-6' : 'pb-6'} p-3 sm:p-4 md:p-6`}>
            {children}
          </div>
          <footer className="border-t border-gray-200 bg-white px-4 py-4 md:px-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
              <span className="font-medium text-gray-600">Policies</span>
              <Link to="/legal" className="hover:text-blue-700">Legal Center</Link>
              <Link to="/legal/privacy" className="hover:text-blue-700">Privacy</Link>
              <Link to="/legal/terms" className="hover:text-blue-700">Terms</Link>
              <Link to="/legal/data-rights" className="hover:text-blue-700">Data Rights</Link>
              <Link to="/legal/data-requests" className="hover:text-blue-700">Data Requests</Link>
              <Link to="/legal/acceptance-history" className="hover:text-blue-700">Acceptance History</Link>
              <Link to="/legal/role-matrix" className="hover:text-blue-700">Role Matrix</Link>
              <Link to="/legal/security" className="hover:text-blue-700">Security</Link>
            </div>
          </footer>
          {showScrollTop && (
            <button
              type="button"
              onClick={scrollToTop}
              className="fixed bottom-24 md:bottom-8 right-4 md:right-6 z-20 inline-flex min-h-[42px] items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-md hover:bg-gray-50"
              aria-label="Scroll to top"
            >
              <ArrowUp className="h-3.5 w-3.5" />
              Top
            </button>
          )}
        </main>
      </div>
      {isStudent && <MobileBottomNav />}
    </div>
  );
}
