import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  leaveApi,
  allocationApi,
  employeeApi,
  subProjectApi,
  wfhApi,
  parentProjectApi,
} from "../../services/api";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import Modal from "../../components/ui/Modal";
import DatePicker from "../../components/ui/DatePicker";
import SearchBar from "../../components/ui/SearchBar";
import Dropdown from "../../components/ui/Dropdown";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import RowActionMenu from "../../components/ui/RowActionMenu";
import ReasonPopover, { ReasonText } from "../../components/ui/ReasonPopover";
import UserAvatar from "../../components/ui/UserAvatar";
import FlagChip from "../../components/ui/FlagChip";
import { LEAVE_STATUS_TEXT } from "../../components/ui/LeaveStatusText";
import OverLimitHoverCard from "../../components/ui/OverLimitHoverCard";
import LeaveCalendar from "../../components/LeaveCalendar";
import EmployeeKPIPanel from "../../components/EmployeeKPIPanel";
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
import { getPmEmployeeId, getPmSubProjects } from "../../utils/pmScope";
import {
  getEndDateValidationMessage,
  isEndDateBeforeStartDate,
} from "../../utils/dateValidation";
import { formatDisplayName, nameSearchText } from "../../utils/displayName";
import {
  getLeaveTypeLabel,
  getLeaveTypeBadgeClass,
  getWorkingDayCount,
  resolveLeaveAppliedDate,
  validateConsecutiveLeaves,
  recordLeaveApplication,
  LEAVE_TYPE_OPTIONS,
} from "../../utils/leaveTypes";
import { checkHalfDayTiming } from "../../utils/halfDayTiming";
import { makeOpensUpward } from "../../utils/tableRows";
import {
  canDecideForEmployee,
  canRoleActOnRequests,
} from "../../utils/roleAccess";

const TABS = ["Leave Requests", "Calendar", "WFH Requests", "Employee KPI"];

// Which roles get the action controls comes from utils/roleAccess — team leads decide for
// their own team members exactly as a program manager does, and a literal list here has
// twice been written without them. The server still has the final say per row
// (project_scope.can_manage_employee): a lead may not action a *peer lead's* request, and
// nobody but an admin may action a manager's.

/**
 * Who decided this request, under the employee's name.
 *
 * Worth showing because it is not inferable: any manager *or lead* of any project the
 * person is on may decide, so a lead sitting on two projects can be signed off by either
 * project's PM. `approved_by_name` is resolved server-side — `approved_by` is a users.id,
 * which the client has no way to turn into a name.
 *
 * Nothing is rendered while a request is still pending, or for older rows that predate the
 * approver being recorded.
 */
const DecidedBy = ({ request }) => {
  const status = (request?.status || "").toLowerCase();
  if (status !== "approved" && status !== "rejected") return null;
  if (!request.approved_by_name) return null;
  return (
    <p className="mt-0.5 truncate text-xs text-slate-400">
      {status === "approved" ? "Approved" : "Rejected"} by{" "}
      <span className="font-medium text-slate-500">
        {formatDisplayName(request.approved_by_name)}
      </span>
    </p>
  );
};

