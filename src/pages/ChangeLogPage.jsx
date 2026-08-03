import React, { useState, useEffect } from "react";
import {
  History,
  Search,
  Filter,
  User,
  Clock,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Users,
  FolderKanban,
  Calendar,
  Settings,
  ShieldCheck,
  UserPlus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Info,
  Globe,
  Tag,
} from "lucide-react";
import { getStoredLogs, clearLogs } from "../services/changeLogService";
import Table from "../components/ui/Table";
import UserAvatar from "../components/ui/UserAvatar";

export default function ChangeLogPage() {
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedActionType, setSelectedActionType] = useState("All");
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const loadLogs = () => {
    setLogs(getStoredLogs());
  };

  useEffect(() => {
    loadLogs();
    const handleUpdate = () => loadLogs();
    window.addEventListener("autonex:changelog_updated", handleUpdate);
    return () => window.removeEventListener("autonex:changelog_updated", handleUpdate);
  }, []);

  // Filter logs based on search, category, actionType
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !searchQuery.trim() ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.performer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.performer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details || []).some(
        (d) =>
          d.field.toLowerCase().includes(searchQuery.toLowerCase()) ||
          String(d.from).toLowerCase().includes(searchQuery.toLowerCase()) ||
          String(d.to).toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesCategory =
      selectedCategory === "All" ||
      log.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesActionType =
      selectedActionType === "All" ||
      log.actionType.toLowerCase() === selectedActionType.toLowerCase();

    return matchesSearch && matchesCategory && matchesActionType;
  });

  // Calculate metrics
  const totalLogsCount = logs.length;
  const todayCount = logs.filter((l) => {
    const d = new Date(l.timestamp);
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  }).length;
  const employeeEditsCount = logs.filter((l) => l.category === "Employees").length;
  const projectEditsCount = logs.filter((l) => l.category === "Projects").length;

  const formatTimestamp = (isoString) => {
    if (!isoString) return { dateStr: "—", timeStr: "—", relativeTime: "—", isoFull: "—" };
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let relativeTime = "";
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
      isoFull: isoString,
    };
  };

  const getActionBadgeClass = (actionType) => {
    const type = (actionType || "").toLowerCase();
    if (type === "promoted" || type === "approved") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (type === "applied") {
      return "bg-sky-50 text-sky-700 border-sky-200";
    }
    if (type === "created" || type === "added") {
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    }
    if (type === "archived" || type === "deleted" || type === "rejected") {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (type === "restored") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  const getCategoryIcon = (category) => {
    const cat = (category || "").toLowerCase();
    if (cat === "employees") return <Users className="w-3.5 h-3.5 text-indigo-600" />;
    if (cat === "projects") return <FolderKanban className="w-3.5 h-3.5 text-blue-600" />;
    if (cat === "leaves") return <Calendar className="w-3.5 h-3.5 text-amber-600" />;
    if (cat === "allocations") return <Layers className="w-3.5 h-3.5 text-purple-600" />;
    return <Settings className="w-3.5 h-3.5 text-slate-600" />;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Change Log
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Precise audit trail and detailed change logs of all portal operations
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadLogs}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Refresh Log
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
            <History className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 font-mono leading-none">
              {totalLogsCount}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-1">
              Total Logged Changes
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-700 font-mono leading-none">
              {todayCount}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-1">
              Today's Activity
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 font-mono leading-none">
              {employeeEditsCount}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-1">
              Employee Changes
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
            <FolderKanban className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 font-mono leading-none">
              {projectEditsCount}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-1">
              Project Changes
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by action, performer name, email, or entity..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Action Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              Action:
            </span>
            <select
              value={selectedActionType}
              onChange={(e) => {
                setSelectedActionType(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="All">All Actions</option>
              <option value="Applied">Applied</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Promoted">Promoted</option>
              <option value="Updated">Updated</option>
              <option value="Created">Created</option>
              <option value="Archived">Archived</option>
              <option value="Restored">Restored</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-400 mr-1.5">
            Category:
          </span>
          {["All", "Employees", "Projects", "Allocations", "Leaves", "System"].map((cat) => {
            const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all border ${
                  isActive
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Change Log Audit Table with Expandable Precise Details */}
      <Table
        variant="untitled"
        expandedRowId={expandedLogId}
        onRowClick={(row) => setExpandedLogId(expandedLogId === row.id ? null : row.id)}
        renderExpandedRow={(row) => {
          const formatted = formatTimestamp(row.timestamp);
          const performer = row.performer || {};
          return (
            <div className="p-4 bg-slate-50/90 border-t border-slate-200/80 space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
                    LOG ID: {row.id}
                  </span>
                  <span className="font-semibold text-slate-700">
                    Category: <strong className="text-indigo-600">{row.category}</strong>
                  </span>
                </div>
                <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Exact Timestamp:</span>
                  <strong className="text-slate-800 font-mono">{formatted.isoFull}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Performer & Target Context */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-indigo-500" /> Performer Metadata
                  </div>
                  <div className="space-y-1 text-slate-700">
                    <div>
                      <span className="text-slate-400">Name:</span>{" "}
                      <strong className="text-slate-900">{performer.name || "System Admin"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Email:</span>{" "}
                      <span className="font-mono text-slate-800">{performer.email || "admin@autonex.ai"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Role:</span>{" "}
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold text-[11px]">
                        {performer.role || "Admin"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Target Entity Metadata */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-indigo-500" /> Target Entity Metadata
                  </div>
                  <div className="space-y-1 text-slate-700">
                    <div>
                      <span className="text-slate-400">Target Type:</span>{" "}
                      <strong className="text-slate-900">{row.entity}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Target Name:</span>{" "}
                      <strong className="text-indigo-700">{row.entityName || "—"}</strong>
                    </div>
                    {row.entityId && (
                      <div>
                        <span className="text-slate-400">Target ID:</span>{" "}
                        <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          {row.entityId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Complete Side-by-Side Field Diffs */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Exact Field-Level Diffs ({row.details?.length || 0} fields modified)</span>
                  <span className="text-indigo-600 text-[11px] normal-case font-semibold">Click row to collapse</span>
                </div>
                {row.details && row.details.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {row.details.map((d, idx) => (
                      <div key={idx} className="py-2 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center text-xs">
                        <div className="font-bold text-slate-800">{d.field}</div>
                        <div className="text-slate-400 line-through bg-slate-50 border border-slate-200/60 rounded px-2.5 py-1 font-mono text-[11.5px] truncate">
                          {String(d.from ?? "—")}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ArrowRight className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                          <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-2.5 py-1 font-mono text-[11.5px] truncate flex-1">
                            {String(d.to ?? "—")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 italic py-1">No specific field modifications recorded.</div>
                )}
              </div>
            </div>
          );
        }}
        columns={[
          {
            key: "timestamp",
            label: "Time & Date",
            width: "w-[18%]",
            render: (val) => {
              const formatted = formatTimestamp(val);
              return (
                <div className="min-w-0">
                  <div className="text-[12.5px] font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                    <span>{formatted.relativeTime}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">
                    {formatted.dateStr} · {formatted.timeStr}
                  </div>
                </div>
              );
            },
          },
          {
            key: "performer",
            label: "Performed By",
            width: "w-[24%]",
            render: (performer) => {
              if (!performer) return <span className="text-xs text-slate-400">—</span>;
              return (
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatar src={performer.avatar_url} name={performer.name} size="sm" className="w-8 h-8" />
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-slate-900 truncate">
                      {performer.name}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {performer.role || "Admin"}
                    </div>
                  </div>
                </div>
              );
            },
          },
          {
            key: "action",
            label: "Action & Category",
            width: "w-[25%]",
            render: (action, row) => (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${getActionBadgeClass(
                      row.actionType
                    )}`}
                  >
                    {action}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                  {getCategoryIcon(row.category)}
                  <span>{row.category}</span>
                  {row.entityName && (
                    <span className="text-slate-800 font-semibold truncate max-w-[140px] inline-block align-bottom">
                      · {row.entityName}
                    </span>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: "details",
            label: "Change Details (Diff)",
            width: "w-[28%]",
            render: (details) => {
              if (!details || details.length === 0) {
                return <span className="text-xs text-slate-400 italic">No field diffs recorded</span>;
              }
              return (
                <div className="space-y-1 py-0.5">
                  {details.slice(0, 2).map((d, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 flex-wrap"
                    >
                      <span className="font-semibold text-slate-700 min-w-[85px]">
                        {d.field}:
                      </span>
                      <span className="text-slate-400 line-through bg-slate-100 px-1.5 py-0.5 rounded text-[11px] max-w-[100px] truncate">
                        {String(d.from ?? "—")}
                      </span>
                      <ArrowRight className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                      <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-[11px] max-w-[120px] truncate">
                        {String(d.to ?? "—")}
                      </span>
                    </div>
                  ))}
                  {details.length > 2 && (
                    <div className="text-[10.5px] font-semibold text-indigo-600 pt-0.5">
                      +{details.length - 2} more fields (click row to view all)
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
            render: (_, row) => {
              const isExpanded = expandedLogId === row.id;
              return (
                <button
                  type="button"
                  className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              );
            },
          },
        ]}
        data={filteredLogs}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
        emptyState={{
          title: "No audit logs found",
          description: "Try clearing search keywords or selecting another category filter.",
        }}
      />
    </div>
  );
}
