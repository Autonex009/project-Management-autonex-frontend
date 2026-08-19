import React, { useState, useMemo } from "react";
import { AlertTriangle, ShieldAlert, CheckCircle2, HeartHandshake, Search, ArrowRight, ExternalLink } from "lucide-react";
import Modal from "../ui/Modal";

const SENTIMENT_CONFIG = {
  GOOD: {
    label: "Positive Sentiment",
    shortLabel: "Good",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200/80",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
    barColor: "bg-emerald-500",
  },
  AVG: {
    label: "Average Sentiment",
    shortLabel: "Average",
    color: "text-amber-700 bg-amber-50 border-amber-200/80",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    icon: AlertTriangle,
    barColor: "bg-amber-400",
  },
  POOR: {
    label: "Poor / At Risk",
    shortLabel: "Poor",
    color: "text-rose-700 bg-rose-50 border-rose-200/80",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    icon: ShieldAlert,
    barColor: "bg-rose-500",
  },
  UNSPECIFIED: {
    label: "Neutral / Unspecified",
    shortLabel: "Neutral",
    color: "text-slate-600 bg-slate-50 border-slate-200/80",
    badgeColor: "bg-slate-50 text-slate-600 border-slate-200",
    icon: HeartHandshake,
    barColor: "bg-slate-300",
  },
};

