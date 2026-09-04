import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, X, Clock, CheckCircle2,
  Calendar, AlertCircle, PlayCircle, Star, Ban, UserCheck,
  UserPlus, CheckCheck, TrendingUp
} from "lucide-react";
import Button from "./ui/Button";
import UserAvatar from "./ui/UserAvatar";
import { formatDisplayName } from "../utils/displayName";

const DAY_NAMES   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const FIXED_HOLIDAYS = [
  "2026-01-01","2026-01-26","2026-03-04","2026-05-01","2026-06-26",
  "2026-09-14","2026-10-02","2026-11-09","2026-12-25"
];

// ── Stage definitions ─────────────────────────────────────────────────────────
// Point events (single day marker)
// Spanning bar events (cover a date range)
const STAGE = {
  // Point events
  assigned: {
    label: "Assigned",
    icon: UserPlus,
    chipBg: "bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-150",
    dot: "bg-blue-500",
    isPoint: true,
  },
  accepted: {
    label: "Accepted",
    icon: UserCheck,
    chipBg: "bg-teal-100 border-teal-300 text-teal-700 hover:bg-teal-150",
    dot: "bg-teal-500",
    isPoint: true,
  },
  // Spanning bars
  pending_confirmation: {
    label: "Awaiting Acceptance",
    icon: Clock,
    barBg: "bg-blue-50 border-blue-200 text-blue-600",
    dot: "bg-blue-400",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
  },
  in_progress: {
    label: "In Training",
    icon: PlayCircle,
    barBg: "bg-amber-50 border-amber-200 text-amber-700",
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
  },
  day_5_pending: {
    label: "Eval Due",
    icon: AlertCircle,
    barBg: "bg-red-50 border-red-300 text-red-700",
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-700 border-red-200",
    urgent: true,
  },
  passed: {
    label: "Passed ✓",
    icon: Star,
    barBg: "bg-emerald-50 border-emerald-200 text-emerald-700",
    dot: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  failed: {
    label: "Failed",
    icon: Ban,
    barBg: "bg-rose-50 border-rose-200 text-rose-600",
    dot: "bg-rose-500",
    badge: "bg-rose-100 text-rose-600 border-rose-200",
  },
};

const LEGEND = [
  { key: "assigned",             color: "bg-blue-500",    label: "Assigned by HR" },
  { key: "accepted",             color: "bg-teal-500",    label: "Accepted by Candidate" },
  { key: "day_5_pending",        color: "bg-red-500",     label: "Eval Due" },
  { key: "passed",               color: "bg-emerald-500", label: "Passed" },
  { key: "failed",               color: "bg-rose-500",    label: "Failed" },
];

function toYMD(d) {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
}
function fmtShort(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
}

function PulseDot() {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60"/>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"/>
    </span>
  );
}

