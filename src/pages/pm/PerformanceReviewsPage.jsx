import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { perfEvalApi, employeeApi, subProjectApi } from "../../services/api";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FolderKanban,
  Clock,
  History as HistoryIcon,
} from "lucide-react";
import EvalReviewCard from "../../components/perf/EvalReviewCard";
import EvaluationDetail from "../../components/perf/EvaluationDetail";
import { formatPeriod, currentPeriod, shiftPeriod } from "../../components/perf/StarRating";
import { StatusPill, RatingCell, MonthStepper } from "../../components/perf/perfTableCells";
import StatCard from "../../components/dashboard/StatCard";
import Table from "../../components/ui/Table";
import UserAvatar from "../../components/ui/UserAvatar";
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

  const maxHistoryMonth = shiftPeriod(currentPeriod(), -1);
  const [tab, setTab] = useState("active"); // 'active' | 'history'
  const [historyMonth, setHistoryMonth] = useState(maxHistoryMonth);
  const [expandedEval, setExpandedEval] = useState(null);

  // Name lookups for the History tab — the dashboard endpoint above pre-joins
  // employee/project names server-side, but the flat history fetch below doesn't.
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeeApi.getAll(),
    enabled: tab === "history",
  });
  const { data: projectsList = [] } = useQuery({
    queryKey: ["sub-projects"],
    queryFn: () => subProjectApi.getAll(),
    enabled: tab === "history",
  });

  // One prior cycle at a time — scoped to this PM server-side by the same
  // list_evals logic the old Active tab used (including the reviewed_by
  // carve-out, so a past decision doesn't vanish if the employee has since
  // moved to a project this PM no longer runs).
  const { data: historyData, isLoading: historyLoading, isError: historyError } = useQuery({
    queryKey: ["perf-evals", "history", historyMonth],
    queryFn: () => perfEvalApi.getAll({ period: historyMonth, limit: 500 }),
    placeholderData: (prev) => prev,
    enabled: tab === "history",
  });
  const historyRows = useMemo(
    () => (historyData?.items || []).filter((e) => e.project_id !== 0),
    [historyData],
  );

  const empName = (id) =>
    formatDisplayName(employees.find((e) => e.id === id)?.name) || `Employee #${id}`;
  const projName = (id) =>
    projectsList.find((p) => p.id === id)?.name || `Project #${id}`;

  const historyColumns = [
    {
      key: "employee",
      label: "Employee",
      width: "w-[22%]",
      render: (_, ev) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <UserAvatar
            src={employees.find((e) => e.id === ev.employee_id)?.avatar_url}
            name={empName(ev.employee_id)}
            size="w-8 h-8 text-[13px]"
          />
          <span className="truncate font-medium text-slate-800">
            {empName(ev.employee_id)}
          </span>
        </div>
      ),
    },
    {
      key: "project",
      label: "Project",
      width: "w-[34%]",
      render: (_, ev) => (
        <span className="block truncate text-slate-600">
          {projName(ev.project_id)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "w-[22%]",
      render: (_, ev) => <StatusPill status={ev.status} />,
    },
    {
      key: "rating",
      label: "Rating",
      align: "right",
      width: "w-[16%]",
      render: (_, ev) => <RatingCell evaluation={ev} />,
    },
  ];

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

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab("active")}
          className={`-mb-px border-b-2 pb-2.5 text-[13px] font-semibold transition-colors ${tab === "active" ? "border-indigo-600 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          Active Cycle
        </button>
        <button
          type="button"
          onClick={() => setTab("history")}
          className={`-mb-px flex items-center gap-1.5 border-b-2 pb-2.5 text-[13px] font-semibold transition-colors ${tab === "history" ? "border-indigo-600 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          <HistoryIcon className="h-3.5 w-3.5" />
          History
        </button>
      </div>

      {tab === "history" ? (
        <div className="space-y-3">
          <MonthStepper
            period={historyMonth}
            onChange={setHistoryMonth}
            max={maxHistoryMonth}
          />
          {historyLoading ? (
            <Table
              variant="untitled"
              columns={historyColumns}
              data={[]}
              loading
              skeletonRows={6}
            />
          ) : historyError ? (
            <div className="rounded-3xl border border-dashed border-red-200 bg-red-50/40 p-12 text-center shadow-sm">
              <h2 className="text-lg font-semibold text-red-700">
                Couldn't load reviews for {formatPeriod(historyMonth)}
              </h2>
              <p className="mt-2 text-sm text-red-500">
                Something went wrong fetching this month. Try again or pick a different month.
              </p>
            </div>
          ) : historyRows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
              <HistoryIcon className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-4 text-lg font-semibold text-slate-800">
                No reviews for {formatPeriod(historyMonth)}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Step to a different month to see your team's past evaluations.
              </p>
            </div>
          ) : (
            <Table
              variant="untitled"
              allowOverflow
              columns={historyColumns}
              data={historyRows}
              pageSize={historyRows.length}
              onRowClick={(row) =>
                setExpandedEval((cur) => (cur === row.id ? null : row.id))
              }
              expandedRowId={expandedEval}
              getRowId={(row) => row.id}
              renderExpandedRow={(row) => (
                <div className="border-t border-slate-100 bg-slate-50/40 p-4">
                  {row.status === "submitted" ? (
                    <EvalReviewCard
                      evaluation={row}
                      personName={empName(row.employee_id)}
                      reviewerId={user.id}
                    />
                  ) : (
                    <EvaluationDetail evaluation={row} />
                  )}
                </div>
              )}
              emptyState={{
                title: "No reviews",
                description: "Nothing to show here.",
              }}
            />
          )}
        </div>
      ) : isLoading ? (
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
