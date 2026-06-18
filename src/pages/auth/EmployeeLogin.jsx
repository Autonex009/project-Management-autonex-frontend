import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../services/api';
import toast from 'react-hot-toast';
import AuthBrandPanel from '../../components/brand/AuthBrandPanel';

const EmployeeLogin = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
        if (serverError) setServerError('');
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.email) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
        if (!formData.password) newErrors.password = 'Password is required';
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            toast.error(Object.values(newErrors)[0]);
        }
        return Object.keys(newErrors).length === 0;
    };

    const loginMutation = useMutation({
        mutationFn: (creds) => authApi.login({ ...creds, portal: 'employee' }),
        onSuccess: (data) => {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('role', data.user.role);
            toast.success('Signed in successfully');
            navigate('/employee/dashboard');
        },
        onError: (err) => {
            const message = err.response?.data?.detail || 'Invalid credentials.';
            setServerError(message);
            toast.error(message);
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;
        setServerError('');
        loginMutation.mutate({ email: formData.email, password: formData.password });
    };

    return (
        <div className="min-h-screen flex bg-slate-50">
            <AuthBrandPanel
                accent="employee"
                eyebrow="Personal Workspace"
                title="Step into a cleaner Autonex employee experience."
                description="Track your work, manage requests, and move through your daily flow in a portal that now feels unmistakably Autonex."
                highlights={[
                    { title: 'Focused Workspace', copy: 'Projects, leaves, and guidelines come together in a single calmer flow.' },
                ]}
            />

            <div className="flex flex-1 flex-col items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_32%),linear-gradient(180deg,#ecfdf5_0%,#f8fafc_100%)] p-8">
                <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white/95 p-8 shadow-[0_25px_80px_rgba(15,23,42,0.12)] backdrop-blur">
                    <div className="mb-6 text-center lg:text-left">
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Employee Login</h2>
                        <p className="mt-1 text-sm text-slate-500">Sign in to access your workspace</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {serverError && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-center text-sm font-medium text-red-600">
                                {serverError}
                            </div>
                        )}

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Work Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="you@company.com"
                                    className={`w-full rounded-2xl border py-3 pl-11 pr-4 text-sm outline-none transition-all ${errors.email ? 'border-red-300' : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'}`}
                                    disabled={loginMutation.isPending}
                                />
                            </div>
                            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className={`w-full rounded-2xl border py-3 pl-11 pr-4 text-sm outline-none transition-all ${errors.password ? 'border-red-300' : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'}`}
                                    disabled={loginMutation.isPending}
                                />
                            </div>
                            {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={loginMutation.isPending}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow-[0_16px_38px_rgba(5,150,105,0.24)] transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {loginMutation.isPending ? (
                                <span className="flex items-center gap-2">
                                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    Signing in...
                                </span>
                            ) : (
                                <>
                                    Access Workspace
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 space-y-2 text-center">
                        <p className="text-sm text-slate-500">
                            New employee?{' '}
                            <button
                                type="button"
                                onClick={() => navigate('/employee-signup')}
                                className="font-medium text-emerald-600 hover:underline"
                            >
                                Request account access
                            </button>
                        </p>
                        <p className="text-sm text-slate-500">
                            Having trouble?{' '}
                            <button
                                type="button"
                                onClick={() => navigate('/forgot-password?role=employee')}
                                className="font-medium text-emerald-600 hover:underline"
                            >
                                Reset your password
                            </button>
                        </p>
                        <p className="text-sm text-slate-400">
                            Looking for manager access?{' '}
                            <button onClick={() => navigate('/login/pm')} className="font-medium text-emerald-600 hover:underline">
                                PM Login
                            </button>
                        </p>
                        <p className="text-sm text-slate-400">
                            Need admin access?{' '}
                            <button onClick={() => navigate('/login/admin')} className="font-medium text-emerald-600 hover:underline">
                                Admin Login
                            </button>
                        </p>
                    </div>
                </div>

                <p className="mt-8 text-center text-xs text-slate-400">
                    © {new Date().getFullYear()} Autonex Inc. • Employee Portal
                </p>
            </div>
        </div>
    );
};

export default EmployeeLogin;
