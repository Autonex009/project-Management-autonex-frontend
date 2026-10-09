import React from "react";
import { AlertTriangle } from "lucide-react";
import { isIntern } from "../../utils/leaveTypes";

export default function OverLimitHoverCard({ leave, employeeType = "", className = "" }) {
  const remarkText = leave?.approval_remark;
  
  // Full-time employees have no monthly limit. 
  // The consecutive days rule is hard-blocked at submission, so they should never be "flagged".
  if (!isIntern(employeeType)) {
    return null;
  }

  return (
    <div className={`group relative inline-flex items-center ${className}`}>
      <span className="inline-flex items-center justify-center h-5 w-5 shrink-0 rounded-full bg-amber-100 text-amber-700 border border-amber-200 cursor-help transition-all hover:bg-amber-200 shadow-xs">
        <AlertTriangle className="w-3 h-3" />
      </span>

      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:flex flex-col z-50 p-2.5 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 min-w-[210px] max-w-[260px] pointer-events-none whitespace-normal transition-all animate-in fade-in duration-150">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Leave Flagged</span>
        </div>

        <p className="text-[11.5px] text-slate-500 mt-1 leading-snug">
          This leave request has been flagged by the system because it exceeds the allowed monthly limit.
        </p>

        {remarkText && (
          <div className="mt-2 pt-1.5 border-t border-slate-100 text-[11px] text-slate-600">
            <span className="font-semibold text-slate-700">Remark: </span>
            <span className="italic">{remarkText}</span>
          </div>
        )}

        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-white drop-shadow-xs" />
      </div>
    </div>
  );
}