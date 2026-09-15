import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  ListChecks,
  Building2,
  Home,
  CheckCircle2,
  CircleDashed,
  ShieldCheck,
  AlertTriangle,
  Smile,
  RotateCcw,
} from "lucide-react";
import { checkinApi, subProjectApi } from "../../services/api";
import Table from "../../components/ui/Table";
import UserAvatar from "../../components/ui/UserAvatar";
import CheckinFilterDropdown from "../../components/checkin/CheckinFilterDropdown";
import Button from "../../components/ui/Button";
import StatCard from "../../components/dashboard/StatCard";
import SearchBar from "../../components/ui/SearchBar";
import HistoryMatrix from "../../components/checkin/HistoryMatrix";
import MetricDots from "../../components/ui/MetricDots";
import { formatDisplayName } from "../../utils/displayName";

const fmtTime = (v) =>
  v
    ? new Date(v).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : "—";

const WorkModePill = ({ mode }) =>
  mode ? (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${mode === "WFH" ? "bg-sky-50 text-sky-700" : "bg-indigo-50 text-indigo-700"}`}
    >
      {mode === "WFH" ? <Home className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
      {mode}
    </span>
  ) : (
    <span className="text-xs text-slate-400">—</span>
  );

const SentimentPill = ({ mood }) => {
  if (!mood) return <span className="text-xs text-slate-400">—</span>;
  const config = {
    great: { label: "Great", icon: "😁", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    okay: { label: "Okay", icon: "🙂", bg: "bg-blue-50 text-blue-700 border-blue-200" },
    low: { label: "Low", icon: "😟", bg: "bg-amber-50 text-amber-700 border-amber-200" },
    stressed: { label: "Stressed", icon: "😫", bg: "bg-rose-50 text-rose-700 border-rose-200" },
  };
  const item = config[mood.toLowerCase()] || { label: mood, icon: "😶", bg: "bg-slate-50 text-slate-700 border-slate-200" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${item.bg}`}>
      <span>{item.icon}</span>
      <span>{item.label}</span>
    </span>
  );
};

