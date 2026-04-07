import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Search, ClipboardList,
  ShoppingBag, Users, FileText, BarChart3, Upload, Stethoscope, ShieldCheck,
  ChevronLeft, ChevronRight, UserCircle, PlusCircle,
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
    { label: 'My Profile', to: '/student/profile', icon: <UserCircle className="w-5 h-5" /> },
    { label: 'New Request', to: '/student/submit-symptom', icon: <PlusCircle className="w-5 h-5" /> },
    { label: 'My Requests', to: '/student/my-requisitions', icon: <ClipboardList className="w-5 h-5" /> },
  ],
  medical_staff: [
    { label: 'Dashboard', to: '/staff/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Search Patients', to: '/staff/search', icon: <Search className="w-5 h-5" /> },
    { label: 'Review Queue', to: '/staff/review-queue', icon: <ClipboardList className="w-5 h-5" /> },
    { label: 'Referral Feedback', to: '/staff/referral-feedback', icon: <Stethoscope className="w-5 h-5" /> },
  ],
  technician: [
    { label: 'Upload Results', to: '/technician/upload', icon: <Upload className="w-5 h-5" /> },
  ],
  pharmacy: [
    { label: 'Dispensing Queue', to: '/pharmacy/queue', icon: <ShoppingBag className="w-5 h-5" /> },
  ],
  specialist: [
    { label: 'Dashboard', to: '/specialist/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Referrals', to: '/specialist/referrals', icon: <Stethoscope className="w-5 h-5" /> },
    { label: 'Analytics', to: '/specialist/analytics', icon: <BarChart3 className="w-5 h-5" /> },
  ],
  admin: [
    { label: 'Dashboard', to: '/admin/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
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


export function Sidebar() {
  const { currentUser } = useAuth();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('shr_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem('shr_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  if (!currentUser) return null;

  const items = NAV_ITEMS[currentUser.role] ?? [];

  return (
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
        {!collapsed && <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Legal</p>}
        <div className="space-y-1">
          <Link
            to="/legal"
            className="block rounded-md px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-white hover:text-gray-900"
          >
            {collapsed ? 'LC' : 'Legal Center'}
          </Link>
          <Link
            to="/legal/privacy"
            className="block rounded-md px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-white hover:text-gray-900"
          >
            {collapsed ? 'PP' : 'Privacy Policy'}
          </Link>
          <Link
            to="/legal/data-requests"
            className="block rounded-md px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-white hover:text-gray-900"
          >
            {collapsed ? 'DR' : 'Data Requests'}
          </Link>
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
  );
}
