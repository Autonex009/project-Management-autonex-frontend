import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { allocationApi, subProjectApi, perfEvalApi } from "../../services/api";
import {
  ClipboardList,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Lock,
  History as HistoryIcon,
  X,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import StarRating, {
  currentPeriod,
  formatPeriod,
  shiftPeriod,
} from "../../components/perf/StarRating";
import { PERF_PARAMETERS, averageOf, weightedAverageOf } from "../../components/perf/perfParams";
import { StatusPill, fmtDate, RatingCell, MonthStepper } from "../../components/perf/perfTableCells";
import EvaluationDetail from "../../components/perf/EvaluationDetail";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Table from "../../components/ui/Table";
import { formatDisplayName } from "../../utils/displayName";

const getISTDate = () => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  return {
    year: parseInt(parts.year, 10),
    month: parseInt(parts.month, 10),
    day: parseInt(parts.day, 10),
  };
};

const CATEGORY_THEMES = {
  "Productivity": {
    badge: "bg-blue-50 text-blue-700 border-blue-200/80",
    dot: "bg-blue-500",
  },
  "Accuracy & Quality": {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    dot: "bg-emerald-500",
  },
  "Diligence": {
    badge: "bg-purple-50 text-purple-700 border-purple-200/80",
    dot: "bg-purple-500",
  },
  "Professional Discipline": {
    badge: "bg-amber-50 text-amber-700 border-amber-200/80",
    dot: "bg-amber-500",
  },
  "Knowledge & Understanding": {
    badge: "bg-cyan-50 text-cyan-700 border-cyan-200/80",
    dot: "bg-cyan-500",
  },
  "Learning & Application": {
    badge: "bg-sky-50 text-sky-700 border-sky-200/80",
    dot: "bg-sky-500",
  },
  "Communication & Engagement": {
    badge: "bg-rose-50 text-rose-700 border-rose-200/80",
    dot: "bg-rose-500",
  },
};

