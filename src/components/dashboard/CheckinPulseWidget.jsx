import React, { Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { checkinApi } from "../../services/api";
import OverviewTab from "./tabs/OverviewTab";

// Code-split secondary tabs
const TimingTab = lazy(() => import("./tabs/TimingTab"));
const AttentionTab = lazy(() => import("./tabs/AttentionTab"));

function TabLoadingFallback() {
  return (
    <div className="h-56 flex flex-col items-center justify-center space-y-2">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-[11px] text-slate-400 font-medium">Loading view...</span>
    </div>
  );
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "timing", label: "Timing" },
  { key: "attention", label: "Attention" },
];

export default function CheckinPulseWidget({ className = "" }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get("pulseTab") || "overview";

  const handleTabChange = (tab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === "overview") {
        next.delete("pulseTab");
      } else {
        next.set("pulseTab", tab);
      }
      return next;
    });
  };

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["checkin-pulse", "overview"],
    queryFn: () => checkinApi.getPulseOverview(),
    staleTime: 5_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const attentionBadgeCount = overview?.attention_badge_count || 0;

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_1px_4px_rgba(28,25,23,0.06)] ${className}`}
    >
      {/* Header bar: Exact match to Encord Activity header (no bottom border, compact density) */}
      <div className="flex shrink-0 items-center justify-between gap-2 px-3.5 pb-1.5 pt-2.5">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <h3 className="text-[13px] font-semibold text-slate-900 whitespace-nowrap">
            Checkin Summary
          </h3>
          <span className="truncate font-mono text-[11px] text-slate-400">
            / today · IST
          </span>
        </div>

        {/* Tab Switcher: Exact Encord Activity Segmented Pill */}
        <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5 ring-1 ring-inset ring-slate-200/60">
          {TABS.map((t) => {
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => handleTabChange(t.key)}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-slate-950/5"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <span>{t.label}</span>
                {t.key === "attention" && attentionBadgeCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-bold">
                    {attentionBadgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Body: Sits tightly beneath header with no extra vertical gap */}
      <div className="px-2 pt-0 pb-2.5 flex-1">
        {activeTab === "overview" && (
          <OverviewTab data={overview} loading={overviewLoading} />
        )}

        {activeTab === "timing" && (
          <Suspense fallback={<TabLoadingFallback />}>
            <TimingTab />
          </Suspense>
        )}

        {activeTab === "attention" && (
          <Suspense fallback={<TabLoadingFallback />}>
            <AttentionTab />
          </Suspense>
        )}
      </div>
    </div>
  );
}
