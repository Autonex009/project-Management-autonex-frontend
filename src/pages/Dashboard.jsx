import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  subProjectApi,
  employeeApi,
  allocationApi,
  leaveApi,
  skillsApi,
  analyticsApi,
  parentProjectApi,
  wfhApi,
} from "../services/api";
import {
  todayLocalISO,
  getOnLeaveTodayIds,
  getWfhTodayIds,
  buildAssignedProjectsMap,
  bucketWorkforce,
} from "../utils/workforce";
import {
  FolderKanban,
  Users,
  ChevronRight,
  CalendarDays,
  Home,
} from "lucide-react";
import Table from "../components/ui/Table";
import Button from "../components/ui/Button";
import StatCard from "../components/dashboard/StatCard";
import SplitStatCard from "../components/dashboard/SplitStatCard";
import MostActivePanel from "../components/dashboard/MostActivePanel";
import MetricDots from "../components/ui/MetricDots";
import { getWorkingDays } from "../utils/dateCalculations";

// The three engagement buckets, colour-matched to the dots on the Employees page
// so Active / Inactive / Idle mean the same colour wherever they appear.
const BUCKET_TONES = [
  {
    key: "active",
    label: "active",
    dot: "bg-emerald-500",
    text: "text-emerald-600",
  },
  {
    key: "inactive",
    label: "inactive",
    dot: "bg-slate-400",
    text: "text-slate-500",
  },
  { key: "idle", label: "idle", dot: "bg-amber-500", text: "text-amber-600" },
];

// Reads as three glanceable chips rather than one grey sentence.
const WorkforceSplit = ({ workforce }) => (
  <MetricDots
    items={BUCKET_TONES.map(({ key, label, dot, text }) => ({
      label,
      value: workforce[key].length,
      dot,
      tone: text,
    }))}
  />
);

// A project is archived unless its status is active-ish — mirrors the same list
// in ProjectsPage so "archived" means one thing across both screens.
const ARCHIVED_PROJECT_STATUSES = ["completed", "on-hold", "cancelled"];
const isArchivedProject = (project) =>
  ARCHIVED_PROJECT_STATUSES.includes(
    (project?.project_status || "active").toLowerCase().trim(),
  );

const NO_ORG = "— No Organization —";
const NO_VENDOR = "— No Vendor —";

/**
 * Count projects per key, biggest first. `keysOf` returns an ARRAY because a
 * project can carry several vendors (workforce_vendors is a list) — such a
 * project counts once under each, so a vendor column can total more than the
 * project count. The unassigned bucket always sorts last.
 */
const countProjectsBy = (projects, keysOf, emptyLabel) => {
  const counts = new Map();
  projects.forEach((project) => {
    const keys = keysOf(project);
    (keys.length ? keys : [emptyLabel]).forEach((key) => {
      const label = String(key).trim() || emptyLabel;
      counts.set(label, (counts.get(label) || 0) + 1);
    });
  });
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => {
      if (a.label === emptyLabel) return 1;
      if (b.label === emptyLabel) return -1;
      return b.value - a.value || a.label.localeCompare(b.label);
    });
};

// Same treatment as the workforce split: colour-coded so active vs archived reads
// at a glance instead of as grey prose.
const ProjectSplit = ({ active, archived }) => (
  <MetricDots
    items={[
      {
        label: "active",
        value: active,
        dot: "bg-emerald-500",
        tone: "text-emerald-600",
      },
      {
        label: "archived",
        value: archived,
        dot: "bg-slate-400",
        tone: "text-slate-500",
      },
    ]}
  />
);

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
// Formats a YYYY-MM-DD string without going through Date(), which would reparse
// it as UTC midnight and can shift the day in IST.
const shortDate = (iso) => {
  const [, m, d] = String(iso || "")
    .slice(0, 10)
    .split("-");
  if (!m || !d) return "";
  return `${MONTHS[Number(m) - 1]} ${Number(d)}`;
};
const rangeLabel = (from, to) =>
  !to || to === from ? shortDate(from) : `${shortDate(from)}–${shortDate(to)}`;

