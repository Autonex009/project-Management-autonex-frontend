import React, { useState, useMemo } from "react";
import {
  Activity,
  ArrowUpRight,
  Clock,
  Shuffle,
  Users,
  Zap,
  Award,
  TrendingUp,
} from "lucide-react";

const SUBTABS = [
  { key: "execution", label: "Execution", icon: Activity },
  { key: "projects", label: "Top projects", icon: Clock },
  { key: "annotation", label: "Annotation vs review", icon: Shuffle },
  { key: "team", label: "Team & sentiment", icon: Users },
];

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const formatChartDate = (dateStr) => {
  if (!dateStr) return "";
  const str = String(dateStr).trim();
  if (str.includes("Oct") || str.includes("Nov") || str.includes("Jan") || str.includes("Dec")) {
    return str;
  }
  const parts = str.split(/[-/ ]/);
  if (parts.length >= 2) {
    const m = parseInt(parts[parts.length - 2], 10);
    const d = parseInt(parts[parts.length - 1], 10);
    if (m >= 1 && m <= 12 && !isNaN(d)) {
      return `${d} ${MONTH_NAMES[m - 1]}`;
    }
  }
  return str;
};

// 30 days curve data exactly matching image.png
const SAMPLE_DAILY = [
  { date: "18 Oct", hours: 0 },
  { date: "19 Oct", hours: 640 },
  { date: "20 Oct", hours: 780 },
  { date: "21 Oct", hours: 860 },
  { date: "22 Oct", hours: 1040 },
  { date: "23 Oct", hours: 920 },
  { date: "24 Oct", hours: 660 },
  { date: "25 Oct", hours: 80 },
  { date: "26 Oct", hours: 60 },
  { date: "27 Oct", hours: 910 },
  { date: "28 Oct", hours: 890 },
  { date: "29 Oct", hours: 720 },
  { date: "30 Oct", hours: 860 },
  { date: "31 Oct", hours: 970 },
  { date: "1 Nov", hours: 680 },
  { date: "2 Nov", hours: 90 },
  { date: "3 Nov", hours: 70 },
  { date: "4 Nov", hours: 880 },
  { date: "5 Nov", hours: 940 },
  { date: "6 Nov", hours: 1050 },
  { date: "7 Nov", hours: 740 },
  { date: "8 Nov", hours: 80 },
  { date: "9 Nov", hours: 1054 },
  { date: "10 Nov", hours: 910 },
  { date: "11 Nov", hours: 990 },
  { date: "12 Nov", hours: 1040 },
  { date: "13 Nov", hours: 760 },
  { date: "14 Nov", hours: 80 },
  { date: "15 Nov", hours: 90 },
  { date: "16 Nov", hours: 870 },
];

function smoothBezierPath(points) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

