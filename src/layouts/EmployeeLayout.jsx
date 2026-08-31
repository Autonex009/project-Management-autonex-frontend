import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../services/api";
import { useBreadcrumbTrail } from "../hooks/useBreadcrumbTrail";
import { usePageDetailTitle } from "../utils/pageDetailTitle";
import EmployeeSidebar from "./EmployeeSidebar";
import AppShellLayout from "../layouts/AppShellLayout";
import CandidateConfirmationPage from "../pages/hr/CandidateConfirmationPage";

const EmployeeLayout = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [user, setUser] = useState({});
  const [role, setRole] = useState("employee");

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
      }
    }
    const savedRole = localStorage.getItem("role");
    if (savedRole) setRole(savedRole);
  }, []);

  const isPm = location.pathname.startsWith("/pm");

  const { data: account } = useQuery({
    queryKey: ["auth-me"],
    queryFn: authApi.me,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (account) {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        try {
          const cachedUser = JSON.parse(savedUser);
          if (cachedUser.employee_type !== account.employee_type) {
            const updatedUser = {
              ...cachedUser,
              employee_type: account.employee_type,
            };
            localStorage.setItem("user", JSON.stringify(updatedUser));
            window.location.reload();
          }
        } catch (e) {
          console.error("Failed to sync localStorage user profile", e);
        }
      }
    }
  }, [account]);

  // PRESERVE existing Employee logout behaviour
  const handleLogout = () => {
    authApi
      .logout()
      .catch(() => {})
      .finally(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("role");
        queryClient.clear();
        window.location.href = isPm ? "/login/pm" : "/login/employee";
      });
  };

  const prefix = isPm ? "/pm" : "/employee";

  const navItems = isPm
    ? [
        { to: `${prefix}/dashboard`, label: "Dashboard" },
        { to: `${prefix}/projects`, label: "Organizations" },
        { to: `${prefix}/sub-projects`, label: "Projects" },
        { to: `${prefix}/allocations`, label: "Allocations" },
        { to: `${prefix}/my-team`, label: "My Team" },
        { to: `${prefix}/performance`, label: "Performance" },
        { to: `${prefix}/self-evaluation`, label: "Self Evaluation" },
        { to: `${prefix}/leaves`, label: "Team Leaves" },
        { to: `${prefix}/my-leaves`, label: "My Leaves" },
        { to: `${prefix}/side-projects`, label: "Side Projects" },
        { to: `${prefix}/guidelines`, label: "Guidelines" },
        { to: `${prefix}/onboarding`, label: "My Onboarding" },
        { to: `${prefix}/onboarding-mentor`, label: "Mentorship" },
      ]
    : [
        { to: `${prefix}/dashboard`, label: "Dashboard" },
        { to: `${prefix}/projects`, label: "My Projects" },
        { to: `${prefix}/self-evaluation`, label: "Self Evaluation" },
        { to: `${prefix}/leaves`, label: "Leaves" },
        { to: `${prefix}/side-projects`, label: "Side Projects" },
        { to: `${prefix}/guidelines`, label: "Guidelines" },
        { to: `${prefix}/referrals`, label: "Referrals" },
        { to: `${prefix}/company-info`, label: "Company Info" },
        { to: `${prefix}/onboarding`, label: "Onboarding" },
      ];

  const resolveCrumb = (pathname) => {
    if (pathname.startsWith("/pm/analytics/"))
      return { name: "Analytics", key: "pm-analytics-detail", isDetail: true };
    if (pathname.startsWith("/pm/my-team/"))
      return { name: "Employee", key: "pm-myteam-detail", isDetail: true };
    const item = navItems.find((n) => n.to === pathname);
    if (item) return { name: item.label, key: pathname };
    if (/\/onboarding\/[^/]+$/.test(pathname))
      return { name: "Module", key: "onboarding-module", isDetail: true };
    return { name: "Dashboard", key: `${prefix}/dashboard` };
  };

  const rawBreadcrumbTrail = useBreadcrumbTrail(resolveCrumb);
  const detailTitle = usePageDetailTitle();

  let breadcrumbTrail = detailTitle
    ? rawBreadcrumbTrail.map((c) =>
        c.key === "pm-analytics-detail" ||
        c.key === "pm-myteam-detail" ||
        c.key === "onboarding-module"
          ? { ...c, name: detailTitle }
          : c,
      )
    : rawBreadcrumbTrail;

  const isEmployeeDetail =
    breadcrumbTrail[breadcrumbTrail.length - 1]?.key === "pm-myteam-detail";
  const hasEmployeesParent = breadcrumbTrail.some((c) => c.key === "/pm/my-team");

  if (isEmployeeDetail && !hasEmployeesParent) {
    breadcrumbTrail = [
      { key: "/pm/my-team", name: "My Team", path: "/pm/my-team" },
      breadcrumbTrail[breadcrumbTrail.length - 1],
    ];
  }

  return (
    <>
      <CandidateConfirmationPage />
      <AppShellLayout
        storageKeyPrefix="employee"
        SidebarComponent={EmployeeSidebar}
        sidebarProps={{
          user,
          account,
          role,
          isPm,
          onLogout: handleLogout,
        }}
        breadcrumbTrail={breadcrumbTrail}
        homeHref={`${prefix}/dashboard`}
        filterDashboardCrumb={false}
        normalizeLightMode={false}
        // chatRole omitted → <ChatWidget /> with no role (same as today)
        outerBgClass="bg-[#f4f5f7]"
        contentWrapperClass="w-full h-full"
      />
    </>
  );
};

export default EmployeeLayout;