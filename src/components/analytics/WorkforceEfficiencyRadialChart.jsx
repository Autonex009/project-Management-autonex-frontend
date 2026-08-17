import React from "react";
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend,
  Tooltip,
} from "recharts";
import { Zap, ShieldCheck, UserCheck } from "lucide-react";

const WorkforceEfficiencyRadialChart = ({
  metrics = {},
  data = [
    { name: "Platform Utilization", value: 92, fill: "#4f46e5" },
    { name: "Review Throughput", value: 84, fill: "#0284c7" },
    { name: "Active Engagement", value: 78, fill: "#10b981" },
  ],
  height = 165,
}) => {
  // Dynamically compute ratios if metrics are passed
  const chartData = metrics?.total_hours
    ? [
        {
          name: "Utilization",
          value: Math.min(100, Math.round(((metrics.total_hours || 0) / (metrics.active_annotators * 8 || 1)) * 100)),
          fill: "#4f46e5",
        },
        {
          name: "Throughput",
          value: Math.min(100, Math.round(((metrics.review_hours || 0) / (metrics.total_hours || 1)) * 100)),
          fill: "#0284c7",
        },
        {
          name: "Engagement",
          value: Math.min(100, Math.round((((metrics.active_annotators || 0) + (metrics.active_reviewers || 0)) / 10) * 100)),
          fill: "#10b981",
        },
      ]
    : data;

  return (
    <div className="flex flex-col justify-between" style={{ height }}>
      <div style={{ width: "100%", height: height - 32 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="20%"
            outerRadius="82%"
            barSize={7}
            data={chartData}
            startAngle={180}
            endAngle={0}
          >
            <RadialBar
              minAngle={15}
              background={{ fill: "#f1f5f9" }}
              clockWise
              dataKey="value"
              cornerRadius={8}
            />
            <Tooltip
              isAnimationActive={false}
              wrapperStyle={{ pointerEvents: "none", outline: "none" }}
              formatter={(value) => [`${value}% Rate`, "Value"]}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                fontSize: 11,
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(4px)",
                pointerEvents: "none",
              }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend Custom Pills */}
      <div className="grid grid-cols-3 gap-1 text-center text-xs mt-1">
        {chartData.map((item, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-slate-100 bg-slate-50/80 p-1"
          >
            <div
              className="text-[10px] font-bold font-mono leading-none"
              style={{ color: item.fill }}
            >
              {item.value}%
            </div>
            <div className="text-[9px] text-slate-500 font-medium truncate mt-0.5">
              {item.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkforceEfficiencyRadialChart;
