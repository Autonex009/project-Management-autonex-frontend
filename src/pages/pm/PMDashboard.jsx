import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  subProjectApi,
  leaveApi,
  analyticsApi,
} from "../../services/api";
import {
  FolderKanban,
  Users,
  Calendar,
  AlertTriangle,
  Siren,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { getPmEmployeeId } from "../../utils/pmScope";
import Table from "../../components/ui/Table";
import StatCard from "../../components/dashboard/StatCard";
import { formatDisplayName } from "../../utils/displayName";
import PMMyDashboard from "./PMMyDashboard";

const PMDashboard = () => {
  const [pmTab, setPmTab] = useState("project");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const pmEmployeeId = getPmEmployeeId(user);

  // Fetch slim pre-calculated data
  const { data: projectsData, isLoading: projLoading } = useQuery({
    queryKey: ["sub-projects", "pm-dashboard", pmEmployeeId],
    queryFn: () => subProjectApi.getPaginated({ is_dashboard: true, pm_id: pmEmployeeId, limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });
  const projects = projectsData?.items || [];

  const { data: teamSummary = { totalMembers: 0, teamIds: [], teamMembers: [] } } = useQuery({
    queryKey: ["pm-team-summary", pmEmployeeId],
    queryFn: () => analyticsApi.getPmTeamSummary(pmEmployeeId),
    staleTime: 5 * 60 * 1000,
  });

  const { data: allLeaves = [] } = useQuery({
    queryKey: ["pm-leaves", pmEmployeeId],
    queryFn: () => leaveApi.getTeamSummary(pmEmployeeId),
    staleTime: 5 * 60 * 1000,
  });

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const activeProjects = projects.filter(
    (p) => ["active", "in-progress", "in progress", "poc"].includes(p.project_status)
  );
  const completedProjects = projects.filter(
    (p) => p.project_status === "completed"
  );

  const pendingLeaves = allLeaves.filter(
    (l) => l.start_date > todayStr
  );
  const currentLeaves = allLeaves.filter(
    (l) => l.start_date <= todayStr && l.end_date >= todayStr
  );

  const atRiskProjects = activeProjects.filter((p) => p.is_at_risk);
  const teamMembers = teamSummary.teamMembers || [];

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
                  const allocated = project.allocated_employees || 0;
                  const isUnder = project.is_at_risk;
                  return (
                    <span
                      className={`text-sm font-semibold ${isUnder ? "text-red-600" : "text-slate-700"}`}
                    >
                      {allocated}/{project.required_manpower || "—"}
                    </span>
                  );
                },
              },
              {
                key: "_status",
                label: "Status",
                align: "center",
                render: (_, project) => {
                  const isUnder = project.is_at_risk;
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
                  const emp = teamMembers.find((e) => e.id === l.employee_id);
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
                  const emp = teamMembers.find((e) => e.id === l.employee_id);
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
