// import React, { useMemo, useState, useRef, useEffect } from "react";
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// import {
//   allocationApi,
//   analyticsApi,
//   authApi,
//   employeeApi,
//   leaveApi,
//   perfEvalApi,
//   subProjectApi,
//   wfhApi,
//   skillsApi,
// } from "../../services/api";

// import {
//   AlertCircle,
//   AlertTriangle,
//   Calendar,
//   Check,
//   ChevronRight,
//   ChevronDown, 
//   FolderKanban,
//   MessageSquare,
//   Star,
//   History,
//   X,
//   ShieldCheck,
//   Home,
//   HeartPulse,
//   Mail,
//   Phone,
//   Hash,
//   Clock3,
//   Sparkles,
//   BadgeCheck,
//   Lock,
//   Camera,
//   Trash2,
//   Pencil,
//   Save,
//   Loader2,
//   Award,
// } from "lucide-react";

// import {
//   ANNUAL_LEAVE_QUOTA,
//   INTERN_MONTHLY_PAID_QUOTA,
//   getWorkingDayCount,
//   isIntern,
// } from "../../utils/leaveTypes";
// import {
//   differenceInCalendarDays,
//   differenceInMonths,
//   differenceInYears,
//   format,
//   parseISO,
//   startOfMonth,
// } from "date-fns";

// import fiftyHoursBadge from "../../components/badges/50hrs.png";
// import twoHundredHoursBadge from "../../components/badges/200hrs.png";
// import weeklyTopBadge from "../../components/badges/weekly_2.png";
// import monthlyTopBadge from "../../components/badges/monthly_1.png";
// import threeMonthsBadge from "../../components/badges/3months.png";
// import sixMonthsBadge from "../../components/badges/6months.png";

// /* ── Helpers ────────────────────────────────────────── */
// function getNameInitials(name) {
//   if (!name) return "EM";
//   const parts = name.trim().split(/\s+/);
//   if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
//   return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
// }

// const normalizeLeaveType = (type) => {
//   if (!type) return "paid";
//   const t = type.toLowerCase();
//   if (
//     t === "first_half" ||
//     t === "second_half" ||
//     t === "paid" ||
//     t === "earned" ||
//     t === "annual"
//   )
//     return "paid";
//   if (t === "casual_sick" || t === "sick" || t === "casual" || t === "medical")
//     return "casual_sick";
//   if (t === "floater") return "floater";
//   if (t === "wfh" || t === "work_from_home") return "wfh";
//   return "paid";
// };

// function calculateTenure(dateStr) {
//   if (!dateStr) return "3 Years 5 Months";
//   try {
//     const start = parseISO(dateStr);
//     const now = new Date();
//     const years = differenceInYears(now, start);
//     const months = differenceInMonths(now, start) % 12;
//     if (years === 0 && months === 0) return "1 Month";
//     return `${years > 0 ? `${years} Year${years > 1 ? "s" : ""} ` : ""}${months} Month${
//       months !== 1 ? "s" : ""
//     }`;
//   } catch {
//     return "3 Years 5 Months";
//   }
// }

// /* ── Achievement badge visual config ── */
// const BADGE_STYLES = {
//   "50-hours-week": { image: fiftyHoursBadge },
//   "200-hours-month": { image: twoHundredHoursBadge },
//   "weekly-top": { image: weeklyTopBadge },
//   "monthly-top": { image: monthlyTopBadge },
//   "three-months": { image: threeMonthsBadge },
//   "six-months": { image: sixMonthsBadge },
// };

// /* ── Skills Multi-Select ─────────────────────────────── */
// const SkillsMultiSelect = ({ selected, onChange, options, isLoading }) => {
//   const [open, setOpen] = useState(false);
//   const ref = useRef(null);

//   useEffect(() => {
//     const handler = (e) => {
//       if (ref.current && !ref.current.contains(e.target)) setOpen(false);
//     };
//     document.addEventListener("mousedown", handler);
//     return () => document.removeEventListener("mousedown", handler);
//   }, []);

//   const toggle = (skillName) => {
//     onChange(
//       selected.includes(skillName)
//         ? selected.filter((s) => s !== skillName)
//         : [...selected, skillName]
//     );
//   };

//   return (
//     <div ref={ref} className="relative w-full">
      
//       <div className="mb-2 flex flex-wrap gap-1.5">
//         {selected.map((skill) => (
//           <span
//             key={skill}
//             className="inline-flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-800"
//           >
//             {skill}
//             <button
//               type="button"
//               onClick={() => toggle(skill)}
//               className="rounded text-teal-600 hover:bg-teal-200 hover:text-teal-900"
//             >
//               <X className="h-3 w-3" />
//             </button>
//           </span>
//         ))}
//       </div>

//       <button
//         type="button"
//         onClick={() => setOpen((v) => !v)}
//         className="flex w-full items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-teal-300 focus:outline-none"
//       >
//         <span className="text-stone-400">Add or remove skills…</span>
//         <ChevronDown
//           className={`h-3.5 w-3.5 text-stone-400 transition-transform ${
//             open ? "rotate-180" : ""
//           }`}
//         />
//       </button>

//       {open && (
//         <div className="absolute left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
//           {isLoading ? (
//             <div className="p-3 text-center text-xs text-stone-400">
//               Loading skills…
//             </div>
//           ) : (
//             options.map((skill) => {
//               const isSelected = selected.includes(skill.name);
//               return (
//                 <button
//                   key={skill.id}
//                   type="button"
//                   onClick={() => toggle(skill.name)}
//                   className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
//                     isSelected
//                       ? "bg-teal-50 font-semibold text-teal-800"
//                       : "hover:bg-stone-50 text-stone-700"
//                   }`}
//                 >
//                   <div
//                     className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${
//                       isSelected
//                         ? "border-teal-600 bg-teal-600 text-white"
//                         : "border-stone-300"
//                     }`}
//                   >
//                     {isSelected && <Check className="h-2.5 w-2.5" />}
//                   </div>
//                   {skill.name}
//                 </button>
//               );
//             })
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// const EmployeeDashboard = () => {
//   const queryClient = useQueryClient();
//   const [showFullFeedback, setShowFullFeedback] = useState(false);
//   const [imgError, setImgError] = useState(false);
//   const [showLogsModal, setShowLogsModal] = useState(false);
//   const [editEmail, setEditEmail] = useState("");
//   const [emailError, setEmailError] = useState("");
//   const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

//   const localUser = JSON.parse(localStorage.getItem("user") || "{}");
//   const employeeId = localUser.employee_id || localUser.id || 1;

//   /* ── Queries ─────────────────────────────────────── */
//   const { data: account } = useQuery({
//     queryKey: ["auth-me"],
//     queryFn: authApi.me,
//   });
//   const { data: employee } = useQuery({
//     queryKey: ["employee-profile", employeeId],
//     queryFn: () => employeeApi.getOne(employeeId),
//     enabled: !!employeeId,
//   });

//   const loggedInEncordId = employee?.encord_id?.trim().toLowerCase() || "";

//   const { data: allocations = [] } = useQuery({
//     queryKey: ["my-allocations", employeeId],
//     queryFn: () => allocationApi.getByEmployee(employeeId),
//     enabled: !!employeeId,
//   });

//   const { data: projects = [] } = useQuery({
//     queryKey: ["sub-projects"],
//     queryFn: subProjectApi.getAll,
//   });

//   const { data: allLeaves = [] } = useQuery({
//     queryKey: ["my-leaves", employeeId],
//     queryFn: () => leaveApi.getAll({ employee_id: employeeId }),
//     enabled: !!employeeId,
//   });

//   const { data: myWfh = [] } = useQuery({
//     queryKey: ["my-wfh", employeeId],
//     queryFn: () => wfhApi.getAll({ employee_id: employeeId }),
//     enabled: !!employeeId,
//   });

//   const { data: perfReviews = [] } = useQuery({
//     queryKey: ["employee-perf-reviews", employeeId],
//     queryFn: () => perfEvalApi.getAll({ employee_id: employeeId }),
//     enabled: !!employeeId,
//   });

//   const { data: dailyLeaderboard } = useQuery({
//     queryKey: ["leaderboard-day"],
//     queryFn: () => analyticsApi.getLeaderboard({ range: "day" }),
//   });
//   const { data: weeklyLeaderboard } = useQuery({
//     queryKey: ["leaderboard-week"],
//     queryFn: () => analyticsApi.getLeaderboard({ range: "week" }),
//   });
//   const { data: monthlyLeaderboard } = useQuery({
//     queryKey: ["leaderboard-month"],
//     queryFn: () => analyticsApi.getLeaderboard({ range: "month" }),
//   });

