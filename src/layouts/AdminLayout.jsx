import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { navigation } from "../config/navigation";
import api, { signupRequestApi } from "../services/api";
import { useBreadcrumbTrail } from "../hooks/useBreadcrumbTrail";
import { usePageDetailTitle } from "../utils/pageDetailTitle";
import AdminSidebar from "./AdminSidebar";
import AppShellLayout from "../layouts/AppShellLayout";

const ADMIN_ROUTE_LABELS = {
  "/admin/modules": "Training Modules",
  "/admin/modules/new": "New Module",
  "/admin/onboarding-reports": "Progress Reports",
  "/admin/newly-onboarded": "Newly Onboarded",
  "/admin/change-log": "Audit Log",
  "/admin/company-settings": "Company Settings",
};

const resolveAdminCrumb = (pathname) => {
  if (pathname.startsWith("/admin/analytics/")) {
    return { name: "Analytics", key: "admin-analytics-detail", isDetail: true };
  }
  if (pathname.startsWith("/admin/employees/")) {
    return { name: "Employee Details", key: "admin-employees-detail", isDetail: true };
  }
  if (pathname === "/admin/dashboard" || pathname === "/admin") {
    return { name: "Autonex", key: "/admin/dashboard" };
  }
  const navItem = navigation.find((n) => n.href === pathname);
  if (navItem) return { name: navItem.name, key: pathname };
  if (ADMIN_ROUTE_LABELS[pathname])
    return { name: ADMIN_ROUTE_LABELS[pathname], key: pathname };
  return { name: "Autonex", key: "/admin/dashboard" };
};

const AdminLayout = () => {
  const rawBreadcrumbTrail = useBreadcrumbTrail(resolveAdminCrumb);
  const detailTitle = usePageDetailTitle();
  let breadcrumbTrail = detailTitle
    ? rawBreadcrumbTrail.map((c) =>
        c.key === "admin-analytics-detail" || c.key === "admin-employees-detail"
          ? { ...c, name: detailTitle }
          : c,
      )
    : rawBreadcrumbTrail;

  const isEmployeeDetail =
    breadcrumbTrail[breadcrumbTrail.length - 1]?.key === "admin-employees-detail";
  const hasEmployeesParent = breadcrumbTrail.some((c) => c.key === "/admin/employees");

  if (isEmployeeDetail && !hasEmployeesParent) {
    breadcrumbTrail = [
      { key: "/admin/dashboard", name: "Autonex", path: "/admin/dashboard" },
      { key: "/admin/employees", name: "Employees", path: "/admin/employees" },
      breadcrumbTrail[breadcrumbTrail.length - 1],
    ];
  }

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

  const { data: signupCounts } = useQuery({
    queryKey: ["signup-requests-counts"],
    queryFn: () => signupRequestApi.getCounts(),
    refetchInterval: 300_000,
    staleTime: 60_000,
  });
  const pendingSignupCount = signupCounts?.pending || 0;

  // PRESERVE existing Admin logout behaviour
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

  return (
    <AppShellLayout
      storageKeyPrefix="admin"
      SidebarComponent={AdminSidebar}
      sidebarProps={{
        user,
        pendingSignupCount,
        onLogout: handleLogout,
      }}
      breadcrumbTrail={breadcrumbTrail}
      homeHref="/admin/dashboard"
      filterDashboardCrumb
      normalizeLightMode
      chatRole="admin"
      outerBgClass="bg-gray-200/50"
      contentWrapperClass="max-w-[1600px] mx-auto space-y-5"
    />
  );
};

export default AdminLayout;