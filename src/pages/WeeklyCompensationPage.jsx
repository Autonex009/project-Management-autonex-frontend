import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarCheck2,
  Clock,
  IndianRupee,
  AlertCircle,
  CheckCircle,
  XCircle,
  Lock,
  Edit2,
  History,
  CheckSquare,
  Square,
  RotateCcw,
  Calendar as CalendarIcon,
  X,
  ChevronDown,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";

import { weeklyCompensationApi, subProjectApi } from "../services/api";
import StatCard from "../components/dashboard/StatCard";
import Dropdown from "../components/ui/Dropdown";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Input from "../components/ui/Input";
import UserAvatar from "../components/ui/UserAvatar";
import ReasonPopover from "../components/ui/ReasonPopover";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import DatePicker from "../components/ui/DatePicker";
import Table from "../components/ui/Table";

// Format seconds into "Xh Ym"
const formatSeconds = (totalSeconds) => {
  if (totalSeconds === null || totalSeconds === undefined) return "—";
  if (totalSeconds === 0) return "0h 00m";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
};

// Compact date format: "Oct 18, Sun"
const formatDateWithDay = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const day = d.getDate();
    return `${month} ${day}, ${dayName}`;
  } catch {
    return dateStr;
  }
};

const formatMonthLabel = (monthStr) => {
  if (!monthStr) return "";
  try {
    const [year, month] = monthStr.split("-");
    const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } catch {
    return monthStr;
  }
};

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const getPastMonths = () => {
  const options = [];
  const now = new Date();
  // Generate past 24 months
  for (let i = 1; i <= 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    options.push({ value: val, label });
  }
  return options;
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "payroll_locked", label: "Payroll Locked" },
];

const TABS = [
  { key: "current", label: "Current Month", icon: CalendarCheck2 },
  { key: "history", label: "History", icon: History },
];

