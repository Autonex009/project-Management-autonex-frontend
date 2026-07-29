import { useQuery } from "@tanstack/react-query";
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

// One popover tab: the same three buckets, composed by whichever cut is passed in.
const workforceSections = (workforce, composeFn) => [
  {
    title: `Active (${workforce.active.length}) — working today`,
    rows: composeFn(workforce.active),
  },
  {
    title: `Inactive (${workforce.inactive.length}) — on leave today`,
    rows: composeFn(workforce.inactive),
  },
  {
    title: `Idle (${workforce.idle.length}) — no project assigned`,
    rows: composeFn(workforce.idle),
  },
];

// ===============================================
// DASHBOARD COMPONENT
// ===============================================

const Dashboard = () => {
  const navigate = useNavigate();
  const [projectPage, setProjectPage] = useState(1);

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["sub-projects"],
    queryFn: subProjectApi.getAll,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: employeeApi.getAll,
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ["allocations"],
    queryFn: allocationApi.getAll,
  });

  // Needed to credit program managers with the projects they run — without it a
  // PM holding no worker allocation of their own counts as Idle here while the
  // Employees page counts them Active.
  const { data: mainProjects = [] } = useQuery({
    queryKey: ["parent-projects"],
    queryFn: parentProjectApi.getAll,
    staleTime: 5 * 60 * 1000,
  });

  // Unscoped on purpose, and keyed identically to the Leaves page so the two
  // share one cache entry. The previous month-window missed pending requests
  // dated next month, which the "pending review" count has to include — and it
  // also hid leaves overlapping a project window that ends beyond this month.
  const { data: leaves = [] } = useQuery({
    queryKey: ["leaves"],
    queryFn: leaveApi.getAll,
  });

  // Same cache key as the Leaves page's WFH tab.
  const { data: wfhRequests = [] } = useQuery({
    queryKey: ["wfh"],
    queryFn: () => wfhApi.getAll(),
  });

  const { data: skillsSummary = {} } = useQuery({
    queryKey: ["skillsSummary"],
    queryFn: skillsApi.getSummary,
  });

  // Autonex most-active user + project (this month, by time spent on Encord).
  const { data: autonexOverview } = useQuery({
    queryKey: ["autonex-overview"],
    queryFn: analyticsApi.getAutonexOverview,
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
  const autonexDaily = autonexKpis?.daily || [];

  // Stats. The list endpoint returns every project, archived included, so this
  // total is the real project count.
  const totalProjects = projects.length;
  // Active is the complement of archived rather than project_status === "active":
  // "in-progress", "poc" and blank are all live statuses (see STATUS_CONFIG in
  // ProjectsPage), so a strict equality check dropped them and the two figures
  // failed to add up to the total.
  const archivedProjects = projects.filter(isArchivedProject).length;
  const activeProjects = totalProjects - archivedProjects;

  // Which organisation / vendor each project belongs to. Organisation is the
  // free-text `client` on the MAIN project — the same field the project card
  // shows beneath the title — and vendors come from the sub-project's own list.
  const mainProjectById = useMemo(
    () => new Map(mainProjects.map((mp) => [String(mp.id), mp])),
    [mainProjects],
  );
  const projectsByOrganisation = useMemo(
    () =>
      countProjectsBy(
        projects,
        (p) => {
          const org = mainProjectById.get(String(p.main_project_id))?.client;
          return org ? [org] : [];
        },
        NO_ORG,
      ),
    [projects, mainProjectById],
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

  const allocatedEmployeeIds = new Set(allocations.map((a) => a.employee_id));

  // Engagement comes from the shared rules in utils/workforce so this page and
  // the Employees page can't drift apart again. Previously this counted only
  // status === "active" and treated any non-rejected leave as absence, which is
  // why Team Available read 199 here against 204 on the Employees page.
  const todayStr = todayLocalISO();
  const assignedProjectsMap = useMemo(
    () =>
      buildAssignedProjectsMap({
        allocations,
        mainProjects,
        subProjects: projects,
      }),
    [allocations, mainProjects, projects],
  );
  const onLeaveTodayIds = useMemo(
    () => getOnLeaveTodayIds(leaves, todayStr),
    [leaves, todayStr],
  );
  const workforce = useMemo(
    () =>
      bucketWorkforce({
        employees,
        onLeaveIds: onLeaveTodayIds,
        projectsMap: assignedProjectsMap,
      }),
    [employees, onLeaveTodayIds, assignedProjectsMap],
  );

  // ── Leave / WFH desk ───────────────────────────────────────────────────────
  // GET /leaves is served through a response model that drops employee_name, so
  // leave names are joined here. WFH responses do carry employee_name.
  const nameById = useMemo(
    () => new Map(employees.map((e) => [String(e.id), e.name])),
    [employees],
  );
  const nameOf = (employeeId, fallback) =>
    nameById.get(String(employeeId)) || fallback || `#${employeeId}`;

  const isPending = (row) => (row?.status || "").toLowerCase() === "pending";

  const leaveDesk = useMemo(() => {
    const pending = leaves.filter(isPending);
    return {
      pendingCount: pending.length,
      todayCount: onLeaveTodayIds.size,
      timing: splitPendingByTiming(
        pending,
        {
          startKey: "start_date",
          endKey: "end_date",
          nameOf: (l) => nameOf(l.employee_id),
        },
        todayStr,
      ),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaves, onLeaveTodayIds, todayStr, nameById]);

  const wfhDesk = useMemo(() => {
    const pending = wfhRequests.filter(isPending);
    return {
      pendingCount: pending.length,
      todayCount: getWfhTodayIds(wfhRequests, todayStr).size,
      timing: splitPendingByTiming(
        pending,
        {
          startKey: "wfh_date",
          endKey: "end_date",
          nameOf: (r) => nameOf(r.employee_id, r.employee_name),
        },
        todayStr,
      ),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wfhRequests, todayStr, nameById]);

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
  const getProjectAnalysis = useMemo(
    () => (project) => {
      if (!project.end_date) return { status: "unknown", recommendation: null };

      // Use remaining tasks if available, otherwise total tasks
      const taskCount =
        project.remaining_tasks !== undefined
          ? project.remaining_tasks
          : project.total_tasks;
      const requiredHours = taskCount * project.estimated_time_per_task;
      const workingDaysRemaining = getWorkingDays(new Date(), project.end_date);

      if (workingDaysRemaining <= 0)
        return {
          status: "overdue",
          recommendation: { message: "Past deadline" },
        };

      // Get all allocations for this project
      const projectAllocations = allocations.filter(
        (a) => a.sub_project_id === project.id,
      );
      const allocatedCount = projectAllocations.length;

      // Count employees on leave during project dates (active count excludes those on leave)
      const activeAllocatedCount = projectAllocations.filter((a) => {
        const empLeaves = leaves.filter((l) => l.employee_id === a.employee_id);
        const hasOverlap = empLeaves.some(
          (l) =>
            new Date(l.start_date) <= new Date(project.end_date) &&
            new Date(l.end_date) >= new Date(project.start_date),
        );
        return !hasOverlap;
      }).length;

      // Fix: If explicitly allocated enough people (active, not on leave), it is balanced
      if (
        project.required_manpower &&
        activeAllocatedCount >= project.required_manpower
      ) {
        return { status: "balanced", recommendation: null };
      }

      const standardDayHours = 8; // Use standard 8h day instead of average of all employees
      const totalCap =
        activeAllocatedCount * standardDayHours * workingDaysRemaining;

      if (activeAllocatedCount === 0)
        return {
          status: "no_staff",
          recommendation: { message: "Needs staffing" },
        };

      const loadRatio = requiredHours / totalCap;
      if (loadRatio > 1.1) {
        // Calculate deficit based on required manpower if available, otherwise by hours
        if (
          project.required_manpower &&
          activeAllocatedCount < project.required_manpower
        ) {
          const extraNeeded = project.required_manpower - activeAllocatedCount;
          return {
            status: "overburden",
            recommendation: { message: `+${extraNeeded} staff needed` },
          };
        }
        const deficitHours = requiredHours - totalCap;
        const extraNeeded = Math.ceil(
          deficitHours / (workingDaysRemaining * standardDayHours),
        );
        return {
          status: "overburden",
          recommendation: { message: `+${extraNeeded} staff needed` },
        };
      }
      if (loadRatio < 0.5 && activeAllocatedCount > 1)
        return {
          status: "underutilized",
          recommendation: { message: "Surplus capacity" },
        };
      return { status: "balanced", recommendation: null };
    },
    [allocations, leaves],
  );

  const projectAnalyses = projects.map((p) => ({
    project: p,
    analysis: getProjectAnalysis(p),
  }));

  // ── People breakdowns (on-roster staff) ────────────────────────────────────
  // On-roster = everyone except archived/former, so the breakdowns no longer
  // silently drop the stored-"inactive" staff the Employees page includes.
  const onRosterList = workforce.onRoster;

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
  const bucketCounts = (list, field, buckets) => {
    const counts = new Map(buckets.map((b) => [b.label, 0]));
    let other = 0;
    for (const e of list) {
      const v = norm(e[field]);
      const hit = buckets.find((b) => b.match(v));
      if (hit) counts.set(hit.label, counts.get(hit.label) + 1);
      else other += 1;
    }
    const rows = buckets.map((b) => ({
      label: b.label,
      value: counts.get(b.label),
    }));
    if (other > 0) rows.push({ label: "Other / unset", value: other });
    return rows.filter((r) => r.value > 0);
  };

  const TYPE_BUCKETS = [
    { label: "Full-time", match: (v) => v === "full-time" },
    { label: "Part-time", match: (v) => v === "part-time" },
    { label: "Interns", match: (v) => v === "intern" },
    { label: "Contract", match: (v) => v === "contract" || v === "contractor" },
  ];

  // Ordered most-specific first: "Annotator/ Reviewer" must be claimed before
  // any looser rule, and legacy spellings (Annotator, Reviewer) fold into it.
  const ROLE_BUCKETS = [
    {
      label: "Annotator / Reviewer",
      match: (v) => v.includes("annotator") || v.includes("reviewer"),
    },
    {
      label: "Program Manager",
      match: (v) =>
        v.includes("program-manager") || v.includes("project-manager"),
    },
    { label: "Developer", match: (v) => v.includes("developer") },
    { label: "Quality Analyst", match: (v) => v.includes("quality-analyst") },
    { label: "Data Scientist", match: (v) => v.includes("data-scientist") },
    { label: "Admin", match: (v) => v === "admin" },
  ];

  const typeBreakdown = (list) =>
    bucketCounts(list, "employee_type", TYPE_BUCKETS);
  const roleBreakdown = (list) =>
    bucketCounts(list, "designation", ROLE_BUCKETS);
  // Project sentiment badge (PM-set): GOOD / AVG / Poor.
  const SentimentBadge = ({ sentiment }) => {
    const config = {
      GOOD: { text: "text-emerald-600 ", bg: "bg-emerald-50 ", label: "GOOD" },
      AVG: { text: "text-amber-600 ", bg: "bg-amber-50 ", label: "AVG" },
      Poor: { text: "text-red-600 ", bg: "bg-red-50 ", label: "Poor" },
    };
    const c = config[sentiment];
    if (!c) return <span className="text-xs text-slate-400 ">Not set</span>;
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
              value={workforce.onRoster.length}
              icon={Users}
              tone="amber"
              hint={<WorkforceSplit workforce={workforce} />}
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
                      value: leaveDesk.pendingCount,
                      label: "to review",
                      tone: leaveDesk.pendingCount
                        ? "text-amber-600"
                        : "text-slate-400",
                    },
                    { value: leaveDesk.todayCount, label: "on leave" },
                  ],
                  tabs: timingTabs(leaveDesk.timing),
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
                      value: wfhDesk.pendingCount,
                      label: "to review",
                      tone: wfhDesk.pendingCount
                        ? "text-amber-600"
                        : "text-slate-400",
                    },
                    { value: wfhDesk.todayCount, label: "on WFH" },
                  ],
                  tabs: timingTabs(wfhDesk.timing),
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
            count={`${projectAnalyses.length} projects`}
            headerAction={
              <Button
                variant="link"
                onClick={() => goFromKpi("/admin/sub-projects")}
              >
                View all <ChevronRight className="w-4 h-4" />
              </Button>
            }
            loading={projectsLoading}
            rowClassName={() => "group"}
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
                key: "_sentiment",
                label: "Sentiment",
                align: "left",
                width: "w-32",
                render: (_, row) => (
                  <SentimentBadge sentiment={row.project.sentiment} />
                ),
              },
            ]}
            data={projectAnalyses}
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
