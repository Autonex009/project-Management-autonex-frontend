import React from "react";
import Button from "../ui/Button";
import { RefreshCw, Sparkles, CheckCircle2 } from "lucide-react";

const AnalyticsHeroHeader = ({
  title = "Analytics & Intelligence Suite",
  subtitle = "Real-time visibility into project health, Encord platform execution, and capacity utilization",
  ranges = [],
  activeRange = "30",
  onRangeChange,
  onSyncClick,
  syncBusy = false,
  activeJobId = null,
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-stone-200 p-4 sm:p-5 shadow-[0_1px_4px_rgba(28,25,23,0.06)]">
      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Column: Title & Live Badge */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 px-3 py-1 text-xs font-bold text-indigo-700">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
              Live Workspace Analytics
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Encord Sync Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed font-medium">
            {subtitle}
          </p>
        </div>

        {/* Right Column: Controls & Range Switches */}
        <div className="flex flex-wrap items-center gap-3">
          {ranges.length > 0 && (
            <div className="inline-flex items-center rounded-2xl bg-slate-100/90 p-1 border border-slate-200/80 select-none">
              {ranges.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => onRangeChange(r.key)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    activeRange === r.key
                      ? "bg-white text-indigo-600 shadow-xs ring-1 ring-slate-200/70 font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}

          <Button
            variant="primary"
            size="md"
            onClick={onSyncClick}
            disabled={syncBusy}
            className="rounded-2xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncBusy ? "animate-spin" : ""}`} />
            <span>
              {syncBusy
                ? "Syncing…"
                : activeJobId
                ? "Check sync status"
                : "Sync Data"}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsHeroHeader;
