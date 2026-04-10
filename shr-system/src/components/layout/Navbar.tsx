import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  Clock3,
  Command,
  Download,
  LogOut,
  Menu,
  Search,
  UserCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAll, StorageKey, update } from '../../services/storage';
import type { SystemAlert, SystemUser } from '../../types/types';
import { useToast } from '../../hooks';
import { useSimulatedPolling } from '../../hooks/useSimulatedPolling';
import { CommandPalette, type CommandItem } from './CommandPalette';
import { IosInstallGuideModal } from '../shared/IosInstallGuideModal';
import {
  isPwaInstallAvailable,
  promptPwaInstall,
  PWA_EVENT_INSTALL_AVAILABILITY,
} from '../../services/registerServiceWorker';
import {
  getScopedReferralsForUser,
  getScopedRequisitionsForUser,
  getScopedResultsForUser,
} from '../../services/accessScope';

const ROLE_LABELS: Record<string, string> = {
  student: 'Student',
  medical_staff: 'Medical Staff',
  technician: 'Technician',
  pharmacy: 'Pharmacist',
  specialist: 'Specialist',
  admin: 'Administrator',
};

type InstallCtaMode = 'none' | 'prompt' | 'ios-manual' | 'https-required';

interface NavbarProps {
  readonly onToggleMobileSidebar?: () => void;
}

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

