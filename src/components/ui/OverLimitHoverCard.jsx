import React from "react";
import { AlertTriangle, MessageSquare } from "lucide-react";
import { getLeaveOverLimitInfo } from "../../utils/leaveTypes";

export default function OverLimitHoverCard({ leave, allLeaves = [], className = "" }) {
  const { overDaysText, totalMonthDays, limit } = getLeaveOverLimitInfo(leave, allLeaves);
  const remarkText = leave?.approval_remark || leave?.reason || leave?.remarks;

  return (
    <div className={`group relative inline-flex items-center ${className}`}>
      {/* Icon Badge - Suppressed native title attribute */}
      <span className="inline-flex items-center justify-center h-5 w-5 shrink-0 rounded-full bg-orange-100 text-orange-600 border border-orange-200 cursor-help transition-all hover:bg-orange-200 shadow-xs">
        <AlertTriangle className="w-3 h-3" />
      </span>

      {/* Custom White Hover Card Popover */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:flex flex-col z-50 p-3 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200/90 min-w-[220px] max-w-[280px] pointer-events-none whitespace-normal transition-all animate-in fade-in duration-150">
        <div className="flex items-center gap-1.5 text-xs font-bold text-orange-700 bg-orange-50/80 px-2 py-1 rounded-md border border-orange-200/80">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-orange-600" />
          <span>Exceeds Monthly Leave Limit</span>
        </div>

        <div className="text-[12.5px] font-semibold text-slate-700 mt-2">
          Over limit by <span className="text-orange-600 font-bold">{overDaysText}</span>
        </div>

        <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
          Total month leaves: <strong className="text-slate-700">{totalMonthDays}d</strong> (Allowed: {limit}d)
        </div>

        {/* Remark section inside hovercard only */}
        {remarkText && (
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] flex items-start gap-1.5 text-slate-700 bg-slate-50/90 p-2 rounded-lg border border-slate-100">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-slate-500 font-bold">Remark: </span>
              <span className="text-slate-800 italic font-medium">{remarkText}</span>
            </div>
          </div>
        )}

        {/* Tooltip White Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-white drop-shadow-xs" />
      </div>
    </div>
  );
}
