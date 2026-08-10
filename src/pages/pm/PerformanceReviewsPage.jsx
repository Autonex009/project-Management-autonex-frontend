import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  employeeApi,
  allocationApi,
  parentProjectApi,
  subProjectApi,
  perfEvalApi,
} from "../../services/api";
import { getPmEmployeeId, getPmSubProjects } from "../../utils/pmScope";
import { canDecideForEmployee } from "../../utils/roleAccess";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FolderKanban,
  Clock,
} from "lucide-react";
import EvalReviewCard from "../../components/perf/EvalReviewCard";
import StatCard from "../../components/dashboard/StatCard";
import { formatDisplayName } from "../../utils/displayName";

const ProjectPanel = ({
  project,
  employees,
  evaluations,
  reviewerId,
  viewerEmployeeId,
  viewerRole,
}) => {
  const [expanded, setExpanded] = useState(false);
  // Only the evaluations this viewer may actually review. The tiers match Team Leaves and the
  // server (project_scope): your own goes to your manager, a manager's or HR's goes to an
  // admin, and a peer lead's goes to their program manager. Matched on employee_id —
  // `reviewerId` is a users.id and cannot be compared against it.
  const projectEvals = evaluations.filter(
    (e) =>
      e.project_id === project.id &&
      canDecideForEmployee({
        viewerRole,
        viewerEmployeeId,
        employee: employees.find((emp) => emp.id === e.employee_id),
      }),
  );
  const pending = projectEvals.filter((e) => e.status === "submitted").length;
  const empName = (id) =>
    formatDisplayName(employees.find((e) => e.id === id)?.name) || `Employee #${id}`;

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-slate-50/60"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-base font-bold text-blue-700 shrink-0">
            {(project.name || "P").charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{project.name}</p>
            <p className="text-xs text-slate-400">
              {project.client || "No client"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {pending > 0 && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              {pending} pending
            </span>
          )}
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            {projectEvals.length}{" "}
            {projectEvals.length === 1 ? "submission" : "submissions"}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="space-y-5 border-t border-slate-100 p-5">
          <div>
            <h4 className="mb-3 text-sm font-semibold text-slate-700">
              Submitted Evaluations
            </h4>
            {projectEvals.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">
                No employee submissions yet for this project.
              </p>
            ) : (
              <div className="space-y-3">
                {projectEvals.map((ev) => (
                  <EvalReviewCard
                    key={ev.id}
                    evaluation={ev}
                    personName={empName(ev.employee_id)}
                    reviewerId={reviewerId}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
};

const PerformanceReviewsPage = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  // Decides which tiers this viewer may review — a lead may not review a peer lead, and
  // nobody below admin may review a manager (see utils/roleAccess).
  const role = localStorage.getItem("role") || user.role || "pm";
  const pmEmployeeId = getPmEmployeeId(user);

  const { data: parentProjects = [] } = useQuery({
    queryKey: ["parent-projects"],
    queryFn: parentProjectApi.getAll,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["sub-projects"],
    queryFn: subProjectApi.getAll,
  });
  const { data: employees = [], isLoading: empLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: employeeApi.getAll,
  });
  const { data: allocations = [] } = useQuery({
    queryKey: ["allocations"],
    queryFn: allocationApi.getAll,
  });
  const { data: evaluations = [], isLoading: evalLoading } = useQuery({
    queryKey: ["perf-evals"],
    queryFn: () => perfEvalApi.getAll(),
  });

  const scopedProjects = useMemo(
    () =>
      getPmSubProjects(
        projects,
        parentProjects,
        pmEmployeeId,
        allocations,
      ).sort((a, b) => a.name.localeCompare(b.name)),
    [projects, parentProjects, pmEmployeeId, allocations],
  );

  const scopedIds = useMemo(
    () => new Set(scopedProjects.map((p) => p.id)),
    [scopedProjects],
  );
  // Same exclusion as the panels, so the headline counts match the rows beneath them.
  const reviewable = evaluations.filter(
    (e) =>
      scopedIds.has(e.project_id) &&
      canDecideForEmployee({
        viewerRole: role,
        viewerEmployeeId: pmEmployeeId,
        employee: employees.find((emp) => emp.id === e.employee_id),
      }),
  );
  const submissionsCount = reviewable.length;
  const pendingCount = reviewable.filter(
    (e) => e.status === "submitted",
  ).length;
  const isLoading = empLoading || evalLoading;

  return (
    <div className="space-y-4">


      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          title="Projects"
          value={scopedProjects.length}
          icon={FolderKanban}
          tone="indigo"
          hint="in your scope"
        />
        <StatCard
          title="Submissions"
          value={submissionsCount}
          icon={ClipboardList}
          tone="sky"
          hint="employee reviews"
        />
        <StatCard
          title="Pending Review"
          value={pendingCount}
          icon={Clock}
          tone="amber"
          hint="awaiting your approval"
        />
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
          Loading…
        </div>
      ) : scopedProjects.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
          <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-lg font-semibold text-slate-800">
            No projects in your scope
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Projects appear here once they're assigned to you.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {scopedProjects.map((project) => (
            <ProjectPanel
              key={project.id}
              project={project}
              employees={employees}
              evaluations={evaluations}
              reviewerId={user.id}
              viewerEmployeeId={pmEmployeeId}
              viewerRole={role}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PerformanceReviewsPage;
