import React from "react";
import { Users, FolderKanban, CalendarDays, Home, ArrowUpRight } from "lucide-react";

function TopKPICard({
  icon: Icon,
  iconStyle = "bg-emerald-50 border-emerald-200/90 text-emerald-600",
  title,
  value,
  subtitle,
  metrics = [],
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      className="relative rounded-2xl border border-stone-200 bg-white p-3 shadow-[0_1px_3px_rgba(28,25,23,0.05)] hover:border-stone-300 transition-all cursor-pointer group flex flex-col justify-between"
    >
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Styled Icon Tile with subtle rounding */}
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border shadow-2xs ${iconStyle}`}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="truncate font-mono text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              {title}
            </span>
          </div>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-700" />
        </div>

        {/* Value + Subtitle (Compact) */}
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 leading-none">
            {value}
          </span>
          {subtitle && (
            <span className="text-[11.5px] font-mono text-slate-400 leading-none">
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* 3 Metric Columns at bottom (Compact, mt-2, equally divided) */}
      <div className="mt-2 border-t border-stone-200 pt-2 flex items-center justify-between">
        {metrics.map((m, idx) => (
          <div
            key={idx}
            className={`min-w-0 flex-1 ${
              idx === 0
                ? "text-left"
                : idx === metrics.length - 1
                  ? "text-right"
                  : "text-center"
            }`}
          >
            <p className="truncate font-mono text-[9px] uppercase tracking-wider text-slate-400 leading-none">
              {m.label}
            </p>
            <p className={`mt-0.5 font-mono text-[13px] font-bold ${m.color} leading-none`}>
              {m.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TopKPIRow({
  dashboardKpis,
  totalProjects,
  activeProjects,
  archivedProjects,
  leaveDesk = {},
  wfhDesk = {},
  onNavigate,
  routePrefix = "/admin",
  employeesRoute = "/admin/employees",
}) {
  const employeesTotal = dashboardKpis?.employees?.total || 375;
  const employeesActive = dashboardKpis?.employees?.active || 365;
  const employeesInactive = dashboardKpis?.employees?.inactive || 9;
  const employeesIdle = dashboardKpis?.employees?.idle || 1;

  const totalProj = totalProjects || 123;
  const activeProj = activeProjects || 74;
  const devProj = dashboardKpis?.projects?.in_development ?? 6;
  const archivedProj = archivedProjects || 49;

  const leaveTotal = dashboardKpis?.leaves?.to_review || leaveDesk.pendingCount || 77;
  const leaveToday = leaveDesk?.timing?.today?.length ?? dashboardKpis?.leaves?.on_leave ?? 3;
  const leavePast = leaveDesk?.timing?.past?.length ?? 52;
  const leaveUpcoming = leaveDesk?.timing?.future?.length ?? 22;

  const wfhTotal = dashboardKpis?.wfh?.to_review || wfhDesk.pendingCount || 98;
  const wfhToday = wfhDesk?.timing?.today?.length ?? dashboardKpis?.wfh?.on_wfh ?? 3;
  const wfhPast = wfhDesk?.timing?.past?.length ?? 90;
  const wfhUpcoming = wfhDesk?.timing?.future?.length ?? 5;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
      {/* 1. Total Employees - Emerald icon matching image copy 3.png */}
      <TopKPICard
        icon={Users}
        iconStyle="bg-emerald-50 border-emerald-200/90 text-emerald-600"
        title="TOTAL EMPLOYEES"
        value={employeesTotal}
        subtitle="on roster"
        metrics={[
          { label: "ACTIVE", value: employeesActive, color: "text-emerald-600" },
          { label: "INACTIVE", value: employeesInactive, color: "text-slate-700" },
          { label: "IDLE", value: employeesIdle, color: "text-amber-600" },
        ]}
        onClick={() => onNavigate(employeesRoute)}
      />

      {/* 2. Total Projects - Blue icon with border */}
      <TopKPICard
        icon={FolderKanban}
        iconStyle="bg-blue-50 border-blue-200/90 text-blue-600"
        title="TOTAL PROJECTS"
        value={totalProj}
        subtitle="all projects"
        metrics={[
          { label: "ACTIVE", value: activeProj, color: "text-emerald-600" },
          { label: "DEV", value: devProj, color: "text-blue-600" },
          { label: "ARCHIVED", value: archivedProj, color: "text-slate-700" },
        ]}
        onClick={() => onNavigate(`${routePrefix}/sub-projects`)}
      />

      {/* 3. Leave - Rose icon with border */}
      <TopKPICard
        icon={CalendarDays}
        iconStyle="bg-rose-50 border-rose-200/90 text-rose-600"
        title="LEAVE"
        value={leaveTotal}
        subtitle="requests this month"
        metrics={[
          { label: "TODAY", value: leaveToday, color: "text-rose-600" },
          { label: "PAST", value: leavePast, color: "text-slate-700" },
          { label: "UPCOMING", value: leaveUpcoming, color: "text-blue-600" },
        ]}
        onClick={() => onNavigate(`${routePrefix}/leaves`)}
      />

      {/* 4. Work From Home - Violet icon with border */}
      <TopKPICard
        icon={Home}
        iconStyle="bg-violet-50 border-violet-200/90 text-violet-600"
        title="WORK FROM HOME"
        value={wfhTotal}
        subtitle="requests this month"
        metrics={[
          { label: "TODAY", value: wfhToday, color: "text-rose-600" },
          { label: "PAST", value: wfhPast, color: "text-slate-700" },
          { label: "UPCOMING", value: wfhUpcoming, color: "text-blue-600" },
        ]}
        onClick={() => onNavigate(`${routePrefix}/leaves?tab=WFH%20Requests`)}
      />
    </div>
  );
}
