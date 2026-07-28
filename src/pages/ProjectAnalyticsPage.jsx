import { useMemo, useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../services/api";
import {
  MetricCard,
  Card,
  CardHeader,
  CardContent,
} from "../components/ui/Card";
import Spinner from "../components/ui/LoadingSpinner";
import {
  Clock,
  Users,
  Gauge,
  ChevronLeft,
  MessageSquare,
  ChevronDown,
  CheckSquare,
  Square,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// Categorical palette (validated reference order — identity, fixed, never cycled)
const SERIES = [
  "#2a78d6",
  "#1baf7a",
  "#eda100",
  "#008300",
  "#4a3aa7",
  "#e34948",
  "#e87ba4",
  "#eb6834",
];
const INK_MUTED = "#898781";
const GRID = "#e1e0d9";

const RANGES = [
  { key: "week", label: "Last 7 days" },
  { key: "month", label: "This month" },
  { key: "custom", label: "Custom" },
];

const iso = (d) => d.toISOString().slice(0, 10);

function computeRange(mode, custom) {
  const today = new Date();
  if (mode === "week") {
    const from = new Date(today);
    from.setDate(today.getDate() - 6);
    return { date_from: iso(from), date_to: iso(today) };
  }
  if (mode === "custom" && custom.from && custom.to) {
    return { date_from: custom.from, date_to: custom.to };
  }
  // month-to-date
  return {
    date_from: iso(new Date(today.getFullYear(), today.getMonth(), 1)),
    date_to: iso(today),
  };
}

const shortDate = (s) => {
  try {
    return format(parseISO(s), "MMM d");
  } catch {
    return s;
  }
};

// Dynamic annotator grouping. Encord bakes a cohort/vendor tag somewhere into
// each email — a fragment of the local part ("kappa" in annotator31_kappa@…,
// "epsilon" in epsilon_annotator6@…) or the domain ("picklerobot" in
// stanley@picklerobot.com). We discover those tags at runtime by tokenizing every
// email; any token shared by MORE THAN 2 annotators becomes its own filter, and
// anything rarer falls into "Other". No vendor list is hardcoded — see buildGroups().
// The only special-cased token is "theta": that's our own team, shown as "Autonex".
const STOP_TOKENS = new Set([
  "annotator",
  "encord",
  "gmail",
  "outlook",
  "yahoo",
  "hotmail",
  "com",
  "net",
  "org",
  "www",
  "mail",
  "test",
  "user",
  "team",
  "admin",
]);
const GROUP_MIN = 3; // token must appear in > 2 distinct annotators
const OURS_TOKEN = "theta"; // our own team
const GROUP_LABELS = {
  theta: "Autonex",
  picklerobot: "PickleRobot",
  agilityrobotics: "Agility Robotics",
};
const groupLabel = (key) =>
  GROUP_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);

// Pull candidate tag tokens from one email: alphabetic fragments of the local part
// (split on digits/dots/underscores) plus the second-level domain, minus generic
// stopwords and anything shorter than 3 chars.
const tokenizeEmail = (email) => {
  const [local = "", domain = ""] = (email || "").toLowerCase().split("@");
  const parts = local.split(/[^a-z]+/);
  const labels = domain.split(".").filter(Boolean);
  if (labels.length >= 2) parts.push(labels[labels.length - 2]); // SLD, e.g. "picklerobot"
  return [...new Set(parts)].filter(
    (t) => t.length >= 3 && !STOP_TOKENS.has(t),
  );
};

// Given the annotator list, returns a groupOf(email) classifier and the tab list.
// We only split into our own team (Autonex = the "theta" token) and everyone else
// ("Others"). Tab order is fixed: Autonex, All, Others.
const buildGroups = (annotators) => {
  const isOurs = (email) => tokenizeEmail(email).includes(OURS_TOKEN);
  const groupOf = (email) => (isOurs(email) ? OURS_TOKEN : "other");
  const oursCount = annotators.filter((a) => isOurs(a.user_email)).length;
  const otherCount = annotators.length - oursCount;
  const tabs = [
    { key: OURS_TOKEN, label: "Autonex", count: oursCount },
    { key: "all", label: "All", count: annotators.length },
    { key: "other", label: "Others", count: otherCount },
  ];
  return { groupOf, tabs };
};

const ProjectAnalyticsPage = () => {
  const { mainProjectId } = useParams();
  const navigate = useNavigate();

  const [rangeMode, setRangeMode] = useState("month");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [selected, setSelected] = useState(null); // null = default to everyone
  const [orgFilter, setOrgFilter] = useState("all"); // 'all' | org key
  const [annotatorOpen, setAnnotatorOpen] = useState(false); // annotator picker dropdown
  const [legendExpanded, setLegendExpanded] = useState(false); // one-row legend vs full
  const annotatorRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (annotatorRef.current && !annotatorRef.current.contains(e.target))
        setAnnotatorOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const params = useMemo(
    () => computeRange(rangeMode, custom),
    [rangeMode, custom],
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "project-analytics",
      mainProjectId,
      params.date_from,
      params.date_to,
    ],
    queryFn: () => analyticsApi.getProjectAnalytics(mainProjectId, params),
    enabled: !!mainProjectId,
    // Encord data refreshes once a day; refetch on mount/focus rather than polling.
    refetchOnWindowFocus: true,
  });

  const annotators = data?.annotators || [];
  // default selection: everyone
  const allEmails = annotators.map((a) => a.user_email);
  const activeSel = selected ?? allEmails;
  const colorFor = (email) =>
    SERIES[annotators.findIndex((a) => a.user_email === email) % SERIES.length];

  const toggle = (email) => {
    const base = selected ?? allEmails;
    setSelected(
      base.includes(email) ? base.filter((e) => e !== email) : [...base, email],
    );
  };

  // Groups + tabs are derived from the data itself (see buildGroups). Recomputed
  // whenever the annotator set changes (range / project switch).
  const { groupOf, tabs: orgTabs } = useMemo(
    () => buildGroups(annotators),
    [annotators],
  );

  // If the active tab vanished after a data change, fall back to "All" without
  // needing an effect to reset state.
  const effectiveFilter = orgTabs.some((t) => t.key === orgFilter)
    ? orgFilter
    : "all";

  const visibleAnnotators =
    effectiveFilter === "all"
      ? annotators
      : annotators.filter((a) => groupOf(a.user_email) === effectiveFilter);

  // Select / deselect all annotators in the currently visible group.
  const visibleEmails = visibleAnnotators.map((a) => a.user_email);
  const allVisibleOn =
    visibleEmails.length > 0 &&
    visibleEmails.every((e) => activeSel.includes(e));
  const selectAllVisible = () =>
    setSelected([...new Set([...activeSel, ...visibleEmails])]);
  const deselectAllVisible = () =>
    setSelected(activeSel.filter((e) => !visibleEmails.includes(e)));

  // Switching group tab also switches the chart selection to that group's members.
  const changeGroup = (key) => {
    setOrgFilter(key);
    const emails =
      key === "all"
        ? allEmails
        : annotators
            .filter((a) => groupOf(a.user_email) === key)
            .map((a) => a.user_email);
    setSelected(emails);
  };

  const comparisonData = useMemo(() => {
    if (!data) return [];
    const lookup = {};
    annotators.forEach((a) => {
      lookup[a.user_email] = Object.fromEntries(
        a.daily.map((p) => [p.date, p.hours]),
      );
    });
    return data.daily.map((d) => {
      const row = { date: d.date };
      activeSel.forEach((e) => {
        row[e] = lookup[e]?.[d.date] ?? 0;
      });
      return row;
    });
  }, [data, annotators, activeSel]);

  if (isLoading)
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" color="indigo" />
      </div>
    );
  if (isError || !data)
    return (
      <div className="p-8 text-center text-slate-500">
        Could not load analytics.
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => navigate("/admin/analytics")}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2"
        >
          <ChevronLeft className="w-4 h-4" /> Analytics
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              {data.name}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {data.client ? `${data.client} · ` : ""}Encord platform activity ·{" "}
              {data.range.from} → {data.range.to}
            </p>
          </div>
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 w-fit">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRangeMode(r.key)}
                className={`px-3 py-1.5 text-[13px] font-semibold rounded-md transition-all whitespace-nowrap ${
                  rangeMode === r.key
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        {rangeMode === "custom" && (
          <div className="flex items-center gap-2 mt-3">
            <input
              type="date"
              value={custom.from}
              onChange={(e) =>
                setCustom((c) => ({ ...c, from: e.target.value }))
              }
              className="input"
            />
            <span className="text-slate-400">→</span>
            <input
              type="date"
              value={custom.to}
              onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
              className="input"
            />
          </div>
        )}
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Platform Hours"
          value={`${data.month.platform_hours}h`}
          subtitle="selected range"
          icon={Clock}
        />
        <MetricCard
          title="Avg Hours / Annotator"
          value={`${data.month.avg_hours_per_annotator}h`}
          icon={Gauge}
        />
        <MetricCard
          title="Peak Active Annotators / day"
          value={data.month.active_annotators_peak}
          subtitle=">1h platform time"
          icon={Users}
        />
      </div>

      {/* Overview: single series (blue), no legend — title names it */}
      <Card>
        <CardHeader
          title="Platform hours per day"
          subtitle="Total active editor time across the project"
        />
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.daily}
                margin={{ top: 8, right: 16, bottom: 4, left: -8 }}
              >
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  tick={{ fill: INK_MUTED, fontSize: 12 }}
                  axisLine={{ stroke: GRID }}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fill: INK_MUTED, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  unit="h"
                />
                <Tooltip
                  labelFormatter={shortDate}
                  formatter={(v) => [`${v}h`, "Platform hours"]}
                />
                <Line
                  type="monotone"
                  dataKey="platform_hours"
                  name="Platform hours"
                  stroke={SERIES[0]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Annotator comparison: multi-series with legend */}
      <Card>
        <CardHeader
          title="Annotator comparison"
          subtitle="Daily platform hours per annotator — select who to compare"
        />
        <CardContent>
          {annotators.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No annotator activity in this range.
            </p>
          ) : (
            <>
              {/* Controls: group filter (segmented) + annotator picker dropdown */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {/* Org filter — segmented-pill layout. theta = Autonex; everyone else = Others */}
                <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 w-fit">
                  {orgTabs.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => changeGroup(t.key)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold rounded-md transition-all whitespace-nowrap ${
                        effectiveFilter === t.key
                          ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {t.label}
                      <span
                        className={
                          effectiveFilter === t.key
                            ? "text-indigo-600"
                            : "text-slate-400"
                        }
                      >
                        {t.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Annotator picker — names/emails hidden behind this dropdown by default */}
                <div ref={annotatorRef} className="relative ml-auto">
                  <button
                    type="button"
                    onClick={() => setAnnotatorOpen((o) => !o)}
                    className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Users className="w-4 h-4 text-slate-400" />
                    Annotators
                    <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-indigo-600 text-white text-[10px] font-semibold">
                      {activeSel.length}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${annotatorOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {annotatorOpen && (
                    <div className="absolute right-0 mt-1.5 z-40 w-80 max-w-[90vw] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          {orgTabs.find((t) => t.key === effectiveFilter)
                            ?.label || "All"}{" "}
                          · {visibleAnnotators.length}
                        </span>
                        <button
                          type="button"
                          onClick={
                            allVisibleOn ? deselectAllVisible : selectAllVisible
                          }
                          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          {allVisibleOn ? (
                            <Square className="w-3.5 h-3.5" />
                          ) : (
                            <CheckSquare className="w-3.5 h-3.5" />
                          )}
                          {allVisibleOn ? "Deselect all" : "Select all"}
                        </button>
                      </div>
                      {visibleAnnotators.length === 0 ? (
                        <p className="py-3 text-sm text-slate-400">
                          No annotators in this group.
                        </p>
                      ) : (
                        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto pr-1">
                          {visibleAnnotators.map((a) => {
                            const on = activeSel.includes(a.user_email);
                            return (
                              <button
                                key={a.user_email}
                                onClick={() => toggle(a.user_email)}
                                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors ${on ? "bg-slate-50" : "hover:bg-slate-50"}`}
                              >
                                {on ? (
                                  <CheckSquare className="w-4 h-4 shrink-0 text-indigo-600" />
                                ) : (
                                  <Square className="w-4 h-4 shrink-0 text-slate-300" />
                                )}
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full"
                                  style={{
                                    backgroundColor: colorFor(a.user_email),
                                  }}
                                />
                                <span className="min-w-0 flex-1 truncate text-slate-700">
                                  {a.employee_name || a.user_email}
                                </span>
                                <span className="shrink-0 tabular-nums text-slate-400">
                                  {a.total_hours}h
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={comparisonData}
                    margin={{ top: 8, right: 16, bottom: 4, left: -8 }}
                  >
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={shortDate}
                      tick={{ fill: INK_MUTED, fontSize: 12 }}
                      axisLine={{ stroke: GRID }}
                      tickLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      tick={{ fill: INK_MUTED, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                      unit="h"
                    />
                    <Tooltip
                      labelFormatter={shortDate}
                      formatter={(v, n) => [`${v}h`, n]}
                    />
                    {activeSel.map((email) => (
                      <Line
                        key={email}
                        type="monotone"
                        dataKey={email}
                        name={
                          annotators.find((a) => a.user_email === email)
                            ?.employee_name || email
                        }
                        stroke={colorFor(email)}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Custom legend — one row by default, "Show all" reveals the rest */}
              {activeSel.length > 0 && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <div
                    className={`flex flex-wrap gap-x-4 gap-y-1.5 ${legendExpanded ? "" : "max-h-6 overflow-hidden"}`}
                  >
                    {activeSel.map((email) => {
                      const a = annotators.find((x) => x.user_email === email);
                      return (
                        <span
                          key={email}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-600"
                        >
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: colorFor(email) }}
                          />
                          {a?.employee_name || email}
                        </span>
                      );
                    })}
                  </div>
                  {activeSel.length > 6 && (
                    <button
                      type="button"
                      onClick={() => setLegendExpanded((v) => !v)}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {legendExpanded
                        ? "Show less"
                        : `Show all ${activeSel.length}`}
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${legendExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Sentiment (read-only for admin; PM edits on Organizations) */}
      <Card>
        <CardHeader
          title="Project Sentiment"
          subtitle="Maintained by the project's PM"
        />
        <CardContent>
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {data.sentiment || (
                <span className="text-slate-400">No sentiment set yet.</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectAnalyticsPage;
