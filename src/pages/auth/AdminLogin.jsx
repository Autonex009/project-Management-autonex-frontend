import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Lock, Mail, AlertCircle } from 'lucide-react';
import { authApi } from '../../services/api';
import toast from 'react-hot-toast';
import AuthBrandPanel from '../../components/brand/AuthBrandPanel';

const AdminLogin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/admin/dashboard';

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState(null);

    const loginMutation = useMutation({
        mutationFn: (credentials) => authApi.login({ ...credentials, portal: 'admin' }),
        onSuccess: (data) => {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('role', data.user.role);
            toast.success('Signed in successfully');
            navigate(from, { replace: true });
        },
        onError: (err) => {
            const message = err.response?.data?.detail || 'Invalid email or password. Please try again.';
            setError(message);
            toast.error(message);
        }
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
        <div className="min-h-screen flex w-full font-sans bg-slate-950 text-slate-200">
            <AuthBrandPanel
                accent="admin"
                eyebrow="Admin Control"
                title="Operate the whole Autonex ecosystem."
                description="A cleaner, more branded command surface for planning workforce capacity, project flow, and delivery health."
                highlights={[
                    { title: 'System Oversight', copy: 'Control projects, people, leaves, and allocations from one place.' },

                ]}
            />

            <div className="relative flex flex-1 flex-col items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(30,64,175,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] p-8">
                <div className="absolute right-0 top-0 flex gap-4 p-8">
                    <button onClick={() => navigate('/login/pm')} className="text-sm text-slate-400 transition-colors hover:text-white">
                        PM Portal →
                    </button>
                    <button onClick={() => navigate('/login/employee')} className="text-sm text-slate-400 transition-colors hover:text-white">
                        Employee Portal →
                    </button>
                </div>

                <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-950/70 p-8 shadow-[0_25px_80px_rgba(2,6,23,0.55)] backdrop-blur-xl">
                    <div className="mb-8 text-center">
                        <h2 className="text-2xl font-bold tracking-tight text-white">Admin Console</h2>
                        <p className="mt-2 text-sm text-slate-500">Authenticate to continue</p>
                    </div>

                    {error && (
                        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-900/30 bg-red-950/40 p-3 text-sm text-red-300">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Email Address</label>
                            <div className="group relative">
                                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-blue-400" />
                                <input
                                    type="email"
                                    className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 py-3 pl-10 pr-4 text-sm text-slate-100 outline-none transition-all placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="name@company.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Password</label>
                            <div className="group relative">
                                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-blue-400" />
                                <input
                                    type="password"
                                    className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 py-3 pl-10 pr-4 text-sm text-slate-100 outline-none transition-all placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end pt-1">
                                <button
                                    type="button"
                                    onClick={() => navigate('/forgot-password?role=admin')}
                                    className="text-xs font-medium text-blue-300 transition-colors hover:text-blue-200 hover:underline"
                                >
                                    Forgot password?
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loginMutation.isPending}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#103ea8] via-[#1c4fd1] to-[#2b67ff] px-4 py-3 font-semibold text-white shadow-[0_18px_40px_rgba(29,78,216,0.35)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loginMutation.isPending ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 border-t border-white/5 pt-6 text-center">
                        <p className="text-xs text-slate-600">
                            Demo Access:
                            <span className="ml-2 font-mono text-slate-400">admin@autonex.com</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
