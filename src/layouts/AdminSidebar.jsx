import { Link, useLocation } from "react-router-dom";
import {
  LogOut,
  GraduationCap,
  FileSpreadsheet,
  Sparkles,
  Settings,
  ChevronDown,
} from "lucide-react";
import { navigation } from "../config/navigation";
import { useState } from "react";

const onboardingNavigation = [
  { name: "Training Modules", href: "/admin/modules", icon: GraduationCap },
  { name: "Newly Onboarded", href: "/admin/newly-onboarded", icon: Sparkles },
  {
    name: "Progress Reports",
    href: "/admin/onboarding-reports",
    icon: FileSpreadsheet,
  },
];

const COMPANY_SETTINGS_HREF = "/admin/company-settings";

// Shared row classes (light base). Kept in one place so both
// nav sections stay identical and future tweaks touch one spot.
const rowBase =
  "flex items-center gap-2.5 w-full px-2.5 py-[9px] rounded-lg text-[13.5px] transition-all duration-150 group relative outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40";
const rowActive =
  "bg-white text-slate-900 font-semibold ring-1 ring-slate-200/60 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ";
const rowInactive =
  "text-slate-600 font-medium hover:text-slate-900 hover:bg-white/70 ";

// Compact icon button used in the bottom bar.
const iconBtn =
  "w-9 h-9 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors";

const iconClass = (isActive) =>
  `w-[18px] h-[18px] shrink-0 transition-colors ${
    isActive ? "text-blue-600 " : "text-slate-500 group-hover:text-slate-800 "
  }`;

const AdminSidebar = ({
  user = {},
  pendingSignupCount = 0,
  onNavigate,
  onLogout,
}) => {
  const location = useLocation();
  const [openSections, setOpenSections] = useState({
    platform: true,
    onboarding: true,
  });
  const toggleSection = (id) =>
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  const handleNavigate = () => onNavigate?.();

  const isRowActive = (href) =>
    location.pathname === href ||
    (href !== "/admin/dashboard" && location.pathname.startsWith(href + "/"));

  // Company Settings moves to the bottom bar, so drop it from the main list.
  const platformItems = navigation.filter(
    (item) => item.href !== COMPANY_SETTINGS_HREF,
  );

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
          strokeWidth={isActive ? 2.4 : 2}
        />
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full bg-blue-600 " />
        )}
        <span className="truncate">{item.name}</span>
        {item.href === "/admin/signup-requests" && pendingSignupCount > 0 && (
          <span className="ml-auto inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full text-[10px] font-semibold shrink-0 bg-blue-50 text-blue-600 ">
            {pendingSignupCount}
          </span>
        )}
      </Link>
    );
  };

  const renderSection = (id, label, items) => (
    <div>
      <button
        type="button"
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between gap-2 px-2.5 h-6 mb-1 rounded-md text-slate-400 hover:text-slate-600 transition-colors group"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] truncate">
          {label}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 ${openSections[id] ? "" : "-rotate-90"}`}
        />
      </button>
      {openSections[id] && (
        <div className="space-y-0.5">{items.map(renderItem)}</div>
      )}
    </div>
  );

  const companySettingsActive = isRowActive(COMPANY_SETTINGS_HREF);

  return (
    <div className="h-full flex flex-col overflow-visible">
      {/* Brand Header — compact workspace-style row (Linear) */}
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
              Admin Control Center
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 px-2.5 space-y-3 overflow-y-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div className="space-y-0.5">{platformItems.map(renderItem)}</div>
        {renderSection("onboarding", "Onboarding Portal", onboardingNavigation)}
      </nav>

      {/* Bottom Bar — profile · settings · sign out */}
      <div className="shrink-0 p-2.5 border-t border-slate-200 flex items-center justify-between gap-2">
        {/* Profile (hover shows email) */}
        <div className="group relative">
          <button
            type="button"
            className="h-9 w-9 flex items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white "
          >
            <img
              src="/favicon.png"
              alt="Autonex"
              className="h-full w-full object-contain p-1"
            />
          </button>
          <div className="absolute bottom-full left-0 mb-2 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 shadow-xl">
            {user.email || "Admin"} · Super Admin
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <Link
            to={COMPANY_SETTINGS_HREF}
            onClick={handleNavigate}
            title="Company Settings"
            className={`${iconBtn} ${companySettingsActive ? "text-blue-600 bg-white shadow-sm " : ""}`}
          >
            <Settings className="w-4 h-4" />
          </Link>
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

export default AdminSidebar;
