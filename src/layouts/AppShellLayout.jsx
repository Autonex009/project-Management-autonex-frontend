import { Outlet } from "react-router-dom";
import { Menu, PanelLeft } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import NotificationBell from "../components/NotificationBell";
import PortalSwitcher from "../components/PortalSwitcher";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import ChatWidget from "../components/chat/ChatWidget";

const MIN_WIDTH = 200;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = MIN_WIDTH;

/**
 * Shared admin / employee shell.
 * Portal-specific behaviour is passed in via props so existing differences are preserved.
 */
export default function AppShellLayout({
  storageKeyPrefix,          // "admin" | "employee"
  SidebarComponent,
  sidebarProps,
  breadcrumbTrail,
  homeHref,
  homeLabel = "Autonex",
  filterDashboardCrumb = false, // Admin filters /admin/dashboard out of items
  normalizeLightMode = false,   // Admin only today
  chatRole,                     // "admin" | undefined (Employee has no role prop today)
  outerBgClass = "bg-gray-200/50", // Admin: bg-gray-200/50, Employee: bg-[#f4f5f7]
  contentWrapperClass = "max-w-[1600px] mx-auto space-y-5", // Admin vs Employee differ
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [peek, setPeek] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const widthRef = useRef(DEFAULT_WIDTH);

  useEffect(() => {
    const savedCollapsed = localStorage.getItem(`${storageKeyPrefix}-sidebar-collapsed`);
    if (savedCollapsed === "true") setCollapsed(true);

    const savedWidth = parseInt(
      localStorage.getItem(`${storageKeyPrefix}-sidebar-width`),
      10,
    );
    if (!Number.isNaN(savedWidth) && savedWidth !== 256) {
      const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, savedWidth));
      widthRef.current = clamped;
      setWidth(clamped);
    } else {
      widthRef.current = DEFAULT_WIDTH;
      setWidth(DEFAULT_WIDTH);
    }
  }, [storageKeyPrefix]);

  useEffect(() => {
    if (normalizeLightMode) {
      document.documentElement.classList.remove("dark");
    }
  }, [normalizeLightMode]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(`${storageKeyPrefix}-sidebar-collapsed`, String(next));
      if (next) setPeek(false);
      return next;
    });
  };

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
        localStorage.setItem(
          `${storageKeyPrefix}-sidebar-width`,
          String(widthRef.current),
        );
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

  const mergedSidebarProps = {
    ...sidebarProps,
    onNavigate: () => {
      closeOverlays();
      sidebarProps?.onNavigate?.();
    },
  };

  const breadcrumbItems = filterDashboardCrumb
    ? breadcrumbTrail.filter((item) => item.key !== "/admin/dashboard")
    : breadcrumbTrail;

  return (
    <div className={`h-screen flex font-sans overflow-hidden ${outerBgClass} text-slate-900 `}>
      {!collapsed && (
        <div className="hidden lg:block shrink-0" style={{ width }}>
          <SidebarComponent {...mergedSidebarProps} />
        </div>
      )}

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
          <SidebarComponent {...mergedSidebarProps} />
        </div>
      )}

      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-[#f4f5f7] transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarComponent {...mergedSidebarProps} />
      </div>
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="relative flex-1 flex flex-col min-w-0 overflow-hidden m-2 rounded-xl border border-slate-200 bg-[#f8fafc] ">
        {!collapsed && (
          <div
            onMouseDown={startResize}
            title="Drag to resize · Click to collapse"
            className="hidden lg:block absolute left-0 inset-y-0 w-2 cursor-col-resize z-30 border-l-2 border-transparent hover:border-blue-500/70 transition-colors duration-150"
          />
        )}

        <header className="h-12 shrink-0 flex items-center justify-between px-4 sm:px-5 border-b border-slate-200/70 ">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 -ml-1 text-slate-500 hover:bg-slate-100 rounded-md lg:hidden "
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={toggleCollapsed}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden lg:flex p-1.5 -ml-1 text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <Breadcrumbs
              items={breadcrumbItems}
              homeHref={homeHref}
              homeLabel={homeLabel}
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
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-auto px-4 pt-3 pb-4 sm:px-6 sm:pt-4 sm:pb-6 relative">
          <div className={contentWrapperClass}>
            <Outlet />
          </div>
        </main>
      </div>

      {chatRole !== undefined ? (
        <ChatWidget role={chatRole} />
      ) : (
        <ChatWidget />
      )}
    </div>
  );
}