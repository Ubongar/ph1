import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { UserRole } from '../types/types';
import { useAuth } from '../context/AuthContext';
import { AppShell } from '../components/layout/AppShell';
import LoginPage from '../pages/auth/LoginPage';
import UnauthorizedPage from '../pages/auth/UnauthorizedPage';
import StudentDashboard from '../pages/student/StudentDashboard';
import StudentProfile from '../pages/student/StudentProfile';
import SubmitSymptomReport from '../pages/student/SubmitSymptomReport';
import RequisitionTracking from '../pages/student/RequisitionTracking';
import StaffDashboard from '../pages/staff/StaffDashboard';
import StudentSearch from '../pages/staff/StudentSearch';
import PatientProfile from '../pages/staff/PatientProfile';
import NewEncounter from '../pages/staff/NewEncounter';
import DoctorReviewQueue from '../pages/staff/DoctorReviewQueue';
import TechnicianUploadPortal from '../pages/technician/TechnicianUploadPortal';
import PharmacyQueue from '../pages/pharmacy/PharmacyQueue';
import AdminDashboard from '../pages/admin/AdminDashboard';
import UserManagement from '../pages/admin/UserManagement';
import AuditLogs from '../pages/admin/AuditLogs';
import SystemReports from '../pages/admin/SystemReports';

interface ProtectedRouteProps {
  children: ReactNode;
  roles: UserRole[];
}

function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, hasRole } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!hasRole(roles)) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
}

function RoleRedirect() {
  const { currentUser, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  switch (currentUser?.role) {
    case 'student': return <Navigate to="/student/dashboard" replace />;
    case 'medical_staff': return <Navigate to="/staff/dashboard" replace />;
    case 'technician': return <Navigate to="/technician/upload" replace />;
    case 'pharmacy': return <Navigate to="/pharmacy/queue" replace />;
    case 'admin': return <Navigate to="/admin/dashboard" replace />;
    default: return <Navigate to="/login" replace />;
  }
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Student routes */}
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute roles={['student']}>
            <AppShell><StudentDashboard /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/profile"
        element={
          <ProtectedRoute roles={['student']}>
            <AppShell><StudentProfile /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/submit-symptom"
        element={
          <ProtectedRoute roles={['student']}>
            <AppShell><SubmitSymptomReport /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/my-requisitions"
        element={
          <ProtectedRoute roles={['student']}>
            <AppShell><RequisitionTracking /></AppShell>
          </ProtectedRoute>
        }
      />

      {/* Staff routes */}
      <Route
        path="/staff/dashboard"
        element={
          <ProtectedRoute roles={['medical_staff']}>
            <AppShell><StaffDashboard /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/search"
        element={
          <ProtectedRoute roles={['medical_staff']}>
            <AppShell><StudentSearch /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/patient/:studentId"
        element={
          <ProtectedRoute roles={['medical_staff']}>
            <AppShell><PatientProfile /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/patient/:studentId/encounter/new"
        element={
          <ProtectedRoute roles={['medical_staff']}>
            <AppShell><NewEncounter /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/review-queue"
        element={
          <ProtectedRoute roles={['medical_staff']}>
            <AppShell><DoctorReviewQueue /></AppShell>
          </ProtectedRoute>
        }
      />

      {/* Technician routes */}
      <Route
        path="/technician/upload"
        element={
          <ProtectedRoute roles={['technician']}>
            <AppShell><TechnicianUploadPortal /></AppShell>
          </ProtectedRoute>
        }
      />

      {/* Pharmacy routes */}
      <Route
        path="/pharmacy/queue"
        element={
          <ProtectedRoute roles={['pharmacy']}>
            <AppShell><PharmacyQueue /></AppShell>
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute roles={['admin']}>
            <AppShell><AdminDashboard /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute roles={['admin']}>
            <AppShell><UserManagement /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit-logs"
        element={
          <ProtectedRoute roles={['admin']}>
            <AppShell><AuditLogs /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute roles={['admin']}>
            <AppShell><SystemReports /></AppShell>
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<RoleRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
