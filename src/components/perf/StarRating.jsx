import React, { useState } from "react";
import { Star } from "lucide-react";

const LABELS = {
  1: "Poor",
  2: "Needs Improvement",
  3: "Meets Expectations",
  4: "Exceeds Expectations",
  5: "Outstanding",
};

const STAR_SIZES = {
  "text-xs": "h-3 w-3",
  "text-sm": "h-3.5 w-3.5",
  "text-base": "h-4.5 w-4.5",
  "text-2xl": "h-6 w-6",
};

// Reusable 1–5 star rating with jitter-free hover preview and pixel-perfect SVG stars.
const StarRating = ({
  value,
  onChange,
  readOnly = false,
  showLabel = true,
  size = "text-2xl",
}) => {
  const [hover, setHover] = useState(null);
  const activeRating = hover ?? value;
  const starIconSize = STAR_SIZES[size] || "h-6 w-6";

  return (
    <div className="inline-flex items-center gap-2 select-none">
      <div
        className="flex items-center gap-1"
        onMouseLeave={() => !readOnly && setHover(null)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= (activeRating || 0);
          return (
            <button
              key={star}
              type="button"
              disabled={readOnly}
              title={LABELS[star]}
              onMouseEnter={() => !readOnly && setHover(star)}
              onClick={() =>
                !readOnly && onChange && onChange(star === value ? null : star)
              }
              className={`flex items-center justify-center p-0.5 rounded-md transition-colors duration-100 ${
                readOnly
                  ? "cursor-default"
                  : "cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
              }`}
            >
              <Star
                className={`${starIconSize} transition-colors duration-100 ${
                  isFilled
                    ? "text-amber-400 fill-amber-400 drop-shadow-[0_1px_1px_rgba(251,191,36,0.3)]"
                    : "text-slate-200 fill-slate-100 hover:text-amber-300 hover:fill-amber-100"
                }`}
              />
            </button>
          );
        })}
      </div>
      {showLabel && (
        <span
          className={`w-36 text-center text-xs px-2.5 py-0.5 rounded-full font-medium transition-colors ${
            activeRating
              ? "bg-amber-50 text-amber-700 font-semibold border border-amber-200/80 shadow-xs"
              : "text-slate-400 bg-slate-100/60 font-normal"
          }`}
        >
          {activeRating ? LABELS[activeRating] : "Not rated"}
        </span>
      )}
    </div>
  );
};

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
