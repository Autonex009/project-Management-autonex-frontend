import { NavLink, useLocation, useNavigate } from "react-router-dom";
import UserAvatar from "../components/ui/UserAvatar";
import {
  LayoutDashboard,
  FolderKanban,
  Calendar,
  CalendarCheck,
  Rocket,
  LogOut,
  FileText,
  Layers,
  UserCog,
  Users,
  Users2,
  TrendingUp,
  GraduationCap,
  Info,
  ClipboardList,
  BarChart3,
  Trophy,
} from "lucide-react";

const rowBase =
  "flex items-center gap-2.5 w-full px-2.5 py-[9px] rounded-lg text-[13.5px] transition-all duration-150 group relative outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40";

const accentTheme = {
  pm: {
    active:
      "bg-white text-slate-900 font-semibold ring-1 ring-slate-200/60 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ",
    inactive:
      "text-slate-600 font-medium hover:text-slate-900 hover:bg-white/70 ",
    iconActive: "text-blue-600 ",
    iconInactive: "text-slate-500 group-hover:text-slate-800 ",
    bar: "bg-blue-600 ",
  },
  employee: {
    active:
      "bg-white text-slate-900 font-semibold ring-1 ring-slate-200/60 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ",
    inactive:
      "text-slate-600 font-medium hover:text-slate-900 hover:bg-white/70 ",
    iconActive: "text-emerald-600 ",
    iconInactive: "text-slate-500 group-hover:text-slate-800 ",
    bar: "bg-emerald-600 ",
  },
};

const iconBtn =
  "w-9 h-9 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors";

// Role names are wire values, not labels: "team_lead" has to read as "Team Lead" and
// "pm" as "PM", neither of which a plain capitalize would produce.
const ROLE_LABELS = {
  admin: "Admin",
  hr: "HR",
  pm: "PM",
  team_lead: "Team Lead",
  employee: "Employee",
};

const roleLabel = (role) =>
  ROLE_LABELS[role] || (role ? role.replace(/_/g, " ") : "");

const EmployeeSidebar = ({
  user = {},
  account,
  role,
  isPm,
  onNavigate,
  onLogout,
}) => {
  const location = useLocation();

  const handleNavigate = () => onNavigate?.();

  const isRowActive = (href) =>
    location.pathname === href ||
    (href !== (isPm ? "/pm/dashboard" : "/employee/dashboard") &&
      location.pathname.startsWith(href + "/"));

  const prefix = isPm ? "/pm" : "/employee";
  const portalLabel = isPm ? "PM Portal" : "Employee Portal";
  const theme = isPm ? accentTheme.pm : accentTheme.employee;

  const navItems = isPm
    ? [
      {
        to: `${prefix}/dashboard`,
        label: "Dashboard",
        icon: LayoutDashboard,
      },
      { to: `${prefix}/projects`, label: "Organizations", icon: Layers },
      { to: `${prefix}/sub-projects`, label: "Projects", icon: FolderKanban },
      { to: `${prefix}/analytics`, label: "Analytics", icon: BarChart3 },
      { to: `${prefix}/allocations`, label: "Allocations", icon: UserCog },
      { to: `${prefix}/my-team`, label: "My Team", icon: Users },
      { to: `${prefix}/performance`, label: "Performance", icon: TrendingUp },
      {
        to: `${prefix}/self-evaluation`,
        label: "Self Evaluation",
        icon: ClipboardList,
      },
      { to: `${prefix}/leaderboard`, label: "Leaderboard", icon: Trophy },
      { to: `${prefix}/leaves`, label: "Team Leaves", icon: Calendar },
      { to: `${prefix}/my-leaves`, label: "My Leaves", icon: CalendarCheck },
      { to: `${prefix}/side-projects`, label: "Side Projects", icon: Rocket },
      { to: `${prefix}/guidelines`, label: "Guidelines", icon: FileText },
      {
        to: `${prefix}/onboarding`,
        label: "My Onboarding",
        icon: GraduationCap,
      },
      {
        to: `${prefix}/onboarding-mentor`,
        label: "Mentorship",
        icon: GraduationCap,
      },
    ]
    : [
      {
        to: `${prefix}/dashboard`,
        label: "Dashboard",
        icon: LayoutDashboard,
      },
      { to: `${prefix}/projects`, label: "My Projects", icon: FolderKanban },
      {
        to: `${prefix}/self-evaluation`,
        label: "Self Evaluation",
        icon: ClipboardList,
      },
      { to: `${prefix}/leaderboard`, label: "Leaderboard", icon: Trophy },
      { to: `${prefix}/leaves`, label: "Leaves", icon: Calendar },
      { to: `${prefix}/side-projects`, label: "Side Projects", icon: Rocket },
      { to: `${prefix}/guidelines`, label: "Guidelines", icon: FileText },
      { to: `${prefix}/referrals`, label: "Referrals", icon: Users2 },
      { to: `${prefix}/company-info`, label: "Company Info", icon: Info },
      {
        to: `${prefix}/onboarding`,
        label: "Onboarding",
        icon: GraduationCap,
      },
    ];

  const avatarUrl = account?.avatar_url || user?.avatar_url || "";
  const displayName = account?.name || user?.name || "User";

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
        <Icon
          className={`w-[18px] h-[18px] shrink-0 transition-colors ${isActive ? theme.iconActive : theme.iconInactive}`}
          strokeWidth={isActive ? 2.4 : 2}
        />
        {isActive && (
          <span
            className={`absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full ${theme.bar}`}
          />
        )}
        <span className="truncate">{item.label}</span>
      </NavLink>
    );
  };

  return (
    <div className="h-full flex flex-col overflow-visible bg-gradient-to-b from-[#f6f7f9] to-[#eef0f3] ">
      {/* Brand Header */}
      <div className="shrink-0 px-3 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <img
            src="/favicon.png"
            alt="Autonex"
            className="h-9 w-9 rounded-lg border border-slate-200 bg-white p-1 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-slate-900 truncate leading-tight">
              Autonex
            </p>
            <p className="text-[12px] text-slate-400 truncate leading-tight">
              {portalLabel}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 px-2.5 py-2 space-y-3 overflow-y-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div className="space-y-0.5">{navItems.map(renderItem)}</div>
      </nav>

      {/* Bottom Bar */}
      <div className="shrink-0 p-2.5 border-t border-slate-200 flex items-center justify-between gap-2">
        {/* Profile */}
        <div className="group relative">
          <NavLink
            to={`${prefix}/profile`}
            onClick={handleNavigate}
            title="Profile"
            className={`h-9 w-9 flex items-center justify-center overflow-hidden rounded-lg border transition-all ${
              isRowActive(`${prefix}/profile`)
                ? isPm
                  ? "border-blue-500 ring-2 ring-blue-500/20 bg-white shadow-sm"
                  : "border-emerald-500 ring-2 ring-emerald-500/20 bg-white shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <UserAvatar
              src={avatarUrl}
              name={displayName}
              size="sm"
              className="h-full w-full rounded-lg"
              fallbackClassName="rounded-lg border-0 bg-transparent text-slate-500 font-bold text-sm"
            />
          </NavLink>
          <div className="absolute bottom-full left-0 mb-2 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 shadow-xl">
            {account?.email || user?.email || ""} · {roleLabel(role)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onLogout}
            title="Sign Out"
            className={`${iconBtn} hover:text-red-600 hover:bg-red-50 `}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeSidebar;
