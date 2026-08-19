import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  CheckCircle2,
  Home,
  Sparkles,
  Users,
  Check,
  X,
  AlertTriangle,
  Send,
  Coffee,
} from "lucide-react";
import { leaveApi, wfhApi, employeeApi } from "../services/api";
import { format, parseISO } from "date-fns";
import toast from "react-hot-toast";
import Dropdown from "./ui/Dropdown";
import Button from "./ui/Button";
import UserAvatar from "./ui/UserAvatar";
import { formatDisplayName } from "../utils/displayName";
import {
  isValidFloaterDate,
  getWorkingDayCount,
  countNonWorkingDaysInRange,
  isNonWorkingDay,
  RAZORPAY_NEGATIVE_BALANCE_NOTE,
  recordLeaveApplication,
} from "../utils/leaveTypes";

// ─── Leave colour palette ───────────────────────────────────────────────────
const LEAVE_COLORS = {
  paid: { bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6", label: "Paid Leave" },
  casual_sick: {
    bg: "#d1fae5",
    text: "#065f46",
    dot: "#10b981",
    label: "Casual/Sick",
  },
  floater: { bg: "#fef3c7", text: "#92400e", dot: "#f59e0b", label: "Floater" },
  first_half: {
    bg: "#e0e7ff",
    text: "#3730a3",
    dot: "#6366f1",
    label: "First Half-day",
  },
  second_half: {
    bg: "#ede9fe",
    text: "#5b21b6",
    dot: "#8b5cf6",
    label: "Second Half-day",
  },
  default: { bg: "#f1f5f9", text: "#475569", dot: "#94a3b8", label: "Leave" },
};

const WFH_COLOR = {
  bg: "#ede9fe",
  text: "#5b21b6",
  dot: "#8b5cf6",
  label: "WFH",
};

const PENDING_OPACITY = 0.65;

// ─── Theme palette for dynamic calendar range selection (employee mode) ─────
const SELECTION_THEMES = {
  paid: { border: "#2563eb", rangeBg: "#f0f7ff", rangeBorder: "#bfdbfe" },
  casual_sick: {
    border: "#10b981",
    rangeBg: "#ecfdf5",
    rangeBorder: "#a7f3d0",
  },
  floater: { border: "#f59e0b", rangeBg: "#fffbeb", rangeBorder: "#fde68a" },
  wfh: { border: "#8b5cf6", rangeBg: "#faf5ff", rangeBorder: "#e9d5ff" },
  default: { border: "#2563eb", rangeBg: "#f0f7ff", rangeBorder: "#bfdbfe" },
};

// ─── Autonex AI public holiday list 2026 ───────────────────────────────────
const HOLIDAYS = {
  // Fixed
  "2026-01-01": { name: "New Year's Day", type: "fixed" },
  "2026-01-26": { name: "Republic Day", type: "fixed" },
  "2026-03-04": { name: "Holi", type: "fixed" },
  "2026-05-01": { name: "Maharashtra Day", type: "fixed" },
  "2026-06-26": { name: "Muharram", type: "fixed" },
  "2026-09-14": { name: "Ganesh Chaturthi", type: "fixed" },
  "2026-10-02": { name: "Mahatma Gandhi Jayanti", type: "fixed" },
  "2026-11-09": { name: "Govardhan Puja", type: "fixed" },
  "2026-12-25": { name: "Christmas", type: "fixed" },
  // Floater
  "2026-01-14": { name: "Pongal / Makar Sankranti", type: "floater" },
  "2026-01-23": { name: "Vasant Panchami", type: "floater" },
  "2026-02-15": { name: "Maha Shivratri", type: "floater" },
  "2026-02-19": { name: "Shivaji Jayanti", type: "floater" },
  "2026-03-19": { name: "Ugadi / Gudi Padwa", type: "floater" },
  "2026-03-21": { name: "Ramzan Eid", type: "floater" },
  "2026-03-31": { name: "Mahavir Jayanti", type: "floater" },
  "2026-04-03": { name: "Good Friday", type: "floater" },
  "2026-04-14": { name: "Ambedkar Jayanti", type: "floater" },
  "2026-05-27": { name: "Bakrid", type: "floater" },
  "2026-08-15": { name: "Independence Day", type: "floater" },
  "2026-08-26": { name: "Onam", type: "floater" },
  "2026-08-28": { name: "Raksha Bandhan", type: "floater" },
  "2026-09-04": { name: "Janmashtami", type: "floater" },
  "2026-10-20": { name: "Dussehra", type: "floater" },
  "2026-11-08": { name: "Diwali", type: "floater" },
  "2026-11-11": { name: "Bhai Duj", type: "floater" },
  "2026-11-24": { name: "Guru Nanak Jayanti", type: "floater" },
  "2026-12-23": { name: "Hazarat Ali's Birthday", type: "floater" },
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toYMD(dateStr) {
  if (!dateStr) return "";
  return dateStr.slice(0, 10);
}

// ─── Event chip in calendar cells ───────────────────────────────────────────
function EventChip({ ev }) {
  const isWfh = ev.kind === "wfh";
  const label = isWfh
    ? `🏠 ${formatDisplayName(ev.employee_name)}`
    : formatDisplayName(ev.employee_name);

  return (
    <div
      className={`truncate text-[9.5px] font-semibold leading-tight ${
        isWfh ? "text-purple-700 font-bold" : "text-blue-700 font-bold"
      }`}
    >
      {label}
    </div>
  );
}

// ─── Main Calendar ───────────────────────────────────────────────────────────
export default function LeaveCalendar({
  filterEmployeeIds = null,
  isSelfView = false,
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const queryClient = useQueryClient();

  // Role detection: Admin, PM, HR, and Team Leads (TL) get the attendance & segregated leaves inspection view
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const storedRole = (
    localStorage.getItem("role") ||
    user?.role ||
    ""
  ).toLowerCase();
  const isUserTeamLead =
    storedRole === "team_lead" ||
    storedRole === "lead" ||
    storedRole === "tl" ||
    (user?.designation || "").toLowerCase().includes("team lead") ||
    (user?.designation || "").toLowerCase().includes("lead");

  const isAdminOrPm =
    !isSelfView &&
    (storedRole === "admin" ||
      storedRole === "superadmin" ||
      storedRole === "pm" ||
      storedRole === "hr" ||
      isUserTeamLead);

  const employeeId = user?.employee_id || user?.id;

  // Admin/PM state: active inspected date
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [attendanceFilter, setAttendanceFilter] = useState("all"); // "all" | "leaves" | "wfh"

  // Employee mode state: range selection & apply form
  const [selectedStart, setSelectedStart] = useState(null);
  const [selectedEnd, setSelectedEnd] = useState(null);
  const [leaveType, setLeaveType] = useState("");
  const [reason, setReason] = useState("");

  const activeSelectionTheme =
    SELECTION_THEMES[leaveType] || SELECTION_THEMES.default;

  // Query month leaves & WFH
  const { data, isLoading } = useQuery({
    queryKey: ["leave-calendar", monthStr],
    queryFn: () => leaveApi.getCalendar(monthStr),
    staleTime: 30_000,
  });

  // Query all leaves & WFH to get complete details (including approved_by_name) without backend changes
  const { data: allLeavesData } = useQuery({
    queryKey: ["leaves-all-details"],
    queryFn: () => leaveApi.getAll(),
    staleTime: 30_000,
  });

  const { data: allWfhData } = useQuery({
    queryKey: ["wfh-all-details"],
    queryFn: () => wfhApi.getAll(),
    staleTime: 30_000,
  });

  const detailedLeavesMap = useMemo(() => {
    const map = {};
    const list = Array.isArray(allLeavesData)
      ? allLeavesData
      : allLeavesData?.data || allLeavesData?.items || [];
    for (const item of list) {
      if (item.leave_id || item.id) {
        map[item.leave_id || item.id] = item;
      }
    }
    return map;
  }, [allLeavesData]);

  const detailedWfhMap = useMemo(() => {
    const map = {};
    const list = Array.isArray(allWfhData)
      ? allWfhData
      : allWfhData?.data || allWfhData?.items || [];
    for (const item of list) {
      if (item.id) {
        map[item.id] = item;
      }
    }
    return map;
  }, [allWfhData]);

  // Query employees for avatars & details
  const { data: employeesData } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeeApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const employeeMap = useMemo(() => {
    const map = {};
    const list =
      employeesData?.data ||
      (Array.isArray(employeesData) ? employeesData : []);
    for (const emp of list) {
      if (emp?.id) map[emp.id] = emp;
      if (emp?.name) map[emp.name.toLowerCase().trim()] = emp;
    }
    return map;
  }, [employeesData]);

  // Keep selectedDate in sync when changing months in Admin/PM view
  useEffect(() => {
    if (isAdminOrPm && selectedDate && !selectedDate.startsWith(monthStr)) {
      if (todayStr.startsWith(monthStr)) {
        setSelectedDate(todayStr);
      } else {
        setSelectedDate(`${monthStr}-01`);
      }
    }
  }, [isAdminOrPm, monthStr, todayStr]);

  // Employee mutations for applying time off
  const createLeaveMutation = useMutation({
    mutationFn: (leavePayload) =>
      leaveApi.create({
        ...leavePayload,
        employee_id: employeeId,
        created_at: new Date().toISOString(),
        applied_on: format(new Date(), "yyyy-MM-dd"),
      }),
    onSuccess: (res, variables) => {
      recordLeaveApplication({ ...variables, ...res });
      queryClient.invalidateQueries({ queryKey: ["leave-calendar", monthStr] });
      queryClient.invalidateQueries({ queryKey: ["my-leaves", employeeId] });
      setSelectedStart(null);
      setSelectedEnd(null);
      setLeaveType("");
      setReason("");
      if (res.flagged) {
        toast.success(
          "Leave request submitted — flagged for exceeding monthly limit, awaiting approval.",
        );
      } else {
        toast.success("Leave request submitted successfully");
      }
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.detail?.[0]?.msg ||
        err?.response?.data?.detail ||
        "Failed to submit leave",
      );
    },
  });

  const createWfhMutation = useMutation({
    mutationFn: (wfhPayload) =>
      wfhApi.create({ ...wfhPayload, employee_id: employeeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-calendar", monthStr] });
      queryClient.invalidateQueries({ queryKey: ["my-wfh", employeeId] });
      setSelectedStart(null);
      setSelectedEnd(null);
      setLeaveType("");
      setReason("");
      toast.success("WFH request submitted successfully");
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.detail || "Failed to submit WFH request",
      );
    },
  });

  // Admin/PM/Lead approval & rejection mutations
  const approverId = user?.id || user?.employee_id;

  const approveLeaveMutation = useMutation({
    mutationFn: ({ id, remark }) => leaveApi.approve(id, approverId, remark),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["my-leaves"] });
      toast.success("Leave approved");
    },
    onError: (err) =>
      toast.error(err?.response?.data?.detail || "Failed to approve leave"),
  });

  const rejectLeaveMutation = useMutation({
    mutationFn: (id) => leaveApi.reject(id, approverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["my-leaves"] });
      toast.success("Leave rejected");
    },
    onError: (err) =>
      toast.error(err?.response?.data?.detail || "Failed to reject leave"),
  });

  const approveWfhMutation = useMutation({
    mutationFn: ({ id, remark }) => wfhApi.approve(id, approverId, remark),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["wfh"] });
      queryClient.invalidateQueries({ queryKey: ["my-wfh"] });
      toast.success("WFH approved");
    },
    onError: (err) =>
      toast.error(err?.response?.data?.detail || "Failed to approve WFH"),
  });

  const rejectWfhMutation = useMutation({
    mutationFn: (id) => wfhApi.reject(id, approverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["wfh"] });
      queryClient.invalidateQueries({ queryKey: ["my-wfh"] });
      toast.success("WFH rejected");
    },
    onError: (err) =>
      toast.error(err?.response?.data?.detail || "Failed to reject WFH"),
  });

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const eventsByDate = useMemo(() => {
    const map = {};
    if (!data) return map;
    const leaves = filterEmployeeIds
      ? (data.leaves || []).filter((l) => filterEmployeeIds.has(l.employee_id))
      : data.leaves || [];
    const wfhs = filterEmployeeIds
      ? (data.wfh || []).filter((w) => filterEmployeeIds.has(w.employee_id))
      : data.wfh || [];

    for (const leave of leaves) {
      if (leave.status === "rejected") continue;
      const start = new Date(leave.start_date + "T00:00:00");
      const end = new Date(leave.end_date + "T00:00:00");
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (isNonWorkingDay(key)) {
          continue;
        }
        if (!map[key]) map[key] = [];
        map[key].push({ ...leave, kind: "leave" });
      }
    }
    for (const wfh of wfhs) {
      if (wfh.status === "rejected") continue;
      const key = toYMD(wfh.date || wfh.wfh_date || "");
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push({ ...wfh, kind: "wfh" });
    }
    return map;
  }, [data, filterEmployeeIds]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const numRows = Math.ceil(cells.length / 7);

  const monthLabel = new Date(year, month - 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  // Admin/PM date data
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate[selectedDate] || [];
  }, [eventsByDate, selectedDate]);

  const leaveEvents = useMemo(() => {
    return selectedDateEvents.filter((ev) => ev.kind !== "wfh");
  }, [selectedDateEvents]);

  const wfhEvents = useMemo(() => {
    return selectedDateEvents.filter((ev) => ev.kind === "wfh");
  }, [selectedDateEvents]);

  const approvedLeaves = useMemo(() => {
    return leaveEvents
      .filter(
        (ev) =>
          ev.status === "approved" ||
          (!ev.status && ev.kind === "leave"),
      )
      .sort((a, b) =>
        (a.employee_name || "").localeCompare(b.employee_name || ""),
      );
  }, [leaveEvents]);

  const pendingLeaves = useMemo(() => {
    return leaveEvents
      .filter((ev) => ev.status === "pending")
      .sort((a, b) =>
        (a.employee_name || "").localeCompare(b.employee_name || ""),
      );
  }, [leaveEvents]);

  const approvedWfh = useMemo(() => {
    return wfhEvents
      .filter(
        (ev) =>
          ev.status === "approved" ||
          (!ev.status && ev.kind === "wfh"),
      )
      .sort((a, b) =>
        (a.employee_name || "").localeCompare(b.employee_name || ""),
      );
  }, [wfhEvents]);

  const pendingWfh = useMemo(() => {
    return wfhEvents
      .filter((ev) => ev.status === "pending")
      .sort((a, b) =>
        (a.employee_name || "").localeCompare(b.employee_name || ""),
      );
  }, [wfhEvents]);

  const allPending = useMemo(() => {
    return selectedDateEvents
      .filter((ev) => ev.status === "pending")
      .sort((a, b) =>
        (a.employee_name || "").localeCompare(b.employee_name || ""),
      );
  }, [selectedDateEvents]);

  const visiblePending = useMemo(() => {
    if (attendanceFilter === "leaves") return pendingLeaves;
    if (attendanceFilter === "wfh") return pendingWfh;
    return allPending;
  }, [attendanceFilter, pendingLeaves, pendingWfh, allPending]);

  const selectedHoliday = selectedDate ? HOLIDAYS[selectedDate] : null;
  const selectedDow = selectedDate
    ? new Date(selectedDate + "T00:00:00").getDay()
    : null;
  const isSelectedWeekend = selectedDow === 0 || selectedDow === 6;
  const isSelectedToday = selectedDate === todayStr;

  // Employee range helper details
  const workingDays =
    selectedStart && selectedEnd
      ? getWorkingDayCount(selectedStart, selectedEnd)
      : 0;
  const nonWorkingDays =
    selectedStart && selectedEnd
      ? countNonWorkingDaysInRange(selectedStart, selectedEnd)
      : 0;

  const isFloaterType = leaveType === "floater";

  // Form errors for employee mode
  let validationError = null;
  if (selectedStart && selectedEnd) {
    if (workingDays === 0) {
      validationError =
        "No working days in this range — weekends and fixed holidays are automatically skipped.";
    } else if (isFloaterType) {
      if (selectedStart !== selectedEnd) {
        validationError = "Floater leave must be taken as a single day.";
      } else if (!isValidFloaterDate(selectedStart)) {
        validationError =
          "Selected date is not an approved floater holiday date.";
      }
    }
  }

  const LEAVE_TYPES = [
    { value: "paid", label: "Paid Leave", color: "#2563eb" },
    { value: "casual_sick", label: "Casual/Sick Leave", color: "#10b981" },
    { value: "floater", label: "Floater Leave", color: "#f59e0b" },
    { value: "wfh", label: "Work From Home (WFH)", color: "#8b5cf6" },
  ];

  const selectedTypeObj = LEAVE_TYPES.find((t) => t.value === leaveType);
  const buttonBg = selectedTypeObj ? selectedTypeObj.color : "#cbd5e1";
  const buttonText = selectedTypeObj ? "#fff" : "#94a3b8";
  const isSubmitDisabled =
    !leaveType ||
    workingDays === 0 ||
    !!validationError ||
    createLeaveMutation.isPending ||
    createWfhMutation.isPending;

  const handleApplySubmit = (e) => {
    e.preventDefault();
    if (!reason || !reason.trim()) {
      toast.error("Please enter a reason for this request.");
      return;
    }
    if (isSubmitDisabled) return;

    if (leaveType === "wfh") {
      createWfhMutation.mutate({
        wfh_date: selectedStart,
        end_date: selectedEnd,
        reason: reason,
      });
    } else {
      const payload = {
        employee_id: employeeId,
        leave_type: leaveType,
        start_date: selectedStart,
        end_date: selectedEnd,
        reason: reason,
        created_at: new Date().toISOString(),
        applied_on: format(new Date(), "yyyy-MM-dd"),
      };
      recordLeaveApplication(payload);
      createLeaveMutation.mutate(payload);
    }
  };

  const handleCellClick = (dateStr) => {
    if (isAdminOrPm) {
      setSelectedDate(dateStr);
    } else {
      if (isNonWorkingDay(dateStr)) {
        const h = HOLIDAYS[dateStr];
        const dow = new Date(dateStr + "T00:00:00").getDay();
        const reason =
          h?.name || (dow === 0 || dow === 6 ? "Weekend" : "Non-working day");
        toast(
          `That day (${reason}) is a non-working day. It will automatically be excluded from any multi-day range you pick.`,
          {
            icon: "ℹ️",
            style: {
              background: "#1e293b",
              color: "#fff",
              fontSize: "12px",
            },
          },
        );
      }

      if (!selectedStart || (selectedStart && selectedEnd)) {
        setSelectedStart(dateStr);
        setSelectedEnd(null);
      } else if (selectedStart && !selectedEnd) {
        if (dateStr < selectedStart) {
          setSelectedEnd(selectedStart);
          setSelectedStart(dateStr);
        } else {
          setSelectedEnd(dateStr);
        }
      }
    }
  };

  const formattedStart = selectedStart
    ? format(parseISO(selectedStart), "MMM dd, yyyy")
    : "";
  const formattedEnd = selectedEnd
    ? format(parseISO(selectedEnd), "MMM dd, yyyy")
    : "";

  const isMutatingAnyAction =
    approveLeaveMutation.isPending ||
    rejectLeaveMutation.isPending ||
    approveWfhMutation.isPending ||
    rejectWfhMutation.isPending;

  // Helper to render individual leave card in Admin/PM mode
  const renderLeaveCard = (ev, isPending) => {
    const empProfile =
      (ev.employee_id ? employeeMap[ev.employee_id] : null) ||
      (ev.employee_name
        ? employeeMap[ev.employee_name.toLowerCase().trim()]
        : null);
    const avatarUrl =
      ev.avatar_url || empProfile?.avatar_url || empProfile?.avatar;

    const isWfh = ev.kind === "wfh";
    const leaveConfig = LEAVE_COLORS[ev.leave_type] || LEAVE_COLORS.default;

    const isHalfDay =
      ev.is_half_day ||
      ev.leave_type === "first_half" ||
      ev.leave_type === "second_half";
    const halfDayText =
      ev.half_day_slot === "first_half" || ev.leave_type === "first_half"
        ? "1st Half"
        : "2nd Half";

    const isMultiDay =
      ev.start_date && ev.end_date && ev.start_date !== ev.end_date;

    // Resolve detailed request to get approved_by_name purely on frontend
    const detailed =
      ev.kind === "wfh"
        ? detailedWfhMap[ev.id]
        : detailedLeavesMap[ev.id];
    const approvedByName =
      ev.approved_by_name || detailed?.approved_by_name;
    const approvedByEmp = approvedByName
      ? employeeMap[approvedByName.toLowerCase().trim()]
      : null;
    const approverRole =
      ev.approved_by_role ||
      approvedByEmp?.role ||
      approvedByEmp?.designation ||
      (approvedByName && approvedByName.toLowerCase().includes("admin")
        ? "Admin"
        : approvedByName
          ? "PM"
          : null);

    return (
      <div
        key={`${ev.kind}-${ev.id || ev.employee_id}-${ev.start_date || ev.date || Math.random()}`}
        className={`rounded-xl p-2.5 transition-all ${isPending
          ? "bg-amber-100/70 border-2 border-amber-400 ring-1 ring-amber-400/25 shadow-[0_2px_8px_rgba(245,158,11,0.12)] hover:border-amber-500"
          : isWfh
            ? "bg-white border border-purple-200/90 hover:border-purple-300 hover:shadow-xs shadow-[0_1px_3px_rgba(28,25,23,0.04)]"
            : "bg-white border border-stone-200 hover:border-stone-300 hover:shadow-xs shadow-[0_1px_3px_rgba(28,25,23,0.04)]"
          }`}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Left: Avatar + Name + Secondary Tags (HalfDay / MultiDay) */}
          <div className="flex items-center gap-2.5 min-w-0">
            <UserAvatar
              src={avatarUrl}
              name={ev.employee_name}
              size="sm"
              rounded="rounded-full"
              className="shrink-0"
            />
            <div className="min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-xs font-bold truncate ${isPending ? "text-amber-950" : "text-stone-800"}`}>
                  {formatDisplayName(ev.employee_name)}
                </span>
                {empProfile?.role && (
                  <span className={`text-[10px] font-normal ${isPending ? "text-amber-800/70" : "text-stone-400"}`}>
                    · {empProfile.role}
                  </span>
                )}
              </div>

              {/* Secondary Tags (Multi Day only) */}
              {isMultiDay && (
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border shadow-2xs ${isPending
                      ? "bg-amber-50 text-amber-950 border-amber-300"
                      : "bg-slate-100 text-slate-800 border-slate-300"
                      }`}
                  >
                    <Calendar
                      className={`w-2.5 h-2.5 shrink-0 ${isPending ? "text-amber-700" : "text-slate-700"
                        }`}
                    />
                    {format(parseISO(ev.start_date), "MMM d")} –{" "}
                    {format(parseISO(ev.end_date), "MMM d")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Leave Type Badge + Actions or Approved Status Tick */}
          <div className="shrink-0 flex items-center gap-2">
            {/* Leave / WFH / Half-day Type Badge */}
            {isWfh ? (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border shadow-2xs ${isPending
                  ? "bg-purple-100 text-purple-900 border-purple-300"
                  : "bg-purple-50 text-purple-700 border-purple-200/90"
                  }`}
              >
                <Home className="w-3.5 h-3.5 text-purple-600 shrink-0" /> WFH
              </span>
            ) : isHalfDay ? (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border shadow-2xs ${isPending
                  ? "bg-indigo-100 text-indigo-900 border-indigo-300"
                  : "bg-indigo-50 text-indigo-700 border-indigo-200/90"
                  }`}
              >
                <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> {halfDayText}
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border shadow-2xs ${isPending
                  ? "bg-amber-200/90 text-amber-950 border-amber-400"
                  : ev.leave_type === "paid"
                    ? "bg-blue-50 text-blue-700 border-blue-200/90"
                    : ev.leave_type === "casual_sick" ||
                      ev.leave_type === "casual" ||
                      ev.leave_type === "sick"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/90"
                      : ev.leave_type === "floater"
                        ? "bg-amber-50 text-amber-700 border-amber-200/90"
                        : "bg-stone-50 text-stone-700 border-stone-200/90"
                  }`}
              >
                {leaveConfig.label}
              </span>
            )}

            {/* Approval Actions (for pending) */}
            {isPending && isAdminOrPm ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={isMutatingAnyAction}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isWfh) {
                      rejectWfhMutation.mutate(ev.id);
                    } else {
                      rejectLeaveMutation.mutate(ev.id);
                    }
                  }}
                  className="w-6.5 h-6.5 rounded-full flex items-center justify-center text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border-2 border-rose-300 hover:border-rose-400 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  title="Reject application"
                >
                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  disabled={isMutatingAnyAction}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isWfh) {
                      approveWfhMutation.mutate({ id: ev.id });
                    } else {
                      approveLeaveMutation.mutate({ id: ev.id });
                    }
                  }}
                  className="w-6.5 h-6.5 rounded-full flex items-center justify-center text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-300 hover:border-emerald-400 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  title="Approve application"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            ) : isPending ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-400 shadow-2xs">
                <Clock className="w-2.5 h-2.5" /> Pending
              </span>
            ) : null}
          </div>
        </div>

        {/* Reason / Notes */}
        {ev.reason && ev.reason.trim() && (
          <div
            className={`mt-2 text-xs font-medium px-2.5 py-1.5 rounded-lg border leading-relaxed ${isPending
              ? "bg-white/95 text-stone-900 border-amber-300 shadow-2xs"
              : "bg-stone-100/80 text-stone-800 border-stone-200/90"
              }`}
          >
            "{ev.reason.trim()}"
          </div>
        )}

        {/* Approver Info (for approved requests) */}
        {!isPending && approvedByName && (
          <div className="mt-1.5 flex items-center justify-end gap-1 text-[10px] text-stone-400 font-medium">
            <span>Approved by</span>
            <span className="font-bold text-stone-600">
              {formatDisplayName(approvedByName)}
            </span>
            {approverRole && (
              <span className="text-stone-500 font-semibold">
                (
                {approverRole.toLowerCase() === "admin"
                  ? "Admin"
                  : approverRole.toLowerCase() === "pm"
                    ? "PM"
                    : approverRole.toLowerCase() === "team_lead"
                      ? "Team Lead"
                      : approverRole.toLowerCase() === "hr"
                        ? "HR"
                        : approverRole
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                )
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch w-full">
      {/* ════════════════════════════════════════════
          LEFT: CALENDAR MONTH GRID CARD
          Matches corners and paddings with Employee Dashboard
          ════════════════════════════════════════════ */}
      <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-xl border border-stone-200 shadow-[0_1px_4px_rgba(28,25,23,0.06)] overflow-hidden flex flex-col h-[calc(100vh-170px)] min-h-[560px]">
        {/* ── Month Header ────────────────────────────────────────── */}
        <div className="bg-blue-600 px-3.5 py-2 flex items-center justify-between shrink-0 rounded-t-xl">
          <button
            onClick={prevMonth}
            className="p-1 rounded-md bg-white/15 text-white hover:bg-white/25 active:scale-95 transition-all cursor-pointer"
            title="Previous month"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-1.5">
            <Calendar size={15} className="text-white/90" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              {monthLabel}
            </h3>
          </div>

          <button
            onClick={nextMonth}
            className="p-1 rounded-md bg-white/15 text-white hover:bg-white/25 active:scale-95 transition-all cursor-pointer"
            title="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* ── Legend ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 px-3 py-1.5 bg-stone-50/80 border-b border-stone-200 shrink-0">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-full inline-block bg-blue-600 shadow-2xs" />
            Leaves
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-full inline-block bg-purple-600 shadow-2xs" />
            WFH
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-full inline-block bg-red-700 shadow-2xs" />
            Holiday (Fixed)
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-full inline-block bg-orange-500 shadow-2xs" />
            Holiday (Floater)
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-full inline-block bg-red-700 shadow-2xs" />
            Weekend
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-full inline-block bg-cyan-500 shadow-2xs" />
            Today
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-700 font-semibold ml-1">
            <span className="w-2 h-2 rounded-full inline-block bg-amber-500 animate-dot-pulse-amber shadow-2xs" />
            Pending Requests
          </span>
        </div>

        {/* ── Days Grid Container ──────────────────────────────────── */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
            <div className="w-7 h-7 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            Loading calendar…
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col p-2 overflow-hidden">
            {/* Day-name header */}
            <div className="grid grid-cols-7 mb-1 bg-slate-50/90 rounded-md py-1 shrink-0 border border-slate-100">
              {DAY_NAMES.map((d, i) => (
                <div
                  key={d}
                  className={`text-center text-[10.5px] font-bold uppercase tracking-wider ${i === 0 || i === 6 ? "text-red-500" : "text-slate-500"
                    }`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells dynamic grid (fills 100% available container height) */}
            <div
              className="grid grid-cols-7 gap-1 flex-1 min-h-0"
              style={{
                gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))`,
              }}
            >
              {cells.map((day, idx) => {
                if (!day) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="rounded-lg border border-dashed border-slate-100 bg-slate-50/40"
                    />
                  );
                }

                const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const events = eventsByDate[dateStr] || [];
                const isToday = dateStr === todayStr;

                // Day-of-week: 0=Sun, 6=Sat
                const dow = new Date(year, month - 1, day).getDay();
                const isWeekend = dow === 0 || dow === 6;
                const holiday = HOLIDAYS[dateStr];
                const isFixed = holiday?.type === "fixed";
                const isFloater = holiday?.type === "floater";

                // In Admin/PM mode, single selection
                const isSelectedAdmin = isAdminOrPm && dateStr === selectedDate;

                // In Employee mode, range selection
                const isSelectedStart =
                  !isAdminOrPm && selectedStart && dateStr === selectedStart;
                const isSelectedEnd =
                  !isAdminOrPm && selectedEnd && dateStr === selectedEnd;
                const isSelectedRange =
                  !isAdminOrPm &&
                  selectedStart &&
                  selectedEnd &&
                  dateStr > selectedStart &&
                  dateStr < selectedEnd;

                const hasPending = events.some((ev) => ev.status === "pending");

                // Cell background priority
                let cellBg = "bg-white";
                let cellBorder = "border-slate-200/90";
                let numberBg = "bg-transparent";
                let numberColor = "text-slate-600";

                if (isToday) {
                  cellBg = isWeekend
                    ? "bg-red-200/90 hover:bg-red-300/80"
                    : "bg-white";
                  cellBorder = isWeekend
                    ? "border-red-400 ring-1 ring-red-500/35"
                    : "border-slate-200/90";
                  numberBg = "bg-cyan-600 shadow-xs";
                  numberColor = "text-white font-extrabold";
                } else if (isFixed) {
                  cellBg = "bg-red-200/90 hover:bg-red-300/80";
                  cellBorder = "border-red-400 ring-1 ring-red-500/35";
                  numberBg = "bg-transparent";
                  numberColor = "text-red-950 font-bold";
                } else if (isFloater) {
                  cellBg = isWeekend
                    ? "bg-red-200/90 hover:bg-red-300/80"
                    : "bg-white";
                  cellBorder = isWeekend
                    ? "border-red-400 ring-1 ring-red-500/35"
                    : "border-slate-200/90";
                  numberBg = "bg-orange-600 shadow-xs";
                  numberColor = "text-white";
                } else if (isWeekend) {
                  cellBg = "bg-red-200/90 hover:bg-red-300/80";
                  cellBorder = "border-red-400 ring-1 ring-red-500/35";
                  numberBg = "bg-transparent";
                  numberColor = "text-red-950 font-bold";
                }

                return (
                  <div
                    key={dateStr}
                    onClick={() => handleCellClick(dateStr)}
                    className={`rounded-lg p-1.5 flex flex-col justify-between min-h-0 transition-all cursor-pointer relative select-none border ${cellBg} ${cellBorder} ${isSelectedAdmin
                      ? "border-2 border-blue-700 ring-2 ring-blue-500/50 bg-blue-100 shadow-[0_4px_14px_rgba(37,99,235,0.28)] z-10 -translate-y-0.5"
                      : isSelectedStart || isSelectedEnd
                        ? "border-2 border-blue-700 ring-2 ring-blue-500/50 bg-blue-100 shadow-[0_4px_14px_rgba(37,99,235,0.28)] z-10 -translate-y-0.5"
                        : isSelectedRange
                          ? "bg-blue-100/75 border-blue-300"
                          : "hover:border-slate-400 hover:shadow-2xs hover:-translate-y-0.5"
                      }`}
                  >
                    {/* Top Row: Holiday text on left, Day number + Pending dot on right */}
                    <div className="flex items-center justify-between gap-1 w-full shrink-0">
                      {isFloater ? (
                        <div className="flex items-center justify-between gap-1 w-full px-1.5 py-0.5 rounded-md bg-orange-600 text-white shadow-2xs min-w-0">
                          <span className="truncate text-[8.5px] font-bold leading-tight">
                            {formatDisplayName(holiday.name)}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {hasPending && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-200 animate-dot-pulse-amber shrink-0 inline-block" />
                            )}
                            <span className="text-[10px] font-extrabold leading-none">
                              {day}
                            </span>
                          </div>
                        </div>
                      ) : isFixed ? (
                        <div className="flex items-center justify-between gap-1 w-full px-1.5 py-0.5 rounded-md bg-red-800 text-white shadow-2xs min-w-0">
                          <span className="truncate text-[8.5px] font-bold leading-tight">
                            {formatDisplayName(holiday.name)}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {hasPending && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-200 animate-dot-pulse-amber shrink-0 inline-block" />
                            )}
                            <span className="text-[10px] font-extrabold leading-none">
                              {day}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1" />

                          <div className="flex items-center gap-1 shrink-0">
                            {hasPending && (
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-dot-pulse-amber shrink-0 inline-block" />
                            )}
                            <span
                              className={`text-[10.5px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 leading-none ${(isSelectedAdmin || isSelectedStart || isSelectedEnd) && !numberBg.includes("bg-")
                                ? "bg-blue-600 text-white shadow-xs font-black"
                                : `${numberBg} ${numberColor}`
                                }`}
                            >
                              {day}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Bottom Event Chips */}
                    <div className="flex flex-col gap-0.5 mt-auto min-h-0 overflow-hidden">
                      {events.slice(0, 2).map((ev, ei) => (
                        <EventChip key={ei} ev={ev} />
                      ))}
                      {events.length > 2 && (
                        <div className="text-[8.5px] font-semibold text-slate-500 bg-slate-100 px-1 py-0.2 rounded text-center border border-slate-200/70 truncate">
                          +{events.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════
          RIGHT SIDE PANEL: 
          - ADMIN & PM: SEGREGATED ATTENDANCE & LEAVES VIEW
          - EMPLOYEE: APPLY FOR TIME OFF FORM
          Matches exact height with Left Calendar card
          ════════════════════════════════════════════ */}
      <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-xl border border-stone-200 shadow-[0_1px_4px_rgba(28,25,23,0.06)] p-3 flex flex-col h-[calc(100vh-170px)] min-h-[560px]">
        {isAdminOrPm ? (
          /* ──────────── ADMIN & PM ATTENDANCE & LEAVES VIEW ──────────── */
          !selectedDate ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3 border border-slate-200">
                <Calendar className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">
                Select a Date
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[240px]">
                Click on any date tile in the calendar to view team members on
                leave or working from home on that day.
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full min-h-0">
              {/* ── Top Header Card (Clean & Concise) ── */}
              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 shadow-2xs shrink-0 mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 shadow-2xs flex items-center justify-center font-bold text-stone-700 shrink-0">
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h4 className="text-xs font-bold text-stone-900 truncate">
                      {format(parseISO(selectedDate), "EEEE, MMMM d, yyyy")}
                    </h4>
                    {isSelectedToday && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-cyan-600 text-white uppercase tracking-wider shrink-0">
                        Today
                      </span>
                    )}
                  </div>
                </div>

                {/* Holiday / Weekend Banner */}
                {selectedHoliday && (
                  <div
                    className={`mt-2 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-2 border ${selectedHoliday.type === "fixed"
                      ? "bg-red-50 text-red-800 border-red-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                    <span className="truncate">
                      {selectedHoliday.name} (
                      {selectedHoliday.type === "fixed"
                        ? "Fixed Holiday — Office Closed"
                        : "Optional Floater Holiday"}
                      )
                    </span>
                  </div>
                )}

                {!selectedHoliday && isSelectedWeekend && (
                  <div className="mt-2 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-2 border bg-rose-50 text-rose-800 border-rose-200">
                    <Calendar className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span>Weekend (Off-day)</span>
                  </div>
                )}
              </div>

              {/* ── Sub-Filter Bar (All · Leaves · WFH) ── */}
              <div className="inline-flex items-center rounded-xl border border-stone-200 bg-stone-100/70 p-1 w-full mb-3 shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => setAttendanceFilter("all")}
                  className={`flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${attendanceFilter === "all"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-stone-600 hover:text-blue-700 hover:bg-blue-50/60"
                    }`}
                >
                  All ({selectedDateEvents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceFilter("leaves")}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${attendanceFilter === "leaves"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-stone-600 hover:text-blue-700 hover:bg-blue-50/60"
                    }`}
                >
                  <Calendar
                    className={`w-3 h-3 ${attendanceFilter === "leaves"
                      ? "text-white"
                      : "text-blue-600"
                      }`}
                  />
                  Leaves ({leaveEvents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceFilter("wfh")}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${attendanceFilter === "wfh"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-stone-600 hover:text-blue-700 hover:bg-blue-50/60"
                    }`}
                >
                  <Home
                    className={`w-3 h-3 ${attendanceFilter === "wfh"
                      ? "text-white"
                      : "text-purple-600"
                      }`}
                  />
                  WFH ({wfhEvents.length})
                </button>
              </div>

              {/* ── Scrollable Segregated Lists (fills 100% remaining space) ── */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 pr-1">
                {selectedDateEvents.length === 0 ? (
                  isSelectedWeekend ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4 bg-rose-50/40 rounded-xl border border-dashed border-rose-200">
                      <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center mb-2">
                        <Coffee className="w-4.5 h-4.5" />
                      </div>
                      <h5 className="text-xs font-bold text-rose-900">
                        Weekend (Off Day)
                      </h5>
                    </div>
                  ) : selectedHoliday?.type === "fixed" ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4 bg-red-50/40 rounded-xl border border-dashed border-red-200">
                      <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 border border-red-200 flex items-center justify-center mb-2">
                        <Sparkles className="w-4.5 h-4.5" />
                      </div>
                      <h5 className="text-xs font-bold text-red-900 mb-0.5">
                        {selectedHoliday.name}
                      </h5>
                      <p className="text-[11px] text-red-700 max-w-[220px] leading-relaxed">
                        Company fixed holiday (Office Closed). All team members have an off day.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4 bg-stone-50/60 rounded-xl border border-dashed border-stone-200">
                      <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mb-2">
                        <CheckCircle2 className="w-4.5 h-4.5" />
                      </div>
                      <h5 className="text-xs font-bold text-stone-800 mb-0.5">
                        No Absences or WFH
                      </h5>
                      <p className="text-[11px] text-stone-500 max-w-[240px] leading-relaxed">
                        {selectedHoliday?.type === "floater"
                          ? `Optional floater holiday (${selectedHoliday.name}). No employees have applied for floater leave today.`
                          : "All team members are scheduled to be in-office today."}
                      </p>
                    </div>
                  )
                ) : (
                  <>
                    {/* ──────────────────────────────────────────────────────────
                        SECTION 1: PENDING APPROVALS (MOVED TO TOP)
                        ────────────────────────────────────────────────────────── */}
                    {visiblePending.length > 0 && (
                      <div className="space-y-2 pb-2 border-b border-stone-200/70">
                        <div className="flex items-center gap-1.5 pb-1.5 border-b-2 border-amber-500 mb-2">
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <h4 className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wider">
                            Pending Approval
                          </h4>
                          <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-amber-500 text-white shadow-xs leading-none ml-0.5">
                            {visiblePending.length}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {visiblePending.map((ev) =>
                            renderLeaveCard(ev, true),
                          )}
                        </div>
                      </div>
                    )}

                    {/* ──────────────────────────────────────────────────────────
                        SECTION 2: ON LEAVE (Time-off)
                        ────────────────────────────────────────────────────────── */}
                    {(attendanceFilter === "all" ||
                      attendanceFilter === "leaves") && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 pb-1.5 border-b-2 border-blue-400/90 mb-2">
                            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <h4 className="text-[11px] font-extrabold text-blue-900 uppercase tracking-wider">
                              On Leave
                            </h4>
                            <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-blue-100 text-blue-700 border border-blue-200 leading-none ml-0.5">
                              {approvedLeaves.length}
                            </span>
                          </div>

                          {approvedLeaves.length === 0 ? (
                            <div className="p-2.5 text-center rounded-xl bg-stone-50/60 border border-dashed border-stone-200 text-[11px] text-stone-400">
                              No employees on leave for this date
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {approvedLeaves.map((ev) =>
                                renderLeaveCard(ev, false),
                              )}
                            </div>
                          )}
                        </div>
                      )}

                    {/* ──────────────────────────────────────────────────────────
                        SECTION 3: WORK FROM HOME (WFH)
                        ────────────────────────────────────────────────────────── */}
                    {(attendanceFilter === "all" ||
                      attendanceFilter === "wfh") && (
                        <div className="space-y-2 pt-2 border-t border-stone-200/60">
                          <div className="flex items-center gap-1.5 pb-1.5 border-b-2 border-purple-400/90 mb-2">
                            <Home className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <h4 className="text-[11px] font-extrabold text-purple-900 uppercase tracking-wider">
                              Work From Home
                            </h4>
                            <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-purple-100 text-purple-700 border border-purple-200 leading-none ml-0.5">
                              {approvedWfh.length}
                            </span>
                          </div>

                          {approvedWfh.length === 0 ? (
                            <div className="p-2.5 text-center rounded-xl bg-stone-50/60 border border-dashed border-stone-200 text-[11px] text-stone-400">
                              No employees on WFH for this date
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {approvedWfh.map((ev) =>
                                renderLeaveCard(ev, false),
                              )}
                            </div>
                          )}
                        </div>
                      )}
                  </>
                )}
              </div>
            </div>
          )
        ) : (
          /* ──────────── EMPLOYEE APPLY FOR TIME OFF FORM ──────────── */
          !selectedStart ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 text-slate-400">
              <Calendar className="w-10 h-10 text-slate-300 mb-3" />
              <h4 className="text-sm font-bold text-slate-800 mb-1">
                No Date Selected
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[240px]">
                Click any date on the calendar to begin applying for a leave or
                WFH. Click a second date to select a range.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleApplySubmit}
              className="flex flex-col h-full justify-between gap-3"
            >
              <div>
                <h4 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 mb-2.5">
                  Apply for Time Off
                </h4>

                {/* Date info card */}
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-2.5 mb-2.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    Selected Period
                  </p>
                  <p className="text-xs font-bold text-slate-800">
                    {selectedStart === selectedEnd
                      ? formattedStart
                      : `${formattedStart} — ${formattedEnd}`}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {workingDays} working day{workingDays !== 1 ? "s" : ""}
                    {nonWorkingDays > 0 && (
                      <span className="text-slate-400">
                        {" "}
                        ({nonWorkingDays} holiday/weekend skipped)
                      </span>
                    )}
                  </p>
                </div>

                {/* Dropdown Type Select */}
                <div className="mb-2.5">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Leave Type
                  </label>
                  <Dropdown
                    options={[
                      { value: "", label: "Select leave type..." },
                      ...LEAVE_TYPES,
                    ]}
                    value={leaveType}
                    onChange={(e) => setLeaveType(e)}
                  />
                </div>

                {/* Reason input */}
                <div className="mb-2.5">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Reason
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter reason for this request (required)..."
                    rows={2}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Error alerts */}
                {validationError && (
                  <div className="flex gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium items-start mb-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{validationError}</span>
                  </div>
                )}

                {/* Info note */}
                {leaveType && leaveType !== "wfh" && !validationError && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-[11px] leading-relaxed mb-2.5">
                    {RAZORPAY_NEGATIVE_BALANCE_NOTE}
                  </div>
                )}
              </div>

              {/* Submit buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStart(null);
                    setSelectedEnd(null);
                    setLeaveType("");
                    setReason("");
                  }}
                  className="flex-1 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={isSubmitDisabled}
                  isLoading={
                    createLeaveMutation.isPending || createWfhMutation.isPending
                  }
                  loadingText="Applying..."
                  style={{
                    flex: 2,
                    background: buttonBg,
                    color: buttonText,
                  }}
                >
                  <Send size={13} /> Apply
                </Button>
              </div>
            </form>
          )
        )}
      </div>
    </div>
  );
}
