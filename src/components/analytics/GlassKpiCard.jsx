import React from "react";
import { ChevronDown, TrendingUp, TrendingDown } from "lucide-react";

const GRADIENT_THEMES = {
  indigo: {
    iconBg: "bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md shadow-indigo-500/20",
    border: "border-indigo-100/80 hover:border-indigo-300",
    accent: "text-indigo-600 bg-indigo-50",
  },
  emerald: {
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20",
    border: "border-emerald-100/80 hover:border-emerald-300",
    accent: "text-emerald-600 bg-emerald-50",
  },
  amber: {
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20",
    border: "border-amber-100/80 hover:border-amber-300",
    accent: "text-amber-600 bg-amber-50",
  },
  sky: {
    iconBg: "bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-md shadow-sky-500/20",
    border: "border-sky-100/80 hover:border-sky-300",
    accent: "text-sky-600 bg-sky-50",
  },
  violet: {
    iconBg: "bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-md shadow-violet-500/20",
    border: "border-violet-100/80 hover:border-violet-300",
    accent: "text-violet-600 bg-violet-50",
  },
  rose: {
    iconBg: "bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/20",
    border: "border-rose-100/80 hover:border-rose-300",
    accent: "text-rose-600 bg-rose-50",
  },
  slate: {
    iconBg: "bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-md shadow-slate-500/20",
    border: "border-slate-200/80 hover:border-slate-300",
    accent: "text-slate-600 bg-slate-100",
  },
};

const GlassKpiCard = ({
  icon: Icon,
  label,
  value,
  tone = "indigo",
  subtitle,
  trend,
  trendLabel,
  breakdown,
  onClick,
}) => {
  const theme = GRADIENT_THEMES[tone] || GRADIENT_THEMES.indigo;
  const hasBreakdown = Array.isArray(breakdown) && breakdown.length > 0;

  return (
    <div
      onClick={onClick}
      className={`group relative bg-white/90 backdrop-blur-md border ${theme.border} rounded-2xl p-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)] flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 ${
        onClick ? "cursor-pointer hover:ring-2 hover:ring-sky-500/40 active:scale-[0.99]" : ""
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${theme.iconBg}`}>
              {Icon && <Icon className="w-4 h-4" />}
            </div>
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider leading-tight truncate flex-1 min-w-0">
              {label}
            </div>
          </div>
          {onClick && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200/80 group-hover:bg-sky-500 group-hover:text-white transition-colors shrink-0">
              View List
            </span>
          )}
          {hasBreakdown && !onClick && <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" />}
        </div>

        <div className="flex items-center justify-between gap-1">
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono shrink-0 capitalize" title={String(value)}>
            {value}
          </div>
          {trend !== undefined && trend !== null && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-bold shrink-0 ${
                trend >= 0
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                  : "bg-rose-50 text-rose-700 border border-rose-200/80"
              }`}
              title={`${trend >= 0 ? "+" : ""}${trend}% ${trendLabel || "vs prev period"}`}
            >
              {trend >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              <span>{trend >= 0 ? `+${trend}%` : `${trend}%`}</span>
              <span className="font-semibold opacity-75">{trendLabel || "vs prev"}</span>
            </span>
          )}
        </div>

        {subtitle && (
          <div className="text-[11px] text-slate-600 font-semibold mt-1 truncate">
            {subtitle}
          </div>
        )}
      </div>

      {/* Hover Breakdown Popover */}
      {hasBreakdown && (
        <div className="pointer-events-none absolute right-0 top-full z-40 mt-1.5 w-max min-w-[220px] max-w-[320px] origin-top-right scale-95 rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-3 opacity-0 shadow-2xl transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
          <p className="px-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
            Where time went
          </p>
          <div className="space-y-1">
            {breakdown.map((b) => (
              <div key={b.stage} className="flex items-center justify-between gap-6 rounded-lg px-2 py-1 text-xs hover:bg-slate-50 font-medium">
                <span className="text-slate-600 truncate">{b.stage}</span>
                <span className="font-mono font-bold text-slate-900">{b.hours}h</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlassKpiCard;
