import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UserCircle, PlusCircle, ClipboardList } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const TABS = [
  { label: 'Dashboard', to: '/student/dashboard', icon: LayoutDashboard },
  { label: 'Profile', to: '/student/profile', icon: UserCircle },
  { label: 'New Request', to: '/student/submit-symptom', icon: PlusCircle },
  { label: 'My Requests', to: '/student/my-requisitions', icon: ClipboardList },
] as const;

export function MobileBottomNav() {
  const { currentUser } = useAuth();
  if (currentUser?.role !== 'student') return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 md:hidden bg-white border-t border-gray-200 z-20">
      <div className="flex">
        {TABS.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
