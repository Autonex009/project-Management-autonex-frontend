import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

// Clean metric KPI card (reference design): a small icon tile + title on top,
// a big tabular number (with optional unit), and a delta / hint line below
// e.g. "+5% vs last month".
// Solid gradient icon tiles (white glyph) — one gradient per tone.
const ICON_TONES = {
  slate: "from-slate-500 to-slate-600",
  emerald: "from-emerald-500 to-green-600",
  rose: "from-rose-500 to-pink-600",
  violet: "from-violet-500 to-purple-600",
  sky: "from-sky-500 to-blue-600",
  amber: "from-amber-500 to-orange-500",
  indigo: "from-indigo-500 to-indigo-600",
};

const VIEWPORT_PAD = 12; // keep the popover this far inside the viewport
const GAP = 8; // gap between the card and the popover (matches the pt-2 bridge)

// This card is server-rendered, and useLayoutEffect is a no-op (plus a warning)
// on the server. The measurement only ever runs after a client interaction.
const useMeasureEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const StatCard = ({
  title,
  value,
  unit,
  icon: Icon,
  tone = "slate",
  delta,
  hint,
  label,
  breakdown,
  breakdownTabs,
  breakdownFooter,
  breakdownActionLabel = "View all",
  // Tighter padding and type scale for dense KPI rows. Only the card chrome
  // changes — the popover is identical, so a compact card reads the same on hover.
  compact = false,
  // Value on the same row as the icon and title instead of below it, which halves
  // the card height. For rows of plain counts where the number needs no room to
  // breathe — a card with a `delta`/`hint`/`label` still stacks those underneath.
  inline = false,
  onClick,
}) => {
  const iconTone = ICON_TONES[tone] || ICON_TONES.slate;

  // `breakdown` takes either a flat [{ label, value }] list or a sectioned
  // [{ title, rows: [...] }] list — normalise both to sections so the popover
  // has one shape to render.
  const toSections = (source) =>
    !source?.length
      ? []
      : source[0]?.rows
        ? source.filter((s) => s.rows?.length)
        : [{ rows: source }];

  // `breakdownTabs` is [{ label, sections }] — the same breakdown cut more than
  // one way (e.g. by designation vs by employment type) behind a tab strip.
  const tabs = (breakdownTabs || [])
    .map((tab) => ({ ...tab, sections: toSections(tab.sections) }))
    .filter((tab) => tab.sections.length > 0);

  const [activeTab, setActiveTab] = useState(0);
  const tabIndex = Math.min(activeTab, Math.max(tabs.length - 1, 0));
  const sections = tabs.length
    ? tabs[tabIndex].sections
    : toSections(breakdown);
  const hasBreakdown = sections.some((s) => s.rows.length > 0);

  // Hover previews the breakdown; a click pins it open until the next click
  // (on the card again, outside it, or Escape).
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  // Dismissing by click happens while the pointer is still on the card, so hover
  // alone would immediately re-open it. Suppress hover until the pointer leaves.
  const [suppressed, setSuppressed] = useState(false);
  const open = hasBreakdown && (pinned || (hovered && !suppressed));

  const cardRef = useRef(null);
  const popRef = useRef(null);
  // Horizontal nudge + vertical flip so edge cards don't spill off-screen.
  const [shiftX, setShiftX] = useState(0);
  const [above, setAbove] = useState(false);

  useMeasureEffect(() => {
    if (!open || !cardRef.current || !popRef.current) return;
    // offsetWidth/Height are layout values, so the open transition's `scale`
    // doesn't skew the measurement the way getBoundingClientRect would.
    const card = cardRef.current.getBoundingClientRect();
    const popW = popRef.current.offsetWidth;
    const popH = popRef.current.offsetHeight;

    const left = card.left + card.width / 2 - popW / 2;
    let nudge = 0;
    if (left + popW > window.innerWidth - VIEWPORT_PAD) {
      nudge = window.innerWidth - VIEWPORT_PAD - (left + popW);
    } else if (left < VIEWPORT_PAD) {
      nudge = VIEWPORT_PAD - left;
    }
    setShiftX(nudge);

    const fitsBelow = card.bottom + GAP + popH <= window.innerHeight - VIEWPORT_PAD;
    const fitsAbove = card.top - GAP - popH >= VIEWPORT_PAD;
    setAbove(!fitsBelow && fitsAbove);
    // Switching tabs changes the popover's height, so re-measure to keep the
    // flip-above decision and the viewport clamp correct.
  }, [open, sections.length, tabIndex]);

  // Pinned-only dismissals: click anywhere outside, or Escape.
  useEffect(() => {
    if (!pinned) return;
    const onPointerDown = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) setPinned(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setPinned(false);
        setSuppressed(true);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pinned]);

  // Without a breakdown the whole card is the action; with one, the click pins
  // the popover and the action moves into its footer.
  const handleCardClick = () => {
    if (!hasBreakdown) {
      onClick?.();
      return;
    }
    if (open) {
      setPinned(false);
      setSuppressed(true);
    } else {
      setPinned(true);
      setSuppressed(false);
    }
  };

  const interactive = hasBreakdown || onClick;

  const iconTile = Icon && (
    <span
      className={`flex shrink-0 items-center justify-center bg-gradient-to-br ${iconTone} text-white shadow-sm ${
        compact || inline ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-xl"
      }`}
    >
      <Icon className={compact || inline ? "h-4 w-4" : "h-[18px] w-[18px]"} />
    </span>
  );

  const chevron = hasBreakdown && (
    <ChevronDown
      className={`ml-auto h-3.5 w-3.5 shrink-0 text-slate-300 transition-[transform,color] duration-150 group-hover:text-slate-400 ${
        open ? "rotate-180 text-slate-400" : ""
      }`}
    />
  );

  const getValueFontSize = () => {
    if (inline) return "text-[20px]";
    const valStr = String(value ?? "");
    if (valStr.length > 20) return "text-sm font-semibold";
    if (valStr.length > 15) return "text-base font-semibold";
    if (valStr.length > 10) return "text-lg font-bold";
    return compact ? "text-[20px]" : "text-[24px]";
  };

  const valueRow = (
    <div className="flex items-baseline gap-1 min-w-0 pb-0.5">
      <span
        className={`font-bold leading-normal tracking-tight text-slate-900 tabular-nums truncate ${getValueFontSize()}`}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </span>
      {unit && <span className="text-sm font-medium text-slate-400">{unit}</span>}
    </div>
  );

  return (
    <div
      ref={cardRef}
      onClick={handleCardClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setSuppressed(false);
      }}
      onKeyDown={(e) => {
        if (!interactive) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-expanded={hasBreakdown ? open : undefined}
      className={`group relative rounded-xl border bg-white ${inline ? "px-3.5 py-3" : compact ? "px-3 py-2.5" : "p-3"} shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
        pinned ? "border-slate-300" : "border-slate-200 hover:border-slate-300"
      } ${interactive ? "cursor-pointer" : ""}`}
    >
      {inline ? (
        // Icon left, number over its caption on the right — the whole card is one
        // horizontal band, so a row of these takes half the vertical space.
        <div className="flex items-center gap-3">
          {iconTile}
          <div className="min-w-0">
            {valueRow}
            <p className="mt-1 truncate text-[12px] font-medium text-slate-500">
              {title}
            </p>
          </div>
          {chevron}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2.5">
            {iconTile}
            <span
              className={`truncate font-medium text-slate-600 ${compact ? "text-[12px]" : "text-[13px]"}`}
            >
              {title}
            </span>
            {chevron}
          </div>

          {/* Mono, like the other micro-copy: short metric captions read as data,
              not prose, and a fixed pitch keeps them aligned between sibling cards. */}
          {label && (
            <p
              className={`font-mono font-medium text-slate-400 ${compact ? "mt-1.5 text-[11px]" : "mt-2.5 text-[12px]"}`}
            >
              {label}
            </p>
          )}

          <div
            className={label ? "mt-0.5" : compact ? "mt-1.5" : "mt-2"}
          >
            {valueRow}
          </div>
        </>
      )}

      {(delta || hint) && (
        <div
          className={`flex items-center gap-1.5 text-xs ${compact ? "mt-1.5" : "mt-2"}`}
        >
          {delta && (
            <span
              className={`font-semibold tabular-nums ${delta.positive ? "text-emerald-600" : "text-red-500"}`}
            >
              {delta.positive ? "+" : ""}
              {delta.value}
            </span>
          )}
          {/* A string hint is muted supporting text; a node brings its own colour
              (the Total Employees card colour-codes each bucket). */}
          {hint &&
            (typeof hint === "string" ? (
              <span className="text-slate-400">{hint}</span>
            ) : (
              hint
            ))}
        </div>
      )}

      {hasBreakdown && (
        // Outer wrapper is a transparent bridge across the 8px gap so moving the
        // pointer from the card into the popover never crosses a dead zone.
        <div
          className={`absolute left-1/2 z-50 ${above ? "bottom-full pb-2" : "top-full pt-2"} ${
            open ? "" : "pointer-events-none"
          }`}
          style={{ transform: `translateX(calc(-50% + ${shiftX}px))` }}
        >
          <div
            ref={popRef}
            role="dialog"
            aria-label={`${title} breakdown`}
            onClick={(e) => e.stopPropagation()}
            className={`w-[17rem] overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_2px_6px_-2px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)] ring-1 ring-slate-900/[0.03] transition-[opacity,transform] duration-150 ease-out ${
              above ? "origin-bottom" : "origin-top"
            } ${open ? "translate-y-0 scale-100 opacity-100" : `${above ? "translate-y-1" : "-translate-y-1"} scale-[0.97] opacity-0`}`}
          >
            <div className="flex items-baseline justify-between gap-2 px-3 pb-2 pt-2.5">
              <p className="truncate text-[13px] font-semibold text-slate-900">
                {title}
              </p>
              <p className="shrink-0 font-mono text-[13px] font-semibold tabular-nums text-slate-900">
                {value}
              </p>
            </div>

            {tabs.length > 1 && (
              <div
                role="tablist"
                className="mx-1.5 mb-1 flex items-center gap-0.5 rounded-lg bg-slate-100/80 p-0.5"
              >
                {tabs.map((tab, i) => (
                  <button
                    key={tab.label || i}
                    type="button"
                    role="tab"
                    aria-selected={i === tabIndex}
                    onClick={() => setActiveTab(i)}
                    className={`flex-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                      i === tabIndex
                        ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            <div className="max-h-[min(60vh,24rem)] overflow-y-auto px-1.5 pb-1.5">
              {sections.map((section, i) => (
                <div
                  key={section.title || i}
                  className={i === 0 ? "" : "mt-1 border-t border-slate-100 pt-1"}
                >
                  {section.title && (
                    <p className="px-1.5 pb-1 pt-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                      {section.title}
                    </p>
                  )}
                  {section.rows.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between gap-3 rounded-md px-1.5 py-1 transition-colors hover:bg-slate-50"
                    >
                      <span className="truncate text-[13px] text-slate-600">
                        {row.label}
                      </span>
                      <span className="shrink-0 font-mono text-[13px] font-semibold tabular-nums text-slate-900">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {(breakdownFooter || onClick) && (
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-3 py-2">
                <p className="truncate font-mono text-[11px] text-slate-500">
                  {breakdownFooter}
                </p>
                {onClick && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPinned(false);
                      onClick();
                    }}
                    className="shrink-0 text-[11px] font-semibold text-indigo-600 transition-colors hover:text-indigo-700"
                  >
                    {breakdownActionLabel} →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatCard;
