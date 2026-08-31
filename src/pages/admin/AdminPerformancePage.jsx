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
} from "lucide-react";
import StarRating, { formatPeriod, currentPeriod, shiftPeriod } from "../../components/perf/StarRating";
import { StatusPill, fmtDate, RatingCell, MonthStepper } from "../../components/perf/perfTableCells";
import EvaluationDetail from "../../components/perf/EvaluationDetail";
import EvalReviewCard from "../../components/perf/EvalReviewCard";
import StatCard from "../../components/dashboard/StatCard";
import Table from "../../components/ui/Table";
import UserAvatar from "../../components/ui/UserAvatar";
import { formatDisplayName } from "../../utils/displayName";

const isPm = (emp) =>
  (emp?.designation || "").toLowerCase().includes("program manager") ||
  (emp?.designation || "").toLowerCase().includes("project manager");

const PAGE_SIZE = 10;

// Role filter buttons -> predicate over an employee record.
const ROLE_FILTERS = [
  { key: "all", label: "All" },
  { key: "Full-time", label: "Full-time" },
  { key: "Intern", label: "Interns" },
  { key: "pm", label: "PMs" },
  { key: "Contract", label: "Contract" },
];

const matchesRole = (emp, key) => {
  if (key === "all") return true;
  if (key === "pm") return isPm(emp);
  const t = (emp?.employee_type || "").toLowerCase();
  if (key === "Full-time") return t === "full-time";
  if (key === "Intern") return t === "intern";
  if (key === "Contract") return t === "contract" || t === "contractor";
  return true;
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

  const [tab, setTab] = useState("employees"); // 'employees' | 'history' | 'pm'
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const [roleFilter, setRoleFilter] = useState("all");
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
      perfPage,
      bonusPage,
      bonusOpen,
    });
  }, [
    ready,
    tab,
    search,
    roleFilter,
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
  }, [debouncedSearch, roleFilter, tab, ready]);

  // --- SERVER-SIDE RENDERING (SSR) AND PAGINATION ---
  const currentPeriodQuery = tab === "history" ? historyMonth : activePeriod;

  // KPI Data - SSR for the entire period
  const { data: kpiData = {} } = useQuery({
    queryKey: ["perf-evals-kpi", currentPeriodQuery],
    queryFn: () => perfEvalApi.getAdminKpi({ period: currentPeriodQuery }),
    staleTime: 1000 * 60 * 5,
    enabled: ready,
  });

  const { data: evaluationsData = {}, isLoading: evalLoading, isFetching: evalFetching } = useQuery({
    queryKey: ["perf-evals", "paginated", perfPage, PAGE_SIZE, tab, currentPeriodQuery, debouncedSearch, roleFilter],
    queryFn: () => {
      const isPmTab = tab === "pm";
      const params = {
        page: perfPage,
        limit: PAGE_SIZE,
        period: currentPeriodQuery,
        type: isPmTab ? "pm" : "employee",
      };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (roleFilter !== "all") params.role_filter = roleFilter;
      return perfEvalApi.getAll(params);
    },
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 5,
    enabled: ready,
  });

  const evaluations = evaluationsData?.items || [];
  const evaluationsTotal = evaluationsData?.total || 0;

  // We still need the pending count for the PM tab badge
  const { data: pmSelfData = {} } = useQuery({
    queryKey: ["perf-evals", "pm-pending", currentPeriodQuery],
    queryFn: () => perfEvalApi.getAll({ period: currentPeriodQuery, type: "pm", limit: 500 }),
    staleTime: 1000 * 60 * 5,
    enabled: tab !== "pm" && ready,
  });
  const pmPendingCount = tab === "pm" 
    ? evaluations.filter(e => e.status === "submitted").length 
    : (pmSelfData?.items || []).filter(e => e.status === "submitted").length;

  const { data: bonusData = {} } = useQuery({
    queryKey: ["perf-evals", "bonus", currentPeriodQuery],
    queryFn: () => perfEvalApi.getAll({ period: currentPeriodQuery, type: "bonus", limit: 100 }),
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
  const pmSelfEvals = tab === "pm" ? evaluations : [];
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
      width: "w-[24%]",
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
      width: "w-[28%]",
      render: (_, ev) => (
        <span className="block truncate text-slate-600">
          {projName(ev.project_id)}
        </span>
      ),
    },
    {
      key: "submitted",
      label: "Submitted",
      width: "w-[18%]",
      render: (_, ev) => (
        <span className="whitespace-nowrap text-slate-500 tabular-nums">
          {fmtDate(ev.submitted_at || ev.created_at)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "w-[16%]",
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
      width: "w-[14%]",
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
    <div className="space-y-4">


      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          title="Reviews"
          value={kpiData.total ?? 0}
          icon={ClipboardList}
          tone="indigo"
          hint="submitted reviews"
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
          hint="flagged by PMs"
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
            onClick={() => setTab("history")}
            className={`-mb-px flex items-center gap-1.5 border-b-2 pb-2.5 text-[13px] font-semibold transition-colors ${tab === "history" ? "border-indigo-600 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <HistoryIcon className="h-3.5 w-3.5" />
            History
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

      {tab === "pm" ? (
        isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
            Loading…
          </div>
        ) : pmSelfEvals.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
            <UserCog className="mx-auto h-10 w-10 text-slate-300" />
            <h2 className="mt-4 text-lg font-semibold text-slate-800">
              No PM self-evaluations yet
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              When a PM submits their monthly self-evaluation, it appears here
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
      ) : tab === "history" ? (
        <div className="space-y-3">
          <MonthStepper
            period={historyMonth}
            onChange={setHistoryMonth}
            max={maxHistoryMonth}
          />
          {evalLoading ? (
            <Table
              variant="untitled"
              columns={historyColumns}
              data={[]}
              loading
              skeletonRows={6}
            />
          ) : false ? (
            <div className="rounded-3xl border border-dashed border-red-200 bg-red-50/40 p-12 text-center shadow-sm">
              <h2 className="text-lg font-semibold text-red-700">
                Couldn't load reviews for {formatPeriod(historyMonth)}
              </h2>
              <p className="mt-2 text-sm text-red-500">
                Something went wrong fetching this month. Try again or pick a different month.
              </p>
            </div>
          ) : evaluationsTotal === 0 && !search.trim() && roleFilter === "all" ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
              <HistoryIcon className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-4 text-lg font-semibold text-slate-800">
                No reviews for {formatPeriod(historyMonth)}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Step to a different month, or check back once this cycle closes.
              </p>
            </div>
          ) : filteredHistory.length === 0 ? (
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
              columns={historyColumns}
              data={filteredHistory}
              totalItems={evaluationsTotal}
              pageSize={PAGE_SIZE}
              currentPage={perfPage}
                onPageChange={setPerfPage}
              onRowClick={(row) =>
                setExpandedEval((cur) => (cur === row.id ? null : row.id))
              }
              expandedRowId={expandedEval}
              getRowId={(row) => row.id}
              renderExpandedRow={(row) => (
                <div className="border-t border-slate-100 bg-slate-50/40 p-4">
                  <EvaluationDetail evaluation={row} />
                </div>
              )}
              emptyState={{
                title: "No reviews",
                description: "Nothing to show here.",
              }}
            />
          )}
        </div>
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
                  <EvaluationDetail evaluation={row} />
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
