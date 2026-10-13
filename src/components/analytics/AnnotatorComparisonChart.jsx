import React, { useState, useMemo } from "react";
import { Tag, CheckSquare } from "lucide-react";
import UserAvatar from "../ui/UserAvatar";
import { formatDisplayName } from "../../utils/displayName";

// Helper to style intensity cells

const formatExactTime = (totalSeconds) => {
  if (!totalSeconds) return "0h 0m";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    if (s > 0) return `${h}h ${m}m ${s}s`;
    return `${h}h ${m}m`;
  }
  if (m > 0) {
    if (s > 0) return `${m}m ${s}s`;
    return `${m}m`;
  }
  return `${s}s`;
};

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
  const [hoveredCell, setHoveredCell] = useState(null);
  const searchTerm = externalSearchTerm || localSearchTerm;

  // Sort annotators by total hours descending and assign rank
  const sortedAnnotators = useMemo(() => {
    return [...annotators]
      .sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0))
      .map((a, idx) => ({ ...a, rank: idx + 1 }));
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
      <div className="flex justify-center items-center h-48 text-xs font-medium text-stone-400">
        No team member activity logged in this range.
      </div>
    );
  }

  // Calculate inner grid min-width: 205px left user pod + 52px per date column
  const minGridWidth = 205 + datesList.length * 52;

  return (
    <div className="h-full flex flex-col justify-start gap-1.5">
      {/* Top Header Strip: Member Count + Total + Avg + Legend */}
      <div className="flex items-center justify-between text-xs text-stone-500 font-medium shrink-0 gap-2 py-0.5 whitespace-nowrap">
        <div className="flex items-center gap-1.5 flex-nowrap whitespace-nowrap overflow-hidden">
          <span className="text-stone-700 font-bold">
            Showing {filteredAnnotators.length} of {annotators.length} members
          </span>
          <span className="text-stone-300">·</span>
          <span className="text-stone-600">
            Avg: <strong className="text-stone-900 font-bold">{avgHoursPerMember}h/member</strong>
          </span>
        </div>

        <div className="flex items-center gap-1 font-mono shrink-0 text-[11px] whitespace-nowrap">
          <span className="text-stone-400">0h</span>
          <span className="w-2.5 h-2.5 rounded bg-stone-100 border border-stone-200/50" />
          <span className="w-2.5 h-2.5 rounded bg-indigo-100" />
          <span className="w-2.5 h-2.5 rounded bg-indigo-400" />
          <span className="w-2.5 h-2.5 rounded bg-indigo-600" />
          <span className="w-2.5 h-2.5 rounded bg-purple-600" />
          <span className="text-stone-700 font-bold">8h+</span>
        </div>
      </div>

      {/* HEATMAP MATRIX VISUALIZER */}
      <div className="overflow-auto relative rounded-xl border border-stone-200 bg-white shadow-xs flex-1 min-h-0 max-h-[890px] isolate">
        <div style={{ minWidth: `${minGridWidth}px` }}>
          {/* Header Row: Sticky Top (z-30) & Sticky Left Corner (z-40) */}
          <div className="flex items-center bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-stone-700 sticky top-0 z-30">
            {/* Top-Left Corner Cell (Sticky Top & Left - Highest z-index z-40) */}
            <div className="w-[205px] min-w-[205px] max-w-[205px] shrink-0 sticky left-0 z-40 bg-stone-50 border-r border-stone-200 px-3 py-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] before:content-[''] before:absolute before:right-full before:top-0 before:bottom-0 before:w-16 before:bg-stone-50 flex items-center gap-2">
              <span className="w-5 text-center font-mono text-[10px] text-stone-400 font-bold">#</span>
              <span>Annotator</span>
            </div>
            {/* Date Columns */}
            <div className="flex-1 shrink-0 flex items-center">
              {datesList.map((d) => (
                <div
                  key={d}
                  title={d}
                  className="w-[52px] min-w-[52px] shrink-0 text-center font-mono text-[10px] text-stone-600 px-0.5 select-none font-semibold"
                >
                  {shortDate(d)}
                </div>
              ))}
            </div>
          </div>

          {/* Content Rows */}
          <div className="divide-y divide-stone-100">
            {filteredAnnotators.map((a, idx) => {
              const dailyMap = Object.fromEntries(
                (a.daily || []).map((p) => [p.date, p])
              );
              const displayName =
                formatDisplayName(a.employee_name) ||
                a.employee_name ||
                a.user_email?.split("@")[0] ||
                "Unknown";
              const rankNum = a.rank || idx + 1;

              return (
                <div
                  key={a.user_email}
                  className="flex items-center hover:bg-stone-50/80 transition-colors py-1 group"
                >
                  {/* Sticky Left Pod (z-20: Solid opaque background + left barrier to prevent date cell leak) */}
                  <div className="w-[205px] min-w-[205px] max-w-[205px] shrink-0 sticky left-0 z-20 bg-white group-hover:bg-stone-50 border-r border-stone-200 px-2.5 py-0.5 flex items-center gap-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] transition-colors before:content-[''] before:absolute before:right-full before:top-0 before:bottom-0 before:w-16 before:bg-white group-hover:before:bg-stone-50">
                    <span
                      className={`w-5 shrink-0 text-center font-mono text-[10px] font-bold select-none ${
                        rankNum === 1
                          ? "text-amber-600 font-black"
                          : rankNum === 2
                          ? "text-slate-600 font-black"
                          : rankNum === 3
                          ? "text-amber-700 font-black"
                          : "text-stone-400 group-hover:text-stone-600"
                      }`}
                    >
                      {rankNum}
                    </span>
                    <UserAvatar name={displayName} size="xs" />
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-xs font-bold text-stone-800 truncate"
                        title={displayName}
                      >
                        {displayName}
                      </div>
                      <div className="text-[9px] text-stone-400 font-mono">
                        {a.total_hours || 0}h total
                      </div>
                    </div>
                  </div>

                  {/* Heatmap Date Cells (z-0 / hover:z-10) */}
                  <div className="flex-1 shrink-0 flex items-center">
                    {datesList.map((d) => {
                      const entry = dailyMap[d];
                      const hrs = typeof entry === "number" ? entry : (entry?.hours ?? 0);
                      const rounded = Math.round(hrs * 10) / 10;
                      const displayVal = hrs > 0 ? `${rounded}h` : "";
                      const seconds = typeof entry === "object" ? (entry?.seconds ?? 0) : 0;
                      
                      const labelsCreated = typeof entry === "object" ? (entry?.labels_created ?? entry?.labels ?? 0) : 0;
                      const tasksSubmitted = typeof entry === "object" ? (entry?.tasks_submitted ?? entry?.tasks ?? 0) : 0;
                      const reviewActions = typeof entry === "object" ? (entry?.review_actions ?? 0) : 0;
                      const annotationHours = typeof entry === "object" ? (entry?.annotation_hours ?? 0) : 0;
                      const reviewHours = typeof entry === "object" ? (entry?.review_hours ?? 0) : 0;

                      return (
                        <div
                          key={d}
                          className="w-[52px] min-w-[52px] shrink-0 flex items-center justify-center p-0.5"
                        >
                          <div
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredCell({
                                displayName,
                                date: d,
                                hours: rounded,
                                seconds,
                                labels: labelsCreated,
                                tasks: tasksSubmitted,
                                reviewActions,
                                annotationHours,
                                reviewHours,
                                rect: {
                                  left: rect.left + rect.width / 2,
                                  top: rect.top,
                                  bottom: rect.bottom,
                                },
                              });
                            }}
                            onMouseLeave={() => setHoveredCell(null)}
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

      {/* FLOATING HOVER BREAKDOWN POPOVER */}
      {hoveredCell && (
        <div
          className="fixed z-50 pointer-events-none transition-all duration-150 ease-out"
          style={{
            left: `${Math.max(130, Math.min(window.innerWidth - 130, hoveredCell.rect.left))}px`,
            ...(hoveredCell.rect.top < 200
              ? { top: `${hoveredCell.rect.bottom + 8}px` }
              : { bottom: `${window.innerHeight - hoveredCell.rect.top + 8}px` }),
            transform: "translateX(-50%)",
          }}
        >
          <div className="w-auto min-w-[200px] rounded-xl border border-stone-200 bg-white shadow-xl p-3 text-stone-800 animate-in fade-in zoom-in-95 duration-100">
            {/* Header: Name, Date & Exact Time Badge */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold text-stone-900 truncate">
                  {hoveredCell.displayName}
                </div>
                <div className="text-[11px] text-stone-400 font-medium">
                  {shortDate(hoveredCell.date)}
                </div>
              </div>
              <div
                className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold shrink-0 ${
                  hoveredCell.seconds > 0 || hoveredCell.hours > 0
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                    : "bg-stone-100 text-stone-500"
                }`}
              >
                {hoveredCell.seconds > 0 
                  ? formatExactTime(hoveredCell.seconds) 
                  : (hoveredCell.hours > 0 ? `${hoveredCell.hours}h` : "0h 0m")}
              </div>
            </div>
            
            {(!hoveredCell.seconds && !hoveredCell.hours) && (
              <div className="mt-2 pt-2 border-t border-stone-100 text-center text-[11px] text-stone-400 font-medium">
                No activity logged on this day
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnotatorComparisonChart;

