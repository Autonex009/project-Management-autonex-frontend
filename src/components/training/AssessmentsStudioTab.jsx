import React, { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Archive,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Keyboard,
  Layers,
  ListChecks,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Users2,
} from "lucide-react";
import { format, addDays } from "date-fns";
import toast from "react-hot-toast";
import { assessmentApi, assignmentApi } from "../../services/api";
import Modal from "../ui/Modal";
import ConfirmDialog from "../ui/ConfirmDialog";
import Button from "../ui/Button";
import DatePicker from "../ui/DatePicker";
import RowActionMenu from "../ui/RowActionMenu";
import LoadingSpinner from "../ui/LoadingSpinner";
import Select from "./Select";
import EditTestDrawer from "./EditTestDrawer";
import { ui, testTypeMeta, rateTone, plural } from "./trainingStyles";

function hasPreviewContent(test) {
  if (!test) return false;
  if (test.test_type === "typing") {
    return String(test.test_config?.passage_text || "").trim().length > 0;
  }
  const cats = test.test_config?.categories || [];
  return cats.some((c) => Array.isArray(c.questions) && c.questions.length > 0);
}

function getBlueprintMetrics(test) {
  const cfg = test?.test_config || {};
  if (test?.test_type === "typing") {
    const words = String(cfg.passage_text || "").trim()
      ? String(cfg.passage_text || "").trim().split(/\s+/).length
      : 0;
    const ready = words >= 20 && Number(cfg.target_wpm || 0) > 0 && Number(cfg.min_accuracy_percent || 0) > 0;
    return {
      isTyping: true,
      words,
      targetWpm: cfg.target_wpm || 40,
      minAccuracy: cfg.min_accuracy_percent || 90,
      ready,
    };
  }
  const cats = Array.isArray(cfg.categories) ? cfg.categories : [];
  const categoriesCount = test?.categories_count ?? cats.length;
  const drawCount =
    test?.questions_count ??
    cats.reduce((acc, c) => acc + Math.max(0, Number(c.pick_count || 0)), 0);
  const poolSize =
    test?.pool_size ??
    cats.reduce((acc, c) => acc + (Array.isArray(c.questions) ? c.questions.length : 0), 0);
  const ready =
    cats.length > 0 &&
    cats.every((c) => Number(c.pick_count || 0) >= 1 && (c.questions?.length || 0) >= Number(c.pick_count || 0));

  return {
    isTyping: false,
    categoriesCount,
    drawCount,
    poolSize,
    ready,
  };
}

