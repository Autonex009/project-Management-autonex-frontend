import { useState, useRef, useEffect } from "react";
import { MoreVertical } from "lucide-react";

const TONES = {
  default: {
    item: "text-slate-700 hover:bg-slate-50 hover:text-indigo-600",
    icon: "text-slate-400",
  },
  success: {
    item: "text-slate-700 hover:bg-emerald-50 hover:text-emerald-700",
    icon: "text-emerald-500",
  },
  danger: {
    item: "text-rose-600 hover:bg-rose-50",
    icon: "text-rose-500",
  },
};

/**
 * Kebab (⋮) menu for table rows.
 *
 * `actions` accepts falsy entries so callers can inline conditionals, plus
 * `{ divider: true }` separators. Each real action is
 * `{ label, icon, onClick, disabled, tone }`.
 *
 * Rows near the bottom of a table should pass `openUpward` so the popover
 * doesn't push the page height out.
 */
const RowActionMenu = ({ actions = [], openUpward = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Drop falsy entries, then any divider left stranded at either end or
  // doubled up after the filtering above.
  const items = actions
    .filter(Boolean)
    .filter(
      (item, i, arr) =>
        !item.divider ||
        (i > 0 && i < arr.length - 1 && !arr[i - 1].divider),
    );

  if (items.length === 0) {
    return <span className="text-xs text-slate-300">—</span>;
  }

  return (
    <div
      className={`relative inline-block text-left ${isOpen ? "z-[100]" : ""}`}
      ref={menuRef}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors ${
          isOpen ? "bg-slate-100 text-slate-700" : ""
        }`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title="More actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className={`absolute right-0 ${
            openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"
          } z-50 w-44 rounded-xl border border-slate-200/80 bg-white py-1 text-xs font-medium shadow-xl focus:outline-none`}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, i) =>
            item.divider ? (
              <div key={`divider-${i}`} className="my-1 border-t border-slate-100" />
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setIsOpen(false);
                  item.onClick?.();
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  (TONES[item.tone] || TONES.default).item
                }`}
              >
                {item.icon && (
                  <item.icon
                    className={`w-3.5 h-3.5 shrink-0 ${(TONES[item.tone] || TONES.default).icon}`}
                  />
                )}
                <span>{item.label}</span>
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
};

export default RowActionMenu;
