import React, { useState, useEffect } from "react";
import { Sparkles, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Initial Mock Data
const initialPool = [
  { id: 1, name: "Siddhi Sanjay Sonawane", email: "siddhiisanjaysonawane@gmail.com", department: "Annotator", created_at: "2026-08-25" },
  { id: 2, name: "Himanshu H Maurya", email: "himanshum7738@gmail.com", department: "Reviewer", created_at: "2026-08-24" },
];

const initialPipeline = [
  { id: 101, candidate: "Gargi Girish Mogadpally", project: "Project Yutori", buddy: "Reefa", role: "Annotator / Reviewer", start_date: "2026-08-21", days_elapsed: 5, status: "day_5_pending" },
  { id: 102, candidate: "Laxmi Sikarwar", project: "Project X", buddy: "Jay Jadhav", role: "Annotator / Reviewer", start_date: "2026-08-24", days_elapsed: 2, status: "in_progress" },
];

const initialHistory = [
  { id: 201, candidate: "Jay Jadhav", project: "Project Alpha", role: "Annotator / Reviewer", status: "passed", eval_score: 95 },
];

const OnboardingMockupPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pool");
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const [pool, setPool] = useState(initialPool);
  const [pipeline, setPipeline] = useState(initialPipeline);
  const [history, setHistory] = useState(initialHistory);

  // Form selections
  const [selectedProject, setSelectedProject] = useState("Project Yutori");
  const [selectedBuddy, setSelectedBuddy] = useState("Reefa");

  useEffect(() => {
    // Check if there's saved state from the workflow simulation
    const storedState = localStorage.getItem("onboardingMockupState");
    if (storedState) {
      const parsed = JSON.parse(storedState);
      setPool(parsed.pool);
      setPipeline(parsed.pipeline);
      setHistory(parsed.history);
      if (parsed.activeTab) setActiveTab(parsed.activeTab);
    } else {
      saveState(initialPool, initialPipeline, initialHistory, "pool");
    }
  }, []);

  const saveState = (newPool, newPipeline, newHistory, currentTab) => {
    localStorage.setItem("onboardingMockupState", JSON.stringify({
      pool: newPool, pipeline: newPipeline, history: newHistory, activeTab: currentTab || activeTab
    }));
    setPool(newPool);
    setPipeline(newPipeline);
    setHistory(newHistory);
    if (currentTab) setActiveTab(currentTab);
  };

  const openAssignModal = (candidate) => {
    setSelectedCandidate(candidate);
    setIsAssignModalOpen(true);
  };

  const handleAssign = () => {
    // 1. Save the pending confirmation to localStorage so Candidate UI sees it
    const candidatePayload = {
      ...selectedCandidate,
      assignedProject: selectedProject,
      assignedBuddy: selectedBuddy,
      assignedRole: "Annotator / Reviewer"
    };
    localStorage.setItem("pendingCandidateConfirmation", JSON.stringify(candidatePayload));
    
    // 2. We don't update our pipeline array YET. The candidate needs to confirm first.
    // 3. Redirect to the candidate confirmation screen (simulating the candidate logging in).
    setIsAssignModalOpen(false);
    navigate("/admin/confirmation-mockup");
  };

  const openEvalModal = (p) => {
    setSelectedCandidate(p);
    setIsEvalModalOpen(true);
  };

  const handleEval = (status) => {
    // Remove from pipeline, add to history
    const newPipeline = pipeline.filter(p => p.id !== selectedCandidate.id);
    const newHistory = [...history, {
      id: Math.random(),
      candidate: selectedCandidate.candidate,
      project: selectedCandidate.project,
      role: selectedCandidate.role,
      status: status,
      eval_score: status === 'passed' ? 95 : 45
    }];
    saveState(pool, newPipeline, newHistory, "history");
    setIsEvalModalOpen(false);
  };

  const handleReset = () => {
      localStorage.removeItem("onboardingMockupState");
      localStorage.removeItem("pendingCandidateConfirmation");
      setPool(initialPool);
      setPipeline(initialPipeline);
      setHistory(initialHistory);
      setActiveTab("pool");
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Sparkles className="w-8 h-8 text-indigo-500" />
          <h1 className="text-2xl font-bold text-slate-800">Onboarding Pipeline Tracker (Mockup)</h1>
        </div>
        <button onClick={handleReset} className="text-sm text-gray-500 hover:text-red-500 underline">Reset Demo Data</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`py-2 px-4 font-medium text-sm border-b-2 focus:outline-none ${activeTab === "pool" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          onClick={() => setActiveTab("pool")}
        >
          Unassigned Pool ({pool.length})
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm border-b-2 focus:outline-none ${activeTab === "pipeline" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          onClick={() => setActiveTab("pipeline")}
        >
          Active Pipeline ({pipeline.length})
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm border-b-2 focus:outline-none ${activeTab === "history" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          onClick={() => setActiveTab("history")}
        >
          Completed / Failed ({history.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "pool" && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Candidates Waiting for Project Assignment</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pool.length === 0 && (
                    <tr><td colSpan="4" className="text-center py-4 text-gray-500">No candidates in the pool.</td></tr>
                )}
                {pool.map((c) => (
                  <tr key={c.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{c.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.department}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.created_at}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => openAssignModal(c)} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded border border-indigo-200">
                        Start Pipeline
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "pipeline" && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Active Onboarding Tracker</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role / Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buddy</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Elapsed</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                 {pipeline.length === 0 && (
                    <tr><td colSpan="5" className="text-center py-4 text-gray-500">No active pipelines.</td></tr>
                )}
                {pipeline.map((p) => (
                  <tr key={p.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.candidate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.role} on {p.project}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.buddy}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${p.status === "day_5_pending" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                        {p.days_elapsed} Days
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {p.status === "day_5_pending" ? (
                        <div className="flex justify-end">
                           <button onClick={() => openEvalModal(p)} className="text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded shadow-sm text-xs font-semibold">
                              Evaluate Day 5
                           </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs font-semibold">Waiting for Day 5</span>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role / Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outcome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Eval Score</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{h.candidate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{h.role} on {h.project}</td>
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
            <h3 className="text-lg font-bold mb-4">Assign {selectedCandidate?.name} to Pipeline</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Project</label>
                <select value={selectedProject} onChange={(e)=>setSelectedProject(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                  <option>Project Yutori</option>
                  <option>Project Vision</option>
                  <option>Project X</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Buddy (Mentor)</label>
                <select value={selectedBuddy} onChange={(e)=>setSelectedBuddy(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                  <option>Reefa</option>
                  <option>John Doe</option>
                  <option>Jay Jadhav</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setIsAssignModalOpen(false)} className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none">Cancel</button>
              <button onClick={handleAssign} className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none">Assign & Simulate Login</button>
            </div>
          </div>
        </div>
      )}

      {isEvalModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-[999]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold mb-4">Day 5 Evaluation for {selectedCandidate?.candidate}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Score / Rating (%)</label>
                <input type="number" defaultValue={95} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Evaluation Notes</label>
                <textarea rows={3} defaultValue={"Candidate did great!"} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
            </div>
            <div className="mt-6 flex justify-between">
              <button onClick={() => handleEval('failed')} className="px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 flex items-center focus:outline-none">
                <XCircle className="w-4 h-4 mr-2"/> Fail (Notify)
              </button>
              <div className="space-x-3 flex">
                <button onClick={() => setIsEvalModalOpen(false)} className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none">Cancel</button>
                <button onClick={() => handleEval('passed')} className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 inline-flex items-center focus:outline-none">
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

export default OnboardingMockupPage;
