import React, { useMemo, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

import { allocationApi, analyticsApi, authApi, employeeApi, leaveApi, perfEvalApi, subProjectApi, wfhApi } from "../../services/api";

import {
  AlertCircle,
  Award,
  Briefcase,
  Calendar,
  Check,
  ChevronRight,
  Crown,
  Flame,
  FolderKanban,
  MessageSquare,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
  CheckCircle2,
  Lock,
  Medal,
  History,
  X,
} from "lucide-react";

import fiftyHoursBadge from "../../components/badges/50hrs.png";
import twoHundredHoursBadge from "../../components/badges/200hrs.png";
import weeklyTopBadge from "../../components/badges/week_top.png";
import monthlyTopBadge from "../../components/badges/month_top.png";
import threeMonthsBadge from "../../components/badges/3months.png";
import sixMonthsBadge from "../../components/badges/6months.png";

import { ANNUAL_LEAVE_QUOTA, INTERN_MONTHLY_PAID_QUOTA, getWorkingDayCount, isIntern } from "../../utils/leaveTypes";
import { differenceInCalendarDays, differenceInMonths, differenceInYears, format, parseISO, startOfMonth } from "date-fns";

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
  if (t === "first_half" || t === "second_half" || t === "paid" || t === "earned" || t === "annual") return "paid";
  if (t === "casual_sick" || t === "sick" || t === "casual" || t === "medical") return "casual_sick";
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
    return `${years > 0 ? `${years} Year${years > 1 ? "s" : ""} ` : ""}${months} Month${months !== 1 ? "s" : ""}`;
  } catch {
    return "3 Years 5 Months";
  }
}

