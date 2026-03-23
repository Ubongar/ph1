import { useAuth } from '../../context/AuthContext';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { currentUser } = useAuth();
  const isStudent = currentUser?.role === 'student';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className={`${isStudent ? 'pb-20 md:pb-6' : 'pb-6'} p-4 md:p-6`}>
            {children}
          </div>
        </main>
      </div>
      {isStudent && <MobileBottomNav />}
    </div>
  );
}
