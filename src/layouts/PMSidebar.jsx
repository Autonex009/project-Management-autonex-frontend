import { Link, useLocation } from "react-router-dom";
import {
  LogOut,
  ArrowLeftRight,
  User,
  ChevronDown,
} from "lucide-react";
import { getPmNavigationGroups } from "../config/pmNavigation";
import { useState } from "react";
import UserAvatar from "../components/ui/UserAvatar";

// Shared row classes (Linear style - smaller refined font, crisp padding, matching Admin)
const rowBase =
  "flex items-center gap-2.5 w-full px-2.5 py-[6.5px] rounded-lg text-[12.5px] transition-all duration-150 group relative outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 select-none";
const rowActive =
  "bg-white text-slate-900 font-semibold ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.05)] ";
const rowInactive =
  "text-slate-600 font-medium hover:text-slate-900 hover:bg-white/60 ";

// Compact action buttons used in the bottom bar
const iconBtn =
  "flex-1 h-7 flex items-center justify-center rounded-md border border-slate-200/80 bg-white/70 text-slate-500 hover:text-slate-900 hover:bg-white transition-all shadow-xs";

const iconClass = (isActive) =>
  `w-4 h-4 shrink-0 transition-colors ${
    isActive ? "text-blue-600 " : "text-slate-400 group-hover:text-slate-700 "
  }`;

const ROLE_LABELS = {
  admin: "Admin",
  hr: "HR",
  pm: "Project Manager",
  team_lead: "Team Lead",
  employee: "Employee",
};

export default function PMSidebar({
  user = {},
  account,
  role: roleProp,
  onNavigate,
  onLogout,
}) {
  const currentUser = account || user;
  const location = useLocation();

  const userEmail = (currentUser?.email || "").toLowerCase();
  const canManageCanteen = Boolean(
    currentUser?.can_manage_canteen_menu ||
    userEmail === "jadhavashish061@gmail.com"
  );

  const navigationGroups = getPmNavigationGroups({ canManageCanteen });

  // All groups default to expanded, like Linear / Admin sidebar
  const [openSections, setOpenSections] = useState({
    main: true,
    workforce: true,
    "performance-payroll": true,
    organization: true,
    onboarding: true,
  });

  const toggleSection = (id) =>
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleNavigate = () => onNavigate?.();

  const isRowActive = (href) =>
    location.pathname === href ||
    (href !== "/pm/dashboard" && location.pathname.startsWith(href + "/"));

  const userRole = currentUser?.role || roleProp || "pm";
  const displayRoleLabel =
    ROLE_LABELS[userRole] ||
    (userRole ? userRole.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Project Manager");

  const switchTarget =
    userRole === "admin"
      ? "/admin/dashboard"
      : userRole === "hr"
      ? "/hr/dashboard"
      : "/employee/dashboard";

  const switchTitle =
    userRole === "admin"
      ? "Switch to Admin"
      : userRole === "hr"
      ? "Switch to HR"
      : "Switch to Employee";

  const renderItem = (item) => {
    const isActive = isRowActive(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.name}
        to={item.href}
        onClick={handleNavigate}
        className={`${rowBase} ${isActive ? rowActive : rowInactive}`}
      >
        <Icon
          className={iconClass(isActive)}
          strokeWidth={isActive ? 2.2 : 1.75}
        />
        {isActive && (
          <span className="absolute left-1 top-1/2 -translate-y-1/2 h-3.5 w-[2.5px] rounded-full bg-blue-600" />
        )}
        <span className="truncate">{item.name}</span>
      </Link>
    );
  };

  const renderGroup = (group, index) => {
    const isOpen = openSections[group.id] ?? true;

    return (
      <div key={group.id} className="space-y-0.5">
        {index > 0 && (
          <div className="my-2 border-t border-slate-200/60 mx-1" />
        )}
        <button
          type="button"
          onClick={() => toggleSection(group.id)}
          className="w-full flex items-center justify-between gap-1.5 px-2.5 h-6 mb-0.5 rounded text-slate-400 hover:text-slate-600 transition-colors group select-none"
        >
          <span className="text-[11px] font-semibold text-slate-400 group-hover:text-slate-600 tracking-wide truncate">
            {group.title}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 ${
              isOpen ? "" : "-rotate-90"
            }`}
          />
        </button>
        {isOpen && (
          <div className="space-y-0.5">
            {group.items.map(renderItem)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col overflow-visible">
      {/* Brand Header — workspace-style pill (Linear / Admin style) */}
      <div className="shrink-0 p-2.5 pb-2">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-colors">
          <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center p-1 shrink-0 shadow-sm overflow-hidden">
            <img
              src="/favicon.png"
              alt="Autonex"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none mb-0.5 truncate">
              PM Portal
            </p>
            <p className="text-[13px] font-bold text-slate-900 truncate leading-tight">
              Autonex
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Groups (Linear style) */}
      <nav
        className="flex-1 px-2 py-1 space-y-1 overflow-y-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {navigationGroups.map((group, idx) => renderGroup(group, idx))}
      </nav>

      {/* Bottom Bar — User profile & Quick actions */}
      <div className="shrink-0 p-2 border-t border-slate-200/70 bg-[#f4f5f7]/60">
        {/* Profile Row */}
        <Link
          to="/pm/profile"
          onClick={handleNavigate}
          title="View Profile"
          className={`flex items-center gap-2.5 p-1.5 rounded-lg transition-all group ${
            isRowActive("/pm/profile")
              ? "bg-white ring-1 ring-slate-200/80 shadow-xs"
              : "hover:bg-white/70"
          }`}
        >
          <div className="relative shrink-0">
            <UserAvatar
              src={currentUser?.avatar_url}
              name={currentUser?.name || currentUser?.email || "PM"}
              size="sm"
              className="h-8 w-8 rounded-lg"
              fallbackClassName="rounded-lg border-0 bg-slate-200 text-slate-700 font-bold text-xs"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-slate-800 truncate leading-tight group-hover:text-blue-600 transition-colors">
              {currentUser?.name || currentUser?.email?.split("@")[0] || "PM"}
            </p>
            <p className="text-[10.5px] text-slate-400 truncate leading-tight">
              {displayRoleLabel}
            </p>
          </div>
        </Link>

        {/* Action Buttons: Switch portal, Profile, Sign Out */}
        <div className="flex items-center justify-between gap-1.5 mt-1.5 pt-1.5 border-t border-slate-200/50">
          <Link
            to={switchTarget}
            title={switchTitle}
            className={iconBtn}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/pm/profile"
            onClick={handleNavigate}
            title="My Profile"
            className={`${iconBtn} ${isRowActive("/pm/profile") ? "text-blue-600 bg-white shadow-xs " : ""}`}
          >
            <User className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={onLogout}
            title="Sign Out"
            className={`${iconBtn} hover:text-red-600 hover:bg-red-50 hover:border-red-200 `}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