//   const { data: skillsList = [], isLoading: skillsLoading } = useQuery({
//     queryKey: ["skills-list"],
//     queryFn: skillsApi.getAll,
//   });

//   const getEmployeeRank = (leaderboard) => {
//     if (!leaderboard?.leaderboard || !loggedInEncordId) return null;
//     const ranked = [...leaderboard.leaderboard].sort(
//       (a, b) => (b.total_hours || 0) - (a.total_hours || 0)
//     );
//     const index = ranked.findIndex(
//       (item) => (item.user_email || "").trim().toLowerCase() === loggedInEncordId
//     );
//     return index >= 0 ? index + 1 : null;
//   };

//   const dailyRank = useMemo(
//     () => getEmployeeRank(dailyLeaderboard),
//     [dailyLeaderboard, loggedInEncordId]
//   );
//   const weeklyRank = useMemo(
//     () => getEmployeeRank(weeklyLeaderboard),
//     [weeklyLeaderboard, loggedInEncordId]
//   );
//   const monthlyRank = useMemo(
//     () => getEmployeeRank(monthlyLeaderboard),
//     [monthlyLeaderboard, loggedInEncordId]
//   );

//   /* ── Profile ─────────────────────────────────────── */
//   const profile = useMemo(() => {
//     const name = account?.name || employee?.name || localUser.name || "";
//     const jobTitle = employee?.designation || account?.role || "Annotator/Reviewer";
//     const status = employee?.status || "active";
//     const avatarUrl =
//       employee?.avatar_url || account?.avatar_url || localUser.avatar_url || null;
//     const rawJoiningDate = employee?.joining_date || employee?.created_at;
//     const joiningDate = rawJoiningDate
//       ? format(parseISO(rawJoiningDate), "dd MMM yyyy")
//       : "";
//     const tenure = calculateTenure(rawJoiningDate);
//     const badge = employee?.employee_type || localUser.employee_type || "";
//     const initials = getNameInitials(name);

//     const email = account?.email || employee?.email || localUser.email || "";
//     const phone = employee?.phone || account?.phone || "";
//     const encordId = employee?.encord_id || "";
//     const slackUserId = employee?.slack_user_id || "";
//     const skills = employee?.skills || account?.skills || localUser.skills || [];
//     const empId = employee?.id || employeeId || "";
//     const workingHours = employee?.working_hours_per_day;
//     const weeklyAvailability = employee?.weekly_availability;

//     return {
//       name,
//       jobTitle,
//       status,
//       avatarUrl,
//       joiningDate,
//       tenure,
//       badge,
//       initials,
//       email,
//       phone,
//       encordId,
//       slackUserId,
//       skills,
//       empId,
//       workingHours,
//       weeklyAvailability,
//     };
//   }, [account, employee, localUser, employeeId]);

//   /* ── Edit State & Mutations ──────────────────────── */
//   const [isEditing, setIsEditing] = useState(false);
//   const [editPhone, setEditPhone] = useState("");
//   const [editSkills, setEditSkills] = useState([]);
//   const [editSlackId, setEditSlackId] = useState("");
//   const [editEncordId, setEditEncordId] = useState("");
//   const [saveError, setSaveError] = useState("");

//   const enterEditMode = () => {
//     setEditPhone(profile.phone || "");
//     setEditSkills([...(profile.skills || [])]);
//     setEditSlackId(profile.slackUserId || "");
//     setEditEncordId(profile.encordId || "");
//     setEditEmail(profile.email || "");
//     setSaveError("");
//     setEmailError("");
//     setIsEditing(true);
//   };

//   const cancelEdit = () => {
//     setIsEditing(false);
//     setSaveError("");
//   };

//   const changeEmailMutation = useMutation({
//     mutationFn: (newEmail) => employeeApi.changeEmail(employeeId, newEmail),
//     onSuccess: (updated) => {
//       try {
//         const cached = JSON.parse(localStorage.getItem("user") || "{}");
//         localStorage.setItem(
//           "user",
//           JSON.stringify({ ...cached, email: updated.email })
//         );
//       } catch {}
//       queryClient.invalidateQueries({ queryKey: ["auth-me"] });
//       queryClient.invalidateQueries({ queryKey: ["employee-profile", employeeId] });
//       setEmailError("");
//     },
//     onError: (err) => {
//       setEmailError(err?.response?.data?.detail || "Could not change email.");
//     },
//   });

//   const saveMutation = useMutation({
//     mutationFn: (data) => employeeApi.update(employeeId, data),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["employee-profile", employeeId] });
//       queryClient.invalidateQueries({ queryKey: ["auth-me"] });
//       setIsEditing(false);
//       setSaveError("");
//     },
//     onError: (err) => {
//       setSaveError(err?.response?.data?.detail || "Failed to save changes.");
//     },
//   });

//   const COMPANY_DOMAIN = "autonexai360.com";

//   const handleSave = async () => {
//     // First save the normal fields
//     saveMutation.mutate({
//       phone: editPhone || null,
//       skills: editSkills,
//       slack_user_id: editSlackId || null,
//       encord_id: editEncordId || null,
//     });

//     // Then handle email change if needed
//     const trimmedEmail = editEmail.trim().toLowerCase();
//     const originalEmail = (profile.email || "").trim().toLowerCase();

//     if (
//       trimmedEmail &&
//       trimmedEmail !== originalEmail &&
//       trimmedEmail.endsWith(`@${COMPANY_DOMAIN}`) &&
//       trimmedEmail.split("@")[0].length > 0
//     ) {
//       changeEmailMutation.mutate(trimmedEmail);
//     }
//   };

//   /* ── Avatar Mutations ────────────────────────────── */
//   const fileInputRef = useRef(null);
//   const [avatarError, setAvatarError] = useState("");

//   const onAvatarSuccess = () => {
//     queryClient.invalidateQueries({ queryKey: ["employee-profile", employeeId] });
//     queryClient.invalidateQueries({ queryKey: ["auth-me"] });
//     setAvatarError("");
//   };

//   const uploadAvatarMutation = useMutation({
//     mutationFn: (formData) => employeeApi.uploadAvatar(employeeId, formData),
//     onSuccess: onAvatarSuccess,
//     onError: (err) =>
//       setAvatarError(err?.response?.data?.detail || "Upload failed."),
//   });

//   const slackAvatarMutation = useMutation({
//     mutationFn: () => employeeApi.setAvatarFromSlack(employeeId),
//     onSuccess: onAvatarSuccess,
//     onError: (err) =>
//       setAvatarError(err?.response?.data?.detail || "Slack sync failed."),
//   });

//   const deleteAvatarMutation = useMutation({
//     mutationFn: () => employeeApi.deleteAvatar(employeeId),
//     onSuccess: onAvatarSuccess,
//     onError: (err) =>
//       setAvatarError(err?.response?.data?.detail || "Delete failed."),
//   });

//   const handleAvatarFile = (e) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     if (file.size > 5 * 1024 * 1024) {
//       setAvatarError("Max size 5 MB.");
//       return;
//     }
//     const formData = new FormData();
//     formData.append("file", file);
//     uploadAvatarMutation.mutate(formData);
//     e.target.value = "";
//   };

//   const avatarBusy =
//     uploadAvatarMutation.isPending ||
//     slackAvatarMutation.isPending ||
//     deleteAvatarMutation.isPending;

//   /* ── Performance ─────────────────────────────────── */
//   const latestPmReview = useMemo(() => {
//     return [...perfReviews]
//       .filter((review) => review.status === "reviewed")
//       .sort(
//         (a, b) =>
//           new Date(b.reviewed_at || b.updated_at || b.created_at) -
//           new Date(a.reviewed_at || a.updated_at || a.created_at)
//       )[0];
//   }, [perfReviews]);

//   const latestRating = useMemo(() => {
//     if (!latestPmReview?.parameter_values?.length) return null;
//     const ratings = latestPmReview.parameter_values
//       .map((p) => p.pm_rating)
//       .filter((r) => r != null);
//     if (!ratings.length) return null;
//     return (
//       ratings.reduce((sum, value) => sum + value, 0) / ratings.length
//     ).toFixed(1);
//   }, [latestPmReview]);

