import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  allocationApi,
  subProjectApi,
  leaveApi,
  employeeApi,
} from "../../services/api";
import {
  FolderKanban,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Siren,
  TrendingUp,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { parentProjectApi } from "../../services/api";
import { getPmEmployeeId, getPmSubProjects } from "../../utils/pmScope";
import {
  demotedToLeadIds,
  resolveProjectPmIds,
} from "../../utils/roleAccess";
import {
  buildEmployeeIndex,
  manpowerEmployeeIds,
} from "../../utils/workforce";
import Table from "../../components/ui/Table";
import StatCard from "../../components/dashboard/StatCard";
import { formatDisplayName } from "../../utils/displayName";
import PMMyDashboard from "./PMMyDashboard";

const PMDashboard = () => {
  const [pmTab, setPmTab] = useState("project");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const pmEmployeeId = getPmEmployeeId(user);

  // Fetch all data
  const { data: projects = [], isLoading: projLoading } = useQuery({
    queryKey: ["sub-projects"],
    queryFn: () => subProjectApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: parentProjects = [] } = useQuery({
    queryKey: ["parent-projects"],
    queryFn: () => parentProjectApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeeApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: allocations = [] } = useQuery({
    queryKey: ["allocations"],
    queryFn: () => allocationApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const employeeIndex = useMemo(
    () => buildEmployeeIndex(employees),
    [employees],
  );

  const getTeamLeadIds = (project) => {
    const demoted = demotedToLeadIds(project, parentProjects, employeeIndex);
    const existing = project.team_lead_ids || [];
    return [...new Set([...existing, ...demoted])];
  };

  const resolvePmIds = (project) =>
    resolveProjectPmIds(project, parentProjects, employeeIndex);

  const getAllocatedManpower = (project) => {
    return manpowerEmployeeIds({
      allocations: allocations.filter((a) => a.sub_project_id === project.id),
      pmIds: resolvePmIds(project),
      leadIds: getTeamLeadIds(project),
      employeeIndex,
    }).size;
  };

  const { startStr } = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    return { startStr: start };
  }, []);

  const { data: allLeaves = [] } = useQuery({
    queryKey: ["leaves", startStr],
    queryFn: () => leaveApi.getAll({ start_date: startStr }),
  });

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Projects managed by this PM (by assigned_employee_ids or all if PM)
  const scopedProjects = getPmSubProjects(
    projects,
    parentProjects,
    pmEmployeeId,
    allocations,
  );
  const activeProjects = scopedProjects.filter(
    (p) => p.project_status === "active",
  );
  const completedProjects = scopedProjects.filter(
    (p) => p.project_status === "completed",
  );

  // Team members = employees who are allocated to any project
  const allocatedEmployeeIdSet = new Set(
    allocations
      .filter((a) =>
        scopedProjects.some((project) => project.id === a.sub_project_id),
      )
      .map((a) => Number(a.employee_id)),
  );
  const teamMembers = employees.filter((e) =>
    allocatedEmployeeIdSet.has(Number(e.id)),
  );

  // Leaves
  const pendingLeaves = allLeaves.filter((l) => {
    if (!l.start_date || l.status === "rejected") return false;
    return (
      l.start_date > todayStr &&
      allocatedEmployeeIdSet.has(Number(l.employee_id))
    );
  });
  const currentLeaves = allLeaves.filter((l) => {
    if (!l.start_date || !l.end_date || l.status === "rejected") return false;
    return (
      l.start_date <= todayStr &&
      l.end_date >= todayStr &&
      allocatedEmployeeIdSet.has(Number(l.employee_id))
    );
  });

  // At-risk projects (under-staffed)
  const atRiskProjects = activeProjects.filter((p) => {
    const allocated = getAllocatedManpower(p);
    return p.required_manpower && allocated < p.required_manpower;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          {pmTab === "project" && (
            <>
              <h1 className="text-lg font-semibold text-slate-900">
                PM Dashboard —{" "}
                <span className="text-blue-600">
                  {formatDisplayName(user.name)?.split(" ")[0] || "Manager"}
                </span>
              </h1>
              <p className="text-[13px] text-slate-500 mt-0.5">
                Project oversight & team management
              </p>
            </>
          )}
        </div>
        <div className="flex gap-2 bg-slate-100/80 p-1 rounded-xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setPmTab("project")}
              className={`text-[12px] font-bold px-4 py-1.5 rounded-lg transition-all ${
                pmTab === "project"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              }`}
            >
              Project Dashboard
            </button>
            <button
              onClick={() => setPmTab("my")}
              className={`text-[12px] font-bold px-4 py-1.5 rounded-lg transition-all ${
                pmTab === "my"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              }`}
            >
              My Dashboard
            </button>
        </div>
      </div>

      {pmTab === "project" ? (
        <>
          {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={FolderKanban}
          title="Active Projects"
          value={activeProjects.length}
          tone="emerald"
          hint={`${completedProjects.length} completed`}
        />
        <StatCard
          icon={Users}
          title="Team Members"
          value={teamMembers.length}
          tone="violet"
          hint={`${currentLeaves.length} on leave`}
        />
        <StatCard
          icon={AlertTriangle}
          title="At Risk"
          value={atRiskProjects.length}
          tone="rose"
          hint="under-staffed"
        />
        <StatCard
          icon={Calendar}
          title="Upcoming Leaves"
          value={pendingLeaves.length}
          tone="amber"
          hint="need attention"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Projects Table (8 cols) */}
        <div className="xl:col-span-8">
          <Table
            variant="v1"
            title="Project Overview"
            count={`${activeProjects.length} active`}
            loading={projLoading}
            columns={[
              {
                key: "name",
                label: "Project",
                render: (value, project) => (
                  <div>
                    <div className="font-medium text-slate-800">{value}</div>
                    <div className="text-xs text-slate-400">
                      {project.client}
                    </div>
                  </div>
                ),
              },
              {
                key: "id",
                label: "Staff",
                align: "center",
                render: (id, project) => {
                  const projAllocs = allocations.filter(
                    (a) => a.sub_project_id === id,
                  );
                  const isUnder =
                    project.required_manpower &&
                    projAllocs.length < project.required_manpower;
                  return (
                    <span
                      className={`text-sm font-semibold ${isUnder ? "text-red-600" : "text-slate-700"}`}
                    >
                      {projAllocs.length}/{project.required_manpower || "—"}
                    </span>
                  );
                },
              },
              {
                key: "_status",
                label: "Status",
                align: "center",
                render: (_, project) => {
                  const projAllocs = allocations.filter(
                    (a) => a.sub_project_id === project.id,
                  );
                  const isUnder =
                    project.required_manpower &&
                    projAllocs.length < project.required_manpower;
                  return (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${isUnder ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${isUnder ? "bg-red-500" : "bg-emerald-500"}`}
                      />
                      {isUnder ? "Under-staffed" : "On Track"}
                    </span>
                  );
                },
              },
              {
                key: "end_date",
                label: "Deadline",
                align: "right",
                render: (value) => (
                  <span className="text-sm text-slate-500 font-mono">
                    {value ? format(parseISO(value), "MMM dd") : "—"}
                  </span>
                ),
              },
            ]}
            data={activeProjects.slice(0, 8)}
            emptyState={{
              title: "No active projects",
              description: "Active projects will appear here",
            }}
          />
        </div>

        {/* Sidebar (4 cols) */}
        <div className="xl:col-span-4 space-y-4">
          {/* Team On Leave */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Team On Leave</h3>
            {currentLeaves.length === 0 ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-sm font-medium text-emerald-700">
                  No one on leave today
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentLeaves.map((l) => {
                  const emp = employees.find((e) => e.id === l.employee_id);
                  return (
                    <div
                      key={l.id}
                      className="flex items-center justify-between p-2.5 bg-amber-50 border border-amber-100 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium flex items-center gap-1.5 text-slate-700">
                          <span className="truncate">{formatDisplayName(emp?.name) || `Employee #${l.employee_id}`}</span>
                          {l.is_emergency && (
                            <span className="inline-flex items-center justify-center shrink-0 h-4 w-4 rounded-full bg-red-100 text-red-600 border border-red-200" title="Emergency leave">
                              <Siren className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400 capitalize">
                          {l.leave_type}
                        </p>
                      </div>
                      <span className="text-xs text-amber-600 font-mono">
                        till {format(parseISO(l.end_date), "MMM dd")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Leaves */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 mb-4">
              Upcoming Leaves
            </h3>
            {pendingLeaves.length === 0 ? (
              <p className="text-sm text-slate-400">
                No upcoming leave requests.
              </p>
            ) : (
              <div className="space-y-2">
                {pendingLeaves.slice(0, 5).map((l) => {
                  const emp = employees.find((e) => e.id === l.employee_id);
                  return (
                    <div
                      key={l.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium flex items-center gap-1.5 text-slate-700">
                          <span className="truncate">{formatDisplayName(emp?.name) || `Employee #${l.employee_id}`}</span>
                          {l.is_emergency && (
                            <span className="inline-flex items-center justify-center shrink-0 h-4 w-4 rounded-full bg-red-100 text-red-600 border border-red-200" title="Emergency leave">
                              <Siren className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400 capitalize">
                          {l.leave_type}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {format(parseISO(l.start_date), "MMM dd")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      </>
      ) : (
        <PMMyDashboard />
      )}
    </div>
  );
};

export default PMDashboard;
