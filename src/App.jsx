/* eslint-disable react/prop-types */
import React, { Suspense, lazy, useState, useEffect, useRef } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import toast, { Toaster } from "react-hot-toast";
import ProtectedRoute from "./routes/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import ForcePasswordChangeModal from "./components/ForcePasswordChangeModal";
import DailyCheckInModal from "./components/checkin/DailyCheckInModal";

function CheckInOAuthToastHandler() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const handledRef = useRef(false);

  useEffect(() => {
    setMounted(true);

    const params = new URLSearchParams(location.search);
    const result = params.get("checkin_result");
    const error = params.get("checkin_error");
    const isOAuthPopup =
      params.get("oauth_popup") === "1" ||
      (typeof window !== "undefined" && (window.name === "slack_oauth_checkin" || Boolean(window.opener)));

    if (!result && !error) return;
    if (handledRef.current) return;
    handledRef.current = true;

    // 1. Broadcast result to the main portal tab via BroadcastChannel
    try {
      const bc = new BroadcastChannel("autonex_checkin_oauth");
      bc.postMessage({
        type: "SLACK_CHECKIN_COMPLETE",
        result,
        error,
        search: location.search,
      });
      bc.close();
    } catch (_) {}

    // 2. If in popup tab, close automatically without displaying toast here
    if (isOAuthPopup) {
      try {
        window.close();
      } catch (_) {}

      const timer = setTimeout(() => {
        try {
          window.close();
        } catch (_) {}
      }, 500);

      return () => clearTimeout(timer);
    }

    // 3. Fallback for direct / same-tab redirects ONLY
    if (result === "success") {
      toast.success("✓ Checked in successfully via Slack!", {
        id: "slack-checkin-toast",
        duration: 4000,
        icon: "🎉",
      });
      queryClient.invalidateQueries({ queryKey: ["checkin-today"] });
      params.delete("checkin_result");
      params.delete("oauth_popup");
      const newSearch = params.toString() ? `?${params.toString()}` : "";
      navigate(`${location.pathname}${newSearch}`, { replace: true });
    } else if (error) {
      let errorMsg = "Check-in failed. Please try again.";
      if (error === "office_ip_required") {
        errorMsg = "Check-in blocked: You must be connected to the Office Wi-Fi.";
      } else if (error === "ip_mismatch") {
        errorMsg = "Check-in blocked: Network mismatch. Initiation and Slack confirmation must be on the same network.";
      } else if (error === "account_mismatch") {
        errorMsg = "Check-in blocked: Account mismatch. You cannot verify using someone else's Slack account.";
      } else if (error === "slack_access_denied") {
        errorMsg = "Slack verification was cancelled.";
      } else if (error === "token_expired") {
        errorMsg = "Check-in session expired. Please try checking in again.";
      }
      toast.error(errorMsg, { id: "slack-checkin-toast", duration: 6000 });
      queryClient.invalidateQueries({ queryKey: ["checkin-today"] });
      params.delete("checkin_error");
      params.delete("ip");
      params.delete("portal_ip");
      params.delete("client_ip");
      params.delete("oauth_popup");
      const newSearch = params.toString() ? `?${params.toString()}` : "";
      navigate(`${location.pathname}${newSearch}`, { replace: true });
    }
  }, [location.search, location.pathname, navigate, queryClient]);

  if (!mounted || typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(location.search);
  const result = params.get("checkin_result");
  const error = params.get("checkin_error");
  const isOAuthPopup =
    params.get("oauth_popup") === "1" ||
    window.name === "slack_oauth_checkin" ||
    Boolean(window.opener);

  if (isOAuthPopup && (result || error)) {
    return (
      <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm text-white flex flex-col items-center justify-center z-[999999] p-4 text-center">
        <div className="bg-white text-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col items-center">
          {result === "success" ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl font-bold mb-4 ring-8 ring-emerald-50/50">
                ✓
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-1">Check-in Verified!</h1>
              <p className="text-slate-500 text-xs mb-6 leading-relaxed">
                Slack verification was successful. Your check-in has been recorded. This tab will close automatically.
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-3xl font-bold mb-4 ring-8 ring-rose-50/50">
                ✕
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-1">Verification Failed</h1>
              <p className="text-slate-500 text-xs mb-6 leading-relaxed">
                Check-in verification could not be completed. You can return to the main portal tab.
              </p>
            </>
          )}
          <button
            type="button"
            onClick={() => window.close()}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            Close Tab
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// Layouts
import AdminLayout from "./layouts/AdminLayout";
import HRLayout from "./layouts/HRLayout";
import EmployeeLayout from "./layouts/EmployeeLayout";
import AdminLogin from "./pages/auth/AdminLogin";
import EmployeeLogin from "./pages/auth/EmployeeLogin";
import PMLogin from "./pages/auth/PMLogin";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

// Lazy Loaded Pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AnalyticsDashboard = lazy(() => import("./pages/AnalyticsDashboard"));
const EmployeesPage = lazy(() => import("./pages/EmployeesPage"));
const ChangeLogPage = lazy(() => import("./pages/ChangeLogPage"));
import SubProjectsPage from "./pages/ProjectsPage";
const AllocationsPage = lazy(() => import("./pages/AllocationsPage"));
const LeavesPage = lazy(() => import("./pages/LeavesPage"));
const ProjectsPage = lazy(() => import("./pages/ParentProjectsPage"));

// Employee & PM Dashboards
const EmployeeDashboard = lazy(
  () => import("./pages/employee/EmployeeDashboard"),
);
const PMDashboard = lazy(() => import("./pages/pm/PMDashboard"));
const GuidelinesPage = lazy(() => import("./pages/guidelines/GuidelinesPage"));
const MyTeamPage = lazy(() => import("./pages/pm/MyTeamPage"));
const TeamCheckInsPage = lazy(() => import("./pages/pm/TeamCheckInsPage"));
const PerformanceReviewsPage = lazy(
  () => import("./pages/pm/PerformanceReviewsPage"),
);
const AdminPerformancePage = lazy(
  () => import("./pages/admin/AdminPerformancePage"),
);
const LeaderboardPage = lazy(
  () => import("./pages/admin/LeaderboardPage"),
);
const SelfEvaluationPage = lazy(
  () => import("./pages/employee/SelfEvaluationPage"),
);

// Scoped Pages
const PMMyLeavesPage = lazy(() => import("./pages/pm/PMMyLeavesPage"));
const EmployeeProjectsPage = lazy(
  () => import("./pages/employee/EmployeeProjectsPage"),
);
const EmployeeLeavesPage = lazy(
  () => import("./pages/employee/EmployeeLeavesPage"),
);
const EmployeeGuidelinesPage = lazy(
  () => import("./pages/employee/EmployeeGuidelinesPage"),
);
const SideProjectsPage = lazy(
  () => import("./pages/employee/SideProjectsPage"),
);
const ProfilePage = lazy(() => import("./pages/employee/ProfilePage"));
const SignupRequestsPage = lazy(() => import("./pages/SignupRequestsPage"));
const EmployeeSignupPage = lazy(() => import("./pages/EmployeeSignupPage"));
const ReferralsPage = lazy(() => import("./pages/ReferralsPage"));
const PayrollTabs = lazy(() => import("./pages/PayrollTabs"));
const EmployeeReferralsPage = lazy(
  () => import("./pages/employee/EmployeeReferralsPage"),
);
const CompanyInfoPage = lazy(() => import("./pages/employee/CompanyInfoPage"));
const OnboardingDashboard = lazy(
  () => import("./pages/employee/OnboardingDashboard"),
);
const ModuleView = lazy(() => import("./pages/employee/ModuleView"));
const NewlyOnboardedPage = lazy(() => import("./pages/NewlyOnboardedPage"));
const PMMentorshipPage = lazy(() => import("./pages/pm/PMMentorshipPage"));
// const PMOnboardingDashboard = lazy(() => import('./pages/pm/PMOnboardingDashboard'));
const AdminModulesList = lazy(() => import("./pages/admin/AdminModulesList"));
const AdminModulesBuilder = lazy(
  () => import("./pages/admin/AdminModulesBuilder"),
);
// const AdminTeamPage = lazy(() => import('./pages/admin/AdminTeamPage'));
const AdminReportsPage = lazy(() => import("./pages/admin/AdminReportsPage"));
const AdminCompanySettingsPage = lazy(
  () => import("./pages/admin/AdminCompanySettingsPage"),
);
const AdminCheckInsPage = lazy(() => import("./pages/admin/AdminCheckInsPage"));
const VerifyCheckInPage = lazy(() => import("./pages/VerifyCheckInPage"));

// HR Routes
const HRDashboard = lazy(() => import("./pages/hr/HRDashboard"));
const OnboardingPipelinePage = lazy(() => import("./pages/hr/OnboardingPipelinePage"));
const CandidateConfirmationPage = lazy(() => import("./pages/hr/CandidateConfirmationPage"));
// const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage'));

function App() {
  // Per-request QueryClient: created once per component-tree mount. On the
  // server, module memory is shared across all concurrent requests, so a
  // module-scope client would leak one visitor's cached data into another's
  // response. useState(() => ...) gives each request/mount its own instance.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 1000 * 60 * 5, // Cache data for 5 minutes globally
          },
        },
      }),
  );

  return (
    <ErrorBoundary>
      <div suppressHydrationWarning>
        <QueryClientProvider client={queryClient}>
          <Toaster
            position="top-right"
            containerStyle={{ zIndex: 100000 }}
            toastOptions={{
              duration: 4000,
              style: { background: "#333", color: "#fff" },
            }}
          />
          <ForcePasswordChangeModal />
          <CheckInOAuthToastHandler />
          <DailyCheckInModal />
          <Suspense fallback={null}>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login/admin" element={<AdminLogin />} />
              <Route path="/login/employee" element={<EmployeeLogin />} />
              <Route path="/login/pm" element={<PMLogin />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/employee-signup" element={<EmployeeSignupPage />} />
              <Route path="/verify-checkin" element={<VerifyCheckInPage />} />
              <Route
                path="/login"
                element={<Navigate to="/login/admin" replace />}
              />

              {/* Protected Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={["admin", "hr"]}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="analytics" element={<AnalyticsDashboard />} />
                <Route
                  path="analytics/:mainProjectId"
                  element={<AnalyticsDashboard />}
                />
                {/* Organizations page removed on admin — redirect to Projects */}
                <Route
                  path="projects"
                  element={<Navigate to="/admin/sub-projects" replace />}
                />
                <Route path="employees" element={<EmployeesPage />} />
                <Route path="employees/:id" element={<EmployeeDashboard />} />
                <Route path="change-log" element={<ChangeLogPage />} />
                <Route path="leaderboard" element={<LeaderboardPage />} />
                <Route path="sub-projects" element={<SubProjectsPage />} />
                <Route path="allocations" element={<AllocationsPage />} />
                <Route path="leaves" element={<LeavesPage />} />
                <Route path="checkins" element={<AdminCheckInsPage />} />
                <Route path="performance" element={<AdminPerformancePage />} />
                <Route path="signup-requests" element={<SignupRequestsPage />} />
                <Route path="payroll" element={<PayrollTabs />} />
                <Route path="referrals" element={<ReferralsPage />} />
                <Route path="guidelines" element={<GuidelinesPage />} />
                <Route path="modules" element={<AdminModulesList />} />
                <Route path="modules/new" element={<AdminModulesBuilder />} />
                {/* <Route path="onboarding-team" element={<AdminTeamPage />} /> */}
                <Route path="onboarding-reports" element={<AdminReportsPage />} />
                <Route path="newly-onboarded" element={<NewlyOnboardedPage />} />
                <Route
                  path="company-settings"
                  element={<AdminCompanySettingsPage />}
                />
                {/* <Route path="onboarding-analytics" element={<AdminAnalyticsPage />} /> */}
              </Route>

              {/* Protected HR Routes */}
              <Route
                path="/hr"
                element={
                  <ProtectedRoute allowedRoles={["admin", "hr"]}>
                    <HRLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/hr/dashboard" replace />} />
                <Route path="dashboard" element={<HRDashboard />} />
                <Route path="onboarding-pipeline" element={<OnboardingPipelinePage />} />
                <Route path="signup-requests" element={<SignupRequestsPage />} />
                <Route path="employees" element={<EmployeesPage />} />
                <Route path="leaves" element={<LeavesPage />} />
                <Route path="performance" element={<AdminPerformancePage />} />
                <Route path="activity-log" element={<ChangeLogPage />} />
              </Route>

              {/* Root Redirect */}
              <Route
                path="/"
                element={<Navigate to="/admin/dashboard" replace />}
              />

              {/* Protected Employee Routes */}
              <Route
                path="/employee"
                element={
                  <ProtectedRoute allowedRoles={["employee"]}>
                    <EmployeeLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="confirmation-mockup" element={<CandidateConfirmationPage />} />
                <Route
                  index
                  element={<Navigate to="/employee/dashboard" replace />}
                />
                <Route path="dashboard" element={<EmployeeDashboard />} />
                <Route path="projects" element={<EmployeeProjectsPage />} />
                <Route path="leaderboard" element={<LeaderboardPage />} />
                <Route path="leaves" element={<EmployeeLeavesPage />} />
                <Route path="self-evaluation" element={<SelfEvaluationPage />} />
                <Route path="side-projects" element={<SideProjectsPage />} />
                <Route path="guidelines" element={<EmployeeGuidelinesPage />} />
                <Route path="referrals" element={<EmployeeReferralsPage />} />
                <Route path="company-info" element={<CompanyInfoPage />} />
                <Route path="onboarding" element={<OnboardingDashboard />} />
                <Route path="onboarding/:moduleId" element={<ModuleView />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>

              {/* Protected PM Routes. Team leads live here too: same pages, same
              layout, view-only. The backend decides what they may act on
              (services/project_scope.py). */}
              <Route
                path="/pm"
                element={
                  <ProtectedRoute allowedRoles={["pm", "hr", "team_lead"]}>
                    <EmployeeLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/pm/dashboard" replace />} />
                <Route path="dashboard" element={<PMDashboard />} />
                <Route path="analytics" element={<AnalyticsDashboard />} />
                <Route
                  path="analytics/:mainProjectId"
                  element={<AnalyticsDashboard />}
                />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="sub-projects" element={<SubProjectsPage />} />
                <Route path="leaderboard" element={<LeaderboardPage />} />
                <Route path="allocations" element={<AllocationsPage />} />
                <Route path="my-team" element={<MyTeamPage />} />
                <Route path="my-team/:id" element={<EmployeeDashboard />} />
                <Route path="team-checkins" element={<TeamCheckInsPage />} />
                <Route path="performance" element={<PerformanceReviewsPage />} />
                <Route path="self-evaluation" element={<SelfEvaluationPage />} />
                <Route path="leaves" element={<LeavesPage />} />
                <Route path="my-leaves" element={<PMMyLeavesPage />} />
                <Route path="side-projects" element={<SideProjectsPage />} />
                <Route path="guidelines" element={<GuidelinesPage />} />
                <Route path="onboarding" element={<OnboardingDashboard />} />
                <Route path="onboarding/:moduleId" element={<ModuleView />} />
                <Route path="onboarding-mentor" element={<PMMentorshipPage />} />
                <Route
                  path="newly-onboarded"
                  element={<Navigate to="/pm/onboarding-mentor" replace />}
                />
                <Route path="profile" element={<ProfilePage />} />
              </Route>

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/login/admin" replace />} />
            </Routes>
          </Suspense>
        </QueryClientProvider>
      </div>
    </ErrorBoundary>
  );
}

export default App;
