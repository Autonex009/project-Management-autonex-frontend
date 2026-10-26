import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { checkinApi } from "../../services/api";
import UserAvatar from "../ui/UserAvatar";
import Dropdown from "../ui/Dropdown";
import SearchBar from "../ui/SearchBar";
import { formatDisplayName } from "../../utils/displayName";
import {
  Building2,
  Home,
  RotateCcw,
  SearchX,
  Users,
  Clock,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import DatePicker from "../ui/DatePicker";

// Sub-components & pure utilities for Check-in Matrix
import MatrixColumnHeader from "./matrix/MatrixColumnHeader";
import {
  formatDateKey,
  matchesSearch,
  matchesDateFilter,
  sortMatrixRows,
} from "./matrix/matrixUtils";

// Helper to get week start and end from YYYY-Www string
function getWeekRange(weekStr) {
  const [year, week] = weekStr.split("-W");
  const y = parseInt(year, 10);
  const w = parseInt(week, 10);
  const simple = new Date(y, 0, 1 + (w - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4)
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  
  const start = new Date(ISOweekStart);
  const end = new Date(ISOweekStart);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

// Generate all YYYY-MM strings between two dates
function getMonthsBetween(start, end) {
  const months = [];
  let current = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (current <= last) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    months.push(`${y}-${m}`);
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

// Generate array of date objects between start and end
function getDaysArray(start, end) {
  const arr = [];
  let dt = new Date(start);
  while (dt <= end) {
    arr.push(new Date(dt));
    dt.setDate(dt.getDate() + 1);
  }
  return arr;
}

const HistoryMatrix = ({ role = "admin" }) => {
  const today = new Date();
  
  // Timeframe states
  const [viewMode, setViewMode] = useState("month"); // 'month', 'week', 'custom'
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [monthVal, setMonthVal] = useState(currentMonthStr);
  
  // Calculate current week string (e.g. 2026-W36)
  const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  const currentWeekStr = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  
  const [weekVal, setWeekVal] = useState(currentWeekStr);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Interactive Search, Column Selection, Filter & Sort states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [dateFilter, setDateFilter] = useState({
    targetDateKey: null,
    type: "all",
    consecutiveDays: 2,
    skipWeekends: true,
    lateThreshold: "11:00",
  });
  const [sortConfig, setSortConfig] = useState({
    columnDateKey: null,
    direction: null,
  });
  const [activePopoverDateKey, setActivePopoverDateKey] = useState(null);

  // Determine active date range
  const dateRange = useMemo(() => {
    if (viewMode === "month" && monthVal) {
      const [y, m] = monthVal.split("-").map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0); // last day of month
      return { start, end };
    }
    if (viewMode === "week" && weekVal) {
      return getWeekRange(weekVal);
    }
    if (viewMode === "custom" && customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      // Validate 90 days max
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 90) {
        toast.error("Custom range cannot exceed 90 days for performance.");
        return null;
      }
      return { start, end };
    }
    return null;
  }, [viewMode, monthVal, weekVal, customStart, customEnd]);

  const targetMonths = useMemo(() => {
    if (!dateRange) return [];
    return getMonthsBetween(dateRange.start, dateRange.end);
  }, [dateRange]);

  const fetchMatrix = async () => {
    if (!targetMonths.length) return [];
    const fetcher = role === "admin" ? checkinApi.getAdminMatrix : checkinApi.getTeamMatrix;
    
    // Fetch all required months concurrently
    const promises = targetMonths.map((m) => fetcher(m));
    const results = await Promise.all(promises);
    
    // Merge results
    const empMap = {};
    results.forEach((res) => {
      res.rows.forEach((row) => {
        if (!empMap[row.employee_id]) {
          empMap[row.employee_id] = { ...row, checkinsByDate: {} };
        }
        // Map day strings to YYYY-MM-DD
        Object.keys(row.checkins).forEach((dayStr) => {
          const paddedDay = dayStr.padStart(2, '0');
          const fullDate = `${res.month_year}-${paddedDay}`;
          empMap[row.employee_id].checkinsByDate[fullDate] = row.checkins[dayStr];
        });
      });
    });
    
    return Object.values(empMap).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  };

  const { data: matrixData, isLoading, isError } = useQuery({
    queryKey: ["matrix-history", role, targetMonths.join(",")],
    queryFn: fetchMatrix,
    enabled: targetMonths.length > 0,
    staleTime: 60 * 1000,
  });

  const displayDays = useMemo(() => {
    if (!dateRange) return [];
    return getDaysArray(dateRange.start, dateRange.end);
  }, [dateRange]);

  // Options for selecting date column from dropdown
  const dateOptions = useMemo(() => {
    return displayDays.map((d) => {
      const key = formatDateKey(d);
      const label = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      return { value: key, label };
    });
  }, [displayDays]);

  // Reset popovers and invalid date selections when dateRange changes
  useEffect(() => {
    setActivePopoverDateKey(null);
  }, [monthVal, weekVal, customStart, customEnd, viewMode]);

  // Handlers for sorting & filtering
  const handleTogglePopover = (dateKey) => {
    setActivePopoverDateKey((prev) => (prev === dateKey ? null : dateKey));
    setSelectedDateKey(dateKey);
  };

  const handleClosePopover = () => {
    setActivePopoverDateKey(null);
  };

  const handleApplySort = (newSort) => {
    setSortConfig(newSort);
    if (newSort.columnDateKey) {
      setSelectedDateKey(newSort.columnDateKey);
    }
  };

  const handleApplyFilter = (newFilter) => {
    setDateFilter(newFilter);
    if (newFilter.targetDateKey) {
      setSelectedDateKey(newFilter.targetDateKey);
    }
  };

  const handleResetColumn = (dateKey) => {
    if (sortConfig.columnDateKey === dateKey) {
      setSortConfig({ columnDateKey: null, direction: null });
    }
    if (dateFilter.targetDateKey === dateKey) {
      setDateFilter({
        targetDateKey: null,
        type: "all",
        consecutiveDays: 2,
        skipWeekends: true,
        lateThreshold: "11:00",
      });
    }
  };

  const handleResetAll = () => {
    setSearchQuery("");
    setSelectedDateKey(null);
    setDateFilter({
      targetDateKey: null,
      type: "all",
      consecutiveDays: 2,
      skipWeekends: true,
      lateThreshold: "11:00",
    });
    setSortConfig({ columnDateKey: null, direction: null });
    setActivePopoverDateKey(null);
  };

  const handleClearFilter = () => {
    setDateFilter({
      targetDateKey: null,
      type: "all",
      consecutiveDays: 2,
      skipWeekends: true,
      lateThreshold: "11:00",
    });
  };

  const handleClearSort = () => {
    setSortConfig({ columnDateKey: null, direction: null });
  };

  // High performance memoized search, filter, and sorting pipeline
  const processedRows = useMemo(() => {
    if (!matrixData || !Array.isArray(matrixData)) return [];

    let rows = matrixData;

    // 1. Search Query Filter
    if (searchQuery && searchQuery.trim()) {
      rows = rows.filter((row) => matchesSearch(row, searchQuery));
    }

    // 2. Date Column Status Filter
    if (dateFilter?.targetDateKey && dateFilter.type && dateFilter.type !== "all") {
      rows = rows.filter((row) =>
        matchesDateFilter(row, dateFilter.targetDateKey, dateFilter)
      );
    }

    // 3. Date Column Time Sorter (Ascending, Descending, or default A-Z)
    rows = sortMatrixRows(rows, sortConfig);

    return rows;
  }, [matrixData, searchQuery, dateFilter, sortConfig]);

  // Which column should receive active vertical highlight glow?
  const highlightedColumnKey =
    dateFilter?.targetDateKey || sortConfig?.columnDateKey || selectedDateKey;

  // Active filter state calculations
  const isSearchActive = Boolean(searchQuery && searchQuery.trim());
  const isFilterActive = Boolean(
    dateFilter?.type && dateFilter.type !== "all" && dateFilter.targetDateKey
  );
  const isSortActive = Boolean(sortConfig?.columnDateKey && sortConfig?.direction);
  const hasAnyActiveFilters = isSearchActive || isFilterActive || isSortActive;

  const activeDateObj = dateFilter?.targetDateKey
    ? new Date(`${dateFilter.targetDateKey}T00:00:00`)
    : selectedDateKey
    ? new Date(`${selectedDateKey}T00:00:00`)
    : null;

  const activeDateFormatted = activeDateObj && !isNaN(activeDateObj.getTime())
    ? activeDateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : "";

  return (
    <div className="space-y-4" onClick={handleClosePopover}>
      {/* Unified Top Controls Card: Left (Timeframe & Date) + Right (Search, Filter Date, Stats & Reset) */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          {/* Left: Timeframe & DatePicker */}
          <div className="flex flex-wrap items-end gap-3 shrink-0">
            <div className="w-36">
              <label className="block text-xs font-medium text-slate-500 mb-1">Timeframe</label>
              <Dropdown
                value={viewMode}
                onChange={(v) => setViewMode(v)}
                placeholder="Select timeframe"
                options={[
                  { value: "month", label: "Monthly" },
                  { value: "week", label: "Weekly" },
                  { value: "custom", label: "Custom Range" },
                ]}
              />
            </div>

            {viewMode === "month" && (
              <div className="w-44">
                <label className="block text-xs font-medium text-slate-500 mb-1">Select Month</label>
                <DatePicker 
                  type="month"
                  value={monthVal}
                  onChange={(e) => setMonthVal(e.target.value)}
                  accentColor="indigo"
                />
              </div>
            )}

            {viewMode === "week" && (
              <div className="w-44">
                <label className="block text-xs font-medium text-slate-500 mb-1">Select Week</label>
                <DatePicker 
                  type="week"
                  value={weekVal}
                  onChange={(e) => setWeekVal(e.target.value)}
                  accentColor="indigo"
                />
              </div>
            )}

            {viewMode === "custom" && (
              <div className="w-60">
                <label className="block text-xs font-medium text-slate-500 mb-1">Date Range</label>
                <DatePicker
                  type="range"
                  startDate={customStart}
                  endDate={customEnd}
                  onRangeChange={(range) => {
                    if (range.startDate) setCustomStart(range.startDate);
                    if (range.endDate) setCustomEnd(range.endDate);
                  }}
                  accentColor="indigo"
                />
              </div>
            )}
          </div>

          {/* Right: Search, Filter Date Column, Stats & Reset All */}
          {!isLoading && !isError && dateRange && (
            <div className="flex flex-wrap items-end justify-start lg:justify-end gap-3 flex-1">
              {/* Search Bar */}
              <div className="w-56 sm:w-64">
                <label className="block text-xs font-medium text-slate-500 mb-1">Search Employee</label>
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by name..."
                  size="sm"
                  width="w-full"
                  clearable={true}
                />
              </div>

              {/* Date Column Selector Dropdown */}
              <div className="w-40 sm:w-44">
                <label className="block text-xs font-medium text-slate-500 mb-1">Select Date Column</label>
                <Dropdown
                  value={selectedDateKey || ""}
                  onChange={(val) => {
                    setSelectedDateKey(val || null);
                    if (val) {
                      setActivePopoverDateKey(val);
                    }
                  }}
                  placeholder="Select column"
                  options={[
                    { value: "", label: "No column focused" },
                    ...dateOptions,
                  ]}
                  searchable={dateOptions.length > 7}
                  searchPlaceholder="Find date..."
                />
              </div>

              {/* Counter & Reset All */}
              <div className="flex items-center gap-2.5 pb-1 text-xs">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium whitespace-nowrap">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Showing <strong className="text-slate-900 font-semibold">{processedRows.length}</strong> of{" "}
                    {matrixData?.length || 0}
                  </span>
                </div>

                {hasAnyActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetAll}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200/80 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                    title="Reset search, column filters, and sorting"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset all</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Active Filter Chips Bar (Inside the same container) */}
        {hasAnyActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-100 text-xs">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Active:
            </span>

            {/* Search chip */}
            {isSearchActive && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200">
                <span>Search: "{searchQuery}"</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-0.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Date Filter chip */}
            {isFilterActive && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium border border-indigo-200">
                {dateFilter.type === "late" && (
                  <>
                    <Clock className="w-3 h-3 text-amber-500" />
                    <span>Late Check-in ({activeDateFormatted})</span>
                  </>
                )}
                {dateFilter.type === "no_checkin" && (
                  <>
                    <AlertCircle className="w-3 h-3 text-rose-500" />
                    <span>No Check-in ({activeDateFormatted})</span>
                  </>
                )}
                {dateFilter.type === "wfo" && (
                  <>
                    <Building2 className="w-3 h-3 text-indigo-500" />
                    <span>WFO ({activeDateFormatted})</span>
                  </>
                )}
                {dateFilter.type === "wfh" && (
                  <>
                    <Home className="w-3 h-3 text-sky-500" />
                    <span>WFH ({activeDateFormatted})</span>
                  </>
                )}
                {dateFilter.type === "consecutive" && (
                  <>
                    <AlertCircle className="w-3 h-3 text-rose-500" />
                    <span>
                      {dateFilter.consecutiveDays}d Consecutive Absent (up to {activeDateFormatted})
                    </span>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleClearFilter}
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
                {sortConfig.direction === "asc" ? (
                  <ArrowUp className="w-3 h-3 text-sky-600" />
                ) : (
                  <ArrowDown className="w-3 h-3 text-sky-600" />
                )}
                <span>
                  Sorted: {sortConfig.direction === "asc" ? "Early to Late" : "Late to Early"}{" "}
                  ({sortConfig.columnDateKey})
                </span>
                <button
                  type="button"
                  onClick={handleClearSort}
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

      {/* Matrix Grid Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Loading attendance matrix...</span>
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-rose-500 font-medium">
            Failed to load matrix data. Please try again.
          </div>
        ) : !dateRange ? (
          <div className="p-12 text-center text-slate-500 font-medium">
            Please select a valid date range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {/* Sticky Employee Column */}
                  <th className="sticky left-0 bg-slate-50 z-20 px-4 py-3 font-semibold text-slate-900 border-r border-slate-200 shadow-[1px_0_0_0_#e2e8f0]">
                    Employee
                  </th>

                  {/* Interactive Date Column Headers */}
                  {displayDays.map((d) => {
                    const dateKey = formatDateKey(d);
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    const isActiveColumn = highlightedColumnKey === dateKey;

                    return (
                      <MatrixColumnHeader
                        key={dateKey}
                        dateObj={d}
                        dateKey={dateKey}
                        isWeekend={isWeekend}
                        isActiveColumn={isActiveColumn}
                        currentSort={sortConfig}
                        currentFilter={dateFilter}
                        isPopoverOpen={activePopoverDateKey === dateKey}
                        onTogglePopover={handleTogglePopover}
                        onClosePopover={handleClosePopover}
                        onApplySort={handleApplySort}
                        onApplyFilter={handleApplyFilter}
                        onResetColumn={handleResetColumn}
                      />
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {processedRows.map((row) => (
                  <tr key={row.employee_id} className="hover:bg-slate-50 transition-colors group">
                    {/* Sticky Employee Name & Avatar */}
                    <td className="sticky left-0 bg-white group-hover:bg-slate-50 z-10 px-4 py-2 border-r border-slate-200 shadow-[1px_0_0_0_#e2e8f0]">
                      <div className="flex items-center gap-2">
                        <UserAvatar src={row.avatar_url} name={row.name} size="w-6 h-6 text-[10px]" />
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800 text-xs sm:text-sm">
                            {formatDisplayName(row.name)}
                          </span>
                          {row.designation && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              {row.designation}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Attendance Day Cells with Full Column Highlighting */}
                    {displayDays.map((d) => {
                      const dateKey = formatDateKey(d);
                      const cell = row.checkinsByDate[dateKey];
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      const isHighlightedColumn = highlightedColumnKey === dateKey;

                      return (
                        <td
                          key={dateKey}
                          className={`px-1.5 py-1 text-center border-r border-slate-200 transition-colors ${
                            isHighlightedColumn
                              ? "bg-indigo-100/60 group-hover:bg-indigo-100/80 border-x-2 border-x-indigo-400 font-semibold"
                              : isWeekend
                              ? "bg-slate-50/70"
                              : ""
                          }`}
                        >
                          {cell ? (
                            <div
                              title={`${cell.mode} at ${cell.time}`}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shadow-2xs ${
                                isHighlightedColumn ? "ring-1 ring-indigo-400/80 shadow-xs" : ""
                              } ${
                                cell.mode === "WFH"
                                  ? "bg-sky-50 text-sky-700 border border-sky-200/60"
                                  : "bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                              }`}
                            >
                              {cell.mode === "WFH" ? (
                                <Home className="w-3 h-3 text-sky-600" />
                              ) : (
                                <Building2 className="w-3 h-3 text-indigo-600" />
                              )}
                              <span>{cell.time}</span>
                            </div>
                          ) : (
                            <span
                              className={
                                isHighlightedColumn
                                  ? "text-indigo-400 font-bold text-xs select-none"
                                  : "text-slate-300 text-xs select-none"
                              }
                            >
                              -
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Empty State when no employees match filters */}
                {processedRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={displayDays.length + 1}
                      className="p-12 text-center text-slate-500"
                    >
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <div className="p-3 bg-slate-100 rounded-full text-slate-400">
                          <SearchX className="w-6 h-6" />
                        </div>
                        <h4 className="font-semibold text-slate-800 text-sm">
                          No employees match criteria
                        </h4>
                        <p className="text-xs text-slate-400">
                          Try adjusting your search query or relaxing active column filters.
                        </p>
                        <button
                          type="button"
                          onClick={handleResetAll}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset all filters</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryMatrix;
