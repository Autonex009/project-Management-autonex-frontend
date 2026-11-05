import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { checkinApi } from "../../../services/api";
import toast from "react-hot-toast";

export default function AttentionTab() {
  const [subTab, setSubTab] = useState("unaccounted"); // "unaccounted" | "consecutive" | "habitual"
  const [selectedStreakKey, setSelectedStreakKey] = useState("streak_2_days");
  const [nudgedEmpIds, setNudgedEmpIds] = useState(new Set());
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["checkin-pulse", "attention"],
    queryFn: () => checkinApi.getPulseAttention(),
    staleTime: 5_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const nudgeMutation = useMutation({
    mutationFn: (empId) => checkinApi.nudgeEmployee({ employee_id: empId }),
    onSuccess: (res, empId) => {
      setNudgedEmpIds((prev) => new Set(prev).add(empId));
      toast.success(res?.message || "Check-in reminder sent via Slack!");
      queryClient.invalidateQueries({ queryKey: ["checkin-pulse", "attention"] });
    },
    onError: (err) => {
      const msg = err?.response?.data?.detail || err?.message || "Failed to send nudge reminder";
      toast.error(msg);
    },
  });

  const nudgeAllMutation = useMutation({
    mutationFn: () => checkinApi.nudgeEmployee({ all_unaccounted: true }),
    onSuccess: (res) => {
      const allIds = (data?.not_checked_in_no_leave?.employees || []).map((e) => e.id);
      setNudgedEmpIds((prev) => {
        const next = new Set(prev);
        allIds.forEach((id) => next.add(id));
        return next;
      });
      toast.success(res?.message || "Check-in reminders sent!");
      queryClient.invalidateQueries({ queryKey: ["checkin-pulse", "attention"] });
    },
    onError: (err) => {
      const msg = err?.response?.data?.detail || err?.message || "Failed to send bulk nudges";
      toast.error(msg);
    },
  });

  if (isLoading && !data) {
    return (
      <div className="h-56 flex flex-col items-center justify-center space-y-2">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-[11px] text-slate-400 font-medium">Loading attention alerts...</span>
      </div>
    );
  }

  const consecutive = data?.consecutive_misses || {
    streak_2_days: { count: 0, items: [] },
    streak_3_days: { count: 0, items: [] },
    streak_5_plus_days: { count: 0, items: [] },
  };

  const unaccounted = data?.not_checked_in_no_leave || { count: 0, employees: [] };
  const habitual = data?.habitual_late || { count: 0, description: ">3x past 30 days", employees: [] };

  const totalConsecutive =
    (consecutive.streak_2_days?.count || 0) +
    (consecutive.streak_3_days?.count || 0) +
    (consecutive.streak_5_plus_days?.count || 0);

  const selectedStreakGroup = consecutive[selectedStreakKey] || consecutive.streak_2_days;

  return (
    <div className="space-y-2 text-slate-800">
      {/* Sub-Tab Navigation Switcher (Encord Activity Pill Style) */}
      <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 ring-1 ring-inset ring-slate-200/60 text-[11px] font-semibold">
        <button
          type="button"
          onClick={() => setSubTab("unaccounted")}
          className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md transition-all ${
            subTab === "unaccounted"
              ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>No Check-in</span>
          {unaccounted.count > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-bold">
              {unaccounted.count}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSubTab("consecutive")}
          className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md transition-all ${
            subTab === "consecutive"
              ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Consecutive</span>
          {totalConsecutive > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[9px] font-bold">
              {totalConsecutive}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSubTab("habitual")}
          className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md transition-all ${
            subTab === "habitual"
              ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Late (&gt;11 AM)</span>
          {habitual.count > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-slate-700 text-white text-[9px] font-bold">
              {habitual.count}
            </span>
          )}
        </button>
      </div>

      {/* VIEW 1: NOT CHECKED IN · NO LEAVE */}
      {subTab === "unaccounted" && (() => {
        const unnudgedEmployees = (unaccounted.employees || []).filter(
          (e) => !nudgedEmpIds.has(e.id) && !e.is_nudged_today && e.slack_user_id
        );
        const unnudgedCount = unnudgedEmployees.length;
        const allAlreadyNudged = unaccounted.employees.length > 0 && unnudgedCount === 0;

        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] px-0.5">
              <span className="font-semibold text-slate-700">
                Not Checked In · No Leave
              </span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-rose-600 text-[11px]">
                  {unaccounted.count} PEOPLE
                </span>
                {unaccounted.count > 0 && (
                  allAlreadyNudged ? (
                    <span
                      title="All unaccounted employees have already received their daily reminder (Limit: 1 per day)"
                      className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 cursor-not-allowed select-none"
                    >
                      All Nudged ✓
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => nudgeAllMutation.mutate()}
                      disabled={nudgeAllMutation.isPending}
                      title={`Send check-in reminder to ${unnudgedCount} employee(s) (Limit: 1 per day)`}
                      className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 underline disabled:opacity-50 cursor-pointer"
                    >
                      {nudgeAllMutation.isPending ? "Sending..." : `Nudge All (${unnudgedCount})`}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* List: 4 items visible, rest on internal scroll */}
            <div className="space-y-1.5 max-h-[225px] overflow-y-auto pr-1">
              {unaccounted.employees.map((emp) => {
                const isNudged = nudgedEmpIds.has(emp.id) || Boolean(emp.is_nudged_today);
                const hasSlack = Boolean(emp.slack_user_id);
                const isPendingThis = nudgeMutation.isPending && nudgeMutation.variables === emp.id;

                let btnLabel = "Nudge";
                let btnTitle = "Send daily check-in reminder via Slack (Limit: 1 per day)";
                let btnClasses = "bg-white text-slate-700 border-stone-200 hover:bg-stone-50 hover:border-stone-300 shadow-xs cursor-pointer active:scale-95";

                if (isNudged) {
                  btnLabel = "Nudged ✓";
                  btnTitle = "Already nudged today (Limit: 1 nudge per day)";
                  btnClasses = "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed";
                } else if (!hasSlack) {
                  btnLabel = "No Slack";
                  btnTitle = "Employee has no linked Slack account";
                  btnClasses = "bg-slate-50 text-slate-400 border-slate-200/60 cursor-not-allowed";
                } else if (isPendingThis) {
                  btnLabel = "Sending...";
                  btnClasses = "bg-indigo-50 text-indigo-600 border-indigo-200 cursor-wait";
                }

                return (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between p-2 rounded-xl border border-stone-200/80 bg-white hover:bg-stone-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[11px] shrink-0 border border-slate-200/60">
                        {emp.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold text-slate-800 truncate">
                          {emp.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {emp.designation} · PM: {emp.pm_name}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => nudgeMutation.mutate(emp.id)}
                      disabled={isNudged || !hasSlack || nudgeMutation.isPending}
                      title={btnTitle}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${btnClasses}`}
                    >
                      {btnLabel}
                    </button>
                  </div>
                );
              })}

              {unaccounted.employees.length === 0 && (
                <div className="text-[11px] text-emerald-600 font-semibold text-center py-6 bg-stone-50/50 rounded-xl border border-stone-100">
                  ✓ All active employees accounted for today!
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* VIEW 2: CONSECUTIVE MISSES (3 Cards Only: 2d, 3d, 5d+) */}
      {subTab === "consecutive" && (
        <div className="space-y-2">
          {/* 3 Streak selector cards (NO 4th WFH card) */}
          <div className="grid grid-cols-3 gap-2">
            {/* 2 Days */}
            <button
              type="button"
              onClick={() => setSelectedStreakKey("streak_2_days")}
              className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                selectedStreakKey === "streak_2_days"
                  ? "border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600 shadow-xs"
                  : "border-stone-200/80 bg-white hover:border-stone-300"
              }`}
            >
              <div className="text-base font-bold text-amber-500">
                {consecutive.streak_2_days?.count || 0}
              </div>
              <div className="text-[10px] font-semibold text-slate-500 mt-0.5">2 days</div>
            </button>

            {/* 3 Days */}
            <button
              type="button"
              onClick={() => setSelectedStreakKey("streak_3_days")}
              className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                selectedStreakKey === "streak_3_days"
                  ? "border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600 shadow-xs"
                  : "border-stone-200/80 bg-white hover:border-stone-300"
              }`}
            >
              <div className="text-base font-bold text-amber-600">
                {consecutive.streak_3_days?.count || 0}
              </div>
              <div className="text-[10px] font-semibold text-slate-500 mt-0.5">3 days</div>
            </button>

            {/* 5+ Days */}
            <button
              type="button"
              onClick={() => setSelectedStreakKey("streak_5_plus_days")}
              className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                selectedStreakKey === "streak_5_plus_days"
                  ? "border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600 shadow-xs"
                  : "border-stone-200/80 bg-white hover:border-stone-300"
              }`}
            >
              <div className="text-base font-bold text-rose-600">
                {consecutive.streak_5_plus_days?.count || 0}
              </div>
              <div className="text-[10px] font-semibold text-slate-500 mt-0.5">5+ days</div>
            </button>
          </div>

          {/* List of employees in this streak: 4 items visible, rest on internal scroll */}
          <div className="space-y-1.5 max-h-[175px] overflow-y-auto pr-1">
            {(selectedStreakGroup?.items || []).map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between p-2 rounded-xl border border-stone-200/80 bg-white"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[11px] shrink-0 border border-slate-200/60">
                    {emp.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-slate-900 truncate">
                      {emp.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {emp.designation} · Last seen {emp.last_seen}
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${
                    emp.days >= 5
                      ? "text-rose-600 bg-rose-50 border-rose-200/60"
                      : "text-amber-600 bg-amber-50 border-amber-200/60"
                  }`}
                >
                  • {emp.days} days
                </span>
              </div>
            ))}

            {(selectedStreakGroup?.items || []).length === 0 && (
              <div className="text-[11px] text-slate-400 italic text-center py-5 bg-stone-50/40 rounded-xl border border-stone-100">
                No employees with this streak.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: HABITUAL LATE */}
      {subTab === "habitual" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] px-0.5">
            <span className="font-semibold text-slate-700">
              Habitual Late · After 11:00 AM
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {habitual.description}
            </span>
          </div>

          <div className="space-y-1.5 max-h-[225px] overflow-y-auto pr-1">
            {habitual.employees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between p-2 rounded-xl border border-stone-200/80 bg-white"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[11px] shrink-0 border border-slate-200/60">
                    {emp.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-slate-800 truncate">
                      {emp.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {emp.designation} · {emp.note}
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                    emp.late_count >= 5
                      ? "bg-rose-50 text-rose-600 border-rose-200/80"
                      : "bg-amber-50 text-amber-600 border-amber-200/80"
                  }`}
                >
                  • {emp.late_count}× late
                </span>
              </div>
            ))}

            {habitual.employees.length === 0 && (
              <div className="text-[11px] text-slate-400 text-center py-6 bg-stone-50/40 rounded-xl border border-stone-100">
                No habitual tardiness patterns detected in past 30 days.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
