import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, MessageSquare } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOfflineSyncStatus } from '../../hooks';
import { useToast } from '../../hooks/useToast';
import { runOfflineSync } from '../../services/offlineSync';
import { useLocale } from '../../services/i18n';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import type { ReactNode } from 'react';

interface AppShellProps {
  readonly children: ReactNode;
}

const ROLE_THEME: Record<string, { labelKey: string; badgeClass: string; stripClass: string }> = {
  student: {
    labelKey: 'studentWorkspace',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    stripClass: 'bg-blue-600',
  },
  medical_staff: {
    labelKey: 'medicalStaffWorkspace',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    stripClass: 'bg-emerald-600',
  },
  technician: {
    labelKey: 'technicianWorkspace',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    stripClass: 'bg-amber-600',
  },
  pharmacy: {
    labelKey: 'pharmacyWorkspace',
    badgeClass: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    stripClass: 'bg-fuchsia-600',
  },
  specialist: {
    labelKey: 'specialistWorkspace',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
    stripClass: 'bg-violet-600',
  },
  admin: {
    labelKey: 'adminWorkspace',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    stripClass: 'bg-slate-700',
  },
};

export function AppShell({ children }: AppShellProps) {
  const { currentUser } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useLocale();
  const offline = useOfflineSyncStatus();
  const isStudent = currentUser?.role === 'student';
  const mainRef = useRef<HTMLElement | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const roleTheme = currentUser ? ROLE_THEME[currentUser.role] : null;
  const [syncingNow, setSyncingNow] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const openMobileSidebar = useCallback(() => setMobileSidebarOpen(true), []);
  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);
  const showComplaintsQuickTab = Boolean(currentUser) && !location.pathname.startsWith('/complaints');

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

    setMobileSidebarOpen(false);
    node.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!mobileSidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileSidebarOpen]);

  function scrollToTop() {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleRetrySync() {
    if (!offline.isOnline) {
      toast(t('deviceOfflineRetrySync'), 'warning');
      return;
    }

    setSyncingNow(true);
    const summary = await runOfflineSync();
    setSyncingNow(false);

    if (summary.failed > 0) {
      toast(`${t('syncCompletedWithFailuresPrefix')} ${summary.failed} ${t('syncCompletedWithFailuresSuffix')}`, 'warning');
      return;
    }

    toast(`${t('syncCompletePrefix')} ${summary.synced} ${t('syncCompleteSuffix')}`, 'success');
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar onToggleMobileSidebar={openMobileSidebar} />
      <progress
        className="h-0.5 w-full bg-gray-100 [&::-webkit-progress-bar]:bg-gray-100 [&::-webkit-progress-value]:bg-blue-600 [&::-moz-progress-bar]:bg-blue-600"
        max={100}
        value={scrollProgress}
        aria-label={t('pageScrollProgress')}
      />
      {roleTheme && (
        <div className="border-b border-gray-200 bg-white px-4 py-2 text-xs">
          <div className="mx-auto flex max-w-[1400px] items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 font-semibold ${roleTheme.badgeClass}`}>
              {t(roleTheme.labelKey)}
            </span>
          </div>
          <div className={`mt-2 h-0.5 w-full ${roleTheme.stripClass}`} />
        </div>
      )}
      {!offline.isOnline && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-amber-100 border-b border-amber-300 text-amber-900 text-xs font-medium leading-relaxed">
          <span>
            {t('offlineModeEnabled')}
            {offline.pendingCount > 0 && ` ${t('pendingSyncItems')}: ${offline.pendingCount}.`}
          </span>
          <button
            type="button"
            onClick={() => void handleRetrySync()}
            className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-200"
          >
            {t('retrySync')}
          </button>
        </div>
      )}
      {offline.isOnline && offline.pendingCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-blue-50 border-b border-blue-200 text-blue-800 text-xs font-medium leading-relaxed">
          <span>
            {t('backOnlinePrefix')} {offline.pendingCount} {t('changesWaitingSync')}
          </span>
          <button
            type="button"
            onClick={() => void handleRetrySync()}
            disabled={syncingNow}
            className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
          >
            {syncingNow ? t('syncing') : t('syncNow')}
          </button>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar mobileOpen={mobileSidebarOpen} onMobileClose={closeMobileSidebar} />
        <main ref={mainRef} className="relative flex-1 overflow-y-auto">
          <div className={`${isStudent ? 'pb-28 md:pb-6' : 'pb-6'} p-3 sm:p-4 md:p-6`}>
            {children}
          </div>
          <footer className="border-t border-gray-200 bg-white px-4 py-4 md:px-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
              <span className="font-medium text-gray-600">{t('policies')}</span>
              <Link to="/settings" className="hover:text-blue-700">{t('settings')}</Link>
              <Link to="/complaints" className="hover:text-blue-700">{t('complaints')}</Link>
              <Link to="/legal" className="hover:text-blue-700">{t('legalCenter')}</Link>
              <Link to="/legal/privacy" className="hover:text-blue-700">{t('privacy')}</Link>
              <Link to="/legal/terms" className="hover:text-blue-700">{t('terms')}</Link>
              <Link to="/legal/data-rights" className="hover:text-blue-700">{t('dataRights')}</Link>
              <Link to="/legal/data-requests" className="hover:text-blue-700">{t('dataRequests')}</Link>
              <Link to="/legal/acceptance-history" className="hover:text-blue-700">{t('acceptanceHistory')}</Link>
              <Link to="/legal/role-matrix" className="hover:text-blue-700">{t('roleMatrix')}</Link>
              <Link to="/legal/security" className="hover:text-blue-700">{t('security')}</Link>
            </div>
          </footer>
          {showComplaintsQuickTab && (
            <Link
              to="/complaints"
              className="fixed right-0 top-1/2 z-20 hidden -translate-y-1/2 items-center gap-1.5 rounded-l-full border border-r-0 border-blue-200 bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-md hover:bg-blue-700 md:inline-flex"
              aria-label={t('openComplaintsCenter')}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('complaints')}</span>
            </Link>
          )}
          {showScrollTop && (
            <button
              type="button"
              onClick={scrollToTop}
              className="fixed bottom-24 md:bottom-8 right-4 md:right-6 z-20 inline-flex min-h-[42px] items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-md hover:bg-gray-50"
              aria-label={t('scrollToTop')}
            >
              <ArrowUp className="h-3.5 w-3.5" />
              {t('top')}
            </button>
          )}
        </main>
      </div>
      {isStudent && <MobileBottomNav />}
    </div>
  );
}
