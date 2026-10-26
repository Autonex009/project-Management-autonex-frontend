import React, { useState, useEffect, useRef } from "react";
import {
  Clock,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Check,
  Building2,
  Home,
  AlertCircle,
  X,
  Calendar,
} from "lucide-react";

/**
 * MatrixColumnPopover:
 * Context popover anchored to a specific date column header.
 * Allows sorting (Early to Late / Late to Early) and filtering
 * (Late checkin > 11:00, No checkin, Consecutive absences, WFH, WFO).
 */
const MatrixColumnPopover = ({
  dateKey,
  dateObj,
  currentSort,
  currentFilter,
  onApplySort,
  onApplyFilter,
  onResetColumn,
  onClose,
}) => {
  const popoverRef = useRef(null);

  // Local state for interactive editing before applying
  const [sortDir, setSortDir] = useState(
    currentSort?.columnDateKey === dateKey ? currentSort.direction : null
  );

  const [filterType, setFilterType] = useState(
    currentFilter?.type && currentFilter?.targetDateKey === dateKey
      ? currentFilter.type
      : "all"
  );

  const [consecutiveDays, setConsecutiveDays] = useState(
    currentFilter?.consecutiveDays || 2
  );

  const [skipWeekends, setSkipWeekends] = useState(
    currentFilter?.skipWeekends !== undefined ? currentFilter.skipWeekends : true
  );

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [onClose]);

  const handleApply = () => {
    onApplySort({
      columnDateKey: sortDir ? dateKey : null,
      direction: sortDir,
    });

    onApplyFilter({
      targetDateKey: filterType !== "all" ? dateKey : null,
      type: filterType,
      consecutiveDays: Number(consecutiveDays) || 2,
      skipWeekends,
      lateThreshold: "11:00",
    });

    onClose();
  };

  const handleReset = () => {
    setSortDir(null);
    setFilterType("all");
    setConsecutiveDays(2);
    setSkipWeekends(true);
    onResetColumn(dateKey);
    onClose();
  };

  const formattedTitle = dateObj
    ? dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : dateKey;

  return (
    <div
      ref={popoverRef}
      className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 z-[100] w-72 sm:w-80 bg-white rounded-xl shadow-2xl border border-slate-200 text-left font-normal text-slate-700 p-4 space-y-4 animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <span className="font-semibold text-xs sm:text-sm text-slate-800">
            {formattedTitle}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Sort Section */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Sort by Check-in Time
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setSortDir((prev) => (prev === "asc" ? null : "asc"))}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              sortDir === "asc"
                ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
            <span>Early to Late</span>
          </button>

          <button
            type="button"
            onClick={() => setSortDir((prev) => (prev === "desc" ? null : "desc"))}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              sortDir === "desc"
                ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
            <span>Late to Early</span>
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Filter by Status on this Date
        </label>

        <div className="space-y-1">
          {/* All */}
          <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs">
            <input
              type="radio"
              name="columnFilterType"
              value="all"
              checked={filterType === "all"}
              onChange={() => setFilterType("all")}
              className="w-3.5 h-3.5 text-indigo-600 border-slate-300 focus:ring-0"
            />
            <span className="text-slate-700 font-medium">Show All Employees</span>
          </label>

          {/* Late Check-in */}
          <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs">
            <input
              type="radio"
              name="columnFilterType"
              value="late"
              checked={filterType === "late"}
              onChange={() => setFilterType("late")}
              className="w-3.5 h-3.5 text-indigo-600 border-slate-300 focus:ring-0"
            />
            <div className="flex items-center gap-1.5 text-amber-700 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Late Check-in (after 11:00 AM)</span>
            </div>
          </label>

          {/* No Check-in */}
          <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs">
            <input
              type="radio"
              name="columnFilterType"
              value="no_checkin"
              checked={filterType === "no_checkin"}
              onChange={() => setFilterType("no_checkin")}
              className="w-3.5 h-3.5 text-indigo-600 border-slate-300 focus:ring-0"
            />
            <div className="flex items-center gap-1.5 text-rose-700 font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              <span>No Check-in (Absent)</span>
            </div>
          </label>

          {/* WFO Only */}
          <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs">
            <input
              type="radio"
              name="columnFilterType"
              value="wfo"
              checked={filterType === "wfo"}
              onChange={() => setFilterType("wfo")}
              className="w-3.5 h-3.5 text-indigo-600 border-slate-300 focus:ring-0"
            />
            <div className="flex items-center gap-1.5 text-indigo-700 font-medium">
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Work from Office (WFO)</span>
            </div>
          </label>

          {/* WFH Only */}
          <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs">
            <input
              type="radio"
              name="columnFilterType"
              value="wfh"
              checked={filterType === "wfh"}
              onChange={() => setFilterType("wfh")}
              className="w-3.5 h-3.5 text-indigo-600 border-slate-300 focus:ring-0"
            />
            <div className="flex items-center gap-1.5 text-sky-700 font-medium">
              <Home className="w-3.5 h-3.5 text-sky-500" />
              <span>Work from Home (WFH)</span>
            </div>
          </label>

          {/* Consecutive Missed Check-ins */}
          <label className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs">
            <input
              type="radio"
              name="columnFilterType"
              value="consecutive"
              checked={filterType === "consecutive"}
              onChange={() => setFilterType("consecutive")}
              className="w-3.5 h-3.5 mt-0.5 text-indigo-600 border-slate-300 focus:ring-0"
            />
            <div className="flex-1">
              <span className="font-medium text-slate-800">
                Consecutive No Check-ins
              </span>
              <p className="text-[11px] text-slate-400">
                Flag employees missing multiple consecutive days up to this date.
              </p>
            </div>
          </label>
        </div>

        {/* Consecutive Options Expansion */}
        {filterType === "consecutive" && (
          <div className="ml-5 p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-600 font-medium">Consecutive Days:</span>
              <div className="flex items-center gap-1">
                {[2, 3, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setConsecutiveDays(num)}
                    className={`px-2 py-0.5 rounded text-xs font-semibold border transition-all ${
                      Number(consecutiveDays) === num
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {num}d
                  </button>
                ))}
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={consecutiveDays}
                  onChange={(e) => setConsecutiveDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-12 px-1.5 py-0.5 text-center text-xs border border-slate-300 rounded bg-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 pt-1 border-t border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={skipWeekends}
                onChange={(e) => setSkipWeekends(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300 focus:ring-0"
              />
              <span className="text-[11px] text-slate-600">
                Skip weekends (business days only)
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <RotateCcw className="w-3 h-3 text-slate-400" />
          <span>Reset</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatrixColumnPopover;
