import React from "react";
import { Layers, ArrowUpRight, CheckCircle2, AlertCircle, Clock } from "lucide-react";

export default function AllocationsCard({
  statusData,
  totalEmployees = 375,
  onNavigate,
  routePrefix = "/admin",
}) {
  const full = statusData?.full?.length ?? 356;
  const partial = statusData?.partial?.length ?? 1;
  const leave = statusData?.unallocated?.length ?? 18;
  const total = full + partial + leave || totalEmployees || 375;

  const percent = Math.min(100, Math.round((full / total) * 100)) || 95;

  // Arc Gauge Geometry (viewBox: 0 0 130 68, center 65,60, radius 44)
  const radius = 44;
  const arcLen = Math.PI * radius; // ~138.23
  const strokeOffset = Math.max(0, arcLen - (percent / 100) * arcLen);

  const pAllocated = (full / total) * 100;
  const pIdle = (partial / total) * 100;
  const pLeave = (leave / total) * 100;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-3.5 shadow-[0_1px_3px_rgba(28,25,23,0.05)] h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-indigo-200/90 bg-indigo-50/80 text-indigo-600 shadow-2xs">
            <Layers className="h-3.5 w-3.5" />
          </span>
          <div>
            <h4 className="text-[13.5px] font-bold text-slate-900 leading-tight">
              Allocations
            </h4>
            <p className="font-mono text-[11px] text-slate-400 font-medium leading-tight">
              Utilisation · {total} staff
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate(`${routePrefix}/allocations`)}
          className="group inline-flex items-center gap-1 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
        >
          <span>Manage</span>
          <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-700" />
        </button>
      </div>

      {/* Compact Top Overview: Mini Gauge + Health Summary */}
      <div className="my-2 flex items-center justify-between gap-3 bg-slate-50/50 rounded-xl p-2.5 border border-slate-100">
        {/* Semi-Circle Arc Meter */}
        <div className="relative w-28 h-15 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 130 68" className="w-full h-full overflow-visible">
            {/* Background Track */}
            <path
              d="M 15 58 A 44 44 0 0 1 115 58"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="9"
              strokeLinecap="round"
            />
            {/* Orange Idle Accent on end */}
            <path
              d="M 15 58 A 44 44 0 0 1 115 58"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={arcLen}
              strokeDashoffset={Math.max(0, arcLen - ((percent + 1) / 100) * arcLen)}
            />
            {/* Blue Allocated Active Arc */}
            <path
              d="M 15 58 A 44 44 0 0 1 115 58"
              fill="none"
              stroke="#2563eb"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={arcLen}
              strokeDashoffset={strokeOffset}
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Centered Percentage */}
          <div className="absolute bottom-0 flex flex-col items-center text-center">
            <span className="text-xl font-bold font-mono tracking-tight text-slate-900 leading-none">
              {percent}%
            </span>
            <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
              utilised
            </span>
          </div>
        </div>

        {/* Health Indicators */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/90 bg-emerald-50/80 px-2 py-0.5 text-[9.5px] font-bold text-emerald-700">
              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
              <span>Optimal</span>
            </span>
            <span className="font-mono text-[10.5px] text-slate-400">
              Target: <strong className="text-slate-600 font-semibold">90%</strong>
            </span>
          </div>

          <p className="text-[11px] text-slate-600 leading-tight">
            <strong className="text-emerald-600 font-semibold">+5.0%</strong> above target efficiency.
          </p>

          {/* Segmented Micro Track */}
          <div className="h-1.5 w-full rounded-full overflow-hidden flex bg-slate-100 mt-1">
            <div style={{ width: `${pAllocated}%` }} className="bg-blue-600 h-full" />
            <div style={{ width: `${Math.max(2, pIdle)}%` }} className="bg-amber-500 h-full" />
            <div style={{ width: `${pLeave}%` }} className="bg-slate-400 h-full" />
          </div>
        </div>
      </div>

      {/* Breakdown Rows with Horizontal Dividers */}
      <div className="divide-y divide-slate-100 text-[11.5px]">
        {/* Allocated Row */}
        <div className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
            <div>
              <span className="font-semibold text-slate-800 leading-tight block">
                Allocated
              </span>
              <span className="text-[10px] text-slate-400 leading-tight block">
                Active on live projects
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono font-bold text-slate-900 tabular-nums">
              {full}
            </span>
            <span className="font-mono text-[10px] text-slate-400 ml-1">
              ({pAllocated.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Idle Row */}
        <div className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
            <div>
              <span className="font-semibold text-slate-800 leading-tight block">
                Idle / Bench
              </span>
              <span className="text-[10px] text-amber-600 font-medium leading-tight block">
                Ready for assignment
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono font-bold text-amber-700 tabular-nums">
              {partial}
            </span>
            <span className="font-mono text-[10px] text-slate-400 ml-1">
              ({pIdle.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* On Leave Row */}
        <div className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" />
            <div>
              <span className="font-semibold text-slate-800 leading-tight block">
                On Leave / WFH
              </span>
              <span className="text-[10px] text-slate-400 leading-tight block">
                Approved absence
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono font-bold text-slate-700 tabular-nums">
              {leave}
            </span>
            <span className="font-mono text-[10px] text-slate-400 ml-1">
              ({pLeave.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Footer Insight */}
      <div className="mt-1 pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-400">
        <span className="font-mono">Deployment: 99.7%</span>
        <span className="text-slate-500 font-medium">1 bench capacity open</span>
      </div>
    </div>
  );
}
