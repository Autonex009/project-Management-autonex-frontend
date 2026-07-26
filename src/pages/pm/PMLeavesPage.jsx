import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveApi, allocationApi, employeeApi, subProjectApi, wfhApi, parentProjectApi } from '../../services/api';
import Spinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import { Calendar, CheckCircle, XCircle, Clock, AlertTriangle, Home, BarChart2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { getPmEmployeeId, getPmSubProjects } from '../../utils/pmScope';
import { getLeaveTypeLabel, getLeaveTypeBadgeClass, getWorkingDayCount } from '../../utils/leaveTypes';
import LeaveCalendar from '../../components/LeaveCalendar';
import EmployeeKPIPanel from '../../components/EmployeeKPIPanel';
import Modal from '../../components/ui/Modal';

const TABS = ['Leave Requests', 'Calendar', 'WFH Requests', 'Employee KPI'];

const STATUS_BADGE = {
    pending:  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3 h-3"/>Pending</span>,
    approved: <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-3 h-3"/>Approved</span>,
    rejected: <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"><XCircle className="w-3 h-3"/>Rejected</span>,
};

const PMLeavesPage = () => {
    const queryClient = useQueryClient();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const employeeId = getPmEmployeeId(user);
    const [activeTab, setActiveTab] = useState('Leave Requests');
    const [remarkModal, setRemarkModal] = useState(null);
    const [remark, setRemark] = useState('');

    const { data: allLeaves = [], isLoading } = useQuery({ queryKey: ['leaves'], queryFn: () => leaveApi.getAll() });
    const { data: allocations = [] } = useQuery({ queryKey: ['allocations'], queryFn: allocationApi.getAll });
    const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: employeeApi.getAll });
    const { data: projects = [] } = useQuery({ queryKey: ['sub-projects'], queryFn: subProjectApi.getAll });
    const { data: parentProjects = [] } = useQuery({ queryKey: ['parent-projects'], queryFn: parentProjectApi.getAll });
    const { data: wfhRequests = [], isLoading: wfhLoading } = useQuery({ queryKey: ['wfh'], queryFn: () => wfhApi.getAll() });

    const scopedProjects = getPmSubProjects(projects, parentProjects, employeeId, allocations);
    const myProjectIds = new Set(scopedProjects.map(p => p.id));
    const teamEmployeeIds = new Set(allocations.filter(a => myProjectIds.has(a.sub_project_id)).map(a => a.employee_id));

    const teamLeaves = allLeaves.filter(l => teamEmployeeIds.has(l.employee_id) && l.start_date && l.end_date);
    const teamLeavesForKpi = allLeaves.filter(l => teamEmployeeIds.has(l.employee_id));
    const teamWfh = wfhRequests.filter(w => teamEmployeeIds.has(w.employee_id));

    const approveMutation = useMutation({
        mutationFn: ({ id, remark }) => leaveApi.approve(id, user.id, remark),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaves'] });
            setRemarkModal(null); setRemark('');
            toast.success('Leave approved');
        },
        onError: (err) => toast.error(err.response?.data?.detail || 'Failed to approve leave'),
    });

    const rejectMutation = useMutation({
        mutationFn: (id) => leaveApi.reject(id, user.id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leaves'] }); toast.success('Leave rejected'); },
        onError: (err) => toast.error(err.response?.data?.detail || 'Failed to reject leave'),
    });

    const wfhApproveMutation = useMutation({
        mutationFn: (id) => wfhApi.approve(id, user.id),
        onSuccess: () => { queryClient.invalidateQueries(['wfh']); queryClient.invalidateQueries(['leave-calendar']); toast.success('WFH approved'); },
        onError: (err) => toast.error(err.response?.data?.detail || 'Failed to approve WFH'),
    });

    const wfhRejectMutation = useMutation({
        mutationFn: (id) => wfhApi.reject(id, user.id),
        onSuccess: () => { queryClient.invalidateQueries(['wfh']); toast.success('WFH rejected'); },
        onError: (err) => toast.error(err.response?.data?.detail || 'Failed to reject WFH'),
    });

    const handleApprove = (leave) => {
        if (leave.flagged) setRemarkModal({ leaveId: leave.leave_id });
        else approveMutation.mutate({ id: leave.leave_id, remark: null });
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Team Leaves</h1>
                <p className="mt-0.5 text-[13px] text-slate-500">Manage leave and WFH requests from your team</p>
            </div>

            {/* Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 w-fit">
                    {TABS.map(tab => {
                        const isActive = activeTab === tab;
                        return (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold rounded-md transition-all whitespace-nowrap ${
                                    isActive ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70' : 'text-slate-500 hover:text-slate-800'
                                }`}>
                                {tab === 'WFH Requests' ? <><Home className="w-3.5 h-3.5"/>{tab}</> :
                                 tab === 'Calendar' ? <><Calendar className="w-3.5 h-3.5"/>{tab}</> :
                                 tab === 'Employee KPI' ? <><BarChart2 className="w-3.5 h-3.5"/>{tab}</> : tab}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Leave Requests ── */}
            {activeTab === 'Leave Requests' && (
                <Table
                    variant="untitled"
                    loading={isLoading}
                    columns={[
                        {
                            key: 'employee_id',
                            label: 'Employee',
                            width: 'w-[22%]',
                            render: (_, leave) => {
                                const emp = employees.find(e => e.id === leave.employee_id);
                                return (
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="font-semibold text-slate-800 truncate">{emp?.name || `#${leave.employee_id}`}</span>
                                            {leave.flagged && (
                                                <span title="Over limit" className="inline-flex items-center justify-center h-5 w-5 shrink-0 rounded-full bg-orange-100 text-orange-600 border border-orange-200 cursor-help">
                                                    <AlertTriangle className="w-3 h-3" />
                                                </span>
                                            )}
                                        </div>
                                        {leave.approval_remark && (
                                            <p className="text-xs text-slate-400 mt-0.5 truncate">Remark: {leave.approval_remark}</p>
                                        )}
                                    </div>
                                );
                            },
                        },
                        {
                            key: 'leave_type',
                            label: 'Leave Type',
                            width: 'w-[14%]',
                            render: (value) => (
                                <span className={`inline-flex whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-medium ${getLeaveTypeBadgeClass(value)}`}>
                                    {getLeaveTypeLabel(value).replace('Second Half-day Leave', '2nd Half-day').replace('First Half-day Leave', '1st Half-day')}
                                </span>
                            ),
                        },
                        {
                            key: 'start_date',
                            label: 'Start Date',
                            width: 'w-[12%]',
                            render: (value) => <span className="text-[13px] text-slate-700 whitespace-nowrap">{format(parseISO(value), 'MMM d, yyyy')}</span>,
                        },
                        {
                            key: 'end_date',
                            label: 'End Date',
                            width: 'w-[12%]',
                            render: (value) => <span className="text-[13px] text-slate-700 whitespace-nowrap">{format(parseISO(value), 'MMM d, yyyy')}</span>,
                        },
                        {
                            key: 'leave_id',
                            label: 'Duration',
                            align: 'center',
                            width: 'w-[13%]',
                            render: (_, leave) => {
                                const duration = getWorkingDayCount(leave.start_date, leave.end_date, leave.is_half_day);
                                return (
                                    <span>
                                        <span className="text-sm font-semibold text-slate-800">{duration}</span>
                                        <span className="text-xs text-slate-400 ml-1">
                                            {leave.is_half_day ? (
                                                <>day ({leave.half_day_slot === 'first_half' ? 'First Half' : 'Second Half'})</>
                                            ) : (
                                                duration === 1 ? 'day' : 'days'
                                            )}
                                        </span>
                                    </span>
                                );
                            },
                        },
                        {
                            key: 'status',
                            label: 'Status',
                            align: 'center',
                            width: 'w-[12%]',
                            render: (value) => STATUS_BADGE[value] || STATUS_BADGE.pending,
                        },
                        {
                            key: '_actions',
                            label: 'Actions',
                            align: 'right',
                            width: 'w-[15%]',
                            render: (_, leave) => {
                                const isPending = !leave.status || leave.status === 'pending';
                                const iconBtn = 'inline-flex items-center justify-center h-8 w-8 rounded-md border transition-colors disabled:opacity-50';
                                return (
                                    <div className="flex items-center justify-end gap-1.5">
                                        {isPending ? (
                                            <>
                                                <button onClick={() => handleApprove(leave)} disabled={approveMutation.isPending} title="Approve"
                                                    className={`${iconBtn} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}>
                                                    <CheckCircle className="w-4 h-4"/>
                                                </button>
                                                <button onClick={() => rejectMutation.mutate(leave.leave_id)} disabled={rejectMutation.isPending} title="Reject"
                                                    className={`${iconBtn} border-red-200 bg-red-50 text-red-700 hover:bg-red-100`}>
                                                    <XCircle className="w-4 h-4"/>
                                                </button>
                                            </>
                                        ) : <span className="text-xs text-slate-400">—</span>}
                                    </div>
                                );
                            },
                        },
                    ]}
                    data={teamLeaves}
                    emptyState={{ title: 'No leave requests', description: 'No leave requests from your team' }}
                />
            )}

            {/* ── Calendar ── */}
            {activeTab === 'Calendar' && (
                <LeaveCalendar filterEmployeeIds={teamEmployeeIds.size > 0 ? teamEmployeeIds : null} />
            )}

            {/* ── WFH Requests ── */}
            {activeTab === 'WFH Requests' && (
                <Table
                    variant="untitled"
                    loading={wfhLoading}
                    columns={[
                        {
                            key: 'employee_name',
                            label: 'Employee',
                            render: (value) => <span className="font-semibold text-slate-800">{value}</span>,
                        },
                        {
                            key: 'wfh_date',
                            label: 'Date',
                            render: (value) => <span className="text-sm text-slate-700">{format(new Date(value + 'T00:00:00'), 'MMM d, yyyy')}</span>,
                        },
                        {
                            key: 'reason',
                            label: 'Reason',
                            render: (value) => <span className="text-sm text-slate-500">{value || '—'}</span>,
                        },
                        {
                            key: 'status',
                            label: 'Status',
                            align: 'center',
                            render: (value) => STATUS_BADGE[value] || STATUS_BADGE.pending,
                        },
                        {
                            key: '_wfh_actions',
                            label: 'Actions',
                            align: 'right',
                            render: (_, w) => (
                                <div className="flex items-center justify-end gap-2">
                                    {w.status === 'pending' ? (
                                        <>
                                            <Button variant="success" size="sm" onClick={() => wfhApproveMutation.mutate(w.id)} disabled={wfhApproveMutation.isPending}>
                                                <CheckCircle className="w-3.5 h-3.5"/>Approve
                                            </Button>
                                            <Button variant="danger" size="sm" onClick={() => wfhRejectMutation.mutate(w.id)} disabled={wfhRejectMutation.isPending}>
                                                <XCircle className="w-3.5 h-3.5"/>Reject
                                            </Button>
                                        </>
                                    ) : <span className="text-xs text-slate-400">—</span>}
                                </div>
                            ),
                        },
                    ]}
                    data={teamWfh}
                    emptyState={{ title: 'No WFH requests from your team', description: 'WFH requests will appear here' }}
                />
            )}

            {/* ── Employee KPI ── */}
            {activeTab === 'Employee KPI' && (
                <EmployeeKPIPanel 
                    employees={employees.filter(e => teamEmployeeIds.has(e.id))} 
                    leaves={teamLeavesForKpi} 
                    wfhRequests={teamWfh} 
                />
            )}

            {/* ── Flagged leave remark modal ── */}
            {remarkModal && (
                <Modal isOpen onClose={() => { setRemarkModal(null); setRemark(''); }} size="md">
                    <Modal.Body>
                        <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 bg-orange-100 rounded-lg shrink-0"><AlertTriangle className="w-5 h-5 text-orange-600"/></div>
                            <div>
                                <h3 className="font-semibold text-slate-800">Justification Required</h3>
                                <p className="text-sm text-slate-500 mt-1">This employee has exceeded the monthly paid leave limit (2 leaves/month). A justification remark is required.</p>
                            </div>
                        </div>
                        <textarea value={remark} onChange={e => setRemark(e.target.value)}
                            placeholder="Enter justification for approving this additional leave..."
                            className="w-full rounded-xl border border-slate-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            rows={4} />
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="cancel" onClick={() => { setRemarkModal(null); setRemark(''); }}>Cancel</Button>
                        <Button variant="success" onClick={() => approveMutation.mutate({ id: remarkModal.leaveId, remark })} disabled={!remark.trim() || approveMutation.isPending} isLoading={approveMutation.isPending}>
                            {!approveMutation.isPending && 'Approve with Remark'}
                        </Button>
                    </Modal.Footer>
                </Modal>
            )}
        </div>
    );
};

export default PMLeavesPage;
