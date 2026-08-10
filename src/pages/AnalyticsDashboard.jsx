import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { analyticsApi } from "../services/api";
import Table from "../components/ui/Table";
import Button from "../components/ui/Button";
import DatePicker from "../components/ui/DatePicker";
import {
  FolderKanban,
  Clock,
  Users,
  UserCheck,
  PenLine,
  ClipboardCheck,
  RefreshCw,
  BarChart3,
  Layers,
  ChevronDown,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { format, parseISO } from "date-fns";
import toast from "react-hot-toast";

const AUTONEX_RANGES = [
  { key: "1", label: "Last day" },
  { key: "7", label: "Last 7 days" },
  { key: "30", label: "Last 30 days" },
  { key: "custom", label: "Custom Range" },
];

const shortDate = (s) => {
  try {
    return format(parseISO(s), "MMM d");
  } catch {
    return s;
  }
};

const TONE_CLASSES = {
  indigo: { iconBg: "bg-indigo-50 text-indigo-600 border border-indigo-100/80" },
  emerald: { iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-100/80" },
  amber: { iconBg: "bg-amber-50 text-amber-600 border border-amber-100/80" },
  sky: { iconBg: "bg-sky-50 text-sky-600 border border-sky-100/80" },
  violet: { iconBg: "bg-violet-50 text-violet-600 border border-violet-100/80" },
  rose: { iconBg: "bg-rose-50 text-rose-600 border border-rose-100/80" },
  slate: { iconBg: "bg-slate-100 text-slate-600 border border-slate-200/80" },
};

const AutonexKpiCard = ({ icon: Icon, label, value, tone = "indigo", breakdown }) => {
  const toneStyle = TONE_CLASSES[tone] || TONE_CLASSES.indigo;
  const hasBreakdown = Array.isArray(breakdown) && breakdown.length > 0;

  return (
    <div
      className={`group relative bg-white border border-slate-200/70 rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:shadow-md transition-all duration-200`}
    >
      <div>
        <div className="flex items-center gap-2.5 min-w-0 mb-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${toneStyle.iconBg}`}>
            {Icon && <Icon className="w-4 h-4" />}
          </div>
          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider leading-tight flex items-center gap-1 min-w-0 flex-1">
            <span>{label}</span>
            {hasBreakdown && <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 inline" />}
          </div>
        </div>
        <div className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight font-mono truncate" title={String(value)}>
          {value}
        </div>
      </div>

      {hasBreakdown && (
        <div className="pointer-events-none absolute right-0 top-full z-30 mt-1.5 w-max min-w-[220px] max-w-[320px] origin-top-right scale-95 rounded-xl border border-slate-200 bg-white p-2.5 opacity-0 shadow-xl transition-all duration-150 group-hover:scale-100 group-hover:opacity-100">
          <p className="px-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Where time went
          </p>
          <div className="space-y-0.5">
            {breakdown.map((b) => (
              <div
                key={b.stage}
                className="flex items-center justify-between gap-6 rounded-md px-1.5 py-1 text-xs hover:bg-slate-50"
              >
                <span className="whitespace-nowrap text-slate-600">
                  {b.stage}
                </span>
                <span className="shrink-0 font-mono text-slate-800">
                  {b.hours}h
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const sentimentStyle = (s) => {
  const v = (s || "").toLowerCase();
  if (/(green|positive|good|on track)/.test(v))
    return "bg-emerald-50 text-emerald-700";
  if (/(red|risk|at-risk|bad|blocked|critical|poor)/.test(v))
    return "bg-red-50 text-red-700";
  if (/(amber|yellow|neutral|watch|avg|average)/.test(v))
    return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
};

const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const basePath = location.pathname.startsWith("/pm") ? "/pm" : "/admin";

  // One range control drives every Autonex KPI + the chart.
  const [range, setRange] = useState("30");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const rangeLabel = AUTONEX_RANGES.find((r) => r.key === range)?.label ?? "";

  const queryParams = useMemo(() => {
    const p = { range };
    if (range === "custom" && dateFrom) {
      p.date_from = dateFrom;
      if (dateTo) p.date_to = dateTo;
    }
    return p;
  }, [range, dateFrom, dateTo]);

  // The sync runs as a background job: the button starts it (returns a job id we
  // persist), and a later click polls that job's status instead of starting a new one.
  const [activeJobId, setActiveJobId] = useState(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  useEffect(() => {
    const jobId = localStorage.getItem("active_sync_job_id");
    if (jobId) setActiveJobId(jobId);
  }, []);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["analytics-summary", queryParams],
    queryFn: () => analyticsApi.getSummary(queryParams),
    // Encord data is refreshed once a day by the scheduler, so there is nothing
    // to gain from background polling — refetch on mount/focus is enough.
    refetchOnWindowFocus: true,
  });

  const { data: autonex } = useQuery({
    queryKey: ["autonex-kpis", queryParams],
    queryFn: () => analyticsApi.getAutonexKpis(queryParams),
    refetchOnWindowFocus: true,
  });
  const k = autonex?.kpis;

  const syncMutation = useMutation({
    // Manual sync backfills the current month so freshly-mapped projects populate
    // immediately (the daily scheduled job only pulls the previous day).
    mutationFn: () => {
      const now = new Date();
      const date_from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const date_to = now.toISOString().slice(0, 10);
      return analyticsApi.runSync({ date_from, date_to });
    },
    onSuccess: (res) => {
      if (res?.job_id) {
        // Async (Redis/Railway): a background job was queued — poll it later.
        toast.success(
          "Sync started — it runs in the background. Click again later to check status.",
        );
        localStorage.setItem("active_sync_job_id", res.job_id);
        setActiveJobId(res.job_id);
      } else {
        // Inline (serverless/no Redis): the sync already ran — refresh now.
        toast.success("Sync complete — refreshing data.");
        queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
        queryClient.invalidateQueries({ queryKey: ["autonex-kpis"] });
      }
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || "Sync failed to start"),
  });

  // Sync button: if a job is already running, poll its status; otherwise start one.
  const syncBusy = syncMutation.isPending || isCheckingStatus;
  const handleSyncClick = async () => {
    if (activeJobId) {
      setIsCheckingStatus(true);
      try {
        const res = await analyticsApi.getSyncStatus(activeJobId);
        const status = res?.status;
        if (["queued", "deferred", "in_progress", "started"].includes(status)) {
          toast("Sync is still running in the background — check back soon.");
        } else if (status === "complete" || status === "finished") {
          // arq marks a crashed job "complete" with success=false — treat that as a failure.
          localStorage.removeItem("active_sync_job_id");
          setActiveJobId(null);
          if (res?.success === false) {
            toast.error(
              "The background sync failed — you can start a new one.",
            );
          } else {
            toast.success("Sync finished — refreshing data.");
            queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
            queryClient.invalidateQueries({ queryKey: ["autonex-kpis"] });
          }
        } else if (status === "failed") {
          toast.error("The background sync failed — you can start a new one.");
          localStorage.removeItem("active_sync_job_id");
          setActiveJobId(null);
        }
      } catch {
        toast.error("Could not check sync status — please try again.");
      } finally {
        setIsCheckingStatus(false);
      }
      return;
    }
    syncMutation.mutate();
  };

  const liveProjects = useMemo(
    () => rows.filter((r) => r.status === "active").length,
    [rows],
  );
  const chartData = autonex?.daily || [];

  return (
    <div className="space-y-5">
      {/* Header + single range control */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-end">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
            {AUTONEX_RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${range === r.key ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Button
            variant="secondary"
            onClick={handleSyncClick}
            disabled={syncBusy}
          >
            <RefreshCw
              className={`w-4 h-4 ${syncBusy ? "animate-spin" : ""}`}
            />
            {syncBusy
              ? "Processing…"
              : activeJobId
                ? "Check sync status"
                : "Sync now"}
          </Button>
        </div>
      </div>

      {/* Custom Date Pickers (visible only when 'custom' range is selected) */}
      {range === "custom" && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900">
            <Calendar className="h-4 w-4 text-indigo-600" />
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

      {/* Unified Autonex KPIs — all driven by the selected range */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <AutonexKpiCard
          icon={FolderKanban}
          label="Live Projects"
          value={liveProjects}
          tone="indigo"
        />
        <AutonexKpiCard
          icon={Clock}
          label="Platform Hours"
          value={`${k?.total_hours ?? 0}h`}
          tone="emerald"
        />
        <AutonexKpiCard
          icon={Users}
          label="Active Annotators"
          value={k?.active_annotators ?? 0}
          tone="sky"
        />
        <AutonexKpiCard
          icon={UserCheck}
          label="Active Reviewers"
          value={k?.active_reviewers ?? 0}
          tone="violet"
        />
        <AutonexKpiCard
          icon={PenLine}
          label="Annotation Time"
          value={`${k?.annotation_hours ?? 0}h`}
          tone="amber"
        />
        <AutonexKpiCard
          icon={ClipboardCheck}
          label="Review Time"
          value={`${k?.review_hours ?? 0}h`}
          tone="rose"
        />
        <AutonexKpiCard
          icon={Layers}
          label="Other"
          value={`${k?.other_hours ?? 0}h`}
          tone="slate"
          breakdown={k?.other_breakdown}
        />
      </div>

      {/* Daily platform hours */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Daily platform hours
            </p>
            <p className="text-xs text-slate-400">
              Autonex team · {rangeLabel.toLowerCase()}
            </p>
          </div>
          <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 tabular-nums">
            {k?.total_hours ?? 0}h total
          </span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="#eef0f4"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
                padding={{ left: 8, right: 8 }}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={52}
                tickFormatter={(v) => `${v}h`}
                allowDecimals={false}
              />
              <Tooltip
                labelFormatter={shortDate}
                formatter={(v) => [`${v}h`, "Platform hours"]}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                  fontSize: 13,
                }}
                cursor={{ fill: "#eef2ff" }}
              />
              <Bar
                dataKey="hours"
                name="Hours"
                fill="#2a78d6"
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-project breakdown */}
      <Table
        variant="untitled"
        loading={isLoading}
        onRowClick={(row) => navigate(`${basePath}/analytics/${row.project_id}`)}
        columns={[
          {
            key: "name",
            label: "Project",
            width: "w-[30%]",
            render: (value, row) => (
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${row.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`}
                ></span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-800 text-[13.5px] truncate" title={value}>
                    {value}
                  </div>
                  {row.client && (
                    <div className="text-xs text-slate-400 truncate" title={row.client}>
                      {row.client}
                    </div>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: "autonex_platform_hours",
            label: "Autonex Hours",
            width: "w-[14%]",
            align: "right",
            render: (v) => (
              <span className="font-mono text-slate-700">{v ?? 0}h</span>
            ),
          },
          {
            key: "autonex_annotator_only",
            label: "Annotator only",
            width: "w-[12%]",
            align: "right",
            render: (v, row) => (
              <span
                title={
                  (row.autonex_annotator_only_names || []).join("\n") || "None"
                }
                className={`text-slate-700 ${v ? "underline decoration-dotted decoration-slate-300 underline-offset-2" : ""}`}
              >
                {v ?? 0}
              </span>
            ),
          },
          {
            key: "autonex_reviewer_only",
            label: "Reviewer only",
            width: "w-[12%]",
            align: "right",
            render: (v, row) => (
              <span
                title={
                  (row.autonex_reviewer_only_names || []).join("\n") || "None"
                }
                className={`text-slate-700 ${v ? "underline decoration-dotted decoration-slate-300 underline-offset-2" : ""}`}
              >
                {v ?? 0}
              </span>
            ),
          },
          {
            key: "autonex_both",
            label: "Both",
            width: "w-[9%]",
            align: "right",
            render: (v, row) => (
              <span
                title={(row.autonex_both_names || []).join("\n") || "None"}
                className={`text-slate-700 ${v ? "underline decoration-dotted decoration-slate-300 underline-offset-2" : ""}`}
              >
                {v ?? 0}
              </span>
            ),
          },
          {
            key: "autonex_people",
            label: "People",
            width: "w-[9%]",
            align: "right",
            render: (v) => <span className="text-slate-700">{v ?? 0}</span>,
          },
          {
            key: "sentiment",
            label: "Sentiment",
            width: "w-[14%]",
            align: "right",
            render: (v) =>
              v ? (
                <span
                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${sentimentStyle(v)}`}
                >
                  {v.length > 40 ? v.slice(0, 40) + "…" : v}
                </span>
              ) : (
                <span className="text-slate-300">—</span>
              ),
          },
        ]}
        data={rows}
        emptyState={{
          title: "No Encord-mapped projects yet",
          description:
            "Set an Encord Project ID on a project (Projects → Edit Project), then run a sync.",
          icon: BarChart3,
        }}
      />
    </div>
  );
};

export default AnalyticsDashboard;
