import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { referralApi } from '../../services/api';
import Spinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import {
    Users2, Plus, X, Trash2, Clock, Search, Briefcase, CheckCircle2,
    XCircle, ChevronDown, ChevronUp, Linkedin, Phone, Mail, Link2
} from 'lucide-react';
import Dropdown from '../../components/ui/Dropdown';

const STATUS_CONFIG = {
    pending:             { label: 'Pending Review',        color: 'bg-amber-50 text-amber-700 border-amber-200' },
    reviewing:           { label: 'Under Review',          color: 'bg-blue-50 text-blue-700 border-blue-200' },
    interview_scheduled: { label: 'Interview Scheduled',   color: 'bg-purple-50 text-purple-700 border-purple-200' },
    hired:               { label: 'Hired',                 color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    rejected:            { label: 'Not Moving Forward',    color: 'bg-red-50 text-red-700 border-red-200' },
};

const POSITIONS = [
    'Annotator', 'Developer', 'QA Engineer', 'Reviewer', 'Program Manager',
    'Data Scientist', 'ML Engineer', 'DevOps Engineer', 'UI/UX Designer', 'Other',
];

const DEPARTMENTS = ['Engineering', 'Product', 'Design', 'Operations', 'Data', 'Other'];

const RELATIONSHIPS = [
    'Former colleague', 'University friend', 'Professional contact', 'Friend', 'Family', 'Other',
];

const emptyForm = {
    candidate_name: '',
    candidate_email: '',
    candidate_phone: '',
    candidate_linkedin: '',
    position_applied: '',
    department: '',
    relationship: '',
    note: '',
};

const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-slate-100 text-slate-600 border-slate-200' };
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
            {cfg.label}
        </span>
    );
};

