import React from "react";
import { UserPlus, ArrowUpRight } from "lucide-react";

export default function SignupRequestsWidget({
  pendingCount = 0,
  recentRequests = [],
  onNavigate,
  routePrefix = "/admin",
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_1px_4px_rgba(28,25,23,0.06)] p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xs">
            <UserPlus className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold text-slate-900 leading-tight">
              Signup requests
            </h3>
            <p className="truncate font-mono text-[11px] text-slate-400 leading-tight">
              / {pendingCount} pending
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate(`${routePrefix}/signup-requests`)}
          className="group inline-flex items-center gap-1 rounded-lg border border-blue-200/80 bg-blue-50/70 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-100/80 hover:text-blue-800 cursor-pointer"
        >
          <span>Open</span>
          <ArrowUpRight className="h-3 w-3 text-blue-500" />
        </button>
      </div>

      <div className="mt-3">
        {pendingCount === 0 ? (
          <div className="flex items-center justify-center gap-1.5 py-2.5 text-center text-[11.5px] font-medium text-slate-500 bg-slate-50/70 rounded-lg border border-stone-200/60">
            <span>All caught up 🎉</span>
          </div>
        ) : (
          <div className="space-y-1">
            {recentRequests.slice(0, 2).map((req, idx) => (
              <div
                key={req.id ?? idx}
                onClick={() => onNavigate(`${routePrefix}/signup-requests`)}
                className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer text-[12px]"
              >
                <span className="font-medium text-slate-800 truncate">
                  {req.email || req.name}
                </span>
                <span className="text-[10px] font-semibold text-blue-600">Review</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
