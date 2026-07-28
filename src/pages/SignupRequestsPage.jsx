import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { signupRequestApi } from '../services/api';
import Button from '../components/ui/Button';
import { CheckCircle, XCircle, Clock, AlertTriangle, RotateCcw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import Dropdown from '../components/ui/Dropdown';
import Modal from '../components/ui/Modal';
import SearchBar from '../components/ui/SearchBar';
import Table from '../components/ui/Table';

const EMPLOYEE_TYPES = ['Full-time', 'Part-time', 'Intern', 'Contractor'];

const STATUS_BADGE = {
    pending:  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3 h-3"/>Pending</span>,
    approved: <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-3 h-3"/>Approved</span>,
    rejected: <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"><XCircle className="w-3 h-3"/>Rejected</span>,
};

const TABS = ['All', 'Pending', 'Approved', 'Rejected'];

const SignupRequestsPage = () => {
    const queryClient = useQueryClient();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [activeTab, setActiveTab] = useState('All');
    const [rejectModal, setRejectModal] = useState(null); // { requestId, name }
    const [rejectReason, setRejectReason] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [localEmployeeTypes, setLocalEmployeeTypes] = useState({});
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const PAGE_SIZE = 10;

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const { data: listData, isLoading } = useQuery({
        queryKey: ['signup-requests', activeTab, currentPage, debouncedSearch],
        queryFn: () => signupRequestApi.getAll({
            page: currentPage,
            page_size: PAGE_SIZE,
            ...(activeTab !== 'All' && { status: activeTab.toLowerCase() }),
            ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
        }),
        refetchInterval: 30_000,
    });

    const { data: counts } = useQuery({
        queryKey: ['signup-requests-counts'],
        queryFn: () => signupRequestApi.getCounts(),
        refetchInterval: 30_000,
    });

    const requests = listData?.items || [];
    const totalPages = listData?.total_pages || 1;
    const pendingCount = counts?.pending || 0;

    const approveMutation = useMutation({
        mutationFn: (id) => signupRequestApi.approve(id, user.id),
        onSuccess: (data) => {
            queryClient.invalidateQueries(['signup-requests']);
            queryClient.invalidateQueries(['signup-requests-counts']);
            queryClient.invalidateQueries(['employees']);
            toast.success(data.message || 'Account created and credentials emailed');
        },
        onError: (err) => toast.error(err.response?.data?.detail || 'Failed to approve request'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => signupRequestApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['signup-requests']);
            queryClient.invalidateQueries(['signup-requests-counts']);
            toast.success('Employment type updated');
        },
        onError: (err) => toast.error(err.response?.data?.detail || 'Failed to update employment type'),
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }) => signupRequestApi.reject(id, user.id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries(['signup-requests']);
            queryClient.invalidateQueries(['signup-requests-counts']);
            setRejectModal(null);
            setRejectReason('');
            toast.success('Request rejected and applicant notified');
        },
        onError: (err) => toast.error(err.response?.data?.detail || 'Failed to reject request'),
    });

    const undoRejectMutation = useMutation({
        mutationFn: (id) => signupRequestApi.undoReject(id, user.id),
        onSuccess: () => {
            queryClient.invalidateQueries(['signup-requests']);
            queryClient.invalidateQueries(['signup-requests-counts']);
            toast.success('Rejection undone — request is pending again');
        },
        onError: (err) => toast.error(err.response?.data?.detail || 'Failed to undo rejection'),
    });

    const undoApproveMutation = useMutation({
        mutationFn: ({ id, reason }) => signupRequestApi.undoApprove(id, user.id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries(['signup-requests']);
            queryClient.invalidateQueries(['signup-requests-counts']);
            setRejectModal(null);
            setRejectReason('');
            toast.success('Approval undone — request is pending again');
        },
        onError: (err) => toast.error(err.response?.data?.detail || 'Failed to undo approval'),
    });

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setCurrentPage(1);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-lg font-semibold text-slate-900">Signup Requests</h1>
                    {pendingCount > 0 && (
                        <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded-full text-xs font-bold bg-red-500 text-white">
                            {pendingCount}
                        </span>
                    )}
                </div>
                <p className="mt-0.5 text-[13px] text-slate-500">
                    Review and approve employee signup requests. Approved accounts receive credentials via email.
                </p>
            </div>

            {/* Tabs + Search */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                    {TABS.map(tab => {
                        const isActive = activeTab === tab;
                        return (
                            <button key={tab} onClick={() => handleTabChange(tab)}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold rounded-md transition-all ${
                                    isActive ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70' : 'text-slate-500 hover:text-slate-800'
                                }`}>
                                {tab}
                                {tab === 'Pending' && pendingCount > 0 && (
                                    <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                                        {pendingCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
                <SearchBar
                    value={search}
                    onChange={setSearch}
                    placeholder="Search by name, email or designation..."
                    clearable
                    width="w-full sm:w-80"
                />
            </div>

            {/* Table */}
            <Table
                variant="untitled"
                loading={isLoading}
                data={requests}
                currentPage={1}
                pageSize={PAGE_SIZE}
                getRowId={(row) => row.id}
                expandedRowId={expandedId}
                emptyState={{ title: `No ${activeTab.toLowerCase()} requests`, description: 'Applicant signup requests will appear here.' }}
                renderExpandedRow={(req) => (
                    <div className="px-4 pb-4 border-t border-slate-100 bg-slate-50/60">
                        <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Employment Type</p>
                                <Dropdown
                                    options={EMPLOYEE_TYPES}
                                    value={localEmployeeTypes[req.id] ?? req.employee_type ?? ''}
                                    onChange={newType => {
                                        setLocalEmployeeTypes(prev => ({ ...prev, [req.id]: newType }));
                                        updateMutation.mutate({ id: req.id, data: { employee_type: newType } });
                                    }}
                                />
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Skills</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {(req.skills || []).length > 0
                                        ? req.skills.map(s => (
                                            <span key={s} className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[12px] font-medium">{s}</span>
                                          ))
                                        : <span className="text-slate-400 text-[13px]">None provided</span>
                                    }
                                </div>
                            </div>
                            {req.reason && (
                                <div className="md:col-span-2">
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Reason / Background</p>
                                    <p className="text-[13px] text-slate-700">{req.reason}</p>
                                </div>
                            )}
                            {req.rejection_reason && (
                                <div className="md:col-span-2">
                                    <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wide mb-1">Rejection Reason</p>
                                    <p className="text-[13px] text-red-700">{req.rejection_reason}</p>
                                </div>
                            )}
                            {req.reviewed_at && (
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Reviewed At</p>
                                    <p className="text-[13px] text-slate-700">{format(parseISO(req.reviewed_at), 'MMM d, yyyy HH:mm')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                columns={[
                    {
                        key: 'name',
                        label: 'Applicant',
                        width: 'w-[26%]',
                        render: (value, req) => (
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[13px] font-semibold ring-1 ring-slate-200 shrink-0">
                                    {req.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[13.5px] font-semibold text-slate-900 truncate" title={req.name}>{req.name}</div>
                                    <div className="text-[12px] text-slate-400 truncate" title={req.email}>{req.email}</div>
                                </div>
                            </div>
                        ),
                    },
                    {
                        key: 'designation',
                        label: 'Designation',
                        width: 'w-[15%]',
                        render: (v) => <span className="text-[13px] font-medium text-slate-600">{v || '—'}</span>,
                    },
                    {
                        key: 'phone',
                        label: 'Phone',
                        width: 'w-[13%]',
                        render: (v) => <span className="text-[13px] text-slate-600 tabular-nums">{v || '—'}</span>,
                    },
                    {
                        key: 'created_at',
                        label: 'Requested',
                        width: 'w-[12%]',
                        render: (v) => <span className="text-[13px] text-slate-500">{v ? format(parseISO(v), 'MMM d, yyyy') : '—'}</span>,
                    },
                    {
                        key: 'status',
                        label: 'Status',
                        width: 'w-[11%]',
                        render: (v) => STATUS_BADGE[v] || STATUS_BADGE.pending,
                    },
                    {
                        key: 'actions',
                        label: 'Actions',
                        align: 'right',
                        width: 'w-[23%]',
                        render: (_, req) => {
                            const isExpanded = expandedId === req.id;
                            return (
                                <div className="flex items-center justify-end gap-2">
                                    {req.status === 'rejected' && (
                                        <Button variant="secondary" size="sm" onClick={() => undoRejectMutation.mutate(req.id)} disabled={undoRejectMutation.isPending}>
                                            <RotateCcw className="w-3.5 h-3.5"/>Undo
                                        </Button>
                                    )}
                                    {req.status === 'approved' && (
                                        <Button variant="secondary" size="sm" onClick={() => { setRejectModal({ requestId: req.id, name: req.name, mode: 'undoApprove' }); setRejectReason(''); }}>
                                            <RotateCcw className="w-3.5 h-3.5"/>Undo
                                        </Button>
                                    )}
                                    <Button variant="secondary" size="sm" onClick={() => setExpandedId(isExpanded ? null : req.id)}>
                                        {isExpanded ? 'Less' : 'Details'}
                                    </Button>
                                    {req.status === 'pending' && (
                                        <>
                                            <button onClick={() => approveMutation.mutate(req.id)} disabled={approveMutation.isPending} title="Approve"
                                                className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50">
                                                <CheckCircle className="w-4 h-4"/>
                                            </button>
                                            <button onClick={() => { setRejectModal({ requestId: req.id, name: req.name, mode: 'reject' }); setRejectReason(''); }} title="Reject"
                                                className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50">
                                                <XCircle className="w-4 h-4"/>
                                            </button>
                                        </>
                                    )}
                                </div>
                            );
                        },
                    },
                ]}
            />

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 mt-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="h-8 px-2.5 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
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
                                <span key={`ellipsis-${idx}`} className="px-1.5 text-[13px] text-slate-400">…</span>
                            ) : (
                                <button key={p} onClick={() => setCurrentPage(p)}
                                    className={`h-8 min-w-8 px-2 text-[13px] font-medium rounded-md transition-colors ${
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
                        className="h-8 px-2.5 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                        Next
                    </button>
                </div>
            )}

            {/* Reject modal */}
            {rejectModal && (
                <Modal isOpen onClose={() => setRejectModal(null)} size="md">
                    <Modal.Header onClose={() => setRejectModal(null)}>
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-red-100 rounded-lg shrink-0">
                                <AlertTriangle className="w-5 h-5 text-red-600"/>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-slate-800">Reject Signup Request</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Rejecting <strong>{rejectModal.name}</strong>'s request. They will receive an email notification.
                                </p>
                            </div>
                        </div>
                    </Modal.Header>
                    <Modal.Body>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Reason <span className="text-slate-400 font-normal">(optional — sent to applicant)</span>
                        </label>
                        <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                            placeholder="e.g. Position currently filled, incomplete information..."
                            className="w-full rounded-xl border border-slate-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            rows={3} />
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="cancel" onClick={() => setRejectModal(null)}>Cancel</Button>
                        <Button
                            variant="danger"
                            onClick={() => {
                                if (rejectModal.mode === 'undoApprove') {
                                    undoApproveMutation.mutate({ id: rejectModal.requestId, reason: rejectReason });
                                } else {
                                    rejectMutation.mutate({ id: rejectModal.requestId, reason: rejectReason });
                                }
                            }}
                            disabled={rejectModal.mode === 'undoApprove' ? undoApproveMutation.isPending : rejectMutation.isPending}
                            isLoading={rejectModal.mode === 'undoApprove' ? undoApproveMutation.isPending : rejectMutation.isPending}
                        >
                            {!(rejectModal.mode === 'undoApprove' ? undoApproveMutation.isPending : rejectMutation.isPending) && 'Confirm Reject'}
                        </Button>
                    </Modal.Footer>
                </Modal>
            )}
        </div>
    );
};

export default SignupRequestsPage;
