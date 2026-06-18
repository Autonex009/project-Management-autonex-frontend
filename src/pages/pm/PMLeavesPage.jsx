import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveApi, allocationApi, employeeApi, subProjectApi, wfhApi, parentProjectApi } from '../../services/api';
import { Calendar, CheckCircle, XCircle, Clock, AlertTriangle, Home } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { getPmEmployeeId, getPmSubProjects } from '../../utils/pmScope';
import { getLeaveTypeLabel } from '../../utils/leaveTypes';
import LeaveCalendar from '../../components/LeaveCalendar';

const TABS = ['Leave Requests', 'Calendar', 'WFH Requests'];

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
    const { data: wfhRequests = [] } = useQuery({ queryKey: ['wfh'], queryFn: () => wfhApi.getAll() });

    const scopedProjects = getPmSubProjects(projects, parentProjects, employeeId, allocations);
    const myProjectIds = new Set(scopedProjects.map(p => p.id));
    const teamEmployeeIds = new Set(allocations.filter(a => myProjectIds.has(a.sub_project_id)).map(a => a.employee_id));

    const teamLeaves = allLeaves.filter(l => teamEmployeeIds.has(l.employee_id));
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
                         tab === 'Calendar' ? <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/>{tab}</span> : tab}
                    </button>
                ))}
            </div>

            {/* ── Leave Requests ── */}
            {activeTab === 'Leave Requests' && (
                isLoading ? (
                    <div className="text-center py-12 text-slate-400 animate-pulse">Loading...</div>
                ) : teamLeaves.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                        <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium">No leave requests</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Employee</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                                        <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Dates</th>
                                        <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                                        <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {teamLeaves.map(leave => {
                                        const emp = employees.find(e => e.id === leave.employee_id);
                                        const status = leave.status || 'pending';
                                        return (
                                            <tr key={leave.leave_id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-5 py-3.5">
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
                                                </td>
                                                <td className="px-5 py-3.5 text-sm text-slate-600">{getLeaveTypeLabel(leave.leave_type)}</td>
                                                <td className="px-5 py-3.5 text-center text-sm text-slate-600 font-mono">
                                                    {format(parseISO(leave.start_date), 'MMM dd')} — {format(parseISO(leave.end_date), 'MMM dd')}
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[status]}`}>
                                                        {status === 'pending' && <Clock className="w-3 h-3"/>}
                                                        {status === 'approved' && <CheckCircle className="w-3 h-3"/>}
                                                        {status === 'rejected' && <XCircle className="w-3 h-3"/>}
                                                        {status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    {status === 'pending' ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button onClick={() => handleApprove(leave)}
                                                                className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                                                                Approve
                                                            </button>
                                                            <button onClick={() => rejectMutation.mutate(leave.leave_id)}
                                                                className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                                                                Reject
                                                            </button>
                                                        </div>
                                                    ) : <span className="text-xs text-slate-400">—</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            )}

            {/* ── Calendar ── */}
            {activeTab === 'Calendar' && (
                <LeaveCalendar filterEmployeeIds={teamEmployeeIds.size > 0 ? teamEmployeeIds : null} />
            )}

            {/* ── WFH Requests ── */}
            {activeTab === 'WFH Requests' && (
                teamWfh.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                        <Home className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium">No WFH requests from your team</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        {['Employee', 'Date', 'Reason', 'Status', 'Actions'].map(h => (
                                            <th key={h} className={`px-5 py-3 text-xs font-semibold text-slate-500 uppercase ${h === 'Status' ? 'text-center' : h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {teamWfh.map(w => (
                                        <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-5 py-3.5 font-medium text-slate-800">{w.employee_name}</td>
                                            <td className="px-5 py-3.5 text-sm text-slate-600">{format(new Date(w.wfh_date + 'T00:00:00'), 'MMM d, yyyy')}</td>
                                            <td className="px-5 py-3.5 text-sm text-slate-500">{w.reason || '—'}</td>
                                            <td className="px-5 py-3.5 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[w.status] || STATUS_STYLES.pending}`}>
                                                    {w.status === 'pending' && <Clock className="w-3 h-3"/>}
                                                    {w.status === 'approved' && <CheckCircle className="w-3 h-3"/>}
                                                    {w.status === 'rejected' && <XCircle className="w-3 h-3"/>}
                                                    {w.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                {w.status === 'pending' ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => wfhApproveMutation.mutate(w.id)}
                                                            className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">Approve</button>
                                                        <button onClick={() => wfhRejectMutation.mutate(w.id)}
                                                            className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">Reject</button>
                                                    </div>
                                                ) : <span className="text-xs text-slate-400">—</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            )}

            {/* ── Flagged leave remark modal ── */}
            {remarkModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
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
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={() => { setRemarkModal(null); setRemark(''); }}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                            <button onClick={() => approveMutation.mutate({ id: remarkModal.leaveId, remark })}
                                disabled={!remark.trim() || approveMutation.isPending}
                                className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">
                                {approveMutation.isPending ? 'Approving...' : 'Approve with Remark'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PMLeavesPage;