const TeamCheckInsPage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [projectIds, setProjectIds] = useState([]);
  const [statusFilters, setStatusFilters] = useState([]);
  const [timeFilters, setTimeFilters] = useState([]);
  const [customTimeFrom, setCustomTimeFrom] = useState("");
  const [customTimeTo, setCustomTimeTo] = useState("");
  const [workModeFilters, setWorkModeFilters] = useState([]);
  const [officeFloorFilters, setOfficeFloorFilters] = useState([]);
  const [sentimentFilters, setSentimentFilters] = useState([]);
  const [activeTab, setActiveTab] = useState("today");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const limit = 20;

  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "checkins-team-today",
      page,
      search,
      projectIds,
      statusFilters,
      timeFilters,
      customTimeFrom,       
      customTimeTo,         
      workModeFilters,
      officeFloorFilters,
      sentimentFilters,
    ],
    queryFn: () =>
      checkinApi.getTeamToday({
        page,
        limit,
        search,
        project_id: projectIds.join(",") || undefined,
        status: statusFilters.join(","),
        time_filter: timeFilters.join(","),
        time_from: timeFilters.includes("custom") ? customTimeFrom || undefined : undefined,
        time_to: timeFilters.includes("custom") ? customTimeTo || undefined : undefined,
        work_mode: workModeFilters.join(","),
        office_floor: officeFloorFilters.join(","),
        sentiment: sentimentFilters.join(","),
      }),
    staleTime: 60 * 1000,
  });
  const { data: projectsData } = useQuery({
    queryKey: ["all-sub-projects"],
    queryFn: () => subProjectApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });
  const projectsList = Array.isArray(projectsData) ? projectsData : (projectsData?.items || []);

  const { mutate: confirmAll, isPending: confirming } = useMutation({
    mutationFn: () => checkinApi.confirmTeam(selectedIds.size > 0 ? Array.from(selectedIds) : undefined),
    onSuccess: (result) => {
      toast.success(
        result.confirmed > 0
          ? `Confirmed ${result.confirmed} check-in${result.confirmed === 1 ? "" : "s"}.`
          : "Nothing new to confirm.",
      );
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["checkins-team-today"] });
    },
    onError: () => toast.error("Couldn't confirm the roster. Please try again."),
  });

  const items = data?.items || [];
  const totalCount = data?.total || 0; // for pagination
  const pendingItems = items.filter((r) => r.checked_in && !r.pm_confirmed_at);
  const pendingOnPage = pendingItems.length;

  const allSelected = pendingOnPage > 0 && pendingItems.every(r => selectedIds.has(r.employee_id));

  const toggleAll = () => {
    if (allSelected) {
      const newSet = new Set(selectedIds);
      pendingItems.forEach(r => newSet.delete(r.employee_id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      pendingItems.forEach(r => newSet.add(r.employee_id));
      setSelectedIds(newSet);
    }
  };

  const toggleRow = (empId) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(empId)) {
      newSet.delete(empId);
    } else {
      newSet.add(empId);
    }
    setSelectedIds(newSet);
  };

  const hasActiveFilters =
    projectIds.length > 0 ||
    statusFilters.length > 0 ||
    timeFilters.length > 0 ||
    workModeFilters.length > 0 ||
    officeFloorFilters.length > 0 ||
    sentimentFilters.length > 0 ||
    search.trim() !== "" ||
    (timeFilters.includes("custom") && (customTimeFrom || customTimeTo));

  const clearAllFilters = () => {
    setProjectIds([]);
    setStatusFilters([]);
    setTimeFilters([]);
    setCustomTimeFrom("");
    setCustomTimeTo("");
    setWorkModeFilters([]);
    setOfficeFloorFilters([]);
    setSentimentFilters([]);
    setSearch("");
    setPage(1);
  };

  const columns = [
    {
      key: "selection",
      label: (
        <input
          type="checkbox"
          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
          checked={allSelected}
          onChange={toggleAll}
          disabled={pendingOnPage === 0}
        />
      ),
      width: "w-[4%]",
      render: (_, row) => {
        const isPending = row.checked_in && !row.pm_confirmed_at;
        if (!isPending) return null;

        return (
          <input
            type="checkbox"
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
            checked={selectedIds.has(row.employee_id)}
            onChange={(e) => {
              e.stopPropagation();
              toggleRow(row.employee_id);
            }}
          />
        );
      },
    },
    {
      key: "employee",
      label: "Employee",
      width: "w-[24%]",
      render: (_, row) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <UserAvatar src={row.avatar_url} name={row.name} size="w-8 h-8 text-[13px]" />
          <div className="min-w-0 flex items-center gap-2">
            <div>
              <p className="truncate font-medium text-slate-800">
                {formatDisplayName(row.name)}
              </p>
              {row.designation && (
                <p className="truncate text-xs text-slate-400">{row.designation}</p>
              )}
            </div>
            {!row.is_officially_allocated && row.checked_in && (
              <span title="Not officially allocated to this project" className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                <AlertTriangle className="w-3 h-3" /> Unallocated
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "projects",
      label: "Projects",
      width: "w-[20%]",
      render: (_, row) => (
        <span className="block truncate text-slate-600">
          {row.project_names.join(", ") || "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "w-[12%]",
      render: (_, row) => {
        if (row.is_on_leave) {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              <CircleDashed className="h-3 w-3" /> On Leave
            </span>
          );
        }
        return row.checked_in ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Checked in
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            <CircleDashed className="h-3 w-3" /> Not yet
          </span>
        );
      },
    },
    {
      key: "mode",
      label: "Mode",
      width: "w-[8%]",
      render: (_, row) => <WorkModePill mode={row.work_mode} />,
    },
    {
      key: "sentiment",
      label: "Sentiment",
      width: "w-[12%]",
      render: (_, row) => <SentimentPill mood={row.mood} />,
    },
    {
      key: "floor",
      label: "Floor",
      width: "w-[8%]",
      render: (_, row) => (
        <span className="text-slate-600 font-medium">{row.office_floor || "—"}</span>
      ),
    },
    {
      key: "time",
      label: "Checked in",
      width: "w-[10%]",
      render: (_, row) => (
        <span className="text-slate-500">{fmtTime(row.checked_in_at)}</span>
      ),
    },
    {
      key: "confirmed",
      label: "Confirmed",
      align: "right",
      width: "w-[12%]",
      render: (_, row) =>
        row.pm_confirmed_at ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600">
            <ShieldCheck className="h-3.5 w-3.5" /> {fmtTime(row.pm_confirmed_at)}
          </span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        ),
    },
  ];

  const approvedLeaveCount = data?.kpi_approved_leaves_count ?? 0;
  const pendingLeaveCount = data?.kpi_pending_leaves_count ?? 0;
  const totalOnLeave = approvedLeaveCount + pendingLeaveCount;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-4">
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 ${activeTab === 'today' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('today')}
        >
          Today's Roster
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 ${activeTab === 'history' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('history')}
        >
          Historical Matrix
        </button>
      </div>

      {activeTab === 'today' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <StatCard
              title="On your projects"
              value={data?.kpi_total ?? 0}
              icon={ListChecks}
              tone="indigo"
              hint={
                <span className="text-slate-500">
                  <strong className="text-amber-600 font-semibold">{totalOnLeave}</strong> on leave today
                </span>
              }
              breakdown={[
                {
                  title: "Leave Summary",
                  rows: [
                    { label: "Approved Leaves", value: approvedLeaveCount },
                    { label: "Pending Leaves", value: pendingLeaveCount },
                  ]
                },
                ...((data?.kpi_approved_leaves_names || []).length > 0 ? [{
                  title: `Approved (${data.kpi_approved_leaves_names.length})`,
                  rows: data.kpi_approved_leaves_names.map(name => ({ label: formatDisplayName(name), value: "Approved" }))
                }] : []),
                ...((data?.kpi_pending_leaves_names || []).length > 0 ? [{
                  title: `Pending Approval (${data.kpi_pending_leaves_names.length})`,
                  rows: data.kpi_pending_leaves_names.map(name => ({ label: formatDisplayName(name), value: "Pending" }))
                }] : [])
              ]}
            />

            <StatCard
              title="Checked In"
              value={data?.kpi_checked_in ?? 0}
              icon={CheckCircle2}
              tone="emerald"
              hint={
                <MetricDots
                  items={[
                    {
                      label: "WFO",
                      value: data?.kpi_wfo ?? 0,
                      dot: "bg-emerald-500",
                      tone: "text-emerald-600",
                    },
                    {
                      label: "WFH",
                      value: data?.kpi_wfh ?? 0,
                      dot: "bg-sky-500",
                      tone: "text-sky-600",
                    },
                  ]}
                />
              }
              breakdown={[
                {
                  title: "Work Mode",
                  rows: [
                    { label: "WFO", value: data?.kpi_wfo ?? 0 },
                    { label: "WFH", value: data?.kpi_wfh ?? 0 },
                  ]
                },
                {
                  title: "PM Confirmation",
                  rows: [
                    { label: "Confirmed by you", value: data?.kpi_confirmed ?? 0 },
                    { label: "Pending confirmation", value: Math.max(0, (data?.kpi_checked_in ?? 0) - (data?.kpi_confirmed ?? 0)) },
                  ]
                },
                {
                  title: "Timing & Checkout",
                  rows: [
                    { label: "Late (After 10 AM)", value: data?.kpi_late ?? 0 },
                    { label: "Already Checked Out", value: data?.kpi_checked_out ?? 0 },
                  ]
                }
              ]}
            />

            <StatCard
              title="Office & Lunch"
              value={data?.kpi_wfo ?? 0}
              icon={Building2}
              tone="amber"
              hint="on premises"
              breakdown={[
                {
                  title: "Floors",
                  rows: [
                    { label: "Floor 7", value: data?.kpi_floor_7 ?? 0 },
                    { label: "Floor 9", value: data?.kpi_floor_9 ?? 0 },
                    { label: "Floor 17", value: data?.kpi_floor_17 ?? 0 },
                  ]
                },
                {
                  title: "Lunch Prefs",
                  rows: [
                    { label: "Order Tiffin", value: data?.kpi_order_tiffin ?? 0 },
                    { label: "Canteen", value: data?.kpi_canteen ?? 0 },
                  ]
                }
              ]}
            />

            <StatCard
              title="Company Sentiments"
              value={data?.kpi_checked_in ?? 0}
              icon={Smile}
              tone="rose"
              hint="overall vibe"
              breakdown={[
                { label: "Great 😁", value: data?.kpi_mood_great ?? 0 },
                { label: "Okay 🙂", value: data?.kpi_mood_okay ?? 0 },
                { label: "Low 😟", value: data?.kpi_mood_low ?? 0 },
                { label: "Stressed 😫", value: data?.kpi_mood_stressed ?? 0 },
              ]}
            />
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <CheckinFilterDropdown
                projectIds={projectIds}
                setProjectIds={(v) => { setProjectIds(v); setPage(1); }}
                projectsList={projectsList}
                statusFilters={statusFilters}
                setStatusFilters={(v) => { setStatusFilters(v); setPage(1); }}
                timeFilters={timeFilters}
                setTimeFilters={(v) => { setTimeFilters(v); setPage(1); }}
                customTimeFrom={customTimeFrom}          
                setCustomTimeFrom={setCustomTimeFrom}    
                customTimeTo={customTimeTo}             
                setCustomTimeTo={setCustomTimeTo}       
                workModeFilters={workModeFilters}
                setWorkModeFilters={(v) => { setWorkModeFilters(v); setPage(1); }}
                officeFloorFilters={officeFloorFilters}
                setOfficeFloorFilters={(v) => { setOfficeFloorFilters(v); setPage(1); }}
                sentimentFilters={sentimentFilters}
                setSentimentFilters={(v) => { setSentimentFilters(v); setPage(1); }}
                onClearAll={clearAllFilters}
              />

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-xs text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50 flex items-center gap-1.5 cursor-pointer h-[38px] px-2.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Clear Filters
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <SearchBar
                value={search}
                onChange={(v) => { setSearch(v); setPage(1); }}
                placeholder="Search by employee name..."
                className="w-64"
              />
              <Button
                onClick={() => confirmAll()}
                disabled={confirming || pendingItems.length === 0}
              >
                {confirming
                  ? "Confirming…"
                  : selectedIds.size > 0
                    ? `Confirm Selected (${selectedIds.size})`
                    : "Confirm All Pending"
                }
              </Button>
            </div>
          </div>

          {isError ? (
            <div className="rounded-3xl border border-dashed border-red-200 bg-red-50/40 p-12 text-center shadow-sm">
              <h2 className="text-lg font-semibold text-red-700">Couldn't load today's roster</h2>
              <p className="mt-2 text-sm text-red-500">Something went wrong. Try refreshing the page.</p>
            </div>
          ) : (
            <Table
              variant="untitled"
              columns={columns}
              data={items}
              loading={isLoading}
              skeletonRows={6}
              pageSize={limit}
              currentPage={page}
              totalItems={totalCount}
              onPageChange={setPage}
              emptyState={{
                title: "No one found",
                description: "No employees match your search or allocation criteria.",
              }}
            />
          )}
        </>
      ) : (
        <HistoryMatrix role="pm" />
      )}
    </div>
  );
};

export default TeamCheckInsPage;
