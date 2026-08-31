import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Button from "../../components/ui/Button";
import UserAvatar from "../../components/ui/UserAvatar";
import { authApi, employeeApi, skillsApi } from "../../services/api";
import {
  BadgeCheck,
  Briefcase,
  Check,
  ChevronDown,
  Clock3,
  Hash,
  Mail,
  Pencil,
  Phone,
  ShieldCheck,
  UserRound,
  X,
  Camera,
  Trash2,
  Loader2,
  MessageSquare,
  Sparkles,
  Building2,
  Save,
} from "lucide-react";

/* ── Inline Field Item ───────────────────────────────────────────── */
const CompactField = ({ icon: Icon, label, value, color = "emerald" }) => {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    violet: "bg-violet-50 text-violet-600 border-violet-100",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 transition-all hover:bg-white hover:border-slate-300 hover:shadow-xs">
      <div className={`rounded-lg border p-2 shrink-0 ${colors[color] || colors.emerald}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="break-all text-xs font-semibold text-slate-800">
          {value || "—"}
        </p>
      </div>
    </div>
  );
};

/* ── Editable Email Inline Card ─────────────────────────────────── */
const EmailCard = ({ value, isEditing, onRequestOTP, onVerifyOTP, isRequesting, isVerifying, error, onDismissError }) => {
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
        setSuccessMsg("Email successfully updated!");
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
    return <CompactField icon={Mail} label="Login Email" value={value} />;
  }

  return (
    <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50/30 p-2.5 flex flex-col justify-center">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
          {step === 1 ? "Login Email" : "Verify OTP"}
        </p>
        {step === 2 && (
          <button type="button" onClick={() => { setStep(1); onDismissError(); }} className="text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      
      {step === 1 ? (
        <form onSubmit={handleRequest} className="flex items-center gap-1.5">
          <input
            type="email"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="new@example.com"
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-500"
          />
          <Button variant="success" size="sm" type="submit" disabled={!canRequest} isLoading={isRequesting} className="px-2.5 py-1 text-[10px] h-auto whitespace-nowrap">
            Send OTP
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              autoFocus
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="000000"
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs tracking-widest text-center outline-none focus:border-emerald-500"
              disabled={timeLeft === 0}
            />
            <Button variant="success" size="sm" type="submit" disabled={!canVerify || timeLeft === 0} isLoading={isVerifying} className="px-2.5 py-1 text-[10px] h-auto whitespace-nowrap">
              Verify
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-medium text-slate-500">
              {timeLeft > 0 ? `Expires in ${formatTime(timeLeft)}` : "Expired."}
            </p>
            {timeLeft === 0 && (
              <button type="button" onClick={() => setStep(1)} className="text-[9px] font-bold text-emerald-600 hover:text-emerald-700 underline">
                Resend
              </button>
            )}
          </div>
        </form>
      )}
      {error && <p className="mt-1 text-[9px] font-medium text-rose-600 leading-tight">{error}</p>}
      {successMsg && <p className="mt-1 text-[9px] font-medium text-emerald-600 leading-tight">{successMsg}</p>}
    </div>
  );
};

/* ── Skills Multi-Select Inline Component ────────────────────────── */
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
            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800"
          >
            {skill}
            <button
              type="button"
              onClick={() => toggle(skill)}
              className="rounded text-emerald-600 hover:bg-emerald-200 hover:text-emerald-900"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-300 focus:outline-none"
      >
        <span className="text-slate-400">Add or remove skills…</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {isLoading ? (
            <div className="p-3 text-center text-xs text-slate-400">Loading skills…</div>
          ) : (
            options.map((skill) => {
              const isSelected = selected.includes(skill.name);
              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => toggle(skill.name)}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                    isSelected ? "bg-emerald-50 font-semibold text-emerald-800" : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${
                      isSelected ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300"
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

/* ══════════════════════════════════════════════════════════════════
 MAIN HIGH-DENSITY PROFILE PAGE
 ══════════════════════════════════════════════════════════════════ */
const ProfilePage = () => {
  const queryClient = useQueryClient();
  const localUser = JSON.parse(localStorage.getItem("user") || "{}");
  const employeeId = localUser.employee_id;

  /* ── Queries ────────────────────────────────────────────────── */
  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ["auth-me"],
    queryFn: authApi.me,
  });

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
    avatarUrl:
      employee?.avatar_url || account?.avatar_url || localUser.avatar_url || "",
  };

  /* ── Edit Form State ────────────────────────────────────────── */
  const [isEditing, setIsEditing] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [editSkills, setEditSkills] = useState([]);
  const [editSlackId, setEditSlackId] = useState("");
  const [editEncordId, setEditEncordId] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const enterEditMode = () => {
    setEditPhone(mergedProfile.phone || "");
    setEditSkills([...(mergedProfile.skills || [])]);
    setEditSlackId(mergedProfile.slackUserId || "");
    setEditEncordId(mergedProfile.encordId || "");
    setSaveError("");
    setSaveSuccess(false);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setSaveError("");
  };

  /* ── Save Profile Mutation ──────────────────────────────────── */
  const saveMutation = useMutation({
    mutationFn: (data) => employeeApi.update(employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-profile", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
      setIsEditing(false);
      setSaveError("");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (err) => {
      setSaveError(err?.response?.data?.detail || "Failed to save changes.");
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      phone: editPhone || null,
      skills: editSkills,
      slack_user_id: editSlackId || null,
      encord_id: editEncordId || null,
    });
  };

  /* ── Email Change Mutation ──────────────────────────────────── */
  const [emailError, setEmailError] = useState("");

  const requestEmailChangeMutation = useMutation({
    mutationFn: (newEmail) => employeeApi.requestEmailChange(employeeId, newEmail),
    onSuccess: () => {
      setEmailError("");
    },
    onError: (err) => {
      setEmailError(err?.response?.data?.detail || "Could not send OTP.");
    },
  });

  const verifyEmailChangeMutation = useMutation({
    mutationFn: (otp) => employeeApi.verifyEmailChange(employeeId, otp),
    onSuccess: (updated) => {
      try {
        const cached = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem("user", JSON.stringify({ ...cached, email: updated.email || updated.new_email }));
      } catch {}
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
      queryClient.invalidateQueries({ queryKey: ["employee-profile", employeeId] });
      setEmailError("");
    },
    onError: (err) => {
      setEmailError(err?.response?.data?.detail || "Invalid or expired OTP.");
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

  const onAvatarSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["employee-profile", employeeId] });
    queryClient.invalidateQueries({ queryKey: ["auth-me"] });
    setAvatarError("");
  };

  const uploadAvatarMutation = useMutation({
    mutationFn: (formData) => employeeApi.uploadAvatar(employeeId, formData),
    onSuccess: onAvatarSuccess,
    onError: (err) => setAvatarError(err?.response?.data?.detail || "Upload failed."),
  });

  const slackAvatarMutation = useMutation({
    mutationFn: () => employeeApi.setAvatarFromSlack(employeeId),
    onSuccess: onAvatarSuccess,
    onError: (err) => setAvatarError(err?.response?.data?.detail || "Slack sync failed."),
  });

  const deleteAvatarMutation = useMutation({
    mutationFn: () => employeeApi.deleteAvatar(employeeId),
    onSuccess: onAvatarSuccess,
    onError: (err) => setAvatarError(err?.response?.data?.detail || "Delete failed."),
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

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-6">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-2 text-xs font-semibold text-slate-400">Loading Profile Details...</p>
        </div>
      ) : (
        <>
          {/* Notifications / Alerts */}
          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 shadow-xs">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" /> Details saved successfully!
            </div>
          )}
          {saveError && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-800 shadow-xs">
              <X className="h-4 w-4 text-rose-600 shrink-0" /> {saveError}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
             TOP HERO BANNER & PROFILE CARD HEADER
             ════════════════════════════════════════════════════════ */}
          <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
            {/* Header Cover Art Accent */}
            <div className="h-28 bg-gradient-to-r from-[#0b6f4a] via-[#0d7b52] to-[#0f8a5a] px-6 pt-4 text-white">
              <div className="flex justify-between items-start">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1 text-[11px] font-semibold text-emerald-100 backdrop-blur-md">
                  <Building2 className="h-3.5 w-3.5" /> AutoNex AI 360
                </span>
              </div>
            </div>

            {/* Profile Avatar & Info Overlay Header */}
            <div className="px-6 pb-6 pt-0">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-14">
                
                {/* ENLARGED PROFILE IMAGE CONTAINER */}
                <div className="relative h-44 w-44 sm:h-52 sm:w-52 shrink-0 rounded-2xl border-4 border-white bg-slate-100 shadow-md ring-1 ring-slate-200 group overflow-hidden">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="hidden"
                    onChange={handleAvatarFile}
                  />

                  {/* Profile Image View */}
                  <UserAvatar
                    src={mergedProfile.avatarUrl}
                    name={mergedProfile.name}
                    className="h-full w-full object-cover"
                    fallbackClassName="bg-emerald-700 text-white font-black text-6xl h-full w-full flex items-center justify-center"
                    imgClassName="h-full w-full object-cover"
                  />

                  {/* Quick Change Overlay Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarBusy}
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/65 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 disabled:cursor-not-allowed"
                  >
                    {avatarBusy ? (
                      <Loader2 className="h-8 w-8 animate-spin" />
                    ) : (
                      <>
                        <Camera className="h-7 w-7" />
                        <span className="mt-1.5 text-xs font-bold uppercase tracking-wider">
                          Change Photo
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* Main Hero Header Info */}
                <div className="flex-1 text-center sm:text-left min-w-0 mb-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                    <div>
                      <h1 className="text-2xl font-black tracking-tight text-slate-900">
                        {mergedProfile.name || "Employee Profile"}
                      </h1>
                      <p className="text-sm font-semibold text-slate-500 flex items-center justify-center sm:justify-start gap-1.5 mt-0.5">
                        <span>{mergedProfile.designation || "Team Member"}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-400 capitalize">{mergedProfile.role}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-center sm:justify-end gap-1.5 mt-2 sm:mt-0">
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 capitalize">
                        ● {mergedProfile.status || "Active"}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        ID: {mergedProfile.employeeId || "—"}
                      </span>
                    </div>
                  </div>

                  {/* Photo Action Bar */}
                  <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <button
                      type="button"
                      onClick={() => slackAvatarMutation.mutate()}
                      disabled={avatarBusy}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50/70 px-2.5 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Sync Slack Photo
                    </button>
                    
                    {mergedProfile.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => deleteAvatarMutation.mutate()}
                        disabled={avatarBusy}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove Photo
                      </button>
                    )}
                    {avatarError && (
                      <span className="text-xs font-medium text-rose-600 ml-1">{avatarError}</span>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════
             MAIN INFORMATION GRID
             ════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* LEFT COLUMN: Contact & System Credentials (6 Cols) */}
            <div className="lg:col-span-6 space-y-4">
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
                
                {/* Header & Edit Action Controls Right Next to Editable Details */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-emerald-600" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Contact & Communication
                    </h2>
                  </div>

                  {/* Contextual Action Button (Placed right where information gets updated) */}
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={enterEditMode}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit Information
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={handleSave}
                        isLoading={saveMutation.isPending}
                        className="inline-flex items-center gap-1"
                      >
                        <Save className="h-3.5 w-3.5" /> Save
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <EmailCard
                    value={mergedProfile.email}
                    isEditing={isEditing}
                    onRequestOTP={handleRequestOTP}
                    onVerifyOTP={handleVerifyOTP}
                    isRequesting={requestEmailChangeMutation.isPending}
                    isVerifying={verifyEmailChangeMutation.isPending}
                    error={emailError}
                    onDismissError={() => setEmailError("")}
                  />

                  {isEditing ? (
                    <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50/30 p-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Phone</p>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="+91 XXXXX XXXXX"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs outline-none focus:border-emerald-500"
                      />
                    </div>
                  ) : (
                    <CompactField icon={Phone} label="Phone Number" value={mergedProfile.phone} />
                  )}

                  {isEditing ? (
                    <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50/30 p-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Encord ID</p>
                      <input
                        type="text"
                        value={editEncordId}
                        onChange={(e) => setEditEncordId(e.target.value)}
                        placeholder="john.encord@example.com"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs outline-none focus:border-emerald-500"
                      />
                    </div>
                  ) : (
                    <CompactField icon={Mail} label="Encord ID" value={mergedProfile.encordId} />
                  )}

                  {isEditing ? (
                    <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50/30 p-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Slack ID</p>
                      <input
                        type="text"
                        value={editSlackId}
                        onChange={(e) => setEditSlackId(e.target.value)}
                        placeholder="U0123ABC456"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs outline-none focus:border-emerald-500"
                      />
                    </div>
                  ) : (
                    <CompactField icon={Hash} label="Slack Member ID" value={mergedProfile.slackUserId} color="violet" />
                  )}
                </div>
              </div>

              {/* Skills Section */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Skills & Competencies
                  </h2>
                </div>

                {isEditing ? (
                  <SkillsMultiSelect
                    selected={editSkills}
                    onChange={setEditSkills}
                    options={skillsList}
                    isLoading={skillsLoading}
                  />
                ) : mergedProfile.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {mergedProfile.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No skills currently assigned.</p>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Employment Details & Work Capacity (6 Cols) */}
            <div className="lg:col-span-6 space-y-4">
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs h-full">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3">
                  <Briefcase className="h-4 w-4 text-blue-600" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Employment Details & Capacity
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <CompactField icon={ShieldCheck} label="System Role" value={mergedProfile.role} color="blue" />
                  <CompactField icon={Briefcase} label="Designation" value={mergedProfile.designation} color="blue" />
                  <CompactField icon={BadgeCheck} label="Employee Type" value={mergedProfile.employeeType} />
                  <CompactField icon={Hash} label="Employee ID" value={mergedProfile.employeeId} />
                  <CompactField
                    icon={Clock3}
                    label="Daily Capacity"
                    value={mergedProfile.workingHours ? `${mergedProfile.workingHours} hrs/day` : null}
                  />
                  <CompactField
                    icon={Clock3}
                    label="Weekly Capacity"
                    value={mergedProfile.weeklyAvailability ? `${mergedProfile.weeklyAvailability} hrs/week` : null}
                  />
                </div>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};

export default ProfilePage;