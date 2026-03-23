import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { SystemUser, Student, UserRole } from '../types/types';
import { StorageKey, getAll, getStudentByUserId } from '../services/storage';

interface AuthContextValue {
  currentUser: SystemUser | null;
  currentStudent: Student | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<SystemUser | null>;
  logout: () => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);

  const resolveSession = useCallback((userId: string) => {
    const users = getAll<SystemUser>(StorageKey.USERS);
    const user = users.find((u) => u.id === userId) ?? null;
    setCurrentUser(user);
    if (user?.role === 'student') {
      setCurrentStudent(getStudentByUserId(user.id));
    } else {
      setCurrentStudent(null);
    }
  }, []);

  useEffect(() => {
    const savedId = localStorage.getItem(StorageKey.AUTH_SESSION);
    if (savedId) resolveSession(savedId);
  }, [resolveSession]);

  const login = useCallback(async (email: string, _password: string): Promise<SystemUser | null> => {
    await new Promise<void>((resolve) => setTimeout(resolve, 800));
    const users = getAll<SystemUser>(StorageKey.USERS);
    const user = users.find((u) => u.email === email && u.isActive);
    if (!user) return null;
    localStorage.setItem(StorageKey.AUTH_SESSION, user.id);
    resolveSession(user.id);
    return user;
  }, [resolveSession]);

  const logout = useCallback(() => {
    localStorage.removeItem(StorageKey.AUTH_SESSION);
    setCurrentUser(null);
    setCurrentStudent(null);
  }, []);

  const hasRole = useCallback(
    (role: UserRole | UserRole[]): boolean => {
      if (!currentUser) return false;
      if (Array.isArray(role)) return role.includes(currentUser.role);
      return currentUser.role === role;
    },
    [currentUser],
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentStudent,
        isAuthenticated: currentUser !== null,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
