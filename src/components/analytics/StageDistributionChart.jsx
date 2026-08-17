import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

const STAGE_COLORS = {
  Annotation: "#f59e0b", // Amber 500
  Review: "#e11d48",     // Rose 600
  QC: "#8b5cf6",         // Violet 500
  Other: "#64748b",      // Slate 500
};

const DEFAULT_COLORS = ["#f59e0b", "#e11d48", "#8b5cf6", "#3b82f6", "#10b981", "#64748b"];

const StageDistributionChart = ({ data = [], height = 165 }) => {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-slate-400 font-medium"
        style={{ height }}
      >
        No stage breakdown data available
      </div>
    );
  }

  const totalHours = data.reduce((sum, item) => sum + (item.hours || 0), 0);
  const roundedH = Math.round(totalHours);
  const formattedTotal =
    roundedH >= 10000
      ? `${(roundedH / 1000).toFixed(1)}k h`
      : `${roundedH.toLocaleString()}h`;

  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative" style={{ width: "100%", height: height - 38 }}>
        {/* Center Total Hours Readout inside Donut */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[13px] font-black font-mono text-slate-900 leading-none">
            {formattedTotal}
          </span>
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
            Total
          </span>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={58}
              paddingAngle={3}
              dataKey="hours"
              nameKey="stage"
              stroke="#ffffff"
              strokeWidth={2}
            >
              {data.map((entry, index) => {
                const color =
                  STAGE_COLORS[entry.stage] ||
                  DEFAULT_COLORS[index % DEFAULT_COLORS.length];
                return <Cell key={`cell-${index}`} fill={color} />;
              })}
            </Pie>
            <Tooltip
              isAnimationActive={false}
              wrapperStyle={{ pointerEvents: "none", outline: "none" }}
              formatter={(value, name) => [
                `${value}h (${
                  totalHours > 0 ? Math.round((value / totalHours) * 100) : 0
                }%)`,
                name,
              ]}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                fontSize: 12,
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(4px)",
                pointerEvents: "none",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Custom Styled Legend Chips below */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1.5">
        {data.map((item, idx) => {
          const color =
            STAGE_COLORS[item.stage] ||
            DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
          const pct = totalHours > 0 ? Math.round((item.hours / totalHours) * 100) : 0;
          return (
            <div
              key={item.stage}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200/80 text-[10px] font-semibold text-slate-700"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span>{item.stage}:</span>
              <span className="font-mono font-bold text-slate-900">{item.hours}h</span>
              <span className="text-[9px] text-slate-400 font-normal">({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StageDistributionChart;
