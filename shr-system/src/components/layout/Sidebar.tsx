import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Search, ClipboardList,
  ShoppingBag, Users, FileText, BarChart3, Upload, Stethoscope, ShieldCheck,
  ChevronLeft, ChevronRight, UserCircle, PlusCircle, MessageSquare, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types/types';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  student: [
    { label: 'Dashboard', to: '/student/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Workspace', to: '/workspace', icon: <ClipboardList className="w-5 h-5" /> },
    { label: 'Complaints', to: '/complaints', icon: <MessageSquare className="w-5 h-5" /> },
    { label: 'My Profile', to: '/student/profile', icon: <UserCircle className="w-5 h-5" /> },
    { label: 'New Request', to: '/student/submit-symptom', icon: <PlusCircle className="w-5 h-5" /> },
    { label: 'My Requests', to: '/student/my-requisitions', icon: <ClipboardList className="w-5 h-5" /> },
  ],
  medical_staff: [
    { label: 'Dashboard', to: '/staff/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Workspace', to: '/workspace', icon: <ClipboardList className="w-5 h-5" /> },
    { label: 'Complaints', to: '/complaints', icon: <MessageSquare className="w-5 h-5" /> },
    { label: 'Search Patients', to: '/staff/search', icon: <Search className="w-5 h-5" /> },
    { label: 'Review Queue', to: '/staff/review-queue', icon: <ClipboardList className="w-5 h-5" /> },
    { label: 'Referral Feedback', to: '/staff/referral-feedback', icon: <Stethoscope className="w-5 h-5" /> },
  ],
  technician: [
    { label: 'Workspace', to: '/workspace', icon: <ClipboardList className="w-5 h-5" /> },
    { label: 'Complaints', to: '/complaints', icon: <MessageSquare className="w-5 h-5" /> },
    { label: 'Upload Results', to: '/technician/upload', icon: <Upload className="w-5 h-5" /> },
  ],
  pharmacy: [
    { label: 'Workspace', to: '/workspace', icon: <ClipboardList className="w-5 h-5" /> },
    { label: 'Complaints', to: '/complaints', icon: <MessageSquare className="w-5 h-5" /> },
    { label: 'Dispensing Queue', to: '/pharmacy/queue', icon: <ShoppingBag className="w-5 h-5" /> },
  ],
  specialist: [
    { label: 'Dashboard', to: '/specialist/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Workspace', to: '/workspace', icon: <ClipboardList className="w-5 h-5" /> },
    { label: 'Complaints', to: '/complaints', icon: <MessageSquare className="w-5 h-5" /> },
    { label: 'Referrals', to: '/specialist/referrals', icon: <Stethoscope className="w-5 h-5" /> },
    { label: 'Analytics', to: '/specialist/analytics', icon: <BarChart3 className="w-5 h-5" /> },
  ],
  admin: [
    { label: 'Dashboard', to: '/admin/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Workspace', to: '/workspace', icon: <ClipboardList className="w-5 h-5" /> },
    { label: 'Complaints', to: '/complaints', icon: <MessageSquare className="w-5 h-5" /> },
    { label: 'Governance Center', to: '/admin/governance', icon: <ShieldCheck className="w-5 h-5" /> },
    { label: 'Users', to: '/admin/users', icon: <Users className="w-5 h-5" /> },
    { label: 'Audit Logs', to: '/admin/audit-logs', icon: <FileText className="w-5 h-5" /> },
    { label: 'Reports', to: '/admin/reports', icon: <BarChart3 className="w-5 h-5" /> },
    { label: 'Referral Compliance', to: '/admin/referral-compliance', icon: <ShieldCheck className="w-5 h-5" /> },
    { label: 'Data Requests', to: '/admin/data-requests', icon: <ClipboardList className="w-5 h-5" /> },
    { label: 'Policy Versions', to: '/admin/policy-versions', icon: <FileText className="w-5 h-5" /> },
    { label: 'Reconciliation', to: '/admin/reconciliation', icon: <ShieldCheck className="w-5 h-5" /> },
    { label: 'Server Audit Trail', to: '/admin/server-audit-logs', icon: <ShieldCheck className="w-5 h-5" /> },
  ],
};

const LEGAL_LINKS = [
  { to: '/settings', short: 'ST', label: 'Settings' },
  { to: '/legal', short: 'LC', label: 'Legal Center' },
  { to: '/legal/privacy', short: 'PP', label: 'Privacy Policy' },
  { to: '/legal/faq', short: 'FAQ', label: 'Role FAQs' },
  { to: '/legal/data-requests', short: 'DR', label: 'Data Requests' },
  { to: '/legal/pwa-diagnostics', short: 'PD', label: 'PWA Diagnostics' },
] as const;

interface SidebarProps {
  readonly mobileOpen: boolean;
  readonly onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { currentUser } = useAuth();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('shr_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('shr_sidebar_collapsed', String(collapsed));
    } catch {
      // Ignore storage write errors and continue with in-memory state.
    }
  }, [collapsed]);

  useEffect(() => {
    if (!mobileOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onMobileClose();
    }

    globalThis.addEventListener('keydown', onKeyDown);
    return () => globalThis.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen, onMobileClose]);

  if (!currentUser) return null;

  const items = NAV_ITEMS[currentUser.role] ?? [];

  return (
    <>
      <aside
        className={`hidden md:flex flex-col border-r border-gray-200 bg-white transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-[220px]'
        }`}
      >
        {/* Nav items */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 mx-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="mx-2 mb-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
          {!collapsed && <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">System</p>}
          <div className="space-y-1">
            {LEGAL_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="block rounded-md px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-white hover:text-gray-900"
              >
                {collapsed ? item.short : item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Collapse toggle */}
        <div className="border-t border-gray-200 p-2">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </aside>

      <div
        className={`fixed inset-0 z-40 md:hidden ${mobileOpen ? '' : 'pointer-events-none'}`}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-black/45 transition-opacity duration-200 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={onMobileClose}
          aria-label="Close navigation menu backdrop"
        />

        <aside
          className={`absolute inset-y-0 left-0 flex w-[84vw] max-w-[320px] flex-col border-r border-gray-200 bg-white shadow-xl transition-transform duration-200 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-label="Mobile navigation menu"
        >
          <div className="flex items-center justify-between border-b border-gray-200 p-3">
            <p className="text-sm font-semibold text-gray-800">Navigation</p>
            <button
              type="button"
              onClick={onMobileClose}
              className="inline-flex items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-3">
            {items.map((item) => (
              <NavLink
                key={`mobile-${item.to}`}
                to={item.to}
                onClick={onMobileClose}
                className={({ isActive }) =>
                  `mx-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-gray-200 p-3">
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">System</p>
            <div className="space-y-1">
              {LEGAL_LINKS.map((item) => (
                <Link
                  key={`mobile-${item.to}`}
                  to={item.to}
                  onClick={onMobileClose}
                  className="block rounded-md px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