//   /* ── Projects ────────────────────────────────────── */
//   const allEmployeeProjects = useMemo(() => {
//     return allocations
//       .map((alloc) => {
//         const project = projects.find((p) => p.id === alloc.sub_project_id);
//         const isActive = project?.project_status === "active";
//         return {
//           id: alloc.id,
//           name: project?.name || "Project",
//           role: (alloc.role_tags || []).join(", ") || profile.jobTitle || "Developer",
//           status: isActive ? "active" : "completed",
//           startDate: alloc.active_start_date
//             ? format(parseISO(alloc.active_start_date), "dd MMM yyyy")
//             : "-",
//           endDate: alloc.active_end_date
//             ? format(parseISO(alloc.active_end_date), "dd MMM yyyy")
//             : "Ongoing",
//           symbol: (project?.name || "P")[0].toUpperCase(),
//         };
//       })
//       .sort((a, b) => (a.status === "active" ? -1 : 1));
//   }, [allocations, projects, profile.jobTitle]);

//   const activeProjects = useMemo(
//     () => allEmployeeProjects.filter((p) => p.status === "active"),
//     [allEmployeeProjects]
//   );

//   const currentMonthLabel = useMemo(() => format(new Date(), "MMMM yyyy"), []);
//   const daysElapsedInMonth = useMemo(
//     () => differenceInCalendarDays(new Date(), startOfMonth(new Date())) + 1,
//     []
//   );
//   const currentSubProjectId = activeProjects[0]?.id;

//   const { data: encordActivity } = useQuery({
//     queryKey: [
//       "my-encord-activity",
//       employeeId,
//       currentSubProjectId,
//       currentMonthLabel,
//     ],
//     queryFn: () =>
//       analyticsApi.getMyEncordActivity({
//         days: daysElapsedInMonth,
//         sub_project_id: currentSubProjectId,
//       }),
//     enabled: !!employeeId,
//   });

//   const totalDailyHours = encordActivity?.total_hours ?? 0;
//   const dailyData = encordActivity?.daily || [];

//   const activityStats = useMemo(() => {
//     if (!dailyData.length)
//       return { avgHours: 0, avgTeamHours: 0, deltaPct: 0, activeDays: 0 };
//     const empSum = dailyData.reduce((s, d) => s + (d.employee_hours || 0), 0);
//     const teamSum = dailyData.reduce((s, d) => s + (d.team_avg_hours || 0), 0);
//     const activeDays = dailyData.filter((d) => (d.employee_hours || 0) > 0).length;
//     const avgHours = empSum / dailyData.length;
//     const avgTeamHours = teamSum / dailyData.length;
//     const deltaPct =
//       avgTeamHours > 0
//         ? Math.round(((avgHours - avgTeamHours) / avgTeamHours) * 100)
//         : 0;
//     return {
//       avgHours: Math.round(avgHours * 10) / 10,
//       avgTeamHours: Math.round(avgTeamHours * 10) / 10,
//       deltaPct,
//       activeDays,
//     };
//   }, [dailyData]);

//   /* ── Chart ───────────────────────────────────────── */
//   const CHART_W = 640;
//   const CHART_H = 90;
//   const chartMax = useMemo(() => {
//     if (!dailyData.length) return 10;
//     const maxVal = Math.max(
//       ...dailyData.map((d) =>
//         Math.max(d.employee_hours || 0, d.team_avg_hours || 0)
//       )
//     );
//     return Math.max(6, Math.ceil(maxVal / 2) * 2);
//   }, [dailyData]);

//   const chartGeometry = useMemo(() => {
//     const stepX = dailyData.length > 1 ? CHART_W / (dailyData.length - 1) : 0;
//     const toY = (v) =>
//       CHART_H - (Math.min(v || 0, chartMax) / chartMax) * CHART_H;
//     const points = dailyData.map((d, i) => ({
//       x: i * stepX,
//       yEmp: toY(d.employee_hours),
//       yTeam: toY(d.team_avg_hours),
//       date: d.date,
//       employee_hours: d.employee_hours,
//       team_avg_hours: d.team_avg_hours,
//     }));
//     const empLine = points.map((p) => `${p.x},${p.yEmp}`).join(" ");
//     const teamLine = points.map((p) => `${p.x},${p.yTeam}`).join(" ");
//     const areaFill = points.length
//       ? `0,${CHART_H} ${empLine} ${points[points.length - 1].x},${CHART_H}`
//       : "";
//     return { points, empLine, teamLine, areaFill, stepX };
//   }, [dailyData, chartMax]);

//   const [hoverIndex, setHoverIndex] = useState(null);
//   const svgRef = useRef(null);

//   const handleChartMouseMove = (e) => {
//     if (!chartGeometry.points.length || !svgRef.current) return;
//     const rect = svgRef.current.getBoundingClientRect();
//     const relX = ((e.clientX - rect.left) / rect.width) * CHART_W;
//     const idx = Math.round(relX / (chartGeometry.stepX || 1));
//     setHoverIndex(
//       Math.min(Math.max(idx, 0), chartGeometry.points.length - 1)
//     );
//   };

//   const handleChartMouseLeave = () => setHoverIndex(null);
//   const hoverPoint =
//     hoverIndex !== null ? chartGeometry.points[hoverIndex] : null;

//   /* ── Leaves & WFH ────────────────────────────────── */
//   const employeeType =
//     employee?.employee_type || localUser.employee_type || "Full-time";
//   const internOrContractor = isIntern(employeeType);
//   const now = new Date();
//   const currentYear = now.getFullYear();
//   const currentMonth = now.getMonth();

//   const leavesAndWfhStats = useMemo(() => {
//     const usedYear = { paid: 0, casual_sick: 0, floater: 0 };
//     let paidUsedThisMonth = 0;

//     allLeaves.forEach((leave) => {
//       if ((leave.status || "pending").toLowerCase() !== "approved") return;
//       const type = normalizeLeaveType(leave.leave_type);
//       const days = leave.is_half_day
//         ? 0.5
//         : leave.start_date && leave.end_date
//         ? getWorkingDayCount(leave.start_date, leave.end_date)
//         : 1.0;
//       if (!leave.start_date || !leave.end_date) {
//         if (type in usedYear) usedYear[type] += days;
//         return;
//       }
//       const d = new Date(leave.start_date + "T00:00:00");
//       if (internOrContractor && type === "paid") {
//         if (d.getFullYear() === currentYear && d.getMonth() === currentMonth)
//           paidUsedThisMonth += days;
//         return;
//       }
//       if (type in usedYear && d.getFullYear() === currentYear)
//         usedYear[type] += days;
//     });

//     const paidQuota = internOrContractor
//       ? INTERN_MONTHLY_PAID_QUOTA
//       : ANNUAL_LEAVE_QUOTA?.paid || 22;
//     const paidUsed = internOrContractor ? paidUsedThisMonth : usedYear.paid;
//     const paidRemaining = Math.max(paidQuota - paidUsed, 0);

//     const casualQuota = internOrContractor
//       ? 0
//       : ANNUAL_LEAVE_QUOTA?.casual_sick || 10;
//     const casualUsed = usedYear.casual_sick;
//     const casualRemaining = Math.max(casualQuota - casualUsed, 0);

//     let totalWfhApproved = 0;

//     myWfh.forEach((wfh) => {
//       if ((wfh.status || "pending").toLowerCase() !== "approved") return;
//       if (!wfh.wfh_date) return;

//       const wfhStart = new Date(`${wfh.wfh_date}T00:00:00`);

//       if (
//         internOrContractor &&
//         (wfhStart.getFullYear() !== currentYear ||
//           wfhStart.getMonth() !== currentMonth)
//       ) {
//         return;
//       }

//       const days =
//         wfh.end_date && wfh.end_date !== wfh.wfh_date
//           ? getWorkingDayCount(wfh.wfh_date, wfh.end_date)
//           : 1;

//       totalWfhApproved += days;
//     });

//     const wfhQuota = internOrContractor ? 2 : 100;
//     const wfhRemaining = Math.max(wfhQuota - totalWfhApproved, 0);

//     const currentLeave = allLeaves.find((leave) => {
//       if ((leave.status || "pending").toLowerCase() === "rejected") return false;
//       return (
//         leave.start_date &&
//         leave.end_date &&
//         leave.start_date <= todayStr &&
//         leave.end_date >= todayStr
//       );
//     });

//     return {
//       paidRemaining,
//       casualRemaining,
//       wfhRemaining,
//       currentLeave,
//       isInternOrContractor: internOrContractor,
//     };
//   }, [allLeaves, myWfh, internOrContractor, currentYear, currentMonth, todayStr]);

//   const achievementBadges = useMemo(
//     () => [
//       { id: "50-hours-week", label: "50 Hours", meta: "Weekly", earned: true },
//       { id: "200-hours-month", label: "200 Hours", meta: "Monthly", earned: true },
//       { id: "weekly-top", label: "Weekly Top", meta: "Performer", earned: true },
//       { id: "monthly-top", label: "Monthly Top", meta: "Performer", earned: false },
//       { id: "three-months", label: "3 Months", meta: "Completed", earned: false },
//       { id: "six-months", label: "6 Months", meta: "Completed", earned: false },
//     ],
//     []
//   );
//   const earnedBadgeCount = achievementBadges.filter((b) => b.earned).length;

//   const display = (value, fallback = "Not set") => {
//     if (value === null || value === undefined || value === "") return fallback;
//     return value;
//   };

//   // Arrays for messages
//   const complaintsList = employee?.complaints || [];
//   const warningsList = employee?.warnings || [];
//   const recognitionsList = employee?.recognitions || employee?.recognition_messages || [];

//   const complaintsCount = employee?.complaints_count ?? complaintsList.length ?? 0;
//   const warningsCount = employee?.warnings_count ?? warningsList.length ?? 0;

//   return (
//     <div
//       className="w-full max-w-[1400px] mx-auto min-h-screen overflow-y-auto overflow-x-hidden px-2 sm:px-3 py-2 sm:py-3 text-stone-800 bg-gradient-to-b from-stone-100/90 via-stone-50 to-stone-50 font-sans flex flex-col gap-2 sm:gap-2.5"
//       style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
//     >
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap');
//         .font-display { font-family: 'Inter', sans-serif; letter-spacing: -0.01em; }
//         .font-data { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
//         .log-scroll::-webkit-scrollbar { width: 4px; }
//         .log-scroll::-webkit-scrollbar-thumb { background: #D6D3D1; border-radius: 999px; }
//         .badge-glow {
//           filter: drop-shadow(0 0 4px rgba(13, 148, 136, 0.35))
//                   drop-shadow(0 0 1.5px rgba(13, 148, 136, 0.25));
//         }
//       `}</style>

//       {/* ════════════════ TOP SECTION ════════════════ */}
//       <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-2.5 items-stretch">
        
//         {/* ──────────── PROFILE CARD ──────────── */}
//         <div className="lg:col-span-5 bg-gradient-to-br from-teal-50/50 via-stone-50 to-white rounded-xl border border-stone-200/60 p-3 shadow-[0_1px_3px_rgba(28,25,23,0.04)] flex flex-col overflow-hidden">
          
//           <div className="flex items-start gap-5">   {/* increased gap from 3.5 → 5 */}
//             {/* Bigger Avatar */}
//             <div className="relative shrink-0 group">
//               <input
//                 ref={fileInputRef}
//                 type="file"
//                 accept="image/png,image/jpeg,image/gif,image/webp"
//                 className="hidden"
//                 onChange={handleAvatarFile}
//               />

//               {profile.avatarUrl && !imgError ? (
//                 <img
//                   src={profile.avatarUrl}
//                   alt={profile.name}
//                   onError={() => setImgError(true)}
//                   className="w-24 h-24 sm:w-[96px] sm:h-[96px] rounded-full object-cover border-2 border-white shadow-sm"
//                 />
//               ) : (
//                 <div className="w-24 h-24 sm:w-[96px] sm:h-[96px] rounded-full bg-gradient-to-br from-teal-100 to-stone-100 border-2 border-white text-teal-800 font-bold text-2xl flex items-center justify-center shadow-sm uppercase">
//                   {profile.initials}
//                 </div>
//               )}

//               {leavesAndWfhStats.currentLeave ? (
//                 <span className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center z-10">
//                   <AlertCircle className="w-2.5 h-2.5 text-white" />
//                 </span>
//               ) : (
//                 <span className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center z-10">
//                   <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
//                 </span>
//               )}

//               <button
//                 type="button"
//                 onClick={() => fileInputRef.current?.click()}
//                 disabled={avatarBusy}
//                 className="absolute inset-0 rounded-full bg-stone-900/55 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
//               >
//                 {avatarBusy ? (
//                   <Loader2 className="w-5 h-5 animate-spin" />
//                 ) : (
//                   <>
//                     <Camera className="w-5 h-5" />
//                     <span className="text-[9px] font-semibold mt-0.5">Change</span>
//                   </>
//                 )}
//               </button>
//             </div>

//             {/* Content - shifted more to the right */}
//             <div className="flex-1 min-w-0 pt-0.5">
//               {/* Name + Badge */}
//               <div className="flex items-center gap-1.5 flex-wrap">
//                 <h1 className="font-display text-[15px] sm:text-base font-bold text-stone-900 truncate leading-tight">
//                   {display(profile.name, "Employee")}
//                 </h1>
//                 {profile.badge && (
//                   <span className="text-[8.5px] font-bold uppercase tracking-wide text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
//                     {profile.badge}
//                   </span>
//                 )}
//               </div>

//               <p className="text-stone-500 text-xs font-medium truncate leading-tight mt-0.5">
//                 {display(profile.jobTitle, "No designation")}
//               </p>

//               {/* Dense Meta */}
//               <div className="mt-1.5 space-y-0.5 text-[11px] text-stone-600 leading-tight">
//                 <div className="flex flex-wrap items-center gap-x-1.5">
//                   <span>
//                     Joined{" "}
//                     <span className={`font-semibold ${profile.joiningDate ? "text-stone-800" : "text-stone-400 italic"}`}>
//                       {display(profile.joiningDate)}
//                     </span>
//                   </span>
//                   <span className="text-stone-300">·</span>
//                   <span>
//                     ID{" "}
//                     <span className={`font-semibold ${profile.empId ? "text-stone-800" : "text-stone-400 italic"}`}>
//                       {display(profile.empId)}
//                     </span>
//                   </span>
//                   <span className="text-stone-300">·</span>
//                   <span>
//                     Daily{" "}
//                     <span className={`font-semibold ${profile.workingHours ? "text-stone-800" : "text-stone-400 italic"}`}>
//                       {profile.workingHours ? `${profile.workingHours}h` : "Not set"}
//                     </span>
//                   </span>
//                   <span className="text-stone-300">·</span>
//                   <span>
//                     Weekly{" "}
//                     <span className={`font-semibold ${profile.weeklyAvailability ? "text-stone-800" : "text-stone-400 italic"}`}>
//                       {profile.weeklyAvailability ? `${profile.weeklyAvailability}h` : "Not set"}
//                     </span>
//                   </span>
//                 </div>

//                 <div className={`truncate font-semibold ${profile.email ? "text-stone-800" : "text-stone-400 italic"}`}>
//                   {display(profile.email)}
//                 </div>

//                 <div className="flex flex-wrap items-center gap-x-1.5">
//                   <span>
//                     Phone{" "}
//                     <span className={`font-semibold ${profile.phone ? "text-stone-800" : "text-stone-400 italic"}`}>
//                       {display(profile.phone)}
//                     </span>
//                   </span>
//                   <span className="text-stone-300">·</span>
//                   <span>
//                     Slack{" "}
//                     <span className={`font-semibold ${profile.slackUserId ? "text-stone-800" : "text-stone-400 italic"}`}>
//                       {display(profile.slackUserId)}
//                     </span>
//                   </span>
//                   <span className="text-stone-300">·</span>
//                   <span className="truncate">
//                     Encord{" "}
//                     <span className={`font-semibold ${profile.encordId ? "text-stone-800" : "text-stone-400 italic"}`}>
//                       {display(profile.encordId)}
//                     </span>
//                   </span>
//                 </div>

//                 <div>
//                   {profile.skills?.length > 0 ? (
//                     <span>
//                       <span className="text-stone-400">Skills · </span>
//                       <span className="font-semibold text-stone-800">
//                         {profile.skills.slice(0, 4).join(" · ")}
//                         {profile.skills.length > 4 && (
//                           <span className="text-stone-400"> +{profile.skills.length - 4}</span>
//                         )}
//                       </span>
//                     </span>
//                   ) : (
//                     <span className="text-stone-400 italic">Skills · Not set</span>
//                   )}
//                 </div>
//               </div>

//               {/* Actions */}
//               <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
//                 <button
//                   type="button"
//                   onClick={() => slackAvatarMutation.mutate()}
//                   disabled={avatarBusy}
//                   className="inline-flex items-center gap-1 rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50"
//                 >
//                   <MessageSquare className="w-2.5 h-2.5" />
//                   Slack
//                 </button>

//                 {profile.avatarUrl && (
//                   <button
//                     type="button"
//                     onClick={() => deleteAvatarMutation.mutate()}
//                     disabled={avatarBusy}
//                     className="inline-flex items-center gap-1 rounded border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-stone-500 hover:text-rose-600 hover:border-rose-200 disabled:opacity-50"
//                   >
//                     <Trash2 className="w-2.5 h-2.5" />
//                     Remove
//                   </button>
//                 )}

//                 <button
//                   type="button"
//                   onClick={enterEditMode}
//                   className="inline-flex items-center gap-1 rounded border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700 hover:bg-teal-100"
//                 >
//                   <Pencil className="w-2.5 h-2.5" />
//                   Edit
//                 </button>

//                 {avatarError && (
//                   <span className="text-[10px] text-rose-600 font-medium">{avatarError}</span>
//                 )}
//               </div>
//             </div>
//           </div>

//           {/* Attendance */}
//           <div className="mt-2.5 pt-2 border-t border-stone-200/50">
//             <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">
//               Attendance
//             </p>
//             <div className="grid grid-cols-3 gap-1.5">
//               <div className="flex items-center justify-between gap-1.5 rounded-lg bg-white/80 border border-stone-200/50 px-2 py-1.5">
//                 <div className="flex items-center gap-1.5 min-w-0">
//                   <Home className="w-3.5 h-3.5 text-teal-600 shrink-0" />
//                   <p className="text-[10px] font-medium text-stone-500 truncate">WFH</p>
//                 </div>
//                 <p className="font-data text-xs font-bold text-stone-800 shrink-0">
//                   {leavesAndWfhStats.wfhRemaining}
//                 </p>
//               </div>

//               <div className="flex items-center justify-between gap-1.5 rounded-lg bg-white/80 border border-stone-200/50 px-2 py-1.5">
//                 <div className="flex items-center gap-1.5 min-w-0">
//                   <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
//                   <p className="text-[10px] font-medium text-stone-500 truncate">Paid</p>
//                 </div>
//                 <p className="font-data text-xs font-bold text-stone-800 shrink-0">
//                   {leavesAndWfhStats.paidRemaining}
//                 </p>
//               </div>

//               <div className="flex items-center justify-between gap-1.5 rounded-lg bg-white/80 border border-stone-200/50 px-2 py-1.5">
//                 <div className="flex items-center gap-1.5 min-w-0">
//                   <HeartPulse className="w-3.5 h-3.5 text-amber-600 shrink-0" />
//                   <p className="text-[10px] font-medium text-stone-500 truncate">Sick</p>
//                 </div>
//                 <p className="font-data text-xs font-bold text-stone-800 shrink-0">
//                   {leavesAndWfhStats.isInternOrContractor
//                     ? "—"
//                     : leavesAndWfhStats.casualRemaining}
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* ──────────── PERFORMANCE & ACHIEVEMENTS ──────────── */}
//         <div className="lg:col-span-7 bg-stone-50/80 rounded-xl border border-stone-200/60 p-2.5 sm:p-3 shadow-[0_1px_3px_rgba(28,25,23,0.04)] flex flex-col justify-between overflow-hidden">
//           <div>
//             <h2 className="font-display text-sm sm:text-base font-bold text-stone-800 mb-1.5 sm:mb-2">
//               Performance &amp; Recognition
//             </h2>
//             <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
//               <div className="bg-white/70 border border-stone-200/50 rounded-lg p-1.5 sm:p-2 text-center flex flex-col justify-between min-h-[70px] sm:min-h-0">
//                 <span className="text-[9px] sm:text-[10px] font-semibold text-stone-400 block truncate">
//                   1. Previous Day Rank
//                 </span>
//                 <span className="font-data text-lg sm:text-xl font-extrabold text-emerald-600 my-1">
//                   {dailyRank ? `#${dailyRank} ▲` : "–"}
//                 </span>
//               </div>
//               <div className="bg-white/70 border border-stone-200/50 rounded-lg p-1.5 sm:p-2 text-center flex flex-col justify-between min-h-[70px] sm:min-h-0">
//                 <span className="text-[9px] sm:text-[10px] font-semibold text-stone-400 block truncate">
//                   2. Weekly Rank
//                 </span>
//                 <span className="font-data text-lg sm:text-xl font-extrabold text-teal-700 my-1">
//                   {weeklyRank ? `#${weeklyRank}` : `${totalDailyHours}h`}
//                 </span>
//               </div>
//               <div className="bg-white/70 border border-stone-200/50 rounded-lg p-1.5 sm:p-2 text-center flex flex-col justify-between min-h-[70px] sm:min-h-0">
//                 <span className="text-[9px] sm:text-[10px] font-semibold text-stone-400 block truncate">
//                   3. Monthly Rank
//                 </span>
//                 <span className="font-data text-lg sm:text-xl font-extrabold text-stone-700 my-1">
//                   {monthlyRank
//                     ? `#${monthlyRank}`
//                     : `${activityStats.avgTeamHours}h`}
//                 </span>
//               </div>
//               <div className="bg-white/70 border border-stone-200/50 rounded-lg p-1.5 sm:p-2 text-center flex flex-col justify-between min-h-[70px] sm:min-h-0">
//                 <span className="text-[9px] sm:text-[10px] font-semibold text-stone-400 block truncate">
//                   4. Monthly Rating
//                 </span>
//                 <div className="flex items-center justify-center gap-0.5 font-data text-sm sm:text-base font-extrabold text-amber-600 my-1">
//                   <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
//                   <span>{latestRating || "4.4 / 5"}</span>
//                 </div>
//                 <span className="text-[8px] sm:text-[8.5px] text-stone-400 font-medium truncate">
//                   4 out of 5 stars
//                 </span>
//               </div>
//             </div>
//           </div>

//           <div className="pt-2 mt-2 border-t border-stone-200/40">
//             <div className="flex items-center justify-between mb-1.5">
//               <h3 className="font-display text-[10px] sm:text-[11px] font-bold text-stone-600 uppercase tracking-wider">
//                 Achievements
//               </h3>
//               <span className="text-[9px] sm:text-[10px] font-medium text-stone-400">
//                 {earnedBadgeCount} / {achievementBadges.length} earned
//               </span>
//             </div>
//             <div className="grid grid-cols-3 xs:grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
//               {achievementBadges.map((badge) => {
//                 const style = BADGE_STYLES[badge.id];
//                 return (
//                   <div
//                     key={badge.id}
//                     className="flex flex-col items-center text-center gap-0.5"
//                   >
//                     <div className="relative">
//                       <img
//                         src={style?.image}
//                         alt={badge.label}
//                         className={`w-8 h-8 sm:w-9 sm:h-9 object-contain transition-all ${
//                           badge.earned ? "badge-glow" : "grayscale opacity-50"
//                         }`}
//                       />
//                       {badge.earned ? (
//                         <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
//                           <Check className="w-2 h-2 text-white stroke-[3]" />
//                         </span>
//                       ) : (
//                         <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-stone-300 border-2 border-white flex items-center justify-center">
//                           <Lock className="w-2 h-2 text-white" />
//                         </span>
//                       )}
//                     </div>
//                     <h4
//                       className={`font-semibold text-[8.5px] sm:text-[9px] leading-tight truncate w-full ${
//                         badge.earned ? "text-stone-800" : "text-stone-400"
//                       }`}
//                     >
//                       {badge.label}
//                     </h4>
//                     <p className="text-[7px] sm:text-[7.5px] font-medium text-stone-400 truncate w-full">
//                       {badge.meta}
//                     </p>
//                   </div>
//                 );
//               })}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* ════════════════ MIDDLE SECTION ════════════════ */}
//       <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-2.5 items-stretch">
//         {/* Productivity Trend */}
//         <div className="lg:col-span-7 bg-stone-50/80 rounded-xl border border-stone-200/60 p-2.5 sm:p-3 shadow-[0_1px_3px_rgba(28,25,23,0.04)] flex flex-col overflow-hidden min-h-[280px] sm:min-h-[320px]">
//           <div className="flex items-start sm:items-center justify-between mb-2 pb-2 border-b border-stone-200/40 gap-2">
//             <div className="min-w-0">
//               <h3 className="font-display font-bold text-stone-800 text-xs sm:text-sm truncate">
//                 Productivity Trend &amp; Project Highlights
//               </h3>
//               <p className="text-[9px] sm:text-[10px] text-stone-400">
//                 {currentMonthLabel}
//               </p>
//             </div>
//             <div className="text-right shrink-0">
//               <span className="font-data text-base sm:text-lg font-extrabold text-teal-700">
//                 {totalDailyHours}h
//               </span>
//               <span className="text-[8px] sm:text-[9px] font-medium text-stone-400 block">
//                 Total Hours
//               </span>
//             </div>
//           </div>

//           <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-2">
//             <div className="rounded-lg bg-white/60 border border-stone-200/40 p-1.5 text-center">
//               <span className="text-[8px] sm:text-[8.5px] font-bold uppercase text-stone-400 block">
//                 Daily Avg
//               </span>
//               <span className="font-data text-xs sm:text-sm font-bold text-stone-800">
//                 {activityStats.avgHours}h
//               </span>
//             </div>
//             <div className="rounded-lg bg-white/60 border border-stone-200/40 p-1.5 text-center">
//               <span className="text-[8px] sm:text-[8.5px] font-bold uppercase text-stone-400 block">
//                 Active Days
//               </span>
//               <span className="font-data text-xs sm:text-sm font-bold text-stone-800">
//                 {activityStats.activeDays}
//               </span>
//             </div>
//             <div className="rounded-lg bg-white/60 border border-stone-200/40 p-1.5 text-center">
//               <span className="text-[8px] sm:text-[8.5px] font-bold uppercase text-stone-400 block">
//                 Vs Team Avg
//               </span>
//               <span
//                 className={`font-data text-xs sm:text-sm font-bold ${
//                   activityStats.deltaPct >= 0
//                     ? "text-emerald-600"
//                     : "text-rose-500"
//                 }`}
//               >
//                 {activityStats.deltaPct >= 0 ? "+" : ""}
//                 {activityStats.deltaPct}%
//               </span>
//             </div>
//           </div>

//           <div className="flex-1 min-h-[120px] sm:min-h-[140px]">
//             {dailyData.length === 0 ? (
//               <div className="h-full flex items-center justify-center text-xs text-stone-400 bg-white/50 rounded-lg border border-stone-200/40">
//                 No activity recorded yet this month
//               </div>
//             ) : (
//               <div className="relative border border-stone-200/40 rounded-lg bg-white/40 p-1 h-full">
//                 <div className="flex h-full">
//                   <div className="flex flex-col justify-between h-full pr-1.5 text-[8px] text-stone-400 shrink-0 font-data">
//                     {[
//                       chartMax,
//                       chartMax * 0.75,
//                       chartMax * 0.5,
//                       chartMax * 0.25,
//                       0,
//                     ].map((n, i) => (
//                       <span key={i}>{Math.round(n)}h</span>
//                     ))}
//                   </div>
//                   <div className="relative flex-1">
//                     <svg
//                       ref={svgRef}
//                       viewBox={`0 0 ${CHART_W} ${CHART_H}`}
//                       preserveAspectRatio="none"
//                       className="w-full h-full cursor-crosshair"
//                       onMouseMove={handleChartMouseMove}
//                       onMouseLeave={handleChartMouseLeave}
//                     >
//                       <defs>
//                         <linearGradient
//                           id="employeeFillSoft"
//                           x1="0"
//                           y1="0"
//                           x2="0"
//                           y2="1"
//                         >
//                           <stop
//                             offset="0%"
//                             stopColor="#0D9488"
//                             stopOpacity="0.12"
//                           />
//                           <stop
//                             offset="100%"
//                             stopColor="#0D9488"
//                             stopOpacity="0"
//                           />
//                         </linearGradient>
//                       </defs>
//                       {[0, 1, 2, 3, 4].map((i) => (
//                         <line
//                           key={i}
//                           x1="0"
//                           x2={CHART_W}
//                           y1={(CHART_H / 4) * i}
//                           y2={(CHART_H / 4) * i}
//                           stroke="#E7E5E4"
//                           strokeWidth="1"
//                         />
//                       ))}
//                       {hoverPoint && (
//                         <line
//                           x1={hoverPoint.x}
//                           x2={hoverPoint.x}
//                           y1="0"
//                           y2={CHART_H}
//                           stroke="#D6D3D1"
//                           strokeWidth="1"
//                           strokeDasharray="2 3"
//                         />
//                       )}
//                       <polygon
//                         points={chartGeometry.areaFill}
//                         fill="url(#employeeFillSoft)"
//                       />
//                       <polyline
//                         points={chartGeometry.teamLine}
//                         fill="none"
//                         stroke="#A8A29E"
//                         strokeWidth="1.25"
//                         strokeDasharray="3 3"
//                         strokeOpacity="0.7"
//                       />
//                       <polyline
//                         points={chartGeometry.empLine}
//                         fill="none"
//                         stroke="#0F766E"
//                         strokeWidth="2"
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                       />
//                       {hoverPoint && (
//                         <>
//                           <circle
//                             cx={hoverPoint.x}
//                             cy={hoverPoint.yTeam}
//                             r="2.5"
//                             fill="#A8A29E"
//                             stroke="white"
//                             strokeWidth="1"
//                           />
//                           <circle
//                             cx={hoverPoint.x}
//                             cy={hoverPoint.yEmp}
//                             r="3.5"
//                             fill="#0F766E"
//                             stroke="white"
//                             strokeWidth="1.5"
//                           />
//                         </>
//                       )}
//                     </svg>
//                     {hoverPoint && (
//                       <div
//                         className="absolute -top-1 bg-white/95 backdrop-blur-sm text-stone-700 text-[9px] rounded-md px-2 py-1 pointer-events-none shadow-sm border border-stone-200/70 whitespace-nowrap z-10 font-data"
//                         style={{
//                           left: `${(hoverPoint.x / CHART_W) * 100}%`,
//                           transform:
//                             hoverPoint.x / CHART_W > 0.85
//                               ? "translate(-100%, -100%)"
//                               : hoverPoint.x / CHART_W < 0.15
//                               ? "translate(0%, -100%)"
//                               : "translate(-50%, -100%)",
//                         }}
//                       >
//                         <p className="font-display font-medium text-stone-500 mb-0.5">
//                           {format(parseISO(hoverPoint.date), "EEE, d MMM")}
//                         </p>
//                         <p className="text-stone-800">
//                           You:{" "}
//                           <span className="font-semibold">
//                             {hoverPoint.employee_hours}h
//                           </span>
//                         </p>
//                         <p className="text-stone-400">
//                           Team: {hoverPoint.team_avg_hours}h
//                         </p>
//                       </div>
//                     )}
//                     <div className="flex justify-between mt-0.5 text-[7.5px] text-stone-400 font-medium font-data">
//                       {chartGeometry.points.map((p, i) => {
//                         const showLabel =
//                           i === 0 ||
//                           i === chartGeometry.points.length - 1 ||
//                           i %
//                             Math.ceil(chartGeometry.points.length / 5) ===
//                             0;
//                         return (
//                           <span
//                             key={i}
//                             style={{
//                               visibility: showLabel ? "visible" : "hidden",
//                             }}
//                           >
//                             {format(parseISO(p.date), "d")}
//                           </span>
//                         );
//                       })}
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Project Status */}
//         <div className="lg:col-span-5 bg-stone-50/80 rounded-xl border border-stone-200/60 p-2.5 sm:p-3 shadow-[0_1px_3px_rgba(28,25,23,0.04)] flex flex-col justify-between overflow-hidden">
//           <div>
//             <div className="flex items-center justify-between mb-2 pb-2 border-b border-stone-200/40 gap-2">
//               <div className="flex items-center gap-1.5 min-w-0">
//                 <FolderKanban className="w-4 h-4 text-teal-600 shrink-0" />
//                 <h3 className="font-display font-bold text-stone-800 text-xs sm:text-sm truncate">
//                   Project Status
//                 </h3>
//               </div>
//               <button
//                 onClick={() => setShowLogsModal(true)}
//                 className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-teal-700 hover:text-teal-800 bg-teal-50/80 hover:bg-teal-50 border border-teal-100/80 px-2 py-1 rounded-md transition-colors cursor-pointer shrink-0"
//               >
//                 <History className="w-3 h-3" />
//                 <span className="hidden xs:inline">View Logs</span>
//                 <span className="xs:hidden">Logs</span>
//               </button>
//             </div>

