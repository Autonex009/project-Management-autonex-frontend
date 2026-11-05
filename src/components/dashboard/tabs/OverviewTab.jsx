import React, { useState } from "react";
import { Utensils } from "lucide-react";

export default function OverviewTab({ data, loading }) {
  const [hoveredKey, setHoveredKey] = useState(null);

  if (loading && !data) {
    return (
      <div className="h-56 flex flex-col items-center justify-center space-y-2">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-[11px] text-slate-400 font-medium">Loading summary...</span>
      </div>
    );
  }

  const attendance = data?.attendance || {
    effective_percentage: 0,
    checked_in: 0,
    expected: 0,
    active: 0,
    on_leave: 0,
    yet_to_check_in: 0,
  };

  const floor = data?.floor_breakdown || {
    floor_7: 0,
    floor_9: 0,
    floor_15: 0,
    floor_17: 0,
    wfh: 0,
  };

  const averages = data?.averages || {
    target_time: "09:30",
    overall: { time: "—" },
    wfo: { count: 0, time: "—" },
    wfh: { count: 0, time: "—" },
  };

  const mood = data?.mood_pulse || {
    total: 0,
    great: 0,
    okay: 0,
    low: 0,
    stressed: 0,
    canteen: 0,
    tiffins: 0,
  };

  const pct = Math.min(100, Math.max(0, attendance.effective_percentage || 0));

  // Multi-segmented Donut Chart (Floor-wise, WFH, Leave, Pending divisions)
  const totalEmployees = attendance.active || (
    (floor.floor_7 || 0) + (floor.floor_9 || 0) + (floor.floor_15 || 0) + (floor.floor_17 || 0) +
    (floor.wfh || 0) + (attendance.on_leave || 0) + (attendance.yet_to_check_in || 0)
  ) || 1;

  const rawSegments = [
    { key: "f7", label: "Floor 7", shortLabel: "F7", count: floor.floor_7 || 0, color: "#4f46e5" },     // Indigo
    { key: "f9", label: "Floor 9", shortLabel: "F9", count: floor.floor_9 || 0, color: "#06b6d4" },     // Cyan
    { key: "f15", label: "Floor 15", shortLabel: "F15", count: floor.floor_15 || 0, color: "#10b981" },  // Emerald
    { key: "f17", label: "Floor 17", shortLabel: "F17", count: floor.floor_17 || 0, color: "#ec4899" },  // Pink
    { key: "wfh", label: "WFH", shortLabel: "WFH", count: floor.wfh || 0, color: "#f59e0b" },             // Amber
    { key: "leave", label: "On Leave", shortLabel: "Leave", count: attendance.on_leave || 0, color: "#8b5cf6" }, // Purple
    { key: "pending", label: "Pending", shortLabel: "Pending", count: attendance.yet_to_check_in || 0, color: "#e2e8f0" }, // Light grey
  ].filter((s) => s.count > 0);

  const activeHoveredSeg = rawSegments.find((s) => s.key === hoveredKey);

  const radius = 30;
  const circumference = 2 * Math.PI * radius; // ~188.4955

  let accumulatedOffset = 0;
  const renderedSegments = rawSegments.map((seg) => {
    const rawLen = (seg.count / totalEmployees) * circumference;
    const gap = rawSegments.length > 1 ? Math.min(2.0, rawLen * 0.25) : 0;
    const strokeLen = Math.max(0.8, rawLen - gap);
    const strokeOffset = -accumulatedOffset;
    accumulatedOffset += rawLen;
    return {
      ...seg,
      strokeLen,
      strokeOffset,
    };
  });

  // Mood percentages for segmented progress bar
  const moodTotal = mood.total || (mood.great + mood.okay + mood.low + mood.stressed) || 1;
  const pGreat = (mood.great / moodTotal) * 100;
  const pOkay = (mood.okay / moodTotal) * 100;
  const pLow = (mood.low / moodTotal) * 100;
  const pStressed = (mood.stressed / moodTotal) * 100;

  return (
    <div className="space-y-2.5 text-slate-800">
      {/* Inset Hero Block with crisp border matching Encord Platform Hours */}
      <div className="rounded-xl border border-stone-200/80 bg-white p-3 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          {/* Left + Center metric group */}
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            {/* Interactive Donut ring (Hoverable with dynamic center display) */}
            <div
              className="relative w-16 h-16 shrink-0 flex items-center justify-center cursor-pointer select-none"
              onMouseLeave={() => setHoveredKey(null)}
            >
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 80 80">
                {/* Fallback track */}
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  className="text-slate-100"
                  strokeWidth="7"
                  stroke="currentColor"
                  fill="transparent"
                />
                {/* Interactive Segmented Slices */}
                {renderedSegments.map((seg) => {
                  const isHovered = hoveredKey === seg.key;
                  return (
                    <circle
                      key={seg.key}
                      cx="40"
                      cy="40"
                      r={radius}
                      stroke={seg.color}
                      strokeWidth={isHovered ? "9" : "7"}
                      strokeDasharray={`${seg.strokeLen} ${circumference - seg.strokeLen}`}
                      strokeDashoffset={seg.strokeOffset}
                      strokeLinecap="butt"
                      fill="transparent"
                      onMouseEnter={() => setHoveredKey(seg.key)}
                      className="transition-all duration-200 ease-out cursor-pointer"
                      style={{
                        opacity: hoveredKey && !isHovered ? 0.6 : 1,
                      }}
                    >
                      <title>{`${seg.label}: ${seg.count} (${Math.round((seg.count / totalEmployees) * 100)}%)`}</title>
                    </circle>
                  );
                })}
              </svg>

              {/* Dynamic Center Metric: Shows hovered segment details or overall % */}
              <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none transition-all duration-200">
                {activeHoveredSeg ? (
                  <>
                    <span className="font-extrabold text-[12px] text-slate-900 leading-tight">
                      {activeHoveredSeg.count}
                    </span>
                    <span className="font-bold text-[8.5px] uppercase tracking-wider text-slate-500 leading-tight">
                      {activeHoveredSeg.shortLabel}
                    </span>
                  </>
                ) : (
                  <span className="font-bold text-[11px] text-slate-800 transition-all duration-200">
                    {pct}%
                  </span>
                )}
              </div>
            </div>

            {/* 308 / 362 Main Hero Metric & Status Badges */}
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  {attendance.checked_in}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  / {attendance.active}
                </span>
                <span className="text-[11px] text-slate-500 font-medium ml-1">
                  checked in
                </span>
              </div>

              {/* Leave & Pending indicators */}
              <div className="flex items-center gap-1.5 pt-1 text-[11px] font-medium">
                {/* On Leave badge with rich hover breakdown popover */}
                <div className="relative group/leave inline-block">
                  <span
                    onMouseEnter={() => setHoveredKey("leave")}
                    onMouseLeave={() => setHoveredKey(null)}
                    className={`inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 font-semibold text-[10px] cursor-pointer transition-all ${
                      hoveredKey === "leave" ? "ring-1 ring-amber-400 bg-amber-100/70" : ""
                    }`}
                  >
                    {attendance.on_leave || 10} on leave
                  </span>

                  {/* Rich hover breakdown popover */}
                  <div className="absolute left-0 top-full mt-1.5 z-50 hidden group-hover/leave:flex flex-col gap-1.5 w-60 rounded-xl border border-stone-200 bg-white p-2.5 shadow-xl pointer-events-none transition-all text-left">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-stone-100 pb-1 flex justify-between items-center">
                      <span>Leave Details</span>
                      <span className="font-bold text-amber-700">{attendance.leave_breakdown?.total ?? attendance.on_leave ?? 10} Total</span>
                    </div>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Pending
                        </span>
                        <span className="font-bold text-slate-900 font-mono">
                          {attendance.leave_breakdown?.pending ?? 5} pending
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Approved
                        </span>
                        <span className="font-bold text-slate-900 font-mono">
                          {attendance.leave_breakdown?.approved ?? 5} approved
                        </span>
                      </div>
                      <div className="border-t border-stone-100 pt-1">
                        <div className="flex items-center justify-between text-indigo-700">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                            Approved & Checked In
                          </span>
                          <span className="font-bold font-mono">
                            {attendance.leave_breakdown?.approved_checked_in ?? 1}
                          </span>
                        </div>
                        {attendance.leave_breakdown?.approved_checked_in_names?.length > 0 && (
                          <div className="text-[10px] text-slate-500 mt-0.5 truncate pl-3">
                            ({attendance.leave_breakdown.approved_checked_in_names.join(", ")})
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <span
                  onMouseEnter={() => setHoveredKey("pending")}
                  onMouseLeave={() => setHoveredKey(null)}
                  className={`inline-flex items-center gap-1 text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/60 font-semibold text-[10px] cursor-pointer transition-all ${
                    hoveredKey === "pending" ? "ring-1 ring-rose-400 bg-rose-100/70" : ""
                  }`}
                >
                  {attendance.yet_to_check_in} pending
                </span>
              </div>
            </div>
          </div>

          {/* Avg Check-in Box (in front of main metric, with hover popover details) */}
          <div className="relative group shrink-0">
            <div className="rounded-xl border border-stone-200/90 bg-white hover:bg-stone-50/80 px-2.5 py-1.5 transition-all cursor-pointer shadow-2xs text-left">
              <div className="text-[9px] font-mono uppercase tracking-wider text-slate-400 leading-tight">
                Avg Check-In
              </div>
              <div className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                Overall
              </div>
              <div className="text-base font-bold text-slate-900 tracking-tight font-mono leading-tight mt-0.5">
                {averages.overall.time}
              </div>
            </div>

            {/* Hover details popover matching user screenshot exactly */}
            <div className="absolute right-0 top-full mt-1.5 z-50 hidden group-hover:flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-3 shadow-xl pointer-events-none transition-all min-w-[285px]">
              <div className="text-[9.5px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                AVG CHECK-IN
              </div>
              <div className="grid grid-cols-3 divide-x divide-stone-100 pt-0.5">
                <div className="pr-2.5">
                  <div className="text-[11px] text-slate-500 font-medium">Overall</div>
                  <div className="text-base font-bold text-slate-900 tracking-tight mt-0.5 font-mono">
                    {averages.overall.time}
                  </div>
                </div>
                <div className="px-2.5">
                  <div className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                    WFO · {averages.wfo.count ?? (floor.floor_7 + floor.floor_9 + floor.floor_15 + floor.floor_17)}
                  </div>
                  <div className="text-base font-bold text-slate-900 tracking-tight mt-0.5 font-mono">
                    {averages.wfo.time}
                  </div>
                </div>
                <div className="pl-2.5">
                  <div className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                    WFH · {averages.wfh.count ?? floor.wfh}
                  </div>
                  <div className="text-base font-bold text-slate-900 tracking-tight mt-0.5 font-mono">
                    {averages.wfh.time}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floor breakdown chips (interactive on hover, sync with donut slices) */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 pt-2 border-t border-stone-100 text-[11px] font-medium text-slate-600">
          <span
            onMouseEnter={() => setHoveredKey("f7")}
            onMouseLeave={() => setHoveredKey(null)}
            className={`inline-flex items-center gap-1 cursor-pointer transition-all rounded px-1 -mx-1 ${
              hoveredKey === "f7" ? "bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200" : ""
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            F7 <span className="font-bold text-slate-900">{floor.floor_7}</span>
          </span>
          <span
            onMouseEnter={() => setHoveredKey("f9")}
            onMouseLeave={() => setHoveredKey(null)}
            className={`inline-flex items-center gap-1 cursor-pointer transition-all rounded px-1 -mx-1 ${
              hoveredKey === "f9" ? "bg-cyan-50 text-cyan-900 ring-1 ring-cyan-200" : ""
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
            F9 <span className="font-bold text-slate-900">{floor.floor_9}</span>
          </span>
          <span
            onMouseEnter={() => setHoveredKey("f15")}
            onMouseLeave={() => setHoveredKey(null)}
            className={`inline-flex items-center gap-1 cursor-pointer transition-all rounded px-1 -mx-1 ${
              hoveredKey === "f15" ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200" : ""
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            F15 <span className="font-bold text-slate-900">{floor.floor_15}</span>
          </span>
          <span
            onMouseEnter={() => setHoveredKey("f17")}
            onMouseLeave={() => setHoveredKey(null)}
            className={`inline-flex items-center gap-1 cursor-pointer transition-all rounded px-1 -mx-1 ${
              hoveredKey === "f17" ? "bg-pink-50 text-pink-900 ring-1 ring-pink-200" : ""
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
            F17 <span className="font-bold text-slate-900">{floor.floor_17}</span>
          </span>
          <span
            onMouseEnter={() => setHoveredKey("wfh")}
            onMouseLeave={() => setHoveredKey(null)}
            className={`inline-flex items-center gap-1 cursor-pointer transition-all rounded px-1 -mx-1 ${
              hoveredKey === "wfh" ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200" : ""
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            WFH <span className="font-bold text-slate-900">{floor.wfh}</span>
          </span>
        </div>
      </div>

      {/* Mood Pulse & Canteen */}
      <div className="space-y-1 pt-0.5">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400">
          <span>Mood Pulse</span>
          <span>{mood.total} Responses</span>
        </div>

        {/* Multi-segmented Progress Bar */}
        <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-slate-100">
          <div style={{ width: `${pGreat}%` }} className="bg-emerald-500 h-full" />
          <div style={{ width: `${pOkay}%` }} className="bg-indigo-600 h-full" />
          <div style={{ width: `${pLow}%` }} className="bg-amber-500 h-full" />
          <div style={{ width: `${pStressed}%` }} className="bg-rose-500 h-full" />
        </div>

        {/* Legend with Canteen count using React Icon */}
        <div className="flex items-center justify-between text-[11px] font-medium pt-0.5 text-slate-600">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Great {mood.great}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> Okay {mood.okay}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Low {mood.low}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Stressed {mood.stressed}
            </span>
          </div>

          <div className="inline-flex items-center gap-1 font-semibold text-slate-800 text-[11px]">
            <Utensils className="w-3.5 h-3.5 text-slate-500" /> {mood.canteen ?? 0} canteen
          </div>
        </div>
      </div>
    </div>
  );
}
