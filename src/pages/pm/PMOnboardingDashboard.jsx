import React, { useState } from "react";
import { Users, CheckCircle, XCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import Table from "../../components/ui/Table";
import Spinner from "../../components/ui/LoadingSpinner";
import UserAvatar from "../../components/ui/UserAvatar";

const PMOnboardingDashboard = ({ embedded = false }) => {
  const queryClient = useQueryClient();
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [evalScore, setEvalScore] = useState(95);
  const [evalNotes, setEvalNotes] = useState("Candidate did great!");

  const { data: mentees = [], isLoading, error } = useQuery({
    queryKey: ["my-mentees"],
    queryFn: async () => {
      const res = await api.get("/onboarding/pipeline/my-mentees");
      return res.data;
    },
  });

  const evaluateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await api.post(`/onboarding/pipeline/${id}/evaluate`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["my-mentees"]);
      setIsEvalModalOpen(false);
    }
  });

  const openEvalModal = (m) => {
    setSelectedCandidate(m);
    setIsEvalModalOpen(true);
    setEvalScore(95);
    setEvalNotes("Candidate did great!");
  };

  const handleEval = (status) => {
    evaluateMutation.mutate({
      id: selectedCandidate.id,
      payload: {
        score: parseInt(evalScore, 10),
        notes: evalNotes,
        result: status
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-500 font-medium">
        <Spinner size="md" color="indigo" text="Loading your mentorship dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-100 text-center font-medium">
        Could not load assigned candidates.
      </div>
    );
  }

  return (
    <div className={embedded ? "" : "space-y-8 animate-in fade-in duration-500"}>
      {/* Header section */}
      {!embedded && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600">
              PM Portal
            </span>
            <h1 className="text-lg font-semibold text-slate-900 mt-1">
              Mentorship & Onboarding
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Monitor training progression for your newly assigned candidates.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white border border-slate-200/60 p-4 px-6 rounded-2xl shadow-sm w-full md:w-auto">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Assigned Candidates
                </p>
                <p className="text-lg font-extrabold text-slate-800">
                  {mentees.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mentees list container */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Your Pipeline Candidates</h3>
        </div>

        <div>
          {mentees.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center max-w-md mx-auto">
              <Users className="w-12 h-12 text-slate-300 mb-3" />
              <p className="font-bold text-slate-500 text-base">
                No candidates assigned to you
              </p>
              <p className="text-sm text-slate-400 text-center mt-1">
                When HR assigns a candidate to you for onboarding, their pipeline progression will appear here.
              </p>
            </div>
          ) : (
            <Table
              variant="borderless"
              columns={[
                {
                  key: "candidate_name",
                  label: "Candidate",
                  render: (value, m) => (
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        src={null}
                        name={value || "CD"}
                        size="h-9 w-9 text-xs"
                        fallbackClassName="bg-gradient-to-br from-blue-600 to-cyan-500 !text-white font-bold shadow-sm"
                      />
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{value}</p>
                        <p className="text-[10px] text-slate-400">{m.candidate_email}</p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "project_name",
                  label: "Project",
                  align: "center",
                  render: (value) => (
                    <span className="font-medium text-slate-700 text-sm">{value || "-"}</span>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  align: "center",
                  render: (value, m) => (
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${value === "day_5_pending" ? "bg-red-100 text-red-800" : value === 'in_progress' ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"}`}>
                      {value === "in_progress" ? `${m.days_elapsed || 0} Days Elapsed` : value === "day_5_pending" ? "Day 5 Eval" : "Pending"}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  label: "Actions",
                  align: "right",
                  render: (_, m) => (
                    m.status === "day_5_pending" ? (
                      <div className="flex justify-end">
                        <button onClick={() => openEvalModal(m)} className="text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded shadow-sm text-xs font-semibold">
                          Evaluate Day 5
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs font-semibold">In Training</span>
                    )
                  ),
                },
              ]}
              data={mentees}
            />
          )}
        </div>
      </div>

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

export default PMOnboardingDashboard;
