import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveApi, wfhApi } from '../services/api';
import { Calendar, Plus, X, CheckCircle, XCircle, Clock, Home, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { getEndDateValidationMessage, isEndDateBeforeStartDate } from '../utils/dateValidation';
import { getLeaveTypeLabel, LEAVE_TYPE_OPTIONS, RAZORPAY_NEGATIVE_BALANCE_NOTE, FLOATER_DATES_2026, isValidFloaterDate, getFloaterDateLabel, isNonWorkingDay, getNonWorkingDayLabel, getWorkingDayCount, countNonWorkingDaysInRange, toLocalISODate, ANNUAL_LEAVE_QUOTA, INTERN_MONTHLY_PAID_QUOTA, isIntern, normalizeLeaveType } from '../utils/leaveTypes';
import LeaveCalendar from './LeaveCalendar';

const TABS = ['My Leaves', 'Calendar', 'Work From Home'];

const today = toLocalISODate(new Date());

const upcomingFloaterDates = FLOATER_DATES_2026.filter((d) => d.date >= today);

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

function FloaterDatePicker({ value, onChange, label = 'Date', required = false }) {
    const isInvalid = value && !isValidFloaterDate(value);
    const matchedLabel = value ? getFloaterDateLabel(value) : null;
    return (
        <div className="md:col-span-2 space-y-2">
            <label className="block text-sm font-medium text-slate-700">{label}</label>
            <input
                type="date"
                value={value}
                onChange={onChange}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${isInvalid ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                required={required}
            />
            {isInvalid && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 inline-block"/> This date is not an approved floater holiday date.
                </p>
            )}
            {matchedLabel && !isInvalid && (
                <p className="text-xs text-emerald-700">Approved: {matchedLabel}</p>
            )}
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs font-medium text-amber-800 mb-1.5">Floater Leave can only be taken on these approved dates:</p>
                <div className="flex flex-wrap gap-1.5">
                    {upcomingFloaterDates.length > 0 ? upcomingFloaterDates.map((d) => (
                        <button
                            key={d.date}
                            type="button"
                            onClick={() => onChange({ target: { value: d.date } })}
                            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                                value === d.date
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-100'
                            }`}
                        >
                            {d.date.slice(5)} — {d.label}
                        </button>
                    )) : (
                        <span className="text-xs text-amber-700">No upcoming floater dates for this year.</span>
                    )}
                </div>
            </div>
        </div>
    );
}

function DateRangeSummary({ startDate, endDate, isHalfDay = false }) {
    if (!startDate || !endDate || (!isHalfDay && endDate < startDate)) return null;
    const effectiveEndDate = isHalfDay ? startDate : endDate;
    const workingDays = getWorkingDayCount(startDate, effectiveEndDate, isHalfDay);
    const skipped = isHalfDay ? 0 : countNonWorkingDaysInRange(startDate, effectiveEndDate);
    const startNonWorking = isNonWorkingDay(startDate);
    const endNonWorking = !isHalfDay && isNonWorkingDay(effectiveEndDate);
    if (workingDays === 0) {
        return (
            <div className="md:col-span-2">
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0"/>
                    <span>No working days in this range — all selected dates are weekends or public holidays. Please adjust your dates.</span>
                </div>
            </div>
        );
    }
    return (
        <div className="md:col-span-2 space-y-2">
            {(startNonWorking || endNonWorking) && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0"/>
                    <span>
                        {startNonWorking && <>Start date falls on a <strong>{getNonWorkingDayLabel(startDate)}</strong>. </>}
                        {endNonWorking && <>End date falls on a <strong>{getNonWorkingDayLabel(effectiveEndDate)}</strong>. </>}
                        Weekends and public holidays are not counted as leave days.
                    </span>
                </div>
            )}
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <span className="font-medium">{workingDays} working day{workingDays !== 1 ? 's' : ''}</span>
                {skipped > 0 && (
                    <span className="text-slate-400">— {skipped} weekend{skipped !== 1 ? 's' : ''}/holiday{skipped !== 1 ? 's' : ''} will be automatically skipped</span>
                )}
            </div>
        </div>
    );
}

const STATUS_STYLES = {
    pending:  'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
};

const BALANCE_ACCENTS = {
    paid: 'border-blue-200 bg-blue-50/60',
    casual_sick: 'border-emerald-200 bg-emerald-50/60',
    floater: 'border-amber-200 bg-amber-50/60',
};

/**
 * Self-service leave & WFH management panel. Reads the signed-in user's
 * employee_id from localStorage, so it works identically for employees and PMs
 * (PMs are linked to an employee record at login). All requests go through the
 * shared leave/WFH APIs; approval/rejection is performed by the PM (for
 * employees) or Admin (for PMs) elsewhere.
 */
const MyLeavesPanel = ({
    title = 'Leaves & Attendance',
    subtitle = 'Manage your time off and WFH requests',
}) => {
    const queryClient = useQueryClient();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const employeeId = user.employee_id;

    const [activeTab, setActiveTab] = useState('My Leaves');
    const [showLeaveForm, setShowLeaveForm] = useState(false);
    const [showWfhForm, setShowWfhForm] = useState(false);
    const [leaveForm, setLeaveForm] = useState({ leave_type: 'paid', start_date: '', end_date: '', reason: '', is_half_day: false, half_day_slot: '' });
    const [wfhForm, setWfhForm] = useState({ wfh_date: '', end_date: '', reason: '' });
    const [editingLeave, setEditingLeave] = useState(null);
    const [editForm, setEditForm] = useState({ leave_type: 'paid', start_date: '', end_date: '', reason: '', is_half_day: false, half_day_slot: '' });
    const [editingWfh, setEditingWfh] = useState(null);
    const [editWfhForm, setEditWfhForm] = useState({ wfh_date: '', end_date: '', reason: '' });

    // Edit/delete only allowed when the date is strictly in the future
    const canModify = (leave) => leave.start_date > today;
    const canModifyWfh = (wfh) => wfh.wfh_date > today;

    const { data: allLeaves = [], isLoading } = useQuery({
        queryKey: ['my-leaves', employeeId],
        queryFn: () => leaveApi.getAll({ employee_id: employeeId }),
        enabled: !!employeeId,
    });

    const { data: myWfh = [] } = useQuery({
        queryKey: ['my-wfh', employeeId],
        queryFn: () => wfhApi.getAll({ employee_id: employeeId }),
        enabled: !!employeeId,
    });

    // ── Leave balances (computed locally from approved leaves) ──
    // Mirrors the backend entitlement model: remaining = quota − approved
    // working-days used. Employees use annual quotas; interns accrue PAID leave
    // monthly (1/month, resets each month). Days beyond quota become unpaid.
    const intern = isIntern(user.employee_type);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based
    const balances = useMemo(() => {
        const usedYear = {};
        Object.keys(ANNUAL_LEAVE_QUOTA).forEach((t) => { usedYear[t] = 0; });
        let paidUsedThisMonth = 0;
        allLeaves.forEach((leave) => {
            if ((leave.status || 'pending') !== 'approved') return;
            if (leave.is_half_day) return;
            const type = normalizeLeaveType(leave.leave_type);
            const d = new Date(leave.start_date + 'T00:00:00');
            const days = getWorkingDayCount(leave.start_date, leave.end_date);
            if (intern && type === 'paid') {
                if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) paidUsedThisMonth += days;
                return;
            }
            if (!(type in usedYear)) return;
            if (d.getFullYear() !== currentYear) return;
            usedYear[type] += days;
        });

        const cards = [];
        if (intern) {
            cards.push({
                type: 'paid',
                quota: INTERN_MONTHLY_PAID_QUOTA,
                used: paidUsedThisMonth,
                remaining: Math.max(INTERN_MONTHLY_PAID_QUOTA - paidUsedThisMonth, 0),
                period: 'month',
            });
        } else {
            cards.push({
                type: 'paid',
                quota: ANNUAL_LEAVE_QUOTA.paid,
                used: usedYear.paid,
                remaining: Math.max(ANNUAL_LEAVE_QUOTA.paid - usedYear.paid, 0),
                period: 'year',
            });
        }
        ['casual_sick', 'floater'].forEach((t) => cards.push({
            type: t,
            quota: ANNUAL_LEAVE_QUOTA[t],
            used: usedYear[t],
            remaining: Math.max(ANNUAL_LEAVE_QUOTA[t] - usedYear[t], 0),
            period: 'year',
        }));
        return cards;
    }, [allLeaves, intern, currentYear, currentMonth]);

    const createLeaveMutation = useMutation({
        mutationFn: (data) => leaveApi.create({ ...data, employee_id: employeeId }),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
            queryClient.invalidateQueries(['leave-calendar']);
            setShowLeaveForm(false);
            setLeaveForm({ leave_type: 'paid', start_date: '', end_date: '', reason: '', is_half_day: false, half_day_slot: '' });
            if (data.flagged) {
                toast.success('Leave request submitted — flagged for exceeding monthly limit, awaiting approval with justification.');
            } else {
                toast.success('Leave request submitted successfully');
            }
        },
        onError: (err) => toast.error(
            err?.response?.data?.detail?.[0]?.msg ||
            err?.response?.data?.detail ||
            'Failed to submit leave'
        ),
    });

    const createWfhMutation = useMutation({
        mutationFn: (data) => wfhApi.create({ ...data, employee_id: employeeId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-wfh'] });
            queryClient.invalidateQueries(['leave-calendar']);
            setShowWfhForm(false);
            setWfhForm({ wfh_date: '', end_date: '', reason: '' });
            toast.success('WFH request submitted successfully');
        },
        onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to submit WFH request'),
    });

    const updateLeaveMutation = useMutation({
        mutationFn: ({ id, data }) => leaveApi.update(id, { ...data, employee_id: employeeId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
            queryClient.invalidateQueries(['leave-calendar']);
            setEditingLeave(null);
            toast.success('Leave request updated');
        },
        onError: (err) => toast.error(
            err?.response?.data?.detail || 'Failed to update leave'
        ),
    });

    const deleteLeaveMutation = useMutation({
        mutationFn: (id) => leaveApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
            queryClient.invalidateQueries(['leave-calendar']);
            toast.success('Leave request deleted');
        },
        onError: (err) => toast.error(
            err?.response?.data?.detail || 'Failed to delete leave'
        ),
    });

    const updateWfhMutation = useMutation({
        mutationFn: ({ id, data }) => wfhApi.update(id, { ...data, employee_id: employeeId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-wfh'] });
            queryClient.invalidateQueries(['leave-calendar']);
            setEditingWfh(null);
            toast.success('WFH request updated');
        },
        onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to update WFH request'),
    });

    const deleteWfhMutation = useMutation({
        mutationFn: (id) => wfhApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-wfh'] });
            queryClient.invalidateQueries(['leave-calendar']);
            toast.success('WFH request deleted');
        },
        onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to delete WFH request'),
    });

    const handleLeaveSubmit = (e) => {
        e.preventDefault();
        const isHalf = leaveForm.leave_type === 'first_half' || leaveForm.leave_type === 'second_half';
        const sDate = leaveForm.start_date;
        const eDate = isHalf ? sDate : leaveForm.end_date;

        if (isHalf) {
            const timingErr = checkHalfDayTiming(sDate, leaveForm.leave_type);
            if (timingErr) {
                toast.error(timingErr);
                return;
            }
        } else {
            if (isEndDateBeforeStartDate(sDate, eDate)) {
                toast.error(getEndDateValidationMessage());
                return;
            }
        }

        if (getWorkingDayCount(sDate, eDate, isHalf) === 0) {
            toast.error('No working days in the selected range. Please choose dates that include at least one working day.');
            return;
        }

        if (leaveForm.leave_type === 'floater') {
            if (!isValidFloaterDate(sDate)) {
                toast.error('Start date is not an approved floater holiday date.');
                return;
            }
            if (eDate !== sDate && !isValidFloaterDate(eDate)) {
                toast.error('End date is not an approved floater holiday date.');
                return;
            }
        }

        createLeaveMutation.mutate({
            ...leaveForm,
            is_half_day: isHalf,
            half_day_slot: isHalf ? leaveForm.leave_type : null,
            end_date: eDate,
        });
    };

    const handleWfhSubmit = (e) => {
        e.preventDefault();
        if (!wfhForm.wfh_date) { toast.error('Please select a start date'); return; }
        if (wfhForm.end_date && wfhForm.end_date < wfhForm.wfh_date) {
            toast.error('End date cannot be before start date');
            return;
        }
        createWfhMutation.mutate({ ...wfhForm, end_date: wfhForm.end_date || wfhForm.wfh_date });
    };

    const handleEditOpen = (leave) => {
        setEditingLeave(leave);
        setEditForm({
            leave_type: leave.leave_type,
            start_date: leave.start_date,
            end_date: leave.end_date,
            reason: leave.reason || '',
            is_half_day: leave.is_half_day || false,
            half_day_slot: leave.half_day_slot || '',
        });
        setShowLeaveForm(false);
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        const isHalf = editForm.leave_type === 'first_half' || editForm.leave_type === 'second_half';
        const sDate = editForm.start_date;
        const eDate = isHalf ? sDate : editForm.end_date;

        if (isHalf) {
            const timingErr = checkHalfDayTiming(sDate, editForm.leave_type);
            if (timingErr) {
                toast.error(timingErr);
                return;
            }
        } else {
            if (isEndDateBeforeStartDate(sDate, eDate)) {
                toast.error(getEndDateValidationMessage());
                return;
            }
        }

        if (getWorkingDayCount(sDate, eDate, isHalf) === 0) {
            toast.error('No working days in the selected range. Please choose dates that include at least one working day.');
            return;
        }

        if (editForm.leave_type === 'floater') {
            if (!isValidFloaterDate(sDate)) {
                toast.error('Start date is not an approved floater holiday date.');
                return;
            }
            if (eDate !== sDate && !isValidFloaterDate(eDate)) {
                toast.error('End date is not an approved floater holiday date.');
                return;
            }
        }

        updateLeaveMutation.mutate({
            id: editingLeave.leave_id,
            data: {
                ...editForm,
                is_half_day: isHalf,
                half_day_slot: isHalf ? editForm.leave_type : null,
                end_date: eDate,
            }
        });
    };

    const handleDelete = (leave) => {
        if (!window.confirm(`Delete this ${getLeaveTypeLabel(leave.leave_type)} request (${leave.start_date} — ${leave.end_date})?`)) return;
        deleteLeaveMutation.mutate(leave.leave_id);
    };

    const handleWfhEditOpen = (wfh) => {
        setEditingWfh(wfh);
        setEditWfhForm({ wfh_date: wfh.wfh_date, end_date: wfh.end_date || wfh.wfh_date, reason: wfh.reason || '' });
        setShowWfhForm(false);
    };

    const handleWfhEditSubmit = (e) => {
        e.preventDefault();
        if (!editWfhForm.wfh_date) { toast.error('Please select a start date'); return; }
        if (editWfhForm.end_date && editWfhForm.end_date < editWfhForm.wfh_date) {
            toast.error('End date cannot be before start date');
            return;
        }
        updateWfhMutation.mutate({ id: editingWfh.id, data: { ...editWfhForm, end_date: editWfhForm.end_date || editWfhForm.wfh_date } });
    };

    const handleWfhDelete = (wfh) => {
        if (!window.confirm(`Delete WFH request for ${wfh.wfh_date}?`)) return;
        deleteWfhMutation.mutate(wfh.id);
    };

    const myEmployeeIdSet = employeeId ? new Set([employeeId]) : null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
                    <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
                </div>
                <div className="flex gap-2">
                    {activeTab === 'My Leaves' && (
                        <button onClick={() => setShowLeaveForm(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm">
                            <Plus className="w-4 h-4"/> Request Leave
                        </button>
                    )}
                    {activeTab === 'Work From Home' && (
                        <button onClick={() => setShowWfhForm(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm">
                            <Plus className="w-4 h-4"/> Request WFH
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
                {TABS.map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}>
                        {tab === 'Work From Home' ? <span className="flex items-center gap-1.5"><Home className="w-3.5 h-3.5"/>WFH</span> :
                         tab === 'Calendar' ? <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/>{tab}</span> : tab}
                    </button>
                ))}
            </div>

            {/* ── My Leaves ── */}
            {activeTab === 'My Leaves' && (
                <>
                    {/* Leave balances */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {balances.map(({ type, quota, used, remaining, period }) => (
                            <div key={type} className={`rounded-2xl border p-4 ${BALANCE_ACCENTS[type] || 'border-slate-200 bg-slate-50/60'}`}>
                                <p className="text-sm font-medium text-slate-600">
                                    {getLeaveTypeLabel(type)}
                                    {period === 'month' && <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-blue-600">monthly</span>}
                                </p>
                                <div className="mt-1 flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-slate-900">{remaining}</span>
                                    <span className="text-sm text-slate-400">/ {quota} {period === 'month' ? 'this month' : 'days left'}</span>
                                </div>
                                <p className="mt-0.5 text-xs text-slate-400">
                                    {used} used {period === 'month' ? 'this month' : `in ${currentYear}`}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* New leave request form */}
                    {showLeaveForm && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-slate-800">New Leave Request</h3>
                                <button onClick={() => setShowLeaveForm(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                            </div>
                            <form onSubmit={handleLeaveSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                                    <select value={leaveForm.leave_type} onChange={e => setLeaveForm({ ...leaveForm, leave_type: e.target.value, start_date: '', end_date: '' })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                                        {LEAVE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                                    <input type="text" value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Optional reason"/>
                                </div>
                                {leaveForm.leave_type === 'floater' ? (
                                    <FloaterDatePicker
                                        label="Floater Date"
                                        value={leaveForm.start_date}
                                        onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value, end_date: e.target.value })}
                                        required
                                    />
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                { (leaveForm.leave_type === 'first_half' || leaveForm.leave_type === 'second_half') ? 'Date' : 'Start Date' }
                                            </label>
                                            <input type="date" value={leaveForm.start_date} onChange={e => {
                                                const sDate = e.target.value;
                                                setLeaveForm(prev => ({
                                                    ...prev,
                                                    start_date: sDate,
                                                    end_date: (prev.leave_type === 'first_half' || prev.leave_type === 'second_half') ? sDate : prev.end_date
                                                }));
                                            }}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" required/>
                                        </div>
                                        {!(leaveForm.leave_type === 'first_half' || leaveForm.leave_type === 'second_half') && (
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                                                <input type="date" value={leaveForm.end_date} onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" required/>
                                            </div>
                                        )}
                                        <DateRangeSummary startDate={leaveForm.start_date} endDate={(leaveForm.leave_type === 'first_half' || leaveForm.leave_type === 'second_half') ? leaveForm.start_date : leaveForm.end_date} isHalfDay={leaveForm.leave_type === 'first_half' || leaveForm.leave_type === 'second_half'} />
                                    </>
                                )}
                                {(leaveForm.leave_type === 'first_half' || leaveForm.leave_type === 'second_half') && (
                                    <div className="md:col-span-2 rounded-xl border border-indigo-150 bg-indigo-50/50 p-4 text-sm text-indigo-900 space-y-2">
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
                                <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                    {RAZORPAY_NEGATIVE_BALANCE_NOTE}
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <button type="submit" disabled={createLeaveMutation.isPending}
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                                        {createLeaveMutation.isPending ? 'Submitting...' : 'Apply Leave'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Edit leave form */}
                    {editingLeave && (
                        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-slate-800">Edit Leave Request</h3>
                                <button onClick={() => setEditingLeave(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                            </div>
                            <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                                    <select value={editForm.leave_type} onChange={e => setEditForm({ ...editForm, leave_type: e.target.value, start_date: '', end_date: '' })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                                        {LEAVE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                                    <input type="text" value={editForm.reason} onChange={e => setEditForm({ ...editForm, reason: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Optional reason"/>
                                </div>
                                {editForm.leave_type === 'floater' ? (
                                    <FloaterDatePicker
                                        label="Floater Date"
                                        value={editForm.start_date}
                                        onChange={e => setEditForm({ ...editForm, start_date: e.target.value, end_date: e.target.value })}
                                        required
                                    />
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                { (editForm.leave_type === 'first_half' || editForm.leave_type === 'second_half') ? 'Date' : 'Start Date' }
                                            </label>
                                            <input type="date" value={editForm.start_date} onChange={e => {
                                                const sDate = e.target.value;
                                                setEditForm(prev => ({
                                                    ...prev,
                                                    start_date: sDate,
                                                    end_date: (prev.leave_type === 'first_half' || prev.leave_type === 'second_half') ? sDate : prev.end_date
                                                }));
                                            }}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" required/>
                                        </div>
                                        {!(editForm.leave_type === 'first_half' || editForm.leave_type === 'second_half') && (
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                                                <input type="date" value={editForm.end_date} onChange={e => setEditForm({ ...editForm, end_date: e.target.value })}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" required/>
                                            </div>
                                        )}
                                        <DateRangeSummary startDate={editForm.start_date} endDate={(editForm.leave_type === 'first_half' || editForm.leave_type === 'second_half') ? editForm.start_date : editForm.end_date} isHalfDay={editForm.leave_type === 'first_half' || editForm.leave_type === 'second_half'} />
                                    </>
                                )}
                                {(editForm.leave_type === 'first_half' || editForm.leave_type === 'second_half') && (
                                    <div className="md:col-span-2 rounded-xl border border-indigo-150 bg-indigo-50/50 p-4 text-sm text-indigo-900 space-y-2">
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
                                <div className="md:col-span-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                                    Editing will reset the approval status back to <strong>pending</strong> so your manager can re-review.
                                </div>
                                <div className="md:col-span-2 flex justify-end gap-2">
                                    <button type="button" onClick={() => setEditingLeave(null)}
                                        className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={updateLeaveMutation.isPending}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                                        {updateLeaveMutation.isPending ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="text-center py-12 text-slate-400 animate-pulse">Loading...</div>
                    ) : allLeaves.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4"/>
                            <p className="text-slate-500 font-medium">No leave records</p>
                            <p className="text-sm text-slate-400 mt-1">Click "Request Leave" to submit a new request.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {allLeaves.map(leave => {
                                const status = leave.status || 'pending';
                                const modifiable = canModify(leave);
                                const isEditing = editingLeave?.leave_id === leave.leave_id;
                                return (
                                    <div key={leave.leave_id} className={`bg-white rounded-xl border shadow-sm p-4 transition-colors ${isEditing ? 'border-blue-300' : 'border-slate-200/60'}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg ${status === 'approved' ? 'bg-emerald-50' : status === 'rejected' ? 'bg-red-50' : 'bg-amber-50'}`}>
                                                    {status === 'approved' && <CheckCircle className="w-5 h-5 text-emerald-600"/>}
                                                    {status === 'rejected' && <XCircle className="w-5 h-5 text-red-500"/>}
                                                    {status === 'pending' && <Clock className="w-5 h-5 text-amber-600"/>}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-slate-800">{getLeaveTypeLabel(leave.leave_type)}</p>
                                                        {leave.flagged && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                                                                <AlertTriangle className="w-2.5 h-2.5"/>Exceeds monthly limit
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-400">
                                                        {leave.is_half_day ? (
                                                            <>
                                                                {format(parseISO(leave.start_date), 'MMM dd, yyyy')} (0.5 day — {leave.half_day_slot === 'first_half' ? 'First Half' : 'Second Half'})
                                                            </>
                                                        ) : (
                                                            <>
                                                                {format(parseISO(leave.start_date), 'MMM dd')} — {format(parseISO(leave.end_date), 'MMM dd, yyyy')} ({getWorkingDayCount(leave.start_date, leave.end_date)} day{getWorkingDayCount(leave.start_date, leave.end_date) !== 1 ? 's' : ''})
                                                            </>
                                                        )}
                                                        {leave.reason && ` • ${leave.reason}`}
                                                    </p>
                                                    {leave.approval_remark && (
                                                        <p className="text-xs text-slate-500 mt-0.5">Approval remark: {leave.approval_remark}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_STYLES[status]}`}>{status}</span>
                                                {modifiable && (
                                                    <>
                                                        <button
                                                            onClick={() => isEditing ? setEditingLeave(null) : handleEditOpen(leave)}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                            title="Edit leave request"
                                                        >
                                                            <Pencil className="w-4 h-4"/>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(leave)}
                                                            disabled={deleteLeaveMutation.isPending}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                                                            title="Delete leave request"
                                                        >
                                                            <Trash2 className="w-4 h-4"/>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ── Calendar ── */}
            {activeTab === 'Calendar' && (
                <LeaveCalendar filterEmployeeIds={myEmployeeIdSet} />
            )}

            {/* ── Work From Home ── */}
            {activeTab === 'Work From Home' && (
                <>
                    {/* New WFH request form */}
                    {showWfhForm && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-slate-800">New WFH Request</h3>
                                <button onClick={() => setShowWfhForm(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                            </div>
                            <form onSubmit={handleWfhSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                                    <input type="date" value={wfhForm.wfh_date} onChange={e => setWfhForm({ ...wfhForm, wfh_date: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" required/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                                    <input type="date" value={wfhForm.end_date} onChange={e => setWfhForm({ ...wfhForm, end_date: e.target.value })}
                                        min={wfhForm.wfh_date || undefined}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"/>
                                    <p className="mt-1 text-xs text-slate-400">Leave blank for a single day</p>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                                    <input type="text" value={wfhForm.reason} onChange={e => setWfhForm({ ...wfhForm, reason: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Optional reason"/>
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <button type="submit" disabled={createWfhMutation.isPending}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                                        {createWfhMutation.isPending ? 'Submitting...' : 'Submit WFH Request'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Edit WFH form */}
                    {editingWfh && (
                        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-slate-800">Edit WFH Request</h3>
                                <button onClick={() => setEditingWfh(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                            </div>
                            <form onSubmit={handleWfhEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                                    <input type="date" value={editWfhForm.wfh_date} onChange={e => setEditWfhForm({ ...editWfhForm, wfh_date: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" required/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                                    <input type="date" value={editWfhForm.end_date} onChange={e => setEditWfhForm({ ...editWfhForm, end_date: e.target.value })}
                                        min={editWfhForm.wfh_date || undefined}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"/>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                                    <input type="text" value={editWfhForm.reason} onChange={e => setEditWfhForm({ ...editWfhForm, reason: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Optional reason"/>
                                </div>
                                <div className="md:col-span-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                                    Editing will reset the approval status back to <strong>pending</strong> so your manager can re-review.
                                </div>
                                <div className="md:col-span-2 flex justify-end gap-2">
                                    <button type="button" onClick={() => setEditingWfh(null)}
                                        className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={updateWfhMutation.isPending}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                                        {updateWfhMutation.isPending ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {myWfh.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                            <Home className="w-12 h-12 text-slate-300 mx-auto mb-4"/>
                            <p className="text-slate-500 font-medium">No WFH requests</p>
                            <p className="text-sm text-slate-400 mt-1">Click "Request WFH" to apply in advance.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {myWfh.map(w => {
                                const status = w.status || 'pending';
                                const modifiable = canModifyWfh(w);
                                const isEditing = editingWfh?.id === w.id;
                                return (
                                    <div key={w.id} className={`bg-white rounded-xl border shadow-sm p-4 flex items-center justify-between transition-colors ${isEditing ? 'border-blue-300' : 'border-slate-200/60'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-lg ${status === 'approved' ? 'bg-purple-50' : status === 'rejected' ? 'bg-red-50' : 'bg-amber-50'}`}>
                                                {status === 'approved' && <CheckCircle className="w-5 h-5 text-purple-600"/>}
                                                {status === 'rejected' && <XCircle className="w-5 h-5 text-red-500"/>}
                                                {status === 'pending' && <Clock className="w-5 h-5 text-amber-600"/>}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800">Work From Home</p>
                                                <p className="text-xs text-slate-400">
                                                    {w.end_date && w.end_date !== w.wfh_date
                                                        ? `${format(new Date(w.wfh_date + 'T00:00:00'), 'MMM dd')} — ${format(new Date(w.end_date + 'T00:00:00'), 'MMM dd, yyyy')}`
                                                        : format(new Date(w.wfh_date + 'T00:00:00'), 'MMM dd, yyyy')
                                                    }
                                                    {w.reason && ` • ${w.reason}`}
                                                </p>
                                                {w.remark && <p className="text-xs text-slate-500 mt-0.5">Remark: {w.remark}</p>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_STYLES[status]}`}>{status}</span>
                                            {modifiable && (
                                                <>
                                                    <button
                                                        onClick={() => isEditing ? setEditingWfh(null) : handleWfhEditOpen(w)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                        title="Edit WFH request"
                                                    >
                                                        <Pencil className="w-4 h-4"/>
                                                    </button>
                                                    <button
                                                        onClick={() => handleWfhDelete(w)}
                                                        disabled={deleteWfhMutation.isPending}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                                                        title="Delete WFH request"
                                                    >
                                                        <Trash2 className="w-4 h-4"/>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default MyLeavesPanel;
