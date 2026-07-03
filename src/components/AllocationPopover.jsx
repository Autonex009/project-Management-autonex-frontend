import React, { useState, useRef, useEffect, useMemo, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Button from './ui/Button';
import { UserPlus, Users, Mail, ArrowRight } from 'lucide-react';

const POPOVER_WIDTH = 320;
const POPOVER_MARGIN = 12;

// Stable color palette for avatars based on the employee name
const AVATAR_PALETTE = [
  'from-indigo-500 to-violet-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-sky-500 to-blue-500',
  'from-fuchsia-500 to-purple-500',
  'from-lime-500 to-green-500',
  'from-cyan-500 to-sky-500',
];

const hashString = (str = '') => {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
};

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const Avatar = ({ name }) => {
  const gradient = AVATAR_PALETTE[hashString(name || '') % AVATAR_PALETTE.length];
  return (
    <div
      className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} text-white flex items-center justify-center text-xs font-semibold shadow-sm ring-2 ring-white shrink-0`}
    >
      {getInitials(name)}
    </div>
  );
};

const AllocationPopover = ({
  project,
  allocations = [],
  employees = [],
  onOpenAllocations,
  badgeContent,
}) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, placement: 'bottom', arrowLeft: 0 });
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const closeTimerRef = useRef(null);

  // Support either pre-filtered allocations or the full list
  const list = useMemo(() => {
    const filtered = Array.isArray(allocations)
      ? allocations.filter((a) =>
          a.sub_project_id !== undefined ? a.sub_project_id === project?.id : true
        )
      : [];
    return filtered.map((a) => ({
      alloc: a,
      emp: employees.find((e) => e.id === a.employee_id),
    }));
  }, [allocations, employees, project]);

  // Position the popover relative to the trigger, flipping above when bottom space is tight
  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const popoverEl = popoverRef.current;
    const popoverHeight = popoverEl?.offsetHeight || 360;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Horizontal: center on the trigger, clamp into viewport
    const triggerCenter = rect.left + rect.width / 2;
    let left = triggerCenter - POPOVER_WIDTH / 2;
    left = Math.max(POPOVER_MARGIN, Math.min(left, vw - POPOVER_WIDTH - POPOVER_MARGIN));

    // Vertical: prefer bottom; flip to top if there's more room above
    const spaceBelow = vh - rect.bottom - POPOVER_MARGIN;
    const spaceAbove = rect.top - POPOVER_MARGIN;
    const placeBelow = spaceBelow >= popoverHeight || spaceBelow >= spaceAbove;
    const top = placeBelow
      ? rect.bottom + 8
      : rect.top - popoverHeight - 8;

    const arrowLeft = Math.max(16, Math.min(POPOVER_WIDTH - 16, triggerCenter - left));

    setPosition({ top, left, placement: placeBelow ? 'bottom' : 'top', arrowLeft });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    // Re-measure once after content lays out (in case size changed)
    const id = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(id);
  }, [open, list.length, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, updatePosition]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        triggerRef.current && triggerRef.current.contains(e.target)
        || popoverRef.current && popoverRef.current.contains(e.target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  const scheduleClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setOpen(false), 140);
  };

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleAdd = (e) => {
    e.stopPropagation();
    setOpen(false);
    if (onOpenAllocations) onOpenAllocations();
  };

  const popover = open ? createPortal(
    <div
      ref={popoverRef}
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
      className="z-[100]"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: POPOVER_WIDTH,
        animation: 'allocPopoverIn 140ms ease-out',
      }}
      role="dialog"
    >
      {/* Arrow */}
      {position.placement === 'bottom' ? (
        <div
          className="absolute -top-1.5 w-3 h-3 bg-white border-l border-t border-slate-200 rotate-45"
          style={{ left: position.arrowLeft - 6 }}
        />
      ) : (
        <div
          className="absolute -bottom-1.5 w-3 h-3 bg-white border-r border-b border-slate-200 rotate-45"
          style={{ left: position.arrowLeft - 6 }}
        />
      )}

      <div className="relative bg-white border border-slate-200 rounded-2xl shadow-2xl ring-1 ring-slate-900/5 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Allocated
                  </div>
                  <div className="text-sm font-semibold text-slate-800 truncate">
                    {project?.name || 'Project'}
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {list.length}
              </span>
            </div>

            {/* Body */}
            <div className="max-h-64 overflow-y-auto py-1">
              {list.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                    <Users className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">No employees allocated</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Add the first one to get started
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {list.map(({ alloc, emp }) => {
                    const name = emp?.name || 'Unknown';
                    const role = emp?.designation || emp?.role || emp?.job_title;
                    const tags = Array.isArray(alloc?.role_tags) ? alloc.role_tags : [];
                    return (
                      <li
                        key={alloc.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors"
                      >
                        <Avatar name={name} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">
                            {name}
                          </div>
                          <div className="text-xs text-slate-400 truncate flex items-center gap-1">
                            {role ? (
                              <span className="truncate">{role}</span>
                            ) : emp?.email ? (
                              <>
                                <Mail className="w-3 h-3 shrink-0" />
                                <span className="truncate">{emp.email}</span>
                              </>
                            ) : (
                              <span className="italic text-slate-300">No details</span>
                            )}
                          </div>
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {tags.slice(0, 3).map((t) => (
                                <span
                                  key={t}
                                  className="px-1.5 py-0.5 text-[10px] font-medium bg-indigo-50 text-indigo-600 rounded"
                                >
                                  {t}
                                </span>
                              ))}
                              {tags.length > 3 && (
                                <span className="text-[10px] text-slate-400">
                                  +{tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {alloc?.total_daily_hours ? (
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 shrink-0">
                            {alloc.total_daily_hours}h
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer / CTA */}
            <div className="px-3 py-2.5 border-t border-slate-100 bg-slate-50/60">
              <Button type="button" onClick={handleAdd} className="w-full justify-center">
                <UserPlus className="w-4 h-4" />
                <span>Add employee</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-80" />
              </Button>
            </div>
          </div>

      {/* Local keyframes */}
      <style>{`
        @keyframes allocPopoverIn {
          0% { opacity: 0; transform: translateY(-4px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => onOpenAllocations && onOpenAllocations()}
        onMouseEnter={() => { cancelClose(); setOpen(true); }}
        onMouseLeave={scheduleClose}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-medium text-sm transition-colors border border-emerald-200 shadow-sm"
        aria-expanded={open}
      >
        {badgeContent || (
          <>
            <span>Allocated</span>
            <span className="font-bold">{list.length}</span>
          </>
        )}
      </button>
      {popover}
    </>
  );
};

export default AllocationPopover;