export default function WeeklyCompensationPage() {
  const queryClient = useQueryClient();
  const currentMonth = useMemo(() => getCurrentMonth(), []);
  const historyMonthOptions = useMemo(() => getPastMonths(), []);

  // Tabs state
  const [activeTab, setActiveTab] = useState("current");
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState(
    historyMonthOptions[0]?.value || "2026-10"
  );

  // Active month based on tab
  const selectedMonth = activeTab === "current" ? currentMonth : selectedHistoryMonth;

  // Month date boundary for the DatePicker
  const [monthStart, monthEnd] = useMemo(() => {
    if (!selectedMonth) return [null, null];
    const [yStr, mStr] = selectedMonth.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const s = new Date(y, m - 1, 1);
    const e = new Date(y, m, 0);
    return [s, e];
  }, [selectedMonth]);

  // Filter state
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination state (default 10 shifts at a time for SSR)
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modal states
  const [adjustTimeRecord, setAdjustTimeRecord] = useState(null);
  const [adjustHours, setAdjustHours] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustError, setAdjustError] = useState("");

  const [payoutRecord, setPayoutRecord] = useState(null);
  const [overrideAmount, setOverrideAmount] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [payoutError, setPayoutError] = useState("");

  const [confirmRejectRecord, setConfirmRejectRecord] = useState(null);

  // 1. Fetch Projects for Dropdown Filter
  const { data: projectsData } = useQuery({
    queryKey: ["all-sub-projects"],
    queryFn: () => subProjectApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const projectsList = useMemo(() => {
    if (Array.isArray(projectsData)) return projectsData;
    if (Array.isArray(projectsData?.items)) return projectsData.items;
    return [];
  }, [projectsData]);

  const projectOptions = useMemo(() => {
    const list = [{ value: "all", label: "All Projects" }];
    projectsList.forEach((p) => {
      list.push({
        value: String(p.id),
        label: p.batch_name || p.name || `Project #${p.id}`,
      });
    });
    return list;
  }, [projectsList]);

  // Query Parameters for Server-side Pagination & Filtering (10 per page)
  const queryParams = useMemo(() => {
    const params = {
      month: selectedMonth,
      page,
      page_size: pageSize,
    };
    if (statusFilter !== "all") params.status = statusFilter;
    if (projectFilter !== "all") params.project_id = Number(projectFilter);
    if (dateRange.startDate) params.start_date = dateRange.startDate;
    if (dateRange.endDate) params.end_date = dateRange.endDate;
    if (searchQuery.trim()) params.search = searchQuery.trim();
    return params;
  }, [selectedMonth, page, pageSize, statusFilter, projectFilter, dateRange, searchQuery]);

  // 2. Fetch Month Records
  const { data: monthSummary, isLoading, isError } = useQuery({
    queryKey: ["weekly-compensation", queryParams],
    queryFn: () => weeklyCompensationApi.getRecords(queryParams),
    staleTime: 30000,
  });

  const isPayrollFinalized = Boolean(monthSummary?.is_payroll_finalized);

  const records = useMemo(() => {
    if (Array.isArray(monthSummary)) return monthSummary;
    if (Array.isArray(monthSummary?.records)) return monthSummary.records;
    return [];
  }, [monthSummary]);

  const totalFilteredRecords = monthSummary?.total_filtered_records ?? monthSummary?.total_records ?? records.length;

  // Reset page helper when any filter changes
  const handleFilterChange = (setter) => (val) => {
    setter(val);
    setPage(1);
    setSelectedIds(new Set());
  };

  const handleClearFilters = () => {
    setProjectFilter("all");
    setStatusFilter("all");
    setDateRange({ startDate: "", endDate: "" });
    setSearchQuery("");
    setPage(1);
    setSelectedIds(new Set());
  };

  const hasActiveFilters =
    projectFilter !== "all" ||
    statusFilter !== "all" ||
    Boolean(dateRange.startDate || dateRange.endDate) ||
    Boolean(searchQuery.trim());

  // Aggregate Metrics for KPI Cards
  const metrics = useMemo(() => {
    const totalShifts = monthSummary?.total_records ?? records.length;
    let totalSeconds = 0;
    records.forEach((r) => {
      totalSeconds += r.final_duration_seconds || 0;
    });

    const pendingCount = monthSummary?.pending_count ?? records.filter((r) => r.status === "pending").length;
    const totalPayoutVal = monthSummary?.total_effective_payout ?? 0;

    return {
      totalShifts,
      totalHoursStr: formatSeconds(totalSeconds),
      totalPayoutStr: `₹${Math.round(totalPayoutVal).toLocaleString("en-IN")}`,
      pendingCount,
    };
  }, [monthSummary, records]);

  // ── Cache Surgery Helper: patch row directly in RAM across queries ──────────
  const patchRecordInCache = (updatedRow) => {
    queryClient.setQueriesData({ queryKey: ["weekly-compensation"] }, (old) => {
      if (!old) return old;
      if (Array.isArray(old)) {
        return old.map((row) => (row.id === updatedRow.id ? updatedRow : row));
      }
      const updatedList = (old.records || []).map((row) =>
        row.id === updatedRow.id ? updatedRow : row
      );
      return {
        ...old,
        records: updatedList,
      };
    });
  };

  const patchMultipleInCache = (updatedRows) => {
    const updatedMap = new Map(updatedRows.map((r) => [r.id, r]));
    queryClient.setQueriesData({ queryKey: ["weekly-compensation"] }, (old) => {
      if (!old) return old;
      if (Array.isArray(old)) {
        return old.map((row) => updatedMap.get(row.id) || row);
      }
      const updatedList = (old.records || []).map(
        (row) => updatedMap.get(row.id) || row
      );
      return {
        ...old,
        records: updatedList,
      };
    });
  };

  // 3. Adjust Time Mutation
  const adjustTimeMutation = useMutation({
    mutationFn: ({ id, hours, note }) =>
      weeklyCompensationApi.adjustTime(id, {
        final_hours: parseFloat(hours),
        final_duration_hours: parseFloat(hours),
        edit_note: note,
        note,
      }),
    onSuccess: (updated) => {
      patchRecordInCache(updated);
      toast.success("Final time adjusted and payout recalculated!", { id: "time-adjust" });
      setAdjustTimeRecord(null);
    },
    onError: (err) => {
      const detail = err?.response?.data?.detail;
      let msg = "Failed to adjust time.";
      if (typeof detail === "string") msg = detail;
      else if (Array.isArray(detail)) msg = detail.map((d) => d.msg || JSON.stringify(d)).join(", ");
      setAdjustError(msg);
    },
  });

  // 4. Override Payout Mutation
  const overridePayoutMutation = useMutation({
    mutationFn: ({ id, amount, note }) =>
      weeklyCompensationApi.overridePayout(id, {
        override_payout: parseFloat(amount),
        edit_note: note,
        note,
      }),
    onSuccess: (updated) => {
      patchRecordInCache(updated);
      toast.success("Payout amount overridden successfully!", { id: "payout-override" });
      setPayoutRecord(null);
    },
    onError: (err) => {
      const detail = err?.response?.data?.detail;
      let msg = "Failed to override payout.";
      if (typeof detail === "string") msg = detail;
      else if (Array.isArray(detail)) msg = detail.map((d) => d.msg || JSON.stringify(d)).join(", ");
      setPayoutError(msg);
    },
  });

  // 5. Single Approve Mutation
  const approveMutation = useMutation({
    mutationFn: (id) => weeklyCompensationApi.approve(id),
    onSuccess: (updated) => {
      patchRecordInCache(updated);
      toast.success("Shift approved!", { id: `approve-${updated.id}` });
    },
    onError: (err) => {
      const msg = err?.response?.data?.detail || "Failed to approve shift.";
      toast.error(typeof msg === "string" ? msg : "Approval failed");
    },
  });

  // 6. Single Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: (id) => weeklyCompensationApi.reject(id),
    onSuccess: (updated) => {
      patchRecordInCache(updated);
      toast.success("Shift marked as rejected.", { id: `reject-${updated.id}` });
      setConfirmRejectRecord(null);
    },
    onError: (err) => {
      const msg = err?.response?.data?.detail || "Failed to reject shift.";
      toast.error(typeof msg === "string" ? msg : "Rejection failed");
    },
  });

  // 7. Bulk Approve Mutation
  const bulkApproveMutation = useMutation({
    mutationFn: (ids) => weeklyCompensationApi.bulkApprove(ids),
    onSuccess: (res) => {
      const updatedRecords = Array.isArray(res) ? res : res?.records || [];
      if (updatedRecords.length > 0) {
        patchMultipleInCache(updatedRecords);
      }
      setSelectedIds(new Set());
      const count = updatedRecords.length || res?.count || 0;
      toast.success(res?.message || `Approved ${count} shift${count === 1 ? "" : "s"} atomically!`, {
        id: "bulk-approve-toast",
      });
    },
    onError: (err) => {
      const detail = err?.response?.data?.detail;
      let msg = "Bulk approval failed.";
      if (typeof detail === "string") msg = detail;
      else if (Array.isArray(detail)) msg = detail.map((d) => d.msg || JSON.stringify(d)).join(", ");
      toast.error(msg);
    },
  });

  // Bulk Selection Handlers
  const toggleSelectAll = useCallback(() => {
    if (isPayrollFinalized) return;
    if (selectedIds.size > 0) {
      setSelectedIds(new Set());
    } else {
      const eligible = records
        .filter((r) => !r.is_locked && !isPayrollFinalized && r.status !== "approved" && r.status !== "payroll_locked")
        .map((r) => r.id);
      setSelectedIds(new Set(eligible));
    }
  }, [isPayrollFinalized, selectedIds.size, records]);

  const toggleSelectOne = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Columns definition for the shared Table component
  const columns = useMemo(() => [
    {
      key: "select",
      label: (
        <button
          type="button"
          onClick={toggleSelectAll}
          className="text-slate-400 hover:text-slate-600 focus:outline-none"
          title="Select / Deselect all eligible shifts"
        >
          {selectedIds.size > 0 ? (
            <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
          ) : (
            <Square className="w-3.5 h-3.5" />
          )}
        </button>
      ),
      width: "w-10",
      align: "center",
      render: (_, record) => {
        const isSelected = selectedIds.has(record.id);
        const isLocked = record.is_locked || isPayrollFinalized;
        const isApproved = record.status === "approved" || record.status === "payroll_locked";
        const canSelect = !isLocked && !isApproved;

        return (
          <button
            type="button"
            disabled={!canSelect}
            onClick={(e) => {
              e.stopPropagation();
              toggleSelectOne(record.id);
            }}
            className={`focus:outline-none ${
              !canSelect
                ? "opacity-30 cursor-not-allowed"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {isSelected ? (
              <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
          </button>
        );
      },
    },
    {
      key: "employee",
      label: "Employee",
      width: "w-[18%]",
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <UserAvatar
            src={record.avatar_url || record.employee_avatar_url}
            name={record.employee_name}
            size="sm"
          />
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 leading-tight truncate text-[12.5px]">
              {record.employee_name || `Employee #${record.employee_id}`}
            </p>
            {record.employee_designation && (
              <p className="text-[11px] text-slate-400 leading-tight truncate mt-0.5">
                {record.employee_designation}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "project",
      label: "Project",
      width: "w-[14%]",
      render: (_, record) =>
        record.project_name ? (
          <span
            className="inline-block rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 truncate max-w-[140px]"
            title={record.project_name}
          >
            {record.project_name}
          </span>
        ) : (
          <span className="text-[12px] text-slate-400 font-medium">—</span>
        ),
    },
    {
      key: "date",
      label: "Date & Day",
      width: "w-[12%]",
      render: (_, record) => (
        <span className="font-medium text-slate-700 text-[12px] whitespace-nowrap">
          {formatDateWithDay(record.work_date)}
        </span>
      ),
    },
    {
      key: "portal_time",
      label: "Check In – Out",
      width: "w-[11%]",
      render: (_, record) =>
        record.portal_duration_seconds !== null ? (
          <span className="font-medium text-slate-700 text-[12px]">
            {formatSeconds(record.portal_duration_seconds)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
            <AlertCircle className="w-3 h-3" />
            Missed Out
          </span>
        ),
    },
    {
      key: "encord_time",
      label: "Encord Time",
      width: "w-[10%]",
      render: (_, record) =>
        record.encord_duration_seconds > 0 ? (
          <span className="font-medium text-slate-700 text-[12px]">
            {formatSeconds(record.encord_duration_seconds)}
          </span>
        ) : (
          <span className="text-slate-400 text-[12px]">—</span>
        ),
    },
    {
      key: "final_time",
      label: "Final Time",
      width: "w-[10%]",
      render: (_, record) => {
        const isLocked = record.is_locked || isPayrollFinalized;
        return (
          <div className="flex items-center gap-1.5 text-[12px]">
            <span className="font-semibold text-slate-800">
              {(record.final_duration_seconds / 3600).toFixed(1)}h
            </span>
            {record.portal_duration_seconds === null && (
              <span className="text-[9.5px] text-indigo-600 bg-indigo-50 px-1 rounded font-medium">
                (Encord)
              </span>
            )}
            {!isLocked && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAdjustTimeRecord(record);
                  setAdjustHours((record.final_duration_seconds / 3600).toFixed(1));
                  setAdjustNote(record.edit_note || "");
                  setAdjustError("");
                }}
                className="text-slate-400 hover:text-indigo-600 p-0.5 rounded transition-colors"
                title="Adjust final payable duration"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: "effective_payout",
      label: "Effective Payout",
      width: "w-[12%]",
      render: (_, record) => {
        const isLocked = record.is_locked || isPayrollFinalized;
        return (
          <div className="flex items-center gap-1 text-[12px]">
            <span className="font-bold text-slate-900 text-[12.5px]">
              ₹{parseFloat(record.effective_payout).toLocaleString("en-IN", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
            </span>
            {record.override_payout !== null && (
              <span className="text-[9.5px] text-amber-700 bg-amber-50 px-1 rounded font-medium border border-amber-200">
                Overridden
              </span>
            )}
            {!isLocked && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPayoutRecord(record);
                  setOverrideAmount(record.effective_payout);
                  setPayoutNote(record.edit_note || "");
                  setPayoutError("");
                }}
                className="text-slate-400 hover:text-indigo-600 p-0.5 rounded transition-colors"
                title="Override payout amount"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: "audit_note",
      label: "Audit Note",
      width: "w-[8%]",
      align: "center",
      render: (_, record) =>
        record.edit_note ? (
          <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
            <ReasonPopover
              reason={record.edit_note}
              title="Audit Trail Note"
              subtitle={
                record.last_edited_by_name
                  ? `Edited by ${record.last_edited_by_name}`
                  : undefined
              }
            />
          </div>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        ),
    },
    {
      key: "status",
      label: "Status",
      width: "w-[12%]",
      align: "center",
      render: (_, record) => {
        const isFinalizedApproved =
          record.status === "payroll_locked" ||
          (record.status === "approved" && isPayrollFinalized);

        if (isFinalizedApproved) {
          return (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shadow-xs"
              title="Approved & Finalized in Payroll"
            >
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              <span>Approved</span>
              <Lock className="w-2.5 h-2.5 text-emerald-700 ml-0.5" />
            </span>
          );
        }
        if (record.status === "approved") {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              Approved
            </span>
          );
        }
        if (record.status === "rejected") {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              <XCircle className="w-3 h-3 text-rose-600" />
              Rejected
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <Clock className="w-3 h-3 text-amber-500" />
            Pending
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      width: "w-[10%]",
      align: "right",
      render: (_, record) => {
        const isLocked = record.is_locked || isPayrollFinalized;
        if (isLocked) {
          return <span className="text-xs text-slate-300 select-none pr-1.5">—</span>;
        }
        return (
          <div className="flex items-center justify-end gap-1">
            {record.status !== "approved" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => approveMutation.mutate(record.id)}
                isLoading={approveMutation.isPending && approveMutation.variables === record.id}
                className="!py-0.5 !px-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              >
                Approve
              </Button>
            )}
            {record.status !== "rejected" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmRejectRecord(record)}
                className="!py-0.5 !px-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                Reject
              </Button>
            )}
          </div>
        );
      },
    },
  ], [selectedIds, isPayrollFinalized, approveMutation, toggleSelectAll, toggleSelectOne]);

  return (
    <div className="space-y-3.5">
      {/* ── Tabs (Current Month vs History) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 -mt-1 pb-1">
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSelectedIds(new Set());
                  setProjectFilter("all");
                  setStatusFilter("all");
                  setDateRange({ startDate: "", endDate: "" });
                  setSearchQuery("");
                  setPage(1);
                }}
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                  isActive
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* History Tab Month Dropdown */}
        {activeTab === "history" && (
          <div className="flex items-center gap-2 pb-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Select Month:
            </span>
            <Dropdown
              options={historyMonthOptions}
              value={selectedHistoryMonth}
              onChange={(val) => {
                setSelectedHistoryMonth(val);
                setSelectedIds(new Set());
                setPage(1);
              }}
              searchable={true}
              className="w-52 [&>button]:!h-9 [&>button]:!text-[13px] [&>button]:!py-0 [&>button]:shadow-xs"
            />
          </div>
        )}
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Shifts"
          value={metrics.totalShifts}
          icon={CalendarCheck2}
          tone="indigo"
          hint={
            activeTab === "current"
              ? `Current month (${formatMonthLabel(currentMonth)})`
              : `Month of ${formatMonthLabel(selectedHistoryMonth)}`
          }
        />
        <StatCard
          title="Payable Hours"
          value={metrics.totalHoursStr}
          icon={Clock}
          tone="sky"
          hint="Sum of final approved durations"
        />
        <StatCard
          title="Total Compensation"
          value={metrics.totalPayoutStr}
          icon={IndianRupee}
          tone="emerald"
          hint="Gross weekly comp amount"
        />
        <StatCard
          title="Pending Approvals"
          value={metrics.pendingCount}
          icon={AlertCircle}
          tone="amber"
          hint={
            metrics.pendingCount > 0
              ? `${metrics.pendingCount} shifts awaiting review`
              : "All shifts reviewed"
          }
        />
      </div>

      {/* ── Filter & Search Toolbar (Directly on canvas - NO parent card box) ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Left: Search Bar with matching h-9 height */}
        <div className="relative w-full sm:w-72 lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search employee or project..."
            className="w-full h-9 pl-9 pr-8 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-400 transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right-Most: Lock Indicator (if finalized) + Calendar + Project + Status Filters + Bulk Actions */}
        <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
          {/* Payroll Finalized & Locked Indicator (Symbol on left of week dates, detail on hover) */}
          {isPayrollFinalized && (
            <div className="group relative flex items-center shrink-0">
              <button
                type="button"
                onClick={() => (window.location.href = "/admin/payroll")}
                className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-colors shadow-xs cursor-pointer"
                title="Payroll Finalized & Locked (Click to open Payroll)"
              >
                <Lock className="w-4 h-4 text-amber-600" />
              </button>

              {/* Hover card showing rich detail */}
              <div className="absolute right-0 sm:right-auto sm:left-0 top-full mt-2 hidden group-hover:flex flex-col gap-2 z-50 p-3 bg-white text-slate-800 rounded-xl shadow-xl border border-amber-200 min-w-[270px] max-w-[320px] pointer-events-auto animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 leading-tight">
                      Payroll Finalized &amp; Locked
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      All approved shifts for {formatMonthLabel(selectedMonth)} are locked into the finalized payroll run.
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => (window.location.href = "/admin/payroll")}
                    className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Go to Payroll</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Calendar Range View (Select Week / Weeks / Date Range - matching exact h-9) */}
          <DatePicker
            type="range"
            accentColor="indigo"
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            minDate={monthStart}
            maxDate={monthEnd}
            className="w-52"
            onRangeChange={(range) => {
              setDateRange(range);
              setPage(1);
            }}
            customTrigger={({ isOpen, displayValue }) => (
              <div
                className={`relative w-full h-9 pl-9 pr-3 rounded-lg border bg-white flex items-center justify-between text-[13px] transition-all shadow-xs cursor-pointer select-none ${
                  isOpen
                    ? "border-indigo-400 ring-2 ring-indigo-500/15 text-slate-900"
                    : displayValue
                      ? "border-indigo-300 bg-indigo-50/30 text-indigo-900 font-medium"
                      : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <CalendarIcon
                  className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${
                    isOpen || displayValue ? "text-indigo-600" : "text-slate-400"
                  }`}
                />
                <span className={`truncate text-[13px] ${displayValue ? "text-slate-800 font-medium" : "text-slate-500"}`}>
                  {displayValue || "Select Week(s) / Dates"}
                </span>
                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                  {displayValue && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setDateRange({ startDate: "", endDate: "" });
                        setPage(1);
                      }}
                      className="p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Clear date range"
                    >
                      <X className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </div>
            )}
          />

          {/* Project Filter - exact h-9 */}
          <div className="w-44 [&>button]:!h-9 [&>button]:!text-[13px] [&>button]:!py-0 [&>button]:shadow-xs">
            <Dropdown
              options={projectOptions}
              value={projectFilter}
              onChange={handleFilterChange(setProjectFilter)}
              placeholder="All Projects"
              searchable={true}
            />
          </div>

          {/* Status Filter - exact h-9 */}
          <div className="w-36 [&>button]:!h-9 [&>button]:!text-[13px] [&>button]:!py-0 [&>button]:shadow-xs">
            <Dropdown
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={handleFilterChange(setStatusFilter)}
              placeholder="All Statuses"
            />
          </div>

          {/* Clear All Filters - exact h-9 */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 h-9 px-2.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200 rounded-lg transition-colors shadow-xs"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          {/* Bulk Action Button */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 h-9 rounded-lg shadow-xs animate-fade-in shrink-0">
              <span className="text-xs font-semibold text-indigo-700">
                {selectedIds.size} selected
              </span>
              <Button
                size="sm"
                variant="primary"
                onClick={() => bulkApproveMutation.mutate(Array.from(selectedIds))}
                isLoading={bulkApproveMutation.isPending}
                loadingText="Approving..."
                className="!h-7 !py-0 !px-2.5 text-xs font-semibold"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Bulk Approve
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Shifts Table with Shared Table Component & Built-in SSR Pagination (10 per page) ── */}
      {isError ? (
        <div className="p-10 text-center text-xs text-red-600 bg-white rounded-2xl border border-red-200">
          Failed to load compensation records for {selectedMonth}.
        </div>
      ) : (
        <Table
          variant="untitled"
          allowOverflow={true}
          columns={columns}
          data={records}
          loading={isLoading}
          skeletonRows={10}
          pageSize={pageSize}
          currentPage={page}
          totalItems={totalFilteredRecords}
          onPageChange={(p) => setPage(p)}
          cellPadding="px-3.5 py-2"
          rowHeight="h-[48px]"
          rowClassName={(record) => (selectedIds.has(record.id) ? "!bg-indigo-50/35" : "")}
          emptyState={{
            title: "No shifts found",
            description: `No weekend or holiday shifts logged for ${formatMonthLabel(selectedMonth)} under current filters.`,
          }}
        />
      )}

      {/* ── Adjust Final Time Modal ── */}
      {adjustTimeRecord && (
        <Modal
          isOpen={Boolean(adjustTimeRecord)}
          onClose={() => setAdjustTimeRecord(null)}
          size="md"
        >
          <Modal.Header onClose={() => setAdjustTimeRecord(null)}>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-semibold text-slate-900">Adjust Final Payable Time</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {adjustTimeRecord.employee_name} — {formatDateWithDay(adjustTimeRecord.work_date)}
            </p>
          </Modal.Header>

          <Modal.Body className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl text-xs">
              <div>
                <span className="text-slate-400">Portal Duration:</span>
                <p className="font-semibold text-slate-700">
                  {formatSeconds(adjustTimeRecord.portal_duration_seconds)}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Encord Telemetry:</span>
                <p className="font-semibold text-slate-700">
                  {formatSeconds(adjustTimeRecord.encord_duration_seconds)}
                </p>
              </div>
            </div>

            <Input
              label="Final Duration (in Hours)"
              type="number"
              step="0.1"
              min="0"
              max="16"
              value={adjustHours}
              onChange={(e) => setAdjustHours(e.target.value)}
              placeholder="e.g. 7.5"
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Mandatory Reason Note <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="Explain why this adjustment is being made (e.g. annotator forgot check-out; verified continuous labeling in Encord)..."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {adjustError && (
              <p className="text-xs font-medium text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                {adjustError}
              </p>
            )}
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="cancel"
              onClick={() => setAdjustTimeRecord(null)}
              disabled={adjustTimeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!adjustNote.trim()) {
                  setAdjustError("A reason note is required for all adjustments.");
                  return;
                }
                adjustTimeMutation.mutate({
                  id: adjustTimeRecord.id,
                  hours: adjustHours,
                  note: adjustNote.trim(),
                });
              }}
              isLoading={adjustTimeMutation.isPending}
              loadingText="Saving..."
            >
              Save Adjustment
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* ── Override Payout Modal ── */}
      {payoutRecord && (
        <Modal
          isOpen={Boolean(payoutRecord)}
          onClose={() => setPayoutRecord(null)}
          size="md"
        >
          <Modal.Header onClose={() => setPayoutRecord(null)}>
            <div className="flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-semibold text-slate-900">Override Payout Amount</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {payoutRecord.employee_name} — {formatDateWithDay(payoutRecord.work_date)}
            </p>
          </Modal.Header>

          <Modal.Body className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Calculated Payout:</span>
                <span className="font-semibold text-slate-700">₹{payoutRecord.calculated_payout}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hourly Rate:</span>
                <span className="font-semibold text-slate-700">₹{payoutRecord.hourly_rate}/hr</span>
              </div>
            </div>

            <Input
              label="Override Payout (₹)"
              type="number"
              step="1"
              min="0"
              value={overrideAmount}
              onChange={(e) => setOverrideAmount(e.target.value)}
              placeholder="e.g. 1000"
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Mandatory Reason Note <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={payoutNote}
                onChange={(e) => setPayoutNote(e.target.value)}
                placeholder="Explain why this payout is being overridden (e.g. rounded to round figure per company agreement)..."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {payoutError && (
              <p className="text-xs font-medium text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                {payoutError}
              </p>
            )}
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="cancel"
              onClick={() => setPayoutRecord(null)}
              disabled={overridePayoutMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!payoutNote.trim()) {
                  setPayoutError("A reason note is required for all payout overrides.");
                  return;
                }
                overridePayoutMutation.mutate({
                  id: payoutRecord.id,
                  amount: overrideAmount,
                  note: payoutNote.trim(),
                });
              }}
              isLoading={overridePayoutMutation.isPending}
              loadingText="Saving..."
            >
              Save Override
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* ── Rejection Confirmation Dialog ── */}
      <ConfirmDialog
        isOpen={Boolean(confirmRejectRecord)}
        onClose={() => setConfirmRejectRecord(null)}
        onConfirm={() => {
          if (confirmRejectRecord) {
            rejectMutation.mutate(confirmRejectRecord.id);
          }
        }}
        title="Reject Shift Compensation"
        message={`Are you sure you want to reject the weekend shift for ${confirmRejectRecord?.employee_name}?`}
        details={[
          { label: "Date", value: formatDateWithDay(confirmRejectRecord?.work_date) },
          { label: "Payable Time", value: confirmRejectRecord?.final_time_formatted || "—" },
          {
            label: "Payroll Impact",
            value: `₹${Number(confirmRejectRecord?.effective_payout || 0).toLocaleString("en-IN")} excluded`,
            highlight: true,
          },
        ]}
        confirmText="Reject Shift"
        variant="danger"
        isPending={rejectMutation.isPending}
      />
    </div>
  );
}
