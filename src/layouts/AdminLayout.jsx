import { Outlet } from "react-router-dom";
import { Menu, PanelLeft } from "lucide-react";
import { navigation } from "../config/navigation";
import api, {
  signupRequestApi,
  employeeApi,
  subProjectApi,
} from "../services/api";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import NotificationBell from "../components/NotificationBell";
import PortalSwitcher from "../components/PortalSwitcher";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import { useBreadcrumbTrail } from "../hooks/useBreadcrumbTrail";
import { usePageDetailTitle } from "../utils/pageDetailTitle";
import AdminSidebar from "./AdminSidebar";
import ChatWidget from "../components/chat/ChatWidget";

// Human labels for admin routes not in the sidebar `navigation` config.
const ADMIN_ROUTE_LABELS = {
  "/admin/modules": "Training Modules",
  "/admin/modules/new": "New Module",
  "/admin/onboarding-reports": "Progress Reports",
  "/admin/newly-onboarded": "Newly Onboarded",
  "/admin/change-log": "Change Log",
  "/admin/company-settings": "Company Settings",
};

// Resolve the current admin route to a breadcrumb crumb.
const resolveAdminCrumb = (pathname) => {
  // Project analytics is a drill-down detail route (e.g. from a project card).
  if (pathname.startsWith("/admin/analytics/")) {
    return { name: "Analytics", key: "admin-analytics-detail", isDetail: true };
  }
  const navItem = navigation.find((n) => n.href === pathname);
  if (navItem) return { name: navItem.name, key: pathname };
  if (ADMIN_ROUTE_LABELS[pathname])
    return { name: ADMIN_ROUTE_LABELS[pathname], key: pathname };
  return { name: "Dashboard", key: "/admin/dashboard" };
};

const MIN_WIDTH = 208;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 256;