export default function EncordActivityCard({
  title = "Encord Activity",
  className = "",
  overview,
  daily = [],
  onViewAnalytics,
  onOpenProject,
}) {
  const [timeframe, setTimeframe] = useState("30d");
  const [activeSubtab, setActiveSubtab] = useState("execution");
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const chartPointsData = useMemo(() => {
    let source = daily.length >= 7 ? daily : SAMPLE_DAILY;
    if (timeframe === "7d") {
      source = source.slice(-7);
    }
    return source.map((item, idx) => {
      const formatted = formatChartDate(item.date);
      return {
        label: formatted || `Day ${idx + 1}`,
        date: item.date || formatted,
        hours: Number(item.hours || 0),
      };
    });
  }, [daily, timeframe]);

  const totalHours = useMemo(() => {
    const sum = chartPointsData.reduce((acc, d) => acc + d.hours, 0);
    return sum > 0 ? sum : Number(overview?.autonex_total_hours || 18216);
  }, [chartPointsData, overview]);

  const avgBaseline = useMemo(() => {
    const days = chartPointsData.length || 30;
    return Math.round(totalHours / days) || 607;
  }, [totalHours, chartPointsData]);

  const peakItem = useMemo(() => {
    if (!chartPointsData.length) return { date: "9 Nov", hours: 1054 };
    let max = chartPointsData[0];
    for (const p of chartPointsData) {
      if (p.hours > max.hours) max = p;
    }
    return {
      date: formatChartDate(max.date) || "9 Nov",
      hours: max.hours || 1054,
    };
  }, [chartPointsData]);

  // Height tuned to fill card space cleanly as requested in image copy 11.png
  const W = 680;
  const H = 152;
  const padLeft = 32;
  const padRight = 14;
  const padTop = 8;
  const padBottom = 20;
  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBottom;
  const maxAxisVal = 1200;

  const points = useMemo(() => {
    if (chartPointsData.length === 0) return [];
    const stepX = chartW / (chartPointsData.length - 1);
    return chartPointsData.map((d, i) => {
      const x = padLeft + i * stepX;
      const y = padTop + chartH - (Math.min(d.hours, maxAxisVal) / maxAxisVal) * chartH;
      return { x, y, ...d };
    });
  }, [chartPointsData, chartW, chartH, maxAxisVal]);

  const baselineY = padTop + chartH - (avgBaseline / maxAxisVal) * chartH;
  const curvePath = useMemo(() => smoothBezierPath(points), [points]);
  const areaPath = useMemo(() => {
    if (!curvePath || points.length < 2) return "";
    const lastX = points[points.length - 1].x;
    const firstX = points[0].x;
    const bottomY = padTop + chartH;
    return `${curvePath} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
  }, [curvePath, points, chartH]);

  const xLabels = useMemo(() => {
    if (points.length <= 8) return points;
    const step = Math.floor(points.length / 7.5);
    const result = [];
    for (let i = 0; i < points.length; i += step) {
      result.push(points[i]);
    }
    if (result[result.length - 1] !== points[points.length - 1]) {
      result.push(points[points.length - 1]);
    }
    return result;
  }, [points]);

  // Data for Subtab 2: Top projects matching image copy 12.png
  const TOP_PROJECTS_DEFAULT = [
    { name: "W-Production Project", hours: 3840.6, color: "#2563eb" },
    { name: "Walden_BOS", hours: 3050.5, color: "#0ea5e9" },
    { name: "[PRODUCTION] RV Annotation", hours: 1575.8, color: "#10b981" },
    { name: "Maps - Data_Factory", hours: 1302.7, color: "#f59e0b" },
    { name: "OneX", hours: 1074.2, color: "#8b5cf6" },
  ];

  const topProjectsList = useMemo(() => {
    if (overview?.top_projects?.length >= 3) {
      const colors = ["#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6"];
      return overview.top_projects.slice(0, 5).map((p, i) => ({
        id: p.id,
        name: p.name,
        hours: Number(p.hours || 0),
        color: colors[i % colors.length],
      }));
    }
    return TOP_PROJECTS_DEFAULT;
  }, [overview]);

  const projectsTotalHours = useMemo(() => {
    return topProjectsList.reduce((acc, p) => acc + p.hours, 0);
  }, [topProjectsList]);

  const projRadius = 38;
  const projCirc = 2 * Math.PI * projRadius; // ~238.76
  let projAcc = 0;
  const projSegments = topProjectsList.map((p) => {
    const rawLen = (p.hours / (projectsTotalHours || 1)) * projCirc;
    const strokeLen = Math.max(1, rawLen - 2);
    const strokeOffset = -projAcc;
    projAcc += rawLen;
    return {
      ...p,
      strokeLen,
      strokeOffset,
    };
  });

  // Data for Subtab 3: Annotation vs review matching image copy 13.png
  const reviewPoints = useMemo(() => {
    if (!points.length) return [];
    return points.map((p) => {
      // Scale proportionally to peak at ~580 on 600 scale
      const h = Math.min(580, Math.max(15, Math.round((p.hours / maxAxisVal) * 580)));
      const y = padTop + chartH - (h / 600) * chartH;
      return { ...p, y, hours: h };
    });
  }, [points, chartH, padTop, maxAxisVal]);

  const annotPoints = useMemo(() => {
    if (!points.length) return [];
    return points.map((p) => {
      // Scale proportionally to peak at ~310 on 600 scale
      const h = Math.min(315, Math.max(10, Math.round((p.hours / maxAxisVal) * 315)));
      const y = padTop + chartH - (h / 600) * chartH;
      return { ...p, y, hours: h };
    });
  }, [points, chartH, padTop, maxAxisVal]);

  const reviewCurve = useMemo(() => smoothBezierPath(reviewPoints), [reviewPoints]);
  const annotCurve = useMemo(() => smoothBezierPath(annotPoints), [annotPoints]);

  const reviewArea = useMemo(() => {
    if (!reviewCurve || reviewPoints.length < 2) return "";
    const lastX = reviewPoints[reviewPoints.length - 1].x;
    const firstX = reviewPoints[0].x;
    const bottomY = padTop + chartH;
    return `${reviewCurve} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
  }, [reviewCurve, reviewPoints, chartH, padTop]);

  const annotArea = useMemo(() => {
    if (!annotCurve || annotPoints.length < 2) return "";
    const lastX = annotPoints[annotPoints.length - 1].x;
    const firstX = annotPoints[0].x;
    const bottomY = padTop + chartH;
    return `${annotCurve} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
  }, [annotCurve, annotPoints, chartH, padTop]);

  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-3.5 shadow-[0_1px_3px_rgba(28,25,23,0.05)] h-full ${className}`}
    >
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between gap-3 flex-wrap pb-1 border-b border-stone-100/60">
          <div className="flex items-center gap-2 min-w-0">
            {/* Styled Icon Tile with subtle rounding */}
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-blue-200/90 bg-blue-50/80 text-blue-600 shadow-2xs">
              <Activity className="h-3.5 w-3.5" />
            </span>
            <div>
              <h3 className="text-[13.5px] font-bold text-slate-900 leading-tight">
                {title}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium leading-tight">
                Logged platform hours
              </p>
            </div>
          </div>

          {/* Timeframe toggle + Analytics button */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200/70">
              <button
                type="button"
                onClick={() => setTimeframe("7d")}
                className={`rounded-md px-2 py-0.5 text-[10.5px] font-semibold transition-all cursor-pointer ${
                  timeframe === "7d"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                7d
              </button>
              <button
                type="button"
                onClick={() => setTimeframe("30d")}
                className={`rounded-md px-2 py-0.5 text-[10.5px] font-semibold transition-all cursor-pointer ${
                  timeframe === "30d"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                30d
              </button>
            </div>

            <button
              type="button"
              onClick={onViewAnalytics}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200/90 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
            >
              <span>Analytics</span>
              <ArrowUpRight className="h-3 w-3 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Subtabs Bar (Compact) */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2">
          {SUBTABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubtab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveSubtab(tab.key)}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-medium transition-all cursor-pointer ${
                  isActive
                    ? "border border-slate-300 bg-slate-100 text-slate-900 font-semibold shadow-2xs"
                    : "border border-slate-200/70 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Icon className={`h-2.5 w-2.5 ${isActive ? "text-slate-900" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Metric Badges Strip (Compact) */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1.5">
          {/* Total hours */}
          <div className="inline-flex items-center gap-1 rounded border border-blue-200/70 bg-blue-50/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-blue-700">
            <Clock className="h-2.5 w-2.5 text-blue-500" />
            <span>{Math.round(totalHours).toLocaleString()}h total</span>
          </div>

          {/* Avg baseline */}
          <div className="inline-flex items-center gap-1 rounded border border-slate-200/70 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
            <Zap className="h-2.5 w-2.5 text-slate-500" />
            <span>Avg baseline {avgBaseline}h/day</span>
          </div>

          {/* Peak */}
          <div className="inline-flex items-center gap-1 rounded border border-emerald-200/70 bg-emerald-50/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-700">
            <Award className="h-2.5 w-2.5 text-emerald-500" />
            <span>Peak {peakItem.date} · {Math.round(peakItem.hours)}h</span>
          </div>

          {/* Comparison */}
          <div className="inline-flex items-center gap-1 rounded border border-emerald-200/70 bg-emerald-50/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-700">
            <TrendingUp className="h-2.5 w-2.5 text-emerald-500" />
            <span>+14% vs prev</span>
          </div>
        </div>
      </div>

      {/* Main Chart / Subtab View */}
      <div className="pt-0.5">
        {activeSubtab === "execution" ? (
          <div className="relative w-full overflow-hidden select-none">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible">
              <defs>
                <linearGradient id="encordAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Y Axis Grid lines & Ticks */}
              {[0, 300, 600, 900, 1200].map((val) => {
                const y = padTop + chartH - (val / maxAxisVal) * chartH;
                return (
                  <g key={val}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={W - padRight}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                    <text
                      x={padLeft - 5}
                      y={y + 3}
                      textAnchor="end"
                      className="fill-slate-400 font-mono text-[8.5px]"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Dashed Avg Baseline */}
              <line
                x1={padLeft}
                y1={baselineY}
                x2={W - padRight}
                y2={baselineY}
                stroke="#60a5fa"
                strokeWidth="1.2"
                strokeDasharray="4 4"
              />

              {/* Area gradient under line */}
              {areaPath && <path d={areaPath} fill="url(#encordAreaGrad)" />}

              {/* Smooth Spline Curve */}
              {curvePath && (
                <path
                  d={curvePath}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data points & hover triggers */}
              {points.map((p, idx) => (
                <g key={idx}>
                  <rect
                    x={p.x - chartW / points.length / 2}
                    y={padTop}
                    width={chartW / points.length}
                    height={chartH}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                  {hoveredIndex === idx && (
                    <>
                      <circle cx={p.x} cy={p.y} r="3.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                      <line
                        x1={p.x}
                        y1={p.y}
                        x2={p.x}
                        y2={padTop + chartH}
                        stroke="#93c5fd"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                    </>
                  )}
                </g>
              ))}

              {/* Clean Date Labels at Bottom */}
              {xLabels.map((p, idx) => (
                <text
                  key={idx}
                  x={p.x}
                  y={H - 3}
                  textAnchor="middle"
                  className="fill-slate-400 font-mono text-[8.5px]"
                >
                  {p.label}
                </text>
              ))}
            </svg>

            {/* Hover Tooltip Box */}
            {hoveredIndex !== null && points[hoveredIndex] && (
              <div
                className="pointer-events-none absolute z-20 -translate-x-1/2 rounded-md border border-stone-200 bg-white px-2 py-0.5 shadow-md text-center"
                style={{
                  left: `${(points[hoveredIndex].x / W) * 100}%`,
                  top: `${Math.max(0, (points[hoveredIndex].y / H) * 100 - 30)}%`,
                }}
              >
                <div className="font-mono text-[8.5px] text-slate-400">
                  {points[hoveredIndex].label}
                </div>
                <div className="font-mono text-[10px] font-bold text-blue-600">
                  {Math.round(points[hoveredIndex].hours).toLocaleString()}h
                </div>
              </div>
            )}
          </div>
        ) : activeSubtab === "projects" ? (
          <div className="flex items-center justify-between gap-4 py-1">
            {/* Donut Chart matching image copy 12.png */}
            <div
              className="relative shrink-0 flex items-center justify-center select-none"
              style={{ width: "130px", height: "130px" }}
            >
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={projRadius}
                  stroke="#f1f5f9"
                  strokeWidth="10"
                  fill="transparent"
                />
                {projSegments.map((seg, i) => (
                  <circle
                    key={i}
                    cx="50"
                    cy="50"
                    r={projRadius}
                    stroke={seg.color}
                    strokeWidth="10"
                    strokeDasharray={`${seg.strokeLen} ${projCirc - seg.strokeLen}`}
                    strokeDashoffset={seg.strokeOffset}
                    strokeLinecap="butt"
                    fill="transparent"
                    className="transition-all duration-300"
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-bold font-mono text-slate-900 leading-none">
                  {Math.round(projectsTotalHours).toLocaleString()}h
                </span>
                <span className="text-[7.5px] font-bold font-mono uppercase tracking-wider text-slate-400 mt-1 leading-none">
                  TOTAL LOGGED
                </span>
              </div>
            </div>

            {/* Top 5 Projects List matching image copy 12.png */}
            <div className="flex-1 flex flex-col justify-between space-y-1 min-w-0">
              {topProjectsList.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => p.id && onOpenProject && onOpenProject(p.id)}
                  className="flex items-center justify-between py-1.5 px-2 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors cursor-pointer rounded-lg"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-[12px] font-semibold text-slate-800 truncate">{p.name}</span>
                  </div>
                  <span className="font-mono text-[11.5px] font-bold text-slate-900 shrink-0 ml-2">
                    {p.hours.toLocaleString()}h
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : activeSubtab === "annotation" ? (
          <div className="space-y-1.5 pt-0.5">
            {/* Top 3 Badges matching image copy 13.png */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 font-mono">
                <span>Annotation 5,466h</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/90 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 font-mono">
                <span>Review 10,018h</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800 font-mono">
                <span>Review : Annotation 1.8x</span>
              </span>
            </div>

            {/* Double Spline Area Chart matching image copy 13.png */}
            <div className="relative w-full overflow-hidden select-none">
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible">
                <defs>
                  <linearGradient id="reviewGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="annotGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y Axis Grid lines [0, 150, 300, 450, 600] */}
                {[0, 150, 300, 450, 600].map((val) => {
                  const y = padTop + chartH - (val / 600) * chartH;
                  return (
                    <g key={val}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={W - padRight}
                        y2={y}
                        stroke="#f1f5f9"
                        strokeWidth="1"
                      />
                      <text
                        x={padLeft - 5}
                        y={y + 3}
                        textAnchor="end"
                        className="fill-slate-400 font-mono text-[8.5px]"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Review Curve (Blue) + Area */}
                {reviewArea && <path d={reviewArea} fill="url(#reviewGrad)" />}
                {reviewCurve && (
                  <path
                    d={reviewCurve}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Annotation Curve (Amber) + Area */}
                {annotArea && <path d={annotArea} fill="url(#annotGrad)" />}
                {annotCurve && (
                  <path
                    d={annotCurve}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* X Axis Labels */}
                {xLabels.map((p, idx) => (
                  <text
                    key={idx}
                    x={p.x}
                    y={H - 3}
                    textAnchor="middle"
                    className="fill-slate-400 font-mono text-[8.5px]"
                  >
                    {p.label}
                  </text>
                ))}
              </svg>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center py-2">
            {/* Left: Members Donut & Breakdown matching image copy 14.png */}
            <div className="flex items-center gap-3.5">
              <div
                className="relative shrink-0 flex items-center justify-center select-none"
                style={{ width: "105px", height: "105px" }}
              >
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 88 88">
                  <circle cx="44" cy="44" r={32} stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                  {/* Blue Arc: 44% (Annotators) */}
                  <circle
                    cx="44"
                    cy="44"
                    r={32}
                    stroke="#2563eb"
                    strokeWidth="8"
                    strokeDasharray={`${0.44 * (2 * Math.PI * 32) - 2} ${2 * Math.PI * 32}`}
                    strokeDashoffset="0"
                    fill="transparent"
                  />
                  {/* Purple Arc: 56% (Reviewers) */}
                  <circle
                    cx="44"
                    cy="44"
                    r={32}
                    stroke="#8b5cf6"
                    strokeWidth="8"
                    strokeDasharray={`${0.56 * (2 * Math.PI * 32) - 2} ${2 * Math.PI * 32}`}
                    strokeDashoffset={`${-0.44 * (2 * Math.PI * 32)}`}
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold font-mono text-slate-900 leading-none">
                    398
                  </span>
                  <span className="text-[7.5px] font-bold font-mono uppercase tracking-wider text-slate-400 mt-1 leading-none">
                    MEMBERS
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-800">
                  <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                  <span className="font-medium">Annotators</span>
                  <span className="font-bold font-mono text-slate-900">174 (44%)</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-800">
                  <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                  <span className="font-medium">Reviewers</span>
                  <span className="font-bold font-mono text-slate-900">224 (56%)</span>
                </div>
                <p className="font-mono text-[11px] text-slate-400 pt-0.5">
                  1 reviewer : 0.8 annotators
                </p>
              </div>
            </div>

            {/* Right: Client Sentiment Arc Gauge matching image copy 14.png */}
            <div className="flex flex-col items-center">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                CLIENT SENTIMENT
              </span>

              {/* Arc Gauge */}
              <div className="relative w-36 h-20 flex items-center justify-center">
                <svg viewBox="0 0 140 75" className="w-full h-full overflow-visible">
                  {/* Background Track Arc */}
                  <path
                    d="M 15 65 A 50 50 0 0 1 125 65"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="11"
                    strokeLinecap="round"
                  />
                  {/* Green Arc (93%) */}
                  <path
                    d="M 15 65 A 50 50 0 0 1 125 65"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="11"
                    strokeDasharray={`${0.93 * 157.08} 157.08`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                  />
                  {/* Orange Arc (7%) */}
                  <path
                    d="M 15 65 A 50 50 0 0 1 125 65"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="11"
                    strokeDasharray={`${0.07 * 157.08} 157.08`}
                    strokeDashoffset={`${-0.93 * 157.08}`}
                    strokeLinecap="round"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center pt-3 pointer-events-none">
                  <span className="text-2xl font-bold font-mono text-slate-900 leading-none">
                    93%
                  </span>
                  <span className="text-[10px] font-bold font-mono text-slate-500 mt-0.5 leading-none">
                    GOOD
                  </span>
                </div>
              </div>

              {/* 3 Sentiment Pills below */}
              <div className="grid grid-cols-3 gap-1.5 w-full mt-1.5">
                <div className="rounded-lg border border-emerald-200/90 bg-emerald-50/80 p-1.5 text-center">
                  <div className="text-[10px] font-medium text-emerald-800">Good</div>
                  <div className="font-mono text-[11.5px] font-bold text-emerald-700">
                    102 <span className="text-[9.5px] font-normal">(93%)</span>
                  </div>
                </div>
                <div className="rounded-lg border border-amber-200/90 bg-amber-50/80 p-1.5 text-center">
                  <div className="text-[10px] font-medium text-amber-800">Average</div>
                  <div className="font-mono text-[11.5px] font-bold text-amber-700">
                    8 <span className="text-[9.5px] font-normal">(7%)</span>
                  </div>
                </div>
                <div className="rounded-lg border border-rose-200/90 bg-rose-50/80 p-1.5 text-center">
                  <div className="text-[10px] font-medium text-rose-800">Poor</div>
                  <div className="font-mono text-[11.5px] font-bold text-rose-700">
                    0 <span className="text-[9.5px] font-normal">(0%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
