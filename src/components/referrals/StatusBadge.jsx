import { STATUS_CONFIG } from "./statusConfig";

/**
 * showDot = true  → admin style (dot + text-[11px] px-2 gap-1.5)
 * showDot = false → employee style (no dot + text-xs px-2.5 gap-1)
 */
const StatusBadge = ({ status, showDot = false }) => {
  const cfg = STATUS_CONFIG[status] || {
    label: status,
    color: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${cfg.color} ${
        showDot
          ? "gap-1.5 px-2 py-0.5 text-[11px]"
          : "gap-1 px-2.5 py-0.5 text-xs"
      }`}
    >
      {showDot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${cfg.dot || "bg-slate-400"}`}
        />
      )}
      {cfg.label}
    </span>
  );
};

export default StatusBadge;