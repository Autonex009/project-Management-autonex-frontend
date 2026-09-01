import React, { useMemo, useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";

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
  employeeNotesApi,
  badgesApi,
} from "../../services/api";
import EncordSyncWidget from "../../components/dashboard/EncordSyncWidget";

import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  ChevronLeft,
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
  Plus,
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
import weeklyTop1Badge from "../../components/badges/weekly_1.png";
import weeklyTop2Badge from "../../components/badges/weekly_2.png";
import weeklyTop3Badge from "../../components/badges/weekly_3.png";
import monthlyTop1Badge from "../../components/badges/monthly_1.png";
import monthlyTop2Badge from "../../components/badges/monthly_2.png";
import monthlyTop3Badge from "../../components/badges/monthly_3.png";
import threeMonthsBadge from "../../components/badges/3months.png";
import sixMonthsBadge from "../../components/badges/6months.png";
import yearlyBadge from "../../components/badges/yearly.png";

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
    return `${years > 0 ? `${years} Year${years > 1 ? "s" : ""} ` : ""}${months} Month${months !== 1 ? "s" : ""
      }`;
  } catch {
    return "3 Years 5 Months";
  }
}

/* ── Achievement badge visual config ── */
const BADGE_CONFIG = {
  hrs_50_week: {
    label: "50 Hours",
    meta: "Weekly",
    image: fiftyHoursBadge,
  },
  hrs_200_month: {
    label: "200 Hours",
    meta: "Monthly",
    image: twoHundredHoursBadge,
  },
  weekly_top: {
    label: "Weekly Top",
    meta: "Performer",
    image: weeklyTop1Badge,
  },
  monthly_top: {
    label: "Monthly Top",
    meta: "Performer",
    image: monthlyTop1Badge,
  },
  weekly_top_1: {
    label: "Weekly Top",
    meta: "Performer",
    image: weeklyTop1Badge,
  },
  weekly_top_2: {
    label: "Weekly Top",
    meta: "Performer",
    image: weeklyTop2Badge,
  },
  weekly_top_3: {
    label: "Weekly Top",
    meta: "Performer",
    image: weeklyTop3Badge,
  },
  monthly_top_1: {
    label: "Monthly Top",
    meta: "Performer",
    image: monthlyTop1Badge,
  },
  monthly_top_2: {
    label: "Monthly Top",
    meta: "Performer",
    image: monthlyTop2Badge,
  },
  monthly_top_3: {
    label: "Monthly Top",
    meta: "Performer",
    image: monthlyTop3Badge,
  },
  tenure: {
    label: "Tenure",
    meta: "Completed",
    image: threeMonthsBadge,
  },
  yearly_milestone: {
    label: "Yearly",
    meta: "Milestone",
    image: yearlyBadge,
  },
};

