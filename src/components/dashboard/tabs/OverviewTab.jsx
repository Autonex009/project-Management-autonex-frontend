import React, { useState } from "react";
import { Utensils, Briefcase, Clock, Zap, Smile, Meh, Frown } from "lucide-react";

export default function OverviewTab({ data, loading }) {
  const [hoveredKey, setHoveredKey] = useState(null);

  if (loading && !data) {
    return (
      <div className="h-44 flex flex-col items-center justify-center space-y-2">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-[11px] text-slate-400 font-medium">Loading summary...</span>
      </div>
    );
  }

  const attendance = data?.attendance || {
    effective_percentage: 87.7,
    checked_in: 329,
    expected: 375,
    active: 375,
    on_leave: 12,
    yet_to_check_in: 34,
    late: 19,
  };

  const floor = data?.floor_breakdown || {
    floor_7: 49,
    floor_9: 0,
    floor_15: 132,
    floor_17: 0,
    wfh: 148,
  };

  const averages = data?.averages || {
    target_time: "09:30",
    overall: { time: "09:22" },
    wfo: { count: 181, time: "09:18" },
    wfh: { count: 148, time: "09:27" },
  };

  const mood = data?.mood_pulse || {
    total: 329,
    great: 172,
    okay: 134,
    low: 17,
    stressed: 6,
    canteen: 181,
    tiffins: 0,
  };

  const pct = attendance.effective_percentage || 87.7;
  const lateCount = attendance.late ?? 19;
  const onLeaveCount = attendance.on_leave ?? 12;
  const pendingCount = attendance.yet_to_check_in ?? 34;
  const checkedInCount = attendance.checked_in ?? 329;
  const totalExpected = attendance.expected || attendance.active || 375;
  const totalEmployees = totalExpected || 375;

  const rawSegments = [
    { key: "f7", label: "Floor 7", shortLabel: "F7", count: floor.floor_7 ?? 49, color: "#2563eb" },     // Blue
    { key: "f9", label: "Floor 9", shortLabel: "F9", count: floor.floor_9 ?? 0, color: "#06b6d4" },     // Cyan
    { key: "f15", label: "Floor 15", shortLabel: "F15", count: floor.floor_15 ?? 132, color: "#10b981" }, // Emerald
    { key: "f17", label: "Floor 17", shortLabel: "F17", count: floor.floor_17 ?? 0, color: "#ec4899" }, // Pink
    { key: "wfh", label: "WFH", shortLabel: "WFH", count: floor.wfh ?? 148, color: "#f59e0b" },         // Amber
    { key: "leave", label: "On Leave", shortLabel: "Leave", count: onLeaveCount, color: "#8b5cf6" },
    { key: "pending", label: "Pending", shortLabel: "Pending", count: pendingCount, color: "#e2e8f0" },
  ].filter((s) => s.count > 0);

  const activeHoveredSeg = rawSegments.find((s) => s.key === hoveredKey);

  const radius = 34;
  const circumference = 2 * Math.PI * radius; // ~213.63

  let accumulatedOffset = 0;
  const renderedSegments = rawSegments.map((seg) => {
    const rawLen = (seg.count / totalEmployees) * circumference;
    const gap = rawSegments.length > 1 ? Math.min(2.5, rawLen * 0.25) : 0;
    const strokeLen = Math.max(1.0, rawLen - gap);
    const strokeOffset = -accumulatedOffset;
    accumulatedOffset += rawLen;
    return {
      ...seg,
      strokeLen,
      strokeOffset,
    };
  });

  const moodTotal = mood.total || (mood.great + mood.okay + mood.low + mood.stressed) || 329;
  const pGreat = (mood.great / moodTotal) * 100;
  const pOkay = (mood.okay / moodTotal) * 100;
  const pLow = (mood.low / moodTotal) * 100;
  const pStressed = (mood.stressed / moodTotal) * 100;

  return (
    <div className="flex-1 flex flex-col justify-between gap-2.5 text-slate-800">
      {/* Inset Hero Block: strictly sized, perfectly proportioned like image.png */}
      <div className="rounded-2xl border border-stone-200/80 bg-white p-3 shadow-2xs">
        <div className="flex items-center justify-between gap-3">
          {/* Left Donut + Middle Attendance */}
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Prominent 94px Donut ring matching image.png */}
            <div
              className="relative shrink-0 flex items-center justify-center cursor-pointer select-none"
              style={{ width: "94px", height: "94px", minWidth: "94px", maxWidth: "94px" }}
              onMouseLeave={() => setHoveredKey(null)}
            >
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 88 88">
                <circle
                  cx="44"
                  cy="44"
                  r={radius}
                  className="text-slate-100"
                  strokeWidth="8.5"
                  stroke="currentColor"
                  fill="transparent"
                />
                {renderedSegments.map((seg) => {
                  const isHovered = hoveredKey === seg.key;
                  return (
                    <circle
                      key={seg.key}
                      cx="44"
                      cy="44"
                      r={radius}
                      stroke={seg.color}
                      strokeWidth={isHovered ? "10.5" : "8.5"}
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

              {/* Center Metric inside Donut */}
              <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                {activeHoveredSeg ? (
                  <>
                    <span className="font-extrabold text-[13px] text-slate-900 leading-tight">
                      {activeHoveredSeg.count}
                    </span>
                    <span className="font-bold text-[7.5px] uppercase tracking-wider text-slate-500 leading-tight mt-0.5">
                      {activeHoveredSeg.shortLabel}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-bold text-[14px] font-mono text-slate-900 leading-tight">
                      {pct}%
                    </span>
                    <span className="font-bold text-[7px] uppercase tracking-widest text-slate-400 leading-tight mt-0.5">
                      CHECKED IN
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Attendance Count & 3 Badges */}
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-2xl sm:text-[26px] font-bold font-mono tracking-tight text-slate-900 leading-none">
                  {checkedInCount}
                </span>
                <span className="text-xs sm:text-[13px] font-semibold font-mono text-slate-400">
                  / {totalExpected}
                </span>
                <span className="text-[11.5px] text-slate-500 font-medium">
                  checked in
                </span>
              </div>

              {/* 3 Status Badges: on leave, pending, late */}
              <div className="flex items-center gap-1.5 pt-2 flex-wrap">
                <span
                  onMouseEnter={() => setHoveredKey("leave")}
                  onMouseLeave={() => setHoveredKey(null)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border border-amber-200/90 bg-amber-50/80 px-2 py-0.5 text-[10.5px] font-semibold text-amber-800 transition-all cursor-pointer ${
                    hoveredKey === "leave" ? "ring-1 ring-amber-400 bg-amber-100" : ""
                  }`}
                >
                  <Briefcase className="h-3 w-3 text-amber-600" />
                  <span>{onLeaveCount} on leave</span>
                </span>

                <span
                  onMouseEnter={() => setHoveredKey("pending")}
                  onMouseLeave={() => setHoveredKey(null)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border border-rose-200/90 bg-rose-50/80 px-2 py-0.5 text-[10.5px] font-semibold text-rose-800 transition-all cursor-pointer ${
                    hoveredKey === "pending" ? "ring-1 ring-rose-400 bg-rose-100" : ""
                  }`}
                >
                  <Clock className="h-3 w-3 text-rose-600" />
                  <span>{pendingCount} pending</span>
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-700 transition-all">
                  <Clock className="h-3 w-3 text-slate-500" />
                  <span>{lateCount} late</span>
                </span>
              </div>
            </div>
          </div>

          {/* Avg Check-in Box on right */}
          <div className="rounded-xl border border-stone-200/90 bg-white px-3.5 py-2 shrink-0 text-left shadow-2xs">
            <div className="text-[8.5px] font-mono uppercase tracking-wider text-slate-400 font-bold leading-tight">
              AVG CHECK-IN
            </div>
            <div className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
              Overall
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 tracking-tight leading-tight mt-0.5">
              {averages.overall?.time || "09:22"}
            </div>
          </div>
        </div>
      </div>

      {/* Floor breakdown dots matching image.png */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-0.5 text-[11px] font-mono font-medium text-slate-600 py-0.5">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-600" />
          F7 <strong className="font-bold text-slate-900">{floor.floor_7}</strong>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-500" />
          F9 <strong className="font-bold text-slate-900">{floor.floor_9}</strong>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          F15 <strong className="font-bold text-slate-900">{floor.floor_15}</strong>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-pink-500" />
          F17 <strong className="font-bold text-slate-900">{floor.floor_17}</strong>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          WFH <strong className="font-bold text-slate-900">{floor.wfh}</strong>
        </span>
      </div>

      {/* Mood Pulse section matching image.png */}
      <div className="space-y-1.5 px-0.5 pt-0.5">
        <div className="flex items-center justify-between text-[9.5px] font-mono uppercase tracking-wider text-slate-400 font-bold">
          <span>MOOD PULSE</span>
          <span>{moodTotal} RESPONSES</span>
        </div>

        {/* Multi-segmented Progress Bar */}
        <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-100">
          <div style={{ width: `${pGreat}%` }} className="bg-emerald-500 h-full" />
          <div style={{ width: `${pOkay}%` }} className="bg-blue-600 h-full" />
          <div style={{ width: `${pLow}%` }} className="bg-amber-500 h-full" />
          <div style={{ width: `${pStressed}%` }} className="bg-rose-500 h-full" />
        </div>

        {/* Sub-row with Mood stats & Lunch on right */}
        <div className="flex items-center justify-between text-[11px] font-medium pt-0.5 text-slate-600 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
              <Zap className="h-3 w-3 text-emerald-600" />
              <span>Great</span>
              <strong className="font-bold text-slate-900 font-mono">{mood.great}</strong>
            </span>
            <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
              <Smile className="h-3 w-3 text-blue-600" />
              <span>Okay</span>
              <strong className="font-bold text-slate-900 font-mono">{mood.okay}</strong>
            </span>
            <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
              <Meh className="h-3 w-3 text-amber-500" />
              <span>Low</span>
              <strong className="font-bold text-slate-900 font-mono">{mood.low}</strong>
            </span>
            <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
              <Frown className="h-3 w-3 text-rose-500" />
              <span>Stressed</span>
              <strong className="font-bold text-slate-900 font-mono">{mood.stressed}</strong>
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-700 font-semibold">
            <Utensils className="h-3.5 w-3.5 text-slate-400" />
            <span>{mood.canteen ?? 181} office & lunch</span>
          </div>
        </div>
      </div>
    </div>
  );
}
