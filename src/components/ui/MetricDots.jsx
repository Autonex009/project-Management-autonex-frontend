import React from "react";

// The small "39 active · 2 archived" micro-copy that sits under a KPI figure.
//
// Set in a monospaced face on purpose: these are dense number-plus-unit fragments
// read by comparison, and a mono face keeps the digits on a fixed pitch so the
// values line up column-wise between sibling cards instead of drifting with the
// proportional widths of "1" vs "8". Headings and names stay in the app's sans
// face — only the figures go mono.
//
// items: [{ label, value, dot, tone }]
//   dot  — background class for the leading swatch (omit for no swatch)
//   tone — text colour class for the value (defaults to primary ink)
const MetricDots = ({
  items = [],
  spread = false,
  labelFirst = false,
  className = "",
}) => {
  const visible = items.filter(Boolean);
  if (visible.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center font-mono ${
        spread ? "justify-between gap-x-2 gap-y-1" : "gap-x-2.5 gap-y-1"
      } ${className}`}
    >
      {visible.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1">
          {item.dot && (
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.dot}`} />
          )}
          {labelFirst ? (
            <>
              <span className="text-[11px] text-slate-500">{item.label}</span>
              <span
                className={`text-[11px] font-semibold tabular-nums ${item.tone || "text-slate-800"}`}
              >
                {item.value}
              </span>
            </>
          ) : (
            <>
              <span
                className={`text-[12px] font-bold tabular-nums ${item.tone || "text-slate-800"}`}
              >
                {item.value}
              </span>
              <span className="text-[11px] text-slate-400">{item.label}</span>
            </>
          )}
        </span>
      ))}
    </div>
  );
};

export default MetricDots;
