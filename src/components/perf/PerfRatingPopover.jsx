import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PERF_CRITERIA, RATING_SCALE, formatPeriod } from './perfCriteria';

const POPOVER_WIDTH = 300;
const MARGIN = 12;

const MiniStars = ({ value }) => (
    <span className="text-sm leading-none" title={RATING_SCALE[value]}>
        {[1, 2, 3, 4, 5].map((s) => (
            <span key={s} className={s <= (value || 0) ? 'text-amber-400' : 'text-slate-200'}>★</span>
        ))}
    </span>
);

// Hover popover showing the most-recent review's per-criterion ratings + date.
const PerfRatingPopover = ({ review, children }) => {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0, placement: 'bottom', arrowLeft: 0 });
    const triggerRef = useRef(null);
    const popoverRef = useRef(null);
    const closeTimer = useRef(null);

    const updatePosition = useCallback(() => {
        const trigger = triggerRef.current;
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        const height = popoverRef.current?.offsetHeight || 280;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const center = rect.left + rect.width / 2;
        let left = center - POPOVER_WIDTH / 2;
        left = Math.max(MARGIN, Math.min(left, vw - POPOVER_WIDTH - MARGIN));

        const spaceBelow = vh - rect.bottom - MARGIN;
        const spaceAbove = rect.top - MARGIN;
        const placeBelow = spaceBelow >= height || spaceBelow >= spaceAbove;
        const top = placeBelow ? rect.bottom + 8 : rect.top - height - 8;
        const arrowLeft = Math.max(16, Math.min(POPOVER_WIDTH - 16, center - left));

        setPos({ top, left, placement: placeBelow ? 'bottom' : 'top', arrowLeft });
    }, []);

    useLayoutEffect(() => {
        if (!open) return;
        updatePosition();
        const id = requestAnimationFrame(updatePosition);
        return () => cancelAnimationFrame(id);
    }, [open, updatePosition]);

    useEffect(() => {
        if (!open) return;
        const handler = () => updatePosition();
        window.addEventListener('scroll', handler, true);
        window.addEventListener('resize', handler);
        return () => {
            window.removeEventListener('scroll', handler, true);
            window.removeEventListener('resize', handler);
        };
    }, [open, updatePosition]);

    useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

    const cancelClose = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } };
    const scheduleClose = () => { cancelClose(); closeTimer.current = setTimeout(() => setOpen(false), 120); };
    const openNow = () => { cancelClose(); if (review) setOpen(true); };

    const popover = open && review ? createPortal(
        <div
            ref={popoverRef}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: POPOVER_WIDTH, animation: 'perfPopoverIn 140ms ease-out' }}
            className="z-[120]"
            role="dialog"
        >
            <style>{`@keyframes perfPopoverIn{0%{opacity:0;transform:translateY(-4px) scale(0.98)}100%{opacity:1;transform:translateY(0) scale(1)}}`}</style>
            {pos.placement === 'bottom' ? (
                <div className="absolute -top-1.5 h-3 w-3 rotate-45 border-l border-t border-slate-200 bg-white" style={{ left: pos.arrowLeft - 6 }} />
            ) : (
                <div className="absolute -bottom-1.5 h-3 w-3 rotate-45 border-b border-r border-slate-200 bg-white" style={{ left: pos.arrowLeft - 6 }} />
            )}

            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/5">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white px-4 py-3">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">Latest Review</p>
                        <p className="truncate text-sm font-semibold text-slate-800">{formatPeriod(review.period)}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                        ★ {review.average != null ? Number(review.average).toFixed(2) : '—'} / 5
                    </span>
                </div>

                <div className="space-y-2 p-4">
                    {PERF_CRITERIA.map((c) => (
                        <div key={c.key} className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-slate-600">{c.label}</span>
                            <MiniStars value={review.criteria_ratings?.[c.key]} />
                        </div>
                    ))}
                </div>

                <div className="border-t border-slate-100 px-4 py-2.5">
                    <p className="text-[11px] text-slate-400">
                        Given on {new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                </div>
            </div>
        </div>,
        document.body,
    ) : null;

    return (
        <span
            ref={triggerRef}
            onMouseEnter={openNow}
            onMouseLeave={scheduleClose}
            className="inline-flex"
        >
            {children}
            {popover}
        </span>
    );
};

export default PerfRatingPopover;
