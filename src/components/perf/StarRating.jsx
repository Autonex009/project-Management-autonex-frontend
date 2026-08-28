import React from "react";

const LABELS = {
  1: "Poor",
  2: "Needs Improvement",
  3: "Meets Expectations",
  4: "Exceeds Expectations",
  5: "Outstanding",
};

// Reusable 1–5 star rating. readOnly renders static stars.
const StarRating = ({
  value,
  onChange,
  readOnly = false,
  showLabel = true,
  size = "text-2xl",
}) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        disabled={readOnly}
        title={LABELS[star]}
        onClick={() =>
          !readOnly && onChange && onChange(star === value ? null : star)
        }
        className={`${size} leading-none transition-transform ${readOnly ? "cursor-default" : "cursor-pointer hover:scale-110"} ${star <= (value || 0) ? "text-amber-400" : "text-slate-200"}`}
      >
        ★
      </button>
    ))}
    {showLabel && (
      <span className="ml-2 text-xs font-medium text-slate-400">
        {value ? LABELS[value] : "Not rated"}
      </span>
    )}
  </div>
);

export const RATING_LABELS = LABELS;

/**
 * The active review period, as "YYYY-MM". Evaluated in IST regardless of the
 * browser's timezone (same reasoning as halfDayTiming.js's getISTDateTime).
 *
 * The review cycle remains open until the last day of the current month,
 * rolling over on the 1st of the next month.
 */
export const currentPeriod = () => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  
  return `${parts.year}-${parts.month}`;
};

export const formatPeriod = (period) => {
  if (!period) return "";
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

// Add `delta` months to a "YYYY-MM" period, rolling the year over as needed.
export const shiftPeriod = (period, delta) => {
  const [y, m] = period.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  const year = Math.floor(total / 12);
  const month = (((total % 12) + 12) % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
};

export default StarRating;