const ProjectEvalPanel = ({
  project,
  employeeId,
  submittedBy,
  existing,
  reviewerLabel = "PM",
  isLateSubmission = false,
  onLateSubmitSuccess,
}) => {
  const [expanded, setExpanded] = useState(isLateSubmission);
  const queryClient = useQueryClient();

  const [period, setPeriod] = useState(isLateSubmission ? "2026-09" : currentPeriod());
  const [ratings, setRatings] = useState({}); // { paramName: 1-5 }
  const [comment, setComment] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // existing evaluation for the selected period (locked once submitted)
  const currentEval = existing.find((e) => e.period === period) || null;
  const liveAverage = weightedAverageOf(ratings) ?? averageOf(PERF_PARAMETERS.map((p) => ratings[p.name]));
  const ratedCount = PERF_PARAMETERS.filter((p) => ratings[p.name] != null).length;
  const isComplete = ratedCount === PERF_PARAMETERS.length;

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = localStorage.getItem("role") || storedUser.role || "employee";

  const istInfo = useMemo(() => {
    const { year, day, month } = getISTDate();
    const [periodYear, periodMonth] = period.split("-").map(Number);
    
    let isOpen = false;
    let isPastDeadline = false;
    let isBeforeOpen = false;

    if (year > periodYear || (year === periodYear && month > periodMonth)) {
      isPastDeadline = true;
    } else if (year < periodYear || (year === periodYear && month < periodMonth)) {
      isBeforeOpen = true;
    } else {
      isOpen = day >= 20 && day <= 24;
      isPastDeadline = day > 24;
      isBeforeOpen = day < 20;
    }
    
    return { isOpen, isPastDeadline, isBeforeOpen, day };
  }, [period, userRole]);

  const isSubmissionAllowed = istInfo.isOpen;

  const submitMutation = useMutation({
    mutationFn: (data) => perfEvalApi.submit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-perf-evals"] });
      toast.success("Review submitted");
      setRatings({});
      setComment("");
      if (onLateSubmitSuccess) onLateSubmitSuccess();
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
          ) : istInfo.isPastDeadline ? (
            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600 border border-rose-200">
              Missed deadline
            </span>
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
          {currentEval ? (
            <div className="space-y-4">
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                {currentEval.status === "reviewed"
                  ? `Your ${reviewerLabel} has reviewed this month's evaluation. See the ratings and feedback below.`
                  : `You've already submitted this month's evaluation. It's locked and pending your ${reviewerLabel}'s review.`}
              </p>
              <EvaluationDetail evaluation={currentEval} />
            </div>
          ) : !isSubmissionAllowed ? (
            <div className="rounded-xl bg-slate-50 px-4 py-8 text-center border border-slate-100 mt-2">
              <Lock className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-700">
                {istInfo.isPastDeadline
                  ? "Self-Evaluation Window Closed"
                  : "Self-Evaluation Window Not Open"}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {istInfo.isBeforeOpen
                  ? "The performance evaluation form opens on the 20th and stays open until the 24th."
                  : "The self-evaluation window is closed."}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Header Scorecard & Progress Banner (Light Theme) */}
              <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-indigo-50/20 p-5 shadow-xs">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/80">
                        <Sparkles className="h-3 w-3 text-emerald-600" /> Monthly Review
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        {formatPeriod(period)}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-lg font-bold text-slate-900 tracking-tight">
                      Performance Self-Evaluation
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Rate your performance across the 7 core competencies below. Submissions close on the 24th.
                    </p>
                  </div>

                  <div className="flex items-center gap-5 self-start sm:self-auto rounded-xl bg-white border border-slate-200/80 px-4 py-2.5 shadow-xs">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Progress
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-slate-800">
                        <span className={isComplete ? "text-emerald-600" : "text-amber-600"}>
                          {ratedCount}
                        </span>
                        <span className="text-xs font-normal text-slate-400"> / {PERF_PARAMETERS.length}</span>
                      </p>
                    </div>
                    <div className="h-7 w-px bg-slate-200" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Live Rating
                      </p>
                      <p className="mt-0.5 text-lg font-black text-amber-600 tabular-nums">
                        {liveAverage != null ? liveAverage.toFixed(2) : "—"}
                        <span className="text-xs font-normal text-slate-400"> / 5.0</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress track */}
                <div className="mt-4">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/50">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 via-indigo-500 to-emerald-500 transition-all duration-300 ease-out"
                      style={{ width: `${(ratedCount / PERF_PARAMETERS.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Informational callout */}
              <div className="flex items-start gap-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 px-4 py-3 text-xs text-amber-800">
                <Sparkles className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-semibold">Self-Evaluation Window Open:</span>{" "}
                  Submissions close automatically on the 24th. Completing your evaluation across all 7 criteria is required to remain eligible for the monthly bonus.
                </div>
              </div>

              {/* Form with 7 Competency Cards */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-2.5">
                  {PERF_PARAMETERS.map((p, idx) => {
                    const isRated = ratings[p.name] != null;
                    const theme = CATEGORY_THEMES[p.category] || {
                      badge: "bg-slate-100 text-slate-700 border-slate-200",
                      dot: "bg-slate-400",
                    };

                    return (
                      <div
                        key={p.name}
                        className={`group rounded-2xl border transition-all duration-200 ${
                          isRated
                            ? "border-emerald-200/80 bg-white shadow-xs hover:border-emerald-300"
                            : "border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs"
                        }`}
                      >
                        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-bold text-slate-400 tracking-wider">
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                              {p.category && (
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${theme.badge}`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
                                  {p.category}
                                </span>
                              )}
                              <h4 className="text-sm font-bold text-slate-800 tracking-tight">
                                {p.name}
                              </h4>
                              {isRated && (
                                <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-600">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-2xl">
                              {p.description}
                            </p>
                          </div>

                          <div className="shrink-0 self-end sm:self-center pt-1 sm:pt-0">
                            <StarRating
                              value={ratings[p.name] || null}
                              onChange={(v) =>
                                setRatings((m) => ({ ...m, [p.name]: v }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Overall Remarks Box */}
                <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 transition-colors focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100/60">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                      Overall Remarks <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {comment.length} characters
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share any highlights, completed milestones, or blockers encountered this month…"
                    className="w-full resize-none border-0 bg-transparent p-0 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                  />
                </div>

                {/* Bottom Action / Submission Bar */}
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">Calculated Score:</span>
                      <span className="text-sm font-bold text-slate-800 tabular-nums">
                        {liveAverage != null ? `${liveAverage.toFixed(2)} / 5.0` : "—"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isComplete
                        ? "All 7 criteria evaluated. Click submit to finalize."
                        : `${PERF_PARAMETERS.length - ratedCount} parameter${PERF_PARAMETERS.length - ratedCount > 1 ? "s" : ""} left to rate.`}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={submitMutation.isPending || !isComplete}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition-all ${
                      isComplete && !submitMutation.isPending
                        ? "bg-emerald-600 hover:bg-emerald-700 hover:shadow-sm active:scale-98 cursor-pointer"
                        : "bg-slate-300 cursor-not-allowed opacity-75"
                    }`}
                  >
                    {submitMutation.isPending ? (
                      "Submitting…"
                    ) : (
                      <>
                        <span>Submit Self-Evaluation</span>
                        <CheckCircle2 className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
                <p className="text-center text-xs text-slate-400 pt-1">
                  Once submitted, the evaluation is locked and cannot be edited.
                </p>
              </form>
            </div>
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

  const { year, month, day } = getISTDate();
  

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
            Submit your self-evaluation between the 20th and the 24th of the month. Submissions
            close on the 24th for payroll processing and are reviewed by Admin.
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
          <div>
            <ProjectEvalPanel
              project={PM_SELF_PROJECT}
              employeeId={employeeId}
              submittedBy={user.id}
              existing={evalsByProject(0)}
              reviewerLabel="Admin"
            />
          </div>
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
          Submit your review between the 20th and the 24th of the month for each allocated project. Submissions
          close on the 24th to determine monthly bonus eligibility and are reviewed by your PM.
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
        <div>
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
        </div>
      )}

    </div>
  );
};

export default SelfEvaluationPage;
