import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { UserRole } from '../types/types';
import { useAuth } from '../context/AuthContext';
import { AppShell } from '../components/layout/AppShell';
import { getPendingPolicyTypes } from '../services/compliance';
import OnboardingPage from '../pages/auth/OnboardingPage';
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
import ReferralFeedback from '../pages/staff/ReferralFeedback';
import TechnicianUploadPortal from '../pages/technician/TechnicianUploadPortal';
import PharmacyQueue from '../pages/pharmacy/PharmacyQueue';
import AdminDashboard from '../pages/admin/AdminDashboard';
import UserManagement from '../pages/admin/UserManagement';
import AuditLogs from '../pages/admin/AuditLogs';
import SystemReports from '../pages/admin/SystemReports';
import SpecialistDashboard from '../pages/specialist/SpecialistDashboard';
import SpecialistReferrals from '../pages/specialist/SpecialistReferrals';
import ReferralDetail from '../pages/specialist/ReferralDetail';
import ConsultationAnalytics from '../pages/specialist/ConsultationAnalytics';
import ReferralCompliance from '../pages/admin/ReferralCompliance';
import LegalCenter from '../pages/legal/LegalCenter';
import PrivacyPolicyPage from '../pages/legal/PrivacyPolicyPage';
import TermsAndConditionsPage from '../pages/legal/TermsAndConditionsPage';
import DataRightsPage from '../pages/legal/DataRightsPage';
import ConsentPage from '../pages/legal/ConsentPage';
import CookiesPage from '../pages/legal/CookiesPage';
import SecurityRetentionPage from '../pages/legal/SecurityRetentionPage';
import MedicalDisclaimerPage from '../pages/legal/MedicalDisclaimerPage';
import RolePrivacyMatrixPage from '../pages/legal/RolePrivacyMatrixPage';
import DataRequestCenter from '../pages/legal/DataRequestCenter';
import PolicyAcceptancePage from '../pages/legal/PolicyAcceptancePage';
import PolicyAcceptanceHistoryPage from '../pages/legal/PolicyAcceptanceHistoryPage';
import PwaInstallDiagnosticsPage from '../pages/legal/PwaInstallDiagnosticsPage';
import FaqPage from '../pages/legal/FaqPage';
import AdminDataRequests from '../pages/admin/AdminDataRequests';
import PolicyVersioning from '../pages/admin/PolicyVersioning';
import ReconciliationCenter from '../pages/admin/ReconciliationCenter';
import AdminResolutionAuditLogs from '../pages/admin/AdminResolutionAuditLogs';

const RoleWorkspacePage = lazy(() => import('../pages/shared/RoleWorkspacePage'));
const AdminGovernanceCenter = lazy(() => import('../pages/admin/AdminGovernanceCenter'));

const ALL_ROLES: UserRole[] = ['student', 'medical_staff', 'technician', 'pharmacy', 'specialist', 'admin'];

interface ProtectedRouteProps {
  children: ReactNode;
  roles: UserRole[];
}

function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, hasRole, currentUser } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/onboarding" replace state={{ from: location }} />;
  if (!hasRole(roles)) return <Navigate to="/unauthorized" replace />;
  if (currentUser) {
    const pending = getPendingPolicyTypes(currentUser.id);
    if (pending.length > 0 && location.pathname !== '/legal/policy-updates') {
      return <Navigate to="/legal/policy-updates" replace />;
    }
  }
  return <>{children}</>;
}

function RoleRedirect() {
  const { currentUser, isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/onboarding" replace state={{ from: location }} />;
  switch (currentUser?.role) {
    case 'student': return <Navigate to="/student/dashboard" replace />;
    case 'medical_staff': return <Navigate to="/staff/dashboard" replace />;
    case 'technician': return <Navigate to="/technician/upload" replace />;
    case 'pharmacy': return <Navigate to="/pharmacy/queue" replace />;
    case 'specialist': return <Navigate to="/specialist/dashboard" replace />;
    case 'admin': return <Navigate to="/admin/dashboard" replace />;
    default: return <Navigate to="/login" replace />;
  }
}

function OnboardingRoute() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <RoleRedirect />;
  return <OnboardingPage />;
}

export function AppRouter() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-600">Loading page...</div>}>
    <Routes>
      <Route path="/" element={<OnboardingRoute />} />
      <Route path="/onboarding" element={<OnboardingRoute />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/legal" element={<LegalCenter />} />
      <Route path="/legal/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/legal/terms" element={<TermsAndConditionsPage />} />
      <Route path="/legal/data-rights" element={<DataRightsPage />} />
      <Route path="/legal/consent" element={<ConsentPage />} />
      <Route path="/legal/cookies" element={<CookiesPage />} />
      <Route path="/legal/security" element={<SecurityRetentionPage />} />
      <Route path="/legal/role-matrix" element={<RolePrivacyMatrixPage />} />
      <Route path="/legal/medical-disclaimer" element={<MedicalDisclaimerPage />} />
      <Route path="/legal/faq" element={<FaqPage />} />
      <Route path="/legal/pwa-diagnostics" element={<PwaInstallDiagnosticsPage />} />
      <Route
        path="/legal/data-requests"
        element={
          <ProtectedRoute roles={ALL_ROLES}>
            <DataRequestCenter />
          </ProtectedRoute>
        }
      />
      <Route
        path="/legal/acceptance-history"
        element={
          <ProtectedRoute roles={ALL_ROLES}>
            <PolicyAcceptanceHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/legal/policy-updates"
        element={
          <ProtectedRoute roles={ALL_ROLES}>
            <PolicyAcceptancePage />
          </ProtectedRoute>
        }
      />

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
      <Route
        path="/staff/referral-feedback"
        element={
          <ProtectedRoute roles={['medical_staff']}>
            <AppShell><ReferralFeedback /></AppShell>
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

      {/* Specialist routes */}
      <Route
        path="/specialist/dashboard"
        element={
          <ProtectedRoute roles={['specialist']}>
            <AppShell><SpecialistDashboard /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/specialist/referrals"
        element={
          <ProtectedRoute roles={['specialist']}>
            <AppShell><SpecialistReferrals /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/specialist/analytics"
        element={
          <ProtectedRoute roles={['specialist']}>
            <AppShell><ConsultationAnalytics /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/specialist/referral/:referralId"
        element={
          <ProtectedRoute roles={['specialist']}>
            <AppShell><ReferralDetail /></AppShell>
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
        path="/workspace"
        element={
          <ProtectedRoute roles={ALL_ROLES}>
            <AppShell><RoleWorkspacePage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/governance"
        element={
          <ProtectedRoute roles={['admin']}>
            <AppShell><AdminGovernanceCenter /></AppShell>
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
      <Route
        path="/admin/referral-compliance"
        element={
          <ProtectedRoute roles={['admin']}>
            <AppShell><ReferralCompliance /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/data-requests"
        element={
          <ProtectedRoute roles={['admin']}>
            <AppShell><AdminDataRequests /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/policy-versions"
        element={
          <ProtectedRoute roles={['admin']}>
            <AppShell><PolicyVersioning /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reconciliation"
        element={
          <ProtectedRoute roles={['admin']}>
            <AppShell><ReconciliationCenter /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/server-audit-logs"
        element={
          <ProtectedRoute roles={['admin']}>
            <AppShell><AdminResolutionAuditLogs /></AppShell>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
