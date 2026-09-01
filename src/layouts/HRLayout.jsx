import { useState, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useBreadcrumbTrail } from "../hooks/useBreadcrumbTrail";
import HRSidebar from "./HRSidebar";
import AppShellLayout from "./AppShellLayout";
import api, { signupRequestApi } from "../services/api";

const HR_ROUTE_LABELS = {
  "/hr/dashboard": "Dashboard",
  "/hr/onboarding-pipeline": "Onboarding Pipeline",
  "/hr/employees": "Employees",
  "/hr/leaves": "Leave Queue",
  "/hr/performance": "Performance",
  "/hr/signup-requests": "Signup Requests",
  "/hr/activity-log": "Activity Log",
};

const resolveHRCrumb = (pathname) => {
  if (pathname === "/hr/dashboard" || pathname === "/hr") {
    return { name: "HR Ops", key: "/hr/dashboard" };
  }
  if (HR_ROUTE_LABELS[pathname]) {
    return { name: HR_ROUTE_LABELS[pathname], key: pathname };
  }
  return { name: "HR Ops", key: "/hr/dashboard" };
};

const HRLayout = () => {
  const breadcrumbTrail = useBreadcrumbTrail(resolveHRCrumb);
  const queryClient = useQueryClient();
  const [user, setUser] = useState({});

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
      }
    }
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout sync failed", err);
    } finally {
      localStorage.clear();
      queryClient.clear();
      window.location.href = "/login/admin";
    }
  };

  const { data: signupCounts } = useQuery({
    queryKey: ["signup-requests-counts"],
    queryFn: () => signupRequestApi.getCounts(),
    refetchInterval: 300_000,
    staleTime: 60_000,
  });
  const pendingSignupCount = signupCounts?.pending || 0;

  return (
    <AppShellLayout
      storageKeyPrefix="hr"
      SidebarComponent={HRSidebar}
      sidebarProps={{
        user,
        pendingSignupCount,
        onLogout: handleLogout,
      }}
      breadcrumbTrail={breadcrumbTrail}
      homeHref="/hr/dashboard"
      filterDashboardCrumb
      normalizeLightMode
      chatRole="admin"
      outerBgClass="bg-gray-200/50"
      contentWrapperClass="max-w-[1600px] mx-auto space-y-5"
    />
  );
};

export default HRLayout;
