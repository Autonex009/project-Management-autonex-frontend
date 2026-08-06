const FLAG_TONES = {
  orange: "bg-orange-100 text-orange-600 border-orange-200",
  red: "bg-red-100 text-red-600 border-red-200",
};

/**
 * Round icon flag beside an employee's name, labelled on hover.
 *
 * The name cell has very little room, so anything worth flagging goes in as an
 * icon rather than a worded pill — the label lives in the tooltip.
 *
 * Shared by the admin Leaves page and the PM Team Leaves page, which show the
 * same rows to different roles and must flag them identically.
 */
const FlagChip = ({ icon: Icon, label, tone = "orange", pulse = false }) => (
  <div className="relative group flex items-center">
    <span
      className={`inline-flex items-center justify-center h-5 w-5 shrink-0 rounded-full border cursor-help ${FLAG_TONES[tone]} ${pulse ? "animate-pulse" : ""}`}
    >
      <Icon className="w-3 h-3" />
    </span>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block px-2 py-1 bg-white text-slate-700 shadow border border-slate-100 text-xs rounded whitespace-nowrap z-50">
      {label}
    </div>
  </div>
);

export default FlagChip;
