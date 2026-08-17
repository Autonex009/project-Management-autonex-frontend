import React, { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Zap, Clock } from "lucide-react";

const COLOR_PALETTE = [
  { main: "#4f46e5", dot: "bg-indigo-600" },
  { main: "#0284c7", dot: "bg-sky-500" },
  { main: "#0d9488", dot: "bg-teal-500" },
  { main: "#d97706", dot: "bg-amber-500" },
  { main: "#8b5cf6", dot: "bg-violet-500" },
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xl text-xs space-y-1 z-50 pointer-events-none">
        <div className="font-bold text-slate-900 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].color }} />
          {data.fullName}
        </div>
        <div className="flex items-center justify-between gap-4 font-mono text-[11px]">
          <span className="text-slate-500">Platform Hours:</span>
          <span className="font-black text-indigo-600">{data.hours.toLocaleString()}h</span>
        </div>
        <div className="flex items-center justify-between gap-4 font-mono text-[11px]">
          <span className="text-slate-500">Volume Share:</span>
          <span className="font-bold text-slate-700">{data.share}%</span>
        </div>
      </div>
    );
  }
  return null;
};

const ProjectVelocityBarChart = ({ data = [], onSelectProject, height = 240 }) => {
  const [activeIndex, setActiveIndex] = useState(null);

  const { topProjects, totalHours, topProjectShare } = useMemo(() => {
    const sorted = [...data].sort(
      (a, b) => (b.autonex_platform_hours || 0) - (a.autonex_platform_hours || 0)
    );
    const top = sorted.slice(0, 5);
    const total = sorted.reduce((sum, p) => sum + (p.autonex_platform_hours || 0), 0);

    const formatted = top.map((p, idx) => {
      const hrs = p.autonex_platform_hours || 0;
      const share = total > 0 ? Math.round((hrs / total) * 100) : 0;
      return {
        id: p.project_id,
        name: p.name,
        fullName: p.name,
        hours: Math.round(hrs * 10) / 10,
        value: hrs > 0 ? hrs : 0.01,
        share,
        color: COLOR_PALETTE[idx]?.main || "#64748b",
        colorTheme: COLOR_PALETTE[idx] || COLOR_PALETTE[0],
      };
    });

    const topShare = formatted[0]?.share || 0;

    return { topProjects: formatted, totalHours: total, topProjectShare: topShare };
  }, [data]);

  if (!topProjects || topProjects.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-slate-400 font-medium"
        style={{ height }}
      >
        No project execution data available
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-between gap-3 h-full">
      {/* Left Column: Donut Orbit Ring Visualizer with Center Dial */}
      <div className="w-[45%] h-full relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height={210}>
          <PieChart>
            <Tooltip
              content={<CustomTooltip />}
              isAnimationActive={false}
              wrapperStyle={{ zIndex: 100, pointerEvents: "none" }}
            />
            <Pie
              data={topProjects}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={76}
              paddingAngle={4}
              cornerRadius={6}
              onMouseEnter={(_, idx) => setActiveIndex(idx)}
              onMouseLeave={() => setActiveIndex(null)}
              onClick={(entry) => onSelectProject && onSelectProject(entry.id)}
              className="cursor-pointer"
            >
              {topProjects.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke={activeIndex === index ? "#ffffff" : "none"}
                  strokeWidth={activeIndex === index ? 3 : 0}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.45}
                  className="transition-all duration-200 cursor-pointer"
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Hero Dial Pod */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center z-0 px-2">
          {activeIndex !== null ? (
            <>
              <Clock className="w-4 h-4 text-indigo-600 mb-0.5" />
              <span className="text-[9px] uppercase font-black tracking-wider text-slate-400">
                Volume Share
              </span>
              <span className="text-sm font-black text-slate-900 font-mono leading-none mt-0.5">
                {topProjects[activeIndex]?.share}%
              </span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 text-indigo-600 mb-0.5" />
              <span className="text-[9px] uppercase font-black tracking-wider text-slate-400">
                Total Logged
              </span>
              <span className="text-xs font-black text-slate-900 font-mono leading-none mt-0.5">
                {Math.round(totalHours).toLocaleString()}h
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right Column: Sleek Interactive Velocity Breakdown Pods */}
      <div className="w-[55%] flex flex-col justify-center space-y-1.5">
        {topProjects.map((p, idx) => {
          const isSelected = activeIndex === idx;
          return (
            <div
              key={p.id || p.name}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseLeave={() => setActiveIndex(null)}
              onClick={() => onSelectProject && onSelectProject(p.id)}
              className={`flex items-center justify-between p-2 rounded-xl border transition-all duration-150 cursor-pointer ${
                isSelected
                  ? "bg-slate-900 text-white border-slate-900 shadow-md translate-x-0.5"
                  : "bg-slate-50/70 text-slate-800 border-slate-100 hover:bg-white hover:border-slate-200"
              }`}
            >
              {/* Left Pod: Color Dot + Name */}
              <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${p.colorTheme.dot}`}
                />
                <span
                  className={`text-xs font-bold truncate min-w-0 flex-1 ${
                    isSelected ? "text-white" : "text-slate-800"
                  }`}
                  title={p.fullName}
                >
                  {p.name}
                </span>
              </div>

              {/* Right Pod: Hours Only */}
              <div className="shrink-0 font-mono text-[11px] pl-2 text-right">
                <span
                  className={`font-black ${
                    isSelected ? "text-indigo-300" : "text-slate-900"
                  }`}
                >
                  {p.hours.toLocaleString()}h
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectVelocityBarChart;
