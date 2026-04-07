import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOfflineSyncStatus } from '../../hooks';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { currentUser } = useAuth();
  const offline = useOfflineSyncStatus();
  const isStudent = currentUser?.role === 'student';
  const mainRef = useRef<HTMLElement | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

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

  function scrollToTop() {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
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
      {!offline.isOnline && (
        <div className="px-4 py-2 bg-amber-100 border-b border-amber-300 text-amber-900 text-xs font-medium">
          Offline mode enabled. Changes are saved locally and will sync automatically when connectivity returns.
          {offline.pendingCount > 0 && ` Pending sync items: ${offline.pendingCount}.`}
        </div>
      )}
      {offline.isOnline && offline.pendingCount > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 text-blue-800 text-xs font-medium">
          Back online. {offline.pendingCount} change(s) waiting to sync.
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main ref={mainRef} className="relative flex-1 overflow-y-auto">
          <div className={`${isStudent ? 'pb-20 md:pb-6' : 'pb-6'} p-4 md:p-6`}>
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
              className="fixed bottom-24 md:bottom-8 right-4 md:right-6 z-20 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-md hover:bg-gray-50"
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
