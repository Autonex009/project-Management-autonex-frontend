import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { allocationApi, subProjectApi, perfEvalApi } from "../../services/api";
import {
  ClipboardList,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Lock,
  History as HistoryIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import StarRating, {
  currentPeriod,
  formatPeriod,
  shiftPeriod,
} from "../../components/perf/StarRating";
import { PERF_PARAMETERS, averageOf } from "../../components/perf/perfParams";
import { StatusPill, fmtDate, RatingCell, MonthStepper } from "../../components/perf/perfTableCells";
import EvaluationDetail from "../../components/perf/EvaluationDetail";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Table from "../../components/ui/Table";
import { formatDisplayName } from "../../utils/displayName";

const ProjectEvalPanel = ({
  project,
  employeeId,
  submittedBy,
  existing,
  reviewerLabel = "PM",
}) => {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const [period, setPeriod] = useState(currentPeriod());
  const [ratings, setRatings] = useState({}); // { paramName: 1-5 }
  const [comment, setComment] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // existing evaluation for the selected period (locked once submitted)
  const currentEval = existing.find((e) => e.period === period) || null;
  const liveAverage = averageOf(PERF_PARAMETERS.map((p) => ratings[p.name]));

  const submitMutation = useMutation({
    mutationFn: (data) => perfEvalApi.submit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-perf-evals"] });
      toast.success("Review submitted");
      setRatings({});
      setComment("");
    },
    onError: (err) =>
      toast.error(err?.response?.data?.detail || "Failed to submit"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const missing = PERF_PARAMETERS.filter((p) => !ratings[p.name]);
    if (missing.length > 0) {
      toast.error("Please rate all parameters before submitting");
      return;
    }
    setConfirmOpen(true);
  };

  const confirmSubmit = () => {
    submitMutation.mutate(
      {
        project_id: project.id,
        employee_id: employeeId,
        period,
        parameter_values: PERF_PARAMETERS.map((p) => ({
          name: p.name,
          employee_rating: ratings[p.name],
        })),
        overall_comment: comment.trim() || null,
        submitted_by: submittedBy,
      },
      { onSuccess: () => setConfirmOpen(false) },
    );
  };

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-slate-50/60"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-base font-bold text-emerald-700 shrink-0">
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
          {currentEval ? (
            <StatusBadge status={currentEval.status} />
          ) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
              Not submitted
            </span>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 p-5">
          {/* Month + status header */}
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Review Month
              </label>
              <input
                type="month"
                value={period}
                max={currentPeriod()}
                onChange={(e) => setPeriod(e.target.value || currentPeriod())}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            {!currentEval && (
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Average
                </p>
                <p className="text-lg font-bold text-amber-500">
                  {liveAverage != null ? liveAverage.toFixed(1) : "—"}
                  <span className="text-sm font-medium text-slate-400">
                    {" "}
                    / 5
                  </span>
                </p>
              </div>
            )}
          </div>

          {currentEval ? (
            <div className="space-y-4">
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                {currentEval.status === "reviewed"
                  ? `Your ${reviewerLabel} has reviewed this month's evaluation. See the ratings and feedback below.`
                  : `You've already submitted this month's evaluation. It's locked and pending your ${reviewerLabel}'s review.`}
              </p>
              <EvaluationDetail evaluation={currentEval} />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {PERF_PARAMETERS.map((p) => (
                <div
                  key={formatDisplayName(p.name)}
                  className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 pr-4">
                    <p className="font-semibold text-slate-900">{formatDisplayName(p.name)}</p>
                    <p className="mt-0.5 text-sm text-slate-400">
                      {p.description}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <StarRating
                      value={ratings[p.name] || null}
                      onChange={(v) =>
                        setRatings((m) => ({ ...m, [p.name]: v }))
                      }
                    />
                  </div>
                </div>
              ))}

              <div className="pt-1">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Overall Comment (optional)
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add any overall remarks…"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="flex items-center justify-end border-t border-slate-100 pt-4">
                <button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitMutation.isPending ? "Submitting…" : "Submit Review"}
                </button>
              </div>
              <p className="text-center text-xs text-slate-400">
                Once submitted, the review is locked and cannot be edited.
              </p>
            </form>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmSubmit}
        title="Submit review?"
        message={`Submit your ${formatPeriod(period)} review for “${project.name}”? Once submitted it is locked and cannot be edited.`}
        confirmText="Submit"
        variant="info"
        isPending={submitMutation.isPending}
      />
    </article>
  );
};

const StatusBadge = ({ status }) => {
  if (status === "reviewed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Reviewed
      </span>
    );
  }
  if (status === "submitted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
        <Lock className="h-3 w-3" /> Submitted
      </span>
    );
  }
  return null;
};

