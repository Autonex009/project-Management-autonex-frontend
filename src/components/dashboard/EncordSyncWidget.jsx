import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeApi } from "../../services/api";
import { toast } from "react-hot-toast";
import { History, RefreshCw, X } from "lucide-react";
import { format } from "date-fns";
import Dropdown from "../ui/Dropdown";

export default function EncordSyncWidget({ employeeId }) {
  const queryClient = useQueryClient();
  const [showLogs, setShowLogs] = useState(false);
  const [syncPeriod, setSyncPeriod] = useState("current_month");
  const [customMonth, setCustomMonth] = useState(format(new Date(), "yyyy-MM"));
  
  const [isPolling, setIsPolling] = useState(false);

  // Fetch logs
  const { data: logs = [] } = useQuery({
    queryKey: ["encord-sync-logs", employeeId],
    queryFn: () => employeeApi.getEncordSyncLogs(employeeId),
    enabled: !!employeeId && showLogs,
  });

  const syncMutation = useMutation({
    mutationFn: (payload) => employeeApi.triggerEncordSync(employeeId, payload),
    onSuccess: (data) => {
      if (data.job_id) {
        toast.loading("Syncing Encord data...", { id: "sync-toast" });
        setIsPolling(true);
        pollStatus(data.job_id);
      } else {
        toast.success("Successfully synced!");
        queryClient.invalidateQueries({ queryKey: ["employee-profile", employeeId] });
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || "Sync failed.");
    }
  });

  const pollStatus = async (jobId) => {
    try {
      const res = await employeeApi.checkEncordSyncStatus(employeeId, jobId);
      if (res.status === "complete") {
        setIsPolling(false);
        const upserted = res.result?.upserted || 0;
        if (upserted > 0) {
          toast.success(`Successfully synced! Upserted ${upserted} records.`, { id: "sync-toast" });
        } else {
          toast("No new data available.", { id: "sync-toast", icon: "ℹ️" });
        }
        queryClient.invalidateQueries({ queryKey: ["employee-profile", employeeId] });
        queryClient.invalidateQueries({ queryKey: ["encord-sync-logs", employeeId] });
      } else if (res.status === "failed") {
        setIsPolling(false);
        toast.error("Sync job failed.", { id: "sync-toast" });
        queryClient.invalidateQueries({ queryKey: ["encord-sync-logs", employeeId] });
      } else {
        setTimeout(() => pollStatus(jobId), 2000);
      }
    } catch (err) {
      setIsPolling(false);
      toast.error("Failed to check status.", { id: "sync-toast" });
    }
  };

  const handleSync = () => {
    if (syncPeriod === "custom" && !customMonth) {
      toast.error("Please select a month");
      return;
    }
    syncMutation.mutate({ period: syncPeriod, month: syncPeriod === "custom" ? customMonth : null });
  };

  const isSyncing = syncMutation.isPending || isPolling;

  const periodOptions = [
    { label: "Current Month", value: "current_month" },
    { label: "Last Month", value: "last_month" },
    { label: "Custom", value: "custom" },
  ];

  return (
    <div className="relative inline-block text-left z-10">
      <div className="flex items-center gap-1">
        <Dropdown
          options={periodOptions}
          value={syncPeriod}
          onChange={setSyncPeriod}
          className="h-6 min-w-[95px] [&>button]:h-6 [&>button]:py-0 [&>button]:px-2 [&>button]:text-[10px] [&>button]:rounded [&>button]:border-stone-200 [&>button]:bg-stone-50 hover:[&>button]:bg-stone-100 [&>button]:text-stone-600"
          optionsClassName="w-[110px] [&_button]:text-[10px] [&_button]:py-1 [&_button]:px-2"
        />
        
        {syncPeriod === "custom" && (
          <input 
            type="month" 
            value={customMonth}
            onChange={(e) => setCustomMonth(e.target.value)}
            className="text-[10px] border border-stone-200 rounded px-1 py-1 focus:outline-none focus:border-indigo-300 h-6"
          />
        )}
        
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="text-stone-500 hover:text-stone-700 px-2 py-1 rounded bg-stone-50 hover:bg-stone-100 border border-stone-200 transition-colors disabled:opacity-50 h-6 flex items-center justify-center gap-1"
          title="Force Sync Encord Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span className="text-[10px] font-medium">Sync</span>
        </button>
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="text-stone-500 hover:text-stone-700 px-2 py-1 rounded bg-stone-50 hover:bg-stone-100 border border-stone-200 h-6 flex items-center justify-center gap-1"
          title="Sync History"
        >
          <History className="w-3.5 h-3.5" />
          <span className="text-[10px] font-medium">History</span>
        </button>
      </div>

      {showLogs && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-stone-200 shadow-xl rounded-xl p-3 z-50">
          <div className="flex justify-between items-center mb-2 border-b border-stone-100 pb-2">
            <h4 className="text-xs font-bold text-stone-800">Sync History</h4>
            <button onClick={() => setShowLogs(false)} className="text-stone-400 hover:text-stone-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {logs.length === 0 ? (
              <p className="text-[10px] text-stone-400 text-center py-2">No sync logs found.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="text-[10px] flex items-center justify-between bg-stone-50 p-1.5 rounded border border-stone-100">
                  <div>
                    <div className="font-medium text-stone-700">{log.date_range}</div>
                    <div className="text-stone-400">
                      {log.created_at ? format(new Date(log.created_at), "MMM d, h:mm a") : ""}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                      log.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 
                      log.status === 'failed' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700 animate-pulse'
                    }`}>
                      {log.status}
                    </span>
                    {log.status === 'success' && (
                      <span className="text-stone-500 font-medium mt-0.5">{log.records_upserted || 0} recs</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
