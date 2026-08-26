import React from "react";
import { createPortal } from "react-dom";
import { Briefcase, Layers } from "lucide-react";
import { usePopoverPosition } from "./usePopoverPosition";

const POPOVER_WIDTH = 320;

const statusPill = (status) => {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "upcoming":
      return "bg-sky-50 text-sky-700 border-sky-200";
    default:
      return "bg-slate-100 text-slate-500 border-slate-200"; // ended
  }
};

const statusLabel = (a) => {
  if (a.status === "active") return "Active";
  if (a.status === "upcoming")
    return `Upcoming${a.startDate ? ` · from ${a.startDate}` : ""}`;
  return `Ended${a.endDate ? ` ${a.endDate}` : ""}`;
};

// Hover popover listing the projects a candidate is/was allocated to.
// Mirrors AllocationPopover's UX (portal, smart positioning, scrollable body).
const CandidateAllocationsPopover = ({
  allocations = [],
  candidateName = "",
  badgeContent,
}) => {
  const {
    open,
    setOpen,
    position,
    triggerRef,
    popoverRef,
    scheduleClose,
    cancelClose,
  } = usePopoverPosition({ deps: [allocations.length] });

  const popover = open
    ? createPortal(
        <div
          ref={popoverRef}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          className="z-[100]"
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
            width: POPOVER_WIDTH,
            animation: "candAllocIn 140ms ease-out",
          }}
          role="dialog"
        >
          {position.placement === "bottom" ? (
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
            <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Project history
                  </div>
                  <div className="text-sm font-semibold text-slate-800 truncate">
                    {candidateName || "Candidate"}
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                {allocations.length}
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto py-1">
              {allocations.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-400">
                  No project allocations
                </div>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {allocations.map((a) => (
                    <li
                      key={a.allocationId}
                      className="px-3 py-2.5 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-800 truncate">
                          {a.projectName}
                        </div>
                        {a.hours ? (
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 shrink-0">
                            {a.hours}h
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${a.isAnnotation ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-slate-100 text-slate-500 border-slate-200"}`}
                        >
                          {a.isAnnotation ? "Annotation" : "Non-annotation"}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border ${statusPill(a.status)}`}
                        >
                          {statusLabel(a)}
                        </span>
                      </div>
                      {(a.startDate || a.endDate) && (
                        <div className="text-[10px] text-slate-400 mt-1">
                          {a.startDate || "—"} → {a.endDate || "open-ended"}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <style>{`
 @keyframes candAllocIn {
 0% { opacity: 0; transform: translateY(-4px) scale(0.98); }
 100% { opacity: 1; transform: translateY(0) scale(1); }
 }
 `}</style>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onMouseEnter={() => {
          cancelClose();
          setOpen(true);
        }}
        onMouseLeave={scheduleClose}
        className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-md font-semibold text-[10px] uppercase tracking-wider transition-colors border border-amber-200"
        aria-expanded={open}
      >
        {badgeContent || (
          <>
            <Layers className="w-3 h-3" />
            <span>
              {allocations.length} project{allocations.length === 1 ? "" : "s"}
            </span>
          </>
        )}
      </button>
      {popover}
    </>
  );
};

export default CandidateAllocationsPopover;