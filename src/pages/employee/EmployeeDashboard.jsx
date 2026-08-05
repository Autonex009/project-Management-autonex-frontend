import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { allocationApi, analyticsApi, authApi, employeeApi, leaveApi, perfEvalApi, subProjectApi, wfhApi } from "../../services/api";

import { AlertCircle, Award, Briefcase, Calendar, Check, ChevronDown, Clock, FolderKanban, Star, TrendingUp, Trophy } from "lucide-react";

import { differenceInMonths, differenceInYears, format, parseISO } from "date-fns";

import { ANNUAL_LEAVE_QUOTA, INTERN_MONTHLY_PAID_QUOTA, getWorkingDayCount, isIntern } from "../../utils/leaveTypes";

/* ── Helper: Extract Initials from Name ─────────────────────── */
function getNameInitials(name) {
  if (!name) return "EM";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ── Helper: Safe Leave Type Normalizer ─────────────────────── */
const normalizeLeaveType = (type) => {
  if (!type) return "paid";

  const t = type.toLowerCase();

  if (
    t === "first_half" ||
    t === "second_half" ||
    t === "paid" ||
    t === "earned" ||
    t === "annual"
  ) {
    return "paid";
  }

  if (
    t === "casual_sick" ||
    t === "sick" ||
    t === "casual" ||
    t === "medical"
  ) {
    return "casual_sick";
  }

  if (t === "floater") {
    return "floater";
  }

  if (t === "wfh" || t === "work_from_home") {
    return "wfh";
  }

  return "paid";
};

/* ── Helper: Calculate progress percentage ─────────────────── */
function getProgress(start, end) {
  if (!start || !end) return 85;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const now = Date.now();
  if (now >= e) return 100;
  if (now <= s) return 0;
  return Math.round(((now - s) / (e - s)) * 100);
}

/* ── Helper: Calculate Tenure String ───────────────────────── */
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
  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  // 1. Get logged-in user from localStorage
  const localUser = JSON.parse(localStorage.getItem("user") || "{}");
  const employeeId = localUser.employee_id || localUser.id || 1;

  // 2. Fetch authenticated account details
  const { data: account } = useQuery({
    queryKey: ["auth-me"],
    queryFn: authApi.me,
  });

  // 3. Fetch detailed employee profile data
  const { data: employee } = useQuery({
    queryKey: ["employee-profile", employeeId],
    queryFn: () => employeeApi.getOne(employeeId),
    enabled: !!employeeId,
  });

  // 4. Fetch allocated projects for this employee
  const { data: allocations = [] } = useQuery({
    queryKey: ["my-allocations", employeeId],
    queryFn: () => allocationApi.getByEmployee(employeeId),
    enabled: !!employeeId,
  });

  // 5. Fetch sub-projects
  const { data: projects = [] } = useQuery({
    queryKey: ["sub-projects"],
    queryFn: subProjectApi.getAll,
  });

  // 6. Fetch leaves (identical query to MyLeavesPanel)
  const { data: allLeaves = [] } = useQuery({
    queryKey: ["my-leaves", employeeId],
    queryFn: () => leaveApi.getAll({ employee_id: employeeId }),
    enabled: !!employeeId,
  });

  // 7. Fetch WFH requests (identical query to MyLeavesPanel)
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

  // ── Extract Profile details
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
      ratings.reduce((sum, value) => sum + value, 0) /
      ratings.length
    ).toFixed(1);
  }, [latestPmReview]);
  
  // ── Projects allocation mapping
  const myProjects = useMemo(() => {
    return allocations
      .map((alloc) => {
        const project = projects.find((p) => p.id === alloc.sub_project_id);

        return { ...alloc, project };
      })
      .filter((a) => a.project);
  }, [allocations, projects]);

  // ── Active Projects allocation mapping
  const activeProjects = useMemo(
    () => myProjects.filter((p) => p.project?.project_status === "active"),
    [myProjects]
  );
  const currentAllocation = activeProjects[0];

  // Encord platform activity for THIS employee — last 7 days, scoped to their
  // current project. Served by /analytics/me/encord-activity (self-scoped), which
  // resolves the signed-in user's Encord account via employees.encord_id.
  const currentSubProjectId = currentAllocation?.project?.id;
  const { data: encordActivity } = useQuery({
    queryKey: ["my-encord-activity", employeeId, currentSubProjectId],
    queryFn: () =>
      analyticsApi.getMyEncordActivity({
        days: 7,
        sub_project_id: currentSubProjectId,
      }),
    enabled: !!employeeId,
  });


  const pastProjects = useMemo(
    () => myProjects.filter((p) => p.project?.project_status !== "active"),
    [myProjects]
  );

  // ── Current Project Card Data
  const currentProject = useMemo(() => {
    if (activeProjects.length > 0) {
      const p = activeProjects[0];
      return {
        name: p.project?.name || "Project Nova",
        role: (p.role_tags || []).join(", ") || profile.jobTitle || "Lead UI Developer",
        status: p.project?.project_status === "active" ? "In Progress" : "Completed",
        progress: getProgress(p.active_start_date, p.active_end_date),
      };
    }
    return {
      name: "",
      role: "",
      status: "In Progress",
      progress: 0,
    };
  }, [activeProjects, profile.jobTitle]);

  // ── Employee Allocated Projects (Current + Previous) ──
  const previousProjects = useMemo(() => {
    if (myProjects.length > 0) {
      return myProjects.map((item, idx) => ({
        id: item.id || idx,
        name: item.project?.name || "Project",
        role:
          (item.role_tags || []).join(", ") ||
          profile.jobTitle ||
          "Developer",

        subtitle:
          item.project?.project_status === "active"
            ? "Current Project"
            : "Completed Project",

        date: item.active_start_date
          ? format(parseISO(item.active_start_date), "dd MMM yyyy")
          : "-",

        status: item.project?.project_status,

        iconBg:
          item.project?.project_status === "active"
            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
            : "bg-slate-100 text-slate-600 border border-slate-200",

        symbol: (item.project?.name || "P")[0].toUpperCase(),
      }));
    }

    return [];
  }, [myProjects, profile.jobTitle]);

  // ── Leaves & WFH Calculations for Logged-In User (Full-time vs Intern vs Contract)
  const employeeType = employee?.employee_type || localUser.employee_type || "Full-time";
  const internOrContractor = isIntern(employeeType);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  const leavesAndWfhStats = useMemo(() => {
    const usedYear = { paid: 0, casual_sick: 0, floater: 0 };
    let paidUsedThisMonth = 0;

    // Filter employee's approved leaves
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
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          paidUsedThisMonth += days;
        }
        return;
      }

      if (type in usedYear && d.getFullYear() === currentYear) {
        usedYear[type] += days;
      }
    });

    // 1. Paid / Earned Leave Quota & Calculation
    const paidQuota = internOrContractor
      ? INTERN_MONTHLY_PAID_QUOTA // 1 day per month for Interns/Contractors
      : (ANNUAL_LEAVE_QUOTA?.paid || 22); // 22 days per year for Full-Time

    const paidUsed = internOrContractor ? paidUsedThisMonth : usedYear.paid;
    const paidRemaining = Math.max(paidQuota - paidUsed, 0);
    const paidPct =
    paidQuota > 0
      ? Math.round((paidUsed / paidQuota) * 100)
      : 0;

    // 2. Sick / Casual Leave Quota & Calculation
    const casualQuota = internOrContractor ? 0 : (ANNUAL_LEAVE_QUOTA?.casual_sick || 10);
    const casualUsed = usedYear.casual_sick;
    const casualRemaining = Math.max(casualQuota - casualUsed, 0);
    const casualPct =
      casualQuota > 0
        ? Math.round((casualUsed / casualQuota) * 100)
        : 0;

    // 3. WFH Calculation (2 WFH/month limit for Interns/Contractors, annual for Full-Time)
    let wfhApprovedThisMonth = 0;
    let totalWfhApproved = 0;
    myWfh.forEach((wfh) => {
      if ((wfh.status || "pending").toLowerCase() !== "approved") return;
      const days = wfh.end_date && wfh.end_date !== wfh.wfh_date
        ? getWorkingDayCount(wfh.wfh_date, wfh.end_date)
        : 1;
      totalWfhApproved += days;

      if (wfh.wfh_date) {
        const d = new Date(wfh.wfh_date + "T00:00:00");
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          wfhApprovedThisMonth += days;
        }
      }
    });

    const wfhQuota = internOrContractor ? 2 : 100; // 2 days/month limit vs annual allotment
    const wfhUsed = internOrContractor ? wfhApprovedThisMonth : totalWfhApproved;
    const wfhPct = Math.round((wfhUsed / (wfhQuota || 1)) * 100);

    // Active Leave status badge check
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
      // Paid Leave
      paidUsed,
      paidRemaining,
      paidQuota,
      paidPct,

      // Sick Leave
      casualUsed,
      casualRemaining,
      casualQuota,
      casualPct,

      // WFH
      wfhUsed,
      wfhRemaining: Math.max(wfhQuota - wfhUsed, 0),
      wfhQuota,
      wfhPct,

      currentLeave,
      isInternOrContractor: internOrContractor,
    };
  }, [allLeaves, myWfh, internOrContractor, currentYear, currentMonth, todayStr]);

  // Total daily hours calculation
  const totalDailyHours = encordActivity?.total_hours ?? 0;
  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 p-2 sm:p-5 bg-slate-50/50 min-h-screen text-slate-800 font-sans">
      {/* ── Top Profile Header (Clean, Subtle White Card) ── */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

          <div className="flex items-center gap-4 sm:gap-5">

            {/* Display Picture with Initials Fallback */}
            <div className="relative flex-shrink-0">
              {profile.avatarUrl && !imgError ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  onError={() => setImgError(true)}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-slate-200 shadow-xs"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-xl sm:text-2xl flex items-center justify-center shadow-xs uppercase tracking-wider">
                  {profile.initials}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-md border border-emerald-200">
                {profile.badge}
              </span>
            </div>

            {/* Profile Information */}
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {profile.name}
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm font-medium flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                {profile.jobTitle}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Joined {profile.joiningDate}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Tenure: {profile.tenure}
                </span>
              </div>
            </div>
          </div>

          {/* Active / On Leave Status Pill */}
          <div className="self-start sm:self-auto">
            {leavesAndWfhStats.currentLeave ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                On Leave
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold capitalize">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
                {profile.status}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Dashboard 3-Column Grid ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Current Project Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                  <FolderKanban className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Current Project</h3>
              </div>
              <span className="px-3 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200/60">
                {currentProject.status}
              </span>
            </div>
            <h4 className="text-base font-bold text-slate-900">{currentProject.name}</h4>
            <p className="text-xs text-slate-500 mb-4">{currentProject.role}</p>
        
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-500">Progress</span>
                <span className="text-emerald-700">{currentProject.progress}%</span>
              </div>

              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${currentProject.progress}%` }}
                />
              </div>
            
            </div>
          
          </div>

          {/* Project Logs */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300">
            <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              Project Logs
            </h3>
            <div className="space-y-3">
              {previousProjects.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center font-bold text-base shadow-xs`}
                    >
                      {item.symbol}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{item.name}</h4>
                      <p className="text-xs text-slate-500">{item.role}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ${
                        item.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.status === "active" ? "Active" : "Completed"}
                    </span>

                    <p className="text-[11px] text-slate-400 mt-1">
                      {item.date}
                    </p>
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* Performance & Notifications */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300">
            <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-emerald-600" />
              Performance & Notifications
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Warnings Given
                </p>
                <p className="text-2xl font-extrabold text-slate-800 mt-1">
                  {employee?.warnings_count ?? 0}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Complaints
                </p>
                <p className="text-2xl font-extrabold text-slate-800 mt-1">
                  {employee?.complaints_count ?? 0}
                </p>
              </div>
            </div>

          </div>

        </div>

        {/* MIDDLE COLUMN (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Encord Platform Activity */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Encord Platform Activity
                  </h3>
                  <p className="text-xs text-slate-400">
                    Last 7 Days
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-600">
                  {totalDailyHours}h
                </p>
                <p className="text-[11px] text-slate-400">
                  Total Hours
                </p>
              </div>
            </div>

            {/* Daily Hours */}
            <div className="grid grid-cols-7 gap-2 px-5 pt-5">
              {(encordActivity?.daily || []).map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-100 bg-slate-50 py-2 text-center"
                >
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">
                    {format(parseISO(item.date), "EEE")[0]}
                  </p>

                  <p className="mt-1 text-xs font-bold text-slate-800">
                    {item.employee_hours}h
                  </p>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="px-5 py-5">

              <div className="relative h-56 border border-slate-100 rounded-2xl bg-slate-50">

                {/* Grid */}
                <div className="absolute inset-0 px-10 py-4 flex flex-col justify-between pointer-events-none">
                  {[0, 2, 4, 6, 8, 10].reverse().map((n) => (
                    <div
                      key={n}
                      className="relative border-t border-dashed border-slate-200"
                    >
                      <span className="absolute -left-8 -top-2 text-[10px] text-slate-400">
                        {n}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Bars */}
                <div className="ml-8 flex justify-between items-end h-44">

                  {(encordActivity?.daily || []).map((item, index) => (
                    <div
                      key={index}
                      className="flex flex-col items-center justify-end h-full flex-1"
                    >
                      {/* Pair of bars */}
                      <div className="flex items-end gap-1 h-36">

                        {/* Employee */}
                        <div
                          className="group relative w-4 bg-emerald-500 rounded-t-md hover:bg-emerald-600 transition-colors"
                          style={{
                            height: `${Math.max(
                              (item.employee_hours / 10) * 100,
                              4
                            )}%`,
                          }}
                        >
                          <span className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-slate-900 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap">
                            {item.employee_hours}h
                          </span>
                        </div>

                        {/* Team Average */}
                        <div
                          className="group relative w-4 bg-slate-300 rounded-t-md hover:bg-slate-400 transition-colors"
                          style={{
                            height: `${Math.max(
                              (item.team_avg_hours / 10) * 100,
                              4
                            )}%`,
                          }}
                        >
                          <span className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-slate-900 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap">
                            {item.team_avg_hours}h
                          </span>
                        </div>

                      </div>

                      <span className="mt-3 text-[11px] font-semibold text-slate-500">
                        {format(parseISO(item.date), "EEE")[0]}
                      </span>
                    </div>
                  ))}

                </div>

              </div>

              {/* Legend */}
              <div className="flex justify-center gap-6 mt-5 text-xs">

                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-emerald-500" />
                  <span className="text-slate-600">
                    Your Hours
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-slate-300" />
                  <span className="text-slate-600">
                    Team Average
                  </span>
                </div>

              </div>

            </div>

          </div>

          {/* Manager Feedback */}

          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-sm">
                Manager Feedback
              </h3>

              {latestRating && (
                <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-xl text-xs font-bold border border-amber-200">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {latestRating}/5
                </div>
              )}
            </div>

            {latestPmReview ? (
              <>
                <div className="mb-3">
                  <p className="text-xs text-slate-500">
                    {latestPmReview.period}
                  </p>
                </div>

                {latestPmReview.overall_comment ? (
                  <>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {showFullFeedback
                        ? latestPmReview.overall_comment
                        : `${latestPmReview.overall_comment.slice(0, 150)}${
                            latestPmReview.overall_comment.length > 150 ? "..." : ""
                          }`}
                    </p>

                    {latestPmReview.overall_comment.length > 150 && (
                      <button
                        onClick={() => setShowFullFeedback((v) => !v)}
                        className="mt-3 text-xs font-semibold text-emerald-600"
                      >
                        {showFullFeedback ? "Show Less" : "Read More"}
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-400 italic">
                    No comments provided by your PM.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-400 italic">
                No performance review available yet.
              </p>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN (4 cols) */}
        <div className="lg:col-span-4 space-y-5">

          {/* Leaves & WFH Info (Tailored for Full-time vs Intern vs Contract) */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-sm">Leaves & WFH Info</h3>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                {leavesAndWfhStats.isInternOrContractor ? "Intern/Contract Rules" : "Full-time Rules"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">

              {/* Earned Leave */}
              <div className="p-2.5 bg-slate-50/70 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-1 truncate">
                  {leavesAndWfhStats.isInternOrContractor ? "Earned (Mo)" : "Earned (Yr)"}
                </p>
                <p className="text-2xl font-extrabold text-slate-800">
                  {leavesAndWfhStats.paidRemaining}
                </p>

                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {leavesAndWfhStats.paidUsed} used
                  {leavesAndWfhStats.isInternOrContractor ? " this month" : ` in ${currentYear}`}
                </p> 

                <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(leavesAndWfhStats.paidPct, 100)}%`,
                    }}
                  />
                </div>

              </div>

              {/* Sick Leave */}
              <div className="p-2.5 bg-slate-50/70 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-1 truncate">
                  Sick Leave
                </p>

                <p className="text-2xl font-extrabold text-slate-800">
                  {leavesAndWfhStats.isInternOrContractor
                    ? "-"
                    : leavesAndWfhStats.casualRemaining}
                </p>

                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {leavesAndWfhStats.isInternOrContractor
                    ? "Not Applicable"
                    : `${leavesAndWfhStats.casualUsed} used in ${currentYear}`}
                </p>

                <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(leavesAndWfhStats.casualPct, 100)}%`,
                    }}
                  />

                </div>

              </div>

              {/* WFH Days */}
              <div className="p-2.5 bg-slate-50/70 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-1 truncate">
                  {leavesAndWfhStats.isInternOrContractor ? "WFH (Mo)" : "WFH Days"}
                </p>

                <p className="text-2xl font-extrabold text-slate-800">
                  {leavesAndWfhStats.wfhRemaining}
                </p>

                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {leavesAndWfhStats.wfhUsed} used
                  {leavesAndWfhStats.isInternOrContractor
                    ? " this month"
                    : ` of ${leavesAndWfhStats.wfhQuota}`}
                </p>

                <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-teal-600 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(leavesAndWfhStats.wfhPct, 100)}%`,
                    }}
                  />
                </div>

              </div>

            </div>

          </div>

          {/* Awards & Recognition */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300">
            <h3 className="font-bold text-slate-800 text-sm mb-4">Awards & Recognition</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-2xl text-amber-500 bg-amber-50 border border-amber-100 flex items-center justify-center shadow-xs shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">Best Performer of Month</h4>
                  <p className="text-[11px] text-slate-400 font-semibold">May 2024</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-2xl text-emerald-600 bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-xs shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">
                    Max Platform Hours (Week 24)
                  </h4>
                  <p className="text-[11px] text-slate-400 font-semibold">June 2024</p>
                </div>
              </div>
            </div>
          </div>

          {/* Leaderboard Ranking */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300">
            <h3 className="font-bold text-slate-800 text-sm">Leaderboard Ranking</h3>
            <p className="text-[11px] text-slate-400 font-semibold mb-3.5">
              Global ranking (based on platform time)
            </p>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3 text-center">
                <p className="text-xs text-slate-500 font-semibold">Daily</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <span className="text-base font-extrabold text-slate-800">#5</span>
                  <span className="text-emerald-500 font-bold text-xs">↑</span>
                </div>
              </div>

              <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3 text-center">
                <p className="text-xs text-slate-500 font-semibold">Weekly</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <span className="text-base font-extrabold text-slate-800">#3</span>
                  <span className="text-emerald-500 font-bold text-xs">↑</span>
                </div>
              </div>

              <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3 text-center">
                <p className="text-xs text-slate-500 font-semibold">Monthly</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <span className="text-base font-extrabold text-slate-800">#7</span>
                  <span className="text-rose-500 font-bold text-xs">↓</span>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>

  );

};

export default EmployeeDashboard;
