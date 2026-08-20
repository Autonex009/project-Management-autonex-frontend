import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { perfEvalApi } from "../../services/api";
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

const ProjectPanel = ({ project, reviewerId }) => {
  const [expanded, setExpanded] = useState(false);
  const evaluations = project.evaluations;

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
          {project.pending > 0 && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              {project.pending} pending
            </span>
          )}
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            {project.submissions}{" "}
            {project.submissions === 1 ? "submission" : "submissions"}
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
            {evaluations.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">
                No employee submissions yet for this project.
              </p>
            ) : (
              <div className="space-y-3">
                {evaluations.map((ev) => (
                  <EvalReviewCard
                    key={ev.id}
                    evaluation={ev}
                    personName={
                      formatDisplayName(ev.employee_name) ||
                      `Employee #${ev.employee_id}`
                    }
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

  const { data, isLoading } = useQuery({
    queryKey: ["perf-evals-dashboard"],
    queryFn: () => perfEvalApi.getDashboard(),
  });

  const projects = data?.projects || [];
  const summary = data?.summary || {
    projects_in_scope: 0,
    submissions_count: 0,
    pending_count: 0,
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          title="Projects"
          value={summary.projects_in_scope}
          icon={FolderKanban}
          tone="indigo"
          hint="in your scope"
        />
        <StatCard
          title="Submissions"
          value={summary.submissions_count}
          icon={ClipboardList}
          tone="sky"
          hint="employee reviews"
        />
        <StatCard
          title="Pending Review"
          value={summary.pending_count}
          icon={Clock}
          tone="amber"
          hint="awaiting your approval"
        />
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
          Loading…
        </div>
      ) : projects.length === 0 ? (
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
          {projects.map((project) => (
            <ProjectPanel key={project.id} project={project} reviewerId={user.id} />
          ))}
        </div>
      )}
    </div>
  );
};

export default PerformanceReviewsPage;