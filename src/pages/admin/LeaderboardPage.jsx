import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { analyticsApi, authApi } from "../../services/api";
import UserAvatar from "../../components/ui/UserAvatar";
import {
  Trophy,
  Crown,
  Medal,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Zap,
  CalendarDays,
  Sparkles,
  Info,
  Folder,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { formatDisplayName } from "../../utils/displayName";

// Utility component to render Rank Change indicators styled with modern app pill aesthetics
const RankChangeBadge = ({ currentRank, prevRank, hasPrevData }) => {
  if (!hasPrevData) return null;

  if (prevRank === undefined || prevRank === null) {
    return (
      <span
        className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs font-mono text-[10px] font-black uppercase tracking-wider"
        title="New entry compared to previous period"
      >
        <span className="text-[8px] text-emerald-600">▲</span> NEW
      </span>
    );
  }

  const diff = prevRank - currentRank;
  if (diff > 0) {
    return (
      <span
        className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-50/90 text-emerald-700 border border-emerald-200/80 shadow-2xs font-mono text-[11px] font-black"
        title={`Climbed ${diff} spot${diff > 1 ? "s" : ""} from #${prevRank} in previous period`}
      >
        <span className="text-[8px] text-emerald-600">▲</span>+{diff}
      </span>
    );
  }
  if (diff < 0) {
    return (
      <span
        className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-rose-50/90 text-rose-700 border border-rose-200/80 shadow-2xs font-mono text-[11px] font-black"
        title={`Dropped ${Math.abs(diff)} spot${Math.abs(diff) > 1 ? "s" : ""} from #${prevRank} in previous period`}
      >
        <span className="text-[8px] text-rose-600">▼</span>{diff}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-slate-100/90 text-slate-400 border border-slate-200/80 font-mono text-[10px] font-bold"
      title="Unchanged position from previous period"
    >
      —
    </span>
  );
};

// Utility to format name to show only First and Last name (omitting middle names)
const formatFirstAndLastName = (name, email) => {
  const full = (name || formatDisplayName(email) || "").trim();
  if (!full) return "";
  const parts = full.split(/\s+/);
  if (parts.length <= 2) return full;
  return `${parts[0]} ${parts[parts.length - 1]}`;
};

// 🌟 Skeleton Loader for Podium Showcase Cards
const PodiumSkeleton = ({ theme = "indigo" }) => {
  const cardBorder = theme === "amber" ? "border-amber-300/60 bg-white/70" : "border-indigo-300/60 bg-white/70";

  return (
    <div className="px-1 py-1 w-full animate-pulse">
      <div className="grid grid-cols-3 items-stretch gap-2.5 sm:gap-3 max-w-xl mx-auto">
        {/* 2nd Place Skeleton */}
        <div className={`flex flex-col items-center justify-between border-2 rounded-2xl p-2.5 relative text-center min-h-[175px] ${cardBorder}`}>
          <div className="w-8 h-4 bg-slate-200/90 rounded-full mb-1" />
          <div className="w-18 h-18 rounded-full bg-slate-200/90 my-1" />
          <div className="w-20 h-3 bg-slate-200/90 rounded-md my-1" />
          <div className="w-14 h-5 rounded-full bg-slate-200/90 mt-1" />
        </div>

        {/* 1st Place Skeleton */}
        <div className={`flex flex-col items-center justify-between border-2 rounded-2xl p-3 relative text-center min-h-[195px] ${cardBorder}`}>
          <div className="w-14 h-4 bg-slate-200/90 rounded-full mb-1" />
          <div className="w-22 h-22 rounded-full bg-slate-200/90 my-1" />
          <div className="w-24 h-3.5 bg-slate-200/90 rounded-md my-1" />
          <div className="w-16 h-6 rounded-full bg-slate-200/90 mt-1" />
        </div>

        {/* 3rd Place Skeleton */}
        <div className={`flex flex-col items-center justify-between border-2 rounded-2xl p-2.5 relative text-center min-h-[175px] ${cardBorder}`}>
          <div className="w-8 h-4 bg-slate-200/90 rounded-full mb-1" />
          <div className="w-18 h-18 rounded-full bg-slate-200/90 my-1" />
          <div className="w-20 h-3 bg-slate-200/90 rounded-md my-1" />
          <div className="w-14 h-5 rounded-full bg-slate-200/90 mt-1" />
        </div>
      </div>
    </div>
  );
};

// 🌟 Skeleton Loader for Table Rows
const TableSkeleton = ({ rows = 5 }) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden divide-y divide-slate-100 w-full animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-1 sm:px-3 sm:py-1 h-9 bg-white"
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-slate-200/80" />
            <div className="w-8 h-8 rounded-full bg-slate-200/80" />
            <div className="w-28 sm:w-36 h-3.5 bg-slate-200/80 rounded-md" />
          </div>
          <div className="w-12 h-5 rounded-full bg-slate-200/80" />
        </div>
      ))}
    </div>
  );
};

// Utility to get project name from item
const getProjectName = (item) => {
  if (!item) return "General";
  if (item.project_name) return item.project_name;
  if (item.project) return typeof item.project === "string" ? item.project : item.project.name;
  if (item.sub_project_name) return item.sub_project_name;
  if (Array.isArray(item.projects) && item.projects.length > 0) {
    const names = item.projects.map((p) => (typeof p === "string" ? p : p.name || p.title || "")).filter(Boolean);
    if (names.length > 0) return names.join(", ");
  }
  return "General";
};

