import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { analyticsApi, authApi } from "../../services/api";
import UserAvatar, { getAvatarUrl } from "../../components/ui/UserAvatar";
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
  Flame,
  Info,
  Folder,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  User,
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

// 🌟 Leaderboard-Only Avatar (renders styled User icon for employees without uploaded profile photo)
const LeaderboardAvatar = ({ src, name = "User", size = "md", className = "" }) => {
  const [imgError, setImgError] = useState(false);
  const resolvedUrl = useMemo(() => getAvatarUrl(src), [src]);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const sizeMap = {
    xs: "w-6 h-6 text-xs",
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-xs",
    lg: "w-10 h-10 text-sm",
    xl: "w-20 h-20 text-lg",
  };
  const sizeClass = sizeMap[size] || size || "w-9 h-9 text-xs";

  if (resolvedUrl && !imgError) {
    return (
      <img
        src={resolvedUrl}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ring-1 ring-slate-200 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-b from-slate-100 via-indigo-50/90 to-slate-200 text-slate-500 ring-1 ring-slate-300/80 shadow-2xs select-none ${className}`}
      title={name}
    >
      <User className="w-1/2 h-1/2 text-slate-500/90" />
    </div>
  );
};

// 🌟 Skeleton Loader for Podium Showcase Cards matching exact card heights, avatar rings, and pedestal bases
const PodiumSkeleton = ({ theme = "indigo" }) => {
  const isAmber = theme === "amber";

  if (isAmber) {
    // 3D Stepped Olympic Podium Skeleton (Annual Hall of Fame)
    return (
      <div className="px-0.5 pt-2 pb-0 -mb-0.5 w-full animate-pulse">
        <div className="grid grid-cols-3 items-end gap-2 sm:gap-2.5 max-w-xl mx-auto">
          {/* #2 Silver Pedestal Skeleton */}
          <div className="flex flex-col items-center w-full">
            <div className="flex flex-col items-center justify-between border-2 border-slate-300 rounded-xl p-1.5 relative text-center w-full mb-0.5 min-h-[115px] bg-white/70">
              <div className="w-5 h-2.5 bg-slate-200/90 rounded-full mb-0.5" />
              <div className="w-10 h-10 rounded-full bg-slate-200/90 my-0.5" />
              <div className="w-14 h-2.5 bg-slate-200/90 rounded-md my-0.5" />
              <div className="w-9 h-3 rounded-full bg-slate-200/90 mt-0.5" />
            </div>
            <div className="w-full h-6 rounded-t-xl bg-slate-200/80" />
          </div>

          {/* #1 Champion Pedestal Skeleton */}
          <div className="flex flex-col items-center w-full">
            <div className="flex flex-col items-center justify-between border-2 border-amber-400 rounded-xl p-1.5 relative text-center w-full mb-0.5 min-h-[115px] bg-white/70">
              <div className="w-12 h-2.5 bg-amber-200/90 rounded-full mb-0.5" />
              <div className="w-10 h-10 rounded-full bg-amber-200/90 my-0.5" />
              <div className="w-14 h-2.5 bg-slate-200/90 rounded-md my-0.5" />
              <div className="w-9 h-3 rounded-full bg-amber-200/90 mt-0.5" />
            </div>
            <div className="w-full h-9 rounded-t-xl bg-amber-200/80" />
          </div>

          {/* #3 Bronze Pedestal Skeleton */}
          <div className="flex flex-col items-center w-full">
            <div className="flex flex-col items-center justify-between border-2 border-[#d99b73] rounded-xl p-1.5 relative text-center w-full mb-0.5 min-h-[115px] bg-white/70">
              <div className="w-5 h-2.5 bg-slate-200/90 rounded-full mb-0.5" />
              <div className="w-10 h-10 rounded-full bg-slate-200/90 my-0.5" />
              <div className="w-14 h-2.5 bg-slate-200/90 rounded-md my-0.5" />
              <div className="w-9 h-3 rounded-full bg-slate-200/90 mt-0.5" />
            </div>
            <div className="w-full h-4 rounded-t-xl bg-slate-200/80" />
          </div>
        </div>
      </div>
    );
  }

  // Equal Glass Showcase Cards Skeleton (Monthly Performers)
  return (
    <div className="px-1 py-1 w-full animate-pulse">
      <div className="grid grid-cols-3 items-stretch gap-2.5 sm:gap-3 max-w-xl mx-auto">
        {/* 2nd Place Skeleton */}
        <div className="flex flex-col items-center justify-between border-2 border-slate-300 rounded-xl p-2 relative text-center min-h-[135px] bg-white/70">
          <div className="w-5 h-2.5 bg-slate-200/90 rounded-full mb-0.5" />
          <div className="w-13 h-13 rounded-full bg-slate-200/90 my-0.5" />
          <div className="w-16 h-2.5 bg-slate-200/90 rounded-md my-0.5" />
          <div className="w-10 h-3.5 rounded-full bg-slate-200/90 mt-0.5" />
        </div>

        {/* 1st Place Skeleton */}
        <div className="flex flex-col items-center justify-between border-2 border-amber-300 rounded-xl p-2 relative text-center min-h-[135px] bg-white/70">
          <div className="w-12 h-2.5 bg-amber-200/90 rounded-full mb-0.5" />
          <div className="w-13 h-13 rounded-full bg-amber-200/90 my-0.5" />
          <div className="w-16 h-2.5 bg-slate-200/90 rounded-md my-0.5" />
          <div className="w-10 h-3.5 rounded-full bg-amber-200/90 mt-0.5" />
        </div>

        {/* 3rd Place Skeleton */}
        <div className="flex flex-col items-center justify-between border-2 border-[#d99b73]/80 rounded-xl p-2 relative text-center min-h-[135px] bg-white/70">
          <div className="w-5 h-2.5 bg-slate-200/90 rounded-full mb-0.5" />
          <div className="w-13 h-13 rounded-full bg-slate-200/90 my-0.5" />
          <div className="w-16 h-2.5 bg-slate-200/90 rounded-md my-0.5" />
          <div className="w-10 h-3.5 rounded-full bg-slate-200/90 mt-0.5" />
        </div>
      </div>
    </div>
  );
};

// 🌟 Skeleton Loader for Table Rows matching exact cell grid, sizes, and padding
const TableSkeleton = ({ rows = 5 }) => {
  return (
    <div className="divide-y divide-slate-100/80 w-full animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col sm:grid sm:grid-cols-12 items-center gap-2 p-1 sm:px-3 sm:py-1 bg-white min-h-[41px]"
        >
          {/* Col 1: Rank Badge */}
          <div className="sm:col-span-1 flex items-center justify-center">
            <div className="w-7 h-7 rounded-xl bg-slate-200/80" />
          </div>

          {/* Col 2: Employee Profile & Name */}
          <div className="sm:col-span-6 flex items-center gap-3 min-w-0 w-full">
            <div className="w-9 h-9 rounded-full bg-slate-200/80 flex-shrink-0" />
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-28 sm:w-36 h-4 bg-slate-200/80 rounded-md" />
            </div>
          </div>

          {/* Col 3: Rank Change */}
          <div className="sm:col-span-2 flex items-center justify-start sm:justify-center w-full">
            <div className="w-9 h-4 bg-slate-200/80 rounded-full" />
          </div>

          {/* Col 4: Hours Logged */}
          <div className="sm:col-span-3 flex items-center justify-start sm:justify-end w-full pr-2">
            <div className="w-12 h-4.5 bg-slate-200/80 rounded-md" />
          </div>
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

// Utility to generate past N days for historical daily navigation
const generatePastDays = (count = 30) => {
  const days = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);

    const year = d.getFullYear();
    const monthNum = String(d.getMonth() + 1).padStart(2, "0");
    const dayNum = String(d.getDate()).padStart(2, "0");
    const dateStr = `${year}-${monthNum}-${dayNum}`;
    const key = `day-${dateStr}`;

    const dateFormatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const label = i === 0 ? `Today · ${dateFormatted}` : dateFormatted;

    days.push({
      key,
      dateStr,
      label,
      isToday: i === 0,
    });
  }
  return days;
};

// 🌟 Dummy Project-Wise Leaderboard Data
const DUMMY_PROJECT_LEADERBOARDS = [
  {
    id: "proj-1",
    projectName: "Encord Vision AI",
    category: "Computer Vision",
    totalHours: 245.5,
    top3: [
      { rank: 1, name: "Sakshi Pampattiwar", hours: 44.95, avatar_url: "" },
      { rank: 2, name: "Bhairavi K", hours: 39.28, avatar_url: "" },
      { rank: 3, name: "Mohammad Khan", hours: 38.72, avatar_url: "" },
    ],
  },
  {
    id: "proj-2",
    projectName: "Autonomous Lidar Tracking",
    category: "3D Bounding",
    totalHours: 198.2,
    top3: [
      { rank: 1, name: "Himanshu Maurya", hours: 42.10, avatar_url: "" },
      { rank: 2, name: "Aditi Mane", hours: 36.50, avatar_url: "" },
      { rank: 3, name: "Rahul Sharma", hours: 31.80, avatar_url: "" },
    ],
  },
  {
    id: "proj-3",
    projectName: "Medical Imaging Segmentation",
    category: "Healthcare",
    totalHours: 172.0,
    top3: [
      { rank: 1, name: "Priya Patel", hours: 38.00, avatar_url: "" },
      { rank: 2, name: "Aditya Verma", hours: 34.20, avatar_url: "" },
      { rank: 3, name: "Sneha Reddi", hours: 29.50, avatar_url: "" },
    ],
  },
  {
    id: "proj-4",
    projectName: "NLP Document Extraction",
    category: "LLM & Text",
    totalHours: 154.8,
    top3: [
      { rank: 1, name: "Vikram Joshi", hours: 35.60, avatar_url: "" },
      { rank: 2, name: "Ananya Roy", hours: 31.40, avatar_url: "" },
      { rank: 3, name: "Karan Mehta", hours: 27.90, avatar_url: "" },
    ],
  },
  {
    id: "proj-5",
    projectName: "Retail Video Analytics",
    category: "Object Detection",
    totalHours: 139.4,
    top3: [
      { rank: 1, name: "Aditi Mane", hours: 33.10, avatar_url: "" },
      { rank: 2, name: "Mohammad Khan", hours: 29.80, avatar_url: "" },
      { rank: 3, name: "Bhairavi K", hours: 25.40, avatar_url: "" },
    ],
  },
  {
    id: "proj-6",
    projectName: "Geospatial Satellite Mapping",
    category: "GIS Mapping",
    totalHours: 112.6,
    top3: [
      { rank: 1, name: "Aditya Verma", hours: 30.50, avatar_url: "" },
      { rank: 2, name: "Sakshi Pampattiwar", hours: 26.20, avatar_url: "" },
      { rank: 3, name: "Priya Patel", hours: 22.80, avatar_url: "" },
    ],
  },
];

// 🌟 Project-Wise Top 3 Rankings Component (Scrollable with 3 projects in view at a time)
const ProjectWiseLeaderboardSection = () => {
  const scrollRef = useRef(null);

  const handleScrollLeft = () => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth;
      scrollRef.current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    }
  };

  const handleScrollRight = () => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl shadow-sm overflow-hidden p-3 space-y-3">
      {/* Outer Card Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Flame className="w-4.5 h-4.5 text-amber-500 fill-amber-500/20" />
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
            PROJECT STARS
          </h2>
        </div>
      </div>

      {/* Relative wrapper with side navigation buttons */}
      <div className="relative flex items-center group/carousel">
        {/* Left Side Arrow Button (Fixed Vertical Center) */}
        <button
          type="button"
          onClick={handleScrollLeft}
          className="absolute -left-3.5 top-1/2 -translate-y-1/2 z-10 inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-200/90 bg-white/95 text-slate-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 shadow-md transition-all cursor-pointer backdrop-blur-xs active:scale-95"
          title="Previous 3 Projects"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Horizontal Scrollable Container (3 Projects in View at a time) */}
        <div
          ref={scrollRef}
          className="flex gap-3.5 overflow-x-auto snap-x snap-mandatory py-1 px-1 select-none scrollbar-none w-full"
        >
        {DUMMY_PROJECT_LEADERBOARDS.map((project) => (
          <div
            key={project.id}
            className="group flex flex-col justify-between bg-gradient-to-b from-slate-50/80 via-white to-slate-50/40 border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-200 w-[88%] sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.67rem)] flex-shrink-0 snap-start"
          >
            {/* Project Header Info */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-black text-slate-900 truncate group-hover:text-indigo-600 transition-colors" title={project.projectName}>
                  {project.projectName}
                </h3>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  {project.category}
                </span>
              </div>
              <span className="font-mono text-xs font-extrabold text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 shrink-0">
                {project.totalHours}h
              </span>
            </div>

            {/* Top 3 Employees List */}
            <div className="space-y-1.5 bg-slate-50/90 p-2 rounded-lg border border-slate-200/60">
              {project.top3.map((emp) => (
                <div
                  key={emp.rank}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-slate-200/70 bg-white shadow-2xs group/emp hover:border-indigo-200 transition-colors"
                >
                  <span className="w-4 h-4 rounded text-[10px] font-black flex items-center justify-center font-mono shrink-0 bg-indigo-600 text-white shadow-2xs">
                    #{emp.rank}
                  </span>
                  <span className="text-xs font-bold text-slate-800 truncate flex-1" title={emp.name}>
                    {formatFirstAndLastName(emp.name)}
                  </span>
                  <span className="font-mono text-[11px] font-extrabold text-indigo-950 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100/80 shrink-0">
                    {emp.hours}h
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        </div>

        {/* Right Side Arrow Button (Fixed Vertical Center) */}
        <button
          type="button"
          onClick={handleScrollRight}
          className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-200/90 bg-white/95 text-slate-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 shadow-md transition-all cursor-pointer backdrop-blur-xs active:scale-95"
          title="Next 3 Projects"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
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
  skeletonRows = 7,
  isMonthly = false,
}) => {
  if (isLoading) {
    return <TableSkeleton rows={skeletonRows} />;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const currentEmailClean = userRankItem?.user_email?.toLowerCase().trim();

  return (
    <div className="space-y-2">
      {/* Top 4-10 Table Container */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
        {/* Table Rows Stack */}
        <div className="divide-y divide-slate-100">
          {data.map((row, idx) => {
            const isUser =
              currentEmailClean &&
              row.user_email?.toLowerCase().trim() === currentEmailClean;

            return (
              <div
                key={row.rank}
                className={`group flex flex-col sm:grid sm:grid-cols-12 items-center gap-2 p-1 sm:px-3 ${
                  isMonthly ? "sm:py-[7px]" : "sm:py-1"
                } transition-all duration-150 ${isUser
                  ? "bg-indigo-50/60 ring-2 ring-indigo-400/40 z-10"
                  : idx % 2 === 0
                    ? "bg-white hover:bg-indigo-50/30"
                    : "bg-slate-50/40 hover:bg-indigo-50/30"
                  }`}
              >
                {/* Rank Badge */}
                <div className="sm:col-span-1 flex items-center justify-center">
                  <span className="w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center font-mono bg-slate-100 text-slate-600 border border-slate-200/80 group-hover:border-indigo-300 group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors">
                    #{row.rank}
                  </span>
                </div>

                {/* Employee Profile */}
                <div className="sm:col-span-6 flex items-center gap-3 min-w-0 w-full">
                  <LeaderboardAvatar
                    src={row.avatar_url}
                    name={row.employee_name || row.user_email}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm truncate">
                        {formatFirstAndLastName(row.employee_name, row.user_email)}
                      </span>
                      {isUser && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                          YOU
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rank Change */}
                <div className="sm:col-span-2 flex items-center justify-start sm:justify-center w-full">
                  <RankChangeBadge
                    currentRank={row.rank}
                    prevRank={prevRankMap[(row.user_email || "").toLowerCase().trim()]}
                    hasPrevData={hasPrevData}
                  />
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
          <div className="group relative flex flex-col sm:grid sm:grid-cols-12 items-center gap-3 p-2.5 sm:px-3 sm:py-2 rounded-xl bg-white border-2 border-indigo-400/90 shadow-sm ring-2 ring-indigo-500/10 transition-all duration-300 hover:-translate-y-0.5 cursor-default">
            <div className="sm:col-span-1 flex items-center justify-center">
              <span className="w-8 h-8 rounded-lg text-xs font-black flex items-center justify-center font-mono bg-indigo-600 text-white shadow-xs">
                #{userRankItem.rank}
              </span>
            </div>

            <div className="sm:col-span-8 flex items-center gap-3 min-w-0 w-full">
              <LeaderboardAvatar
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

// Utility to calculate leaderboard rankings (Top N)
const calculateRankings = (leaderboardData, limit = 10) => {
  let list = [...(leaderboardData || [])];
  list.sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0));
  list = list.slice(0, limit);

  const maxHours = list[0] ? Number(list[0].total_hours) || 0 : 0;
  const totalHours = list.reduce((sum, item) => sum + (Number(item.total_hours) || 0), 0);

  return list.map((item, idx) => {
    const hrs = Number(item.total_hours) || 0;
    const sharePct = totalHours > 0 ? Math.round((hrs / totalHours) * 1000) / 10 : 0;
    const barWidth = maxHours > 0 ? Math.min(100, Math.max(4, Math.round((hrs / maxHours) * 100))) : 0;

    return {
      ...item,
      rank: idx + 1,
      active_hours: hrs,
      share_percentage: sharePct,
      bar_width_pct: barWidth,
    };
  });
};

// Utility to calculate the logged-in user's rank item
const calculateUserRankItem = (
  leaderboardData,
  isAdmin,
  currentUser,
  currentUserEmail,
  currentUserName,
  findUserIndexFn
) => {
  if (isAdmin || !leaderboardData || leaderboardData.length === 0) return null;

  let list = [...leaderboardData];
  list.sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0));

  const maxHours = list[0] ? Number(list[0].total_hours) || 0 : 0;
  const totalHours = list.reduce((sum, item) => sum + (Number(item.total_hours) || 0), 0);

  const userIndex = findUserIndexFn(list);

  if (userIndex !== -1) {
    const item = list[userIndex];
    const hrs = Number(item.total_hours) || 0;
    const sharePct = totalHours > 0 ? Math.round((hrs / totalHours) * 1000) / 10 : 0;
    const barWidth = maxHours > 0 ? Math.min(100, Math.max(4, Math.round((hrs / maxHours) * 100))) : 0;

    return {
      ...item,
      rank: userIndex + 1,
      active_hours: hrs,
      share_percentage: sharePct,
      bar_width_pct: barWidth,
    };
  }

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

  const currentUserEmpId = useMemo(() => {
    return currentUser?.employee_id || currentUser?.id || meData?.employee_id || meData?.user?.employee_id || meData?.user?.id || null;
  }, [currentUser, meData]);

  const findCurrentUserIndex = (list) => {
    if (!list || list.length === 0) return -1;
    // 1. Exact match by employee_id if available
    if (currentUserEmpId) {
      const idx = list.findIndex(
        (item) => item.employee_id && String(item.employee_id) === String(currentUserEmpId)
      );
      if (idx !== -1) return idx;
    }
    // 2. Exact match by email (case-insensitive)
    if (currentUserEmail) {
      const idx = list.findIndex((item) => {
        const itemEmail = (item.user_email || "").toLowerCase().trim();
        return Boolean(itemEmail && itemEmail === currentUserEmail);
      });
      if (idx !== -1) return idx;
    }
    // 3. Fallback: exact match by full name (never substring)
    if (currentUserName) {
      const idx = list.findIndex((item) => {
        const itemObjName = (item.employee_name || formatDisplayName(item.user_email || "")).toLowerCase().trim();
        return Boolean(itemObjName && itemObjName === currentUserName);
      });
      if (idx !== -1) return idx;
    }
    return -1;
  };

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

  const filteredMonthLeaderboard = useMemo(
    () => calculateRankings(allMonthLeaderboard, 10),
    [allMonthLeaderboard]
  );

  // Full Month User Rank Calculation
  const userMonthRankItem = useMemo(
    () => calculateUserRankItem(allMonthLeaderboard, isAdmin, currentUser, currentUserEmail, currentUserName, findCurrentUserIndex),
    [allMonthLeaderboard, currentUserEmail, currentUserName, currentUserEmpId, currentUser, isAdmin]
  );

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

  // ── Weekly & Daily State & Query Mode ──
  const [viewMode, setViewMode] = useState("weekly"); // "weekly" | "daily"

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

  // ── Daily Top 10 Query & Navigation ──
  const pastDays = useMemo(() => generatePastDays(30), []);
  const currentDayKey = pastDays[0]?.key || "";
  const [selectedDayKey, setSelectedDayKey] = useState(currentDayKey);

  const activeDay = useMemo(
    () => pastDays.find((d) => d.key === selectedDayKey) || pastDays[0],
    [selectedDayKey, pastDays]
  );

  const activeDayIndex = useMemo(
    () => pastDays.findIndex((d) => d.key === selectedDayKey),
    [selectedDayKey, pastDays]
  );

  const canGoPrevDay = activeDayIndex < pastDays.length - 1;
  const canGoNextDay = activeDayIndex > 0;

  const handlePrevDayClick = () => {
    if (activeDayIndex < pastDays.length - 1) {
      setSelectedDayKey(pastDays[activeDayIndex + 1].key);
    }
  };

  const handleNextDayClick = () => {
    if (activeDayIndex > 0) {
      setSelectedDayKey(pastDays[activeDayIndex - 1].key);
    }
  };

  const dailyParams = useMemo(
    () => ({
      range: "custom",
      date_from: activeDay.dateStr,
      date_to: activeDay.dateStr,
    }),
    [activeDay]
  );

  const { data: dailyData, isLoading: isDailyLoading, isFetching: isDailyFetching } = useQuery({
    queryKey: ["admin-leaderboard-daily", dailyParams],
    queryFn: () => analyticsApi.getLeaderboard(dailyParams),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  const allDailyLeaderboard = dailyData?.leaderboard || [];

  const filteredDailyLeaderboard = useMemo(
    () => calculateRankings(allDailyLeaderboard, 10),
    [allDailyLeaderboard]
  );

  const userDailyRankItem = useMemo(
    () => calculateUserRankItem(allDailyLeaderboard, isAdmin, currentUser, currentUserEmail, currentUserName, findCurrentUserIndex),
    [allDailyLeaderboard, currentUserEmail, currentUserName, currentUserEmpId, currentUser, isAdmin]
  );

  const allWeekLeaderboard = weekData?.leaderboard || [];
  const hasWeekData = !isWeekLoading && allWeekLeaderboard.length > 0;

  const filteredWeekLeaderboard = useMemo(
    () => calculateRankings(allWeekLeaderboard, 10),
    [allWeekLeaderboard]
  );

  // Full Week User Rank Calculation
  const userWeekRankItem = useMemo(
    () => calculateUserRankItem(allWeekLeaderboard, isAdmin, currentUser, currentUserEmail, currentUserName, findCurrentUserIndex),
    [allWeekLeaderboard, currentUserEmail, currentUserName, currentUserEmpId, currentUser, isAdmin]
  );

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
    <div className="flex flex-col gap-2.5 sm:gap-3">
      {/* 2-Column Leaderboard Showcase (Monthly on Left, Annual + Weekly/Daily on Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5 sm:gap-3 items-stretch">

      {/* ════════════════════════════════════════════
          MONTHLY TOPPERS — Podium section
          ════════════════════════════════════════════ */}
      <div className="flex flex-col justify-between h-full">
        {/* ── Podium Card ── */}
        <div className="bg-gradient-to-b from-indigo-100 via-indigo-50/90 to-purple-100/60 border-2 border-indigo-500/80 ring-2 ring-indigo-400/30 rounded-xl shadow-sm relative p-3 flex-1 flex flex-col justify-between">
          {/* Side Nav Arrows (Fixed at Vertical Center of Podium Card) */}
          <button
            type="button"
            onClick={handlePrevMonthClick}
            disabled={!canGoPrevMonth_}
            className="absolute -left-3.5 top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center w-8 h-8 rounded-full border border-indigo-200 bg-white/95 text-indigo-700 shadow-md hover:bg-white active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer backdrop-blur-xs"
            title="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleNextMonthClick}
            disabled={!canGoNextMonth_}
            className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center w-8 h-8 rounded-full border border-indigo-200 bg-white/95 text-indigo-700 shadow-md hover:bg-white active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer backdrop-blur-xs"
            title="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Month Label Header */}
          <div className="flex items-center justify-center mb-2">
            {activeMonth.isCurrent ? (
              <div className="inline-flex items-center justify-center gap-1.5 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 border border-indigo-300 shadow-md ring-3 ring-indigo-500/30">
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300/40" />
                <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-mono">
                  Monthly Performers · {activeMonth.label}
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center justify-center gap-1.5 px-4 py-1 rounded-full bg-indigo-900 border border-indigo-700 shadow-sm">
                <Zap className="w-3.5 h-3.5 text-indigo-300 fill-indigo-300/40" />
                <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-mono">
                  Monthly Performers · {activeMonth.label}
                </span>
              </div>
            )}
          </div>

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
                  <div className="flex flex-col items-center justify-between bg-gradient-to-b from-slate-200/90 via-slate-100/70 to-white/95 border-2 border-slate-400/80 rounded-xl p-2 shadow-xs relative text-center min-h-[135px]">
                    <span className="absolute -top-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-slate-500 via-slate-600 to-slate-800 text-white font-black text-[9px] uppercase tracking-wider shadow-xs border border-white">
                      #2
                    </span>
                    <div className="mt-3 mb-1 relative">
                      <div className="rounded-full ring-2 ring-slate-400/90 p-[2px] bg-gradient-to-b from-slate-300 via-slate-100 to-white shadow-xs">
                        <LeaderboardAvatar
                          src={top3Month_[1]?.avatar_url}
                          name={top3Month_[1].employee_name || top3Month_[1].user_email}
                          size="w-13 h-13 text-sm"
                        />
                      </div>
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 truncate max-w-[110px] mb-0.5">
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
                  <div className="flex flex-col items-center justify-between bg-gradient-to-b from-amber-100/95 via-amber-50/90 to-white/95 border-2 border-amber-400 rounded-xl p-2 shadow-sm relative text-center ring-2 ring-amber-400/40 z-10 min-h-[135px]">
                    <span className="absolute -top-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white font-black text-[9px] uppercase tracking-wider shadow-md flex items-center gap-0.5 border border-white">
                      <Crown className="w-2.5 h-2.5 text-amber-200 fill-amber-100" /> #1 MVP
                    </span>
                    <div className="mt-3 mb-1 relative">
                      <div className="rounded-full ring-2 ring-amber-500/90 p-[2px] bg-gradient-to-b from-amber-400 via-amber-200 to-white shadow-xs">
                        <LeaderboardAvatar
                          src={top3Month_[0]?.avatar_url}
                          name={top3Month_[0].employee_name || top3Month_[0].user_email}
                          size="w-13 h-13 text-sm font-bold"
                        />
                      </div>
                    </div>
                    <h3 className="text-xs font-black text-slate-900 truncate max-w-[110px] mb-0.5">
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
                  <div className="flex flex-col items-center justify-between bg-gradient-to-b from-[#fcf5f0]/95 via-[#f9ebd9]/70 to-white/95 border-2 border-[#d99b73] rounded-xl p-2 shadow-xs relative text-center min-h-[135px]">
                    <span className="absolute -top-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#b35924] via-[#8c4217] to-[#59280b] text-white font-black text-[9px] uppercase tracking-wider shadow-xs border border-white">
                      #3
                    </span>
                    <div className="mt-3 mb-1 relative">
                      <div className="rounded-full ring-2 ring-[#a04e1e]/60 p-[2px] bg-gradient-to-b from-[#e6a175] via-[#f7e6dc] to-white shadow-xs">
                        <LeaderboardAvatar
                          src={top3Month_[2]?.avatar_url}
                          name={top3Month_[2].employee_name || top3Month_[2].user_email}
                          size="w-13 h-13 text-sm"
                        />
                      </div>
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 truncate max-w-[110px] mb-0.5">
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
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center mb-2">
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
                skeletonRows={7}
                isMonthly={true}
              />
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          RIGHT COLUMN: OVERALL TOPPERS + WEEKLY TOPPERS
          ════════════════════════════════════════════ */}
      <div className="space-y-2.5 sm:space-y-3">

        {/* ── Overall Toppers Card (Top 3 Throughout the Year) ── */}
        <div>
          <div className="bg-gradient-to-b from-amber-100 via-amber-50/90 to-orange-100/60 border-2 border-amber-500/90 ring-4 ring-amber-400/30 rounded-xl shadow-sm relative p-3 pb-0 min-h-[145px] flex flex-col justify-between overflow-hidden">
            {/* Year Label Header */}
            <div className="flex items-center justify-center mb-1.5">
              <div className="inline-flex items-center justify-center gap-1.5 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 border border-amber-300 shadow-md ring-3 ring-amber-500/30">
                <Crown className="w-3.5 h-3.5 text-amber-100 fill-amber-100/40" />
                <span className="text-xs font-black text-white uppercase tracking-wider font-mono">
                  Annual Hall of Fame · {new Date().getFullYear()}
                </span>
              </div>
            </div>

            {isOverallLoading || isOverallFetching ? (
              <PodiumSkeleton theme="amber" />
            ) : top3Overall.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-3 text-center my-auto min-h-[120px]">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center mb-1.5">
                  <Trophy className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 mb-0.5">
                  No overall records logged for {new Date().getFullYear()} yet
                </h4>
              </div>
            ) : (
              <div className="px-0.5 pt-2 pb-0 -mb-0.5">
                <div className="grid grid-cols-3 items-end gap-2 sm:gap-2.5 max-w-xl mx-auto">
                  {/* 2nd Place (Silver Pedestal - Left) */}
                  {top3Overall[1] ? (
                    <div className="flex flex-col items-center">
                      <div className="flex flex-col items-center justify-between bg-gradient-to-b from-white/95 via-slate-100/90 to-white/95 border-2 border-slate-300 rounded-xl p-1.5 shadow-xs backdrop-blur-md relative text-center w-full mb-0.5 min-h-[115px]">
                        <span className="absolute -top-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 text-white font-black text-[8px] uppercase tracking-wider shadow-xs border border-white">
                          #2
                        </span>
                        <div className="mt-2.5 mb-0.5 relative">
                          <div className="rounded-full ring-2 ring-slate-400/90 p-[2px] bg-gradient-to-b from-slate-300 to-white shadow-xs">
                            <LeaderboardAvatar
                              src={top3Overall[1]?.avatar_url}
                              name={top3Overall[1].employee_name || top3Overall[1].user_email}
                              size="w-10 h-10 text-xs"
                            />
                          </div>
                        </div>
                        <h3 className="text-[11px] font-bold text-slate-900 truncate max-w-[90px] mb-0.5">
                          {formatFirstAndLastName(top3Overall[1].employee_name, top3Overall[1].user_email)}
                        </h3>
                        <div className="font-mono text-[11px] font-black text-slate-900 bg-slate-200/90 px-1.5 py-0.5 rounded-full border border-slate-300 shadow-2xs">
                          {top3Overall[1].total_hours || 0}h
                        </div>
                      </div>
                      <div className="w-full h-6 rounded-t-xl bg-gradient-to-t from-slate-500/50 via-slate-400 to-slate-200 border-t-2 border-white shadow-xs flex items-center justify-center" />
                    </div>
                  ) : (
                    <div />
                  )}

                  {/* 1st Place (Gold Champion Pedestal - Center) */}
                  {top3Overall[0] && (
                    <div className="flex flex-col items-center z-10">
                      <div className="flex flex-col items-center justify-between bg-gradient-to-b from-amber-50/95 via-white/90 to-amber-50/95 border-2 border-amber-400 rounded-xl p-1.5 shadow-sm backdrop-blur-md relative text-center ring-2 ring-amber-400/50 w-full mb-0.5 min-h-[115px]">
                        <span className="absolute -top-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white font-black text-[8px] uppercase tracking-wider shadow-md flex items-center gap-0.5 border border-white">
                          <Crown className="w-2.5 h-2.5 text-amber-200 fill-amber-100" /> #1 Champion
                        </span>
                        <div className="mt-2.5 mb-0.5 relative">
                          <div className="rounded-full ring-2 ring-amber-500/90 p-[2px] bg-gradient-to-b from-amber-400 via-amber-200 to-white shadow-xs">
                            <LeaderboardAvatar
                              src={top3Overall[0]?.avatar_url}
                              name={top3Overall[0].employee_name || top3Overall[0].user_email}
                              size="w-10 h-10 text-xs font-bold"
                            />
                          </div>
                        </div>
                        <h3 className="text-[11px] font-black text-slate-900 truncate max-w-[90px] mb-0.5">
                          {formatFirstAndLastName(top3Overall[0].employee_name, top3Overall[0].user_email)}
                        </h3>
                        <div className="font-mono text-[11px] font-black text-amber-950 bg-amber-200/80 px-2 py-0.5 rounded-full border border-amber-400 shadow-2xs">
                          {top3Overall[0].total_hours || 0}h
                        </div>
                      </div>
                      <div className="w-full h-9 rounded-t-xl bg-gradient-to-t from-amber-600/60 via-amber-500 to-amber-300 border-t-2 border-amber-200 shadow-xs flex items-center justify-center" />
                    </div>
                  )}

                  {/* 3rd Place (Bronze Pedestal - Right) */}
                  {top3Overall[2] ? (
                    <div className="flex flex-col items-center">
                      <div className="flex flex-col items-center justify-between bg-gradient-to-b from-[#fcf5f0]/95 via-white/90 to-[#fcf5f0]/95 border-2 border-[#d99b73] rounded-xl p-1.5 shadow-xs backdrop-blur-md relative text-center w-full mb-0.5 min-h-[115px]">
                        <span className="absolute -top-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#b35924] via-[#8c4217] to-[#59280b] text-white font-black text-[8px] uppercase tracking-wider shadow-xs border border-white">
                          #3
                        </span>
                        <div className="mt-2.5 mb-0.5 relative">
                          <div className="rounded-full ring-2 ring-[#a04e1e]/60 p-[2px] bg-gradient-to-b from-[#e6a175] to-white shadow-xs">
                            <LeaderboardAvatar
                              src={top3Overall[2]?.avatar_url}
                              name={top3Overall[2].employee_name || top3Overall[2].user_email}
                              size="w-10 h-10 text-xs"
                            />
                          </div>
                        </div>
                        <h3 className="text-[11px] font-bold text-slate-900 truncate max-w-[90px] mb-0.5">
                          {formatFirstAndLastName(top3Overall[2].employee_name, top3Overall[2].user_email)}
                        </h3>
                        <div className="font-mono text-[11px] font-black text-[#59280b] bg-[#f0d5c4]/90 px-1.5 py-0.5 rounded-full border border-[#c47d52]/60 shadow-2xs">
                          {top3Overall[2].total_hours || 0}h
                        </div>
                      </div>
                      <div className="w-full h-4 rounded-t-xl bg-gradient-to-t from-[#59280b]/60 via-[#b35924] to-[#e6a175] border-t-2 border-[#f7e6dc] shadow-xs flex items-center justify-center" />
                    </div>
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Weekly & Daily Toppers Section ── */}
        <div className="space-y-2">
          {/* Weekly / Daily integrated header + full table card */}
          <div className="bg-white border border-slate-200/90 rounded-xl shadow-sm overflow-hidden">
            {/* Integrated Header Bar strictly in a SINGLE LINE (Zero Overlap Guaranteed) */}
            <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-b from-white to-slate-50/60 border-b border-slate-100/60 select-none gap-1 sm:gap-2">
              {/* Left Slot: Title */}
              <div className="flex items-center gap-1 shrink-0 min-w-0">
                <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 shrink-0" />
                <h2 className="text-[11px] sm:text-xs font-black text-slate-800 uppercase tracking-wider truncate">
                  {viewMode === "daily" ? "Daily Top 10" : "Weekly Toppers"}
                </h2>
              </div>

              {/* Center Slot: Fixed Position Date Navigation (Zero Shift Guarantee) */}
              <div className="flex items-center justify-center shrink-0">
                <button
                  type="button"
                  onClick={viewMode === "weekly" ? handlePrevWeekClick : handlePrevDayClick}
                  disabled={viewMode === "weekly" ? !canGoPrevWeek : !canGoPrevDay}
                  className="inline-flex items-center justify-center w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs shrink-0"
                  title={viewMode === "weekly" ? "Previous week" : "Previous day"}
                >
                  <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>

                <div className="w-[145px] sm:w-[170px] flex items-center justify-center text-center shrink-0 px-1">
                  {(viewMode === "weekly" ? activeWeek.isCurrent : activeDay.isToday) ? (
                    <div className="inline-flex items-center justify-center px-2 sm:px-2.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/10 via-indigo-500/20 to-purple-500/10 border border-indigo-400/50 shadow-xs ring-1 ring-indigo-400/30 w-full">
                      <span className="text-[10px] sm:text-[11px] font-black text-indigo-950 uppercase tracking-wider truncate">
                        {viewMode === "weekly" ? activeWeek.label : activeDay.label}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] sm:text-[11px] font-black text-slate-800 uppercase tracking-wider px-1 truncate">
                      {viewMode === "weekly" ? activeWeek.label : activeDay.label}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={viewMode === "weekly" ? handleNextWeekClick : handleNextDayClick}
                  disabled={viewMode === "weekly" ? !canGoNextWeek : !canGoNextDay}
                  className="inline-flex items-center justify-center w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs shrink-0"
                  title={viewMode === "weekly" ? "Next week" : "Next day"}
                >
                  <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>

              {/* Right Slot: Toggle Switch */}
              <div className="inline-flex items-center p-0.5 rounded-full bg-slate-100 border border-slate-200 shadow-2xs shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("weekly")}
                  className={`px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                    viewMode === "weekly"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("daily")}
                  className={`px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                    viewMode === "daily"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Daily Top 10
                </button>
              </div>
            </div>

            {/* Table Rendering inside rounded sub-card */}
            {(viewMode === "weekly" ? (isWeekLoading || isWeekFetching) : (isDailyLoading || isDailyFetching)) ? (
              <TableSkeleton rows={10} />
            ) : (viewMode === "weekly" ? filteredWeekLeaderboard.length === 0 : filteredDailyLeaderboard.length === 0) ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center mx-auto mb-3">
                  <Trophy className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  {viewMode === "weekly"
                    ? `No records for ${activeWeek.label}`
                    : `No daily records for ${activeDay.isToday ? "today" : activeDay.label}`}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {viewMode === "weekly"
                    ? "No team members logged platform hours during this week."
                    : activeDay.isToday
                    ? "Today's data is still being compiled and will reflect on the leaderboard tomorrow."
                    : `No team members logged platform hours on ${activeDay.label}.`}
                </p>
              </div>
            ) : (
              <div className="p-2.5">
                <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
                  <div className="divide-y divide-slate-100/80">
                  {(viewMode === "weekly" ? filteredWeekLeaderboard : filteredDailyLeaderboard).map((row) => {
                    const activeUserItem = viewMode === "weekly" ? userWeekRankItem : userDailyRankItem;
                    const isCurrentUser =
                      activeUserItem?.user_email &&
                      row.user_email?.toLowerCase().trim() === activeUserItem.user_email.toLowerCase().trim();

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
                          <span className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center font-mono transition-colors ${rankBadgeBg}`}>
                            {row.rank <= 3 ? row.rank : `#${row.rank}`}
                          </span>
                        </div>

                        {/* Employee */}
                        <div className="sm:col-span-6 flex items-center gap-3 min-w-0 w-full">
                          <LeaderboardAvatar
                            src={row.avatar_url}
                            name={row.employee_name || row.user_email}
                            size="md"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm truncate">
                                {formatFirstAndLastName(row.employee_name, row.user_email)}
                              </span>
                              {row.rank === 1 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/70 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                                  <Trophy className="w-2.5 h-2.5 text-amber-600" /> 1ST
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

                        {/* Rank Change (Dedicated Column matching Monthly Table) */}
                        <div className="sm:col-span-2 flex items-center justify-start sm:justify-center w-full">
                          {viewMode === "weekly" && (
                            <RankChangeBadge
                              currentRank={row.rank}
                              prevRank={prevWeekRankMap[(row.user_email || "").toLowerCase().trim()]}
                              hasPrevData={hasPrevWeekData}
                            />
                          )}
                        </div>

                        {/* Hours */}
                        <div className="sm:col-span-3 text-left sm:text-right w-full pr-2">
                          <span className="font-mono text-base font-extrabold text-indigo-900">{row.active_hours}h</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            )}
          </div>

          {/* User's rank (if not in top 10) */}
          {(() => {
            const activeUserItem = viewMode === "weekly" ? userWeekRankItem : userDailyRankItem;
            const currentList = viewMode === "weekly" ? filteredWeekLeaderboard : filteredDailyLeaderboard;
            if (
              activeUserItem &&
              !currentList.some(
                (r) => r.user_email?.toLowerCase().trim() === activeUserItem.user_email?.toLowerCase().trim()
              )
            ) {
              return (
                <div className="pt-0.5">
                  <div className="group relative flex flex-col sm:grid sm:grid-cols-12 items-center gap-3 p-2.5 sm:px-3 sm:py-2 rounded-xl bg-white border-2 border-indigo-400/90 shadow-sm ring-2 ring-indigo-500/10 transition-all duration-300 hover:-translate-y-0.5 cursor-default">
                    <div className="sm:col-span-1 flex items-center justify-center">
                      <span className="w-8 h-8 rounded-lg text-xs font-black flex items-center justify-center font-mono bg-indigo-600 text-white shadow-xs">
                        #{activeUserItem.rank}
                      </span>
                    </div>
                    <div className="sm:col-span-6 flex items-center gap-3 min-w-0 w-full">
                      <LeaderboardAvatar src={activeUserItem.avatar_url} name={activeUserItem.employee_name || activeUserItem.user_email} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm truncate">
                            {formatFirstAndLastName(activeUserItem.employee_name, activeUserItem.user_email)}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">YOU</span>
                        </div>
                      </div>
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-center w-full">
                      {viewMode === "weekly" && (
                        <RankChangeBadge
                          currentRank={activeUserItem.rank}
                          prevRank={prevWeekRankMap[(activeUserItem.user_email || "").toLowerCase().trim()]}
                          hasPrevData={hasPrevWeekData}
                        />
                      )}
                    </div>
                    <div className="sm:col-span-3 text-left sm:text-right w-full pr-2">
                      <span className="font-mono text-base font-extrabold text-indigo-900">{activeUserItem.active_hours}h</span>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>
      </div>

      {/* Close 2-Column Grid */}
      </div>

      {/* ── Project-Wise Top 3 Rankings (Full-Width Standalone Section Across Both Columns) ── */}
      <div className="w-full">
        <ProjectWiseLeaderboardSection />
      </div>
    </div>
  );
};

export default LeaderboardPage;

