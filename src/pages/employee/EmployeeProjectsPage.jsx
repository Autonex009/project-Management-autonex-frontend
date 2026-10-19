import React from "react";
import { useQuery } from "@tanstack/react-query";
import { subProjectApi } from "../../services/api";
import {
  FolderKanban,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  ExternalLink,
  Layers,
  Sparkles,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { format, parseISO } from "date-fns";

const formatDateSafe = (dateStr) => {
  if (!dateStr) return "—";
  try {
    return format(parseISO(dateStr), "MMM dd, yyyy");
  } catch {
    return dateStr;
  }
};

function getProgress(start, end) {
  if (!start || !end) return 0;
  try {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const now = Date.now();
    if (now >= e) return 100;
    if (now <= s) return 0;
    return Math.round(((now - s) / (e - s)) * 100);
  } catch {
    return 0;
  }
}

const LeaderChip = ({ leader }) => {
  const isPM = leader.role === "Program Manager";
  const initials = leader.name
    ? leader.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "??";

  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/60 shadow-xs">
      {leader.avatar_url ? (
        <img
          src={leader.avatar_url}
          alt={leader.name}
          className="w-5 h-5 rounded-full object-cover border border-slate-300"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center">
          {initials}
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-slate-700">{leader.name}</span>
        <span
          className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-md ${
            isPM
              ? "bg-purple-100 text-purple-700 border border-purple-200"
              : "bg-blue-100 text-blue-700 border border-blue-200"
          }`}
        >
          {isPM ? "PM" : "TL"}
        </span>
      </div>
    </div>
  );
};

const ProjectCard = ({ project, isPermanent }) => {
  const stats = project.checkin_stats || {};
  const leaders = [
    ...(project.program_managers || []),
    ...(project.team_leads || []),
  ];

  return (
    <div
      className={`relative bg-white rounded-2xl border transition-all duration-200 p-5 shadow-xs hover:shadow-md ${
        isPermanent
          ? "border-slate-200/80 hover:border-slate-300"
          : "border-amber-200/80 bg-amber-50/20 hover:border-amber-300"
      }`}
    >
      {/* Top Meta Bar */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              isPermanent
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isPermanent ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            {isPermanent ? "Permanent Allocation" : "Temporary Check-in"}
          </span>

          {project.priority && (
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                project.priority === "P0" || project.priority?.toLowerCase() === "high"
                  ? "bg-rose-50 text-rose-600 border border-rose-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              {project.priority}
            </span>
          )}
        </div>

        <div className="text-right shrink-0">
          {isPermanent ? (
            <div>
              <span className="text-base font-bold text-slate-800">
                {project.total_daily_hours || 8}h
              </span>
              <span className="text-xs text-slate-400 font-medium"> /day</span>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">
              <Sparkles className="w-3 h-3 text-amber-600" /> Dynamic Duty
            </span>
          )}
        </div>
      </div>

      {/* Title & Client / Type */}
      <div className="mb-3">
        <h3 className="font-semibold text-slate-900 text-base leading-snug">
          {project.name}
        </h3>
        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
          <span className="font-medium text-slate-700">{project.client}</span>
          <span className="text-slate-300">•</span>
          <span>{project.project_type || "Standard"}</span>
        </p>
      </div>

      {/* Role Tags */}
      {project.role_tags && project.role_tags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {project.role_tags.map((tag) => (
            <span
              key={tag}
              className={`px-2 py-0.5 text-[11px] font-medium rounded-md ${
                isPermanent
                  ? "bg-blue-50 text-blue-700 border border-blue-200/60"
                  : "bg-amber-100/80 text-amber-800 border border-amber-200"
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Project Leadership (PMs & Team Leads) */}
      <div className="mb-4 pt-3 border-t border-slate-100">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          Leadership Team
        </div>
        {leaders.length > 0 ? (
          <div className="flex items-center gap-2 flex-wrap">
            {leaders.map((leader) => (
              <LeaderChip key={`${leader.role}-${leader.id}`} leader={leader} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No PM or Lead assigned yet</p>
        )}
      </div>

      {/* Attendance & Check-in Intelligence */}
      <div className="mb-4 pt-3 border-t border-slate-100 bg-slate-50/60 -mx-5 px-5 py-3">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Attendance On This Project
          </span>
          {stats.checked_in_today && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-md">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Checked in today
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white rounded-xl p-2 border border-slate-200/60 shadow-2xs">
            <div className="text-xs text-slate-400 font-medium">Total Days</div>
            <div className="text-base font-bold text-slate-800 mt-0.5">
              {stats.total_days || 0}
            </div>
          </div>
          <div className="bg-white rounded-xl p-2 border border-slate-200/60 shadow-2xs">
            <div className="text-xs text-slate-400 font-medium">This Month</div>
            <div className="text-base font-bold text-indigo-600 mt-0.5">
              {stats.this_month_days || 0}
            </div>
          </div>
          <div className="bg-white rounded-xl p-2 border border-slate-200/60 shadow-2xs">
            <div className="text-xs text-slate-400 font-medium">Last Check-in</div>
            <div className="text-xs font-semibold text-slate-700 mt-1 truncate">
              {stats.checked_in_today
                ? "Today"
                : stats.last_checkin_date
                ? format(parseISO(stats.last_checkin_date), "MMM dd")
                : "None"}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Progress Bar (for Permanent Allocations) */}
      {isPermanent && (project.active_start_date || project.active_end_date) && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1.5">
            <span>{formatDateSafe(project.active_start_date)}</span>
            <span>
              {project.active_end_date
                ? formatDateSafe(project.active_end_date)
                : "Ongoing"}
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{
                width: `${getProgress(
                  project.active_start_date,
                  project.active_end_date
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Guidelines & Documentation */}
      {project.guidelines && project.guidelines.length > 0 && (
        <div className="pt-3 border-t border-slate-100">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            Project Guidelines
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {project.guidelines.map((g) => (
              <a
                key={g.id}
                href={g.file_url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                <span className="truncate max-w-[180px]">{g.title}</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Temporary project explanation note */}
      {!isPermanent && (
        <div className="mt-3 text-[11px] text-amber-700/80 bg-amber-100/40 rounded-lg p-2 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span>
            You checked into this project during daily morning check-ins as temporary
            cross-team support.
          </span>
        </div>
      )}
    </div>
  );
};

const EmployeeProjectsPage = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["my-projects"],
    queryFn: () => subProjectApi.getMyProjects(),
    staleTime: 60 * 1000,
  });

  const permanentProjects = data?.permanent_projects || [];
  const temporaryProjects = data?.temporary_projects || [];
  const totalProjects = data?.total_projects || 0;
  const checkedInTodayAny = data?.checked_in_today_any || false;

  return (
    <div className="space-y-6">
      {/* Top Header & KPI Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            My Associated Projects
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete overview of your permanent allocations and active temporary project support.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Permanent
            </span>
            <span className="text-base font-bold text-slate-800">
              {permanentProjects.length}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Temporary
            </span>
            <span className="text-base font-bold text-amber-600">
              {temporaryProjects.length}
            </span>
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl border text-center flex items-center gap-1.5 ${
              checkedInTodayAny
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-slate-50 border-slate-200 text-slate-600"
            }`}
          >
            {checkedInTodayAny ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <Clock className="w-4 h-4 text-slate-400" />
            )}
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold block leading-none tracking-wider opacity-70">
                Today
              </span>
              <span className="text-xs font-semibold">
                {checkedInTodayAny ? "Checked In" : "Not Checked In"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="space-y-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
            <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
          </div>
        </div>
      ) : isError ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center text-rose-700">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
          <h3 className="font-semibold text-base">Failed to load projects</h3>
          <p className="text-xs text-rose-600 mt-1">
            An error occurred while fetching your projects.
          </p>
          <button
            onClick={() => refetch()}
            className="mt-3 px-4 py-1.5 bg-rose-600 text-white text-xs font-medium rounded-lg hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      ) : totalProjects === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-700 font-semibold text-base">No projects allocated</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            You currently have no active allocations or recent check-ins recorded. Contact your Program Manager for assignments.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section 1: Permanent Allocations */}
          {permanentProjects.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Permanent Allocations ({permanentProjects.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {permanentProjects.map((project) => (
                  <ProjectCard
                    key={`perm-${project.id}`}
                    project={project}
                    isPermanent={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Temporary / Dynamic Support Projects */}
          {temporaryProjects.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Temporary Cross-Project Support ({temporaryProjects.length})
                </h2>
                <span className="text-xs text-slate-400 font-normal ml-1">
                  (Detected via daily morning check-ins)
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {temporaryProjects.map((project) => (
                  <ProjectCard
                    key={`temp-${project.id}`}
                    project={project}
                    isPermanent={false}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeProjectsPage;
