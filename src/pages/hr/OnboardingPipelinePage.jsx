import React, { useState } from "react";
import { CheckCircle, XCircle, Search, UserPlus, Zap, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PipelineCalendar from "../../components/PipelineCalendar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import UserAvatar from "../../components/ui/UserAvatar";
import { formatDisplayName } from "../../utils/displayName";

// ── Pool Sidebar ──────────────────────────────────────────────────────────────
function PoolSidebar({
  candidates, selectedIds, onToggle,
  searchQuery, onSearchChange,
  tlBuddies, tlProjects, selectedBuddy, selectedProject,
  onBuddyChange, onProjectChange, onAssign, isAssigning,
}) {
  const selectedInPool = candidates.filter(c => selectedIds.includes(c.userId));
  const allSelected = candidates.length > 0 && candidates.every(c => selectedIds.includes(c.userId));

  return (
    <div className="w-[300px] shrink-0 flex flex-col border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden h-full">

      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-br from-violet-600 to-indigo-700 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-4 h-4 text-violet-200" />
          <span className="text-xs font-black text-violet-200 uppercase tracking-widest">Unassigned Pool</span>
        </div>
        <div className="text-2xl font-black text-white">{candidates.length}</div>
        <div className="text-[11px] text-violet-300 mt-0.5">candidates awaiting assignment</div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-slate-100 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search candidates…"
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none bg-slate-50"
          />
        </div>
      </div>

      {/* Select all */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-100 shrink-0 bg-slate-50/70">
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
        <span className="text-[10px] font-bold text-slate-500 flex-1">
          {selectedInPool.length > 0 ? `${selectedInPool.length} selected` : "Select all"}
        </span>
        {selectedInPool.length === 0 && candidates.length > 0 && (
          <button
            onClick={() => candidates.slice(0, 10).forEach(c => { if (!selectedIds.includes(c.userId)) onToggle(c.userId); })}
            className="text-[10px] font-bold text-indigo-600 hover:underline"
          >
            Top 10
          </button>
        )}
      </div>

      {/* Candidate list */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
        {candidates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Users className="w-8 h-8 mb-2 opacity-30" />
            <div className="text-xs font-semibold">No candidates in pool</div>
          </div>
        )}
        {candidates.map(c => {
          const isSelected = selectedIds.includes(c.userId);
          return (
            <button
              key={c.userId}
              onClick={() => onToggle(c.userId)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${isSelected ? "bg-indigo-50" : "hover:bg-slate-50"}`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                readOnly
                className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300 pointer-events-none shrink-0"
              />
              <UserAvatar name={c.name} className="w-7 h-7 text-[10px] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-bold truncate ${isSelected ? "text-indigo-700" : "text-slate-700"}`}>
                  {formatDisplayName(c.name)}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {c.approvedAt ? `Approved ${new Date(c.approvedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "Pending approval"}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Assign Footer */}
      <div className="shrink-0 border-t border-slate-200 bg-slate-50 p-3 space-y-2">
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
          Assign to Pipeline
        </div>
        <select
          value={selectedBuddy}
          onChange={e => onBuddyChange(e.target.value)}
          className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
        >
          <option value="" disabled>Select Buddy (Team Lead)…</option>
          {tlBuddies.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
        </select>
        <select
          value={selectedProject}
          onChange={e => onProjectChange(e.target.value)}
          disabled={!selectedBuddy}
          className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-400 outline-none bg-white disabled:opacity-40"
        >
          <option value="" disabled>{selectedBuddy ? "Select Project…" : "Pick buddy first"}</option>
          {tlProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button
          onClick={onAssign}
          disabled={selectedInPool.length === 0 || !selectedBuddy || !selectedProject || isAssigning}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-indigo-600 rounded-xl py-2 hover:bg-indigo-700 transition-colors disabled:opacity-40 shadow-sm"
        >
          {isAssigning ? "Assigning…" : (
            <>
              <Zap className="w-3.5 h-3.5" />
              Start Pipeline {selectedInPool.length > 0 ? `(${selectedInPool.length})` : ""}
            </>
          )}
        </button>
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
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedTimelineCandidate, setSelectedTimelineCandidate] = useState(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [poolSearch, setPoolSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedBuddy, setSelectedBuddy] = useState("");
  const [evalScore, setEvalScore] = useState(95);
  const [evalNotes, setEvalNotes] = useState("Candidate did great!");

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: pipeline = [] } = useQuery({
    queryKey: ["onboarding_pipeline"],
    queryFn: async () => { const res = await api.get("/onboarding/pipeline"); return res.data; }
  });
  const { data: poolCandidates = [] } = useQuery({
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
    enabled: !!selectedBuddy
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const assignMutation = useMutation({
    mutationFn: async (payload) => { const res = await api.post("/onboarding/pipeline/bulk-assign", payload); return res.data; },
    onSuccess: () => {
      queryClient.invalidateQueries(["onboarding_pipeline"]);
      queryClient.invalidateQueries(["onboarding_newly_onboarded"]);
      setSelectedCandidateIds([]);
      setSelectedBuddy("");
      setSelectedProject("");
    }
  });
  const evaluateMutation = useMutation({
    mutationFn: async ({ id, payload }) => { const res = await api.post(`/onboarding/pipeline/${id}/evaluate`, payload); return res.data; },
    onSuccess: () => { queryClient.invalidateQueries(["onboarding_pipeline"]); setIsEvalModalOpen(false); }
  });

  // ── Derived ────────────────────────────────────────────────────────────────
  const pipelineInProgress = pipeline.filter(p => ["pending_confirmation", "in_progress", "day_5_pending"].includes(p.status));
  const pipelineHistory    = pipeline.filter(p => ["passed", "failed"].includes(p.status));
  const pool = poolCandidates.filter(c => !pipeline.some(p => p.candidate_id === c.userId));

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

  const tlBuddies = allEmployees.filter(emp => emp.designation === "Team Lead");

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

  return (
    <div className="p-6 flex flex-col gap-4" style={{ height: "calc(100vh - 64px)" }}>

      {/* Split layout: pool sidebar + calendar */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* Pool Sidebar */}
        <PoolSidebar
          candidates={filteredPool}
          selectedIds={selectedCandidateIds}
          onToggle={toggleCandidateSelection}
          searchQuery={poolSearch}
          onSearchChange={setPoolSearch}
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
        <div className="flex-1 min-w-0 border border-slate-200 rounded-xl shadow-sm bg-white overflow-hidden">
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
      {isTimelineModalOpen && selectedTimelineCandidate && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-[999]">
          <div className="bg-white rounded-lg p-8 max-w-4xl w-full shadow-xl">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-xl font-bold text-gray-900">Candidate Timeline</h3>
              <button onClick={() => setIsTimelineModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <XCircle className="w-7 h-7" />
              </button>
            </div>
            <div className="relative flex justify-between items-start w-full px-4 md:px-10">
              <div className="absolute top-6 left-[10%] right-[10%] h-0.5 bg-gray-200 z-0" />
              {[
                { label: "Assigned", date: selectedTimelineCandidate.assignedAt, desc: "Mentor & project assigned by HR", done: !!selectedTimelineCandidate.assignedAt, color: "bg-indigo-100 text-indigo-600" },
                { label: "Accepted", date: selectedTimelineCandidate.startedAt, desc: "Candidate accepted from portal", done: !!selectedTimelineCandidate.startedAt, color: "bg-teal-100 text-teal-600" },
                { label: "Eval Due", date: selectedTimelineCandidate.expectedEvalDate || selectedTimelineCandidate.evaluatedAt, desc: "Day 5 evaluation by Team Lead", done: !!selectedTimelineCandidate.evaluatedAt, color: "bg-amber-100 text-amber-600" },
                { label: "Outcome", date: selectedTimelineCandidate.evaluatedAt, desc: selectedTimelineCandidate.status === "passed" ? "Passed & allocated" : selectedTimelineCandidate.status === "failed" ? "Failed & notified" : "Pending evaluation", done: !!selectedTimelineCandidate.evaluatedAt, color: selectedTimelineCandidate.status === "passed" ? "bg-green-100 text-green-600" : "bg-rose-100 text-rose-600" },
              ].map(step => (
                <div key={step.label} className={`flex flex-col items-center flex-1 text-center relative ${!step.done && !step.date ? "opacity-50" : ""}`}>
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full border-4 border-white shadow-md mb-4 z-10 ${step.done ? step.color : "bg-gray-100 text-gray-400"}`}>
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-gray-900">{step.label}</div>
                  <time className="text-xs font-semibold text-indigo-500 my-1">
                    {step.date ? new Date(step.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Pending"}
                  </time>
                  <div className="text-xs text-gray-500 max-w-[120px] leading-tight">{step.desc}</div>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <button onClick={() => setIsTimelineModalOpen(false)} className="px-8 py-2.5 bg-slate-800 text-white font-semibold rounded-full hover:bg-slate-700 transition-colors shadow">
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Evaluation Modal ───────────────────────────────────────────── */}
      {isEvalModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-[999]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold mb-4">Day 5 Evaluation for {selectedCandidate?.candidate_name}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Score / Rating (%)</label>
                <input type="number" value={evalScore} onChange={e => setEvalScore(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Evaluation Notes</label>
                <textarea rows={3} value={evalNotes} onChange={e => setEvalNotes(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
            </div>
            <div className="mt-6 flex justify-between">
              <button onClick={() => handleEval('failed')} disabled={evaluateMutation.isLoading} className="px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 flex items-center">
                <XCircle className="w-4 h-4 mr-2" /> Fail (Notify)
              </button>
              <div className="space-x-3 flex">
                <button onClick={() => setIsEvalModalOpen(false)} disabled={evaluateMutation.isLoading} className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Cancel</button>
                <button onClick={() => handleEval('passed')} disabled={evaluateMutation.isLoading} className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 inline-flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" /> Pass & Allocate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingPipelinePage;