const PMLeavesPage = () => {
  const queryClient = useQueryClient();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = localStorage.getItem("role") || user.role || "pm";
  const canAct = canRoleActOnRequests(role);
  const employeeId = getPmEmployeeId(user);

  const [activeTab, setActiveTab] = useState("Leave Requests");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // ── Toolbar state ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | pending | approved | rejected
  const [todayOnly, setTodayOnly] = useState(false); // only requests dated today
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

  // ── Modal state ──────────────────────────────────────────────────
  const [remarkModal, setRemarkModal] = useState(null); // { leaveId }
  const [remark, setRemark] = useState("");
  const [wfhRemarkModal, setWfhRemarkModal] = useState(null); // { wfhId, employeeName }
  const [wfhRemark, setWfhRemark] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [wfhDeleteConfirm, setWfhDeleteConfirm] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState("");
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Quick-fill options for the flagged-WFH justification. The first is derived
  // from the signed-in user's actual role so the stored remark stays truthful —
  // it is kept as the approval's audit trail.
  const approverLabel =
    { admin: "Admin", pm: "PM", hr: "HR", team_lead: "Team Lead" }[role] || "PM";
  const WFH_REMARK_PRESETS = [
    `Approved by ${approverLabel}`,
    "Approved — business requirement",
    "Approved — one-off exception",
  ];

  const { data: parentProjects = [] } = useQuery({
    queryKey: ["parent-projects"],
    queryFn: () => parentProjectApi.getAll(),
  });

  const { data: teamData, isLoading: teamDataLoading } = useQuery({
    queryKey: ["team-data"],
    queryFn: () => employeeApi.getTeamData(),
  });
  
  const allLeaves = teamData?.leaves || [];
  const allocations = teamData?.allocations || [];
  const employees = teamData?.employees || [];
  const projects = teamData?.projects || [];
  const wfhRequests = teamData?.wfh_requests || [];
  
  const isLoading = teamDataLoading;
  const allocationsLoading = teamDataLoading;
  const employeesLoading = teamDataLoading;
  const wfhLoading = teamDataLoading;


  // ── PM scope ─────────────────────────────────────────────────────
  const scopedProjects = getPmSubProjects(
    projects,
    parentProjects,
    employeeId,
    allocations,
  );
  const myProjectIds = new Set(scopedProjects.map((p) => p.id));
  const teamEmployeeIds = new Set(
    allocations
      .filter((a) => myProjectIds.has(a.sub_project_id))
      .map((a) => a.employee_id),
  );
  // Narrow the team to the people whose requests this viewer may actually decide. Being on
  // one of their projects is not enough on its own — managers and leads are allocated to the
  // projects they run, so the raw list contains:
  //
  //   * the viewer themselves     → belongs on My Leaves; nobody signs off their own
  //   * program managers and HR   → an admin's call, whoever else is on the project
  //   * other team leads          → their own program manager's call, not a peer lead's
  //
  // The server refuses all three (project_scope.can_manage_employee), so listing them would
  // only offer actions that 403 — and imply they were the viewer's responsibility. Filtering
  // the set rather than the buttons also keeps the Add Leave picker and the KPI tab honest,
  // since both derive from it.
  // Skipped until the roster has loaded: with `employees` still empty every tier lookup
  // fails and the table would flash "no requests" before filling in.
  if (employees.length > 0) {
    [...teamEmployeeIds].forEach((id) => {
      const employee = employees.find((e) => e.id === id);
      if (
        !canDecideForEmployee({
          viewerRole: role,
          viewerEmployeeId: employeeId,
          employee,
        })
      )
        teamEmployeeIds.delete(id);
    });
  }

  const teamLeaves = allLeaves.filter(
    (l) => teamEmployeeIds.has(l.employee_id) && l.start_date && l.end_date,
  );
  const teamLeavesForKpi = allLeaves.filter((l) =>
    teamEmployeeIds.has(l.employee_id),
  );
  const teamWfh = wfhRequests.filter((w) => teamEmployeeIds.has(w.employee_id));

  const getEmployeeName = (id) =>
    formatDisplayName(employees.find((e) => e.id === id)?.name) ||
    `Employee #${id}`;
  // A PM files leave for their own team only, so the picker is the scoped roster
  // rather than the whole company as on the admin page.
  const activeEmployees = employees.filter(
    (e) => e.status === "active" && teamEmployeeIds.has(e.id),
  );

  // ── Leave mutations ──────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: ({ id, remark }) => leaveApi.approve(id, user.id, remark),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      setRemarkModal(null);
      setRemark("");
      toast.success("Leave approved");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to approve leave"),
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => leaveApi.reject(id, user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      toast.success("Leave rejected");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to reject leave"),
  });

  const undoApproveMutation = useMutation({
    mutationFn: (id) => leaveApi.undoApprove(id, user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["leave-calendar"] });
      toast.success("Leave approval undone");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to undo approval"),
  });

  const undoRejectMutation = useMutation({
    mutationFn: (id) => leaveApi.undoReject(id, user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["leave-calendar"] });
      toast.success("Leave rejection undone");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to undo rejection"),
  });

  const createMutation = useMutation({
    mutationFn: leaveApi.create,
    onSuccess: (res, variables) => {
      recordLeaveApplication({ ...variables, id: res?.id || res?.leave_id });
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      setIsModalOpen(false);
      setSelectedLeaveType("");
      setFormEmployeeId("");
      setFormStartDate("");
      setFormEndDate("");
      toast.success("Leave record created successfully");
    },
    onError: (err) =>
      toast.error(
        err.response?.data?.detail || err.message || "Failed to create leave",
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: leaveApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      toast.success("Leave deleted");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to delete leave"),
  });

  // ── WFH mutations ────────────────────────────────────────────────
  const wfhApproveMutation = useMutation({
    mutationFn: ({ id, remark }) => wfhApi.approve(id, user.id, remark),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wfh"] });
      queryClient.invalidateQueries({ queryKey: ["leave-calendar"] });
      setWfhRemarkModal(null);
      setWfhRemark("");
      toast.success("WFH approved");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to approve WFH"),
  });

  const wfhRejectMutation = useMutation({
    mutationFn: (id) => wfhApi.reject(id, user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wfh"] });
      toast.success("WFH rejected");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to reject WFH"),
  });

  const wfhUndoApproveMutation = useMutation({
    mutationFn: (id) => wfhApi.undoApprove(id, user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wfh"] });
      queryClient.invalidateQueries({ queryKey: ["leave-calendar"] });
      toast.success("WFH approval undone");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to undo approval"),
  });

  const wfhUndoRejectMutation = useMutation({
    mutationFn: (id) => wfhApi.undoReject(id, user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wfh"] });
      toast.success("WFH rejection undone");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to undo rejection"),
  });

  const wfhDeleteMutation = useMutation({
    mutationFn: wfhApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wfh"] });
      toast.success("WFH request deleted");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to delete WFH request"),
  });

  const handleApprove = (leave) => {
    if (leave.flagged) setRemarkModal({ leaveId: leave.leave_id });
    else approveMutation.mutate({ id: leave.leave_id, remark: null });
  };

  // Mirrors handleApprove: the backend rejects a flagged WFH approval that
  // carries no remark, so ask for one up front instead of letting it 400.
  const handleWfhApprove = (w) => {
    if (w.flagged)
      setWfhRemarkModal({ wfhId: w.id, employeeName: w.employee_name });
    else wfhApproveMutation.mutate({ id: w.id, remark: null });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const empId = formData.get("employee_id");
    const startDate = formData.get("start_date");
    const leaveType = formData.get("leave_type");
    const reason = (formData.get("reason") || "").trim();
    const isHalf = leaveType === "first_half" || leaveType === "second_half";
    const endDate = isHalf ? startDate : formData.get("end_date");

    if (!empId) {
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
    } else if (isEndDateBeforeStartDate(startDate, endDate)) {
      toast.error(getEndDateValidationMessage());
      return;
    }

    const empIdInt = parseInt(empId);
    const empLeaves = allLeaves.filter((l) => l.employee_id === empIdInt);
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
      employee_id: empIdInt,
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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchQuery("");
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  // ── Search / filter / sort, applied on top of the PM's scoped rows ──
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const filteredLeaves = teamLeaves.filter((leave) => {
    // Searched against the stored name as well as the shortened label, so a middle
    // name still finds its owner — see nameSearchText.
    const name = nameSearchText(
      employees.find((e) => e.id === leave.employee_id)?.name,
    );
    const typeLabel = getLeaveTypeLabel(leave.leave_type).toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = name.includes(q) || typeLabel.includes(q);
    const matchesStatus =
      statusFilter === "all" || (leave.status || "pending") === statusFilter;
    const matchesToday =
      !todayOnly || (leave.start_date || "").slice(0, 10) === todayStr;
    return matchesSearch && matchesStatus && matchesToday;
  });
  // 'YYYY-MM-DD' sorts lexicographically = chronologically, so ascending is
  // Jan→Dec and descending is Dec→Jan.
  if (dateSort) {
    filteredLeaves.sort((a, b) => {
      const cmp = (a.start_date || "").localeCompare(b.start_date || "");
      return dateSort === "asc" ? cmp : -cmp;
    });
  }

  const filteredWFH = teamWfh.filter((w) => {
    const name = nameSearchText(
      w.employee_name ||
      employees.find((e) => e.id === w.employee_id)?.name,
    );
    const reason = (w.reason || "").toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = name.includes(q) || reason.includes(q);
    const matchesStatus =
      statusFilter === "all" || (w.status || "pending") === statusFilter;
    const matchesToday =
      !todayOnly || (w.wfh_date || "").slice(0, 10) === todayStr;
    return matchesSearch && matchesStatus && matchesToday;
  });
  if (dateSort) {
    filteredWFH.sort((a, b) => {
      const cmp = (a.wfh_date || "").localeCompare(b.wfh_date || "");
      return dateSort === "asc" ? cmp : -cmp;
    });
  }

  const STATUS_BADGE = LEAVE_STATUS_TEXT;
  const opensUpward = makeOpensUpward(currentPage, PAGE_SIZE);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Team Leaves</h1>
        <p className="mt-0.5 text-[13px] text-slate-500">
          Manage leave and WFH requests from your team
        </p>
      </div>

      {/* Tabs · Filters · Sort · Search · Add Leave */}
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
          {(activeTab === "Leave Requests" ||
            activeTab === "WFH Requests") && (
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
          {(activeTab === "Leave Requests" ||
            activeTab === "WFH Requests") && (
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
          {activeTab === "Leave Requests" && canAct && (
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

      {/* ── Tab: Leave Requests ── */}
      {activeTab === "Leave Requests" && (
        <Table
          variant="untitled"
          allowOverflow
          loading={isLoading || employeesLoading || allocationsLoading}
          skeletonRows={10}
          columns={[
            {
              key: "employee_id",
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
                        <span
                          className="font-semibold text-slate-800 truncate whitespace-nowrap"
                          title={emp?.name || empName}
                        >
                          {empName}
                        </span>
                        {leave.flagged && (
                          <OverLimitHoverCard
                            leave={leave}
                            allLeaves={allLeaves}
                          />
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
                      <DecidedBy request={leave} />
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
                if (!rawApplied)
                  return (
                    <span className="text-[13px] text-slate-400">—</span>
                  );
                // Extract YYYY-MM-DD from the ISO string to avoid UTC→local shifts
                const dateStr = String(rawApplied).slice(0, 10);
                const [y, m, day] = dateStr.split("-").map(Number);
                if (!y || !m || !day)
                  return (
                    <span className="text-[13px] text-slate-400">—</span>
                  );
                const d = new Date(y, m - 1, day);
                if (isNaN(d.getTime()))
                  return (
                    <span className="text-[13px] text-slate-400">—</span>
                  );
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
                          {leave.half_day_slot === "first_half" ||
                            leave.half_day_slot === "1st Half"
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
                if (!canAct)
                  return <span className="text-xs text-slate-300">—</span>;
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
          emptyState={{
            title: "No leave requests",
            description: "No leave requests from your team",
          }}
        />
      )}

      {/* ── Tab: Calendar ── */}
      {activeTab === "Calendar" && (
        <LeaveCalendar
          filterEmployeeIds={teamEmployeeIds.size > 0 ? teamEmployeeIds : null}
        />
      )}

      {/* ── Tab: WFH Requests ── */}
      {activeTab === "WFH Requests" && (
        <Table
          variant="untitled"
          allowOverflow
          loading={wfhLoading || employeesLoading || allocationsLoading}
          skeletonRows={10}
          columns={[
            {
              key: "employee_name",
              label: "Employee",
              width: "w-[20%]",
              render: (value, w) => {
                const emp = employees.find((e) => e.id === w.employee_id);
                const empName = value
                  ? formatDisplayName(value)
                  : getEmployeeName(w.employee_id);
                return (
                  <div className="flex items-center gap-3">
                    <UserAvatar src={emp?.avatar_url} name={empName} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="font-semibold text-slate-800 truncate whitespace-nowrap"
                          title={emp?.name || empName}
                        >
                          {empName}
                        </span>
                        {w.flagged && (
                          <FlagChip icon={AlertTriangle} label="Over limit" />
                        )}
                      </div>
                      <DecidedBy request={w} />
                      {/* The remark is the justification for approving an
                          over-limit request, so it belongs on the row rather
                          than only in the DB. */}
                      {w.remark && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          Remark: {w.remark}
                        </p>
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
            // Five columns here against Leave Requests' nine, so the note is
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
              render: (_, w) => {
                if (!canAct)
                  return <span className="text-xs text-slate-300">—</span>;
                return (
                  <div className="flex items-center justify-center">
                    <RowActionMenu
                      openUpward={opensUpward(filteredWFH, w)}
                      actions={[
                        w.status === "pending" && {
                          label: "Approve",
                          icon: CheckCircle,
                          tone: "success",
                          disabled: wfhApproveMutation.isPending,
                          onClick: () => handleWfhApprove(w),
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
                );
              },
            },
          ]}
          data={filteredWFH}
          currentPage={currentPage}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          emptyState={{
            title: "No WFH requests from your team",
            description: "WFH requests will appear here",
          }}
        />
      )}

      {/* ── Tab: Employee KPI ── */}
      {activeTab === "Employee KPI" && (
        <EmployeeKPIPanel
          employees={employees.filter((e) => teamEmployeeIds.has(e.id))}
          leaves={teamLeavesForKpi}
          wfhRequests={teamWfh}
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

      {/* ── Flagged WFH remark modal ── */}
      {wfhRemarkModal && (
        <Modal
          isOpen
          onClose={() => {
            setWfhRemarkModal(null);
            setWfhRemark("");
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
                  {wfhRemarkModal.employeeName
                    ? `${wfhRemarkModal.employeeName} has exceeded the WFH limit.`
                    : "This request exceeds the WFH limit."}{" "}
                  A justification remark is required to approve it.
                </p>
              </div>
            </div>

            {/* Quick-fill presets — click to use as-is, or edit afterwards. */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span className="text-[11px] font-semibold text-slate-400">
                Quick fill:
              </span>
              {WFH_REMARK_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setWfhRemark(preset)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${wfhRemark === preset
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <textarea
              value={wfhRemark}
              onChange={(e) => setWfhRemark(e.target.value)}
              placeholder="Enter justification for approving this WFH request..."
              className="w-full rounded-xl border border-slate-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows={4}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="cancel"
              onClick={() => {
                setWfhRemarkModal(null);
                setWfhRemark("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={() =>
                wfhApproveMutation.mutate({
                  id: wfhRemarkModal.wfhId,
                  remark: wfhRemark,
                })
              }
              disabled={!wfhRemark.trim() || wfhApproveMutation.isPending}
              isLoading={wfhApproveMutation.isPending}
            >
              {!wfhApproveMutation.isPending && "Approve with Remark"}
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
              {activeEmployees.length === 0 && (
                <p className="mt-1 text-xs text-slate-400">
                  Nobody is allocated to your projects yet.
                </p>
              )}
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
            <div>
              {selectedLeaveType === "first_half" ||
                selectedLeaveType === "second_half" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input type="hidden" name="start_date" value={formStartDate} />
                  <input type="hidden" name="end_date" value={formStartDate} />
                  <DatePicker
                    type="date"
                    value={formStartDate}
                    onChange={(e) => {
                      setFormStartDate(e.target.value);
                      setFormEndDate(e.target.value);
                    }}
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leave Duration (Start &amp; End Date){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input type="hidden" name="start_date" value={formStartDate} />
                  <input type="hidden" name="end_date" value={formEndDate} />
                  <DatePicker
                    type="range"
                    startDate={formStartDate}
                    endDate={formEndDate}
                    onRangeChange={({ startDate, endDate }) => {
                      setFormStartDate(startDate);
                      setFormEndDate(endDate);
                    }}
                    placeholder="Click to select start and end dates from calendar"
                    required
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
                    Policy &amp; Slots
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
          onConfirm={() =>
            deleteMutation.mutate(deleteTarget.leave_id, {
              onSuccess: () => setDeleteTarget(null),
            })
          }
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

export default PMLeavesPage;