const EmployeeDashboard = () => {
  const [showFullFeedback, setShowFullFeedback] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const localUser = JSON.parse(localStorage.getItem("user") || "{}");
  const employeeId = localUser.employee_id || localUser.id || 1;

  const { data: account } = useQuery({ queryKey: ["auth-me"], queryFn: authApi.me });
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

  const getEmployeeRank = (leaderboard) => {
    if (!leaderboard?.leaderboard || !loggedInEncordId) return null;
    const ranked = [...leaderboard.leaderboard].sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0));
    const index = ranked.findIndex((item) => (item.user_email || "").trim().toLowerCase() === loggedInEncordId);
    return index >= 0 ? index + 1 : null;
  };

  const dailyRank = useMemo(() => getEmployeeRank(dailyLeaderboard), [dailyLeaderboard, loggedInEncordId]);
  const weeklyRank = useMemo(() => getEmployeeRank(weeklyLeaderboard), [weeklyLeaderboard, loggedInEncordId]);
  const monthlyRank = useMemo(() => getEmployeeRank(monthlyLeaderboard), [monthlyLeaderboard, loggedInEncordId]);

  const profile = useMemo(() => {
    const name = account?.name || employee?.name || localUser.name || "";
    const jobTitle = employee?.designation || account?.role || "Annotator/Reviewer";
    const status = employee?.status || "active";
    const avatarUrl = employee?.avatar_url || account?.avatar_url || localUser.avatar_url || null;
    const rawJoiningDate = employee?.joining_date || employee?.created_at;
    const joiningDate = rawJoiningDate ? format(parseISO(rawJoiningDate), "dd MMM yyyy") : "";
    const tenure = calculateTenure(rawJoiningDate);
    const badge = employee?.employee_type || localUser.employee_type || "";
    const initials = getNameInitials(name);
    return { name, jobTitle, status, avatarUrl, joiningDate, tenure, badge, initials };
  }, [account, employee, localUser]);

  const latestPmReview = useMemo(() => {
    return [...perfReviews]
      .filter((review) => review.status === "reviewed")
      .sort((a, b) => new Date(b.reviewed_at || b.updated_at || b.created_at) - new Date(a.reviewed_at || a.updated_at || a.created_at))[0];
  }, [perfReviews]);

  const latestRating = useMemo(() => {
    if (!latestPmReview?.parameter_values?.length) return null;
    const ratings = latestPmReview.parameter_values.map((p) => p.pm_rating).filter((r) => r != null);
    if (!ratings.length) return null;
    return (ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1);
  }, [latestPmReview]);

  // ── Consolidated Projects Data
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
          startDate: alloc.active_start_date ? format(parseISO(alloc.active_start_date), "dd MMM yyyy") : "-",
          endDate: alloc.active_end_date ? format(parseISO(alloc.active_end_date), "dd MMM yyyy") : "Ongoing",
          symbol: (project?.name || "P")[0].toUpperCase(),
        };
      })
      .sort((a, b) => (a.status === "active" ? -1 : 1));
  }, [allocations, projects, profile.jobTitle]);

  const activeProjects = useMemo(() => allEmployeeProjects.filter((p) => p.status === "active"), [allEmployeeProjects]);

  const currentMonthLabel = useMemo(() => format(new Date(), "MMMM yyyy"), []);
  const daysElapsedInMonth = useMemo(() => differenceInCalendarDays(new Date(), startOfMonth(new Date())) + 1, []);
  const currentSubProjectId = activeProjects[0]?.id;

  const { data: encordActivity } = useQuery({
    queryKey: ["my-encord-activity", employeeId, currentSubProjectId, currentMonthLabel],
    queryFn: () => analyticsApi.getMyEncordActivity({ days: daysElapsedInMonth, sub_project_id: currentSubProjectId }),
    enabled: !!employeeId,
  });

  const totalDailyHours = encordActivity?.total_hours ?? 0;
  const dailyData = encordActivity?.daily || [];

  const activityStats = useMemo(() => {
    if (!dailyData.length) return { avgHours: 0, avgTeamHours: 0, deltaPct: 0, activeDays: 0 };
    const empSum = dailyData.reduce((s, d) => s + (d.employee_hours || 0), 0);
    const teamSum = dailyData.reduce((s, d) => s + (d.team_avg_hours || 0), 0);
    const activeDays = dailyData.filter((d) => (d.employee_hours || 0) > 0).length;
    const avgHours = empSum / dailyData.length;
    const avgTeamHours = teamSum / dailyData.length;
    const deltaPct = avgTeamHours > 0 ? Math.round(((avgHours - avgTeamHours) / avgTeamHours) * 100) : 0;
    return { avgHours: Math.round(avgHours * 10) / 10, avgTeamHours: Math.round(avgTeamHours * 10) / 10, deltaPct, activeDays };
  }, [dailyData]);

  const CHART_W = 640;
  const CHART_H = 150;
  const chartMax = useMemo(() => {
    if (!dailyData.length) return 10;
    const maxVal = Math.max(...dailyData.map((d) => Math.max(d.employee_hours || 0, d.team_avg_hours || 0)));
    return Math.max(6, Math.ceil(maxVal / 2) * 2);
  }, [dailyData]);

  const chartGeometry = useMemo(() => {
    const stepX = dailyData.length > 1 ? CHART_W / (dailyData.length - 1) : 0;
    const toY = (v) => CHART_H - (Math.min(v || 0, chartMax) / chartMax) * CHART_H;
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
    const areaFill = points.length ? `0,${CHART_H} ${empLine} ${points[points.length - 1].x},${CHART_H}` : "";
    return { points, empLine, teamLine, areaFill, stepX };
  }, [dailyData, chartMax]);

  const [hoverIndex, setHoverIndex] = useState(null);
  const svgRef = useRef(null);

  const handleChartMouseMove = (e) => {
    if (!chartGeometry.points.length || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * CHART_W;
    const idx = Math.round(relX / (chartGeometry.stepX || 1));
    setHoverIndex(Math.min(Math.max(idx, 0), chartGeometry.points.length - 1));
  };

  const handleChartMouseLeave = () => setHoverIndex(null);
  const hoverPoint = hoverIndex !== null ? chartGeometry.points[hoverIndex] : null;

  const employeeType = employee?.employee_type || localUser.employee_type || "Full-time";
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
      const days = leave.is_half_day ? 0.5 : leave.start_date && leave.end_date ? getWorkingDayCount(leave.start_date, leave.end_date) : 1.0;
      if (!leave.start_date || !leave.end_date) {
        if (type in usedYear) usedYear[type] += days;
        return;
      }
      const d = new Date(leave.start_date + "T00:00:00");
      if (internOrContractor && type === "paid") {
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) paidUsedThisMonth += days;
        return;
      }
      if (type in usedYear && d.getFullYear() === currentYear) usedYear[type] += days;
    });

    const paidQuota = internOrContractor ? INTERN_MONTHLY_PAID_QUOTA : ANNUAL_LEAVE_QUOTA?.paid || 22;
    const paidUsed = internOrContractor ? paidUsedThisMonth : usedYear.paid;
    const paidRemaining = Math.max(paidQuota - paidUsed, 0);

    const casualQuota = internOrContractor ? 0 : ANNUAL_LEAVE_QUOTA?.casual_sick || 10;
    const casualUsed = usedYear.casual_sick;
    const casualRemaining = Math.max(casualQuota - casualUsed, 0);

    let totalWfhApproved = 0;

    myWfh.forEach((wfh) => {
      if ((wfh.status || "pending").toLowerCase() !== "approved") return;
      if (!wfh.wfh_date) return;

      const wfhStart = new Date(`${wfh.wfh_date}T00:00:00`);

      // Intern/Contractor WFH quota is monthly
      if (
        internOrContractor &&
        (wfhStart.getFullYear() !== currentYear ||
          wfhStart.getMonth() !== currentMonth)
      ) {
        return;
      }

      const days =
        wfh.end_date && wfh.end_date !== wfh.wfh_date
          ? getWorkingDayCount(wfh.wfh_date, wfh.end_date)
          : 1;

      totalWfhApproved += days;
    });

    const wfhQuota = internOrContractor ? 2 : 100;
    const wfhRemaining = Math.max(wfhQuota - totalWfhApproved, 0);

    const currentLeave = allLeaves.find((leave) => {
      if ((leave.status || "pending").toLowerCase() === "rejected") return false;
      return leave.start_date && leave.end_date && leave.start_date <= todayStr && leave.end_date >= todayStr;
    });

    return { paidRemaining, casualRemaining, wfhRemaining, currentLeave, isInternOrContractor: internOrContractor };
  }, [allLeaves, myWfh, internOrContractor, currentYear, currentMonth, todayStr]);

  const leaderboardAvailable = !!loggedInEncordId && (dailyRank !== null || weeklyRank !== null || monthlyRank !== null);

  const achievementBadges = useMemo(
    () => [
      {
        id: "50-hours-week",
        label: "50 Hours",
        meta: "In a Week",
        image: fiftyHoursBadge,
        earned: true,
      },
      {
        id: "200-hours-month",
        label: "200 Hours",
        meta: "In a Month",
        image: twoHundredHoursBadge,
        earned: true,
      },
      {
        id: "weekly-top",
        label: "Weekly Top",
        meta: "Top Performer",
        image: weeklyTopBadge,
        earned: true,
      },
      {
        id: "monthly-top",
        label: "Monthly Top",
        meta: "Top Performer",
        image: monthlyTopBadge,
        earned: false,
      },
      {
        id: "three-months",
        label: "3 Months",
        meta: "Completed",
        image: threeMonthsBadge,
        earned: false,
      },
      {
        id: "six-months",
        label: "6 Months",
        meta: "Completed",
        image: sixMonthsBadge,
        earned: false,
      },
    ],
    []
  );
  const earnedBadgeCount = achievementBadges.filter((b) => b.earned).length;

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 pb-4 sm:pb-6 pt-0 min-h-full text-[#091E42] bg-[#F7F9FA]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap');
        .font-display { font-family: 'Inter', sans-serif; letter-spacing: -0.01em; }
        .font-data { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
        .log-scroll::-webkit-scrollbar { width: 4px; }
        .log-scroll::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 999px; }
      `}</style>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* ═══ LEFT RAIL — ID Card ═══ */}
        <div className="lg:col-span-3 lg:sticky lg:top-1 lg:self-start space-y-4">
          
          {/* Profile Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden relative">
            <div className="h-20 bg-gradient-to-r from-[#006644] to-[#00875A] relative">
              <span className="absolute top-2.5 right-3 text-[10px] font-bold text-emerald-100 uppercase tracking-widest">
                PROFILE
              </span>
            </div>

            <div className="px-5 pb-5 text-center -mt-9 relative">
              <div className="relative inline-block">
                {profile.avatarUrl && !imgError ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name}
                    onError={() => setImgError(true)}
                    className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md mx-auto"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#E6F4EA] border-4 border-white text-[#00875A] font-bold text-2xl flex items-center justify-center shadow-md mx-auto uppercase">
                    {profile.initials}
                  </div>
                )}
                {leavesAndWfhStats.currentLeave ? (
                  <span className="absolute bottom-0 right-0 w-5.5 h-5.5 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center shadow-sm">
                    <AlertCircle className="w-3 h-3 text-white" />
                  </span>
                ) : (
                  <span className="absolute bottom-0 right-0 w-5.5 h-5.5 rounded-full bg-[#00875A] border-2 border-white flex items-center justify-center shadow-sm">
                    <Check className="w-3 h-3 text-white stroke-[3]" />
                  </span>
                )}
              </div>

              <h1 className="font-display text-lg font-bold text-[#091E42] mt-2 leading-tight">{profile.name}</h1>
              <p className="text-slate-500 text-xs font-medium mt-0.5 flex items-center justify-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                {profile.jobTitle}
              </p>

              {profile.badge && (
                <span className="inline-block mt-2 text-[10px] font-bold tracking-wider uppercase text-[#006644] bg-[#E6F4EA] px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {profile.badge}
                </span>
              )}
            </div>

            <div className="mx-5 border-t border-slate-100" />

            <div className="px-5 py-3.5 grid grid-cols-2 gap-2 text-center bg-slate-50/50">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Joined</p>
                <p className="text-xs font-semibold text-slate-700 mt-0.5">{profile.joiningDate}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tenure</p>
                <p className="text-xs font-semibold text-slate-700 mt-0.5">{profile.tenure}</p>
              </div>
            </div>
          </div>

          {/* Leave & WFH Balance Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-[#00875A]" />
              <h3 className="font-display font-bold text-[#091E42] text-xs uppercase tracking-wider">
                Leave & WFH Balance
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[9.5px] font-bold uppercase text-slate-400 block">Leaves</span>
                <span className="font-data text-xs font-bold text-amber-600 mt-0.5 block">{leavesAndWfhStats.paidRemaining} Left</span>
              </div>
              <div className="text-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[9.5px] font-bold uppercase text-slate-400 block">Sick</span>
                <span className="font-data text-xs font-bold text-rose-500 mt-0.5 block">
                  {leavesAndWfhStats.isInternOrContractor ? "—" : `${leavesAndWfhStats.casualRemaining} Left`}
                </span>
              </div>
              <div className="text-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[9.5px] font-bold uppercase text-slate-400 block">WFH</span>
                <span className="font-data text-xs font-bold text-[#00875A] mt-0.5 block">{leavesAndWfhStats.wfhRemaining} Left</span>
              </div>
            </div>
          </div>

          {/* Record Summary */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4">
            <h3 className="font-display font-bold text-[#091E42] text-xs uppercase tracking-wider mb-2.5 text-slate-400">Record Summary</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col items-center justify-center p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <span className="text-xs font-medium text-slate-600">Warnings</span>
                <span className="font-data text-base font-extrabold text-[#091E42] mt-0.5">{employee?.warnings_count ?? 0}</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <span className="text-xs font-medium text-slate-600">Complaints</span>
                <span className="font-data text-base font-extrabold text-[#091E42] mt-0.5">{employee?.complaints_count ?? 0}</span>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 p-2.5 rounded-xl bg-[#E6F4EA] border border-emerald-200">
              <Award className="w-4 h-4 text-[#00875A] shrink-0 mt-0.5" />
              <p className="text-[10px] text-[#006644] font-semibold leading-snug">Clean record boosts your achievement score!</p>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT CONTENT ═══ */}
        <div className="lg:col-span-9 space-y-5">

          {/* BADGES SHOWCASE */}
          <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-white via-[#F4FBF7] to-[#E6F4EA]/40 shadow-[0_4px_20px_rgba(0,135,90,0.08)] p-5 relative overflow-hidden">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2.5">

                <div className="w-8 h-8 rounded-lg bg-[#00875A] text-white flex items-center justify-center shadow-md">
                  <Medal className="w-5 h-5" />
                </div>

                <div>
                  <h3 className="font-display text-base font-extrabold text-[#091E42] flex items-center gap-2">
                    Achievements & Badges

                    <span className="text-xs font-bold text-[#00875A] bg-white border border-emerald-200 px-2 py-0.5 rounded-full shadow-2xs">
                      {earnedBadgeCount} / {achievementBadges.length} Unlocked
                    </span>
                  </h3>

                  <p className="text-xs text-slate-500">
                    Showcase your milestones and platform contribution
                  </p>
                </div>

              </div>
            </div>

            {/* Badge Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">

              {achievementBadges.map((badge) => (
                <div
                  key={badge.id}
                  className={`group relative rounded-xl h-[145px] p-2 flex flex-col items-center text-center transition-all duration-300 ${
                    badge.earned
                      ? "bg-white border border-emerald-200/90 shadow-[0_2px_10px_rgba(0,135,90,0.08)] hover:-translate-y-1 hover:shadow-md"
                      : "bg-slate-50/70 border border-slate-200/60 opacity-60"
                  }`}
                >

                  {/* Badge Image */}
                  <div className="w-[130px] h-[95px] flex items-center justify-center overflow-visible">
                    <img
                      src={badge.image}
                      alt={badge.label}
                      className={`
                        w-[70px]
                        h-[70px]
                        max-w-none
                        object-contain
                        transition-transform
                        duration-300
                        ${
                          badge.earned
                            ? "group-hover:scale-105"
                            : "grayscale"
                        }
                      `}
                    />
                  </div>

                  {/* Badge Label */}
                  <h4 className="font-bold text-[12px] text-[#091E42] leading-tight line-clamp-1">
                    {badge.label}
                  </h4>

                  {/* Badge Meta */}
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                    {badge.meta}
                  </p>

                  {/* Unlocked Indicator */}
                  {badge.earned && (
                    <span className="absolute top-1.5 right-1.5 text-emerald-600">
                      <CheckCircle2
                        className="w-3.5 h-3.5 fill-emerald-100"
                      />
                    </span>
                  )}

                  {/* Locked Indicator */}
                  {!badge.earned && (
                    <span className="absolute top-1.5 right-1.5">
                      <span className="w-5 h-5 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                        <Lock className="w-2.5 h-2.5 text-slate-400" />
                      </span>
                    </span>
                  )}

                </div>
              ))}

            </div>
          </div>

          {/* ENCORD ACTIVITY */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#E6F4EA] flex items-center justify-center text-[#00875A]">
                  <TrendingUp className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-[#091E42]">Encord Activity</h3>
                  <p className="text-xs text-slate-500">{currentMonthLabel}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-data text-xl font-extrabold text-[#00875A]">{totalDailyHours}h</p>
                <p className="text-[10.5px] font-medium text-slate-400">Total Hours</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 px-5 pt-3.5">
              <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-2.5 text-center">
                <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Daily Avg</p>
                <p className="font-data text-sm font-bold text-[#091E42] mt-0.5">{activityStats.avgHours}h</p>
              </div>
              <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-2.5 text-center">
                <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Active Days</p>
                <p className="font-data text-sm font-bold text-[#091E42] mt-0.5">{activityStats.activeDays}</p>
              </div>
              <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-2.5 text-center">
                <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Vs Team Avg</p>
                <p className={`font-data text-sm font-bold mt-0.5 ${activityStats.deltaPct >= 0 ? "text-[#00875A]" : "text-rose-500"}`}>
                  {activityStats.deltaPct >= 0 ? "+" : ""}{activityStats.deltaPct}%
                </p>
              </div>
            </div>

            <div className="px-5 py-3.5">
              {dailyData.length === 0 ? (
                <div className="h-28 flex items-center justify-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                  No activity recorded yet this month
                </div>
              ) : (
                <div className="relative border border-slate-100 rounded-xl bg-slate-50/50 p-2.5">
                  <div className="flex">
                    <div className="flex flex-col justify-between h-28 pr-2 text-[10px] text-slate-400 shrink-0 font-data">
                      {[chartMax, chartMax * 0.75, chartMax * 0.5, chartMax * 0.25, 0].map((n, i) => (
                        <span key={i}>{Math.round(n)}h</span>
                      ))}
                    </div>

                    <div className="relative flex-1">
                      <svg
                        ref={svgRef}
                        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                        preserveAspectRatio="none"
                        className="w-full h-28 cursor-crosshair"
                        onMouseMove={handleChartMouseMove}
                        onMouseLeave={handleChartMouseLeave}
                      >
                        <defs>
                          <linearGradient id="employeeFillTeal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#00875A" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#00875A" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {[0, 1, 2, 3, 4].map((i) => (
                          <line key={i} x1="0" x2={CHART_W} y1={(CHART_H / 4) * i} y2={(CHART_H / 4) * i} stroke="#E2E8F0" strokeDasharray="4 4" />
                        ))}
                        {hoverPoint && <line x1={hoverPoint.x} x2={hoverPoint.x} y1="0" y2={CHART_H} stroke="#94A3B8" strokeWidth="1" strokeDasharray="3 3" />}
                        <polygon points={chartGeometry.areaFill} fill="url(#employeeFillTeal)" />
                        <polyline points={chartGeometry.teamLine} fill="none" stroke="#475569" strokeWidth="2.5" strokeDasharray="5 5" />
                        <polyline points={chartGeometry.empLine} fill="none" stroke="#00875A" strokeWidth="2.5" />
                        {hoverPoint && (
                          <>
                            <circle cx={hoverPoint.x} cy={hoverPoint.yTeam} r="3.5" fill="#475569" />
                            <circle cx={hoverPoint.x} cy={hoverPoint.yEmp} r="4.5" fill="#00875A" stroke="white" strokeWidth="2" />
                          </>
                        )}
                      </svg>
                      {hoverPoint && (
                        <div
                          className="absolute -top-2 bg-[#091E42] text-white text-[11px] rounded-lg px-2.5 py-1.5 pointer-events-none shadow-lg whitespace-nowrap z-10 font-data"
                          style={{
                            left: `${(hoverPoint.x / CHART_W) * 100}%`,
                            transform: hoverPoint.x / CHART_W > 0.85 ? "translate(-100%, -100%)" : hoverPoint.x / CHART_W < 0.15 ? "translate(0%, -100%)" : "translate(-50%, -100%)",
                          }}
                        >
                          <p className="font-display font-semibold text-slate-200">{format(parseISO(hoverPoint.date), "EEE, d MMM")}</p>
                          <p className="text-emerald-400">You: {hoverPoint.employee_hours}h</p>
                          <p className="text-slate-300">Team avg: {hoverPoint.team_avg_hours}h</p>
                        </div>
                      )}
                      <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-semibold font-data">
                        {chartGeometry.points.map((p, i) => {
                          const showLabel = i === 0 || i === chartGeometry.points.length - 1 || i % Math.ceil(chartGeometry.points.length / 6) === 0;
                          return <span key={i} style={{ visibility: showLabel ? "visible" : "hidden" }}>{format(parseISO(p.date), "d")}</span>;
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ═══ COMBINED ROW: ALLOCATED PROJECTS (LEFT) vs LEADERBOARD + PM RATING (RIGHT) ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

            {/* LEFT SIDE: ALLOCATED PROJECTS */}
            <div className="lg:col-span-6 rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="w-4.5 h-4.5 text-[#00875A]" />
                    <h3 className="font-display font-bold text-[#091E42] text-sm">Allocated Projects</h3>
                  </div>
                  
                  <button
                    onClick={() => setShowLogsModal(true)}
                    className="group flex items-center gap-1.5 text-[11px] font-semibold text-[#00875A] hover:text-[#006644] bg-[#E6F4EA] hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5" />
                    View Project Logs
                  </button>
                </div>

                <div className="space-y-3 log-scroll max-h-[300px] overflow-y-auto pr-0.5">
                  {activeProjects.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-400 text-center">
                      No active projects currently assigned.
                    </div>
                  ) : (
                    activeProjects.map((project) => (
                      <div key={project.id} className="rounded-xl border border-emerald-200/80 bg-[#E6F4EA]/30 p-3.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#00875A] text-white rounded">
                            Active
                          </span>
                        </div>
                        <h4 className="font-display text-sm font-bold text-[#091E42] mt-1">{project.name}</h4>
                        <p className="text-[11px] text-slate-500">{project.role}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Active count: <strong className="text-[#091E42] font-data">{activeProjects.length}</strong></span>
                <span>Total overall: <strong className="text-[#091E42] font-data">{allEmployeeProjects.length}</strong></span>
              </div>
            </div>

            {/* RIGHT SIDE: LEADERBOARD & PM RATING STACKED */}
            <div className="lg:col-span-6 flex flex-col gap-4 justify-between">

              {/* TOP: LEADERBOARD STANDINGS */}
              <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4.5 h-4.5 text-amber-500" />
                      <h3 className="font-display font-bold text-[#091E42] text-sm">Leaderboard Standings</h3>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Live Rankings
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">Your ranking based on active platform hours.</p>
                </div>

                {leaderboardAvailable ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Daily Rank", value: dailyRank, badgeBg: "bg-amber-50 border-amber-200 text-amber-700" },
                      { label: "Weekly Rank", value: weeklyRank, badgeBg: "bg-emerald-50 border-emerald-200 text-[#00875A]" },
                      { label: "Monthly Rank", value: monthlyRank, badgeBg: "bg-cyan-50 border-cyan-200 text-cyan-700" },
                    ].map((r) => (
                      <div key={r.label} className={`rounded-xl border p-2.5 text-center ${r.badgeBg} flex flex-col items-center justify-center`}>
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{r.label}</span>
                        <span className="font-data text-base sm:text-lg font-extrabold mt-0.5">{r.value !== null ? `#${r.value}` : "–"}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-3.5 px-3 text-center my-auto">
                    <Crown className="w-5 h-5 text-slate-300 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-slate-600">Leaderboard Unlinked</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Link your Encord ID to participate in rankings.</p>
                  </div>
                )}
              </div>

              {/* BOTTOM: PM RATING & FEEDBACK */}
              <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-display font-bold text-[#091E42] text-sm flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-[#00875A]" />
                      Latest Manager Feedback
                    </h3>
                    {latestRating && (
                      <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-md text-xs font-bold border border-amber-200">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-data">{latestRating} / 5</span>
                      </div>
                    )}
                  </div>

                  {latestPmReview ? (
                    <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{latestPmReview.period}</p>
                      {latestPmReview.overall_comment ? (
                        <>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {showFullFeedback
                              ? latestPmReview.overall_comment
                              : `${latestPmReview.overall_comment.slice(0, 110)}${latestPmReview.overall_comment.length > 110 ? "..." : ""}`}
                          </p>
                          {latestPmReview.overall_comment.length > 110 && (
                            <button onClick={() => setShowFullFeedback((v) => !v)} className="mt-1.5 text-[11px] font-semibold text-[#00875A] hover:underline flex items-center gap-0.5">
                              {showFullFeedback ? "Show Less" : "Read Full Feedback"}
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No overall comments recorded.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">No evaluation recorded for this cycle.</p>
                  )}
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* ═══ PROJECT LOGS MODAL ═══ */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#E6F4EA] text-[#00875A] flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-[#091E42]">All Project Logs</h3>
                  <p className="text-xs text-slate-400">Complete historical list of all assigned projects</p>
                </div>
              </div>
              <button
                onClick={() => setShowLogsModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto log-scroll space-y-3">
              {allEmployeeProjects.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">No project logs available.</p>
              ) : (
                allEmployeeProjects.map((item) => {
                  const isActive = item.status === "active";
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isActive
                          ? "bg-[#E6F4EA]/30 border-emerald-200"
                          : "bg-slate-50/60 border-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                              isActive ? "bg-[#00875A] text-white" : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {isActive ? "Active" : "Completed"}
                          </span>
                          <h4 className="font-bold text-[#091E42] text-xs sm:text-sm">{item.name}</h4>
                        </div>
                        <span className="text-[10px] text-slate-400 font-data font-medium">
                          {item.startDate} — {item.endDate}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                        <span>Role: <strong className="text-slate-700">{item.role}</strong></span>
                        {/* <span className="font-data font-bold text-[#00875A]">{item.progress}% Completed</span> */}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-400">
              <span>Showing {allEmployeeProjects.length} total entries</span>
              <button
                onClick={() => setShowLogsModal(false)}
                className="px-4 py-1.5 bg-[#091E42] hover:bg-slate-800 text-white font-medium rounded-lg text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmployeeDashboard;