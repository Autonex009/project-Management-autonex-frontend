import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../../services/api";
import Table from "../../components/ui/Table";
import StatCard from "../../components/dashboard/StatCard";
import DatePicker from "../../components/ui/DatePicker";
import UserAvatar from "../../components/ui/UserAvatar";
import {
  Trophy,
  Crown,
  Medal,
  Clock,
  Users,
  CheckCircle2,
  Calendar,
  Search,
  Award,
} from "lucide-react";
import { formatDisplayName } from "../../utils/displayName";

const RANGES = [
  { key: "month", label: "This Month" },
  { key: "week", label: "Last Week" },
  { key: "day", label: "Last Day" },
  { key: "custom", label: "Custom Range" },
];

const METRIC_FILTERS = [
  { key: "all", label: "All Hours" },
  { key: "annotation", label: "Annotation Hours" },
  { key: "review", label: "Review Hours" },
];

const LeaderboardPage = () => {
  const [range, setRange] = useState("month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [metricFilter, setMetricFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page to 1 when filters or range change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [range, dateFrom, dateTo, searchQuery, metricFilter]);

  // Build query params
  const params = useMemo(() => {
    const p = { range };
    if (range === "custom" && dateFrom) {
      p.date_from = dateFrom;
      if (dateTo) p.date_to = dateTo;
    }
    return p;
  }, [range, dateFrom, dateTo]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-leaderboard", params],
    queryFn: () => analyticsApi.getLeaderboard(params),
    refetchOnWindowFocus: true,
  });

  const teamSummary = data?.team_summary || {};
  const allLeaderboard = data?.leaderboard || [];

  // Filter and rank leaderboard by search query & metric filter
  const filteredLeaderboard = useMemo(() => {
    let list = [...allLeaderboard];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          (item.employee_name || "").toLowerCase().includes(q) ||
          (item.user_email || "").toLowerCase().includes(q) ||
          (item.designation || "").toLowerCase().includes(q)
      );
    }

    if (metricFilter === "annotation") {
      list = list
        .filter((item) => (item.annotation_hours || 0) > 0)
        .sort((a, b) => (b.annotation_hours || 0) - (a.annotation_hours || 0));
    } else if (metricFilter === "review") {
      list = list
        .filter((item) => (item.review_hours || 0) > 0)
        .sort((a, b) => (b.review_hours || 0) - (a.review_hours || 0));
    } else {
      list = list.sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0));
    }

    return list.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  }, [allLeaderboard, searchQuery, metricFilter]);

  const top3 = useMemo(() => filteredLeaderboard.slice(0, 3), [filteredLeaderboard]);

  const getPrimaryHours = (item) => {
    if (!item) return "0h";
    if (metricFilter === "annotation") return `${item.annotation_hours}h (Annotation)`;
    if (metricFilter === "review") return `${item.review_hours}h (Review)`;
    return `${item.total_hours}h`;
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Team Leaderboard
              </h1>
              <p className="text-xs font-medium text-slate-500">
                Autonex team activity & platform hours ranked by performance
              </p>
            </div>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-sm">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${range === r.key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Pickers (visible only when 'custom' is selected) */}
      {range === "custom" && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-900">
            <Calendar className="h-4 w-4 text-blue-600" />
            Select Custom Range:
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">From:</span>
            <DatePicker
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="Start Date"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">To:</span>
            <DatePicker
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="End Date"
            />
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Award}
          title="Top Performer"
          value={teamSummary.top_performer?.name || "—"}
          subText={
            teamSummary.top_performer
              ? `${teamSummary.top_performer.hours}h logged`
              : "No activity"
          }
          tone="amber"
        />
        <StatCard
          icon={Clock}
          title="Total Team Hours"
          value={`${teamSummary.total_hours ?? 0}h`}
          subText="Combined platform time"
          tone="sky"
        />
        <StatCard
          icon={Users}
          title="Active Annotators"
          value={teamSummary.active_users ?? 0}
          subText="Team members logged"
          tone="emerald"
        />
        <StatCard
          icon={CheckCircle2}
          title="Tasks Completed"
          value={teamSummary.total_tasks ?? 0}
          subText="Tasks submitted"
          tone="purple"
        />
      </div>

      {/* Top 3 Podium View */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* 1st Place */}
          {top3[0] && (
            <div className="relative order-1 overflow-hidden rounded-2xl border border-amber-300/60 bg-gradient-to-b from-amber-50/70 via-white to-amber-50/30 p-6 shadow-sm ring-1 ring-amber-400/20 md:order-2 md:-translate-y-2">
              <div className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white shadow-md">
                <Crown className="h-4 w-4" />
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-3">
                  <UserAvatar
                    name={top3[0].employee_name || top3[0].user_email}
                    size="lg"
                  />
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white shadow">
                    1
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {top3[0].employee_name || formatDisplayName(top3[0].user_email)}
                </h3>
                <p className="text-xs font-medium text-amber-700">
                  {top3[0].designation}
                </p>

                <div className="mt-4 w-full rounded-xl bg-white/80 p-3 ring-1 ring-amber-200/60">
                  <div className="text-xl font-extrabold text-amber-900">
                    {getPrimaryHours(top3[0])}
                  </div>
                  <div className="text-[11px] font-semibold text-amber-700">
                    {top3[0].share_percentage}% of team total
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {top3[0].tasks_submitted} tasks submitted
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2nd Place */}
          {top3[1] && (
            <div className="relative order-2 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50/80 to-white p-6 shadow-sm md:order-1">
              <div className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-slate-400 text-white">
                <Medal className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-3">
                  <UserAvatar
                    name={top3[1].employee_name || top3[1].user_email}
                    size="lg"
                  />
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-500 text-xs font-bold text-white">
                    2
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {top3[1].employee_name || formatDisplayName(top3[1].user_email)}
                </h3>
                <p className="text-xs font-medium text-slate-500">
                  {top3[1].designation}
                </p>

                <div className="mt-4 w-full rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/60">
                  <div className="text-xl font-extrabold text-slate-800">
                    {getPrimaryHours(top3[1])}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-600">
                    {top3[1].share_percentage}% of team total
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {top3[1].tasks_submitted} tasks submitted
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {top3[2] && (
            <div className="relative order-3 overflow-hidden rounded-2xl border border-amber-200/50 bg-gradient-to-b from-amber-50/30 to-white p-6 shadow-sm">
              <div className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-amber-700/80 text-white">
                <Medal className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-3">
                  <UserAvatar
                    name={top3[2].employee_name || top3[2].user_email}
                    size="lg"
                  />
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-700 text-xs font-bold text-white">
                    3
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {top3[2].employee_name || formatDisplayName(top3[2].user_email)}
                </h3>
                <p className="text-xs font-medium text-slate-500">
                  {top3[2].designation}
                </p>

                <div className="mt-4 w-full rounded-xl bg-amber-50/40 p-3 ring-1 ring-amber-200/50">
                  <div className="text-xl font-extrabold text-amber-950">
                    {getPrimaryHours(top3[2])}
                  </div>
                  <div className="text-[11px] font-semibold text-amber-800">
                    {top3[2].share_percentage}% of team total
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {top3[2].tasks_submitted} tasks submitted
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Leaderboard Table */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-base font-bold text-slate-900">
              Full Rankings
            </h2>
            <div className="flex items-center gap-1 rounded-xl border border-slate-200/80 bg-white p-1 shadow-sm">
              {METRIC_FILTERS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMetricFilter(m.key)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    metricFilter === m.key
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee name or email..."
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-1.5 text-xs font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <Table
          variant="untitled"
          loading={isLoading}
          data={filteredLeaderboard}
          currentPage={currentPage}
          pageSize={10}
          onPageChange={setCurrentPage}
          columns={[
            {
              key: "rank",
              label: "Rank",
              width: "w-16",
              align: "center",
              render: (value) => {
                if (value === 1)
                  return (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-extrabold text-white shadow-sm">
                      1
                    </span>
                  );
                if (value === 2)
                  return (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-400 text-xs font-extrabold text-white">
                      2
                    </span>
                  );
                if (value === 3)
                  return (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-700 text-xs font-extrabold text-white">
                      3
                    </span>
                  );
                return (
                  <span className="text-xs font-bold text-slate-500">
                    #{value}
                  </span>
                );
              },
            },
            {
              key: "employee_name",
              label: "Team Member",
              render: (_, row) => (
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={row.employee_name || row.user_email}
                    size="sm"
                  />
                  <div>
                    <div className="font-semibold text-slate-900">
                      {row.employee_name || formatDisplayName(row.user_email)}
                    </div>
                    <div className="text-xs text-slate-400">
                      {row.user_email}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: "designation",
              label: "Role",
              render: (v) => (
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                  {v || "Annotator / Reviewer"}
                </span>
              ),
            },
            {
              key: "total_hours",
              label: "Platform Hours",
              align: "center",
              render: (v) => (
                <span className="font-mono font-bold text-blue-600">{v}h</span>
              ),
            },
            {
              key: "annotation_hours",
              label: "Annotation",
              align: "center",
              render: (v) => (
                <span className="font-mono text-slate-700">{v}h</span>
              ),
            },
            {
              key: "review_hours",
              label: "Review",
              align: "center",
              render: (v) => (
                <span className="font-mono text-slate-700">{v}h</span>
              ),
            },
            {
              key: "tasks_submitted",
              label: "Tasks",
              align: "center",
              render: (v) => (
                <span className="font-mono text-slate-700">{v}</span>
              ),
            },
            {
              key: "share_percentage",
              label: "Share of Total",
              align: "right",
              render: (v) => (
                <div className="flex items-center justify-end gap-2">
                  <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden hidden sm:block">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${Math.min(100, v * 5)}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs font-semibold text-slate-600">
                    {v}%
                  </span>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
};

export default LeaderboardPage;
