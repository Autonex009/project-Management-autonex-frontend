import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveApi, employeeApi, wfhApi } from '../services/api';
import { Plus, X, Calendar, Trash2, CheckCircle, XCircle, Clock, AlertTriangle, Home } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { getEndDateValidationMessage, isEndDateBeforeStartDate } from '../utils/dateValidation';
import { getLeaveTypeBadgeClass, getLeaveTypeLabel, LEAVE_TYPE_OPTIONS, getWorkingDayCount, validateConsecutiveLeaves } from '../utils/leaveTypes';
import LeaveCalendar from '../components/LeaveCalendar';
import DeleteConfirmModal from '../components/ui/DeleteConfirmModal';
import PageSearchBar from '../components/ui/PageSearchBar';
import Dropdown from '../components/ui/Dropdown';

const TABS = ['Leave List', 'Calendar', 'WFH Requests'];

const getISTDateTime = () => {
    const d = new Date();
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(d);
    const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));
    
    const yr = parseInt(partMap.year);
    const mo = parseInt(partMap.month) - 1;
    const dy = parseInt(partMap.day);
    const hr = parseInt(partMap.hour);
    const min = parseInt(partMap.minute);
    
    return {
        dateStr: `${partMap.year}-${partMap.month}-${partMap.day}`,
        hour: hr,
        minute: min
    };
};

const checkHalfDayTiming = (startDateStr, slot) => {
    const ist = getISTDateTime();
    const todayStr = ist.dateStr;
    
    if (slot === 'first_half') {
        if (todayStr >= startDateStr) {
            return 'First-half leaves must be applied at least one day in advance.';
        }
    } else if (slot === 'second_half') {
        if (todayStr > startDateStr) {
            return 'Cannot apply for a second-half leave after the request date has passed.';
        } else if (todayStr === startDateStr) {
            if (ist.hour >= 14) {
                return 'Second-half leaves must be applied before 2:00 PM on the same day.';
            }
        }
    }
    return null;
};

const LeavesPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('Leave List');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [remarkModal, setRemarkModal] = useState(null); // { leaveId }
  const [remark, setRemark] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ['leaves'],
    queryFn: leaveApi.getAll,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: employeeApi.getAll,
  });

  const { data: wfhRequests = [] } = useQuery({
    queryKey: ['wfh'],
    queryFn: () => wfhApi.getAll(),
  });

  // ── Leave mutations ──────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: ({ id, remark }) => leaveApi.approve(id, user.id, remark),
    onSuccess: () => {
      queryClient.invalidateQueries(['leaves']);
      setRemarkModal(null);
      setRemark('');
      toast.success('Leave approved');
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to approve leave'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => leaveApi.reject(id, user.id),
    onSuccess: () => { queryClient.invalidateQueries(['leaves']); toast.success('Leave rejected'); },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to reject leave'),
  });

  const createMutation = useMutation({
    mutationFn: leaveApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['leaves']);
      setIsModalOpen(false);
      setSelectedLeaveType('');
      setFormEmployeeId('');
      toast.success('Leave record created successfully');
    },
    onError: (err) => toast.error(err.response?.data?.detail || err.message || 'Failed to create leave'),
  });

  const deleteMutation = useMutation({
    mutationFn: leaveApi.delete,
    onSuccess: () => { queryClient.invalidateQueries(['leaves']); toast.success('Leave deleted'); },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to delete leave'),
  });

  // ── WFH mutations ────────────────────────────────────────────────
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

  const wfhDeleteMutation = useMutation({
    mutationFn: wfhApi.delete,
    onSuccess: () => { queryClient.invalidateQueries(['wfh']); toast.success('WFH request deleted'); },
  });

  const handleApprove = (leave) => {
    if (leave.flagged) {
      setRemarkModal({ leaveId: leave.leave_id });
    } else {
      approveMutation.mutate({ id: leave.leave_id, remark: null });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const employeeId = formData.get('employee_id');
    const startDate = formData.get('start_date');
    const leaveType = formData.get('leave_type');
    const isHalf = leaveType === 'first_half' || leaveType === 'second_half';
    const endDate = isHalf ? startDate : formData.get('end_date');
    if (!employeeId) { toast.error('Please select an employee'); return; }
    
    if (isHalf) {
      const timingErr = checkHalfDayTiming(startDate, leaveType);
      if (timingErr) {
        toast.error(timingErr);
        return;
      }
    } else {
      if (isEndDateBeforeStartDate(startDate, endDate)) {
        toast.error(getEndDateValidationMessage());
        return;
      }
    }

    const empIdInt = parseInt(employeeId);
    const empLeaves = leaves.filter(l => l.employee_id === empIdInt);

    // Validate consecutive leaves safeguard
    if (leaveType !== 'wfh' && !validateConsecutiveLeaves(startDate, endDate, empLeaves, null, isHalf)) {
      toast.error('Safe guard triggered: You cannot apply for 4 or more consecutive leaves.');
      return;
    }

    createMutation.mutate({
      employee_id: parseInt(employeeId),
      start_date: startDate,
      end_date: endDate,
      leave_type: leaveType,
      is_half_day: isHalf,
      half_day_slot: isHalf ? leaveType : null,
    });
  };

  const getEmployeeName = (id) => employees.find(e => e.id === id)?.name || `Employee #${id}`;
  const activeEmployees = employees.filter(e => e.status === 'active');

  // Pagination: reset to page 1 when tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchQuery('');
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const filteredLeaves = leaves.filter(leave => {
    const name = getEmployeeName(leave.employee_id).toLowerCase();
    const typeLabel = getLeaveTypeLabel(leave.leave_type).toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || typeLabel.includes(q);
  });

  const filteredWFH = wfhRequests.filter(w => {
    const name = (w.employee_name || getEmployeeName(w.employee_id)).toLowerCase();
    const reason = (w.reason || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || reason.includes(q);
  });

  const totalPages = Math.ceil(filteredLeaves.length / PAGE_SIZE);
  const paginatedLeaves = filteredLeaves.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const STATUS_BADGE = {
    pending:  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3 h-3"/>Pending</span>,
    approved: <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-3 h-3"/>Approved</span>,
    rejected: <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"><XCircle className="w-3 h-3"/>Rejected</span>,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Leave Management</h1>
          <p className="mt-1 text-sm text-slate-500">Track employee leaves, WFH requests, and attendance</p>
        </div>
        {activeTab === 'Leave List' && (
          <button onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm self-start sm:self-auto">
            <Plus className="w-4 h-4" /> Add Leave
          </button>
        )}
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {TABS.map(tab => (
            <button key={tab} onClick={() => handleTabChange(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {tab === 'WFH Requests' ? <span className="flex items-center gap-1.5"><Home className="w-3.5 h-3.5"/>{tab}</span> :
               tab === 'Calendar' ? <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/>{tab}</span> : tab}
            </button>
          ))}
        </div>

        {activeTab !== 'Calendar' && (
          <PageSearchBar
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={activeTab === 'WFH Requests' ? "Search WFH requests..." : "Search leaves..."}
          />
        )}
      </div>

      {/* ── Tab: Leave List ── */}
      {activeTab === 'Leave List' && (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">Loading leaves...</div>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    {['Employee', 'Leave Type', 'Start Date', 'End Date', 'Duration', 'Status', 'Actions'].map(h => (
                      <th key={h} className={`px-5 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider ${h === 'Duration' || h === 'Status' ? 'text-center' : h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeaves.length === 0 ? (
                    <tr><td colSpan="7" className="px-5 py-16 text-center text-slate-400">No leaves recorded yet</td></tr>
                  ) : paginatedLeaves.map((leave) => {
                    const start = new Date(leave.start_date + 'T00:00:00');
                    const end = new Date(leave.end_date + 'T00:00:00');
                    // Working days only (excl. weekends & fixed holidays) — matches the
                    // employee form and payroll deduction logic.
                    const duration = getWorkingDayCount(leave.start_date, leave.end_date, leave.is_half_day);
                    const isPending = !leave.status || leave.status === 'pending';
                    return (
                      <tr key={leave.leave_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">{getEmployeeName(leave.employee_id)}</span>
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
                        <td className="px-5 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getLeaveTypeBadgeClass(leave.leave_type)}`}>
                            {getLeaveTypeLabel(leave.leave_type)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700">{format(start, 'MMM d, yyyy')}</td>
                        <td className="px-5 py-4 text-sm text-slate-700">{format(end, 'MMM d, yyyy')}</td>
                        <td className="px-5 py-4 text-center">
                          <span className="text-lg font-semibold text-slate-800">{duration}</span>
                          <span className="text-xs text-slate-400 ml-1">
                            {leave.is_half_day ? (
                              <>day ({leave.half_day_slot === 'first_half' ? 'First Half' : 'Second Half'})</>
                            ) : (
                              duration === 1 ? 'day' : 'days'
                            )}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">{STATUS_BADGE[leave.status] || STATUS_BADGE.pending}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isPending && (
                              <>
                                <button onClick={() => handleApprove(leave)} disabled={approveMutation.isPending}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">
                                  <CheckCircle className="w-3.5 h-3.5"/>Approve
                                </button>
                                <button onClick={() => rejectMutation.mutate(leave.leave_id)} disabled={rejectMutation.isPending}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50">
                                  <XCircle className="w-3.5 h-3.5"/>Reject
                                </button>
                              </>
                            )}
                            <button onClick={() => setDeleteTarget(leave)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4"/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                <p className="text-sm text-slate-500">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredLeaves.length)} of {filteredLeaves.length} items
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
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
                        <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 text-sm">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                            currentPage === p
                              ? 'bg-indigo-600 border-indigo-600 text-white font-medium'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            </>
          )}
        </div>
      )}

      {/* ── Tab: Calendar ── */}
      {activeTab === 'Calendar' && <LeaveCalendar />}

      {/* ── Tab: WFH Requests ── */}
      {activeTab === 'WFH Requests' && (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  {['Employee', 'Date', 'Reason', 'Status', 'Actions'].map(h => (
                    <th key={h} className={`px-5 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider ${h === 'Status' ? 'text-center' : h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWFH.length === 0 ? (
                  <tr><td colSpan="5" className="px-5 py-16 text-center text-slate-400">No WFH requests yet</td></tr>
                ) : filteredWFH.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-800">{w.employee_name || getEmployeeName(w.employee_id)}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">{format(new Date(w.wfh_date + 'T00:00:00'), 'MMM d, yyyy')}</td>
                    <td className="px-5 py-4 text-sm text-slate-500">{w.reason || '—'}</td>
                    <td className="px-5 py-4 text-center">{STATUS_BADGE[w.status] || STATUS_BADGE.pending}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {w.status === 'pending' && (
                          <>
                            <button onClick={() => wfhApproveMutation.mutate(w.id)} disabled={wfhApproveMutation.isPending}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">
                              <CheckCircle className="w-3.5 h-3.5"/>Approve
                            </button>
                            <button onClick={() => wfhRejectMutation.mutate(w.id)} disabled={wfhRejectMutation.isPending}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50">
                              <XCircle className="w-3.5 h-3.5"/>Reject
                            </button>
                          </>
                        )}
                        <button onClick={() => { if (window.confirm('Delete this WFH request?')) wfhDeleteMutation.mutate(w.id); }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Flagged leave remark modal ── */}
      {remarkModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg shrink-0"><AlertTriangle className="w-5 h-5 text-orange-600"/></div>
              <div>
                <h3 className="font-semibold text-slate-800">Justification Required</h3>
                <p className="text-sm text-slate-500 mt-1">
                  This employee has exceeded the monthly paid leave limit (2 leaves/month).
                  A justification remark is required to approve this request.
                </p>
              </div>
            </div>
            <textarea
              value={remark}
              onChange={e => setRemark(e.target.value)}
              placeholder="Enter justification for approving this additional leave..."
              className="w-full rounded-xl border border-slate-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows={4}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setRemarkModal(null); setRemark(''); }}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={() => approveMutation.mutate({ id: remarkModal.leaveId, remark })}
                disabled={!remark.trim() || approveMutation.isPending}
                className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">
                {approveMutation.isPending ? 'Approving...' : 'Approve with Remark'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Leave Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-full sm:max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Add Leave</h2>
              <button onClick={() => { setIsModalOpen(false); setFormEmployeeId(''); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5"/>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee <span className="text-red-500">*</span></label>
                <input type="hidden" name="employee_id" value={formEmployeeId} />
                <Dropdown
                  options={[{ value: '', label: 'Select employee' }, ...activeEmployees.map(e => ({ value: String(e.id), label: `${e.name} - ${e.employee_type}` }))]}
                  value={formEmployeeId}
                  onChange={setFormEmployeeId}
                  placeholder="Select employee"
                  disabled={activeEmployees.length === 0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type <span className="text-red-500">*</span></label>
                <input type="hidden" name="leave_type" value={selectedLeaveType} />
                <Dropdown
                  options={[{ value: '', label: 'Select type' }, ...LEAVE_TYPE_OPTIONS]}
                  value={selectedLeaveType}
                  onChange={setSelectedLeaveType}
                  placeholder="Select type"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={selectedLeaveType === 'first_half' || selectedLeaveType === 'second_half' ? "col-span-2" : ""}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    { selectedLeaveType === 'first_half' || selectedLeaveType === 'second_half' ? 'Date' : 'Start Date' } <span className="text-red-500">*</span>
                  </label>
                  <input type="date" name="start_date" required className="input"/>
                </div>
                {!(selectedLeaveType === 'first_half' || selectedLeaveType === 'second_half') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date <span className="text-red-500">*</span></label>
                    <input type="date" name="end_date" required className="input"/>
                  </div>
                )}
              </div>
              {(selectedLeaveType === 'first_half' || selectedLeaveType === 'second_half') && (
                <div className="rounded-xl border border-indigo-150 bg-indigo-50/50 p-4 text-sm text-indigo-900 space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold text-indigo-950">
                    <Clock className="w-4 h-4 text-indigo-600"/> Half-day Leave Policy & Slots
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-white rounded-lg border border-indigo-100/80">
                      <p className="font-semibold text-indigo-950">First Half-day Leave</p>
                      <p className="text-slate-600 mt-0.5">🕒 Slot: 9:00 AM – 2:00 PM</p>
                      <p className="text-slate-500 mt-1 font-medium italic">⚠️ Apply at least one day in advance.</p>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-indigo-100/80">
                      <p className="font-semibold text-indigo-950">Second Half-day Leave</p>
                      <p className="text-slate-600 mt-0.5">🕒 Slot: 2:00 PM – 7:00 PM</p>
                      <p className="text-slate-500 mt-1 font-medium italic">⚠️ Apply before 2:00 PM on the same day.</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => { setIsModalOpen(false); setSelectedLeaveType(''); setFormEmployeeId(''); }} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || activeEmployees.length === 0} className="btn btn-primary">
                  {createMutation.isPending ? 'Creating...' : 'Create Leave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            if (deleteTarget) {
              deleteMutation.mutate(deleteTarget.leave_id, {
                onSuccess: () => setDeleteTarget(null)
              });
            }
          }}
          isPending={deleteMutation.isPending}
          title="Delete Leave Record"
          message={`Are you sure you want to delete the ${getLeaveTypeLabel(deleteTarget.leave_type)} record for ${getEmployeeName(deleteTarget.employee_id)} (${deleteTarget.start_date} — ${deleteTarget.end_date})?`}
        />
      )}
    </div>
  );
};

export default LeavesPage;
