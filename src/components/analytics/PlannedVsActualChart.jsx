import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Target, CheckCircle2, AlertCircle } from "lucide-react";

const shortDate = (s) => {
  try {
    return format(parseISO(s), "MMM d");
  } catch {
    return s;
  }
};

const PlannedVsActualChart = ({ data = [], height = 250 }) => {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-slate-400 font-medium"
        style={{ height }}
      >
        No planned vs actual allocation data available
      </div>
    );
  }

  // Calculate totals for top summary strip
  const totals = useMemo(() => {
    const plannedSum = data.reduce((sum, item) => sum + (item.plannedHours || 0), 0);
    const actualSum = data.reduce((sum, item) => sum + (item.actualHours || 0), 0);
    const variance = actualSum - plannedSum;
    const ratio = plannedSum > 0 ? Math.round((actualSum / plannedSum) * 100) : 0;
    return { plannedSum, actualSum, variance, ratio };
  }, [data]);

  return (
    <div className="space-y-3">
      {/* Top Variance & Target Summary Strip */}
      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
        <div className="flex items-center gap-3 font-semibold">
          <span className="flex items-center gap-1 text-slate-600">
            <Target className="w-3.5 h-3.5 text-slate-400" />
            Target: <strong className="font-mono text-slate-900">{totals.plannedSum}h</strong>
          </span>
          <span className="flex items-center gap-1 text-slate-600">
            Actual: <strong className="font-mono text-indigo-600">{totals.actualSum}h</strong>
          </span>
        </div>

        <div className="flex items-center gap-1">
          {totals.ratio >= 85 && totals.ratio <= 115 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Optimal ({totals.ratio}%)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
              <AlertCircle className="w-3 h-3 text-amber-600" /> Variance ({totals.ratio}%)
            </span>
          )}
        </div>
      </div>

      {/* Composed Bar + Overlaid Variance Visualizer */}
      <div style={{ width: "100%", height: height - 40 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 12, right: 16, bottom: 4, left: -4 }}
          >
            <defs>
              <linearGradient id="actualBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <linearGradient id="plannedBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

            <XAxis
              dataKey="label"
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

            <Tooltip
              isAnimationActive={false}
              wrapperStyle={{ pointerEvents: "none", outline: "none" }}
              labelFormatter={shortDate}
              formatter={(value, name) => [`${value}h`, name]}
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

            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: 8 }}
              formatter={(value) => (
                <span className="text-xs font-bold text-slate-700">
                  {value}
                </span>
              )}
            />

            {/* Planned Allocation Bar (Soft Background Pillar) */}
            <Bar
              dataKey="plannedHours"
              name="Planned Target"
              fill="url(#plannedBarGradient)"
              radius={[6, 6, 0, 0]}
              maxBarSize={28}
            />

            {/* Actual Logged Hours Bar (Gradient Electric Column) */}
            <Bar
              dataKey="actualHours"
              name="Actual Execution"
              fill="url(#actualBarGradient)"
              radius={[6, 6, 0, 0]}
              maxBarSize={28}
            />

            {/* Variance Overlay Line */}
            <Line
              type="monotone"
              dataKey="actualHours"
              name="Execution Contour"
              stroke="#0f172a"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              tooltipType="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PlannedVsActualChart;
