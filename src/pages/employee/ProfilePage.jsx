import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, employeeApi, skillsApi } from '../../services/api';
import {
    BadgeCheck, Briefcase, Check, ChevronDown, Clock3, Hash,
    Info, Mail, Pencil, Phone, Save, ShieldCheck, UserRound, X,
    Camera, Trash2, Loader2, MessageSquare,
} from 'lucide-react';

/* ── colour accent map for field cards ─────────────────────────── */
const accentClasses = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-600' },
    violet:  { bg: 'bg-violet-50',  text: 'text-violet-600' },
};

/* ── read-only field card ──────────────────────────────────────── */
const FieldCard = ({ icon: Icon, label, value, accent = 'emerald' }) => {
    const tone = accentClasses[accent] || accentClasses.emerald;
    return (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
                <div className={`rounded-xl p-2.5 ${tone.bg}`}>
                    <Icon className={`h-5 w-5 ${tone.text}`} />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{label}</p>
                    <p className="mt-1 break-words text-sm font-medium text-slate-800">{value || 'Not available'}</p>
                </div>
            </div>
        </div>
    );
};

/* ── editable field card (inline input) ────────────────────────── */
const EditableFieldCard = ({ icon: Icon, label, value, onChange, placeholder, accent = 'emerald' }) => {
    const tone = accentClasses[accent] || accentClasses.emerald;
    return (
        <div className="rounded-2xl border-2 border-emerald-200 bg-white p-4 shadow-sm ring-1 ring-emerald-100 transition-all">
            <div className="flex items-start gap-3">
                <div className={`rounded-xl p-2.5 ${tone.bg}`}>
                    <Icon className={`h-5 w-5 ${tone.text}`} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{label}</p>
                    <input
                        type="text"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-sm font-medium text-slate-800 outline-none transition-colors placeholder:text-slate-300 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    />
                </div>
            </div>
        </div>
    );
};

