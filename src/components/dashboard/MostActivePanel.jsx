import React, { useMemo, useState } from "react";
import { Clock, ArrowUpRight, BarChart3 } from "lucide-react";

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
      <div className="flex h-[56px] w-[220px] min-w-[110px] shrink items-end justify-center text-[10px] text-slate-300">
        Not enough data
      </div>
    );
  }

  // Label the ends and the middle only — a label per point is unreadable at this size.
  const labelIdx = [0, Math.floor(pts.length / 2), pts.length - 1];

  return (
    // Holds 220px when there is room and gives width back down to 110px when
    // there isn't, so it shares the squeeze with the figure instead of forcing
    // all of it onto the text.
    <div className="w-[220px] min-w-[110px] shrink">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-[56px] w-full overflow-visible"
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
          strokeWidth="2"
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
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-50/70 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-2.5 pt-3.5">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <h3 className="text-[13px] font-semibold text-slate-900">
            Most active
          </h3>
          <span className="truncate font-mono text-[11px] text-slate-400">
            / this month
          </span>
        </div>
        <div className="flex items-center gap-0.5 rounded-lg bg-slate-200/70 p-0.5">
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
        className="mx-2 rounded-xl border border-slate-200/80 bg-white p-4"
        style={{ containerType: "inline-size" }}
      >
        {/* Figure and sparkline stay side by side at every width; when space runs
            short the headline scales down instead of the chart dropping onto a
            half-empty row of its own. */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-400">
              Platform hours
            </p>
            <p className="mt-1 flex items-baseline gap-0.5">
              <span
                className="font-bold leading-none tracking-tight text-slate-900 tabular-nums"
                style={{ fontSize: "clamp(17px, 9cqw, 30px)" }}
              >
                {fmtHours(totalHours)}
              </span>
              <span
                className="font-semibold text-slate-400"
                style={{ fontSize: "clamp(11px, 4.5cqw, 15px)" }}
              >
                h
              </span>
            </p>
            {/* One line per figure — the single run-on line wrapped unreadably. */}
            <div className="mt-2 flex flex-col gap-0.5 font-mono text-[10px] uppercase tracking-wider">
              {[
                {
                  value: overview?.autonex_people ?? 0,
                  label: "people",
                  tone: "text-slate-600",
                },
                {
                  value: overview?.active_annotators ?? 0,
                  label: "annotating",
                  tone: "text-emerald-600",
                },
                {
                  value: overview?.active_reviewers ?? 0,
                  label: "reviewing",
                  tone: "text-sky-600",
                },
              ].map(({ value, label, tone }) => (
                <span key={label} className="flex items-baseline gap-1.5">
                  <span className={`font-semibold tabular-nums ${tone}`}>
                    {value}
                  </span>
                  <span className="text-slate-400">{label}</span>
                </span>
              ))}
            </div>
          </div>
          <Sparkline data={daily} onHoverPoint={setHovered} />
        </div>

        <p className="mt-3 text-[12px] text-slate-500">
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

        <div className="mt-2">
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

      {/* Ranked list */}
      <div className="px-2 pt-3">
        <div className="flex items-center justify-between gap-2 px-2 pb-1">
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
          <p className="px-2 py-6 text-center text-[12px] text-slate-400">
            No activity yet
          </p>
        ) : (
          <ul>
            {rows.map((row, idx) => {
              const share = totalHours > 0 ? (row.hours / totalHours) * 100 : 0;
              return (
                <li key={row.id ?? idx}>
                  <button
                    type="button"
                    onClick={row.onClick}
                    disabled={!row.onClick}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors ${
                      row.onClick ? "hover:bg-white" : "cursor-default"
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
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 px-3 py-2.5">
        <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-slate-400">
          <Clock className="h-3 w-3" />
          Encord time
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onViewAnalytics}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Analytics
          </button>
          <button
            type="button"
            onClick={isUsers ? onViewAllUsers : onViewAnalytics}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-slate-800"
          >
            View details
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MostActivePanel;
