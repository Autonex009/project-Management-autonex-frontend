import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

// Two related metrics sharing one card, divided across its height — so a pair of
// small stats (Leave / WFH) occupies the same grid slot as a single StatCard
// instead of making the KPI row twice as tall.
//
// Each half owns its own hover popover, its own tab strip, and its own click
// target, because they navigate to different places. Names inside the popover are
// individually clickable so you can jump straight to that person's requests.

const ICON_TONES = {
  slate: "from-slate-500 to-slate-600",
  emerald: "from-emerald-500 to-green-600",
  rose: "from-rose-500 to-pink-600",
  violet: "from-violet-500 to-purple-600",
  sky: "from-sky-500 to-blue-600",
  amber: "from-amber-500 to-orange-500",
  indigo: "from-indigo-500 to-indigo-600",
};

/**
 * @param halves [{
 *   key, title, icon, tone,
 *   stats: [{ value, label, tone? }],
 *   tabs: [{ label, people: [{ id, name, meta }] }],
 *   emptyLabel,
 *   onClick,                 // half clicked -> open the full page
 *   onSelectPerson,          // (person) -> open the page filtered to them
 * }]
 */
const SplitStatCard = ({ halves = [] }) => {
  const [openKey, setOpenKey] = useState(null);
  // Tab choice is remembered per half, so switching halves doesn't reset it.
  const [tabByHalf, setTabByHalf] = useState({});

  return (
    <div className="relative flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {halves.map((half) => {
        const iconTone = ICON_TONES[half.tone] || ICON_TONES.slate;
        const isOpen = openKey === half.key;
        const tabs = half.tabs || [];
        // Default to the first tab that actually has people — usually "Today",
        // but falling through to Future/Past keeps the popover from opening empty.
        const fallbackTab = Math.max(
          tabs.findIndex((t) => t.people?.length),
          0,
        );
        const activeIdx = Math.min(
          tabByHalf[half.key] ?? fallbackTab,
          Math.max(tabs.length - 1, 0),
        );
        const activeTab = tabs[activeIdx];
        const people = activeTab?.people || [];

        return (
          <div
            key={half.key}
            onMouseEnter={() => setOpenKey(half.key)}
            onMouseLeave={() => setOpenKey(null)}
            onClick={half.onClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                half.onClick?.();
              }
            }}
            role="button"
            tabIndex={0}
            className="group relative flex flex-1 cursor-pointer items-center gap-2.5 px-3 py-2.5 transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-slate-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500/40"
          >
            {half.icon && (
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${iconTone} text-white shadow-sm`}
              >
                <half.icon className="h-4 w-4" />
              </span>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-slate-600">
                {half.title}
              </p>
              <div className="mt-0.5 flex items-center gap-3">
                {(half.stats || []).map((stat) => (
                  <span
                    key={stat.label}
                    className="inline-flex items-baseline gap-1"
                  >
                    <span
                      className={`font-mono text-[17px] font-bold leading-none tabular-nums ${stat.tone || "text-slate-900"}`}
                    >
                      {stat.value}
                    </span>
                    <span className="font-mono text-[11px] font-medium text-slate-400">
                      {stat.label}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 text-slate-300 transition-[transform,color] duration-150 group-hover:text-slate-400 ${
                isOpen ? "rotate-180 text-slate-400" : ""
              }`}
            />

            {/* Anchored to this half; pt-2 doubles as a hover bridge so moving
                into the popover never crosses a dead zone. */}
            <div
              className={`absolute right-0 top-full z-50 pt-2 ${
                isOpen ? "" : "pointer-events-none"
              }`}
            >
              <div
                role="dialog"
                aria-label={`${half.title} detail`}
                // Clicks inside must not fall through to the half's onClick,
                // which would navigate away from the person you just picked.
                onClick={(e) => e.stopPropagation()}
                className={`w-[17rem] overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-8px_rgba(15,23,42,0.14)] transition-[opacity,transform] duration-150 ease-out ${
                  isOpen
                    ? "translate-y-0 scale-100 opacity-100"
                    : "-translate-y-1 scale-[0.97] opacity-0"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2 px-3 pb-2 pt-2.5">
                  <p className="truncate text-[13px] font-semibold text-slate-900">
                    {half.title} · pending review
                  </p>
                </div>

                {tabs.length > 1 && (
                  <div
                    role="tablist"
                    className="mx-1.5 mb-1 flex items-center gap-0.5 rounded-lg bg-slate-100/80 p-0.5"
                  >
                    {tabs.map((tab, i) => (
                      <button
                        key={tab.label}
                        type="button"
                        role="tab"
                        aria-selected={i === activeIdx}
                        onClick={() =>
                          setTabByHalf((prev) => ({ ...prev, [half.key]: i }))
                        }
                        className={`flex-1 rounded-md px-1.5 py-1 text-[11px] font-semibold transition-colors ${
                          i === activeIdx
                            ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {tab.label}
                        {tab.people?.length ? (
                          <span className="ml-1 tabular-nums text-slate-400">
                            {tab.people.length}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}

                <div className="max-h-[min(50vh,16rem)] overflow-y-auto px-1.5 pb-1.5">
                  {people.length === 0 ? (
                    <p className="px-2 py-4 text-center text-[12px] text-slate-400">
                      {half.emptyLabel || "Nothing to review"}
                    </p>
                  ) : (
                    people.map((person, idx) => (
                      <button
                        key={person.id ?? `${person.name}-${idx}`}
                        type="button"
                        onClick={() => half.onSelectPerson?.(person)}
                        title={`Open ${person.name} in ${half.title}`}
                        className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-indigo-50/70"
                      >
                        <span className="truncate text-[13px] text-slate-700">
                          {person.name}
                        </span>
                        {person.meta && (
                          <span className="shrink-0 text-[11px] tabular-nums text-slate-400">
                            {person.meta}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>

                <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-1.5 text-right">
                  <button
                    type="button"
                    onClick={half.onClick}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    View all &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SplitStatCard;
