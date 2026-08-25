import React from "react";
import { ResponsiveContainer, Tooltip } from "recharts";

const TOOLTIP_STYLE = {
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  boxShadow: "0 10px 30px rgba(15,23,42,0.1)",
  fontSize: 12,
  backgroundColor: "rgba(255, 255, 255, 0.95)",
  backdropFilter: "blur(6px)",
  pointerEvents: "none",
};

export const ChartTooltip = (props) => (
  <Tooltip
    isAnimationActive={false}
    wrapperStyle={{ pointerEvents: "none", outline: "none" }}
    contentStyle={TOOLTIP_STYLE}
    {...props}
  />
);

export const ChartDefs = () => (
  <defs>
    <linearGradient id="actualBarGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#2563eb" />
      <stop offset="100%" stopColor="#0284c7" />
    </linearGradient>
    <linearGradient id="plannedBarGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#e2e8f0" />
      <stop offset="100%" stopColor="#cbd5e1" />
    </linearGradient>
    <linearGradient id="executionGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
      <stop offset="50%" stopColor="#06b6d4" stopOpacity={0.15} />
      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
    </linearGradient>
    <linearGradient id="colorArea1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
    </linearGradient>
    <linearGradient id="colorArea2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
    </linearGradient>
    <linearGradient id="colorArea3" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
    </linearGradient>
    <linearGradient id="colorAnnotation" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
    </linearGradient>
    <linearGradient id="colorReview" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#e11d48" stopOpacity={0.4} />
      <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
    </linearGradient>
  </defs>
);

export const ChartWrapper = ({ data, emptyMessage, height = 250, children }) => {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-slate-400 font-medium"
        style={{ height }}
      >
        {emptyMessage || "No data available"}
      </div>
    );
  }

  return children;
};
