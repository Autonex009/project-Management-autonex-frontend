import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { User, Mail, Phone, Briefcase, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { signupRequestApi } from '../services/api';
import AuthBrandPanel from '../components/brand/AuthBrandPanel';

const DESIGNATIONS = [
    'Annotator/ Reviewer',
    'Developer',
    'Program Manager',
    'Quality Analyst',
    'Data Scientist',
    'Other',
];

const EMPLOYEE_TYPES = ['Full-time', 'Part-time', 'Intern', 'Contractor'];

const WORK_CATEGORIES = [
    'Yutori Verifier',
    'Yutori Annotation',
    'Robotics Annotation',
    'Development',
    'Robotics Data Collection',
    'Data Labeling',
    'Quality Review',
    'Smart Factory Development',
];

const EmployeeSignupPage = () => {
    const [form, setForm] = useState({
        name: '', email: '', phone: '', designation: '', employee_type: 'Full-time',
        skills: [], reason: '',
    });
    const [submitted, setSubmitted] = useState(false);

    const mutation = useMutation({
        mutationFn: signupRequestApi.submit,
        onSuccess: () => setSubmitted(true),
        onError: (err) => toast.error(err.response?.data?.detail || 'Failed to submit request'),
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim()) { toast.error('Name is required'); return; }
        if (!form.email.trim()) { toast.error('Email is required'); return; }
        mutation.mutate(form);
    };

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-6">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-10 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-3">Request Submitted!</h2>
                    <p className="text-slate-500 text-sm leading-relaxed mb-6">
                        Your signup request has been received and is pending review by the Admin.
                        You'll receive an email once your account is approved with login instructions.
                    </p>
                    <p className="text-xs text-slate-400 mb-6">
                        Questions? Contact your manager or reach out on <strong>#autonex-tool-support</strong> in Slack.
                    </p>
                    <Link to="/login/employee"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
                        Back to Sign In
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex">
            <AuthBrandPanel
                accent="employee"
                eyebrow="Employee Onboarding"
                title="Join the Autonex team"
                description="Submit your details to request access to the Autonex Resource Planning Portal. An admin will review and approve your account."
                highlights={[
                    { title: 'Quick Review', copy: 'Admin reviews requests within one business day.' },
                    { title: 'Instant Access', copy: 'Receive login credentials via email upon approval.' },
                ]}
            />

            <div className="flex flex-1 items-start justify-center p-4 sm:p-8 bg-gradient-to-br from-emerald-50 to-slate-50 overflow-y-auto">
                <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white/95 p-5 sm:p-8 shadow-[0_25px_80px_rgba(15,23,42,0.1)] backdrop-blur my-4 sm:my-8">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Employee Signup</h1>
                        <p className="mt-1.5 text-sm text-slate-500">
                            Already have an account?{' '}
                            <Link to="/login/employee" className="text-emerald-600 font-medium hover:text-emerald-700">Sign in</Link>
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Your full name" required
                                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Work Email <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    placeholder="you@company.com" required
                                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                    placeholder="+91 9876543210"
                                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
                            </div>
                        </div>

                        {/* Designation + Employee Type */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Designation</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                    <select value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
                                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20">
                                        <option value="">Select...</option>
                                        {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Employment Type</label>
                                <select value={form.employee_type} onChange={e => setForm(f => ({ ...f, employee_type: e.target.value }))}
                                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20">
                                    {EMPLOYEE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Work Category */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Work Category</label>
                            <select
                                value={form.skills[0] || ''}
                                onChange={e => setForm(f => ({ ...f, skills: e.target.value ? [e.target.value] : [] }))}
                                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20">
                                <option value="">Select a work category...</option>
                                {WORK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Work Description <span className="text-slate-400 font-normal">(optional)</span></label>
                            <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                                placeholder="Describe the work you did in previous projects"
                                rows={3}
                                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm outline-none resize-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
                        </div>

                        <button type="submit" disabled={mutation.isPending}
                            className="w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-70 bg-emerald-600 shadow-[0_16px_38px_rgba(5,150,105,0.24)] hover:bg-emerald-700">
                            {mutation.isPending ? (
                                <><span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Submitting...</>
                            ) : 'Submit Signup Request'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EmployeeSignupPage;
