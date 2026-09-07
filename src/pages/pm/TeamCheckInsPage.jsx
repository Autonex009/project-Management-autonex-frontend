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
} from "lucide-react";
import { checkinApi, parentProjectApi } from "../../services/api";
import Table from "../../components/ui/Table";
import UserAvatar from "../../components/ui/UserAvatar";
import Dropdown from "../../components/ui/Dropdown";
import Button from "../../components/ui/Button";
import StatCard from "../../components/dashboard/StatCard";
import SearchBar from "../../components/ui/SearchBar";
import HistoryMatrix from "../../components/checkin/HistoryMatrix";
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

const TeamCheckInsPage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState("");
  const [activeTab, setActiveTab] = useState("today");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const limit = 20;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["checkins-team-today", page, search, projectId, statusFilter, timeFilter],
    queryFn: () => checkinApi.getTeamToday({ 
      page, limit, search, 
      project_id: projectId || undefined, 
      status: statusFilter, 
      time_filter: timeFilter 
    }),
    staleTime: 60 * 1000,
  });

  const { data: projectsData } = useQuery({
    queryKey: ["all-projects"],
    queryFn: () => parentProjectApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });
  const projectsList = projectsData?.items || [];

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
      // If all on current page are selected, deselect them all
      const newSet = new Set(selectedIds);
      pendingItems.forEach(r => newSet.delete(r.employee_id));
      setSelectedIds(newSet);
    } else {
      // Select all pending on current page
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
      width: "w-[26%]",
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
      width: "w-[24%]",
      render: (_, row) => (
        <span className="block truncate text-slate-600">
          {row.project_names.join(", ") || "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "w-[16%]",
      render: (_, row) =>
        row.checked_in ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Checked in
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            <CircleDashed className="h-3 w-3" /> Not yet
          </span>
        ),
    },
    {
      key: "mode",
      label: "Mode",
      width: "w-[10%]",
      render: (_, row) => <WorkModePill mode={row.work_mode} />,
    },
    {
      key: "time",
      label: "Checked in",
      width: "w-[12%]",
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <StatCard
          title="On your projects"
          value={data?.kpi_total ?? 0}
          icon={ListChecks}
          tone="indigo"
          hint="today"
        />
        <StatCard
          title="Checked in"
          value={data?.kpi_checked_in ?? 0}
          icon={CheckCircle2}
          tone="emerald"
          hint="so far today"
        />
        <StatCard
          title="Confirmed"
          value={data?.kpi_confirmed ?? 0}
          icon={ShieldCheck}
          tone="sky"
          hint="reviewed by you"
        />
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-40">
            <Dropdown
              value={projectId}
              onChange={(v) => { setProjectId(v); setPage(1); }}
              placeholder="All Projects"
              options={[
                { value: "", label: "All Projects" },
                ...projectsList.map((p) => ({ value: p.id, label: p.name }))
              ]}
            />
          </div>

          <div className="w-36">
            <Dropdown
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setPage(1); }}
              placeholder="All Statuses"
              options={[
                { value: "", label: "All Statuses" },
                { value: "checked_in", label: "Checked In" },
                { value: "pending", label: "Not Yet" }
              ]}
            />
          </div>

          <div className="w-36">
            <Dropdown
              value={timeFilter}
              onChange={(v) => { setTimeFilter(v); setPage(1); }}
              placeholder="All Times"
              options={[
                { value: "", label: "All Times" },
                { value: "late", label: "After 10:00 AM" }
              ]}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <SearchBar 
            value={search} 
            onChange={(v) => { setSearch(v); setPage(1); }} 
            placeholder="Search roster..." 
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