export function Navbar({ onToggleMobileSidebar }: NavbarProps) {
  const { currentUser, logout, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [switchUserOpen, setSwitchUserOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [switchingUserId, setSwitchingUserId] = useState<string | null>(null);
  const [iosInstallGuideOpen, setIosInstallGuideOpen] = useState(false);
  const [pwaInstallAvailable, setPwaInstallAvailable] = useState(() => isPwaInstallAvailable());
  const [installCtaMode, setInstallCtaMode] = useState<InstallCtaMode>(() =>
    getInstallCtaMode(isPwaInstallAvailable()),
  );
  const [alerts, setAlerts] = useState<SystemAlert[]>(() =>
    getAll<SystemAlert>(StorageKey.ALERTS).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    ),
  );
  const [now, setNow] = useState(() => new Date());
  const [readAlertIds, setReadAlertIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('shr_alert_read_ids');
      if (!raw) return [];
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const demoUsers = getAll<SystemUser>(StorageKey.USERS).filter((u) => u.isActive);

  const unresolvedAlerts = alerts.filter((a) => !a.isResolved);
  const unreadAlerts = unresolvedAlerts.filter((a) => !readAlertIds.includes(a.id));
  const alertCount = unreadAlerts.length;

  const quickWorkloadLabel = useMemo(() => {
    if (!currentUser) return '';

    const scopedRequisitions = getScopedRequisitionsForUser(currentUser.role, currentUser.id);
    const scopedReferrals = getScopedReferralsForUser(currentUser.role, currentUser.id);
    const scopedResults = getScopedResultsForUser(currentUser.role, currentUser.id);

    if (currentUser.role === 'medical_staff') {
      const pending = scopedRequisitions.filter((r) => r.status === 'Pending Review').length;
      return `${pending} pending reviews`;
    }
    if (currentUser.role === 'specialist') {
      const pending = scopedReferrals.filter(
        (referral) => referral.status === 'Requested' || referral.status === 'Under Review',
      ).length;
      return `${pending} referrals waiting`;
    }
    if (currentUser.role === 'pharmacy') {
      const ready = scopedRequisitions.filter(
        (req) => req.status === 'Approved' || req.status === 'Ready for Pickup',
      ).length;
      return `${ready} ready to dispense`;
    }
    if (currentUser.role === 'technician') {
      const pendingResults = scopedResults
        .filter((result) => result.status === 'Pending' || result.status === 'Processing').length;
      return `${pendingResults} results pending`;
    }
    if (currentUser.role === 'student') {
      const myRequests = scopedRequisitions.length;
      return `${myRequests} total requests`;
    }
    const critical = unresolvedAlerts.filter((alert) => alert.type === 'Critical').length;
    return `${critical} critical alerts`;
  }, [currentUser, unresolvedAlerts]);

  const commandItems: CommandItem[] = useMemo(() => {
    if (!currentUser) return [];

    const byRole: Record<SystemUser['role'], CommandItem[]> = {
      student: [
        { id: 'st-1', label: 'Go to Student Dashboard', hint: '/student/dashboard', keywords: ['home'], onSelect: () => navigate('/student/dashboard') },
        { id: 'st-w', label: 'Open Role Workspace', hint: '/workspace', keywords: ['inbox', 'timeline'], onSelect: () => navigate('/workspace') },
        { id: 'st-c', label: 'Open Complaints Center', hint: '/complaints', keywords: ['complaint', 'issue', 'admin response'], onSelect: () => navigate('/complaints') },
        { id: 'st-2', label: 'Open My Profile', hint: '/student/profile', keywords: ['profile'], onSelect: () => navigate('/student/profile') },
        { id: 'st-3', label: 'Submit New Symptom Report', hint: '/student/submit-symptom', keywords: ['new request'], onSelect: () => navigate('/student/submit-symptom') },
        { id: 'st-4', label: 'Track My Requests', hint: '/student/my-requisitions', keywords: ['status'], onSelect: () => navigate('/student/my-requisitions') },
      ],
      medical_staff: [
        { id: 'ms-1', label: 'Go to Staff Dashboard', hint: '/staff/dashboard', keywords: ['home'], onSelect: () => navigate('/staff/dashboard') },
        { id: 'ms-w', label: 'Open Role Workspace', hint: '/workspace', keywords: ['inbox', 'timeline'], onSelect: () => navigate('/workspace') },
        { id: 'ms-c', label: 'Open Complaints Center', hint: '/complaints', keywords: ['complaint', 'feedback'], onSelect: () => navigate('/complaints') },
        { id: 'ms-2', label: 'Search Patients', hint: '/staff/search', keywords: ['student search'], onSelect: () => navigate('/staff/search') },
        { id: 'ms-3', label: 'Open Review Queue', hint: '/staff/review-queue', keywords: ['pending requisitions'], onSelect: () => navigate('/staff/review-queue') },
        { id: 'ms-4', label: 'Open Referral Feedback', hint: '/staff/referral-feedback', keywords: ['referral'], onSelect: () => navigate('/staff/referral-feedback') },
      ],
      technician: [
        { id: 'te-w', label: 'Open Role Workspace', hint: '/workspace', keywords: ['inbox', 'timeline'], onSelect: () => navigate('/workspace') },
        { id: 'te-c', label: 'Open Complaints Center', hint: '/complaints', keywords: ['complaint', 'feedback'], onSelect: () => navigate('/complaints') },
        { id: 'te-1', label: 'Open Upload Portal', hint: '/technician/upload', keywords: ['lab upload'], onSelect: () => navigate('/technician/upload') },
      ],
      pharmacy: [
        { id: 'ph-w', label: 'Open Role Workspace', hint: '/workspace', keywords: ['inbox', 'timeline'], onSelect: () => navigate('/workspace') },
        { id: 'ph-c', label: 'Open Complaints Center', hint: '/complaints', keywords: ['complaint', 'feedback'], onSelect: () => navigate('/complaints') },
        { id: 'ph-1', label: 'Open Dispensing Queue', hint: '/pharmacy/queue', keywords: ['queue'], onSelect: () => navigate('/pharmacy/queue') },
      ],
      specialist: [
        { id: 'sp-1', label: 'Go to Specialist Dashboard', hint: '/specialist/dashboard', keywords: ['home'], onSelect: () => navigate('/specialist/dashboard') },
        { id: 'sp-w', label: 'Open Role Workspace', hint: '/workspace', keywords: ['inbox', 'timeline'], onSelect: () => navigate('/workspace') },
        { id: 'sp-c', label: 'Open Complaints Center', hint: '/complaints', keywords: ['complaint', 'feedback'], onSelect: () => navigate('/complaints') },
        { id: 'sp-2', label: 'View Referrals', hint: '/specialist/referrals', keywords: ['cases'], onSelect: () => navigate('/specialist/referrals') },
        { id: 'sp-3', label: 'Open Consultation Analytics', hint: '/specialist/analytics', keywords: ['metrics', 'chart'], onSelect: () => navigate('/specialist/analytics') },
      ],
      admin: [
        { id: 'ad-1', label: 'Go to Admin Dashboard', hint: '/admin/dashboard', keywords: ['home'], onSelect: () => navigate('/admin/dashboard') },
        { id: 'ad-w', label: 'Open Role Workspace', hint: '/workspace', keywords: ['inbox', 'timeline'], onSelect: () => navigate('/workspace') },
        { id: 'ad-c', label: 'Open Complaints Center', hint: '/complaints', keywords: ['complaint', 'triage', 'reply'], onSelect: () => navigate('/complaints') },
        { id: 'ad-g', label: 'Open Governance Center', hint: '/admin/governance', keywords: ['quality', 'security', 'observability'], onSelect: () => navigate('/admin/governance') },
        { id: 'ad-2', label: 'Open User Management', hint: '/admin/users', keywords: ['users'], onSelect: () => navigate('/admin/users') },
        { id: 'ad-3', label: 'Open Audit Logs', hint: '/admin/audit-logs', keywords: ['audit'], onSelect: () => navigate('/admin/audit-logs') },
        { id: 'ad-4', label: 'Open Reports', hint: '/admin/reports', keywords: ['reports'], onSelect: () => navigate('/admin/reports') },
        { id: 'ad-5', label: 'Review Data Requests', hint: '/admin/data-requests', keywords: ['privacy requests'], onSelect: () => navigate('/admin/data-requests') },
        { id: 'ad-6', label: 'Manage Policy Versions', hint: '/admin/policy-versions', keywords: ['policy'], onSelect: () => navigate('/admin/policy-versions') },
      ],
    };

    return byRole[currentUser.role] ?? [];
  }, [currentUser, navigate]);

  function refreshAlerts() {
    const latestAlerts = getAll<SystemAlert>(StorageKey.ALERTS)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setAlerts(latestAlerts);
  }

  useSimulatedPolling(15000, refreshAlerts);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('shr_alert_read_ids', JSON.stringify(readAlertIds));
  }, [readAlertIds]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandPaletteOpen((v) => !v);
      }

      if (event.key === 'Escape') {
        setNotificationOpen(false);
        setDropdownOpen(false);
        setCommandPaletteOpen(false);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    function onInstallAvailability(event: Event) {
      const customEvent = event as CustomEvent<{ available?: boolean }>;
      setPwaInstallAvailable(Boolean(customEvent.detail?.available));
    }

    window.addEventListener(PWA_EVENT_INSTALL_AVAILABILITY, onInstallAvailability);
    return () => window.removeEventListener(PWA_EVENT_INSTALL_AVAILABILITY, onInstallAvailability);
  }, []);

  useEffect(() => {
    function refreshInstallMode() {
      setInstallCtaMode(getInstallCtaMode(isPwaInstallAvailable()));
    }

    refreshInstallMode();
    window.addEventListener('focus', refreshInstallMode);
    window.addEventListener('appinstalled', refreshInstallMode);

    return () => {
      window.removeEventListener('focus', refreshInstallMode);
      window.removeEventListener('appinstalled', refreshInstallMode);
    };
  }, []);

  useEffect(() => {
    setInstallCtaMode(getInstallCtaMode(pwaInstallAvailable));
  }, [pwaInstallAvailable]);

  function markAlertAsRead(alertId: string) {
    setReadAlertIds((prev) => (prev.includes(alertId) ? prev : [...prev, alertId]));
  }

  function markAllNotificationsAsRead() {
    const unresolvedIds = unresolvedAlerts.map((alert) => alert.id);
    setReadAlertIds((prev) => Array.from(new Set([...prev, ...unresolvedIds])));
  }

  function resolveAlert(alertId: string) {
    const updated = update<SystemAlert>(StorageKey.ALERTS, alertId, {
      isResolved: true,
      resolvedBy: currentUser?.name ?? 'Unknown User',
    });

    if (!updated) {
      toast('Unable to resolve alert.', 'error');
      return;
    }

    setReadAlertIds((prev) => Array.from(new Set([...prev, alertId])));
    refreshAlerts();
    toast('Alert resolved successfully.', 'success');
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  async function handleSwitchUser(userId: string) {
    setSwitchingUserId(userId);
    const user = await login(userId);
    setSwitchingUserId(null);
    setSwitchUserOpen(false);
    if (!user) return;
    const rolePath: Record<string, string> = {
      student: '/student/dashboard',
      medical_staff: '/staff/dashboard',
      technician: '/technician/upload',
      pharmacy: '/pharmacy/queue',
      specialist: '/specialist/dashboard',
      admin: '/admin/dashboard',
    };
    navigate(rolePath[user.role] ?? '/');
  }

  async function handleInstallApp() {
    if (installCtaMode === 'ios-manual') {
      setIosInstallGuideOpen(true);
      return;
    }

    if (installCtaMode === 'https-required') {
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

  function getPageTitle(pathname: string): string {
    if (pathname.startsWith('/student/dashboard')) return 'Student Dashboard';
    if (pathname.startsWith('/student/profile')) return 'My Profile';
    if (pathname.startsWith('/student/submit-symptom')) return 'Submit Symptom Report';
    if (pathname.startsWith('/student/my-requisitions')) return 'My Requisitions';
    if (pathname.startsWith('/staff/dashboard')) return 'Medical Staff Dashboard';
    if (pathname.startsWith('/staff/search')) return 'Student Search';
    if (pathname.startsWith('/staff/review-queue')) return 'Doctor Review Queue';
    if (pathname.startsWith('/staff/referral-feedback')) return 'Referral Feedback';
    if (pathname.startsWith('/staff/patient/')) return 'Patient Profile';
    if (pathname.startsWith('/technician/upload')) return 'Technician Upload Portal';
    if (pathname.startsWith('/pharmacy/queue')) return 'Pharmacy Queue';
    if (pathname.startsWith('/specialist/dashboard')) return 'Specialist Dashboard';
    if (pathname.startsWith('/specialist/referrals')) return 'Referrals';
    if (pathname.startsWith('/specialist/analytics')) return 'Consultation Analytics';
    if (pathname.startsWith('/specialist/referral/')) return 'Referral Detail';
    if (pathname.startsWith('/admin/dashboard')) return 'Admin Dashboard';
    if (pathname.startsWith('/workspace')) return 'Role Operations Workspace';
    if (pathname.startsWith('/complaints')) return 'Complaints Center';
    if (pathname.startsWith('/settings')) return 'Settings';
    if (pathname.startsWith('/admin/governance')) return 'Admin Governance Center';
    if (pathname.startsWith('/admin/users')) return 'User Management';
    if (pathname.startsWith('/admin/audit-logs')) return 'Audit Logs';
    if (pathname.startsWith('/admin/reports')) return 'System Reports';
    if (pathname.startsWith('/admin/referral-compliance')) return 'Referral Compliance';
    if (pathname.startsWith('/admin/data-requests')) return 'Data Request Review';
    if (pathname.startsWith('/admin/policy-versions')) return 'Policy Versioning';
    if (pathname.startsWith('/legal/data-requests')) return 'Data Request Center';
    if (pathname.startsWith('/legal/policy-updates')) return 'Policy Update Acceptance';
    if (pathname.startsWith('/legal/acceptance-history')) return 'Acceptance History';
    if (pathname.startsWith('/legal/pwa-diagnostics')) return 'Progressive Web App Diagnostics';
    return 'Student Health Records System';
  }

  function getQuickActionForRole() {
    if (!currentUser) return null;
    if (currentUser.role === 'student') {
      return { label: 'New Request', path: '/student/submit-symptom' };
    }
    if (currentUser.role === 'medical_staff') {
      return { label: 'Review Queue', path: '/staff/review-queue' };
    }
    if (currentUser.role === 'technician') {
      return { label: 'Upload Result', path: '/technician/upload' };
    }
    if (currentUser.role === 'pharmacy') {
      return { label: 'Dispense Queue', path: '/pharmacy/queue' };
    }
    if (currentUser.role === 'specialist') {
      return { label: 'Referrals', path: '/specialist/referrals' };
    }
    return { label: 'Audit Logs', path: '/admin/audit-logs' };
  }

  const quickAction = getQuickActionForRole();

  return (
    <header className="border-t-[3px] border-t-blue-600 bg-white shadow-sm z-30 relative">
      <div className="flex items-center justify-between h-14 px-4 md:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          {currentUser && onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="inline-flex md:hidden items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <div className="bg-blue-600 text-white rounded-md px-2 py-1 font-bold text-sm tracking-wider">
            SHR
          </div>
          <span className="hidden sm:block text-xs text-gray-500 font-medium">
            Babcock University
          </span>
        </div>

        {/* Page title */}
        <div className="hidden md:flex md:items-center md:gap-3">
          <h1 className="text-sm font-semibold text-gray-700">{getPageTitle(location.pathname)}</h1>
          <div className="hidden lg:flex items-center gap-2 text-xs text-gray-500 border border-gray-200 rounded-md px-2 py-1">
            <Clock3 className="w-3.5 h-3.5" />
            <span>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {quickWorkloadLabel && (
            <span className="hidden xl:inline-flex rounded-full bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1">
              {quickWorkloadLabel}
            </span>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            aria-label="Open command palette"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Quick Search</span>
            <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
              <Command className="h-3 w-3" />K
            </span>
          </button>

          {quickAction && (
            <button
              type="button"
              onClick={() => navigate(quickAction.path)}
              className="hidden lg:inline-flex rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              {quickAction.label}
            </button>
          )}

          {installCtaMode !== 'none' && (
            <button
              type="button"
              onClick={() => void handleInstallApp()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              aria-label="Install app"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {installCtaMode === 'prompt' ? 'Install App' : installCtaMode === 'ios-manual' ? 'Add to Home Screen' : 'Install Help'}
              </span>
            </button>
          )}

          {/* Notification bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotificationOpen((prev) => !prev);
                if (!notificationOpen) {
                  setDropdownOpen(false);
                  markAllNotificationsAsRead();
                }
              }}
              className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label={`${alertCount} unread alerts`}
            >
            <Bell className="w-5 h-5 text-gray-600" />
            {alertCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                {alertCount}
              </span>
            )}
            </button>

            {notificationOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setNotificationOpen(false)} />
                <div className="absolute right-0 mt-2 w-[360px] max-w-[90vw] rounded-xl bg-white shadow-lg border border-gray-200 py-2 z-20">
                  <div className="flex items-center justify-between px-3 pb-2 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Notifications</p>
                      <p className="text-xs text-gray-500">{unresolvedAlerts.length} unresolved alerts</p>
                    </div>
                    <button
                      type="button"
                      onClick={markAllNotificationsAsRead}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto px-2 pt-2">
                    {unresolvedAlerts.length === 0 ? (
                      <p className="py-8 text-center text-sm text-gray-500">No unresolved alerts.</p>
                    ) : (
                      unresolvedAlerts.slice(0, 8).map((alert) => {
                        const isUnread = !readAlertIds.includes(alert.id);
                        return (
                          <div
                            key={alert.id}
                            className={`mb-2 rounded-lg border px-3 py-2 ${
                              isUnread ? 'border-blue-200 bg-blue-50/40' : 'border-gray-200 bg-white'
                            }`}
                            onMouseEnter={() => markAlertAsRead(alert.id)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-gray-900 leading-snug">{alert.title}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(alert.timestamp).toLocaleString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  alert.type === 'Critical'
                                    ? 'bg-red-100 text-red-700'
                                    : alert.type === 'Warning'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {alert.type}
                              </span>
                            </div>
                            <p className="mt-1.5 text-xs text-gray-600">{alert.message}</p>
                            <div className="mt-2 flex items-center justify-between">
                              {isUnread ? (
                                <span className="text-[11px] text-blue-600 font-medium">New</span>
                              ) : (
                                <span className="text-[11px] text-gray-400">Seen</span>
                              )}
                              <button
                                type="button"
                                onClick={() => resolveAlert(alert.id)}
                                className="text-[11px] font-medium text-green-700 hover:text-green-800"
                              >
                                Mark resolved
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Avatar dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setDropdownOpen((v) => !v);
                setNotificationOpen(false);
              }}
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                {currentUser?.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-800 leading-none max-w-[140px] truncate">
                  {currentUser?.name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {currentUser ? ROLE_LABELS[currentUser.role] : ''}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {currentUser?.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      setSwitchUserOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <UserCircle className="w-4 h-4" />
                    Switch User
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      setCommandPaletteOpen(true);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <span>Quick Search</span>
                    <span className="text-xs text-gray-400">Ctrl/Cmd + K</span>
                  </button>
                  {installCtaMode !== 'none' && (
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        void handleInstallApp();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                    >
                      <Download className="w-4 h-4" />
                      {installCtaMode === 'prompt' ? 'Install App' : installCtaMode === 'ios-manual' ? 'Add to Home Screen' : 'Install Help'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {switchUserOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSwitchUserOpen(false)} />
          <div className="relative z-50 w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200 p-4">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Switch Demo User</h2>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {demoUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => void handleSwitchUser(user.id)}
                  disabled={switchingUserId !== null}
                  className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-60"
                >
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  <div className="text-xs text-gray-500">{ROLE_LABELS[user.role]} • {user.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <CommandPalette
        open={commandPaletteOpen}
        commands={commandItems.map((item) => ({
          ...item,
          onSelect: () => {
            setCommandPaletteOpen(false);
            item.onSelect();
          },
        }))}
        onClose={() => setCommandPaletteOpen(false)}
      />
      <IosInstallGuideModal open={iosInstallGuideOpen} onClose={() => setIosInstallGuideOpen(false)} />
    </header>
  );
}
