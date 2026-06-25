/* eslint-disable react/prop-types */
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './routes/ProtectedRoute';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import EmployeeLayout from './layouts/EmployeeLayout';
import AdminLogin from './pages/auth/AdminLogin';
import EmployeeLogin from './pages/auth/EmployeeLogin';
import PMLogin from './pages/auth/PMLogin';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Lazy Loaded Pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const EmployeesPage = lazy(() => import('./pages/EmployeesPage'));
const SubProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const AllocationsPage = lazy(() => import('./pages/AllocationsPage'));
const LeavesPage = lazy(() => import('./pages/LeavesPage'));
const ProjectsPage = lazy(() => import('./pages/ParentProjectsPage'));

// Employee & PM Dashboards
const EmployeeDashboard = lazy(() => import('./pages/employee/EmployeeDashboard'));
const PMDashboard = lazy(() => import('./pages/pm/PMDashboard'));
const GuidelinesPage = lazy(() => import('./pages/guidelines/GuidelinesPage'));
const MyTeamPage = lazy(() => import('./pages/pm/MyTeamPage'));
const PerformanceReviewsPage = lazy(() => import('./pages/pm/PerformanceReviewsPage'));

// Scoped Pages
const PMLeavesPage = lazy(() => import('./pages/pm/PMLeavesPage'));
const PMMyLeavesPage = lazy(() => import('./pages/pm/PMMyLeavesPage'));
const EmployeeProjectsPage = lazy(() => import('./pages/employee/EmployeeProjectsPage'));
const EmployeeLeavesPage = lazy(() => import('./pages/employee/EmployeeLeavesPage'));
const EmployeeGuidelinesPage = lazy(() => import('./pages/employee/EmployeeGuidelinesPage'));
const SideProjectsPage = lazy(() => import('./pages/employee/SideProjectsPage'));
const ProfilePage = lazy(() => import('./pages/employee/ProfilePage'));
const SignupRequestsPage = lazy(() => import('./pages/SignupRequestsPage'));
const EmployeeSignupPage = lazy(() => import('./pages/EmployeeSignupPage'));
const ReferralsPage = lazy(() => import('./pages/ReferralsPage'));
const PayrollPage = lazy(() => import('./pages/PayrollPage'));
const EmployeeReferralsPage = lazy(() => import('./pages/employee/EmployeeReferralsPage'));
const CompanyInfoPage = lazy(() => import('./pages/employee/CompanyInfoPage'));
const OnboardingDashboard = lazy(() => import('./pages/employee/OnboardingDashboard'));
const ModuleView = lazy(() => import('./pages/employee/ModuleView'));
const NewlyOnboardedPage = lazy(() => import('./pages/NewlyOnboardedPage'));
const PMMentorshipPage = lazy(() => import('./pages/pm/PMMentorshipPage'));
// const PMOnboardingDashboard = lazy(() => import('./pages/pm/PMOnboardingDashboard'));
const AdminModulesList = lazy(() => import('./pages/admin/AdminModulesList'));
const AdminModulesBuilder = lazy(() => import('./pages/admin/AdminModulesBuilder'));
// const AdminTeamPage = lazy(() => import('./pages/admin/AdminTeamPage'));
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage'));
const AdminCompanySettingsPage = lazy(() => import('./pages/admin/AdminCompanySettingsPage'));
// const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage'));


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#333', color: '#fff' } }} />
      <Router>
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-slate-500 font-medium">Loading Application...</div>}>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login/admin" element={<AdminLogin />} />
            <Route path="/login/employee" element={<EmployeeLogin />} />
            <Route path="/login/pm" element={<PMLogin />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/employee-signup" element={<EmployeeSignupPage />} />
            <Route path="/login" element={<Navigate to="/login/admin" replace />} />

            {/* Protected Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="sub-projects" element={<SubProjectsPage />} />
              <Route path="allocations" element={<AllocationsPage />} />
              <Route path="leaves" element={<LeavesPage />} />
              <Route path="signup-requests" element={<SignupRequestsPage />} />
              <Route path="payroll" element={<PayrollPage />} />
              <Route path="referrals" element={<ReferralsPage />} />
              <Route path="guidelines" element={<GuidelinesPage />} />
              <Route path="modules" element={<AdminModulesList />} />
              <Route path="modules/new" element={<AdminModulesBuilder />} />
              {/* <Route path="onboarding-team" element={<AdminTeamPage />} /> */}
              <Route path="onboarding-reports" element={<AdminReportsPage />} />
              <Route path="newly-onboarded" element={<NewlyOnboardedPage />} />
              <Route path="company-settings" element={<AdminCompanySettingsPage />} />
              {/* <Route path="onboarding-analytics" element={<AdminAnalyticsPage />} /> */}
            </Route>


            {/* Root Redirect */}
            <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

            {/* Protected Employee Routes */}
            <Route path="/employee" element={
              <ProtectedRoute allowedRoles={['employee']}>
                <EmployeeLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/employee/dashboard" replace />} />
              <Route path="dashboard" element={<EmployeeDashboard />} />
              <Route path="projects" element={<EmployeeProjectsPage />} />
              <Route path="leaves" element={<EmployeeLeavesPage />} />
              <Route path="side-projects" element={<SideProjectsPage />} />
              <Route path="guidelines" element={<EmployeeGuidelinesPage />} />
              <Route path="referrals" element={<EmployeeReferralsPage />} />
              <Route path="company-info" element={<CompanyInfoPage />} />
              <Route path="onboarding" element={<OnboardingDashboard />} />
              <Route path="onboarding/:moduleId" element={<ModuleView />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Protected PM Routes */}
            <Route path="/pm" element={
              <ProtectedRoute allowedRoles={['pm']}>
                <EmployeeLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/pm/dashboard" replace />} />
              <Route path="dashboard" element={<PMDashboard />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="sub-projects" element={<SubProjectsPage />} />
              <Route path="allocations" element={<AllocationsPage />} />
              <Route path="my-team" element={<MyTeamPage />} />
              <Route path="performance" element={<PerformanceReviewsPage />} />
              <Route path="leaves" element={<PMLeavesPage />} />
              <Route path="my-leaves" element={<PMMyLeavesPage />} />
              <Route path="side-projects" element={<SideProjectsPage />} />
              <Route path="guidelines" element={<GuidelinesPage />} />
              <Route path="onboarding-mentor" element={<PMMentorshipPage />} />
              <Route path="newly-onboarded" element={<Navigate to="/pm/onboarding-mentor" replace />} />
              {/* <Route path="onboarding-mentor" element={<PMOnboardingDashboard />} /> */}
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/login/admin" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
