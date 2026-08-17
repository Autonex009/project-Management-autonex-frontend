import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";

const shortDate = (s) => {
  if (!s) return "";
  try {
    return format(parseISO(s), "MMM d");
  } catch {
    return s;
  }
};

const WorkforceSplitAreaChart = ({
  data = [],
  totalAnnotationHours,
  totalReviewHours,
  height = 210,
}) => {
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    // Sum total platform hours across all daily items
    const totalPlatformH = data.reduce(
      (acc, d) => acc + (d.hours ?? d.platform_hours ?? 0),
      0
    );

    const annTotal = totalAnnotationHours ?? 9480;
    const revTotal = totalReviewHours ?? 3767;
    const denominator =
      totalPlatformH > 0 ? totalPlatformH : annTotal + revTotal || 1;

    const annRatio = annTotal / denominator;
    const revRatio = revTotal / denominator;

    return data.map((d) => {
      const dayHours = d.hours ?? d.platform_hours ?? 0;
      const annVal =
        d.annotation_hours ?? d.annotation ?? dayHours * annRatio;
      const revVal = d.review_hours ?? d.review ?? dayHours * revRatio;
      return {
        ...d,
        annotation_hours: Math.round(annVal * 10) / 10,
        review_hours: Math.round(revVal * 10) / 10,
      };
    });
  }, [data, totalAnnotationHours, totalReviewHours]);

  if (!chartData || chartData.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-slate-400 font-medium"
        style={{ height }}
      >
        No execution trend data available for selected range
      </div>
    );
  }

  // Calculate totals for header callout
  const totalAnnotation = chartData.reduce((acc, d) => acc + (d.annotation_hours || 0), 0);
  const totalReview = chartData.reduce((acc, d) => acc + (d.review_hours || 0), 0);

  return (
    <div className="w-full flex flex-col justify-between" style={{ height }}>
      {/* Header Metric Badges */}
      <div className="flex items-center justify-between gap-2 mb-2 px-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/80">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Annotation:</span>
            <span className="font-mono font-bold">{Math.round(totalAnnotation)}h</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200/80">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Review:</span>
            <span className="font-mono font-bold">{Math.round(totalReview)}h</span>
          </div>
        </div>
      </div>

      <div style={{ width: "100%", height: height - 36 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -4, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAnnotation" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorReview" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e11d48" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fontSize: 10, fill: "#64748b" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
            />

            <YAxis
              tick={{ fontSize: 10, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}h`}
            />

            <Tooltip
              isAnimationActive={false}
              wrapperStyle={{ pointerEvents: "none", outline: "none" }}
              labelFormatter={(lbl) => shortDate(lbl)}
              formatter={(val, name) => [
                `${val}h`,
                name === "annotation_hours" || name === "annotation"
                  ? "Annotation Hours"
                  : "Review Hours",
              ]}
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

            <Area
              type="monotone"
              dataKey="annotation_hours"
              stroke="#f59e0b"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorAnnotation)"
              name="Annotation"
            />

            <Area
              type="monotone"
              dataKey="review_hours"
              stroke="#e11d48"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorReview)"
              name="Review"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WorkforceSplitAreaChart;
