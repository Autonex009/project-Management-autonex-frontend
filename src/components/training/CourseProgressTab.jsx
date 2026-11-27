import React, { useState } from "react";
import { Check, Send, Search, Users2 } from "lucide-react";
import Button from "../ui/Button";
import SearchBar from "../ui/SearchBar";
import toast from "react-hot-toast";
import Select from "./Select";
import { ui, plural } from "./trainingStyles";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Where a trainee stands, derived only from their own progress and their
 * cluster's due date:
 *  - Completed: finished every module
 *  - Overdue:   cluster due date has passed and modules are still open
 *  - Behind:    under half the modules done, or due within 2 days and under 75%
 *  - In progress otherwise
 */
const STATES = {
  overdue: { label: "Overdue", text: "text-rose-700", dot: "bg-rose-500", bar: "bg-rose-500", rank: 0 },
  behind: { label: "Behind", text: "text-amber-700", dot: "bg-amber-500", bar: "bg-amber-500", rank: 1 },
  progress: { label: "In progress", text: "text-slate-600", dot: "bg-indigo-500", bar: "bg-indigo-500", rank: 2 },
  completed: { label: "Completed", text: "text-emerald-700", dot: "bg-emerald-500", bar: "bg-emerald-500", rank: 3 },
};

const traineeState = (item, pct, deadline) => {
  if (item.status === "Completed" || pct >= 100) return "completed";
  const due = deadline ? new Date(deadline).getTime() : NaN;
  const daysLeft = Number.isNaN(due) ? null : (due - Date.now()) / DAY_MS;
  if (daysLeft !== null && daysLeft < 0) return "overdue";
  if (pct < 50 || (daysLeft !== null && daysLeft <= 2 && pct < 75)) return "behind";
  return "progress";
};

