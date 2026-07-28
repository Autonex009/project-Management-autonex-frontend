import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveApi, employeeApi, wfhApi } from '../services/api';
import Spinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import { Plus, Calendar, Trash2, CheckCircle, XCircle, Clock, AlertTriangle, Home, BarChart2, RotateCcw, Filter } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { getEndDateValidationMessage, isEndDateBeforeStartDate } from '../utils/dateValidation';
import { getLeaveTypeBadgeClass, getLeaveTypeLabel, LEAVE_TYPE_OPTIONS, getWorkingDayCount, validateConsecutiveLeaves } from '../utils/leaveTypes';
import LeaveCalendar from '../components/LeaveCalendar';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import SearchBar from '../components/ui/SearchBar';
import Dropdown from '../components/ui/Dropdown';
import Table from '../components/ui/Table';
import EmployeeKPIPanel from '../components/EmployeeKPIPanel';
import Modal from '../components/ui/Modal';

const TABS = ['Leave List', 'Calendar', 'WFH Requests', 'Employee KPI'];

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
 const [statusFilter, setStatusFilter] = useState('all'); // all | pending | approved | rejected
 const [todayOnly, setTodayOnly] = useState(false); // only leaves that start today
 const [dateSort, setDateSort] = useState(''); // '' | 'asc' (Jan→Dec) | 'desc' (Dec→Jan)
 const [filtersOpen, setFiltersOpen] = useState(false);
 const filtersRef = useRef(null);
 useEffect(() => {
 const handler = (e) => { if (filtersRef.current && !filtersRef.current.contains(e.target)) setFiltersOpen(false); };
 document.addEventListener('mousedown', handler);
 return () => document.removeEventListener('mousedown', handler);
 }, []);
 const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (todayOnly ? 1 : 0);
 const [remarkModal, setRemarkModal] = useState(null); // { leaveId }
 const [remark, setRemark] = useState('');
 const [deleteTarget, setDeleteTarget] = useState(null);
 const [wfhDeleteConfirm, setWfhDeleteConfirm] = useState(null);
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

 const { data: wfhRequests = [], isLoading: wfhLoading } = useQuery({
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

 const undoApproveMutation = useMutation({
 mutationFn: (id) => leaveApi.undoApprove(id, user.id),
 onSuccess: () => { queryClient.invalidateQueries(['leaves']); queryClient.invalidateQueries(['leave-calendar']); toast.success('Leave approval undone'); },
 onError: (err) => toast.error(err.response?.data?.detail || 'Failed to undo approval'),
 });

 const undoRejectMutation = useMutation({
 mutationFn: (id) => leaveApi.undoReject(id, user.id),
 onSuccess: () => { queryClient.invalidateQueries(['leaves']); queryClient.invalidateQueries(['leave-calendar']); toast.success('Leave rejection undone'); },
 onError: (err) => toast.error(err.response?.data?.detail || 'Failed to undo rejection'),
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

 const wfhUndoApproveMutation = useMutation({
 mutationFn: (id) => wfhApi.undoApprove(id, user.id),
 onSuccess: () => { queryClient.invalidateQueries(['wfh']); queryClient.invalidateQueries(['leave-calendar']); toast.success('WFH approval undone'); },
 onError: (err) => toast.error(err.response?.data?.detail || 'Failed to undo approval'),
 });

 const wfhUndoRejectMutation = useMutation({
 mutationFn: (id) => wfhApi.undoReject(id, user.id),
 onSuccess: () => { queryClient.invalidateQueries(['wfh']); toast.success('WFH rejection undone'); },
 onError: (err) => toast.error(err.response?.data?.detail || 'Failed to undo rejection'),
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
 toast.error('Safe guard triggered: You cannot apply for 5 or more consecutive leaves.');
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

 const todayStr = format(new Date(), 'yyyy-MM-dd');
 const filteredLeaves = leaves.filter(leave => {
 if (!leave.start_date || !leave.end_date) return false;
 const name = getEmployeeName(leave.employee_id).toLowerCase();
 const typeLabel = getLeaveTypeLabel(leave.leave_type).toLowerCase();
 const q = searchQuery.toLowerCase();
 const matchesSearch = name.includes(q) || typeLabel.includes(q);
 const matchesStatus = statusFilter === 'all' || (leave.status || 'pending') === statusFilter;
 const matchesToday = !todayOnly || (leave.start_date || '').slice(0, 10) === todayStr;
 return matchesSearch && matchesStatus && matchesToday;
 });
 // Sort by start date. 'YYYY-MM-DD' sorts lexicographically = chronologically,
 // so ascending = Jan→Dec (1→31) and descending = Dec→Jan (31→1).
 if (dateSort) {
 filteredLeaves.sort((a, b) => {
 const cmp = (a.start_date || '').localeCompare(b.start_date || '');
 return dateSort === 'asc' ? cmp : -cmp;
 });
 }

 const filteredWFH = wfhRequests.filter(w => {
 const name = (w.employee_name || getEmployeeName(w.employee_id)).toLowerCase();
 const reason = (w.reason || '').toLowerCase();
 const q = searchQuery.toLowerCase();
 const matchesSearch = name.includes(q) || reason.includes(q);
 const matchesStatus = statusFilter === 'all' || (w.status || 'pending') === statusFilter;
 const matchesToday = !todayOnly || (w.wfh_date || '').slice(0, 10) === todayStr;
 return matchesSearch && matchesStatus && matchesToday;
 });
 // Sort by WFH date, same chronological rule as leaves.
 if (dateSort) {
 filteredWFH.sort((a, b) => {
 const cmp = (a.wfh_date || '').localeCompare(b.wfh_date || '');
 return dateSort === 'asc' ? cmp : -cmp;
 });
 }


 const STATUS_BADGE = {
 pending: <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3 h-3"/>Pending</span>,
 approved: <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-3 h-3"/>Approved</span>,
 rejected: <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"><XCircle className="w-3 h-3"/>Rejected</span>,
 };

 return (
 <div className="space-y-4">
 {/* Header */}
 <div>
 <h1 className="text-lg font-semibold text-slate-900">Leave Management</h1>
 <p className="mt-0.5 text-[13px] text-slate-500">Track employee leaves, WFH requests, and attendance</p>
 </div>

 {/* Tabs · Search · Add Leave */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 w-fit">
 {TABS.map(tab => {
 const isActive = activeTab === tab;
 return (
 <button key={tab} onClick={() => handleTabChange(tab)}
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

 <div className="flex items-center gap-2">
 {(activeTab === 'Leave List' || activeTab === 'WFH Requests') && (
 <div ref={filtersRef} className="relative shrink-0">
 <button
 type="button"
 onClick={() => setFiltersOpen((o) => !o)}
 className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
 >
 <Filter className="w-4 h-4 text-slate-500" />
 Filters
 {activeFilterCount > 0 && (
 <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-indigo-600 text-white text-[10px] font-semibold">{activeFilterCount}</span>
 )}
 </button>
 {filtersOpen && (
 <div className="absolute left-0 mt-1.5 z-40 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-3 space-y-3">
 <div className="space-y-1.5">
 <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</label>
 <Dropdown
 options={[
 { value: 'all', label: 'All Status' },
 { value: 'pending', label: 'Pending' },
 { value: 'approved', label: 'Approved' },
 { value: 'rejected', label: 'Rejected' },
 ]}
 value={statusFilter}
 onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
 placeholder="All Status"
 optionsClassName="w-full"
 />
 </div>
 <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
 <span className="text-[13px] font-medium text-slate-600">{activeTab === 'WFH Requests' ? "Today's WFH" : "Today's Leaves"}</span>
 <button
 type="button"
 onClick={() => { setTodayOnly((t) => !t); setCurrentPage(1); }}
 className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${todayOnly ? 'bg-indigo-600' : 'bg-slate-200'}`}
 >
 <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${todayOnly ? 'translate-x-4' : 'translate-x-0.5'}`} />
 </button>
 </div>
 {activeFilterCount > 0 && (
 <button
 type="button"
 onClick={() => { setStatusFilter('all'); setTodayOnly(false); setCurrentPage(1); }}
 className="w-full text-center pt-2.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 border-t border-slate-100"
 >
 Clear filters
 </button>
 )}
 </div>
 )}
 </div>
 )}
 {(activeTab === 'Leave List' || activeTab === 'WFH Requests') && (
 <div className="shrink-0">
 <Dropdown
 options={[
 { value: '', label: 'Sort: Default' },
 { value: 'asc', label: activeTab === 'WFH Requests' ? 'WFH date: Jan → Dec' : 'Start date: Jan → Dec' },
 { value: 'desc', label: activeTab === 'WFH Requests' ? 'WFH date: Dec → Jan' : 'Start date: Dec → Jan' },
 ]}
 value={dateSort}
 onChange={(v) => { setDateSort(v); setCurrentPage(1); }}
 placeholder="Sort by date"
 />
 </div>
 )}
 {activeTab !== 'Calendar' && activeTab !== 'Employee KPI' && (
 <SearchBar responsive
 value={searchQuery}
 onChange={handleSearchChange}
 placeholder={activeTab === 'WFH Requests' ? "Search WFH requests..." : "Search leaves..."}
 />
 )}
 {activeTab === 'Leave List' && (
 <button
 type="button"
 onClick={() => setIsModalOpen(true)}
 className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700 shadow-sm transition-colors shrink-0"
 >
 <Plus className="w-4 h-4" /> Add Leave
 </button>
 )}
 </div>
 </div>

 {/* ── Tab: Leave List ── */}
 {activeTab === 'Leave List' && (
 <Table
 variant="untitled"
 columns={[
 {
 key: 'employee_id',
 label: 'Employee',
 width: 'w-[22%]',
 render: (_, leave) => (
 <div className="min-w-0">
 <div className="flex items-center gap-2 min-w-0">
 <span className="font-semibold text-slate-800 truncate">{getEmployeeName(leave.employee_id)}</span>
 {leave.flagged && (
 <span
 title="Over limit"
 className="inline-flex items-center justify-center h-5 w-5 shrink-0 rounded-full bg-orange-100 text-orange-600 border border-orange-200 cursor-help"
 >
 <AlertTriangle className="w-3 h-3" />
 </span>
 )}
 </div>
 {leave.approval_remark && (
 <p className="text-xs text-slate-400 mt-0.5 truncate">Remark: {leave.approval_remark}</p>
 )}
 </div>
 ),
 },
 {
 key: 'leave_type',
 label: 'Leave Type',
 width: 'w-[14%]',
 render: (value) => (
 <span className={`inline-flex whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-medium ${getLeaveTypeBadgeClass(value)}`}>
 {getLeaveTypeLabel(value)
 .replace('Second Half-day Leave', '2nd Half-day')
 .replace('First Half-day Leave', '1st Half-day')}
 </span>
 ),
 },
 {
 key: 'start_date',
 label: 'Start Date',
 width: 'w-[12%]',
 render: (value) => <span className="text-[13px] text-slate-700 whitespace-nowrap">{format(new Date(value + 'T00:00:00'), 'MMM d, yyyy')}</span>,
 },
 {
 key: 'end_date',
 label: 'End Date',
 width: 'w-[12%]',
 render: (value) => <span className="text-[13px] text-slate-700 whitespace-nowrap">{format(new Date(value + 'T00:00:00'), 'MMM d, yyyy')}</span>,
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
 const btn = 'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50';
 const iconBtn = 'inline-flex items-center justify-center h-8 w-8 rounded-md border transition-colors disabled:opacity-50';
 return (
 <div className="flex items-center justify-end gap-1.5">
 {isPending && (
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
 )}
 {leave.status === 'approved' && (
 <button onClick={() => undoApproveMutation.mutate(leave.leave_id)} disabled={undoApproveMutation.isPending}
 className={`${btn} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}>
 <RotateCcw className="w-3.5 h-3.5"/>Undo
 </button>
 )}
 {leave.status === 'rejected' && (
 <button onClick={() => undoRejectMutation.mutate(leave.leave_id)} disabled={undoRejectMutation.isPending}
 className={`${btn} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}>
 <RotateCcw className="w-3.5 h-3.5"/>Undo
 </button>
 )}
 <button onClick={() => setDeleteTarget(leave)}
 className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
 <Trash2 className="w-4 h-4"/>
 </button>
 </div>
 );
 },
 },
 ]}
 data={filteredLeaves}
 currentPage={currentPage}
 pageSize={PAGE_SIZE}
 onPageChange={setCurrentPage}
 loading={isLoading}
 emptyState={{ title: 'No leaves recorded yet', description: 'Try adjusting your search query' }}
 />
 )}

 {/* ── Tab: Calendar ── */}
 {activeTab === 'Calendar' && <LeaveCalendar />}

 {/* ── Tab: WFH Requests ── */}
 {activeTab === 'WFH Requests' && (
 <Table
 variant="untitled"
 loading={wfhLoading}
 columns={[
 {
 key: 'employee_name',
 label: 'Employee',
 render: (value, w) => <span className="font-semibold text-slate-800">{value || getEmployeeName(w.employee_id)}</span>,
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
 {w.status === 'pending' && (
 <>
 <button onClick={() => wfhApproveMutation.mutate(w.id)} disabled={wfhApproveMutation.isPending} title="Approve"
 className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50">
 <CheckCircle className="w-4 h-4"/>
 </button>
 <button onClick={() => wfhRejectMutation.mutate(w.id)} disabled={wfhRejectMutation.isPending} title="Reject"
 className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50">
 <XCircle className="w-4 h-4"/>
 </button>
 </>
 )}
 {w.status === 'approved' && (
 <Button variant="secondary" size="sm" onClick={() => wfhUndoApproveMutation.mutate(w.id)} disabled={wfhUndoApproveMutation.isPending}>
 <RotateCcw className="w-3.5 h-3.5"/>Undo
 </Button>
 )}
 {w.status === 'rejected' && (
 <Button variant="secondary" size="sm" onClick={() => wfhUndoRejectMutation.mutate(w.id)} disabled={wfhUndoRejectMutation.isPending}>
 <RotateCcw className="w-3.5 h-3.5"/>Undo
 </Button>
 )}
 <button onClick={() => setWfhDeleteConfirm(w.id)}
 className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
 <Trash2 className="w-4 h-4"/>
 </button>
 </div>
 ),
 },
 ]}
 data={filteredWFH}
 emptyState={{ title: 'No WFH requests yet', description: 'WFH requests will appear here' }}
 />
 )}

 {/* ── Tab: Employee KPI ── */}
 {activeTab === 'Employee KPI' && (
 <EmployeeKPIPanel 
 employees={employees} 
 leaves={leaves} 
 wfhRequests={wfhRequests} 
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
 </Modal.Body>
 <Modal.Footer>
 <Button variant="cancel" onClick={() => { setRemarkModal(null); setRemark(''); }}>Cancel</Button>
 <Button variant="success" onClick={() => approveMutation.mutate({ id: remarkModal.leaveId, remark })} disabled={!remark.trim() || approveMutation.isPending} isLoading={approveMutation.isPending}>
 {!approveMutation.isPending && 'Approve with Remark'}
 </Button>
 </Modal.Footer>
 </Modal>
 )}

 {/* ── Add Leave Modal ── */}
 <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setFormEmployeeId(''); }} size="md">
 <Modal.Header onClose={() => { setIsModalOpen(false); setFormEmployeeId(''); }}>
 <h2 className="text-xl font-semibold text-gray-900">Add Leave</h2>
 </Modal.Header>
 <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
 <Modal.Body className="space-y-4">
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
 </Modal.Body>
 <Modal.Footer>
 <Button type="button" variant="cancel" onClick={() => { setIsModalOpen(false); setSelectedLeaveType(''); setFormEmployeeId(''); }}>Cancel</Button>
 <Button type="submit" disabled={createMutation.isPending || activeEmployees.length === 0} isLoading={createMutation.isPending}>
 {!createMutation.isPending && 'Create Leave'}
 </Button>
 </Modal.Footer>
 </form>
 </Modal>
 {deleteTarget && (
 <ConfirmDialog
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
 variant="danger"
 confirmText="Delete"
 cancelText="Cancel"
 />
 )}
 <ConfirmDialog
 isOpen={wfhDeleteConfirm !== null}
 onClose={() => setWfhDeleteConfirm(null)}
 onConfirm={() => { wfhDeleteMutation.mutate(wfhDeleteConfirm); setWfhDeleteConfirm(null); }}
 title="Delete WFH Request"
 message="Are you sure you want to delete this WFH request? This action cannot be undone."
 variant="danger"
 confirmText="Delete"
 isPending={wfhDeleteMutation.isPending}
 />
 </div>
 );
};

export default LeavesPage;