// ── Day Drawer ────────────────────────────────────────────────────────────────
function DayDrawer({ date, candidates, onClose, onViewTimeline, onEvaluate }) {
  const groups = useMemo(() => {
    const order = ["day_5_pending","in_progress","pending_confirmation","accepted","assigned","passed","failed"];
    const map = {};
    candidates.forEach(c => {
      if (!map[c.stageKey]) map[c.stageKey] = [];
      map[c.stageKey].push(c);
    });

    // Deduplicate: if a candidate is in "assigned" today, they don't need 
    // to also show up in the "Awaiting Acceptance" span for today.
    if (map["assigned"] && map["pending_confirmation"]) {
      const assignedNames = new Set(map["assigned"].map(c => c.name));
      map["pending_confirmation"] = map["pending_confirmation"].filter(c => !assignedNames.has(c.name));
      if (map["pending_confirmation"].length === 0) delete map["pending_confirmation"];
    }

    // Deduplicate: same logic for "accepted" vs "in_progress" on the start date
    if (map["accepted"] && map["in_progress"]) {
      const acceptedNames = new Set(map["accepted"].map(c => c.name));
      map["in_progress"] = map["in_progress"].filter(c => !acceptedNames.has(c.name));
      if (map["in_progress"].length === 0) delete map["in_progress"];
    }

    return order.filter(k => map[k]).map(k => ({ key: k, items: map[k] }));
  }, [candidates]);

  return (
    <div className="fixed inset-0 z-[300] flex" style={{animation:"drawerBg 0.18s ease"}}>
      <style>{`
        @keyframes drawerBg { from{opacity:0} to{opacity:1} }
        @keyframes drawerIn  { from{transform:translateX(100%)} to{transform:translateX(0)} }
      `}</style>
      <div className="flex-1 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose}/>
      <div className="w-[420px] bg-white flex flex-col shadow-2xl border-l border-slate-200" style={{animation:"drawerIn 0.22s cubic-bezier(0.4,0,0.2,1)"}}>

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 shrink-0 bg-gradient-to-r from-slate-800 to-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Pipeline Activity</div>
              <div className="text-white font-bold text-lg mt-0.5">{fmtDate(date)}</div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-slate-300"/>
            </button>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {groups.map(g => {
              const s = STAGE[g.key];
              return s ? (
                <span key={g.key} className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.badge || s.chipBg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}/>
                  {g.items.length} {s.label}
                </span>
              ) : null;
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {groups.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Calendar className="w-10 h-10 mb-3 opacity-30"/>
              <div className="font-semibold text-sm">No pipeline activity on this date</div>
            </div>
          )}

          {groups.map(({ key, items }) => {
            const s = STAGE[key];
            if (!s) return null;
            const Icon = s.icon;
            const sectionBg = s.badge
              ? s.badge.replace("text-", "border-").replace("bg-", "border-").split(" ")[0] + " bg-white"
              : "bg-slate-50 border-slate-200";

            return (
              <div key={key} className={`rounded-xl border overflow-hidden`} style={{borderColor: ""}}>
                <div className={`flex items-center gap-2 px-3 py-2 border-b ${s.badge || "bg-slate-50 border-slate-200"} bg-opacity-40`}>
                  <span className={`w-2 h-2 rounded-full ${s.dot}`}/>
                  <Icon className="w-3.5 h-3.5 opacity-70"/>
                  <span className="text-xs font-black tracking-wide">{s.label}</span>
                  <span className="ml-auto text-xs font-bold opacity-60">{items.length}</span>
                </div>

                <div className="divide-y divide-black/5">
                  {items.map((item, i) => {
                    const isUrgent = key === "day_5_pending";
                    return (
                      <div key={i} className={`flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-slate-50 transition-colors`}>
                        <UserAvatar name={item.name} className="w-7 h-7 text-[10px] shrink-0"/>
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-bold truncate ${isUrgent ? "text-red-700" : "text-slate-800"}`}>
                            {formatDisplayName(item.name)}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">{item.meta}</div>
                        </div>
                        {isUrgent && <PulseDot/>}
                        <div className="flex gap-1.5 shrink-0">
                          {onViewTimeline && item.raw && (
                            <button onClick={() => { onViewTimeline(item.raw); onClose(); }} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1 hover:bg-indigo-100 transition-colors">
                              Timeline
                            </button>
                          )}
                          {isUrgent && onEvaluate && (
                            <button onClick={() => { onEvaluate(item.raw?.rawPipeline || item.raw); onClose(); }} className="text-[10px] font-bold text-white bg-red-600 rounded-lg px-2 py-1 hover:bg-red-700 transition-colors">
                              Evaluate
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Summary Drawer ────────────────────────────────────────────────────────────
function SummaryDrawer({ category, items, onClose, onViewTimeline, onEvaluate }) {
  if (!category || !items) return null;

  let headerColor = "from-slate-800 to-slate-900";
  let title = category;
  
  return (
    <div className="fixed inset-0 z-[300] flex" style={{animation:"drawerBg 0.18s ease"}}>
      <div className="flex-1 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose}/>
      <div className="w-[420px] bg-white flex flex-col shadow-2xl border-l border-slate-200" style={{animation:"drawerIn 0.22s cubic-bezier(0.4,0,0.2,1)"}}>
        {/* Header */}
        <div className={`px-5 py-4 border-b border-slate-100 shrink-0 bg-gradient-to-r ${headerColor}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Category Overview</div>
              <div className="text-white font-bold text-lg mt-0.5">{title}</div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-slate-300"/>
            </button>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-white/10 border-white/20 text-white">
              {items.length} Candidates
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="font-semibold text-sm">No candidates in this category</div>
            </div>
          )}
          {items.map((item, i) => {
            const isUrgent = item.status === "day_5_pending";
            return (
              <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors shadow-sm`}>
                <UserAvatar name={item.candidateName} className="w-8 h-8 text-xs shrink-0"/>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold truncate ${isUrgent ? "text-red-700" : "text-slate-800"}`}>
                    {formatDisplayName(item.candidateName)}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {item.buddy ? `Mentor: ${formatDisplayName(item.buddy)} · ` : ""}
                    {item.project || "No project"}
                  </div>
                </div>
                {isUrgent && <PulseDot/>}
                <div className="flex flex-col gap-1.5 shrink-0 ml-2">
                  {onViewTimeline && item.rawPipeline && (
                    <button onClick={() => { onViewTimeline(item.rawPipeline); onClose(); }} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1 hover:bg-indigo-100 transition-colors">
                      Timeline
                    </button>
                  )}
                  {isUrgent && onEvaluate && (
                    <button onClick={() => { onEvaluate(item.rawPipeline); onClose(); }} className="text-[10px] font-bold text-white bg-red-600 rounded-lg px-2 py-1 hover:bg-red-700 transition-colors">
                      Evaluate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PipelineCalendar({
  pipelines = [],
  onEvaluate,
  onViewTimeline,
  trainingCount,
  historyCount,
}) {
  const today = new Date();
  const todayStr = toYMD(today);
  const [year, setYear]       = useState(today.getFullYear());
  const [month, setMonth]     = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSummaryCategory, setSelectedSummaryCategory] = useState(null);

  const { dotsByDate, candidatesByDate, summary } = useMemo(() => {
    const dots  = {};  // dateStr → { stageKey: count }
    const cands = {};  // dateStr → [candidate objects for drawer]
    
    const awaitingList = [];
    const activeList = [];
    const dueTodayList = [];
    const historyList = [];

    const addDot = (dateStr, key) => {
      if (!dateStr) return;
      if (!dots[dateStr]) dots[dateStr] = {};
      dots[dateStr][key] = (dots[dateStr][key] || 0) + 1;
    };

    const addCand = (dateStr, obj) => {
      if (!dateStr) return;
      if (!cands[dateStr]) cands[dateStr] = [];
      if (!cands[dateStr].find(c => c.stageKey === obj.stageKey && c.name === obj.name)) {
        cands[dateStr].push(obj);
      }
    };

    pipelines.forEach(p => {
      const name = p.candidateName || "";

      // ── Point event: ASSIGNED (when HR assigned the candidate) ──────────
      if (p.assignedAt) {
        const d = toYMD(p.assignedAt);
        addDot(d, "assigned");
        addCand(d, {
          stageKey: "assigned",
          name,
          meta: `Assigned on ${fmtShort(p.assignedAt)} · ${p.buddy || "No mentor yet"}`,
          raw: p,
        });
      }

      // ── Point event: ACCEPTED (when candidate accepted from portal) ─────
      // This is the startedAt date — the moment they confirmed via their portal
      if (p.startedAt) {
        const d = toYMD(p.startedAt);
        addDot(d, "accepted");
        addCand(d, {
          stageKey: "accepted",
          name,
          meta: `Accepted on ${fmtShort(p.startedAt)} · ${p.project || ""}`,
          raw: p,
        });
      }

      // ── Spanning bars ────────────────────────────────────────────────────
      const isActive = p.status === "in_progress" || p.status === "day_5_pending";
      const isPendingConfirm = p.status === "pending_confirmation";

      if (p.assignedAt || p.startedAt) {
        // For pending_confirmation: span from assignedAt to today (still waiting)
        // For in_progress/day_5_pending: span from startedAt to expectedEvalDate
        // For passed/failed: span from startedAt to evaluatedAt
        let spanStart, spanEnd;

        if (isPendingConfirm) {
          spanStart = toYMD(p.assignedAt);
          spanEnd   = todayStr; // still open
        } else if (p.startedAt) {
          spanStart = toYMD(p.startedAt);
          spanEnd   = p.evaluatedAt
            ? toYMD(p.evaluatedAt)
            : p.expectedEvalDate
            ? toYMD(p.expectedEvalDate)
            : toYMD(p.startedAt);
        }

        if (isPendingConfirm) awaitingList.push(p);
        if (isActive) activeList.push(p);
        if (p.status === "passed" || p.status === "failed") historyList.push(p);

        if (spanStart) {
          if (p.status === "day_5_pending") dueTodayList.push(p);


          // Add dot only on the actual assignment date (spanStart).
          // For open pending_confirmation spans, spanEnd = todayStr which is a
          // moving target — stamping a dot there would make today look like an
          // event date even though nothing happened today.
          if (spanEnd && spanEnd !== spanStart && !isPendingConfirm) {
            const endStatus = p.status === "in_progress" ? "day_5_pending" : p.status;
            addDot(spanEnd, endStatus);
          }


          // Add candidate ONLY to start and end date of the span
          const candObj = {
            stageKey: p.status,
            name,
            meta: `${p.buddy ? `Mentor: ${formatDisplayName(p.buddy)} · ` : ""}${
              isActive ? `Day ${p.daysElapsed || 0} of 5` :
              isPendingConfirm ? "Awaiting candidate confirmation" :
              p.status === "passed" ? "Allocated ✓" :
              p.status === "failed" ? "Failed & Notified" : ""
            }`,
            raw: p,
          };
          
          addCand(spanStart, candObj);
          if (spanEnd && spanEnd !== spanStart && !isPendingConfirm) {
            addCand(spanEnd, candObj);
          }
        }
      }
    });

    return { dotsByDate: dots, candidatesByDate: cands, summary: { 
      activeTraining: activeList.length, awaitingAcceptance: awaitingList.length, dueToday: dueTodayList.length,
      awaitingList, activeList, dueTodayList, historyList
    } };
  }, [pipelines, todayStr]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow    = new Date(year, month-1, 1).getDay();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const numRows = Math.ceil(cells.length / 7);

  const prevMonth = () => { if (month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if (month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); };
  const goToday   = () => { setMonth(today.getMonth()+1); setYear(today.getFullYear()); };

  const selectedCandidates = selectedDate ? (candidatesByDate[selectedDate] || []) : [];

  return (
    <div className="flex flex-col h-full bg-white relative">

      {/* ── Summary Strip ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-0 px-5 py-3 bg-gradient-to-r from-slate-800 to-slate-900 shrink-0">
        {[
          { dot:"bg-indigo-500",  count: summary.awaitingAcceptance,          label:"Awaiting Acceptance", list: summary.awaitingList },
          { dot:"bg-amber-500",   count: summary.activeTraining,              label:"In Training",         list: summary.activeList },
          { dot:"bg-red-500",     count: summary.dueToday,                    label:"Eval Due Today", urgent: summary.dueToday > 0, list: summary.dueTodayList },
          { dot:"bg-emerald-500", count: summary.historyList.length,          label:"Completed / Failed",  list: summary.historyList },
        ].map(({ dot, count, label, urgent, list }, i, arr) => (
          <React.Fragment key={label}>
            <button 
              onClick={() => setSelectedSummaryCategory({ label, items: list })}
              className="flex items-center gap-2 text-xs font-semibold text-slate-300 px-4 py-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-left"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`}/>
              <span className={`font-black text-sm ${urgent ? "text-red-300" : "text-white"}`}>{count}</span>
              <span className="text-slate-400 whitespace-nowrap">{label}</span>
            </button>
            {i < arr.length - 1 && <div className="w-px h-5 bg-slate-700 shrink-0"/>}
          </React.Fragment>
        ))}
      </div>

      {/* ── Legend ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-2 border-b border-slate-100 bg-slate-50 shrink-0 overflow-x-auto">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">Legend</span>
        {LEGEND.map(({ key, color, label }) => (
          <div key={key} className="flex items-center gap-1.5 shrink-0">
            <span className={`w-2 h-2 rounded-full ${color}`}/>
            <span className="text-[10px] font-semibold text-slate-500">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Calendar Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-2.5 shrink-0 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-500"/>
          {MONTH_NAMES[month-1]} {year}
        </h2>
        <div className="flex gap-1">
          <Button variant="secondary" onClick={prevMonth} className="px-2 py-1"><ChevronLeft className="w-3.5 h-3.5"/></Button>
          <Button variant="secondary" onClick={goToday} className="text-xs font-semibold px-3">Today</Button>
          <Button variant="secondary" onClick={nextMonth} className="px-2 py-1"><ChevronRight className="w-3.5 h-3.5"/></Button>
        </div>
      </div>

      {/* ── Grid ──────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 p-3 flex flex-col overflow-hidden">
        <div className="grid grid-cols-7 mb-1.5 shrink-0">
          {DAY_NAMES.map((d, i) => (
            <div key={d} className={`text-center text-[10px] font-black uppercase tracking-widest py-1 ${i===0||i===6?"text-red-400":"text-slate-400"}`}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5 flex-1 min-h-0" style={{ gridTemplateRows:`repeat(${numRows}, minmax(0, 1fr))` }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} className="rounded-xl border border-dashed border-slate-100 bg-slate-50/20"/>;

            const dateStr = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const isToday    = dateStr === todayStr;
            const dow        = new Date(year,month-1,day).getDay();
            const isWeekend  = dow===0||dow===6;
            const isHoliday  = FIXED_HOLIDAYS.includes(dateStr);
            const isSelected = dateStr === selectedDate;
            const stageDots  = dotsByDate[dateStr] || {};
            const hasActivity = Object.keys(stageDots).length > 0;
            const hasUrgent   = !!stageDots["day_5_pending"];

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`
                  relative rounded-xl border p-1.5 flex flex-col items-start text-left
                  transition-all duration-150 cursor-pointer group
                  ${isSelected
                    ? "border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50 shadow-md"
                    : isToday
                    ? "border-indigo-300 ring-1 ring-indigo-400/20 bg-white shadow-sm"
                    : hasUrgent
                    ? "border-red-200 bg-red-50/40 hover:border-red-300 hover:shadow-sm"
                    : isWeekend||isHoliday
                    ? "border-red-100 bg-red-50/30 hover:bg-red-50/50"
                    : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"
                  }
                `}
              >
                {/* Day number */}
                <div className="flex items-center justify-between w-full mb-1">
                  <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-black
                    ${isSelected ? "bg-indigo-600 text-white" : isToday ? "bg-indigo-600 text-white shadow" : isWeekend||isHoliday ? "text-red-400" : "text-slate-500 group-hover:text-slate-700"}`}>
                    {day}
                  </span>
                  {hasUrgent && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"/>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"/>
                    </span>
                  )}
                  {isHoliday && !hasUrgent && <span className="text-[7px] font-black text-red-300 uppercase">Holiday</span>}
                </div>

                {/* Stage indicators — solid colored circles, one per stage present */}
                {hasActivity && (
                  <div className="flex flex-wrap gap-1 w-full mt-0.5">
                    {Object.entries(stageDots).map(([key, count]) => {
                      const s = STAGE[key];
                      if (!s) return null;
                      return (
                        <div key={key} className="flex items-center gap-0.5" title={`${count} ${s.label}`}>
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.dot} shadow-sm`}/>
                          {count > 1 && (
                            <span className="text-[9px] font-black text-slate-500 leading-none">{count}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

              </button>
            );
          })}
        </div>
      </div>

      {/* ── Day Drawer ────────────────────────────────────────────────── */}
      {selectedDate && (
        <DayDrawer
          date={selectedDate}
          candidates={selectedCandidates}
          onClose={() => setSelectedDate(null)}
          onViewTimeline={onViewTimeline}
          onEvaluate={onEvaluate}
        />
      )}

      {/* ── Summary Drawer ──────────────────────────────────────────────── */}
      {selectedSummaryCategory && (
        <SummaryDrawer
          category={selectedSummaryCategory.label}
          items={selectedSummaryCategory.items}
          onClose={() => setSelectedSummaryCategory(null)}
          onViewTimeline={onViewTimeline}
          onEvaluate={onEvaluate}
        />
      )}
    </div>
  );
}
