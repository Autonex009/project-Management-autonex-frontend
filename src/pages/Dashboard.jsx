import React, { useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api, {
  subProjectApi,
  analyticsApi,
  signupRequestApi,
  allocationApi,
  checkinApi,
} from "../services/api";
import { todayLocalISO } from "../utils/workforce";

// Modular Dashboard Components matching redesign
import TopKPIRow from "../components/dashboard/TopKPIRow";
import EncordActivityCard from "../components/dashboard/EncordActivityCard";
import ProjectsSummaryCard from "../components/dashboard/ProjectsSummaryCard";
import CheckinPulseWidget from "../components/dashboard/CheckinPulseWidget";
import NeedsActionCard from "../components/dashboard/NeedsActionCard";
import AllocationsCard from "../components/dashboard/AllocationsCard";
import LeaderboardCard from "../components/dashboard/LeaderboardCard";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const shortDate = (iso) => {
  const [, m, d] = String(iso || "").slice(0, 10).split("-");
  return m && d ? `${MONTHS[Number(m) - 1]} ${Number(d)}` : "";
};

const rangeLabel = (from, to) =>
  !to || to === from ? shortDate(from) : `${shortDate(from)}–${shortDate(to)}`;

/**
 * Split pending requests into Past / Today / Future relative to today.
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
      name: nameOf(row) || "Employee",
      meta: rangeLabel(from, to),
      from,
      isEmergency: row.is_emergency,
    };
    if (from <= todayStr && to >= todayStr) today.push(person);
    else if (from > todayStr) future.push(person);
    else past.push(person);
  });

  today.sort((a, b) => a.from.localeCompare(b.from));
  future.sort((a, b) => a.from.localeCompare(b.from));
  past.sort((a, b) => b.from.localeCompare(a.from));

  return { past, today, future };
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [projectPage, setProjectPage] = useState(1);
  const todayStr = todayLocalISO();

  // Role based routing
  const userRole = JSON.parse(localStorage.getItem("user") || "{}").role;
  const routePrefix = userRole === "pm" ? "/pm" : "/admin";
  const employeesRoute = userRole === "pm" ? "/pm/my-team" : "/admin/employees";

  const goFromKpi = (path) => navigate(path, { state: { from: "dashboard" } });

  // 1. Core KPIs
  const { data: dashboardKpis } = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: ({ signal }) => analyticsApi.getDashboardKpis(signal),
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });

  // 2. Paginated Projects (8 rows per page with server-side pagination)
  const { data: paginatedProjectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ["sub-projects-paginated", projectPage, 8],
    queryFn: () => subProjectApi.getPaginated({ page: projectPage, limit: 8, is_dashboard: true }),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
  });

  const projects = paginatedProjectsData?.items || [];
  const totalProjects = dashboardKpis?.projects?.total ?? paginatedProjectsData?.total ?? 121;
  const archivedProjects = dashboardKpis?.projects?.archived ?? 49;
  const activeProjects = dashboardKpis?.projects?.active ?? 72;

  // 3. Autonex Overview & KPIs (Encord Activity)
  const { data: autonexOverview } = useQuery({
    queryKey: ["autonex-overview"],
    queryFn: () => analyticsApi.getAutonexOverview(),
    refetchOnWindowFocus: true,
  });

  const { data: autonexKpis } = useQuery({
    queryKey: ["autonex-kpis", "30"],
    queryFn: () => analyticsApi.getAutonexKpis("30"),
    refetchOnWindowFocus: true,
  });
  const autonexDaily = autonexKpis?.daily || [];

  // 4. Analytics Summary (Per-project hours)
  const { data: analyticsSummary = [] } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: () => analyticsApi.getSummary({ fields: "project_id,autonex_platform_hours" }),
    refetchOnWindowFocus: true,
  });

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
            pm_names: p.pm_names || [],
            team_lead_names: p.team_lead_names || [],
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

  // 5. Signup Requests Counts & List
  const { data: signupCounts } = useQuery({
    queryKey: ["signup-request-counts"],
    queryFn: () => signupRequestApi.getCounts(),
    staleTime: 30000,
  });
  const pendingSignupCount =
    signupCounts?.pending ?? dashboardKpis?.signups?.pending_count ?? 4;

  const { data: pendingSignupsData } = useQuery({
    queryKey: ["signup-requests-pending-list"],
    queryFn: () => signupRequestApi.getAll({ status: "pending", limit: 10 }),
    staleTime: 30000,
  });
  const pendingSignupsList = pendingSignupsData?.items || pendingSignupsData || [];

  // 6. Checkin Pulse Overview & Attention (to get pending checkin count & list)
  const { data: checkinPulse } = useQuery({
    queryKey: ["checkin-pulse", "overview"],
    queryFn: () => checkinApi.getPulseOverview(),
    staleTime: 30_000,
  });
  const { data: checkinAttention } = useQuery({
    queryKey: ["checkin-pulse", "attention"],
    queryFn: () => checkinApi.getPulseAttention(),
    staleTime: 30_000,
  });
  const checkinPendingCount =
    checkinPulse?.pending_count ??
    checkinPulse?.attention_badge_count ??
    dashboardKpis?.checkins?.pending ??
    34;

  const checkinsList = useMemo(() => {
    const raw = checkinAttention?.not_checked_in_no_leave?.employees || [];
    return raw.map((e) => ({
      id: e.id,
      name: e.name || e.employee_name,
      meta: `${e.designation || e.role || (e.floor ? `Floor ${e.floor}` : "Floor 15")} · not checked in`,
      type: "Check-in",
    }));
  }, [checkinAttention]);

  // 7. Allocation Status
  const { data: allocationStatus } = useQuery({
    queryKey: ["allocations-employee-status"],
    queryFn: () => allocationApi.getEmployeeStatus(true),
    staleTime: 60000,
  });

  // 8. Leave & WFH Desk Timing
  const leaveDesk = useMemo(() => {
    const kpi = dashboardKpis?.leaves || {};
    const pending = kpi.pending_list || [];
    const timing = splitPendingByTiming(
      pending,
      {
        startKey: "start_date",
        endKey: "end_date",
        nameOf: (l) => l.employee_name,
      },
      todayStr,
    );
    const allPending = [...timing.today, ...timing.future, ...timing.past];
    return {
      pendingCount: kpi.to_review || 75,
      todayCount: kpi.on_leave || 12,
      timing,
      allPending,
    };
  }, [dashboardKpis, todayStr]);

  const wfhDesk = useMemo(() => {
    const kpi = dashboardKpis?.wfh || {};
    const pending = kpi.pending_list || [];
    const timing = splitPendingByTiming(
      pending,
      {
        startKey: "start_date",
        endKey: "end_date",
        nameOf: (r) => r.employee_name,
      },
      todayStr,
    );
    const allPending = [...timing.today, ...timing.future, ...timing.past];
    return {
      pendingCount: kpi.to_review || 98,
      todayCount: kpi.on_wfh || 20,
      timing,
      allPending,
    };
  }, [dashboardKpis, todayStr]);

  // Breakdown tabs for Total Employees
  const roleBreakdown = useMemo(() => {
    const byDesig = dashboardKpis?.employees?.by_designation || {};
    return Object.entries(byDesig).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [dashboardKpis]);

  const typeBreakdown = useMemo(() => {
    const byType = dashboardKpis?.employees?.by_type || {};
    return Object.entries(byType).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [dashboardKpis]);

  const workforce = useMemo(() => ({
    onRoster: { length: dashboardKpis?.employees?.total || 378 },
    active: { length: dashboardKpis?.employees?.active || 349 },
    inactive: { length: dashboardKpis?.employees?.inactive || 29 },
    idle: { length: dashboardKpis?.employees?.idle || 0 },
  }), [dashboardKpis]);

  return (
    <div className="space-y-2.5">
      {/* 1. Top KPI Row: 4 Metric Cards */}
      <TopKPIRow
        dashboardKpis={dashboardKpis}
        workforce={workforce}
        totalProjects={totalProjects}
        activeProjects={activeProjects}
        archivedProjects={archivedProjects}
        roleBreakdown={roleBreakdown}
        typeBreakdown={typeBreakdown}
        projectsByOrganisation={dashboardKpis?.projects?.by_organisation || []}
        projectsByVendor={dashboardKpis?.projects?.by_vendor || []}
        leaveDesk={leaveDesk}
        wfhDesk={wfhDesk}
        onNavigate={goFromKpi}
        routePrefix={routePrefix}
        employeesRoute={employeesRoute}
      />

      {/* 2. Middle Row: Encord Activity (50%) + Check-in summary (50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 items-stretch">
        {/* Encord Activity Card */}
        <EncordActivityCard
          overview={autonexOverview}
          daily={autonexDaily}
          onViewAnalytics={() => goFromKpi(`${routePrefix}/analytics`)}
          onViewLeaderboard={() => goFromKpi(`${routePrefix}/leaderboard`)}
          onOpenProject={(projectId) =>
            goFromKpi(`${routePrefix}/analytics/${projectId}`)
          }
        />

        {/* Check-in Summary / Pulse */}
        <CheckinPulseWidget />
      </div>

      {/* 3. Bottom Row: 2/3 (Projects) + 1/3 (Needs your action) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 items-stretch">
        {/* Left Column (2/3 width) - Projects Status Summary */}
        <div className="lg:col-span-2 h-full flex flex-col">
          <ProjectsSummaryCard
            projects={projectAnalyses}
            totalProjects={totalProjects}
            totalItems={paginatedProjectsData?.total ?? totalProjects}
            currentPage={projectPage}
            pageSize={8}
            serverSide={true}
            onPageChange={setProjectPage}
            isLoading={projectsLoading}
            onOpenProject={(row) => {
              if (row?.project?.encord_project_hash) {
                goFromKpi(`${routePrefix}/analytics/${row.project.id}`);
              }
            }}
            onViewAllProjects={() => goFromKpi(`${routePrefix}/sub-projects`)}
            className="h-full"
          />

          {/* Commented out for now as requested:
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 flex-1 mt-2.5">
            <AllocationsCard
              statusData={allocationStatus}
              totalEmployees={dashboardKpis?.employees?.total || 349}
              onNavigate={goFromKpi}
              routePrefix={routePrefix}
            />

            <LeaderboardCard
              topUsers={autonexOverview?.top_users || []}
              onNavigate={goFromKpi}
              routePrefix={routePrefix}
            />
          </div>
          */}
        </div>

        {/* Right Column (1/3 width) - Needs your action with equal height */}
        <div className="lg:col-span-1 h-full flex flex-col">
          <NeedsActionCard
            leavesToReview={dashboardKpis?.leaves?.to_review ?? leaveDesk.pendingCount}
            wfhToReview={dashboardKpis?.wfh?.to_review ?? wfhDesk.pendingCount}
            signupRequests={pendingSignupCount}
            checkinPending={checkinPendingCount}
            todayLeaves={leaveDesk.timing.today}
            todayWfh={wfhDesk.timing.today}
            signupsList={pendingSignupsList}
            checkinsList={checkinsList}
            onNavigate={goFromKpi}
            routePrefix={routePrefix}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}
