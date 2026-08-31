import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Home,
  CheckCircle2,
  CircleDashed,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { checkinApi } from "../../services/api";
import Table from "../../components/ui/Table";
import UserAvatar from "../../components/ui/UserAvatar";
import SearchBar from "../../components/ui/SearchBar";
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

const AdminCheckInsPage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const limit = 20;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["checkins-admin-today", page, search],
    queryFn: () => checkinApi.getAdminPaginated({ page, limit, search }),
    staleTime: 60 * 1000,
  });

  const items = data?.items || [];
  const totalCount = data?.total || 0;

  const columns = [
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
      label: "Confirmed by PM",
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
    <div className="space-y-4 max-w-[1200px] mx-auto py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Company Check-ins</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor daily attendance and work locations across the entire company.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBar 
            value={search} 
            onChange={(v) => { setSearch(v); setPage(1); }} 
            placeholder="Search employees..." 
            className="w-72"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-sm font-medium text-slate-500 mb-1">Total Active Employees</p>
          <p className="text-2xl font-bold text-slate-900">{data?.kpi_total ?? 0}</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-center">
          <p className="text-sm font-medium text-emerald-700 mb-1">Checked In Today</p>
          <p className="text-2xl font-bold text-emerald-900">{data?.kpi_checked_in ?? 0}</p>
        </div>
        <div className="bg-sky-50 p-4 rounded-xl border border-sky-100 shadow-sm flex flex-col justify-center">
          <p className="text-sm font-medium text-sky-700 mb-1">Confirmed by PM</p>
          <p className="text-2xl font-bold text-sky-900">{data?.kpi_confirmed ?? 0}</p>
        </div>
      </div>

      {isError ? (
        <div className="rounded-3xl border border-dashed border-red-200 bg-red-50/40 p-12 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-red-700">Couldn't load company check-ins</h2>
          <p className="mt-2 text-sm text-red-500">Something went wrong. Try refreshing the page.</p>
        </div>
      ) : (
        <Table
          variant="untitled"
          columns={columns}
          data={items}
          loading={isLoading}
          skeletonRows={10}
          pageSize={limit}
          currentPage={page}
          totalItems={totalCount}
          onPageChange={setPage}
          emptyState={{
            title: "No employees found",
            description: "No one matches your search criteria.",
          }}
        />
      )}
    </div>
  );
};

export default AdminCheckInsPage;
