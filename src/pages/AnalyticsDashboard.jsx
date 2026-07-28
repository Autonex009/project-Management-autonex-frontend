import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { analyticsApi } from "../services/api";
import Table from "../components/ui/Table";
import Button from "../components/ui/Button";
import {
  FolderKanban,
  Clock,
  Users,
  UserCheck,
  PenLine,
  ClipboardCheck,
  RefreshCw,
  BarChart3,
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
];

const shortDate = (s) => {
  try {
    return format(parseISO(s), "MMM d");
  } catch {
    return s;
  }
};

const AutonexKpiCard = ({ icon: Icon, label, value, tone = "indigo" }) => {
  const tones = {
    indigo: "bg-indigo-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    sky: "bg-sky-500",
    violet: "bg-violet-500",
    rose: "bg-rose-500",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg text-white ${tones[tone]}`}
      >
        {Icon && <Icon className="h-[18px] w-[18px]" />}
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
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
  const queryClient = useQueryClient();

  // One range control drives every Autonex KPI + the chart.
  const [range, setRange] = useState("30");
  const rangeLabel = AUTONEX_RANGES.find((r) => r.key === range)?.label ?? "";

  // The sync runs as a background job: the button starts it (returns a job id we
  // persist), and a later click polls that job's status instead of starting a new one.
  const [activeJobId, setActiveJobId] = useState(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  useEffect(() => {
    const jobId = localStorage.getItem("active_sync_job_id");
    if (jobId) setActiveJobId(jobId);
  }, []);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: analyticsApi.getSummary,
    // Encord data is refreshed once a day by the scheduler, so there is nothing
    // to gain from background polling — refetch on mount/focus is enough.
    refetchOnWindowFocus: true,
  });

  const { data: autonex } = useQuery({
    queryKey: ["autonex-kpis", range],
    queryFn: () => analyticsApi.getAutonexKpis(range),
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Project Analytics
          </h1>
          <p className="mt-0.5 text-[13px] text-slate-500">
            Autonex team activity across all mapped projects — figures used for
            billing.
          </p>
        </div>
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

      {/* Unified Autonex KPIs — all driven by the selected range */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
        onRowClick={(row) => navigate(`/admin/analytics/${row.project_id}`)}
        columns={[
          {
            key: "name",
            label: "Project",
            render: (value, row) => (
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${row.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`}
                ></span>
                <div>
                  <div className="font-medium text-slate-800">{value}</div>
                  {row.client && (
                    <div className="text-xs text-slate-400">{row.client}</div>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: "autonex_platform_hours",
            label: "Autonex Hours",
            align: "center",
            render: (v) => (
              <span className="font-mono text-slate-700">{v ?? 0}h</span>
            ),
          },
          {
            key: "autonex_annotator_only",
            label: "Annotator only",
            align: "center",
            render: (v, row) => (
              <span
                title={
                  (row.autonex_annotator_only_names || []).join("\n") || "None"
                }
                className={`text-slate-700 ${v ? "cursor-help underline decoration-dotted decoration-slate-300 underline-offset-2" : ""}`}
              >
                {v ?? 0}
              </span>
            ),
          },
          {
            key: "autonex_reviewer_only",
            label: "Reviewer only",
            align: "center",
            render: (v, row) => (
              <span
                title={
                  (row.autonex_reviewer_only_names || []).join("\n") || "None"
                }
                className={`text-slate-700 ${v ? "cursor-help underline decoration-dotted decoration-slate-300 underline-offset-2" : ""}`}
              >
                {v ?? 0}
              </span>
            ),
          },
          {
            key: "autonex_both",
            label: "Both",
            align: "center",
            render: (v, row) => (
              <span
                title={(row.autonex_both_names || []).join("\n") || "None"}
                className={`text-slate-700 ${v ? "cursor-help underline decoration-dotted decoration-slate-300 underline-offset-2" : ""}`}
              >
                {v ?? 0}
              </span>
            ),
          },
          {
            key: "autonex_people",
            label: "People",
            align: "center",
            render: (v) => <span className="text-slate-700">{v ?? 0}</span>,
          },
          {
            key: "sentiment",
            label: "Sentiment",
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
