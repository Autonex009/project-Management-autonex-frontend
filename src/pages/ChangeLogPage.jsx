import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  History,
  User,
  Clock,
  RefreshCw,
  ArrowRight,
  Undo2,
  Users,
  FolderKanban,
  Calendar,
  Settings,
  Layers,
  ChevronDown,
  ChevronUp,
  Tag,
  Globe,
  ShieldCheck,
  X,
  Home,
  FileText,
  Briefcase,
  Building2,
  Wrench,
} from "lucide-react";
import { auditLogApi } from "../services/api";
import Table from "../components/ui/Table";
import UserAvatar from "../components/ui/UserAvatar";
import DatePicker from "../components/ui/DatePicker";
import SearchBar from "../components/ui/SearchBar";
import Dropdown from "../components/ui/Dropdown";
import Button from "../components/ui/Button";
import StatCard from "../components/dashboard/StatCard";
import { formatDisplayName } from "../utils/displayName";

const PAGE_SIZE = 25;

// Reversal actions get their own visual treatment — someone walking back a decision
// is the entry an admin most needs to notice, and it should not read as a routine edit.
// Keep in sync with REVERSAL_ACTIONS in app/api/audit_logs.py, which feeds the stat card.
const REVERSAL_ACTIONS = new Set([
  "leave.approval_revoked",
  "leave.reject_undone",
  "wfh.approval_revoked",
  "wfh.reject_undone",
  "signup_request.approval_revoked",
  "signup_request.reject_undone",
  "employee.restored",
]);

// One icon + colour per category, shared by the filter pills and the table cell so
// a category is recognisable in both places without reading the label.
// Keys must match the `category` values passed to audit_service.record on the
// backend. Anything unmapped still renders — it just falls back to a generic cog.
const CATEGORY_META = {
  employees: { icon: Users, color: "text-indigo-600" },
  projects: { icon: FolderKanban, color: "text-blue-600" },
  leaves: { icon: Calendar, color: "text-amber-600" },
  allocations: { icon: Layers, color: "text-purple-600" },
  access: { icon: ShieldCheck, color: "text-teal-600" },
  wfh: { icon: Home, color: "text-cyan-600" },
  guidelines: { icon: FileText, color: "text-sky-600" },
  "side projects": { icon: Briefcase, color: "text-violet-600" },
  vendors: { icon: Building2, color: "text-orange-600" },
  skills: { icon: Wrench, color: "text-lime-600" },
  settings: { icon: Settings, color: "text-slate-600" },
};

const categoryMeta = (category) =>
  CATEGORY_META[(category || "").toLowerCase()] || {
    icon: Settings,
    color: "text-slate-500",
  };

// "Who was acting?" is the first cut an admin makes, so it gets the segmented
// control rather than a dropdown. Values match the lower-cased `actor_role`
// snapshotted on each entry; "" means no filter.
const ROLE_TABS = [
  { value: "", label: "All" },
  { value: "employee", label: "Employee" },
  { value: "admin", label: "Admin" },
  { value: "pm", label: "PM" },
  { value: "hr", label: "HR" },
];

// Local-time yyyy-MM-dd. toISOString() would shift the date by the UTC offset and
// silently drop or add a day for anyone east/west of UTC.
const toISODate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const shortDate = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "";

// Date range as one compact control instead of two always-visible pickers: it keeps
// the filter row on a single line next to the search box and the two dropdowns, and
// the presets cover the ranges an admin actually asks for ("what happened today?").
const RANGE_PRESETS = [
  { label: "Today", days: 0 },
  { label: "Last 7 days", days: 6 },
  { label: "Last 30 days", days: 29 },
  { label: "This month", monthToDate: true },
];