const formatActive = (s) => {
  const d = new Date((s || "").replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

// Thin progress line: slate track, fill coloured by state
function ProgressLine({ pct, tone = "bg-indigo-500", className = "" }) {
  return (
    <div
      className={`h-1.5 w-full rounded-full bg-slate-100 overflow-hidden ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function CourseProgressTab({ clusters, candidatePool }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [clusterFilter, setClusterFilter] = useState("All");
  const [stateFilter, setStateFilter] = useState("all");

  const progressData = [
    {
      id: 1,
      candidateId: 13,
      name: "Aryan Mundra",
      email: "aryan.m@autonexai360.com",
      role: "Annotator",
      clusterName: "Nov 2025 Onboarding Interns",
      courseName: "Onboarding Training Module",
      modulesCompleted: 12,
      totalModules: 12,
      videosWatchedPct: 100,
      quizAverage: 92,
      status: "Completed",
      lastActive: "2026-11-14 16:45",
    },
    {
      id: 2,
      name: "Priya Sharma",
      email: "priya.s@autonexai360.com",
      role: "Annotator",
      clusterName: "Nov 2025 Onboarding Interns",
      courseName: "Onboarding Training Module",
      modulesCompleted: 12,
      totalModules: 12,
      videosWatchedPct: 100,
      quizAverage: 95,
      status: "Completed",
      lastActive: "2026-11-15 10:15",
    },
    {
      id: 3,
      name: "Rohan Verma",
      email: "rohan.v@autonexai360.com",
      role: "Annotator",
      clusterName: "Nov 2025 Onboarding Interns",
      courseName: "Onboarding Training Module",
      modulesCompleted: 10,
      totalModules: 12,
      videosWatchedPct: 83,
      quizAverage: 78,
      status: "In Progress",
      lastActive: "2026-11-15 14:20",
    },
    {
      id: 4,
      name: "Ananya Patel",
      email: "ananya.p@autonexai360.com",
      role: "Quality Reviewer",
      clusterName: "Nov 2025 Onboarding Interns",
      courseName: "Onboarding Training Module",
      modulesCompleted: 12,
      totalModules: 12,
      videosWatchedPct: 100,
      quizAverage: 98,
      status: "Completed",
      lastActive: "2026-11-16 11:30",
    },
    {
      id: 5,
      name: "Karan Mehta",
      email: "karan.m@autonexai360.com",
      role: "Annotator",
      clusterName: "Nov 2025 Onboarding Interns",
      courseName: "Onboarding Training Module",
      modulesCompleted: 7,
      totalModules: 12,
      videosWatchedPct: 58,
      quizAverage: 74,
      status: "In Progress",
      lastActive: "2026-11-17 09:10",
    },
    {
      id: 6,
      name: "Sneha Rao",
      email: "sneha.r@autonexai360.com",
      role: "Senior Annotator",
      clusterName: "Full-Time Promotion Candidates",
      courseName: "Robotics & Sensor Fusion Training",
      modulesCompleted: 4,
      totalModules: 4,
      videosWatchedPct: 100,
      quizAverage: 96,
      status: "Completed",
      lastActive: "2026-11-15 11:05",
    },
    {
      id: 7,
      name: "Vikram Malhotra",
      email: "vikram.m@autonexai360.com",
      role: "Senior Annotator",
      clusterName: "Full-Time Promotion Candidates",
      courseName: "Robotics & Sensor Fusion Training",
      modulesCompleted: 4,
      totalModules: 4,
      videosWatchedPct: 100,
      quizAverage: 94,
      status: "Completed",
      lastActive: "2026-11-16 17:20",
    },
    {
      id: 8,
      name: "Aditya Nair",
      email: "aditya.n@autonexai360.com",
      role: "Annotator",
      clusterName: "Nov 2025 Onboarding Interns",
      courseName: "Onboarding Training Module",
      modulesCompleted: 4,
      totalModules: 12,
      videosWatchedPct: 33,
      quizAverage: 70,
      status: "In Progress",
      lastActive: "2026-11-18 12:00",
    },
  ];

  const deadlineFor = (clusterName) => clusters.find((c) => c.name === clusterName)?.deadline;

  // Derive per-trainee state once; the list is sorted so people who need
  // attention come first.
  const rows = progressData
    .map((r) => {
      const pct = Math.round((r.modulesCompleted / r.totalModules) * 100);
      return { ...r, pct, state: traineeState(r, pct, deadlineFor(r.clusterName)) };
    })
    .sort((a, b) => STATES[a.state].rank - STATES[b.state].rank || a.pct - b.pct);

  const countBy = (key) => rows.filter((r) => r.state === key).length;
  const overdueCount = countBy("overdue");
  const behindCount = countBy("behind");
  const attentionCount = overdueCount + behindCount;

  const filtered = rows.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.courseName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCluster = clusterFilter === "All" || r.clusterName === clusterFilter;
    const matchesState = stateFilter === "all" || r.state === stateFilter;
    return matchesSearch && matchesCluster && matchesState;
  });

  const completedCount = progressData.filter((r) => r.status === "Completed").length;
  const inProgressCount = progressData.length - completedCount;
  const avgCompletionPct = Math.round(
    progressData.reduce((acc, r) => acc + (r.modulesCompleted / r.totalModules) * 100, 0) /
      progressData.length,
  );
  const isFiltered = searchQuery.trim() !== "" || clusterFilter !== "All" || stateFilter !== "all";

  const handleSendReminder = (candidateName) => {
    toast.success(`Slack reminder sent to ${candidateName}`);
  };

  const handleBulkRemindPending = () => {
    const pendingCount = progressData.filter((r) => r.status === "In Progress").length;
    toast.success(`Slack reminders sent to ${plural(pendingCount, "trainee")} in progress`);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setClusterFilter("All");
    setStateFilter("all");
  };

  const clusterOptions = [
    { value: "All", label: "All clusters" },
    ...clusters.map((c) => ({ value: c.name, label: c.name })),
  ];

  const stateTabs = [
    { id: "all", label: "All", count: rows.length },
    { id: "overdue", label: "Overdue", count: overdueCount, dot: STATES.overdue.dot },
    { id: "behind", label: "Behind", count: behindCount, dot: STATES.behind.dot },
    { id: "completed", label: "Completed", count: completedCount, dot: STATES.completed.dot },
  ];

  const th = "h-10 px-4 text-xs font-normal text-slate-500";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary: one lead figure, three quieter ones */}
      <section className={`${ui.panel} grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] divide-y sm:divide-y-0 lg:divide-x divide-slate-100`}>
        <div className="p-6 sm:col-span-3 lg:col-span-1 sm:border-b sm:border-slate-100 lg:border-b-0">
          <p className="text-[13px] text-slate-500">Average progress</p>
          <p className="mt-2 text-3xl font-medium tabular-nums text-indigo-700 leading-none">
            {avgCompletionPct}%
          </p>
          <ProgressLine pct={avgCompletionPct} className="mt-4" />
          <p className="mt-2 text-xs text-slate-500">
            Modules finished across{" "}
            <span className="tabular-nums text-slate-700">{plural(progressData.length, "trainee")}</span>
          </p>
        </div>

        <div className="p-6">
          <p className="flex items-center gap-1.5 text-[13px] text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Finished all modules
          </p>
          <p className="mt-2 text-2xl tabular-nums text-slate-900 leading-none">{completedCount}</p>
          <p className="mt-3 text-xs text-slate-500">Ready for post-test</p>
        </div>

        <div className="p-6">
          <p className="flex items-center gap-1.5 text-[13px] text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> In progress
          </p>
          <p className="mt-2 text-2xl tabular-nums text-slate-900 leading-none">{inProgressCount}</p>
          <p className="mt-3 text-xs text-slate-500">Daily reminders on</p>
        </div>

        <button
          type="button"
          onClick={() => setStateFilter(overdueCount > 0 ? "overdue" : "behind")}
          disabled={attentionCount === 0}
          className="p-6 text-left hover:bg-slate-50/60 disabled:hover:bg-transparent disabled:cursor-default transition-colors"
        >
          <p className="flex items-center gap-1.5 text-[13px] text-slate-500">
            <span className={`h-1.5 w-1.5 rounded-full ${attentionCount ? (overdueCount ? "bg-rose-500" : "bg-amber-500") : "bg-emerald-500"}`} />
            Need attention
          </p>
          <p className={`mt-2 text-2xl tabular-nums leading-none ${
            overdueCount ? "text-rose-700" : behindCount ? "text-amber-700" : "text-slate-900"
          }`}>
            {attentionCount}
          </p>
          <p className="mt-3 text-xs text-slate-500">
            {attentionCount === 0 ? (
              "Everyone is on track"
            ) : (
              <span className="tabular-nums">
                {overdueCount} overdue · {behindCount} behind
              </span>
            )}
          </p>
        </button>
      </section>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className={ui.segment} role="tablist" aria-label="Filter by status">
            {stateTabs.map((t) => {
              const active = stateFilter === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStateFilter(t.id)}
                  className={ui.segmentItem(active)}
                >
                  {t.dot && <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />}
                  {t.label}
                  <span className={ui.segmentCount(active)}>{t.count}</span>
                </button>
              );
            })}
          </div>
          <SearchBar
            placeholder="Search trainees or courses"
            value={searchQuery}
            onChange={setSearchQuery}
            size="sm"
            className="w-full sm:w-56"
          />
          <Select
            value={clusterFilter}
            onChange={setClusterFilter}
            options={clusterOptions}
            ariaLabel="Filter by cluster"
            className="w-full sm:w-56"
          />
          {isFiltered && (
            <span className={`${ui.meta} px-1 whitespace-nowrap`}>
              {filtered.length} of {progressData.length}
            </span>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleBulkRemindPending}
          disabled={inProgressCount === 0}
          className={`${ui.btnQuiet} whitespace-nowrap`}
        >
          <Send className="h-4 w-4" strokeWidth={1.5} /> Remind in progress
          <span className="tabular-nums text-slate-400">{inProgressCount}</span>
        </Button>
      </div>

      {/* Progress register */}
      {filtered.length === 0 ? (
        <div className={`${ui.panel} py-16 px-6 text-center`}>
          {stateFilter === "overdue" || stateFilter === "behind" ? (
            <>
              <Check className="h-5 w-5 text-emerald-600 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium text-slate-900">
                No one is {stateFilter === "overdue" ? "overdue" : "behind"}
                {clusterFilter !== "All" ? ` in ${clusterFilter}` : ""}
              </p>
              <p className="text-[13px] text-slate-500 mt-1">Nothing to chase here right now</p>
            </>
          ) : progressData.length === 0 ? (
            <>
              <Users2 className="h-5 w-5 text-slate-400 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium text-slate-900">No one is enrolled yet</p>
              <p className="text-[13px] text-slate-500 mt-1">Trainees appear here once a cluster starts a course</p>
            </>
          ) : (
            <>
              <Search className="h-5 w-5 text-slate-400 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium text-slate-900">No trainees match</p>
              <p className="text-[13px] text-slate-500 mt-1">Try another name, course or cluster</p>
            </>
          )}
          {isFiltered && (
            <Button variant="outline" size="sm" onClick={clearFilters} className={`${ui.btnQuiet} mt-4`}>
              Show everyone
            </Button>
          )}
        </div>
      ) : (
        <div className={`${ui.panel} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100">
                <tr>
                  <th className={`${th} pl-6`}>Trainee</th>
                  <th className={th}>Cluster and course</th>
                  <th className={`${th} w-64`}>Modules</th>
                  <th className={`${th} text-right`}>Videos</th>
                  <th className={`${th} text-right`}>Quiz avg</th>
                  <th className={th}>Status</th>
                  <th className={`${th} pr-6`}>
                    <span className="sr-only">Remind</span>
                  </th>
                </tr>
              </thead>
              <tbody className={ui.divider}>
                {filtered.map((item) => {
                  const s = STATES[item.state];
                  const isComplete = item.state === "completed";
                  const needsAttention = item.state === "overdue" || item.state === "behind";

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 pl-6">
                        <p className="text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-400">{item.email}</p>
                      </td>

                      <td className="py-3 px-4">
                        <p className="text-slate-700">{item.clusterName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.courseName}</p>
                      </td>

                      <td className="py-3 px-4 w-64">
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="text-slate-500">
                            <span className="tabular-nums text-slate-900">{item.modulesCompleted}</span> of{" "}
                            <span className="tabular-nums">{item.totalModules}</span>
                          </span>
                          <span className={`tabular-nums ${needsAttention ? s.text : "text-slate-900"}`}>{item.pct}%</span>
                        </div>
                        <ProgressLine pct={item.pct} tone={s.bar} className="mt-2" />
                      </td>

                      <td className="py-3 px-4 text-right tabular-nums text-slate-600">
                        {item.videosWatchedPct}%
                      </td>

                      <td className="py-3 px-4 text-right tabular-nums text-slate-900">
                        {item.quizAverage}%
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 ${s.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                        <p className="mt-0.5 text-xs tabular-nums text-slate-400">
                          Active {formatActive(item.lastActive)}
                        </p>
                      </td>

                      <td className="py-3 px-4 pr-6 text-right">
                        {isComplete ? (
                          <span className="sr-only">No reminder needed</span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendReminder(item.name)}
                            className={ui.btnQuiet}
                            aria-label={`Send Slack reminder to ${item.name}`}
                          >
                            <Send className="h-4 w-4" strokeWidth={1.5} /> Remind
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
