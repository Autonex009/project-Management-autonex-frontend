import { useMemo, useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi, allocationApi, employeeApi } from "../services/api";
import { setPageDetailTitle } from "../utils/pageDetailTitle";
import Spinner from "../components/ui/LoadingSpinner";
import AnalyticsTabNav from "../components/analytics/AnalyticsTabNav";
import DailyPlatformHoursChart from "../components/analytics/DailyPlatformHoursChart";
import StageDistributionChart from "../components/analytics/StageDistributionChart";
import PlannedVsActualChart from "../components/analytics/PlannedVsActualChart";
import ProjectTeamRosterTable from "../components/analytics/ProjectTeamRosterTable";
import GlassKpiCard from "../components/analytics/GlassKpiCard";
import AnnotatorComparisonChart from "../components/analytics/AnnotatorComparisonChart";
import {
  Clock,
  Users,
  Gauge,
  ChevronLeft,
  MessageSquare,
  ChevronDown,
  CheckSquare,
  Square,
  BarChart2,
  Zap,
  CheckCircle2,
  XCircle,
  Sparkles,
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
} from "recharts";

const SERIES = [
  "#2563eb",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#dc2626",
  "#db2777",
  "#ea580c",
  "#0284c7",
];
const INK_MUTED = "#94a3b8";
const GRID = "#f1f5f9";

const RANGES = [
  { key: "day", label: "Last day" },
  { key: "week", label: "Last 7 days" },
  { key: "30", label: "Last 30 days" },
  { key: "month", label: "Current month" },
  { key: "custom", label: "Custom Range" },
];

const PROJECT_TABS = [
  { id: "execution", label: "Execution & Variance", icon: BarChart2 },
  { id: "throughput", label: "Workflow & Throughput", icon: Zap },
  { id: "roster", label: "Team Roster & Utilization", icon: Users },
];

