import { useLocation, Outlet } from 'react-router-dom';
import { Menu, ChevronRight, PanelLeft } from 'lucide-react';
import { navigation } from '../config/navigation';
import api, { signupRequestApi, employeeApi, subProjectApi } from '../services/api';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import NotificationBell from '../components/NotificationBell';
import AdminSidebar from './AdminSidebar';
import ChatWidget from '../components/chat/ChatWidget';

const MIN_WIDTH = 208;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 256;

const AdminLayout = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);   // mobile drawer
  const [collapsed, setCollapsed] = useState(false);        // desktop collapse
  const [peek, setPeek] = useState(false);                  // edge-peek when collapsed
  const [width, setWidth] = useState(DEFAULT_WIDTH);        // desktop sidebar width
  const widthRef = useRef(DEFAULT_WIDTH);
  const [user, setUser] = useState({});
  // Default to dark (Linear look); real preference is read from localStorage
  // after hydration so SSR markup stays consistent.
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    // Client-side initialization after hydration
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
      }
    }

    const savedTheme = localStorage.getItem('admin-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    }

    const savedCollapsed = localStorage.getItem('admin-sidebar-collapsed');
    if (savedCollapsed === 'true') setCollapsed(true);

    const savedWidth = parseInt(localStorage.getItem('admin-sidebar-width'), 10);
    if (!Number.isNaN(savedWidth)) {
      const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, savedWidth));
      widthRef.current = clamped;
      setWidth(clamped);
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('admin-theme', next);
      return next;
    });
  };

  // Drive the `dark` class on <html> so every `dark:` style in the document
  // (including portals — modals, toasts, notification panel) responds to the
  // toggle. Cleaned up when leaving the admin area.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    return () => root.classList.remove('dark');
  }, [theme]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('admin-sidebar-collapsed', String(next));
      if (next) setPeek(false);
      return next;
    });
  };

  // Drag the divider to resize; a click without dragging collapses the sidebar.
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
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (!moved) {
        toggleCollapsed();
      } else {
        localStorage.setItem('admin-sidebar-width', String(widthRef.current));
      }
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const closeOverlays = () => {
    setSidebarOpen(false);
    setPeek(false);
  };

  // Fetch data for global search (background)
  const { data: searchEmployees = [] } = useQuery({
    key: 'employees',
    queryKey: ['employees'],
    queryFn: employeeApi.getAll,
    staleTime: 5 * 60 * 1000
  });
  const { data: searchProjects = [] } = useQuery({
    key: 'sub-projects',
    queryKey: ['sub-projects'],
    queryFn: subProjectApi.getAll,
    staleTime: 5 * 60 * 1000
  });

  const { data: signupCounts } = useQuery({
    key: 'signup-requests-counts',
    queryKey: ['signup-requests-counts'],
    queryFn: () => signupRequestApi.getCounts(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const pendingSignupCount = signupCounts?.pending || 0;

  const handleLogout = async () => {
    try {
      // Call backend to invalidate token
      await api.post('/auth/logout');
    } catch (err) {
      console.error("Logout sync failed", err);
    } finally {
      // SECURE CLEANUP: Clear all local storage data
      localStorage.clear();

      // Clear React Query cache to prevent data leakage
      queryClient.clear();

      // Hard redirect (not navigate) to ensure full page reload
      // This prevents any stale state from persisting
      window.location.href = '/login/admin';
    }
  };

  const sidebarProps = {
    user,
    pendingSignupCount,
    onNavigate: closeOverlays,
    onLogout: handleLogout,
    theme,
    onToggleTheme: toggleTheme,
  };

  return (
    <div className="h-screen flex font-sans overflow-hidden bg-[#f4f5f7] text-slate-900 dark:bg-[#070707] dark:text-zinc-100">
      {/* Desktop sidebar (in-flow, resizable) — hidden when collapsed */}
      {!collapsed && (
        <div className="hidden lg:block shrink-0 relative" style={{ width }}>
          <AdminSidebar {...sidebarProps} />
          {/* Resize / collapse handle sitting between the panels */}
          <div
            onMouseDown={startResize}
            title="Drag to resize · Click to collapse"
            className="group absolute inset-y-0 -right-1 w-2 cursor-col-resize z-50 flex justify-center"
          >
            <div className="w-px h-full bg-transparent group-hover:bg-blue-500/70 transition-colors duration-150" />
          </div>
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
          className="hidden lg:block fixed left-2 top-2  bottom-2 z-50 rounded-xl overflow-hidden border border-slate-200 dark:border-neutral-800 shadow-2xl"
          style={{ width }}
          onMouseLeave={() => setPeek(false)}
        >
          <AdminSidebar {...sidebarProps} />
        </div>
      )}

      {/* Mobile off-canvas drawer */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <AdminSidebar {...sidebarProps} />
      </div>
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Panel — Linear-style inset rounded card floating on the app canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden m-2 rounded-xl border bg-[#f8fafc] border-slate-200 dark:bg-[#0c0c0c] dark:border-neutral-800">
        {/* Top Header — Linear-style breadcrumb bar */}
        <header className="h-12 shrink-0 flex items-center justify-between px-4 sm:px-5 border-b border-slate-200/70 dark:border-neutral-800">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile drawer toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 -ml-1 text-slate-500 hover:bg-slate-100 rounded-md lg:hidden dark:text-zinc-400 dark:hover:bg-white/[0.06]"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Desktop collapse / expand toggle */}
            <button
              onClick={toggleCollapsed}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden lg:flex p-1.5 -ml-1 text-slate-500 hover:bg-slate-100 rounded-md dark:text-zinc-400 dark:hover:bg-white/[0.06] transition-colors"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <nav className="flex items-center gap-1.5 text-[13px] min-w-0">
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 shrink-0">
                <img src="/favicon.png" alt="" className="h-[18px] w-[18px] rounded-[5px] border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-0.5" />
                <span className="hidden sm:inline">Autonex</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600 shrink-0" />
              <span className="font-medium text-slate-900 dark:text-zinc-100 truncate">
                {navigation.find(n => n.href === location.pathname)?.name || 'Dashboard'}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <NotificationBell />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 relative">
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
