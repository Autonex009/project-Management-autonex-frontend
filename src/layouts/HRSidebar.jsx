import { Link, useLocation } from "react-router-dom";
import {
  LogOut,
  ArrowLeftRight,
  Settings,
} from "lucide-react";
import { hrNavigation } from "../config/hrNavigation";
import UserAvatar from "../components/ui/UserAvatar";

const COMPANY_SETTINGS_HREF = "/admin/company-settings";

// Shared row classes — identical to AdminSidebar for visual consistency.
const rowBase =
  "flex items-center gap-2.5 w-full px-2.5 py-[6.5px] rounded-lg text-[12.5px] transition-all duration-150 group relative outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 select-none";
const rowActive =
  "bg-white text-slate-900 font-semibold ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.05)] ";
const rowInactive =
  "text-slate-600 font-medium hover:text-slate-900 hover:bg-white/60 ";

const iconBtn =
  "flex-1 h-7 flex items-center justify-center rounded-md border border-slate-200/80 bg-white/70 text-slate-500 hover:text-slate-900 hover:bg-white transition-all shadow-xs";

const iconClass = (isActive) =>
  `w-4 h-4 shrink-0 transition-colors ${
    isActive ? "text-blue-600 " : "text-slate-400 group-hover:text-slate-700 "
  }`;

const HRSidebar = ({
  user = {},
  account,
  pendingCount = 0,
  pendingSignupCount = 0,
  onNavigate,
  onLogout,
}) => {
  const currentUser = account || user;
  const location = useLocation();
  const handleNavigate = () => onNavigate?.();

  const isRowActive = (href) =>
    location.pathname === href ||
    (href !== "/hr/dashboard" && location.pathname.startsWith(href + "/"));

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
          <span className="absolute left-1 top-1/2 -translate-y-1/2 h-3.5 w-[2.5px] rounded-full bg-blue-600 " />
        )}
        <span className="truncate">{item.name}</span>
        {item.href === "/hr/onboarding-pipeline" && pendingCount > 0 && (
          <span className="ml-auto inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-full text-[10px] font-bold shrink-0 bg-red-50 text-red-600 border border-red-200/60 shadow-xs">
            {pendingCount}
          </span>
        )}
        {item.href === "/hr/signup-requests" && pendingSignupCount > 0 && (
          <span className="ml-auto inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-full text-[10px] font-bold shrink-0 bg-blue-50 text-blue-600 border border-blue-200/60 shadow-xs">
            {pendingSignupCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="h-full flex flex-col overflow-visible">
      {/* Brand Header — workspace-style pill */}
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
              HR Operations
            </p>
            <p className="text-[13px] font-bold text-slate-900 truncate leading-tight">
              Autonex
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 tracking-wide">
          HR Menu
        </div>
        {hrNavigation.map(renderItem)}
      </nav>

      {/* Bottom Bar — profile · switch to admin · sign out */}
      <div className="shrink-0 p-2 border-t border-slate-200/70 bg-[#f4f5f7]/60">
        {/* Profile */}
        <Link
          to="/hr/profile"
          onClick={handleNavigate}
          title="Profile"
          className={`flex items-center gap-2.5 p-1.5 rounded-lg transition-all group ${
            isRowActive("/hr/profile")
              ? "bg-white ring-1 ring-slate-200/80 shadow-xs"
              : "hover:bg-white/70"
          }`}
        >
          <div className="relative shrink-0">
            <UserAvatar
              src={currentUser?.avatar_url}
              name={currentUser?.name || currentUser?.email || "HR Admin"}
              size="sm"
              className="h-8 w-8 rounded-lg"
              fallbackClassName="rounded-lg border-0 bg-slate-200 text-slate-700 font-bold text-xs"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-slate-800 truncate leading-tight group-hover:text-blue-600 transition-colors">
              {currentUser?.name || currentUser?.email?.split("@")[0] || "HR Admin"}
            </p>
            <p className="text-[10.5px] text-slate-400 truncate leading-tight">
              HR Operations
            </p>
          </div>
        </Link>

        {/* Actions */}
        <div className="flex items-center justify-between gap-1.5 mt-1.5 pt-1.5 border-t border-slate-200/50">
          <Link
            to="/admin/dashboard"
            title="Switch to Admin Portal"
            className={iconBtn}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to={COMPANY_SETTINGS_HREF}
            title="Company Settings"
            className={`${iconBtn} ${isRowActive(COMPANY_SETTINGS_HREF) ? "text-blue-600 bg-white shadow-xs " : ""}`}
          >
            <Settings className="w-3.5 h-3.5" />
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
};

export default HRSidebar;
