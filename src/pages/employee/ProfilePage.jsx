import React, { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import UserAvatar from "../../components/ui/UserAvatar";
import { authApi, employeeApi, skillsApi } from "../../services/api";
import {
  Check,
  ChevronDown,
  Lock,
  Pencil,
  X,
  Camera,
  Trash2,
  Loader2,
  MessageSquare,
  ArrowUpRight,
  BadgeCheck,
  Mail,
  Hash,
  Palette,
  User,
  Phone,
  Calendar,
  CalendarClock,
  CalendarDays,
  CreditCard,
  Fingerprint,
  Briefcase,
  Clock,
  ShieldCheck,
  Award,
} from "lucide-react";
import { format, parseISO, differenceInCalendarMonths } from "date-fns";
import { COVERS, COVER_TABS, COVER_KEY, DEFAULT_COVER_ID } from "../../config/profileCovers";

/* ── Shared styles ───────────────────────────────────────────────── */
const inputCls =
  "h-8 w-full rounded-md border border-slate-300 bg-white px-2.5 text-[13px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 disabled:bg-slate-50 disabled:text-slate-400";
const btnPrimary =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-slate-900 px-3 text-[13px] font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40";
const btnSecondary =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40";
const hairline = "border-slate-900/[0.08]";

/* ── Icon tones: one soft hue per kind of information ────────────── */
const TONES = {
  blue: { icon: "text-blue-600", tile: "bg-blue-50 text-blue-600" },
  emerald: { icon: "text-emerald-600", tile: "bg-emerald-50 text-emerald-600" },
  violet: { icon: "text-violet-600", tile: "bg-violet-50 text-violet-600" },
  amber: { icon: "text-amber-600", tile: "bg-amber-50 text-amber-600" },
  rose: { icon: "text-rose-600", tile: "bg-rose-50 text-rose-600" },
  sky: { icon: "text-sky-600", tile: "bg-sky-50 text-sky-600" },
  fuchsia: { icon: "text-fuchsia-600", tile: "bg-fuchsia-50 text-fuchsia-600" },
};

/* ── Field tile: tinted icon + label over value ──────────────────── */
const Field = ({
  label,
  icon: Icon,
  tone = "blue",
  children,
  hint,
  onClick,
  editable = false,
  title,
  className = "",
}) => (
  <div
    onClick={onClick}
    title={title}
    className={`group relative flex items-center gap-3 rounded-lg border border-slate-900/[0.07] bg-slate-50/70 px-3 py-2 ${
      editable
        ? "cursor-pointer transition-colors hover:border-slate-300 hover:bg-white"
        : ""
    } ${className}`}
  >
    {Icon && (
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${TONES[tone].tile}`}
      >
        <Icon className="h-4 w-4" />
      </span>
    )}
    <div className="min-w-0 flex-1">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="flex min-h-6 items-center gap-2 text-sm text-slate-900">
        {children}
      </div>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
    {editable && (
      <Pencil className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
    )}
  </div>
);

const Value = ({ value, empty = "Not set" }) =>
  value ? (
    <span className="min-w-0 break-words">{value}</span>
  ) : (
    <span className="text-slate-400">{empty}</span>
  );

/* ── Editable email row (OTP flow) ───────────────────────────────── */
const EmailRow = ({
  value,
  isEditing,
  onRequestOTP,
  onVerifyOTP,
  isRequesting,
  isVerifying,
  error,
  onDismissError,
  editable = false,
  onStartEdit,
  inputRef,
}) => {
  const [step, setStep] = useState(1); // 1 = Request, 2 = Verify
  const [draft, setDraft] = useState("");
  const [otp, setOtp] = useState("");
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (isEditing) {
      setDraft(value || "");
      setStep(1);
      setOtp("");
      setSuccessMsg("");
      onDismissError();
    }
  }, [isEditing]);

  useEffect(() => {
    if (step !== 2) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);

  const trimmed = draft.trim().toLowerCase();
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  const unchanged = trimmed === (value || "").trim().toLowerCase();
  const canRequest = isValidEmail && !unchanged && !isRequesting;

  const canVerify = otp.length === 6 && !isVerifying;

  const handleRequest = (e) => {
    e.preventDefault();
    if (canRequest) {
      onRequestOTP(trimmed, () => {
        setStep(2);
        setTimeLeft(600);
      });
    }
  };

  const handleVerify = (e) => {
    e.preventDefault();
    if (canVerify) {
      onVerifyOTP(otp, () => {
        setStep(1);
        setOtp("");
        setSuccessMsg("Email updated");
        setTimeout(() => setSuccessMsg(""), 3000);
      });
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!isEditing) {
    return (
      <Field
        className="sm:col-span-2"
        icon={Mail}
        tone="violet"
        label="Login email"
        editable={editable}
        onClick={editable ? onStartEdit : undefined}
        title={editable ? "Edit login email" : undefined}
      >
        <Value value={value} />
      </Field>
    );
  }

  const feedback = error ? (
    <span className="text-red-600">{error}</span>
  ) : successMsg ? (
    <span className="text-emerald-700">{successMsg}</span>
  ) : step === 2 ? (
    <span className="tabular-nums">
      {timeLeft > 0 ? `Code expires in ${formatTime(timeLeft)}` : "Code expired"}
    </span>
  ) : (
    "Changing your login email needs a verification code"
  );

  return (
    <Field
      className="sm:col-span-2"
      icon={Mail}
      tone="violet"
      label={step === 1 ? "Login email" : "Verification code"}
      hint={feedback}
    >
      {step === 1 ? (
        <form onSubmit={handleRequest} className="flex w-full items-center gap-2">
          <input
            ref={inputRef}
            type="email"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="name@company.com"
            className={inputCls}
          />
          <button
            type="submit"
            disabled={!canRequest}
            className={`${btnSecondary} shrink-0`}
          >
            {isRequesting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Send code
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="flex w-full items-center gap-2">
          <input
            type="text"
            autoFocus
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="000000"
            className={`${inputCls} font-mono tracking-[0.3em] tabular-nums`}
            disabled={timeLeft === 0}
          />
          {timeLeft === 0 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`${btnSecondary} shrink-0`}
            >
              Resend
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canVerify}
              className={`${btnSecondary} shrink-0`}
            >
              {isVerifying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Verify
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setStep(1);
              onDismissError();
            }}
            title="Back"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </form>
      )}
    </Field>
  );
};

/* ── Skills multi-select ─────────────────────────────────────────── */
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
      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selected.map((skill) => (
            <span
              key={skill}
              className="inline-flex h-7 items-center gap-1 rounded-md bg-slate-100 pl-2.5 pr-1 text-[13px] text-slate-800"
            >
              {skill}
              <button
                type="button"
                onClick={() => toggle(skill)}
                title={`Remove ${skill}`}
                className="flex h-5 w-5 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-2.5 text-[13px] text-slate-400 transition-colors hover:border-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
      >
        <span>Add or remove skills</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className={`absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border ${hairline} bg-white py-1 shadow-lg`}
        >
          {isLoading ? (
            <div className="p-3 text-center text-[13px] text-slate-400">
              Loading skills
            </div>
          ) : (
            options.map((skill) => {
              const isSelected = selected.includes(skill.name);
              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => toggle(skill.name)}
                  className={`flex h-8 w-full items-center gap-2 px-3 text-left text-[13px] transition-colors ${
                    isSelected
                      ? "bg-slate-50 text-slate-900"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </span>
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

/* ══════════════════════════════════════════════════════════════════
 PROFILE PAGE
 ══════════════════════════════════════════════════════════════════ */
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

const fmtDate = (value) =>
  value ? format(parseISO(String(value).split("T")[0]), "dd MMM yyyy") : null;

const ProfilePage = () => {
  const queryClient = useQueryClient();
  const localUser = JSON.parse(localStorage.getItem("user") || "{}");

  /* ── Queries ────────────────────────────────────────────────── */
  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ["auth-me"],
    queryFn: authApi.me,
  });

  const employeeId = account?.employee_id || localUser.employee_id;

  const { data: employee, isLoading: employeeLoading } = useQuery({
    queryKey: ["employee-profile", employeeId],
    queryFn: () => employeeApi.getOne(employeeId),
    enabled: !!employeeId,
  });

  const { data: skillsList = [], isLoading: skillsLoading } = useQuery({
    queryKey: ["skills-list"],
    queryFn: () => skillsApi.getAll(),
  });

  const isLoading = accountLoading || employeeLoading;

  /* ── Cover (per-viewer preference, stored locally) ─────────── */
  const [coverId, setCoverId] = useState(() => {
    try {
      return localStorage.getItem(COVER_KEY) || DEFAULT_COVER_ID;
    } catch {
      return DEFAULT_COVER_ID;
    }
  });
  const [coverOpen, setCoverOpen] = useState(false);
  const [coverTab, setCoverTab] = useState("all");
  const visibleCovers = useMemo(
    () => (coverTab === "all" ? COVERS : COVERS.filter((c) => c.cat === coverTab)),
    [coverTab]
  );
  const coverMenuRef = useRef(null);
  const activeCover = COVERS.find((c) => c.id === coverId) ||
    COVERS.find((c) => c.id === DEFAULT_COVER_ID) ||
    COVERS[0];

  const chooseCover = (id) => {
    setCoverId(id);
    setCoverOpen(false);
    try {
      localStorage.setItem(COVER_KEY, id);
    } catch {
      /* storage unavailable, keep the choice for this session only */
    }
  };

  useEffect(() => {
    if (!coverOpen) return;
    const handler = (e) => {
      if (coverMenuRef.current && !coverMenuRef.current.contains(e.target)) {
        setCoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [coverOpen]);

  /* ── Merged Profile State ───────────────────────────────────── */
  const mergedProfile = {
    name: account?.name || employee?.name || localUser.name,
    email: account?.email || employee?.email || localUser.email,
    phone: formatPhoneNumber(employee?.phone || account?.phone),
    role: account?.role || localUser.role || "employee",
    employeeId: employee?.id || employeeId,
    employeeType: employee?.employee_type,
    designation: employee?.designation,
    status: employee?.status,
    workingHours: employee?.working_hours_per_day,
    weeklyAvailability: employee?.weekly_availability,
    skills: employee?.skills || account?.skills || localUser.skills || [],
    slackUserId: employee?.slack_user_id || "",
    encordId: employee?.encord_id || "",
    razorpayEmail: employee?.razorpay_email || account?.razorpay_email || "",
    dateOfJoining: employee?.date_of_joining || "",
    avatarUrl:
      employee?.avatar_url || account?.avatar_url || localUser.avatar_url || "",
  };

  const isDojLocked = Boolean(
    mergedProfile.dateOfJoining && !["admin", "hr"].includes(mergedProfile.role)
  );

  /* ── Edit Form State ────────────────────────────────────────── */
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSkills, setEditSkills] = useState([]);
  const [editSlackId, setEditSlackId] = useState("");
  const [editEncordId, setEditEncordId] = useState("");
  const [editRazorpayEmail, setEditRazorpayEmail] = useState("");
  const [editDateOfJoining, setEditDateOfJoining] = useState("");

  /* ── Field Focus Management for Single-Click Edit ──────────── */
  const [focusField, setFocusField] = useState(null);
  const nameInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const encordInputRef = useRef(null);
  const razorpayInputRef = useRef(null);
  const slackInputRef = useRef(null);
  const dojInputRef = useRef(null);

  useEffect(() => {
    if (isEditing && focusField) {
      const timer = setTimeout(() => {
        const fieldMap = {
          name: nameInputRef,
          email: emailInputRef,
          phone: phoneInputRef,
          encordId: encordInputRef,
          razorpayEmail: razorpayInputRef,
          slackId: slackInputRef,
          dateOfJoining: dojInputRef,
        };
        const ref = fieldMap[focusField];
        if (ref && ref.current) {
          ref.current.focus();
          if (typeof ref.current.select === "function" && ref.current.type !== "date") {
            ref.current.select();
          }
        }
        setFocusField(null);
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isEditing, focusField]);

  const enterEditMode = (fieldToFocus = null) => {
    setEditName(mergedProfile.name || "");
    setEditPhone(mergedProfile.phone || "");
    setEditSkills([...(mergedProfile.skills || [])]);
    setEditSlackId(mergedProfile.slackUserId || "");
    setEditEncordId(mergedProfile.encordId || "");
    setEditRazorpayEmail(mergedProfile.razorpayEmail || "");
    setEditDateOfJoining(
      mergedProfile.dateOfJoining
        ? String(mergedProfile.dateOfJoining).split("T")[0]
        : ""
    );
    setIsEditing(true);
    if (fieldToFocus) {
      setFocusField(fieldToFocus);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setFocusField(null);
    setEditName("");
    setEditRazorpayEmail("");
    setEditDateOfJoining("");
  };

  /* ── Save Profile Mutation ──────────────────────────────────── */
  const saveMutation = useMutation({
    mutationFn: (data) => employeeApi.update(employeeId, data),
    onSuccess: (updatedEmployee) => {
      // In-memory patch: instant UI update, no network refetch
      queryClient.setQueryData(["employee-profile", employeeId], (old) => ({
        ...old,
        ...updatedEmployee,
      }));
      queryClient.setQueryData(["auth-me"], (old) => {
        if (!old) return old;
        return {
          ...old,
          name: updatedEmployee.name || old.name,
          razorpay_email:
            updatedEmployee.razorpay_email !== undefined
              ? updatedEmployee.razorpay_email
              : old.razorpay_email,
        };
      });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setIsEditing(false);
      toast.success("Profile saved");
    },
    onError: (err) => {
      const errorMsg = err?.response?.data?.detail || "Could not save changes";
      toast.error(errorMsg);
    },
  });

  const handleSave = () => {
    const payload = {
      name: editName.trim() || undefined,
      phone: editPhone || null,
      skills: editSkills,
      slack_user_id: editSlackId || null,
      encord_id: editEncordId || null,
      razorpay_email: editRazorpayEmail?.trim() ? editRazorpayEmail.trim().toLowerCase() : null,
    };

    // A locked joining date is omitted so the backend does not reject the update
    if (!isDojLocked && editDateOfJoining?.trim()) {
      payload.date_of_joining = editDateOfJoining.trim();
    }

    saveMutation.mutate(payload);
  };

  /* ── Email Change Mutation ──────────────────────────────────── */
  const [emailError, setEmailError] = useState("");

  const requestEmailChangeMutation = useMutation({
    mutationFn: (newEmail) => employeeApi.requestEmailChange(employeeId, newEmail),
    onSuccess: () => {
      setEmailError("");
      toast.success("Verification code sent to your new email");
    },
    onError: (err) => {
      const msg = err?.response?.data?.detail || "Could not send the code";
      setEmailError(msg);
      toast.error(msg);
    },
  });

  const verifyEmailChangeMutation = useMutation({
    mutationFn: (otp) => employeeApi.verifyEmailChange(employeeId, otp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
      queryClient.invalidateQueries({ queryKey: ["employee-profile", employeeId] });
      setEmailError("");
      toast.success("Login email updated");
    },
    onError: (err) => {
      const msg = err?.response?.data?.detail || "Invalid or expired code";
      setEmailError(msg);
      toast.error(msg);
    },
  });

  const handleRequestOTP = (newEmail, nextStep) => {
    requestEmailChangeMutation.mutate(newEmail, { onSuccess: nextStep });
  };

  const handleVerifyOTP = (otp, closeEditor) => {
    verifyEmailChangeMutation.mutate(otp, { onSuccess: closeEditor });
  };

  /* ── Avatar Mutations & Handlers ────────────────────────────── */
  const fileInputRef = useRef(null);
  const [avatarError, setAvatarError] = useState("");

  const onAvatarSuccess = (msg) => {
    queryClient.invalidateQueries({ queryKey: ["employee-profile", employeeId] });
    queryClient.invalidateQueries({ queryKey: ["auth-me"] });
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    setAvatarError("");
    toast.success(typeof msg === "string" ? msg : "Photo updated");
  };

  const uploadAvatarMutation = useMutation({
    mutationFn: (formData) => employeeApi.uploadAvatar(employeeId, formData),
    onSuccess: () => onAvatarSuccess("Photo uploaded"),
    onError: (err) => {
      const msg = err?.response?.data?.detail || "Upload failed";
      setAvatarError(msg);
      toast.error(msg);
    },
  });

  const slackAvatarMutation = useMutation({
    mutationFn: () => employeeApi.setAvatarFromSlack(employeeId),
    onSuccess: () => onAvatarSuccess("Photo synced from Slack"),
    onError: (err) => {
      const msg = err?.response?.data?.detail || "Slack sync failed";
      setAvatarError(msg);
      toast.error(msg);
    },
  });

  const deleteAvatarMutation = useMutation({
    mutationFn: () => employeeApi.deleteAvatar(employeeId),
    onSuccess: () => onAvatarSuccess("Photo removed"),
    onError: (err) => {
      const msg = err?.response?.data?.detail || "Could not remove photo";
      setAvatarError(msg);
      toast.error(msg);
    },
  });

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Max size 5 MB");
      toast.error("Max photo size is 5 MB");
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

  /* ── Derived view values ───────────────────────────────────── */
  const canEdit = !!employeeId;
  const startEdit = (field) => (canEdit ? () => enterEditMode(field) : undefined);

  const dashboardHref =
    mergedProfile.role === "admin"
      ? `/admin/employees/${employeeId}`
      : mergedProfile.role === "pm"
        ? `/pm/my-team/${employeeId}`
        : "/employee/dashboard";

  const status = (mergedProfile.status || "Active").toString();
  const statusIsActive = status.toLowerCase() === "active";

  const editActions = !canEdit ? (
    <span className="text-xs text-slate-400">Read only</span>
  ) : !isEditing ? (
    <button type="button" onClick={() => enterEditMode()} className={btnPrimary}>
      <Pencil className="h-3.5 w-3.5" />
      Edit
    </button>
  ) : (
    <div className="flex items-center gap-2">
      <button type="button" onClick={cancelEdit} className={btnSecondary}>
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSave}
        disabled={saveMutation.isPending}
        className={btnPrimary}
      >
        {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Save
      </button>
    </div>
  );

  const tenure = (() => {
    if (!mergedProfile.dateOfJoining)
      return { value: "—", sub: "Joining date not set" };
    const joined = parseISO(String(mergedProfile.dateOfJoining).split("T")[0]);
    const months = Math.max(0, differenceInCalendarMonths(new Date(), joined));
    const y = Math.floor(months / 12);
    const m = months % 12;
    const value = y > 0 ? `${y}y ${m}m` : months > 0 ? `${months} mo` : "New";
    return { value, sub: `Since ${format(joined, "dd MMM yyyy")}` };
  })();

  const stats = [
    {
      label: "Tenure",
      value: tenure.value,
      sub: tenure.sub,
      icon: CalendarClock,
      tone: "amber",
    },
    {
      label: "Employee type",
      value: mergedProfile.employeeType || "\u2014",
      sub: mergedProfile.designation || "Team member",
      icon: Briefcase,
      tone: "blue",
    },
    {
      label: "Daily capacity",
      value: mergedProfile.workingHours ? `${mergedProfile.workingHours}h` : "\u2014",
      sub: "Per day",
      icon: Clock,
      tone: "emerald",
    },
    {
      label: "Weekly capacity",
      value: mergedProfile.weeklyAvailability ? `${mergedProfile.weeklyAvailability}h` : "\u2014",
      sub: "Per week",
      icon: CalendarDays,
      tone: "violet",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        <p className="mt-3 text-[13px] text-slate-500">Loading profile</p>
      </div>
    );
  }

  return (
    <div className="-mx-4 -my-3 px-3 py-3 sm:-mx-6">
      <style>{`main{scrollbar-width:none}main::-webkit-scrollbar{display:none}`}</style>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={handleAvatarFile}
      />
      <div className="mx-auto w-full max-w-[1400px] space-y-3">

      {/* ── Cover + identity + key figures ───────────────────────── */}
      <section className={`rounded-2xl border ${hairline} bg-white`}>
        <div
          className="relative h-24 rounded-t-2xl"
          style={{ background: activeCover.css }}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-t-2xl">
            <div className="absolute -left-24 top-8 h-80 w-80 rounded-full bg-white/20" />
            <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10" />
          </div>

          <div className="absolute bottom-3 right-3" ref={coverMenuRef}>
            <button
              type="button"
              onClick={() => setCoverOpen((v) => !v)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-white/80 px-3 text-[13px] font-medium text-slate-800 backdrop-blur transition-colors hover:bg-white"
            >
              <Palette className="h-3.5 w-3.5" />
              Change cover
            </button>
            {coverOpen && (
              <div
                className={`absolute right-0 top-full z-30 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border ${hairline} bg-white p-3 shadow-lg`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {COVER_TABS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setCoverTab(t.id)}
                        className={`h-7 rounded-md px-2.5 text-[13px] transition-colors ${
                          coverTab === t.id
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs tabular-nums text-slate-400">
                    {visibleCovers.length}
                  </span>
                </div>
                <div className="grid max-h-64 grid-cols-5 gap-2 overflow-y-auto p-0.5">
                  {visibleCovers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => chooseCover(c.id)}
                      title={c.name}
                      className={`relative h-10 overflow-hidden rounded-md transition-shadow ${
                        c.id === activeCover.id
                          ? "ring-2 ring-slate-900 ring-offset-1"
                          : "ring-1 ring-slate-900/10 hover:ring-slate-900/40"
                      }`}
                      style={{ background: c.css }}
                    >
                      {c.id === activeCover.id && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/10 text-white">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-3 sm:px-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="group relative -mt-16 h-32 w-32 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-4 ring-white shadow-sm">
              <UserAvatar
                src={mergedProfile.avatarUrl}
                name={mergedProfile.name}
                size="h-full w-full text-5xl"
                rounded="rounded-none"
                imgClassName="ring-0"
                fallbackClassName="bg-slate-100 text-slate-500 font-medium ring-0"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarBusy || !employeeId}
                title={!employeeId ? "Linked employee record required" : "Change photo"}
                className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-slate-900/55 text-xs font-medium text-white opacity-0 transition-opacity duration-150 focus-visible:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed"
              >
                {avatarBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    Change photo
                  </>
                )}
              </button>
            </div>

            <div className="min-w-0 flex-1 sm:pt-3 sm:pb-0.5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                    <span className="truncate">{mergedProfile.name || "Employee"}</span>
                    {statusIsActive && (
                      <BadgeCheck
                        className="h-5 w-5 shrink-0 text-blue-600"
                        aria-label="Active"
                      />
                    )}
                  </h1>
                  <p className="mt-0.5 text-sm text-slate-700">
                    {mergedProfile.designation || "Team member"}
                    <span className="mx-2 text-slate-300">/</span>
                    <span className="capitalize text-slate-500">
                      {String(mergedProfile.role).replace(/_/g, " ")}
                    </span>
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate-500">
                    {mergedProfile.email && (
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-4 w-4 text-violet-500" />
                        {mergedProfile.email}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                      <Hash className="h-4 w-4 text-fuchsia-500" />
                      {mergedProfile.employeeId || "—"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 capitalize">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          statusIsActive ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                      />
                      {status}
                    </span>
                    {avatarError && (
                      <span className="text-xs text-red-600">{avatarError}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => slackAvatarMutation.mutate()}
                    disabled={avatarBusy || !employeeId}
                    title="Sync photo from Slack"
                    className={btnSecondary}
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                    Sync with Slack
                  </button>
                  {mergedProfile.avatarUrl && (
                    <button
                      type="button"
                      onClick={() => deleteAvatarMutation.mutate()}
                      disabled={avatarBusy || !employeeId}
                      title="Remove photo"
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  {employeeId && !isEditing && (
                    <Link
                      to={dashboardHref}
                      title="View employee activity dashboard"
                      className={btnSecondary}
                    >
                      View dashboard
                      <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
                    </Link>
                  )}
                  {editActions}
                </div>
              </div>

            </div>
          </div>
        </div>

        <dl className={`mt-0 grid grid-cols-2 border-t ${hairline} xl:grid-cols-4`}>
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`flex items-center gap-3 px-5 py-2.5 ${
                  i % 2 === 1 ? "border-l border-slate-900/[0.08]" : ""
                } ${i > 0 ? "xl:border-l xl:border-slate-900/[0.08]" : ""} ${
                  i >= 2 ? "border-t border-slate-900/[0.08] xl:border-t-0" : ""
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONES[stat.tone].tile}`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <dd className="truncate text-lg font-semibold leading-tight tabular-nums text-slate-900">
                    {stat.value}
                  </dd>
                  <dt className="truncate text-xs text-slate-500">
                    {stat.label}
                    <span className="text-slate-300"> / </span>
                    {stat.sub}
                  </dt>
                </div>
              </div>
            );
          })}
        </dl>
      </section>

      {/* ── Details ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-12">
        <section className={`rounded-2xl border ${hairline} bg-white lg:col-span-7`}>
          <header
            className={`flex h-11 items-center justify-between gap-3 border-b px-5 ${hairline}`}
          >
            <div className="flex min-w-0 items-baseline gap-3">
              <h2 className="text-sm font-semibold text-slate-900">Contact</h2>
              {canEdit && !isEditing && (
                <span className="truncate text-xs text-slate-400">Click a field to edit</span>
              )}
            </div>
            {editActions}
          </header>
          <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
            <Field
              label="Full name"
              icon={User}
              tone="blue"
              editable={canEdit && !isEditing}
              onClick={!isEditing ? startEdit("name") : undefined}
            >
              {isEditing ? (
                <input
                  ref={nameInputRef}
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Full name"
                  className={inputCls}
                />
              ) : (
                <Value value={mergedProfile.name} />
              )}
            </Field>

            <Field
              label="Phone"
              icon={Phone}
              tone="emerald"
              editable={canEdit && !isEditing}
              onClick={!isEditing ? startEdit("phone") : undefined}
            >
              {isEditing ? (
                <input
                  ref={phoneInputRef}
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className={inputCls}
                />
              ) : (
                <span className="tabular-nums">
                  <Value value={mergedProfile.phone} />
                </span>
              )}
            </Field>

            <EmailRow
              value={mergedProfile.email}
              isEditing={isEditing}
              onRequestOTP={handleRequestOTP}
              onVerifyOTP={handleVerifyOTP}
              isRequesting={requestEmailChangeMutation.isPending}
              isVerifying={verifyEmailChangeMutation.isPending}
              error={emailError}
              onDismissError={() => setEmailError("")}
              editable={canEdit}
              onStartEdit={() => canEdit && enterEditMode("email")}
              inputRef={emailInputRef}
            />

            {/* Date of joining: employee can set it once, then Admin/HR only */}
            {isEditing ? (
              isDojLocked ? (
                <Field
                  label="Date of joining"
                  icon={Calendar}
                  tone="amber"
                  hint="Locked. Contact Admin or HR to change it."
                >
                  <span className="flex items-center gap-2 tabular-nums">
                    {fmtDate(mergedProfile.dateOfJoining)}
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                  </span>
                </Field>
              ) : (
                <Field
                  label="Date of joining"
                  icon={Calendar}
                  tone="amber"
                  hint="Use the date in your joining letter"
                >
                  <input
                    ref={dojInputRef}
                    type="date"
                    max={new Date().toISOString().split("T")[0]}
                    value={editDateOfJoining}
                    onChange={(e) => setEditDateOfJoining(e.target.value)}
                    className={inputCls}
                  />
                </Field>
              )
            ) : (
              <Field
                label="Date of joining"
                icon={Calendar}
                tone="amber"
                editable={canEdit && !isDojLocked}
                title={
                  isDojLocked
                    ? "Official joining date is locked. Contact Admin or HR to change it."
                    : undefined
                }
                onClick={
                  isDojLocked
                    ? () =>
                        toast.error(
                          "Official joining date is locked. Contact Admin or HR to change it.",
                          { id: "doj-locked" }
                        )
                    : startEdit("dateOfJoining")
                }
              >
                <span className="tabular-nums">
                  <Value value={fmtDate(mergedProfile.dateOfJoining)} />
                </span>
                {isDojLocked && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded bg-slate-200/70 px-1.5 py-0.5 text-xs text-slate-600">
                    <Lock className="h-3 w-3" />
                    Locked
                  </span>
                )}
              </Field>
            )}

            <Field
              label="Slack member ID"
              icon={Hash}
              tone="fuchsia"
              editable={canEdit && !isEditing}
              onClick={!isEditing ? startEdit("slackId") : undefined}
            >
              {isEditing ? (
                <input
                  ref={slackInputRef}
                  type="text"
                  value={editSlackId}
                  onChange={(e) => setEditSlackId(e.target.value)}
                  placeholder="U0123ABC456"
                  className={`${inputCls} font-mono`}
                />
              ) : (
                <span className="font-mono text-sm">
                  <Value value={mergedProfile.slackUserId} />
                </span>
              )}
            </Field>

            <Field
              label="Razorpay email"
              icon={CreditCard}
              tone="sky"
              editable={canEdit && !isEditing}
              onClick={!isEditing ? startEdit("razorpayEmail") : undefined}
            >
              {isEditing ? (
                <input
                  ref={razorpayInputRef}
                  type="email"
                  value={editRazorpayEmail}
                  onChange={(e) => setEditRazorpayEmail(e.target.value)}
                  placeholder="name@company.com"
                  className={inputCls}
                />
              ) : (
                <Value value={mergedProfile.razorpayEmail} />
              )}
            </Field>

            <Field
              label="Encord ID"
              icon={Fingerprint}
              tone="rose"
              editable={canEdit && !isEditing}
              onClick={!isEditing ? startEdit("encordId") : undefined}
            >
              {isEditing ? (
                <input
                  ref={encordInputRef}
                  type="text"
                  value={editEncordId}
                  onChange={(e) => setEditEncordId(e.target.value)}
                  placeholder="name@company.com"
                  className={inputCls}
                />
              ) : (
                <Value value={mergedProfile.encordId} />
              )}
            </Field>
          </div>
        </section>

        <div className="space-y-3 lg:col-span-5">
          <section className={`rounded-2xl border ${hairline} bg-white`}>
            <header className={`flex h-11 items-center border-b px-5 ${hairline}`}>
              <h2 className="text-sm font-semibold text-slate-900">Employment</h2>
            </header>
            <div className="grid grid-cols-2 gap-2 p-3">
              <Field label="System role" icon={ShieldCheck} tone="blue">
                <span className="capitalize">
                  {String(mergedProfile.role).replace(/_/g, " ")}
                </span>
              </Field>
              <Field label="Designation" icon={Briefcase} tone="violet">
                <Value value={mergedProfile.designation} />
              </Field>
              <Field label="Registered" icon={CalendarDays} tone="sky">
                <span className="tabular-nums">
                  <Value value={fmtDate(employee?.created_at)} empty="—" />
                </span>
              </Field>
              {(employee?.employee_type === "Full-time" ||
                employee?.converted_to_fulltime_at) && (
                <Field label="Full-time since" icon={Award} tone="amber">
                  <span className="tabular-nums">
                    {employee?.converted_to_fulltime_at
                      ? fmtDate(employee.converted_to_fulltime_at)
                      : "Direct hire"}
                  </span>
                </Field>
              )}
            </div>
          </section>

          <section className={`rounded-2xl border ${hairline} bg-white`}>
            <header className={`flex h-11 items-center border-b px-5 ${hairline}`}>
              <h2 className="text-sm font-semibold text-slate-900">Skills</h2>
            </header>
            <div className="px-5 py-4">
              {isEditing ? (
                <SkillsMultiSelect
                  selected={editSkills}
                  onChange={setEditSkills}
                  options={skillsList}
                  isLoading={skillsLoading}
                />
              ) : mergedProfile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {mergedProfile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex h-7 items-center rounded-md bg-slate-100 px-2.5 text-[13px] text-slate-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No skills assigned</p>
              )}
            </div>
          </section>
        </div>
      </div>
      </div>
    </div>
  );
};

export default ProfilePage;
