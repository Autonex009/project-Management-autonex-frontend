import React, { Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, LayoutGrid, Clock, AlertCircle } from "lucide-react";
import { checkinApi } from "../../services/api";
import OverviewTab from "./tabs/OverviewTab";

// Code-split secondary tabs
const TimingTab = lazy(() => import("./tabs/TimingTab"));
const AttentionTab = lazy(() => import("./tabs/AttentionTab"));

function TabLoadingFallback() {
  return (
    <div className="h-44 flex flex-col items-center justify-center space-y-2">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-[11px] text-slate-400 font-medium">Loading view...</span>
    </div>
  );
}

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "timing", label: "Timing", icon: Clock },
  { key: "attention", label: "Attention", icon: AlertCircle },
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
    staleTime: 30_000,
    refetchInterval: 45_000,
    refetchOnWindowFocus: false,
  });

  const attentionBadgeCount = overview?.attention_badge_count || 25;

  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-3.5 shadow-[0_1px_3px_rgba(28,25,23,0.05)] h-full ${className}`}
    >
      {/* Header bar matching Encord Activity header */}
      <div className="flex shrink-0 items-center justify-between gap-2 pb-1 border-b border-stone-100/60">
        <div className="flex items-center gap-2">
          {/* Styled Icon Tile with subtle rounding */}
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-blue-200/90 bg-blue-50/80 text-blue-600 shadow-2xs">
            <Calendar className="h-3.5 w-3.5" />
          </span>
          <div>
            <h3 className="text-[13.5px] font-bold text-slate-900 leading-tight">
              Check-in summary
            </h3>
            <p className="text-[11px] text-slate-400 font-medium leading-tight">
              Today
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5 border border-slate-200/70">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => handleTabChange(t.key)}
                className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className={`h-3 w-3 ${isActive ? "text-slate-800" : "text-slate-400"}`} />
                <span>{t.label}</span>
                {t.key === "attention" && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-bold leading-tight">
                    {attentionBadgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Body */}
      <div className="flex-1 flex flex-col justify-between pt-1">
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
