import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, KeyRound, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthBrandPanel from '../../components/brand/AuthBrandPanel';
import { authApi } from '../../services/api';

const themeMap = {
    admin: {
        accent: 'admin',
        shell: 'bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]',
        card: 'border-white/10 bg-slate-950/75 text-slate-100',
        input: 'border-slate-800 bg-slate-900/70 text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:ring-blue-500/20',
        button: 'bg-gradient-to-r from-[#103ea8] via-[#1c4fd1] to-[#2b67ff] shadow-[0_18px_40px_rgba(29,78,216,0.35)] hover:brightness-110',
        label: 'text-slate-400',
        helper: 'text-slate-500',
        border: 'border-white/5',
        link: 'text-blue-300 hover:text-blue-200',
        eyebrow: 'Admin Reset',
        title: 'Choose a new admin password',
        backTo: '/login/admin',
    },
    pm: {
        accent: 'pm',
        shell: 'bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.14),_transparent_32%),linear-gradient(180deg,#eff6ff_0%,#f8fafc_100%)]',
        card: 'border-slate-200 bg-white/95 text-slate-900',
        input: 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-100',
        button: 'bg-[#123fa9] shadow-[0_16px_38px_rgba(18,63,169,0.26)] hover:bg-[#0f348a]',
        label: 'text-slate-700',
        helper: 'text-slate-500',
        border: 'border-slate-200',
        link: 'text-blue-600 hover:text-blue-700',
        eyebrow: 'PM Reset',
        title: 'Set a new PM password',
        backTo: '/login/pm',
    },
    employee: {
        accent: 'employee',
        shell: 'bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_32%),linear-gradient(180deg,#ecfdf5_0%,#f8fafc_100%)]',
        card: 'border-slate-200 bg-white/95 text-slate-900',
        input: 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-100',
        button: 'bg-emerald-600 shadow-[0_16px_38px_rgba(5,150,105,0.24)] hover:bg-emerald-700',
        label: 'text-slate-700',
        helper: 'text-slate-500',
        border: 'border-slate-200',
        link: 'text-emerald-600 hover:text-emerald-700',
        eyebrow: 'Workspace Reset',
        title: 'Create a new password',
        backTo: '/login/employee',
    },
};

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isComplete, setIsComplete] = useState(false);
    const theme = useMemo(() => themeMap[searchParams.get('role')] || themeMap.employee, [searchParams]);

    const resetPasswordMutation = useMutation({
        mutationFn: (nextPassword) => authApi.resetPassword(token, { password: nextPassword }),
        onSuccess: (data) => {
            setIsComplete(true);
            toast.success(data.message);
        },
        onError: (error) => {
            const message = error.response?.data?.detail || 'Unable to reset password.';
            toast.error(message);
        },
    });

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!token) {
            toast.error('Reset token is missing from this link');
            return;
        }
        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        resetPasswordMutation.mutate(password);
    };

    return (
        <div className="min-h-screen flex">
            <AuthBrandPanel
                accent={theme.accent}
                eyebrow={theme.eyebrow}
                title={theme.title}
                description="This secure reset page lets you finish the Slack recovery flow and return to your Autonex workspace."
                highlights={[
                    { title: 'Secure Token', copy: 'The reset token is validated against the database before any password update.' },
                    { title: 'One-Time Use', copy: 'Successful resets immediately invalidate the stored token.' },
                ]}
            />

            <div className={`flex flex-1 items-center justify-center p-8 ${theme.shell}`}>
                <div className={`w-full max-w-md rounded-[28px] border p-8 shadow-[0_25px_80px_rgba(15,23,42,0.12)] backdrop-blur ${theme.card}`}>
                    <Link to={theme.backTo} className={`inline-flex items-center gap-2 text-sm font-medium ${theme.link}`}>
                        <ArrowLeft className="h-4 w-4" />
                        Back to sign in
                    </Link>

                    {isComplete ? (
                        <div className="mt-8 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                                <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <h1 className="mt-5 text-2xl font-bold tracking-tight">Password updated</h1>
                            <p className={`mt-2 text-sm ${theme.helper}`}>
                                Your password has been changed successfully. You can sign back in with it now.
                            </p>
                            <Link
                                to={theme.backTo}
                                className={`mt-6 inline-flex items-center justify-center rounded-2xl px-5 py-3 font-semibold text-white transition-all ${theme.button}`}
                            >
                                Return to login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="mt-6">
                                <h1 className="text-2xl font-bold tracking-tight">Reset password</h1>
                                <p className={`mt-2 text-sm ${theme.helper}`}>
                                    Set a new password for your account. Slack reset links expire after 15 minutes.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                                <div>
                                    <label className={`mb-1.5 block text-sm font-medium ${theme.label}`}>New Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(event) => setPassword(event.target.value)}
                                            placeholder="Enter a new password"
                                            className={`w-full rounded-2xl border py-3 pl-11 pr-4 text-sm outline-none transition-all focus:ring-2 ${theme.input}`}
                                            disabled={resetPasswordMutation.isPending}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={`mb-1.5 block text-sm font-medium ${theme.label}`}>Confirm Password</label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(event) => setConfirmPassword(event.target.value)}
                                            placeholder="Re-enter your new password"
                                            className={`w-full rounded-2xl border py-3 pl-11 pr-4 text-sm outline-none transition-all focus:ring-2 ${theme.input}`}
                                            disabled={resetPasswordMutation.isPending}
                                        />
                                    </div>
                                </div>

                                {!token && (
                                    <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-600">
                                        This reset link is missing its token. Request a new Slack reset link.
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={resetPasswordMutation.isPending || !token}
                                    className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-70 ${theme.button}`}
                                >
                                    {resetPasswordMutation.isPending ? (
                                        <>
                                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                            Updating password...
                                        </>
                                    ) : (
                                        'Save new password'
                                    )}
                                </button>
                            </form>

                            <div className={`mt-6 border-t pt-5 text-sm ${theme.border}`}>
                                <p className={theme.helper}>
                                    If this link has expired or already been used, request a fresh reset link from the sign-in page.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
