import React, { useState } from "react";
import {
  Award,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Send,
  Sparkles,
  BookOpen,
  Eye,
  X,
  FileSpreadsheet,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Button from "../../components/ui/Button";
import SearchBar from "../../components/ui/SearchBar";
import Modal from "../../components/ui/Modal";
import toast from "react-hot-toast";
import { INITIAL_OVERALL_REPORTS } from "../../mock/trainingMockData";
import { clusterApi } from "../../services/api";

export default function AdminOverallReportsPage() {
  const [reports] = useState(INITIAL_OVERALL_REPORTS);
  const { data: clusters = [] } = useQuery({
    queryKey: ["clusters"],
    queryFn: () => clusterApi.list(),
    staleTime: 60 * 1000,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [clusterFilter, setClusterFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [inspectCandidate, setInspectCandidate] = useState(null);

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCluster = clusterFilter === "All" || r.clusterName === clusterFilter;
    const matchesStatus = statusFilter === "All" || r.certificationStatus === statusFilter;
    return matchesSearch && matchesCluster && matchesStatus;
  });

  const totalCandidates = reports.length;
  const certifiedCount = reports.filter((r) => r.certificationStatus === "Certified").length;
  const inProgressCount = reports.filter((r) => r.certificationStatus === "In Progress").length;
  const flaggedCount = reports.filter((r) => r.proctoringViolations >= 2).length;

  const handleSendSlackReminder = (name) => {
    toast.success(`Daily Slack reminder sent to ${name}!`);
  };

  const handleRecommendRetraining = (name) => {
    toast.success(`Recommended ${name} for 'Robotics Refresher Post-Test' to Team Lead.`);
  };

  const handleExportCSV = () => {
    toast.success("Exported Executive Overall Training & Assessment Report (CSV).");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Overall Reports
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Executive Matrix
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Complete candidate journey across baseline Pre-Tests, Training Module progress, Post-Test scores, and Transfer of Training deltas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="md"
            variant="outline"
            onClick={handleExportCSV}
            className="gap-1.5 shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Overview Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Candidates
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalCandidates}</p>
          <p className="text-xs text-slate-500 mt-0.5">Across active clusters</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Certified Annotators
          </span>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {certifiedCount} ({Math.round((certifiedCount / totalCandidates) * 100)}%)
          </p>
          <p className="text-xs text-emerald-600 mt-0.5 font-medium">Passed post-test & ToT</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Avg ToT Improvement
          </span>
          <p className="text-2xl font-black text-purple-600 mt-1">+24.5%</p>
          <p className="text-xs text-purple-600 mt-0.5 font-medium">Pre vs Post test delta</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Flagged Violations
          </span>
          <p className="text-2xl font-black text-rose-600 mt-1">{flaggedCount}</p>
          <p className="text-xs text-rose-600 mt-0.5 font-medium">Anti-cheat tab switch limit</p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <SearchBar
          placeholder="Search candidates by name, email, or role..."
          value={searchQuery}
          onChange={setSearchQuery}
          className="flex-1"
        />

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={clusterFilter}
              onChange={(e) => setClusterFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="All">All Clusters</option>
              {clusters.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Certified">Certified</option>
            <option value="In Progress">In Progress</option>
            <option value="Retraining Recommended">Retraining Recommended</option>
          </select>
        </div>
      </div>

      {/* End-to-End Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Candidate</th>
                <th className="py-3.5 px-4">Cluster</th>
                <th className="py-3.5 px-4 text-center">Pre-Test (Day 1)</th>
                <th className="py-3.5 px-4">Course Progress</th>
                <th className="py-3.5 px-4 text-center">Post-Test</th>
                <th className="py-3.5 px-4 text-center">ToT Delta</th>
                <th className="py-3.5 px-4 text-center">Proctoring</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredReports.map((row) => {
                const isCertified = row.certificationStatus === "Certified";
                const isRetrain = row.certificationStatus === "Retraining Recommended";
                const isFlagged = row.proctoringViolations >= 2;

                return (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Candidate */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{row.candidateName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{row.email}</p>
                      <span className="text-[10px] text-slate-500">{row.role} • DOJ: {row.doj}</span>
                    </td>

                    {/* Cluster */}
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800">{row.clusterName}</span>
                    </td>

                    {/* Pre-Test Baseline */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {row.preTestScore}%
                      </span>
                      <p className="text-[10px] text-slate-400">Baseline</p>
                    </td>

                    {/* Training Progress */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1 w-28">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-700">
                            {row.trainingModulesCompleted}/{row.trainingModulesTotal}
                          </span>
                          <span className="font-mono text-slate-500">{row.trainingProgressPct}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              row.trainingProgressPct === 100 ? "bg-emerald-500" : "bg-indigo-600"
                            }`}
                            style={{ width: `${row.trainingProgressPct}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Post-Test */}
                    <td className="py-3.5 px-4 text-center">
                      {row.postTestScore > 0 ? (
                        <>
                          <span className={`font-mono font-bold text-sm ${
                            row.postTestScore >= 80 ? "text-emerald-700" : "text-rose-600"
                          }`}>
                            {row.postTestScore}%
                          </span>
                          <p className="text-[10px] text-slate-400">{row.postTestStatus}</p>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Pending</span>
                      )}
                    </td>

                    {/* Transfer of Training (ToT Delta) */}
                    <td className="py-3.5 px-4 text-center">
                      {row.totDelta !== "—" ? (
                        <span className="inline-flex items-center gap-1 font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                          <TrendingUp className="h-3 w-3" />
                          {row.totDelta}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Proctoring */}
                    <td className="py-3.5 px-4 text-center">
                      {isFlagged ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <ShieldAlert className="h-3 w-3 text-rose-600" />
                          {row.proctoringViolations} Switches
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> Clean
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isCertified
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : isRetrain
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {row.certificationStatus}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setInspectCandidate(row)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Inspect full candidate timeline"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {isRetrain ? (
                          <button
                            type="button"
                            onClick={() => handleRecommendRetraining(row.candidateName)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Recommend candidate for retraining"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendSlackReminder(row.candidateName)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Send Slack reminder"
                          >
                            <Send className="h-4 w-4" />
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
      </div>

      {/* Candidate Full Audit Modal */}
      {inspectCandidate && (
        <Modal isOpen onClose={() => setInspectCandidate(null)} size="lg">
          <Modal.Header>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-slate-900">
                Candidate Learning & Certification Audit
              </h3>
            </div>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-extrabold text-slate-900 text-base">{inspectCandidate.candidateName}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{inspectCandidate.email}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Cluster: <strong className="text-slate-800">{inspectCandidate.clusterName}</strong> • Role: {inspectCandidate.role}
                </p>
              </div>

              <div className="text-right">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                  inspectCandidate.certificationStatus === "Certified"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}>
                  {inspectCandidate.certificationStatus}
                </span>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">Last active: {inspectCandidate.lastActivity}</p>
              </div>
            </div>

            {/* Step-by-Step Timeline Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 bg-white text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">1. Pre-Test Baseline</span>
                <p className="text-xl font-black text-slate-800 mt-1">{inspectCandidate.preTestScore}%</p>
                <p className="text-[10px] text-slate-500">Initial assessment</p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">2. Training Modules</span>
                <p className="text-xl font-black text-indigo-600 mt-1">
                  {inspectCandidate.trainingModulesCompleted}/{inspectCandidate.trainingModulesTotal}
                </p>
                <p className="text-[10px] text-slate-500">{inspectCandidate.trainingProgressPct}% Completed</p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">3. Post-Test Score</span>
                <p className="text-xl font-black text-emerald-600 mt-1">
                  {inspectCandidate.postTestScore > 0 ? `${inspectCandidate.postTestScore}%` : "Pending"}
                </p>
                <p className="text-[10px] text-slate-500">Qualification score</p>
              </div>
            </div>

            {/* Transfer of Training Highlight */}
            <div className="p-4 rounded-xl bg-purple-50/80 border border-purple-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                  Transfer of Training (ToT) Effectiveness
                </p>
                <p className="text-xs text-purple-700 mt-0.5">
                  Day 1 Pre-Test ({inspectCandidate.preTestScore}%) ➔ Day 5 Post-Test ({inspectCandidate.postTestScore}%)
                </p>
              </div>
              <span className="text-2xl font-black text-purple-700 font-mono">
                {inspectCandidate.totDelta}
              </span>
            </div>

            {/* Proctoring Log */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Proctoring & Anti-Cheat Audit
              </span>
              <p className="text-xs text-slate-600">
                Webcam Status: <strong className="text-emerald-700">Verified & Continuous Active Stream</strong>
              </p>
              <p className="text-xs text-slate-600">
                Tab Switches Detected: <strong className={inspectCandidate.proctoringViolations >= 2 ? "text-rose-600 font-bold" : "text-slate-800"}>
                  {inspectCandidate.proctoringViolations}
                </strong> {inspectCandidate.proctoringViolations >= 2 ? "(FLAGGED FOR REVIEW)" : "(Within allowed threshold)"}
              </p>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSendSlackReminder(inspectCandidate.candidateName)}
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5 text-indigo-500" /> Send Slack Message
            </Button>
            <Button size="sm" onClick={() => setInspectCandidate(null)}>
              Done
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}
