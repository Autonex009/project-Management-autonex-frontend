import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { authApi, employeeApi } from '../../services/api';
import { BadgeCheck, Briefcase, Clock3, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react';

const accentClasses = {
    emerald: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-600',
    },
    blue: {
        bg: 'bg-blue-50',
        text: 'text-blue-600',
    },
};

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

const ProfilePage = () => {
    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
    const employeeId = localUser.employee_id;

    const { data: account, isLoading: accountLoading } = useQuery({
        queryKey: ['auth-me'],
        queryFn: authApi.me,
    });

    const { data: employee, isLoading: employeeLoading } = useQuery({
        queryKey: ['employee-profile', employeeId],
        queryFn: () => employeeApi.getOne(employeeId),
        enabled: !!employeeId,
    });

    const isLoading = accountLoading || employeeLoading;
    const mergedProfile = {
        name: account?.name || employee?.name || localUser.name,
        email: account?.email || employee?.email || localUser.email,
        phone: account?.phone || employee?.phone,
        role: account?.role || localUser.role || 'employee',
        employeeId: employee?.id || employeeId,
        employeeType: employee?.employee_type,
        designation: employee?.designation,
        status: employee?.status,
        workingHours: employee?.working_hours_per_day,
        weeklyAvailability: employee?.weekly_availability,
        skills: employee?.skills || account?.skills || localUser.skills || [],
    };

    return (
        <div className="space-y-8">
            <section className="overflow-hidden rounded-[28px] border border-emerald-100 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(255,255,255,0.92)_45%,rgba(236,253,245,1))] p-6 shadow-sm">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-600 text-xl font-semibold text-white shadow-[0_16px_40px_rgba(5,150,105,0.24)]">
                            {(mergedProfile.name || 'U').charAt(0)}
                        </div>
                        <div>
                            <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">Profile</p>
                            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{mergedProfile.name || 'Employee'}</h1>
                            <p className="mt-1 text-sm text-slate-500">Your account and work details in one place.</p>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
                        <p><span className="font-semibold text-slate-800">Role:</span> {mergedProfile.role}</p>
                        <p className="mt-1"><span className="font-semibold text-slate-800">Employee ID:</span> {mergedProfile.employeeId || 'Pending'}</p>
                    </div>
                </div>
            </section>

            {isLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
                    Loading profile details...
                </div>
            ) : (
                <>
                    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <FieldCard icon={UserRound} label="Full Name" value={mergedProfile.name} />
                        <FieldCard icon={Mail} label="Email" value={mergedProfile.email} />
                        <FieldCard icon={Phone} label="Phone Number" value={mergedProfile.phone} />
                        <FieldCard icon={ShieldCheck} label="Role" value={mergedProfile.role} accent="blue" />
                        <FieldCard icon={Briefcase} label="Designation" value={mergedProfile.designation} accent="blue" />
                        <FieldCard icon={BadgeCheck} label="Status" value={mergedProfile.status} />
                    </section>

                    <section className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
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

                        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                            <div className="mb-5">
                                <h2 className="text-lg font-semibold text-slate-900">Skills</h2>
                                <p className="mt-1 text-sm text-slate-500">Skills captured in your employee profile.</p>
                            </div>
                            {mergedProfile.skills.length > 0 ? (
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
