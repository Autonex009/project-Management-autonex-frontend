import React, { useState, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, X, Clock, CheckCircle2,
  Calendar, AlertCircle, PlayCircle, Star, Ban, UserCheck,
  UserPlus
} from "lucide-react";
import Button from "./ui/Button";
import UserAvatar from "./ui/UserAvatar";
import { formatDisplayName } from "../utils/displayName";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const FIXED_HOLIDAYS = [
  "2026-01-01", "2026-01-26", "2026-03-04", "2026-05-01", "2026-06-26",
  "2026-09-14", "2026-10-02", "2026-11-09", "2026-12-25"
];

// ── Stage definitions ─────────────────────────────────────────────────────────
const STAGE = {
  assigned: {
    label: "Assigned",
    desc: "HR assigned this candidate to a mentor & project",
    icon: UserPlus,
    chipBg: "bg-blue-50 border-blue-200 text-blue-700",
    dot: "bg-blue-500",
    isPoint: true,
  },
  accepted: {
    label: "Accepted",
    desc: "Candidate accepted the assignment from their portal",
    icon: UserCheck,
    chipBg: "bg-teal-50 border-teal-200 text-teal-700",
    dot: "bg-teal-500",
    isPoint: true,
  },
  pending_confirmation: {
    label: "Awaiting Acceptance",
    desc: "Assigned but candidate has not yet confirmed",
    icon: Clock,
    barBg: "bg-blue-50 border-blue-200 text-blue-600",
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
  in_progress: {
    label: "In Training",
    desc: "Candidate is actively in their 5-day onboarding",
    icon: PlayCircle,
    barBg: "bg-amber-50 border-amber-200 text-amber-700",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  day_5_pending: {
    label: "Eval Due",
    desc: "Training complete — evaluation pending from TL",
    icon: AlertCircle,
    barBg: "bg-rose-50 border-rose-300 text-rose-700",
    dot: "bg-rose-500",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    urgent: true,
  },
  passed: {
    label: "Passed",
    desc: "Candidate passed evaluation and has been allocated",
    icon: Star,
    barBg: "bg-emerald-50 border-emerald-200 text-emerald-700",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  failed: {
    label: "Failed",
    desc: "Candidate did not pass evaluation and was notified",
    icon: Ban,
    barBg: "bg-slate-50 border-slate-200 text-slate-600",
    dot: "bg-slate-400",
    badge: "bg-slate-50 text-slate-700 border-slate-200",
  },
};

const LEGEND = [
  { key: "assigned", color: "bg-blue-500", label: "Assigned by HR" },
  { key: "accepted", color: "bg-teal-500", label: "Accepted by Candidate" },
  { key: "day_5_pending", color: "bg-rose-500", label: "Eval Due" },
  { key: "passed", color: "bg-emerald-500", label: "Passed" },
  { key: "failed", color: "bg-slate-400", label: "Failed" },
];

function toYMD(d) {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtShort(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function PulseDot() {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
    </span>
  );
}

// ── Activity Modal ────────────────────────────────────────────────────────────
function ActivityModal({ title, subtitle, groups, onClose }) {
  const isGrouped = Array.isArray(groups) && groups[0]?.key !== undefined;
  const count = isGrouped
    ? groups.reduce((acc, g) => acc + (g.items?.length || 0), 0)
    : (groups?.length || 0);

  const displaySubtitle = subtitle || `${count} candidate${count !== 1 ? "s" : ""}`;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                Pipeline Activity
              </span>
              <span className="text-xs font-semibold text-slate-300">·</span>
              <span className="text-xs font-semibold text-slate-500">{displaySubtitle}</span>
            </div>
            <div className="text-lg font-bold text-slate-900 mt-1">{title}</div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          {isGrouped ? (
            groups.length === 0 ? (
              <EmptyState />
            ) : (
              groups.map(({ key, items }) => {
                const s = STAGE[key];
                if (!s) return null;
                const Icon = s.icon;
                return (
                  <div key={key} className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
                    <div
                      className={`flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 ${
                        s.badge || "bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                      <Icon className="w-4 h-4 opacity-75" />
                      <span className="text-xs font-bold tracking-wide">{s.label}</span>
                      <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-white/80 border border-slate-200/60 text-slate-600">
                        {items.length}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {items.map((item, i) => (
                        <CandidateRow
                          key={i}
                          item={item}
                          isUrgent={key === "day_5_pending"}
                          isCompletedSection={key === "passed" || key === "failed"}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )
          ) : groups.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {groups.map((item, i) => (
                <div key={i} className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
                  <CandidateRow
                    item={{
                      name: item.candidateName || item.candidate_name,
                      meta: `${item.buddy || item.buddy_name
                        ? `Mentor: ${formatDisplayName(item.buddy || item.buddy_name)} · `
                        : ""
                        }${item.project || item.sub_project_name || item.project_name || "No project"}`,
                      raw: item.rawPipeline || item,
                      status: item.status,
                    }}
                    isUrgent={item.status === "day_5_pending"}
                    isCompletedSection={
                      title === "Completed / Failed" ||
                      title === "Completed" ||
                      item.status === "passed" ||
                      item.status === "failed"
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <Calendar className="w-12 h-12 mb-3 opacity-30" />
      <div className="font-semibold text-sm">No pipeline activity</div>
    </div>
  );
}

// ── Detailed Timeline Stepper ─────────────────────────────────────────────────
function DetailedTimeline({ candidate }) {
  if (!candidate) return null;

  const raw = {
    ...(candidate.rawPipeline || {}),
    ...(candidate.raw || {}),
    ...candidate,
  };

  const assignedDate = raw.assignedAt || raw.created_at || raw.approved_at;
  const acceptedDate = raw.startedAt || raw.started_at;
  const evalDueDate = raw.expectedEvalDate || raw.expected_eval_date || raw.evaluatedAt || raw.evaluated_at;
  const outcomeDate = raw.evaluatedAt || raw.evaluated_at;
  const status = raw.status;

  const isAssignedDone = !!assignedDate;
  const isAcceptedDone = !!acceptedDate || ["in_progress", "day_5_pending", "passed", "failed"].includes(status);
  const isEvalDone = !!outcomeDate || ["passed", "failed"].includes(status);
  const isOutcomeDone = !!outcomeDate && ["passed", "failed"].includes(status);

  const steps = [
    {
      label: "Assigned",
      date: assignedDate,
      desc: "Mentor & project assigned by HR",
      done: isAssignedDone,
      color: "bg-indigo-50 border-indigo-200 text-indigo-600",
    },
    {
      label: "Accepted",
      date: acceptedDate,
      desc: isAcceptedDone ? "Candidate accepted from portal" : "Pending candidate confirmation",
      done: isAcceptedDone,
      color: "bg-teal-50 border-teal-200 text-teal-600",
    },
    {
      label: "Eval Due",
      date: evalDueDate,
      desc: "Day 5 evaluation by Team Lead",
      done: isEvalDone,
      color: "bg-amber-50 border-amber-200 text-amber-600",
    },
    {
      label: "Outcome",
      date: outcomeDate,
      desc:
        status === "passed"
          ? "Passed & allocated"
          : status === "failed"
            ? "Failed & notified"
            : "Pending evaluation",
      done: isOutcomeDone,
      color:
        status === "passed"
          ? "bg-emerald-50 border-emerald-200 text-emerald-600"
          : status === "failed"
            ? "bg-rose-50 border-rose-200 text-rose-600"
            : "bg-slate-50 border-slate-200 text-slate-400",
    },
  ];

  return (
    <div className="relative flex justify-between items-start w-full mt-3 pt-2 px-1">
      {/* connecting line */}
      <div className="absolute top-6 left-[10%] right-[10%] h-0.5 bg-slate-200 z-0" />

      {steps.map((step) => (
        <div
          key={step.label}
          className={`flex flex-col items-center flex-1 text-center relative z-10 ${
            !step.done && !step.date ? "opacity-45" : ""
          }`}
        >
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-xs mb-1.5 transition-colors ${
              step.done ? step.color : "bg-slate-100 text-slate-400 border-slate-200"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-slate-800">{step.label}</div>
          <div className="text-[11px] font-semibold text-indigo-600 mt-0.5">
            {step.date ? fmtDate(step.date) : "Pending"}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 leading-tight max-w-[100px]">
            {step.desc}
          </div>
        </div>
      ))}
    </div>
  );
}

function CandidateRow({ item, isUrgent, isCompletedSection = false }) {
  const raw = {
    ...(item.raw?.rawPipeline || {}),
    ...(item.raw || {}),
    ...item,
  };
  const isPassed = raw.status === "passed";
  const isFailed = raw.status === "failed";
  const displayName = item.name || raw.candidateName || raw.candidate_name;

  // ── Compact view ONLY for Completed / Failed ───────────────────────────
  if (isCompletedSection) {
    return (
      <div className="px-5 py-3.5 bg-white hover:bg-slate-50/80 transition-colors flex items-center gap-3">
        <UserAvatar name={displayName} className="w-9 h-9 text-xs shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-bold text-slate-900 truncate">
              {formatDisplayName(displayName)}
            </div>

            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isPassed
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {isPassed ? (
                <>
                  <Star className="w-3 h-3 text-emerald-600" /> Passed
                </>
              ) : (
                <>
                  <Ban className="w-3 h-3 text-rose-600" /> Failed
                </>
              )}
            </span>
          </div>

          <div className="text-xs text-slate-500 mt-0.5 truncate">
            {raw.buddy || raw.buddy_name ? `Mentor: ${formatDisplayName(raw.buddy || raw.buddy_name)}` : "No mentor"}
            {raw.project || raw.sub_project_name || raw.project_name ? ` · ${raw.project || raw.sub_project_name || raw.project_name}` : ""}
          </div>

          <div className="text-[11px] text-slate-400 mt-0.5">
            {raw.evaluatedAt || raw.evaluated_at
              ? `Evaluated on ${fmtDate(raw.evaluatedAt || raw.evaluated_at)}`
              : "Evaluation date not recorded"}
          </div>
        </div>
      </div>
    );
  }

  // ── Full detailed timeline for active / awaiting ───────────────────────
  return (
    <div className="px-5 py-4 bg-white hover:bg-slate-50/60 transition-colors">
      <div className="flex items-center gap-3 mb-1">
        <UserAvatar name={displayName} className="w-9 h-9 text-xs shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div
              className={`text-sm font-bold truncate ${
                isUrgent ? "text-rose-700" : "text-slate-900"
              }`}
            >
              {formatDisplayName(displayName)}
            </div>
            {isUrgent && <PulseDot />}
          </div>
          <div className="text-xs text-slate-500 truncate">{item.meta}</div>
        </div>
      </div>

      <DetailedTimeline candidate={raw} />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PipelineCalendar({
  pipelines = [],
  onEvaluate,
  onViewTimeline,
  trainingCount,
  historyCount,
}) {
  const today = new Date();
  const todayStr = toYMD(today);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  // Single state that controls the modal
  const [activityModal, setActivityModal] = useState(null);

  const { dotsByDate, candidatesByDate, summary } = useMemo(() => {
    const dots = {};
    const cands = {};

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
      const name = p.candidateName || p.candidate_name || "";
      const assignedDate = p.assignedAt || p.created_at || p.approved_at;
      const startedDate = p.startedAt || p.started_at;

      if (assignedDate) {
        const d = toYMD(assignedDate);
        addDot(d, "assigned");
        addCand(d, {
          stageKey: "assigned",
          name,
          meta: `Assigned on ${fmtShort(assignedDate)} · ${p.buddy || p.buddy_name || "No mentor yet"}`,
          raw: p,
        });
      }

      if (startedDate) {
        const d = toYMD(startedDate);
        addDot(d, "accepted");
        addCand(d, {
          stageKey: "accepted",
          name,
          meta: `Accepted on ${fmtShort(startedDate)} · ${p.project || p.sub_project_name || p.project_name || ""}`,
          raw: p,
        });
      }

      const isActive = p.status === "in_progress" || p.status === "day_5_pending";
      const isPendingConfirm = p.status === "pending_confirmation";

      if (assignedDate || startedDate) {
        let spanStart, spanEnd;

        if (isPendingConfirm) {
          spanStart = toYMD(assignedDate);
          spanEnd = todayStr;
        } else if (startedDate) {
          spanStart = toYMD(startedDate);
          spanEnd = p.evaluatedAt || p.evaluated_at
            ? toYMD(p.evaluatedAt || p.evaluated_at)
            : p.expectedEvalDate || p.expected_eval_date
              ? toYMD(p.expectedEvalDate || p.expected_eval_date)
              : toYMD(startedDate);
        }

        if (isPendingConfirm) awaitingList.push(p);
        if (isActive) activeList.push(p);
        if (p.status === "passed" || p.status === "failed") historyList.push(p);

        if (spanStart) {
          if (p.status === "day_5_pending") dueTodayList.push(p);

          if (spanEnd && spanEnd !== spanStart && !isPendingConfirm) {
            const endStatus = p.status === "in_progress" ? "day_5_pending" : p.status;
            addDot(spanEnd, endStatus);
          }

          const candObj = {
            stageKey: p.status,
            name,
            meta: `${p.buddy || p.buddy_name ? `Mentor: ${formatDisplayName(p.buddy || p.buddy_name)} · ` : ""}${
              isActive
                ? `Day ${p.daysElapsed || p.days_elapsed || 0} of 5`
                : isPendingConfirm
                ? "Awaiting candidate confirmation"
                : p.status === "passed"
                ? "Allocated ✓"
                : p.status === "failed"
                ? "Failed & Notified"
                : ""
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

    return {
      dotsByDate: dots,
      candidatesByDate: cands,
      summary: {
        activeTraining: activeList.length,
        awaitingAcceptance: awaitingList.length,
        dueToday: dueTodayList.length,
        awaitingList,
        activeList,
        dueTodayList,
        historyList
      }
    };
  }, [pipelines, todayStr]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const numRows = Math.ceil(cells.length / 7);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const goToday = () => { setMonth(today.getMonth() + 1); setYear(today.getFullYear()); };

  // Helper: open the modal for a calendar day
  const openDayModal = (dateStr) => {
    const cands = candidatesByDate[dateStr] || [];

    const order = [
      "day_5_pending",
      "in_progress",
      "pending_confirmation",
      "accepted",
      "assigned",
      "passed",
      "failed",
    ];

    const map = {};
    cands.forEach((c) => {
      if (!map[c.stageKey]) map[c.stageKey] = [];
      map[c.stageKey].push(c);
    });

    // Deduplicate logic
    if (map["assigned"] && map["pending_confirmation"]) {
      const assignedNames = new Set(map["assigned"].map((c) => c.name));
      map["pending_confirmation"] = map["pending_confirmation"].filter(
        (c) => !assignedNames.has(c.name)
      );
      if (map["pending_confirmation"].length === 0) delete map["pending_confirmation"];
    }
    if (map["accepted"] && map["in_progress"]) {
      const acceptedNames = new Set(map["accepted"].map((c) => c.name));
      map["in_progress"] = map["in_progress"].filter(
        (c) => !acceptedNames.has(c.name)
      );
      if (map["in_progress"].length === 0) delete map["in_progress"];
    }

    const groups = order
      .filter((k) => map[k])
      .map((k) => ({ key: k, items: map[k] }));

    const totalCandidates = groups.reduce((acc, g) => acc + g.items.length, 0);

    setActivityModal({
      title: fmtDate(dateStr),
      subtitle: `${totalCandidates} candidate${totalCandidates !== 1 ? "s" : ""}`,
      groups,
    });
  };

  return (
    <div className="flex flex-col h-full bg-white relative">

      {/* ── Summary Metric Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-2.5 sm:p-3 border-b border-slate-100 bg-slate-50/40 shrink-0">
        {[
          {
            title: "Awaiting Acceptance",
            count: summary.awaitingAcceptance,
            icon: Clock,
            iconBg: "bg-blue-50 text-blue-600 border border-blue-100",
            list: summary.awaitingList,
            subtext: "Assigned by HR, pending candidate",
          },
          {
            title: "In Training",
            count: summary.activeTraining,
            icon: PlayCircle,
            iconBg: "bg-amber-50 text-amber-600 border border-amber-100",
            list: summary.activeList,
            subtext: "5-day training active",
          },
          {
            title: "Eval Due",
            count: summary.dueToday,
            icon: AlertCircle,
            iconBg: "bg-rose-50 text-rose-600 border border-rose-100",
            urgent: summary.dueToday > 0,
            list: summary.dueTodayList,
            subtext: "Needs Day 5 TL review",
          },
          {
            title: "Completed / Failed",
            count: summary.historyList.length,
            icon: CheckCircle2,
            iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-100",
            list: summary.historyList,
            subtext: "Passed & evaluated records",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.title}
              onClick={() =>
                setActivityModal({
                  title: card.title,
                  subtitle: `${card.count} candidate${card.count !== 1 ? "s" : ""}`,
                  groups: card.list,
                })
              }
              className={`group flex items-start gap-2.5 p-2.5 rounded-xl border bg-white text-left transition-all hover:shadow-xs cursor-pointer ${
                card.urgent
                  ? "border-rose-300 ring-1 ring-rose-200/50 bg-rose-50/20"
                  : "border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${card.iconBg}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                    {card.title}
                  </span>
                  {card.urgent && (
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span
                    className={`text-xl font-extrabold tracking-tight ${
                      card.urgent ? "text-rose-700" : "text-slate-900"
                    }`}
                  >
                    {card.count}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  {card.subtext}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Subheader: Month navigation + Legend ─────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 sm:px-4 py-2 border-b border-slate-100 bg-white shrink-0">
        {/* Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={prevMonth}
              className="h-7 w-7 p-0 flex items-center justify-center rounded-lg"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={goToday}
              className="h-7 text-xs font-semibold px-2.5 rounded-lg"
            >
              Today
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={nextMonth}
              className="h-7 w-7 p-0 flex items-center justify-center rounded-lg"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            {MONTH_NAMES[month - 1]} {year}
          </h2>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0 mr-1">
            Legend:
          </span>
          {LEGEND.map(({ key, color, label }) => (
            <div
              key={key}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/70 text-slate-600 shrink-0"
            >
              <span className={`w-2 h-2 rounded-full ${color}`} />
              <span className="text-[10px] font-semibold">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Grid ──────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 p-2 sm:p-2.5 flex flex-col overflow-hidden bg-slate-50/20">
        <div className="grid grid-cols-7 mb-1.5 shrink-0">
          {DAY_NAMES.map((d, i) => (
            <div
              key={d}
              className={`text-center text-[10px] font-black uppercase tracking-wider py-1 ${
                i === 0 || i === 6 ? "text-rose-400" : "text-slate-400"
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5 flex-1 min-h-0" style={{ gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))` }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} className="rounded-xl border border-dashed border-slate-100 bg-slate-50/30" />;

            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = dateStr === todayStr;
            const dow = new Date(year, month - 1, day).getDay();
            const isWeekend = dow === 0 || dow === 6;
            const isHoliday = FIXED_HOLIDAYS.includes(dateStr);
            const stageDots = dotsByDate[dateStr] || {};
            const hasActivity = Object.keys(stageDots).length > 0;
            const hasUrgent = !!stageDots["day_5_pending"];

            return (
              <button
                key={dateStr}
                onClick={() => openDayModal(dateStr)}
                className={`
                  relative rounded-xl border p-1.5 flex flex-col items-start text-left
                  transition-all duration-150 cursor-pointer group
                  ${isToday
                    ? "border-indigo-400/90 ring-1 ring-indigo-500/20 bg-indigo-50/20 shadow-xs"
                    : hasUrgent
                      ? "border-rose-300 bg-rose-50/30 hover:border-rose-400 hover:shadow-xs"
                      : isWeekend || isHoliday
                        ? "border-slate-100 bg-slate-50/40 hover:bg-slate-50/80"
                        : "border-slate-200/70 bg-white hover:border-slate-300 hover:shadow-xs"
                  }
                `}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className={`flex items-center justify-center w-5 h-5 rounded-md text-[11px] font-bold
                    ${isToday ? "bg-indigo-600 text-white shadow-xs" : isWeekend || isHoliday ? "text-rose-400" : "text-slate-600 group-hover:text-slate-900"}`}>
                    {day}
                  </span>
                  {hasUrgent && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
                    </span>
                  )}
                  {isHoliday && !hasUrgent && <span className="text-[8px] font-bold text-rose-400 uppercase tracking-wider">Holiday</span>}
                </div>

                {hasActivity && (
                  <div className="flex flex-wrap gap-1 w-full mt-0.5">
                    {Object.entries(stageDots).map(([key, count]) => {
                      const s = STAGE[key];
                      if (!s) return null;
                      return (
                        <div
                          key={key}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${s.chipBg || s.badge || "bg-slate-100 border-slate-200 text-slate-700"}`}
                          title={`${count} ${s.label}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                          <span>{count}</span>
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

      {/* ── Activity Modal ─────────────────────────────────────────────── */}
      {activityModal && (
        <ActivityModal
          title={activityModal.title}
          subtitle={activityModal.subtitle}
          groups={activityModal.groups}
          onClose={() => setActivityModal(null)}
        />
      )}
    </div>
  );
}