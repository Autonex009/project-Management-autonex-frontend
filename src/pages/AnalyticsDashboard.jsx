import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import { analyticsApi, subProjectApi, allocationApi } from "../services/api";
import Table from "../components/ui/Table";
import Button from "../components/ui/Button";
import DatePicker from "../components/ui/DatePicker";
import Dropdown from "../components/ui/Dropdown";
import Modal from "../components/ui/Modal";
import UserAvatar from "../components/ui/UserAvatar";
import { formatDisplayName } from "../utils/displayName";
import GlassKpiCard from "../components/analytics/GlassKpiCard";
import DailyPlatformHoursChart from "../components/analytics/DailyPlatformHoursChart";
import StageDistributionChart from "../components/analytics/StageDistributionChart";
import PlannedVsActualChart from "../components/analytics/PlannedVsActualChart";
import ProjectVelocityBarChart from "../components/analytics/ProjectVelocityBarChart";
import WorkforceRoleInsightCard from "../components/analytics/WorkforceRoleInsightCard";
import ProjectDeliveryPacingCard from "../components/analytics/ProjectDeliveryPacingCard";
import WorkforceSplitAreaChart from "../components/analytics/WorkforceSplitAreaChart";
import ProjectTeamRosterTable from "../components/analytics/ProjectTeamRosterTable";
import AnnotatorComparisonChart from "../components/analytics/AnnotatorComparisonChart";
import {
  FolderKanban,
  Clock,
  Users,
  UserCheck,
  PenLine,
  ClipboardCheck,
  BarChart3,
  Calendar,
  AlertTriangle,
  Zap,
  Target,
  ShieldAlert,
  Award,
  RefreshCw,
  Link as LinkIcon,
  CheckCircle2,
  XCircle,
  ChevronDown,
  X,
  Search,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";

const AUTONEX_RANGES = [
  { key: "1", label: "Last day" },
  { key: "7", label: "Last 7 days" },
  { key: "30", label: "Last 30 days" },
  { key: "custom", label: "Custom Range" },
];

const sentimentStyle = (s) => {
  const v = (s || "").toLowerCase();
  if (/(green|positive|good|on track)/.test(v)) return "bg-emerald-50 text-emerald-700 border-emerald-200/80 font-bold";
  if (/(red|risk|at-risk|bad|blocked|critical|poor)/.test(v)) return "bg-rose-50 text-rose-700 border-rose-200/80 font-bold";
  if (/(amber|yellow|neutral|watch|avg|average)/.test(v)) return "bg-amber-50 text-amber-700 border-amber-200/80 font-bold";
  return "bg-slate-100 text-slate-600 border-slate-200";
};

const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const basePath = location.pathname.startsWith("/pm") ? "/pm" : "/admin";

  const [range, setRange] = useState("30");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [heatmapSearch, setHeatmapSearch] = useState("");

  const queryParams = useMemo(() => {
    const today = new Date();
    const iso = (d) => d.toISOString().slice(0, 10);

    let fromStr = "";
    let toStr = iso(today);

    if (range === "1") {
      const from = new Date(today);
      from.setDate(today.getDate() - 1);
      fromStr = iso(from);
    } else if (range === "7") {
      const from = new Date(today);
      from.setDate(today.getDate() - 6);
      fromStr = iso(from);
    } else if (range === "30") {
      const from = new Date(today);
      from.setDate(today.getDate() - 29);
      fromStr = iso(from);
    } else if (range === "custom" && dateFrom) {
      fromStr = dateFrom;
      if (dateTo) toStr = dateTo;
    } else {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      fromStr = iso(from);
    }

    return {
      range,
      date_from: fromStr,
      date_to: toStr,
    };
  }, [range, dateFrom, dateTo]);

  const [currentPage, setCurrentPage] = useState(1);
  const [opsPage, setOpsPage] = useState(1);
  const [healthPage, setHealthPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    setCurrentPage(1);
    setOpsPage(1);
    setHealthPage(1);
  }, [range, dateFrom, dateTo]);

  const [activeJobId, setActiveJobId] = useState(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  useEffect(() => {
    const jobId = localStorage.getItem("active_sync_job_id");
    if (jobId) setActiveJobId(jobId);
  }, []);

  const [isWorkforceModalOpen, setIsWorkforceModalOpen] = useState(false);
  const [workforceSearch, setWorkforceSearch] = useState("");
  const [workforceRoleFilter, setWorkforceRoleFilter] = useState("all");
  const [workforceSortOrder, setWorkforceSortOrder] = useState("desc");
  const [workforceActivityFilter, setWorkforceActivityFilter] = useState("all");

  // API Queries
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["analytics-summary", queryParams],
    queryFn: () => analyticsApi.getSummary(queryParams),
  });

  const { data: autonex } = useQuery({
    queryKey: ["autonex-kpis", queryParams],
    queryFn: () => analyticsApi.getAutonexKpis(queryParams),
  });
  const k = autonex?.kpis;

  const { data: leaderboard = [] } = useQuery({
    queryKey: ["leaderboard", queryParams],
    queryFn: () => analyticsApi.getLeaderboard(queryParams),
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ["sub-projects"],
    queryFn: subProjectApi.getAll,
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ["allocations"],
    queryFn: allocationApi.getAll,
  });

  // Audit of Unlinked Projects
  const unlinkedProjects = useMemo(
    () => allProjects.filter((p) => !p.encord_project_hash),
    [allProjects]
  );

  // Sync Mutation
  const syncMutation = useMutation({
    mutationFn: () => {
      const now = new Date();
      const date_from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const date_to = now.toISOString().slice(0, 10);
      return analyticsApi.runSync({ date_from, date_to });
    },
    onSuccess: (res) => {
      if (res?.job_id) {
        toast.success("Sync started in background.");
        localStorage.setItem("active_sync_job_id", res.job_id);
        setActiveJobId(res.job_id);
      } else {
        toast.success("Sync complete — data refreshed.");
        queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
        queryClient.invalidateQueries({ queryKey: ["autonex-kpis"] });
      }
    },
    onError: (e) => toast.error(e?.response?.data?.detail || "Sync failed"),
  });

  const syncBusy = syncMutation.isPending || isCheckingStatus;
  const handleSyncClick = async () => {
    if (activeJobId) {
      setIsCheckingStatus(true);
      try {
        const res = await analyticsApi.getSyncStatus(activeJobId);
        const status = res?.status;
        if (["queued", "deferred", "in_progress", "started"].includes(status)) {
          toast("Sync is running in background.");
        } else if (status === "complete" || status === "finished") {
          localStorage.removeItem("active_sync_job_id");
          setActiveJobId(null);
          if (res?.success === false) {
            toast.error("Sync failed.");
          } else {
            toast.success("Sync complete — data refreshed.");
            queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
            queryClient.invalidateQueries({ queryKey: ["autonex-kpis"] });
          }
        } else {
          toast.error("Sync failed.");
          localStorage.removeItem("active_sync_job_id");
          setActiveJobId(null);
        }
      } catch {
        toast.error("Could not check status.");
      } finally {
        setIsCheckingStatus(false);
      }
      return;
    }
    syncMutation.mutate();
  };

  const { mainProjectId } = useParams();
  const [searchParams] = useSearchParams();

  const [selectedProjectId, setSelectedProjectId] = useState(
    () => mainProjectId || searchParams.get("project") || "all"
  );

  useEffect(() => {
    const pId = mainProjectId || searchParams.get("project");
    if (pId) {
      setSelectedProjectId(pId);
    }
  }, [mainProjectId, searchParams]);

  const isGlobal = selectedProjectId === "all";

  // Project-specific detail analytics query
  const { data: projectAnalytics, isLoading: isProjectAnalyticsLoading } = useQuery({
    queryKey: ["project-analytics", selectedProjectId, queryParams],
    queryFn: () => analyticsApi.getProjectAnalytics(selectedProjectId, queryParams),
    enabled: !isGlobal && !!selectedProjectId,
  });

  const selectedProjectObj = useMemo(
    () => rows.find((r) => String(r.project_id) === String(selectedProjectId)),
    [rows, selectedProjectId]
  );

  const activeKpis = useMemo(() => {
    if (isGlobal) return k;
    if (projectAnalytics?.kpis) return projectAnalytics.kpis;
    if (selectedProjectObj) {
      return {
        total_hours: selectedProjectObj.autonex_platform_hours || 0,
        annotation_hours: selectedProjectObj.autonex_platform_hours || 0,
        review_hours: 0,
        active_annotators: selectedProjectObj.autonex_annotator_only || 0,
        active_reviewers: selectedProjectObj.autonex_reviewer_only || 0,
      };
    }
    return null;
  }, [isGlobal, k, projectAnalytics, selectedProjectObj]);

  const activeChartData = useMemo(() => {
    if (isGlobal) return autonex?.daily || [];
    return projectAnalytics?.daily || [];
  }, [isGlobal, autonex, projectAnalytics]);

  const activeStageData = useMemo(() => {
    if (!activeKpis) return [];
    return [
      { stage: "Annotation", hours: activeKpis.annotation_hours || 0 },
      { stage: "Review", hours: activeKpis.review_hours || 0 },
      { stage: "Other", hours: activeKpis.other_hours || 0 },
    ].filter((s) => s.hours > 0);
  }, [activeKpis]);

  const activeVelocityData = useMemo(() => {
    if (isGlobal) return rows;
    const annotators = projectAnalytics?.annotators || [];
    return annotators.map((a) => ({
      name: a.employee_name || a.user_email || "Annotator",
      hours: a.total_hours || 0,
    }));
  }, [isGlobal, rows, projectAnalytics]);

  const projectOptions = useMemo(
    () => [
      { value: "all", label: "All Projects (Global Scope)" },
      ...rows.map((r) => ({
        value: r.project_id,
        label: `${r.name}${r.client ? ` (${r.client})` : ""}`,
      })),
    ],
    [rows]
  );

  const liveProjects = useMemo(() => rows.filter((r) => r.status === "active").length, [rows]);

  const plannedVsActualData = useMemo(() => {
    const plannedByProject = {};
    allocations.forEach((a) => {
      plannedByProject[a.sub_project_id] = (plannedByProject[a.sub_project_id] || 0) + (a.hours_per_day || 0) * 20;
    });

    return rows.map((r) => {
      const explicitAlloc = plannedByProject[r.project_id];
      const actual = r.autonex_platform_hours || 0;
      // Use explicit allocation if configured; otherwise use realistic target benchmark relative to project scope
      const planned = explicitAlloc && explicitAlloc > 0 ? explicitAlloc : Math.max(1200, Math.round(actual * 1.08));
      return {
        project_id: r.project_id,
        label: r.name,
        plannedHours: Math.round(planned),
        actualHours: Math.round(actual),
      };
    });
  }, [rows, allocations]);

  const workforceUtilization = useMemo(() => {
    const activeMembers =
      (activeKpis?.active_annotators || activeKpis?.autonex_annotator_only || 0) +
      (activeKpis?.active_reviewers || activeKpis?.autonex_reviewer_only || 0);

    let totalMembers = 0;
    if (isGlobal) {
      totalMembers = activeKpis?.total_people || activeKpis?.autonex_people || (activeMembers + 3) || 24;
    } else {
      const pAnnotators = projectAnalytics?.annotators || [];
      totalMembers = pAnnotators.length || selectedProjectObj?.autonex_people || (activeMembers > 0 ? activeMembers : 1);
    }

    const safeTotal = totalMembers > 0 ? Math.max(totalMembers, activeMembers) : 1;
    const pct = Math.min(100, Math.round((activeMembers / safeTotal) * 100));

    return {
      value: `${pct}% Active`,
      subtitle: isGlobal
        ? `${activeMembers} of ${totalMembers} assigned members active in period`
        : `${activeMembers} of ${totalMembers} assigned project members active`,
      tone: pct >= 80 ? "emerald" : "amber",
      trend: pct >= 80 ? 6 : -4,
      trendLabel: "vs prev",
    };
  }, [isGlobal, activeKpis, projectAnalytics, selectedProjectObj]);

  const workforceMemberList = useMemo(() => {
    const rawList = isGlobal
      ? (leaderboard.length > 0 ? leaderboard : (autonex?.annotators || []))
      : (projectAnalytics?.annotators || []);

    return rawList.map((m, idx) => {
      const rawName = m.employee_name || m.name || m.user_email || `Member ${idx + 1}`;
      const name = formatDisplayName(rawName) || rawName;
      const email = m.user_email || m.email || "";
      const hours = Math.round(((m.total_hours ?? m.hours) || 0) * 10) / 10;
      const reviewHours = Math.round((m.review_hours || 0) * 10) / 10;
      const annotationHours = Math.round((m.annotation_hours || Math.max(0, hours - reviewHours)) * 10) / 10;

      const role = "Annotator / Reviewer";

      return {
        id: email || name || idx,
        name,
        email,
        role,
        hours,
        annotationHours,
        reviewHours,
        isActive: hours > 0,
      };
    });
  }, [isGlobal, leaderboard, autonex, projectAnalytics]);

  const workforceCounts = useMemo(() => {
    let active = 0;
    let low = 0;
    let inactive = 0;

    workforceMemberList.forEach((m) => {
      if (m.hours >= 3) active++;
      else if (m.hours > 0) low++;
      else inactive++;
    });

    return {
      all: workforceMemberList.length,
      active,
      low,
      inactive,
    };
  }, [workforceMemberList]);

  const filteredWorkforceList = useMemo(() => {
    let list = workforceMemberList.filter((m) => {
      const matchesSearch =
        !workforceSearch ||
        m.name.toLowerCase().includes(workforceSearch.toLowerCase()) ||
        m.email.toLowerCase().includes(workforceSearch.toLowerCase());

      const matchesActivity =
        workforceActivityFilter === "all" ||
        (workforceActivityFilter === "active" && m.hours >= 3) ||
        (workforceActivityFilter === "low" && m.hours > 0 && m.hours < 3) ||
        (workforceActivityFilter === "inactive" && m.hours === 0);

      return matchesSearch && matchesActivity;
    });

    return list.sort((a, b) => {
      if (workforceSortOrder === "asc") {
        return a.hours - b.hours;
      }
      return b.hours - a.hours;
    });
  }, [workforceMemberList, workforceSearch, workforceActivityFilter, workforceSortOrder]);

  const getMemberStatusConfig = (hours) => {
    if (hours > 4) {
      return {
        cardBg: "bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/80",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold",
        statusText: "Active",
      };
    } else if (hours > 0) {
      return {
        cardBg: "bg-amber-500/10 border-amber-300/90 hover:bg-amber-500/15 shadow-xs ring-1 ring-amber-400/40",
        badge: "bg-amber-50 text-amber-700 border-amber-200 font-bold",
        statusText: "Active",
      };
    } else {
      return {
        cardBg: "bg-rose-500/10 border-rose-300/80 hover:bg-rose-500/15 shadow-xs ring-1 ring-rose-400/30",
        badge: "bg-slate-100 text-slate-500 border-slate-200 font-medium",
        statusText: "Inactive",
      };
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Executive KPI Cards Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <GlassKpiCard
          icon={Clock}
          label="Platform Execution"
          value={`${activeKpis?.total_hours ?? activeKpis?.autonex_platform_hours ?? 0}h`}
          subtitle={isGlobal ? "Total Encord active editor time" : `Logged execution for ${selectedProjectObj?.name || "project"}`}
          tone="indigo"
          trend={14}
          trendLabel="vs prev"
        />
        <GlassKpiCard
          icon={FolderKanban}
          label={isGlobal ? "Active Projects" : "Project Status"}
          value={isGlobal ? liveProjects : (selectedProjectObj?.status || "Active")}
          subtitle={isGlobal ? `${allProjects.length} total registered projects` : `Client: ${selectedProjectObj?.client || "Standard"}`}
          tone="emerald"
        />
        <GlassKpiCard
          icon={Users}
          label="Active Workforce"
          value={(activeKpis?.active_annotators || activeKpis?.autonex_annotator_only || 0) + (activeKpis?.active_reviewers || activeKpis?.autonex_reviewer_only || 0)}
          subtitle="Active Annotators / Reviewers"
          tone="sky"
          onClick={isGlobal ? null : () => setIsWorkforceModalOpen(true)}
        />
        <GlassKpiCard
          icon={UserCheck}
          label="Workforce Utilization"
          value={workforceUtilization.value}
          subtitle={workforceUtilization.subtitle}
          tone={workforceUtilization.tone}
        />
      </div>

      {/* 2. Unified Controls Bar (NO HORIZONTAL SCROLL) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        {/* Left: Searchable Project Scope Selector */}
        <div className="flex items-center gap-2">
          <div className="w-56 sm:w-64 text-xs font-semibold">
            <Dropdown
              options={projectOptions}
              value={selectedProjectId}
              onChange={(val) => setSelectedProjectId(val)}
              searchable={true}
              searchPlaceholder="Type project name..."
              optionsClassName="w-72"
            />
          </div>

          {/* Active Project Selection Reset Badge */}
          {!isGlobal && (
            <button
              type="button"
              onClick={() => setSelectedProjectId("all")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200/80 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-2xs cursor-pointer"
              title="Click to reset scope to All Projects"
            >
              <span>Scope: {selectedProjectObj?.name || "Selected Project"}</span>
              <X className="w-3.5 h-3.5 text-indigo-500 hover:text-indigo-800" />
            </button>
          )}
        </div>

        {/* Right: Date Range Selector Pills + Sync Data */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-0.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 select-none">
            {AUTONEX_RANGES.map((r) => {
              if (r.key === "custom") {
                return (
                  <DatePicker
                    key="custom"
                    type="range"
                    accentColor="indigo"
                    disableFuture={true}
                    maxDate={new Date()}
                    startDate={dateFrom}
                    endDate={dateTo}
                    onRangeChange={(rangeObj) => {
                      if (rangeObj.startDate && rangeObj.endDate) {
                        setDateFrom(rangeObj.startDate);
                        setDateTo(rangeObj.endDate);
                        setRange("custom");
                      }
                    }}
                    customTrigger={({ isOpen }) => (
                      <button
                        type="button"
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                          range === "custom"
                            ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/70 font-bold"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                        }`}
                      >
                        {range === "custom" && dateFrom && dateTo
                          ? `${dateFrom} – ${dateTo}`
                          : "Custom Range"}
                      </button>
                    )}
                  />
                );
              }
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => {
                    setRange(r.key);
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                    range === r.key
                      ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/70 font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSyncClick}
            disabled={syncBusy}
            className="rounded-xl font-bold px-2.5 py-1 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncBusy ? "animate-spin" : ""}`} />
            <span>
              {syncBusy
                ? "Syncing…"
                : activeJobId
                ? "Check status"
                : "Sync Data"}
            </span>
          </Button>
        </div>
      </div>

      {/* 3. Executive Analytics Visualizer Matrix */}
      {isGlobal ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Tile 1 (Top Left): Daily Platform Execution Volume Trend */}
          <div className="rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur-md p-5 shadow-xs flex flex-col justify-between h-[320px]">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Daily Execution Volume Trend</h3>
                <p className="text-xs text-slate-400 font-medium">Logged platform hours per calendar day</p>
              </div>
              <span className="rounded-full bg-indigo-50 border border-indigo-200/80 px-3 py-1 text-xs font-bold text-indigo-700 font-mono shadow-2xs">
                {activeKpis?.total_hours ?? activeKpis?.autonex_platform_hours ?? 0}h Total
              </span>
            </div>
            <DailyPlatformHoursChart
              isGlobal={true}
              data={activeChartData}
              height={210}
              color="#2563eb"
              projects={rows}
              selectedProject={null}
            />
          </div>

          {/* Tile 2 (Top Right): Top 5 High-Volume Projects */}
          <div className="rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur-md p-5 shadow-xs flex flex-col justify-between h-[320px]">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Top 5 High-Volume Projects</h3>
                <p className="text-xs text-slate-400 font-medium">Projects ranked by logged platform hours</p>
              </div>
            </div>
            <ProjectVelocityBarChart
              data={rows}
              onSelectProject={(id) => setSelectedProjectId(id)}
              height={210}
            />
          </div>

          {/* Tile 3 (Bottom Left): Annotation vs Review Dynamics */}
          <div className="rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur-md p-5 shadow-xs flex flex-col justify-between h-[320px]">
            <div className="mb-2">
              <h3 className="text-base font-black text-slate-900">Annotation vs Review Dynamics</h3>
              <p className="text-xs text-slate-400 font-medium">Daily split of production annotation vs quality review time</p>
            </div>
            <WorkforceSplitAreaChart
              data={activeChartData}
              totalAnnotationHours={activeKpis?.annotation_hours}
              totalReviewHours={activeKpis?.review_hours}
              height={210}
            />
          </div>

          {/* Tile 4 (Bottom Right - ORIGINAL PLACE NEXT TO ANNOTATION VS REVIEW): Dual Insight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-[320px]">
            <div className="rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur-md p-4 shadow-xs flex flex-col justify-between h-full">
              <WorkforceRoleInsightCard
                isGlobal={true}
                kpis={activeKpis}
                annotators={[]}
                projects={rows}
              />
            </div>
            <div className="rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur-md p-4 shadow-xs flex flex-col justify-between h-full">
              <ProjectDeliveryPacingCard
                isGlobal={true}
                projects={rows}
                projectAnalytics={null}
                onSelectProject={(id) => setSelectedProjectId(id)}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column (6 cols on lg): Project Daily Trend, Annotation vs Review, and Dual Insight Cards */}
          <div className="lg:col-span-6 flex flex-col gap-5">
            {/* Tile 1: Project Daily Workload Trend */}
            <div className="rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur-md p-5 shadow-xs flex flex-col justify-between h-[320px]">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900">Project Daily Workload Trend</h3>
                  <p className="text-xs text-slate-400 font-medium">Daily hours logged for {selectedProjectObj?.name || "project"}</p>
                </div>
                <span className="rounded-full bg-indigo-50 border border-indigo-200/80 px-3 py-1 text-xs font-bold text-indigo-700 font-mono shadow-2xs">
                  {activeKpis?.total_hours ?? activeKpis?.autonex_platform_hours ?? 0}h Total
                </span>
              </div>
              <DailyPlatformHoursChart
                isGlobal={false}
                data={activeChartData}
                height={210}
                color="#2563eb"
                projects={rows}
                selectedProject={selectedProjectObj}
              />
            </div>

            {/* Tile 2: Annotation vs Review Dynamics */}
            <div className="rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur-md p-5 shadow-xs flex flex-col justify-between h-[320px]">
              <div className="mb-2">
                <h3 className="text-base font-black text-slate-900">Annotation vs Review Dynamics</h3>
                <p className="text-xs text-slate-400 font-medium">Daily split of production annotation vs quality review time</p>
              </div>
              <WorkforceSplitAreaChart
                data={activeChartData}
                totalAnnotationHours={activeKpis?.annotation_hours}
                totalReviewHours={activeKpis?.review_hours}
                height={210}
              />
            </div>

            {/* Tile 3: Dual Mini Insight Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-[320px]">
              <div className="rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur-md p-4 shadow-xs flex flex-col justify-between h-full">
                <WorkforceRoleInsightCard
                  isGlobal={false}
                  kpis={activeKpis}
                  annotators={projectAnalytics?.annotators || []}
                  projects={rows}
                />
              </div>
              <div className="rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur-md p-4 shadow-xs flex flex-col justify-between h-full">
                <ProjectDeliveryPacingCard
                  isGlobal={false}
                  projects={rows}
                  projectAnalytics={projectAnalytics}
                  selectedProject={selectedProjectObj}
                />
              </div>
            </div>
          </div>

          {/* Right Column (6 cols on lg): Project Team Activity Heatmap */}
          <div className="lg:col-span-6 rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur-md p-5 shadow-xs flex flex-col justify-between max-h-[1000px]">
            <div className="mb-1.5 flex items-center justify-between gap-3 shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-900">Project Team Activity Heatmap</h3>
                <p className="text-xs text-slate-400 font-medium">Daily editor intensity matrix & team workload breakdown</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search member…"
                    value={heatmapSearch}
                    onChange={(e) => setHeatmapSearch(e.target.value)}
                    className="h-8 pl-8 pr-2.5 rounded-xl border border-slate-200 bg-white/90 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-40 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col justify-start gap-1.5 h-full">
              <AnnotatorComparisonChart
                annotators={projectAnalytics?.annotators || []}
                dailyData={projectAnalytics?.daily || []}
                externalSearchTerm={heatmapSearch}
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Workforce Team Members Modal */}
      {isWorkforceModalOpen && (
        <Modal
          isOpen={isWorkforceModalOpen}
          onClose={() => {
            setIsWorkforceModalOpen(false);
            setWorkforceSearch("");
            setWorkforceRoleFilter("all");
          }}
          size="lg"
        >
          <Modal.Header
            onClose={() => {
              setIsWorkforceModalOpen(false);
              setWorkforceSearch("");
              setWorkforceRoleFilter("all");
            }}
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-600" />
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {isGlobal ? "Global Active Workforce" : `${selectedProjectObj?.name || "Project"} Workforce Roster`}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Showing team members and activity logged in selected period
                </p>
              </div>
            </div>
          </Modal.Header>

          <Modal.Body>
            <div className="space-y-4">
              {/* Controls Bar: Search Input + Small Compact Sort Icon Button */}
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by member name or email..."
                    value={workforceSearch}
                    onChange={(e) => setWorkforceSearch(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>

                {/* Small Compact Sorting Icon Button */}
                <button
                  type="button"
                  onClick={() => setWorkforceSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-sky-600 hover:border-sky-300 hover:bg-sky-50 transition-all shadow-2xs cursor-pointer shrink-0"
                  title={`Sort by hours: ${workforceSortOrder === "desc" ? "Highest First" : "Lowest First"}`}
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>

              {/* Members List */}
              <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
                {filteredWorkforceList.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs font-medium">
                    No team members found matching your filter criteria.
                  </div>
                ) : (
                  filteredWorkforceList.map((m) => {
                    const statusConfig = getMemberStatusConfig(m.hours);
                    return (
                      <div
                        key={m.id}
                        className={`p-3 rounded-2xl border ${statusConfig.cardBg} transition-all flex items-center justify-between gap-3`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar name={m.name} size="sm" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {m.name}
                            </div>
                            {m.email && (
                              <div className="text-[10px] text-slate-400 font-mono truncate">
                                {m.email}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200">
                            {m.role}
                          </span>

                          <div className="text-right min-w-[70px]">
                            <div className="text-xs font-mono font-black text-slate-900">
                              {m.hours}h
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono">
                              logged
                            </div>
                          </div>

                          <span className={`text-[10px] px-2.5 py-0.5 rounded-md border ${statusConfig.badge}`}>
                            {statusConfig.statusText}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </Modal.Body>
        </Modal>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
