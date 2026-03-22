import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAll } from '../../services/storage';
import { StorageKey } from '../../services/storage';
import type { SystemAlert } from '../../types/types';

const ROLE_LABELS: Record<string, string> = {
  student: 'Student',
  medical_staff: 'Medical Staff',
  technician: 'Technician',
  pharmacy: 'Pharmacist',
  admin: 'Administrator',
};

export function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const alerts = getAll<SystemAlert>(StorageKey.ALERTS).filter((a) => !a.isResolved);
  const alertCount = alerts.length;

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="border-t-[3px] border-t-blue-600 bg-white shadow-sm z-30 relative">
      <div className="flex items-center justify-between h-14 px-4 md:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 text-white rounded-md px-2 py-1 font-bold text-sm tracking-wider">
            SHR
          </div>
          <span className="hidden sm:block text-xs text-gray-500 font-medium">
            Babcock University
          </span>
        </div>

        {/* Page title placeholder — filled by each page if needed */}
        <div className="hidden md:block" />

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Notification bell */}
          <button
            type="button"
            className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label={`${alertCount} unresolved alerts`}
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {alertCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                {alertCount}
              </span>
            )}
          </button>

          {/* Avatar dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
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
                    onClick={() => { setDropdownOpen(false); logout(); navigate('/login'); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <UserCircle className="w-4 h-4" />
                    Switch User
                  </button>
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
    </header>
  );
}