//             <div className="block sm:hidden space-y-2">
//               {allEmployeeProjects.length === 0 ? (
//                 <p className="py-6 text-center text-stone-400 italic text-xs">
//                   No projects assigned currently.
//                 </p>
//               ) : (
//                 allEmployeeProjects.slice(0, 4).map((proj) => (
//                   <div
//                     key={proj.id}
//                     className="p-2 rounded-lg border border-stone-200/50 bg-white/60 flex items-center gap-2"
//                   >
//                     <span className="w-7 h-7 rounded-md bg-teal-50 text-teal-700 flex items-center justify-center font-extrabold text-[10px] shrink-0">
//                       {proj.symbol}
//                     </span>
//                     <div className="flex-1 min-w-0">
//                       <p className="font-bold text-stone-800 text-xs truncate">
//                         {proj.name}
//                       </p>
//                       <p className="text-[10px] text-stone-500 truncate">
//                         {proj.role}
//                       </p>
//                       <p className="text-[9px] text-stone-400 font-data mt-0.5">
//                         {proj.startDate}
//                       </p>
//                     </div>
//                     <span
//                       className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md shrink-0 ${
//                         proj.status === "active"
//                           ? "bg-teal-700 text-white"
//                           : "bg-stone-200 text-stone-600"
//                       }`}
//                     >
//                       {proj.status === "active" ? "Active" : "Done"}
//                     </span>
//                   </div>
//                 ))
//               )}
//             </div>

//             <div className="hidden sm:block overflow-x-auto">
//               <table className="w-full text-left text-xs">
//                 <thead>
//                   <tr className="bg-teal-50/50 text-teal-800 rounded-md text-[9.5px] font-bold tracking-wider uppercase">
//                     <th className="py-1.5 px-2 rounded-l-md">Project Name</th>
//                     <th className="py-1.5 px-2">Role</th>
//                     <th className="py-1.5 px-2">Active Since</th>
//                     <th className="py-1.5 px-2 text-right rounded-r-md">
//                       Status
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-stone-100">
//                   {allEmployeeProjects.length === 0 ? (
//                     <tr>
//                       <td
//                         colSpan={4}
//                         className="py-5 text-center text-stone-400 italic"
//                       >
//                         No projects assigned currently.
//                       </td>
//                     </tr>
//                   ) : (
//                     allEmployeeProjects.slice(0, 4).map((proj) => (
//                       <tr
//                         key={proj.id}
//                         className="hover:bg-white/50 transition-colors"
//                       >
//                         <td className="py-1.5 px-2 font-bold text-stone-800">
//                           <div className="flex items-center gap-1.5 min-w-0">
//                             <span className="w-5 h-5 rounded bg-teal-50 text-teal-700 flex items-center justify-center font-extrabold text-[9px] shrink-0">
//                               {proj.symbol}
//                             </span>
//                             <span className="truncate max-w-[110px]">
//                               {proj.name}
//                             </span>
//                           </div>
//                         </td>
//                         <td className="py-1.5 px-2 text-stone-600 truncate max-w-[100px]">
//                           {proj.role}
//                         </td>
//                         <td className="py-1.5 px-2 font-data text-stone-500">
//                           {proj.startDate}
//                         </td>
//                         <td className="py-1.5 px-2 text-right">
//                           <span
//                             className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md ${
//                               proj.status === "active"
//                                 ? "bg-teal-700 text-white"
//                                 : "bg-stone-200 text-stone-600"
//                             }`}
//                           >
//                             {proj.status === "active"
//                               ? "Active"
//                               : "Completed"}
//                           </span>
//                         </td>
//                       </tr>
//                     ))
//                   )}
//                 </tbody>
//               </table>
//             </div>
//           </div>

//           <div className="pt-2 mt-2 border-t border-stone-200/40 flex items-center justify-between text-[10px] sm:text-[11px] text-stone-400">
//             <span>Showing active allocations</span>
//             <span>
//               Total assigned:{" "}
//               <strong className="text-stone-700 font-data">
//                 {allEmployeeProjects.length}
//               </strong>
//             </span>
//           </div>
//         </div>
//       </div>

//       {/* ════════════════ BOTTOM SECTION ════════════════ */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
        
//         {/* 1. Manager Feedback */}
//         <div className="bg-stone-50/80 rounded-xl border border-stone-200/60 p-2.5 shadow-[0_1px_3px_rgba(28,25,23,0.04)] flex flex-col">
//           <div className="flex items-center gap-1.5 mb-2">
//             <MessageSquare className="w-3.5 h-3.5 text-teal-600 shrink-0" />
//             <h3 className="font-display text-[11px] font-bold text-stone-700 uppercase tracking-wider">
//               Manager Feedback
//             </h3>
//           </div>

//           {latestPmReview ? (
//             <div className="flex-1">
//               {latestRating && (
//                 <div className="flex items-center gap-1 mb-1.5">
//                   <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
//                   <span className="text-[11px] font-bold text-amber-700">
//                     {latestRating} / 5
//                   </span>
//                 </div>
//               )}
//               <p className="text-[10px] text-stone-400 mb-1">
//                 {latestPmReview.period}
//               </p>
//               <p className="text-xs text-stone-700 leading-relaxed line-clamp-4">
//                 {latestPmReview.overall_comment || "No detailed comments."}
//               </p>
//             </div>
//           ) : (
//             <p className="text-xs text-stone-400 italic flex-1">
//               No feedback recorded yet.
//             </p>
//           )}
//         </div>

//         {/* 2. Complaints */}
//         <div className="bg-stone-50/80 rounded-xl border border-stone-200/60 p-2.5 shadow-[0_1px_3px_rgba(28,25,23,0.04)] flex flex-col">
//           <div className="flex items-center justify-between mb-2">
//             <div className="flex items-center gap-1.5">
//               <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
//               <h3 className="font-display text-[11px] font-bold text-stone-700 uppercase tracking-wider">
//                 Complaints
//               </h3>
//             </div>
//             <span
//               className={`font-data text-sm font-bold ${
//                 complaintsCount > 0 ? "text-rose-600" : "text-stone-700"
//               }`}
//             >
//               {complaintsCount}
//             </span>
//           </div>

//           <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[110px]">
//             {complaintsList.length > 0 ? (
//               complaintsList.slice(0, 3).map((item, idx) => (
//                 <p key={idx} className="text-[11px] text-stone-600 leading-snug">
//                   • {typeof item === "string" ? item : item.message || item.reason || "Complaint recorded"}
//                 </p>
//               ))
//             ) : (
//               <p className="text-xs text-stone-400 italic">
//                 No complaints filed.
//               </p>
//             )}
//           </div>
//         </div>

//         {/* 3. Warnings */}
//         <div className="bg-stone-50/80 rounded-xl border border-stone-200/60 p-2.5 shadow-[0_1px_3px_rgba(28,25,23,0.04)] flex flex-col">
//           <div className="flex items-center justify-between mb-2">
//             <div className="flex items-center gap-1.5">
//               <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
//               <h3 className="font-display text-[11px] font-bold text-stone-700 uppercase tracking-wider">
//                 Warnings
//               </h3>
//             </div>
//             <span
//               className={`font-data text-sm font-bold ${
//                 warningsCount > 0 ? "text-amber-600" : "text-stone-700"
//               }`}
//             >
//               {warningsCount}
//             </span>
//           </div>

//           <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[110px]">
//             {warningsList.length > 0 ? (
//               warningsList.slice(0, 3).map((item, idx) => (
//                 <p key={idx} className="text-[11px] text-stone-600 leading-snug">
//                   • {typeof item === "string" ? item : item.message || item.reason || "Warning issued"}
//                 </p>
//               ))
//             ) : (
//               <p className="text-xs text-stone-400 italic">
//                 No warnings issued.
//               </p>
//             )}
//           </div>
//         </div>

//         {/* 4. Recognition */}
//         <div className="bg-stone-50/80 rounded-xl border border-stone-200/60 p-2.5 shadow-[0_1px_3px_rgba(28,25,23,0.04)] flex flex-col">
//           <div className="flex items-center justify-between mb-2">
//             <div className="flex items-center gap-1.5">
//               <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
//               <h3 className="font-display text-[11px] font-bold text-stone-700 uppercase tracking-wider">
//                 Recognition
//               </h3>
//             </div>
//             <span className="font-data text-sm font-bold text-stone-700">
//               {recognitionsList.length}
//             </span>
//           </div>