/**
 * Split pending requests into Past / Today / Future relative to today.
 *
 * This is what makes a large pending count readable: a queue of 46 is mostly
 * stale requests for dates that have already gone by, and lumping them in with
 * today's makes the number look wrong. Each request is a date RANGE, so "today"
 * means the range covers today, not that it starts today.
 */
const splitPendingByTiming = (rows, { startKey, endKey, nameOf }, todayStr) => {
  const past = [];
  const today = [];
  const future = [];

  rows.forEach((row) => {
    const from = String(row[startKey] || "").slice(0, 10);
    if (!from) return;
    const to = String(row[endKey] || row[startKey] || "").slice(0, 10);
    const person = {
      id: row.id ?? row.leave_id,
      employeeId: row.employee_id,
      name: nameOf(row),
      meta: rangeLabel(from, to),
      from,
      isEmergency: row.is_emergency,
    };
    if (from <= todayStr && to >= todayStr) today.push(person);
    else if (from > todayStr) future.push(person);
    else past.push(person);
  });

  // Soonest first for what's ahead; most recent first for what's behind.
  today.sort((a, b) => a.from.localeCompare(b.from));
  future.sort((a, b) => a.from.localeCompare(b.from));
  past.sort((a, b) => b.from.localeCompare(a.from));

  return { past, today, future };
};

const workforceSections = (workforce, breakdownRows) => [
  {
    title: `Active (${workforce.active.length}) — working today`,
    rows: breakdownRows,
  },
];

// ===============================================
// DASHBOARD COMPONENT
// ===============================================

