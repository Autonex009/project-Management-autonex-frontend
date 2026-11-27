import { createPortal } from "react-dom";
import React, { useEffect, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Award,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Film,
  Filter,
  Keyboard,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Users,
  Video,
  X,
  XCircle,
} from "lucide-react";
import { addDays, format } from "date-fns";
import toast from "react-hot-toast";
import { assessmentApi } from "../../services/api";
import { formatDisplayName } from "../../utils/displayName";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import DatePicker from "../ui/DatePicker";
import SearchBar from "../ui/SearchBar";
import LoadingSpinner from "../ui/LoadingSpinner";
import UserAvatar from "../ui/UserAvatar";
import Select from "./Select";
import { plural, rateTone, testTypeMeta, ui } from "./trainingStyles";

const STATUS_BADGE = {
  passed: {
    label: "Passed",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
    iconCls: "text-emerald-600",
  },
  failed: {
    label: "Failed",
    cls: "bg-rose-50 text-rose-700 border-rose-200",
    icon: XCircle,
    iconCls: "text-rose-600",
  },
  in_progress: {
    label: "In progress",
    cls: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: Clock,
    iconCls: "text-indigo-600",
  },
  assigned: {
    label: "Assigned",
    cls: "bg-sky-50 text-sky-700 border-sky-200",
    icon: Clock,
    iconCls: "text-sky-600",
  },
  cancelled: {
    label: "Cancelled",
    cls: "bg-slate-100 text-slate-400 border-slate-200",
    icon: XCircle,
    iconCls: "text-slate-400",
  },
};

