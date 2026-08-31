import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  ListChecks,
  Building2,
  Home,
  CheckCircle2,
  CircleDashed,
  ShieldCheck,
} from "lucide-react";
import { checkinApi } from "../../services/api";
import Table from "../../components/ui/Table";
import UserAvatar from "../../components/ui/UserAvatar";
import Button from "../../components/ui/Button";
import StatCard from "../../components/dashboard/StatCard";
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

  const { data, isLoading, isError } = useQuery({
    queryKey: ["checkins-team-today"],
    queryFn: () => checkinApi.getTeamToday(),
    staleTime: 60 * 1000,
  });

  const { mutate: confirmAll, isPending: confirming } = useMutation({
    mutationFn: () => checkinApi.confirmTeam(),
    onSuccess: (result) => {
      toast.success(
        result.confirmed > 0
          ? `Confirmed ${result.confirmed} check-in${result.confirmed === 1 ? "" : "s"}.`
          : "Nothing new to confirm.",
      );
      queryClient.invalidateQueries({ queryKey: ["checkins-team-today"] });
    },
    onError: () => toast.error("Couldn't confirm the roster. Please try again."),
  });

  const rows = data?.rows || [];
  const pendingConfirm = rows.filter((r) => r.checked_in && !r.pm_confirmed_at).length;

  const columns = [
    {
      key: "employee",
      label: "Employee",
      width: "w-[26%]",
      render: (_, row) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <UserAvatar src={row.avatar_url} name={row.name} size="w-8 h-8 text-[13px]" />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-800">
              {formatDisplayName(row.name)}
            </p>
            {row.designation && (
              <p className="truncate text-xs text-slate-400">{row.designation}</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          title="On your projects"
          value={data?.total ?? 0}
          icon={ListChecks}
          tone="indigo"
          hint="today"
        />
        <StatCard
          title="Checked in"
          value={data?.checked_in ?? 0}
          icon={CheckCircle2}
          tone="emerald"
          hint="so far today"
        />
        <StatCard
          title="Confirmed"
          value={data?.confirmed ?? 0}
          icon={ShieldCheck}
          tone="sky"
          hint="reviewed by you"
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Today's Roster</h2>
          <p className="text-xs text-slate-500">
            Everyone allocated to a project you run, and whether they've checked in.
          </p>
        </div>
        <Button
          onClick={() => confirmAll()}
          disabled={confirming || pendingConfirm === 0}
        >
          {confirming
            ? "Confirming…"
            : pendingConfirm > 0
              ? `Confirm ${pendingConfirm} check-in${pendingConfirm === 1 ? "" : "s"}`
              : "All confirmed"}
        </Button>
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
          data={rows}
          loading={isLoading}
          skeletonRows={6}
          pageSize={rows.length || 10}
          emptyState={{
            title: "No one on your projects yet",
            description: "Once employees are allocated to your projects, they'll show up here.",
          }}
        />
      )}
    </div>
  );
};

export default TeamCheckInsPage;
