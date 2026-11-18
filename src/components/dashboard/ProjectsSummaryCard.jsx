import React, { useState, useMemo } from "react";
import { FolderKanban, Search, ArrowUpRight, Zap, Minus, AlertCircle } from "lucide-react";
import Table from "../ui/Table";
import { formatDisplayName } from "../../utils/displayName";

const fmtHours = (h) =>
  h != null && !isNaN(h)
    ? `${Number(h).toLocaleString("en-US", { minimumFractionDigits: Number(h) % 1 !== 0 ? 1 : 0, maximumFractionDigits: 1 })}h`
    : "0h";

const SentimentBadge = ({ sentiment }) => {
  const norm = String(sentiment || "").trim().toUpperCase();
  if (norm === "GOOD") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/90 bg-emerald-50/70 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
        <Zap className="h-2.5 w-2.5 fill-emerald-600 text-emerald-600" />
        <span>Good</span>
      </span>
    );
  }
  if (norm === "AVG" || norm === "AVERAGE") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/90 bg-amber-50/70 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">
        <Minus className="h-2.5 w-2.5 stroke-[2.5] text-amber-600" />
        <span>Avg</span>
      </span>
    );
  }
  if (norm === "POOR") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200/90 bg-rose-50/70 px-2.5 py-0.5 text-[10px] font-semibold text-rose-700">
        <AlertCircle className="h-2.5 w-2.5 text-rose-600" />
        <span>Poor</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/90 bg-emerald-50/70 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
      <Zap className="h-2.5 w-2.5 fill-emerald-600 text-emerald-600" />
      <span>Good</span>
    </span>
  );
};

const extractNames = (row, ...keys) => {
  const project = row?.project || row || {};
  for (const k of keys) {
    const val = row?.[k] ?? project?.[k];
    if (val != null) {
      if (Array.isArray(val)) {
        const names = val
          .map((item) => (typeof item === "object" ? item?.name : item))
          .filter(Boolean);
        if (names.length > 0) return names;
      } else if (typeof val === "string") {
        const trimmed = val.trim();
        if (trimmed && trimmed !== "-" && trimmed !== "—") {
          return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
        }
      }
    }
  }
  return [];
};

const formatLeaders = (namesList) => {
  const list = Array.isArray(namesList) ? namesList : [namesList];
  const valid = list
    .map((n) => (typeof n === "string" ? n.trim() : ""))
    .filter((n) => n && n !== "-" && n !== "—");

  if (valid.length === 0) {
    return { display: "—", full: "—", isEmpty: true };
  }
  const full = valid.join(", ");
  const display = valid.map((n) => formatDisplayName(n) || n).join(", ");
  return { display, full, isEmpty: false };
};

const renderLeaderCell = (row, ...keys) => {
  const raw = extractNames(row, ...keys);
  const { display, full, isEmpty } = formatLeaders(raw);

  if (isEmpty) {
    return (
      <span className="text-[12px] text-slate-400 font-normal select-none">
        —
      </span>
    );
  }

  return (
    <div className="group/tip relative min-w-0 py-0.5">
      <div className="truncate text-[12px] font-medium text-slate-700">
        {display}
      </div>
      <span className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-max max-w-[240px] whitespace-normal break-words rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-lg group-hover/tip:block">
        {full}
      </span>
    </div>
  );
};

// Default fallback list exactly matching image copy 25.png and image.png
const DEFAULT_PROJECTS = [
  { id: 1, name: "W-Production Project", client: "Walden", autonexHours: 1976.9, annotators: 71, reviewers: 9, sentiment: "AVG", pm_names: ["Rahul Kumar", "Manish Thombre"], team_lead_names: ["Rajani Chouhan", "Prathamesh Sawle"] },
  { id: 2, name: "Walden_BOS", client: "Walden", autonexHours: 1227.7, annotators: 24, reviewers: 6, sentiment: "GOOD", pm_names: ["Chirag Rao"], team_lead_names: ["Badiuz Faruqui", "Anubhav Omkar"] },
  { id: 3, name: "Gen2_import_v1", client: "Truck-Boxes", autonexHours: 73.1, annotators: 0, reviewers: 4, sentiment: "GOOD", pm_names: ["Sukrut Nivendkar"], team_lead_names: [] },
  { id: 4, name: "Maps - QA_Prod", client: "Boston Dynamics", autonexHours: 0, annotators: 3, reviewers: 10, sentiment: "GOOD", pm_names: ["Piyush Dharpure"], team_lead_names: ["Anjali Dongre"] },
  { id: 5, name: "Small Model Evaluation 2", client: "TML", autonexHours: 0, annotators: 0, reviewers: 0, sentiment: "GOOD", pm_names: ["Eknath Niraj Agrawal"], team_lead_names: [] },
  { id: 6, name: "Ground Vehicles", client: "Maxar/Vantor", autonexHours: 0, annotators: 0, reviewers: 6, sentiment: "GOOD", pm_names: ["Sukrut Nivendkar"], team_lead_names: [] },
  { id: 7, name: "Pedestrian Safety v3", client: "Aptiv", autonexHours: 0, annotators: 12, reviewers: 2, sentiment: "GOOD", pm_names: ["Chirag Rao"], team_lead_names: [] },
  { id: 8, name: "Lane Detection Core", client: "Waymo", autonexHours: 0, annotators: 8, reviewers: 3, sentiment: "GOOD", pm_names: ["Chirag Rao"], team_lead_names: [] },
];

