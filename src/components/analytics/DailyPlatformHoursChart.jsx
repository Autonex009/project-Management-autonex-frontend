import React, { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Zap, Award, FolderKanban } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";

const shortDate = (s) => {
  try {
    return format(parseISO(s), "MMM d");
  } catch {
    return s;
  }
};

const formattedModalDate = (s) => {
  try {
    return format(parseISO(s), "EEEE, MMMM d, yyyy");
  } catch {
    return s;
  }
};

const DailyPlatformHoursChart = ({
  data = [],
  height = 240,
  projects = [],
  selectedProject = null,
  isGlobal = true,
}) => {
  const [selectedDayData, setSelectedDayData] = useState(null);

  const isClickable = isGlobal && !selectedProject;

  if (!data || data.length === 0) {
    return (
      <div
        className="w-full flex items-center justify-center text-slate-400 text-xs font-medium"
        style={{ height }}
      >
        No execution trend data logged yet
      </div>
    );
  }

  const hoursValues = data.map((d) => d.hours ?? d.platform_hours ?? 0);
  const totalHours = hoursValues.reduce((a, b) => a + b, 0);
  const avgHours = hoursValues.length > 0 ? totalHours / hoursValues.length : 0;
  const roundedAvg = Math.round(avgHours * 10) / 10;

  // Find peak execution day
  const peakItem = data.reduce(
    (max, d) =>
      (d.hours ?? d.platform_hours ?? 0) > (max.hours ?? max.platform_hours ?? 0)
        ? d
        : max,
    data[0] || {}
  );
  const peakVal = Math.round((peakItem.hours ?? peakItem.platform_hours ?? 0) * 10) / 10;

  const handleChartClick = (arg1, arg2) => {
    if (!isClickable) return;

    let raw = null;

    if (arg1 && arg1.activePayload && arg1.activePayload.length > 0) {
      raw = arg1.activePayload[0].payload || arg1.activePayload[0];
    } else if (arg1 && arg1.payload) {
      raw = arg1.payload;
    } else if (arg2 && arg2.payload) {
      raw = arg2.payload;
    } else if (arg1 && typeof arg1 === "object" && (arg1.date || arg1.hours !== undefined || arg1.platform_hours !== undefined)) {
      raw = arg1;
    }

    if (raw) {
      setSelectedDayData(raw);
    }
  };

  const getProjectBreakdownForDay = (dayItem) => {
    if (!dayItem) return [];

    const totalDayHours = dayItem.hours ?? dayItem.platform_hours ?? 0;

    // 1. If backend provided an explicit projects array for this day, use it
    if (dayItem.projects && Array.isArray(dayItem.projects) && dayItem.projects.length > 0) {
      return dayItem.projects.map((p) => {
        const pVal = Math.round((p.hours || 0) * 10) / 10;
        return {
          name: p.name || p.project_name || "Project",
          client: p.client || null,
          hours: pVal,
          pct: totalDayHours > 0 ? Math.min(100, Math.round((pVal / totalDayHours) * 100)) : 0,
        };
      });
    }

    // 2. If single project scope is selected
    if (selectedProject) {
      const pVal = Math.round(totalDayHours * 10) / 10;
      return [
        {
          name: selectedProject.name || "Project",
          client: selectedProject.client || null,
          hours: pVal,
          pct: 100,
        },
      ];
    }

    // 3. If global view, split day hours proportionally across registered projects
    if (projects && projects.length > 0) {
      const totalAllHours = projects.reduce(
        (sum, p) => sum + (p.autonex_platform_hours || p.month_platform_hours || 0),
        0
      );

      const list = projects
        .map((p) => {
          const pTotal = p.autonex_platform_hours || p.month_platform_hours || 0;
          const shareRatio = totalAllHours > 0 ? pTotal / totalAllHours : 1 / projects.length;
          const calcHours = Math.round(totalDayHours * shareRatio * 10) / 10;
          const pct = totalDayHours > 0 ? Math.min(100, Math.round((calcHours / totalDayHours) * 100)) : 0;
          return {
            name: p.name || "Project",
            client: p.client || null,
            hours: calcHours,
            pct,
          };
        })
        .filter((p) => p.hours > 0)
        .sort((a, b) => b.hours - a.hours);

      if (list.length > 0) return list;
    }

    // 4. Fallback if no specific project details available
    return [
      {
        name: "Platform Execution",
        client: null,
        hours: Math.round(totalDayHours * 10) / 10,
        pct: 100,
      },
    ];
  };

  const currentBreakdown = selectedDayData ? getProjectBreakdownForDay(selectedDayData) : [];

  return (
    <div className="w-full flex-1 flex flex-col justify-between min-h-[220px]">
      {/* Quick Stats Strip: Avg Baseline + Peak Execution Day */}
      <div className="flex items-center justify-between text-xs pb-1 mb-2 border-b border-slate-100/80">
        <div className="flex items-center gap-1.5 font-semibold text-slate-600">
          <Zap className="w-3.5 h-3.5 text-indigo-600" />
          <span>Avg Baseline:</span>
          <span className="font-mono text-slate-900 font-bold">{roundedAvg}h / day</span>
        </div>

        {peakVal > 0 && (
          <div className="flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full text-[11px] shadow-2xs">
            <Award className="w-3.5 h-3.5 text-emerald-600" />
            <span>Peak: {shortDate(peakItem.date)} ({peakVal}h)</span>
          </div>
        )}
      </div>

      <div className="w-full flex-1 min-h-[190px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 12, bottom: 4, left: -4 }}
            onClick={(state, event) => handleChartClick(state, event)}
          >
            <defs>
              <linearGradient id="executionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#06b6d4" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
              minTickGap={20}
            />

            <YAxis
              tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              width={44}
              tickFormatter={(v) => `${v}h`}
            />

            {/* Target Optimal Execution Band */}
            {avgHours > 0 && (
              <ReferenceArea
                y1={avgHours * 0.8}
                y2={avgHours * 1.2}
                fill="#818cf8"
                fillOpacity={0.06}
              />
            )}

            {/* Average Reference Line */}
            {avgHours > 0 && (
              <ReferenceLine
                y={avgHours}
                stroke="#6366f1"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
            )}

            <Tooltip
              isAnimationActive={false}
              wrapperStyle={{ pointerEvents: "none", outline: "none" }}
              labelFormatter={shortDate}
              formatter={(v) => [`${v}h`, "Logged Execution"]}
              contentStyle={{
                borderRadius: 14,
                border: "1px solid #e2e8f0",
                boxShadow: "0 10px 30px rgba(15,23,42,0.1)",
                fontSize: 12,
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(6px)",
                pointerEvents: "none",
              }}
            />

            {/* Single Smooth Volume Area with Line Stroke */}
            <Area
              type="monotone"
              dataKey={(d) => d.hours ?? d.platform_hours ?? 0}
              name="Logged Execution"
              fill="url(#executionGradient)"
              stroke="#4f46e5"
              strokeWidth={3}
              dot={
                isClickable
                  ? {
                      r: 4,
                      fill: "#4f46e5",
                      stroke: "#ffffff",
                      strokeWidth: 1.5,
                      className: "cursor-pointer",
                      onClick: (e, payload) => handleChartClick(e, payload),
                    }
                  : {
                      r: 3.5,
                      fill: "#4f46e5",
                      stroke: "#ffffff",
                      strokeWidth: 1.5,
                    }
              }
              activeDot={
                isClickable
                  ? {
                      r: 7,
                      fill: "#4f46e5",
                      stroke: "#ffffff",
                      strokeWidth: 2,
                      className: "cursor-pointer",
                      onClick: (e, payload) => handleChartClick(e, payload),
                    }
                  : {
                      r: 6,
                      fill: "#4f46e5",
                      stroke: "#ffffff",
                      strokeWidth: 2,
                    }
              }
              onClick={isClickable ? (entry, idx, e) => handleChartClick(entry, e) : undefined}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Project-wise Daily Breakdown Modal */}
      <Modal isOpen={!!selectedDayData} onClose={() => setSelectedDayData(null)} size="md">
        <Modal.Header onClose={() => setSelectedDayData(null)}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-snug">
                Project-Wise Execution Breakdown
              </h3>
              <p className="text-xs font-semibold text-slate-500 font-mono">
                {selectedDayData ? formattedModalDate(selectedDayData.date) : ""}
              </p>
            </div>
          </div>
        </Modal.Header>

        <Modal.Body className="space-y-3">
          {/* Summary Metric Header */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100/90 font-mono text-xs">
            <span className="text-slate-500 font-medium">Total Logged Execution:</span>
            <span className="font-black text-indigo-600 text-sm">
              {selectedDayData ? (selectedDayData.hours ?? selectedDayData.platform_hours ?? 0) : 0}h
            </span>
          </div>

          {/* Breakdown List */}
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {currentBreakdown.map((item, idx) => (
              <div
                key={item.name + idx}
                className="p-2.5 rounded-xl border border-slate-100 bg-white shadow-2xs hover:bg-slate-50/60 transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-700 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-slate-800 truncate" title={item.name}>
                      {item.name}
                    </span>
                    {item.client && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-500 shrink-0">
                        {item.client}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-black text-indigo-600 text-xs">
                      {item.hours}h
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex items-center">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="outline" size="sm" onClick={() => setSelectedDayData(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DailyPlatformHoursChart;