const Dashboard = () => {
  const navigate = useNavigate();
  const [projectPage, setProjectPage] = useState(1);

  const { data: dashboardKpis } = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: () => analyticsApi.getDashboardKpis(),
  });

  const { data: paginatedProjectsData, isLoading: projectsLoading, isFetching: projectsFetching } = useQuery({
    queryKey: ["sub-projects-paginated", projectPage, 5],
    queryFn: () => subProjectApi.getPaginated({ page: projectPage, limit: 5 }),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fallback to empty array for components that still need a list
  const projects = paginatedProjectsData?.items || [];


  const { data: skillsSummary = {} } = useQuery({
    queryKey: ["skillsSummary"],
    queryFn: () => skillsApi.getSummary(),
  });

  // Autonex most-active user + project (this month, by time spent on Encord).
  const { data: autonexOverview } = useQuery({
    queryKey: ["autonex-overview"],
    queryFn: () => analyticsApi.getAutonexOverview(),
    // Encord data refreshes once a day; no need to poll in the background.
    refetchOnWindowFocus: true,
  });
  // Daily series behind the panel's sparkline. The overview above is calendar
  // month-to-date while this is a trailing 30 days, so the sparkline is labelled
  // as such rather than implying it matches the headline window.
  const { data: autonexKpis } = useQuery({
    queryKey: ["autonex-kpis", "30"],
    queryFn: () => analyticsApi.getAutonexKpis("30"),
    refetchOnWindowFocus: true,
  });
  // Per-project Autonex figures (hours / annotators / reviewers) for the Project
  // Status table. Month-to-date; keyed by project_id.
  const { data: analyticsSummary = [] } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: () => analyticsApi.getSummary(),
    refetchOnWindowFocus: true,
  });
  const autonexDaily = autonexKpis?.daily || [];

  const totalProjects = dashboardKpis?.projects?.total ?? 0;
  const archivedProjects = dashboardKpis?.projects?.archived ?? 0;
  const activeProjects = dashboardKpis?.projects?.active ?? 0;

  // Which organisation / vendor each project belongs to. Organisation is the
  // free-text `client` on the MAIN project — the same field the project card
  // shows beneath the title — and vendors come from the sub-project's own list.
  const projectsByOrganisation = useMemo(
    () =>
      countProjectsBy(
        projects,
        (p) => {
          const org = p.client;
          return org ? [org] : [];
        },
        NO_ORG,
      ),
    [projects],
  );
  const projectsByVendor = useMemo(
    () =>
      countProjectsBy(
        projects,
        (p) => (p.workforce_vendors || []).filter(Boolean),
        NO_VENDOR,
      ),
    [projects],
  );


  // Engagement comes from the shared rules in utils/workforce so this page and
  // the Employees page can't drift apart again. Previously this counted only
  // status === "active" and treated any non-rejected leave as absence, which is
  // why Team Available read 199 here against 204 on the Employees page.
  const todayStr = todayLocalISO();


  // Replace workforce buckets with counts directly from dashboardKpis
  const workforce = useMemo(() => ({
    onRoster: { length: dashboardKpis?.employees?.total || 0 },
    active: { length: dashboardKpis?.employees?.active || 0 },
    inactive: { length: dashboardKpis?.employees?.inactive || 0 },
    idle: { length: dashboardKpis?.employees?.idle || 0 },
  }), [dashboardKpis]);

  // ── Leave / WFH desk ───────────────────────────────────────────────────────
  // GET /leaves is served through a response model that drops employee_name, so
  // leave names are joined here. WFH responses do carry employee_name.


  const isPending = (row) => (row?.status || "").toLowerCase() === "pending";

  const leaveDesk = useMemo(() => {
    const kpi = dashboardKpis?.leaves || {};
    const pending = kpi.pending_list || [];
    return {
      pendingCount: kpi.to_review || 0,
      todayCount: kpi.on_leave || 0,
      todayPeople: kpi.today_people || [],
      timing: splitPendingByTiming(
        pending,
        {
          startKey: "start_date",
          endKey: "end_date",
          nameOf: (l) => l.employee_name,
        },
        todayStr,
      ),
    };
  }, [dashboardKpis, todayStr]);

  const wfhDesk = useMemo(() => {
    const kpi = dashboardKpis?.wfh || {};
    const pending = kpi.pending_list || [];
    return {
      pendingCount: kpi.to_review || 0,
      todayCount: kpi.on_wfh || 0,
      todayPeople: kpi.today_people || [],
      timing: splitPendingByTiming(
        pending,
        {
          startKey: "start_date",
          endKey: "end_date",
          nameOf: (r) => r.employee_name,
        },
        todayStr,
      ),
    };
  }, [dashboardKpis, todayStr]);

  // KPI cards navigate with router state so useBreadcrumbTrail treats it as a
  // drill rather than a top-level jump — the trail then reads
  // "Autonex › Dashboard › Leaves" instead of resetting to just the destination.
  const goFromKpi = (path) => navigate(path, { state: { from: "dashboard" } });
  // Clicking a name opens the target page pre-filtered to that person by
  // seeding its existing search box via ?q=.
  const goToPerson = (basePath, person) =>
    goFromKpi(
      `${basePath}${basePath.includes("?") ? "&" : "?"}q=${encodeURIComponent(person.name)}`,
    );

  const timingTabs = (timing) => [
    { label: "Today", people: timing.today },
    { label: "Future", people: timing.future },
    { label: "Past", people: timing.past },
  ];

  // Project analysis


  // Autonex per-project figures keyed by project id (from the analytics summary).
  const summaryById = useMemo(() => {
    const m = {};
    for (const r of analyticsSummary) m[r.project_id] = r;
    return m;
  }, [analyticsSummary]);

  const SENTIMENT_ORDER = { Poor: 0, AVG: 1, GOOD: 2 };
  const projectAnalyses = useMemo(
    () =>
      projects
        .map((p) => {
          const s = summaryById[p.id] || {};
          return {
            id: p.id,
            project: {
              ...p,
              name: p.name,
              client: p.client || "Internal",
              sentiment: p.sentiment || "unknown",
            },
            autonexHours: s.autonex_platform_hours ?? null,
            annotators: p.autonex_annotators || 0,
            reviewers: p.autonex_reviewers || 0,
          };
        })
        .sort((a, b) => {
          const oa = SENTIMENT_ORDER[a.project.sentiment] ?? 3;
          const ob = SENTIMENT_ORDER[b.project.sentiment] ?? 3;
          if (oa !== ob) return oa - ob;
          return (b.autonexHours ?? 0) - (a.autonexHours ?? 0);
        }),
    [projects, summaryById],
  );

  // ── People breakdowns (on-roster staff) ────────────────────────────────────
  // On-roster = everyone except archived/former, so the breakdowns no longer
  // silently drop the stored-"inactive" staff the Employees page includes.

  // "Full-Time", "full time" and "full_time" all mean the same thing in the
  // employees table (see the sync_employee_type_values migration), so compare
  // on a normalised form rather than the raw string.
  const norm = (v) =>
    (v || "")
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-");

  // Assigns every employee to the FIRST bucket that matches and sweeps the
  // remainder into "Other / unset". Buckets therefore always sum to
  // list.length, so a breakdown can never silently lose people the way the
  // old employee_type counts dropped Part-time and blank values.




  // Ordered most-specific first: "Annotator/ Reviewer" must be claimed before
  // any looser rule, and legacy spellings (Annotator, Reviewer) fold into it.


  const roleBreakdown = useMemo(
    () => {
      const byDesig = dashboardKpis?.employees?.by_designation || {};
      return Object.entries(byDesig).map(([label, value]) => ({ label, value })).sort((a,b) => b.value - a.value);
    },
    [dashboardKpis],
  );

  const typeBreakdown = useMemo(
    () => {
      const byType = dashboardKpis?.employees?.by_type || {};
      return Object.entries(byType).map(([label, value]) => ({ label, value })).sort((a,b) => b.value - a.value);
    },
    [dashboardKpis],
  );
  // Project sentiment badge (PM-set): GOOD / AVG / Poor.
  const SentimentBadge = ({ sentiment }) => {
    const config = {
      GOOD: { text: "text-emerald-600 ", bg: "bg-emerald-50 ", label: "Good" },
      AVG: { text: "text-amber-600 ", bg: "bg-amber-50 ", label: "Avg" },
      Poor: { text: "text-red-600 ", bg: "bg-red-50 ", label: "Poor" },
    };
    const c = config[sentiment];
    if (!c) return <span className="text-xs text-slate-400 ">-</span>;
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${c.bg} ${c.text}`}
      >
        {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}

      {/* ===== KPI cards (compact, 2/3) + Most active (1/3) =====
          items-start keeps the short KPI row from stretching to the taller panel. */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        {/* Left column: compact KPI row stacked above Project Status, so the table
            fills the space alongside the much taller Most active panel. */}
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              compact
              title="Total Employees"
              label="On roster"
              value={dashboardKpis?.employees?.total || 0}
              icon={Users}
              tone="amber"
              hint={
                <MetricDots
                  items={[
                    {
                      label: "active",
                      value: dashboardKpis?.employees?.active || 0,
                      dot: "bg-emerald-500",
                      tone: "text-emerald-600",
                    },
                    {
                      label: "inactive",
                      value: dashboardKpis?.employees?.inactive || 0,
                      dot: "bg-slate-400",
                      tone: "text-slate-500",
                    },
                    {
                      label: "idle",
                      value: dashboardKpis?.employees?.idle || 0,
                      dot: "bg-amber-500",
                      tone: "text-amber-600",
                    },
                  ]}
                />
              }
              // Same three buckets cut two ways, behind a tab strip: what people DO
              // (designation) and how they're employed (type).
              breakdownTabs={[
                {
                  label: "By designation",
                  sections: workforceSections(workforce, roleBreakdown),
                },
                {
                  label: "By type",
                  sections: workforceSections(workforce, typeBreakdown),
                },
              ]}
              breakdownFooter={`${workforce.onRoster.length} on roster · excludes archived`}
              onClick={() => goFromKpi("/admin/employees")}
            />
            <StatCard
              compact
              title="Total Projects"
              label="All projects"
              value={totalProjects}
              icon={FolderKanban}
              tone="emerald"
              hint={
                <ProjectSplit
                  active={activeProjects}
                  archived={archivedProjects}
                />
              }
              breakdownTabs={[
                {
                  label: "Organisation",
                  sections: [{ rows: projectsByOrganisation }],
                },
                { label: "Vendor", sections: [{ rows: projectsByVendor }] },
              ]}
              breakdownFooter={`${totalProjects} projects · includes archived`}
              onClick={() => goFromKpi("/admin/sub-projects")}
            />
            {/* Leave + WFH share one slot, split across the card's height. */}
            <SplitStatCard
              halves={[
                {
                  key: "leave",
                  title: "Leave",
                  icon: CalendarDays,
                  tone: "rose",
                  stats: [
                    {
                      value: dashboardKpis?.leaves?.to_review || 0,
                      label: "to review",
                      tone: dashboardKpis?.leaves?.to_review
                        ? "text-amber-600"
                        : "text-slate-400",
                    },
                    { value: dashboardKpis?.leaves?.on_leave || 0, label: "on leave" },
                  ],
                  tabs: timingTabs(leaveDesk.timing),
                  todayPeople: leaveDesk.todayPeople,
                  emptyLabel: "Nothing pending for this period",
                  onClick: () => goFromKpi("/admin/leaves"),
                  onSelectPerson: (person) =>
                    goToPerson("/admin/leaves", person),
                },
                {
                  key: "wfh",
                  title: "Work from home",
                  icon: Home,
                  tone: "violet",
                  stats: [
                    {
                      value: dashboardKpis?.wfh?.to_review || 0,
                      label: "to review",
                      tone: dashboardKpis?.wfh?.to_review
                        ? "text-amber-600"
                        : "text-slate-400",
                    },
                    { value: dashboardKpis?.wfh?.on_wfh || 0, label: "on WFH" },
                  ],
                  tabs: timingTabs(wfhDesk.timing),
                  todayPeople: wfhDesk.todayPeople,
                  emptyLabel: "Nothing pending for this period",
                  onClick: () => goFromKpi("/admin/leaves?tab=WFH%20Requests"),
                  onSelectPerson: (person) =>
                    goToPerson("/admin/leaves?tab=WFH%20Requests", person),
                },
              ]}
            />
          </div>

          <Table
            variant="v1"
            title="Project Status"
            count={`${dashboardKpis?.projects?.active || 0} active`}
            headerAction={
              <button
                type="button"
                onClick={() => goFromKpi("/admin/projects")}
                className="hidden sm:flex items-center text-[13px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                View all
                <ChevronRight className="w-4 h-4 ml-0.5" />
              </button>
            }
            loading={projectsFetching}
            data={projectAnalyses}
            rowClassName={(row) =>
              row?.project?.encord_project_hash
                ? "group cursor-pointer"
                : "group"
            }
            onRowClick={(row) => {
              // Analytics only exists for Encord-mapped projects.
              if (row?.project?.encord_project_hash) {
                navigate(`/admin/analytics/${row.project.id}`, {
                  state: { from: "dashboard" },
                });
              }
            }}
            totalItems={paginatedProjectsData?.total || 0}
            currentPage={projectPage}
            pageSize={5}
            onPageChange={setProjectPage}
            columns={[
              {
                key: "project",
                label: "Project",
                render: (project) => (
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-800 ">
                      {project.name}
                    </div>
                    <div className="truncate text-xs text-slate-400 ">
                      {project.client}
                    </div>
                  </div>
                ),
              },
              {
                key: "_hours",
                label: "Autonex Hrs",
                align: "center",
                width: "w-28",
                render: (_, row) => (
                  <span className="font-mono text-sm text-slate-700">
                    {row.autonexHours != null ? `${row.autonexHours}h` : "—"}
                  </span>
                ),
              },
              {
                key: "_ann",
                label: "Annotators",
                align: "center",
                width: "w-24",
                render: (_, row) => (
                  <span className="text-slate-700">
                    {row.annotators ?? "—"}
                  </span>
                ),
              },
              {
                key: "_rev",
                label: "Reviewers",
                align: "center",
                width: "w-24",
                render: (_, row) => (
                  <span className="text-slate-700">
                    {row.reviewers ?? "—"}
                  </span>
                ),
              },
              {
                key: "_sentiment",
                label: "Sentiment",
                align: "left",
                width: "w-28",
                render: (_, row) => (
                  <SentimentBadge sentiment={row.project.sentiment} />
                ),
              },
            ]}
            emptyState={{
              title: "No projects",
              description: "Active projects will appear here",
            }}
          />
        </div>

        {/* Most active — Encord time this month, Users / Projects behind tabs */}
        <MostActivePanel
          overview={autonexOverview}
          daily={autonexDaily}
          onViewAnalytics={() => goFromKpi("/admin/analytics")}
          onOpenProject={(projectId) =>
            goFromKpi(`/admin/analytics/${projectId}`)
          }
          onViewAllUsers={() => goFromKpi("/admin/employees")}
        />
      </div>
    </div>
  );
};

export default Dashboard;
