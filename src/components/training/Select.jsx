import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

/**
 * Listbox that replaces the browser's native <select> on the Training screens.
 * Options: [{ value, label, dot?: "bg-…" tailwind class, hint?: string }]
 * The menu renders in a portal so it is never clipped by a modal body.
 */
export default function Select({
  value,
  onChange,
  options = [],
  placeholder = "Choose",
  className = "",
  ariaLabel,
  align = "left",
  menuWidth,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const selected = options.find((o) => String(o.value) === String(value));

  const place = () => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(menuWidth || Math.max(r.width, 260), window.innerWidth - 16);
    const estimated = Math.min(options.length * 36 + 8, 288);
    const up = window.innerHeight - r.bottom < estimated + 12 && r.top > estimated + 12;
    setPos({
      top: up ? r.top - estimated - 4 : r.bottom + 4,
      left: Math.max(8, Math.min(align === "right" ? r.right - width : r.left, window.innerWidth - width - 8)),
      width,
    });
  };

  useLayoutEffect(() => {
    if (open) place();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onMove = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      place();
    };
    // Escape closes only this menu, not the modal around it.
    const onEsc = (e) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    window.addEventListener("keydown", onEsc, true);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("keydown", onEsc, true);
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const openMenu = () => {
    if (disabled) return;
    setActive(Math.max(0, options.findIndex((o) => String(o.value) === String(value))));
    setOpen(true);
  };

  const choose = (opt) => {
    onChange?.(opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (options[active]) choose(options[active]);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={`inline-flex items-center justify-between gap-2 h-9 pl-3 pr-2.5 rounded-lg border bg-white text-sm text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed ${
          open ? "border-indigo-400" : "border-slate-200 hover:border-slate-300"
        } ${className}`}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected?.dot && <span className={`h-2 w-2 rounded-full shrink-0 ${selected.dot}`} />}
          <span className={`truncate ${selected ? "text-slate-900" : "text-slate-400"}`}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={1.5}
        />
      </button>

      {open &&
        pos &&
        createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            className="fixed z-[10050] max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.08)] animate-fade-in"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {options.map((opt, i) => {
              const isSel = String(opt.value) === String(value);
              return (
                <li
                  key={String(opt.value)}
                  role="option"
                  aria-selected={isSel}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(opt)}
                  className={`flex items-center gap-2 h-9 px-2.5 rounded-md text-sm cursor-pointer transition-colors ${
                    i === active ? "bg-slate-100" : ""
                  } ${isSel ? "text-slate-900 font-medium" : "text-slate-700"}`}
                >
                  {opt.dot !== undefined && (
                    <span className={`h-2 w-2 rounded-full shrink-0 ${opt.dot || "bg-transparent"}`} />
                  )}
                  <span className="truncate flex-1">{opt.label}</span>
                  {opt.hint && <span className="text-xs tabular-nums text-slate-400 shrink-0">{opt.hint}</span>}
                  {isSel && <Check className="h-4 w-4 text-indigo-600 shrink-0" strokeWidth={2} />}
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </>
  );
}
