import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Calendar, CalendarCheck, Rocket, LogOut, Menu, X, FileText, Layers, UserCog, UserRound, Users, Users2, TrendingUp, GraduationCap, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import BrandLockup from '../components/brand/BrandLockup';
import NotificationBell from '../components/NotificationBell';

const accentTheme = {
    pm: {
        chip: 'bg-blue-50 text-blue-700',
        active: 'bg-blue-50 text-blue-700 shadow-sm',
        inactive: 'text-slate-500 hover:bg-slate-50 hover:text-slate-700',
        avatar: 'bg-blue-100 text-blue-700',
    },
    employee: {
        chip: 'bg-emerald-50 text-emerald-700',
        active: 'bg-emerald-50 text-emerald-700 shadow-sm',
        inactive: 'text-slate-500 hover:bg-emerald-50/60 hover:text-emerald-700',
        avatar: 'bg-emerald-100 text-emerald-700',
    },
};

const EmployeeLayout = () => {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');
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
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = localStorage.getItem('role') || 'employee';
    const isPm = role === 'pm';
    const prefix = isPm ? '/pm' : '/employee';
    const portalLabel = isPm ? 'PM Portal' : 'Employee Portal';
    const theme = isPm ? accentTheme.pm : accentTheme.employee;

    const isAnnotator = user.designation && (
        user.designation.toLowerCase().includes('annotator') ||
        user.designation.toLowerCase().includes('reviewer')
    );

    const navItems = isPm
        ? [
            { to: `${prefix}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
            { to: `${prefix}/projects`, label: 'Organizations', icon: Layers },
            { to: `${prefix}/sub-projects`, label: 'Projects', icon: FolderKanban },
            { to: `${prefix}/allocations`, label: 'Allocations', icon: UserCog },
            { to: `${prefix}/my-team`, label: 'My Team', icon: Users },
            { to: `${prefix}/performance`, label: 'Performance', icon: TrendingUp },
            { to: `${prefix}/leaves`, label: 'Team Leaves', icon: Calendar },
            { to: `${prefix}/my-leaves`, label: 'My Leaves', icon: CalendarCheck },
            { to: `${prefix}/side-projects`, label: 'Side Projects', icon: Rocket },
            { to: `${prefix}/guidelines`, label: 'Guidelines', icon: FileText },
            { to: `${prefix}/onboarding-mentor`, label: 'Mentorship', icon: GraduationCap },
        ]
        : [
            { to: `${prefix}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
            { to: `${prefix}/projects`, label: 'My Projects', icon: FolderKanban },
            { to: `${prefix}/leaves`, label: 'Leaves', icon: Calendar },
            { to: `${prefix}/side-projects`, label: 'Side Projects', icon: Rocket },
            { to: `${prefix}/guidelines`, label: 'Guidelines', icon: FileText },
            { to: `${prefix}/referrals`, label: 'Referrals', icon: Users2 },
            { to: `${prefix}/company-info`, label: 'Company Info', icon: Info },
            ...(isAnnotator ? [{ to: `${prefix}/onboarding`, label: 'Onboarding', icon: GraduationCap }] : []),
            { to: `${prefix}/profile`, label: 'Profile', icon: UserRound },
        ];

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        navigate(isPm ? '/login/pm' : '/login/employee');
    };

    const isSidebarCollapsed = !isMobile && isCollapsed && !isHovered;

    return (
        <div className={`min-h-screen flex ${isPm ? 'bg-[linear-gradient(180deg,#f8fbff_0%,#f8fafc_35%,#f1f5f9_100%)]' : 'bg-[linear-gradient(180deg,#f3fffb_0%,#f8fafc_35%,#eefbf6_100%)]'}`}>
            {/* Desktop Sidebar Width Placeholder */}
            <div className={`hidden lg:block flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'}`} />

            <aside
                onMouseEnter={() => isCollapsed && setIsHovered(true)}
                onMouseLeave={() => isCollapsed && setIsHovered(false)}
                className={`fixed inset-y-0 left-0 z-50 border-r border-slate-200 bg-white/95 shadow-xl backdrop-blur transition-all duration-300 ease-in-out flex flex-col overflow-visible
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    ${isSidebarCollapsed ? 'lg:w-20' : 'w-72'}
                `}
            >
                {/* Collapse Toggle Button - Desktop Only */}
                <button
                    onClick={toggleCollapse}
                    className="hidden lg:flex absolute -right-3 top-24 z-50 h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all shadow-md cursor-pointer"
                >
                    {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                </button>

                <div className="flex h-full flex-col">
                    <div className={`relative overflow-hidden border-b border-slate-100 shrink-0 transition-all ${isSidebarCollapsed ? 'px-4 py-6' : 'px-5 py-5'} bg-white/95`}>
                        <div className={`absolute inset-0 ${isPm ? 'bg-[radial-gradient(circle_at_top_right,_rgba(18,63,169,0.18),_transparent_95%)]' : 'bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.16),_transparent_99%)]'}`} />
                        <div className="relative flex items-center justify-center">
                            <BrandLockup subtitle={portalLabel} tone="light" compact={isSidebarCollapsed} collapsed={isSidebarCollapsed} />
                        </div>
                    </div>

                    <nav 
                        className="flex-1 overflow-y-auto p-4 space-y-1"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {navItems.map(item => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={() => setSidebarOpen(false)}
                                title={isSidebarCollapsed ? item.label : undefined}
                                className={({ isActive }) =>
                                    `flex items-center rounded-xl text-sm font-medium transition-all duration-200 group relative
                                    ${isActive ? theme.active : theme.inactive}
                                    ${isSidebarCollapsed 
                                        ? 'lg:justify-center lg:w-12 lg:h-12 lg:px-0 lg:mx-auto gap-0' 
                                        : 'px-4 py-3 gap-3 w-full'
                                    }`
                                }
                            >
                                <item.icon className="w-5 h-5 shrink-0" />
                                <span className={`transition-all duration-200 truncate ${isSidebarCollapsed ? 'lg:hidden opacity-0 w-0' : 'opacity-100 w-auto'}`}>
                                    {item.label}
                                </span>
                            </NavLink>
                        ))}
                    </nav>

                    <div className={`border-t border-slate-100 p-4 transition-all flex flex-col gap-3 items-center ${isSidebarCollapsed ? 'lg:px-2 lg:py-4' : ''}`}>
                        {isSidebarCollapsed ? (
                            <div className="group relative">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-sm shrink-0 border border-slate-100 bg-slate-50 cursor-pointer ${theme.avatar}`}>
                                    {(user.name || 'U').charAt(0)}
                                </div>
                                <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 shadow-xl">
                                    {user.name || 'User'} ({portalLabel})
                                </div>
                            </div>
                        ) : (
                            <div className="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-slate-50/90">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm shrink-0 ${theme.avatar}`}>
                                    {(user.name || 'U').charAt(0)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-slate-900">{user.name || 'User'}</p>
                                    <p className="truncate text-xs text-slate-400">{user.email || ''}</p>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleLogout}
                            title={isSidebarCollapsed ? "Sign out" : undefined}
                            className={`flex items-center justify-center text-red-500 hover:bg-red-50 border border-transparent rounded-lg transition-all
                                ${isSidebarCollapsed 
                                    ? 'w-10 h-10 lg:p-0' 
                                    : 'w-full gap-2 px-4 py-2.5 text-sm'
                                }
                            `}
                        >
                            <LogOut className="w-4 h-4 shrink-0" />
                            {!isSidebarCollapsed && <span>Sign out</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <div className="flex-1 flex flex-col min-w-0">
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/80 px-6 backdrop-blur-md lg:px-8">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 lg:hidden">
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="hidden lg:block" />
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                        <div className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${theme.chip}`}>{role}</div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default EmployeeLayout;