function formatDuration(seconds) {
  const s = Math.max(0, Number(seconds || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}m ${rem}s` : `${rem}s`;
}

function formatBytes(bytes) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/**
 * Lazy, cache-surgery-compliant Proctoring Video Audit modal.
 * Only requests a signed playback URL when opened; caches URL in RAM for 25 min (server TTL 30m);
 * DB connection on backend is closed before Supabase HTTP signing, and browser streams directly from CDN/Storage.
 */
function VideoAuditModal({ target, onClose }) {
  const attemptId = target?.attemptId;
  const videoRef = useRef(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["recordingPlayUrl", attemptId],
    queryFn: () => assessmentApi.getRecordingPlayUrl(attemptId),
    enabled: Boolean(attemptId),
    staleTime: 20 * 60 * 1000,
    gcTime: 25 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute("src");
        videoRef.current.load();
      }
    };
  }, [attemptId]);

  const errStatus = error?.response?.status;
  const errDetail = error?.response?.data?.detail;

  return (
    <Modal isOpen={Boolean(target)} onClose={onClose} size="2xl">
      <Modal.Header onClose={onClose}>
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-indigo-600" />
          <h3 className="text-[16px] font-semibold text-slate-900">
            Proctoring video audit
          </h3>
        </div>
        <p className="text-[12px] text-slate-500 mt-0.5" title={target?.candidateName}>
          {formatDisplayName(target?.candidateName)} · {target?.assessmentTitle}
          {target?.attemptNumber ? ` · Attempt #${target.attemptNumber}` : ""}
        </p>
      </Modal.Header>
      <Modal.Body className="space-y-4">
        {isLoading ? (
          <div className="aspect-video rounded-xl bg-slate-950 flex flex-col items-center justify-center text-slate-300">
            <LoadingSpinner size="md" text="Authorizing signed playback stream..." />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center space-y-2">
            <AlertTriangle className="h-7 w-7 text-amber-500 mx-auto" />
            <div className="text-[14px] font-medium text-slate-900">
              {errStatus === 410 ? "Recording expired and purged" : "Video unavailable"}
            </div>
            <p className="text-[13px] text-slate-500 max-w-md mx-auto">
              {errDetail || "Proctoring recordings follow the 7-day automatic retention policy."}
            </p>
          </div>
        ) : data?.play_url ? (
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden bg-black border border-slate-200">
              <video
                ref={videoRef}
                key={data.play_url}
                src={data.play_url}
                controls
                controlsList="nodownload"
                preload="metadata"
                playsInline
                className="w-full max-h-[62vh] bg-black"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-slate-500 tabular-nums">
              <span className="inline-flex items-center gap-1.5">
                <Film className="h-3.5 w-3.5 text-slate-400" />
                Direct signed stream · 30m link TTL
                {data.file_size_bytes ? ` · ${formatBytes(data.file_size_bytes)}` : ""}
              </span>
              {data.expires_at && (
                <span>
                  Retention purge: {format(new Date(data.expires_at), "d MMM yyyy, HH:mm")}
                </span>
              )}
            </div>
          </div>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="cancel" size="sm" onClick={onClose}>
          Close video
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default function ResultsAnalyticsTab({
  assessments = [],
  clusters = [],
  onTotalCountChange,
  toolsSlot,
  // View-only mode for PM / Team Lead: same register, logs and video audit, but no retest,
  // deadline extension or reminder actions (the backend rejects those for non-admin roles anyway).
  readOnly = false,
}) {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assessmentFilter, setAssessmentFilter] = useState("");
  const [clusterFilter, setClusterFilter] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterBtnRef = useRef(null);
  const filterPopRef = useRef(null);

  useEffect(() => {
    if (!filterOpen) return;
    const onPointerDown = (e) => {
      if (
        filterBtnRef.current?.contains(e.target) ||
        filterPopRef.current?.contains(e.target) ||
        e.target.closest?.('[role="listbox"]')
      ) {
        return;
      }
      setFilterOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setFilterOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [filterOpen]);

  // Inspect modals
  const [videoTarget, setVideoTarget] = useState(null);
  const [scorecardEnrollmentId, setScorecardEnrollmentId] = useState(null);
  const [selectedAttemptIdx, setSelectedAttemptIdx] = useState(0);
  const [reviewFilter, setReviewFilter] = useState("all");
  const [openQuestions, setOpenQuestions] = useState(() => new Set());
  const toggleQuestion = (key) =>
    setOpenQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Action modals
  const [retestRow, setRetestRow] = useState(null);
  const [retestReason, setRetestReason] = useState("");
  const [extendRow, setExtendRow] = useState(null);
  const [extendDate, setExtendDate] = useState(format(addDays(new Date(), 3), "yyyy-MM-dd"));
  const [extendReason, setExtendReason] = useState("Approved individual extension");

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 280);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: pageData, isLoading, isFetching } = useQuery({
    queryKey: [
      "adminEnrollments",
      {
        page,
        pageSize,
        search: debouncedSearch,
        status: statusFilter,
        assessmentId: assessmentFilter || undefined,
        clusterId: clusterFilter || undefined,
      },
    ],
    queryFn: () =>
      assessmentApi.getAdminEnrollments({
        page,
        pageSize,
        search: debouncedSearch,
        status: statusFilter,
        assessmentId: assessmentFilter || undefined,
        clusterId: clusterFilter || undefined,
      }),
    placeholderData: keepPreviousData,
    staleTime: 20 * 1000,
  });

  useEffect(() => {
    if (pageData?.summary?.total !== undefined && onTotalCountChange) {
      onTotalCountChange(pageData.summary.total);
    }
  }, [pageData?.summary?.total, onTotalCountChange]);

  const { data: scorecard, isLoading: scorecardLoading } = useQuery({
    queryKey: ["scorecard", scorecardEnrollmentId],
    queryFn: () => assessmentApi.getScorecard(scorecardEnrollmentId),
    enabled: Boolean(scorecardEnrollmentId),
    staleTime: 20 * 1000,
  });

  const patchEnrollmentRowInCache = (updatedRow) => {
    if (!updatedRow) return;
    queryClient.setQueriesData({ queryKey: ["adminEnrollments"] }, (old) => {
      if (!old?.items) return old;
      return {
        ...old,
        items: old.items.map((item) =>
          item.enrollment_id === updatedRow.enrollment_id ? updatedRow : item
        ),
      };
    });
  };

  const retestMutation = useMutation({
    mutationFn: ({ enrollmentId, reason }) => assessmentApi.grantRetest(enrollmentId, reason),
    onSuccess: (res, vars) => {
      patchEnrollmentRowInCache(res?.row);
      queryClient.invalidateQueries({ queryKey: ["scorecard", vars.enrollmentId] });
      toast.success(res?.detail || "Retest granted");
      setRetestRow(null);
      setRetestReason("");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || "Could not grant retest.");
    },
  });

  const extendMutation = useMutation({
    mutationFn: ({ enrollmentId, newDeadline, reason }) =>
      assessmentApi.extendDeadline(enrollmentId, newDeadline, reason),
    onSuccess: (res, vars) => {
      patchEnrollmentRowInCache(res?.row);
      queryClient.invalidateQueries({ queryKey: ["scorecard", vars.enrollmentId] });
      toast.success(res?.detail || "Deadline extended");
      setExtendRow(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || "Could not extend deadline.");
    },
  });

  const reminderMutation = useMutation({
    mutationFn: (payload) => assessmentApi.sendReminders(payload),
    onSuccess: (res) => {
      toast.success(res?.detail || "Reminders dispatched");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || "Failed to dispatch reminders.");
    },
  });

  const rows = pageData?.items || [];
  const summary = pageData?.summary || {};
  const totalItems = pageData?.total_items || 0;
  const totalPages = pageData?.total_pages || Math.max(1, Math.ceil(totalItems / pageSize));
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const activeAttempt =
    scorecard?.attempts?.[selectedAttemptIdx] ||
    scorecard?.attempts?.[scorecard.attempts.length - 1] ||
    null;

  const pendingCount = (summary.assigned || 0) + (summary.in_progress || 0);
  const attemptedCount = summary.attempted ?? ((summary.passed || 0) + (summary.failed || 0));
  const notStartedCount =
    summary.not_started ?? Math.max(0, (summary.total || 0) - attemptedCount - (summary.in_progress || 0));
  const hasFinalResults = (summary.passed || 0) + (summary.failed || 0) > 0;
  const displayedPassRate = hasFinalResults
    ? summary.pass_rate
    : attemptedCount > 0
      ? summary.attempt_pass_rate
      : null;
  const activeDropdownCount = (assessmentFilter ? 1 : 0) + (clusterFilter ? 1 : 0);
  const selectedAssessmentLabel = assessments.find((a) => String(a.id) === String(assessmentFilter))?.title;
  const selectedClusterLabel = clusters.find((c) => String(c.id) === String(clusterFilter))?.name;
  const hasActiveFilters =
    statusFilter !== "all" || Boolean(assessmentFilter) || Boolean(clusterFilter) || Boolean(searchInput);
  const clearFilters = () => {
    setStatusFilter("all");
    setAssessmentFilter("");
    setClusterFilter("");
    setSearchInput("");
    setPage(1);
  };

  const handleBulkRemind = () => {
    const payload = {};
    if (clusterFilter) payload.cluster_id = Number(clusterFilter);
    else if (assessmentFilter) payload.assessment_id = Number(assessmentFilter);
    else payload.send_all_pending = true;
    if (assessmentFilter && clusterFilter) payload.assessment_id = Number(assessmentFilter);
    reminderMutation.mutate(payload);
  };

  return (
    <div className="space-y-4">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Active Enrollments */}
        <div className={`${ui.panel} p-4 flex flex-col justify-between gap-2`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-slate-600">Active enrollments</span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 shrink-0">
              <Users className="h-4 w-4" strokeWidth={1.5} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {summary.total ?? 0}
            </span>
            {attemptedCount > 0 && (summary.total || 0) > 0 && (
              <span className="text-xs font-medium text-indigo-600 tabular-nums">
                {Math.round((attemptedCount / summary.total) * 100)}% sat
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 tabular-nums">
            <span className={attemptedCount > 0 ? "text-indigo-600 font-medium" : "text-slate-600"}>
              {attemptedCount} attempted
            </span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span>{notStartedCount} not started</span>
            {(summary.in_progress || 0) > 0 && (
              <>
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="text-sky-600 font-medium">{summary.in_progress} live</span>
              </>
            )}
          </div>
        </div>

        {/* 2. Pass Rate */}
        <div className={`${ui.panel} p-4 flex flex-col justify-between gap-2`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-slate-600">Pass rate</span>
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                displayedPassRate === null || displayedPassRate === undefined
                  ? "bg-slate-100 text-slate-500"
                  : displayedPassRate >= 70
                    ? "bg-emerald-50 text-emerald-600"
                    : displayedPassRate >= 40
                      ? "bg-amber-50 text-amber-600"
                      : "bg-rose-50 text-rose-600"
              }`}
            >
              <Award className="h-4 w-4" strokeWidth={1.5} />
            </span>
          </div>
          <div className={`text-2xl font-semibold tracking-tight tabular-nums ${rateTone(displayedPassRate)}`}>
            {displayedPassRate !== null && displayedPassRate !== undefined ? `${displayedPassRate}%` : "—"}
          </div>
          <div className="text-xs text-slate-500 tabular-nums">
            {hasFinalResults ? (
              <>
                <span className="text-emerald-600 font-medium">{summary.passed || 0} passed</span>
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="text-rose-600 font-medium">{summary.failed || 0} failed</span>
              </>
            ) : attemptedCount > 0 ? (
              <>
                <span className="text-emerald-600 font-medium">{summary.latest_passed || 0} passed</span>
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="text-rose-600 font-medium">{summary.latest_failed || 0} failed</span>
                <span className="ml-1 text-slate-400">(sittings)</span>
              </>
            ) : (
              <span>No sittings completed yet</span>
            )}
          </div>
        </div>

        {/* 3. Integrity Alerts */}
        <div className={`${ui.panel} p-4 flex flex-col justify-between gap-2`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-slate-600">Integrity alerts</span>
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                (summary.flagged || 0) > 0
                  ? "bg-amber-50 text-amber-600"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <ShieldAlert className="h-4 w-4" strokeWidth={1.5} />
            </span>
          </div>
          <div
            className={`text-2xl font-semibold tracking-tight tabular-nums ${
              (summary.flagged || 0) > 0 ? "text-amber-600" : "text-slate-900"
            }`}
          >
            {summary.flagged ?? 0}
          </div>
          <div className="text-xs text-slate-500">
            {(summary.flagged || 0) > 0
              ? "Tab switches, blurs & camera drops"
              : "No proctoring flags triggered"}
          </div>
        </div>

        {/* 4. Proctoring Videos */}
        <div className={`${ui.panel} p-4 flex flex-col justify-between gap-2`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-slate-600">Proctoring videos</span>
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                (summary.ready_videos || 0) > 0
                  ? "bg-indigo-50 text-indigo-600"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <Video className="h-4 w-4" strokeWidth={1.5} />
            </span>
          </div>
          <div
            className={`text-2xl font-semibold tracking-tight tabular-nums ${
              (summary.ready_videos || 0) > 0 ? "text-indigo-600" : "text-slate-900"
            }`}
          >
            {summary.ready_videos ?? 0}
          </div>
          <div className="text-xs text-slate-500">
            Ready for playback · 7-day retention
          </div>
        </div>
      </div>

      {toolsSlot &&
        !readOnly &&
        createPortal(
            <Button
              variant="outline"
              size="sm"
              className={`${ui.btnQuiet} h-9`}
              disabled={reminderMutation.isPending || pendingCount === 0}
              title={pendingCount === 0 ? "No candidates are waiting to sit" : undefined}
              onClick={handleBulkRemind}
            >
              <Bell className="h-4 w-4" strokeWidth={1.5} /> Remind pending
              {pendingCount > 0 && <span className="tabular-nums text-slate-400">{pendingCount}</span>}
            </Button>,
            toolsSlot
          )}

      {/* Filters & Bulk Actions */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className={`${ui.segment} flex-wrap`} role="tablist" aria-label="Enrollment status">
            {[
              { value: "all", label: "All", count: summary.total },
              { value: "flagged", label: "Flagged", count: summary.flagged },
              { value: "failed", label: "Failed", count: summary.failed },
              { value: "in_progress", label: "In progress", count: summary.in_progress },
              { value: "assigned", label: "Assigned", count: summary.assigned },
              { value: "passed", label: "Passed", count: summary.passed },
            ].map((tab) => {
              const active = statusFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setStatusFilter(tab.value);
                    setPage(1);
                  }}
                  className={`${ui.segmentItem(active)} focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30`}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span
                      className={`text-xs tabular-nums ${
                        active ? "text-indigo-600" : tab.count ? "text-slate-500" : "text-slate-300"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SearchBar
              placeholder="Search candidates"
              value={searchInput}
              onChange={setSearchInput}
              size="sm"
              clearable
              className="w-64 sm:w-72"
            />

            <div className="relative">
              <button
                ref={filterBtnRef}
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                aria-expanded={filterOpen}
                aria-haspopup="dialog"
                className={`h-9 px-3 rounded-lg border text-[13px] font-medium inline-flex items-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 ${
                  filterOpen || activeDropdownCount > 0
                    ? "bg-indigo-50/70 border-indigo-300 text-indigo-700"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <Filter className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span>Filter</span>
                {activeDropdownCount > 0 && (
                  <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-indigo-600 text-white text-[11px] font-semibold tabular-nums">
                    {activeDropdownCount}
                  </span>
                )}
              </button>

              {filterOpen && (
                <div
                  ref={filterPopRef}
                  role="dialog"
                  aria-label="Filter enrollments"
                  className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] space-y-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-slate-900">Filters</span>
                    {activeDropdownCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setAssessmentFilter("");
                          setClusterFilter("");
                          setPage(1);
                        }}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Assessment
                      </label>
                      <Select
                        value={assessmentFilter}
                        onChange={(v) => {
                          setAssessmentFilter(v);
                          setPage(1);
                        }}
                        ariaLabel="Filter by assessment"
                        className="w-full"
                        options={[
                          { value: "", label: "All assessments" },
                          ...assessments.map((a) => ({ value: String(a.id), label: a.title })),
                        ]}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Cluster
                      </label>
                      <Select
                        value={clusterFilter}
                        onChange={(v) => {
                          setClusterFilter(v);
                          setPage(1);
                        }}
                        ariaLabel="Filter by cluster"
                        className="w-full"
                        options={[
                          { value: "", label: "All clusters" },
                          ...clusters.map((c) => ({ value: String(c.id), label: c.name })),
                        ]}
                      />
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={() => setFilterOpen(false)}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="h-9 px-2 inline-flex items-center gap-1 rounded-lg text-[13px] font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
              >
                <X className="h-4 w-4" strokeWidth={1.5} /> Clear
              </button>
            )}
            {isFetching && !isLoading && (
              <span className="text-[12px] text-slate-400">Syncing</span>
            )}
          </div>
        </div>

        {(selectedAssessmentLabel || selectedClusterLabel) && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 mr-0.5">Active filters:</span>
            {selectedAssessmentLabel && (
              <span className="inline-flex items-center gap-1 h-6 pl-2.5 pr-1.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                Assessment: {selectedAssessmentLabel}
                <button
                  type="button"
                  onClick={() => {
                    setAssessmentFilter("");
                    setPage(1);
                  }}
                  className="p-0.5 text-indigo-400 hover:text-indigo-700"
                  aria-label="Clear assessment filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedClusterLabel && (
              <span className="inline-flex items-center gap-1 h-6 pl-2.5 pr-1.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                Cluster: {selectedClusterLabel}
                <button
                  type="button"
                  onClick={() => {
                    setClusterFilter("");
                    setPage(1);
                  }}
                  className="p-0.5 text-indigo-400 hover:text-indigo-700"
                  aria-label="Clear cluster filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Enrollments & Proctoring Register */}
      <div className={`${ui.panel} overflow-hidden`}>
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner size="md" text="Loading progress & logs..." />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <ShieldCheck className="h-8 w-8 text-slate-300 mx-auto mb-2.5" strokeWidth={1.5} />
            <div className={ui.heading}>No matching candidate enrollments</div>
            <p className={`${ui.muted} mt-1`}>
              Assign a published assessment to a cluster or adjust your status/search filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 pl-5 pr-4 whitespace-nowrap">Candidate</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Assessment / Cohort</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Status &amp; Integrity</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Score / Attempts</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Deadline</th>
                  <th className="py-2.5 pl-4 pr-5 text-right w-[1%] whitespace-nowrap">Audit &amp; Video</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {rows.map((row) => {
                  const st = STATUS_BADGE[row.status] || STATUS_BADGE.assigned;
                  const StatusIcon = st.icon;
                  const totalAllowed = Number(row.max_attempts || 1) + Number(row.extra_attempts || 0);
                  const dlDate = row.effective_deadline ? new Date(row.effective_deadline) : null;
                  const now = new Date();
                  const isOverdue =
                    dlDate && dlDate < now && ["assigned", "in_progress"].includes(row.status);
                  const isDueSoon =
                    dlDate &&
                    !isOverdue &&
                    dlDate.getTime() - now.getTime() <= 48 * 60 * 60 * 1000 &&
                    ["assigned", "in_progress"].includes(row.status);
                  const canWatchVideo = Boolean(row.latest_attempt_id && row.recording_status === "ready");
                  const isPurged = row.recording_status === "purged";
                  const tMeta = testTypeMeta(row.test_type);
                  const latestAttempt = row.attempts?.[row.attempts.length - 1];
                  const attemptPassed =
                    row.status === "passed"
                      ? true
                      : row.status === "failed"
                        ? false
                        : (row.latest_attempt_passed ?? latestAttempt?.passed ?? null);
                  const hasAttemptScore = row.best_score !== null && row.best_score !== undefined;
                  const scoreColor =
                    attemptPassed === true
                      ? "text-emerald-600"
                      : attemptPassed === false
                        ? "text-rose-600"
                        : "text-slate-900";

                  return (
                    <tr key={row.enrollment_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 pl-5 pr-4 align-middle min-w-[210px]">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            src={row.employee_avatar_url}
                            name={row.employee_name}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div
                              className="font-medium text-slate-900 truncate max-w-[200px]"
                              title={row.employee_name}
                            >
                              {formatDisplayName(row.employee_name) || row.employee_name}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">
                              {row.employee_designation || row.employee_email || `ID #${row.employee_id}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-2 px-4 align-middle min-w-[210px]">
                        <div className="font-medium text-slate-800">{row.assessment_title}</div>
                        <div className="flex items-center gap-1.5 text-xs mt-0.5">
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${tMeta.dot}`} />
                          <span
                            className={`font-medium ${
                              row.test_type === "typing" ? "text-teal-700" : "text-indigo-600"
                            }`}
                          >
                            {tMeta.label}
                          </span>
                          {row.cluster_name && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="text-slate-600">{row.cluster_name}</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-2 px-4 align-middle min-w-[165px]">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 h-6 px-2 rounded-md text-xs font-medium border ${st.cls}`}
                          >
                            <StatusIcon className={`h-3.5 w-3.5 ${st.iconCls}`} strokeWidth={1.75} />
                            {st.label}
                          </span>
                          {row.is_flagged && (
                            <span
                              className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-amber-50 text-amber-600 border border-amber-200 shrink-0"
                              title={row.flag_reason || "Flagged during proctoring"}
                              aria-label={row.flag_reason || "Flagged during proctoring"}
                            >
                              <ShieldAlert className="h-3.5 w-3.5" strokeWidth={1.75} />
                            </span>
                          )}
                        </div>
                        {row.attempts_used > 0 && (
                          <div className="text-xs mt-0.5 tabular-nums flex items-center gap-1.5">
                            <span
                              className={
                                (row.tab_switch_count || 0) > 0
                                  ? "text-amber-600 font-medium"
                                  : "text-slate-400"
                              }
                            >
                              {row.tab_switch_count} tab switches
                            </span>
                            {row.latest_time_spent_seconds > 0 && (
                              <span className="text-slate-400">
                                · {formatDuration(row.latest_time_spent_seconds)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-2 px-4 align-middle tabular-nums min-w-[160px]">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${hasAttemptScore ? scoreColor : "text-slate-400"}`}>
                            {hasAttemptScore ? `${Number(row.best_score).toFixed(1)}%` : "—"}
                          </span>
                          {row.attempts_used > 0 && attemptPassed !== null && (
                            <span
                              className={`inline-flex items-center gap-1 h-5 px-1.5 rounded text-[11px] font-medium ${
                                attemptPassed
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {attemptPassed ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" strokeWidth={1.75} />
                              ) : (
                                <XCircle className="h-3 w-3 text-rose-600" strokeWidth={1.75} />
                              )}
                              {attemptPassed ? "Pass" : "Fail"}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span>
                            {row.attempts_used} / {totalAllowed} attempts
                            {row.extra_attempts > 0 && (
                              <span className="text-indigo-600 font-medium">
                                {" "}
                                (+{row.extra_attempts} retest)
                              </span>
                            )}
                          </span>
                          {row.latest_attempt_at && (
                            <span className="text-slate-400">
                              · {format(new Date(row.latest_attempt_at), "d MMM yyyy")}
                            </span>
                          )}
                          {row.is_prior_attempt && (
                            <span
                              className="inline-flex items-center h-4 px-1.5 rounded bg-amber-50 text-amber-700 border border-amber-200/80 text-[10px] font-medium"
                              title="This attempt was taken before the current cluster assignment was created"
                            >
                              Prior attempt
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2 px-4 align-middle tabular-nums whitespace-nowrap">
                        {dlDate ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span
                              className={`text-xs ${
                                isOverdue
                                  ? "text-rose-600 font-medium"
                                  : isDueSoon
                                    ? "text-amber-600 font-medium"
                                    : "text-slate-700"
                              }`}
                            >
                              {format(dlDate, "d MMM yyyy, HH:mm")}
                            </span>
                            {isOverdue && (
                              <span className="inline-flex items-center h-5 px-1.5 rounded bg-rose-50 text-rose-700 text-[11px] font-medium">
                                Overdue
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-2 pl-4 pr-5 align-middle w-[1%] whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {canWatchVideo ? (
                            <button
                              type="button"
                              onClick={() =>
                                setVideoTarget({
                                  attemptId: row.latest_attempt_id,
                                  candidateName: row.employee_name,
                                  assessmentTitle: row.assessment_title,
                                  attemptNumber: row.latest_attempt_number,
                                })
                              }
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                              title="View proctoring video"
                              aria-label="View proctoring video"
                            >
                              <Video className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          ) : isPurged ? (
                            <span
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 text-slate-400 border border-slate-200"
                              title="Proctoring recording purged (7-day retention)"
                              aria-label="Proctoring recording purged"
                            >
                              <Film className="h-4 w-4" strokeWidth={1.5} />
                            </span>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAttemptIdx(0);
                              setScorecardEnrollmentId(row.enrollment_id);
                            }}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-white text-slate-600 border border-slate-200 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
                            title="View scorecard & logs"
                            aria-label="View scorecard & logs"
                          >
                            <FileText className="h-4 w-4" strokeWidth={1.5} />
                          </button>

                          {!readOnly && row.status !== "passed" && row.status !== "in_progress" && (
                            <button
                              type="button"
                              onClick={() => {
                                setRetestRow(row);
                                setRetestReason("");
                              }}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Grant retest sitting"
                              aria-label="Grant retest sitting"
                            >
                              <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          )}

                          {!readOnly && ["assigned", "in_progress", "failed"].includes(row.status) && (
                            <button
                              type="button"
                              onClick={() => {
                                setExtendRow(row);
                                setExtendDate(
                                  dlDate
                                    ? format(addDays(dlDate, 3), "yyyy-MM-dd")
                                    : format(addDays(new Date(), 3), "yyyy-MM-dd")
                                );
                                setExtendReason("Approved individual extension");
                              }}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Extend individual deadline"
                              aria-label="Extend individual deadline"
                            >
                              <Calendar className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          )}

                          {!readOnly && ["assigned", "in_progress"].includes(row.status) && (
                            <button
                              type="button"
                              onClick={() =>
                                reminderMutation.mutate({ enrollment_ids: [row.enrollment_id] })
                              }
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Send reminder"
                              aria-label="Send reminder"
                            >
                              <Bell className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[12px] text-slate-500 tabular-nums">
            <span>
              Showing page {pageData?.page || 1} of {totalPages} ({totalItems}{" "}
              {plural(totalItems, "enrollment")})
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Scorecard, Diagnostics, Logs & Lazy Video Modal */}
      <Modal
        isOpen={Boolean(scorecardEnrollmentId)}
        onClose={() => setScorecardEnrollmentId(null)}
        size="4xl"
      >
        <Modal.Header onClose={() => setScorecardEnrollmentId(null)}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-medium text-slate-900" title={scorecard?.employee_name}>
              {formatDisplayName(scorecard?.employee_name) || "Candidate scorecard"}
            </h3>
            {scorecard?.status && (() => {
              const scSt = STATUS_BADGE[scorecard.status] || STATUS_BADGE.assigned;
              const ScIcon = scSt.icon;
              return (
                <span
                  className={`h-5 px-2 rounded-md text-[11px] font-medium border inline-flex items-center gap-1 ${scSt.cls}`}
                >
                  <ScIcon className={`h-3 w-3 ${scSt.iconCls}`} strokeWidth={1.75} />
                  {scSt.label}
                </span>
              );
            })()}
          </div>
          <p className="text-[13px] text-slate-500 mt-1">
            {scorecard?.assessment_title}
            {scorecard?.cluster_name ? ` · ${scorecard.cluster_name}` : ""}
            {scorecard?.best_score !== null && scorecard?.best_score !== undefined
              ? ` · Best score: ${scorecard.best_score}%`
              : ""}
            {scorecard?.passing_score !== null && scorecard?.passing_score !== undefined
              ? ` (Pass: ${scorecard.passing_score}%)`
              : ""}
          </p>
        </Modal.Header>

        <Modal.Body className="space-y-5">
          {scorecardLoading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner size="md" text="Loading audit diagnostics" />
            </div>
          ) : !scorecard?.attempts?.length ? (
            <div className="py-10 text-center text-[13px] text-slate-500">
              No attempts have been started for this enrollment yet.
            </div>
          ) : (
            <>
              {/* Attempt Selector Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className={ui.segment} role="tablist" aria-label="Attempts">
                  {scorecard.attempts.map((att, idx) => {
                    const isActive = activeAttempt?.id === att.id;
                    const dot =
                      att.passed === true
                        ? "bg-emerald-500"
                        : att.passed === false
                          ? "bg-rose-500"
                          : "bg-slate-300";
                    return (
                      <button
                        key={att.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setSelectedAttemptIdx(idx)}
                        className={ui.segmentItem(isActive)}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
                        Attempt {att.attempt_number}
                        {att.score !== null && att.score !== undefined && (
                          <span className="text-xs tabular-nums text-slate-500">{att.score}%</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {activeAttempt?.recording_status === "ready" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-[12px] font-medium text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
                    onClick={() =>
                      setVideoTarget({
                        attemptId: activeAttempt.id,
                        candidateName: scorecard.employee_name,
                        assessmentTitle: scorecard.assessment_title,
                        attemptNumber: activeAttempt.attempt_number,
                      })
                    }
                  >
                    <Video className="h-3.5 w-3.5 mr-1.5" /> View attempt video
                  </Button>
                )}
              </div>

              {activeAttempt && (
                <div className="space-y-5">
                  {activeAttempt.is_flagged && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 flex items-start gap-2.5">
                      <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium">Integrity flag: </span>
                        <span className="font-mono text-[12px]">
                          {activeAttempt.flag_reason || "Proctoring threshold exceeded"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Telemetry summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
                    {[
                      {
                        label: "Result",
                        value:
                          activeAttempt.passed === true
                            ? "Passed"
                            : activeAttempt.passed === false
                              ? "Failed"
                              : activeAttempt.status === "abandoned"
                                ? "Timed out"
                                : "In progress",
                        cls:
                          activeAttempt.passed === true
                            ? "text-emerald-600"
                            : activeAttempt.passed === false
                              ? "text-rose-600"
                              : "text-indigo-600",
                        sub: (() => {
                          const ts = activeAttempt.submitted_at || activeAttempt.started_at;
                          const dateStr = ts ? format(new Date(ts), "d MMM yyyy, HH:mm") : null;
                          const isPrior = Boolean(
                            ts &&
                              scorecard.assignment_created_at &&
                              new Date(activeAttempt.started_at || ts) <
                                new Date(scorecard.assignment_created_at)
                          );
                          const statusNote = activeAttempt.status === "abandoned" ? "Auto-submitted" : null;
                          const parts = [statusNote, dateStr, isPrior ? "Prior attempt" : null].filter(Boolean);
                          return parts.length > 0 ? parts.join(" · ") : null;
                        })(),
                      },
                      {
                        label: "Score",
                        value:
                          activeAttempt.score !== null && activeAttempt.score !== undefined
                            ? `${activeAttempt.score}%`
                            : "Pending",
                        cls:
                          activeAttempt.passed === true
                            ? "text-emerald-600"
                            : activeAttempt.passed === false
                              ? "text-rose-600"
                              : "text-slate-900",
                      },
                      { label: "Time spent", value: formatDuration(activeAttempt.time_spent_seconds), cls: "text-slate-900" },
                      {
                        label: "Tab switches",
                        value: String(activeAttempt.tab_switch_count || 0),
                        cls: (activeAttempt.tab_switch_count || 0) > 0 ? "text-amber-600" : "text-slate-900",
                      },
                      { label: "Window blurs", value: String(activeAttempt.window_blur_count || 0), cls: "text-slate-900" },
                      {
                        label: "Proctoring video",
                        value: (() => {
                          const raw = activeAttempt.recording_status || (activeAttempt.camera_verified ? "verified" : "none");
                          const txt = String(raw).replace(/_/g, " ");
                          return txt.charAt(0).toUpperCase() + txt.slice(1);
                        })(),
                        cls: activeAttempt.recording_status === "ready" ? "text-indigo-600" : "text-slate-900",
                      },
                    ].map((t) => (
                      <div key={t.label} className="bg-white px-4 py-3">
                        <div className="text-xs text-slate-500">{t.label}</div>
                        <div className={`mt-1 text-[15px] font-medium tabular-nums leading-6 ${t.cls}`}>{t.value}</div>
                        {t.sub && <div className="text-xs text-slate-500">{t.sub}</div>}
                      </div>
                    ))}
                  </div>

                  {/* Typing Diagnostics */}
                  {activeAttempt.result_summary?.net_wpm !== undefined && (
                    <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-[14px] font-semibold text-slate-900">
                        <Keyboard className="h-4 w-4 text-teal-600" /> Typing performance diagnostics
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[13px] tabular-nums">
                        <div>
                          <div className="text-[11px] text-slate-500">Net / Gross WPM</div>
                          <div className="font-semibold text-slate-900">
                            {activeAttempt.result_summary.net_wpm} / {activeAttempt.result_summary.gross_wpm ?? activeAttempt.result_summary.net_wpm} (target {activeAttempt.result_summary.target_wpm})
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-500">Accuracy</div>
                          <div className="font-semibold text-slate-900">
                            {activeAttempt.result_summary.accuracy_percent}% (min {activeAttempt.result_summary.min_accuracy_percent}%)
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-500">Words matched</div>
                          <div className="font-semibold text-slate-900">
                            {activeAttempt.result_summary.correct_words ?? 0} / {activeAttempt.result_summary.total_words_typed ?? 0}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-500">Integrity check</div>
                          <div
                            className={`font-semibold ${
                              activeAttempt.result_summary.is_flagged ? "text-rose-600" : "text-emerald-700"
                            }`}
                          >
                            {activeAttempt.result_summary.is_flagged ? "Keystroke anomaly" : "Clean typing"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MCQ Category Breakdown (dict keyed by category_id or legacy array) */}
                  {activeAttempt.result_summary?.category_breakdown &&
                    (() => {
                      const rawBreakdown = activeAttempt.result_summary.category_breakdown;
                      const catList = Array.isArray(rawBreakdown)
                        ? rawBreakdown
                        : Object.entries(rawBreakdown).map(([cid, stats]) => ({
                            category_id: cid,
                            ...stats,
                          }));
                      if (catList.length === 0) return null;
                      return (
                        <div className="space-y-2.5">
                          <h4 className="text-sm font-medium text-slate-900">Category breakdown</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {catList.map((cat) => (
                              <div
                                key={cat.category_id || cat.category_name || cat.name}
                                className="rounded-lg border border-slate-200 px-3.5 py-3 space-y-2"
                              >
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-800">{cat.category_name || cat.name}</span>
                                  <span className="text-slate-500 tabular-nums">
                                    <span className="font-medium text-slate-900">
                                      {cat.score ?? cat.correct_count}/{cat.max_score ?? cat.total_questions}
                                    </span>
                                    <span className="mx-1.5 text-slate-300">/</span>
                                    {cat.accuracy_percent ?? 0}%
                                  </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-indigo-500"
                                    style={{ width: `${Math.max(0, Math.min(100, Number(cat.accuracy_percent) || 0))}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                  {/* Item-level Question Review (Evaluators Only) */}
                  {Array.isArray(activeAttempt.result_summary?.item_diagnostics) &&
                    activeAttempt.result_summary.item_diagnostics.length > 0 &&
                    (() => {
                      const items = activeAttempt.result_summary.item_diagnostics.map((item, idx) => {
                        const chosenIdx = item.user_choice ?? item.selected_index;
                        const answered = chosenIdx !== null && chosenIdx !== undefined;
                        return { item, idx, chosenIdx, answered, kind: item.is_correct ? "correct" : answered ? "wrong" : "skipped" };
                      });
                      const tally = {
                        all: items.length,
                        wrong: items.filter((i) => i.kind === "wrong").length,
                        skipped: items.filter((i) => i.kind === "skipped").length,
                        correct: items.filter((i) => i.kind === "correct").length,
                      };
                      const visible = reviewFilter === "all" ? items : items.filter((i) => i.kind === reviewFilter);
                      return (
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4 className="text-sm font-medium text-slate-900">Question response review</h4>
                            <div className={ui.segment} role="tablist" aria-label="Filter responses">
                              {[
                                { key: "all", label: "All" },
                                { key: "wrong", label: "Incorrect" },
                                { key: "skipped", label: "Unanswered" },
                                { key: "correct", label: "Correct" },
                              ].map((f) => (
                                <button
                                  key={f.key}
                                  type="button"
                                  role="tab"
                                  aria-selected={reviewFilter === f.key}
                                  onClick={() => setReviewFilter(f.key)}
                                  className={ui.segmentItem(reviewFilter === f.key)}
                                >
                                  {f.label}
                                  <span className={ui.segmentCount(reviewFilter === f.key)}>{tally[f.key]}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {visible.length === 0 ? (
                            <p className={ui.muted}>No responses in this group.</p>
                          ) : (
                            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                              {visible.map(({ item, idx, chosenIdx, answered, kind }) => {
                                const rowKey = `${activeAttempt.id}:${item.question_id || idx}`;
                                const open = openQuestions.has(rowKey);
                                const options = Array.isArray(item.options) ? item.options : [];
                                const panelId = `qr-${rowKey}`;
                                return (
                                  <div key={rowKey}>
                                    <button
                                      type="button"
                                      aria-expanded={open}
                                      aria-controls={panelId}
                                      onClick={() => toggleQuestion(rowKey)}
                                      className="w-full px-4 h-12 flex items-center gap-3 text-left hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500/30 transition-colors"
                                    >
                                      {kind === "correct" ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" strokeWidth={1.5} />
                                      ) : kind === "wrong" ? (
                                        <XCircle className="h-4 w-4 text-rose-500 shrink-0" strokeWidth={1.5} />
                                      ) : (
                                        <span className="h-4 w-4 shrink-0 rounded-full border border-dashed border-slate-300" />
                                      )}
                                      <span className="w-8 shrink-0 text-xs tabular-nums text-slate-500">Q{idx + 1}</span>
                                      <span className="min-w-0 flex-1 truncate text-sm text-slate-900">
                                        {item.question || (
                                          <span className="font-mono text-[13px] text-slate-500">{item.question_id}</span>
                                        )}
                                      </span>
                                      {item.category_name && (
                                        <span className="hidden sm:inline shrink-0 text-xs text-slate-500">
                                          {item.category_name}
                                        </span>
                                      )}
                                      <span className="w-16 shrink-0 text-right text-xs tabular-nums text-slate-500">
                                        {item.marks ?? 0} {Number(item.marks ?? 0) === 1 ? "mark" : "marks"}
                                      </span>
                                      <ChevronDown
                                        className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
                                        strokeWidth={1.5}
                                      />
                                    </button>

                                    {open && (
                                      <div id={panelId} className="border-t border-slate-100 bg-slate-50/60 px-4 py-4 pl-[60px]">
                                        {item.question && (
                                          <p className="text-sm leading-relaxed text-slate-900">{item.question}</p>
                                        )}

                                        {options.length > 0 ? (
                                          <ul className="mt-3 space-y-1.5">
                                            {options.map((opt, oi) => {
                                              const isCorrect = oi === Number(item.correct_index);
                                              const isChosen = answered && oi === Number(chosenIdx);
                                              const tone = isCorrect
                                                ? "border-emerald-200 bg-emerald-50"
                                                : isChosen
                                                  ? "border-rose-200 bg-rose-50"
                                                  : "border-slate-200 bg-white";
                                              return (
                                                <li
                                                  key={oi}
                                                  className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm ${tone}`}
                                                >
                                                  <span className="mt-px w-4 shrink-0 text-xs font-medium tabular-nums text-slate-500">
                                                    {String.fromCharCode(65 + oi)}
                                                  </span>
                                                  <span className={`min-w-0 flex-1 ${isCorrect || isChosen ? "text-slate-900" : "text-slate-600"}`}>
                                                    {opt}
                                                  </span>
                                                  {(isChosen || isCorrect) && (
                                                    <span
                                                      className={`shrink-0 text-xs font-medium ${isCorrect ? "text-emerald-700" : "text-rose-700"}`}
                                                    >
                                                      {isChosen && isCorrect
                                                        ? "Selected, correct"
                                                        : isCorrect
                                                          ? "Correct answer"
                                                          : "Selected"}
                                                    </span>
                                                  )}
                                                </li>
                                              );
                                            })}
                                          </ul>
                                        ) : (
                                          <p className="mt-2 text-[13px] text-slate-500">
                                            Question text was not saved for this attempt.
                                            {answered ? ` Selected option ${Number(chosenIdx) + 1}` : " Not answered"}
                                            {item.correct_index !== null && item.correct_index !== undefined
                                              ? `, correct option ${Number(item.correct_index) + 1}.`
                                              : "."}
                                          </p>
                                        )}

                                        {!answered && options.length > 0 && (
                                          <p className="mt-2 text-xs text-slate-500">Not answered</p>
                                        )}
                                        {item.explanation && (
                                          <p className="mt-3 text-[13px] leading-relaxed text-slate-600">{item.explanation}</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                  {/* Chronological Proctoring Event Logs */}
                  <div className="space-y-2.5">
                    <h4 className="text-sm font-medium text-slate-900">
                      Proctoring and event timeline <span className="text-slate-500 font-normal tabular-nums">{activeAttempt.logs?.length || 0}</span>
                    </h4>
                    {!activeAttempt.logs?.length ? (
                      <p className={ui.muted}>No anomalies or violation events recorded during this attempt.</p>
                    ) : (
                      <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                        {activeAttempt.logs.map((log) => (
                          <div
                            key={log.id}
                            className="px-3.5 py-2 flex items-center justify-between gap-3 text-[12px]"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                {log.event_type}
                              </span>
                              {log.details && Object.keys(log.details).length > 0 && (
                                <span className="text-slate-500 truncate">
                                  {JSON.stringify(log.details)}
                                </span>
                              )}
                            </div>
                            <span className="text-slate-400 tabular-nums shrink-0">
                              {log.event_time ? format(new Date(log.event_time), "d MMM HH:mm:ss") : "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="cancel" size="sm" onClick={() => setScorecardEnrollmentId(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Lazy Cached Video Player Modal */}
      {videoTarget && (
        <VideoAuditModal target={videoTarget} onClose={() => setVideoTarget(null)} />
      )}

      {/* Grant Retest Modal */}
      <Modal isOpen={Boolean(retestRow)} onClose={() => setRetestRow(null)} size="sm">
        <Modal.Header onClose={() => setRetestRow(null)}>
          <h3 className="text-[15px] font-semibold text-slate-900">Grant retest sitting</h3>
          <p className="text-[12px] text-slate-500 mt-0.5" title={retestRow?.employee_name}>
            {formatDisplayName(retestRow?.employee_name)} · {retestRow?.assessment_title}
          </p>
        </Modal.Header>
        <Modal.Body className="space-y-3">
          <div>
            <label className={ui.label}>Audit reason (required)</label>
            <textarea
              rows={3}
              value={retestReason}
              onChange={(e) => setRetestReason(e.target.value)}
              className={ui.textarea}
              placeholder="e.g., Network drop or verified webcam issue during sitting #1"
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="cancel" size="sm" onClick={() => setRetestRow(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={retestMutation.isPending}
            loadingText="Granting..."
            onClick={() => {
              if (!retestReason.trim()) {
                toast.error("Please provide a reason for the audit log.");
                return;
              }
              retestMutation.mutate({
                enrollmentId: retestRow.enrollment_id,
                reason: retestReason.trim(),
              });
            }}
          >
            Confirm retest
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Extend Candidate Deadline Modal */}
      <Modal isOpen={Boolean(extendRow)} onClose={() => setExtendRow(null)} size="sm">
        <Modal.Header onClose={() => setExtendRow(null)}>
          <h3 className="text-[15px] font-semibold text-slate-900">Extend individual deadline</h3>
          <p className="text-[12px] text-slate-500 mt-0.5" title={extendRow?.employee_name}>
            {formatDisplayName(extendRow?.employee_name)} · {extendRow?.assessment_title}
          </p>
        </Modal.Header>
        <Modal.Body className="space-y-3">
          <div>
            <label className={ui.label}>New deadline date</label>
            <DatePicker
              value={extendDate}
              minDate={todayStr}
              onChange={(e) => setExtendDate(e.target.value)}
              accentColor="indigo"
            />
          </div>
          <div>
            <label className={ui.label}>Reason</label>
            <input
              type="text"
              value={extendReason}
              onChange={(e) => setExtendReason(e.target.value)}
              className={ui.input}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="cancel" size="sm" onClick={() => setExtendRow(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={extendMutation.isPending}
            loadingText="Saving..."
            onClick={() => {
              const dl = new Date(`${extendDate}T23:59:59`);
              if (dl <= new Date()) {
                toast.error("New deadline must be in the future.");
                return;
              }
              extendMutation.mutate({
                enrollmentId: extendRow.enrollment_id,
                newDeadline: dl.toISOString(),
                reason: extendReason.trim() || "Approved individual extension",
              });
            }}
          >
            Save extension
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