export default function ProjectsSummaryCard({
  projects = [],
  totalProjects = 121,
  pageSize = 8,
  currentPage = 1,
  onPageChange,
  serverSide = false,
  totalItems,
  onOpenProject,
  onViewAllProjects,
  isLoading = false,
  className = "",
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const projectList = projects.length > 0 ? projects : DEFAULT_PROJECTS;

  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return projectList;
    const q = searchTerm.toLowerCase();
    return projectList.filter((p) => {
      const name = p.name || p.project?.name || "";
      const client = p.client || p.project?.client || "";
      const pms = extractNames(p, "pm_names", "project_manager", "program_managers", "pm").join(" ");
      const tls = extractNames(p, "team_lead_names", "team_leads", "team_lead", "tl").join(" ");
      return (
        name.toLowerCase().includes(q) ||
        client.toLowerCase().includes(q) ||
        pms.toLowerCase().includes(q) ||
        tls.toLowerCase().includes(q)
      );
    });
  }, [projectList, searchTerm]);

  const maxHours = useMemo(() => {
    const hoursArr = projectList.map((p) => Number(p.autonexHours ?? p.hours ?? 0));
    const maxVal = Math.max(...hoursArr, 0);
    return maxVal > 0 ? maxVal * 1.8 : 3500;
  }, [projectList]);

  const columns = useMemo(
    () => [
      {
        key: "project",
        label: "PROJECT",
        align: "left",
        width: "w-[24%]",
        render: (_, row) => {
          const project = row.project || row;
          return (
            <div className="min-w-0 py-0.5">
              <div className="truncate text-[12.5px] font-semibold text-slate-800 group-hover:text-blue-600 transition-colors leading-tight">
                {project.name}
              </div>
              <div className="truncate text-[10.5px] font-normal text-slate-400 mt-0.5 leading-tight">
                {project.client || "Internal"}
              </div>
            </div>
          );
        },
      },
      {
        key: "pm",
        label: "PROJECT MANAGER",
        align: "left",
        width: "w-[18%]",
        render: (_, row) =>
          renderLeaderCell(row, "pm_names", "project_manager", "program_managers", "pm"),
      },
      {
        key: "tl",
        label: "TEAM LEAD",
        align: "left",
        width: "w-[18%]",
        render: (_, row) =>
          renderLeaderCell(row, "team_lead_names", "team_leads", "team_lead", "tl"),
      },
      {
        key: "hours",
        label: "HOURS",
        align: "left",
        width: "w-[18%]",
        render: (_, row) => {
          const hours = Number(row.autonexHours ?? row.hours ?? 0);
          const percent = hours > 0 ? Math.min(100, Math.max(5, (hours / maxHours) * 100)) : 2;
          return (
            <div className="py-0.5 w-full max-w-[130px]">
              <div className="font-mono text-[11.5px] font-medium text-emerald-600 tabular-nums leading-tight">
                {fmtHours(hours)}
              </div>
              <div className="mt-1 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        key: "ar",
        label: "A / R",
        align: "center",
        width: "w-[10%]",
        render: (_, row) => {
          const project = row.project || row;
          const annotators = row.annotators ?? project.autonex_annotators ?? 0;
          const reviewers = row.reviewers ?? project.autonex_reviewers ?? 0;
          return (
            <span className="font-mono text-[11.5px] text-slate-600">
              {annotators} / {reviewers}
            </span>
          );
        },
      },
      {
        key: "sentiment",
        label: "SENTIMENT",
        align: "right",
        width: "w-[12%]",
        render: (_, row) => {
          const project = row.project || row;
          const sentiment = row.sentiment || project.sentiment || "GOOD";
          return (
            <div className="flex justify-end">
              <SentimentBadge sentiment={sentiment} />
            </div>
          );
        },
      },
    ],
    [maxHours]
  );

  const effectiveTotal = totalItems ?? totalProjects ?? 123;

  const headerTitle = (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-blue-200/90 bg-blue-50/80 text-blue-600 shadow-2xs">
        <FolderKanban className="h-3.5 w-3.5" />
      </span>
      <div className="flex items-baseline gap-1.5">
        <h3 className="text-[13.5px] font-bold text-slate-900 leading-tight">
          Projects
        </h3>
        <span className="font-mono text-[11px] text-slate-400 font-medium">
          {effectiveTotal} total · top {pageSize} by hours
        </span>
      </div>
    </div>
  );

  const headerAction = (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search..."
          className="h-7 w-36 sm:w-44 rounded-lg border border-slate-200/90 bg-white pl-8 pr-2.5 text-[11px] text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none transition-all"
        />
      </div>

      <button
        type="button"
        onClick={onViewAllProjects}
        className="group inline-flex items-center gap-1 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
      >
        <span>View all</span>
        <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-700" />
      </button>
    </div>
  );

  return (
    <Table
      variant="dashboard"
      className={className}
      title={headerTitle}
      headerAction={headerAction}
      columns={columns}
      data={filteredProjects}
      loading={isLoading}
      serverSide={serverSide}
      totalItems={effectiveTotal}
      currentPage={currentPage}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onRowClick={onOpenProject}
      emptyState={{
        title: "No projects",
        description: "No active projects match your search query",
      }}
    />
  );
}
