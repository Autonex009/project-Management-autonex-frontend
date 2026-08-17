import React from "react";
import Table from "../ui/Table";
import UserAvatar from "../ui/UserAvatar";
import { formatDisplayName } from "../../utils/displayName";

const getUtilizationBadge = (actual, planned) => {
  if (!planned || planned === 0) {
    if (actual > 0) return { label: "Unplanned", color: "bg-purple-50 text-purple-700 border-purple-200/80 shadow-xs shadow-purple-500/10" };
    return { label: "No Activity", color: "bg-slate-100 text-slate-500 border-slate-200" };
  }
  const ratio = (actual / planned) * 100;
  if (ratio >= 85 && ratio <= 115) {
    return { label: `Optimal (${Math.round(ratio)}%)`, color: "bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-xs shadow-emerald-500/10 font-bold" };
  }
  if (ratio < 85) {
    return { label: `Under (${Math.round(ratio)}%)`, color: "bg-amber-50 text-amber-700 border-amber-200/80 shadow-xs shadow-amber-500/10 font-bold" };
  }
  return { label: `Over (${Math.round(ratio)}%)`, color: "bg-rose-50 text-rose-700 border-rose-200/80 shadow-xs shadow-rose-500/10 font-bold" };
};

const ProjectTeamRosterTable = ({ roster = [], isLoading = false }) => {
  const columns = [
    {
      key: "employee",
      label: "Team Member",
      width: "w-[30%]",
      render: (_, row) => {
        const name = formatDisplayName(row.name) || row.name || row.email;
        return (
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar src={row.avatar_url} name={name} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-slate-900 text-[13px] truncate" title={name}>
                {name}
              </div>
              <div className="text-xs text-slate-400 font-mono truncate" title={row.email}>
                {row.email}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "role",
      label: "Project Role",
      width: "w-[15%]",
      render: (role) => (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 capitalize">
          {role || "Annotator"}
        </span>
      ),
    },
    {
      key: "planned_hours",
      label: "Planned Target",
      width: "w-[12%]",
      align: "right",
      render: (v) => <span className="font-mono text-xs text-slate-500 font-medium">{v ?? 0}h</span>,
    },
    {
      key: "actual_hours",
      label: "Actual Execution",
      width: "w-[15%]",
      align: "right",
      render: (v) => (
        <span className="font-mono text-xs font-black text-slate-900">{v ?? 0}h</span>
      ),
    },
    {
      key: "output",
      label: "Output Performance",
      width: "w-[18%]",
      align: "right",
      render: (_, row) => (
        <div className="text-xs font-mono text-slate-700">
          <span className="font-bold text-indigo-600">{row.tasks_submitted ?? 0} tks</span>
          <span className="text-slate-300 mx-1.5">•</span>
          <span className="font-bold text-emerald-600">{row.labels_created ?? 0} lbls</span>
        </div>
      ),
    },
    {
      key: "utilization",
      label: "Utilization Rating",
      width: "w-[15%]",
      align: "right",
      render: (_, row) => {
        const badge = getUtilizationBadge(row.actual_hours || 0, row.planned_hours || 0);
        return (
          <span
            className={`inline-block px-2.5 py-1 rounded-full text-[11px] border ${badge.color}`}
          >
            {badge.label}
          </span>
        );
      },
    },
  ];

  return (
    <Table
      variant="untitled"
      loading={isLoading}
      columns={columns}
      data={roster}
      emptyState={{
        title: "No team members assigned or active",
        description: "Assign team members in My Team or wait for Encord sync activity.",
      }}
    />
  );
};

export default ProjectTeamRosterTable;
