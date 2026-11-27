import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  History,
  Keyboard,
  Play,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { assessmentApi } from "../../services/api";
import Button from "../ui/Button";
import LoadingSpinner from "../ui/LoadingSpinner";
import { plural, ui } from "./trainingStyles";

/**
 * "My Assessments" — the signed-in person's own tests.
 *
 *  - To do:   tests waiting to be taken (start / resume / retake).
 *  - History: every finished attempt with its score and "N / M correct" report.
 *
 * Candidates only ever receive aggregate results from the API (no answer keys, no per-question
 * detail, no proctoring flags), so this screen cannot leak them.
 */

const STATUS_BADGE = {
  passed: { label: "Passed", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  failed: { label: "Not passed", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  in_progress: { label: "In progress", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  assigned: { label: "Assigned", cls: "bg-slate-100 text-slate-700 border-slate-200" },
};

const isPending = (enr) => enr.status === "assigned" || enr.status === "in_progress";
const finishedAttempts = (enr) =>
  (enr.attempts || []).filter((a) => a.status !== "in_progress");

const formatPercent = (value) =>
  value === null || value === undefined ? "—" : `${Number(Number(value).toFixed(1))}%`;

const formatDuration = (seconds) => {
  const s = Math.max(0, Number(seconds || 0));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
};

const safeDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "7 / 10 correct" for MCQ, "42 WPM · 96% accuracy" for typing. */
function reportLine(attempt, testType) {
  const summary = attempt.result_summary || {};
  if (testType === "typing" || summary.net_wpm !== undefined) {
    if (summary.net_wpm === undefined) return null;
    const acc = summary.accuracy_percent !== undefined ? ` · ${summary.accuracy_percent}% accuracy` : "";
    return { icon: Keyboard, text: `${summary.net_wpm} WPM${acc}` };
  }
  if (summary.total_questions) {
    return {
      icon: ClipboardCheck,
      text: `${summary.correct_count ?? 0} / ${summary.total_questions} correct`,
    };
  }
  if (summary.total_marks_possible) {
    return {
      icon: ClipboardCheck,
      text: `${summary.total_marks_obtained ?? 0} / ${summary.total_marks_possible} marks`,
    };
  }
  return null;
}

function Badge({ kind }) {
  const b = STATUS_BADGE[kind] || STATUS_BADGE.assigned;
  return (
    <span
      className={`inline-flex items-center h-5 px-2 rounded-full text-[11px] font-medium border ${b.cls}`}
    >
      {b.label}
    </span>
  );
}

function TodoCard({ enr, onStart }) {
  const deadline = safeDate(enr.deadline);
  const overdue = Boolean(deadline && deadline < new Date());
  const totalAllowed = Number(enr.max_attempts || 1) + Number(enr.extra_attempts || 0);
  const attemptsLeft = Math.max(0, totalAllowed - Number(enr.attempts_used || 0));
  const resuming = enr.status === "in_progress";
  // A sitting that is already running can always be resumed; new sittings need time + attempts left.
  const blocked = !resuming && (overdue || attemptsLeft === 0);

  const label = resuming ? "Resume" : enr.attempts_used > 0 ? "Retake" : "Start";
  const Icon = resuming ? Play : enr.attempts_used > 0 ? RotateCcw : Play;

  return (
    <div className={`${ui.panel} p-4 flex flex-col gap-3`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`${ui.title} truncate`}>{enr.assessment_title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span className="uppercase font-medium text-slate-400">{enr.test_type}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {enr.duration_minutes} min
            </span>
            {enr.question_count ? (
              <>
                <span>·</span>
                <span>{plural(enr.question_count, "question")}</span>
              </>
            ) : null}
            {enr.test_type !== "typing" && enr.passing_score !== null && enr.passing_score !== undefined && (
              <>
                <span>·</span>
                <span>Pass mark {formatPercent(enr.passing_score)}</span>
              </>
            )}
          </div>
        </div>
        <Badge kind={enr.status} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
        <div className="space-y-0.5">
          <div
            className={`inline-flex items-center gap-1.5 ${
              overdue ? "text-rose-600 font-medium" : "text-slate-600"
            }`}
          >
            <CalendarClock className="h-3.5 w-3.5" />
            {deadline ? (
              <>
                Due {format(deadline, "d MMM yyyy, h:mm a")}
                {overdue && " (overdue)"}
              </>
            ) : (
              "No deadline"
            )}
          </div>
          <div className="text-xs text-slate-500 tabular-nums">
            {attemptsLeft} of {plural(totalAllowed, "attempt")} left
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          className={ui.btnDark}
          disabled={blocked}
          title={
            blocked
              ? overdue
                ? "The deadline has passed. Ask HR for an extension."
                : "No attempts left. Ask HR for a retest."
              : undefined
          }
          onClick={() => onStart(enr.enrollment_id)}
        >
          <Icon className="h-4 w-4" />
          {blocked ? (overdue ? "Deadline passed" : "No attempts left") : label}
        </Button>
      </div>
    </div>
  );
}

function HistoryCard({ enr }) {
  const attempts = useMemo(
    () => [...finishedAttempts(enr)].sort((a, b) => b.attempt_number - a.attempt_number),
    [enr]
  );
  const finalKind = enr.status === "passed" ? "passed" : enr.status === "failed" ? "failed" : enr.status;

  return (
    <div className={`${ui.panel} overflow-hidden`}>
      <div className="px-4 py-3.5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100">
        <div className="min-w-0">
          <div className={`${ui.title} truncate`}>{enr.assessment_title}</div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            <span className="uppercase font-medium text-slate-400">{enr.test_type}</span>
            {enr.test_type !== "typing" && enr.passing_score !== null && enr.passing_score !== undefined
              ? ` · Pass mark ${formatPercent(enr.passing_score)}`
              : ""}
            {` · ${plural(attempts.length, "attempt")} taken`}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[11px] text-slate-500">Best score</div>
            <div className="text-lg font-semibold text-slate-900 tabular-nums leading-tight">
              {formatPercent(enr.best_score)}
            </div>
          </div>
          <Badge kind={finalKind} />
        </div>
      </div>

      <ul className="divide-y divide-slate-100">
        {attempts.map((att) => {
          const report = reportLine(att, enr.test_type);
          const when = safeDate(att.submitted_at);
          const ReportIcon = report?.icon;
          return (
            <li key={att.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-slate-900">
                  Attempt #{att.attempt_number}
                </div>
                <div className="text-xs text-slate-500 tabular-nums">
                  {when ? format(when, "d MMM yyyy, h:mm a") : "—"}
                  {att.time_spent_seconds > 0 && ` · ${formatDuration(att.time_spent_seconds)}`}
                  {att.result_summary?.auto_submitted && " · submitted when time ran out"}
                </div>
              </div>

              <div className="flex items-center gap-4 text-[13px] tabular-nums">
                {report && (
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    <ReportIcon className="h-3.5 w-3.5 text-slate-400" />
                    {report.text}
                  </span>
                )}
                <span className="font-semibold text-slate-900 min-w-[3.5rem] text-right">
                  {formatPercent(att.score)}
                </span>
                {att.passed === true ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <CheckCircle2 className="h-4 w-4" /> Passed
                  </span>
                ) : att.passed === false ? (
                  <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                    <XCircle className="h-4 w-4" /> Not passed
                  </span>
                ) : (
                  <span className="text-slate-400">Pending</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function MyAssessmentsPanel() {
  const navigate = useNavigate();
  const [view, setView] = useState("todo");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["myEnrollments"],
    queryFn: assessmentApi.getMyEnrollments,
    staleTime: 30 * 1000,
  });

  const enrollments = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const todo = useMemo(
    () =>
      enrollments
        .filter(isPending)
        .sort((a, b) => {
          const da = safeDate(a.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER;
          const db = safeDate(b.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER;
          return da - db;
        }),
    [enrollments]
  );

  const history = useMemo(
    () =>
      enrollments
        .filter((e) => finishedAttempts(e).length > 0)
        .sort((a, b) => {
          const last = (e) =>
            Math.max(0, ...finishedAttempts(e).map((x) => safeDate(x.submitted_at)?.getTime() ?? 0));
          return last(b) - last(a);
        }),
    [enrollments]
  );

  const tabs = [
    { value: "todo", label: "To do", count: todo.length, icon: ClipboardCheck },
    { value: "history", label: "History", count: history.length, icon: History },
  ];

  return (
    <div className="space-y-4">
      <div className={`${ui.segment}`} role="tablist" aria-label="My assessments">
        {tabs.map((t) => {
          const active = view === t.value;
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setView(t.value)}
              className={ui.segmentItem(active)}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {t.label}
              <span className={ui.segmentCount(active)}>{t.count}</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner size="md" text="Loading your assessments..." />
        </div>
      ) : isError ? (
        <div className={`${ui.panel} py-12 px-6 text-center`}>
          <div className={ui.heading}>Could not load your assessments</div>
          <p className={`${ui.muted} mt-1`}>Check your connection and try again.</p>
          <Button variant="outline" size="sm" className={`${ui.btnQuiet} mt-4`} onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : view === "todo" ? (
        todo.length === 0 ? (
          <div className={`${ui.panel} py-14 px-6 text-center`}>
            <ClipboardCheck className="h-8 w-8 text-slate-300 mx-auto mb-2.5" strokeWidth={1.5} />
            <div className={ui.heading}>Nothing to take right now</div>
            <p className={`${ui.muted} mt-1`}>
              Assessments assigned to you will show up here with their deadline.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {todo.map((enr) => (
              <TodoCard
                key={enr.enrollment_id}
                enr={enr}
                onStart={(id) => navigate(`/assessments/${id}/take`)}
              />
            ))}
          </div>
        )
      ) : history.length === 0 ? (
        <div className={`${ui.panel} py-14 px-6 text-center`}>
          <History className="h-8 w-8 text-slate-300 mx-auto mb-2.5" strokeWidth={1.5} />
          <div className={ui.heading}>No results yet</div>
          <p className={`${ui.muted} mt-1`}>
            Once you finish an assessment, your score and report will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((enr) => (
            <HistoryCard key={enr.enrollment_id} enr={enr} />
          ))}
        </div>
      )}
    </div>
  );
}