// Utility to generate past N months for historical navigation
const generatePastMonths = (count = 12) => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const monthNum = String(d.getMonth() + 1).padStart(2, "0");
    const key = `${year}-${monthNum}`;
    const dateFrom = `${year}-${monthNum}-01`;
    const lastDay = new Date(year, d.getMonth() + 1, 0).getDate();
    const dateTo = `${year}-${monthNum}-${String(lastDay).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const shortLabel = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });

    months.push({
      key,
      label,
      shortLabel,
      isCurrent: i === 0,
      dateFrom,
      dateTo,
    });
  }
  return months;
};

// Utility to generate past N weeks for historical navigation
const generatePastWeeks = (count = 12) => {
  const weeks = [];
  const now = new Date();

  // Find Monday of current week
  const dayOfWeek = now.getDay();
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() - distanceToMonday);
  currentMonday.setHours(0, 0, 0, 0);

  for (let i = 0; i < count; i++) {
    const mon = new Date(currentMonday);
    mon.setDate(currentMonday.getDate() - i * 7);

    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);

    const formatYMD = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const dateFrom = formatYMD(mon);
    const dateTo = formatYMD(sun);

    const monStr = mon.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const sunStr = sun.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const label = `${monStr} – ${sunStr}`;
    const key = `week-${dateFrom}`;

    weeks.push({
      key,
      label,
      isCurrent: i === 0,
      dateFrom,
      dateTo,
    });
  }
  return weeks;
};

// 🌟 Reusable Stunning Top Rankings Cards Component
const TopRankingsCards = ({
  data,
  userRankItem,
  isLoading,
  emptyTitle,
  emptySub,
  activeTabLabel,
  prevRankMap = {},
  hasPrevData = false,
}) => {
  if (isLoading) {
    return <TableSkeleton rows={4} />;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const currentEmailClean = userRankItem?.user_email?.toLowerCase().trim();

  return (
    <div className="space-y-2">
      {/* Top 4-10 Table Container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Rows Stack */}
        <div className="divide-y divide-slate-100">
          {data.map((row, idx) => {
            const isUser =
              currentEmailClean &&
              row.user_email?.toLowerCase().trim() === currentEmailClean;

            return (
              <div
                key={row.rank}
                className={`group flex flex-col sm:grid sm:grid-cols-12 items-center gap-2 p-1 sm:px-3 sm:py-1 transition-all duration-150 ${isUser
                  ? "bg-indigo-50/60 ring-2 ring-indigo-400/40 z-10"
                  : idx % 2 === 0
                    ? "bg-white hover:bg-indigo-50/30"
                    : "bg-slate-50/40 hover:bg-indigo-50/30"
                  }`}
              >
                {/* Rank Badge */}
                <div className="sm:col-span-1 flex items-center justify-center">
                  <span className="w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center font-mono bg-slate-100 text-slate-600 border border-slate-200/80 group-hover:border-indigo-300 group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors">
                    #{row.rank}
                  </span>
                </div>

                {/* Employee Profile */}
                <div className="sm:col-span-8 flex items-center gap-3 min-w-0 w-full">
                  <UserAvatar
                    src={row.avatar_url}
                    name={row.employee_name || row.user_email}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm truncate">
                        {formatFirstAndLastName(row.employee_name, row.user_email)}
                      </span>
                      <RankChangeBadge
                        currentRank={row.rank}
                        prevRank={prevRankMap[(row.user_email || "").toLowerCase().trim()]}
                        hasPrevData={hasPrevData}
                      />
                      {isUser && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                          YOU
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hours Logged */}
                <div className="sm:col-span-3 text-left sm:text-right w-full pr-2">
                  <span className="font-mono text-base font-extrabold text-indigo-900">
                    {row.active_hours}h
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🌟 Hovering Rank Cell for Logged-In User below bottom of list */}
      {userRankItem && (
        <div className="pt-0.5">
          <div className="group relative flex flex-col sm:grid sm:grid-cols-12 items-center gap-3 p-2.5 sm:px-4 sm:py-2.5 rounded-2xl bg-white border-2 border-indigo-400/90 shadow-lg shadow-indigo-500/10 ring-4 ring-indigo-500/10 transition-all duration-300 hover:-translate-y-0.5 cursor-default">
            <div className="sm:col-span-1 flex items-center justify-center">
              <span className="w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center font-mono bg-indigo-600 text-white shadow-xs">
                #{userRankItem.rank}
              </span>
            </div>

            <div className="sm:col-span-8 flex items-center gap-3 min-w-0 w-full">
              <UserAvatar
                src={userRankItem.avatar_url}
                name={userRankItem.employee_name || userRankItem.user_email}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm truncate">
                    {formatFirstAndLastName(userRankItem.employee_name, userRankItem.user_email)}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                    YOU
                  </span>
                </div>
              </div>
            </div>

            <div className="sm:col-span-3 text-left sm:text-right w-full pr-2">
              <span className="font-mono text-base font-extrabold text-indigo-900">
                {userRankItem.active_hours}h
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LeaderboardPage = () => {
  const [activeTab, setActiveTab] = useState("monthly"); // "monthly" | "weekly"

  // ── Auth User Query & Extraction ──
  const { data: meData } = useQuery({
    queryKey: ["auth-me"],
    queryFn: () => authApi.me(),
    staleTime: 5 * 60 * 1000,
  });

  const currentUser = useMemo(() => {
    if (meData?.user) return meData.user;
    if (meData?.email) return meData;
    try {
      const stored = localStorage.getItem("user");
      if (stored) return JSON.parse(stored);
    } catch { }
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const decoded = typeof atob !== "undefined" ? atob(base64) : Buffer.from(base64, "base64").toString("binary");
        return JSON.parse(decoded);
      }
    } catch { }
    return null;
  }, [meData]);

  const currentUserRole = useMemo(() => {
    let role = currentUser?.role || meData?.role || meData?.user?.role;
    if (!role) {
      try {
        role = localStorage.getItem("role");
      } catch { }
    }
    return (role || "").toLowerCase().trim();
  }, [currentUser, meData]);

  const isAdmin = currentUserRole === "admin" || currentUserRole === "superadmin" || currentUserRole === "hr" || currentUserRole === "pm";

  const currentUserEmail = useMemo(() => {
    const email = currentUser?.email || currentUser?.user_email || currentUser?.sub || "";
    return (email || "").toLowerCase().trim();
  }, [currentUser]);

  const currentUserName = useMemo(() => {
    const name = currentUser?.name || currentUser?.employee_name || currentUser?.full_name || "";
    return (name || "").toLowerCase().trim();
  }, [currentUser]);

  // ── Monthly State & Query ──
  const pastMonths = useMemo(() => generatePastMonths(12), []);
  const currentMonthKey = pastMonths[0]?.key || "";
  const [selectedMonthKey, setSelectedMonthKey] = useState(currentMonthKey);

  const activeMonth = useMemo(
    () => pastMonths.find((m) => m.key === selectedMonthKey) || pastMonths[0],
    [selectedMonthKey, pastMonths]
  );

  const activeMonthIndex = useMemo(
    () => pastMonths.findIndex((m) => m.key === selectedMonthKey),
    [selectedMonthKey, pastMonths]
  );

  const monthParams = useMemo(
    () => ({
      range: "custom",
      date_from: activeMonth.dateFrom,
      date_to: activeMonth.dateTo,
    }),
    [activeMonth]
  );

  const { data: monthData, isLoading: isMonthLoading, isFetching: isMonthFetching } = useQuery({
    queryKey: ["admin-leaderboard-month", monthParams],
    queryFn: () => analyticsApi.getLeaderboard(monthParams),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  const allMonthLeaderboard = monthData?.leaderboard || [];
  const hasMonthData = !isMonthLoading && allMonthLeaderboard.length > 0;

  const filteredMonthLeaderboard = useMemo(() => {
    let list = [...allMonthLeaderboard];
    list.sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0));
    list = list.slice(0, 10);

    const maxHours = list[0] ? Number(list[0].total_hours) || 0 : 0;
    const totalHours = list.reduce(
      (sum, item) => sum + (Number(item.total_hours) || 0),
      0
    );

    return list.map((item, idx) => {
      const hrs = Number(item.total_hours) || 0;
      const sharePct =
        totalHours > 0
          ? Math.round((hrs / totalHours) * 1000) / 10
          : 0;
      const barWidth =
        maxHours > 0
          ? Math.min(100, Math.max(4, Math.round((hrs / maxHours) * 100)))
          : 0;

      return {
        ...item,
        rank: idx + 1,
        active_hours: hrs,
        share_percentage: sharePct,
        bar_width_pct: barWidth,
      };
    });
  }, [allMonthLeaderboard]);

  // Full Month User Rank Calculation
  const userMonthRankItem = useMemo(() => {
    if (isAdmin || allMonthLeaderboard.length === 0) return null;
    let list = [...allMonthLeaderboard];
    list.sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0));

    const maxHours = list[0] ? Number(list[0].total_hours) || 0 : 0;
    const totalHours = list.reduce(
      (sum, item) => sum + (Number(item.total_hours) || 0),
      0
    );

    let userIndex = -1;
    if (currentUserEmail) {
      userIndex = list.findIndex((item) => {
        const itemEmail = (item.user_email || "").toLowerCase().trim();
        return itemEmail && (itemEmail === currentUserEmail || currentUserEmail.includes(itemEmail) || itemEmail.includes(currentUserEmail));
      });
    }

    if (userIndex === -1 && currentUserName) {
      userIndex = list.findIndex((item) => {
        const itemObjName = (item.employee_name || formatDisplayName(item.user_email || "")).toLowerCase().trim();
        return itemObjName && (itemObjName === currentUserName || currentUserName.includes(itemObjName) || itemObjName.includes(currentUserName));
      });
    }

    if (userIndex !== -1) {
      const item = list[userIndex];
      const hrs = Number(item.total_hours) || 0;
      const sharePct =
        totalHours > 0
          ? Math.round((hrs / totalHours) * 1000) / 10
          : 0;
      const barWidth =
        maxHours > 0
          ? Math.min(100, Math.max(4, Math.round((hrs / maxHours) * 100)))
          : 0;

      return {
        ...item,
        rank: userIndex + 1,
        active_hours: hrs,
        share_percentage: sharePct,
        bar_width_pct: barWidth,
      };
    }

    // Always fallback to logged-in user profile if user is logged in
    if (currentUser || currentUserEmail) {
      const email = currentUserEmail || currentUser?.email || currentUser?.user_email || "user@autonex.ai";
      const name = currentUserName || currentUser?.name || formatDisplayName(email);
      return {
        user_email: email,
        employee_name: name,
        avatar_url: currentUser?.avatar_url || "",
        rank: list.length + 1,
        active_hours: 0,
        annotation_hours: 0,
        review_hours: 0,
        share_percentage: 0,
        bar_width_pct: 0,
        isUnranked: true,
      };
    }

    return null;
  }, [allMonthLeaderboard, currentUserEmail, currentUserName, currentUser, isAdmin]);

  const top3Month = useMemo(
    () => filteredMonthLeaderboard.slice(0, 3),
    [filteredMonthLeaderboard]
  );

  const canGoPrevMonth = activeMonthIndex < pastMonths.length - 1;
  const canGoNextMonth = activeMonthIndex > 0;

  const handlePrevMonthClick = () => {
    if (activeMonthIndex < pastMonths.length - 1) {
      setSelectedMonthKey(pastMonths[activeMonthIndex + 1].key);
    }
  };

  const handleNextMonthClick = () => {
    if (activeMonthIndex > 0) {
      setSelectedMonthKey(pastMonths[activeMonthIndex - 1].key);
    }
  };

  // ── Previous Month Query for Rank Change Comparison ──
  const prevMonthObj = pastMonths[activeMonthIndex + 1] || null;
  const prevMonthParams = useMemo(
    () =>
      prevMonthObj
        ? {
          range: "custom",
          date_from: prevMonthObj.dateFrom,
          date_to: prevMonthObj.dateTo,
        }
        : null,
    [prevMonthObj]
  );

  const { data: prevMonthData } = useQuery({
    queryKey: ["admin-leaderboard-month-prev", prevMonthParams],
    queryFn: () => (prevMonthParams ? analyticsApi.getLeaderboard(prevMonthParams) : null),
    enabled: !!prevMonthParams,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  const prevMonthRankMap = useMemo(() => {
    const list = prevMonthData?.leaderboard || [];
    if (list.length === 0) return {};
    const sorted = [...list].sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0));
    const map = {};
    sorted.forEach((item, idx) => {
      const email = (item.user_email || "").toLowerCase().trim();
      if (email) map[email] = idx + 1;
    });
    return map;
  }, [prevMonthData]);

  const hasPrevMonthData = Object.keys(prevMonthRankMap).length > 0;

  // ── Weekly State & Query ──
  const pastWeeks = useMemo(() => generatePastWeeks(12), []);
  const currentWeekKey = pastWeeks[0]?.key || "";
  const [selectedWeekKey, setSelectedWeekKey] = useState(currentWeekKey);

  const activeWeek = useMemo(
    () => pastWeeks.find((w) => w.key === selectedWeekKey) || pastWeeks[0],
    [selectedWeekKey, pastWeeks]
  );

  const activeWeekIndex = useMemo(
    () => pastWeeks.findIndex((w) => w.key === selectedWeekKey),
    [selectedWeekKey, pastWeeks]
  );

  const weekParams = useMemo(
    () => ({
      range: "custom",
      date_from: activeWeek.dateFrom,
      date_to: activeWeek.dateTo,
    }),
    [activeWeek]
  );

  // ── Overall (Yearly) Query & Top 3 ──
  const { data: overallData, isLoading: isOverallLoading, isFetching: isOverallFetching } = useQuery({
    queryKey: ["admin-leaderboard-overall"],
    queryFn: () => analyticsApi.getLeaderboard({ range: "year" }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  const top3Overall = useMemo(() => {
    let list = [...(overallData?.leaderboard || [])];
    list.sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0));
    return list.slice(0, 3);
  }, [overallData]);

  // ── Previous Week Query for Rank Change Comparison ──
  const prevWeekObj = pastWeeks[activeWeekIndex + 1] || null;
  const prevWeekParams = useMemo(
    () =>
      prevWeekObj
        ? {
          range: "custom",
          date_from: prevWeekObj.dateFrom,
          date_to: prevWeekObj.dateTo,
        }
        : null,
    [prevWeekObj]
  );

  const { data: prevWeekData } = useQuery({
    queryKey: ["admin-leaderboard-week-prev", prevWeekParams],
    queryFn: () => (prevWeekParams ? analyticsApi.getLeaderboard(prevWeekParams) : null),
    enabled: !!prevWeekParams,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  const prevWeekRankMap = useMemo(() => {
    const list = prevWeekData?.leaderboard || [];
    if (list.length === 0) return {};
    const sorted = [...list].sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0));
    const map = {};
    sorted.forEach((item, idx) => {
      const email = (item.user_email || "").toLowerCase().trim();
      if (email) map[email] = idx + 1;
    });
    return map;
  }, [prevWeekData]);

  const hasPrevWeekData = Object.keys(prevWeekRankMap).length > 0;

  const { data: weekData, isLoading: isWeekLoading, isFetching: isWeekFetching } = useQuery({
    queryKey: ["admin-leaderboard-week", weekParams],
    queryFn: () => analyticsApi.getLeaderboard(weekParams),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  const allWeekLeaderboard = weekData?.leaderboard || [];
  const hasWeekData = !isWeekLoading && allWeekLeaderboard.length > 0;

  const filteredWeekLeaderboard = useMemo(() => {
    let list = [...allWeekLeaderboard];
    list.sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0));
    list = list.slice(0, 10);

    const maxHours = list[0] ? Number(list[0].total_hours) || 0 : 0;
    const totalHours = list.reduce(
      (sum, item) => sum + (Number(item.total_hours) || 0),
      0
    );

    return list.map((item, idx) => {
      const hrs = Number(item.total_hours) || 0;
      const sharePct =
        totalHours > 0
          ? Math.round((hrs / totalHours) * 1000) / 10
          : 0;
      const barWidth =
        maxHours > 0
          ? Math.min(100, Math.max(4, Math.round((hrs / maxHours) * 100)))
          : 0;

      return {
        ...item,
        rank: idx + 1,
        active_hours: hrs,
        share_percentage: sharePct,
        bar_width_pct: barWidth,
      };
    });
  }, [allWeekLeaderboard]);

  // Full Week User Rank Calculation
  const userWeekRankItem = useMemo(() => {
    if (isAdmin || allWeekLeaderboard.length === 0) return null;
    let list = [...allWeekLeaderboard];
    list.sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0));

    const maxHours = list[0] ? Number(list[0].total_hours) || 0 : 0;
    const totalHours = list.reduce(
      (sum, item) => sum + (Number(item.total_hours) || 0),
      0
    );

    let userIndex = -1;
    if (currentUserEmail) {
      userIndex = list.findIndex((item) => {
        const itemEmail = (item.user_email || "").toLowerCase().trim();
        return itemEmail && (itemEmail === currentUserEmail || currentUserEmail.includes(itemEmail) || itemEmail.includes(currentUserEmail));
      });
    }

    if (userIndex === -1 && currentUserName) {
      userIndex = list.findIndex((item) => {
        const itemObjName = (item.employee_name || formatDisplayName(item.user_email || "")).toLowerCase().trim();
        return itemObjName && (itemObjName === currentUserName || currentUserName.includes(itemObjName) || itemObjName.includes(currentUserName));
      });
    }

    if (userIndex !== -1) {
      const item = list[userIndex];
      const hrs = Number(item.total_hours) || 0;
      const sharePct =
        totalHours > 0
          ? Math.round((hrs / totalHours) * 1000) / 10
          : 0;
      const barWidth =
        maxHours > 0
          ? Math.min(100, Math.max(4, Math.round((hrs / maxHours) * 100)))
          : 0;

      return {
        ...item,
        rank: userIndex + 1,
        active_hours: hrs,
        share_percentage: sharePct,
        bar_width_pct: barWidth,
      };
    }

    // Always fallback to logged-in user profile if user is logged in
    if (currentUser || currentUserEmail) {
      const email = currentUserEmail || currentUser?.email || currentUser?.user_email || "user@autonex.ai";
      const name = currentUserName || currentUser?.name || formatDisplayName(email);
      return {
        user_email: email,
        employee_name: name,
        avatar_url: currentUser?.avatar_url || "",
        rank: list.length + 1,
        active_hours: 0,
        annotation_hours: 0,
        review_hours: 0,
        share_percentage: 0,
        bar_width_pct: 0,
        isUnranked: true,
      };
    }

    return null;
  }, [allWeekLeaderboard, currentUserEmail, currentUserName, currentUser, isAdmin]);

  const top3Week = useMemo(
    () => filteredWeekLeaderboard.slice(0, 3),
    [filteredWeekLeaderboard]
  );

  const canGoPrevWeek = activeWeekIndex < pastWeeks.length - 1;
  const canGoNextWeek = activeWeekIndex > 0;

  const handlePrevWeekClick = () => {
    if (activeWeekIndex < pastWeeks.length - 1) {
      setSelectedWeekKey(pastWeeks[activeWeekIndex + 1].key);
    }
  };

  const handleNextWeekClick = () => {
    if (activeWeekIndex > 0) {
      setSelectedWeekKey(pastWeeks[activeWeekIndex - 1].key);
    }
  };

  // ── Monthly aliases ──
  const top3Month_ = top3Month;
  const canGoPrevMonth_ = canGoPrevMonth;
  const canGoNextMonth_ = canGoNextMonth;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

      {/* ════════════════════════════════════════════
          MONTHLY TOPPERS — Podium section
          ════════════════════════════════════════════ */}
      <div className="space-y-2">
        {/* Section heading */}
        <div className="flex items-center justify-center px-1 mb-1">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-1 rounded-full bg-indigo-100/90 border border-indigo-300/80 shadow-2xs">
            <Zap className="w-4 h-4 text-indigo-700 fill-indigo-600/30" />
            <h2 className="text-sm font-black text-indigo-950 uppercase tracking-wider font-mono">Monthly Performers</h2>
          </div>
        </div>

        {/* ── Podium Card ── */}
        <div className="bg-gradient-to-b from-indigo-100 via-indigo-50/90 to-purple-100/60 border-2 border-indigo-500/80 ring-2 ring-indigo-400/30 rounded-3xl shadow-md shadow-indigo-500/10 relative p-3 min-h-[215px] flex flex-col justify-between">
          {/* Month Label Header */}
          <div className="flex items-center justify-center mb-2.5">
            {activeMonth.isCurrent ? (
              <div className="inline-flex items-center justify-center px-5 py-1 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 border border-indigo-300 shadow-md ring-4 ring-indigo-500/30">
                <span className="text-sm sm:text-base font-black text-white uppercase tracking-widest font-mono">
                  {activeMonth.label}
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center justify-center px-5 py-1 rounded-full bg-indigo-900 border border-indigo-700 shadow-sm">
                <span className="text-sm sm:text-base font-black text-white uppercase tracking-widest font-mono">
                  {activeMonth.label}
                </span>
              </div>
            )}
          </div>

          {/* Vertically Centered Side Nav Arrows */}
          <button
            type="button"
            onClick={handlePrevMonthClick}
            disabled={!canGoPrevMonth_}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-md hover:bg-white hover:text-indigo-600 active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer backdrop-blur-xs"
            title="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleNextMonthClick}
            disabled={!canGoNextMonth_}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-md hover:bg-white hover:text-indigo-600 active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer backdrop-blur-xs"
            title="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Podium Grid OR Loading Skeleton OR Empty State */}
          {isMonthLoading || isMonthFetching ? (
            <div className="space-y-2">
              <PodiumSkeleton theme="indigo" />
              <div className="mt-2">
                <TableSkeleton rows={7} />
              </div>
            </div>
          ) : top3Month_.length > 0 ? (
            <div className="px-1 py-1">
              <div className="grid grid-cols-3 items-stretch gap-2.5 sm:gap-3 max-w-xl mx-auto">
                {/* 2nd Place (Silver) */}
                {top3Month_[1] ? (
                  <div className="flex flex-col items-center justify-between bg-gradient-to-b from-slate-200/90 via-slate-100/70 to-white/95 border-2 border-slate-400/80 rounded-2xl p-2.5 shadow-xs relative text-center">
                    <span className="absolute -top-2.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-slate-500 via-slate-600 to-slate-800 text-white font-black text-[10px] uppercase tracking-wider shadow-xs border border-white">
                      #2
                    </span>
                    <div className="mt-2 mb-1.5 relative">
                      <div className="rounded-full ring-4 ring-slate-400/90 p-[3px] bg-gradient-to-b from-slate-300 via-slate-100 to-white shadow-xs">
                        <UserAvatar
                          src={top3Month_[1]?.avatar_url}
                          name={top3Month_[1].employee_name || top3Month_[1].user_email}
                          size="w-18 h-18 text-lg"
                        />
                      </div>
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 truncate max-w-[120px] mb-0.5">
                      {formatFirstAndLastName(top3Month_[1].employee_name, top3Month_[1].user_email)}
                    </h3>
                    <div className="flex items-center gap-1 mb-1">
                      <RankChangeBadge
                        currentRank={2}
                        prevRank={prevMonthRankMap[(top3Month_[1]?.user_email || "").toLowerCase().trim()]}
                        hasPrevData={hasPrevMonthData}
                      />
                    </div>
                    <div className="font-mono text-base font-black text-slate-900 bg-slate-200/90 px-2.5 py-0.5 rounded-full border border-slate-300 shadow-2xs">
                      {top3Month_[1].total_hours || 0}h
                    </div>
                  </div>
                ) : (
                  <div />
                )}

                {/* 1st Place (Champion) */}
                {top3Month_[0] && (
                  <div className="flex flex-col items-center justify-between bg-gradient-to-b from-amber-100/70 via-amber-50/30 to-white/95 border-2 border-amber-300/80 rounded-2xl p-3 shadow-md shadow-amber-500/10 relative text-center ring-1 ring-amber-400/20">
                    <span className="absolute -top-2.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white font-black text-[10px] uppercase tracking-wider shadow-xs flex items-center gap-1 border border-white">
                      <Trophy className="w-3 h-3 text-amber-100" /> #1 MVP
                    </span>
                    <div className="mt-2 mb-1.5 relative">
                      <div className="rounded-full ring-4 ring-amber-400/90 p-[3px] bg-gradient-to-b from-amber-200 to-white shadow-md shadow-amber-500/20">
                        <UserAvatar
                          src={top3Month_[0]?.avatar_url}
                          name={top3Month_[0].employee_name || top3Month_[0].user_email}
                          size="w-22 h-22 text-2xl font-bold"
                        />
                      </div>
                    </div>
                    <h3 className="text-sm font-black text-slate-900 truncate max-w-[140px] mb-0.5">
                      {formatFirstAndLastName(top3Month_[0].employee_name, top3Month_[0].user_email)}
                    </h3>
                    <div className="flex items-center gap-1 mb-1">
                      <RankChangeBadge
                        currentRank={1}
                        prevRank={prevMonthRankMap[(top3Month_[0]?.user_email || "").toLowerCase().trim()]}
                        hasPrevData={hasPrevMonthData}
                      />
                    </div>
                    <div className="font-mono text-lg font-black text-amber-950 bg-amber-200/60 px-3 py-0.5 rounded-full border border-amber-300/70 shadow-2xs">
                      {top3Month_[0].total_hours || 0}h
                    </div>
                  </div>
                )}

                {/* 3rd Place (Bronze) */}
                {top3Month_[2] ? (
                  <div className="flex flex-col items-center justify-between bg-gradient-to-b from-[#f7e6dc]/90 via-[#fcf5f0]/70 to-white/95 border-2 border-[#d99b73]/80 rounded-2xl p-2.5 shadow-xs relative text-center">
                    <span className="absolute -top-2.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#b35924] via-[#8c4217] to-[#59280b] text-white font-black text-[10px] uppercase tracking-wider shadow-xs border border-white">
                      #3
                    </span>
                    <div className="mt-2 mb-1.5 relative">
                      <div className="rounded-full ring-4 ring-[#a04e1e]/60 p-[3px] bg-gradient-to-b from-[#e6a175] to-white shadow-xs">
                        <UserAvatar
                          src={top3Month_[2]?.avatar_url}
                          name={top3Month_[2].employee_name || top3Month_[2].user_email}
                          size="w-18 h-18 text-lg"
                        />
                      </div>
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 truncate max-w-[120px] mb-0.5">
                      {formatFirstAndLastName(top3Month_[2].employee_name, top3Month_[2].user_email)}
                    </h3>
                    <div className="flex items-center gap-1 mb-1">
                      <RankChangeBadge
                        currentRank={3}
                        prevRank={prevMonthRankMap[(top3Month_[2]?.user_email || "").toLowerCase().trim()]}
                        hasPrevData={hasPrevMonthData}
                      />
                    </div>
                    <div className="font-mono text-base font-black text-[#59280b] bg-[#f0d5c4]/90 px-2.5 py-0.5 rounded-full border border-[#c47d52]/60 shadow-2xs">
                      {top3Month_[2].total_hours || 0}h
                    </div>
                  </div>
                ) : (
                  <div />
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center my-auto min-h-[140px]">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center mb-2">
                <Trophy className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-800 mb-0.5">
                No leaderboard records for {activeMonth.label}
              </h4>
              <p className="text-[11px] text-slate-500 max-w-xs">
                No team members logged platform hours during {activeMonth.label}.
              </p>
            </div>
          )}

          {/* ── Monthly Top 4-10 Table + User Row (Inside Podium Card) ── */}
          {top3Month_.length > 0 && (
            <div className="mt-2">
              <TopRankingsCards
                data={filteredMonthLeaderboard.slice(3)}
                userRankItem={userMonthRankItem}
                isLoading={isMonthLoading}
                emptyTitle={`No leaderboard records for ${activeMonth.label}`}
                emptySub={`No team members logged platform hours during ${activeMonth.label}.`}
                activeTabLabel={activeMonth.label}
                prevRankMap={prevMonthRankMap}
                hasPrevData={hasPrevMonthData}
              />
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          RIGHT COLUMN: OVERALL TOPPERS + WEEKLY TOPPERS
          ════════════════════════════════════════════ */}
      <div className="space-y-4">

        {/* ── Overall Toppers Card (Top 3 Throughout the Year) ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-center px-1 mb-1">
            <div className="inline-flex items-center justify-center gap-2 px-4 py-1 rounded-full bg-amber-100/90 border border-amber-300/80 shadow-2xs">
              <Crown className="w-4 h-4 text-amber-700 fill-amber-500/40" />
              <h2 className="text-sm font-black text-amber-950 uppercase tracking-wider font-mono">
                Annual Hall of Fame
              </h2>
            </div>
          </div>

          <div className="bg-gradient-to-b from-amber-100 via-amber-50/90 to-orange-100/60 border-2 border-amber-500/90 ring-4 ring-amber-400/30 rounded-3xl shadow-lg shadow-amber-500/15 relative p-3 min-h-[210px] flex flex-col justify-between">
            {/* Year Label Header */}
            <div className="flex items-center justify-center mb-2.5">
              <div className="inline-flex items-center justify-center px-5 py-1 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 border border-amber-300 shadow-md ring-4 ring-amber-500/30">
                <span className="text-sm sm:text-base font-black text-white uppercase tracking-widest font-mono">
                  {new Date().getFullYear()}
                </span>
              </div>
            </div>

            {isOverallLoading || isOverallFetching ? (
              <PodiumSkeleton theme="amber" />
            ) : top3Overall.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-4 text-center my-auto min-h-[140px]">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center mb-2">
                  <Trophy className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 mb-0.5">
                  No overall records logged for {new Date().getFullYear()} yet
                </h4>
              </div>
            ) : (
              <div className="px-1 py-1">
                <div className="grid grid-cols-3 items-stretch gap-2.5 sm:gap-3 max-w-xl mx-auto">
                  {/* 2nd Place (Silver) */}
                  {top3Overall[1] ? (
                    <div className="flex flex-col items-center justify-between bg-gradient-to-b from-slate-200/90 via-slate-100/70 to-white/95 border-2 border-slate-400/80 rounded-2xl p-2.5 shadow-xs relative text-center">
                      <span className="absolute -top-2.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-slate-500 via-slate-600 to-slate-800 text-white font-black text-[10px] uppercase tracking-wider shadow-xs border border-white">
                        #2
                      </span>
                      <div className="mt-2 mb-1.5 relative">
                        <div className="rounded-full ring-4 ring-slate-400/90 p-[3px] bg-gradient-to-b from-slate-300 via-slate-100 to-white shadow-xs">
                          <UserAvatar
                            src={top3Overall[1]?.avatar_url}
                            name={top3Overall[1].employee_name || top3Overall[1].user_email}
                            size="w-18 h-18 text-lg"
                          />
                        </div>
                      </div>
                      <h3 className="text-xs font-bold text-slate-900 truncate max-w-[120px] mb-0.5">
                        {formatFirstAndLastName(top3Overall[1].employee_name, top3Overall[1].user_email)}
                      </h3>
                      <div className="flex items-center gap-1 mb-1 opacity-0 select-none h-[16px]">
                        <span className="text-[9px]">▲</span>(+0)
                      </div>
                      <div className="font-mono text-base font-black text-slate-900 bg-slate-200/90 px-2.5 py-0.5 rounded-full border border-slate-300 shadow-2xs">
                        {top3Overall[1].total_hours || 0}h
                      </div>
                    </div>
                  ) : (
                    <div />
                  )}

                  {/* 1st Place (Overall Grand Champion) */}
                  {top3Overall[0] && (
                    <div className="flex flex-col items-center justify-between bg-gradient-to-b from-amber-100/70 via-amber-50/30 to-white/95 border-2 border-amber-300/80 rounded-2xl p-3 shadow-md shadow-amber-500/10 relative text-center ring-1 ring-amber-400/20">
                      <span className="absolute -top-2.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white font-black text-[10px] uppercase tracking-wider shadow-xs flex items-center gap-1 border border-white">
                        <Crown className="w-3.5 h-3.5 text-amber-200 fill-amber-100" /> #1 Champion
                      </span>
                      <div className="mt-2 mb-1.5 relative">
                        <div className="rounded-full ring-4 ring-amber-400/90 p-[3px] bg-gradient-to-b from-amber-200 to-white shadow-md shadow-amber-500/20">
                          <UserAvatar
                            src={top3Overall[0]?.avatar_url}
                            name={top3Overall[0].employee_name || top3Overall[0].user_email}
                            size="w-22 h-22 text-2xl font-bold"
                          />
                        </div>
                      </div>
                      <h3 className="text-sm font-black text-slate-900 truncate max-w-[140px] mb-0.5">
                        {formatFirstAndLastName(top3Overall[0].employee_name, top3Overall[0].user_email)}
                      </h3>
                      <div className="flex items-center gap-1 mb-1 opacity-0 select-none h-[16px]">
                        <span className="text-[9px]">▲</span>(+0)
                      </div>
                      <div className="font-mono text-lg font-black text-amber-950 bg-amber-200/60 px-3 py-0.5 rounded-full border border-amber-300/70 shadow-2xs">
                        {top3Overall[0].total_hours || 0}h
                      </div>
                    </div>
                  )}

                  {/* 3rd Place (Bronze) */}
                  {top3Overall[2] ? (
                    <div className="flex flex-col items-center justify-between bg-gradient-to-b from-[#f7e6dc]/90 via-[#fcf5f0]/70 to-white/95 border-2 border-[#d99b73]/80 rounded-2xl p-2.5 shadow-xs relative text-center">
                      <span className="absolute -top-2.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#b35924] via-[#8c4217] to-[#59280b] text-white font-black text-[10px] uppercase tracking-wider shadow-xs border border-white">
                        #3
                      </span>
                      <div className="mt-2 mb-1.5 relative">
                        <div className="rounded-full ring-4 ring-[#a04e1e]/60 p-[3px] bg-gradient-to-b from-[#e6a175] to-white shadow-xs">
                          <UserAvatar
                            src={top3Overall[2]?.avatar_url}
                            name={top3Overall[2].employee_name || top3Overall[2].user_email}
                            size="w-18 h-18 text-lg"
                          />
                        </div>
                      </div>
                      <h3 className="text-xs font-bold text-slate-900 truncate max-w-[120px] mb-0.5">
                        {formatFirstAndLastName(top3Overall[2].employee_name, top3Overall[2].user_email)}
                      </h3>
                      <div className="flex items-center gap-1 mb-1 opacity-0 select-none h-[16px]">
                        <span className="text-[9px]">▲</span>(+0)
                      </div>
                      <div className="font-mono text-base font-black text-[#59280b] bg-[#f0d5c4]/90 px-2.5 py-0.5 rounded-full border border-[#c47d52]/60 shadow-2xs">
                        {top3Overall[2].total_hours || 0}h
                      </div>
                    </div>
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Weekly Toppers Section ── */}
        <div className="space-y-2">
          {/* Section heading */}
          <div className="flex items-center justify-center gap-2 px-1">
            <Zap className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">Weekly Toppers</h2>
          </div>

          {/* Weekly nav + full table card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
            {/* Week nav bar */}
            <div className="relative flex items-center justify-center px-4 py-2 bg-gradient-to-b from-white to-slate-50/60 border-b border-slate-100/60">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePrevWeekClick}
                  disabled={!canGoPrevWeek}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                  title="Previous week"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {activeWeek.isCurrent ? (
                  <div className="inline-flex items-center justify-center px-4 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/10 via-indigo-500/20 to-purple-500/10 border border-indigo-400/50 shadow-xs ring-2 ring-indigo-400/30">
                    <span className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                      {activeWeek.label}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider px-2 py-0.5">
                    {activeWeek.label}
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleNextWeekClick}
                  disabled={!canGoNextWeek}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                  title="Next week"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Weekly top-10 table */}
            {isWeekLoading || isWeekFetching ? (
              <TableSkeleton rows={10} />
            ) : filteredWeekLeaderboard.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center mx-auto mb-3">
                  <Trophy className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">No records for {activeWeek.label}</h4>
                <p className="text-xs text-slate-500">No team members logged platform hours during this week.</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-100/80">
                  {filteredWeekLeaderboard.map((row) => {
                    const isCurrentUser =
                      userWeekRankItem?.user_email &&
                      row.user_email?.toLowerCase().trim() === userWeekRankItem.user_email.toLowerCase().trim();

                    // Row color based on rank
                    const rowBg =
                      isCurrentUser
                        ? "bg-indigo-50/70 ring-2 ring-inset ring-indigo-400/40"
                        : row.rank === 1
                          ? "bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100/60 border-l-4 border-amber-400"
                          : row.rank === 2
                            ? "bg-gradient-to-r from-slate-100/90 via-slate-50/70 to-white border-l-4 border-slate-500"
                            : row.rank === 3
                              ? "bg-gradient-to-r from-[#fceee6] via-[#fdf7f3] to-white border-l-4 border-[#a04e1e]"
                              : "bg-white hover:bg-indigo-50/30";

                    const rankBadgeBg =
                      row.rank === 1
                        ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/20"
                        : row.rank === 2
                          ? "bg-gradient-to-br from-slate-500 via-slate-600 to-slate-800 text-white shadow-xs border border-slate-300/50"
                          : row.rank === 3
                            ? "bg-gradient-to-br from-[#b35924] via-[#8c4217] to-[#59280b] text-white shadow-xs border border-orange-200/50"
                            : "bg-slate-100 text-slate-600 border border-slate-200/80 group-hover:border-indigo-300 group-hover:bg-indigo-50 group-hover:text-indigo-700";

                    return (
                      <div
                        key={row.rank}
                        className={`group flex flex-col sm:grid sm:grid-cols-12 items-center gap-2 p-1 sm:px-3 sm:py-1 transition-all duration-150 ${rowBg}`}
                      >
                        {/* Rank Badge */}
                        <div className="sm:col-span-1 flex items-center justify-center">
                          <span className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center font-mono transition-colors ${rankBadgeBg}`}>
                            {row.rank <= 3 ? row.rank : `#${row.rank}`}
                          </span>
                        </div>

                        {/* Employee */}
                        <div className="sm:col-span-8 flex items-center gap-3 min-w-0 w-full">
                          <UserAvatar
                            src={row.avatar_url}
                            name={row.employee_name || row.user_email}
                            size="md"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm truncate">
                                {formatFirstAndLastName(row.employee_name, row.user_email)}
                              </span>
                              <RankChangeBadge
                                currentRank={row.rank}
                                prevRank={prevWeekRankMap[(row.user_email || "").toLowerCase().trim()]}
                                hasPrevData={hasPrevWeekData}
                              />
                              {row.rank === 1 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/70 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                                  <Trophy className="w-2.5 h-2.5 text-amber-600" /> MVP
                                </span>
                              )}
                              {row.rank === 2 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200/90 text-slate-800 border border-slate-300 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                                  <Medal className="w-2.5 h-2.5 text-slate-600" /> 2ND
                                </span>
                              )}
                              {row.rank === 3 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f0d5c4]/90 text-[#59280b] border border-[#c47d52]/60 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                                  <Medal className="w-2.5 h-2.5 text-[#8c4217]" /> 3RD
                                </span>
                              )}
                              {isCurrentUser && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                                  YOU
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Hours */}
                        <div className="sm:col-span-3 text-left sm:text-right w-full pr-2">
                          <span className="font-mono text-base font-extrabold text-indigo-900">{row.active_hours}h</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* User's rank (if not in top 10) */}
          {userWeekRankItem && !filteredWeekLeaderboard.some(
            (r) => r.user_email?.toLowerCase().trim() === userWeekRankItem.user_email?.toLowerCase().trim()
          ) && (
              <div className="pt-0.5">
                <div className="group relative flex flex-col sm:grid sm:grid-cols-12 items-center gap-3 p-2.5 sm:px-4 sm:py-2.5 rounded-2xl bg-white border-2 border-indigo-400/90 shadow-lg shadow-indigo-500/10 ring-4 ring-indigo-500/10 transition-all duration-300 hover:-translate-y-0.5 cursor-default">
                  <div className="sm:col-span-1 flex items-center justify-center">
                    <span className="w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center font-mono bg-indigo-600 text-white shadow-xs">
                      #{userWeekRankItem.rank}
                    </span>
                  </div>
                  <div className="sm:col-span-8 flex items-center gap-3 min-w-0 w-full">
                    <UserAvatar src={userWeekRankItem.avatar_url} name={userWeekRankItem.employee_name || userWeekRankItem.user_email} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm truncate">
                          {formatFirstAndLastName(userWeekRankItem.employee_name, userWeekRankItem.user_email)}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">YOU</span>
                      </div>
                    </div>
                  </div>
                  <div className="sm:col-span-3 text-left sm:text-right w-full pr-2">
                    <span className="font-mono text-base font-extrabold text-indigo-900">{userWeekRankItem.active_hours}h</span>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>

    </div>
  );
};

export default LeaderboardPage;

