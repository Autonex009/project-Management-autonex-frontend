import React, { useState, useMemo } from "react";
import UserAvatar from "../ui/UserAvatar";
import { formatDisplayName } from "../../utils/displayName";

// Helper to style intensity cells
const getHeatmapColor = (hours) => {
  if (!hours || hours === 0) return "bg-slate-100/60 border-slate-200/50 text-transparent";
  if (hours < 3) return "bg-indigo-100/80 border-indigo-200 text-indigo-800 font-bold";
  if (hours < 6) return "bg-indigo-400 border-indigo-500 text-white font-bold";
  if (hours < 8) return "bg-indigo-600 border-indigo-700 text-white font-bold shadow-2xs";
  return "bg-purple-600 border-purple-700 text-white font-black shadow-xs";
};

const shortDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const AnnotatorComparisonChart = ({
  annotators = [],
  dailyData = [],
  externalSearchTerm = "",
}) => {
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const searchTerm = externalSearchTerm || localSearchTerm;

  // Sort annotators by total hours descending
  const sortedAnnotators = useMemo(() => {
    return [...annotators].sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0));
  }, [annotators]);

  // Filtered annotators by search term
  const filteredAnnotators = useMemo(() => {
    if (!searchTerm) return sortedAnnotators;
    const term = searchTerm.toLowerCase();
    return sortedAnnotators.filter(
      (a) =>
        (a.employee_name || "").toLowerCase().includes(term) ||
        (a.user_email || "").toLowerCase().includes(term)
    );
  }, [sortedAnnotators, searchTerm]);

  // Extract distinct sorted dates from dailyData or annotator daily logs
  const datesList = useMemo(() => {
    if (dailyData && dailyData.length > 0) {
      return dailyData.map((d) => d.date);
    }
    const datesSet = new Set();
    annotators.forEach((a) => {
      (a.daily || []).forEach((p) => datesSet.add(p.date));
    });
    return Array.from(datesSet).sort();
  }, [dailyData, annotators]);

  // Calculate total hours and average per member
  const totalRosterHours = useMemo(() => {
    return Math.round(annotators.reduce((sum, a) => sum + (a.total_hours || 0), 0) * 10) / 10;
  }, [annotators]);

  const avgHoursPerMember = useMemo(() => {
    if (!annotators || annotators.length === 0) return 0;
    return Math.round((totalRosterHours / annotators.length) * 10) / 10;
  }, [annotators, totalRosterHours]);

  if (!annotators || annotators.length === 0) {
    return (
      <div className="flex justify-center items-center h-48 text-xs font-medium text-slate-400">
        No team member activity logged in this range.
      </div>
    );
  }

  // Calculate inner grid min-width: 180px left user pod + 52px per date column
  const minGridWidth = 180 + datesList.length * 52;

  return (
    <div className="h-full flex flex-col justify-start gap-1.5">
      {/* Top Header Strip: Member Count + Total + Avg + Legend */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium shrink-0 gap-2 py-0.5 whitespace-nowrap">
        <div className="flex items-center gap-1.5 flex-nowrap font-mono whitespace-nowrap overflow-hidden">
          <span className="text-slate-700 font-bold">
            Showing {filteredAnnotators.length} of {annotators.length} members
          </span>
          <span className="text-slate-300">·</span>
          <span>
            Avg: <strong className="text-slate-900 font-bold">{avgHoursPerMember}h/member</strong>
          </span>
        </div>

        <div className="flex items-center gap-1 font-mono shrink-0 text-[11px] whitespace-nowrap">
          <span className="text-slate-400">0h</span>
          <span className="w-2.5 h-2.5 rounded bg-slate-100 border border-slate-200/50" />
          <span className="w-2.5 h-2.5 rounded bg-indigo-100" />
          <span className="w-2.5 h-2.5 rounded bg-indigo-400" />
          <span className="w-2.5 h-2.5 rounded bg-indigo-600" />
          <span className="w-2.5 h-2.5 rounded bg-purple-600" />
          <span className="text-slate-700 font-bold">8h+</span>
        </div>
      </div>

      {/* HEATMAP MATRIX VISUALIZER */}
      <div className="overflow-auto relative rounded-2xl border border-slate-200/80 bg-white shadow-2xs flex-1 min-h-0 max-h-[890px]">
        <div style={{ minWidth: `${minGridWidth}px` }}>
          {/* Header Row: Sticky Top (z-20) & Sticky Left Corner (z-40) */}
          <div className="flex items-center bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-700 sticky top-0 z-20">
            {/* Top-Left Corner Cell (Sticky Top & Left - Highest z-index z-40) */}
            <div className="w-[180px] min-w-[180px] max-w-[180px] shrink-0 sticky left-0 z-40 bg-slate-50 border-r border-slate-200/80 px-3 py-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
              Annotator
            </div>
            {/* Date Columns */}
            <div className="flex-1 shrink-0 flex items-center">
              {datesList.map((d) => (
                <div
                  key={d}
                  title={d}
                  className="w-[52px] min-w-[52px] shrink-0 text-center font-mono text-[10px] text-slate-600 px-0.5 select-none font-semibold"
                >
                  {shortDate(d)}
                </div>
              ))}
            </div>
          </div>

          {/* Content Rows */}
          <div className="divide-y divide-slate-100">
            {filteredAnnotators.map((a) => {
              const dailyMap = Object.fromEntries(
                (a.daily || []).map((p) => [p.date, p.hours])
              );
              const displayName =
                formatDisplayName(a.employee_name) ||
                a.employee_name ||
                a.user_email.split("@")[0];

              return (
                <div
                  key={a.user_email}
                  className="flex items-center hover:bg-slate-50/80 transition-colors py-1 group"
                >
                  {/* Sticky Left Pod (z-30: Always above scrolling date cells z-0/z-10) */}
                  <div className="w-[180px] min-w-[180px] max-w-[180px] shrink-0 sticky left-0 z-30 bg-white group-hover:bg-slate-100/90 border-r border-slate-200/80 px-2.5 py-0.5 flex items-center gap-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] transition-colors">
                    <UserAvatar name={displayName} size="xs" />
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-xs font-bold text-slate-800 truncate"
                        title={displayName}
                      >
                        {displayName}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono">
                        {a.total_hours || 0}h total
                      </div>
                    </div>
                  </div>

                  {/* Heatmap Date Cells (z-0 / hover:z-10) */}
                  <div className="flex-1 shrink-0 flex items-center">
                    {datesList.map((d) => {
                      const hrs = dailyMap[d] ?? 0;
                      const rounded = Math.round(hrs * 10) / 10;
                      const displayVal = hrs > 0 ? `${rounded}h` : "";

                      return (
                        <div
                          key={d}
                          className="w-[52px] min-w-[52px] shrink-0 flex items-center justify-center p-0.5"
                        >
                          <div
                            title={`${displayName} on ${shortDate(d)}: ${rounded}h logged`}
                            className={`w-[46px] h-6 rounded-md border text-[9px] font-mono flex items-center justify-center transition-all duration-150 hover:scale-110 relative z-0 hover:z-10 cursor-pointer ${getHeatmapColor(
                              hrs
                            )}`}
                          >
                            {displayVal}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnotatorComparisonChart;
