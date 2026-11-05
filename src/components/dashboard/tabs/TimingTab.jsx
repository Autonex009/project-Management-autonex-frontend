import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { checkinApi } from "../../../services/api";

export default function TimingTab() {
  const [selectedBucketId, setSelectedBucketId] = useState("after_11");

  const { data, isLoading } = useQuery({
    queryKey: ["checkin-pulse", "timing"],
    queryFn: () => checkinApi.getPulseTiming(),
    staleTime: 5_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  if (isLoading && !data) {
    return (
      <div className="h-56 flex flex-col items-center justify-center space-y-2">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-[11px] text-slate-400 font-medium">Loading check-in distribution...</span>
      </div>
    );
  }

  const buckets = data?.buckets || [
    { id: "before_8", label: "<8", total: 0, wfo: 0, wfh: 0, is_late: false },
    { id: "8_9", label: "8-9", total: 0, wfo: 0, wfh: 0, is_late: false },
    { id: "9_10", label: "9-10", total: 0, wfo: 0, wfh: 0, is_late: false },
    { id: "10_11", label: "10-11", total: 0, wfo: 0, wfh: 0, is_late: false },
    { id: "after_11", label: "11+", total: 0, wfo: 0, wfh: 0, is_late: true },
  ];

  const maxTotal = Math.max(...buckets.map((b) => b.total), 1);
  const selectedBucket = buckets.find((b) => b.id === selectedBucketId) || buckets[buckets.length - 1];

  const formatBucketTimeTitle = (bucket) => {
    if (!bucket) return "";
    if (bucket.id === "before_8") return "Before 8:00 AM";
    if (bucket.id === "8_9") return "8:00 - 9:00 AM";
    if (bucket.id === "9_10") return "9:00 - 10:00 AM";
    if (bucket.id === "10_11") return "10:00 - 11:00 AM";
    if (bucket.id === "after_11") return "After 11:00 AM";
    return bucket.label;
  };

  return (
    <div className="space-y-2 text-slate-800">
      {/* Header with Title and WFO / WFH Legend */}
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400">
        <span>Check-ins by Hour</span>
        <div className="flex items-center gap-3 lowercase font-medium text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-600" /> wfo
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> wfh
          </span>
        </div>
      </div>

      {/* Stacked Histogram Chart with Explicit Height Container */}
      <div className="rounded-xl border border-stone-200/80 bg-white p-3 pt-3 shadow-xs">
        <div className="h-28 flex items-end justify-between gap-2 px-1">
          {buckets.map((bucket) => {
            const isSelected = bucket.id === selectedBucketId;
            // Height ratio normalized between 8% and 100%
            const heightPct = Math.max(8, Math.round((bucket.total / maxTotal) * 100));
            const wfoRatio = bucket.total > 0 ? bucket.wfo / bucket.total : 0.8;
            const wfhRatio = 1 - wfoRatio;

            return (
              <button
                key={bucket.id}
                type="button"
                onClick={() => setSelectedBucketId(bucket.id)}
                className="group flex-1 h-full flex flex-col justify-end items-center gap-1 focus:outline-none cursor-pointer"
              >
                {/* Total count badge above bar */}
                <span
                  className={`text-[11px] font-bold tabular-nums transition-colors ${
                    bucket.is_late
                      ? "text-rose-600"
                      : isSelected
                      ? "text-slate-900"
                      : "text-slate-500"
                  }`}
                >
                  {bucket.total}
                </span>

                {/* Bar Track Container (Guaranteed height) */}
                <div className="w-full max-w-[42px] h-[78px] flex items-end justify-center">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-md overflow-hidden flex flex-col-reverse transition-all duration-300 ${
                      isSelected
                        ? "ring-2 ring-indigo-500 ring-offset-1 shadow-sm"
                        : "opacity-85 group-hover:opacity-100"
                    }`}
                  >
                    {/* WFO bottom portion */}
                    <div
                      style={{ height: `${wfoRatio * 100}%` }}
                      className={`${isSelected ? "bg-indigo-600" : "bg-indigo-500"} w-full transition-colors`}
                    />
                    {/* WFH top portion */}
                    <div
                      style={{ height: `${wfhRatio * 100}%` }}
                      className={`${isSelected ? "bg-amber-500" : "bg-amber-400"} w-full transition-colors`}
                    />
                  </div>
                </div>

                {/* Bucket label */}
                <span
                  className={`text-[11px] font-medium transition-colors ${
                    isSelected ? "font-bold text-indigo-700" : "text-slate-500"
                  }`}
                >
                  {bucket.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Bucket Detail Banner */}
      <div className="rounded-xl border border-stone-200/80 bg-white p-2.5 flex items-center justify-between text-[11px] font-semibold shadow-xs">
        <div className="text-slate-800">
          {formatBucketTimeTitle(selectedBucket)} ·{" "}
          <span className="font-bold text-slate-900">{selectedBucket?.total} PEOPLE</span>
        </div>
        <div className="text-slate-500 font-medium">
          WFO <span className="font-bold text-slate-800">{selectedBucket?.wfo}</span> · WFH{" "}
          <span className="font-bold text-slate-800">{selectedBucket?.wfh}</span>
        </div>
      </div>

      {/* Employee List for Selected Hour: 4 items visible, rest scrollable */}
      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center justify-between text-[11px] px-0.5">
          <span className="font-semibold text-slate-700">
            Arrivals ({selectedBucket?.employees?.length || 0})
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            Tap any bar to switch
          </span>
        </div>

        <div className="space-y-1.5 max-h-[195px] overflow-y-auto pr-1">
          {(selectedBucket?.employees || []).map((emp) => (
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
                    {emp.designation || "Employee"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-mono font-semibold text-slate-600">
                  {emp.time}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                    emp.work_mode === "WFO"
                      ? "text-indigo-700 bg-indigo-50 border-indigo-200/60"
                      : "text-amber-700 bg-amber-50 border-amber-200/60"
                  }`}
                >
                  {emp.work_mode} {emp.office_floor ? `· F${emp.office_floor}` : ""}
                </span>
              </div>
            </div>
          ))}

          {(!selectedBucket?.employees || selectedBucket.employees.length === 0) && (
            <div className="text-[11px] text-slate-400 text-center py-6 bg-stone-50/40 rounded-xl border border-stone-100">
              No check-ins recorded in this time window.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