const DISPLAY_SLOTS = [
  "hrs_50_week",
  "hrs_200_month",
  "weekly_top",
  "monthly_top",
  "tenure",
  "yearly_milestone",
];

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
            className="inline-flex items-center gap-1 rounded-md border border-teal-200 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-teal-800"
          >
            {skill}
            <button
              type="button"
              onClick={() => toggle(skill)}
              className="rounded text-indigo-600 hover:bg-teal-200 hover:text-teal-900"
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
          className={`h-3.5 w-3.5 text-stone-400 transition-transform ${open ? "rotate-180" : ""
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
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${isSelected
                      ? "bg-indigo-50 font-semibold text-teal-800"
                      : "hover:bg-stone-50 text-stone-700"
                    }`}
                >
                  <div
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${isSelected
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

const formatPhoneNumber = (phone) => {
  if (!phone) return "";
  const str = String(phone).trim();
  if (!str) return "";

  if (str.startsWith("+91") || str.startsWith("+ 91")) {
    return str;
  }

  const cleanDigits = str.replace(/\D/g, "");
  if (cleanDigits.length === 12 && cleanDigits.startsWith("91")) {
    return `+91 ${cleanDigits.slice(2)}`;
  }

  if (cleanDigits.length === 10) {
    return `+91 ${cleanDigits}`;
  }

  if (str.startsWith("91")) {
    return `+${str}`;
  }

  return `+91 ${str}`;
};

const EmployeeDashboard = () => {
  const queryClient = useQueryClient();
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [showFullFeedback, setShowFullFeedback] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showBadgeLogsModal, setShowBadgeLogsModal] = useState(false);
  const [editEmail, setEditEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [profileTab, setProfileTab] = useState("attendance");
  const [bottomTab, setBottomTab] = useState("notes");
  const [notesModal, setNotesModal] = useState({ isOpen: false, type: null, title: "", data: [] });
  const [attendanceModalTab, setAttendanceModalTab] = useState(null);
  const [modalSelectedMonth, setModalSelectedMonth] = useState(new Date());
  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const [addNoteModal, setAddNoteModal] = useState({ isOpen: false, type: null });
  const [noteForm, setNoteForm] = useState({
    title: "",
    content: "",
    severity: "medium",
  });
  const [noteFormError, setNoteFormError] = useState("");

  const handleOpenAttendanceModal = (tabKey) => {
    setModalSelectedMonth(new Date());
    setAttendanceModalTab(tabKey);
  };

  const localUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = localStorage.getItem("role") || localUser.role || "employee";
  const isAdmin = userRole === "admin";
  const isAdminOrHr = userRole === "admin" || userRole === "hr";
  const employeeId = params.id || localUser.employee_id || localUser.id || 1;
  const isSelf = !params.id || String(params.id) === String(localUser.employee_id || localUser.id);
  const isPortalView = location.pathname.startsWith("/admin") || location.pathname.startsWith("/pm");
  const showBackButton = isPortalView && (!!params.id || !isSelf);

  // Scroll to top on navigation / employee ID change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.scrollTop = 0;
    }
  }, [employeeId, params.id]);

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
    queryFn: () => subProjectApi.getAll(),
  });

  const loggedInEmpId = Number(localUser.employee_id || localUser.id || account?.employee_id);

  const isManagerOfEmployee = useMemo(() => {
    if (!loggedInEmpId) return false;
    if (userRole !== "pm" && userRole !== "team_lead") return false;
    return allocations.some((alloc) => {
      const proj = projects.find((p) => p.id === alloc.sub_project_id);
      if (!proj) return false;
      const managerIds = Array.isArray(proj.assigned_employee_ids)
        ? proj.assigned_employee_ids.map(Number)
        : [];
      return managerIds.includes(loggedInEmpId);
    });
  }, [allocations, projects, userRole, loggedInEmpId]);

  const canViewNotes = isAdminOrHr || isSelf || isManagerOfEmployee;
  const canManageNotes = isAdminOrHr || isManagerOfEmployee;

  useEffect(() => {
    if (!canViewNotes && bottomTab === "notes") {
      setBottomTab("performance");
    }
  }, [canViewNotes, bottomTab]);

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

  const modalMonthYear = useMemo(() => {
    return { year: modalSelectedMonth.getFullYear(), month: modalSelectedMonth.getMonth() };
  }, [modalSelectedMonth]);

  const modalWfhList = useMemo(() => {
    const { year, month } = modalMonthYear;
    return myWfh.filter((wfh) => {
      if (!wfh.wfh_date) return false;
      const start = new Date(`${wfh.wfh_date}T00:00:00`);
      const end = wfh.end_date ? new Date(`${wfh.end_date}T00:00:00`) : start;
      const mStart = new Date(year, month, 1);
      const mEnd = new Date(year, month + 1, 0, 23, 59, 59);
      return start <= mEnd && end >= mStart;
    });
  }, [myWfh, modalMonthYear]);

  const modalLeavesList = useMemo(() => {
    const { year, month } = modalMonthYear;
    return allLeaves.filter((leave) => {
      if (!leave.start_date) return false;
      const start = new Date(`${leave.start_date}T00:00:00`);
      const end = leave.end_date ? new Date(`${leave.end_date}T00:00:00`) : start;
      const mStart = new Date(year, month, 1);
      const mEnd = new Date(year, month + 1, 0, 23, 59, 59);
      return start <= mEnd && end >= mStart;
    });
  }, [allLeaves, modalMonthYear]);

  const { data: perfReviewsData } = useQuery({
    queryKey: ["employee-perf-reviews", employeeId],
    queryFn: () => perfEvalApi.getAll({ employee_id: employeeId }),
    enabled: !!employeeId,
  });
  const perfReviews = perfReviewsData?.items || [];

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
    queryFn: () => skillsApi.getAll(),
  });

  /* ── Employee Notes (complaints / warnings / recognitions) ── */
  const { data: employeeNotes = [], isLoading: notesLoading } = useQuery({
    queryKey: ["employee-notes", employeeId],
    queryFn: () => employeeNotesApi.getByEmployee(employeeId),
    enabled: !!employeeId && canViewNotes,
  });

  const { data: employeeBadges = [] } = useQuery({
    queryKey: ["employee-badges", employeeId],
    queryFn: async () => {
      const res = await badgesApi.getByEmployee(employeeId, { status: "active" });
      const payload = res?.data !== undefined ? res.data : res;
      return Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.items)
            ? payload.items
            : [];
    },
    enabled: !!employeeId,
  });

  const { data: badgeLogs = [], isLoading: badgeLogsLoading } = useQuery({
    queryKey: ["employee-badge-logs", employeeId],
    queryFn: async () => {
      const res = await badgesApi.getLogs(employeeId);
      const payload = res?.data !== undefined ? res.data : res;
      return Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.items)
            ? payload.items
            : [];
    },
    enabled: !!employeeId && showBadgeLogsModal,
  });

  const createNoteMutation = useMutation({
    mutationFn: (payload) => employeeNotesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-notes", employeeId] });
      setAddNoteModal({ isOpen: false, type: null });
      setNoteForm({ title: "", content: "", severity: "medium" });
    },
    onError: (err) => {
      setNoteFormError(err?.response?.data?.detail || "Failed to create note.");
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId) => employeeNotesApi.delete(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-notes", employeeId] });
    },
    onError: (err) => {
      console.error(err?.response?.data?.detail || "Failed to delete note.");
    },
  });

  const resolveNoteMutation = useMutation({
    mutationFn: ({ id, resolution_note }) =>
      employeeNotesApi.resolve(id, { resolution_note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-notes", employeeId] });
    },
    onError: (err) => {
      console.error(err?.response?.data?.detail || "Failed to resolve note.");
    },
  });

  const getEmployeeRank = (leaderboard) => {
    if (!leaderboard?.leaderboard || !loggedInEncordId) return null;
    const ranked = [...(leaderboard.leaderboard || [])].sort(
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
    const avatarUrl =
      employee?.avatar_url || account?.avatar_url || localUser.avatar_url || null;
    const rawJoiningDate = employee?.joining_date || employee?.created_at;
    const joiningDate = rawJoiningDate
      ? format(parseISO(rawJoiningDate), "dd MMM yyyy")
      : "";
    const tenure = calculateTenure(rawJoiningDate);
    const badge = employee?.employee_type || localUser.employee_type || "";
    const initials = getNameInitials(name);

    const email = employee?.email || account?.email || localUser.email || "";
    const rawPhone = employee?.phone || account?.phone || "";
    const phone = formatPhoneNumber(rawPhone);
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
    setEditEmail(profile.email || "");
    setEditPhone(profile.phone || "");
    setEditSkills([...(profile.skills || [])]);
    setEditSlackId(profile.slackUserId || "");
    setEditEncordId(profile.encordId || "");
    setSaveError("");
    setEmailError("");
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setSaveError("");
    setEmailError("");
  };



  const saveMutation = useMutation({
    mutationFn: (data) => employeeApi.update(employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["employee-profile", employeeId],
      });
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
    },
    onError: (err) => {
      setSaveError(err?.response?.data?.detail || "Failed to save changes.");
    },
  });

  const requestEmailChangeMutation = useMutation({
    mutationFn: (newEmail) => employeeApi.requestEmailChange(employeeId, { new_email: newEmail }),
    onError: (err) => {
      setEmailError(err?.response?.data?.detail || "Could not send OTP.");
    },
  });

  const COMPANY_DOMAIN = "autonexai360.com";

  const handleSave = async () => {
    setSaveError("");
    setEmailError("");
    
    const trimmedEmail = editEmail.trim().toLowerCase();
    const originalEmail = (profile.email || "").trim().toLowerCase();
    const emailChanged = !!trimmedEmail && trimmedEmail !== originalEmail;
    
    if (emailChanged) {
      if (!trimmedEmail.endsWith(`@${COMPANY_DOMAIN}`) || trimmedEmail.split("@")[0].length === 0) {
        setEmailError(`Email must be a valid @${COMPANY_DOMAIN} address.`);
        return; 
      }
    }
      
    try {
      const promises = [];
      
      promises.push(
        saveMutation.mutateAsync({
          phone: editPhone || null,
          skills: editSkills,
          slack_user_id: editSlackId || null,
          encord_id: editEncordId || null,
        })
      );

      if (emailChanged) {
        promises.push(requestEmailChangeMutation.mutateAsync(trimmedEmail));
      }

      await Promise.all(promises);
      setIsEditing(false);
    } catch (err) {
      // Errors are caught and set by the mutation onError handlers
    }
  };

  /* ── Avatar Mutations ────────────────────────────── */
  const fileInputRef = useRef(null);
  const [avatarError, setAvatarError] = useState("");

  const onAvatarSuccess = () => {
    queryClient.invalidateQueries({
      queryKey: ["employee-profile", employeeId],
    });
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
    return [...(perfReviews || [])]
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
          name: alloc.project_name || alloc.sub_project_name || project?.name || "Project",
          role:
            (alloc.role_tags || []).join(", ") || profile.jobTitle || "Developer",
          status: isActive ? "active" : "completed",
          startDate: alloc.active_start_date
            ? format(parseISO(alloc.active_start_date), "dd MMM yyyy")
            : "-",
          endDate: alloc.active_end_date
            ? format(parseISO(alloc.active_end_date), "dd MMM yyyy")
            : "Ongoing",
          symbol: (alloc.project_name || alloc.sub_project_name || project?.name || "P")[0].toUpperCase(),
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

  const achievementBadges = useMemo(() => {
    const list = Array.isArray(employeeBadges)
      ? employeeBadges
      : Array.isArray(employeeBadges?.data)
        ? employeeBadges.data
        : Array.isArray(employeeBadges?.items)
          ? employeeBadges.items
          : [];

    const getBadgeInfo = (codes) => {
      const codeArr = Array.isArray(codes) ? codes : [codes];
      const foundIdx = list.findIndex((b) => codeArr.includes(b.badge_code));
      if (foundIdx === -1) return { earned: false, awardedAt: null, listIndex: 999 };
      const item = list[foundIdx];
      return {
        earned: true,
        awardedAt: item.awarded_at || item.created_at || item.issued_at || null,
        listIndex: foundIdx,
      };
    };

    const has = (code) => list.some((b) => b.badge_code === code);

    // Best weekly rank
    let weeklyRank = null;
    if (has("weekly_top_1")) weeklyRank = 1;
    else if (has("weekly_top_2")) weeklyRank = 2;
    else if (has("weekly_top_3")) weeklyRank = 3;

    // Best monthly rank
    let monthlyRankBadge = null;
    if (has("monthly_top_1")) monthlyRankBadge = 1;
    else if (has("monthly_top_2")) monthlyRankBadge = 2;
    else if (has("monthly_top_3")) monthlyRankBadge = 3;

    // Tenure: prefer 6 months
    const has6 = has("tenure_6_months");
    const has3 = has("tenure_3_months");
    const tenureEarned = has6 || has3;
    const tenureLabel = has6 ? "6 Months" : has3 ? "3 Months" : "Tenure";
    const tenureImage = has6 ? sixMonthsBadge : threeMonthsBadge;

    // Yearly: one badge + count
    const yearlyCount = list.filter((b) => b.badge_code === "yearly_milestone").length;

    const rawBadges = DISPLAY_SLOTS.map((slot) => {
      const base = BADGE_CONFIG[slot];

      if (slot === "hrs_50_week") {
        const info = getBadgeInfo("hrs_50_week");
        return {
          id: slot,
          label: base.label,
          meta: base.meta,
          image: base.image,
          earned: info.earned,
          awardedAt: info.awardedAt,
          listIndex: info.listIndex,
          badgeText: null,
        };
      }

      if (slot === "hrs_200_month") {
        const info = getBadgeInfo("hrs_200_month");
        return {
          id: slot,
          label: base.label,
          meta: base.meta,
          image: base.image,
          earned: info.earned,
          awardedAt: info.awardedAt,
          listIndex: info.listIndex,
          badgeText: null,
        };
      }

      if (slot === "weekly_top") {
        const info = getBadgeInfo(["weekly_top_1", "weekly_top_2", "weekly_top_3"]);
        const dynamicImage = weeklyRank ? BADGE_CONFIG[`weekly_top_${weeklyRank}`]?.image : base.image;
        return {
          id: slot,
          label: base.label,
          meta: weeklyRank ? `#${weeklyRank}` : base.meta,
          image: dynamicImage,
          earned: weeklyRank != null,
          awardedAt: info.awardedAt,
          listIndex: info.listIndex,
          badgeText: weeklyRank ? `#${weeklyRank}` : null,
        };
      }

      if (slot === "monthly_top") {
        const info = getBadgeInfo(["monthly_top_1", "monthly_top_2", "monthly_top_3"]);
        const dynamicImage = monthlyRankBadge ? BADGE_CONFIG[`monthly_top_${monthlyRankBadge}`]?.image : base.image;
        return {
          id: slot,
          label: base.label,
          meta: monthlyRankBadge ? `#${monthlyRankBadge}` : base.meta,
          image: dynamicImage,
          earned: monthlyRankBadge != null,
          awardedAt: info.awardedAt,
          listIndex: info.listIndex,
          badgeText: monthlyRankBadge ? `#${monthlyRankBadge}` : null,
        };
      }

      if (slot === "tenure") {
        const info = getBadgeInfo(["tenure_6_months", "tenure_3_months"]);
        return {
          id: slot,
          label: tenureLabel,
          meta: tenureEarned ? "Completed" : base.meta,
          image: tenureImage,
          earned: tenureEarned,
          awardedAt: info.awardedAt,
          listIndex: info.listIndex,
          badgeText: null,
        };
      }

      if (slot === "yearly_milestone") {
        const info = getBadgeInfo("yearly_milestone");
        return {
          id: slot,
          label: base.label,
          meta: yearlyCount > 0 ? `${yearlyCount} yr${yearlyCount > 1 ? "s" : ""}` : base.meta,
          image: base.image,
          earned: yearlyCount > 0,
          awardedAt: info.awardedAt,
          listIndex: info.listIndex,
          badgeText: yearlyCount > 1 ? `×${yearlyCount}` : yearlyCount === 1 ? "1" : null,
        };
      }

      return null;
    }).filter(Boolean);

    // Sort: active/earned badges move to the front of the line (leftmost)
    // Within active badges, order by newest awarded timestamp / list index first
    return rawBadges.sort((a, b) => {
      if (a.earned !== b.earned) {
        return a.earned ? -1 : 1;
      }
      if (a.earned && b.earned) {
        if (a.awardedAt && b.awardedAt) {
          const tA = new Date(a.awardedAt).getTime();
          const tB = new Date(b.awardedAt).getTime();
          if (tA !== tB) return tB - tA;
        }
        return a.listIndex - b.listIndex;
      }
      return 0;
    });
  }, [employeeBadges]);

  const earnedBadgeCount = achievementBadges.filter((b) => b.earned).length;

  const display = (value, fallback = "Not set") => {
    if (value === null || value === undefined || value === "") return fallback;
    return value;
  };

  // Full lists (used by History modals)
  const complaintsList = useMemo(
    () => employeeNotes.filter((n) => n.type === "complaint"),
    [employeeNotes]
  );
  const warningsList = useMemo(
    () => employeeNotes.filter((n) => n.type === "warning"),
    [employeeNotes]
  );
  const recognitionsList = useMemo(
    () => employeeNotes.filter((n) => n.type === "recognition"),
    [employeeNotes]
  );

  // Open only (shown in the three cards)
  const openComplaints = useMemo(
    () => complaintsList.filter((n) => n.status !== "resolved"),
    [complaintsList]
  );
  const openWarnings = useMemo(
    () => warningsList.filter((n) => n.status !== "resolved"),
    [warningsList]
  );
  const openRecognitions = useMemo(
    () => recognitionsList.filter((n) => n.status !== "resolved"),
    [recognitionsList]
  );

  // Counts shown in profile Notes tab (open for complaints/warnings)
  const complaintsCount = openComplaints.length;
  const warningsCount = openWarnings.length;

  return (
    <div
      className="w-full h-full text-stone-800 font-sans flex flex-col gap-2 sm:gap-3"
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
        <div className="lg:col-span-5 rounded-xl border border-stone-200 p-3 shadow-sm bg-white flex gap-3">
          {/* Left Column: Avatar, Date, Phone, Skills */}
          <div className="flex flex-col items-center shrink-0 w-[155px]">
            <div className="relative mb-2.5 flex justify-center w-full">
              {profile.avatarUrl && !imgError ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  onError={() => setImgError(true)}
                  className="w-28 h-28 rounded-full object-cover border border-stone-100 shadow-sm"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-50 to-stone-100 border border-stone-100 text-emerald-800 font-bold text-4xl flex items-center justify-center shadow-sm uppercase">
                  {profile.initials}
                </div>
              )}
            </div>


            {/* Role */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500 w-full mb-2 whitespace-nowrap text-center">
              <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="whitespace-nowrap">
                Role: <span className="font-normal text-stone-700">{display(profile.jobTitle, "Annotator/Reviewer")}</span>
              </span>
            </div>

            {profile.skills?.length > 0 && (
              <div className="flex flex-col items-center gap-1 w-full mt-0.5">
                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider text-center">
                  Skills
                </span>
                <div className="flex flex-wrap gap-1.5 w-full justify-center">
                  {profile.skills.slice(0, 3).map((skill, idx) => (
                    <span
                      key={idx}
                      className="bg-indigo-50/70 text-stone-700 px-2 py-0.5 rounded-full text-[9px] font-medium border border-indigo-100/50 leading-tight break-words max-w-full text-center"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="flex-1 min-w-0 flex flex-col justify-between pt-1">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-2.5">
                <h1 className="font-display text-[16px] font-bold text-stone-900 truncate leading-none">
                  {display(profile.name, "Employee")}
                </h1>
                {profile.badge && (
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {profile.badge}
                  </span>
                )}
              </div>

              <div className="text-[11px] text-stone-600 space-y-1.5 mb-2">
                <div className="flex items-center gap-2 truncate">
                  <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span className="text-stone-500">
                    Email:{" "}
                    <span
                      className={
                        profile.email ? "text-stone-700 font-normal" : "text-stone-400 italic"
                      }
                    >
                      {display(profile.email)}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2 truncate">
                  <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span className="text-stone-500">
                    Contact:{" "}
                    <span
                      className={
                        profile.phone ? "text-stone-700 font-normal" : "text-stone-400 italic"
                      }
                    >
                      {profile.phone || "No phone"}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2 truncate">
                  <span className="w-3.5 h-3.5 flex items-center justify-center text-[8px] font-bold border border-stone-400 rounded-sm text-stone-500 shrink-0">
                    E
                  </span>
                  <span className="text-stone-500">
                    Encord ID:{" "}
                    {profile.encordId ? (
                      <span className="text-stone-700">{profile.encordId}</span>
                    ) : (
                      <span className="text-stone-400 italic">Not updated</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 truncate">
                  <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span className="text-stone-500">
                    DOJ:{" "}
                    <span className="text-stone-700 font-normal">
                      {display(profile.joiningDate)}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mt-auto">
              <div className="flex items-center justify-end">
                <h3 className="font-display text-[15px] font-extrabold text-stone-800">
                  Leaves
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    icon: <Home className="w-3.5 h-3.5 text-indigo-600" />,
                    label: "WFH",
                    remaining: leavesAndWfhStats.wfhRemaining,
                    quota: leavesAndWfhStats.wfhQuota,
                    tabKey: "wfh",
                  },
                  {
                    icon: <Calendar className="w-3.5 h-3.5 text-indigo-600" />,
                    label: "Paid",
                    remaining: leavesAndWfhStats.paidRemaining,
                    quota: leavesAndWfhStats.paidQuota,
                    tabKey: "paid",
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
                    tabKey: "casual_sick",
                  },
                ].map(({ icon, label, remaining, quota, tabKey }) => (
                  <div
                    key={label}
                    onClick={() => handleOpenAttendanceModal(tabKey)}
                    title={`Click to view ${label} records`}
                    className="flex flex-col items-center gap-0.5 border border-stone-200 rounded-xl pt-2 pb-1 bg-white shadow-sm cursor-pointer hover:border-stone-300 transition-colors"
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center ${label === "Sick" ? "bg-orange-50" : "bg-indigo-50"
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
            </div>
          </div>
        </div>

        {/* ───────── BADGE (col-7) ───────── */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-xl p-3 flex flex-col gap-2 shadow-[0_1px_4px_rgba(28,25,23,0.06)]">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-[15px] font-extrabold text-stone-800">
                Badges
              </h2>
              <button
                onClick={() => setShowBadgeLogsModal(true)}
                className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Logs
              </button>
            </div>
            <div className="text-[10px] font-medium text-stone-500">
              <span className="text-indigo-600 font-bold">
                {earnedBadgeCount}/{achievementBadges.length}
              </span>{" "}
              badges earned
            </div>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {achievementBadges.map((badge) => (
              <div
                key={badge.id}
                className="relative flex flex-col items-center justify-between text-center p-2 rounded-2xl border border-stone-200 bg-white shadow-sm h-full"
              >
                <div className="absolute top-2 right-2 z-10">
                  {badge.earned ? (
                    <div className="w-3.5 h-3.5 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-200">
                      <Check className="w-2.5 h-2.5 text-indigo-500 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full bg-stone-100 flex items-center justify-center border border-white">
                      <Lock className="w-2 h-2 text-stone-400" />
                    </div>
                  )}
                </div>

                <img
                  src={badge.image}
                  alt={badge.label}
                  className={`w-9 h-9 object-contain mt-1 mb-1 relative z-0 ${badge.earned ? "" : "grayscale opacity-40"
                    }`}
                />

                <div className="flex flex-col items-center w-full">
                  <span
                    className={`text-[9px] font-bold leading-tight w-full truncate px-1 ${badge.earned ? "text-stone-800" : "text-stone-400"
                      }`}
                  >
                    {badge.label}
                  </span>
                  <span className="text-[8px] font-medium text-stone-400 mt-0.5 truncate w-full px-1">
                    {badge.meta}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5 flex-1">
            <h3 className="font-display text-[15px] font-extrabold text-stone-800">
              Stats
            </h3>
            <div className="grid grid-cols-4 gap-2 flex-1">
              {/* Previous Day Rank */}
              <div className="bg-white border border-stone-200 rounded-2xl p-2.5 flex flex-col justify-between shadow-sm">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-semibold text-stone-500 leading-tight max-w-[50%]">
                    Prev Day Rank
                  </span>
                  <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                </div>
                <div className="flex items-end justify-between mt-2.5">
                  <div className="flex items-end gap-0.5">
                    <span className="font-data text-[22px] font-extrabold text-stone-800 leading-none">
                      {dailyRank ? `#${dailyRank}` : "–"}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 text-[8.5px] font-semibold text-indigo-600 -mb-0.5">
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
                  <span className="text-[10px] font-semibold text-stone-500 leading-tight max-w-[50%]">
                    Weekly Rank
                  </span>
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
                  <span className="text-[10px] font-semibold text-stone-500 leading-tight max-w-[50%]">
                    Monthly Rank
                  </span>
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
                  <span className="text-[10px] font-semibold text-stone-500 leading-tight max-w-[50%]">
                    Monthly Rating
                  </span>
                  <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  </div>
                </div>
                <div className="flex items-end justify-between mt-2.5">
                  <div className="flex items-baseline gap-0.5">
                    <span className="font-data text-[22px] font-extrabold text-stone-800 leading-none">
                      {latestRating || "—"}
                    </span>
                    {latestRating && (
                      <span className="font-data text-[9px] font-bold text-stone-500">
                        /5
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 -mb-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-2.5 h-2.5 ${latestRating && s <= Math.floor(latestRating)
                            ? "fill-amber-400 text-amber-400"
                            : "fill-stone-200 text-stone-200"
                          }`}
                      />
                    ))}
                  </div>
                </div>
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
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-4 flex flex-col gap-3 h-[260px] shadow-[0_1px_4px_rgba(28,25,23,0.06)]">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-display text-sm font-bold text-stone-800">
                Daily Working Hours
              </h3>
              <p className="text-[10px] text-stone-400 mt-0.5">
                {currentMonthLabel}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* <EncordSyncWidget employeeId={employeeId} /> */}
              <div className="flex items-center gap-1.5 shrink-0 bg-indigo-50/50 px-3 py-1 rounded border border-indigo-100">
                <span className="font-data text-lg font-extrabold text-indigo-700 leading-none">
                  {totalDailyHours}h
                </span>
                <span className="text-[10px] font-medium text-stone-500">
                  Total Hours
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              {
                label: "Daily Avg",
                value: `${activityStats.avgHours}h`,
                color: "text-stone-800",
              },
              {
                label: "Active Days",
                value: String(activityStats.activeDays),
                color: "text-stone-800",
              },
              {
                label: "vs Team Avg",
                value: `${activityStats.deltaPct >= 0 ? "+" : ""}${activityStats.deltaPct
                  }%`,
                color:
                  activityStats.deltaPct >= 0
                    ? "text-indigo-600"
                    : "text-rose-500",
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white border border-stone-200 rounded-xl px-3 py-2 text-center">
                <span className="text-[9px] font-bold uppercase text-stone-400 block">{label}</span>
                <span className={`font-data text-sm font-bold ${color} block mt-0.5`}>{value}</span>
              </div>
            ))}
          </div>

          <div className="flex-1 min-h-[100px]">
            {dailyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-stone-400 bg-white rounded-xl border border-stone-100">
                No activity recorded yet this month
              </div>
            ) : (
              <div className="relative bg-white/60 border border-stone-100 rounded-xl p-2 h-full">
                <div className="flex h-full">
                  <div className="flex flex-col justify-between h-full pr-2 text-[8px] text-stone-400 shrink-0 font-data">
                    {[
                      chartMax,
                      chartMax * 0.75,
                      chartMax * 0.5,
                      chartMax * 0.25,
                      0,
                    ].map((n, i) => (
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
                          <stop
                            offset="0%"
                            stopColor="#0D9488"
                            stopOpacity="0.12"
                          />
                          <stop
                            offset="100%"
                            stopColor="#0D9488"
                            stopOpacity="0"
                          />
                        </linearGradient>
                      </defs>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <line
                          key={i}
                          x1="0"
                          x2={CHART_W}
                          y1={(CHART_H / 4) * i}
                          y2={(CHART_H / 4) * i}
                          stroke="#e7e5e4"
                          strokeWidth="1"
                        />
                      ))}
                      {hoverPoint && (
                        <line
                          x1={hoverPoint.x}
                          x2={hoverPoint.x}
                          y1="0"
                          y2={CHART_H}
                          stroke="#d6d3d1"
                          strokeWidth="1"
                          strokeDasharray="2 3"
                        />
                      )}
                      <polygon
                        points={chartGeometry.areaFill}
                        fill="url(#empFill)"
                      />
                      <polyline
                        points={chartGeometry.teamLine}
                        fill="none"
                        stroke="#a8a29e"
                        strokeWidth="1.25"
                        strokeDasharray="3 3"
                        strokeOpacity="0.7"
                      />
                      <polyline
                        points={chartGeometry.empLine}
                        fill="none"
                        stroke="#0f766e"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {hoverPoint && (
                        <>
                          <circle
                            cx={hoverPoint.x}
                            cy={hoverPoint.yTeam}
                            r="2.5"
                            fill="#a8a29e"
                            stroke="white"
                            strokeWidth="1"
                          />
                          <circle
                            cx={hoverPoint.x}
                            cy={hoverPoint.yEmp}
                            r="3.5"
                            fill="#0f766e"
                            stroke="white"
                            strokeWidth="1.5"
                          />
                        </>
                      )}
                    </svg>
                    {hoverPoint && (
                      <div
                        className="absolute -top-1 bg-white/95 text-stone-700 text-[9px] rounded-lg px-2 py-1.5 pointer-events-none shadow-md border border-stone-200/70 whitespace-nowrap z-10 font-data"
                        style={{
                          left: `${(hoverPoint.x / CHART_W) * 100}%`,
                          transform:
                            hoverPoint.x / CHART_W > 0.85
                              ? "translate(-100%, -100%)"
                              : hoverPoint.x / CHART_W < 0.15
                                ? "translate(0%, -100%)"
                                : "translate(-50%, -100%)",
                        }}
                      >
                        <p className="font-display font-medium text-stone-500 mb-0.5">
                          {format(parseISO(hoverPoint.date), "EEE, d MMM")}
                        </p>
                        <p>
                          You:{" "}
                          <span className="font-semibold text-stone-800">
                            {hoverPoint.employee_hours}h
                          </span>
                        </p>
                        <p className="text-stone-400">
                          Team: {hoverPoint.team_avg_hours}h
                        </p>
                      </div>
                    )}
                    <div className="relative w-full mt-0.5 h-3">
                      {chartGeometry.points.map((p, i) => (
                        <span
                          key={i}
                          className="absolute top-0 text-[7.5px] text-stone-400 font-medium font-data -translate-x-1/2 whitespace-nowrap"
                          style={{ left: `${(p.x / CHART_W) * 100}%` }}
                        >
                          {format(parseISO(p.date), "d")}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ───────── PROJECT STATUS (col-5) ───────── */}
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-4 flex flex-col gap-3 h-[260px] shadow-[0_1px_4px_rgba(28,25,23,0.06)]">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-indigo-600" />
              <h3 className="font-display text-sm font-bold text-stone-800">Project Status</h3>
            </div>
            <button
              onClick={() => setShowLogsModal(true)}
              className="flex items-center gap-1 text-[10px] font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-2 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <History className="w-3 h-3" /> Logs
            </button>
          </div>

          {/* Project list — fills available height, scrolls for more */}
          <div className="flex-1 min-h-0 flex flex-col gap-1.5 overflow-y-auto db-scroll">
            {allEmployeeProjects.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-stone-400 italic">
                No projects assigned currently.
              </div>
            ) : (
              allEmployeeProjects.slice(0, 6).map((proj) => (
                <div key={proj.id} className="flex items-center gap-2 p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100/60 transition-colors">
                  <span className="w-7 h-7 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center font-extrabold text-[10px] shrink-0">
                    {proj.symbol}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-stone-800 text-[11px] truncate">{proj.name}</p>
                    <p className="text-[9px] text-stone-500 truncate mt-0.5">{proj.role}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`inline-block px-1.5 py-0.5 text-[8px] font-semibold uppercase rounded-sm ${proj.status === "active" ? "bg-indigo-50 text-indigo-600 border border-indigo-200" : "bg-stone-100 text-stone-400 border border-stone-200"}`}>
                      {proj.status === "active" ? "Active" : "Done"}
                    </span>
                    <p className="text-[8px] text-stone-400 font-data mt-0.5">{proj.startDate}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-stone-100 pt-2 flex items-center justify-between text-[10px] text-stone-400">
            <span>Active allocations</span>
            <strong className="text-stone-700 font-data">
              {allEmployeeProjects.length} total
            </strong>
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
            <div className="flex gap-5 border-b border-stone-100 pb-0.5">
              {canViewNotes && (
                <button
                  type="button"
                  onClick={() => setBottomTab("notes")}
                  className={`flex items-center gap-1.5 pb-2 -mb-[3px] border-b-[2px] font-semibold text-[13px] transition-colors ${bottomTab === "notes"
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-stone-400 hover:text-stone-600"
                    }`}
                >
                  <FileText className="w-4 h-4" /> Notes
                </button>
              )}
              <button
                type="button"
                onClick={() => setBottomTab("performance")}
                className={`flex items-center gap-1.5 pb-2 -mb-[3px] border-b-[2px] font-semibold text-[13px] transition-colors ${bottomTab === "performance" || !canViewNotes
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-stone-400 hover:text-stone-600"
                  }`}
              >
                <TrendingUp className="w-4 h-4" /> Performance History
              </button>
            </div>
            {/* Tab body */}
            {bottomTab === "notes" && canViewNotes ? (
              <div className="grid grid-cols-3 gap-3 flex-1">
                {/* Complaints */}
                <div className="flex flex-col bg-white border border-stone-200 rounded-xl p-2.5">
                  <div className="flex items-center justify-between gap-1.5 mb-2">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <h3 className="text-[10px] font-bold text-stone-700 uppercase tracking-wider">Complaints</h3>
                      <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-50 text-rose-600 border border-rose-200/80 leading-none ml-0.5">
                        {complaintsCount}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setNotesModal({ isOpen: true, type: 'complaints', title: 'Complaints History', data: complaintsList })} className="flex items-center gap-1 text-[9px] font-semibold text-stone-500 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer">
                        <History className="w-2.5 h-2.5" /> History
                      </button>


                      {canManageNotes && !isSelf && (
                        <button
                          type="button"
                          onClick={() => {
                            setNoteForm({
                              title: "",
                              content: "",
                              severity: "medium",
                            });
                            setNoteFormError("");
                            setAddNoteModal({
                              isOpen: true,
                              type: "complaint",
                            });
                          }}
                          className="flex items-center justify-center bg-stone-100 hover:bg-stone-200 border border-stone-200 w-5 h-5 rounded transition-colors text-stone-600"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto db-scroll">
                    {openComplaints.length > 0 ? (
                      <>
                        {[...(openComplaints || [])]
                          .reverse()
                          .map((item, idx) => (
                            <div
                              key={item.id ?? idx}
                              className="group relative flex items-start gap-1.5 bg-rose-50/50 border border-rose-100/70 p-1.5 rounded-lg"
                            >
                              <p className="text-[10px] text-stone-600 leading-snug flex-1 min-w-0">
                                {item.title
                                  ? `${item.title}${item.content ? ` — ${item.content}` : ""
                                  }`
                                  : item.message ||
                                  item.reason ||
                                  item.note ||
                                  "Complaint recorded"}
                              </p>

                              {canManageNotes && !isSelf && item.id && (
                                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                                  <button
                                    type="button"
                                    title="Mark as resolved"
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          "Mark this complaint as resolved?"
                                        )
                                      ) {
                                        resolveNoteMutation.mutate({
                                          id: item.id,
                                        });
                                      }
                                    }}
                                    disabled={resolveNoteMutation.isPending}
                                    className="p-0.5 rounded text-stone-400 hover:text-indigo-600 hover:bg-indigo-50"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>

                                  <button
                                    type="button"
                                    title="Delete"
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          "Delete this complaint?"
                                        )
                                      ) {
                                        deleteNoteMutation.mutate(item.id);
                                      }
                                    }}
                                    disabled={deleteNoteMutation.isPending}
                                    className="p-0.5 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-100"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}

                      </>
                    ) : (
                      <p className="text-[10px] text-stone-400 italic">
                        No open complaints.
                      </p>
                    )}
                  </div>
                </div>

                {/* Warnings */}
                <div className="flex flex-col bg-white border border-stone-200 rounded-xl p-2.5">
                  <div className="flex items-center justify-between gap-1.5 mb-2">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <h3 className="text-[10px] font-bold text-stone-700 uppercase tracking-wider">Warnings</h3>
                      <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-50 text-amber-600 border border-amber-200/80 leading-none ml-0.5">
                        {warningsCount}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setNotesModal({ isOpen: true, type: 'warnings', title: 'Warnings History', data: warningsList })} className="flex items-center gap-1 text-[9px] font-semibold text-stone-500 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer">
                        <History className="w-2.5 h-2.5" /> History
                      </button>


                      {canManageNotes && !isSelf && (
                        <button
                          type="button"
                          onClick={() => {
                            setNoteForm({
                              title: "",
                              content: "",
                              severity: "medium",
                            });
                            setNoteFormError("");
                            setAddNoteModal({
                              isOpen: true,
                              type: "warning",
                            });
                          }}
                          className="flex items-center justify-center bg-stone-100 hover:bg-stone-200 border border-stone-200 w-5 h-5 rounded transition-colors text-stone-600"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto db-scroll">
                    {openWarnings.length > 0 ? (
                      <>
                        {[...(openWarnings || [])]
                          .reverse()
                          .map((item, idx) => (
                            <div
                              key={item.id ?? idx}
                              className="group relative flex items-start gap-1.5 bg-amber-50/50 border border-amber-100/70 p-1.5 rounded-lg"
                            >
                              <p className="text-[10px] text-stone-600 leading-snug flex-1 min-w-0">
                                {item.title
                                  ? `${item.title}${item.content ? ` — ${item.content}` : ""
                                  }`
                                  : item.message ||
                                  item.reason ||
                                  item.note ||
                                  "Warning issued"}
                              </p>

                              {canManageNotes && !isSelf && item.id && (
                                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                                  <button
                                    type="button"
                                    title="Mark as resolved"
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          "Mark this warning as resolved?"
                                        )
                                      ) {
                                        resolveNoteMutation.mutate({
                                          id: item.id,
                                        });
                                      }
                                    }}
                                    disabled={resolveNoteMutation.isPending}
                                    className="p-0.5 rounded text-stone-400 hover:text-indigo-600 hover:bg-indigo-50"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>

                                  <button
                                    type="button"
                                    title="Delete"
                                    onClick={() => {
                                      if (
                                        window.confirm("Delete this warning?")
                                      ) {
                                        deleteNoteMutation.mutate(item.id);
                                      }
                                    }}
                                    disabled={deleteNoteMutation.isPending}
                                    className="p-0.5 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-100"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}

                      </>
                    ) : (
                      <p className="text-[10px] text-stone-400 italic">
                        No open warnings.
                      </p>
                    )}
                  </div>
                </div>

                {/* Recognition */}
                <div className="flex flex-col bg-white border border-stone-200 rounded-xl p-2.5">
                  <div className="flex items-center justify-between gap-1.5 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <h3 className="text-[10px] font-bold text-stone-700 uppercase tracking-wider">Recognition</h3>
                      <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200/80 leading-none ml-0.5">
                        {recognitionsList.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setNotesModal({ isOpen: true, type: 'recognitions', title: 'Recognition History', data: recognitionsList })} className="flex items-center gap-1 text-[9px] font-semibold text-stone-500 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer">
                        <History className="w-2.5 h-2.5" /> History
                      </button>


                      {canManageNotes && !isSelf && (
                        <button
                          type="button"
                          onClick={() => {
                            setNoteForm({
                              title: "",
                              content: "",
                              severity: "medium",
                            });
                            setNoteFormError("");
                            setAddNoteModal({
                              isOpen: true,
                              type: "recognition",
                            });
                          }}
                          className="flex items-center justify-center bg-stone-100 hover:bg-stone-200 border border-stone-200 w-5 h-5 rounded transition-colors text-stone-600"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto db-scroll">
                    {openRecognitions.length > 0 ? (
                      <>
                        {[...(openRecognitions || [])]
                          .reverse()
                          .map((item, idx) => (
                            <div
                              key={item.id ?? idx}
                              className="group relative flex items-start gap-1.5 bg-indigo-50/50 border border-indigo-100/70 p-1.5 rounded-lg"
                            >
                              <p className="text-[10px] text-stone-600 leading-snug flex-1 min-w-0">
                                {item.title
                                  ? `${item.title}${item.content ? ` — ${item.content}` : ""
                                  }`
                                  : item.message ||
                                  item.reason ||
                                  item.note ||
                                  "Recognition received"}
                              </p>

                              {canManageNotes && !isSelf && item.id && (
                                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                                  <button
                                    type="button"
                                    title="Mark as resolved"
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          "Mark this recognition as resolved?"
                                        )
                                      ) {
                                        resolveNoteMutation.mutate({
                                          id: item.id,
                                        });
                                      }
                                    }}
                                    disabled={resolveNoteMutation.isPending}
                                    className="p-0.5 rounded text-stone-400 hover:text-indigo-600 hover:bg-indigo-50"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>

                                  <button
                                    type="button"
                                    title="Delete"
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          "Delete this recognition?"
                                        )
                                      ) {
                                        deleteNoteMutation.mutate(item.id);
                                      }
                                    }}
                                    disabled={deleteNoteMutation.isPending}
                                    className="p-0.5 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-100"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}

                      </>
                    ) : (
                      <p className="text-[10px] text-stone-400 italic">
                        No open recognition messages.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 flex-1 overflow-y-auto db-scroll">
                {perfReviews.length > 0 ? (
                  [...(perfReviews || [])].reverse().map((review, idx) => {
                    const rts = review.parameter_values?.map((p) => p.pm_rating).filter((r) => r != null) || [];
                    const rAvg = rts.length ? (rts.reduce((s, v) => s + v, 0) / rts.length).toFixed(1) : null;
                    return (
                      <div key={idx} className="flex items-start gap-3 bg-white border border-stone-100 rounded-xl p-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-bold text-stone-800">{review.period || "Review"}</span>
                            {rAvg && (
                              <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-md">
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />{" "}
                                {rAvg}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-stone-600 leading-relaxed">
                            {review.overall_comment || "No detailed comments."}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[10px] text-stone-400 italic">
                    No performance history found.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ───────── AWARDS (col-4) ───────── */}
        <div className="lg:col-span-4 bg-white border border-stone-200 rounded-2xl p-4 flex flex-col gap-3 shadow-[0_1px_4px_rgba(28,25,23,0.06)]">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <Award className="w-4 h-4 text-indigo-600" />
            <h3 className="font-display text-sm font-bold text-stone-800">
              Awards
            </h3>

          </div>

          <div className="flex flex-col gap-2 flex-1 overflow-y-auto db-scroll">
            {[
              {
                icon: Trophy,
                title: "Top Performer",
                date: "August 2026",
                earned: false,
                color: "text-amber-500",
              },
              {
                icon: Star,
                title: "Quality Champion",
                date: "July 2026",
                earned: false,
                color: "text-amber-500",
              },
              {
                icon: Target,
                title: "Perfect Attendance",
                date: "June 2026",
                earned: false,
                color: "text-indigo-500",
              },
            ].map(({ icon: Icon, title, date, earned, color }) => (
              <div
                key={title}
                className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${earned
                    ? "bg-stone-50 border-stone-200 hover:bg-stone-100/60"
                    : "bg-stone-50/40 border-stone-200/50 opacity-50"
                  }`}
              >
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${earned ? "bg-white border border-stone-200" : "bg-stone-100"
                    }`}
                >
                  <Icon
                    className={`w-4 h-4 ${earned ? color : "text-stone-400"
                      }`}
                  />
                </span>
                <div className="min-w-0">
                  <p
                    className={`text-[11px] font-bold truncate ${earned ? "text-stone-800" : "text-stone-500"
                      }`}
                  >
                    {title}
                  </p>
                  <p
                    className={`text-[9.5px] ${earned ? "text-stone-400" : "text-stone-300"
                      }`}
                  >
                    {date}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════ ADD NOTE MODAL ════════════ */}
      {addNoteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${addNoteModal.type === "complaint"
                      ? "bg-rose-50 text-rose-600"
                      : addNoteModal.type === "warning"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-indigo-50 text-indigo-600"
                    }`}
                >
                  {addNoteModal.type === "complaint" ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : addNoteModal.type === "warning" ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <Award className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-stone-800">
                    Add{" "}
                    {addNoteModal.type === "complaint"
                      ? "Complaint"
                      : addNoteModal.type === "warning"
                        ? "Warning"
                        : "Recognition"}
                  </h3>
                  <p className="text-[10px] text-stone-400">
                    This will be visible on the employee’s profile
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAddNoteModal({ isOpen: false, type: null })}
                className="w-8 h-8 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Title
                </label>
                <input
                  type="text"
                  value={noteForm.title}
                  onChange={(e) =>
                    setNoteForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Short title…"
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Details
                </label>
                <textarea
                  value={noteForm.content}
                  onChange={(e) =>
                    setNoteForm((f) => ({ ...f, content: e.target.value }))
                  }
                  rows={4}
                  placeholder="Describe the issue or recognition…"
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              {(addNoteModal.type === "complaint" ||
                addNoteModal.type === "warning") && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Severity
                    </label>
                    <div className="mt-1.5 flex gap-2">
                      {["low", "medium", "high"].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() =>
                            setNoteForm((f) => ({ ...f, severity: s }))
                          }
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${noteForm.severity === s
                              ? s === "high"
                                ? "bg-rose-50 border-rose-300 text-rose-700"
                                : s === "medium"
                                  ? "bg-amber-50 border-amber-300 text-amber-700"
                                  : "bg-indigo-50 border-emerald-300 text-emerald-700"
                              : "bg-white border-stone-200 text-stone-500 hover:bg-stone-50"
                            }`}
                        >
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {noteFormError && (
                <p className="text-xs font-medium text-rose-600">
                  {noteFormError}
                </p>
              )}
            </div>

            <div className="px-4 py-3 border-t border-stone-100 bg-stone-50/60 flex items-center justify-end gap-2">
              <button
                onClick={() => setAddNoteModal({ isOpen: false, type: null })}
                className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!noteForm.title.trim() || !noteForm.content.trim()) {
                    setNoteFormError("Title and details are required.");
                    return;
                  }
                  setNoteFormError("");
                  createNoteMutation.mutate({
                    employee_id: Number(employeeId),
                    type: addNoteModal.type,
                    title: noteForm.title.trim(),
                    content: noteForm.content.trim(),
                    severity:
                      addNoteModal.type === "recognition"
                        ? null
                        : noteForm.severity,
                  });
                }}
                disabled={createNoteMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-indigo-600 disabled:opacity-60"
              >
                {createNoteMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Add{" "}
                {addNoteModal.type === "complaint"
                  ? "Complaint"
                  : addNoteModal.type === "warning"
                    ? "Warning"
                    : "Recognition"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ NOTES HISTORY MODAL ════════════════ */}
      {notesModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-t-2xl sm:rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]">
            <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${notesModal.type === "complaints"
                      ? "bg-rose-50 text-rose-600"
                      : notesModal.type === "warnings"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-indigo-50 text-indigo-600"
                    }`}
                >
                  {notesModal.type === "complaints" ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : notesModal.type === "warnings" ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <Award className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-stone-800">
                    {notesModal.title}
                  </h3>
                  <p className="text-[10px] text-stone-400">
                    Complete history of records
                  </p>
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
                <p className="text-xs text-stone-400 italic text-center py-8">
                  No records available.
                </p>
              ) : (
                [...(notesModal.data || [])].reverse().map((item, idx) => (
                  <div
                    key={item.id ?? idx}
                    className={`p-3 rounded-xl border ${notesModal.type === "complaints"
                        ? "bg-rose-50/30 border-rose-100"
                        : notesModal.type === "warnings"
                          ? "bg-amber-50/30 border-amber-100"
                          : "bg-indigo-50/30 border-indigo-100"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-xs font-semibold text-stone-800">
                        {item.title || "Untitled"}
                      </p>
                      {item.status === "resolved" && (
                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                          Resolved
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      {item.content ||
                        item.message ||
                        item.reason ||
                        item.note ||
                        "—"}
                    </p>
                    {item.severity && (
                      <p className="mt-1 text-[10px] text-stone-500">
                        Severity:{" "}
                        <span className="font-medium capitalize">
                          {item.severity}
                        </span>
                      </p>
                    )}
                    {item.resolution_note && (
                      <p className="mt-1.5 text-[10px] text-stone-500 italic">
                        Resolution: {item.resolution_note}
                      </p>
                    )}
                    {item.issued_at && (
                      <p className="mt-1 text-[9px] text-stone-400">
                        {format(parseISO(item.issued_at), "dd MMM yyyy")}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="px-4 py-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
              <span>{notesModal.data.length} total entries</span>
              <button
                onClick={() => setNotesModal({ ...notesModal, isOpen: false })}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white font-medium rounded-xl text-xs transition-colors cursor-pointer"
              >
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
            <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between bg-white/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100/50 text-indigo-600 border border-indigo-200/50 flex items-center justify-center shadow-sm">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-stone-800">
                    All Project Logs
                  </h3>
                  <p className="text-[10px] text-stone-400">
                    Complete history of assigned projects
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLogsModal(false)}
                className="w-8 h-8 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-200/50 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto db-scroll space-y-2 flex-1">
              {allEmployeeProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-3">
                    <History className="w-5 h-5 text-stone-400" />
                  </div>
                  <p className="text-xs font-semibold text-stone-600">No project logs available.</p>
                  <p className="text-[10px] text-stone-400 mt-1">Assignments will appear here once allocated.</p>
                </div>
              ) : (
                allEmployeeProjects.map((item) => {
                  const isActive = item.status === "active";
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border ${isActive
                          ? "bg-indigo-50/40 border-indigo-100"
                          : "bg-stone-50 border-stone-100"
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`px-2 py-0.5 text-[8.5px] font-bold uppercase rounded-md shrink-0 ${isActive
                                ? "bg-indigo-600 text-white"
                                : "bg-stone-200 text-stone-600"
                              }`}
                          >
                            {isActive ? "Active" : "Completed"}
                          </span>
                          <h4 className="font-bold text-stone-800 text-xs truncate">
                            {item.name}
                          </h4>
                        </div>
                        <span className="text-[9px] text-stone-400 font-data shrink-0">
                          {item.startDate} — {item.endDate}
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-500">
                        Role:{" "}
                        <strong className="text-stone-700">{item.role}</strong>
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-4 py-3 border-t border-stone-100 bg-white flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500">
                {allEmployeeProjects.length} total assignment{allEmployeeProjects.length !== 1 ? 's' : ''}
              </span>
              <button onClick={() => setShowLogsModal(false)} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showBadgeLogsModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-t-2xl sm:rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]">
            <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between bg-white/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100/50 text-indigo-600 border border-indigo-200/50 flex items-center justify-center shadow-sm">
                  <BadgeCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-stone-800">
                    Badge History
                  </h3>
                  <p className="text-[10px] text-stone-400">
                    History of earned badges and milestones
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBadgeLogsModal(false)}
                className="w-8 h-8 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-200/50 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto db-scroll space-y-2 flex-1">
              {badgeLogsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <span className="text-xs text-stone-400">Loading logs...</span>
                </div>
              ) : badgeLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-3">
                    <BadgeCheck className="w-5 h-5 text-stone-400" />
                  </div>
                  <p className="text-xs font-semibold text-stone-600">No badge logs available.</p>
                  <p className="text-[10px] text-stone-400 mt-1">Badge achievements will appear here.</p>
                </div>
              ) : (
                badgeLogs.map((log) => {
                  return (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl border bg-stone-50 border-stone-100 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-white border border-stone-200 shadow-sm flex items-center justify-center shrink-0">
                        <img
                          src={
                            log.badge_code === "tenure_6_months" ? sixMonthsBadge :
                              log.badge_code === "tenure_3_months" ? threeMonthsBadge :
                                BADGE_CONFIG[log.badge_code]?.image || threeMonthsBadge
                          }
                          alt={log.badge_name || log.badge_code}
                          className="w-6 h-6 object-contain"
                        />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h4 className="font-bold text-stone-800 text-xs truncate">
                            {log.badge_name || log.badge_code}
                          </h4>
                          <span className="text-[9px] text-stone-400 font-data shrink-0 ml-2">
                            {display(log.created_at?.split('T')[0])}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-500">
                          Action: <strong className="text-indigo-600 capitalize">{log.action}</strong>
                          {log.period_start && log.period_end && ` • ${log.period_start} to ${log.period_end}`}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-4 py-3 border-t border-stone-100 bg-white flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500">
                {badgeLogs.length} total record{badgeLogs.length !== 1 ? 's' : ''}
              </span>
              <button onClick={() => setShowBadgeLogsModal(false)} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ ATTENDANCE / LEAVE DETAILS MODAL ════════════ */}
      {attendanceModalTab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white border border-stone-200 rounded-2xl w-[580px] sm:w-[620px] h-[520px] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-semibold border border-indigo-100">
                  {attendanceModalTab === "wfh" ? (
                    <Home className="w-4 h-4 text-indigo-600" />
                  ) : attendanceModalTab === "paid" ? (
                    <Calendar className="w-4 h-4 text-indigo-600" />
                  ) : (
                    <HeartPulse className="w-4 h-4 text-amber-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-stone-800 flex items-center gap-2">
                    Attendance & Leave Records
                    <span className="text-xs font-normal text-stone-500">
                      • {employee?.name || "Employee"}
                    </span>
                  </h3>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    View detailed history of WFH and leave applications
                  </p>
                </div>
              </div>

              {/* Month Navigator Controls & Close button */}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-between w-[130px] shrink-0 bg-stone-100/80 border border-stone-200/80 p-0.5 rounded-full text-xs font-semibold text-stone-700 shadow-2xs">
                  <button
                    disabled={
                      modalSelectedMonth.getFullYear() < 2025 ||
                      (modalSelectedMonth.getFullYear() === 2025 &&
                        modalSelectedMonth.getMonth() <= 7)
                    }
                    onClick={() =>
                      setModalSelectedMonth(
                        (prev) =>
                          new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                      )
                    }
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 hover:bg-white hover:text-stone-900 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-stone-400"
                    title="Previous month"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-center flex-1 text-[11px] font-bold tracking-wide uppercase text-stone-700 select-none truncate">
                    {format(modalSelectedMonth, "MMM yyyy")}
                  </span>
                  <button
                    disabled={
                      modalSelectedMonth.getFullYear() > new Date().getFullYear() ||
                      (modalSelectedMonth.getFullYear() === new Date().getFullYear() &&
                        modalSelectedMonth.getMonth() >= new Date().getMonth())
                    }
                    onClick={() =>
                      setModalSelectedMonth(
                        (prev) =>
                          new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                      )
                    }
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 hover:bg-white hover:text-stone-900 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-stone-400"
                    title="Next month"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => setAttendanceModalTab(null)}
                  className="w-8 h-8 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-stone-100 bg-stone-50/30 px-5 pt-3 gap-2 flex-shrink-0">
              {[
                {
                  key: "wfh",
                  label: "WFH Requests",
                  count: modalWfhList.length,
                  icon: <Home className="w-3.5 h-3.5" />,
                },
                {
                  key: "paid",
                  label: "Paid Leaves",
                  count: modalLeavesList.filter(
                    (l) => normalizeLeaveType(l.leave_type) === "paid"
                  ).length,
                  icon: <Calendar className="w-3.5 h-3.5" />,
                },
                {
                  key: "casual_sick",
                  label: "Sick / Casual Leaves",
                  count: modalLeavesList.filter(
                    (l) => normalizeLeaveType(l.leave_type) === "casual_sick"
                  ).length,
                  icon: <HeartPulse className="w-3.5 h-3.5" />,
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setAttendanceModalTab(tab.key)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-all cursor-pointer ${attendanceModalTab === tab.key
                      ? "border-indigo-600 text-indigo-700 bg-white shadow-xs"
                      : "border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-100/50"
                    }`}
                >
                  {tab.icon}
                  {tab.label}
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${attendanceModalTab === tab.key
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-stone-100 text-stone-600"
                      }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1">
              {attendanceModalTab === "wfh" && (
                <div>
                  {modalWfhList.length === 0 ? (
                    <div className="text-center py-10 text-stone-400">
                      <Home className="w-8 h-8 mx-auto mb-2 opacity-40 text-stone-400" />
                      <p className="text-xs font-medium">
                        No WFH requests recorded for {format(modalSelectedMonth, "MMMM yyyy")}.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {modalWfhList.map((wfh) => (
                        <div
                          key={wfh.id}
                          className="p-3.5 rounded-xl border border-stone-100 bg-stone-50/50 hover:bg-stone-50 transition-colors flex items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-stone-800">
                                {wfh.wfh_date}
                                {wfh.end_date && wfh.end_date !== wfh.wfh_date
                                  ? ` to ${wfh.end_date}`
                                  : ""}
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${(wfh.status || "pending").toLowerCase() ===
                                    "approved"
                                    ? "bg-indigo-100 text-indigo-700"
                                    : (wfh.status || "pending").toLowerCase() ===
                                      "rejected"
                                      ? "bg-rose-100 text-rose-700"
                                      : "bg-amber-100 text-amber-700"
                                  }`}
                              >
                                {wfh.status || "Pending"}
                              </span>
                            </div>
                            <p className="text-xs text-stone-600">
                              {wfh.reason || "No reason specified"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(attendanceModalTab === "paid" ||
                attendanceModalTab === "casual_sick") && (
                  <div>
                    {modalLeavesList.filter(
                      (l) =>
                        normalizeLeaveType(l.leave_type) === attendanceModalTab
                    ).length === 0 ? (
                      <div className="text-center py-10 text-stone-400">
                        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40 text-stone-400" />
                        <p className="text-xs font-medium">
                          No {attendanceModalTab === "paid" ? "Paid" : "Sick/Casual"} leave records found for {format(modalSelectedMonth, "MMMM yyyy")}.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {modalLeavesList
                          .filter(
                            (l) =>
                              normalizeLeaveType(l.leave_type) ===
                              attendanceModalTab
                          )
                          .map((leave) => (
                            <div
                              key={leave.id}
                              className="p-3.5 rounded-xl border border-stone-100 bg-stone-50/50 hover:bg-stone-50 transition-colors flex items-center justify-between gap-4"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-stone-800">
                                    {leave.start_date || "—"}
                                    {leave.end_date &&
                                      leave.end_date !== leave.start_date
                                      ? ` to ${leave.end_date}`
                                      : ""}
                                  </span>
                                  {leave.is_half_day && (
                                    <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-md">
                                      Half Day
                                    </span>
                                  )}
                                  <span
                                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${(leave.status || "pending").toLowerCase() ===
                                        "approved"
                                        ? "bg-indigo-100 text-indigo-700"
                                        : (leave.status || "pending").toLowerCase() ===
                                          "rejected"
                                          ? "bg-rose-100 text-rose-700"
                                          : "bg-amber-100 text-amber-700"
                                      }`}
                                  >
                                    {leave.status || "Pending"}
                                  </span>
                                </div>
                                <p className="text-xs text-stone-600">
                                  {leave.reason || "No reason specified"}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span className="text-xs font-semibold text-stone-500">
                                  {leave.is_half_day
                                    ? "0.5 day"
                                    : leave.start_date && leave.end_date
                                      ? `${getWorkingDayCount(
                                        leave.start_date,
                                        leave.end_date
                                      )} days`
                                      : "1 day"}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
            </div>

            <div className="px-5 py-3 border-t border-stone-100 bg-stone-50/50 flex justify-end flex-shrink-0">
              <button
                onClick={() => setAttendanceModalTab(null)}
                className="px-4 py-1.5 text-xs font-semibold text-stone-600 bg-white border border-stone-200 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
              >
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
              <h3 className="font-display text-sm font-bold text-stone-800">
                Edit Profile Information
              </h3>
              <button
                onClick={cancelEdit}
                className="w-8 h-8 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="employee@autonexai360.com"
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Encord ID
                </label>
                <input
                  type="text"
                  value={editEncordId}
                  onChange={(e) => setEditEncordId(e.target.value)}
                  placeholder="john.encord@example.com"
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Slack Member ID
                </label>
                <input
                  type="text"
                  value={editSlackId}
                  onChange={(e) => setEditSlackId(e.target.value)}
                  placeholder="U0123ABC456"
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5 block">
                  Skills &amp; Competencies
                </label>
                <SkillsMultiSelect
                  selected={editSkills}
                  onChange={setEditSkills}
                  options={skillsList}
                  isLoading={skillsLoading}
                />
              </div>
              {(saveError || emailError) && (
                <div className="bg-rose-50 px-3 py-2 rounded-lg border border-rose-100">
                  {saveError && <p className="text-xs font-medium text-rose-600">{saveError}</p>}
                  {emailError && <p className="text-xs font-medium text-rose-600">{emailError}</p>}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-stone-100 bg-white/60 flex items-center justify-end gap-2">
              <button
                onClick={cancelEdit}
                className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-indigo-600 disabled:opacity-60"
              >
                {saveMutation.isPending ? (
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





