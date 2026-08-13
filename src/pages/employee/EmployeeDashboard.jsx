import React, { useMemo, useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";

import {
  allocationApi,
  analyticsApi,
  authApi,
  employeeApi,
  leaveApi,
  perfEvalApi,
  subProjectApi,
  wfhApi,
  skillsApi,
} from "../../services/api";

import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Check,
  ChevronRight,
  ChevronDown, 
  FolderKanban,
  MessageSquare,
  Star,
  History,
  X,
  ShieldCheck,
  Home,
  HeartPulse,
  Mail,
  Phone,
  Hash,
  Clock3,
  Sparkles,
  BadgeCheck,
  Lock,
  Camera,
  Trash2,
  Pencil,
  Save,
  Loader2,
  Award,
  FileText,
  User,
  TrendingUp,
  LineChart,
  Trophy,
  Target,
  Plus
} from "lucide-react";

import {
  ANNUAL_LEAVE_QUOTA,
  INTERN_MONTHLY_PAID_QUOTA,
  getWorkingDayCount,
  isIntern,
} from "../../utils/leaveTypes";
import {
  differenceInCalendarDays,
  differenceInMonths,
  differenceInYears,
  format,
  parseISO,
  startOfMonth,
} from "date-fns";
import { setPageDetailTitle } from "../../utils/pageDetailTitle";

import fiftyHoursBadge from "../../components/badges/50hrs.png";
import twoHundredHoursBadge from "../../components/badges/200hrs.png";
import weeklyTopBadge from "../../components/badges/weekly_2.png";
import monthlyTopBadge from "../../components/badges/monthly_1.png";
import threeMonthsBadge from "../../components/badges/3months.png";
import sixMonthsBadge from "../../components/badges/6months.png";

