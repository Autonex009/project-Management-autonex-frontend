import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Calendar, CalendarCheck, Rocket, LogOut, FileText, Layers, UserCog, UserRound, Users, Users2, TrendingUp, GraduationCap, Info, ClipboardList } from 'lucide-react';

const rowBase = 'flex items-center gap-2.5 w-full px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-colors duration-150 group relative';

const accentTheme = {
    pm: {
        active: 'bg-white text-blue-700 shadow-sm dark:bg-white/[0.08] dark:text-zinc-100 dark:shadow-none',
        inactive: 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.05]',
        iconActive: 'text-blue-600 dark:text-zinc-100',
        iconInactive: 'text-slate-400 group-hover:text-slate-600 dark:text-zinc-500 dark:group-hover:text-zinc-200',
    },
    employee: {
        active: 'bg-white text-emerald-700 shadow-sm dark:bg-white/[0.08] dark:text-zinc-100 dark:shadow-none',
        inactive: 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.05]',
        iconActive: 'text-emerald-600 dark:text-zinc-100',
        iconInactive: 'text-slate-400 group-hover:text-slate-600 dark:text-zinc-500 dark:group-hover:text-zinc-200',
    },
};

const iconBtn = 'w-9 h-9 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:border-neutral-800 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.06] transition-colors';

const EmployeeSidebar = ({ user = {}, account, role, isPm, onNavigate, onLogout }) => {
    const location = useLocation();

    const handleNavigate = () => onNavigate?.();

    const isRowActive = (href) => location.pathname === href || (href !== (isPm ? '/pm/dashboard' : '/employee/dashboard') && location.pathname.startsWith(href + '/'));

    const prefix = isPm ? '/pm' : '/employee';
    const portalLabel = isPm ? 'PM Portal' : 'Employee Portal';
    const theme = isPm ? accentTheme.pm : accentTheme.employee;

    const navItems = isPm
        ? [
            { to: `${prefix}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
            { to: `${prefix}/projects`, label: 'Organizations', icon: Layers },
            { to: `${prefix}/sub-projects`, label: 'Projects', icon: FolderKanban },
            { to: `${prefix}/allocations`, label: 'Allocations', icon: UserCog },
            { to: `${prefix}/my-team`, label: 'My Team', icon: Users },
            { to: `${prefix}/performance`, label: 'Performance', icon: TrendingUp },
            { to: `${prefix}/self-evaluation`, label: 'Self Evaluation', icon: ClipboardList },
            { to: `${prefix}/leaves`, label: 'Team Leaves', icon: Calendar },
            { to: `${prefix}/my-leaves`, label: 'My Leaves', icon: CalendarCheck },
            { to: `${prefix}/side-projects`, label: 'Side Projects', icon: Rocket },
            { to: `${prefix}/guidelines`, label: 'Guidelines', icon: FileText },
            { to: `${prefix}/onboarding`, label: 'My Onboarding', icon: GraduationCap },
            { to: `${prefix}/onboarding-mentor`, label: 'Mentorship', icon: GraduationCap },
        ]
        : [
            { to: `${prefix}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
            { to: `${prefix}/projects`, label: 'My Projects', icon: FolderKanban },
            { to: `${prefix}/self-evaluation`, label: 'Self Evaluation', icon: ClipboardList },
            { to: `${prefix}/leaves`, label: 'Leaves', icon: Calendar },
            { to: `${prefix}/side-projects`, label: 'Side Projects', icon: Rocket },
            { to: `${prefix}/guidelines`, label: 'Guidelines', icon: FileText },
            { to: `${prefix}/referrals`, label: 'Referrals', icon: Users2 },
            { to: `${prefix}/company-info`, label: 'Company Info', icon: Info },
            { to: `${prefix}/onboarding`, label: 'Onboarding', icon: GraduationCap },
        ];

    const avatarUrl = account?.avatar_url || user?.avatar_url || '';
    const displayName = account?.name || user?.name || 'User';

    const renderItem = (item) => {
        const isActive = isRowActive(item.to);
        const Icon = item.icon;
        return (
            <NavLink
                key={item.to}
                to={item.to}
                onClick={handleNavigate}
                className={`${rowBase} ${isActive ? theme.active : theme.inactive}`}
            >
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? theme.iconActive : theme.iconInactive}`} />
                <span className="truncate">{item.label}</span>
            </NavLink>
        );
    };

    return (
        <div className="h-full flex flex-col overflow-visible bg-[#f4f5f7] dark:bg-[#070707]">
            {/* Brand Header */}
            <div className="shrink-0 px-3 pt-5 pb-4">
                <div className="flex items-center gap-2.5">
                    <img src="/favicon.png" alt="Autonex" className="h-9 w-9 rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-1 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-[15px] font-semibold text-slate-900 dark:text-zinc-100 truncate leading-tight">Autonex</p>
                        <p className="text-[12px] text-slate-400 dark:text-zinc-500 truncate leading-tight">{portalLabel}</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2.5 py-2 space-y-3 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="space-y-0.5">{navItems.map(renderItem)}</div>
            </nav>

            {/* Bottom Bar */}
            <div className="shrink-0 p-2.5 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-2">
                {/* Profile */}
                <div className="group relative">
                    <button type="button" className="h-9 w-9 flex items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                        ) : (
                            <span className="font-bold text-sm text-slate-500">{(displayName || 'U').charAt(0)}</span>
                        )}
                    </button>
                    <div className="absolute bottom-full left-0 mb-2 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 shadow-xl">
                        {account?.email || user?.email || ''} · capitalize(role)
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                    <NavLink
                        to={`${prefix}/profile`}
                        onClick={handleNavigate}
                        title="Profile"
                        className={`${iconBtn} ${isRowActive(`${prefix}/profile`) ? (isPm ? 'text-blue-600 bg-white shadow-sm dark:text-white dark:bg-white/[0.08] dark:shadow-none' : 'text-emerald-600 bg-white shadow-sm dark:text-white dark:bg-white/[0.08] dark:shadow-none') : ''}`}
                    >
                        <UserRound className="w-4 h-4" />
                    </NavLink>
                    <button
                        onClick={onLogout}
                        title="Sign Out"
                        className={`${iconBtn} hover:text-red-600 hover:bg-red-50 dark:hover:text-white dark:hover:bg-red-600/15`}
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmployeeSidebar;
