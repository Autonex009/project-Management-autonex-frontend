import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Calendar, CalendarCheck, Rocket, LogOut, Menu, X, FileText, Layers, UserCog, UserRound, Users, Users2, TrendingUp, GraduationCap, Info } from 'lucide-react';
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

    return (
        <div className={`min-h-screen flex ${isPm ? 'bg-[linear-gradient(180deg,#f8fbff_0%,#f8fafc_35%,#f1f5f9_100%)]' : 'bg-[linear-gradient(180deg,#f3fffb_0%,#f8fafc_35%,#eefbf6_100%)]'}`}>
            <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white/95 shadow-xl backdrop-blur transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex h-full flex-col">
                    <div className="relative overflow-hidden border-b border-slate-100 px-5 py-5 bg-white/95 shrink-0">
                        <div className={`absolute inset-0 ${isPm ? 'bg-[radial-gradient(circle_at_top_right,_rgba(18,63,169,0.18),_transparent_95%)]' : 'bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.16),_transparent_99%)]'}`} />
                        <div className="relative flex items-center justify-between gap-3">
                            <BrandLockup subtitle={portalLabel} tone="light" compact />
                            <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                        {navItems.map(item => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={() => setSidebarOpen(false)}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive ? theme.active : theme.inactive}`
                                }
                            >
                                <item.icon className="w-4.5 h-4.5" />
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="border-t border-slate-100 p-4">
                        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/90 px-3 py-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm ${theme.avatar}`}>
                                {(user.name || 'U').charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-900">{user.name || 'User'}</p>
                                <p className="truncate text-xs text-slate-400">{user.email || ''}</p>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50">
                            <LogOut className="w-4 h-4" />
                            Sign out
                        </button>
                    </div>
                </div>
            </aside>

            {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSidebarOpen(false)} />}

            <div className="flex-1 flex flex-col min-w-0">
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/80 px-6 backdrop-blur-md lg:px-8">
                    <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100">
                        <Menu className="w-5 h-5" />
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
