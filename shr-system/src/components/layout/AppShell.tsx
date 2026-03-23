import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
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
  const mainRef = useRef<HTMLElement | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const element = mainRef.current;
    if (!element) return;

    function onScroll() {
      const totalScrollable = element.scrollHeight - element.clientHeight;
      const ratio = totalScrollable <= 0 ? 0 : element.scrollTop / totalScrollable;
      setScrollProgress(Math.max(0, Math.min(100, ratio * 100)));
      setShowScrollTop(element.scrollTop > 320);
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
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main ref={mainRef} className="relative flex-1 overflow-y-auto">
          <div className={`${isStudent ? 'pb-20 md:pb-6' : 'pb-6'} p-4 md:p-6`}>
            {children}
          </div>
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