function computeRange(mode, custom) {
  const today = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const formatLocalDate = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (mode === "day") {
    const from = new Date(today);
    from.setDate(today.getDate() - 1);
    return { date_from: formatLocalDate(from), date_to: formatLocalDate(today) };
  }
  if (mode === "week") {
    const from = new Date(today);
    from.setDate(today.getDate() - 6);
    return { date_from: formatLocalDate(from), date_to: formatLocalDate(today) };
  }
  if (mode === "30") {
    const from = new Date(today);
    from.setDate(today.getDate() - 29);
    return { date_from: formatLocalDate(from), date_to: formatLocalDate(today) };
  }
  if (mode === "custom" && custom.from && custom.to) {
    return { date_from: custom.from, date_to: custom.to };
  }
  return {
    date_from: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`,
    date_to: formatLocalDate(today),
  };
}

const shortDate = (s) => {
  try {
    return format(parseISO(s), "MMM d");
  } catch {
    return s;
  }
};

const STOP_TOKENS = new Set([
  "annotator", "encord", "gmail", "outlook", "yahoo", "hotmail",
  "com", "net", "org", "www", "mail", "test", "user", "team", "admin",
]);
const OURS_TOKEN = "theta";

const tokenizeEmail = (email) => {
  const [local = "", domain = ""] = (email || "").toLowerCase().split("@");
  const parts = local.split(/[^a-z]+/);
  const labels = domain.split(".").filter(Boolean);
  if (labels.length >= 2) parts.push(labels[labels.length - 2]);
  return [...new Set(parts)].filter((t) => t.length >= 3 && !STOP_TOKENS.has(t));
};

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
  const location = useLocation();
  const basePath = location.pathname.startsWith("/pm") ? "/pm" : "/admin";

  const [activePanel, setActivePanel] = useState("execution");
  const [rangeMode, setRangeMode] = useState("month");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [selected, setSelected] = useState(null);
  const [orgFilter, setOrgFilter] = useState("all");
  const [annotatorOpen, setAnnotatorOpen] = useState(false);
  const annotatorRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (annotatorRef.current && !annotatorRef.current.contains(e.target))
        setAnnotatorOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const params = useMemo(() => computeRange(rangeMode, custom), [rangeMode, custom]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["project-analytics", mainProjectId, params.date_from, params.date_to],
    queryFn: () => analyticsApi.getProjectAnalytics(mainProjectId, params),
    enabled: !!mainProjectId,
    refetchOnWindowFocus: true,
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ["allocations"],
    queryFn: () => allocationApi.getAll(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeeApi.getAll(),
  });

  const annotators = data?.annotators || [];

  useEffect(() => {
    if (data?.name) setPageDetailTitle(data.name);
    return () => setPageDetailTitle(null);
  }, [data?.name]);

  const allEmails = annotators.map((a) => a.user_email);
  const activeSel = selected ?? allEmails;
  const colorFor = (email) =>
    SERIES[annotators.findIndex((a) => a.user_email === email) % SERIES.length];

  const toggle = (email) => {
    const base = selected ?? allEmails;
    setSelected(
      base.includes(email) ? base.filter((e) => e !== email) : [...base, email]
    );
  };

  const { groupOf, tabs: orgTabs } = useMemo(() => buildGroups(annotators), [annotators]);
  const effectiveFilter = orgTabs.some((t) => t.key === orgFilter) ? orgFilter : "all";

  const visibleAnnotators =
    effectiveFilter === "all"
      ? annotators
      : annotators.filter((a) => groupOf(a.user_email) === effectiveFilter);

  const visibleEmails = visibleAnnotators.map((a) => a.user_email);
  const allVisibleOn =
    visibleEmails.length > 0 && visibleEmails.every((e) => activeSel.includes(e));
  const selectAllVisible = () =>
    setSelected([...new Set([...activeSel, ...visibleEmails])]);
  const deselectAllVisible = () =>
    setSelected(activeSel.filter((e) => !visibleEmails.includes(e)));

  const changeGroup = (key) => {
    setOrgFilter(key);
    const emails =
      key === "all"
        ? allEmails
        : annotators.filter((a) => groupOf(a.user_email) === key).map((a) => a.user_email);
    setSelected(emails);
  };

  const comparisonData = useMemo(() => {
    if (!data) return [];
    const lookup = {};
    annotators.forEach((a) => {
      lookup[a.user_email] = Object.fromEntries(
        a.daily.map((p) => [p.date, p.hours])
      );
    });
    return data.daily.map((d) => {
      const row = { date: d.date };
      const active = [];
      activeSel.forEach((e) => {
        const v = lookup[e]?.[d.date] ?? 0;
        row[e] = v;
        if (v > 0) active.push(v);
      });
      row.__avg = active.length
        ? Math.round((active.reduce((a, b) => a + b, 0) / active.length) * 100) / 100
        : null;
      return row;
    });
  }, [data, annotators, activeSel]);

  const stageData = useMemo(() => {
    if (!data?.month) return [];
    return [
      { stage: "Annotation", hours: data.month.annotation_hours || data.month.platform_hours || 0 },
      { stage: "Review", hours: data.month.review_hours || 0 },
    ].filter((s) => s.hours > 0);
  }, [data]);

  const teamRosterData = useMemo(() => {
    const projectAllocations = allocations.filter(
      (a) => String(a.sub_project_id) === String(mainProjectId)
    );

    const empMap = {};
    employees.forEach((e) => {
      empMap[e.email?.toLowerCase()] = e;
      empMap[e.id] = e;
    });

    return annotators.map((a) => {
      const emp = empMap[a.user_email?.toLowerCase()] || {};
      // Match only by employee — projectAllocations is already scoped to this project,
      // so an OR on sub_project_id was always true and returned the first row for everyone. (Bug resolved)
      const alloc = projectAllocations.find(
        (al) => emp.id != null && al.employee_id === emp.id
      );

      const dailyHours = alloc?.total_daily_hours ?? alloc?.hours_per_day ?? 0;
      const role =
        (Array.isArray(alloc?.role_tags) && alloc.role_tags[0]) ||
        alloc?.role ||
        "Annotator";

      return {
        id: emp.id || a.user_email,
        name: emp.name || a.employee_name || a.user_email,
        email: a.user_email,
        avatar_url: emp.avatar_url,
        role,
        planned_hours: alloc ? dailyHours * 20 : 80,
        actual_hours: a.total_hours || 0,
        tasks_submitted: a.tasks_submitted || 0,
        labels_created: a.labels_created || 0,
      };
    });
  }, [annotators, allocations, employees, mainProjectId]);

  const projectPlannedVsActual = useMemo(() => {
    if (!data?.daily) return [];
    const dailyAllocationTarget = 4;
    return data.daily.map((d) => ({
      label: d.date,
      plannedHours: dailyAllocationTarget,
      actualHours: d.platform_hours || 0,
    }));
  }, [data]);

  if (isLoading)
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" color="indigo" />
      </div>
    );

  if (isError || !data)
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        Could not load analytics for this project.
      </div>
    );

  return (
    <div className="space-y-3">
      {/* Back Button Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-200">
        <button
          type="button"
          onClick={() => navigate(`${basePath}/analytics`)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-indigo-600 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Global Dashboard
        </button>

        <span className="text-xs font-bold text-stone-700 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
          {data.name}
        </span>
      </div>

      {/* ── PANEL 1: EXECUTION & VARIANCE ───────────────────────────────── */}
      {activePanel === "execution" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <GlassKpiCard icon={Clock} label="Platform Hours" value={`${data.month.platform_hours}h`} subtitle="Selected range" tone="indigo" />
            <GlassKpiCard icon={Gauge} label="Annotation Avg" value={`${data.month.avg_hours_per_annotator}h`} subtitle="Per active annotator" tone="emerald" />
            <GlassKpiCard icon={Gauge} label="Avg Hr / Person" value={`${data.month.avg_hours_per_person ?? 0}h`} subtitle="Per person in project" tone="sky" />
            <GlassKpiCard
              icon={Users}
              label="Active Annotators"
              value={data.fixed?.today?.active_annotators ?? 0}
              subtitle={data.fixed?.today?.date ? `As of ${shortDate(data.fixed.today.date)}` : ">1h annotation"}
              tone="violet"
            />
            <GlassKpiCard icon={Gauge} label="Platform / Person" value={`${data.fixed?.today?.avg_hours_per_annotator ?? 0}h`} subtitle="Daily average" tone="amber" />
          </div>

          {/* Navigation Tabs & Range Selection Bar */}
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-stone-200">
            <AnalyticsTabNav tabs={PROJECT_TABS} activeTab={activePanel} onChange={setActivePanel} />

            <div className="inline-flex items-center gap-0.5 p-0.5 bg-stone-100/90 rounded-xl border border-stone-200 select-none shrink-0">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRangeMode(r.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                    rangeMode === r.key
                      ? "bg-white text-indigo-600 shadow-sm ring-1 ring-stone-200 font-bold"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {rangeMode === "custom" && (
            <div className="flex items-center gap-2 text-xs p-2.5 rounded-xl bg-stone-50 border border-stone-200">
              <input
                type="date"
                value={custom.from}
                onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
                className="input text-xs text-stone-900 bg-white"
              />
              <span className="text-stone-400">→</span>
              <input
                type="date"
                value={custom.to}
                onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
                className="input text-xs text-stone-900 bg-white"
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_1px_4px_rgba(28,25,23,0.06)] flex flex-col justify-between">
              <div className="mb-3">
                <h3 className="text-sm font-bold text-stone-900">Daily Platform Execution Trend</h3>
                <p className="text-xs text-stone-400 font-medium">Autonex team active editor time across the project</p>
              </div>
              <DailyPlatformHoursChart
                isGlobal={false}
                data={data?.daily}
                height={250}
                color="#2563eb"
                selectedProject={{ name: data?.name }}
              />
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_1px_4px_rgba(28,25,23,0.06)] flex flex-col justify-between">
              <div className="mb-3">
                <h3 className="text-sm font-bold text-stone-900">Daily Allocation Target vs. Logged Execution</h3>
                <p className="text-xs text-stone-400 font-medium">Comparing daily scheduled baseline hours against actual Encord logged hours</p>
              </div>
              <PlannedVsActualChart data={projectPlannedVsActual} height={250} />
            </div>
          </div>
        </div>
      )}

      {/* ── PANEL 2: WORKFLOW & THROUGHPUT ──────────────────────────────── */}
      {activePanel === "throughput" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-1 rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_1px_4px_rgba(28,25,23,0.06)]">
              <h3 className="text-sm font-bold text-stone-900 mb-1">Workflow Stage Split</h3>
              <p className="text-xs text-stone-400 font-medium mb-3">Annotation vs Review split</p>
              <StageDistributionChart data={stageData} height={220} />
            </div>

            <div className="lg:col-span-2 rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_1px_4px_rgba(28,25,23,0.06)]">
              <div className="mb-3">
                <h3 className="text-sm font-bold text-stone-900">Annotator Activity Heatmap Matrix</h3>
                <p className="text-xs text-stone-400 font-medium">Daily editor hours intensity grid across team members</p>
              </div>
              <AnnotatorComparisonChart annotators={annotators} dailyData={data?.daily || []} />
            </div>
          </div>
        </div>
      )}

      {/* ── PANEL 3: TEAM ROSTER & UTILIZATION ──────────────────────────── */}
      {activePanel === "roster" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-stone-900">Project Team Utilization & Output Roster</h3>
            <ProjectTeamRosterTable roster={teamRosterData} isLoading={isLoading} />
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_1px_4px_rgba(28,25,23,0.06)] space-y-2">
            <h3 className="text-sm font-bold text-stone-900">PM Project Delivery Notes & Sentiment</h3>
            <div className="flex items-start gap-2.5 pt-1">
              <MessageSquare className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
              <p className="text-xs text-stone-700 whitespace-pre-wrap leading-relaxed font-medium">
                {data.sentiment || <span className="text-stone-400">No sentiment notes recorded yet for this project.</span>}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectAnalyticsPage;
