import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leaveApi, employeeApi, wfhApi } from "../services/api";
import usePageStateStore from "../store/usePageStateStore";
import { usePageScroll } from "../hooks/usePageScroll";
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
import { formatDisplayName, nameSearchText } from "../utils/displayName";
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
import FlagChip from "../components/ui/FlagChip";
import { LEAVE_STATUS_TEXT } from "../components/ui/LeaveStatusText";
import { makeOpensUpward } from "../utils/tableRows";
import { checkHalfDayTiming } from "../utils/halfDayTiming";

const TABS = ["Calendar", "Leave List", "WFH Requests", "Employee KPI"];
const PAGE_SIZE = 10;

const LeavesPage = () => {
  const queryClient = useQueryClient();
  // const [searchParams] = useSearchParams();
  // const tabParam = searchParams.get("tab");
  // const [activeTab, setActiveTab] = useState(
  //   TABS.includes(tabParam) ? tabParam : "Calendar",
  // );
  // const queryParam = searchParams.get("q");
  // const [currentPage, setCurrentPage] = useState(1);
  // const [isModalOpen, setIsModalOpen] = useState(false);
  // const [selectedLeaveType, setSelectedLeaveType] = useState("");
  // const [formStartDate, setFormStartDate] = useState("");
  // const [formEndDate, setFormEndDate] = useState("");
  // const [searchQuery, setSearchQuery] = useState(queryParam || "");

  // useEffect(() => {
  //   if (tabParam && TABS.includes(tabParam)) setActiveTab(tabParam);
  // }, [tabParam]);

  // useEffect(() => {
  //   setCurrentPage(1);
  // }, [activeTab]);

  // useEffect(() => {
  //   if (queryParam === null) return;
  //   setSearchQuery(queryParam);
  //   setCurrentPage(1);
  // }, [queryParam]);

  // const [statusFilter, setStatusFilter] = useState("all");
  // const [todayOnly, setTodayOnly] = useState(false);
  // const [dateSort, setDateSort] = useState("");
  // const [filtersOpen, setFiltersOpen] = useState(false);
  // const filtersRef = useRef(null);

  // useEffect(() => {
  //   const handler = (e) => {
  //     if (filtersRef.current && !filtersRef.current.contains(e.target))
  //       setFiltersOpen(false);
  //   };
  //   document.addEventListener("mousedown", handler);
  //   return () => document.removeEventListener("mousedown", handler);
  // }, []);

  // Reset to page 1 whenever any filter / search / sort changes
  // useEffect(() => {
  //   setCurrentPage(1);
  // }, [searchQuery, statusFilter, todayOnly, dateSort]);

  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const queryParam = searchParams.get("q");

  const PAGE_KEY = "leaves";
  const setPageState = usePageStateStore((s) => s.setPageState);
  const getPageState = usePageStateStore((s) => s.getPageState);

  const defaultListState = {
    searchQuery: "",
    statusFilter: "all",
    todayOnly: false,
    dateSort: "",
    currentPage: 1,
  };

  const [activeTab, setActiveTab] = useState(
    TABS.includes(tabParam) ? tabParam : "Calendar",
  );
  const [searchQuery, setSearchQuery] = useState(queryParam || "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [todayOnly, setTodayOnly] = useState(false);
  const [dateSort, setDateSort] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Block writes until we restored from storage (avoids overwriting page with 1)
  const [ready, setReady] = useState(false);

  // Restore after zustand rehydration
  useEffect(() => {
    const restore = () => {
      const root = getPageState(PAGE_KEY);

      const tab =
        tabParam && TABS.includes(tabParam)
          ? tabParam
          : TABS.includes(root.activeTab)
            ? root.activeTab
            : "Calendar";

      setActiveTab(tab);

      if (tab === "Leave List" || tab === "WFH Requests") {
        const t = root.tabs?.[tab] || defaultListState;
        setSearchQuery(queryParam != null ? queryParam : t.searchQuery || "");
        setStatusFilter(t.statusFilter ?? "all");
        setTodayOnly(!!t.todayOnly);
        setDateSort(t.dateSort || "");
        setCurrentPage(t.currentPage ?? 1);
      }

      setReady(true);
    };

    if (usePageStateStore.persist.hasHydrated()) {
      restore();
      return;
    }
    return usePageStateStore.persist.onFinishHydration(restore);
  }, [tabParam, queryParam, getPageState]);

  // Save current tab state (only after restore)
  useEffect(() => {
    if (!ready) return;

    const root = getPageState(PAGE_KEY);
    const tabs = { ...(root.tabs || {}) };

    if (activeTab === "Leave List" || activeTab === "WFH Requests") {
      tabs[activeTab] = {
        searchQuery,
        statusFilter,
        todayOnly,
        dateSort,
        currentPage,
      };
    }

    setPageState(PAGE_KEY, { activeTab, tabs });
  }, [
    ready,
    activeTab,
    searchQuery,
    statusFilter,
    todayOnly,
    dateSort,
    currentPage,
    setPageState,
    getPageState,
  ]);

  // Scroll position per tab
  usePageScroll(`leaves:${activeTab}`);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
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

  // URL tab wins
  useEffect(() => {
    if (tabParam && TABS.includes(tabParam)) setActiveTab(tabParam);
  }, [tabParam]);

  // URL ?q= wins
  useEffect(() => {
    if (queryParam === null) return;
    setSearchQuery(queryParam);
    setCurrentPage(1);
  }, [queryParam]);

  // Reset page only when filters change inside the same list tab
  const skipPageReset = useRef(true);
  useEffect(() => {
    if (!ready) return;
    if (skipPageReset.current) {
      skipPageReset.current = false;
      return;
    }
    setCurrentPage(1);
  }, [searchQuery, statusFilter, todayOnly, dateSort, ready]);

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) + (todayOnly ? 1 : 0);

  const [remarkModal, setRemarkModal] = useState(null);
  const [remark, setRemark] = useState("");
  const [wfhRemarkModal, setWfhRemarkModal] = useState(null);
  const [wfhRemark, setWfhRemark] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [wfhDeleteConfirm, setWfhDeleteConfirm] = useState(null);
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const approverLabel =
    { admin: "Admin", pm: "PM", hr: "HR", team_lead: "Team Lead" }[user.role] ||
    "Admin";
  const WFH_REMARK_PRESETS = [
    `Approved by ${approverLabel}`,
    "Approved — business requirement",
    "Approved — one-off exception",
  ];

  // ── Employees (always needed for names / form / KPI) ─────────────────────
  const isPmOrLead = user.role === "pm" || user.role === "team_lead";
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ["employees", { team_only: isPmOrLead }],
    queryFn: () => employeeApi.getAll({ team_only: isPmOrLead }),
  });

  // ── Leaves – server-side page (same pattern as Guidelines) ───────────────
  const {
    data: leavePageData,
    isLoading: leavesLoading,
    isFetching: leavesFetching,
  } = useQuery({
    queryKey: [
      "leaves-page",
      currentPage,
      searchQuery,
      statusFilter,
      todayOnly,
      dateSort,
    ],
    queryFn: () =>
      leaveApi.getPage({
        page: currentPage,
        page_size: PAGE_SIZE,
        search: searchQuery || undefined,
        status: statusFilter,
        today_only: todayOnly,
        sort: dateSort || undefined,
      }),
    enabled: activeTab === "Leave List",
    keepPreviousData: true,
  });

  const leaves = leavePageData?.items || [];
  // Support both the shape we return and the shape Guidelines uses
  const leaveTotalItems =
    leavePageData?.total_items ?? leavePageData?.total ?? 0;
  const leaveTotalPages =
    leavePageData?.total_pages ??
    leavePageData?.pages ??
    (Math.ceil(leaveTotalItems / PAGE_SIZE) || 0);

  // Full leaves only when KPI / Calendar need them
  const { data: allLeaves = [] } = useQuery({
    queryKey: ["leaves"],
    queryFn: leaveApi.getAll,
    enabled: activeTab === "Employee KPI"
  });

  // ── WFH – server-side page ───────────────────────────────────────────────
  const {
    data: wfhPageData,
    isLoading: wfhPageLoading,
    isFetching: wfhFetching,
  } = useQuery({
    queryKey: [
      "wfh-page",
      currentPage,
      searchQuery,
      statusFilter,
      todayOnly,
      dateSort,
    ],
    queryFn: () =>
      wfhApi.getPage({
        page: currentPage,
        page_size: PAGE_SIZE,
        search: searchQuery || undefined,
        status: statusFilter,
        today_only: todayOnly,
        sort: dateSort || undefined,
      }),
    enabled: activeTab === "WFH Requests",
    keepPreviousData: true,
  });

  const wfhRequests = wfhPageData?.items || [];
  const wfhTotalItems = wfhPageData?.total_items ?? wfhPageData?.total ?? 0;
  const wfhTotalPages =
    wfhPageData?.total_pages ??
    wfhPageData?.pages ??
    (Math.ceil(wfhTotalItems / PAGE_SIZE) || 0);

  // Full WFH only for KPI / Calendar
  const { data: allWfhRequests = [] } = useQuery({
    queryKey: ["wfh"],
    queryFn: () => wfhApi.getAll(),
    enabled: activeTab === "Employee KPI",
  });

  // ── Mutations (unchanged) ────────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: ({ id, remark }) => leaveApi.approve(id, user.id, remark),
    onSuccess: (res) => {
      queryClient.setQueryData(["leaves"], (old) => old?.map(lv => lv.leave_id === res.leave_id ? { ...lv, status: res.status, razorpay_applied: res.razorpay_applied, approved_by_name: user.name } : lv));
      queryClient.setQueriesData({ queryKey: ["leaves-page"] }, (old) => {
        if (!old || !old.items) return old;
        return { ...old, items: old.items.map(lv => lv.leave_id === res.leave_id ? { ...lv, status: res.status, razorpay_applied: res.razorpay_applied, approved_by_name: user.name } : lv) };
      });
      setRemarkModal(null);
      setRemark("");
      toast.success("Leave approved");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to approve leave"),
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => leaveApi.reject(id, user.id),
    onSuccess: (res) => {
      queryClient.setQueryData(["leaves"], (old) => old?.map(lv => lv.leave_id === res.leave_id ? { ...lv, status: res.status, razorpay_applied: res.razorpay_applied, approved_by_name: user.name } : lv));
      queryClient.setQueriesData({ queryKey: ["leaves-page"] }, (old) => {
        if (!old || !old.items) return old;
        return { ...old, items: old.items.map(lv => lv.leave_id === res.leave_id ? { ...lv, status: res.status, razorpay_applied: res.razorpay_applied, approved_by_name: user.name } : lv) };
      });
      toast.success("Leave rejected");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to reject leave"),
  });

  const undoApproveMutation = useMutation({
    mutationFn: (id) => leaveApi.undoApprove(id, user.id),
    onSuccess: (res) => {
      queryClient.setQueryData(["leaves"], (old) => old?.map(lv => lv.leave_id === res.leave_id ? { ...lv, status: res.status, razorpay_applied: false, approved_by_name: null } : lv));
      queryClient.setQueriesData({ queryKey: ["leaves-page"] }, (old) => {
        if (!old || !old.items) return old;
        return { ...old, items: old.items.map(lv => lv.leave_id === res.leave_id ? { ...lv, status: res.status, razorpay_applied: false, approved_by_name: null } : lv) };
      });
      toast.success("Leave approval undone");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to undo approval"),
  });

  const undoRejectMutation = useMutation({
    mutationFn: (id) => leaveApi.undoReject(id, user.id),
    onSuccess: (res) => {
      queryClient.setQueryData(["leaves"], (old) => old?.map(lv => lv.leave_id === res.leave_id ? { ...lv, status: res.status, razorpay_applied: false, approved_by_name: null } : lv));
      queryClient.setQueriesData({ queryKey: ["leaves-page"] }, (old) => {
        if (!old || !old.items) return old;
        return { ...old, items: old.items.map(lv => lv.leave_id === res.leave_id ? { ...lv, status: res.status, razorpay_applied: false, approved_by_name: null } : lv) };
      });
      toast.success("Leave rejection undone");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to undo rejection"),
  });

  const createMutation = useMutation({
    mutationFn: leaveApi.create,
    onSuccess: (res, variables) => {
      recordLeaveApplication({ ...variables, id: res?.id || res?.leave_id });
      queryClient.invalidateQueries({ queryKey: ["leaves-page"] });
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
      queryClient.invalidateQueries({ queryKey: ["leaves-page"] });
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      toast.success("Leave deleted");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to delete leave"),
  });

  const wfhApproveMutation = useMutation({
    mutationFn: ({ id, remark }) => wfhApi.approve(id, user.id, remark),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wfh-page"] });
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
      queryClient.invalidateQueries({ queryKey: ["wfh-page"] });
      queryClient.invalidateQueries({ queryKey: ["wfh"] });
      toast.success("WFH rejected");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to reject WFH"),
  });

  const wfhUndoApproveMutation = useMutation({
    mutationFn: (id) => wfhApi.undoApprove(id, user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wfh-page"] });
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
      queryClient.invalidateQueries({ queryKey: ["wfh-page"] });
      queryClient.invalidateQueries({ queryKey: ["wfh"] });
      toast.success("WFH rejection undone");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to undo rejection"),
  });

  const wfhDeleteMutation = useMutation({
    mutationFn: wfhApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wfh-page"] });
      queryClient.invalidateQueries({ queryKey: ["wfh"] });
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

  const handleWfhApprove = (w) => {
    if (w.flagged) {
      setWfhRemarkModal({ wfhId: w.id, employeeName: w.employee_name });
    } else {
      wfhApproveMutation.mutate({ id: w.id, remark: null });
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
    const empLeaves = (allLeaves.length ? allLeaves : leaves).filter(
      (l) => l.employee_id === empIdInt,
    );

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
    formatDisplayName(employees.find((e) => e.id === id)?.name) ||
    `Employee #${id}`;
  const activeEmployees = employees.filter((e) => e.status === "active");

  // const handleTabChange = (tab) => {
  //   setActiveTab(tab);
  //   setCurrentPage(1);
  //   setSearchQuery("");
  // };
  const handleTabChange = (tab) => {
    if (tab === activeTab) return;

    // Save current list tab before leaving it
    if (ready && (activeTab === "Leave List" || activeTab === "WFH Requests")) {
      const root = getPageState(PAGE_KEY);
      setPageState(PAGE_KEY, {
        activeTab: tab,
        tabs: {
          ...(root.tabs || {}),
          [activeTab]: {
            searchQuery,
            statusFilter,
            todayOnly,
            dateSort,
            currentPage,
          },
        },
      });
    } else if (ready) {
      setPageState(PAGE_KEY, {
        ...getPageState(PAGE_KEY),
        activeTab: tab,
      });
    }

    setActiveTab(tab);

    // Load target tab's saved filters / pagination
    if (tab === "Leave List" || tab === "WFH Requests") {
      const next = getPageState(PAGE_KEY).tabs?.[tab] || defaultListState;
      setSearchQuery(next.searchQuery || "");
      setStatusFilter(next.statusFilter ?? "all");
      setTodayOnly(!!next.todayOnly);
      setDateSort(next.dateSort || "");
      setCurrentPage(next.currentPage ?? 1);
      // Allow page-reset effect to skip this load
      skipPageReset.current = true;
    }
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    // page reset is handled by the useEffect above
  };

  const STATUS_BADGE = LEAVE_STATUS_TEXT;
  const opensUpward = makeOpensUpward(currentPage, PAGE_SIZE);

  const isLeaveListLoading =
    activeTab === "Leave List" && (leavesLoading || employeesLoading);
  const isWfhLoading =
    activeTab === "WFH Requests" && (wfhPageLoading || employeesLoading);

  return (
    <div className="space-y-3">
      {/* Tabs · Search · Add Leave – unchanged */}
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
                      onChange={(v) => setStatusFilter(v)}
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
                      onClick={() => setTodayOnly((t) => !t)}
                      className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${todayOnly ? "bg-indigo-600" : "bg-slate-200"
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${todayOnly ? "translate-x-4" : "translate-x-0.5"
                          }`}
                      />
                    </button>
                  </div>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter("all");
                        setTodayOnly(false);
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
                onChange={(v) => setDateSort(v)}
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
              label: "Employee",
              width: "w-[19%]",
              render: (_, leave) => {
                const emp = employees.find((e) => e.id === leave.employee_id);
                const empName = getEmployeeName(leave.employee_id);
                const approvedBy =
                  (leave.status === "approved" || leave.status === "rejected") && leave.approved_by_name
                    ? `${leave.status === "approved" ? "Approved" : "Rejected"} by ${leave.approved_by_name}`
                    : null;

                const remark = (leave.approval_remark || "").trim();
                const remarkAlreadyHasApprover = /^approved by\b/i.test(remark);

                let underName = null;
                if (approvedBy && remark) {
                  underName = remarkAlreadyHasApprover ? remark : `${approvedBy} — ${remark}`;
                } else {
                  underName = remark || approvedBy;
                }

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
                          <OverLimitHoverCard leave={leave} allLeaves={leaves} />
                        )}
                        {leave.is_emergency && (
                          <FlagChip icon={Siren} label="Emergency" tone="red" pulse />
                        )}
                      </div>
                      {underName && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate" title={underName}>
                          {underName}
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
                  openUpward={opensUpward(leaves, leave)}
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
                  className={`inline-flex whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-medium ${getLeaveTypeBadgeClass(
                    value,
                  )}`}
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
              render: (value) => {
                if (!value) return <span className="text-[13px] text-slate-400">—</span>;
                const d = new Date(String(value).slice(0, 10) + "T00:00:00");
                if (isNaN(d.getTime())) return <span className="text-[13px] text-slate-400">—</span>;
                return (
                  <span className="text-[13px] text-slate-700 whitespace-nowrap">
                    {format(d, "MMM d, yyyy")}
                  </span>
                );
              },
            },
            {
              key: "end_date",
              label: "End Date",
              align: "center",
              width: "w-[11%]",
              render: (value) => {
                if (!value) return <span className="text-[13px] text-slate-400">—</span>;
                const d = new Date(String(value).slice(0, 10) + "T00:00:00");
                if (isNaN(d.getTime())) return <span className="text-[13px] text-slate-400">—</span>;
                return (
                  <span className="text-[13px] text-slate-700 whitespace-nowrap">
                    {format(d, "MMM d, yyyy")}
                  </span>
                );
              },
            },
            {
              key: "applied_on",
              label: "Applied On",
              align: "center",
              width: "w-[11%]",
              render: (_, leave) => {
                const rawApplied = resolveLeaveAppliedDate(leave);
                if (!rawApplied)
                  return <span className="text-[13px] text-slate-400">—</span>;
                const dateStr = String(rawApplied).slice(0, 10);
                const [y, m, day] = dateStr.split("-").map(Number);
                if (!y || !m || !day)
                  return <span className="text-[13px] text-slate-400">—</span>;
                const d = new Date(y, m - 1, day);
                if (isNaN(d.getTime()))
                  return <span className="text-[13px] text-slate-400">—</span>;
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
                const isPending = !leave.status || leave.status === "pending";
                return (
                  <div className="flex items-center justify-center">
                    <RowActionMenu
                      openUpward={opensUpward(leaves, leave)}
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
          data={leaves}
          loading={isLeaveListLoading || leavesFetching}
          skeletonRows={10}
          currentPage={currentPage}
          pageSize={PAGE_SIZE}
          totalItems={leaveTotalItems}
          totalPages={leaveTotalPages}
          onPageChange={setCurrentPage}
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
          loading={isWfhLoading || wfhFetching}
          skeletonRows={10}
          columns={[
            {
              key: "employee_name",
              label: "Employee",
              width: "w-[18%]",
              render: (value, w) => {
                const emp = employees.find((e) => e.id === w.employee_id);
                const empName = value
                  ? formatDisplayName(value)
                  : getEmployeeName(w.employee_id);
                const approvedBy =
                  (w.status === "approved" || w.status === "rejected") && w.approved_by_name
                    ? `${w.status === "approved" ? "Approved" : "Rejected"} by ${w.approved_by_name}`
                    : null;

                const remark = (w.remark || "").trim();
                const remarkAlreadyHasApprover = /^approved by\b/i.test(remark);

                let underName = null;
                if (approvedBy && remark) {
                  // Remark already says "Approved by …" → show only the remark (or only approvedBy)
                  underName = remarkAlreadyHasApprover ? remark : `${approvedBy} — ${remark}`;
                } else {
                  underName = remark || approvedBy;
                }

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
                      {underName && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate" title={underName}>
                          {underName}
                        </p>
                      )}
                    </div>
                  </div>
                );
              },
            },
            {
              key: "created_at",
              label: "Applied Date",
              align: "center",
              width: "w-[11%]",
              render: (value, w) => {
                const dateVal = value || w.created_at || w.wfh_date;
                if (!dateVal) return <span className="text-[13px] text-slate-400">—</span>;
                const d = new Date(String(dateVal).slice(0, 10) + "T00:00:00");
                if (isNaN(d.getTime())) return <span className="text-[13px] text-slate-400">—</span>;
                return (
                  <span className="text-[13px] text-slate-700 whitespace-nowrap">
                    {format(d, "MMM d, yyyy")}
                  </span>
                );
              },
            },
            {
              key: "start_wfh_date",
              label: "Start Date",
              align: "center",
              width: "w-[11%]",
              render: (_, w) => {
                if (!w.wfh_date) return <span className="text-[13px] text-slate-400">—</span>;
                const d = new Date(String(w.wfh_date).slice(0, 10) + "T00:00:00");
                if (isNaN(d.getTime())) return <span className="text-[13px] text-slate-400">—</span>;
                return (
                  <span className="text-[13px] text-slate-700 whitespace-nowrap">
                    {format(d, "MMM d, yyyy")}
                  </span>
                );
              },
            },
            {
              key: "end_wfh_date",
              label: "End Date",
              align: "center",
              width: "w-[11%]",
              render: (_, w) => {
                if (!w.wfh_date) return <span className="text-[13px] text-slate-400">—</span>;
                const d = new Date(String(w.wfh_date).slice(0, 10) + "T00:00:00");
                if (isNaN(d.getTime())) return <span className="text-[13px] text-slate-400">—</span>;
                return (
                  <span className="text-[13px] text-slate-700 whitespace-nowrap">
                    {format(d, "MMM d, yyyy")}
                  </span>
                );
              },
            },
            {
              key: "reason",
              label: "Reason",
              width: "w-[26%]",
              render: (value, w) => (
                <ReasonText
                  reason={value}
                  openUpward={opensUpward(wfhRequests, w)}
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
                    openUpward={opensUpward(wfhRequests, w)}
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
              ),
            },
          ]}
          data={wfhRequests}
          currentPage={currentPage}
          pageSize={PAGE_SIZE}
          totalItems={wfhTotalItems}
          totalPages={wfhTotalPages}
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
          leaves={allLeaves}
          wfhRequests={allWfhRequests}
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
                searchable
                searchPlaceholder="Search employee..."
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
                    accentColor="indigo"
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
                    Leave Duration (Start & End Date){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input type="hidden" name="start_date" value={formStartDate} />
                  <input type="hidden" name="end_date" value={formEndDate} />
                  <DatePicker
                    type="range"
                    accentColor="indigo"
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
          onConfirm={() => {
            if (deleteTarget) {
              deleteMutation.mutate(deleteTarget.leave_id, {
                onSuccess: () => setDeleteTarget(null),
              });
            }
          }}
          isPending={deleteMutation.isPending}
          title="Delete Leave Record"
          message={`Are you sure you want to delete the ${getLeaveTypeLabel(
            deleteTarget.leave_type,
          )} record for ${getEmployeeName(deleteTarget.employee_id)} (${deleteTarget.start_date
            } — ${deleteTarget.end_date})?`}
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
