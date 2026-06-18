import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Lock, Mail } from 'lucide-react';
import { authApi } from '../../services/api';
import toast from 'react-hot-toast';
import AuthBrandPanel from '../../components/brand/AuthBrandPanel';

const PMLogin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/pm/dashboard';

    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState(null);

    const loginMutation = useMutation({
        mutationFn: (creds) => authApi.login({ ...creds, portal: 'pm' }),
        onSuccess: (data) => {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('role', data.user.role);
            toast.success('Signed in successfully');
            navigate(from, { replace: true });
        },
        onError: (err) => {
            const message = err.response?.data?.detail || 'Invalid credentials.';
            setError(message);
            toast.error(message);
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        setError(null);
        if (!formData.email || !formData.password) {
            const message = 'Please fill in all fields';
            setError(message);
            toast.error(message);
            return;
        }
        loginMutation.mutate(formData);
    };

    return (
        <div className="min-h-screen flex bg-slate-50">
            <AuthBrandPanel
                accent="pm"
                eyebrow="Project Leadership"
                title="Lead delivery with a sharper Autonex flow."
                description="Manage project execution, team visibility, and workload balance through a more cohesive portal experience."
                highlights={[
                    { title: 'Project Oversight', copy: 'See workstreams, allocations, and progress in one consistent system.' },
                    { title: 'Team Direction', copy: 'Guide your team with clearer structure and better brand presence.' },
                ]}
            />

            <div className="flex flex-1 flex-col items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.14),_transparent_32%),linear-gradient(180deg,#eff6ff_0%,#f8fafc_100%)] p-8">
                <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white/95 p-8 shadow-[0_25px_80px_rgba(15,23,42,0.12)] backdrop-blur">
                    <div className="mb-8 text-center">
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Project Manager Login</h2>
                        <p className="mt-2 text-sm text-slate-500">Sign in to manage your projects</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-center text-sm font-medium text-red-600">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Work Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="pm@company.com"
                                    className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    disabled={loginMutation.isPending}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    disabled={loginMutation.isPending}
                                />
                            </div>
                            <div className="mt-2 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => navigate('/forgot-password?role=pm')}
                                    className="text-xs font-medium text-blue-600 hover:underline"
                                >
                                    Forgot password?
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loginMutation.isPending}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#123fa9] px-4 py-3 font-semibold text-white shadow-[0_16px_38px_rgba(18,63,169,0.26)] transition-all hover:bg-[#0f348a] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {loginMutation.isPending ? (
                                <span className="flex items-center gap-2">
                                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    Signing in...
                                </span>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-slate-400">
                        Not a PM?{' '}
                        <button onClick={() => navigate('/login/employee')} className="font-medium text-blue-600 hover:underline">
                            Employee Portal
                        </button>
                        <div className="mt-2">
                            Need admin access?{' '}
                            <button onClick={() => navigate('/login/admin')} className="font-medium text-blue-600 hover:underline">
                                Admin Login
                            </button>
                        </div>
                    </div>
                </div>

                <p className="mt-8 text-center text-xs text-slate-400">
                    © {new Date().getFullYear()} Autonex Inc. • PM Portal
                </p>
            </div>
        </div>
    );
};

export default PMLogin;
