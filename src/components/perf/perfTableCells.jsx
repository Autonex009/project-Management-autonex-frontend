import React from "react";
import { CheckCircle2, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import StarRating, { formatPeriod, shiftPeriod } from "./StarRating";
import { normalizeParamValues } from "./perfParams";
import { formatDisplayName } from "../../utils/displayName";

// Shared row cells for any table of PerfEvaluation rows (Admin's Employees/History
// tabs, a PM's team History tab, and the self-eval History tab) so the three don't
// each reimplement the same status pill / date format / rating breakdown popover.

export const StatusPill = ({ status }) =>
  status === "reviewed" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
      <CheckCircle2 className="h-3 w-3" /> Reviewed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
      <Lock className="h-3 w-3" /> Submitted
    </span>
  );

export const fmtDate = (v) =>
  v
    ? new Date(v).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

// Overall-rating cell: compact stars + score, with a hover popover that breaks
// the score down into per-parameter stars (PM rating once reviewed, else self).
export const RatingCell = ({ evaluation }) => {
  const rating =
    evaluation.overall_rating ?? evaluation.employee_overall_rating;
  const reviewed = evaluation.status === "reviewed";
  const params = normalizeParamValues(evaluation.parameter_values);
  return (
    <div className="group/rt relative inline-flex cursor-help items-center justify-end gap-2">
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-700">
        {rating != null ? Number(rating).toFixed(1) : "—"} / 5
      </span>
      <div className="pointer-events-none absolute right-0 top-full z-40 mt-2 hidden w-64 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl group-hover/rt:block">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {reviewed ? "PM rating breakdown" : "Self rating breakdown"}
        </p>
        <div className="space-y-1.5">
          {params.length === 0 && (
            <p className="text-xs text-slate-400">No parameter ratings</p>
          )}
          {params.map((p) => (
            <div
              key={formatDisplayName(p.name)}
              className="flex items-center justify-between gap-3"
            >
              <span className="truncate text-xs text-slate-600">{formatDisplayName(p.name)}</span>
              <StarRating
                value={Math.round(
                  (reviewed ? p.pm_rating : p.employee_rating) || 0,
                )}
                readOnly
                showLabel={false}
                size="text-xs"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// A one-month-at-a-time navigator for History views — browsing a single review
// cycle at a time instead of a flat, repeated "Period" column on every row.
// `max` (a "YYYY-MM" string) caps how far forward it can go, typically the last
// closed cycle, so History can't be stepped into the still-active period.
export const MonthStepper = ({ period, onChange, max }) => {
  const disabledNext = max != null && period >= max;
  return (
    <div className="flex items-center justify-center gap-3 py-1">
      <button
        type="button"
        onClick={() => onChange(shiftPeriod(period, -1))}
        aria-label="Previous month"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-[140px] text-center text-[13px] font-semibold text-slate-800">
        {formatPeriod(period)}
      </span>
      <button
        type="button"
        onClick={() => onChange(shiftPeriod(period, 1))}
        disabled={disabledNext}
        aria-label="Next month"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};
