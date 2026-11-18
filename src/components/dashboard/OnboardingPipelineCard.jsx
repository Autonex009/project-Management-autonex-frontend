import React, { useState, useMemo } from "react";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { todayLocalISO } from "../../utils/workforce";

export default function OnboardingPipelineCard({
  pipeline = [],
  onNavigate,
  routePrefix = "/admin",
}) {
  const [tab, setTab] = useState("today");
  const todayStr = todayLocalISO();

  const evalCandidates = useMemo(() => {
    return pipeline.filter(
      (p) =>
        ["pending_confirmation", "in_progress", "day_5_pending"].includes(p.status) &&
        p.expected_eval_date
    );
  }, [pipeline]);

  const { todayList, pastList } = useMemo(() => {
    const today = [];
    const past = [];

    evalCandidates.forEach((item) => {
      const evalDate = String(item.expected_eval_date).slice(0, 10);
      if (evalDate === todayStr) {
        today.push(item);
      } else if (evalDate < todayStr) {
        const diffDays = Math.max(
          1,
          Math.floor((new Date(todayStr) - new Date(evalDate)) / (1000 * 60 * 60 * 24))
        );
        past.push({ ...item, daysOverdue: diffDays });
      }
    });

    return { todayList: today, pastList: past };
  }, [evalCandidates, todayStr]);

  const activeList = tab === "today" ? todayList : pastList;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white shadow-[0_1px_4px_rgba(28,25,23,0.06)] p-3.5 h-full">
      {/* Header bar */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h4 className="text-[13px] font-semibold text-slate-900 leading-tight">
              Onboarding
            </h4>
            <span className="truncate font-mono text-[11px] text-slate-400 leading-tight">
              / eval due
            </span>
          </div>

          <button
            type="button"
            onClick={() => onNavigate(`${routePrefix}/onboarding/pipeline`)}
            className="group inline-flex items-center gap-1 rounded-lg border border-blue-200/80 bg-blue-50/70 px-2 py-0.5 text-[11px] font-semibold text-blue-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-100/80 hover:text-blue-800 cursor-pointer"
          >
            <span>View all</span>
            <ArrowUpRight className="h-3 w-3 text-blue-500" />
          </button>
        </div>

        {/* Tab switch: [Today (X)] [Past (Y)] */}
        <div className="mt-2.5 flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5 ring-1 ring-inset ring-slate-200/60 text-[11px]">
          <button
            type="button"
            onClick={() => setTab("today")}
            className={`flex-1 py-1 rounded-md font-semibold transition-all cursor-pointer text-center ${
              tab === "today"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Today ({todayList.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("past")}
            className={`flex-1 py-1 rounded-md font-semibold transition-all cursor-pointer text-center ${
              tab === "past"
                ? "bg-white text-rose-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Past ({pastList.length})
          </button>
        </div>
      </div>

      {/* Candidates List */}
      <div className="my-2 space-y-1 max-h-36 overflow-y-auto pr-0.5" style={{ scrollbarWidth: "thin" }}>
        {activeList.length === 0 ? (
          <div className="py-5 text-center text-[11px] text-slate-400">
            {tab === "today" ? "No evaluations due today" : "No overdue evaluations"}
          </div>
        ) : (
          activeList.slice(0, 4).map((c, idx) => (
            <div
              key={c.id ?? idx}
              onClick={() => onNavigate(`${routePrefix}/onboarding/pipeline`)}
              className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 transition-all cursor-pointer group"
            >
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                  {c.candidate_name}
                </p>
                <p className="text-[10px] font-mono text-slate-400 truncate">
                  {c.sub_project_name || c.project_name || "Project"} · {c.buddy_name || "No Buddy"}
                </p>
              </div>

              {tab === "today" ? (
                <span className="shrink-0 ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Today
                </span>
              ) : (
                <span className="shrink-0 ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60 font-mono">
                  {c.daysOverdue}d overdue
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[10.5px] text-slate-400">
        <span>5-day cycle</span>
        <button
          type="button"
          onClick={() => onNavigate(`${routePrefix}/onboarding/pipeline`)}
          className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-0.5"
        >
          Evaluate <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
