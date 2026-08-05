import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  RefreshCw,
  Clock,
  User,
  Globe,
  ArrowRight,
} from "lucide-react";
import { auditLogApi } from "../services/api";
import Table from "../components/ui/Table";
import DatePicker from "../components/ui/DatePicker";
import Dropdown from "../components/ui/Dropdown";
import { formatDisplayName } from "../utils/displayName";

const PAGE_SIZE = 25;

const TIME_FILTER_OPTIONS = [
  { value: "all", label: "Filter by Time: All" },
  { value: "today", label: "Filter by Time: Today" },
  { value: "7d", label: "Filter by Time: Last 7 days" },
  { value: "custom", label: "Filter by Time: Custom" },
];

const toISODate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

export default function ChangeLogPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [actorRole, setActorRole] = useState("All");
  const [timeFilter, setTimeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Handle time filter selection
  const handleTimeFilterChange = (val) => {
    setTimeFilter(val);
    setPage(1);
    setShowCustomDateModal(val === "custom");
    const now = new Date();

    if (val === "all") {
      setDateFrom("");
      setDateTo("");
    } else if (val === "today") {
      const todayStr = toISODate(now);
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (val === "7d") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      setDateFrom(toISODate(start));
      setDateTo(toISODate(now));
    }
  };

  const filters = {
    page,
    page_size: PAGE_SIZE,
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(category !== "All" ? { category } : {}),
    ...(actorRole !== "All" ? { actor_role: actorRole.toLowerCase() } : {}),
    ...(dateFrom ? { date_from: dateFrom } : {}),
    ...(dateTo ? { date_to: dateTo } : {}),
  };

  const {
    data: result,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: () => auditLogApi.getAll(filters),
    placeholderData: (prev) => prev,
  });

  const { data: filterOptions } = useQuery({
    queryKey: ["audit-log-filters"],
    queryFn: auditLogApi.getFilters,
  });

  const logs = result?.items || [];
  const total = result?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const categoryOptions = useMemo(
    () => [
      { value: "All", label: "All Categories" },
      ...(filterOptions?.categories || []).map((c) => ({ value: c, label: c })),
    ],
    [filterOptions]
  );

  const roleOptions = useMemo(
    () => [
      { value: "All", label: "All Roles" },
      { value: "Admin", label: "Admin" },
      { value: "PM", label: "PM" },
      { value: "Employee", label: "Employee" },
      { value: "HR", label: "HR" },
    ],
    []
  );

  const CATEGORY_BADGES = {
    leaves: "bg-amber-50 text-amber-700 border-amber-200/80",
    wfh: "bg-cyan-50 text-cyan-700 border-cyan-200/80",
    employees: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    allocations: "bg-purple-50 text-purple-700 border-purple-200/80",
    projects: "bg-blue-50 text-blue-700 border-blue-200/80",
    access: "bg-teal-50 text-teal-700 border-teal-200/80",
    guidelines: "bg-sky-50 text-sky-700 border-sky-200/80",
    settings: "bg-slate-100 text-slate-700 border-slate-200/80",
  };

  const getCategoryBadgeClass = (cat) =>
    CATEGORY_BADGES[(cat || "").toLowerCase()] ||
    "bg-slate-100 text-slate-700 border-slate-200/80";

  const cleanSummaryText = (summary, subjectName) => {
    if (!summary) return "";
    let s = summary;

    // 1. Remove duplicate "leave leave" or "Leave leave"
    s = s.replace(/leave\s+leave/gi, "leave");

    // 2. Remove redundant subject name if it appears in the summary phrase
    if (subjectName && typeof subjectName === "string" && subjectName.trim()) {
      const rawName = subjectName.trim();
      const formattedName = formatDisplayName(rawName) || rawName;
      const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const patterns = [
        new RegExp(`\\s+for\\s+${escapeRegExp(rawName)}`, "gi"),
        new RegExp(`\\s+for\\s+${escapeRegExp(formattedName)}`, "gi"),
        new RegExp(`^Updated\\s+${escapeRegExp(rawName)}\\s+—\\s+`, "gi"),
        new RegExp(`^Updated\\s+${escapeRegExp(formattedName)}\\s+—\\s+`, "gi"),
        new RegExp(`^Uploaded a new profile picture for\\s+${escapeRegExp(rawName)}`, "gi"),
        new RegExp(`^Uploaded a new profile picture for\\s+${escapeRegExp(formattedName)}`, "gi"),
      ];

      patterns.forEach((regex) => {
        s = s.replace(regex, (match) => {
          if (match.toLowerCase().startsWith("updated")) return "Updated ";
          if (match.toLowerCase().startsWith("uploaded")) return "Uploaded profile picture";
          return "";
        });
      });
    }

    // 3. Format YYYY-MM-DD date ranges: (2026-08-12 → 2026-08-13) -> (12 Aug – 13 Aug)
    s = s.replace(/\((\d{4})-(\d{2})-(\d{2})\s*(?:→|->|\sto\s)\s*(\d{4})-(\d{2})-(\d{2})\)/g, (_, y1, m1, d1, y2, m2, d2) => {
      const date1 = new Date(Number(y1), Number(m1) - 1, Number(d1));
      const date2 = new Date(Number(y2), Number(m2) - 1, Number(d2));
      const str1 = `${date1.getDate()} ${date1.toLocaleDateString("en-US", { month: "short" })}`;
      const str2 = `${date2.getDate()} ${date2.toLocaleDateString("en-US", { month: "short" })}`;
      return `(${str1} – ${str2})`;
    });

    // 4. Format single YYYY-MM-DD date: (2026-08-05) -> (5 Aug)
    s = s.replace(/\((\d{4})-(\d{2})-(\d{2})\)/g, (_, y, m, d) => {
      const date = new Date(Number(y), Number(m) - 1, Number(d));
      return `(${date.getDate()} ${date.toLocaleDateString("en-US", { month: "short" })})`;
    });

    // 5. Remove trailing "was pending" or extra clutter
    s = s.replace(/\s+was\s+pending$/gi, "");

    return s.trim();
  };

  const formatTimestamp = (isoString) => {
    if (!isoString)
      return { dateStr: "—", timeStr: "—", relativeTime: "—", formattedShort: "—", formatted: "—", isoFull: "—" };

    // If ISO string lacks timezone offset/designator, append Z to ensure UTC interpretation
    const normalizedIso =
      typeof isoString === "string" &&
      !isoString.endsWith("Z") &&
      !/[+-]\d{2}:\d{2}$/.test(isoString)
        ? `${isoString}Z`
        : isoString;

    const date = new Date(normalizedIso);
    if (isNaN(date.getTime()))
      return { dateStr: isoString, timeStr: "", relativeTime: "", formattedShort: isoString, formatted: isoString, isoFull: isoString };

    // Relative time
    const diffMs = Math.max(0, Date.now() - date.getTime());
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    let relativeTime;
    if (diffMins < 1) relativeTime = "Just now";
    else if (diffMins < 60) relativeTime = `${diffMins}m ago`;
    else if (diffHours < 24) relativeTime = `${diffHours}h ago`;
    else relativeTime = `${diffDays}d ago`;

    const day = date.getDate();
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const year = date.getFullYear();
    const timeStr24 = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const timeStr12 = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const dateStr = `${day} ${month}, ${year}`;
    const formattedShort = `${day} ${month}, ${timeStr12}`;

    return {
      dateStr,
      timeStr: timeStr24,
      relativeTime,
      formattedShort,
      formatted: `${dateStr} ${timeStr24}`,
      isoFull: date.toLocaleString(),
    };
  };

  return (
    <div className="bg-white min-h-screen p-6 space-y-6">
      {/* Toolbar & Controls */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Extreme Left: Role filter (Segmented Tab Table) */}
          <div className="inline-flex items-center h-[34px] p-0.5 bg-slate-100/90 rounded-md border border-slate-300 text-xs font-medium shrink-0 gap-0.5">
            {roleOptions.map((role) => {
              const isSelected = actorRole === role.value;
              return (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => {
                    setActorRole(role.value);
                    setPage(1);
                  }}
                  className={`h-full px-2.5 flex items-center justify-center rounded text-xs transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? "bg-white text-blue-600 font-bold shadow-xs border border-slate-200/80"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 font-medium"
                  }`}
                >
                  {role.label}
                </button>
              );
            })}
          </div>

          {/* Extreme Right: Search, Time, Category & Refresh */}
          <div className="flex flex-wrap items-center gap-3 ml-auto">
            {/* Filter by keyword search box */}
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Filter by keyword"
                className="w-56 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Filter by Time dropdown */}
            <Dropdown
              className="w-[215px] shrink-0"
              options={TIME_FILTER_OPTIONS}
              value={timeFilter}
              onChange={handleTimeFilterChange}
            />

            {/* Custom date range selector inline to the right of Filter by Time */}
            {showCustomDateModal && (
              <div className="w-60 shrink-0">
                <DatePicker
                  type="range"
                  startDate={dateFrom}
                  endDate={dateTo}
                  onRangeChange={({ startDate, endDate }) => {
                    setDateFrom(startDate);
                    setDateTo(endDate);
                    setPage(1);
                  }}
                  placeholder="Select date range"
                />
              </div>
            )}

            {/* Category filter */}
            <Dropdown
              className="w-44 shrink-0"
              options={categoryOptions}
              value={category}
              onChange={(v) => {
                setCategory(v);
                setPage(1);
              }}
            />

            {/* Refresh button */}
            <button
              type="button"
              onClick={() => refetch()}
              title="Refresh audit log"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors ml-1"
            >
              <RefreshCw className={`h-4 w-4 text-slate-500 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Audit Log Table */}
      <Table
        variant="untitled"
        loading={isLoading}
        skeletonRows={8}
        expandedRowId={expandedId}
        onRowClick={(row) => setExpandedId(expandedId === row.id ? null : row.id)}
        renderExpandedRow={(row) => {
          const formatted = formatTimestamp(row.created_at);
          const actor = row.actor || {};
          const actorName = formatDisplayName(actor.name) || actor.name || "System";
          const subject = formatDisplayName(row.subject_name) || row.subject_name;

          return (
            <div className="border-t border-slate-200/80 bg-slate-50/80 p-4 text-xs space-y-3">
              {/* Streamlined Meta Summary Bar */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200/80 pb-3 text-xs text-slate-700">
                {/* Log ID */}
                <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded">
                  LOG #{row.id}
                </span>

                <span className="text-slate-300">|</span>

                {/* Timestamp shifted to left side */}
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 font-mono">
                  <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  {formatted.isoFull}
                </div>

                <span className="text-slate-300">|</span>

                {/* User & Email - crisp and high visibility */}
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-600">User:</span>
                  <span className="font-bold text-slate-900">{actorName}</span>
                  {actor.email && (
                    <span className="text-slate-800 font-mono text-[11.5px] bg-slate-100/90 px-1.5 py-0.5 rounded border border-slate-200/80 font-medium">
                      {actor.email}
                    </span>
                  )}
                </div>

                {/* Target - crisp and high visibility */}
                {row.entity_type && (
                  <>
                    <span className="text-slate-300">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-600">Target:</span>
                      <span className="font-bold text-slate-900 capitalize">{row.entity_type}</span>
                      {row.entity_id != null && (
                        <span className="font-mono text-[11.5px] font-bold text-slate-800 bg-slate-100/90 px-1.5 py-0.5 rounded border border-slate-200/80">
                          #{row.entity_id}
                        </span>
                      )}
                    </div>
                  </>
                )}

                {/* IP Address */}
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-600">IP:</span>
                  <span className="font-mono text-[11.5px] font-semibold text-slate-800 bg-slate-100/90 px-1.5 py-0.5 rounded border border-slate-200/80">
                    {row.ip || "127.0.0.1"}
                  </span>
                </div>
              </div>

              {/* Concise Field Changes Table (rendered only when field details exist) */}
              {row.details && row.details.length > 0 && (
                <div className="space-y-1.5 pt-0.5">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                    Field Changes ({row.details.length})
                  </div>

                  <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
                    <table className="w-full text-left text-[11.5px]">
                      <thead>
                        <tr className="border-b border-slate-200/80 bg-slate-100/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          <th className="px-3 py-1.5 w-1/4 font-semibold">Field</th>
                          <th className="px-3 py-1.5 w-1/3 font-semibold">Original Value</th>
                          <th className="px-1 py-1.5 w-5 text-center"></th>
                          <th className="px-3 py-1.5 w-1/3 font-semibold">New Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11.5px]">
                        {row.details.map((d, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-3 py-1 font-sans font-medium text-slate-800">
                              {d.field}
                            </td>
                            <td className="px-3 py-1 text-slate-400 truncate max-w-[180px]" title={String(d.from ?? "—")}>
                              {String(d.from ?? "—")}
                            </td>
                            <td className="px-1 py-1 text-center text-blue-500">
                              <ArrowRight className="h-3 w-3 inline-block" />
                            </td>
                            <td className="px-3 py-1 font-semibold text-blue-700 truncate max-w-[240px]" title={String(d.to ?? "—")}>
                              {String(d.to ?? "—")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        }}
        columns={[
          {
            key: "created_at",
            label: "Timestamp",
            width: "w-[16%]",
            render: (val) => {
              const f = formatTimestamp(val);
              return (
                <div className="text-slate-700 text-xs font-normal whitespace-nowrap" title={f.isoFull}>
                  {f.formattedShort}
                </div>
              );
            },
          },
          {
            key: "actor",
            label: "Performed By",
            width: "w-[15%]",
            render: (actor) => {
              const name = formatDisplayName(actor?.name) || actor?.name || "Administrator";
              return (
                <div
                  className="font-medium text-blue-600 hover:underline cursor-pointer text-xs truncate"
                  title={`${name}${actor?.role ? ` (${actor.role})` : ""}`}
                >
                  {name}
                </div>
              );
            },
          },
          {
            key: "category",
            label: "Module Category",
            width: "w-[14%]",
            render: (val) => {
              const catName = val ? val.charAt(0).toUpperCase() + val.slice(1) : "General";
              const badgeStyle = getCategoryBadgeClass(val);
              return (
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${badgeStyle} truncate max-w-[110px]`}
                  title={catName}
                >
                  {catName}
                </span>
              );
            },
          },
          {
            key: "summary",
            label: "Action Summary",
            width: "w-[34%]",
            render: (summary, row) => {
              const cleaned = cleanSummaryText(summary || row.action, row.subject_name) || "Settings modified";
              return (
                <div
                  className="text-slate-800 text-xs font-normal leading-snug truncate pr-3"
                  title={cleaned}
                >
                  {cleaned}
                </div>
              );
            },
          },
          {
            key: "item_affected",
            label: "Target Record",
            width: "w-[13%]",
            render: (_, row) => {
              const subject = formatDisplayName(row.subject_name) || row.subject_name;
              let text = "";
              if (subject) {
                text = subject;
              } else if (row.entity_type) {
                text = `${row.entity_type}${row.entity_id != null ? ` #${row.entity_id}` : ""}`;
              }
              if (!text) return <span className="text-slate-400 text-xs">—</span>;

              return (
                <span
                  className="inline-block truncate max-w-[130px] px-2 py-0.5 rounded bg-slate-100/90 text-slate-700 font-medium text-[11.5px] border border-slate-200/60"
                  title={text}
                >
                  {text}
                </span>
              );
            },
          },
          {
            key: "actions",
            label: "Actions",
            width: "w-[8%]",
            align: "right",
            render: (_, row) => {
              const isExpanded = expandedId === row.id;
              return (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedId(isExpanded ? null : row.id);
                  }}
                  className="text-blue-600 hover:text-blue-800 hover:underline text-xs font-medium whitespace-nowrap cursor-pointer"
                >
                  {isExpanded ? "Hide details" : "Show more"}
                </button>
              );
            },
          },
        ]}
        data={logs}
        currentPage={page}
        pageSize={PAGE_SIZE}
        totalItems={total}
        onPageChange={setPage}
        emptyState={{
          title: "No audit log entries found",
          description: "Try adjusting your search keywords, time range, or category filters.",
        }}
      />
    </div>
  );
}
