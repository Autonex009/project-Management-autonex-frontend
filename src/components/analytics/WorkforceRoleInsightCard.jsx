import React, { useMemo } from "react";
import { Users, UserCheck, ShieldCheck, Award } from "lucide-react";
import UserAvatar from "../ui/UserAvatar";
import { formatDisplayName } from "../../utils/displayName";

const WorkforceRoleInsightCard = ({
  isGlobal = true,
  kpis = {},
  annotators = [],
  projects = [],
}) => {
  // Global Mode Calculations: Staffing role balance & ratios
  const globalData = useMemo(() => {
    if (!isGlobal) return null;

    let totalAnnotators =
      kpis?.active_annotators ||
      kpis?.annotator_only ||
      kpis?.autonex_annotator_only ||
      0;
    let totalReviewers =
      kpis?.active_reviewers ||
      kpis?.reviewer_only ||
      kpis?.autonex_reviewer_only ||
      0;

    // Aggregate explicit assigned system role counts across projects if global kpis is empty
    if (totalAnnotators === 0 && totalReviewers === 0 && projects && projects.length > 0) {
      projects.forEach((p) => {
        totalAnnotators += p.autonex_annotator_only || p.annotator_only || 0;
        totalReviewers += p.autonex_reviewer_only || p.reviewer_only || 0;
      });
    }

    const totalTeam = totalAnnotators + totalReviewers || 1;
    const annotatorPct = Math.round((totalAnnotators / totalTeam) * 100);
    const reviewerPct = Math.min(100, 100 - annotatorPct);

    // Reviewer to Annotator Ratio
    const ratio = totalReviewers > 0 ? (totalAnnotators / totalReviewers).toFixed(1) : totalAnnotators;

    let ratioStatus = { text: "Optimal Balance", color: "text-emerald-700 bg-emerald-50 border-emerald-200/80" };
    if (totalReviewers === 0) {
      ratioStatus = { text: "No Reviewers", color: "text-rose-700 bg-rose-50 border-rose-200/80" };
    } else if (ratio < 2.0) {
      ratioStatus = { text: "Heavy QA Ratio", color: "text-indigo-700 bg-indigo-50 border-indigo-200/80" };
    } else if (ratio > 5.0) {
      ratioStatus = { text: "QA Shortage Risk", color: "text-amber-700 bg-amber-50 border-amber-200/80" };
    }

    return {
      totalTeam,
      totalAnnotators,
      totalReviewers,
      annotatorPct,
      reviewerPct,
      ratio,
      ratioStatus,
    };
  }, [isGlobal, kpis, projects]);

  // Project Mode Calculations: Top contributors & output concentration
  const projectData = useMemo(() => {
    if (isGlobal || !annotators || annotators.length === 0) return null;

    const sorted = [...annotators].sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0));
    const totalProjectHours = sorted.reduce((sum, a) => sum + (a.total_hours || 0), 0);
    const top3 = sorted.slice(0, 3);
    const top3Hours = top3.reduce((sum, a) => sum + (a.total_hours || 0), 0);

    const concentrationPct = totalProjectHours > 0 ? Math.round((top3Hours / totalProjectHours) * 100) : 0;

    return {
      totalMembers: sorted.length,
      top3,
      totalProjectHours,
      concentrationPct,
    };
  }, [isGlobal, annotators]);

  // Re-order top 3 for Olympic Podium layout (#2 Left, #1 Center, #3 Right)
  const podiumList = useMemo(() => {
    const top3 = projectData?.top3 || [];
    if (top3.length === 0) return [];
    if (top3.length === 1) return [{ ...top3[0], rank: 1, originalIndex: 0 }];
    if (top3.length === 2) return [{ ...top3[1], rank: 2, originalIndex: 1 }, { ...top3[0], rank: 1, originalIndex: 0 }];
    return [
      { ...top3[1], rank: 2, originalIndex: 1 },
      { ...top3[0], rank: 1, originalIndex: 0 },
      { ...top3[2], rank: 3, originalIndex: 2 },
    ];
  }, [projectData]);

  // Render GLOBAL Scope View (Enlarged Donut Ring)
  if (isGlobal) {
    const { totalTeam, totalAnnotators, totalReviewers, annotatorPct, reviewerPct, ratio, ratioStatus } = globalData;

    // Larger SVG Donut Ring Calculations
    const size = 104;
    const strokeWidth = 9;
    const center = size / 2;
    const radius = center - strokeWidth / 2;
    const circumference = 2 * Math.PI * radius;

    const annDash = (annotatorPct / 100) * circumference;
    const revDash = (reviewerPct / 100) * circumference;

    return (
      <div className="h-full flex flex-col justify-between space-y-1.5">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>Staffing & Role Distribution</span>
          </div>
        </div>

        {/* Enlarged SVG Donut Ring Visualizer + Micro Metrics */}
        <div className="flex items-center justify-around bg-stone-50/60 rounded-xl p-2.5 border border-stone-200/80 shadow-xs">
          {/* SVG Donut */}
          <div className="relative flex items-center justify-center shrink-0">
            <svg width={size} height={size} className="transform -rotate-90">
              {/* Background Track */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#e7e5e4"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {/* Annotators Arc */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#4f46e5"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={`${annDash} ${circumference}`}
                strokeDashoffset={0}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
              {/* Reviewers Arc */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#a855f7"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={`${revDash} ${circumference}`}
                strokeDashoffset={`-${annDash}`}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>

            {/* Inner Donut Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-base font-mono font-black text-stone-900 leading-none">{totalTeam}</span>
              <span className="text-[9px] font-bold text-stone-400 mt-0.5">Members</span>
            </div>
          </div>

          {/* Right Side Micro Metrics */}
          <div className="space-y-2 pl-3 border-l border-stone-200/60">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
              <div>
                <div className="text-[10px] text-stone-400 font-medium">Annotators</div>
                <div className="font-mono font-black text-stone-900 text-sm">
                  {totalAnnotators} <span className="text-xs font-semibold text-indigo-600">({annotatorPct}%)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
              <div>
                <div className="text-[10px] text-stone-400 font-medium">Reviewers</div>
                <div className="font-mono font-black text-stone-900 text-sm">
                  {totalReviewers} <span className="text-xs font-semibold text-purple-600">({reviewerPct}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Status Pill */}
        <div className="p-1 px-2 rounded-lg bg-indigo-50/50 border border-indigo-100/80 flex items-center justify-between text-[10px] font-mono whitespace-nowrap">
          <span className="text-stone-500 font-medium shrink-0">Ratio:</span>
          <span className="font-bold text-indigo-700 shrink-0">1 Reviewer : {ratio} Annotators</span>
        </div>
      </div>
    );
  }

  // Render PROJECT Scope View (Top Contributors)
  if (!projectData || projectData.top3.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-stone-400 font-medium">
        No contributor data available for this project.
      </div>
    );
  }

  const { top3, totalProjectHours, concentrationPct } = projectData;

  return (
    <div className="h-full flex flex-col justify-between space-y-1.5">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
          <Award className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Top Project Contributors</span>
        </div>
        <span className="text-[10px] font-mono bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200/80 font-bold shrink-0">
          Top 3 = {concentrationPct}% vol
        </span>
      </div>

      {/* Proportional Output Concentration Stacked Bar */}
      <div className="bg-stone-50/70 p-2 rounded-xl border border-stone-200/70 space-y-1">
        <div className="flex items-center justify-between text-[10px] font-mono font-bold text-stone-600">
          <span>Output Share Split</span>
          <span className="text-indigo-600">{concentrationPct}% volume</span>
        </div>
        <div className="w-full bg-stone-200/60 rounded-full h-2 flex overflow-hidden p-0.5">
          {top3.map((m, idx) => {
            const pct = totalProjectHours > 0 ? Math.round((m.total_hours / totalProjectHours) * 100) : 0;
            const barColors = ["bg-amber-400", "bg-indigo-500", "bg-purple-500"];
            return (
              <div
                key={m.user_email || idx}
                className={`h-full rounded-full ${barColors[idx % 3]} transition-all duration-700`}
                style={{ width: `${pct}%` }}
                title={`${m.employee_name || 'Member'}: ${pct}% (${Math.round((m.total_hours || 0) * 10) / 10}h)`}
              />
            );
          })}
        </div>
      </div>

      {/* 3-Column Olympic Podium Showcase */}
      <div className="grid grid-cols-3 gap-2 my-auto">
        {podiumList.map((member) => {
          const { rank } = member;
          const name = formatDisplayName(member.employee_name) || member.employee_name || member.user_email?.split("@")[0] || "Unknown";
          const hrs = Math.round((member.total_hours || 0) * 10) / 10;
          const role = member.role || "Annotator";
          const pct = totalProjectHours > 0 ? Math.round((member.total_hours / totalProjectHours) * 100) : 0;

          const STYLES = {
            1: {
              cardBg: "bg-gradient-to-b from-amber-50 to-amber-100/40 border-amber-300/90 shadow-sm ring-1 ring-amber-400/40 -translate-y-0.5",
              badgeBg: "bg-amber-500 text-white font-black shadow-xs shadow-amber-500/40",
              avatarRing: "ring-2 ring-amber-400 ring-offset-1",
              hoursText: "text-amber-950 font-mono font-black text-xs",
            },
            2: {
              cardBg: "bg-stone-50/90 border-stone-200/90 hover:bg-stone-100/60",
              badgeBg: "bg-stone-500 text-white font-bold",
              avatarRing: "ring-2 ring-stone-300 ring-offset-1",
              hoursText: "text-stone-900 font-mono font-bold text-xs",
            },
            3: {
              cardBg: "bg-amber-900/5 border-amber-700/20 hover:bg-amber-900/10",
              badgeBg: "bg-amber-700 text-white font-bold",
              avatarRing: "ring-2 ring-amber-600/60 ring-offset-1",
              hoursText: "text-amber-900 font-mono font-bold text-xs",
            },
          }[rank];

          return (
            <div
              key={member.user_email}
              className={`p-1.5 rounded-xl border ${STYLES.cardBg} flex flex-col items-center justify-between text-center transition-all duration-300 py-2`}
            >
              {/* Rank & Share Header */}
              <div className="w-full flex items-center justify-between gap-1 mb-1">
                <span className={`text-[9px] px-1.5 py-0.2 rounded-md ${STYLES.badgeBg}`}>
                  #{rank}
                </span>
                <span className="text-[9px] font-mono font-bold text-stone-500">
                  {pct}%
                </span>
              </div>

              {/* Avatar Hub */}
              <div className={`my-1 ${STYLES.avatarRing} rounded-full`}>
                <UserAvatar name={name} size="xs" />
              </div>

              {/* Contributor Meta */}
              <div className="w-full min-w-0 px-0.5">
                <div className="font-extrabold text-stone-900 text-[11px] truncate leading-tight" title={name}>
                  {name.split(" ")[0]}
                </div>
                <div className="text-[8.5px] text-stone-600 font-semibold uppercase tracking-wider truncate mt-0.5">
                  {role}
                </div>
              </div>

              {/* Total Hours Badge */}
              <div className={`mt-1.5 ${STYLES.hoursText}`}>
                {hrs}h
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkforceRoleInsightCard;
