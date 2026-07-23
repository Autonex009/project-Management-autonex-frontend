import { useLocation, Outlet, useNavigate } from 'react-router-dom';
import { Menu, ChevronRight, PanelLeft } from 'lucide-react';
import { authApi } from '../services/api';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import NotificationBell from '../components/NotificationBell';
import EmployeeSidebar from './EmployeeSidebar';
import ChatWidget from '../components/chat/ChatWidget';
import { LayoutDashboard, FolderKanban, Calendar, CalendarCheck, Rocket, FileText, Layers, UserCog, Users, Users2, TrendingUp, GraduationCap, Info, ClipboardList } from 'lucide-react';

const MIN_WIDTH = 208;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 256;

const EmployeeLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);   // mobile drawer
  const [collapsed, setCollapsed] = useState(false);        // desktop collapse
  const [peek, setPeek] = useState(false);                  // edge-peek when collapsed
  const [width, setWidth] = useState(DEFAULT_WIDTH);        // desktop sidebar width
  const widthRef = useRef(DEFAULT_WIDTH);
  const [user, setUser] = useState({});
  const [role, setRole] = useState('employee');

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

    const savedRole = localStorage.getItem('role');
    if (savedRole) {
      setRole(savedRole);
    }

    const savedCollapsed = localStorage.getItem('employee-sidebar-collapsed');
    if (savedCollapsed === 'true') setCollapsed(true);

    const savedWidth = parseInt(localStorage.getItem('employee-sidebar-width'), 10);
    if (!Number.isNaN(savedWidth)) {
      const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, savedWidth));
      widthRef.current = clamped;
      setWidth(clamped);
    }
  }, []);

  // Light-only mode: ensure the document never carries the `dark` class so the
  // dormant dark: styles never activate.
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('employee-sidebar-collapsed', String(next));
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
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (!moved) {
        toggleCollapsed();
      } else {
        localStorage.setItem('employee-sidebar-width', String(widthRef.current));
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

  const isPm = location.pathname.startsWith('/pm');

  const { data: account } = useQuery({
    queryKey: ['auth-me'],
    queryFn: authApi.me,
    staleTime: 5 * 60 * 1000,
  });

  const handleLogout = () => {
    authApi.logout().catch(() => {}).finally(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      queryClient.clear();
      window.location.href = isPm ? '/login/pm' : '/login/employee';
    });
  };

  const prefix = isPm ? '/pm' : '/employee';

  const navItems = isPm
      ? [
          { to: `${prefix}/dashboard`, label: 'Dashboard' },
          { to: `${prefix}/projects`, label: 'Organizations' },
          { to: `${prefix}/sub-projects`, label: 'Projects' },
          { to: `${prefix}/allocations`, label: 'Allocations' },
          { to: `${prefix}/my-team`, label: 'My Team' },
          { to: `${prefix}/performance`, label: 'Performance' },
          { to: `${prefix}/self-evaluation`, label: 'Self Evaluation' },
          { to: `${prefix}/leaves`, label: 'Team Leaves' },
          { to: `${prefix}/my-leaves`, label: 'My Leaves' },
          { to: `${prefix}/side-projects`, label: 'Side Projects' },
          { to: `${prefix}/guidelines`, label: 'Guidelines' },
          { to: `${prefix}/onboarding`, label: 'My Onboarding' },
          { to: `${prefix}/onboarding-mentor`, label: 'Mentorship' },
      ]
      : [
          { to: `${prefix}/dashboard`, label: 'Dashboard' },
          { to: `${prefix}/projects`, label: 'My Projects' },
          { to: `${prefix}/self-evaluation`, label: 'Self Evaluation' },
          { to: `${prefix}/leaves`, label: 'Leaves' },
          { to: `${prefix}/side-projects`, label: 'Side Projects' },
          { to: `${prefix}/guidelines`, label: 'Guidelines' },
          { to: `${prefix}/referrals`, label: 'Referrals' },
          { to: `${prefix}/company-info`, label: 'Company Info' },
          { to: `${prefix}/onboarding`, label: 'Onboarding' },
      ];

  const currentNav = navItems.find(n => n.to === location.pathname) || { label: 'Dashboard' };

  const sidebarProps = {
    user,
    account,
    role,
    isPm,
    onNavigate: closeOverlays,
    onLogout: handleLogout,
  };

  return (
    <div className="h-screen flex font-sans overflow-hidden bg-[#f4f5f7] text-slate-900 dark:bg-[#070707] dark:text-zinc-100">
      {/* Desktop sidebar */}
      {!collapsed && (
        <div className="hidden lg:block shrink-0 relative" style={{ width }}>
          <EmployeeSidebar {...sidebarProps} />
          <div
            onMouseDown={startResize}
            title="Drag to resize · Click to collapse"
            className="group absolute inset-y-0 -right-1 w-2 cursor-col-resize z-50 flex justify-center"
          >
            <div className="w-px h-full bg-transparent group-hover:bg-blue-500/70 transition-colors duration-150" />
          </div>
        </div>
      )}

      {/* Desktop collapsed */}
      {collapsed && (
        <div
          className="hidden lg:block fixed left-0 top-0 h-full w-2.5 z-40"
          onMouseEnter={() => setPeek(true)}
        />
      )}
      {collapsed && peek && (
        <div
          className="hidden lg:block fixed left-2 top-2 bottom-2 z-50 rounded-xl overflow-hidden border border-slate-200 dark:border-neutral-800 shadow-2xl"
          style={{ width }}
          onMouseLeave={() => setPeek(false)}
        >
          <EmployeeSidebar {...sidebarProps} />
        </div>
      )}

      {/* Mobile drawer */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <EmployeeSidebar {...sidebarProps} />
      </div>
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden m-2 rounded-xl border bg-[#f8fafc] border-slate-200 dark:bg-[#0c0c0c] dark:border-neutral-800">
        {/* Top Header */}
        <header className="h-12 shrink-0 flex items-center justify-between px-4 sm:px-5 border-b border-slate-200/70 dark:border-neutral-800">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 -ml-1 text-slate-500 hover:bg-slate-100 rounded-md lg:hidden dark:text-zinc-400 dark:hover:bg-white/[0.06]"
            >
              <Menu className="w-5 h-5" />
            </button>
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
                {currentNav.label}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
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

      {/* <ChatWidget /> */}
    </div>
  );
};

export default EmployeeLayout;
