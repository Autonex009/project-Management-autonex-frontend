import React, { useState, useMemo } from "react";
import { CheckCircle, XCircle, Search, UserPlus, Zap, Users, RotateCcw, X, CheckCircle2, HelpCircle, ShieldCheck, Layers, Sparkles, Clock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PipelineCalendar from "../../components/PipelineCalendar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import UserAvatar from "../../components/ui/UserAvatar";
import { formatDisplayName } from "../../utils/displayName";
import toast from "react-hot-toast";
import Dropdown from "../../components/ui/Dropdown";
import Button from "../../components/ui/Button";

// ── Pool Sidebar ──────────────────────────────────────────────────────────────
function PoolSidebar({
  candidates, selectedIds, onToggle,
  searchQuery, onSearchChange,
  tlBuddies, tlProjects, selectedBuddy, selectedProject,
  onBuddyChange, onProjectChange, onAssign, isAssigning,
  buddyOptions,
}) {
  const selectedInPool = candidates.filter(c => selectedIds.includes(c.userId));
  const allSelected = candidates.length > 0 && candidates.every(c => selectedIds.includes(c.userId));

  return (
    <div className="w-[310px] shrink-0 flex flex-col border border-slate-200/80 rounded-2xl bg-white shadow-xs overflow-hidden h-full">

      {/* Header */}
      <div className="px-3.5 py-3 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Unassigned Pool</h3>
              <p className="text-[11px] text-slate-500">Candidates awaiting assignment</p>
            </div>
          </div>
          <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            {candidates.length}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-slate-100 shrink-0 bg-white">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search candidates…"
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-500 outline-none bg-slate-50/50 hover:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Select all + Top 10 */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 shrink-0 bg-slate-50/60 text-xs">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={e => {
              const ids = candidates.map(c => c.userId);
              ids.forEach(id => {
                const already = selectedIds.includes(id);
                if (e.target.checked && !already) onToggle(id);
                else if (!e.target.checked && already) onToggle(id);
              });
            }}
            className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300 cursor-pointer"
          />
          <span className="text-[11px] font-bold text-slate-600">
            Select all {selectedInPool.length > 0 && <span className="text-indigo-600 font-extrabold">({selectedInPool.length})</span>}
          </span>
        </label>

        {/* Top 10 */}
        {candidates.length > 0 && (() => {
          const top10 = candidates.slice(0, 10);
          const top10Ids = top10.map(c => c.userId);
          const isExactlyTop10 =
            top10Ids.length > 0 &&
            top10Ids.every(id => selectedIds.includes(id)) &&
            selectedIds.length === top10Ids.length;
          const onlyTop10Involved = selectedIds.every(id => top10Ids.includes(id));
          const someTop10Selected = top10Ids.some(id => selectedIds.includes(id));
          const allTop10Selected = top10Ids.every(id => selectedIds.includes(id));
          const showIndeterminate = onlyTop10Involved && someTop10Selected && !allTop10Selected;

          return (
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isExactlyTop10}
                ref={el => {
                  if (el) el.indeterminate = showIndeterminate;
                }}
                onChange={e => {
                  if (e.target.checked) {
                    selectedIds.forEach(id => {
                      if (!top10Ids.includes(id)) onToggle(id);
                    });
                    top10Ids.forEach(id => {
                      if (!selectedIds.includes(id)) onToggle(id);
                    });
                  } else {
                    top10Ids.forEach(id => {
                      if (selectedIds.includes(id)) onToggle(id);
                    });
                  }
                }}
                className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300 cursor-pointer"
              />
              <span className="text-[11px] font-bold text-indigo-600">
                Top 10
              </span>
            </label>
          );
        })()}
      </div>

      {/* Candidate list */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1">
        {candidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Users className="w-8 h-8 mb-2 opacity-30" />
            <div className="text-xs font-semibold">No candidates in pool</div>
          </div>
        ) : (
          candidates.map(c => {
            const isSelected = selectedIds.includes(c.userId);
            return (
              <button
                key={c.userId}
                onClick={() => onToggle(c.userId)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer ${
                  isSelected
                    ? "bg-indigo-50/80 border border-indigo-200 shadow-xs"
                    : "hover:bg-slate-50 border border-transparent"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  readOnly
                  className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300 pointer-events-none shrink-0"
                />
                <UserAvatar name={c.name} className="w-7 h-7 text-[10px] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-bold truncate ${isSelected ? "text-indigo-900" : "text-slate-800"}`}>
                    {formatDisplayName(c.name)}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {c.approvedAt
                      ? `Approved ${new Date(c.approvedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                      : "Pending approval"}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Assign Footer */}
      <div className="shrink-0 border-t border-slate-200/80 bg-slate-50/60 p-3 space-y-2">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Assign to Pipeline
        </div>
        <Dropdown
          options={buddyOptions || (tlBuddies || []).map(emp => ({ value: String(emp.id), label: `${emp.name} (${emp.roleTag || 'TL'})` }))}
          value={selectedBuddy ? String(selectedBuddy) : ""}
          onChange={val => onBuddyChange(val)}
          placeholder="Select Buddy (Team Lead / PM)…"
          searchable={true}
          searchPlaceholder="Search buddy..."
          placement="auto"
          className="w-full text-xs"
        />
        <Dropdown
          options={tlProjects.map(p => ({ value: String(p.id), label: p.name }))}
          value={selectedProject ? String(selectedProject) : ""}
          onChange={val => onProjectChange(val)}
          placeholder={selectedBuddy ? "Select Project…" : "Pick buddy first"}
          disabled={!selectedBuddy}
          searchable={true}
          searchPlaceholder="Search project..."
          placement="auto"
          className="w-full text-xs"
        />
        <Button
          variant="primary"
          onClick={onAssign}
          disabled={selectedInPool.length === 0 || !selectedBuddy || !selectedProject || isAssigning}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2 shadow-xs"
        >
          {isAssigning ? "Assigning…" : (
            <>
              <Zap className="w-3.5 h-3.5" />
              Start Pipeline {selectedInPool.length > 0 ? `(${selectedInPool.length})` : ""}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const OnboardingPipelinePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedTimelineCandidate, setSelectedTimelineCandidate] = useState(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [poolSearch, setPoolSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedBuddy, setSelectedBuddy] = useState("");
  const [evalScore, setEvalScore] = useState(95);
  const [evalNotes, setEvalNotes] = useState("Candidate did great!");

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: pipeline = [], refetch: refetchPipeline } = useQuery({
    queryKey: ["onboarding_pipeline"],
    queryFn: async () => { const res = await api.get("/onboarding/pipeline"); return res.data; }
  });
  const { data: poolCandidates = [], refetch: refetchPool } = useQuery({
    queryKey: ["onboarding_newly_onboarded"],
    queryFn: async () => { const res = await api.get("/onboarding/newly-onboarded"); return res.data; }
  });
  const { data: allEmployees = [] } = useQuery({
    queryKey: ["employees-all"],
    queryFn: async () => { const res = await api.get("/employees"); return res.data; }
  });
  const { data: tlProjects = [] } = useQuery({
    queryKey: ["tl_projects", selectedBuddy],
    queryFn: async () => {
      if (!selectedBuddy) return [];
      const res = await api.get(`/employees/${selectedBuddy}/active-projects`);
      return res.data;
    },
    enabled: !!selectedBuddy,
    staleTime: 60 * 1000
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const assignMutation = useMutation({
    mutationFn: async (payload) => { const res = await api.post("/onboarding/pipeline/bulk-assign", payload); return res.data; },
    onSuccess: () => {
      toast.success("Pipeline Started!");
      queryClient.invalidateQueries(["onboarding_pipeline"]);
      queryClient.invalidateQueries(["onboarding_newly_onboarded"]);
      queryClient.invalidateQueries(["allocations"]);
      queryClient.invalidateQueries(["allocations-page"]);
      setSelectedCandidateIds([]);
      setSelectedBuddy("");
      setSelectedProject("");
    }
  });
  const evaluateMutation = useMutation({
    mutationFn: async ({ id, payload }) => { const res = await api.post(`/onboarding/pipeline/${id}/evaluate`, payload); return res.data; },
    onSuccess: () => {
      toast.success("Evaluation submitted successfully!");
      queryClient.invalidateQueries(["onboarding_pipeline"]);
      queryClient.invalidateQueries(["onboarding_newly_onboarded"]);
      queryClient.invalidateQueries(["allocations"]);
      queryClient.invalidateQueries(["allocations-page"]);
      setIsEvalModalOpen(false);
    }
  });

  // ── Derived ────────────────────────────────────────────────────────────────
  const pipelineInProgress = pipeline.filter(p => ["pending_confirmation", "in_progress", "day_5_pending"].includes(p.status));
  const pipelineHistory = pipeline.filter(p => ["passed", "failed"].includes(p.status));

  // Only filter out candidates who are currently in an active pipeline so idle / completed candidates can be reassigned
  const activePipelineCandidateIds = new Set(pipelineInProgress.map(p => p.candidate_id));
  const pool = poolCandidates.filter(c => !activePipelineCandidateIds.has(c.userId));

  const filteredPool = pool.filter(c => !poolSearch || c.name?.toLowerCase().includes(poolSearch.toLowerCase()));

  // Calendar only gets active pipeline + history — NO pool candidates
  const calendarPipelines = [
    ...pipelineInProgress.map(p => ({
      id: `pipe-${p.id}`,
      candidateName: p.candidate_name,
      project: p.sub_project_name || p.project_name,
      buddy: p.buddy_name,
      status: p.status,
      daysElapsed: p.days_elapsed || 0,
      startedAt: p.started_at,
      assignedAt: p.created_at || p.approved_at,
      expectedEvalDate: p.expected_eval_date,
      evaluatedAt: p.evaluated_at,
      rawPipeline: p,
    })),
    ...pipelineHistory.map(p => ({
      id: `hist-${p.id}`,
      candidateName: p.candidate_name,
      project: p.sub_project_name || p.project_name,
      buddy: p.buddy_name,
      status: p.status,
      startedAt: p.started_at,
      assignedAt: p.created_at || p.approved_at,
      expectedEvalDate: p.expected_eval_date,
      evaluatedAt: p.evaluated_at,
      rawPipeline: p,
    })),
  ];

  // Memoized TL + PM buddy roster — avoids re-filtering on every keystroke
  const buddies = useMemo(() => {
    return allEmployees
      .filter(emp => {
        if (emp.status === "archived") return false;
        const d = (emp.designation || "").trim().toLowerCase();
        return (
          d === "team lead" ||
          d === "program manager" ||
          d === "project manager" ||
          d === "pm" ||
          d === "tl"
        );
      })
      .map(emp => {
        const d = (emp.designation || "").toLowerCase();
        const isPM = d.includes("manager") || d.includes("pm");
        return {
          id: emp.id,
          name: emp.name,
          roleTag: isPM ? "PM" : "TL",
        };
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [allEmployees]);

  const buddyDropdownOptions = useMemo(() => {
    return buddies.map(b => ({
      value: String(b.id),
      label: `${b.name} (${b.roleTag})`,
    }));
  }, [buddies]);

  // Backward compatible alias for any child references
  const tlBuddies = buddies;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const toggleCandidateSelection = (id) =>
    setSelectedCandidateIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleAssign = () => {
    assignMutation.mutate({
      candidate_ids: selectedCandidateIds,
      sub_project_id: parseInt(selectedProject),
      buddy_id: parseInt(selectedBuddy),
      escalation_days: 5
    });
  };

  const openEvalModal = (p) => {
    setSelectedCandidate(p);
    setIsEvalModalOpen(true);
    setEvalScore(95);
    setEvalNotes("Candidate did great!");
  };

  const handleEval = (status) => {
    evaluateMutation.mutate({
      id: selectedCandidate.id,
      payload: { score: evalScore, notes: evalNotes, result: status }
    });
  };

  const handleRefresh = () => {
    refetchPipeline();
    refetchPool();
  };

  // Helper for timeline candidate normalization
  const rawTimeline = selectedTimelineCandidate ? {
    ...(selectedTimelineCandidate.rawPipeline || {}),
    ...(selectedTimelineCandidate.raw || {}),
    ...selectedTimelineCandidate,
  } : null;

  return (
    <div className="space-y-3 flex flex-col h-[calc(100vh-100px)] min-h-[580px]">

      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Onboarding Pipeline</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {pipelineInProgress.length} In Training
            </span>
            <button
              type="button"
              onClick={() => setIsHowItWorksOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100 hover:text-indigo-800 border border-indigo-200 transition-all cursor-pointer shadow-2xs"
              title="Click to view How Onboarding Pipeline Works & Production Safeguards"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span>How Onboarding Works</span>
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Track 5-day training milestones, assign buddies & projects, and review Day-5 evaluations
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* Split layout: pool sidebar + calendar */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* Pool Sidebar */}
        <PoolSidebar
          candidates={filteredPool}
          selectedIds={selectedCandidateIds}
          onToggle={toggleCandidateSelection}
          searchQuery={poolSearch}
          onSearchChange={setPoolSearch}
          buddyOptions={buddyDropdownOptions}
          tlBuddies={tlBuddies}
          tlProjects={tlProjects}
          selectedBuddy={selectedBuddy}
          selectedProject={selectedProject}
          onBuddyChange={(val) => { setSelectedBuddy(val); setSelectedProject(""); }}
          onProjectChange={setSelectedProject}
          onAssign={handleAssign}
          isAssigning={assignMutation.isLoading}
        />

        {/* Calendar */}
        <div className="flex-1 min-w-0 border border-slate-200/80 rounded-2xl shadow-xs bg-white overflow-hidden">
          <PipelineCalendar
            pipelines={calendarPipelines}
            onViewTimeline={(candidate) => { setSelectedTimelineCandidate(candidate); setIsTimelineModalOpen(true); }}
            onEvaluate={openEvalModal}
            trainingCount={pipelineInProgress.length}
            historyCount={pipelineHistory.length}
          />
        </div>
      </div>

      {/* ── Timeline Modal ─────────────────────────────────────────────── */}
      {isTimelineModalOpen && rawTimeline && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsTimelineModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-6 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  Candidate Stepper
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Onboarding Timeline · {formatDisplayName(rawTimeline.candidate_name || rawTimeline.candidateName)}
                </h3>
              </div>
              <button
                onClick={() => setIsTimelineModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative flex justify-between items-start w-full px-4 md:px-8 mt-10">
              <div className="absolute top-6 left-[10%] right-[10%] h-0.5 bg-slate-200 z-0" />
              {(() => {
                const assignedDate = rawTimeline.assignedAt || rawTimeline.created_at || rawTimeline.approved_at;
                const acceptedDate = rawTimeline.startedAt || rawTimeline.started_at;
                const evalDueDate = rawTimeline.expectedEvalDate || rawTimeline.expected_eval_date || rawTimeline.evaluatedAt || rawTimeline.evaluated_at;
                const outcomeDate = rawTimeline.evaluatedAt || rawTimeline.evaluated_at;
                const status = rawTimeline.status;

                const isAssignedDone = !!assignedDate;
                const isAcceptedDone = !!acceptedDate || ["in_progress", "day_5_pending", "passed", "failed"].includes(status);
                const isEvalDone = !!outcomeDate || ["passed", "failed"].includes(status);
                const isOutcomeDone = !!outcomeDate && ["passed", "failed"].includes(status);

                const steps = [
                  { label: "Assigned", date: assignedDate, desc: "Mentor & project assigned by HR", done: isAssignedDone, color: "bg-indigo-50 border-indigo-200 text-indigo-600" },
                  { label: "Accepted", date: acceptedDate, desc: isAcceptedDone ? "Candidate accepted from portal" : "Pending candidate confirmation", done: isAcceptedDone, color: "bg-teal-50 border-teal-200 text-teal-600" },
                  { label: "Eval Due", date: evalDueDate, desc: "Day 5 evaluation by Team Lead / PM", done: isEvalDone, color: "bg-amber-50 border-amber-200 text-amber-600" },
                  { label: "Outcome", date: outcomeDate, desc: status === "passed" ? "Passed & allocated" : status === "failed" ? "Failed & notified" : "Pending evaluation", done: isOutcomeDone, color: status === "passed" ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-rose-50 border-rose-200 text-rose-600" },
                ];

                return steps.map(step => (
                  <div key={step.label} className={`flex flex-col items-center flex-1 text-center relative ${!step.done && !step.date ? "opacity-45" : ""}`}>
                    <div className={`flex items-center justify-center w-11 h-11 rounded-full border-4 border-white shadow-xs mb-3 z-10 ${step.done ? step.color : "bg-slate-100 text-slate-400"}`}>
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-slate-900">{step.label}</div>
                    <time className="text-[11px] font-semibold text-indigo-600 my-0.5">
                      {step.date ? new Date(step.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Pending"}
                    </time>
                    <div className="text-[10px] text-slate-500 max-w-[110px] leading-tight">{step.desc}</div>
                  </div>
                ));
              })()}
            </div>

            <div className="mt-10 flex justify-end">
              <Button variant="secondary" onClick={() => setIsTimelineModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Evaluation Modal ───────────────────────────────────────────── */}
      {isEvalModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsEvalModalOpen(false)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Day 5 Evaluation</h3>
              <button
                onClick={() => setIsEvalModalOpen(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Evaluating candidate <strong className="text-slate-800">{selectedCandidate?.candidate_name}</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Score / Rating (%)
                </label>
                <input
                  type="number"
                  value={evalScore}
                  onChange={e => setEvalScore(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Evaluation Notes
                </label>
                <textarea
                  rows={3}
                  value={evalNotes}
                  onChange={e => setEvalNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleEval('failed')}
                disabled={evaluateMutation.isLoading}
                className="flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" /> Fail (Notify)
              </Button>
              <div className="space-x-2 flex">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEvalModalOpen(false)}
                  disabled={evaluateMutation.isLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleEval('passed')}
                  disabled={evaluateMutation.isLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Pass & Allocate
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── How Onboarding Works Modal (HR Friendly Guide) ───────────── */}
      {isHowItWorksOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setIsHowItWorksOpen(false)} />
          <div className="relative bg-white rounded-2xl max-w-3xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-indigo-50/70 via-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">How the Onboarding Workflow Works</h3>
                  <p className="text-xs text-slate-500">A step-by-step guide for HR on candidate pools, training, and evaluations</p>
                </div>
              </div>
              <button
                onClick={() => setIsHowItWorksOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-600 leading-relaxed">
              
              {/* Step 1 */}
              <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40">
                <div className="flex items-center gap-2 font-bold text-indigo-950 text-sm mb-1.5">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">1</div>
                  <span>When a New Employee Joins (The Unassigned Pool)</span>
                </div>
                <p className="text-slate-700 mb-2">
                  When new employees join the company, they automatically appear in the <strong>Unassigned Pool</strong> on the left.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-600 bg-white/80 p-3 rounded-lg border border-indigo-100/60">
                  <div>
                    <strong className="text-indigo-900 block mb-0.5">Who shows up here?</strong>
                    <span>All active annotators and reviewers who currently have <strong>0 project allocations</strong> and are waiting for assignment.</span>
                  </div>
                  <div>
                    <strong className="text-indigo-900 block mb-0.5">Who is filtered out?</strong>
                    <span>Archived or inactive employees, as well as management (Admins, PMs, HR), are automatically excluded to keep your pool clean.</span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40">
                <div className="flex items-center gap-2 font-bold text-blue-950 text-sm mb-1.5">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">2</div>
                  <span>Assigning Candidates & Starting Training</span>
                </div>
                <p className="text-slate-700 mb-2">
                  To start onboarding, HR selects candidates from the pool, picks a <strong>Buddy (Team Lead / PM)</strong> and their <strong>Target Project</strong>, and clicks <strong>"Start Pipeline"</strong>.
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                  <li><strong>Auto-Training Assignment:</strong> The system automatically places the candidates into the <strong>Week 1 Training</strong> project for 8 hours/day as <strong>Trainees</strong>.</li>
                  <li><strong>Never Counted as Idle:</strong> They immediately show up with an active training badge across all team rosters, so managers know they are actively training.</li>
                  <li><strong>Protected from Early Reassignment:</strong> While in training, other project managers cannot directly pull them into production client projects until their 5-day training is completed.</li>
                </ul>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/40">
                <div className="flex items-center gap-2 font-bold text-amber-950 text-sm mb-1.5">
                  <div className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">3</div>
                  <span>The 5-Day Training Journey</span>
                </div>
                <p className="text-slate-700 mb-2">
                  Candidates shadow their assigned Buddy (Team Lead or PM) for 5 business days. The calendar tracks their progress through every milestone (Assigned → Accepted → Evaluation Due).
                </p>
                <div className="bg-white/80 p-2.5 rounded-lg border border-amber-100 text-slate-600">
                  <strong className="text-amber-900 block mb-0.5">What if a candidate needs to be removed from training early?</strong>
                  <span>If a manager removes a candidate from Training in the Allocations page, the system will ask for confirmation. Once confirmed, their training is cancelled and they safely return to your Unassigned Pool so you can reassign them.</span>
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40">
                <div className="flex items-center gap-2 font-bold text-emerald-950 text-sm mb-1.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">4</div>
                  <span>Day 5 Evaluation (Team Lead / PM Decision)</span>
                </div>
                <p className="text-slate-700 mb-2">
                  On Day 5, the assigned Buddy submits an evaluation score and notes:
                </p>
                <div className="space-y-2">
                  <div className="bg-white/80 p-3 rounded-lg border border-emerald-200">
                    <strong className="text-emerald-800 flex items-center gap-1.5 text-xs">
                      <CheckCircle className="w-4 h-4 text-emerald-600" /> Outcome A: Pass & Allocate
                    </strong>
                    <span className="text-slate-600 block mt-1">
                      The candidate automatically graduates from Training and is instantly moved to their <strong>Target Project</strong> as a full team member for 8 hours/day. An automated congratulations email is sent to them.
                    </span>
                  </div>
                  <div className="bg-white/80 p-3 rounded-lg border border-rose-200">
                    <strong className="text-rose-800 flex items-center gap-1.5 text-xs">
                      <XCircle className="w-4 h-4 text-rose-600" /> Outcome B: Fail
                    </strong>
                    <span className="text-slate-600 block mt-1">
                      The candidate is removed from Training, their employee profile is archived, and their login is deactivated. An automated notification email is sent to them.
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Helpful FAQs for HR</span>
                </div>
                <div className="space-y-2 text-slate-600">
                  <div>
                    <strong className="text-slate-800 block">Q: What if no Training project exists right now?</strong>
                    <span>You can still assign candidates! The moment an admin creates a Training project, the system automatically catches up in the background and assigns waiting candidates to it.</span>
                  </div>
                  <div>
                    <strong className="text-slate-800 block">Q: What if a Training project is deleted?</strong>
                    <span>No candidates get lost. Any ongoing trainee is safely returned to the Unassigned Pool so HR can easily re-assign them to a new batch.</span>
                  </div>
                  <div>
                    <strong className="text-slate-800 block">Q: Are team leads assigned as trainees?</strong>
                    <span>No. If a candidate is hired as a Team Lead or manager, the system protects their title and never tags them as a Trainee.</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 flex justify-end shrink-0 bg-slate-50">
              <Button variant="primary" size="sm" onClick={() => setIsHowItWorksOpen(false)}>
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingPipelinePage;

