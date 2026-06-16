import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { leaveApi } from '../services/api';

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
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toYMD(dateStr) { return dateStr.slice(0, 10); }

// ─── Overflow popover ────────────────────────────────────────────────────────
function OverflowPopover({ events }) {
    const [open, setOpen] = useState(false);
    const [rect, setRect] = useState(null);
    const btnRef    = useRef(null);
    const popoverRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (
                popoverRef.current && !popoverRef.current.contains(e.target) &&
                btnRef.current    && !btnRef.current.contains(e.target)
            ) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleClick = (e) => {
        e.stopPropagation();
        if (!open && btnRef.current) setRect(btnRef.current.getBoundingClientRect());
        setOpen(o => !o);
    };

    const popover = open && rect && createPortal(
        <div
            ref={popoverRef}
            style={{
                position: 'fixed',
                left: rect.left,
                top:  rect.top - 8,
                transform: 'translateY(-100%)',
                zIndex: 9999,
                background: 'rgba(255,255,255,0.98)',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                padding: '8px',
                minWidth: '160px',
                maxWidth: '220px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
            }}
        >
            {events.map((ev, i) => {
                const isPending = ev.status === 'pending';
                if (ev.kind === 'wfh') return (
                    <div key={i} style={{
                        background: WFH_COLOR.bg, color: WFH_COLOR.text,
                        opacity: isPending ? PENDING_OPACITY : 1,
                        borderRadius: '6px', padding: '3px 8px',
                        fontSize: '11px', fontWeight: 600,
                    }}>🏠 {ev.employee_name}</div>
                );
                const c = LEAVE_COLORS[ev.leave_type] || LEAVE_COLORS.default;
                return (
                    <div key={i} style={{
                        background: c.bg, color: c.text,
                        opacity: isPending ? PENDING_OPACITY : 1,
                        borderRadius: '6px', padding: '3px 8px',
                        fontSize: '11px', fontWeight: 600,
                    }}>{ev.employee_name}</div>
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
                style={{
                    fontSize: '10px', fontWeight: 600,
                    color: '#64748b', background: '#f1f5f9',
                    border: 'none', borderRadius: '4px',
                    padding: '1px 6px', cursor: 'pointer',
                    transition: 'background 0.15s',
                }}
                onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
                onMouseOut={e  => e.currentTarget.style.background = '#f1f5f9'}
            >+{events.length} more</button>
            {popover}
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

// ─── Main Calendar ───────────────────────────────────────────────────────────
export default function LeaveCalendar({ filterEmployeeIds = null }) {
    const today = new Date();
    const [year,  setYear]  = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1);

    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    const { data, isLoading } = useQuery({
        queryKey: ['leave-calendar', monthStr],
        queryFn: () => leaveApi.getCalendar(monthStr),
        staleTime: 30_000,
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

    return (
        <div style={{
            background: '#fff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
            overflow: 'hidden',
            fontFamily: 'Inter, system-ui, sans-serif',
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

                            // Cell background priority: today > fixed holiday > floater holiday > weekend > normal
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

                            return (
                                <div
                                    key={dateStr}
                                    title={holiday ? `${holiday.name} (${holiday.type})` : undefined}
                                    style={{
                                        minHeight: '88px',
                                        borderRadius: '8px',
                                        border: `1.5px solid ${cellBorder}`,
                                        background: cellBg,
                                        padding: '4px 4px 4px',
                                        display: 'flex', flexDirection: 'column', gap: '3px',
                                        transition: 'box-shadow 0.15s, transform 0.15s',
                                        cursor: events.length > 0 ? 'default' : undefined,
                                        position: 'relative',
                                    }}
                                    onMouseOver={e => {
                                        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.09)';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseOut={e => {
                                        e.currentTarget.style.boxShadow = 'none';
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
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                                        {events.slice(0, 2).map((ev, ei) => (
                                            <EventChip key={ei} ev={ev} />
                                        ))}
                                        {events.length > 2 && (
                                            <OverflowPopover events={events.slice(2)} />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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
