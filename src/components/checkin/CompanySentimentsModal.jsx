import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Smile,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Users,
  Building2,
  Home,
  RefreshCw,
  FolderGit2,
  Briefcase,
  ChevronRight,
  Filter,
  Download,
  Maximize2,
  Minimize2,
  Search,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import UserAvatar from "../ui/UserAvatar";
import Dropdown from "../ui/Dropdown";
import { checkinApi, subProjectApi } from "../../services/api";
import { formatDisplayName } from "../../utils/displayName";

const SENTIMENT_COLORS = {
  great: "#10b981", // Emerald
  okay: "#3b82f6",  // Blue
  low: "#f59e0b",   // Amber
  stressed: "#f43f5e", // Rose
};

const SENTIMENT_CONFIG = {
  great: { label: "Great", icon: "😁", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  okay: { label: "Okay", icon: "🙂", bg: "bg-blue-50 text-blue-700 border-blue-200" },
  low: { label: "Low", icon: "😟", bg: "bg-amber-50 text-amber-700 border-amber-200" },
  stressed: { label: "Stressed", icon: "😫", bg: "bg-rose-50 text-rose-700 border-rose-200" },
};

const getTodayStr = () => {
  const d = new Date();
  return d.toISOString().split("T")[0];
};

const roundPercent = (val, total) => {
  if (!total || total === 0) return 0;
  return Math.round((val / total) * 100);
};

const sumValues = (obj) => {
  if (!obj) return 0;
  return Object.values(obj).reduce((a, b) => a + b, 0);
};

const CompanySentimentsModal = ({ isOpen, onClose }) => {
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedWorkMode, setSelectedWorkMode] = useState("");
  const [activeTab, setActiveTab] = useState("daily"); // "daily" | "weekly" | "monthly"
  const [selectedMood, setSelectedMood] = useState("all"); // "all" | "great" | "okay" | "low" | "stressed"
  const [rosterSearch, setRosterSearch] = useState("");
  const [isMaximized, setIsMaximized] = useState(false);

  // Fetch Projects List for filter dropdown
  const { data: projectsData } = useQuery({
    queryKey: ["all-sub-projects"],
    queryFn: () => subProjectApi.getAll(),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });
  const projectsList = Array.isArray(projectsData) ? projectsData : (projectsData?.items || []);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["sentiment-analytics", selectedDate, selectedProject, selectedWorkMode],
    queryFn: () =>
      checkinApi.getSentimentAnalytics({
        target_date: selectedDate,
        project_id: selectedProject || undefined,
        work_mode: selectedWorkMode || undefined,
      }),
    enabled: isOpen,
    staleTime: 60 * 1000,
  });

  const handleShortcutDate = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const dailyData = data?.daily;
  const weeklyData = data?.weekly;
  const monthlyData = data?.monthly;
  const yearlyData = data?.yearly;

  const currentViewData =
    activeTab === "daily"
      ? dailyData
      : activeTab === "weekly"
      ? weeklyData
      : activeTab === "monthly"
      ? monthlyData
      : yearlyData;

  const dist = currentViewData?.distribution || { great: 0, okay: 0, low: 0, stressed: 0 };
  const total = currentViewData?.total_responses || 0;
  const positivity = currentViewData?.positivity_index || 0;
  const dominant = currentViewData?.dominant_sentiment || "None";
  const alertCount = (dist.low || 0) + (dist.stressed || 0);

  const employeesByMood = dailyData?.employees_by_mood || { great: [], okay: [], low: [], stressed: [] };
  const projectBreakdown = dailyData?.project_breakdown || [];

  const pieChartData = [
    { name: "Great 😁", key: "great", value: dist.great || 0, color: SENTIMENT_COLORS.great },
    { name: "Okay 🙂", key: "okay", value: dist.okay || 0, color: SENTIMENT_COLORS.okay },
    { name: "Low 😟", key: "low", value: dist.low || 0, color: SENTIMENT_COLORS.low },
    { name: "Stressed 😫", key: "stressed", value: dist.stressed || 0, color: SENTIMENT_COLORS.stressed },
  ].filter((d) => d.value > 0);

  const getPositivityBadge = (val) => {
    if (val >= 75) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (val >= 50) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  // Get displayed employees for active mood selection and search query
  const getActiveEmployeesList = () => {
    let list = [];
    if (selectedMood === "all") {
      list = [
        ...(employeesByMood.stressed || []).map((e) => ({ ...e, mood: "stressed" })),
        ...(employeesByMood.low || []).map((e) => ({ ...e, mood: "low" })),
        ...(employeesByMood.okay || []).map((e) => ({ ...e, mood: "okay" })),
        ...(employeesByMood.great || []).map((e) => ({ ...e, mood: "great" })),
      ];
    } else {
      list = (employeesByMood[selectedMood] || []).map((e) => ({ ...e, mood: selectedMood }));
    }

    if (rosterSearch.trim()) {
      const q = rosterSearch.toLowerCase();
      list = list.filter(
        (e) =>
          e.name?.toLowerCase().includes(q) ||
          e.designation?.toLowerCase().includes(q) ||
          e.project_names?.some((p) => p.toLowerCase().includes(q))
      );
    }

    return list;
  };

  const displayedEmployees = getActiveEmployeesList();

  // Export CSV Handler
  const handleExportCSV = () => {
    const rows = [
      ["Company Sentiments Analytics Report"],
      [`Date: ${selectedDate}`, `Month: ${data?.month_year || ""}`],
      [`Positivity Rate: ${positivity}%`, `Total Logged: ${total}`],
      [],
      ["EMPLOYEE MOOD ROSTER"],
      ["Employee Name", "Designation", "Work Mode", "Mood", "Projects"],
    ];

    const allEmps = [
      ...(employeesByMood.stressed || []).map((e) => ({ ...e, mood: "Stressed" })),
      ...(employeesByMood.low || []).map((e) => ({ ...e, mood: "Low" })),
      ...(employeesByMood.okay || []).map((e) => ({ ...e, mood: "Okay" })),
      ...(employeesByMood.great || []).map((e) => ({ ...e, mood: "Great" })),
    ];

    allEmps.forEach((e) => {
      rows.push([
        `"${e.name || ""}"`,
        `"${e.designation || ""}"`,
        `"${e.work_mode || ""}"`,
        `"${e.mood}"`,
        `"${(e.project_names || []).join(", ")}"`,
      ]);
    });

    rows.push([]);
    rows.push(["PROJECT MORALE BREAKDOWN"]);
    rows.push(["Project Name", "Total Check-ins", "Great", "Okay", "Low", "Stressed", "Positivity Index", "Health Status"]);

    projectBreakdown.forEach((p) => {
      rows.push([
        `"${p.project_name}"`,
        p.total,
        p.great || 0,
        p.okay || 0,
        p.low || 0,
        p.stressed || 0,
        `${p.positivity_index}%`,
        `"${p.health_status || ""}"`,
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((r) => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `company_sentiments_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={isMaximized ? "full" : "5xl"}
      maxHeight={isMaximized ? "98vh" : "94vh"}
      className={isMaximized ? "max-w-[98vw] w-full" : ""}
    >
      <Modal.Header onClose={onClose}>
        <div className="flex flex-col gap-3 pr-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-sm">
                <Smile className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Company Sentiments Analytics</h2>
                <p className="text-xs text-slate-500">
                  Morale insights, mood roster, and project health analysis
                </p>
              </div>
            </div>

            {/* Top Action Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Export CSV Button */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-sm transition-colors cursor-pointer"
                title="Export CSV Report"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export Report</span>
              </button>

              {/* Maximize Toggle */}
              <button
                type="button"
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                title={isMaximized ? "Restore size" : "Maximize view"}
              >
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Date Selector Shortcuts */}
              <div className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1.5 rounded-xl border border-slate-200/80">
                <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                />
              </div>
              <div className="hidden sm:flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedDate(getTodayStr())}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    selectedDate === getTodayStr()
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleShortcutDate(1)}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Yesterday
                </button>
              </div>
            </div>
          </div>

          {/* Scope Filters Bar: Project & Work Mode */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Filter className="w-3.5 h-3.5 text-slate-400" /> Scope Filters:
            </div>

            <div className="w-48">
              <Dropdown
                value={selectedProject}
                onChange={(v) => setSelectedProject(v)}
                placeholder="All Projects"
                options={[
                  { value: "", label: "All Projects" },
                  { value: "unassigned", label: "Idle / Unassigned" },
                  ...projectsList.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
            </div>

            <div className="w-36">
              <Dropdown
                value={selectedWorkMode}
                onChange={(v) => setSelectedWorkMode(v)}
                placeholder="All Modes"
                options={[
                  { value: "", label: "All Work Modes" },
                  { value: "WFO", label: "WFO (On-site)" },
                  { value: "WFH", label: "WFH (Remote)" },
                ]}
              />
            </div>

            {selectedProject || selectedWorkMode ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedProject("");
                  setSelectedWorkMode("");
                }}
                className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline px-1.5 py-1 cursor-pointer"
              >
                Reset filters
              </button>
            ) : (
              <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-2.5 py-1 rounded-lg flex items-center gap-1">
                🏢 Full Org Scope (Includes Allocated & Idle/Unassigned Employees)
              </span>
            )}
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="space-y-5 bg-slate-50/40">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("daily")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "daily"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Daily Breakdown ({selectedDate})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("weekly")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "weekly"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Weekly Trend (7 Days)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("monthly")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "monthly"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Monthly Trend ({data?.month_year || "Month"})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("yearly")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "yearly"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Annual Trend (Year {data?.year || ""})
            </button>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-slate-500">Calculating sentiment analytics...</p>
          </div>
        ) : isError ? (
          <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-2xl">
            <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-rose-700">Failed to load sentiment analytics</p>
            <p className="text-xs text-rose-500 mt-1">Please check connection or try selecting another date.</p>
          </div>
        ) : (
          <>
            {/* Executive Morale Insights Banner */}
            {/* {data?.executive_summary && (
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-2xl border border-indigo-800/50 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                      Executive Morale Insight
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-200 mt-0.5 leading-relaxed font-medium">
                      {data.executive_summary}
                    </p>
                  </div>
                </div>

                {dailyData?.positivity_delta !== undefined && (
                  <div className="shrink-0 flex items-center gap-2 bg-indigo-900/60 border border-indigo-700/60 px-3 py-2 rounded-xl">
                    <span className="text-[11px] text-indigo-200 font-medium">Day-over-Day Trend:</span>
                    <span
                      className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-md ${
                        dailyData.positivity_delta >= 0
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {dailyData.positivity_delta >= 0 ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}
                      {dailyData.positivity_delta >= 0 ? `+${dailyData.positivity_delta}%` : `${dailyData.positivity_delta}%`}
                    </span>
                  </div>
                )}
              </div>
            )} */}

            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Positivity Index */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Positivity Rate
                  </span>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900">{positivity}%</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getPositivityBadge(positivity)}`}>
                    {positivity >= 75 ? "Healthy" : positivity >= 50 ? "Moderate" : "Needs Attention"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Great + Okay mood responses
                </p>
              </div>

              {/* Dominant Sentiment */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Dominant Vibe
                  </span>
                  <Smile className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900">{dominant}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Most reported mood for this scope
                </p>
              </div>

              {/* Total Submissions */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total Logged
                  </span>
                  <Users className="w-4 h-4 text-sky-500" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900">{total}</span>
                  <span className="text-xs text-slate-500">check-ins</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Employees reporting mood
                </p>
              </div>

              {/* Stress & Low Alert */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Low / Stressed
                  </span>
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900">{alertCount}</span>
                  {total > 0 && (
                    <span className="text-xs font-semibold text-rose-600">
                      ({roundPercent(alertCount, total)}%)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Employees needing team support
                </p>
              </div>
            </div>

            {/* Charts & Breakdown Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Pie/Donut Chart & Sentiment List */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Smile className="w-4 h-4 text-rose-500" /> Sentiment Distribution
                </h3>

                {total === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-400 text-xs">
                    No sentiment logs for this selection.
                  </div>
                ) : (
                  <>
                    <div className="h-48 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {pieChartData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value, name) => [`${value} employees (${roundPercent(value, total)}%)`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-lg font-bold text-slate-900">{total}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Total</span>
                      </div>
                    </div>

                    {/* Detailed List */}
                    <div className="space-y-2 mt-2 pt-3 border-t border-slate-100">
                      {["great", "okay", "low", "stressed"].map((key) => {
                        const count = dist[key] || 0;
                        const pct = roundPercent(count, total);
                        const cfg = SENTIMENT_CONFIG[key];
                        const isSelected = selectedMood === key;
                        return (
                          <div
                            key={key}
                            onClick={() => setSelectedMood(isSelected ? "all" : key)}
                            className={`flex items-center justify-between text-xs p-1.5 rounded-lg cursor-pointer transition-colors ${
                              isSelected ? "bg-indigo-50/80 ring-1 ring-indigo-300" : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{cfg.icon}</span>
                              <span className="font-semibold text-slate-700">{cfg.label}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: SENTIMENT_COLORS[key],
                                  }}
                                />
                              </div>
                              <span className="font-mono text-slate-800 font-bold w-12 text-right">
                                {count} ({pct}%)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Trend Chart (Weekly / Monthly) or Work Mode breakdown (Daily) */}
              <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    {activeTab === "daily"
                      ? "Daily Work Mode Comparison (WFO vs WFH)"
                      : activeTab === "weekly"
                      ? "7-Day Sentiment Trend"
                      : activeTab === "monthly"
                      ? "Monthly Sentiment Trend"
                      : `Annual Sentiment Trend (${data?.year || "12 Months"})`}
                  </span>
                  <span className="text-xs font-normal text-slate-400">
                    {activeTab === "daily" ? selectedDate : currentViewData?.label || ""}
                  </span>
                </h3>

                {activeTab === "daily" ? (
                  <div className="flex-1 flex flex-col justify-center space-y-4 py-2">
                    {/* WFO Sentiment */}
                    <div className="bg-indigo-50/40 p-3.5 rounded-xl border border-indigo-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-indigo-600" />
                          <span className="font-bold text-indigo-900 text-sm">WFO (On-site) Employees</span>
                        </div>
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                          Total: {sumValues(dailyData?.by_work_mode?.wfo)}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {["great", "okay", "low", "stressed"].map((k) => (
                          <div key={k} className="bg-white p-2 rounded-lg border border-indigo-100 text-center">
                            <span className="text-base">{SENTIMENT_CONFIG[k].icon}</span>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5">
                              {SENTIMENT_CONFIG[k].label}
                            </p>
                            <p className="text-sm font-bold text-slate-900 mt-0.5">
                              {dailyData?.by_work_mode?.wfo?.[k] || 0}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* WFH Sentiment */}
                    <div className="bg-sky-50/40 p-3.5 rounded-xl border border-sky-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Home className="w-4 h-4 text-sky-600" />
                          <span className="font-bold text-sky-900 text-sm">WFH (Remote) Employees</span>
                        </div>
                        <span className="text-xs font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                          Total: {sumValues(dailyData?.by_work_mode?.wfh)}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {["great", "okay", "low", "stressed"].map((k) => (
                          <div key={k} className="bg-white p-2 rounded-lg border border-sky-100 text-center">
                            <span className="text-base">{SENTIMENT_CONFIG[k].icon}</span>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5">
                              {SENTIMENT_CONFIG[k].label}
                            </p>
                            <p className="text-sm font-bold text-slate-900 mt-0.5">
                              {dailyData?.by_work_mode?.wfh?.[k] || 0}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={currentViewData?.trends || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                        />
                        <Legend wrapperStyle={{ paddingTop: "8px", fontSize: "12px" }} />
                        <Bar dataKey="great" name="Great 😁" stackId="a" fill={SENTIMENT_COLORS.great} radius={[0, 0, 0, 0]} />
                        <Bar dataKey="okay" name="Okay 🙂" stackId="a" fill={SENTIMENT_COLORS.okay} radius={[0, 0, 0, 0]} />
                        <Bar dataKey="low" name="Low 😟" stackId="a" fill={SENTIMENT_COLORS.low} radius={[0, 0, 0, 0]} />
                        <Bar dataKey="stressed" name="Stressed 😫" stackId="a" fill={SENTIMENT_COLORS.stressed} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Employee Roster by Mood */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Employee Mood Roster ({selectedDate})
                  </h3>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                    {displayedEmployees.length} employee{displayedEmployees.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Roster Search Input */}
                  <div className="relative w-full sm:w-48">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search employee or role..."
                      value={rosterSearch}
                      onChange={(e) => setRosterSearch(e.target.value)}
                      className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Mood Filter Tabs */}
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedMood("all")}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        selectedMood === "all"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      All ({total})
                    </button>
                    {["great", "okay", "low", "stressed"].map((key) => {
                      const cfg = SENTIMENT_CONFIG[key];
                      const cnt = (employeesByMood[key] || []).length;
                      const isSel = selectedMood === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedMood(key)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                            isSel
                              ? `${cfg.bg} ring-2 ring-indigo-500/20`
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span>{cfg.icon}</span>
                          <span>{cfg.label}</span>
                          <span className="font-mono text-[11px] opacity-80">({cnt})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Roster Cards Grid */}
              {displayedEmployees.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  {rosterSearch ? `No employee check-in sentiment logs match "${rosterSearch}".` : "No employee check-in sentiment logs found for this filter."}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
                  {displayedEmployees.map((emp) => {
                    const cfg = SENTIMENT_CONFIG[emp.mood] || SENTIMENT_CONFIG.okay;
                    return (
                      <div
                        key={emp.employee_id}
                        className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all"
                      >
                        <UserAvatar src={emp.avatar_url} name={emp.name} size="w-9 h-9 text-xs shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {formatDisplayName(emp.name)}
                            </h4>
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.bg}`}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </div>
                          {emp.designation && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">{emp.designation}</p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded ${emp.work_mode === "WFH" ? "bg-sky-50 text-sky-700" : "bg-indigo-50 text-indigo-700"}`}>
                              {emp.work_mode === "WFH" ? <Home className="w-2.5 h-2.5" /> : <Building2 className="w-2.5 h-2.5" />}
                              {emp.work_mode}
                            </span>
                            {emp.project_names?.length > 0 ? (
                              <span
                                className={`truncate font-medium ${
                                  emp.project_names.includes("Idle / Unassigned")
                                    ? "text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"
                                    : "text-slate-500"
                                }`}
                                title={emp.project_names.join(", ")}
                              >
                                📁 {emp.project_names.join(", ")}
                              </span>
                            ) : (
                              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-medium">
                                📁 Idle / Unassigned
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Project Morale Health Ranking Table */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-violet-600" />
                  <h3 className="text-sm font-bold text-slate-900">Project Morale Health Ranking</h3>
                </div>
                <span className="text-xs text-slate-400">{projectBreakdown.length} projects analyzed</span>
              </div>

              {projectBreakdown.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No project breakdown data for today's check-ins.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase font-mono text-[10px]">
                        <th className="py-2 px-3">Project Name</th>
                        <th className="py-2 px-3 text-center">Status</th>
                        <th className="py-2 px-3 text-center">Total Responses</th>
                        <th className="py-2 px-3 text-center">Great 😁</th>
                        <th className="py-2 px-3 text-center">Okay 🙂</th>
                        <th className="py-2 px-3 text-center">Low 😟</th>
                        <th className="py-2 px-3 text-center">Stressed 😫</th>
                        <th className="py-2 px-3 text-right">Positivity Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {projectBreakdown.map((p) => (
                        <tr key={p.project_id} className={`transition-colors ${p.project_id === "unassigned" ? "bg-amber-50/30 hover:bg-amber-50/60" : "hover:bg-slate-50/70"}`}>
                          <td className="py-2.5 px-3 font-semibold text-slate-800 flex items-center gap-2">
                            {p.project_id === "unassigned" ? (
                              <Users className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            ) : (
                              <Briefcase className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            )}
                            <span className="truncate">{p.project_name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                p.positivity_index >= 75
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : p.positivity_index >= 50
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                            >
                              {p.health_badge || (p.positivity_index >= 75 ? "🟢 Healthy" : p.positivity_index >= 50 ? "🟡 Moderate" : "🔴 At-Risk")}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">{p.total}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-emerald-600 font-semibold">{p.great || 0}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-blue-600 font-semibold">{p.okay || 0}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-amber-600 font-semibold">{p.low || 0}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-rose-600 font-semibold">{p.stressed || 0}</td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${p.positivity_index >= 75 ? "bg-emerald-500" : p.positivity_index >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                                  style={{ width: `${p.positivity_index}%` }}
                                />
                              </div>
                              <span className="font-mono font-bold text-slate-900 w-10 text-right">{p.positivity_index}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </Modal.Body>

      <Modal.Footer align="end">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CompanySentimentsModal;
