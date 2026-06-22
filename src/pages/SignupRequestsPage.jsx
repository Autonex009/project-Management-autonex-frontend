import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { signupRequestApi } from '../services/api';
import { CheckCircle, XCircle, Clock, User, Mail, Phone, Briefcase, AlertTriangle, X, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import PageSearchBar from '../components/ui/PageSearchBar';

const EMPLOYEE_TYPES = ['Full-time', 'Part-time', 'Intern', 'Contractor'];

const STATUS_BADGE = {
    pending:  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3 h-3"/>Pending</span>,
    approved: <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-3 h-3"/>Approved</span>,
    rejected: <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"><XCircle className="w-3 h-3"/>Rejected</span>,
};

const TABS = ['All', 'Pending', 'Approved', 'Rejected'];

const EmployeeTypeDropdown = ({ value, onChange }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="relative inline-block">
            <button
                onClick={() => setOpen(o => !o)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
                {value || 'Select'}
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute left-0 top-full mt-1 z-[9999] min-w-[130px] bg-white border border-slate-200 rounded-xl shadow-lg py-1 overflow-hidden">
                    {EMPLOYEE_TYPES.map(t => (
                        <button
                            key={t}
                            onClick={() => { onChange(t); setOpen(false); }}
                            className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                                t === value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const SignupRequestsPage = () => {
    const queryClient = useQueryClient();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [activeTab, setActiveTab] = useState('All');
    const [rejectModal, setRejectModal] = useState(null); // { requestId, name }
    const [rejectReason, setRejectReason] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [localEmployeeTypes, setLocalEmployeeTypes] = useState({});
    const PAGE_SIZE = 10;

    const { data: requests = [], isLoading } = useQuery({
        queryKey: ['signup-requests'],
        queryFn: () => signupRequestApi.getAll(),
        refetchInterval: 30_000,
    });

    const approveMutation = useMutation({
        mutationFn: (id) => signupRequestApi.approve(id, user.id),
        onSuccess: (data) => {
            queryClient.invalidateQueries(['signup-requests']);
            queryClient.invalidateQueries(['employees']);
            toast.success(data.message || 'Account created and credentials emailed');
        },
        onError: (err) => toast.error(err.response?.data?.detail || 'Failed to approve request'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => signupRequestApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['signup-requests']);
            toast.success('Employment type updated');
        },
        onError: (err) => toast.error(err.response?.data?.detail || 'Failed to update employment type'),
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }) => signupRequestApi.reject(id, user.id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries(['signup-requests']);
            setRejectModal(null);
            setRejectReason('');
            toast.success('Request rejected and applicant notified');
        },
        onError: (err) => toast.error(err.response?.data?.detail || 'Failed to reject request'),
    });

    const filtered = requests.filter(r => {
        if (activeTab !== 'All' && r.status !== activeTab.toLowerCase()) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (r.name || '').toLowerCase().includes(q) ||
            (r.email || '').toLowerCase().includes(q);
    });

    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginatedRequests = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setCurrentPage(1);
        setSearchQuery('');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-slate-800">Signup Requests</h1>
                    {pendingCount > 0 && (
                        <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded-full text-xs font-bold bg-red-500 text-white">
                            {pendingCount}
                        </span>
                    )}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                    Review and approve employee signup requests. Approved accounts receive credentials via email.
                </p>
            </div>

            {/* Tabs & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
                    {TABS.map(tab => (
                        <button key={tab} onClick={() => handleTabChange(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                activeTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}>
                            {tab}
                            {tab === 'Pending' && pendingCount > 0 && (
                                <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <PageSearchBar
                    value={searchQuery}
                    onChange={(val) => { setSearchQuery(val); setCurrentPage(1); }}
                    placeholder="Search requests..."
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400">Loading...</div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <User className="w-10 h-10 mb-3 text-slate-300" />
                        <p className="font-medium">{searchQuery ? 'No matching requests' : `No ${activeTab.toLowerCase()} requests`}</p>
                        <p className="text-sm mt-1">
                            {searchQuery ? 'Try adjusting your search query.' : 'Share autonex-frontend.vercel.app/employee-signup with employees to get started.'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {paginatedRequests.map(req => {
                            const isExpanded = expandedId === req.id;
                            return (
                                <div key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                    <div className="px-6 py-4 flex items-center justify-between gap-4">
                                        {/* Left — info */}
                                        <div className="flex items-center gap-4 min-w-0 flex-1">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0">
                                                <span className="text-sm font-bold text-slate-600">
                                                    {req.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-semibold text-slate-800">{req.name}</p>
                                                    {STATUS_BADGE[req.status] || STATUS_BADGE.pending}
                                                </div>
                                                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                                    <span className="flex items-center gap-1 text-xs text-slate-500">
                                                        <Mail className="w-3 h-3"/>{req.email}
                                                    </span>
                                                    {req.designation && (
                                                        <span className="flex items-center gap-1 text-xs text-slate-500">
                                                            <Briefcase className="w-3 h-3"/>{req.designation}
                                                        </span>
                                                    )}
                                                    {req.phone && (
                                                        <span className="flex items-center gap-1 text-xs text-slate-500">
                                                            <Phone className="w-3 h-3"/>{req.phone}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-slate-400">
                                                        {req.created_at ? format(parseISO(req.created_at), 'MMM d, yyyy') : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right — actions */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button onClick={() => setExpandedId(isExpanded ? null : req.id)}
                                                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                                                {isExpanded ? 'Less' : 'Details'}
                                            </button>
                                            {req.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => approveMutation.mutate(req.id)}
                                                        disabled={approveMutation.isPending}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">
                                                        <CheckCircle className="w-3.5 h-3.5"/>Approve
                                                    </button>
                                                    <button
                                                        onClick={() => { setRejectModal({ requestId: req.id, name: req.name }); setRejectReason(''); }}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                                                        <XCircle className="w-3.5 h-3.5"/>Reject
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded details */}
                                    {isExpanded && (
                                        <div className="px-6 pb-4 border-t border-slate-100 bg-slate-50/60">
                                            <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Employment Type</p>
                                                    <EmployeeTypeDropdown
                                                        value={localEmployeeTypes[req.id] ?? req.employee_type ?? ''}
                                                        onChange={newType => {
                                                            setLocalEmployeeTypes(prev => ({ ...prev, [req.id]: newType }));
                                                            updateMutation.mutate({ id: req.id, data: { employee_type: newType } });
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Skills</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {(req.skills || []).length > 0
                                                            ? req.skills.map(s => (
                                                                <span key={s} className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 text-xs">{s}</span>
                                                              ))
                                                            : <span className="text-slate-400">None provided</span>
                                                        }
                                                    </div>
                                                </div>
                                                {req.reason && (
                                                    <div className="md:col-span-2">
                                                        <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Reason / Background</p>
                                                        <p className="text-slate-700">{req.reason}</p>
                                                    </div>
                                                )}
                                                {req.rejection_reason && (
                                                    <div className="md:col-span-2">
                                                        <p className="text-xs font-semibold text-red-400 uppercase mb-1">Rejection Reason</p>
                                                        <p className="text-red-700">{req.rejection_reason}</p>
                                                    </div>
                                                )}
                                                {req.reviewed_at && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Reviewed At</p>
                                                        <p className="text-slate-700">{format(parseISO(req.reviewed_at), 'MMM d, yyyy HH:mm')}</p>
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

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 mt-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                        Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                        .reduce((acc, p, idx, arr) => {
                            if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                            acc.push(p);
                            return acc;
                        }, [])
                        .map((p, idx) =>
                            p === '...' ? (
                                <span key={`ellipsis-${idx}`} className="px-2 text-slate-400">…</span>
                            ) : (
                                <button key={p} onClick={() => setCurrentPage(p)}
                                    className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${
                                        currentPage === p
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'
                                    }`}>
                                    {p}
                                </button>
                            )
                        )}
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                        Next
                    </button>
                </div>
            )}

            {/* Signup link callout */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4 flex items-center gap-3">
                <User className="w-5 h-5 text-indigo-500 shrink-0"/>
                <div>
                    <p className="text-sm font-medium text-indigo-800">Share the signup link with new employees</p>
                    <p className="text-xs text-indigo-600 mt-0.5 font-mono">
                        autonex-frontend.vercel.app/employee-signup
                    </p>
                </div>
            </div>

            {/* Reject modal */}
            {rejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 bg-red-100 rounded-lg shrink-0">
                                <AlertTriangle className="w-5 h-5 text-red-600"/>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-slate-800">Reject Signup Request</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Rejecting <strong>{rejectModal.name}</strong>'s request. They will receive an email notification.
                                </p>
                            </div>
                            <button onClick={() => setRejectModal(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5"/>
                            </button>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Reason <span className="text-slate-400 font-normal">(optional — sent to applicant)</span>
                            </label>
                            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                                placeholder="e.g. Position currently filled, incomplete information..."
                                className="w-full rounded-xl border border-slate-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                rows={3} />
                        </div>
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={() => setRejectModal(null)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={() => rejectMutation.mutate({ id: rejectModal.requestId, reason: rejectReason })}
                                disabled={rejectMutation.isPending}
                                className="px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50">
                                {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SignupRequestsPage;