/* ── skills multi-select dropdown ──────────────────────────────── */
const SkillsMultiSelect = ({ selected, onChange, options, isLoading }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    /* close on outside click */
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggle = (skillName) => {
        onChange(
            selected.includes(skillName)
                ? selected.filter((s) => s !== skillName)
                : [...selected, skillName],
        );
    };

    return (
        <div ref={ref} className="relative">
            {/* selected chips */}
            {selected.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                    {selected.map((skill) => (
                        <span
                            key={skill}
                            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                        >
                            {skill}
                            <button
                                type="button"
                                onClick={() => toggle(skill)}
                                className="rounded-full p-0.5 transition-colors hover:bg-emerald-200"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* trigger button */}
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border-2 border-emerald-200 bg-white px-4 py-2.5 text-left text-sm font-medium text-slate-600 shadow-sm transition-all hover:border-emerald-300 hover:shadow focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            >
                <span>{selected.length > 0 ? `${selected.length} skill${selected.length > 1 ? 's' : ''} selected` : 'Select skills…'}</span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* dropdown panel */}
            {open && (
                <div className="absolute left-0 right-0 z-30 mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl animate-in fade-in slide-in-from-top-2">
                    {isLoading ? (
                        <div className="px-4 py-6 text-center text-sm text-slate-400">Loading skills…</div>
                    ) : options.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-slate-400">No skills available</div>
                    ) : (
                        options.map((skill) => {
                            const isSelected = selected.includes(skill.name);
                            return (
                                <button
                                    key={skill.id}
                                    type="button"
                                    onClick={() => toggle(skill.name)}
                                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                                        isSelected
                                            ? 'bg-emerald-50 font-medium text-emerald-800'
                                            : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    <div
                                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                                            isSelected
                                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                                : 'border-slate-300 bg-white'
                                        }`}
                                    >
                                        {isSelected && <Check className="h-3 w-3" />}
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
   PROFILE PAGE
   ══════════════════════════════════════════════════════════════════ */
const ProfilePage = () => {
    const queryClient = useQueryClient();
    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
    const employeeId = localUser.employee_id;

    /* ── data queries ──────────────────────────────────────────── */
    const { data: account, isLoading: accountLoading } = useQuery({
        queryKey: ['auth-me'],
        queryFn: authApi.me,
    });

    const { data: employee, isLoading: employeeLoading } = useQuery({
        queryKey: ['employee-profile', employeeId],
        queryFn: () => employeeApi.getOne(employeeId),
        enabled: !!employeeId,
    });

    const { data: skillsList = [], isLoading: skillsLoading } = useQuery({
        queryKey: ['skills-list'],
        queryFn: skillsApi.getAll,
    });

    const isLoading = accountLoading || employeeLoading;

    /* ── merged display profile ────────────────────────────────── */
    const mergedProfile = {
        name: account?.name || employee?.name || localUser.name,
        email: account?.email || employee?.email || localUser.email,
        phone: employee?.phone || account?.phone,
        role: account?.role || localUser.role || 'employee',
        employeeId: employee?.id || employeeId,
        employeeType: employee?.employee_type,
        designation: employee?.designation,
        status: employee?.status,
        workingHours: employee?.working_hours_per_day,
        weeklyAvailability: employee?.weekly_availability,
        skills: employee?.skills || account?.skills || localUser.skills || [],
        slackUserId: employee?.slack_user_id || '',
        avatarUrl: employee?.avatar_url || account?.avatar_url || localUser.avatar_url || '',
    };

    /* ── edit mode state ───────────────────────────────────────── */
    const [isEditing, setIsEditing] = useState(false);
    const [editPhone, setEditPhone] = useState('');
    const [editSkills, setEditSkills] = useState([]);
    const [editSlackId, setEditSlackId] = useState('');
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);

    /* populate form when entering edit mode */
    const enterEditMode = () => {
        setEditPhone(mergedProfile.phone || '');
        setEditSkills([...(mergedProfile.skills || [])]);
        setEditSlackId(mergedProfile.slackUserId || '');
        setSaveError('');
        setSaveSuccess(false);
        setIsEditing(true);
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setSaveError('');
    };

    /* ── save mutation ─────────────────────────────────────────── */
    const saveMutation = useMutation({
        mutationFn: (data) => employeeApi.update(employeeId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employee-profile', employeeId] });
            queryClient.invalidateQueries({ queryKey: ['auth-me'] });
            setIsEditing(false);
            setSaveError('');
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        },
        onError: (err) => {
            setSaveError(err?.response?.data?.detail || 'Failed to save changes. Please try again.');
        },
    });

    const handleSave = () => {
        saveMutation.mutate({
            phone: editPhone || null,
            skills: editSkills,
            slack_user_id: editSlackId || null,
        });
    };

    /* ── avatar (profile picture) ──────────────────────────────── */
    const fileInputRef = useRef(null);
    const [avatarError, setAvatarError] = useState('');

    const onAvatarSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['employee-profile', employeeId] });
        queryClient.invalidateQueries({ queryKey: ['auth-me'] });
        setAvatarError('');
    };
    const onAvatarError = (err) =>
        setAvatarError(err?.response?.data?.detail || 'Failed to update profile picture.');

    const uploadAvatarMutation = useMutation({
        mutationFn: (formData) => employeeApi.uploadAvatar(employeeId, formData),
        onSuccess: onAvatarSuccess,
        onError: onAvatarError,
    });
    const slackAvatarMutation = useMutation({
        mutationFn: () => employeeApi.setAvatarFromSlack(employeeId),
        onSuccess: onAvatarSuccess,
        onError: onAvatarError,
    });
    const deleteAvatarMutation = useMutation({
        mutationFn: () => employeeApi.deleteAvatar(employeeId),
        onSuccess: onAvatarSuccess,
        onError: onAvatarError,
    });

    const handleAvatarFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setAvatarError('Image is too large (max 5 MB).');
            return;
        }
        const formData = new FormData();
        formData.append('file', file);
        uploadAvatarMutation.mutate(formData);
        e.target.value = '';
    };

    const avatarBusy =
        uploadAvatarMutation.isPending ||
        slackAvatarMutation.isPending ||
        deleteAvatarMutation.isPending;

    /* ── render ─────────────────────────────────────────────────── */
    return (
        <div className="space-y-8">
            {/* ── hero header ───────────────────────────────────── */}
            <section className="overflow-hidden rounded-[28px] border border-emerald-100 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(255,255,255,0.92)_45%,rgba(236,253,245,1))] p-6 shadow-sm">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="group/avatar relative h-20 w-20 shrink-0">
                            {/* hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/gif,image/webp"
                                className="hidden"
                                onChange={handleAvatarFile}
                            />
                            {mergedProfile.avatarUrl ? (
                                <img
                                    src={mergedProfile.avatarUrl}
                                    alt={mergedProfile.name || 'Profile'}
                                    className="h-20 w-20 rounded-3xl object-cover shadow-[0_16px_40px_rgba(5,150,105,0.24)]"
                                />
                            ) : (
                                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-600 text-2xl font-semibold text-white shadow-[0_16px_40px_rgba(5,150,105,0.24)]">
                                    {(mergedProfile.name || 'U').charAt(0)}
                                </div>
                            )}

                            {/* hover overlay to change picture */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={avatarBusy || !employeeId}
                                title="Change profile picture"
                                className="absolute inset-0 flex items-center justify-center rounded-3xl bg-slate-900/55 text-white opacity-0 transition-opacity group-hover/avatar:opacity-100 disabled:cursor-not-allowed"
                            >
                                {avatarBusy ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <Camera className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                        <div>
                            <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">Profile</p>
                            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{mergedProfile.name || 'Employee'}</h1>
                            <p className="mt-1 text-sm text-slate-500">Your account and work details in one place.</p>

                            {/* avatar actions */}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={avatarBusy || !employeeId}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-all hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Camera className="h-3.5 w-3.5" />
                                    Upload photo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => slackAvatarMutation.mutate()}
                                    disabled={avatarBusy || !employeeId}
                                    title="Fetch your photo from Slack"
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 transition-all hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    Use Slack photo
                                </button>
                                {mergedProfile.avatarUrl && (
                                    <button
                                        type="button"
                                        onClick={() => deleteAvatarMutation.mutate()}
                                        disabled={avatarBusy}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition-all hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Remove
                                    </button>
                                )}
                            </div>
                            {avatarError && (
                                <p className="mt-2 text-xs font-medium text-rose-600">{avatarError}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* edit / save / cancel controls */}
                        {!isEditing ? (
                            <button
                                type="button"
                                onClick={enterEditMode}
                                disabled={isLoading || !employeeId}
                                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <Pencil className="h-4 w-4" />
                                Edit Profile
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={cancelEdit}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50"
                                >
                                    <X className="h-4 w-4" />
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={saveMutation.isPending}
                                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-60"
                                >
                                    <Save className="h-4 w-4" />
                                    {saveMutation.isPending ? 'Saving…' : 'Save'}
                                </button>
                            </>
                        )}

                        <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
                            <p><span className="font-semibold text-slate-800">Role:</span> {mergedProfile.role}</p>
                            <p className="mt-1"><span className="font-semibold text-slate-800">Employee ID:</span> {mergedProfile.employeeId || 'Pending'}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── success / error banners ────────────────────────── */}
            {saveSuccess && (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <Check className="h-5 w-5 shrink-0" />
                    Profile updated successfully!
                </div>
            )}
            {saveError && (
                <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <X className="h-5 w-5 shrink-0" />
                    {saveError}
                </div>
            )}

            {isLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
                    Loading profile details...
                </div>
            ) : (
                <>
                    {/* ── info cards grid ────────────────────────── */}
                    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {/* Name — always read-only */}
                        <FieldCard icon={UserRound} label="Full Name" value={mergedProfile.name} />

                        {/* Email — always read-only */}
                        <FieldCard icon={Mail} label="Email" value={mergedProfile.email} />

                        {/* Phone — editable */}
                        {isEditing ? (
                            <EditableFieldCard
                                icon={Phone}
                                label="Phone Number"
                                value={editPhone}
                                onChange={setEditPhone}
                                placeholder="+91 XXXXX XXXXX"
                            />
                        ) : (
                            <FieldCard icon={Phone} label="Phone Number" value={mergedProfile.phone} />
                        )}

                        {/* Role — always read-only */}
                        <FieldCard icon={ShieldCheck} label="Role" value={mergedProfile.role} accent="blue" />

                        {/* Designation — always read-only */}
                        <FieldCard icon={Briefcase} label="Designation" value={mergedProfile.designation} accent="blue" />

                        {/* Status — always read-only */}
                        <FieldCard icon={BadgeCheck} label="Status" value={mergedProfile.status} />

                        {/* Slack User ID — editable */}
                        {isEditing ? (
                            <div className="space-y-3 xl:col-span-2">
                                <EditableFieldCard
                                    icon={Hash}
                                    label="Slack User ID"
                                    value={editSlackId}
                                    onChange={setEditSlackId}
                                    placeholder="e.g. U0123ABC456"
                                    accent="violet"
                                />
                                {/* How-to guide */}
                                <details className="group rounded-2xl border border-violet-100 bg-violet-50/50">
                                    <summary className="flex cursor-pointer items-center gap-2.5 px-4 py-3 text-sm font-medium text-violet-700 select-none [&::-webkit-details-marker]:hidden">
                                        <Info className="h-4 w-4 shrink-0 text-violet-500" />
                                        <span>How to find your Slack User ID</span>
                                        <ChevronDown className="ml-auto h-4 w-4 text-violet-400 transition-transform group-open:rotate-180" />
                                    </summary>
                                    <div className="border-t border-violet-100 px-4 pb-4 pt-3">
                                        <ol className="space-y-2.5 text-sm text-slate-600">
                                            <li className="flex gap-3">
                                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">1</span>
                                                <span>Open <strong className="text-slate-800">Slack</strong> (desktop or web app).</span>
                                            </li>
                                            <li className="flex gap-3">
                                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">2</span>
                                                <span>Click on your <strong className="text-slate-800">profile picture</strong> in the top-right corner, then select <strong className="text-slate-800">Profile</strong>.</span>
                                            </li>
                                            <li className="flex gap-3">
                                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">3</span>
                                                <span>In the profile panel, click the <strong className="text-slate-800">three dots</strong> or <strong className="text-slate-800">More</strong> button.</span>
                                            </li>
                                            <li className="flex gap-3">
                                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">4</span>
                                                <span>Click <strong className="text-slate-800">Copy member ID</strong> and paste it here. It looks like <code className="rounded bg-violet-100 px-1.5 py-0.5 font-mono text-xs text-violet-700">U0123ABC456</code>.</span>
                                            </li>
                                        </ol>
                                    </div>
                                </details>
                            </div>
                        ) : (
                            <FieldCard icon={Hash} label="Slack User ID" value={mergedProfile.slackUserId} accent="violet" />
                        )}
                    </section>

                    {/* ── bottom sections ────────────────────────── */}
                    <section className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
                        {/* work details — always read-only */}
                        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                            <div className="mb-5">
                                <h2 className="text-lg font-semibold text-slate-900">Work Details</h2>
                                <p className="mt-1 text-sm text-slate-500">Employment and availability information connected to your account.</p>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Employee Type</p>
                                    <p className="mt-2 text-sm font-medium text-slate-800">{mergedProfile.employeeType || 'Not available'}</p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Weekly Availability</p>
                                    <p className="mt-2 text-sm font-medium text-slate-800">{mergedProfile.weeklyAvailability ? `${mergedProfile.weeklyAvailability} hours` : 'Not available'}</p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
                                    <div className="flex items-center gap-2">
                                        <Clock3 className="h-4 w-4 text-emerald-600" />
                                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Working Hours Per Day</p>
                                    </div>
                                    <p className="mt-2 text-sm font-medium text-slate-800">{mergedProfile.workingHours ? `${mergedProfile.workingHours} hours/day` : 'Not available'}</p>
                                </div>
                            </div>
                        </div>

                        {/* skills — editable in edit mode */}
                        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                            <div className="mb-5">
                                <h2 className="text-lg font-semibold text-slate-900">Skills</h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    {isEditing
                                        ? 'Select your skills from the approved list below.'
                                        : 'Skills captured in your employee profile.'}
                                </p>
                            </div>

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
                                        <span key={skill} className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                                    No skills have been added to this profile yet.
                                </div>
                            )}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};

export default ProfilePage;
