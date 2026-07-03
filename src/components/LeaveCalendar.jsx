import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Spinner from './ui/LoadingSpinner';
import Button from './ui/Button';
import { ChevronLeft, ChevronRight, Calendar, AlertTriangle, Clock, CheckCircle, XCircle, Send, X } from 'lucide-react';
import { leaveApi, wfhApi } from '../services/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import Dropdown from './ui/Dropdown';
import {
    isValidFloaterDate,
    getWorkingDayCount,
    countNonWorkingDaysInRange,
    isNonWorkingDay,
    getNonWorkingDayLabel,
    RAZORPAY_NEGATIVE_BALANCE_NOTE
} from '../utils/leaveTypes';

// ─── Leave colour palette ───────────────────────────────────────────────────
const LEAVE_COLORS = {
    paid:        { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6', label: 'Paid Leave' },
    casual_sick: { bg: '#d1fae5', text: '#065f46', dot: '#10b981', label: 'Casual/Sick' },
    floater:     { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b', label: 'Floater' },
    default:     { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8', label: 'Leave' },
};
const WFH_COLOR   = { bg: '#ede9fe', text: '#5b21b6', dot: '#8b5cf6', label: 'WFH' };
const PENDING_OPACITY = 0.55;

// ─── Autonex AI public holiday list 2026 ───────────────────────────────────
// Fixed = shown in red; Floater = shown in amber/orange
const HOLIDAYS = {
    // Fixed
    '2026-01-01': { name: 'New Year\'s Day',      type: 'fixed' },
    '2026-01-26': { name: 'Republic Day',         type: 'fixed' },
    '2026-03-04': { name: 'Holi',                 type: 'fixed' },
    '2026-05-01': { name: 'Maharashtra Day',      type: 'fixed' },
    '2026-06-26': { name: 'Muharram',             type: 'fixed' },
    '2026-09-14': { name: 'Ganesh Chaturthi',     type: 'fixed' },
    '2026-10-02': { name: 'Mahatma Gandhi Jayanti', type: 'fixed' },
    '2026-11-09': { name: 'Govardhan Puja',       type: 'fixed' },
    '2026-12-25': { name: 'Christmas',            type: 'fixed' },
    // Floater
    '2026-01-14': { name: 'Pongal / Makar Sankranti', type: 'floater' },
    '2026-01-23': { name: 'Vasant Panchami',        type: 'floater' },
    '2026-02-15': { name: 'Maha Shivratri',         type: 'floater' },
    '2026-02-19': { name: 'Shivaji Jayanti',        type: 'floater' },
    '2026-03-19': { name: 'Ugadi / Gudi Padwa',     type: 'floater' },
    '2026-03-21': { name: 'Ramzan Eid',             type: 'floater' },
    '2026-03-31': { name: 'Mahavir Jayanti',        type: 'floater' },
    '2026-04-03': { name: 'Good Friday',            type: 'floater' },
    '2026-04-14': { name: 'Ambedkar Jayanti',       type: 'floater' },
    '2026-05-27': { name: 'Bakrid',                 type: 'floater' },
    '2026-08-15': { name: 'Independence Day',       type: 'floater' },
    '2026-08-26': { name: 'Onam',                   type: 'floater' },
    '2026-08-28': { name: 'Raksha Bandhan',         type: 'floater' },
    '2026-09-04': { name: 'Janmashtami',            type: 'floater' },
    '2026-10-20': { name: 'Dussehra',               type: 'floater' },
    '2026-11-08': { name: 'Diwali',                 type: 'floater' },
    '2026-11-11': { name: 'Bhai Duj',               type: 'floater' },
    '2026-11-24': { name: 'Guru Nanak Jayanti',     type: 'floater' },
    '2026-12-23': { name: 'Hazarat Ali\'s Birthday', type: 'floater' },
    paid:        { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500', label: 'Paid Leave' },
    casual_sick: { bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-500', label: 'Casual/Sick' },
    floater:     { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500', label: 'Floater' },
    first_half:  { bg: 'bg-indigo-100', text: 'text-indigo-800', dot: 'bg-indigo-500', label: 'First Half-day' },
    second_half: { bg: 'bg-violet-100', text: 'text-violet-800', dot: 'bg-violet-500', label: 'Second Half-day' },
    default:     { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400', label: 'Leave' },
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toYMD(dateStr) { return dateStr.slice(0, 10); }

// ─── Overflow popover ────────────────────────────────────────────────────────
function OverflowPopover({ dateStr, events }) {
    const [open, setOpen] = useState(false);
    const modalRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (modalRef.current && !modalRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleClick = (e) => {
        e.stopPropagation();
        setOpen(true);
    };

    const formattedDate = useMemo(() => {
        try {
            return format(parseISO(dateStr), 'MMMM dd, yyyy');
        } catch (e) {
            return dateStr;
        }
    }, [dateStr]);

    const modal = open && createPortal(
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.3)',
                backdropFilter: 'blur(4px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
            onClick={() => setOpen(false)}
        >
            <div
                ref={modalRef}
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#fff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    padding: '20px',
                    width: '360px',
                    maxWidth: '90%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    fontFamily: 'Inter, system-ui, sans-serif',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '12px',
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                            Team Leaves & Attendance
                        </h4>
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                            {formattedDate}
                        </p>
                    </div>
                    <button
                        onClick={() => setOpen(false)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            transition: 'background 0.15s, color 0.15s',
                        }}
                        onMouseOver={e => {
                            e.currentTarget.style.background = '#f1f5f9';
                            e.currentTarget.style.color = '#475569';
                        }}
                        onMouseOut={e => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#94a3b8';
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Scrollable Event List */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxHeight: '280px', // height of ~10 items
                    overflowY: 'auto',
                    paddingRight: '4px',
                }}>
                    {events.map((ev, i) => {
                        const isPending = ev.status === 'pending';
                        let chipBg, chipColor, chipBorder, leaveLabel;

                        if (ev.kind === 'wfh') {
                            chipBg = WFH_COLOR.bg;
                            chipColor = WFH_COLOR.text;
                            chipBorder = '#e9d5ff';
                            leaveLabel = 'Work From Home';
                        } else {
                            const c = LEAVE_COLORS[ev.leave_type] || LEAVE_COLORS.default;
                            chipBg = c.bg;
                            chipColor = c.text;
                            chipBorder = c.dot + '33';
                            leaveLabel = c.label;
                        }

                        if (ev.is_half_day) {
                            leaveLabel += ` (Half-day: ${ev.half_day_slot === 'first_half' ? '1st Half' : '2nd Half'})`;
                        }

                        return (
                            <div
                                key={i}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    borderRadius: '10px',
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    opacity: isPending ? PENDING_OPACITY : 1,
                                }}
                            >
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                                    {ev.employee_name}
                                </span>
                                <span style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    background: chipBg,
                                    color: chipColor,
                                    border: `1px solid ${chipBorder}`,
                                    borderRadius: '6px',
                                    padding: '2px 8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.02em',
                                }}>
                                    {leaveLabel}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>,
        document.body
    );

    return (
        <>
            <button
                onClick={handleClick}
                style={{
                    fontSize: '10px', fontWeight: 700,
                    color: '#4f46e5', background: '#e0e7ff',
                    border: 'none', borderRadius: '6px',
                    padding: '2px 8px', cursor: 'pointer',
                    transition: 'all 0.15s',
                    marginTop: '2px',
                    alignSelf: 'center',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
                onMouseOver={e => {
                    e.currentTarget.style.background = '#c7d2fe';
                    e.currentTarget.style.color = '#3730a3';
                }}
                onMouseOut={e  => {
                    e.currentTarget.style.background = '#e0e7ff';
                    e.currentTarget.style.color = '#4f46e5';
                }}
            >+{events.length - 2} more</button>
            {modal}
        </>
    );
}

// ─── Event chip ─────────────────────────────────────────────────────────────
function EventChip({ ev }) {
    const isPending = ev.status === 'pending';
    let bg, color, label;
    if (ev.kind === 'wfh') {
        bg = WFH_COLOR.bg; color = WFH_COLOR.text;
        label = `🏠 ${ev.employee_name?.split(' ')[0]}`;
    } else {
        const c = LEAVE_COLORS[ev.leave_type] || LEAVE_COLORS.default;
        bg = c.bg; color = c.text;
        label = ev.employee_name?.split(' ')[0];
    }
    return (
        <div
            title={`${ev.kind === 'wfh' ? 'WFH' : (LEAVE_COLORS[ev.leave_type]?.label || 'Leave')}: ${ev.employee_name}${isPending ? ' (pending)' : ''}`}
            style={{
                background: bg, color,
                opacity: isPending ? PENDING_OPACITY : 1,
                borderRadius: '4px',
                padding: '1px 5px',
                fontSize: '10px', fontWeight: 600,
                lineHeight: 1.4,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                maxWidth: '100%',
            }}
        >{label}</div>
    );
}

// ─── Theme palette for dynamic calendar selection highlights ─────────────────
const SELECTION_THEMES = {
    paid: { border: '#2563eb', rangeBg: '#f0f7ff', rangeBorder: '#bfdbfe' },
    casual_sick: { border: '#10b981', rangeBg: '#ecfdf5', rangeBorder: '#a7f3d0' },
    floater: { border: '#f59e0b', rangeBg: '#fffbeb', rangeBorder: '#fde68a' },
    wfh: { border: '#8b5cf6', rangeBg: '#faf5ff', rangeBorder: '#e9d5ff' },
    default: { border: '#2563eb', rangeBg: '#f0f7ff', rangeBorder: '#bfdbfe' }
};

// ─── Main Calendar ───────────────────────────────────────────────────────────
export default function LeaveCalendar({ filterEmployeeIds = null }) {
    const today = new Date();
    const [year,  setYear]  = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1);

    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const queryClient = useQueryClient();

    // Fetch user details to get employee_id for leave submission
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const employeeId = user?.employee_id;
    const isEmployee = !!employeeId;

    // Range Selection & Form states
    const [selectedStart, setSelectedStart] = useState(null);
    const [selectedEnd, setSelectedEnd] = useState(null);
    const [leaveType, setLeaveType] = useState('');
    const [reason, setReason] = useState('');

    const activeSelectionTheme = SELECTION_THEMES[leaveType] || SELECTION_THEMES.default;
    const sidebarTheme = { bg: '#ffffff', border: '#e2e8f0', text: '#475569', title: '#1e293b', inputBorder: '#cbd5e1' };

    const { data, isLoading } = useQuery({
        queryKey: ['leave-calendar', monthStr],
        queryFn: () => leaveApi.getCalendar(monthStr),
        staleTime: 30_000,
    });

    const createLeaveMutation = useMutation({
        mutationFn: (data) => leaveApi.create({ ...data, employee_id: employeeId }),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['leave-calendar', monthStr] });
            queryClient.invalidateQueries({ queryKey: ['my-leaves', employeeId] });
            setSelectedStart(null);
            setSelectedEnd(null);
            setLeaveType('');
            setReason('');
            if (res.flagged) {
                toast.success('Leave request submitted — flagged for exceeding monthly limit, awaiting approval.');
            } else {
                toast.success('Leave request submitted successfully');
            }
        },
        onError: (err) => {
            toast.error(err?.response?.data?.detail?.[0]?.msg || err?.response?.data?.detail || 'Failed to submit leave');
        }
    });

    const createWfhMutation = useMutation({
        mutationFn: (data) => wfhApi.create({ ...data, employee_id: employeeId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-calendar', monthStr] });
            queryClient.invalidateQueries({ queryKey: ['my-wfh', employeeId] });
            setSelectedStart(null);
            setSelectedEnd(null);
            setLeaveType('');
            setReason('');
            toast.success('WFH request submitted successfully');
        },
        onError: (err) => {
            toast.error(err?.response?.data?.detail || 'Failed to submit WFH request');
        }
    });

    const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
    const nextMonth = () => { if (month === 12) { setMonth(1);  setYear(y => y + 1); } else setMonth(m => m + 1); };

    const eventsByDate = useMemo(() => {
        const map = {};
        if (!data) return map;
        const leaves = filterEmployeeIds
            ? (data.leaves || []).filter(l => filterEmployeeIds.has(l.employee_id))
            : (data.leaves || []);
        const wfhs = filterEmployeeIds
            ? (data.wfh || []).filter(w => filterEmployeeIds.has(w.employee_id))
            : (data.wfh || []);

        for (const leave of leaves) {
            const start = new Date(leave.start_date + 'T00:00:00');
            const end   = new Date(leave.end_date   + 'T00:00:00');
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                if (isNonWorkingDay(key)) {
                    continue;
                }
                if (!map[key]) map[key] = [];
                map[key].push({ ...leave, kind: 'leave' });
            }
        }
        for (const wfh of wfhs) {
            const key = toYMD(wfh.date);
            if (!map[key]) map[key] = [];
            map[key].push({ ...wfh, kind: 'wfh' });
        }
        return map;
    }, [data, filterEmployeeIds]);

    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDow    = new Date(year, month - 1, 1).getDay();
    const cells       = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    const monthLabel = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    // Date range helper details
    const workingDays = selectedStart && selectedEnd ? getWorkingDayCount(selectedStart, selectedEnd) : 0;
    const nonWorkingDays = selectedStart && selectedEnd ? countNonWorkingDaysInRange(selectedStart, selectedEnd) : 0;

    // Floater valid date validation
    const isFloaterType = leaveType === 'floater';
    const isFloaterInvalid = isFloaterType && (
        selectedStart !== selectedEnd ||
        !isValidFloaterDate(selectedStart)
    );

    // Calculate adjacent leaves for the current employee
    let adjacentBefore = 0;
    let adjacentAfter = 0;
    if (selectedStart && selectedEnd && employeeId && leaveType && leaveType !== 'wfh') {
        // Walk backwards from selectedStart
        let cur = new Date(selectedStart + 'T00:00:00');
        cur.setDate(cur.getDate() - 1);
        let searching = true;
        while (searching) {
            const y = cur.getFullYear();
            const m = String(cur.getMonth() + 1).padStart(2, '0');
            const d = String(cur.getDate()).padStart(2, '0');
            const ds = `${y}-${m}-${d}`;
            
            if (!isNonWorkingDay(ds)) {
                const dayEvents = eventsByDate[ds] || [];
                const hasLeave = dayEvents.some(ev => ev.kind === 'leave' && ev.employee_id === employeeId && ev.status !== 'rejected' && !ev.is_half_day && ev.leave_type !== 'first_half' && ev.leave_type !== 'second_half');
                if (hasLeave) {
                    adjacentBefore++;
                } else {
                    searching = false;
                }
            }
            cur.setDate(cur.getDate() - 1);
            if (adjacentBefore >= 5 || (new Date(selectedStart + 'T00:00:00') - cur) / (1000 * 60 * 60 * 24) > 15) {
                searching = false;
            }
        }

        // Walk forwards from selectedEnd
        cur = new Date(selectedEnd + 'T00:00:00');
        cur.setDate(cur.getDate() + 1);
        searching = true;
        while (searching) {
            const y = cur.getFullYear();
            const m = String(cur.getMonth() + 1).padStart(2, '0');
            const d = String(cur.getDate()).padStart(2, '0');
            const ds = `${y}-${m}-${d}`;
            
            if (!isNonWorkingDay(ds)) {
                const dayEvents = eventsByDate[ds] || [];
                const hasLeave = dayEvents.some(ev => ev.kind === 'leave' && ev.employee_id === employeeId && ev.status !== 'rejected' && !ev.is_half_day && ev.leave_type !== 'first_half' && ev.leave_type !== 'second_half');
                if (hasLeave) {
                    adjacentAfter++;
                } else {
                    searching = false;
                }
            }
            cur.setDate(cur.getDate() + 1);
            if (adjacentAfter >= 5 || (cur - new Date(selectedEnd + 'T00:00:00')) / (1000 * 60 * 60 * 24) > 15) {
                searching = false;
            }
        }
    }

    const totalConsecutive = workingDays + adjacentBefore + adjacentAfter;

    // Form errors
    let validationError = null;
    if (selectedStart && selectedEnd) {
        if (workingDays === 0) {
            validationError = "No working days in this range — weekends and fixed holidays are automatically skipped.";
        } else if (leaveType && leaveType !== 'wfh' && totalConsecutive >= 5) {
            validationError = "Safe guard triggered: You cannot apply for 5 or more consecutive leaves.";
        } else if (isFloaterType) {
            if (selectedStart !== selectedEnd) {
                validationError = "Floater leave must be taken as a single day.";
            } else if (!isValidFloaterDate(selectedStart)) {
                validationError = "Selected date is not an approved floater holiday date.";
            }
        }
    }

    const LEAVE_TYPES = [
        { value: 'paid', label: 'Paid Leave', color: '#2563eb' },
        { value: 'casual_sick', label: 'Casual/Sick Leave', color: '#10b981' },
        { value: 'floater', label: 'Floater Leave', color: '#f59e0b' },
        { value: 'wfh', label: 'Work From Home (WFH)', color: '#8b5cf6' },
    ];

    const selectedTypeObj = LEAVE_TYPES.find(t => t.value === leaveType);
    const buttonBg = selectedTypeObj ? selectedTypeObj.color : '#cbd5e1';
    const buttonText = selectedTypeObj ? '#fff' : '#94a3b8';
    const isSubmitDisabled = !leaveType || workingDays === 0 || !!validationError || createLeaveMutation.isPending || createWfhMutation.isPending;
    const buttonCursor = isSubmitDisabled ? 'not-allowed' : 'pointer';

    const handleApplySubmit = (e) => {
        e.preventDefault();
        if (!reason || !reason.trim()) {
            toast.error('Please enter a reason for this request.');
            return;
        }
        if (isSubmitDisabled) return;

        if (leaveType === 'wfh') {
            createWfhMutation.mutate({
                wfh_date: selectedStart,
                end_date: selectedEnd,
                reason: reason,
            });
        } else {
            createLeaveMutation.mutate({
                leave_type: leaveType,
                start_date: selectedStart,
                end_date: selectedEnd,
                reason: reason,
            });
        }
    };

    const handleDateClick = (dateStr) => {
        if (!isEmployee) return; // Only allow employees to pick ranges on grid
        if (!selectedStart) {
            setSelectedStart(dateStr);
            setSelectedEnd(dateStr);
        } else if (selectedStart === selectedEnd) {
            if (dateStr === selectedStart) {
                // Clear selection if clicked again
                setSelectedStart(null);
                setSelectedEnd(null);
            } else if (dateStr > selectedStart) {
                setSelectedEnd(dateStr);
            } else {
                setSelectedStart(dateStr);
                setSelectedEnd(dateStr);
            }
        } else {
            setSelectedStart(dateStr);
            setSelectedEnd(dateStr);
        }
        setLeaveType(''); // Reset selected leave type to make button grey
    };

    const formattedStart = selectedStart ? format(parseISO(selectedStart), 'MMM dd, yyyy') : '';
    const formattedEnd = selectedEnd ? format(parseISO(selectedEnd), 'MMM dd, yyyy') : '';

    return (
        <div style={{
            display: 'flex',
            gap: '24px',
            alignItems: 'stretch',
            flexWrap: 'wrap',
            fontFamily: 'Inter, system-ui, sans-serif',
        }}>
            {/* ── Calendar container ── */}
            <div style={{
                flex: '1 1 600px',
                background: '#fff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
                overflow: 'hidden',
                maxWidth: '820px',
                margin: '0',
            }}>
                {/* ── Header ─────────────────────────────────────────────────── */}
                <div style={{
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <button onClick={prevMonth} style={{
                        background: 'rgba(255,255,255,0.15)', border: 'none',
                        borderRadius: '8px', padding: '6px 8px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', color: '#fff',
                        transition: 'background 0.15s',
                    }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                        onMouseOut={e  => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                    >
                        <ChevronLeft size={18} />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={16} color="rgba(255,255,255,0.8)" />
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff', letterSpacing: '0.01em' }}>
                            {monthLabel}
                        </h3>
                    </div>

                    <button onClick={nextMonth} style={{
                        background: 'rgba(255,255,255,0.15)', border: 'none',
                        borderRadius: '8px', padding: '6px 8px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', color: '#fff',
                        transition: 'background 0.15s',
                    }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                        onMouseOut={e  => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                {/* ── Legend ─────────────────────────────────────────────────── */}
                <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '10px',
                    padding: '10px 16px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                }}>
                    {Object.entries(LEAVE_COLORS).filter(([k]) => k !== 'default').map(([key, c]) => (
                        <span key={key} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, display: 'inline-block' }} />
                            {c.label}
                        </span>
                    ))}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: WFH_COLOR.dot, display: 'inline-block' }} />
                        {WFH_COLOR.label}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fca5a5', display: 'inline-block' }} />
                        Holiday (Fixed)
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fdba74', display: 'inline-block' }} />
                        Holiday (Floater)
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fca5a5', display: 'inline-block', opacity: 0.5 }} />
                        Weekend
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#94a3b8', fontWeight: 500, marginLeft: '4px' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#cbd5e1', display: 'inline-block' }} />
                        Pending (dimmed)
                    </span>
                </div>

                {/* ── Grid ────────────────────────────────────────────────────── */}
                {isLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '220px', color: '#94a3b8', fontSize: '14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: 28, height: 28, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                            Loading calendar…
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '12px 10px 14px' }}>
                        {/* Day-name header */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: '4px' }}>
                            {DAY_NAMES.map((d, i) => (
                                <div key={d} style={{
                                    textAlign: 'center',
                                    fontSize: '11px', fontWeight: 700,
                                    letterSpacing: '0.04em', textTransform: 'uppercase',
                                    padding: '4px 0',
                                    color: (i === 0 || i === 6) ? '#ef4444' : '#94a3b8',
                                }}>{d}</div>
                            ))}
                        </div>

                        {/* Day cells */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px' }}>
                            {cells.map((day, idx) => {
                                if (!day) return <div key={`empty-${idx}`} />;

                                const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                                const events  = eventsByDate[dateStr] || [];
                                const isToday = dateStr === todayStr;

                                // Day-of-week: 0=Sun, 6=Sat
                                const dow     = new Date(year, month - 1, day).getDay();
                                const isWeekend  = dow === 0 || dow === 6;
                                const holiday    = HOLIDAYS[dateStr];
                                const isFixed    = holiday?.type === 'fixed';
                                const isFloater  = holiday?.type === 'floater';

                                // Selection checks
                                const isSelectedStart = selectedStart && dateStr === selectedStart;
                                const isSelectedEnd   = selectedEnd && dateStr === selectedEnd;
                                const isSelectedRange = selectedStart && selectedEnd && dateStr > selectedStart && dateStr < selectedEnd;

                                // Cell background priority: selection > today > fixed holiday > floater holiday > weekend > normal
                                let cellBg, cellBorder, numberBg, numberColor;

                                if (isToday) {
                                    cellBg = '#eff6ff'; cellBorder = '#3b82f6';
                                    numberBg = '#3b82f6'; numberColor = '#fff';
                                } else if (isFixed) {
                                    cellBg = '#fef2f2'; cellBorder = '#fca5a5';
                                    numberBg = '#ef4444'; numberColor = '#fff';
                                } else if (isFloater) {
                                    cellBg = '#fff7ed'; cellBorder = '#fdba74';
                                    numberBg = '#f97316'; numberColor = '#fff';
                                } else if (isWeekend) {
                                    cellBg = '#fff5f5'; cellBorder = '#fecaca';
                                    numberBg = 'transparent'; numberColor = '#ef4444';
                                } else {
                                    cellBg = '#fff'; cellBorder = '#e2e8f0';
                                    numberBg = 'transparent'; numberColor = '#64748b';
                                }

                                // Selection styling overrides
                                if (isSelectedStart || isSelectedEnd) {
                                    cellBorder = activeSelectionTheme.border;
                                } else if (isSelectedRange) {
                                    cellBg = activeSelectionTheme.rangeBg;
                                    cellBorder = activeSelectionTheme.rangeBorder;
                                }

                                return (
                                    <div
                                        key={dateStr}
                                        title={holiday ? `${holiday.name} (${holiday.type})` : undefined}
                                        onClick={() => handleDateClick(dateStr)}
                                        style={{
                                            minHeight: '88px',
                                            borderRadius: '8px',
                                            border: `1.5px solid ${cellBorder}`,
                                            boxShadow: (isSelectedStart || isSelectedEnd)
                                                ? `0 0 0 2.5px ${activeSelectionTheme.border}, 0 4px 12px rgba(0,0,0,0.08)`
                                                : isSelectedRange
                                                    ? `inset 0 0 0 1px ${activeSelectionTheme.rangeBorder}`
                                                    : 'none',
                                            background: cellBg,
                                            padding: '4px 4px 4px',
                                            display: 'flex', flexDirection: 'column', gap: '3px',
                                            transition: 'box-shadow 0.15s, transform 0.15s, border-color 0.15s',
                                            cursor: isEmployee ? 'pointer' : 'default',
                                            position: 'relative',
                                        }}
                                        onMouseOver={e => {
                                            e.currentTarget.style.boxShadow = (isSelectedStart || isSelectedEnd)
                                                ? `0 0 0 2.5px ${activeSelectionTheme.border}, 0 4px 12px rgba(0,0,0,0.12)`
                                                : '0 2px 12px rgba(0,0,0,0.09)';
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                        }}
                                        onMouseOut={e => {
                                            e.currentTarget.style.boxShadow = (isSelectedStart || isSelectedEnd)
                                                ? `0 0 0 2.5px ${activeSelectionTheme.border}, 0 4px 12px rgba(0,0,0,0.08)`
                                                : 'none';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                    >
                                        {/* Date number */}
                                        <span style={{
                                            alignSelf: 'flex-end',
                                            fontSize: '11px', fontWeight: 700,
                                            background: numberBg, color: numberColor,
                                            borderRadius: '50%',
                                            width: '20px', height: '20px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            lineHeight: 1,
                                            flexShrink: 0,
                                        }}>
                                            {day}
                                        </span>

                                        {/* Holiday label (tiny) */}
                                        {holiday && (
                                            <span style={{
                                                fontSize: '9px', fontWeight: 600,
                                                color: isFixed ? '#b91c1c' : '#c2410c',
                                                lineHeight: 1.2,
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }} title={holiday.name}>
                                                {holiday.name}
                                            </span>
                                        )}

                                        {/* Events */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, marginTop: '4px' }}>
                                            {events.slice(0, 2).map((ev, ei) => (
                                                <EventChip key={ei} ev={ev} />
                                            ))}
                                            {events.length > 2 && (
                                                <OverflowPopover dateStr={dateStr} events={events} />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Right side form panel ── */}
            {isEmployee && (
                <div style={{
                    flex: '1 1 380px',
                    minWidth: '340px',
                    maxWidth: '460px',
                    background: sidebarTheme.bg,
                    borderRadius: '16px',
                    border: `1px solid ${sidebarTheme.border}`,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.05)',
                    padding: '24px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    {!selectedStart ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            minHeight: '280px',
                            textAlign: 'center',
                            padding: '20px',
                            color: '#94a3b8',
                        }}>
                            <Calendar size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 600, color: '#475569' }}>
                                No Date Selected
                            </h4>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                                Click any date on the calendar to begin applying for a leave or WFH. Click a second date to select a range.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleApplySubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <h4 style={{
                                margin: '0 0 16px 0',
                                fontSize: '16px',
                                fontWeight: 700,
                                color: sidebarTheme.title,
                                borderBottom: `1px solid ${sidebarTheme.border}`,
                                paddingBottom: '12px',
                            }}>
                                Apply for Time Off
                            </h4>

                            {/* Date info card */}
                            <div style={{
                                background: '#fff',
                                border: `1px dashed ${sidebarTheme.border}`,
                                borderRadius: '10px',
                                padding: '12px',
                                marginBottom: '16px',
                            }}>
                                <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em', color: sidebarTheme.text, opacity: 0.8 }}>
                                    Selected Period
                                </p>
                                <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 700, color: sidebarTheme.text }}>
                                    {selectedStart === selectedEnd ? formattedStart : `${formattedStart} — ${formattedEnd}`}
                                </p>
                                <p style={{ margin: 0, fontSize: '12px', color: '#475569', fontWeight: 500 }}>
                                    {workingDays} working day{workingDays !== 1 ? 's' : ''}
                                    {nonWorkingDays > 0 && <span style={{ color: '#94a3b8' }}> ({nonWorkingDays} holiday/weekend skipped)</span>}
                                </p>
                            </div>

                            {/* Dropdown Type Select */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: sidebarTheme.text, marginBottom: '6px' }}>
                                    Leave Type
                                </label>
                                <Dropdown
                                    options={[{ value: '', label: 'Select leave type...' }, ...LEAVE_TYPES]}
                                    value={leaveType}
                                    onChange={e => setLeaveType(e)}
                                />
                            </div>

                            {/* Reason input */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: sidebarTheme.text, marginBottom: '6px' }}>
                                    Reason
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    placeholder="Enter reason for this request (required)..."
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: `1px solid ${sidebarTheme.inputBorder}`,
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        outline: 'none',
                                        resize: 'none',
                                    }}
                                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={e => e.target.style.borderColor = sidebarTheme.inputBorder}
                                />
                            </div>

                            {/* Error alerts */}
                            {validationError && (
                                <div style={{
                                    display: 'flex', gap: '8px', padding: '10px 12px',
                                    background: '#fef2f2', border: '1px solid #fee2e2',
                                    borderRadius: '8px', color: '#b91c1c', fontSize: '12px',
                                    lineHeight: 1.4, marginBottom: '16px', fontWeight: 500,
                                    alignItems: 'flex-start'
                                }}>
                                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span>{validationError}</span>
                                </div>
                            )}

                            {/* Info note */}
                            {leaveType && leaveType !== 'wfh' && !validationError && (
                                <div style={{
                                    padding: '10px 12px', background: '#eff6ff',
                                    border: '1px solid #dbeafe', borderRadius: '8px',
                                    color: '#1e40af', fontSize: '11px', lineHeight: 1.4,
                                    marginBottom: '16px',
                                }}>
                                    {RAZORPAY_NEGATIVE_BALANCE_NOTE}
                                </div>
                            )}

                            {/* Submit buttons */}
                            <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedStart(null);
                                        setSelectedEnd(null);
                                        setLeaveType('');
                                        setReason('');
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        border: `1px solid ${sidebarTheme.border}`,
                                        borderRadius: '8px',
                                        background: 'transparent',
                                        color: sidebarTheme.text,
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'background-color 0.25s, color 0.25s, border-color 0.25s',
                                    }}
                                    onMouseOver={e => {
                                        e.currentTarget.style.background = '#fff';
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                    }}
                                    onMouseOut={e => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    Cancel
                                </button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitDisabled}
                                    isLoading={createLeaveMutation.isPending || createWfhMutation.isPending}
                                    loadingText="Applying..."
                                    style={{
                                        flex: 2,
                                        background: buttonBg,
                                        color: buttonText,
                                        cursor: buttonCursor,
                                    }}
                                >
                                    <Send size={14} /> Apply
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}