const EmployeeReferralsPage = () => {
    const queryClient = useQueryClient();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [expandedId, setExpandedId] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const { data: referrals = [], isLoading } = useQuery({
        queryKey: ['referrals', 'mine'],
        queryFn: () => referralApi.getAll(),
    });

    const createMutation = useMutation({
        mutationFn: referralApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries(['referrals']);
            toast.success('Referral submitted! We\'ll keep you updated.');
            setForm(emptyForm);
            setShowForm(false);
        },
        onError: (err) => toast.error(err.response?.data?.detail || 'Failed to submit referral'),
    });

    const deleteMutation = useMutation({
        mutationFn: referralApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries(['referrals']);
            toast.success('Referral withdrawn');
            setDeleteConfirm(null);
        },
        onError: (err) => toast.error(err.response?.data?.detail || 'Failed to withdraw referral'),
    });

    const validate = () => {
        const e = {};
        if (!form.candidate_name.trim()) e.candidate_name = 'Required';
        if (!form.candidate_email.trim()) e.candidate_email = 'Required';
        else if (!/\S+@\S+\.\S+/.test(form.candidate_email)) e.candidate_email = 'Invalid email';
        if (!form.position_applied) e.position_applied = 'Required';
        if (!form.relationship) e.relationship = 'Required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;
        createMutation.mutate({
            ...form,
            candidate_email: form.candidate_email.trim().toLowerCase(),
            candidate_phone: form.candidate_phone || null,
            candidate_linkedin: form.candidate_linkedin || null,
            department: form.department || null,
            note: form.note || null,
        });
    };

    const field = (name, value) =>
        setForm(prev => ({ ...prev, [name]: value }));

    const inputCls = (name) =>
        `w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all ${
            errors[name]
                ? 'border-red-300 focus:ring-2 focus:ring-red-100'
                : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
        }`;

    const pendingCount = referrals.filter(r => r.status === 'pending').length;
    const hiredCount   = referrals.filter(r => r.status === 'hired').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">My Referrals</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Refer talented people you know for open roles at Autonex.
                    </p>
                </div>
                <Button variant="success" onClick={() => { setShowForm(true); setErrors({}); }}>
                    <Plus className="w-4 h-4" /> Refer Someone
                </Button>
            </div>

            {/* Stats */}
            {referrals.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Total Referrals', value: referrals.length, color: 'text-slate-700' },
                        { label: 'Pending Review', value: pendingCount, color: 'text-amber-600' },
                        { label: 'Hired', value: hiredCount, color: 'text-emerald-600' },
                    ].map(s => (
                        <div key={s.label} className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm">
                            <p className="text-xs text-slate-400 font-medium">{s.label}</p>
                            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Referral list */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Loading...</div>
                ) : referrals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <Users2 className="w-10 h-10 mb-3 text-slate-300" />
                        <p className="font-medium text-slate-500">No referrals yet</p>
                        <p className="text-sm mt-1">Know someone who'd be a great fit? Refer them!</p>
                        <Button variant="success" onClick={() => { setShowForm(true); setErrors({}); }} className="mt-4">
                            <Plus className="w-4 h-4" /> Submit your first referral
                        </Button>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {referrals.map(ref => {
                            const isExpanded = expandedId === ref.id;
                            return (
                                <div key={ref.id} className="hover:bg-slate-50/40 transition-colors">
                                    <div className="px-6 py-4 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 min-w-0 flex-1">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center shrink-0">
                                                <span className="text-sm font-bold text-emerald-700">
                                                    {ref.candidate_name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-semibold text-slate-800">{ref.candidate_name}</p>
                                                    <StatusBadge status={ref.status} />
                                                </div>
                                                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                                    <span className="flex items-center gap-1 text-xs text-slate-500">
                                                        <Briefcase className="w-3 h-3" />{ref.position_applied}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-xs text-slate-400">
                                                        <Mail className="w-3 h-3" />{ref.candidate_email}
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        {ref.created_at ? new Date(ref.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : ref.id)}
                                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                            >
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                            {ref.status === 'pending' && (
                                                <button
                                                    onClick={() => setDeleteConfirm(ref)}
                                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Withdraw referral"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="px-6 pb-4 border-t border-slate-100 bg-slate-50/50">
                                            <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                {ref.candidate_phone && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Phone</p>
                                                        <p className="flex items-center gap-1 text-slate-700">
                                                            <Phone className="w-3.5 h-3.5" />{ref.candidate_phone}
                                                        </p>
                                                    </div>
                                                )}
                                                {ref.candidate_linkedin && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-slate-400 uppercase mb-1">LinkedIn</p>
                                                        <a href={ref.candidate_linkedin} target="_blank" rel="noopener noreferrer"
                                                            className="flex items-center gap-1 text-blue-600 hover:underline">
                                                            <Linkedin className="w-3.5 h-3.5" />View Profile
                                                        </a>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Relationship</p>
                                                    <p className="text-slate-700">{ref.relationship}</p>
                                                </div>
                                                {ref.department && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Department</p>
                                                        <p className="text-slate-700">{ref.department}</p>
                                                    </div>
                                                )}
                                                {ref.note && (
                                                    <div className="md:col-span-2">
                                                        <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Your Note</p>
                                                        <p className="text-slate-700">{ref.note}</p>
                                                    </div>
                                                )}
                                                {ref.status_note && (
                                                    <div className="md:col-span-2">
                                                        <p className="text-xs font-semibold text-blue-400 uppercase mb-1">Update from Hiring Team</p>
                                                        <p className="text-slate-700">{ref.status_note}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Submit referral modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 my-4">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">Refer a Candidate</h3>
                                <p className="text-sm text-slate-500 mt-0.5">Fill in the candidate's details below</p>
                            </div>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Candidate Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        value={form.candidate_name}
                                        onChange={e => field('candidate_name', e.target.value)}
                                        placeholder="Full name"
                                        className={inputCls('candidate_name')}
                                    />
                                    {errors.candidate_name && <p className="mt-1 text-xs text-red-500">{errors.candidate_name}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Email <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={form.candidate_email}
                                        onChange={e => field('candidate_email', e.target.value)}
                                        placeholder="candidate@email.com"
                                        className={inputCls('candidate_email')}
                                    />
                                    {errors.candidate_email && <p className="mt-1 text-xs text-red-500">{errors.candidate_email}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                    <input
                                        value={form.candidate_phone}
                                        onChange={e => field('candidate_phone', e.target.value)}
                                        placeholder="+91 98765 43210"
                                        className={inputCls('candidate_phone')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn URL</label>
                                    <input
                                        value={form.candidate_linkedin}
                                        onChange={e => field('candidate_linkedin', e.target.value)}
                                        placeholder="https://linkedin.com/in/..."
                                        className={inputCls('candidate_linkedin')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Position <span className="text-red-500">*</span>
                                    </label>
                                    <Dropdown
                                        options={[{ value: '', label: 'Select position' }, ...POSITIONS.map(p => ({ value: p, label: p }))]}
                                        value={form.position_applied}
                                        onChange={val => field('position_applied', val)}
                                        className="w-full"
                                    />
                                    {errors.position_applied && <p className="mt-1 text-xs text-red-500">{errors.position_applied}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                                    <Dropdown
                                        options={[{ value: '', label: 'Select department' }, ...DEPARTMENTS.map(d => ({ value: d, label: d }))]}
                                        value={form.department}
                                        onChange={val => field('department', val)}
                                        className="w-full"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Your Relationship <span className="text-red-500">*</span>
                                    </label>
                                    <Dropdown
                                        options={[{ value: '', label: 'How do you know this person?' }, ...RELATIONSHIPS.map(r => ({ value: r, label: r }))]}
                                        value={form.relationship}
                                        onChange={val => field('relationship', val)}
                                        className="w-full"
                                    />
                                    {errors.relationship && <p className="mt-1 text-xs text-red-500">{errors.relationship}</p>}
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Why are you recommending them? <span className="text-slate-400 font-normal">(optional)</span>
                                    </label>
                                    <textarea
                                        value={form.note}
                                        onChange={e => field('note', e.target.value)}
                                        placeholder="Share anything that would help the hiring team..."
                                        rows={3}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="cancel" onClick={() => setShowForm(false)}>Cancel</Button>
                                <Button type="submit" variant="success" disabled={createMutation.isPending} isLoading={createMutation.isPending}>
                                    {!createMutation.isPending && 'Submit Referral'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Withdraw confirm modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                        <h3 className="font-semibold text-slate-800 mb-2">Withdraw Referral?</h3>
                        <p className="text-sm text-slate-500">
                            This will remove your referral for <strong>{deleteConfirm.candidate_name}</strong>. This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3 mt-5">
                            <Button variant="cancel" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                            <Button variant="danger" onClick={() => deleteMutation.mutate(deleteConfirm.id)} disabled={deleteMutation.isPending} isLoading={deleteMutation.isPending}>
                                {!deleteMutation.isPending && 'Withdraw'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeReferralsPage;