const AdminLayout = () => {
  const rawBreadcrumbTrail = useBreadcrumbTrail(resolveAdminCrumb);
  const detailTitle = usePageDetailTitle();
  // Replace a generic detail crumb (e.g. "Analytics") with the live page title
  // (e.g. the project name) once the detail page has loaded it.
  const breadcrumbTrail = detailTitle
    ? rawBreadcrumbTrail.map((c) =>
        c.key === "admin-analytics-detail" ? { ...c, name: detailTitle } : c,
      )
    : rawBreadcrumbTrail;
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false); // desktop collapse
  const [peek, setPeek] = useState(false); // edge-peek when collapsed
  const [width, setWidth] = useState(DEFAULT_WIDTH); // desktop sidebar width
  const widthRef = useRef(DEFAULT_WIDTH);
  const [user, setUser] = useState({});

  useEffect(() => {
    // Client-side initialization after hydration
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
      }
    }

    const savedCollapsed = localStorage.getItem("admin-sidebar-collapsed");
    if (savedCollapsed === "true") setCollapsed(true);

    const savedWidth = parseInt(
      localStorage.getItem("admin-sidebar-width"),
      10,
    );
    if (!Number.isNaN(savedWidth)) {
      const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, savedWidth));
      widthRef.current = clamped;
      setWidth(clamped);
    }
  }, []);

  // Light-only mode: ensure the document never carries the `dark` class.
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("admin-sidebar-collapsed", String(next));
      if (next) setPeek(false);
      return next;
    });
  };

  // Drag the right panel's left border to resize the sidebar; a click without
  // dragging collapses the sidebar.
  const startResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = widthRef.current;
    let moved = false;

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      const w = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW + dx));
      widthRef.current = w;
      setWidth(w);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (!moved) {
        toggleCollapsed();
      } else {
        localStorage.setItem("admin-sidebar-width", String(widthRef.current));
      }
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const closeOverlays = () => {
    setSidebarOpen(false);
    setPeek(false);
  };

  // Fetch data for global search (background)
  const { data: searchEmployees = [] } = useQuery({
    key: "employees",
    queryKey: ["employees"],
    queryFn: employeeApi.getAll,
    staleTime: 5 * 60 * 1000,
  });
  const { data: searchProjects = [] } = useQuery({
    key: "sub-projects",
    queryKey: ["sub-projects"],
    queryFn: subProjectApi.getAll,
    staleTime: 5 * 60 * 1000,
  });

  const { data: signupCounts } = useQuery({
    key: "signup-requests-counts",
    queryKey: ["signup-requests-counts"],
    queryFn: () => signupRequestApi.getCounts(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const pendingSignupCount = signupCounts?.pending || 0;

  const handleLogout = async () => {
    try {
      // Call backend to invalidate token
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout sync failed", err);
    } finally {
      // SECURE CLEANUP: Clear all local storage data
      localStorage.clear();

      // Clear React Query cache to prevent data leakage
      queryClient.clear();

      // Hard redirect (not navigate) to ensure full page reload
      // This prevents any stale state from persisting
      window.location.href = "/login/admin";
    }
  };

  const sidebarProps = {
    user,
    pendingSignupCount,
    onNavigate: closeOverlays,
    onLogout: handleLogout,
  };

  return (
    <div className="h-screen flex font-sans overflow-hidden bg-gray-200/50 text-slate-900 ">
      {/* Desktop sidebar (in-flow) — hidden when collapsed */}
      {!collapsed && (
        <div className="hidden lg:block shrink-0" style={{ width }}>
          <AdminSidebar {...sidebarProps} />
        </div>
      )}

      {/* Desktop collapsed: thin trigger zone at the extreme left + floating peek panel */}
      {collapsed && (
        <div
          className="hidden lg:block fixed left-0 top-0 h-full w-2.5 z-40"
          onMouseEnter={() => setPeek(true)}
        />
      )}
      {collapsed && peek && (
        <div
          className="hidden lg:block fixed left-2 top-2 bottom-2 z-50 rounded-xl overflow-hidden border border-slate-200 shadow-2xl bg-[#f4f5f7] "
          style={{ width }}
          onMouseLeave={() => setPeek(false)}
        >
          <AdminSidebar {...sidebarProps} />
        </div>
      )}

      {/* Mobile off-canvas drawer */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-[#f4f5f7] transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <AdminSidebar {...sidebarProps} />
      </div>
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Panel — Linear-style inset rounded card floating on the app canvas */}
      <div className="relative flex-1 flex flex-col min-w-0 overflow-hidden m-2 rounded-xl border border-slate-200 bg-[#f8fafc] ">
        {/* Drag the left border to resize the sidebar · click to collapse.
 The blue line only shows while hovering the strip. */}
        {!collapsed && (
          <div
            onMouseDown={startResize}
            title="Drag to resize · Click to collapse"
            className="hidden lg:block absolute left-0 inset-y-0 w-2 cursor-col-resize z-30 border-l-2 border-transparent hover:border-blue-500/70 transition-colors duration-150"
          />
        )}
        {/* Top Header — Linear-style breadcrumb bar */}
        <header className="h-12 shrink-0 flex items-center justify-between px-4 sm:px-5 border-b border-slate-200/70 ">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile drawer toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 -ml-1 text-slate-500 hover:bg-slate-100 rounded-md lg:hidden "
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Desktop collapse / expand toggle */}
            <button
              onClick={toggleCollapsed}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden lg:flex p-1.5 -ml-1 text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <Breadcrumbs
              items={breadcrumbTrail}
              homeHref="/admin/dashboard"
              homeLabel="Autonex"
              homeIcon={
                <img
                  src="/favicon.png"
                  alt=""
                  className="h-[18px] w-[18px] rounded-[5px] border border-slate-200 bg-white p-0.5"
                />
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <PortalSwitcher />
            {/* Notification Bell */}
            <NotificationBell />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto px-4 pt-3 pb-4 sm:px-6 sm:pt-4 sm:pb-6 relative">
          <div className="max-w-[1600px] mx-auto space-y-5">
            <Outlet />
          </div>
        </main>
      </div>

      {/* AI Chat Widget */}
      {/* <ChatWidget role="admin" /> */}
    </div>
  );
};

export default AdminLayout;