/* ── Helpers ────────────────────────────────────────── */
function getNameInitials(name) {
  if (!name) return "EM";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const normalizeLeaveType = (type) => {
  if (!type) return "paid";
  const t = type.toLowerCase();
  if (
    t === "first_half" ||
    t === "second_half" ||
    t === "paid" ||
    t === "earned" ||
    t === "annual"
  )
    return "paid";
  if (t === "casual_sick" || t === "sick" || t === "casual" || t === "medical")
    return "casual_sick";
  if (t === "floater") return "floater";
  if (t === "wfh" || t === "work_from_home") return "wfh";
  return "paid";
};

function calculateTenure(dateStr) {
  if (!dateStr) return "3 Years 5 Months";
  try {
    const start = parseISO(dateStr);
    const now = new Date();
    const years = differenceInYears(now, start);
    const months = differenceInMonths(now, start) % 12;
    if (years === 0 && months === 0) return "1 Month";
    return `${years > 0 ? `${years} Year${years > 1 ? "s" : ""} ` : ""}${months} Month${
      months !== 1 ? "s" : ""
    }`;
  } catch {
    return "3 Years 5 Months";
  }
}

/* ── Achievement badge visual config ── */
const BADGE_STYLES = {
  "50-hours-week": { image: fiftyHoursBadge },
  "200-hours-month": { image: twoHundredHoursBadge },
  "weekly-top": { image: weeklyTopBadge },
  "monthly-top": { image: monthlyTopBadge },
  "three-months": { image: threeMonthsBadge },
  "six-months": { image: sixMonthsBadge },
};

/* ── Skills Multi-Select ─────────────────────────────── */
const SkillsMultiSelect = ({ selected, onChange, options, isLoading }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (skillName) => {
    onChange(
      selected.includes(skillName)
        ? selected.filter((s) => s !== skillName)
        : [...selected, skillName]
    );
  };

  return (
    <div ref={ref} className="relative w-full">
      
      <div className="mb-2 flex flex-wrap gap-1.5">
        {selected.map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-800"
          >
            {skill}
            <button
              type="button"
              onClick={() => toggle(skill)}
              className="rounded text-teal-600 hover:bg-teal-200 hover:text-teal-900"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-teal-300 focus:outline-none"
      >
        <span className="text-stone-400">Add or remove skills…</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-stone-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
          {isLoading ? (
            <div className="p-3 text-center text-xs text-stone-400">
              Loading skills…
            </div>
          ) : (
            options.map((skill) => {
              const isSelected = selected.includes(skill.name);
              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => toggle(skill.name)}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                    isSelected
                      ? "bg-teal-50 font-semibold text-teal-800"
                      : "hover:bg-stone-50 text-stone-700"
                  }`}
                >
                  <div
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${
                      isSelected
                        ? "border-teal-600 bg-teal-600 text-white"
                        : "border-stone-300"
                    }`}
                  >
                    {isSelected && <Check className="h-2.5 w-2.5" />}
                  </div>
                  {skill.name}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

const EmployeeDashboard = () => {
  const queryClient = useQueryClient();
  const params = useParams();
  const [showFullFeedback, setShowFullFeedback] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [editEmail, setEditEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [profileTab, setProfileTab] = useState("attendance");
  const [bottomTab, setBottomTab] = useState("notes");
  const [notesModal, setNotesModal] = useState({ isOpen: false, type: null, title: "", data: [] });
  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const localUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = localUser.role === "admin";
  const employeeId = params.id || localUser.employee_id || localUser.id || 1;

  /* ── Queries ─────────────────────────────────────── */
  const { data: account } = useQuery({
    queryKey: ["auth-me"],
    queryFn: authApi.me,
  });
  const { data: employee } = useQuery({
    queryKey: ["employee-profile", employeeId],
    queryFn: () => employeeApi.getOne(employeeId),
    enabled: !!employeeId,
  });

  const loggedInEncordId = employee?.encord_id?.trim().toLowerCase() || "";

  const { data: allocations = [] } = useQuery({
    queryKey: ["my-allocations", employeeId],
    queryFn: () => allocationApi.getByEmployee(employeeId),
    enabled: !!employeeId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["sub-projects"],
    queryFn: subProjectApi.getAll,
  });

  const { data: allLeaves = [] } = useQuery({
    queryKey: ["my-leaves", employeeId],
    queryFn: () => leaveApi.getAll({ employee_id: employeeId }),
    enabled: !!employeeId,
  });

  const { data: myWfh = [] } = useQuery({
    queryKey: ["my-wfh", employeeId],
    queryFn: () => wfhApi.getAll({ employee_id: employeeId }),
    enabled: !!employeeId,
  });

  const { data: perfReviews = [] } = useQuery({
    queryKey: ["employee-perf-reviews", employeeId],
    queryFn: () => perfEvalApi.getAll({ employee_id: employeeId }),
    enabled: !!employeeId,
  });

  const { data: dailyLeaderboard } = useQuery({
    queryKey: ["leaderboard-day"],
    queryFn: () => analyticsApi.getLeaderboard({ range: "day" }),
  });
  const { data: weeklyLeaderboard } = useQuery({
    queryKey: ["leaderboard-week"],
    queryFn: () => analyticsApi.getLeaderboard({ range: "week" }),
  });
  const { data: monthlyLeaderboard } = useQuery({
    queryKey: ["leaderboard-month"],
    queryFn: () => analyticsApi.getLeaderboard({ range: "month" }),
  });

  const { data: skillsList = [], isLoading: skillsLoading } = useQuery({
    queryKey: ["skills-list"],
    queryFn: skillsApi.getAll,
  });

  const getEmployeeRank = (leaderboard) => {
    if (!leaderboard?.leaderboard || !loggedInEncordId) return null;
    const ranked = [...leaderboard.leaderboard].sort(
      (a, b) => (b.total_hours || 0) - (a.total_hours || 0)
    );
    const index = ranked.findIndex(
      (item) => (item.user_email || "").trim().toLowerCase() === loggedInEncordId
    );
    return index >= 0 ? index + 1 : null;
  };

  const dailyRank = useMemo(
    () => getEmployeeRank(dailyLeaderboard),
    [dailyLeaderboard, loggedInEncordId]
  );
  const weeklyRank = useMemo(
    () => getEmployeeRank(weeklyLeaderboard),
    [weeklyLeaderboard, loggedInEncordId]
  );
  const monthlyRank = useMemo(
    () => getEmployeeRank(monthlyLeaderboard),
    [monthlyLeaderboard, loggedInEncordId]
  );

  /* ── Profile ─────────────────────────────────────── */
  const profile = useMemo(() => {
    const name = employee?.name || account?.name || localUser.name || "";
    const jobTitle = employee?.designation || account?.role || "Annotator/Reviewer";
    const status = employee?.status || "active";
    const avatarUrl = employee?.avatar_url || account?.avatar_url || localUser.avatar_url || null;
    const rawJoiningDate = employee?.joining_date || employee?.created_at;
    const joiningDate = rawJoiningDate
      ? format(parseISO(rawJoiningDate), "dd MMM yyyy")
      : "";
    const tenure = calculateTenure(rawJoiningDate);
    const badge = employee?.employee_type || localUser.employee_type || "";
    const initials = getNameInitials(name);

    const email = employee?.email || account?.email || localUser.email || "";
    const phone = employee?.phone || account?.phone || "";
    const encordId = employee?.encord_id || "";
    const slackUserId = employee?.slack_user_id || "";
    const skills = employee?.skills || account?.skills || localUser.skills || [];
    const empId = employee?.id || employeeId || "";
    const workingHours = employee?.working_hours_per_day;
    const weeklyAvailability = employee?.weekly_availability;

    return {
      name,
      jobTitle,
      status,
      avatarUrl,
      joiningDate,
      tenure,
      badge,
      initials,
      email,
      phone,
      encordId,
      slackUserId,
      skills,
      empId,
      workingHours,
      weeklyAvailability,
    };
  }, [account, employee, localUser, employeeId]);

  useEffect(() => {
    if (isAdmin && params.id && profile.name) {
      setPageDetailTitle(profile.name);
    }
  }, [isAdmin, params.id, profile.name]);

  /* ── Edit State & Mutations ──────────────────────── */
  const [isEditing, setIsEditing] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [editSkills, setEditSkills] = useState([]);
  const [editSlackId, setEditSlackId] = useState("");
  const [editEncordId, setEditEncordId] = useState("");
  const [saveError, setSaveError] = useState("");

  const enterEditMode = () => {
    setEditPhone(profile.phone || "");
    setEditSkills([...(profile.skills || [])]);
    setEditSlackId(profile.slackUserId || "");
    setEditEncordId(profile.encordId || "");
    setEditEmail(profile.email || "");
    setSaveError("");
    setEmailError("");
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setSaveError("");
  };

  const changeEmailMutation = useMutation({
    mutationFn: (newEmail) => employeeApi.changeEmail(employeeId, newEmail),
    onSuccess: (updated) => {
      try {
        const cached = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem(
          "user",
          JSON.stringify({ ...cached, email: updated.email })
        );
      } catch {}
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
      queryClient.invalidateQueries({ queryKey: ["employee-profile", employeeId] });
      setEmailError("");
    },
    onError: (err) => {
      setEmailError(err?.response?.data?.detail || "Could not change email.");
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data) => employeeApi.update(employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-profile", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
      setIsEditing(false);
      setSaveError("");
    },
    onError: (err) => {
      setSaveError(err?.response?.data?.detail || "Failed to save changes.");
    },
  });

  const COMPANY_DOMAIN = "autonexai360.com";

  const handleSave = async () => {
    // First save the normal fields
    saveMutation.mutate({
      phone: editPhone || null,
      skills: editSkills,
      slack_user_id: editSlackId || null,
      encord_id: editEncordId || null,
    });

    // Then handle email change if needed
    const trimmedEmail = editEmail.trim().toLowerCase();
    const originalEmail = (profile.email || "").trim().toLowerCase();

    if (
      trimmedEmail &&
      trimmedEmail !== originalEmail &&
      trimmedEmail.endsWith(`@${COMPANY_DOMAIN}`) &&
      trimmedEmail.split("@")[0].length > 0
    ) {
      changeEmailMutation.mutate(trimmedEmail);
    }
  };

  /* ── Avatar Mutations ────────────────────────────── */
  const fileInputRef = useRef(null);
  const [avatarError, setAvatarError] = useState("");

  const onAvatarSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["employee-profile", employeeId] });
    queryClient.invalidateQueries({ queryKey: ["auth-me"] });
    setAvatarError("");
  };

  const uploadAvatarMutation = useMutation({
    mutationFn: (formData) => employeeApi.uploadAvatar(employeeId, formData),
    onSuccess: onAvatarSuccess,
    onError: (err) =>
      setAvatarError(err?.response?.data?.detail || "Upload failed."),
  });

  const slackAvatarMutation = useMutation({
    mutationFn: () => employeeApi.setAvatarFromSlack(employeeId),
    onSuccess: onAvatarSuccess,
    onError: (err) =>
      setAvatarError(err?.response?.data?.detail || "Slack sync failed."),
  });

  const deleteAvatarMutation = useMutation({
    mutationFn: () => employeeApi.deleteAvatar(employeeId),
    onSuccess: onAvatarSuccess,
    onError: (err) =>
      setAvatarError(err?.response?.data?.detail || "Delete failed."),
  });

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Max size 5 MB.");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    uploadAvatarMutation.mutate(formData);
    e.target.value = "";
  };

  const avatarBusy =
    uploadAvatarMutation.isPending ||
    slackAvatarMutation.isPending ||
    deleteAvatarMutation.isPending;

  /* ── Performance ─────────────────────────────────── */
  const latestPmReview = useMemo(() => {
    return [...perfReviews]
      .filter((review) => review.status === "reviewed")
      .sort(
        (a, b) =>
          new Date(b.reviewed_at || b.updated_at || b.created_at) -
          new Date(a.reviewed_at || a.updated_at || a.created_at)
      )[0];
  }, [perfReviews]);

  const latestRating = useMemo(() => {
    if (!latestPmReview?.parameter_values?.length) return null;
    const ratings = latestPmReview.parameter_values
      .map((p) => p.pm_rating)
      .filter((r) => r != null);
    if (!ratings.length) return null;
    return (
      ratings.reduce((sum, value) => sum + value, 0) / ratings.length
    ).toFixed(1);
  }, [latestPmReview]);

  /* ── Projects ────────────────────────────────────── */
  const allEmployeeProjects = useMemo(() => {
    return allocations
      .map((alloc) => {
        const project = projects.find((p) => p.id === alloc.sub_project_id);
        const isActive = project?.project_status === "active";
        return {
          id: alloc.id,
          name: project?.name || "Project",
          role: (alloc.role_tags || []).join(", ") || profile.jobTitle || "Developer",
          status: isActive ? "active" : "completed",
          startDate: alloc.active_start_date
            ? format(parseISO(alloc.active_start_date), "dd MMM yyyy")
            : "-",
          endDate: alloc.active_end_date
            ? format(parseISO(alloc.active_end_date), "dd MMM yyyy")
            : "Ongoing",
          symbol: (project?.name || "P")[0].toUpperCase(),
        };
      })
      .sort((a, b) => (a.status === "active" ? -1 : 1));
  }, [allocations, projects, profile.jobTitle]);

  const activeProjects = useMemo(
    () => allEmployeeProjects.filter((p) => p.status === "active"),
    [allEmployeeProjects]
  );

  const currentMonthLabel = useMemo(() => format(new Date(), "MMMM yyyy"), []);
  const daysElapsedInMonth = useMemo(
    () => differenceInCalendarDays(new Date(), startOfMonth(new Date())) + 1,
    []
  );
  const currentSubProjectId = activeProjects[0]?.id;

  const { data: encordActivity } = useQuery({
    queryKey: [
      "my-encord-activity",
      employeeId,
      currentSubProjectId,
      currentMonthLabel,
    ],
    queryFn: () =>
      analyticsApi.getMyEncordActivity({
        days: daysElapsedInMonth,
        sub_project_id: currentSubProjectId,
        employee_id: employeeId,
      }),
    enabled: !!employeeId,
  });

  const totalDailyHours = encordActivity?.total_hours ?? 0;
  const dailyData = encordActivity?.daily || [];

  const activityStats = useMemo(() => {
    if (!dailyData.length)
      return { avgHours: 0, avgTeamHours: 0, deltaPct: 0, activeDays: 0 };
    const empSum = dailyData.reduce((s, d) => s + (d.employee_hours || 0), 0);
    const teamSum = dailyData.reduce((s, d) => s + (d.team_avg_hours || 0), 0);
    const activeDays = dailyData.filter((d) => (d.employee_hours || 0) > 0).length;
    const avgHours = empSum / dailyData.length;
    const avgTeamHours = teamSum / dailyData.length;
    const deltaPct =
      avgTeamHours > 0
        ? Math.round(((avgHours - avgTeamHours) / avgTeamHours) * 100)
        : 0;
    return {
      avgHours: Math.round(avgHours * 10) / 10,
      avgTeamHours: Math.round(avgTeamHours * 10) / 10,
      deltaPct,
      activeDays,
    };
  }, [dailyData]);

  /* ── Chart ───────────────────────────────────────── */
  const CHART_W = 640;
  const CHART_H = 90;
  const chartMax = useMemo(() => {
    if (!dailyData.length) return 10;
    const maxVal = Math.max(
      ...dailyData.map((d) =>
        Math.max(d.employee_hours || 0, d.team_avg_hours || 0)
      )
    );
    return Math.max(6, Math.ceil(maxVal / 2) * 2);
  }, [dailyData]);

  const chartGeometry = useMemo(() => {
    const stepX = dailyData.length > 1 ? CHART_W / (dailyData.length - 1) : 0;
    const toY = (v) =>
      CHART_H - (Math.min(v || 0, chartMax) / chartMax) * CHART_H;
    const points = dailyData.map((d, i) => ({
      x: i * stepX,
      yEmp: toY(d.employee_hours),
      yTeam: toY(d.team_avg_hours),
      date: d.date,
      employee_hours: d.employee_hours,
      team_avg_hours: d.team_avg_hours,
    }));
    const empLine = points.map((p) => `${p.x},${p.yEmp}`).join(" ");
    const teamLine = points.map((p) => `${p.x},${p.yTeam}`).join(" ");
    const areaFill = points.length
      ? `0,${CHART_H} ${empLine} ${points[points.length - 1].x},${CHART_H}`
      : "";
    return { points, empLine, teamLine, areaFill, stepX };
  }, [dailyData, chartMax]);

  const [hoverIndex, setHoverIndex] = useState(null);
  const svgRef = useRef(null);

  const handleChartMouseMove = (e) => {
    if (!chartGeometry.points.length || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * CHART_W;
    const idx = Math.round(relX / (chartGeometry.stepX || 1));
    setHoverIndex(
      Math.min(Math.max(idx, 0), chartGeometry.points.length - 1)
    );
  };

  const handleChartMouseLeave = () => setHoverIndex(null);
  const hoverPoint =
    hoverIndex !== null ? chartGeometry.points[hoverIndex] : null;

  /* ── Leaves & WFH ────────────────────────────────── */
  const employeeType =
    employee?.employee_type || localUser.employee_type || "Full-time";
  const internOrContractor = isIntern(employeeType);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const leavesAndWfhStats = useMemo(() => {
    const usedYear = { paid: 0, casual_sick: 0, floater: 0 };
    let paidUsedThisMonth = 0;

    allLeaves.forEach((leave) => {
      if ((leave.status || "pending").toLowerCase() !== "approved") return;
      const type = normalizeLeaveType(leave.leave_type);
      const days = leave.is_half_day
        ? 0.5
        : leave.start_date && leave.end_date
        ? getWorkingDayCount(leave.start_date, leave.end_date)
        : 1.0;
      if (!leave.start_date || !leave.end_date) {
        if (type in usedYear) usedYear[type] += days;
        return;
      }
      const d = new Date(leave.start_date + "T00:00:00");
      if (internOrContractor && type === "paid") {
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth)
          paidUsedThisMonth += days;
        return;
      }
      if (type in usedYear && d.getFullYear() === currentYear)
        usedYear[type] += days;
    });

    const paidQuota = internOrContractor
      ? INTERN_MONTHLY_PAID_QUOTA
      : ANNUAL_LEAVE_QUOTA?.paid || 22;
    const paidUsed = internOrContractor ? paidUsedThisMonth : usedYear.paid;
    const paidRemaining = Math.max(paidQuota - paidUsed, 0);

    const casualQuota = internOrContractor
      ? 0
      : ANNUAL_LEAVE_QUOTA?.casual_sick || 10;
    const casualUsed = usedYear.casual_sick;
    const casualRemaining = Math.max(casualQuota - casualUsed, 0);

    let totalWfhApproved = 0;

    myWfh.forEach((wfh) => {
      if ((wfh.status || "pending").toLowerCase() !== "approved") return;
      if (!wfh.wfh_date) return;

      const wfhStart = new Date(`${wfh.wfh_date}T00:00:00`);

      if (
        wfhStart.getFullYear() !== currentYear ||
        wfhStart.getMonth() !== currentMonth
      ) {
        return;
      }

      const days =
        wfh.end_date && wfh.end_date !== wfh.wfh_date
          ? getWorkingDayCount(wfh.wfh_date, wfh.end_date)
          : 1;

      totalWfhApproved += days;
    });

    const wfhQuota = internOrContractor ? 2 : 4;
    const wfhRemaining = Math.max(wfhQuota - totalWfhApproved, 0);

    const currentLeave = allLeaves.find((leave) => {
      if ((leave.status || "pending").toLowerCase() === "rejected") return false;
      return (
        leave.start_date &&
        leave.end_date &&
        leave.start_date <= todayStr &&
        leave.end_date >= todayStr
      );
    });

    return {
      paidRemaining,
      paidQuota,
      casualRemaining,
      casualQuota,
      wfhRemaining,
      wfhQuota,
      currentLeave,
      isInternOrContractor: internOrContractor,
    };
  }, [allLeaves, myWfh, internOrContractor, currentYear, currentMonth, todayStr]);

  const achievementBadges = useMemo(
    () => [
      { id: "50-hours-week", label: "50 Hours", meta: "Weekly", earned: true },
      { id: "200-hours-month", label: "200 Hours", meta: "Monthly", earned: true },
      { id: "weekly-top", label: "Weekly Top", meta: "Performer", earned: true },
      { id: "monthly-top", label: "Monthly Top", meta: "Performer", earned: false },
      { id: "three-months", label: "3 Months", meta: "Completed", earned: false },
      { id: "six-months", label: "6 Months", meta: "Completed", earned: false },
    ],
    []
  );
  const earnedBadgeCount = achievementBadges.filter((b) => b.earned).length;

  const display = (value, fallback = "Not set") => {
    if (value === null || value === undefined || value === "") return fallback;
    return value;
  };

  // Arrays for messages
  const complaintsList = employee?.complaints?.length ? employee.complaints : ["Late arrival reported by supervisor", "Missed daily sync meeting"];
  const warningsList = employee?.warnings?.length ? employee.warnings : ["First warning: Incomplete task submissions"];
  const recognitionsList = (employee?.recognitions?.length || employee?.recognition_messages?.length) 
    ? (employee.recognitions || employee.recognition_messages) 
    : ["Outstanding work on Project Alpha!", "Client praised communication skills"];

  const complaintsCount = employee?.complaints_count ?? complaintsList.length;
  const warningsCount = employee?.warnings_count ?? warningsList.length;

  return (
    <div
      className="w-full h-full text-stone-800  font-sans flex flex-col gap-2 sm:gap-3"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap');
        .font-display { font-family: 'Inter', sans-serif; letter-spacing: -0.01em; }
        .font-data { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
        .log-scroll::-webkit-scrollbar { width: 4px; }
        .log-scroll::-webkit-scrollbar-thumb { background: #D6D3D1; border-radius: 999px; }
        .badge-glow {
          filter: drop-shadow(0 0 4px rgba(13, 148, 136, 0.35))
                  drop-shadow(0 0 1.5px rgba(13, 148, 136, 0.25));
        }
      `}</style>

      {/* ════════════════ TOP SECTION ════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 items-stretch">
        
        {/* ──────────── PROFILE CARD ──────────── */}
        <div className="lg:col-span-5 rounded-xl border border-stone-200 p-3 shadow-sm bg-white flex gap-2.5">
          
          {/* Left Column: Avatar, Date, Phone, Skills */}
          <div className="flex flex-col shrink-0 w-[120px]">
            {/* Avatar - NO tick mark */}
            <div className="relative mb-3 mx-auto">
              {profile.avatarUrl && !imgError ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  onError={() => setImgError(true)}
                  className="w-24 h-24 rounded-full object-cover border border-stone-100 shadow-sm"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-50 to-stone-100 border border-stone-100 text-emerald-800 font-bold text-3xl flex items-center justify-center shadow-sm uppercase">
                  {profile.initials}
                </div>
              )}
            </div>

            {/* Date */}
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-stone-700 font-semibold w-full mb-1.5 px-0.5">
              <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="truncate text-center">{display(profile.joiningDate)}</span>
            </div>
            
            {/* Phone */}
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-stone-500 font-medium w-full mb-2 px-0.5">
              <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="truncate text-center">{profile.phone || "No phone"}</span>
            </div>

            <div className="w-full h-px bg-stone-100 mb-2" />

            {/* Skills */}
            {profile.skills?.length > 0 && (
              <div className="flex flex-col gap-1 w-full mt-1">
                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider ml-0.5">Skills</span>
                <div className="flex flex-wrap gap-1.5 w-full">
                  {profile.skills.slice(0, 3).map((skill, idx) => (
                    <span key={idx} className="bg-emerald-50/70 text-stone-700 px-2 py-0.5 rounded-full text-[9px] font-medium border border-emerald-100/50 leading-tight break-words max-w-full">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Details, Tabs, Cards */}
          <div className="flex-1 min-w-0 flex flex-col pt-1">
            {/* Badge + Name */}
            <div className="flex items-center gap-2 flex-wrap mb-2.5">
              <h1 className="font-display text-[16px] font-bold text-stone-900 truncate leading-none">
                {display(profile.name, "Employee")}
              </h1>
              {profile.badge && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  {profile.badge}
                </span>
              )}
            </div>

            {/* Email, Encord, Role */}
            <div className="text-[11px] text-stone-600 space-y-1.5 mb-3">
              <div className="flex items-center gap-2 truncate">
                <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span className={profile.email ? "text-stone-700" : "text-stone-400 italic"}>
                  {display(profile.email)}
                </span>
              </div>
              <div className="flex items-center gap-2 truncate">
                <span className="w-3.5 h-3.5 flex items-center justify-center text-[8px] font-bold border border-stone-400 rounded-sm text-stone-500 shrink-0">E</span>
                <span className="text-stone-500">EncordId:{" "}
                  {profile.encordId ? (
                    <span className="text-stone-700">{profile.encordId}</span>
                  ) : (
                    <span className="text-stone-400 italic">Not updated</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 truncate">
                <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span className="text-stone-500">Role: <span className="text-stone-700">{display(profile.jobTitle, "Annotator/Reviewer")}</span></span>
              </div>
            </div>

            {/* Divider only in right column */}
            <div className="w-full h-px bg-stone-100 mb-2" />
            
            {/* Tabs: Attendance | Notes */}
            <div className="flex flex-col gap-4 mt-1">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setProfileTab("attendance")}
                  className={`flex items-center gap-1.5 pb-1 border-b-[2px] font-semibold text-[10px] transition-colors ${
                    profileTab === "attendance"
                      ? "border-emerald-500 text-emerald-600"
                      : "border-transparent text-stone-400 hover:text-stone-600"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" /> Attendance
                </button>
                <button
                  type="button"
                  onClick={() => setProfileTab("notes")}
                  className={`flex items-center gap-1.5 pb-1 border-b-[2px] font-semibold text-[10px] transition-colors ${
                    profileTab === "notes"
                      ? "border-emerald-500 text-emerald-600"
                      : "border-transparent text-stone-400 hover:text-stone-600"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Notes
                </button>
              </div>

              {/* Tab content exactly matching image5 stats */}
              {profileTab === "attendance" ? (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      icon: <Home className="w-3.5 h-3.5 text-emerald-600" />,
                      label: "WFH",
                      remaining: leavesAndWfhStats.wfhRemaining,
                      quota: leavesAndWfhStats.wfhQuota,
                    },
                    {
                      icon: <Calendar className="w-3.5 h-3.5 text-emerald-600" />,
                      label: "Paid",
                      remaining: leavesAndWfhStats.paidRemaining,
                      quota: leavesAndWfhStats.paidQuota,
                    },
                    {
                      icon: <HeartPulse className="w-3.5 h-3.5 text-amber-600" />,
                      label: "Sick",
                      remaining: leavesAndWfhStats.isInternOrContractor
                        ? "—"
                        : leavesAndWfhStats.casualRemaining,
                      quota: leavesAndWfhStats.isInternOrContractor
                        ? "—"
                        : leavesAndWfhStats.casualQuota,
                    },
                  ].map(({ icon, label, remaining, quota }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center gap-0.5 border border-stone-200 rounded-xl pt-2 pb-1 shadow-sm bg-white"
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center ${
                          label === "Sick" ? "bg-orange-50" : "bg-emerald-50"
                        }`}
                      >
                        {icon}
                      </div>
                      <div className="text-center">
                        <div className="font-data text-lg font-extrabold text-stone-800 leading-none flex items-baseline justify-center gap-0.5">
                          <span>{remaining}</span>
                          {quota !== "—" && (
                            <span className="text-xs font-semibold text-stone-400">
                              / {quota}
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-medium text-stone-400 mt-0.5 block uppercase tracking-wider">
                          {label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: <AlertCircle className="w-3.5 h-3.5 text-rose-500" />, label: "Complaints", value: complaintsCount, color: "text-rose-600" },
                    { icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />, label: "Warnings", value: warningsCount, color: "text-amber-600" },
                    { icon: <Award className="w-3.5 h-3.5 text-emerald-600" />, label: "Recognition", value: recognitionsList.length, color: "text-emerald-600" },
                  ].map(({ icon, label, value, color }) => (
                    <div key={label} className="flex flex-col items-center gap-0.5 border border-stone-200 rounded-xl pt-2 pb-1 shadow-sm bg-white">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${label === 'Recognition' ? 'bg-emerald-50' : label === 'Warnings' ? 'bg-amber-50' : 'bg-rose-50'}`}>
                        {icon}
                      </div>
                      <div className="text-center">
                        <span className={`font-data text-lg font-extrabold leading-none block ${color}`}>{value}</span>
                        <span className="text-[9px] font-medium text-stone-400 mt-0.5 block uppercase tracking-wider">{label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ───────── BADGE (col-7) ───────── */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-xl p-3 flex flex-col gap-2 shadow-[0_1px_4px_rgba(28,25,23,0.06)]">
          
          {/* Header row */}
          <div className="flex items-center justify-between pb-1">
            <h2 className="font-display text-[15px] font-extrabold text-stone-900">Badges</h2>
            <div className="text-[10px] font-medium text-stone-500">
              <span className="text-emerald-600 font-bold">{earnedBadgeCount}/{achievementBadges.length}</span> badges earned
            </div>
          </div>

          {/* Badges row */}
          <div className="grid grid-cols-6 gap-2">
            {achievementBadges.map((badge) => {
              const style = BADGE_STYLES[badge.id];
              return (
                <div key={badge.id} className="relative flex flex-col items-center justify-between text-center p-2 rounded-2xl border border-stone-200 bg-white shadow-sm h-full">
                  <div className="absolute top-2 right-2 z-10">
                    {badge.earned ? (
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center border border-white">
                        <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full bg-stone-100 flex items-center justify-center border border-white">
                        <Lock className="w-2 h-2 text-stone-400" />
                      </div>
                    )}
                  </div>
                  <img
                    src={style?.image}
                    alt={badge.label}
                    className={`w-9 h-9 object-contain mt-1 mb-1 relative z-0 ${badge.earned ? "" : "grayscale opacity-40"}`}
                  />
                  <div className="flex flex-col items-center w-full">
                    <span className={`text-[9px] font-bold leading-tight w-full truncate px-1 ${badge.earned ? "text-stone-800" : "text-stone-400"}`}>
                      {badge.label}
                    </span>
                    <span className="text-[8px] font-medium text-stone-400 mt-0.5 truncate w-full px-1">{badge.meta}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats section */}
          <div className="flex flex-col gap-1.5 flex-1">
            <h3 className="font-display text-[15px] font-extrabold text-stone-900">Stats</h3>
            <div className="grid grid-cols-4 gap-2 flex-1">
              {/* Previous Day Rank */}
              <div className="bg-white border border-stone-200 rounded-2xl p-2.5 flex flex-col justify-between shadow-sm">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-semibold text-stone-500 leading-tight max-w-[50%]">Prev Day Rank</span>
                  <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                </div>
                <div className="flex items-end justify-between mt-2.5">
                  <div className="flex items-end gap-0.5">
                    <span className="font-data text-[22px] font-extrabold text-stone-800 leading-none">
                      {dailyRank ? `#${dailyRank}` : "–"}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 text-[8.5px] font-semibold text-emerald-600 -mb-0.5">
                    {dailyRank ? (
                      <>
                        <span className="text-[10px]">↑</span>
                        <span>{(dailyRank % 5) + 1}</span>
                      </>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Weekly Rank */}
              <div className="bg-white border border-stone-200 rounded-2xl p-2.5 flex flex-col justify-between shadow-sm">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-semibold text-stone-500 leading-tight max-w-[50%]">Weekly Rank</span>
                  <div className="w-6 h-6 rounded-full bg-violet-50 flex items-center justify-center shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-violet-600" />
                  </div>
                </div>
                <div className="flex items-end justify-between mt-2.5">
                  <div className="flex items-end gap-0.5">
                    <span className="font-data text-[22px] font-extrabold text-stone-800 leading-none">
                      {weeklyRank ? `#${weeklyRank}` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 text-[8.5px] font-semibold text-violet-600 -mb-0.5">
                    {weeklyRank ? (
                      <>
                        <span className="text-[10px]">↑</span>
                        <span>{(weeklyRank % 3) + 1}</span>
                      </>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Monthly Rank */}
              <div className="bg-white border border-stone-200 rounded-2xl p-2.5 flex flex-col justify-between shadow-sm">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-semibold text-stone-500 leading-tight max-w-[50%]">Monthly Rank</span>
                  <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <Award className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                </div>
                <div className="flex items-end justify-between mt-2.5">
                  <span className="font-data text-[22px] font-extrabold text-stone-800 leading-none">
                    {monthlyRank ? `#${monthlyRank}` : "—"}
                  </span>
                  <div className="flex items-center gap-0.5 text-[8.5px] font-semibold text-stone-400 -mb-0.5">
                    <span>—</span>
                    {monthlyRank && <span>No change</span>}
                  </div>
                </div>
              </div>

              {/* Monthly Rating */}
              <div className="relative bg-white border border-stone-200 rounded-2xl p-2.5 flex flex-col justify-between shadow-sm group cursor-default">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-semibold text-stone-500 leading-tight max-w-[50%]">Monthly Rating</span>
                  <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  </div>
                </div>
                <div className="flex items-end justify-between mt-2.5">
                  <div className="flex items-baseline gap-0.5">
                    <span className="font-data text-[22px] font-extrabold text-stone-800 leading-none">{latestRating || "—"}</span>
                    {latestRating && <span className="font-data text-[9px] font-bold text-stone-500">/5</span>}
                  </div>
                  <div className="flex items-center gap-0.5 -mb-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-2.5 h-2.5 ${(latestRating && s <= Math.floor(latestRating)) ? "fill-amber-400 text-amber-400" : "fill-stone-200 text-stone-200"}`} />
                    ))}
                  </div>
                </div>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-20">
                  <div className="bg-stone-800 text-white text-[10px] leading-relaxed rounded-lg p-2.5 shadow-xl text-center">
                    {latestPmReview?.overall_comment || "No comments recorded."}
                  </div>
                  <div className="w-2 h-2 bg-stone-800 rotate-45 mx-auto -mt-1" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          ROW 2 — Productivity Trend | Project Status
      ══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">

        {/* ───────── PRODUCTIVITY TREND (col-7) ───────── */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-4 flex flex-col gap-3 min-h-[260px] shadow-[0_1px_4px_rgba(28,25,23,0.06)]">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-display text-sm font-bold text-stone-800">Productivity Trend &amp; Project Highlights</h3>
              <p className="text-[10px] text-stone-400 mt-0.5">{currentMonthLabel}</p>
            </div>
            <div className="text-right shrink-0">
              <span className="font-data text-lg font-extrabold text-teal-700 leading-none">{totalDailyHours}h</span>
              <span className="text-[9px] font-medium text-stone-400 block mt-0.5">Total Hours</span>
            </div>
          </div>

          {/* Mini-stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Daily Avg", value: `${activityStats.avgHours}h`, color: "text-stone-800" },
              { label: "Active Days", value: String(activityStats.activeDays), color: "text-stone-800" },
              { label: "vs Team Avg", value: `${activityStats.deltaPct >= 0 ? "+" : ""}${activityStats.deltaPct}%`, color: activityStats.deltaPct >= 0 ? "text-emerald-600" : "text-rose-500" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-center">
                <span className="text-[9px] font-bold uppercase text-stone-400 block">{label}</span>
                <span className={`font-data text-sm font-bold ${color} block mt-0.5`}>{value}</span>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="flex-1 min-h-[100px]">
            {dailyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-stone-400 bg-stone-50 rounded-xl border border-stone-100">
                No activity recorded yet this month
              </div>
            ) : (
              <div className="relative bg-stone-50/60 border border-stone-100 rounded-xl p-2 h-full">
                <div className="flex h-full">
                  <div className="flex flex-col justify-between h-full pr-2 text-[8px] text-stone-400 shrink-0 font-data">
                    {[chartMax, chartMax * 0.75, chartMax * 0.5, chartMax * 0.25, 0].map((n, i) => (
                      <span key={i}>{Math.round(n)}h</span>
                    ))}
                  </div>
                  <div className="relative flex-1">
                    <svg
                      ref={svgRef}
                      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                      preserveAspectRatio="none"
                      className="w-full h-full cursor-crosshair"
                      onMouseMove={handleChartMouseMove}
                      onMouseLeave={handleChartMouseLeave}
                    >
                      <defs>
                        <linearGradient id="empFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0D9488" stopOpacity="0.12" />
                          <stop offset="100%" stopColor="#0D9488" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <line key={i} x1="0" x2={CHART_W} y1={(CHART_H / 4) * i} y2={(CHART_H / 4) * i} stroke="#e7e5e4" strokeWidth="1" />
                      ))}
                      {hoverPoint && (
                        <line x1={hoverPoint.x} x2={hoverPoint.x} y1="0" y2={CHART_H} stroke="#d6d3d1" strokeWidth="1" strokeDasharray="2 3" />
                      )}
                      <polygon points={chartGeometry.areaFill} fill="url(#empFill)" />
                      <polyline points={chartGeometry.teamLine} fill="none" stroke="#a8a29e" strokeWidth="1.25" strokeDasharray="3 3" strokeOpacity="0.7" />
                      <polyline points={chartGeometry.empLine} fill="none" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      {hoverPoint && (
                        <>
                          <circle cx={hoverPoint.x} cy={hoverPoint.yTeam} r="2.5" fill="#a8a29e" stroke="white" strokeWidth="1" />
                          <circle cx={hoverPoint.x} cy={hoverPoint.yEmp} r="3.5" fill="#0f766e" stroke="white" strokeWidth="1.5" />
                        </>
                      )}
                    </svg>
                    {hoverPoint && (
                      <div
                        className="absolute -top-1 bg-white/95 text-stone-700 text-[9px] rounded-lg px-2 py-1.5 pointer-events-none shadow-md border border-stone-200/70 whitespace-nowrap z-10 font-data"
                        style={{
                          left: `${(hoverPoint.x / CHART_W) * 100}%`,
                          transform: hoverPoint.x / CHART_W > 0.85 ? "translate(-100%, -100%)" : hoverPoint.x / CHART_W < 0.15 ? "translate(0%, -100%)" : "translate(-50%, -100%)",
                        }}
                      >
                        <p className="font-display font-medium text-stone-500 mb-0.5">{format(parseISO(hoverPoint.date), "EEE, d MMM")}</p>
                        <p>You: <span className="font-semibold text-stone-800">{hoverPoint.employee_hours}h</span></p>
                        <p className="text-stone-400">Team: {hoverPoint.team_avg_hours}h</p>
                      </div>
                    )}
                    <div className="flex justify-between mt-0.5 text-[7.5px] text-stone-400 font-medium font-data">
                      {chartGeometry.points.map((p, i) => (
                        <span key={i}>{format(parseISO(p.date), "d")}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ───────── PROJECT STATUS (col-5) ───────── */}
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-4 flex flex-col gap-3 shadow-[0_1px_4px_rgba(28,25,23,0.06)]">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-teal-600" />
              <h3 className="font-display text-sm font-bold text-stone-800">Project Status</h3>
            </div>
            <button
              onClick={() => setShowLogsModal(true)}
              className="flex items-center gap-1 text-[10px] font-semibold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-100 px-2 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <History className="w-3 h-3" /> Logs
            </button>
          </div>

          {/* Project list */}
          <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto db-scroll">
            {allEmployeeProjects.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-stone-400 italic">
                No projects assigned currently.
              </div>
            ) : (
              allEmployeeProjects.slice(0, 6).map((proj) => (
                <div key={proj.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-stone-100 bg-stone-50 hover:bg-stone-100/60 transition-colors">
                  <span className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-extrabold text-[11px] shrink-0">
                    {proj.symbol}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-stone-800 text-xs truncate">{proj.name}</p>
                    <p className="text-[10px] text-stone-500 truncate">{proj.role}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`inline-block px-2 py-0.5 text-[8.5px] font-bold uppercase rounded-md ${proj.status === "active" ? "bg-teal-700 text-white" : "bg-stone-200 text-stone-500"}`}>
                      {proj.status === "active" ? "Active" : "Done"}
                    </span>
                    <p className="text-[9px] text-stone-400 font-data mt-0.5">{proj.startDate}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-stone-100 pt-2 flex items-center justify-between text-[10px] text-stone-400">
            <span>Active allocations</span>
            <strong className="text-stone-700 font-data">{allEmployeeProjects.length} total</strong>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          ROW 3 — Notes/Perf History  |  Awards
      ══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">

        {/* ───────── NOTES & PERFORMANCE HISTORY (col-8) ───────── */}
        <div className="lg:col-span-8 bg-white border border-stone-200 rounded-2xl p-4 flex flex-col gap-3 shadow-[0_1px_4px_rgba(28,25,23,0.06)]">
          <div className="flex flex-col gap-3 h-full">
            {/* Tab switcher */}
            <div className="flex gap-5 border-b border-stone-100 pb-0.5">
              <button
                type="button"
                onClick={() => setBottomTab("notes")}
                className={`flex items-center gap-1.5 pb-2 -mb-[3px] border-b-[2px] font-semibold text-[13px] transition-colors ${
                  bottomTab === "notes"
                    ? "border-stone-800 text-stone-900"
                    : "border-transparent text-stone-400 hover:text-stone-600"
                }`}
              >
                <FileText className="w-4 h-4" /> Notes
              </button>
              <button
                type="button"
                onClick={() => setBottomTab("performance")}
                className={`flex items-center gap-1.5 pb-2 -mb-[3px] border-b-[2px] font-semibold text-[13px] transition-colors ${
                  bottomTab === "performance"
                    ? "border-stone-800 text-stone-900"
                    : "border-transparent text-stone-400 hover:text-stone-600"
                }`}
              >
                <TrendingUp className="w-4 h-4" /> Performance History
              </button>
            </div>

          {/* Tab body */}
          {bottomTab === "notes" ? (
            <div className="grid grid-cols-3 gap-3 flex-1">
              {/* Complaints */}
              <div className="flex flex-col bg-stone-50 border border-stone-200 rounded-xl p-2.5">
                <div className="flex items-center justify-between gap-1.5 mb-2">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <h3 className="text-[10px] font-bold text-stone-700 uppercase tracking-wider">Complaints</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setNotesModal({ isOpen: true, type: 'complaints', title: 'Complaints History', data: complaintsList })} className="flex items-center gap-1 text-[9px] font-semibold text-stone-500 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer">
                      <History className="w-2.5 h-2.5" /> History
                    </button>
                    {isAdmin && (
                      <button className="flex items-center justify-center bg-stone-100 hover:bg-stone-200 border border-stone-200 w-5 h-5 rounded transition-colors text-stone-600">
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto db-scroll">
                  {complaintsList.length > 0 ? (
                    <>
                      {[...complaintsList].reverse().slice(0, 4).map((item, idx) => (
                        <p key={idx} className="text-[10px] text-stone-600 leading-snug bg-rose-50/50 border border-rose-100/70 p-1.5 rounded-lg">
                          {typeof item === "string" ? item : item.message || item.reason || "Complaint recorded"}
                        </p>
                      ))}
                      {complaintsList.length > 4 && (
                        <button className="text-[9.5px] font-semibold text-teal-600 hover:underline w-full text-left mt-0.5">See {complaintsList.length - 4} more…</button>
                      )}
                    </>
                  ) : (
                    <p className="text-[10px] text-stone-400 italic">No complaints filed.</p>
                  )}
                </div>
              </div>

              {/* Warnings */}
              <div className="flex flex-col bg-stone-50 border border-stone-200 rounded-xl p-2.5">
                <div className="flex items-center justify-between gap-1.5 mb-2">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <h3 className="text-[10px] font-bold text-stone-700 uppercase tracking-wider">Warnings</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setNotesModal({ isOpen: true, type: 'warnings', title: 'Warnings History', data: warningsList })} className="flex items-center gap-1 text-[9px] font-semibold text-stone-500 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer">
                      <History className="w-2.5 h-2.5" /> History
                    </button>
                    {isAdmin && (
                      <button className="flex items-center justify-center bg-stone-100 hover:bg-stone-200 border border-stone-200 w-5 h-5 rounded transition-colors text-stone-600">
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto db-scroll">
                  {warningsList.length > 0 ? (
                    <>
                      {[...warningsList].reverse().slice(0, 4).map((item, idx) => (
                        <p key={idx} className="text-[10px] text-stone-600 leading-snug bg-amber-50/50 border border-amber-100/70 p-1.5 rounded-lg">
                          {typeof item === "string" ? item : item.message || item.reason || "Warning issued"}
                        </p>
                      ))}
                      {warningsList.length > 4 && (
                        <button className="text-[9.5px] font-semibold text-teal-600 hover:underline w-full text-left mt-0.5">See {warningsList.length - 4} more…</button>
                      )}
                    </>
                  ) : (
                    <p className="text-[10px] text-stone-400 italic">No warnings issued.</p>
                  )}
                </div>
              </div>

              {/* Recognition */}
              <div className="flex flex-col bg-stone-50 border border-stone-200 rounded-xl p-2.5">
                <div className="flex items-center justify-between gap-1.5 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <h3 className="text-[10px] font-bold text-stone-700 uppercase tracking-wider">Recognition</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setNotesModal({ isOpen: true, type: 'recognitions', title: 'Recognition History', data: recognitionsList })} className="flex items-center gap-1 text-[9px] font-semibold text-stone-500 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer">
                      <History className="w-2.5 h-2.5" /> History
                    </button>
                    {isAdmin && (
                      <button className="flex items-center justify-center bg-stone-100 hover:bg-stone-200 border border-stone-200 w-5 h-5 rounded transition-colors text-stone-600">
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto db-scroll">
                  {recognitionsList.length > 0 ? (
                    <>
                      {[...recognitionsList].reverse().slice(0, 4).map((item, idx) => (
                        <p key={idx} className="text-[10px] text-stone-600 leading-snug bg-emerald-50/50 border border-emerald-100/70 p-1.5 rounded-lg">
                          {typeof item === "string" ? item : item.message || item.note || "Recognition received"}
                        </p>
                      ))}
                      {recognitionsList.length > 4 && (
                        <button className="text-[9.5px] font-semibold text-teal-600 hover:underline w-full text-left mt-0.5">See {recognitionsList.length - 4} more…</button>
                      )}
                    </>
                  ) : (
                    <p className="text-[10px] text-stone-400 italic">No recognition messages yet.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 flex-1 overflow-y-auto db-scroll">
              {perfReviews.length > 0 ? (
                [...perfReviews].reverse().map((review, idx) => {
                  const rts = review.parameter_values?.map((p) => p.pm_rating).filter((r) => r != null) || [];
                  const rAvg = rts.length ? (rts.reduce((s, v) => s + v, 0) / rts.length).toFixed(1) : null;
                  return (
                    <div key={idx} className="flex items-start gap-3 bg-stone-50 border border-stone-100 rounded-xl p-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-bold text-stone-800">{review.period || "Review"}</span>
                          {rAvg && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-md">
                              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> {rAvg}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-stone-600 leading-relaxed">{review.overall_comment || "No detailed comments."}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-[10px] text-stone-400 italic">No performance history found.</p>
              )}
            </div>
          )}
          </div>
        </div>

        {/* ───────── AWARDS (col-4) ───────── */}
        <div className="lg:col-span-4 bg-white border border-stone-200 rounded-2xl p-4 flex flex-col gap-3 shadow-[0_1px_4px_rgba(28,25,23,0.06)]">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <Award className="w-4 h-4 text-emerald-600" />
            <h3 className="font-display text-sm font-bold text-stone-800">Awards</h3>
          </div>

          <div className="flex flex-col gap-2 flex-1 overflow-y-auto db-scroll">
            {[
              { icon: Trophy, title: "Top Performer", date: "August 2026", earned: true, color: "text-amber-500" },
              { icon: Star, title: "Quality Champion", date: "July 2026", earned: true, color: "text-amber-500" },
              { icon: Target, title: "Perfect Attendance", date: "June 2026", earned: false, color: "text-emerald-500" },
            ].map(({ icon: Icon, title, date, earned, color }) => (
              <div key={title} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${earned ? "bg-stone-50 border-stone-200 hover:bg-stone-100/60" : "bg-stone-50/40 border-stone-200/50 opacity-50"}`}>
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${earned ? "bg-white border border-stone-200" : "bg-stone-100"}`}>
                  <Icon className={`w-4 h-4 ${earned ? color : "text-stone-400"}`} />
                </span>
                <div className="min-w-0">
                  <p className={`text-[11px] font-bold truncate ${earned ? "text-stone-800" : "text-stone-500"}`}>{title}</p>
                  <p className={`text-[9.5px] ${earned ? "text-stone-400" : "text-stone-300"}`}>{date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════ NOTES HISTORY MODAL ════════════════ */}
      {notesModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-t-2xl sm:rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]">
            <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${notesModal.type === 'complaints' ? 'bg-rose-50 text-rose-600' : notesModal.type === 'warnings' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {notesModal.type === 'complaints' ? <AlertCircle className="w-4 h-4" /> : notesModal.type === 'warnings' ? <AlertTriangle className="w-4 h-4" /> : <Award className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-stone-800">{notesModal.title}</h3>
                  <p className="text-[10px] text-stone-400">Complete history of records</p>
                </div>
              </div>
              <button
                onClick={() => setNotesModal({ ...notesModal, isOpen: false })}
                className="w-8 h-8 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto db-scroll space-y-2 flex-1">
              {notesModal.data.length === 0 ? (
                <p className="text-xs text-stone-400 italic text-center py-8">No records available.</p>
              ) : (
                [...notesModal.data].reverse().map((item, idx) => (
                  <div key={idx} className={`p-3 rounded-xl border ${notesModal.type === 'complaints' ? 'bg-rose-50/30 border-rose-100' : notesModal.type === 'warnings' ? 'bg-amber-50/30 border-amber-100' : 'bg-emerald-50/30 border-emerald-100'}`}>
                    <p className="text-xs text-stone-700 leading-relaxed">
                      {typeof item === "string" ? item : item.message || item.reason || item.note || "Record logged"}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="px-4 py-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
              <span>{notesModal.data.length} total entries</span>
              <button onClick={() => setNotesModal({ ...notesModal, isOpen: false })} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white font-medium rounded-xl text-xs transition-colors cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ PROJECT LOGS MODAL ════════════════ */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-t-2xl sm:rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]">
            <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-stone-800">All Project Logs</h3>
                  <p className="text-[10px] text-stone-400">Complete history of assigned projects</p>
                </div>
              </div>
              <button
                onClick={() => setShowLogsModal(false)}
                className="w-8 h-8 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto db-scroll space-y-2 flex-1">
              {allEmployeeProjects.length === 0 ? (
                <p className="text-xs text-stone-400 italic text-center py-8">No project logs available.</p>
              ) : (
                allEmployeeProjects.map((item) => {
                  const isActive = item.status === "active";
                  return (
                    <div key={item.id} className={`p-3 rounded-xl border ${isActive ? "bg-teal-50/40 border-teal-100" : "bg-stone-50 border-stone-100"}`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`px-2 py-0.5 text-[8.5px] font-bold uppercase rounded-md shrink-0 ${isActive ? "bg-teal-700 text-white" : "bg-stone-200 text-stone-600"}`}>
                            {isActive ? "Active" : "Completed"}
                          </span>
                          <h4 className="font-bold text-stone-800 text-xs truncate">{item.name}</h4>
                        </div>
                        <span className="text-[9px] text-stone-400 font-data shrink-0">{item.startDate} — {item.endDate}</span>
                      </div>
                      <p className="text-[10px] text-stone-500">Role: <strong className="text-stone-700">{item.role}</strong></p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-4 py-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
              <span>{allEmployeeProjects.length} total entries</span>
              <button onClick={() => setShowLogsModal(false)} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white font-medium rounded-xl text-xs transition-colors cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ EDIT PROFILE MODAL ════════════ */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-stone-800">Edit Profile Information</h3>
              <button onClick={cancelEdit} className="w-8 h-8 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Login Email</label>
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder={`you@${COMPANY_DOMAIN}`} className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                <p className="mt-1 text-[10px] text-stone-400">Must end with @{COMPANY_DOMAIN}</p>
                {emailError && <p className="mt-1 text-[11px] font-medium text-rose-600">{emailError}</p>}
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Phone Number</label>
                <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Encord ID</label>
                <input type="text" value={editEncordId} onChange={(e) => setEditEncordId(e.target.value)} placeholder="john.encord@example.com" className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Slack Member ID</label>
                <input type="text" value={editSlackId} onChange={(e) => setEditSlackId(e.target.value)} placeholder="U0123ABC456" className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5 block">Skills &amp; Competencies</label>
                <SkillsMultiSelect selected={editSkills} onChange={setEditSkills} options={skillsList} isLoading={skillsLoading} />
              </div>
              {saveError && <p className="text-xs font-medium text-rose-600">{saveError}</p>}
            </div>

            <div className="px-4 py-3 border-t border-stone-100 bg-stone-50/60 flex items-center justify-end gap-2">
              <button
                onClick={cancelEdit}
                className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending || changeEmailMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 disabled:opacity-60"
              >
                {saveMutation.isPending || changeEmailMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;

