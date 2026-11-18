import React from "react";
import { ArrowUpRight, CalendarClock } from "lucide-react";

export default function PayrollWeeklyCompCard({
  totalEmployees = 0,
  payrollProcessed = 212,
  weeklyCompApproved = 301,
  weeklyCompTotal = 349,
  onNavigate,
  routePrefix = "/admin",
}) {
  const payrollTotal = totalEmployees || 378;
  const payrollPct = Math.min(100, Math.round((payrollProcessed / payrollTotal) * 100));
  const compPct = Math.min(100, Math.round((weeklyCompApproved / (weeklyCompTotal || 1)) * 100));

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white shadow-[0_1px_4px_rgba(28,25,23,0.06)] p-3.5 h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h4 className="text-[13px] font-semibold text-slate-900 leading-tight">
              Payroll & Comp
            </h4>
            <span className="truncate font-mono text-[11px] text-slate-400 leading-tight">
              / cycle
            </span>
          </div>

          <button
            type="button"
            onClick={() => onNavigate(`${routePrefix}/weekly-compensation`)}
            className="group inline-flex items-center gap-1 rounded-lg border border-blue-200/80 bg-blue-50/70 px-2 py-0.5 text-[11px] font-semibold text-blue-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-100/80 hover:text-blue-800 cursor-pointer"
          >
            <span>Details</span>
            <ArrowUpRight className="h-3 w-3 text-blue-500" />
          </button>
        </div>

        {/* Dual Progress Bars */}
        <div className="mt-3.5 space-y-2.5">
          {/* Payroll Processed */}
          <div>
            <div className="flex items-center justify-between text-[11.5px] mb-1">
              <span className="font-medium text-slate-700">Payroll processed</span>
              <span className="font-mono text-slate-500 font-semibold text-[11px]">
                {payrollProcessed} / {payrollTotal} ({payrollPct}%)
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${payrollPct}%` }}
              />
            </div>
          </div>

          {/* Weekly Comp Approved */}
          <div>
            <div className="flex items-center justify-between text-[11.5px] mb-1">
              <span className="font-medium text-slate-700">Weekly comp</span>
              <span className="font-mono text-slate-500 font-semibold text-[11px]">
                {weeklyCompApproved} / {weeklyCompTotal} ({compPct}%)
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${compPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Status */}
      <div className="pt-2 mt-2 border-t border-stone-100 flex items-center justify-between text-[10.5px]">
        <div className="flex items-center gap-1 text-amber-700 font-medium">
          <CalendarClock className="w-3 h-3 text-amber-600" />
          <span>Cut-off in 4 days</span>
        </div>

        <button
          type="button"
          onClick={() => onNavigate(`${routePrefix}/weekly-compensation`)}
          className="text-blue-600 font-semibold hover:underline"
        >
          Queue ›
        </button>
      </div>
    </div>
  );
}