const ProjectDeliveryPacingCard = ({
  isGlobal = true,
  projects = [],
  projectAnalytics = null,
  selectedProject = null,
  onSelectProject = null,
}) => {
  const [activeCategoryModal, setActiveCategoryModal] = useState(null); // 'GOOD' | 'AVG' | 'POOR' | null
  const [modalSearch, setModalSearch] = useState("");

  // Categorize projects into sentiment groups
  const sentimentGroups = useMemo(() => {
    if (!projects || projects.length === 0) {
      return { GOOD: [], AVG: [], POOR: [] };
    }

    const goodList = [];
    const avgList = [];
    const poorList = [];

    projects.forEach((p) => {
      const raw = String(p.sentiment || "").toUpperCase().trim();
      if (raw === "POOR" || raw.includes("RISK") || raw.includes("CRITICAL")) {
        poorList.push(p);
      } else if (raw === "AVG" || raw.includes("CAUTION") || raw.includes("ATTENTION")) {
        avgList.push(p);
      } else {
        goodList.push(p);
      }
    });

    return {
      GOOD: goodList,
      AVG: avgList,
      POOR: poorList,
    };
  }, [projects]);

  // Global Scope Calculations
  const globalHealth = useMemo(() => {
    if (!isGlobal || !projects || projects.length === 0) return null;

    const healthy = sentimentGroups.GOOD.length;
    const caution = sentimentGroups.AVG.length;
    const critical = sentimentGroups.POOR.length;

    const total = projects.length;
    const healthyPct = Math.round((healthy / total) * 100);
    const cautionPct = Math.round((caution / total) * 100);
    const criticalPct = Math.min(100, Math.max(0, 100 - healthyPct - cautionPct));

    return {
      total,
      healthy,
      caution,
      critical,
      healthyPct,
      cautionPct,
      criticalPct,
    };
  }, [isGlobal, projects, sentimentGroups]);

  // Project Scope Calculations
  const projectSentimentData = useMemo(() => {
    if (isGlobal) return null;

    const rawSentiment = String(
      selectedProject?.sentiment || projectAnalytics?.sentiment || ""
    ).toUpperCase().trim();

    let key = "UNSPECIFIED";
    if (rawSentiment === "GOOD" || rawSentiment.includes("POSITIVE") || rawSentiment.includes("HEALTHY")) {
      key = "GOOD";
    } else if (rawSentiment === "AVG" || rawSentiment.includes("CAUTION") || rawSentiment.includes("AVERAGE")) {
      key = "AVG";
    } else if (rawSentiment === "POOR" || rawSentiment.includes("RISK") || rawSentiment.includes("CRITICAL")) {
      key = "POOR";
    }

    const config = SENTIMENT_CONFIG[key];
    const notes = selectedProject?.sentiment_notes || projectAnalytics?.sentiment_notes || selectedProject?.notes || "";

    return {
      key,
      config,
      rawSentiment,
      notes,
    };
  }, [isGlobal, selectedProject, projectAnalytics]);

  // Filtered projects list for active modal
  const modalProjectsList = useMemo(() => {
    if (!activeCategoryModal) return [];
    const list = sentimentGroups[activeCategoryModal] || [];
    if (!modalSearch) return list;
    const q = modalSearch.toLowerCase();
    return list.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.project_name || "").toLowerCase().includes(q) ||
        (p.project_id || "").toString().toLowerCase().includes(q)
    );
  }, [activeCategoryModal, sentimentGroups, modalSearch]);

  const handleProjectClick = (projectId) => {
    if (onSelectProject && projectId) {
      onSelectProject(projectId);
      setActiveCategoryModal(null);
    }
  };

  // RENDER GLOBAL SCOPE VIEW (Enlarged SVG Semi-Circular Health Speedometer Arc)
  if (isGlobal) {
    if (!globalHealth) {
      return (
        <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
          No client sentiment data available.
        </div>
      );
    }

    const { healthy, caution, critical, healthyPct, cautionPct, criticalPct } = globalHealth;

    // Enlarged Multi-Color Semi-circle Arc SVG Calculations
    const arcRadius = 62;
    const arcStroke = 10;
    const semiCircumference = Math.PI * arcRadius;

    const goodDash = (healthyPct / 100) * semiCircumference;
    const avgDash = (cautionPct / 100) * semiCircumference;
    const poorDash = (criticalPct / 100) * semiCircumference;

    return (
      <>
        <div className="h-full flex flex-col justify-between space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <HeartHandshake className="w-3.5 h-3.5 text-indigo-600" />
              <span>Client Sentiment Signals</span>
            </div>
          </div>

          {/* Multi-Color SVG Semi-Circular Health Arc Visualizer */}
          <div className="flex items-center justify-center relative bg-slate-50/50 rounded-xl py-2 px-3 border border-slate-100/80 shadow-2xs">
            <div className="relative flex flex-col items-center justify-center pt-1">
              <svg width="160" height="84" className="overflow-visible">
                {/* Background Track */}
                <path
                  d="M 18 76 A 62 62 0 0 1 142 76"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth={arcStroke}
                  strokeLinecap="round"
                />
                {/* Good Arc (Emerald) */}
                <path
                  d="M 18 76 A 62 62 0 0 1 142 76"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth={arcStroke}
                  strokeLinecap="round"
                  strokeDasharray={`${goodDash} ${semiCircumference}`}
                  strokeDashoffset={0}
                  className="transition-all duration-700"
                />
                {/* Average Arc (Amber) */}
                {cautionPct > 0 && (
                  <path
                    d="M 18 76 A 62 62 0 0 1 142 76"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth={arcStroke}
                    strokeLinecap="round"
                    strokeDasharray={`${avgDash} ${semiCircumference}`}
                    strokeDashoffset={`-${goodDash}`}
                    className="transition-all duration-700"
                  />
                )}
                {/* Poor Arc (Rose) */}
                {criticalPct > 0 && (
                  <path
                    d="M 18 76 A 62 62 0 0 1 142 76"
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth={arcStroke}
                    strokeLinecap="round"
                    strokeDasharray={`${poorDash} ${semiCircumference}`}
                    strokeDashoffset={`-${goodDash + avgDash}`}
                    className="transition-all duration-700"
                  />
                )}
              </svg>

              {/* Arc Center Label */}
              <div className="absolute bottom-1.5 flex flex-col items-center text-center">
                <span className="text-lg font-mono font-black text-slate-900 leading-none">{healthyPct}%</span>
                <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest mt-0.5">GOOD</span>
              </div>
            </div>
          </div>

          {/* Interactive Sentiment Categories Status Cards */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
            {/* GOOD TILE */}
            <button
              type="button"
              onClick={() => {
                setModalSearch("");
                setActiveCategoryModal("GOOD");
              }}
              className="p-1.5 rounded-xl bg-emerald-50/60 hover:bg-emerald-100/80 border border-emerald-200/70 transition-all hover:scale-105 cursor-pointer group text-left"
              title="Click to view all projects with Good Sentiment"
            >
              <div className="text-[9px] text-slate-500 font-medium group-hover:text-emerald-800 transition-colors flex items-center justify-between">
                <span>Good</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-emerald-600 transition-opacity" />
              </div>
              <div className="font-mono font-black text-emerald-700 text-sm mt-0.5">{healthy}</div>
            </button>

            {/* AVERAGE TILE */}
            <button
              type="button"
              onClick={() => {
                setModalSearch("");
                setActiveCategoryModal("AVG");
              }}
              className="p-1.5 rounded-xl bg-amber-50/60 hover:bg-amber-100/80 border border-amber-200/70 transition-all hover:scale-105 cursor-pointer group text-left"
              title="Click to view all projects with Average Sentiment"
            >
              <div className="text-[9px] text-slate-500 font-medium group-hover:text-amber-800 transition-colors flex items-center justify-between">
                <span>Average</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-amber-600 transition-opacity" />
              </div>
              <div className="font-mono font-black text-amber-700 text-sm mt-0.5">{caution}</div>
            </button>

            {/* POOR TILE */}
            <button
              type="button"
              onClick={() => {
                setModalSearch("");
                setActiveCategoryModal("POOR");
              }}
              className="p-1.5 rounded-xl bg-rose-50/60 hover:bg-rose-100/80 border border-rose-200/70 transition-all hover:scale-105 cursor-pointer group text-left"
              title="Click to view all projects with Poor / At Risk Sentiment"
            >
              <div className="text-[9px] text-slate-500 font-medium group-hover:text-rose-800 transition-colors flex items-center justify-between">
                <span>Poor</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-rose-600 transition-opacity" />
              </div>
              <div className="font-mono font-black text-rose-700 text-sm mt-0.5">{critical}</div>
            </button>
          </div>
        </div>

        {/* SENTIMENT PROJECTS LIST MODAL */}
        {activeCategoryModal && (
          <Modal
            isOpen={Boolean(activeCategoryModal)}
            onClose={() => setActiveCategoryModal(null)}
            size="lg"
          >
            <Modal.Header onClose={() => setActiveCategoryModal(null)}>
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Projects with {SENTIMENT_CONFIG[activeCategoryModal]?.shortLabel} Sentiment
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Showing {modalProjectsList.length} of {sentimentGroups[activeCategoryModal]?.length || 0} projects
                  </p>
                </div>
              </div>
            </Modal.Header>

            <Modal.Body className="space-y-3">
              {/* Modal Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search project by name…"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Projects List */}
              <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto pr-1">
                {modalProjectsList.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-medium">
                    No matching projects found.
                  </div>
                ) : (
                  modalProjectsList.map((p) => {
                    const hours = p.autonex_platform_hours || p.hours || 0;
                    return (
                      <div
                        key={p.project_id || p.id || p.name}
                        onClick={() => handleProjectClick(p.project_id || p.id)}
                        className="py-2.5 px-3 rounded-xl hover:bg-slate-50 flex items-center justify-between transition-colors group cursor-pointer"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                            {p.name || p.project_name || "Unnamed Project"}
                          </div>
                          {p.pm_name && (
                            <div className="text-[10px] text-slate-400 font-medium">
                              PM: {p.pm_name}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="text-xs font-mono font-bold text-slate-900">
                              {hours}h
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono">Platform Logged</div>
                          </div>

                          <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Modal.Body>
          </Modal>
        )}
      </>
    );
  }

  // RENDER PROJECT SCOPE VIEW (Specific Project Client Sentiment)
  if (!projectSentimentData) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
        No client sentiment recorded for this project.
      </div>
    );
  }

  const { key, config, notes } = projectSentimentData;
  const IconComponent = config.icon;

  let needleRotation = 60;
  let needleAccentColor = "#10b981";
  let statusTextColor = "text-emerald-700";

  if (key === "POOR") {
    needleRotation = -60;
    needleAccentColor = "#f43f5e";
    statusTextColor = "text-rose-700";
  } else if (key === "AVG") {
    needleRotation = 0;
    needleAccentColor = "#f59e0b";
    statusTextColor = "text-amber-700";
  } else if (key === "GOOD") {
    needleRotation = 60;
    needleAccentColor = "#10b981";
    statusTextColor = "text-emerald-700";
  } else {
    needleRotation = 0;
    needleAccentColor = "#64748b";
    statusTextColor = "text-slate-700";
  }

  return (
    <div className="h-full flex flex-col justify-between space-y-2">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <HeartHandshake className="w-3.5 h-3.5 text-indigo-600" />
          <span>Client Sentiment & Health</span>
        </div>
      </div>

      {/* Speedometer Gauge Visualizer */}
      {/* Speedometer Gauge Visualizer */}
      <div className="flex-1 flex flex-col items-center justify-center relative bg-slate-50/50 rounded-xl py-3 px-3 border border-slate-100/80 shadow-2xs my-1 min-h-[175px]">
        <div className="relative flex flex-col items-center justify-center w-full">
          <svg width="270" height="150" viewBox="0 0 270 150" className="overflow-visible max-w-full">
            <defs>
              <linearGradient id="speedometerBlendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="10%" stopColor="#f43f5e" />
                <stop offset="25%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="75%" stopColor="#f59e0b" />
                <stop offset="90%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>

              <filter id="needleGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodOpacity="0.25" floodColor="#0f172a" />
              </filter>
            </defs>

            {/* Background Track */}
            <path
              d="M 54 110 A 81 81 0 0 1 216 110"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="15"
              strokeLinecap="round"
            />

            {/* Seamless Blended Gradient Gauge Arc */}
            <path
              d="M 54 110 A 81 81 0 0 1 216 110"
              fill="none"
              stroke="url(#speedometerBlendGradient)"
              strokeWidth="13"
              strokeLinecap="round"
            />

            {/* Gauge Zone Labels - Increased font size & weight */}
            <text x="34" y="114" fontSize="12.5" fontWeight="900" fill="#f43f5e" textAnchor="end">POOR</text>
            <text x="135" y="15" fontSize="13" fontWeight="900" fill="#d97706" textAnchor="middle">AVG</text>
            <text x="236" y="114" fontSize="12.5" fontWeight="900" fill="#10b981" textAnchor="start">GOOD</text>

            {/* Dynamic Animated Speedometer Needle */}
            <g
              style={{
                transform: `rotate(${needleRotation}deg)`,
                transformOrigin: "135px 110px",
                transition: "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
              filter="url(#needleGlow)"
            >
              {/* Shaft */}
              <line x1="135" y1="110" x2="135" y2="45" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" />
              {/* Colored Tip Dot */}
              <circle cx="135" cy="45" r="3.5" fill={needleAccentColor} />
            </g>

            {/* Center Pivot Hub */}
            <circle cx="135" cy="110" r="7.5" fill="#0f172a" stroke="#ffffff" strokeWidth="2.5" />
            <circle cx="135" cy="110" r="2.5" fill={needleAccentColor} />

            {/* Subtext under gauge - Increased font size & contrast */}
            <text x="135" y="139" fontSize="11" fontWeight="900" fill="#64748b" letterSpacing="1.5" textAnchor="middle">
              HEALTH INDICATOR
            </text>
          </svg>
        </div>
      </div>

      {/* Sentiment Metric Details */}
      {(() => {
        const statusStyle =
          config.shortLabel === "Average"
            ? "bg-amber-50/70 border-amber-200/80 text-amber-700"
            : config.shortLabel === "Good"
            ? "bg-emerald-50/70 border-emerald-200/80 text-emerald-700"
            : config.shortLabel === "Poor"
            ? "bg-rose-50/70 border-rose-200/80 text-rose-700"
            : "bg-slate-50 border-slate-200/80 text-slate-700";

        return (
          <div className={`p-3 rounded-xl border ${statusStyle} flex items-center justify-between`}>
            <span className="text-sm font-bold opacity-90">Sentiment Status</span>
            <span className="font-mono font-black text-base">
              {config.shortLabel}
            </span>
          </div>
        );
      })()}
    </div>
  );
};

export default ProjectDeliveryPacingCard;
