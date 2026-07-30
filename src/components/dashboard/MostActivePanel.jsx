import React, { useMemo, useState } from "react";
import { Clock, ArrowUpRight, BarChart3 } from "lucide-react";
import Button from "../ui/Button";

// "Most active" panel, laid out like the reference account card: a header bar with
// tabs, an inset hero block (headline figure + sparkline), a share-of-total meter,
// a ranked list, and a footer action bar.
//
// Two tabs read the same month of Encord time data — Users and Projects — so the
// hero figure (total platform hours) is shared and only the leaderboard changes.

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Parse the Y-M-D parts directly; going through Date() would reparse as UTC
// midnight and can shift the label by a day in IST.
const monthLabel = (iso) => {
  const [, m] = String(iso || "")
    .slice(0, 10)
    .split("-");
  return m ? MONTHS[Number(m) - 1] : "";
};

const fmtHours = (h) =>
  Number(h || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });

const TICKS = 48;

/**
 * Single-series sparkline as inline SVG — no chart library, so it renders
 * identically on the server and needs no ResponsiveContainer.
 *
 * One series means there is no legend and no categorical palette to validate:
 * the amber ramp carries magnitude only, and the axis labels stay in muted ink
 * rather than the series colour.
 */
const Sparkline = ({ data, onHoverPoint }) => {
  const W = 220;
  const H = 56;
  const pts = data.filter((d) => d && d.date);

  const geometry = useMemo(() => {
    if (pts.length < 2) return null;
    const max = Math.max(...pts.map((p) => Number(p.hours) || 0), 1);
    const stepX = W / (pts.length - 1);
    const coords = pts.map((p, i) => {
      const x = i * stepX;
      // 2px inset top and bottom so the 2px stroke is never clipped.
      const y = H - 2 - ((Number(p.hours) || 0) / max) * (H - 4);
      return { x, y };
    });
    const line = coords
      .map((c, i) => `${i ? "L" : "M"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
      .join(" ");
    return { coords, line, area: `${line} L${W},${H} L0,${H} Z` };
  }, [pts]);

  if (!geometry) {
    return (
      <div className="flex h-[48px] min-w-[80px] max-w-[280px] flex-1 items-end justify-center text-[10px] text-slate-300">
        Not enough data
      </div>
    );
  }

  // Label the ends and the middle only — a label per point is unreadable at this size.
  const labelIdx = [0, Math.floor(pts.length / 2), pts.length - 1];

  return (
    // Elastic: takes whatever the figure leaves over — wide when the card is
    // wide, down to 80px when it isn't. The viewBox scales the marks, so nothing
    // is redrawn at any size.
    <div className="min-w-[80px] max-w-[280px] flex-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-[48px] w-full overflow-visible"
        role="img"
        aria-label="Daily platform hours over the last 30 days"
        onMouseLeave={() => onHoverPoint?.(null)}
      >
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={geometry.area} fill="url(#sparkFill)" />
        <path
          d={geometry.line}
          fill="none"
          stroke="#f97316"
          // The box is elastic, so the viewBox scale varies. non-scaling-stroke
          // keeps the line exactly 2px on screen at every width instead of
          // thinning out when compact and thickening when wide.
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Invisible hit targets, wider than the marks, so hovering is forgiving. */}
        {geometry.coords.map((c, i) => (
          <rect
            key={i}
            x={c.x - W / pts.length / 2}
            y={0}
            width={W / pts.length}
            height={H}
            fill="transparent"
            onMouseEnter={() => onHoverPoint?.(pts[i])}
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[9px] uppercase tracking-wider text-slate-400">
        {labelIdx.map((i, n) => (
          <span key={n}>{monthLabel(pts[i]?.date)}</span>
        ))}
      </div>
    </div>
  );
};

// Share-of-total meter drawn as discrete ticks, matching the reference card. The
// ticks flex so the meter fills whatever width the card has instead of
// overflowing it at a fixed 3px each.
const TickMeter = ({ pct }) => {
  const filled = Math.round((Math.min(Math.max(pct, 0), 100) / 100) * TICKS);
  return (
    <div className="flex w-full items-center gap-[2px]" aria-hidden="true">
      {Array.from({ length: TICKS }, (_, i) => (
        <span
          key={i}
          className={`h-3 min-w-[2px] flex-1 rounded-sm ${i < filled ? "bg-orange-500" : "bg-slate-200"}`}
        />
      ))}
    </div>
  );
};

const TABS = [
  { key: "users", label: "Users" },
  { key: "projects", label: "Projects" },
];

const MostActivePanel = ({
  overview,
  daily = [],
  onViewAnalytics,
  onOpenProject,
  onViewAllUsers,
}) => {
  const [tab, setTab] = useState("users");
  const [hovered, setHovered] = useState(null);

  const totalHours = Number(overview?.autonex_total_hours || 0);
  const topUsers = overview?.top_users || [];
  const topProjects = overview?.top_projects || [];

  const isUsers = tab === "users";
  const rows = isUsers
    ? topUsers.map((u) => ({
        id: u.user_email,
        name: u.employee_name || u.user_email,
        sub: u.employee_name ? u.user_email : "Autonex account",
        hours: Number(u.hours || 0),
        onClick: onViewAllUsers,
      }))
    : topProjects.map((p) => ({
        id: p.encord_project_hash,
        name: p.name,
        sub: p.project_id ? "Open analytics" : "Unmapped project",
        hours: Number(p.hours || 0),
        onClick: p.project_id ? () => onOpenProject?.(p.project_id) : undefined,
      }));

  const leader = rows[0];
  // Share of the month's platform hours held by the leader — the headline figure
  // and the meter therefore always describe the same denominator.
  const leaderPct =
    totalHours > 0 && leader ? (leader.hours / totalHours) * 100 : 0;

  return (
    // Same shell as the Project Status card next to it — white, so the two read
    // as one surface rather than one panel sitting on a tinted tray.
    //
    // From lg up the height is FIXED at the most it can have: the viewport less
    // the layout's chrome — 8+8 panel margin, 2 border, 48 header, 16+24 main
    // padding = 106px, taken as 7rem for slack. This panel is the tallest thing
    // on the dashboard, so pinning it here is what stops the page scrolling, and
    // the ranked list below absorbs whatever height is left. Under lg the columns
    // stack and it goes back to its natural height.
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] lg:h-[calc(100vh-7rem)]">
      {/* Header bar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-4 pb-2.5 pt-3.5">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <h3 className="text-[13px] font-semibold text-slate-900">
            Most active
          </h3>
          <span className="truncate font-mono text-[11px] text-slate-400">
            / this month
          </span>
        </div>
        {/* Lighter track: slate-200 was tuned against a tinted card and reads heavy
            on white, where the active pill's own shadow does the work. */}
        <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5 ring-1 ring-inset ring-slate-200/60">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                tab === t.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hero block. container-type makes the cqw units below measure THIS card
          rather than the viewport, so the figure responds to the width it
          actually has — the dashboard column is narrower than the window. */}
      <div
        className="mx-2 shrink-0 rounded-xl border border-slate-200/60 bg-white p-3.5"
        style={{ containerType: "inline-size" }}
      >
        {/* Figure and sparkline stay side by side at every width; when space runs
            short the headline scales down instead of the chart dropping onto a
            half-empty row of its own. */}
        <div className="flex items-start justify-between gap-4">
          {/* Sized to its own content (the figure) and allowed to shrink, never
              to grow — the leftover width belongs to the chart. overflow-hidden
              is the hard guarantee: without it flexbox shrinks this column below
              the figure's width and an unbreakable "10,634.8" paints straight
              over the marks. */}
          <div className="min-w-0 shrink overflow-hidden">
            <p
              className="truncate font-mono uppercase tracking-[0.1em] text-slate-400"
              style={{ fontSize: "clamp(8px, 2.6cqw, 10px)" }}
            >
              Platform hours
            </p>
            {/* Sized off the space actually available: 100cqw is this card's
                inner width, less the chart's 80px floor and the gap, divided by
                the figure's own width in ems. So it holds 30px while there is
                room — the chart absorbing the surplus — and only starts shrinking
                once the chart is down to its floor. */}
            <p
              className="mt-1 flex items-baseline gap-0.5"
              style={{
                fontSize: "clamp(14px, calc((100cqw - 100px) / 5.4), 30px)",
              }}
            >
              <span className="font-bold leading-none tracking-tight text-slate-900 tabular-nums">
                {fmtHours(totalHours)}
              </span>
              <span className="text-[0.5em] font-semibold text-slate-400">
                h
              </span>
            </p>
          </div>
          <Sparkline data={daily} onHoverPoint={setHovered} />
        </div>

        {/* Two lines' worth of height, always. The hover readout is one line and
            the leader sentence is two, so swapping between them used to resize
            this block and shove the whole Top users list up and down. Fixed
            height + line-clamp-2 means the text changes and nothing else moves. */}
        <p className="mt-3 line-clamp-2 h-9 text-[12px] leading-[18px] text-slate-500">
          {hovered ? (
            <>
              <span className="font-semibold text-slate-800 tabular-nums">
                {fmtHours(hovered.hours)}h
              </span>{" "}
              logged on {String(hovered.date).slice(0, 10)}
            </>
          ) : leader ? (
            <>
              <span className="font-semibold text-slate-800">
                {leader.name}
              </span>{" "}
              leads with {fmtHours(leader.hours)}h of the month&apos;s{" "}
              {fmtHours(totalHours)}h.
            </>
          ) : (
            "No Encord activity recorded this month yet."
          )}
        </p>

        <div className="mt-1.5">
          <TickMeter pct={leaderPct} />
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 font-mono text-[10px] uppercase tracking-wider">
            <span className="font-semibold text-orange-600 tabular-nums">
              {leaderPct.toFixed(1)}% top share
            </span>
            <span className="text-slate-400">
              total: {fmtHours(totalHours)}h
            </span>
          </div>
        </div>
      </div>

      {/* Ranked list — the one flexible band, taking the height left over. The
          rows below are tight enough to fit that space, so no scrollbar shows;
          overflow-y-auto stays only as the safety valve for a very short window,
          where clipping a row outright would be worse. min-h-0 is what allows a
          flex child to shrink below its content at all. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pt-2">
        <div className="flex shrink-0 items-center justify-between gap-2 px-2 pb-1">
          <h4 className="text-[13px] font-semibold text-slate-900">
            {isUsers ? "Top users" : "Top projects"}
          </h4>
          <button
            type="button"
            onClick={isUsers ? onViewAllUsers : onViewAnalytics}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 font-mono text-[10px] text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
          >
            View all
          </button>
        </div>

        {rows.length === 0 ? (
          <p className="grid flex-1 place-items-center px-2 py-6 text-center text-[12px] text-slate-400">
            No activity yet
          </p>
        ) : (
          // The rows share out the leftover height equally instead of leaving a
          // dead gap above the footer: each li flexes, so all five grow by the
          // same amount and the rhythm stays even. In a column flex container the
          // default min-height:auto stops them shrinking below their content.
          <ul className="flex min-h-0 flex-1 flex-col">
            {rows.map((row, idx) => {
              const share = totalHours > 0 ? (row.hours / totalHours) * 100 : 0;
              return (
                <li key={row.id ?? idx} className="flex-1">
                  <button
                    type="button"
                    onClick={row.onClick}
                    disabled={!row.onClick}
                    className={`flex h-full w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors ${
                      // slate, not white: the card itself is white now, so a white
                      // hover was invisible.
                      row.onClick ? "hover:bg-slate-50" : "cursor-default"
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 font-mono text-[11px] font-bold text-slate-500">
                      {idx + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-slate-800">
                        {row.name}
                      </span>
                      <span className="block truncate font-mono text-[10px] text-slate-400">
                        {row.sub}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[13px] font-semibold text-emerald-600 tabular-nums">
                        {fmtHours(row.hours)}h
                      </span>
                      <span className="block font-mono text-[10px] text-slate-400 tabular-nums">
                        {share.toFixed(1)}%
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer action bar */}
      <div className="mt-1.5 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 px-3 py-2">
        <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-slate-400">
          <Clock className="h-3 w-3" />
          Encord time
        </span>
        {/* Shared Button, so these match every other action in the app instead of
            being two one-off styles — primary indigo for the CTA, secondary for
            the side action. */}
        <div className="flex items-center gap-1.5">
          <Button variant="secondary" size="sm" onClick={onViewAnalytics}>
            <BarChart3 className="h-3.5 w-3.5" />
            Analytics
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={isUsers ? onViewAllUsers : onViewAnalytics}
          >
            View details
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MostActivePanel;
