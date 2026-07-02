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
import { getLeaveTypeLabel } from '../../utils/leaveTypes';
import LeaveCalendar from '../../components/LeaveCalendar';
import EmployeeKPIPanel from '../../components/EmployeeKPIPanel';
import Modal from '../../components/ui/Modal';

const TABS = ['Leave Requests', 'Calendar', 'WFH Requests', 'Employee KPI'];

const STATUS_STYLES = {
    pending:  'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
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
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Team Leaves</h1>
                <p className="text-slate-500 text-sm mt-1">Manage leave and WFH requests from your team</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
                {TABS.map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}>
                        {tab === 'WFH Requests' ? <span className="flex items-center gap-1.5"><Home className="w-3.5 h-3.5"/>{tab}</span> :
                         tab === 'Calendar' ? <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/>{tab}</span> :
                         tab === 'Employee KPI' ? <span className="flex items-center gap-1.5"><BarChart2 className="w-3.5 h-3.5"/>{tab}</span> : tab}
                    </button>
                ))}
            </div>

            {/* ── Leave Requests ── */}
            {activeTab === 'Leave Requests' && (
                <Table
                    loading={isLoading}
                    columns={[
                        {
                            key: 'employee_id',
                            label: 'Employee',
                            render: (_, leave) => {
                                const emp = employees.find(e => e.id === leave.employee_id);
                                return (
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <div>
                                                <p className="font-medium text-slate-800">{emp?.name || `#${leave.employee_id}`}</p>
                                                <p className="text-xs text-slate-400">{emp?.designation || ''}</p>
                                            </div>
                                            {leave.flagged && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                                                    <AlertTriangle className="w-2.5 h-2.5"/>Over limit
                                                </span>
                                            )}
                                        </div>
                                        {leave.approval_remark && (
                                            <p className="text-xs text-slate-400 mt-0.5">Remark: {leave.approval_remark}</p>
                                        )}
                                    </div>
                                );
                            },
                        },
                        {
                            key: 'leave_type',
                            label: 'Type',
                            render: (value) => <span className="text-sm text-slate-600">{getLeaveTypeLabel(value)}</span>,
                        },
                        {
                            key: 'start_date',
                            label: 'Dates',
                            align: 'center',
                            render: (_, leave) => (
                                <span className="text-sm text-slate-600 font-mono">
                                    {leave.is_half_day
                                        ? `${format(parseISO(leave.start_date), 'MMM dd, yyyy')} (0.5d - ${leave.half_day_slot === 'first_half' ? 'First Half' : 'Second Half'})`
                                        : `${format(parseISO(leave.start_date), 'MMM dd')} — ${format(parseISO(leave.end_date), 'MMM dd')}`
                                    }
                                </span>
                            ),
                        },
                        {
                            key: 'status',
                            label: 'Status',
                            align: 'center',
                            render: (value) => {
                                const s = value || 'pending';
                                return (
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[s]}`}>
                                        {s === 'pending' && <Clock className="w-3 h-3"/>}
                                        {s === 'approved' && <CheckCircle className="w-3 h-3"/>}
                                        {s === 'rejected' && <XCircle className="w-3 h-3"/>}
                                        {s}
                                    </span>
                                );
                            },
                        },
                        {
                            key: '_actions',
                            label: 'Actions',
                            align: 'right',
                            render: (_, leave) => {
                                const status = leave.status || 'pending';
                                return status === 'pending' ? (
                                    <div className="flex items-center justify-end gap-2">
                                                        <Button variant="success" size="sm" onClick={() => handleApprove(leave)}>Approve</Button>
                                        <Button variant="danger" size="sm" onClick={() => rejectMutation.mutate(leave.leave_id)}>Reject</Button>
                                    </div>
                                ) : <span className="text-xs text-slate-400">—</span>;
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
                    loading={wfhLoading}
                    columns={[
                        {
                            key: 'employee_name',
                            label: 'Employee',
                            render: (value) => <span className="font-medium text-slate-800">{value}</span>,
                        },
                        {
                            key: 'wfh_date',
                            label: 'Date',
                            render: (value) => <span className="text-sm text-slate-600">{format(new Date(value + 'T00:00:00'), 'MMM d, yyyy')}</span>,
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
                            render: (value) => {
                                const s = value || 'pending';
                                return (
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[s] || STATUS_STYLES.pending}`}>
                                        {s === 'pending' && <Clock className="w-3 h-3"/>}
                                        {s === 'approved' && <CheckCircle className="w-3 h-3"/>}
                                        {s === 'rejected' && <XCircle className="w-3 h-3"/>}
                                        {s}
                                    </span>
                                );
                            },
                        },
                        {
                            key: '_wfh_actions',
                            label: 'Actions',
                            align: 'right',
                            render: (_, w) => w.status === 'pending' ? (
                                <div className="flex items-center justify-end gap-2">
                                    <Button variant="success" size="sm" onClick={() => wfhApproveMutation.mutate(w.id)}>Approve</Button>
                                    <Button variant="danger" size="sm" onClick={() => wfhRejectMutation.mutate(w.id)}>Reject</Button>
                                </div>
                            ) : <span className="text-xs text-slate-400">—</span>,
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
