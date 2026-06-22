import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, GraduationCap, FileSpreadsheet, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { navigation } from '../config/navigation';
import api, { signupRequestApi } from '../services/api';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import BrandLockup from '../components/brand/BrandLockup';
import NotificationBell from '../components/NotificationBell';

const onboardingNavigation = [
  { name: 'Training Modules', href: '/admin/modules', icon: GraduationCap },
  { name: 'Progress Reports', href: '/admin/onboarding-reports', icon: FileSpreadsheet },
  { name: 'Training Analytics', href: '/admin/onboarding-analytics', icon: BarChart3 },
];

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === null ? true : saved === 'true';
  });
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  const { data: pendingSignups = [] } = useQuery({
    queryKey: ['signup-requests', 'pending'],
    queryFn: () => signupRequestApi.getAll({ status: 'pending' }),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const pendingSignupCount = pendingSignups.length;

  // Get user info from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');

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

  const isSidebarCollapsed = !isMobile && isCollapsed && !isHovered;

  return (
    <div className="min-h-screen flex bg-slate-100 font-sans text-slate-900">
      {/* Desktop Sidebar Width Placeholder */}
      <div className={`hidden lg:block flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'}`} />

      {/* Sidebar - Dark Professional Theme */}
      <aside
        onMouseEnter={() => isCollapsed && setIsHovered(true)}
        onMouseLeave={() => isCollapsed && setIsHovered(false)}
        className={`fixed inset-y-0 left-0 z-50 bg-[linear-gradient(180deg,#020617_0%,#07142d_50%,#0b1b44_100%)] text-white transition-all duration-300 ease-in-out shadow-2xl flex flex-col overflow-visible
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isSidebarCollapsed ? 'lg:w-20' : 'w-72'}
        `}
      >

        {/* Brand Header */}
        <div className={`relative overflow-hidden border-b border-white/10 shrink-0 transition-all ${isSidebarCollapsed ? 'px-4 py-6' : 'px-6 py-6'}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.18),_transparent_55%)]" />
          <div className="relative flex items-center justify-center">
            <BrandLockup subtitle="Admin Control Center" tone="dark" compact={isSidebarCollapsed} collapsed={isSidebarCollapsed} />
          </div>
        </div>

        {/* Navigation */}
        <nav 
          className="flex-1 p-4 space-y-1 overflow-y-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {isSidebarCollapsed ? (
            <div className="border-t border-white/10 my-4 mx-2" />
          ) : (
            <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-2 truncate">
              Platform Overview
            </p>
          )}
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                title={isSidebarCollapsed ? item.name : undefined}
                className={`
                  flex items-center rounded-xl text-sm font-medium transition-all duration-200 group relative
                  ${isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }
                  ${isSidebarCollapsed 
                    ? 'lg:justify-center lg:w-12 lg:h-12 lg:px-0 lg:mx-auto gap-0' 
                    : 'px-4 py-3 gap-3 w-full'
                  }
                `}
              >
                <Icon className={`w-5 h-5 transition-colors shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                <span className={`transition-all duration-200 truncate ${isSidebarCollapsed ? 'lg:hidden opacity-0 w-0' : 'opacity-100 w-auto'}`}>
                  {item.name}
                </span>
                {!isSidebarCollapsed && item.href === '/admin/signup-requests' && pendingSignupCount > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full text-[10px] font-bold bg-red-500 text-white shrink-0">
                    {pendingSignupCount}
                  </span>
                )}
                {isSidebarCollapsed && item.href === '/admin/signup-requests' && pendingSignupCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
              </Link>
            );
          })}

          {isSidebarCollapsed ? (
            <div className="border-t border-white/10 my-4 mx-2" />
          ) : (
            <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-4 truncate">
              Onboarding Portal
            </p>
          )}
          {onboardingNavigation.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                title={isSidebarCollapsed ? item.name : undefined}
                className={`
                  flex items-center rounded-xl text-sm font-medium transition-all duration-200 group relative
                  ${isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }
                  ${isSidebarCollapsed 
                    ? 'lg:justify-center lg:w-12 lg:h-12 lg:px-0 lg:mx-auto gap-0' 
                    : 'px-4 py-3 gap-3 w-full'
                  }
                `}
              >
                <Icon className={`w-5 h-5 transition-colors shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                <span className={`transition-all duration-200 truncate ${isSidebarCollapsed ? 'lg:hidden opacity-0 w-0' : 'opacity-100 w-auto'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section (Sidebar Bottom) */}
        <div className={`p-4 border-t border-slate-800/50 bg-slate-950/30 transition-all flex flex-col gap-3 items-center ${isSidebarCollapsed ? 'lg:px-2 lg:py-4' : ''}`}>
          {isSidebarCollapsed ? (
            <div className="group relative">
              <img src="/favicon.png" alt="Autonex" className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 p-1.5 transition-all hover:border-white/30 cursor-pointer" />
              <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 shadow-xl">
                {user.email || 'Admin'} (Super Admin)
              </div>
            </div>
          ) : (
            <div className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <img src="/favicon.png" alt="Autonex" className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 p-1.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {user.email || 'Administrator'}
                </p>
                <p className="text-xs text-slate-400 truncate">Super Admin</p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            title={isSidebarCollapsed ? "Sign Out" : undefined}
            className={`flex items-center justify-center text-white/70 hover:text-white hover:bg-red-600/20 hover:border-red-500/30 border border-transparent rounded-lg transition-all
              ${isSidebarCollapsed 
                ? 'w-10 h-10 lg:p-0' 
                : 'w-full gap-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide'
              }
            `}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-slate-200/60 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-40 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              {navigation.find(n => n.href === location.pathname)?.name || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <NotificationBell />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-8 relative">
          <div className="max-w-[1600px] mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Backdrop — closes sidebar on outside click on all screen sizes */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminLayout;
