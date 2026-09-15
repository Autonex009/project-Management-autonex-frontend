import React, { useState, useRef, useEffect } from "react";
import { Filter, ChevronDown, RotateCcw, X } from "lucide-react";
import { MultiSelect } from "../ui/MultiSelect";
import Button from "../ui/Button";

const CheckinFilterDropdown = ({
  projectIds,
  setProjectIds,
  projectsList,
  statusFilters,
  setStatusFilters,
  timeFilters,
  customTimeFrom,
  setCustomTimeFrom,
  customTimeTo,
  setCustomTimeTo,
  setTimeFilters,
  workModeFilters,
  setWorkModeFilters,
  officeFloorFilters,
  setOfficeFloorFilters,
  sentimentFilters,
  setSentimentFilters,
  onClearAll,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  const activeCount =
    projectIds.length +
    statusFilters.length +
    timeFilters.length +
    workModeFilters.length +
    officeFloorFilters.length +
    sentimentFilters.length +
    (timeFilters.includes("custom") && (customTimeFrom || customTimeTo) ? 1 : 0);

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all shadow-sm cursor-pointer ${activeCount > 0
          ? "bg-indigo-50/80 border-indigo-200 text-indigo-700 shadow-indigo-100"
          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
          }`}
      >
        <Filter className={`w-4 h-4 ${activeCount > 0 ? "text-indigo-600" : "text-slate-400"}`} />
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold bg-indigo-600 text-white rounded-full">
            {activeCount}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""
            }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-[340px] sm:w-[420px] bg-white border border-slate-200 rounded-2xl shadow-xl z-[999] p-4 space-y-3.5 origin-top-left animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-800 text-sm">Filter Roster</h3>
              {activeCount > 0 && (
                <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  {activeCount} active
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Clear all
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Project Filter */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-slate-600">Projects</label>
              <MultiSelect
                value={projectIds}
                onChange={setProjectIds}
                placeholder="All Projects"
                options={[
                  { value: "unassigned", label: "Idle / Unassigned" },
                  ...projectsList.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Status</label>
              <MultiSelect
                value={statusFilters}
                onChange={setStatusFilters}
                placeholder="All Statuses"
                options={[
                  { value: "checked_in", label: "Checked In" },
                  { value: "pending", label: "Not Yet" },
                ]}
              />
            </div>

            {/* Work Mode Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Work Mode</label>
              <MultiSelect
                value={workModeFilters}
                onChange={setWorkModeFilters}
                placeholder="All Modes"
                options={[
                  { value: "WFO", label: "WFO" },
                  { value: "WFH", label: "WFH" },
                ]}
              />
            </div>

            {/* Sentiment Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Company Sentiment</label>
              <MultiSelect
                value={sentimentFilters}
                onChange={setSentimentFilters}
                placeholder="All Sentiments"
                options={[
                  { value: "great", label: "Great 😁" },
                  { value: "okay", label: "Okay 🙂" },
                  { value: "low", label: "Low 😟" },
                  { value: "stressed", label: "Stressed 😫" },
                ]}
              />
            </div>

            {/* Check-in Time Filter */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-slate-600">Check-in Time</label>
              <MultiSelect
                value={timeFilters}
                onChange={setTimeFilters}
                placeholder="All Times"
                options={[
                  { value: "before_9", label: "Before 9:00 AM" },
                  { value: "9_10", label: "9:00 – 10:00 AM" },
                  { value: "10_11", label: "10:00 – 11:00 AM" },
                  { value: "11_12", label: "11:00 – 12:00 PM" },
                  { value: "custom", label: "Custom range" },
                ]}
              />

              {/* Custom time range inputs – only shown when "Custom range" is selected */}
              {timeFilters.includes("custom") && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="time"
                    value={customTimeFrom || ""}
                    onChange={(e) => setCustomTimeFrom(e.target.value)}
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <span className="text-slate-400 text-xs font-medium">to</span>
                  <input
                    type="time"
                    value={customTimeTo || ""}
                    onChange={(e) => setCustomTimeTo(e.target.value)}
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* Office Floor Filter */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-slate-600">Office Floor</label>
              <MultiSelect
                value={officeFloorFilters}
                onChange={setOfficeFloorFilters}
                placeholder="All Floors"
                options={[
                  { value: "7", label: "Floor 7" },
                  { value: "9", label: "Floor 9" },
                  { value: "17", label: "Floor 17" },
                ]}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Filters apply automatically</span>
            <Button
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-xs py-1 px-3"
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckinFilterDropdown;

