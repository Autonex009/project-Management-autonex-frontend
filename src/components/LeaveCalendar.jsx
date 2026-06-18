import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { leaveApi } from '../services/api';

const LEAVE_COLORS = {
    paid:        { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500', label: 'Paid Leave' },
    casual_sick: { bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-500', label: 'Casual/Sick' },
    floater:     { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500', label: 'Floater' },
    default:     { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400', label: 'Leave' },
};
const WFH_COLOR = { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500', label: 'WFH' };
const PENDING_OPACITY = 'opacity-70';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toYMD(dateStr) {
    // returns YYYY-MM-DD string from any date string
    return dateStr.slice(0, 10);
}

function OverflowPopover({ events }) {
    const [open, setOpen] = useState(false);
    const [rect, setRect] = useState(null);
    const btnRef = useRef(null);
    const popoverRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (
                popoverRef.current && !popoverRef.current.contains(e.target) &&
                btnRef.current && !btnRef.current.contains(e.target)
            ) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleClick = (e) => {
        e.stopPropagation();
        if (!open && btnRef.current) {
            setRect(btnRef.current.getBoundingClientRect());
        }
        setOpen(o => !o);
    };

    const popover = open && rect && createPortal(
        <div
            ref={popoverRef}
            style={{
                position: 'fixed',
                left: rect.left,
                top: rect.top - 4,
                transform: 'translateY(-100%)',
                zIndex: 9999,
            }}
            className="bg-white border border-slate-200 rounded-lg shadow-xl p-2 min-w-[150px] max-w-[210px] flex flex-col gap-1"
        >
            {events.map((ev, i) => {
                const isPending = ev.status === 'pending';
                if (ev.kind === 'wfh') {
                    return (
                        <div key={i}
                            className={`rounded px-1.5 py-1 text-[10px] font-medium leading-tight truncate
                                ${WFH_COLOR.bg} ${WFH_COLOR.text} ${isPending ? PENDING_OPACITY : ''}`}
                            title={`WFH: ${ev.employee_name}${isPending ? ' (pending)' : ''}`}>
                            🏠 {ev.employee_name}
                        </div>
                    );
                }
                const c = LEAVE_COLORS[ev.leave_type] || LEAVE_COLORS.default;
                return (
                    <div key={i}
                        className={`rounded px-1.5 py-1 text-[10px] font-medium leading-tight truncate
                            ${c.bg} ${c.text} ${isPending ? PENDING_OPACITY : ''}`}
                        title={`${c.label}: ${ev.employee_name}${isPending ? ' (pending)' : ''}`}>
                        {ev.employee_name}
                    </div>
                );
            })}
        </div>,
        document.body
    );

    return (
        <>
            <button
                ref={btnRef}
                onClick={handleClick}
                className="text-[10px] text-slate-500 hover:text-slate-700 px-1 py-0.5 rounded hover:bg-slate-100 transition-colors"
            >
                +{events.length} more
            </button>
            {popover}
        </>
    );
}

export default function LeaveCalendar({ filterEmployeeIds = null }) {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1); // 1-indexed

    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    const { data, isLoading } = useQuery({
        queryKey: ['leave-calendar', monthStr],
        queryFn: () => leaveApi.getCalendar(monthStr),
        staleTime: 30_000,
    });

    const prevMonth = () => {
        if (month === 1) { setMonth(12); setYear(y => y - 1); }
        else setMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (month === 12) { setMonth(1); setYear(y => y + 1); }
        else setMonth(m => m + 1);
    };

    // Build a map: date string → list of events
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
            // Expand multi-day leaves across all days they cover
            const start = new Date(leave.start_date + 'T00:00:00');
            const end = new Date(leave.end_date + 'T00:00:00');
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                // Use local date components to avoid UTC offset shifting the date
                const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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

    // Build calendar grid
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun
    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <ChevronLeft className="h-5 w-5 text-slate-600" />
                </button>
                <h3 className="text-base font-semibold text-slate-800">
                    {new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <ChevronRight className="h-5 w-5 text-slate-600" />
                </button>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 px-6 py-3 border-b border-slate-100 bg-slate-50">
                {Object.entries(LEAVE_COLORS).filter(([k]) => k !== 'default').map(([key, c]) => (
                    <span key={key} className="flex items-center gap-1.5 text-xs text-slate-600">
                        <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                        {c.label}
                    </span>
                ))}
                <span className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className={`h-2.5 w-2.5 rounded-full ${WFH_COLOR.dot}`} />
                    {WFH_COLOR.label}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-400 ml-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    Pending (dimmed)
                </span>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading...</div>
            ) : (
                <div className="p-2 sm:p-4">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 mb-1 sm:mb-2">
                        {DAY_NAMES.map(d => (
                            <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
                        ))}
                    </div>

                    {/* Day cells */}
                    <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                        {cells.map((day, idx) => {
                            if (!day) return <div key={`empty-${idx}`} />;
                            const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                            const events = eventsByDate[dateStr] || [];
                            const isToday = dateStr === todayStr;

                            return (
                                <div
                                    key={dateStr}
                                    className={`min-h-[56px] sm:min-h-[80px] rounded-lg sm:rounded-xl border p-1 sm:p-1.5 flex flex-col gap-1 transition-colors
                                        ${isToday ? 'border-blue-400 bg-blue-50' : 'border-slate-100 bg-white hover:bg-slate-50'}`}
                                >
                                    <span className={`text-xs font-semibold self-end px-1 rounded-full
                                        ${isToday ? 'bg-blue-500 text-white' : 'text-slate-500'}`}>
                                        {day}
                                    </span>
                                    <div className="flex flex-col gap-0.5">
                                        {events.slice(0, 3).map((ev, ei) => {
                                            const isPending = ev.status === 'pending';
                                            if (ev.kind === 'wfh') {
                                                return (
                                                    <div key={ei}
                                                        className={`rounded px-1 py-0.5 truncate text-[10px] font-medium leading-tight
                                                            ${WFH_COLOR.bg} ${WFH_COLOR.text} ${isPending ? PENDING_OPACITY : ''}`}
                                                        title={`WFH: ${ev.employee_name}${isPending ? ' (pending)' : ''}`}>
                                                        🏠 {ev.employee_name?.split(' ')[0]}
                                                    </div>
                                                );
                                            }
                                            const c = LEAVE_COLORS[ev.leave_type] || LEAVE_COLORS.default;
                                            return (
                                                <div key={ei}
                                                    className={`rounded px-1 py-0.5 truncate text-[10px] font-medium leading-tight
                                                        ${c.bg} ${c.text} ${isPending ? PENDING_OPACITY : ''}`}
                                                    title={`${c.label}: ${ev.employee_name}${isPending ? ' (pending)' : ''}`}>
                                                    {ev.employee_name?.split(' ')[0]}
                                                </div>
                                            );
                                        })}
                                        {events.length > 3 && (
                                            <OverflowPopover events={events.slice(3)} />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
