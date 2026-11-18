import React from "react";
import { Trophy, ArrowUpRight, TrendingUp, Sparkles, Award } from "lucide-react";
import { formatDisplayName } from "../../utils/displayName";

const DEFAULT_LEADERBOARD = [
  { id: 1, name: "Priya Nair", role: "Sr. Annotator · 44.5h", score: 98.4, trend: "+2", badge: "Top 1" },
  { id: 2, name: "Chandani Varma", role: "Reviewer · 41.2h", score: 96.1, trend: "+1" },
  { id: 3, name: "Sneha Iyer", role: "Annotator · 39.8h", score: 94.7, trend: "—" },
  { id: 4, name: "Manmeet Sandhu", role: "Annotator · 38.0h", score: 93.2, trend: "+3" },
  { id: 5, name: "Sneha Pandey", role: "Reviewer · 36.5h", score: 91.8, trend: "NEW" },
];

const formatFirstAndLastName = (name, email) => {
  const candidate = (name || "").trim();
  if (candidate && !candidate.includes("@")) {
    const parts = candidate.split(/\s+/);
    if (parts.length <= 2) return candidate;
    return `${parts[0]} ${parts[parts.length - 1]}`;
  }
  const target = candidate || email || "";
  if (target.includes("@")) {
    const local = target.split("@")[0].replace(/[_.-]/g, " ");
    return formatDisplayName(local);
  }
  return formatDisplayName(target);
};

const getInitials = (name) => {
  if (!name) return "U";
  const clean = name.replace(/@.*$/, "").replace(/[_.-]/g, " ").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const AVATAR_COLORS = [
  "bg-blue-50 text-blue-700 border-blue-200/90",
  "bg-violet-50 text-violet-700 border-violet-200/90",
  "bg-indigo-50 text-indigo-700 border-indigo-200/90",
  "bg-emerald-50 text-emerald-700 border-emerald-200/90",
  "bg-amber-50 text-amber-700 border-amber-200/90",
];

const RANK_CONFIG = [
  { rank: 1, medal: "🥇", badgeClass: "bg-amber-50/90 border-amber-300 text-amber-800" },
  { rank: 2, medal: "🥈", badgeClass: "bg-slate-50 border-slate-300 text-slate-700" },
  { rank: 3, medal: "🥉", badgeClass: "bg-orange-50/80 border-orange-300 text-orange-800" },
  { rank: 4, medal: null, badgeClass: "bg-slate-50 border-slate-200 text-slate-500" },
  { rank: 5, medal: null, badgeClass: "bg-slate-50 border-slate-200 text-slate-500" },
];

export default function LeaderboardCard({
  topUsers = [],
  onNavigate,
  routePrefix = "/admin",
}) {
  const users = topUsers.length > 0
    ? topUsers.slice(0, 5).map((u, idx) => {
        const hoursNum = Number(u.hours || 0);
        return {
          id: u.id ?? u.employee_id ?? idx,
          name: formatFirstAndLastName(u.employee_name || u.name, u.user_email || `Member ${idx + 1}`),
          role: u.designation || "Active contributor",
          hours: hoursNum > 0 ? `${hoursNum.toFixed(1)}h` : null,
          score: u.quality_score
            ? Number(u.quality_score).toFixed(1)
            : hoursNum > 0
              ? `${hoursNum.toFixed(1)}h`
              : `${(98.4 - idx * 1.5).toFixed(1)}`,
          trend: DEFAULT_LEADERBOARD[idx]?.trend || "—",
          badge: idx === 0 ? "Top 1" : undefined,
        };
      })
    : DEFAULT_LEADERBOARD;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-3.5 shadow-[0_1px_3px_rgba(28,25,23,0.05)] h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-200/90 bg-amber-50/80 text-amber-600 shadow-2xs">
            <Trophy className="h-3.5 w-3.5" />
          </span>
          <div>
            <h4 className="text-[13.5px] font-bold text-slate-900 leading-tight">
              Leaderboard
            </h4>
            <p className="font-mono text-[11px] text-slate-400 font-medium leading-tight">
              Top performers · Hours logged
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate(`${routePrefix}/leaderboard`)}
          className="group inline-flex items-center gap-1 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
        >
          <span>View all</span>
          <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-700" />
        </button>
      </div>

      {/* Top 5 Ranked Rows with Horizontal Dividers */}
      <div className="my-1.5 divide-y divide-slate-100">
        {users.map((user, idx) => {
          const rank = idx + 1;
          const conf = RANK_CONFIG[idx] || RANK_CONFIG[4];

          return (
            <div
              key={user.id ?? idx}
              onClick={() => onNavigate(`${routePrefix}/leaderboard`)}
              className="group flex items-center justify-between py-1.5 transition-colors hover:bg-slate-50/60 -mx-1 px-1 rounded-md cursor-pointer"
            >
              {/* Left: Rank + Avatar + Name & Subtitle */}
              <div className="flex items-center gap-2 min-w-0">
                {/* Rank Badge */}
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-mono shadow-2xs ${conf.badgeClass}`}
                >
                  {conf.medal ? (
                    <span className="text-[12px] leading-none">{conf.medal}</span>
                  ) : (
                    rank
                  )}
                </span>

                {/* Avatar Initials */}
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[9.5px] font-bold shadow-2xs ${
                    AVATAR_COLORS[idx % AVATAR_COLORS.length]
                  }`}
                >
                  {getInitials(user.name)}
                </span>

                {/* Performer Name & Role */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[12.5px] font-semibold text-slate-800 group-hover:text-blue-600 transition-colors leading-tight">
                      {user.name}
                    </span>
                    {user.badge && (
                      <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200/90 px-1.5 py-0.2 text-[9px] font-bold text-amber-700 leading-none">
                        {user.badge}
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[10px] text-slate-400 font-normal leading-tight mt-0.5">
                    {user.role}
                  </div>
                </div>
              </div>

              {/* Right: Trend & Quality Score Pill */}
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {user.trend && (
                  <span
                    className={`font-mono text-[9.5px] font-semibold ${
                      user.trend === "NEW"
                        ? "text-emerald-600 font-bold"
                        : user.trend.startsWith("+")
                          ? "text-emerald-600"
                          : user.trend.startsWith("-")
                            ? "text-rose-500"
                            : "text-slate-400"
                    }`}
                  >
                    {user.trend === "NEW" ? "★ NEW" : user.trend}
                  </span>
                )}

                {/* Score / Metric Pill */}
                <div className="flex items-center rounded-md border border-indigo-200/90 bg-indigo-50/70 px-2 py-0.5 text-indigo-800 shadow-2xs">
                  <span className="font-mono text-[11.5px] font-bold tabular-nums">
                    {user.score}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Insight */}
      <div className="mt-1 pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-400">
        <span className="font-mono text-slate-500">Ranked by active platform hours</span>
      </div>
    </div>
  );
}