function DateRangeFilter({ from, to, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const active = Boolean(from || to);
  const label = active
    ? from && to
      ? `${shortDate(from)} – ${shortDate(to)}`
      : from
        ? `From ${shortDate(from)}`
        : `Until ${shortDate(to)}`
    : "Any date";

  const applyPreset = (preset) => {
    const now = new Date();
    const start = preset.monthToDate
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() - preset.days);
    onChange(toISODate(start), toISODate(now));
    setOpen(false);
  };

  const isPresetActive = (preset) => {
    if (!from || !to) return false;
    const now = new Date();
    const start = preset.monthToDate
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() - preset.days);
    return from === toISODate(start) && to === toISODate(now);
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
          active
            ? "border-indigo-200 bg-indigo-50 font-medium text-indigo-700 hover:bg-indigo-100"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <Calendar
          className={`h-3.5 w-3.5 ${active ? "text-indigo-500" : "text-slate-400"}`}
        />
        {label}
        {active ? (
          <X
            className="h-3.5 w-3.5 text-indigo-400 hover:text-indigo-700"
            onClick={(e) => {
              e.stopPropagation();
              onChange("", "");
              setOpen(false);
            }}
          />
        ) : (
          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[70] mt-1.5 w-[320px] rounded-xl border border-slate-200 bg-white p-3 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)]">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">
            Quick ranges
          </p>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {RANGE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`rounded-lg border px-2 py-1.5 text-[12px] font-medium transition-colors ${
                  isPresetActive(preset)
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                From
              </label>
              <DatePicker
                value={from || ""}
                onChange={(e) => onChange(e.target.value, to)}
                placeholder="Earliest entry"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                To
              </label>
              <DatePicker
                value={to || ""}
                onChange={(e) => onChange(from, e.target.value)}
                placeholder="Latest entry"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
            <button
              type="button"
              onClick={() => onChange("", "")}
              disabled={!active}
              className="text-[12px] font-semibold text-slate-500 transition-colors hover:text-slate-800 disabled:opacity-40"
            >
              Clear range
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[12px] font-semibold text-indigo-600 transition-colors hover:text-indigo-700"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChangeLogPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [actionType, setActionType] = useState("All");
  const [actorId, setActorId] = useState("");
  const [actorRole, setActorRole] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filters = {
    page,
    page_size: PAGE_SIZE,
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(category !== "All" ? { category } : {}),
    ...(actionType !== "All" ? { action_type: actionType } : {}),
    ...(actorId ? { actor_id: Number(actorId) } : {}),
    ...(actorRole ? { actor_role: actorRole } : {}),
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
    // Keep the previous page visible while the next one loads, so the table
    // doesn't collapse to empty on every page change.
    placeholderData: (prev) => prev,
  });

  const { data: stats } = useQuery({
    queryKey: ["audit-log-stats"],
    queryFn: auditLogApi.getStats,
  });

  const { data: filterOptions } = useQuery({
    queryKey: ["audit-log-filters"],
    queryFn: auditLogApi.getFilters,
  });

  const logs = result?.items || [];
  const total = result?.total ?? 0;

  const activeFilterCount = useMemo(
    () =>
      [search.trim(), category !== "All" ? category : "", actionType !== "All" ? actionType : "", actorId, dateFrom, dateTo].filter(
        Boolean
      ).length,
    [search, category, actionType, actorId, dateFrom, dateTo]
  );

  // The role tab is a separate axis from the filter cluster — it isn't part of
  // "Clear N filters" — but an empty table caused by it still needs the narrowed copy.
  const narrowed = activeFilterCount > 0 || Boolean(actorRole);

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setCategory("All");
    setActionType("All");
    setActorId("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const formatTimestamp = (isoString) => {
    if (!isoString)
      return { dateStr: "—", timeStr: "—", relativeTime: "—", isoFull: "—" };

    // If ISO string lacks timezone offset/designator, append Z to ensure UTC interpretation
    const normalizedIso =
      typeof isoString === "string" &&
      !isoString.endsWith("Z") &&
      !/[+-]\d{2}:\d{2}$/.test(isoString)
        ? `${isoString}Z`
        : isoString;

    const date = new Date(normalizedIso);
    const diffMs = Math.max(0, Date.now() - date.getTime());
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let relativeTime;
    if (diffMins < 1) relativeTime = "Just now";
    else if (diffMins < 60) relativeTime = `${diffMins}m ago`;
    else if (diffHours < 24) relativeTime = `${diffHours}h ago`;
    else relativeTime = `${diffDays}d ago`;

    return {
      dateStr: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      timeStr: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      relativeTime,
      isoFull: date.toLocaleString(),
    };
  };

  const getActionBadgeClass = (actionType) => {
    const type = (actionType || "").toLowerCase();
    if (type === "promoted" || type === "approved")
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (type === "applied") return "bg-sky-50 text-sky-700 border-sky-200";
    if (type === "created" || type === "added")
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    if (type === "archived" || type === "deleted" || type === "rejected")
      return "bg-rose-50 text-rose-700 border-rose-200";
    if (type === "restored") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  const categoryOptions = useMemo(
    () => [
      { value: "All", label: "All categories" },
      ...(filterOptions?.categories || []).map((c) => ({ value: c, label: c })),
    ],
    [filterOptions]
  );

  // The actor list is as long as the company, so this dropdown is searchable —
  // scrolling to a name is the slow path when you already know who you're auditing.
  const actorOptions = useMemo(
    () => [
      { value: "", label: "Anyone" },
      ...(filterOptions?.actors || []).map((a) => ({
        value: String(a.id),
        label: `${formatDisplayName(a.name) || a.name} · ${a.role}`,
      })),
    ],
    [filterOptions]
  );

  const actionOptions = useMemo(
    () => [
      { value: "All", label: "All actions" },
      ...(filterOptions?.action_types || []).map((t) => ({
        value: t,
        label: t,
      })),
    ],
    [filterOptions]
  );

  const categoryBreakdown = useMemo(
    () =>
      Object.entries(stats?.by_category || {}).map(([label, value]) => ({
        label,
        value,
      })),
    [stats]
  );

  return (
    <div className="space-y-3 pb-12">
      {/* KPIs — one-line cards, since these are four plain counts and not the point
          of the page; the table below is */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          inline
          title="Total Recorded"
          value={stats?.total ?? "—"}
          icon={History}
          tone="indigo"
          breakdown={categoryBreakdown}
          breakdownFooter="By category"
        />
        <StatCard
          inline
          title="Today's Activity"
          value={stats?.today ?? "—"}
          icon={Clock}
          tone="emerald"
        />
        <StatCard
          inline
          title="Reversals (7d)"
          value={stats?.reversals_7d ?? "—"}
          icon={Undo2}
          tone="amber"
        />
        <StatCard
          inline
          title="Active Users (7d)"
          value={stats?.active_actors_7d ?? "—"}
          icon={Users}
          tone="violet"
        />
      </div>

      {/* Toolbar — role segment on the left · search / filters / refresh on the right */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {ROLE_TABS.map((tab) => {
            const isActive = actorRole === tab.value;
            const count =
              tab.value === "" ? stats?.total : stats?.by_actor_role?.[tab.value];
            return (
              <button
                key={tab.value || "all"}
                type="button"
                onClick={() => {
                  setActorRole(tab.value);
                  setPage(1);
                }}
                className={`rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition-all ${
                  isActive
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  {tab.label}
                  {count != null && (
                    <span
                      className={`font-mono text-[11px] tabular-nums ${isActive ? "text-slate-400" : "text-slate-400"}`}
                    >
                      {count}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              <X className="h-3.5 w-3.5" />
              Clear {activeFilterCount}
            </button>
          )}

          <SearchBar
            size="sm"
            width="w-56"
            clearable
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search person, entity…"
          />

          {/* Actor filter — "what did this one person do?", narrower than the role tabs */}
          <Dropdown
            className="w-40 shrink-0"
            options={actorOptions}
            value={actorId}
            onChange={(v) => {
              setActorId(v);
              setPage(1);
            }}
            placeholder="Anyone"
            searchable
            searchPlaceholder="Find a person…"
          />

          <Dropdown
            className="w-40 shrink-0"
            options={categoryOptions}
            value={category}
            onChange={(v) => {
              setCategory(v);
              setPage(1);
            }}
            placeholder="All categories"
          />

          <Dropdown
            className="w-36 shrink-0"
            options={actionOptions}
            value={actionType}
            onChange={(v) => {
              setActionType(v);
              setPage(1);
            }}
            placeholder="All actions"
          />

          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onChange={(from, to) => {
              setDateFrom(from || "");
              setDateTo(to || "");
              setPage(1);
            }}
          />

          <Button
            variant="secondary"
            size="icon"
            onClick={() => refetch()}
            title="Refresh"
            aria-label="Refresh"
            className="shrink-0 border border-slate-200"
          >
            <RefreshCw
              className={`h-4 w-4 text-slate-500 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Log table */}
      <Table
        variant="untitled"
        loading={isLoading}
        skeletonRows={8}
        expandedRowId={expandedId}
        onRowClick={(row) => setExpandedId(expandedId === row.id ? null : row.id)}
        rowClassName={(row) =>
          REVERSAL_ACTIONS.has(row.action) ? "bg-amber-50/40" : ""
        }
        renderExpandedRow={(row) => {
          const formatted = formatTimestamp(row.created_at);
          const actor = row.actor || {};
          return (
            <div className="space-y-4 border-t border-slate-200/80 bg-slate-50/90 p-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-slate-200/80 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-500">
                    LOG #{row.id}
                  </span>
                  <span className="rounded border border-indigo-100 bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-indigo-700">
                    {row.action}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Clock className="h-3.5 w-3.5 text-indigo-500" />
                  <strong className="font-mono text-slate-800">{formatted.isoFull}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <User className="h-3.5 w-3.5 text-indigo-500" /> Performed by
                  </div>
                  <div className="space-y-1 text-slate-700">
                    <div>
                      <span className="text-slate-400">Name:</span>{" "}
                      <strong className="text-slate-900">
                        {formatDisplayName(actor.name) || actor.name}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Email:</span>{" "}
                      <span className="font-mono text-slate-800">{actor.email || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Role at the time:</span>{" "}
                      <span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                        {actor.role}
                      </span>
                    </div>
                    {row.ip && (
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3 w-3 text-slate-400" />
                        <span className="font-mono text-[11px] text-slate-600">{row.ip}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <Tag className="h-3.5 w-3.5 text-indigo-500" /> Target
                  </div>
                  <div className="space-y-1 text-slate-700">
                    <div>
                      <span className="text-slate-400">Type:</span>{" "}
                      <strong className="text-slate-900">{row.entity_type}</strong>
                      {row.entity_id != null && (
                        <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">
                          #{row.entity_id}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400">Affected person:</span>{" "}
                      <strong className="text-indigo-700">
                        {formatDisplayName(row.subject_name) || row.subject_name || "—"}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Field changes ({row.details?.length || 0})
                </div>
                {row.details && row.details.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {row.details.map((d, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 items-center gap-2 py-2 text-xs sm:grid-cols-3"
                      >
                        <div className="font-bold text-slate-800">{d.field}</div>
                        <div className="truncate rounded border border-slate-200/60 bg-slate-50 px-2.5 py-1 font-mono text-[11.5px] text-slate-400 line-through">
                          {String(d.from ?? "—")}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-indigo-500" />
                          <span className="flex-1 truncate rounded border border-indigo-100 bg-indigo-50 px-2.5 py-1 font-mono text-[11.5px] font-bold text-indigo-700">
                            {String(d.to ?? "—")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-1 italic text-slate-400">
                    No field-level changes recorded for this action.
                  </div>
                )}
              </div>
            </div>
          );
        }}
        columns={[
          {
            key: "created_at",
            label: "When",
            width: "w-[15%]",
            render: (val) => {
              const f = formatTimestamp(val);
              return (
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-slate-800">
                    <Clock className="h-3.5 w-3.5 flex-shrink-0 text-indigo-500" />
                    <span>{f.relativeTime}</span>
                  </div>
                  <div className="mt-0.5 whitespace-nowrap text-[11px] text-slate-400">
                    {f.dateStr} · {f.timeStr}
                  </div>
                </div>
              );
            },
          },
          {
            key: "actor",
            label: "Who",
            width: "w-[20%]",
            render: (actor) => {
              if (!actor) return <span className="text-xs text-slate-400">—</span>;
              return (
                <div className="flex min-w-0 items-center gap-2.5">
                  <UserAvatar
                    src={actor.avatar_url}
                    name={actor.name}
                    size="sm"
                    className="h-8 w-8"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-slate-900">
                      {formatDisplayName(actor.name) || actor.name}
                    </div>
                    <div className="truncate text-[11px] text-slate-400">{actor.role}</div>
                  </div>
                </div>
              );
            },
          },
          {
            key: "summary",
            label: "What happened",
            width: "w-[42%]",
            render: (summary, row) => {
              const { icon: Icon, color } = categoryMeta(row.category);
              return (
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${getActionBadgeClass(row.action_type)}`}
                    >
                      {REVERSAL_ACTIONS.has(row.action) && (
                        <Undo2 className="mr-1 h-3 w-3" />
                      )}
                      {row.action_type}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                      <Icon className={`h-3.5 w-3.5 ${color}`} />
                      {row.category}
                    </span>
                  </div>
                  <div className="text-[12.5px] leading-snug text-slate-700">
                    {summary || (
                      <span className="italic text-slate-400">No summary recorded</span>
                    )}
                  </div>
                </div>
              );
            },
          },
          {
            key: "details",
            label: "Changes",
            width: "w-[18%]",
            render: (details) => {
              if (!details || details.length === 0) {
                return <span className="text-xs italic text-slate-400">—</span>;
              }
              return (
                <div className="space-y-1 py-0.5">
                  {details.slice(0, 2).map((d, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-[11px]"
                    >
                      <span className="font-semibold text-slate-700">{d.field}:</span>
                      <span className="max-w-[70px] truncate text-slate-400 line-through">
                        {String(d.from ?? "—")}
                      </span>
                      <ArrowRight className="h-3 w-3 flex-shrink-0 text-indigo-500" />
                      <span className="max-w-[80px] truncate font-semibold text-indigo-700">
                        {String(d.to ?? "—")}
                      </span>
                    </div>
                  ))}
                  {details.length > 2 && (
                    <div className="text-[10.5px] font-semibold text-indigo-600">
                      +{details.length - 2} more
                    </div>
                  )}
                </div>
              );
            },
          },
          {
            key: "expand",
            label: "",
            width: "w-[5%]",
            align: "center",
            render: (_, row) => (
              <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100">
                {expandedId === row.id ? (
                  <ChevronUp className="h-4 w-4 text-indigo-600" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </span>
            ),
          },
        ]}
        data={logs}
        currentPage={page}
        pageSize={PAGE_SIZE}
        totalItems={total}
        onPageChange={setPage}
        emptyState={{
          title: narrowed ? "No entries match these filters" : "No audit entries yet",
          description: narrowed
            ? "Try another role tab, a wider date range, or clearing a filter."
            : "Entries appear here as soon as someone applies for, approves, or edits something.",
        }}
      />
    </div>
  );
}
