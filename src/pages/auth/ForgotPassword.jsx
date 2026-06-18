import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Mail, Send } from 'lucide-react';
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
        title: 'Recover admin access',
        eyebrow: 'Admin Recovery',
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
        title: 'Reset your PM password',
        eyebrow: 'PM Recovery',
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
        title: 'Reset your workspace password',
        eyebrow: 'Employee Recovery',
        backTo: '/login/employee',
    },
};

const ForgotPassword = () => {
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState('');
    const theme = useMemo(() => themeMap[searchParams.get('role')] || themeMap.employee, [searchParams]);

    const forgotPasswordMutation = useMutation({
        mutationFn: (payload) => authApi.forgotPassword(payload),
        onSuccess: (data) => toast.success(data.message),
        onError: (error) => {
            const message = error.response?.data?.detail || 'Unable to send reset instructions right now.';
            toast.error(message);
        },
    });

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!email.trim()) {
            toast.error('Please enter your email address');
            return;
        }
        forgotPasswordMutation.mutate({ email: email.trim() });
    };

    return (
        <div className="min-h-screen flex">
            <AuthBrandPanel
                accent={theme.accent}
                eyebrow={theme.eyebrow}
                title={theme.title}
                description="Enter your work email and we'll send a secure password reset link to your inbox."
                highlights={[
                    { title: 'Email Delivery', copy: 'Reset links are sent directly to your registered email address.' },
                    { title: '15-Minute Window', copy: 'Each link is short-lived and invalidated after use.' },
                ]}
            />

            <div className={`flex flex-1 items-center justify-center p-8 ${theme.shell}`}>
                <div className={`w-full max-w-md rounded-[28px] border p-8 shadow-[0_25px_80px_rgba(15,23,42,0.12)] backdrop-blur ${theme.card}`}>
                    <Link to={theme.backTo} className={`inline-flex items-center gap-2 text-sm font-medium ${theme.link}`}>
                        <ArrowLeft className="h-4 w-4" />
                        Back to sign in
                    </Link>

                    <div className="mt-6">
                        <h1 className="text-2xl font-bold tracking-tight">Forgot password?</h1>
                        <p className={`mt-2 text-sm ${theme.helper}`}>
                            We’ll look up your account and send a password reset link to your registered email address.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                        <div>
                            <label className={`mb-1.5 block text-sm font-medium ${theme.label}`}>Work Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder="you@company.com"
                                    className={`w-full rounded-2xl border py-3 pl-11 pr-4 text-sm outline-none transition-all focus:ring-2 ${theme.input}`}
                                    disabled={forgotPasswordMutation.isPending}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={forgotPasswordMutation.isPending}
                            className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-70 ${theme.button}`}
                        >
                            {forgotPasswordMutation.isPending ? (
                                <>
                                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    Sending reset link...
                                </>
                            ) : (
                                <>
                                    Send reset link
                                    <Send className="h-4 w-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className={`mt-6 border-t pt-5 text-sm ${theme.border}`}>
                        <p className={theme.helper}>
                            For security, the response stays generic even if the email address is not found.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
