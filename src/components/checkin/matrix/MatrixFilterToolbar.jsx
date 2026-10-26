import React from "react";
import {
  Calendar,
  Clock,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  X,
  Building2,
  Home,
  AlertCircle,
  Users,
} from "lucide-react";
import SearchBar from "../../ui/SearchBar";
import Dropdown from "../../ui/Dropdown";
import { formatDateKey } from "./matrixUtils";

/**
 * MatrixFilterToolbar:
 * Sits directly above the Check-in Matrix grid.
 * Houses the Employee Search bar, Active Date column selector,
 * active filter badges with 1-click removal, result count, and Reset All action.
 */
const MatrixFilterToolbar = ({
  searchQuery = "",
  onSearchChange,
  displayDays = [],
  selectedDateKey = null,
  onSelectDateKey,
  currentFilter = null,
  onClearFilter,
  currentSort = null,
  onClearSort,
  onResetAll,
  totalCount = 0,
  filteredCount = 0,
}) => {
  // Construct date options for the dropdown from displayDays
  const dateOptions = displayDays.map((d) => {
    const key = formatDateKey(d);
    const label = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return { value: key, label };
  });

  const isSearchActive = Boolean(searchQuery && searchQuery.trim());
  const isFilterActive = Boolean(
    currentFilter?.type && currentFilter.type !== "all" && currentFilter.targetDateKey
  );
  const isSortActive = Boolean(currentSort?.columnDateKey && currentSort?.direction);
  const hasAnyActiveFilters = isSearchActive || isFilterActive || isSortActive;

  // Format active date label
  const activeDateObj = currentFilter?.targetDateKey
    ? new Date(`${currentFilter.targetDateKey}T00:00:00`)
    : selectedDateKey
    ? new Date(`${selectedDateKey}T00:00:00`)
    : null;

  const activeDateFormatted = activeDateObj && !isNaN(activeDateObj.getTime())
    ? activeDateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : "";

  return (
    <div className="flex flex-col gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search Bar & Quick Date Selector */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Employee Search Bar */}
          <SearchBar
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="Search employee by name..."
            size="sm"
            width="w-64"
            clearable={true}
          />

          {/* Quick Date Column Selector */}
          <div className="w-44">
            <Dropdown
              value={selectedDateKey || ""}
              onChange={(val) => onSelectDateKey(val || null)}
              placeholder="Select date column"
              options={[
                { value: "", label: "No column focused" },
                ...dateOptions,
              ]}
              searchable={dateOptions.length > 7}
              searchPlaceholder="Find date..."
            />
          </div>
        </div>

        {/* Right: Results Counter & Reset All */}
        <div className="flex items-center gap-3 self-end sm:self-auto text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Showing <strong className="text-slate-900 font-semibold">{filteredCount}</strong> of{" "}
              {totalCount} employees
            </span>
          </div>

          {hasAnyActiveFilters && (
            <button
              type="button"
              onClick={onResetAll}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200/80 transition-all cursor-pointer active:scale-95"
              title="Reset search, column filters, and sorting"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset all</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Chips Bar (Shown when any filter or sort is active) */}
      {hasAnyActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Active:
          </span>

          {/* Search chip */}
          {isSearchActive && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200">
              <span>Search: "{searchQuery}"</span>
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="p-0.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Date Filter chip */}
          {isFilterActive && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium border border-indigo-200">
              {currentFilter.type === "late" && (
                <>
                  <Clock className="w-3 h-3 text-amber-500" />
                  <span>Late Check-in ({activeDateFormatted})</span>
                </>
              )}
              {currentFilter.type === "no_checkin" && (
                <>
                  <AlertCircle className="w-3 h-3 text-rose-500" />
                  <span>No Check-in ({activeDateFormatted})</span>
                </>
              )}
              {currentFilter.type === "wfo" && (
                <>
                  <Building2 className="w-3 h-3 text-indigo-500" />
                  <span>WFO ({activeDateFormatted})</span>
                </>
              )}
              {currentFilter.type === "wfh" && (
                <>
                  <Home className="w-3 h-3 text-sky-500" />
                  <span>WFH ({activeDateFormatted})</span>
                </>
              )}
              {currentFilter.type === "consecutive" && (
                <>
                  <AlertCircle className="w-3 h-3 text-rose-500" />
                  <span>
                    {currentFilter.consecutiveDays}d Consecutive Absent (up to {activeDateFormatted})
                  </span>
                </>
              )}
              <button
                type="button"
                onClick={onClearFilter}
                className="p-0.5 hover:bg-indigo-100 rounded-full text-indigo-500 hover:text-indigo-800"
                title="Remove filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Sort chip */}
          {isSortActive && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 font-medium border border-sky-200">
              {currentSort.direction === "asc" ? (
                <ArrowUp className="w-3 h-3 text-sky-600" />
              ) : (
                <ArrowDown className="w-3 h-3 text-sky-600" />
              )}
              <span>
                Sorted: {currentSort.direction === "asc" ? "Early to Late" : "Late to Early"}{" "}
                ({currentSort.columnDateKey})
              </span>
              <button
                type="button"
                onClick={onClearSort}
                className="p-0.5 hover:bg-sky-100 rounded-full text-sky-500 hover:text-sky-800"
                title="Reset sort to A-Z"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default MatrixFilterToolbar;