function ScoreStrip({ rate, completedCount, enrolledCount }) {
  const pct = rate === null || rate === undefined ? 0 : Math.max(0, Math.min(100, Number(rate)));
  const barTone =
    rate === null || rate === undefined
      ? "bg-slate-200"
      : pct >= 70
        ? "bg-emerald-500"
        : pct >= 40
          ? "bg-amber-500"
          : "bg-rose-500";

  return (
    <div className="min-w-[140px]">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className={`font-semibold tabular-nums ${rateTone(rate)}`}>
          {rate !== null && rate !== undefined ? `${rate}% pass` : "No attempts"}
        </span>
        <span className="text-slate-400 tabular-nums">
          {completedCount}/{enrolledCount}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${barTone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AssessmentsStudioTab({
  tests = [],
  activeTests = null,
  isLoading = false,
  clusters = [],
  onLaunchDemo,
  searchQuery = "",
  selectedType = "All",
  selectedStatus = "All",
  showCreateModal,
  setShowCreateModal,
}) {
  const queryClient = useQueryClient();

  const [editingTest, setEditingTest] = useState(null);
  const [assignModalTest, setAssignModalTest] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoreTitle, setRestoreTitle] = useState("");
  const [restoreTo, setRestoreTo] = useState("published");
  const [restoreAssignments, setRestoreAssignments] = useState(true);
  const [restoreError, setRestoreError] = useState("");

  // Create Assessment form state
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    test_type: "mcq",
    duration_minutes: 20,
    passing_score: 70,
    max_attempts: 1,
    require_camera: true,
    max_tab_switches: 3,
  });

  // Assign Assessment form state
  const defaultDeadline = format(addDays(new Date(), 7), "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [assignClusterId, setAssignClusterId] = useState("");
  const [deadlineMode, setDeadlineMode] = useState("fixed");
  const [deadlineDate, setDeadlineDate] = useState(defaultDeadline);
  const [relativeDays, setRelativeDays] = useState(7);

  const filteredTests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tests.filter((t) => {
      if (selectedType !== "All" && t.test_type !== selectedType) return false;
      if (selectedStatus !== "All" && t.status !== selectedStatus) return false;
      if (!q) return true;
      return (
        String(t.title || "").toLowerCase().includes(q) ||
        String(t.description || "").toLowerCase().includes(q)
      );
    });
  }, [tests, searchQuery, selectedType, selectedStatus]);

  const createMutation = useMutation({
    mutationFn: (payload) => assessmentApi.create(payload),
    onSuccess: (created) => {
      queryClient.setQueryData(["assessments"], (old) => (Array.isArray(old) ? [created, ...old] : [created]));
      toast.success("Draft created. Configure questions or passage now.");
      setShowCreateModal(false);
      setCreateForm({
        title: "",
        description: "",
        test_type: "mcq",
        duration_minutes: 20,
        passing_score: 70,
        max_attempts: 1,
        require_camera: true,
        max_tab_switches: 3,
      });
      setEditingTest(created);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || "Could not create assessment.");
    },
  });

  const statusToggleMutation = useMutation({
    mutationFn: ({ id, nextStatus }) => assessmentApi.update(id, { status: nextStatus }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["assessments"], (old) =>
        Array.isArray(old) ? old.map((a) => (a.id === updated.id ? updated : a)) : old
      );
      toast.success(updated.status === "published" ? "Assessment published" : "Moved back to draft");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || "Cannot update publish status. Check pool requirements.");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => assessmentApi.archive(id),
    onSuccess: (_, archivedId) => {
      let archivedItem = null;
      queryClient.setQueryData(["assessments"], (old) => {
        if (!Array.isArray(old)) return old;
        archivedItem = old.find((a) => a.id === archivedId) || null;
        return old.filter((a) => a.id !== archivedId);
      });
      if (archivedItem) {
        queryClient.setQueryData(["archivedAssessments"], (old) =>
          Array.isArray(old) ? [{ ...archivedItem, status: "archived", assigned_clusters: [] }, ...old] : old
        );
      }
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["clusters"] });
      queryClient.invalidateQueries({ queryKey: ["adminEnrollments"] });
      toast.success("Assessment archived");
      setArchiveTarget(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || "Could not archive assessment.");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: ({ id, title, restore_to, restore_assignments }) =>
      assessmentApi.restore(id, { ...(title ? { title } : {}), restore_to, restore_assignments }),
    onSuccess: (restored, vars) => {
      queryClient.setQueryData(["archivedAssessments"], (old) =>
        Array.isArray(old) ? old.filter((a) => a.id !== restored.id) : old
      );
      // Invalidate active assessments if assignments were reactivated so assigned_clusters & counts refresh
      if (vars.restore_assignments) {
        queryClient.invalidateQueries({ queryKey: ["assessments"] });
        queryClient.invalidateQueries({ queryKey: ["assignments"] });
        queryClient.invalidateQueries({ queryKey: ["clusters"] });
        queryClient.invalidateQueries({ queryKey: ["adminEnrollments"] });
      } else {
        queryClient.setQueryData(["assessments"], (old) =>
          Array.isArray(old) ? [restored, ...old.filter((a) => a.id !== restored.id)] : [restored]
        );
      }
      toast.success(
        restored.status === "published"
          ? vars.restore_assignments
            ? "Assessment published & cluster assignments restored"
            : "Assessment restored and published"
          : "Assessment restored to draft"
      );
      setRestoreTarget(null);
      setRestoreTitle("");
      setRestoreError("");
    },
    onError: (err) => {
      setRestoreError(err?.response?.data?.detail || "Could not restore assessment.");
    },
  });

  const openRestoreModal = (test) => {
    const canPublish = getBlueprintMetrics(test).ready;
    setRestoreTarget(test);
    setRestoreTitle(test.title || "");
    setRestoreTo(canPublish ? "published" : "draft");
    setRestoreAssignments(canPublish);
    setRestoreError("");
  };

  const liveActiveTests = activeTests ?? tests.filter((t) => t.status !== "archived");
  const restoreOriginalConflict = Boolean(
    restoreTarget &&
      liveActiveTests.some(
        (t) =>
          t.id !== restoreTarget.id &&
          String(t.title || "").trim().toLowerCase() ===
            String(restoreTarget.title || "").trim().toLowerCase()
      )
  );
  const restoreCurrentConflict = Boolean(
    restoreTarget &&
      restoreTitle.trim() &&
      liveActiveTests.some(
        (t) =>
          t.id !== restoreTarget.id &&
          String(t.title || "").trim().toLowerCase() === restoreTitle.trim().toLowerCase()
      )
  );

  const assignMutation = useMutation({
    mutationFn: (payload) => assignmentApi.create(payload),
    onSuccess: (createdAsg) => {
      queryClient.setQueriesData({ queryKey: ["assignments"] }, (old) =>
        Array.isArray(old) ? [createdAsg, ...old] : [createdAsg]
      );
      queryClient.setQueryData(["clusters"], (old) =>
        Array.isArray(old)
          ? old.map((c) =>
              c.id === createdAsg.cluster_id
                ? { ...c, active_assignments_count: Number(c.active_assignments_count || 0) + 1 }
                : c
            )
          : old
      );
      queryClient.setQueryData(["assessments"], (old) =>
        Array.isArray(old)
          ? old.map((a) =>
              a.id === createdAsg.assessment_id
                ? {
                    ...a,
                    enrolled_count: Number(a.enrolled_count || 0) + Number(createdAsg.total_enrolled || 0),
                    assigned_clusters: [
                      ...(a.assigned_clusters || []),
                      {
                        assignment_id: createdAsg.id,
                        cluster_id: createdAsg.cluster_id,
                        name: createdAsg.cluster_name,
                        deadline: createdAsg.deadline,
                        relative_due_days: createdAsg.relative_due_days,
                      },
                    ],
                  }
                : a
            )
          : old
      );
      queryClient.invalidateQueries({ queryKey: ["adminEnrollments"] });
      toast.success(
        `Assigned to ${createdAsg.cluster_name || "cluster"} (${createdAsg.total_enrolled || 0} enrolled)`
      );
      setAssignModalTest(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || "Assignment failed.");
    },
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (createForm.title.trim().length < 2) {
      toast.error("Please enter a title (min 2 characters).");
      return;
    }
    const isTyping = createForm.test_type === "typing";
    createMutation.mutate({
      title: createForm.title.trim(),
      description: createForm.description.trim() || null,
      test_type: createForm.test_type,
      duration_minutes: Math.max(1, Math.min(240, Number(createForm.duration_minutes) || 20)),
      passing_score:
        createForm.passing_score === "" || createForm.passing_score === null
          ? isTyping
            ? null
            : 70
          : Math.max(0, Math.min(100, Number(createForm.passing_score))),
      max_attempts: Math.max(1, Math.min(10, Number(createForm.max_attempts) || 1)),
      proctoring_config: {
        require_camera: createForm.require_camera,
        max_tab_switches: Math.max(1, Math.min(99, Number(createForm.max_tab_switches) || 99)),
      },
      test_config: isTyping
        ? { passage_text: "", target_wpm: 40, min_accuracy_percent: 90 }
        : { mode: "category_pooled", shuffle_questions: true, shuffle_options: true, categories: [] },
    });
  };

  const openAssignModal = (test) => {
    setAssignClusterId(clusters[0] ? String(clusters[0].id) : "");
    setDeadlineMode("fixed");
    setDeadlineDate(defaultDeadline);
    setRelativeDays(7);
    setAssignModalTest(test);
  };

  const handleAssignSubmit = (e) => {
    e.preventDefault();
    if (!assignModalTest || !assignClusterId) {
      toast.error("Select a target cluster.");
      return;
    }
    const payload = {
      cluster_id: Number(assignClusterId),
      assessment_id: assignModalTest.id,
    };
    if (deadlineMode === "fixed") {
      if (!deadlineDate) {
        toast.error("Select a deadline date.");
        return;
      }
      const dl = new Date(`${deadlineDate}T23:59:59`);
      if (dl <= new Date()) {
        toast.error("Deadline must be in the future.");
        return;
      }
      payload.deadline = dl.toISOString();
    } else {
      const days = Math.max(1, Math.min(365, Number(relativeDays) || 7));
      payload.relative_due_days = days;
    }
    assignMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className={`${ui.panel} py-16 flex items-center justify-center`}>
        <LoadingSpinner size="md" text="Loading assessments..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredTests.length === 0 ? (
        <div className={`${ui.panel} py-16 px-6 text-center`}>
          <div className="mx-auto w-11 h-11 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <ShieldCheck className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <h3 className={ui.heading}>
            {tests.length === 0 ? "No assessments created yet" : "No assessments match your filters"}
          </h3>
          <p className={`${ui.muted} mt-1 max-w-md mx-auto`}>
            {tests.length === 0
              ? "Build category-pooled MCQ exams or keystroke-monitored typing benchmarks, then publish and assign to cohorts."
              : "Try clearing search keywords or switching type and status filters."}
          </p>
          {tests.length === 0 && (
            <Button onClick={() => setShowCreateModal(true)} className={`${ui.btnPrimary} mt-4`}>
              <Plus className="h-4 w-4" /> Create first assessment
            </Button>
          )}
        </div>
      ) : (
        <div className={`${ui.panel} ${ui.divider}`}>
          {filteredTests.map((test, index) => {
            const meta = testTypeMeta(test.test_type);
            const metrics = getBlueprintMetrics(test);
            const isPublished = test.status === "published";
            const isArchived = test.status === "archived";
            const canPreview = hasPreviewContent(test);
            const assignedList = test.assigned_clusters || [];

            return (
              <div
                key={test.id}
                className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 hover:bg-slate-50/60 transition-colors"
              >
                {/* Left: identity, blueprint metrics, assigned cohorts */}
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${meta.dot}`} />
                    <h3 className={ui.title}>{test.title}</h3>
                    <span className={ui.tag}>{meta.label}</span>
                    <span
                      className={
                        isArchived
                          ? "inline-flex items-center gap-1 h-5 px-2 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200"
                          : isPublished
                            ? "inline-flex items-center gap-1 h-5 px-2 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                            : "inline-flex items-center gap-1 h-5 px-2 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/80"
                      }
                    >
                      {isArchived ? "Archived" : isPublished ? "Published" : "Draft"}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">v{test.version || 1}</span>
                    {!isPublished && !isArchived && !metrics.ready && (
                      <span className={ui.tagWarn}>Needs setup before publish</span>
                    )}
                  </div>

                  {test.description && (
                    <p className="text-[13px] text-slate-500 line-clamp-1">{test.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-slate-500 tabular-nums">
                    {metrics.isTyping ? (
                      <>
                        <span className="inline-flex items-center gap-1">
                          <Keyboard className="h-3.5 w-3.5 text-slate-400" />
                          {metrics.words} words
                        </span>
                        <span>{metrics.targetWpm} WPM target</span>
                        <span>{metrics.minAccuracy}% min accuracy</span>
                      </>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5 text-slate-400" />
                          {plural(metrics.categoriesCount, "group")}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ListChecks className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-medium text-slate-700">
                            {plural(metrics.drawCount, "question")} per test
                          </span>
                          <span className="text-slate-400">
                            (from a pool of {metrics.poolSize})
                          </span>
                        </span>
                        {test.passing_score !== null && test.passing_score !== undefined && (
                          <span>{test.passing_score}% pass</span>
                        )}
                      </>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {test.duration_minutes} min · {plural(test.max_attempts || 1, "attempt")}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Camera className="h-3.5 w-3.5 text-slate-400" />
                      {test.proctoring_config?.require_camera ? "Camera req" : "Camera opt"} ·{" "}
                      {Number(test.proctoring_config?.max_tab_switches ?? 99) >= 99
                        ? "Unlimited tabs"
                        : `Max ${test.proctoring_config?.max_tab_switches} tabs`}
                    </span>
                  </div>

                  {assignedList.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[11px] font-medium text-slate-400">Assigned:</span>
                      {assignedList.map((asg) => (
                        <span
                          key={asg.assignment_id}
                          className="inline-flex items-center gap-1 h-5 px-2 rounded bg-slate-100 text-[11px] font-medium text-slate-700"
                        >
                          <Users2 className="h-3 w-3 text-slate-400" />
                          {asg.name}
                          {asg.relative_due_days
                            ? ` · +${asg.relative_due_days}d rolling`
                            : asg.deadline
                              ? ` · Due ${format(new Date(asg.deadline), "d MMM")}`
                              : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: metrics & procedural actions */}
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <ScoreStrip
                    rate={test.pass_rate}
                    completedCount={test.completed_attempts_count || 0}
                    enrolledCount={test.enrolled_count || 0}
                  />

                  <div className="flex items-center gap-1.5">
                    {isArchived ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className={ui.btnQuiet}
                        onClick={() => openRestoreModal(test)}
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-indigo-600" /> Restore
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className={ui.btnQuiet}
                          onClick={() => setEditingTest(test)}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Configure
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className={ui.btnQuiet}
                          disabled={!isPublished || clusters.length === 0}
                          title={
                            !isPublished
                              ? "Publish assessment before assigning to a cluster"
                              : clusters.length === 0
                                ? "Create a cluster first"
                                : "Assign to cluster"
                          }
                          onClick={() => openAssignModal(test)}
                        >
                          <Send className="h-3.5 w-3.5" /> Assign
                        </Button>

                        <RowActionMenu
                          openUpward={index >= filteredTests.length - 2 && filteredTests.length > 2}
                          actions={[
                            canPreview && {
                              label: "Preview candidate view",
                              icon: Play,
                              onClick: () => onLaunchDemo?.(test),
                            },
                            {
                              label: isPublished ? "Revert to draft" : "Publish assessment",
                              icon: isPublished ? AlertTriangle : CheckCircle2,
                              tone: isPublished ? "default" : "success",
                              onClick: () =>
                                statusToggleMutation.mutate({
                                  id: test.id,
                                  nextStatus: isPublished ? "draft" : "published",
                                }),
                            },
                            { divider: true },
                            {
                              label: "Archive assessment",
                              icon: Archive,
                              tone: "danger",
                              onClick: () => setArchiveTarget(test),
                            },
                          ]}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Blueprint Drawer */}
      {editingTest && (
        <EditTestDrawer
          test={editingTest}
          onClose={() => setEditingTest(null)}
        />
      )}

      {/* Create Assessment Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} size="md">
        <Modal.Header onClose={() => setShowCreateModal(false)}>
          <h3 className="text-base font-medium text-slate-900">New assessment blueprint</h3>
          <p className="text-[13px] text-slate-500 mt-1">
            Starts as a draft. Next, configure MCQ category groups or your typing benchmark
          </p>
        </Modal.Header>
        <form onSubmit={handleCreateSubmit} className="flex min-h-0 flex-1 flex-col">
          <Modal.Body className="space-y-4">
            <div>
              <label className={ui.label}>Assessment title</label>
              <input
                type="text"
                required
                value={createForm.title}
                onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                className={ui.input}
                placeholder="e.g., QA Onboarding Assessment"
              />
            </div>

            <div>
              <label className={ui.label}>Description (optional)</label>
              <input
                type="text"
                value={createForm.description}
                onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                className={ui.input}
                placeholder="Candidate instructions or scope summary"
              />
            </div>

            <div>
              <label className={ui.label}>Format</label>
              <div className={`${ui.segment} w-full`}>
                  {[
                    { value: "mcq", label: "MCQ pool", icon: ListChecks },
                    { value: "typing", label: "Typing", icon: Keyboard },
                  ].map(({ value, label, icon: Icon }) => {
                    const active = createForm.test_type === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setCreateForm((p) => ({
                            ...p,
                            test_type: value,
                            passing_score: value === "typing" ? "" : 70,
                          }))
                        }
                        className={`${ui.segmentItem(active)} flex-1 justify-center`}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.5} />
                        {label}
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={ui.label}>Duration (minutes)</label>
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={createForm.duration_minutes}
                  onChange={(e) => setCreateForm((p) => ({ ...p, duration_minutes: e.target.value }))}
                  className={`${ui.input} tabular-nums`}
                />
              </div>
              <div>
                <label className={ui.label}>
                  {createForm.test_type === "typing" ? "Pass % (optional)" : "Pass score %"}
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={createForm.passing_score}
                  placeholder={createForm.test_type === "typing" ? "WPM/Acc" : "70"}
                  onChange={(e) => setCreateForm((p) => ({ ...p, passing_score: e.target.value }))}
                  className={`${ui.input} tabular-nums`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={ui.label}>Max attempts</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={createForm.max_attempts}
                  onChange={(e) => setCreateForm((p) => ({ ...p, max_attempts: e.target.value }))}
                  className={`${ui.input} tabular-nums`}
                />
              </div>
              <div>
                <label className={ui.label}>Max tab switches</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={createForm.max_tab_switches}
                  onChange={(e) => setCreateForm((p) => ({ ...p, max_tab_switches: e.target.value }))}
                  className={`${ui.input} tabular-nums`}
                />
              </div>
            </div>

            <label className={`${ui.inset} flex items-start gap-3 px-3 py-3 cursor-pointer`}>
              <input
                type="checkbox"
                checked={createForm.require_camera}
                onChange={(e) => setCreateForm((p) => ({ ...p, require_camera: e.target.checked }))}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>
                <span className="block text-sm font-medium text-slate-800">Require camera recording</span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  Candidates are recorded in WebM during every attempt
                </span>
              </span>
            </label>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="cancel" size="sm" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={createMutation.isPending}
              loadingText="Creating"
            >
              Create and configure
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Assign Assessment to Cluster Modal */}
      <Modal isOpen={Boolean(assignModalTest)} onClose={() => setAssignModalTest(null)} size="md">
        <Modal.Header onClose={() => setAssignModalTest(null)}>
          <h3 className="text-[16px] font-semibold text-slate-900">Assign assessment</h3>
          <p className="text-[12px] text-slate-500 mt-0.5 truncate">
            {assignModalTest?.title}
          </p>
        </Modal.Header>
        <form onSubmit={handleAssignSubmit} className="flex min-h-0 flex-1 flex-col">
          <Modal.Body className="space-y-4">
            <div>
              <label className={ui.label}>Target cluster</label>
              <Select
                value={assignClusterId}
                onChange={setAssignClusterId}
                ariaLabel="Target cluster"
                className="w-full"
                options={clusters.map((c) => ({
                  value: String(c.id),
                  label: c.name,
                  hint: `${c.member_count || 0} members`,
                }))}
              />
            </div>

            <div className="space-y-2.5">
              <label className={ui.label}>Deadline schedule</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeadlineMode("fixed")}
                  className={`h-9 px-3 rounded-lg border text-[13px] font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    deadlineMode === "fixed"
                      ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5" /> Fixed date
                </button>
                <button
                  type="button"
                  onClick={() => setDeadlineMode("rolling")}
                  className={`h-9 px-3 rounded-lg border text-[13px] font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    deadlineMode === "rolling"
                      ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" /> Rolling days
                </button>
              </div>

              {deadlineMode === "fixed" ? (
                <div>
                  <DatePicker
                    value={deadlineDate}
                    minDate={todayStr}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                    accentColor="indigo"
                  />
                  <p className={ui.hint}>Applies to all current and auto-matched future cohort members.</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={relativeDays}
                      onChange={(e) => setRelativeDays(e.target.value)}
                      className={`${ui.input} w-28 tabular-nums`}
                    />
                    <span className="text-[13px] text-slate-600">days after candidate enrollment</span>
                  </div>
                  <p className={ui.hint}>
                    Ideal for dynamic onboarding cohorts like New Joiners.
                  </p>
                </div>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="cancel" size="sm" onClick={() => setAssignModalTest(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={assignMutation.isPending}
              loadingText="Enrolling..."
            >
              Confirm assignment
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Archive Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => archiveTarget && archiveMutation.mutate(archiveTarget.id)}
        isPending={archiveMutation.isPending}
        variant="danger"
        title="Archive assessment?"
        message={`"${archiveTarget?.title || ""}" will be removed from active assignments and authoring views.`}
        details="Completed historical scores and proctoring logs stay preserved for audit."
        confirmText="Archive assessment"
      />

      {/* Restore Archived Assessment Modal */}
      <Modal
        isOpen={Boolean(restoreTarget)}
        onClose={() => {
          setRestoreTarget(null);
          setRestoreTitle("");
          setRestoreError("");
        }}
        size="md"
      >
        <Modal.Header
          onClose={() => {
            setRestoreTarget(null);
            setRestoreTitle("");
            setRestoreError("");
          }}
        >
          <h3 className="text-base font-semibold text-slate-900">Restore archived assessment</h3>
          <p className="text-[13px] text-slate-500 mt-1">
            Choose how to restore <span className="font-medium text-slate-700">&ldquo;{restoreTarget?.title}&rdquo;</span>.
          </p>
        </Modal.Header>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!restoreTarget || !restoreTitle.trim() || restoreCurrentConflict) return;
            setRestoreError("");
            restoreMutation.mutate({
              id: restoreTarget.id,
              title: restoreTitle.trim(),
              restore_to: restoreTo,
              restore_assignments: restoreTo === "published" ? restoreAssignments : false,
            });
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <Modal.Body className="space-y-4">
            {restoreOriginalConflict && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2.5 text-[13px] text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Title conflict:</span> An active assessment named{" "}
                  <span className="font-semibold">&ldquo;{restoreTarget?.title}&rdquo;</span> already
                  exists. Enter a different unique title below to restore this assessment.
                </div>
              </div>
            )}

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Assessment title
              </label>
              <input
                type="text"
                required
                maxLength={255}
                value={restoreTitle}
                onChange={(e) => {
                  setRestoreTitle(e.target.value);
                  setRestoreError("");
                }}
                placeholder="Enter a unique assessment title"
                className={ui.input}
              />
              {restoreCurrentConflict && (
                <p className="text-[12px] text-rose-600 mt-1.5">
                  An active assessment with this title already exists. Please choose a different title.
                </p>
              )}
              {restoreError && !restoreCurrentConflict && (
                <p className="text-[12px] text-rose-600 mt-1.5">{restoreError}</p>
              )}
            </div>

            <div className="space-y-2.5">
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  restoreTo === "published"
                    ? "border-indigo-300 bg-indigo-50/50"
                    : "border-slate-200 hover:bg-slate-50"
                } ${!getBlueprintMetrics(restoreTarget).ready ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <input
                  type="radio"
                  name="restoreTo"
                  value="published"
                  disabled={!getBlueprintMetrics(restoreTarget).ready}
                  checked={restoreTo === "published"}
                  onChange={() => setRestoreTo("published")}
                  className="mt-1 accent-indigo-600"
                />
                <div className="text-[13px]">
                  <div className="font-medium text-slate-900">Restore &amp; publish</div>
                  <div className="text-slate-500 mt-0.5">
                    Makes the assessment live immediately so clusters can take it.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  restoreTo === "draft"
                    ? "border-indigo-300 bg-indigo-50/50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="restoreTo"
                  value="draft"
                  checked={restoreTo === "draft"}
                  onChange={() => setRestoreTo("draft")}
                  className="mt-1 accent-indigo-600"
                />
                <div className="text-[13px]">
                  <div className="font-medium text-slate-900">Restore as draft</div>
                  <div className="text-slate-500 mt-0.5">
                    Edit questions or settings before publishing; cluster assignments remain inactive.
                  </div>
                </div>
              </label>
            </div>

            {restoreTo === "published" && (
              <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50/70 cursor-pointer text-[13px]">
                <input
                  type="checkbox"
                  checked={restoreAssignments}
                  onChange={(e) => setRestoreAssignments(e.target.checked)}
                  className="mt-0.5 rounded accent-indigo-600"
                />
                <div>
                  <div className="font-medium text-slate-800">
                    Re-activate previous non-expired cluster assignments
                  </div>
                  <div className="text-[12px] text-slate-500 mt-0.5">
                    Restores assignments on active clusters whose deadline has not passed and revives pending candidate enrollments.
                  </div>
                </div>
              </label>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              type="button"
              variant="cancel"
              size="sm"
              onClick={() => {
                setRestoreTarget(null);
                setRestoreTitle("");
                setRestoreError("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!restoreTitle.trim() || restoreCurrentConflict}
              isLoading={restoreMutation.isPending}
              loadingText="Restoring..."
            >
              Restore assessment
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
}
