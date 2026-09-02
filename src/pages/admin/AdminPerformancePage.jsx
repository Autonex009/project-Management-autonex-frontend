import React, { useMemo, useState, useEffect, useRef } from "react";
import usePageStateStore from "../../store/usePageStateStore";
import { usePageScroll } from "../../hooks/usePageScroll";
import { useQuery } from "@tanstack/react-query";
import {
  employeeApi,
  subProjectApi,
  parentProjectApi,
  perfEvalApi,
} from "../../services/api";
import {
  ClipboardList,
  Search,
  Gift,
  UserCog,
  Star,
  ChevronDown,
  History as HistoryIcon,
  CheckCircle2,
  Clock,
} from "lucide-react";
import StarRating, { formatPeriod, currentPeriod, shiftPeriod } from "../../components/perf/StarRating";
import { StatusPill, fmtDate, RatingCell, MonthStepper } from "../../components/perf/perfTableCells";
import EvaluationDetail from "../../components/perf/EvaluationDetail";
import EvalReviewCard from "../../components/perf/EvalReviewCard";
import StatCard from "../../components/dashboard/StatCard";
import CustomKPICards from "./CustomKPICards";
import Table from "../../components/ui/Table";
import MetricDots from "../../components/ui/MetricDots";
import Dropdown from "../../components/ui/Dropdown";
import UserAvatar from "../../components/ui/UserAvatar";
import { formatDisplayName } from "../../utils/displayName";

const isPm = (emp) =>
  (emp?.designation || "").toLowerCase().includes("program manager") ||
  (emp?.designation || "").toLowerCase().includes("project manager");

const isHr = (emp) =>
  (emp?.designation || "").toLowerCase().includes("hr") ||
  (emp?.designation || "").toLowerCase().includes("human resource");

const isTeamLead = (emp) =>
  (emp?.designation || "").toLowerCase().includes("lead");

const PAGE_SIZE = 10;

// Role filter buttons -> predicate over an employee record.
const ROLE_FILTERS = [
  { key: "all", label: "All" },
  { key: "Full-time", label: "Full-time" },
  { key: "Intern", label: "Interns" },
  { key: "pm", label: "PMs" },
  { key: "hr", label: "HRs" },
  { key: "team_lead", label: "TL" },
  { key: "Contract", label: "Contract" },
];

const matchesRole = (emp, key) => {
  if (key === "all") return true;
  if (key === "pm") return isPm(emp);
  if (key === "hr") return isHr(emp);
  if (key === "team_lead") return isTeamLead(emp);
  const t = (emp?.employee_type || "").toLowerCase();
  if (key === "Full-time") return t === "full-time";
  if (key === "Intern") return t === "intern";
  if (key === "Contract") return t === "contract" || t === "contractor";
  return true;
};

