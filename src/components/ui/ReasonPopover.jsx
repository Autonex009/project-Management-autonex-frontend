import { useState, useRef, useEffect } from "react";
import { MessageSquare } from "lucide-react";

/**
 * The reason spelled out in the cell, cut to one line, with the rest on hover.
 *
 * For tables with a column to spare — reading the note without a click beats
 * hiding it behind [ReasonPopover]'s icon. The tooltip is suppressed when the
 * text already fits, so a short reason doesn't get a card that repeats it.
 */
export const ReasonText = ({ reason, openUpward = false }) => {
  const [clipped, setClipped] = useState(false);
  const textRef = useRef(null);

  const text = (reason || "").trim();
  if (!text) return <span className="text-slate-300">—</span>;

  return (
    <div
      className="group relative min-w-0"
      // Measured on enter rather than on mount: the column is a percentage of the
      // table, so whether a line fits changes with the window and there is no
      // point tracking it until someone actually points at the cell.
      onMouseEnter={() => {
        const el = textRef.current;
        if (el) setClipped(el.scrollWidth > el.clientWidth + 1);
      }}
    >
      <p ref={textRef} className="truncate text-[13px] text-slate-600">
        {text}
      </p>
      {clipped && (
        <div
          className={`pointer-events-none absolute left-0 z-50 hidden w-72 max-w-[80vw] whitespace-pre-wrap break-words rounded-xl border border-slate-200/80 bg-white p-3 text-left text-[12px] leading-relaxed text-slate-600 shadow-xl group-hover:block ${
            openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
        >
          {text}
        </div>
      )}
    </div>
  );
};

/**
 * Message-box icon for a table cell that reveals the note attached to that row
 * in a popover anchored to the icon itself — no modal, so the row stays in view.
 *
 * For a table with room to show the note inline, reach for [ReasonText] instead.
 *
 * Rows near the bottom of a table should pass `openUpward` so the card doesn't
 * hang off the end of the page.
 */
const ReasonPopover = ({ reason, title, subtitle, openUpward = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const text = (reason || "").trim();

  if (!text) {
    return (
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-200"
        title="No reason provided"
      >
        <MessageSquare className="w-4 h-4" />
      </span>
    );
  }

  return (
    <div
      className={`relative inline-block text-left ${isOpen ? "z-[100]" : ""}`}
      ref={wrapRef}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-expanded={isOpen}
        title="View reason"
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
          isOpen
            ? "border-indigo-300 bg-indigo-100 text-indigo-700"
            : "border-indigo-100 bg-indigo-50 text-indigo-600 hover:border-indigo-200 hover:bg-indigo-100"
        }`}
      >
        <MessageSquare className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          // Centred on the icon, but nudged back inside the viewport on the right
          // edge of the table by capping the width rather than shifting origin.
          className={`absolute left-1/2 z-50 w-64 -translate-x-1/2 ${
            openUpward ? "bottom-full mb-2" : "top-full mt-2"
          } rounded-xl border border-slate-200/80 bg-white p-3 text-left shadow-xl`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Caret, so the card reads as attached to the icon it came from. */}
          <span
            className={`absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-slate-200/80 bg-white ${
              openUpward
                ? "-bottom-1 border-b border-r"
                : "-top-1 border-l border-t"
            }`}
          />
          {title && (
            <p className="truncate text-[13px] font-semibold text-slate-800">
              {title}
            </p>
          )}
          {subtitle && (
            <p className="mt-0.5 truncate text-[11px] text-slate-400">
              {subtitle}
            </p>
          )}
          <p
            className={`whitespace-pre-wrap break-words text-[12px] leading-relaxed text-slate-600 ${
              title || subtitle
                ? "mt-2 border-t border-slate-100 pt-2"
                : ""
            }`}
          >
            {text}
          </p>
        </div>
      )}
    </div>
  );
};

export default ReasonPopover;