// PM self-report: a single monthly form, not tied to any project (project_id 0),
// reviewed by the Admin.
const PM_SELF_PROJECT = {
  id: 0,
  name: "My Self-Evaluation",
  client: "Reviewed by Admin",
};

const SelfEvaluationPage = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = localStorage.getItem("role") || user.role || "employee";
  // PM and HR file a single self-report (reviewed by Admin), not per-project reviews —
  // they aren't allocated to annotation projects.
  const isPm = role === "pm" || role === "hr";
  const employeeId = user.employee_id;

  const maxHistoryMonth = shiftPeriod(currentPeriod(), -1);
  const [tab, setTab] = useState("reviews"); // 'reviews' | 'history'
  const [historyMonth, setHistoryMonth] = useState(maxHistoryMonth);
  const [expandedHistory, setExpandedHistory] = useState(null);

  const { data: allocations = [], isLoading: allocLoading } = useQuery({
    queryKey: ["my-allocations", employeeId],
    queryFn: () => allocationApi.getByEmployee(employeeId),
    enabled: !!employeeId && !isPm,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["sub-projects"],
    queryFn: () => subProjectApi.getAll(),
    enabled: !isPm,
  });
  const { data: myEvalsData, isLoading: evalsLoading, isError: evalsError } = useQuery({
    queryKey: ["my-perf-evals", employeeId],
    // Explicit limit: the History tab wants this person's *entire* record, and the
    // endpoint's default page size (25) could otherwise quietly cut off older months.
    queryFn: () => perfEvalApi.getAll({ employee_id: employeeId, limit: 500 }),
    enabled: !!employeeId,
  });
  const myEvals = myEvalsData?.items || [];

  const myProjects = useMemo(() => {
    const ids = new Set(allocations.map((a) => a.sub_project_id));
    return projects
      .filter((p) => ids.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allocations, projects]);

  const evalsByProject = (projectId) =>
    myEvals.filter((e) => e.project_id === projectId);
  const isLoading = evalsLoading || (!isPm && allocLoading);

  const projName = (id) =>
    projects.find((p) => p.id === id)?.name || `Project #${id}`;

  // Browsed one month at a time (see the MonthStepper below), so "Period" would just
  // repeat the same value on every row — dropped from both column sets below.
  const historyRows = useMemo(
    () => myEvals.filter((e) => e.period === historyMonth),
    [myEvals, historyMonth],
  );

  // PM's history is always the same single self-report project, so there's nothing to
  // show in a "Project" column; the employee history spans multiple projects.
  const historyColumns = isPm
    ? [
        {
          key: "submitted",
          label: "Submitted",
          width: "w-[34%]",
          render: (_, ev) => (
            <span className="whitespace-nowrap text-slate-500 tabular-nums">
              {fmtDate(ev.submitted_at || ev.created_at)}
            </span>
          ),
        },
        {
          key: "status",
          label: "Status",
          width: "w-[33%]",
          render: (_, ev) => <StatusPill status={ev.status} />,
        },
        {
          key: "rating",
          label: "Rating",
          align: "right",
          width: "w-[33%]",
          render: (_, ev) => <RatingCell evaluation={ev} />,
        },
      ]
    : [
        {
          key: "project",
          label: "Project",
          width: "w-[34%]",
          render: (_, ev) => (
            <span className="block truncate text-slate-600">{projName(ev.project_id)}</span>
          ),
        },
        {
          key: "submitted",
          label: "Submitted",
          width: "w-[22%]",
          render: (_, ev) => (
            <span className="whitespace-nowrap text-slate-500 tabular-nums">
              {fmtDate(ev.submitted_at || ev.created_at)}
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
          width: "w-[22%]",
          render: (_, ev) => <RatingCell evaluation={ev} />,
        },
      ];

  const tabs = (
    <div className="flex items-center gap-4 border-b border-slate-200">
      <button
        type="button"
        onClick={() => setTab("reviews")}
        className={`-mb-px border-b-2 pb-2.5 text-[13px] font-semibold transition-colors ${tab === "reviews" ? "border-emerald-600 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
      >
        Reviews
      </button>
      <button
        type="button"
        onClick={() => setTab("history")}
        className={`-mb-px flex items-center gap-1.5 border-b-2 pb-2.5 text-[13px] font-semibold transition-colors ${tab === "history" ? "border-emerald-600 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
      >
        <HistoryIcon className="h-3.5 w-3.5" />
        History
      </button>
    </div>
  );

  const historyContent = (
    <div className="space-y-3">
      <MonthStepper
        period={historyMonth}
        onChange={setHistoryMonth}
        max={maxHistoryMonth}
      />
      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
          Loading…
        </div>
      ) : evalsError ? (
        <div className="rounded-3xl border border-dashed border-red-200 bg-red-50/40 p-12 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-red-700">
            Couldn't load your history
          </h2>
          <p className="mt-2 text-sm text-red-500">
            Something went wrong fetching your past reviews. Try refreshing.
          </p>
        </div>
      ) : historyRows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
          <HistoryIcon className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-lg font-semibold text-slate-800">
            No reviews for {formatPeriod(historyMonth)}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Step to a different month to see your past submissions.
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
            setExpandedHistory((cur) => (cur === row.id ? null : row.id))
          }
          expandedRowId={expandedHistory}
          getRowId={(row) => row.id}
          renderExpandedRow={(row) => (
            <div className="border-t border-slate-100 bg-slate-50/40 p-4">
              <EvaluationDetail evaluation={row} />
            </div>
          )}
          emptyState={{
            title: "No reviews",
            description: "Nothing to show here.",
          }}
        />
      )}
    </div>
  );

  // ── PM view: one self-report, reviewed by Admin ──
  if (isPm) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Monthly Self-Evaluation
          </h1>
          <p className="text-slate-500 text-[13px] mt-0.5">
            Rate yourself on each parameter once a month. Your submission is
            locked and reviewed by the Admin.
          </p>
        </div>

        {tabs}

        {tab === "history" ? (
          historyContent
        ) : isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
            Loading…
          </div>
        ) : (
          <ProjectEvalPanel
            project={PM_SELF_PROJECT}
            employeeId={employeeId}
            submittedBy={user.id}
            existing={evalsByProject(0)}
            reviewerLabel="Admin"
          />
        )}
      </div>
    );
  }

  // ── Employee view: one form per allocated project ──
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Monthly Performance Review
        </h1>
        <p className="text-slate-500 text-[13px] mt-0.5">
          Rate yourself on each parameter for every project you're allocated to.
          Submissions are locked and reviewed by your PM.
        </p>
      </div>

      {tabs}

      {tab === "history" ? (
        historyContent
      ) : isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
          Loading…
        </div>
      ) : myProjects.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
          <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-lg font-semibold text-slate-800">
            No projects allocated
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            You'll be able to submit reviews once you're allocated to a project.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {myProjects.map((project) => (
            <ProjectEvalPanel
              key={project.id}
              project={project}
              employeeId={employeeId}
              submittedBy={user.id}
              existing={evalsByProject(project.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SelfEvaluationPage;