const ReviewsStatCard = ({ totalReviews, totalEmployees, reviewed = 0, pending = 0, multiCount = 0, multiNames = [] }) => {
  const pct = totalEmployees > 0 ? Math.round((totalReviews / totalEmployees) * 100) : 0;
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="group relative rounded-xl border bg-white p-3 flex flex-col h-full shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors focus:outline-none border-slate-200 hover:border-slate-300">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex shrink-0 items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm h-9 w-9 rounded-xl">
            <ClipboardList className="h-[18px] w-[18px]" />
          </span>
          <span className="truncate font-medium text-slate-600 text-[13px]">
            Reviews
          </span>
        </div>
        
        <div className="relative flex h-[48px] w-[48px] shrink-0 items-center justify-center -mr-1 -mt-1">
          <svg className="absolute inset-0 h-full w-full -rotate-90">
            <circle
              cx="24" cy="24" r={radius}
              stroke="currentColor" strokeWidth="4.5" fill="none"
              className="text-slate-100"
            />
            <circle
              cx="24" cy="24" r={radius}
              stroke="currentColor" strokeWidth="4.5" fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="text-indigo-500 transition-all duration-1000 ease-out"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center pt-0.5 text-[11px] font-bold tracking-tight text-indigo-600 tabular-nums">
            {pct}%
          </span>
        </div>
      </div>

      <div className="mt-2">
        <div className="flex items-baseline gap-1 min-w-0 pb-0.5 flex-wrap">
          <span className="font-bold leading-normal tracking-tight text-slate-900 tabular-nums truncate text-[24px]">
            {totalReviews}
          </span>
          {multiCount > 0 && (
            <div className="group/multi relative cursor-pointer inline-flex items-center">
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200 ml-1">
                ({multiCount} emp in &gt;1 proj)
              </span>
              <div className="absolute left-0 top-full pt-2 z-50 hidden group-hover/multi:block">
                <div className="min-w-[200px] whitespace-normal rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 shadow-xl">
                  <div className="font-semibold text-slate-900 mb-1 border-b border-slate-100 pb-1">Employees in multiple projects:</div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {multiNames.map(name => <li key={name}>{name}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}
          <span className="text-sm font-medium text-slate-400">/ {totalEmployees}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-xs mt-auto border-t border-slate-100 pt-2">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span className="font-semibold text-slate-700">{reviewed} <span className="text-slate-400 font-normal">Reviewed</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-semibold text-slate-700">{pending} <span className="text-slate-400 font-normal">Pending Review</span></span>
        </div>
      </div>
    </div>
  );
};

const AdminPerformancePage = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { data: employees = [], isLoading: empLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeeApi.getAll(),
  });
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["sub-projects"],
    queryFn: () => subProjectApi.getAll(),
  });
  const { data: mainProjects = [], isLoading: mainProjectsLoading } = useQuery({
    queryKey: ["parent-projects"],
    queryFn: () => parentProjectApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });
  // ── Persist tab / search / filters / pages / scroll ─────────
  const PAGE_KEY = "admin-performance";
  const setPageState = usePageStateStore((s) => s.setPageState);
  const getPageState = usePageStateStore((s) => s.getPageState);

  const [topTab, setTopTab] = useState("active");
  const [tab, setTab] = useState("employees"); // 'employees' | 'pm' | 'hr'
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [perfPage, setPerfPage] = useState(1);
  const [bonusPage, setBonusPage] = useState(1);
  const [bonusOpen, setBonusOpen] = useState(false);
  const [expandedEval, setExpandedEval] = useState(null); // not persisted (row expand is transient)

  const activePeriod = currentPeriod();
  const maxHistoryMonth = shiftPeriod(activePeriod, -1);
  const [historyMonth, setHistoryMonth] = useState(maxHistoryMonth);

  const [ready, setReady] = useState(false);

  // Restore after zustand rehydration
  useEffect(() => {
    const restore = () => {
      const s = getPageState(PAGE_KEY);
      if (s.tab === "employees" || s.tab === "pm" || s.tab === "history") setTab(s.tab);
      if (s.search != null) {
        setSearch(s.search);
        setDebouncedSearch(s.search);
      }
      if (s.roleFilter != null) setRoleFilter(s.roleFilter);
      if (s.projectFilter != null) setProjectFilter(s.projectFilter);
      if (s.perfPage != null) setPerfPage(s.perfPage);
      if (s.bonusPage != null) setBonusPage(s.bonusPage);
      if (s.bonusOpen != null) setBonusOpen(!!s.bonusOpen);
      setReady(true);
    };

    if (usePageStateStore.persist.hasHydrated()) {
      restore();
      return;
    }
    return usePageStateStore.persist.onFinishHydration(restore);
  }, [getPageState]);

  // Write only after restore (never overwrite saved page with 1 on mount)
  useEffect(() => {
    if (!ready) return;
    setPageState(PAGE_KEY, {
      tab,
      search,
      roleFilter,
      projectFilter,
      perfPage,
      bonusPage,
      bonusOpen,
    });
  }, [
    ready,
    tab,
    search,
    roleFilter,
    projectFilter,
    perfPage,
    bonusPage,
    bonusOpen,
    setPageState,
  ]);

  usePageScroll(PAGE_KEY);

  // Reset main table page when filters/tab change — skip first run after restore
  const skipPageReset = useRef(true);
  useEffect(() => {
    if (!ready) return;
    if (skipPageReset.current) {
      skipPageReset.current = false;
      return;
    }
    setPerfPage(1);
  }, [debouncedSearch, roleFilter, projectFilter, tab, ready]);

  // --- SERVER-SIDE RENDERING (SSR) AND PAGINATION ---
  const currentPeriodQuery = topTab === "history" ? historyMonth : activePeriod;

  // KPI Data - SSR for the entire period
  const { data: kpiData = {} } = useQuery({
    queryKey: ["perf-evals-kpi", currentPeriodQuery, projectFilter, roleFilter, search, tab],
    queryFn: () => {
      const params = { 
        period: currentPeriodQuery
      };
      if (search.trim()) params.search = search.trim();
      if (roleFilter !== "all") params.role_filter = roleFilter;
      if (projectFilter !== "all") params.project_id = projectFilter;
      return perfEvalApi.getAdminKpi(params);
    },
    staleTime: 1000 * 60 * 5,
    enabled: ready,
  });

  const { data: evaluationsData = {}, isLoading: evalLoading, isFetching: evalFetching } = useQuery({
    queryKey: ["perf-evals", "paginated", perfPage, PAGE_SIZE, tab, currentPeriodQuery, debouncedSearch, roleFilter, projectFilter],
    queryFn: () => {
      const isPmTab = tab === "pm";
      const isHrTab = tab === "hr";
      const isHistory = tab === "history";
      
      const params = {
        page: perfPage,
        limit: PAGE_SIZE,
        period: currentPeriodQuery,
      };
      params.type = (isPmTab || isHrTab) ? "pm" : "employee";
      
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      
      if (isPmTab) {
        params.role_filter = "pm";
      } else if (isHrTab) {
        params.role_filter = "hr";
      } else if (roleFilter !== "all") {
        params.role_filter = roleFilter;
      }
      if (projectFilter !== "all") params.project_id = projectFilter;
      return perfEvalApi.getAll(params);
    },
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 5,
    enabled: ready,
  });

  const evaluations = evaluationsData?.items || [];
  const evaluationsTotal = evaluationsData?.total || 0;

  // We still need the pending count for the PM tab badge
  const { data: pmSelfData } = useQuery({
    queryKey: ["perf-evals", "pm-pending", currentPeriodQuery, search, roleFilter, projectFilter],
    queryFn: () => perfEvalApi.getAll({ 
      period: currentPeriodQuery, 
      type: "pm", 
      limit: 500,
      search: search.trim() || undefined,
      project_id: projectFilter === "all" ? undefined : projectFilter,
      role: roleFilter === "all" ? undefined : roleFilter,
    }),
    staleTime: 1000 * 60 * 5,
    enabled: tab !== "pm" && ready,
  });
  const pmPendingCount = tab === "pm" 
    ? evaluations.filter(e => e.status === "submitted").length 
    : (pmSelfData?.items || []).filter(e => e.status === "submitted").length;

  const { data: bonusData = {} } = useQuery({
    queryKey: ["perf-evals", "bonus", currentPeriodQuery, projectFilter, roleFilter, search],
    queryFn: () => {
      const params = { period: currentPeriodQuery, type: "bonus", limit: 100 };
      if (search.trim()) params.search = search.trim();
      if (roleFilter !== "all") params.role_filter = roleFilter;
      if (projectFilter !== "all") params.project_id = projectFilter;
      return perfEvalApi.getAll(params);
    },
    staleTime: 1000 * 60 * 5,
    enabled: ready,
  });
  const bonusEvals = bonusData?.items || [];

  const isLoading = empLoading || evalFetching || projectsLoading || mainProjectsLoading;

  const empById = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees],
  );
  const empName = (id) => formatDisplayName(empById.get(id)?.name) || `Employee #${id}`;
  const projName = (id) => {
    if (id === 0) return "Overall (PM)";
    return projects.find((p) => p.id === id)?.name || `Project #${id}`;
  };

  const subProjectById = useMemo(
    () => new Map(projects.map((sp) => [String(sp.id), sp])),
    [projects],
  );
  const mainProjectById = useMemo(
    () => new Map(mainProjects.map((mp) => [String(mp.id), mp])),
    [mainProjects],
  );

  const filteredEmployeesCount = useMemo(() => {
    return employees.filter(emp => {
      if (search.trim() && !emp.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      if (!matchesRole(emp, roleFilter)) return false;
      // projectFilter isn't perfectly computable on the raw employee list locally,
      // so the denominator reflects the total employees matching the role/search.
      return true;
    }).length;
  }, [employees, search, roleFilter]);

  const managersOfProject = (projectId) => {
    const sp = subProjectById.get(String(projectId));
    const mp = sp ? mainProjectById.get(String(sp.main_project_id)) : null;
    if (!mp) return [];
    if (Array.isArray(mp.program_manager_names) && mp.program_manager_names.length > 0)
      return mp.program_manager_names;
    if (mp.program_manager_name) return [mp.program_manager_name];
    const ids = mp.program_manager_ids?.length ? mp.program_manager_ids : mp.program_manager_id ? [mp.program_manager_id] : [];
    return ids.map((id) => empById.get(Number(id))?.name).filter(Boolean);
  };

  const filtered = tab === "employees" ? evaluations : [];
  const pmSelfEvals = (tab === "pm" || tab === "hr") ? evaluations : [];
  const filteredHistory = tab === "history" ? evaluations : [];


  // Shared row shape for the active-cycle table — the only difference call-to-call is
  // which rows/page they're handed (for the reporting-manager popover's positioning).
  const makeReviewColumns = (rowsAll, page) => [
    {
      key: "employee",
      label: "Employee",
      width: "w-[18%]",
      render: (_, ev) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <UserAvatar
            src={empById.get(ev.employee_id)?.avatar_url}
            name={empName(ev.employee_id)}
            size="w-8 h-8 text-[13px]"
          />
          <span className="truncate font-medium text-slate-800">
            {empName(ev.employee_id)}
          </span>
        </div>
      ),
    },
    {
      key: "project",
      label: "Project",
      width: "w-[22%]",
      render: (_, ev) => (
        <span className="block truncate text-slate-600">
          {projName(ev.project_id)}
        </span>
      ),
    },
    {
      key: "period",
      label: "Period",
      width: "w-[10%]",
      render: (_, ev) => (
        <span className="whitespace-nowrap text-slate-500">
          {formatPeriod(ev.period)}
        </span>
      ),
    },
    {
      key: "pm",
      label: "Program Manager",
      width: "w-[18%]",
      render: (_, ev) => {
        const managers = managersOfProject(ev.project_id);
        if (managers.length === 0)
          return <span className="text-slate-400">—</span>;

        const visibleRows = rowsAll.slice(
          (page - 1) * PAGE_SIZE,
          page * PAGE_SIZE,
        );
        const pageIndex = visibleRows.indexOf(ev);
        const isNearTop =
          visibleRows.length <= 2 ? pageIndex === 0 : pageIndex <= 1;
        const positionClass = isNearTop
          ? "top-full mt-1.5"
          : "bottom-full mb-1.5";
        const extra = managers.length - 1;

        return (
          <div className="group/pm relative flex cursor-default items-center gap-1 whitespace-nowrap">
            <span
              className="truncate text-slate-600"
              title={managers.join(", ")}
            >
              {managers[0]}
            </span>
            {extra > 0 && (
              <span className="inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 px-1 text-[10px] font-semibold text-slate-500">
                +{extra}
              </span>
            )}
            {managers.length > 1 && (
              <div
                className={`pointer-events-none absolute left-0 ${positionClass} z-40 hidden min-w-[180px] max-w-[260px] flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 shadow-xl group-hover/pm:flex`}
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Reporting Managers ({managers.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {managers.map((name, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "submitted",
      label: "Submitted",
      width: "w-[12%]",
      render: (_, ev) => (
        <span className="whitespace-nowrap text-slate-500 tabular-nums">
          {fmtDate(ev.submitted_at || ev.created_at)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "w-[12%]",
      render: (_, ev) => (
        <span className="inline-flex items-center gap-1.5">
          <StatusPill status={ev.status} />
          {ev.bonus_suggested && (
            <Gift
              className="h-3.5 w-3.5 text-amber-500"
              title="Suggested for bonus"
            />
          )}
        </span>
      ),
    },
    {
      key: "rating",
      label: "Rating",
      align: "right",
      width: "w-[8%]",
      render: (_, ev) => <RatingCell evaluation={ev} />,
    },
  ];

  const currentColumns = makeReviewColumns(filtered, perfPage);

  // History is browsed one month at a time (see the MonthStepper below), so a
  // per-row "Period" column would just repeat the same value on every line —
  // dropped here, along with the Program Manager popover (no longer worth the
  // positioning complexity once there's no multi-page window to reason about).
  const historyColumns = [
    {
      key: "employee",
      label: "Employee",
      width: "w-[20%]",
      render: (_, ev) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <UserAvatar
            src={empById.get(ev.employee_id)?.avatar_url}
            name={empName(ev.employee_id)}
            size="w-8 h-8 text-[13px]"
          />
          <span className="truncate font-medium text-slate-800">
            {empName(ev.employee_id)}
          </span>
        </div>
      ),
    },
    {
      key: "project",
      label: "Project",
      width: "w-[22%]",
      render: (_, ev) => (
        <span className="block truncate text-slate-600">
          {projName(ev.project_id)}
        </span>
      ),
    },
    {
      key: "pm",
      label: "Program Manager",
      width: "w-[18%]",
      render: (_, ev) => {
        const managers = managersOfProject(ev.project_id);
        if (managers.length === 0)
          return <span className="text-slate-400">—</span>;

        const visibleRows = filteredHistory.slice(
          (perfPage - 1) * PAGE_SIZE,
          perfPage * PAGE_SIZE,
        );
        const pageIndex = visibleRows.indexOf(ev);
        const isNearTop =
          visibleRows.length <= 2 ? pageIndex === 0 : pageIndex <= 1;
        const positionClass = isNearTop
          ? "top-full mt-1.5"
          : "bottom-full mb-1.5";
        const extra = managers.length - 1;

        return (
          <div className="group/pm relative flex cursor-default items-center gap-1 whitespace-nowrap">
            <span
              className="truncate text-slate-600"
              title={managers.join(", ")}
            >
              {managers[0]}
            </span>
            {extra > 0 && (
              <span className="inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 px-1 text-[10px] font-semibold text-slate-500">
                +{extra}
              </span>
            )}
            {managers.length > 1 && (
              <div
                className={`pointer-events-none absolute left-0 ${positionClass} z-40 hidden min-w-[180px] max-w-[260px] flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 shadow-xl group-hover/pm:flex`}
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Reporting Managers ({managers.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {managers.map((name, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "submitted",
      label: "Submitted",
      width: "w-[14%]",
      render: (_, ev) => (
        <span className="whitespace-nowrap text-slate-500 tabular-nums">
          {fmtDate(ev.submitted_at || ev.created_at)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "w-[14%]",
      render: (_, ev) => (
        <span className="inline-flex items-center gap-1.5">
          <StatusPill status={ev.status} />
          {ev.bonus_suggested && (
            <Gift
              className="h-3.5 w-3.5 text-amber-500"
              title="Suggested for bonus"
            />
          )}
        </span>
      ),
    },
    {
      key: "rating",
      label: "Rating",
      align: "right",
      width: "w-[12%]",
      render: (_, ev) => <RatingCell evaluation={ev} />,
    },
  ];

  const bonusColumns = [
    {
      key: "employee",
      label: "Employee",
      width: "w-[20%]",
      render: (_, ev) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <UserAvatar
            src={empById.get(ev.employee_id)?.avatar_url}
            name={empName(ev.employee_id)}
            size="w-8 h-8 text-[13px]"
          />
          <span className="truncate font-medium text-slate-800">
            {empName(ev.employee_id)}
          </span>
        </div>
      ),
    },
    {
      key: "project",
      label: "Project",
      width: "w-[16%]",
      render: (_, ev) => (
        <span className="block truncate text-slate-600">
          {projName(ev.project_id)}
        </span>
      ),
    },
    {
      key: "note",
      label: "Note",
      width: "w-[48%]",
      render: (_, ev) => {
        const note = ev.bonus_note || "—";
        return (
          <div className="group/note relative cursor-default">
            <span className="block truncate text-slate-500">{note}</span>
            {ev.bonus_note && (
              <div className="pointer-events-none absolute left-0 bottom-full mb-1.5 z-[60] hidden max-w-[380px] whitespace-normal rounded-xl border border-slate-200 bg-white p-3 text-[13px] leading-relaxed text-slate-700 shadow-xl group-hover/note:block">
                {note}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "rating",
      label: "Rating",
      align: "right",
      width: "w-[16%]",
      render: (_, ev) => (
        <div className="flex items-center justify-end gap-2">
          <StarRating
            value={Math.round(ev.overall_rating || 0)}
            readOnly
            showLabel={false}
            size="text-sm"
          />
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
            {ev.overall_rating != null
              ? Number(ev.overall_rating).toFixed(1)
              : "—"}{" "}
            / 5
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* NEW TOP-LEVEL NAVIGATION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-1.5">
        <div className="flex items-center gap-0.5 bg-slate-100/70 p-1 rounded-xl w-max">
          <button
            onClick={() => { setTopTab("active"); setTab("employees"); }}
            className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${topTab === "active" ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700"}`}
          >
            Current Cycle
          </button>
          <button
            onClick={() => { setTopTab("history"); setTab("employees"); }}
            className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-1.5 ${topTab === "history" ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700"}`}
          >
            <HistoryIcon className="w-3.5 h-3.5" />
            Past Cycles
          </button>
        </div>
        
        {topTab === "history" && (
          <div className="shrink-0 mt-2 sm:mt-0">
            <MonthStepper
              period={historyMonth}
              onChange={setHistoryMonth}
              max={maxHistoryMonth}
            />
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ReviewsStatCard 
          totalReviews={kpiData.total ?? 0} 
          totalEmployees={filteredEmployeesCount}
          reviewed={kpiData.reviewed ?? 0}
          pending={kpiData.pending ?? 0}
          multiCount={kpiData.multiEvalCount ?? 0}
          multiNames={kpiData.multiEvalNames ?? []}
        />
        <StatCard
          title="Avg Rating"
          value={kpiData.avgRating != null ? kpiData.avgRating.toFixed(2) : "--"}
          unit={kpiData.avgRating != null ? "/ 5" : undefined}
          icon={Star}
          tone="amber"
          hint="across all reviews"
        />
        <StatCard
          title="Bonus Suggested"
          value={kpiData.bonusCount ?? 0}
          icon={Gift}
          tone="violet"
          hint={
            (kpiData.multiBonusCount ?? 0) > 0 ? (
              <span className="group/bmulti relative cursor-pointer flex items-center">
                <span>flagged by PMs</span>
                <span className="text-[10px] font-semibold text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded-md border border-violet-200/60 ml-1.5">
                  ({kpiData.multiBonusCount} emp in &gt;1 proj)
                </span>
                <div className="absolute left-0 top-full pt-2 z-50 hidden group-hover/bmulti:block">
                  <div className="min-w-[200px] whitespace-normal rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 shadow-xl">
                    <div className="font-semibold text-slate-900 mb-1 border-b border-slate-100 pb-1">Bonus in multiple projects:</div>
                    <ul className="list-disc pl-4 space-y-1 text-slate-600 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {(kpiData.multiBonusNames || []).map(name => <li key={name}>{name}</li>)}
                    </ul>
                  </div>
                </div>
              </span>
            ) : (
              "flagged by PMs"
            )
          }
        />
      </div>

      {/* Tabs + (employee) controls on one row */}
      <div className="flex flex-col gap-3 border-b border-slate-200 sm:min-h-[44px] sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setTab("employees")}
            className={`-mb-px border-b-2 pb-2.5 text-[13px] font-semibold transition-colors ${tab === "employees" ? "border-indigo-600 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            Employees
          </button>
          <button
            type="button"
            onClick={() => setTab("pm")}
            className={`-mb-px flex items-center gap-1.5 border-b-2 pb-2.5 text-[13px] font-semibold transition-colors ${tab === "pm" ? "border-indigo-600 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            PM Approvals
            {pmPendingCount > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                {pmPendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("hr")}
            className={`-mb-px flex items-center gap-1.5 border-b-2 pb-2.5 text-[13px] font-semibold transition-colors ${tab === "hr" ? "border-indigo-600 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            HR Approvals
          </button>
        </div>

        {(tab === "employees" || tab === "history") && (
          <div className="flex flex-col gap-2 pb-2.5 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-60">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by employee name..."
                className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[13px] text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            
            <Dropdown
              className="w-full sm:w-48"
              value={String(projectFilter)}
              onChange={(val) => setProjectFilter(val)}
              options={[
                { value: "all", label: "All Projects" },
                ...projects.map((p) => ({ value: String(p.id), label: p.name })),
              ]}
            />

            <div className="inline-flex items-center gap-0.5 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {ROLE_FILTERS.map((r) => {
                const active = roleFilter === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRoleFilter(r.key)}
                    className={`whitespace-nowrap rounded-md px-3 py-1 text-[13px] font-semibold transition-all ${active ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {tab === "pm" || tab === "hr" ? (
        isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
            Loading…
          </div>
        ) : pmSelfEvals.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
            <UserCog className="mx-auto h-10 w-10 text-slate-300" />
            <h2 className="mt-4 text-lg font-semibold text-slate-800">
              No {tab === "pm" ? "PM" : "HR"} self-evaluations yet
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              When a {tab === "pm" ? "PM" : "HR"} submits their monthly self-evaluation, it appears here
              for approval.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pmSelfEvals.map((ev) => (
              <EvalReviewCard
                key={ev.id}
                evaluation={ev}
                personName={empName(ev.employee_id)}
                reviewerId={user.id}
              />
            ))}
          </div>
        )
      ) : (
        <>
          {/* Suggested for Bonus — collapsible; click header to reveal the table */}
          {!isLoading && bonusEvals.length > 0 && (
            <section className="rounded-3xl border border-amber-200 bg-amber-50/50 shadow-sm">
              <button
                type="button"
                onClick={() => setBonusOpen((o) => !o)}
                className="flex w-full items-center gap-2 px-5 py-4 text-left"
              >
                <Gift className="h-5 w-5 text-amber-600" />
                <h2 className="text-base font-semibold text-slate-800">
                  Suggested for Bonus
                </h2>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  {bonusEvals.length}
                </span>
                <ChevronDown
                  className={`ml-auto h-4 w-4 text-amber-600 transition-transform ${bonusOpen ? "rotate-180" : ""}`}
                />
              </button>
              {bonusOpen && (
                <div className="px-3 pb-3">
                  <Table
                    variant="untitled"
                    allowOverflow
                    columns={bonusColumns}
                    data={bonusEvals}
                    getRowId={(row) => row.id}
                    currentPage={bonusPage}
                    onPageChange={setBonusPage}
                  />
                </div>
              )}
            </section>
          )}

          {isLoading ? (
            <Table
              variant="untitled"
              columns={currentColumns}
              data={[]}
              loading
              skeletonRows={10}
            />
          ) : evaluationsTotal === 0 && !search.trim() && roleFilter === "all" ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
              <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-4 text-lg font-semibold text-slate-800">
                No evaluations yet
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Once employees submit their monthly reviews, they appear here.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
              <Search className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-4 text-lg font-semibold text-slate-800">
                No results match your filters
              </h2>
            </div>
          ) : (
            <Table
              variant="untitled"
              allowOverflow
              columns={currentColumns}
              data={filtered}
              totalItems={evaluationsTotal}
              currentPage={perfPage}
              pageSize={PAGE_SIZE}
              onPageChange={setPerfPage}
              onRowClick={(row) =>
                setExpandedEval((cur) => (cur === row.id ? null : row.id))
              }
              expandedRowId={expandedEval}
              getRowId={(row) => row.id}
              renderExpandedRow={(row) => (
                <div className="border-t border-slate-100 bg-slate-50/40 p-4">
                  {row.status === "submitted" ? (
                    <EvalReviewCard
                      evaluation={row}
                      personName={empById.get(row.employee_id)?.name || `Employee #${row.employee_id}`}
                      reviewerId={user.id}
                    />
                  ) : (
                    <EvaluationDetail evaluation={row} />
                  )}
                </div>
              )}
              emptyState={{
                title: "No reviews",
                description: "Nothing to show here.",
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default AdminPerformancePage;