//           <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[110px]">
//             {recognitionsList.length > 0 ? (
//               recognitionsList.slice(0, 3).map((item, idx) => (
//                 <p key={idx} className="text-[11px] text-stone-600 leading-snug">
//                   • {typeof item === "string" ? item : item.message || item.note || "Recognition received"}
//                 </p>
//               ))
//             ) : (
//               <p className="text-xs text-stone-400 italic">
//                 No recognition messages yet.
//               </p>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* ════════════════ PROJECT LOGS MODAL ════════════════ */}
//       {showLogsModal && (
//         <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
//           <div className="bg-stone-50 border border-stone-200 rounded-t-xl sm:rounded-xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]">
//             <div className="px-3 py-2.5 border-b border-stone-200/60 flex items-center justify-between bg-teal-50/40">
//               <div className="flex items-center gap-2 min-w-0">
//                 <div className="w-8 h-8 rounded-md bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
//                   <History className="w-4 h-4" />
//                 </div>
//                 <div className="min-w-0">
//                   <h3 className="font-display text-sm font-bold text-stone-800 truncate">
//                     All Project Logs
//                   </h3>
//                   <p className="text-[10px] sm:text-[11px] text-stone-400 truncate">
//                     Complete historical list of all assigned projects
//                   </p>
//                 </div>
//               </div>
//               <button
//                 onClick={() => setShowLogsModal(false)}
//                 className="w-8 h-8 rounded-md text-stone-400 hover:text-stone-600 hover:bg-stone-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
//               >
//                 <X className="w-4 h-4" />
//               </button>
//             </div>

//             <div className="p-3 overflow-y-auto log-scroll space-y-2.5 flex-1">
//               {allEmployeeProjects.length === 0 ? (
//                 <p className="text-xs text-stone-400 italic text-center py-8">
//                   No project logs available.
//                 </p>
//               ) : (
//                 allEmployeeProjects.map((item) => {
//                   const isActive = item.status === "active";
//                   return (
//                     <div
//                       key={item.id}
//                       className={`p-2.5 rounded-lg border transition-all ${
//                         isActive
//                           ? "bg-teal-50/50 border-teal-100"
//                           : "bg-white/60 border-stone-200/50"
//                       }`}
//                     >
//                       <div className="flex items-start sm:items-center justify-between gap-2 mb-1">
//                         <div className="flex items-center gap-1.5 min-w-0">
//                           <span
//                             className={`px-2 py-0.5 text-[8px] sm:text-[8.5px] font-bold uppercase rounded-md shrink-0 ${
//                               isActive
//                                 ? "bg-teal-700 text-white"
//                                 : "bg-stone-200 text-stone-600"
//                             }`}
//                           >
//                             {isActive ? "Active" : "Completed"}
//                           </span>
//                           <h4 className="font-bold text-stone-800 text-xs sm:text-sm truncate">
//                             {item.name}
//                           </h4>
//                         </div>
//                         <span className="text-[9px] sm:text-[10px] text-stone-400 font-data font-medium shrink-0">
//                           {item.startDate} — {item.endDate}
//                         </span>
//                       </div>
//                       <div className="flex items-center justify-between text-xs text-stone-500 mt-1">
//                         <span>
//                           Role:{" "}
//                           <strong className="text-stone-700">
//                             {item.role}
//                           </strong>
//                         </span>
//                       </div>
//                     </div>
//                   );
//                 })
//               )}
//             </div>

//             <div className="px-3 py-3 border-t border-stone-200/50 bg-white/50 flex items-center justify-between text-xs text-stone-400">
//               <span>Showing {allEmployeeProjects.length} total entries</span>
//               <button
//                 onClick={() => setShowLogsModal(false)}
//                 className="px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white font-medium rounded-md text-xs transition-colors cursor-pointer"
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ════════════ EDIT PROFILE MODAL ════════════ */}
//       {isEditing && (
//         <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/40 backdrop-blur-xs">
//           <div className="bg-white border border-stone-200 rounded-t-xl sm:rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
//             {/* Header */}
//             <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between bg-teal-50/40">
//               <h3 className="font-display text-sm font-bold text-stone-800">
//                 Edit Profile Information
//               </h3>
//               <button
//                 onClick={cancelEdit}
//                 className="w-8 h-8 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 flex items-center justify-center"
//               >
//                 <X className="w-4 h-4" />
//               </button>
//             </div>

//             {/* Body */}
//             <div className="p-4 space-y-4 overflow-y-auto">
              
//               {/* Login Email */}
//               <div>
//                 <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
//                   Login Email
//                 </label>
//                 <input
//                   type="email"
//                   value={editEmail}
//                   onChange={(e) => setEditEmail(e.target.value)}
//                   placeholder={`you@${COMPANY_DOMAIN}`}
//                   className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
//                 />
//                 <p className="mt-1 text-[10px] text-stone-400">
//                   Must end with @{COMPANY_DOMAIN}
//                 </p>
//                 {emailError && (
//                   <p className="mt-1 text-[11px] font-medium text-rose-600">
//                     {emailError}
//                   </p>
//                 )}
//               </div>

//               {/* Phone */}
//               <div>
//                 <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
//                   Phone Number
//                 </label>
//                 <input
//                   type="text"
//                   value={editPhone}
//                   onChange={(e) => setEditPhone(e.target.value)}
//                   placeholder="+91 XXXXX XXXXX"
//                   className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
//                 />
//               </div>

//               {/* Encord ID */}
//               <div>
//                 <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
//                   Encord ID
//                 </label>
//                 <input
//                   type="text"
//                   value={editEncordId}
//                   onChange={(e) => setEditEncordId(e.target.value)}
//                   placeholder="john.encord@example.com"
//                   className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
//                 />
//               </div>

//               {/* Slack ID */}
//               <div>
//                 <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
//                   Slack Member ID
//                 </label>
//                 <input
//                   type="text"
//                   value={editSlackId}
//                   onChange={(e) => setEditSlackId(e.target.value)}
//                   placeholder="U0123ABC456"
//                   className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
//                 />
//               </div>

//               {/* Skills Multi-Select */}
//               <div>
//                 <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5 block">
//                   Skills & Competencies
//                 </label>
//                 <SkillsMultiSelect
//                   selected={editSkills}
//                   onChange={setEditSkills}
//                   options={skillsList}
//                   isLoading={skillsLoading}
//                 />
//               </div>

//               {saveError && (
//                 <p className="text-xs font-medium text-rose-600">{saveError}</p>
//               )}
//             </div>

//             {/* Footer */}
//             <div className="px-4 py-3 border-t border-stone-100 bg-stone-50/60 flex items-center justify-end gap-2">
//               <button
//                 onClick={cancelEdit}
//                 className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-100"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={handleSave}
//                 disabled={saveMutation.isPending || changeEmailMutation.isPending}
//                 className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 disabled:opacity-60"
//               >
//                 {saveMutation.isPending || changeEmailMutation.isPending ? (
//                   <Loader2 className="w-3.5 h-3.5 animate-spin" />
//                 ) : (
//                   <Save className="w-3.5 h-3.5" />
//                 )}
//                 Save Changes
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default EmployeeDashboard;


import React from 'react';
import { 
  Wrench, 
  Clock, 
  LayoutDashboard, 
  User, 
  Calendar, 
  FileText, 
  Settings, 
  LogOut,
  Bell,
  Search
} from 'lucide-react';

const EmployeeDashboardInProgress = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      {/* Sidebar - Grayed out to indicate inactive/in-progress state */}
     

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header - Grayed out */}


        {/* In Progress State Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col items-center justify-center relative">
          
          {/* Decorative background blur */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-full max-h-96 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-full blur-3xl opacity-60 -z-10 pointer-events-none"></div>

          <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center">
            
            {/* Animated Icon Container */}
            <div className="relative mb-8 group">
              <div className="absolute inset-0 bg-indigo-100 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
              <div className="relative w-24 h-24 bg-white rounded-2xl shadow-xl shadow-indigo-100/50 border border-indigo-50 flex items-center justify-center overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-indigo-100 to-transparent opacity-50 rounded-bl-3xl"></div>
                
                {/* Wrench with a slight pulse animation */}
                <Wrench 
                  size={40} 
                  className="text-indigo-600 animate-[pulse_3s_ease-in-out_infinite]" 
                  strokeWidth={1.5}
                />
              </div>
              
              {/* Floating Clock badge */}
              <div className="absolute -top-3 -right-3 w-10 h-10 bg-white rounded-full shadow-lg border border-slate-50 flex items-center justify-center animate-[bounce_2s_infinite]">
                <Clock size={18} className="text-amber-500" />
              </div>
            </div>

            {/* Typography */}
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                <span>Development in Progress</span>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
                Building Your New <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                  Employee Dashboard
                </span>
              </h1>
              
              <p className="text-slate-500 max-w-lg mx-auto text-base md:text-lg leading-relaxed">
                We're currently crafting a powerful new experience to help you manage your work, track your progress, and stay connected with the team. 
              </p>
            </div>

            {/* Status indicators */}
          

            
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmployeeDashboardInProgress;

