import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { referralApi } from '../services/api';
import Spinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import SearchBar from '../components/ui/SearchBar';
import {
    Users2, Briefcase, Mail, Phone, Linkedin, ChevronDown, ChevronUp,
    CheckCircle2, Clock, UserCheck, XCircle, TrendingUp, X
} from 'lucide-react';
import Dropdown from '../components/ui/Dropdown';

const STATUS_CONFIG = {
    pending:             { label: 'Pending Review',       color: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-400' },
    reviewing:           { label: 'Under Review',         color: 'bg-blue-50 text-blue-700 border-blue-200',     dot: 'bg-blue-500' },
    interview_scheduled: { label: 'Interview Scheduled',  color: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
    hired:               { label: 'Hired',                color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    rejected:            { label: 'Not Moving Forward',   color: 'bg-red-50 text-red-700 border-red-200',        dot: 'bg-red-400' },
};

const STATUS_OPTIONS = [
    { value: 'pending',             label: 'Pending Review' },
    { value: 'reviewing',           label: 'Under Review' },
    { value: 'interview_scheduled', label: 'Interview Scheduled' },
    { value: 'hired',               label: 'Hired' },
    { value: 'rejected',            label: 'Not Moving Forward' },
];

const TABS = ['All', 'Pending', 'Reviewing', 'Interview', 'Hired', 'Rejected'];
const TAB_STATUS = {
    All: null, Pending: 'pending', Reviewing: 'reviewing',
    Interview: 'interview_scheduled', Hired: 'hired', Rejected: 'rejected',
};

const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-slate-100 text-slate-600 border-slate-200' };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
            {cfg.label}
        </span>
    );
};

const ReferralsPage = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('All');
    const [expandedId, setExpandedId] = useState(null);
    const [statusModal, setStatusModal] = useState(null); // { referral }
    const [newStatus, setNewStatus] = useState('');
    const [statusNote, setStatusNote] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const { data: referrals = [], isLoading } = useQuery({
        queryKey: ['referrals', 'admin'],
        queryFn: () => referralApi.getAll(),
        refetchInterval: 60_000,
    });

    const statusMutation = useMutation({
        mutationFn: ({ id, status, note }) => referralApi.updateStatus(id, status, note),
        onSuccess: () => {
            queryClient.invalidateQueries(['referrals']);
            toast.success('Status updated');
            setStatusModal(null);
            setNewStatus('');
            setStatusNote('');
        },
        onError: (err) => toast.error(err.response?.data?.detail || 'Failed to update status'),
    });

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSearchQuery('');
    };

    const filtered = referrals.filter(r => {
        const target = TAB_STATUS[activeTab];
        if (target && r.status !== target) return false;
        
        const q = searchQuery.toLowerCase();
        const candidateName = (r.candidate_name || '').toLowerCase();
        const position = (r.position_applied || '').toLowerCase();
        const referrer = (r.referrer_name || '').toLowerCase();
        return candidateName.includes(q) || position.includes(q) || referrer.includes(q);
    });

    const stats = {
        total: referrals.length,
        pending: referrals.filter(r => r.status === 'pending').length,
        active: referrals.filter(r => ['reviewing', 'interview_scheduled'].includes(r.status)).length,
        hired: referrals.filter(r => r.status === 'hired').length,
    };

    const openStatusModal = (ref) => {
        setStatusModal(ref);
        setNewStatus(ref.status);
        setStatusNote('');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-slate-800">Employee Referrals</h1>
                    {stats.pending > 0 && (
                        <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded-full text-xs font-bold bg-amber-500 text-white">
                            {stats.pending}
                        </span>
                    )}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                    Review and track candidates referred by employees.
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: stats.total, icon: Users2, color: 'text-slate-600', bg: 'bg-slate-100' },
                    { label: 'Pending Review', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
                    { label: 'In Progress', value: stats.active, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-100' },
                    { label: 'Hired', value: stats.hired, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-100' },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                        <div className={`inline-flex p-2 rounded-xl ${s.bg} mb-3`}>
                            <s.icon className={`w-5 h-5 ${s.color}`} />
                        </div>
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* External API info */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4">
                <p className="text-sm font-semibold text-indigo-800 mb-1">ATS / Hiring Software Integration</p>
                <p className="text-xs text-indigo-600 font-mono break-all">
                    GET {import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://your-backend.vercel.app'}/api/external/referrals
                </p>
                <p className="text-xs text-indigo-500 mt-1">
                    Authenticate with <code className="bg-indigo-100 px-1 rounded">X-API-Key</code> header.
                    Supports <code className="bg-indigo-100 px-1 rounded">?status=</code>,{' '}
                    <code className="bg-indigo-100 px-1 rounded">?position=</code>, and{' '}
                    <code className="bg-indigo-100 px-1 rounded">?since=YYYY-MM-DD</code> query params.
                </p>
            </div>

            {/* Tabs and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
                    {TABS.map(tab => {
                        const count = TAB_STATUS[tab]
                            ? referrals.filter(r => r.status === TAB_STATUS[tab]).length
                            : referrals.length;
                        return (
                            <button key={tab} onClick={() => handleTabChange(tab)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    activeTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}>
                                {tab}
                                {count > 0 && tab !== 'All' && (
                                    <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold bg-slate-300 text-slate-700">
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <SearchBar responsive
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search candidates..."
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Loading...</div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <Users2 className="w-10 h-10 mb-3 text-slate-300" />
                        <p className="font-medium">No referrals in this category</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filtered.map(ref => {
                            const isExpanded = expandedId === ref.id;
                            return (
                                <div key={ref.id} className="hover:bg-slate-50/40 transition-colors">
                                    <div className="px-6 py-4 flex items-center justify-between gap-4">
                                        {/* Left */}
                                        <div className="flex items-center gap-4 min-w-0 flex-1">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-slate-100 flex items-center justify-center shrink-0">
                                                <span className="text-sm font-bold text-indigo-700">
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
                                                    {ref.referrer_name && (
                                                        <span className="text-xs text-slate-400">
                                                            Referred by <strong className="text-slate-600">{ref.referrer_name}</strong>
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-slate-400">
                                                        {ref.created_at
                                                            ? new Date(ref.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                            : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Button size="sm" onClick={() => openStatusModal(ref)}>Update Status</Button>
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : ref.id)}
                                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                            >
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="px-6 pb-4 border-t border-slate-100 bg-slate-50/60">
                                            <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Referred By</p>
                                                    <p className="text-slate-700">{ref.referrer_name || '—'}</p>
                                                    {ref.referrer_email && (
                                                        <p className="text-xs text-slate-400 mt-0.5">{ref.referrer_email}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Relationship</p>
                                                    <p className="text-slate-700">{ref.relationship}</p>
                                                </div>
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
                                                            className="flex items-center gap-1 text-blue-600 hover:underline text-sm">
                                                            <Linkedin className="w-3.5 h-3.5" />View Profile
                                                        </a>
                                                    </div>
                                                )}
                                                {ref.department && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Department</p>
                                                        <p className="text-slate-700">{ref.department}</p>
                                                    </div>
                                                )}
                                                {ref.note && (
                                                    <div className="md:col-span-2">
                                                        <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Referrer's Note</p>
                                                        <p className="text-slate-700">{ref.note}</p>
                                                    </div>
                                                )}
                                                {ref.status_note && (
                                                    <div className="md:col-span-2">
                                                        <p className="text-xs font-semibold text-indigo-400 uppercase mb-1">Status Note</p>
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

            {/* Status update modal */}
            {statusModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-slate-800">Update Referral Status</h3>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    {statusModal.candidate_name} — {statusModal.position_applied}
                                </p>
                            </div>
                            <button onClick={() => setStatusModal(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">New Status</label>
                                <Dropdown
                                    options={STATUS_OPTIONS}
                                    value={newStatus}
                                    onChange={setNewStatus}
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Note <span className="text-slate-400 font-normal">(optional — visible to referrer)</span>
                                </label>
                                <textarea
                                    value={statusNote}
                                    onChange={e => setStatusNote(e.target.value)}
                                    placeholder="e.g. Interview scheduled for next Tuesday..."
                                    rows={3}
                                    className="w-full rounded-xl border border-slate-200 p-3 text-sm resize-none outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-5">
                            <Button variant="cancel" onClick={() => setStatusModal(null)}>Cancel</Button>
                            <Button onClick={() => statusMutation.mutate({ id: statusModal.id, status: newStatus, note: statusNote })} disabled={statusMutation.isPending} isLoading={statusMutation.isPending}>
                                {!statusMutation.isPending && 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReferralsPage;
