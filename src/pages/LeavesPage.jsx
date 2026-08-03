import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leaveApi, employeeApi, wfhApi } from "../services/api";
import { logChange } from "../services/changeLogService";
import Spinner from "../components/ui/LoadingSpinner";
import Button from "../components/ui/Button";
import DatePicker from "../components/ui/DatePicker";
import UserAvatar from "../components/ui/UserAvatar";
import {
  Plus,
  Calendar,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Siren,
  Home,
  BarChart2,
  RotateCcw,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import {
  getEndDateValidationMessage,
  isEndDateBeforeStartDate,
} from "../utils/dateValidation";
import { formatDisplayName } from "../utils/displayName";
import {
  getLeaveTypeBadgeClass,
  getLeaveTypeLabel,
  LEAVE_TYPE_OPTIONS,
  getWorkingDayCount,
  validateConsecutiveLeaves,
  resolveLeaveAppliedDate,
  recordLeaveApplication,
} from "../utils/leaveTypes";
import LeaveCalendar from "../components/LeaveCalendar";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import SearchBar from "../components/ui/SearchBar";
import Dropdown from "../components/ui/Dropdown";
import Table from "../components/ui/Table";
import RowActionMenu from "../components/ui/RowActionMenu";
import ReasonPopover, { ReasonText } from "../components/ui/ReasonPopover";
import EmployeeKPIPanel from "../components/EmployeeKPIPanel";
import Modal from "../components/ui/Modal";
import OverLimitHoverCard from "../components/ui/OverLimitHoverCard";


const TABS = ["Leave List", "Calendar", "WFH Requests", "Employee KPI"];

const FLAG_TONES = {
  orange: "bg-orange-100 text-orange-600 border-orange-200",
  red: "bg-red-100 text-red-600 border-red-200",
};

/**
 * Round icon flag beside an employee's name, labelled on hover.
 *
 * The name cell has very little room, so anything worth flagging goes in as an
 * icon rather than a worded pill — the label lives in the tooltip.
 */
const FlagChip = ({ icon: Icon, label, tone = "orange", pulse = false }) => (
  <div className="relative group flex items-center">
    <span
      className={`inline-flex items-center justify-center h-5 w-5 shrink-0 rounded-full border cursor-help ${FLAG_TONES[tone]} ${pulse ? "animate-pulse" : ""}`}
    >
      <Icon className="w-3 h-3" />
    </span>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block px-2 py-1 bg-white text-slate-700 shadow border border-slate-100 text-xs rounded whitespace-nowrap z-50">
      {label}
    </div>
  </div>
);

const getISTDateTime = () => {
  const d = new Date();
  const options = {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };
  const formatter = new Intl.DateTimeFormat("en-US", options);
  const parts = formatter.formatToParts(d);
  const partMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  const yr = parseInt(partMap.year);
  const mo = parseInt(partMap.month) - 1;
  const dy = parseInt(partMap.day);
  const hr = parseInt(partMap.hour);
  const min = parseInt(partMap.minute);

  return {
    dateStr: `${partMap.year}-${partMap.month}-${partMap.day}`,
    hour: hr,
    minute: min,
  };
};

const checkHalfDayTiming = (startDateStr, slot) => {
  const ist = getISTDateTime();
  const todayStr = ist.dateStr;

  if (slot === "first_half") {
    if (todayStr >= startDateStr) {
      return "First-half leaves must be applied at least one day in advance.";
    }
  } else if (slot === "second_half") {
    if (todayStr > startDateStr) {
      return "Cannot apply for a second-half leave after the request date has passed.";
    } else if (todayStr === startDateStr) {
      if (ist.hour >= 14) {
        return "Second-half leaves must be applied before 2:00 PM on the same day.";
      }
    }
  }
  return null;
};

const LeavesPage = () => {
  const queryClient = useQueryClient();
  // ?tab= lets other screens deep-link a specific tab (the Dashboard's WFH card
  // opens "WFH Requests" directly). Unknown values fall back to the default.
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    TABS.includes(tabParam) ? tabParam : "Leave List",
  );
  const queryParam = searchParams.get("q");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState("");
  // ?q= seeds the search box so a Dashboard card can deep-link straight to one
  // person's requests. It stays editable — clearing the box just clears it.
  const [searchQuery, setSearchQuery] = useState(queryParam || "");

  // Also react to the params changing while the page is already mounted — e.g.
  // clicking a second name in the Dashboard popover without leaving the page.
  // Declared after the state above so the setters are initialised.
  useEffect(() => {
    if (tabParam && TABS.includes(tabParam)) setActiveTab(tabParam);
  }, [tabParam]);

  // Reset page when switching tabs
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);
  useEffect(() => {
    if (queryParam === null) return;
    setSearchQuery(queryParam);
    // Match handleSearchChange: a narrowed list must start at page 1, or the
    // deep-linked person can land off-screen on a stale page.
    setCurrentPage(1);
  }, [queryParam]);
  const [statusFilter, setStatusFilter] = useState("all"); // all | pending | approved | rejected
  const [todayOnly, setTodayOnly] = useState(false); // only leaves that start today
  const [dateSort, setDateSort] = useState(""); // '' | 'asc' (Jan→Dec) | 'desc' (Dec→Jan)
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target))
        setFiltersOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) + (todayOnly ? 1 : 0);
  const [remarkModal, setRemarkModal] = useState(null); // { leaveId }
  const [remark, setRemark] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [wfhDeleteConfirm, setWfhDeleteConfirm] = useState(null);
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ["leaves"],
    queryFn: leaveApi.getAll,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: employeeApi.getAll,
  });

  const { data: wfhRequests = [], isLoading: wfhLoading } = useQuery({
    queryKey: ["wfh"],
    queryFn: () => wfhApi.getAll(),
  });

  // ── Leave mutations ──────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: ({ id, remark }) => leaveApi.approve(id, user.id, remark),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries(["leaves"]);
      setRemarkModal(null);
      setRemark("");
      toast.success("Leave approved");
      logChange({
        category: "Leaves",
        action: "Approved Leave Request",
        actionType: "Approved",
        entity: "Leave",
        entityId: variables?.id || "",
        entityName: "Employee Leave",
        details: [
          { field: "Leave Status", from: "Pending", to: "Approved" },
          { field: "Remark", from: "—", to: variables?.remark || "Approved" },
        ],
      });
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to approve leave"),
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => leaveApi.reject(id, user.id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries(["leaves"]);
      toast.success("Leave rejected");
      logChange({
        category: "Leaves",
        action: "Rejected Leave Request",
        actionType: "Rejected",
        entity: "Leave",
        entityId: id,
        entityName: "Employee Leave",
        details: [{ field: "Leave Status", from: "Pending", to: "Rejected" }],
      });
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to reject leave"),
  });

  const undoApproveMutation = useMutation({
    mutationFn: (id) => leaveApi.undoApprove(id, user.id),
    onSuccess: () => {
      queryClient.invalidateQueries(["leaves"]);
      queryClient.invalidateQueries(["leave-calendar"]);
      toast.success("Leave approval undone");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to undo approval"),
  });

  const undoRejectMutation = useMutation({
    mutationFn: (id) => leaveApi.undoReject(id, user.id),
    onSuccess: () => {
      queryClient.invalidateQueries(["leaves"]);
      queryClient.invalidateQueries(["leave-calendar"]);
      toast.success("Leave rejection undone");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to undo rejection"),
  });

  const createMutation = useMutation({
    mutationFn: leaveApi.create,
    onSuccess: (res, variables) => {
      recordLeaveApplication({ ...variables, id: res?.id || res?.leave_id });
      queryClient.invalidateQueries(["leaves"]);
      setIsModalOpen(false);
      setSelectedLeaveType("");
      setFormEmployeeId("");
      toast.success("Leave record created successfully");

      const targetEmp = employees.find(
        (e) => String(e.id) === String(variables?.employee_id)
      );

      logChange({
        category: "Leaves",
        action: "Applied for Leave",
        actionType: "Applied",
        entity: "Leave",
        entityId: res?.id || "",
        entityName: targetEmp?.name || "Employee",
        details: [
          { field: "Leave Type", from: "—", to: variables?.leave_type || "Casual" },
          { field: "Applied On", from: "—", to: new Date().toLocaleDateString() },
          { field: "Dates", from: "—", to: `${variables?.start_date || ""} to ${variables?.end_date || ""}` },
          { field: "Status", from: "—", to: "Pending Approval" },
        ],
      });
    },
    onError: (err) =>
      toast.error(
        err.response?.data?.detail || err.message || "Failed to create leave",
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: leaveApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(["leaves"]);
      toast.success("Leave deleted");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to delete leave"),
  });

  // ── WFH mutations ────────────────────────────────────────────────
  const wfhApproveMutation = useMutation({
    mutationFn: (id) => wfhApi.approve(id, user.id),
    onSuccess: () => {
      queryClient.invalidateQueries(["wfh"]);
      queryClient.invalidateQueries(["leave-calendar"]);
      toast.success("WFH approved");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to approve WFH"),
  });

  const wfhRejectMutation = useMutation({
    mutationFn: (id) => wfhApi.reject(id, user.id),
    onSuccess: () => {
      queryClient.invalidateQueries(["wfh"]);
      toast.success("WFH rejected");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to reject WFH"),
  });

  const wfhUndoApproveMutation = useMutation({
    mutationFn: (id) => wfhApi.undoApprove(id, user.id),
    onSuccess: () => {
      queryClient.invalidateQueries(["wfh"]);
      queryClient.invalidateQueries(["leave-calendar"]);
      toast.success("WFH approval undone");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to undo approval"),
  });

  const wfhUndoRejectMutation = useMutation({
    mutationFn: (id) => wfhApi.undoReject(id, user.id),
    onSuccess: () => {
      queryClient.invalidateQueries(["wfh"]);
      toast.success("WFH rejection undone");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to undo rejection"),
  });

  const wfhDeleteMutation = useMutation({
    mutationFn: wfhApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(["wfh"]);
      toast.success("WFH request deleted");
    },
  });

  const handleApprove = (leave) => {
    if (leave.flagged) {
      setRemarkModal({ leaveId: leave.leave_id });
    } else {
      approveMutation.mutate({ id: leave.leave_id, remark: null });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const employeeId = formData.get("employee_id");
    const startDate = formData.get("start_date");
    const leaveType = formData.get("leave_type");
    const reason = (formData.get("reason") || "").trim();
    const isHalf = leaveType === "first_half" || leaveType === "second_half";
    const endDate = isHalf ? startDate : formData.get("end_date");
    if (!employeeId) {
      toast.error("Please select an employee");
      return;
    }
    // The API rejects a blank reason (LeaveCreate requires min_length 1).
    if (!reason) {
      toast.error("Please enter a reason for this leave");
      return;
    }

    if (isHalf) {
      const timingErr = checkHalfDayTiming(startDate, leaveType);
      if (timingErr) {
        toast.error(timingErr);
        return;
      }
    } else {
      if (isEndDateBeforeStartDate(startDate, endDate)) {
        toast.error(getEndDateValidationMessage());
        return;
      }
    }

    const empIdInt = parseInt(employeeId);
    const empLeaves = leaves.filter((l) => l.employee_id === empIdInt);

    // Validate consecutive leaves safeguard
    if (
      leaveType !== "wfh" &&
      !validateConsecutiveLeaves(startDate, endDate, empLeaves, null, isHalf)
    ) {
      toast.error(
        "Safe guard triggered: You cannot apply for 5 or more consecutive leaves.",
      );
      return;
    }

    const payload = {
      employee_id: parseInt(employeeId),
      start_date: startDate,
      end_date: endDate,
      leave_type: leaveType,
      reason,
      is_half_day: isHalf,
      half_day_slot: isHalf ? leaveType : null,
      created_at: new Date().toISOString(),
      applied_on: format(new Date(), "yyyy-MM-dd"),
    };
    recordLeaveApplication(payload);
    createMutation.mutate(payload);
  };

  const getEmployeeName = (id) =>
    formatDisplayName(employees.find((e) => e.id === id)?.name) || `Employee #${id}`;
  const activeEmployees = employees.filter((e) => e.status === "active");

  // Pagination: reset to page 1 when tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchQuery("");
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const filteredLeaves = leaves.filter((leave) => {
    if (!leave.start_date || !leave.end_date) return false;
    const name = getEmployeeName(leave.employee_id).toLowerCase();
    const typeLabel = getLeaveTypeLabel(leave.leave_type).toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = name.includes(q) || typeLabel.includes(q);
    const matchesStatus =
      statusFilter === "all" || (leave.status || "pending") === statusFilter;
    const matchesToday =
      !todayOnly || (leave.start_date || "").slice(0, 10) === todayStr;
    return matchesSearch && matchesStatus && matchesToday;
  });
  // Sort by start date. 'YYYY-MM-DD' sorts lexicographically = chronologically,
  // so ascending = Jan→Dec (1→31) and descending = Dec→Jan (31→1).
  if (dateSort) {
    filteredLeaves.sort((a, b) => {
      const cmp = (a.start_date || "").localeCompare(b.start_date || "");
      return dateSort === "asc" ? cmp : -cmp;
    });
  }

  const filteredWFH = wfhRequests.filter((w) => {
    const name = (
      w.employee_name || getEmployeeName(w.employee_id)
    ).toLowerCase();
    const reason = (w.reason || "").toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = name.includes(q) || reason.includes(q);
    const matchesStatus =
      statusFilter === "all" || (w.status || "pending") === statusFilter;
    const matchesToday =
      !todayOnly || (w.wfh_date || "").slice(0, 10) === todayStr;
    return matchesSearch && matchesStatus && matchesToday;
  });
  // Sort by WFH date, same chronological rule as leaves.
  if (dateSort) {
    filteredWFH.sort((a, b) => {
      const cmp = (a.wfh_date || "").localeCompare(b.wfh_date || "");
      return dateSort === "asc" ? cmp : -cmp;
    });
  }

  // Plain coloured text — the pill border read as heavy against the rest of the
  // row, and colour alone separates the three states well enough here.
  const STATUS_BADGE = {
    pending: (
      <span className="text-[13px] font-medium text-amber-600">Pending</span>
    ),
    approved: (
      <span className="text-[13px] font-medium text-emerald-600">Approved</span>
    ),
    rejected: (
      <span className="text-[13px] font-medium text-red-600">Rejected</span>
    ),
  };

  // A menu or popover on one of the last rows would otherwise overflow the card.
  const opensUpward = (rows, row) => {
    const pageStart = (currentPage - 1) * PAGE_SIZE;
    const visible = rows.slice(pageStart, pageStart + PAGE_SIZE);
    const idx = visible.indexOf(row);
    return visible.length <= 2
      ? idx === visible.length - 1
      : idx >= visible.length - 2;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Leave Management
        </h1>
        <p className="mt-0.5 text-[13px] text-slate-500">
          Track employee leaves, WFH requests, and attendance
        </p>
      </div>

      {/* Tabs · Search · Add Leave */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 w-fit">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold rounded-md transition-all whitespace-nowrap ${isActive
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70"
                  : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                {tab === "WFH Requests" ? (
                  <>
                    <Home className="w-3.5 h-3.5" />
                    {tab}
                  </>
                ) : tab === "Calendar" ? (
                  <>
                    <Calendar className="w-3.5 h-3.5" />
                    {tab}
                  </>
                ) : tab === "Employee KPI" ? (
                  <>
                    <BarChart2 className="w-3.5 h-3.5" />
                    {tab}
                  </>
                ) : (
                  tab
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {(activeTab === "Leave List" || activeTab === "WFH Requests") && (
            <div ref={filtersRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Filter className="w-4 h-4 text-slate-500" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-indigo-600 text-white text-[10px] font-semibold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              {filtersOpen && (
                <div className="absolute left-0 mt-1.5 z-40 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-3 space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Status
                    </label>
                    <Dropdown
                      options={[
                        { value: "all", label: "All Status" },
                        { value: "pending", label: "Pending" },
                        { value: "approved", label: "Approved" },
                        { value: "rejected", label: "Rejected" },
                      ]}
                      value={statusFilter}
                      onChange={(v) => {
                        setStatusFilter(v);
                        setCurrentPage(1);
                      }}
                      placeholder="All Status"
                      optionsClassName="w-full"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <span className="text-[13px] font-medium text-slate-600">
                      {activeTab === "WFH Requests"
                        ? "Today's WFH"
                        : "Today's Leaves"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setTodayOnly((t) => !t);
                        setCurrentPage(1);
                      }}
                      className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${todayOnly ? "bg-indigo-600" : "bg-slate-200"}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${todayOnly ? "translate-x-4" : "translate-x-0.5"}`}
                      />
                    </button>
                  </div>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter("all");
                        setTodayOnly(false);
                        setCurrentPage(1);
                      }}
                      className="w-full text-center pt-2.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 border-t border-slate-100"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          {(activeTab === "Leave List" || activeTab === "WFH Requests") && (
            <div className="shrink-0">
              <Dropdown
                options={[
                  { value: "", label: "Sort: Default" },
                  {
                    value: "asc",
                    label:
                      activeTab === "WFH Requests"
                        ? "WFH date: Jan → Dec"
                        : "Start date: Jan → Dec",
                  },
                  {
                    value: "desc",
                    label:
                      activeTab === "WFH Requests"
                        ? "WFH date: Dec → Jan"
                        : "Start date: Dec → Jan",
                  },
                ]}
                value={dateSort}
                onChange={(v) => {
                  setDateSort(v);
                  setCurrentPage(1);
                }}
                placeholder="Sort by date"
              />
            </div>
          )}
          {activeTab !== "Calendar" && activeTab !== "Employee KPI" && (
            <SearchBar
              responsive
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={
                activeTab === "WFH Requests"
                  ? "Search WFH requests..."
                  : "Search leaves..."
              }
            />
          )}
          {activeTab === "Leave List" && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700 shadow-sm transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Leave
            </button>
          )}
        </div>
      </div>

      {/* ── Tab: Leave List ── */}
      {activeTab === "Leave List" && (
        <Table
          variant="untitled"
          allowOverflow
          columns={[
            {
              key: "employee_id",
              // Sized to the longest name plus the avatar and not a pixel more:
              // a wider share here is dead space that pushes Reason away from the
              // name it belongs to, since the names are far shorter than the column.
              label: "Employee",
              width: "w-[19%]",
              render: (_, leave) => {
                const emp = employees.find((e) => e.id === leave.employee_id);
                const empName = getEmployeeName(leave.employee_id);
                return (
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar src={emp?.avatar_url} name={empName} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-slate-800 truncate whitespace-nowrap">
                          {empName}
                        </span>
                        {leave.flagged && (
                          <OverLimitHoverCard leave={leave} allLeaves={leaves} />
                        )}
                        {leave.is_emergency && (
                          <FlagChip
                            icon={Siren}
                            label="Emergency"
                            tone="red"
                            pulse
                          />
                        )}
                      </div>
                      {leave.approval_remark && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          Remark: {leave.approval_remark}
                        </p>
                      )}
                    </div>
                  </div>
                );
              },
            },
            {
              key: "reason",
              label: "Reason",
              align: "center",
              width: "w-[7%]",
              render: (value, leave) => (
                <ReasonPopover
                  reason={value}
                  title={getEmployeeName(leave.employee_id)}
                  subtitle={`${getLeaveTypeLabel(leave.leave_type)} · ${format(
                    new Date(leave.start_date + "T00:00:00"),
                    "MMM d, yyyy",
                  )}`}
                  openUpward={opensUpward(filteredLeaves, leave)}
                />
              ),
            },
            // Every column past the employee is centred on an even 12–14% share,
            // so the row reads as a regular grid instead of left-hugging text with
            // wide gaps opening up between the columns.
            {
              key: "leave_type",
              label: "Leave Type",
              align: "center",
              width: "w-[13%]",
              render: (value) => (
                <span
                  className={`inline-flex whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-medium ${getLeaveTypeBadgeClass(value)}`}
                >
                  {getLeaveTypeLabel(value)
                    .replace("Second Half-day Leave", "2nd Half-day")
                    .replace("First Half-day Leave", "1st Half-day")}
                </span>
              ),
            },
            {
              key: "start_date",
              label: "Start Date",
              align: "center",
              width: "w-[11%]",
              render: (value) => (
                <span className="text-[13px] text-slate-700 whitespace-nowrap">
                  {format(new Date(value + "T00:00:00"), "MMM d, yyyy")}
                </span>
              ),
            },
            {
              key: "end_date",
              label: "End Date",
              align: "center",
              width: "w-[11%]",
              render: (value) => (
                <span className="text-[13px] text-slate-700 whitespace-nowrap">
                  {format(new Date(value + "T00:00:00"), "MMM d, yyyy")}
                </span>
              ),
            },
            {
              key: "applied_on",
              label: "Applied On",
              align: "center",
              width: "w-[11%]",
              render: (_, leave) => {
                const rawApplied = resolveLeaveAppliedDate(leave);
                if (!rawApplied) return <span className="text-[13px] text-slate-400">—</span>;
                const d = new Date(
                  rawApplied.includes("T") ? rawApplied : rawApplied + "T00:00:00"
                );
                if (isNaN(d.getTime())) return <span className="text-[13px] text-slate-400">—</span>;
                return (
                  <span className="text-[13px] text-slate-700 whitespace-nowrap">
                    {format(d, "MMM d, yyyy")}
                  </span>
                );
              },
            },
            {
              key: "leave_id",
              label: "Duration",
              align: "center",
              width: "w-[11%]",
              render: (_, leave) => {
                const duration = getWorkingDayCount(
                  leave.start_date,
                  leave.end_date,
                  leave.is_half_day,
                );
                return (
                  <span className="whitespace-nowrap inline-flex items-center justify-center gap-1">
                    <span className="text-sm font-semibold text-slate-800">
                      {duration}
                    </span>
                    <span className="text-xs text-slate-400">
                      {leave.is_half_day ? (
                        <>
                          day (
                          {leave.half_day_slot === "first_half" || leave.half_day_slot === "1st Half"
                            ? "1st Half"
                            : "2nd Half"}
                          )
                        </>
                      ) : duration === 1 ? (
                        "day"
                      ) : (
                        "days"
                      )}
                    </span>
                  </span>
                );
              },
            },
            {
              key: "status",
              label: "Status",
              align: "center",
              width: "w-[10%]",
              render: (value) => STATUS_BADGE[value] || STATUS_BADGE.pending,
            },
            {
              key: "_actions",
              label: "Actions",
              align: "center",
              width: "w-[7%]",
              render: (_, leave) => {
                const isPending = !leave.status || leave.status === "pending";
                return (
                  <div className="flex items-center justify-center">
                    <RowActionMenu
                      openUpward={opensUpward(filteredLeaves, leave)}
                      actions={[
                        isPending && {
                          label: "Approve",
                          icon: CheckCircle,
                          tone: "success",
                          disabled: approveMutation.isPending,
                          onClick: () => handleApprove(leave),
                        },
                        isPending && {
                          label: "Reject",
                          icon: XCircle,
                          tone: "danger",
                          disabled: rejectMutation.isPending,
                          onClick: () => rejectMutation.mutate(leave.leave_id),
                        },
                        leave.status === "approved" && {
                          label: "Undo approval",
                          icon: RotateCcw,
                          disabled: undoApproveMutation.isPending,
                          onClick: () =>
                            undoApproveMutation.mutate(leave.leave_id),
                        },
                        leave.status === "rejected" && {
                          label: "Undo rejection",
                          icon: RotateCcw,
                          disabled: undoRejectMutation.isPending,
                          onClick: () =>
                            undoRejectMutation.mutate(leave.leave_id),
                        },
                        { divider: true },
                        {
                          label: "Delete",
                          icon: Trash2,
                          tone: "danger",
                          onClick: () => setDeleteTarget(leave),
                        },
                      ]}
                    />
                  </div>
                );
              },
            },
          ]}
          data={filteredLeaves}
          currentPage={currentPage}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          loading={isLoading}
          emptyState={{
            title: "No leaves recorded yet",
            description: "Try adjusting your search query",
          }}
        />
      )}

      {/* ── Tab: Calendar ── */}
      {activeTab === "Calendar" && <LeaveCalendar />}

      {/* ── Tab: WFH Requests ── */}
      {activeTab === "WFH Requests" && (
        <Table
          variant="untitled"
          allowOverflow
          loading={wfhLoading}
          columns={[
            {
              key: "employee_name",
              label: "Employee",
              width: "w-[20%]",
              render: (value, w) => {
                const emp = employees.find(e => e.id === w.employee_id);
                const empName = value ? formatDisplayName(value) : getEmployeeName(w.employee_id);
                return (
                  <div className="flex items-center gap-3">
                    <UserAvatar src={emp?.avatar_url} name={empName} size="sm" />
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-slate-800 truncate whitespace-nowrap">
                        {empName}
                      </span>
                      {w.flagged && (
                        <FlagChip icon={AlertTriangle} label="Over limit" />
                      )}
                    </div>
                  </div>
                );
              },
            },
            {
              key: "wfh_date",
              label: "Date",
              align: "center",
              width: "w-[13%]",
              render: (value) => (
                <span className="text-[13px] text-slate-700 whitespace-nowrap">
                  {format(new Date(value + "T00:00:00"), "MMM d, yyyy")}
                </span>
              ),
            },
            // Five columns here against the Leave List's eight, so the note is
            // spelled out in the row rather than folded behind an icon.
            {
              key: "reason",
              label: "Reason",
              width: "w-[44%]",
              render: (value, w) => (
                <ReasonText
                  reason={value}
                  openUpward={opensUpward(filteredWFH, w)}
                />
              ),
            },
            {
              key: "status",
              label: "Status",
              align: "center",
              width: "w-[12%]",
              render: (value) => STATUS_BADGE[value] || STATUS_BADGE.pending,
            },
            {
              key: "_wfh_actions",
              label: "Actions",
              align: "center",
              width: "w-[11%]",
              render: (_, w) => (
                <div className="flex items-center justify-center">
                  <RowActionMenu
                    openUpward={opensUpward(filteredWFH, w)}
                    actions={[
                      w.status === "pending" && {
                        label: "Approve",
                        icon: CheckCircle,
                        tone: "success",
                        disabled: wfhApproveMutation.isPending,
                        onClick: () => wfhApproveMutation.mutate(w.id),
                      },
                      w.status === "pending" && {
                        label: "Reject",
                        icon: XCircle,
                        tone: "danger",
                        disabled: wfhRejectMutation.isPending,
                        onClick: () => wfhRejectMutation.mutate(w.id),
                      },
                      w.status === "approved" && {
                        label: "Undo approval",
                        icon: RotateCcw,
                        disabled: wfhUndoApproveMutation.isPending,
                        onClick: () => wfhUndoApproveMutation.mutate(w.id),
                      },
                      w.status === "rejected" && {
                        label: "Undo rejection",
                        icon: RotateCcw,
                        disabled: wfhUndoRejectMutation.isPending,
                        onClick: () => wfhUndoRejectMutation.mutate(w.id),
                      },
                      { divider: true },
                      {
                        label: "Delete",
                        icon: Trash2,
                        tone: "danger",
                        onClick: () => setWfhDeleteConfirm(w.id),
                      },
                    ]}
                  />
                </div>
              ),
            },
          ]}
          data={filteredWFH}
          currentPage={currentPage}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          emptyState={{
            title: "No WFH requests yet",
            description: "WFH requests will appear here",
          }}
        />
      )}

      {/* ── Tab: Employee KPI ── */}
      {activeTab === "Employee KPI" && (
        <EmployeeKPIPanel
          employees={employees}
          leaves={leaves}
          wfhRequests={wfhRequests}
        />
      )}

      {/* ── Flagged leave remark modal ── */}
      {remarkModal && (
        <Modal
          isOpen
          onClose={() => {
            setRemarkModal(null);
            setRemark("");
          }}
          size="md"
        >
          <Modal.Body>
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg shrink-0">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">
                  Justification Required
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  This employee has exceeded the monthly paid leave limit (2
                  leaves/month). A justification remark is required to approve
                  this request.
                </p>
              </div>
            </div>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Enter justification for approving this additional leave..."
              className="w-full rounded-xl border border-slate-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows={4}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="cancel"
              onClick={() => {
                setRemarkModal(null);
                setRemark("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={() =>
                approveMutation.mutate({ id: remarkModal.leaveId, remark })
              }
              disabled={!remark.trim() || approveMutation.isPending}
              isLoading={approveMutation.isPending}
            >
              {!approveMutation.isPending && "Approve with Remark"}
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* ── Add Leave Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFormEmployeeId("");
        }}
        size="md"
      >
        <Modal.Header
          onClose={() => {
            setIsModalOpen(false);
            setFormEmployeeId("");
          }}
        >
          <h2 className="text-xl font-semibold text-gray-900">Add Leave</h2>
        </Modal.Header>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <Modal.Body className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee <span className="text-red-500">*</span>
              </label>
              <input type="hidden" name="employee_id" value={formEmployeeId} />
              <Dropdown
                options={[
                  { value: "", label: "Select employee" },
                  ...activeEmployees.map((e) => ({
                    value: String(e.id),
                    label: `${e.name} - ${e.employee_type}`,
                  })),
                ]}
                value={formEmployeeId}
                onChange={setFormEmployeeId}
                placeholder="Select employee"
                disabled={activeEmployees.length === 0}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Leave Type <span className="text-red-500">*</span>
              </label>
              <input
                type="hidden"
                name="leave_type"
                value={selectedLeaveType}
              />
              <Dropdown
                options={[
                  { value: "", label: "Select type" },
                  ...LEAVE_TYPE_OPTIONS,
                ]}
                value={selectedLeaveType}
                onChange={setSelectedLeaveType}
                placeholder="Select type"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                className={
                  selectedLeaveType === "first_half" ||
                    selectedLeaveType === "second_half"
                    ? "col-span-2"
                    : ""
                }
              >
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {selectedLeaveType === "first_half" ||
                    selectedLeaveType === "second_half"
                    ? "Date"
                    : "Start Date"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  type="date"
                  name="start_date"
                  required
                />
              </div>
              {!(
                selectedLeaveType === "first_half" ||
                selectedLeaveType === "second_half"
              ) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      required
                      className="input"
                    />
                  </div>
                )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                name="reason"
                rows={3}
                required
                placeholder="Why is this leave being recorded?"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            {(selectedLeaveType === "first_half" ||
              selectedLeaveType === "second_half") && (
                <div className="rounded-xl border border-indigo-150 bg-indigo-50/50 p-4 text-sm text-indigo-900 space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold text-indigo-950">
                    <Clock className="w-4 h-4 text-indigo-600" /> Half-day Leave
                    Policy & Slots
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-white rounded-lg border border-indigo-100/80">
                      <p className="font-semibold text-indigo-950">
                        First Half-day Leave
                      </p>
                      <p className="text-slate-600 mt-0.5">
                        🕒 Slot: 9:00 AM – 2:00 PM
                      </p>
                      <p className="text-slate-500 mt-1 font-medium italic">
                        ⚠️ Apply at least one day in advance.
                      </p>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-indigo-100/80">
                      <p className="font-semibold text-indigo-950">
                        Second Half-day Leave
                      </p>
                      <p className="text-slate-600 mt-0.5">
                        🕒 Slot: 2:00 PM – 7:00 PM
                      </p>
                      <p className="text-slate-500 mt-1 font-medium italic">
                        ⚠️ Apply before 2:00 PM on the same day.
                      </p>
                    </div>
                  </div>
                </div>
              )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              type="button"
              variant="cancel"
              onClick={() => {
                setIsModalOpen(false);
                setSelectedLeaveType("");
                setFormEmployeeId("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createMutation.isPending || activeEmployees.length === 0
              }
              isLoading={createMutation.isPending}
            >
              {!createMutation.isPending && "Create Leave"}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
      {deleteTarget && (
        <ConfirmDialog
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            if (deleteTarget) {
              deleteMutation.mutate(deleteTarget.leave_id, {
                onSuccess: () => setDeleteTarget(null),
              });
            }
          }}
          isPending={deleteMutation.isPending}
          title="Delete Leave Record"
          message={`Are you sure you want to delete the ${getLeaveTypeLabel(deleteTarget.leave_type)} record for ${getEmployeeName(deleteTarget.employee_id)} (${deleteTarget.start_date} — ${deleteTarget.end_date})?`}
          variant="danger"
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
      <ConfirmDialog
        isOpen={wfhDeleteConfirm !== null}
        onClose={() => setWfhDeleteConfirm(null)}
        onConfirm={() => {
          wfhDeleteMutation.mutate(wfhDeleteConfirm);
          setWfhDeleteConfirm(null);
        }}
        title="Delete WFH Request"
        message="Are you sure you want to delete this WFH request? This action cannot be undone."
        variant="danger"
        confirmText="Delete"
        isPending={wfhDeleteMutation.isPending}
      />
    </div>
  );
};

export default LeavesPage;
