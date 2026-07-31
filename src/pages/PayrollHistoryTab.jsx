import React, { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Loader2, Download, Eye } from "lucide-react";
import { payrollApi } from "../services/api";

const PayrollHistoryTab = ({ onViewDetails }) => {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        setLoading(true);
        const data = await payrollApi.getRuns();
        setRuns(data.runs || []);
      } catch (err) {
        console.error("Failed to fetch payroll history:", err);
        setError("Could not load payroll history.");
      } finally {
        setLoading(false);
      }
    };

    fetchRuns();
  }, []);

  const handleDownload = (month) => {
    window.location.href = payrollApi.exportCsvUrl(month);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-lg border border-red-100">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Payroll History</h2>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {runs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No payroll history found.
          </div>
        ) : (
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Month</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Working Days</th>
                <th className="px-6 py-4">Finalized At</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {run.month}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                        run.status === "finalized"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">{run.working_days} days</td>
                  <td className="px-6 py-4">
                    {run.finalized_at
                      ? format(parseISO(run.finalized_at), "PPP")
                      : "-"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onViewDetails(run.month)}
                        title="View Details"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                      <button
                        onClick={() => handleDownload(run.month)}
                        title="Download CSV"
                        className="inline-flex items-center justify-center p-1.5 text-slate-400 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PayrollHistoryTab;
