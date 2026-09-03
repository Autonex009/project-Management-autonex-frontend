import React, { useState } from "react";
import { Sparkles, CheckCircle, XCircle, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";

const OnboardingPipelinePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pool");
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedTimelineCandidate, setSelectedTimelineCandidate] = useState(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Form selections
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedBuddy, setSelectedBuddy] = useState("");
  const [evalScore, setEvalScore] = useState(95);
  const [evalNotes, setEvalNotes] = useState("Candidate did great!");

  // Queries
  const { data: pipeline = [], isLoading: pipelineLoading } = useQuery({
    queryKey: ["onboarding_pipeline"],
    queryFn: async () => {
      const res = await api.get("/onboarding/pipeline");
      return res.data;
    }
  });

  const { data: poolCandidates = [] } = useQuery({
    queryKey: ["onboarding_newly_onboarded"],
    queryFn: async () => {
      const res = await api.get("/onboarding/newly-onboarded");
      return res.data;
    }
  });

  // We still need all employees for the Buddy dropdown, or we can just fetch buddies specifically.
  // For now, let's fetch employees to populate the mentor dropdown
  const { data: allEmployees = [] } = useQuery({
    queryKey: ["employees-all"],
    queryFn: async () => {
      const res = await api.get("/employees");
      return res.data;
    }
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.get("/projects"); // Actually parent_projects, let's just use /projects
      return res.data;
    }
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

  // Mutations
  const assignMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/onboarding/pipeline/bulk-assign", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["onboarding_pipeline"]);
      setIsAssignModalOpen(false);
      setSelectedCandidateIds([]);
    }
  });

  const evaluateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await api.post(`/onboarding/pipeline/${id}/evaluate`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["onboarding_pipeline"]);
      setIsEvalModalOpen(false);
    }
  });

  // Derived data
  const pipelineInProgress = pipeline.filter(p => ["pending_confirmation", "in_progress", "day_5_pending"].includes(p.status));
  const pipelineHistory = pipeline.filter(p => ["passed", "failed"].includes(p.status));
  
  // The pool candidates come from the newly-onboarded endpoint.
  // We filter out any that are already in the active pipeline to be safe.
  const pool = poolCandidates.filter(c => !pipelineInProgress.some(p => p.candidate_id === c.userId));

  // Search filter
  const matchesSearch = (name) => !searchQuery || (name && name.toLowerCase().includes(searchQuery.toLowerCase()));
  
  const filteredPool = pool.filter(c => matchesSearch(c.name));
  const filteredPipeline = pipelineInProgress.filter(p => matchesSearch(p.candidate_name));
  const filteredHistory = pipelineHistory.filter(h => matchesSearch(h.candidate_name));

  let unifiedList = [];
  if (activeTab === "pool") {
    unifiedList = filteredPool.map(c => ({
      id: `pool-${c.userId}`,
      isPool: true,
      candidateName: c.name,
      appliedAt: c.appliedAt,
      approvedAt: c.approvedAt,
      project: "-",
      buddy: "-",
      status: "unassigned",
      rawCandidate: c
    }));
  } else if (activeTab === "pipeline") {
    unifiedList = filteredPipeline.map(p => ({
      id: `pipe-${p.id}`,
      isPool: false,
      candidateName: p.candidate_name,
      project: p.sub_project_name || p.project_name,
      buddy: p.buddy_name,
      status: p.status,
      daysElapsed: p.days_elapsed || 0,
      startedAt: p.started_at,
      appliedAt: p.applied_at,
      approvedAt: p.approved_at,
      rawPipeline: p
    }));
  }

  const tlBuddies = allEmployees.filter(emp => emp.designation === "Team Lead");

  const openBulkAssignModal = () => {
    if (selectedCandidateIds.length === 0) return;
    setIsAssignModalOpen(true);
    setSelectedBuddy("");
    setSelectedProject("");
  };

  const handleAssign = () => {
    const payload = {
      candidate_ids: selectedCandidateIds,
      sub_project_id: parseInt(selectedProject),
      buddy_id: parseInt(selectedBuddy),
      escalation_days: 5
    };
    assignMutation.mutate(payload);
  };

  const toggleCandidateSelection = (candidateId) => {
    setSelectedCandidateIds(prev => 
      prev.includes(candidateId) ? prev.filter(id => id !== candidateId) : [...prev, candidateId]
    );
  };

  const selectTop10 = () => {
    const unassigned = unifiedList.filter(item => item.isPool).slice(0, 10).map(item => item.rawCandidate.userId);
    setSelectedCandidateIds(unassigned);
  };

  const toggleSelectAll = (e) => {
    const unassigned = unifiedList.filter(item => item.isPool).map(item => item.rawCandidate.userId);
    if (e.target.checked) {
      setSelectedCandidateIds(unassigned);
    } else {
      setSelectedCandidateIds([]);
    }
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
      payload: {
        score: evalScore,
        notes: evalNotes,
        result: status
      }
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Sparkles className="w-8 h-8 text-indigo-500" />
          <h1 className="text-2xl font-bold text-slate-800">Onboarding Pipeline Tracker</h1>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6 flex-wrap gap-y-4">
        <div className="flex flex-1">
          <button
            className={`py-2 px-4 font-medium text-sm border-b-2 focus:outline-none ${activeTab === "pool" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            onClick={() => setActiveTab("pool")}
          >
            Unassigned Pool ({filteredPool.length})
          </button>
          <button
            className={`py-2 px-4 font-medium text-sm border-b-2 focus:outline-none ${activeTab === "pipeline" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            onClick={() => setActiveTab("pipeline")}
          >
            In Training ({filteredPipeline.length})
          </button>
          <button
            className={`py-2 px-4 font-medium text-sm border-b-2 focus:outline-none ${activeTab === "history" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            onClick={() => setActiveTab("history")}
          >
            Completed / Failed ({filteredHistory.length})
          </button>
        </div>
        <div className="flex items-center space-x-3 pb-2">
          {activeTab === "pool" && (
            <>
              <button 
                onClick={selectTop10}
                className="text-sm text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 px-3 py-2 rounded-md font-medium"
              >
                Select 10 candidates
              </button>
              <button 
                onClick={openBulkAssignModal}
                disabled={selectedCandidateIds.length === 0}
                className="text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 px-4 py-2 rounded-md font-medium shadow-sm"
              >
                Start Pipeline {selectedCandidateIds.length > 0 ? `(${selectedCandidateIds.length})` : ""}
              </button>
            </>
          )}
          <div className="relative min-w-[260px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none pb-0">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Search candidates by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {(activeTab === "pool" || activeTab === "pipeline") && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Candidates & Onboarding Tracker</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                    {activeTab === "pool" && (
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        checked={
                          selectedCandidateIds.length > 0 &&
                          selectedCandidateIds.length === unifiedList.filter(item => item.isPool).length
                        }
                        onChange={toggleSelectAll}
                      />
                    )}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                  {activeTab === "pool" ? (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applied Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approved Date</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buddy</th>
                    </>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                 {unifiedList.length === 0 && (
                    <tr><td colSpan="6" className="text-center py-4 text-gray-500">{pipelineLoading ? "Loading..." : "No candidates found."}</td></tr>
                )}
                {unifiedList.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.isPool && (
                        <input 
                          type="checkbox" 
                          checked={selectedCandidateIds.includes(item.rawCandidate.userId)}
                          onChange={() => toggleCandidateSelection(item.rawCandidate.userId)}
                          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.candidateName}
                      {!item.isPool && (
                        <button 
                          onClick={() => {
                            setSelectedTimelineCandidate(item);
                            setIsTimelineModalOpen(true);
                          }}
                          className="ml-2 text-indigo-500 hover:text-indigo-700"
                          title="View Timeline"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}
                    </td>
                    {activeTab === "pool" ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.appliedAt ? new Date(item.appliedAt).toLocaleDateString() : "-"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.approvedAt ? new Date(item.approvedAt).toLocaleDateString() : "-"}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.project}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.buddy}</td>
                      </>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.isPool ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          Unassigned
                        </span>
                      ) : (
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.status === "day_5_pending" ? "bg-red-100 text-red-800" : item.status === 'in_progress' ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"}`}>
                          {item.status === "pending_confirmation" ? "Pending Accept" : item.status === "in_progress" ? `${item.daysElapsed} Days Elapsed` : "Day 5 Eval"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {item.isPool ? (
                         <span className="text-gray-400 text-xs font-semibold">-</span>
                      ) : item.status === "day_5_pending" ? (
                        <div className="flex justify-end">
                           <button onClick={() => openEvalModal(item.rawPipeline)} className="text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded shadow-sm text-xs font-semibold">
                              Evaluate Day 5
                           </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs font-semibold">Waiting</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Historical Records</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outcome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Eval Score</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                 {filteredHistory.length === 0 && (
                    <tr><td colSpan="4" className="text-center py-4 text-gray-500">No historical records found.</td></tr>
                )}
                {filteredHistory.map((h) => (
                  <tr key={h.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{h.candidate_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{h.sub_project_name || h.project_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${h.status === "passed" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {h.status === "passed" ? "Passed (Allocated)" : "Failed (Notified)"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{h.eval_score}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-[999]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold mb-4">Assign {selectedCandidateIds.length} Candidate(s) to Pipeline</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Buddy (Team Lead)</label>
                <select value={selectedBuddy} onChange={(e) => {
                  setSelectedBuddy(e.target.value);
                  setSelectedProject(""); // reset project when TL changes
                }} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                  <option value="" disabled>Select Team Lead</option>
                  {tlBuddies.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Project</label>
                <select value={selectedProject} onChange={(e)=>setSelectedProject(e.target.value)} disabled={!selectedBuddy} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-100 disabled:text-gray-400">
                  <option value="" disabled>{selectedBuddy ? (tlProjects.length > 0 ? "Select Project" : "No projects assigned to this TL") : "Select a Buddy first"}</option>
                  {tlProjects.map(proj => (
                    <option key={proj.id} value={proj.id}>{proj.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setIsAssignModalOpen(false)} disabled={assignMutation.isLoading} className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none">Cancel</button>
              <button onClick={handleAssign} disabled={assignMutation.isLoading} className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none">
                {assignMutation.isLoading ? "Assigning..." : "Assign & Require Confirmation"}
              </button>
            </div>
          </div>
        </div>
      )}

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
              {/* Horizontal Connecting Line */}
              <div className="absolute top-6 left-[10%] right-[10%] h-0.5 bg-gray-200 z-0" />
              
              {/* Step 1: Applied */}
              <div className="flex flex-col items-center flex-1 text-center relative">
                <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-white bg-green-100 text-green-600 shadow-md mb-4 z-10">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-gray-900">Applied</div>
                <time className="text-xs font-semibold text-indigo-500 my-1">
                  {selectedTimelineCandidate.appliedAt ? new Date(selectedTimelineCandidate.appliedAt).toLocaleDateString() : "Unknown"}
                </time>
                <div className="text-xs text-gray-500 max-w-[120px] leading-tight">Raised signup request</div>
              </div>

              {/* Step 2: Approved */}
              <div className="flex flex-col items-center flex-1 text-center relative">
                <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-white bg-green-100 text-green-600 shadow-md mb-4 z-10">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-gray-900">Approved</div>
                <time className="text-xs font-semibold text-indigo-500 my-1">
                  {selectedTimelineCandidate.approvedAt ? new Date(selectedTimelineCandidate.approvedAt).toLocaleDateString() : "Unknown"}
                </time>
                <div className="text-xs text-gray-500 max-w-[120px] leading-tight">Signup was approved</div>
              </div>

              {/* Step 3: Pipeline Started */}
              <div className={`flex flex-col items-center flex-1 text-center relative ${!selectedTimelineCandidate.startedAt ? 'opacity-60' : ''}`}>
                <div className={`flex items-center justify-center w-12 h-12 rounded-full border-4 border-white shadow-md mb-4 z-10 ${selectedTimelineCandidate.startedAt ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                  {selectedTimelineCandidate.startedAt ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  )}
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {selectedTimelineCandidate.startedAt ? "Pipeline Started" : "Pending Start"}
                </div>
                <time className={`text-xs font-semibold my-1 ${selectedTimelineCandidate.startedAt ? 'text-indigo-500' : 'text-gray-500'}`}>
                  {selectedTimelineCandidate.startedAt ? new Date(selectedTimelineCandidate.startedAt).toLocaleDateString() : "Not Started"}
                </time>
                <div className="text-xs text-gray-500 max-w-[120px] leading-tight">
                  {selectedTimelineCandidate.startedAt ? "Candidate accepted 5-day evaluation" : "Pending candidate acceptance"}
                </div>
              </div>

              {/* Step 4: Expected Eval */}
              <div className="flex flex-col items-center flex-1 text-center relative opacity-70">
                <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-white bg-gray-100 text-gray-500 shadow-md mb-4 z-10">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div className="text-sm font-bold text-gray-900">Expected Eval</div>
                <time className="text-xs font-semibold text-gray-500 my-1">
                  {selectedTimelineCandidate.startedAt 
                    ? new Date(new Date(selectedTimelineCandidate.startedAt).getTime() + (5 * 24 * 60 * 60 * 1000)).toLocaleDateString() 
                    : "Unknown"}
                </time>
                <div className="text-xs text-gray-500 max-w-[120px] leading-tight">Day 5 evaluation by Team Lead</div>
              </div>
            </div>

            <div className="mt-12 text-center">
               <button onClick={() => setIsTimelineModalOpen(false)} className="px-8 py-2.5 bg-slate-800 text-white font-semibold rounded-full hover:bg-slate-700 transition-colors shadow focus:outline-none">
                 Close Timeline
               </button>
            </div>
          </div>
        </div>
      )}

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
              <button onClick={() => handleEval('failed')} disabled={evaluateMutation.isLoading} className="px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 flex items-center focus:outline-none">
                <XCircle className="w-4 h-4 mr-2"/> Fail (Notify)
              </button>
              <div className="space-x-3 flex">
                <button onClick={() => setIsEvalModalOpen(false)} disabled={evaluateMutation.isLoading} className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none">Cancel</button>
                <button onClick={() => handleEval('passed')} disabled={evaluateMutation.isLoading} className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 inline-flex items-center focus:outline-none">
                  <CheckCircle className="w-4 h-4 mr-2"/> Pass & Allocate
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
