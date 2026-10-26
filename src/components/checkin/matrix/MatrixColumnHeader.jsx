import React from "react";
import { ArrowUp, ArrowDown, ArrowUpDown, Filter } from "lucide-react";
import MatrixColumnPopover from "./MatrixColumnPopover";

/**
 * MatrixColumnHeader:
 * Renders an interactive <th> cell for a specific date in the check-in matrix.
 * Supports click-to-open context popover, hover indicators, and visual active states.
 */
const MatrixColumnHeader = ({
  dateObj,
  dateKey,
  isWeekend = false,
  isActiveColumn = false,
  currentSort = null,
  currentFilter = null,
  isPopoverOpen = false,
  onTogglePopover,
  onClosePopover,
  onApplySort,
  onApplyFilter,
  onResetColumn,
}) => {
  const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
  const dateNum = dateObj.getDate();

  const isSortedThisDate = currentSort?.columnDateKey === dateKey && currentSort?.direction;
  const isFilteredThisDate = currentFilter?.targetDateKey === dateKey && currentFilter?.type && currentFilter?.type !== "all";

  return (
    <th
      className={`relative px-2 py-2.5 text-center border-r border-slate-200 transition-colors select-none group cursor-pointer ${
        isActiveColumn
          ? "bg-indigo-100 text-indigo-950 font-bold border-x-2 border-x-indigo-400 border-b-2 border-b-indigo-600 shadow-sm"
          : isWeekend
          ? "bg-slate-100 hover:bg-slate-200/70 text-slate-700"
          : "hover:bg-slate-100 text-slate-800"
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onTogglePopover(dateKey);
      }}
      title={`Click to filter or sort by ${dayName} ${dateNum}`}
    >
      <div className="flex flex-col items-center justify-center gap-0.5">
        {/* Day Name & Indicator */}
        <div className="flex items-center justify-center gap-1">
          <span
            className={`text-[11px] leading-none ${
              isActiveColumn
                ? "text-indigo-800 font-bold"
                : isWeekend
                ? "text-slate-400 font-medium"
                : "text-slate-500 font-medium"
            }`}
          >
            {dayName}
          </span>

          {/* Filter active indicator */}
          {isFilteredThisDate && (
            <span
              className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-indigo-600 text-white text-[9px]"
              title="Filter applied to this date"
            >
              <Filter className="w-2.5 h-2.5" />
            </span>
          )}
        </div>

        {/* Date Number & Sort Indicator */}
        <div className="flex items-center justify-center gap-1">
          <span
            className={`text-sm leading-tight ${
              isActiveColumn ? "font-bold text-indigo-950" : "font-semibold text-slate-900"
            }`}
          >
            {dateNum}
          </span>

          {/* Sort active or hover indicator */}
          {isSortedThisDate ? (
            <span className="text-indigo-600 animate-in fade-in">
              {currentSort.direction === "asc" ? (
                <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
            </span>
          ) : (
            <span className="opacity-0 group-hover:opacity-60 text-slate-400 transition-opacity">
              <ArrowUpDown className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>

      {/* Popover anchored to this header */}
      {isPopoverOpen && (
        <MatrixColumnPopover
          dateKey={dateKey}
          dateObj={dateObj}
          currentSort={currentSort}
          currentFilter={currentFilter}
          onApplySort={onApplySort}
          onApplyFilter={onApplyFilter}
          onResetColumn={onResetColumn}
          onClose={onClosePopover}
        />
      )}
    </th>
  );
};

export default MatrixColumnHeader;
