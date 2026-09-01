import { Link, useLocation } from "react-router-dom";
import {
  LogOut,
  ChevronDown,
  ArrowLeftRight,
  Settings,
} from "lucide-react";
import { hrNavigation } from "../config/hrNavigation";
import { useState } from "react";

const COMPANY_SETTINGS_HREF = "/admin/company-settings";

// Shared row classes — identical to AdminSidebar for visual consistency.
const rowBase =
  "flex items-center gap-2.5 w-full px-2.5 py-[9px] rounded-lg text-[13.5px] transition-all duration-150 group relative outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40";
const rowActive =
  "bg-white text-slate-900 font-semibold ring-1 ring-slate-200/60 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ";
const rowInactive =
  "text-slate-600 font-medium hover:text-slate-900 hover:bg-white/70 ";

const iconBtn =
  "w-9 h-9 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors";

const iconClass = (isActive) =>
  `w-[18px] h-[18px] shrink-0 transition-colors ${
    isActive ? "text-blue-600 " : "text-slate-500 group-hover:text-slate-800 "
  }`;

const HRSidebar = ({
  user = {},
  pendingCount = 0,
  pendingSignupCount = 0,
  onNavigate,
  onLogout,
}) => {
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
          strokeWidth={isActive ? 2.4 : 2}
        />
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full bg-blue-600 " />
        )}
        <span className="truncate">{item.name}</span>
        {item.href === "/hr/onboarding-pipeline" && pendingCount > 0 && (
          <span className="ml-auto inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full text-[10px] font-semibold shrink-0 bg-red-50 text-red-600 ">
            {pendingCount}
          </span>
        )}
        {item.href === "/hr/signup-requests" && pendingSignupCount > 0 && (
          <span className="ml-auto inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full text-[10px] font-semibold shrink-0 bg-blue-50 text-blue-600 ">
            {pendingSignupCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="h-full flex flex-col overflow-visible">
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
              HR Operations Center
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 px-2.5 space-y-3 overflow-y-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div className="space-y-0.5">{hrNavigation.map(renderItem)}</div>
      </nav>

      {/* Bottom Bar — profile · switch to admin · sign out */}
      <div className="shrink-0 p-2.5 border-t border-slate-200 flex items-center justify-between gap-2">
        {/* Profile */}
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
            {user.email || "HR Admin"} · HR Operations
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <Link
            to="/admin/dashboard"
            title="Switch to Admin Portal"
            className={iconBtn}
          >
            <ArrowLeftRight className="w-4 h-4" />
          </Link>
          <Link
            to={COMPANY_SETTINGS_HREF}
            title="Company Settings"
            className={`${iconBtn} ${isRowActive(COMPANY_SETTINGS_HREF) ? "text-blue-600 bg-white shadow-sm " : ""}`}
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

export default HRSidebar;
