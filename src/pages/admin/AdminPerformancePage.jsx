import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { employeeApi, subProjectApi, parentProjectApi, perfEvalApi } from '../../services/api';
import { ClipboardList, Search, CheckCircle2, Lock, Gift, UserCog, Star } from 'lucide-react';
import StarRating, { formatPeriod } from '../../components/perf/StarRating';
import { normalizeParamValues } from '../../components/perf/perfParams';
import EvaluationDetail from '../../components/perf/EvaluationDetail';
import EvalReviewCard from '../../components/perf/EvalReviewCard';
import StatCard from '../../components/dashboard/StatCard';
import Table from '../../components/ui/Table';

const isPm = (emp) => (emp?.designation || '').toLowerCase().includes('program manager') || (emp?.designation || '').toLowerCase().includes('project manager');

const PAGE_SIZE = 10;

// Role filter buttons -> predicate over an employee record.
const ROLE_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'Full-time', label: 'Full-time' },
    { key: 'Intern', label: 'Interns' },
    { key: 'pm', label: 'PMs' },
    { key: 'Contract', label: 'Contract' },
];

const matchesRole = (emp, key) => {
    if (key === 'all') return true;
    if (key === 'pm') return isPm(emp);
    const t = (emp?.employee_type || '').toLowerCase();
    if (key === 'Full-time') return t === 'full-time';
    if (key === 'Intern') return t === 'intern';
    if (key === 'Contract') return t === 'contract' || t === 'contractor';
    return true;
};

const StatusPill = ({ status }) => (
    status === 'reviewed'
        ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Reviewed</span>
        : <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"><Lock className="h-3 w-3" /> Submitted</span>
);

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

// Overall-rating cell: compact stars + score, with a hover popover that breaks
// the score down into per-parameter stars (PM rating once reviewed, else self).
const RatingCell = ({ evaluation }) => {
    const rating = evaluation.overall_rating ?? evaluation.employee_overall_rating;
    const reviewed = evaluation.status === 'reviewed';
    const params = normalizeParamValues(evaluation.parameter_values);
    return (
        <div className="group/rt relative inline-flex cursor-help items-center justify-end gap-2">
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-700">
                {rating != null ? Number(rating).toFixed(1) : '—'} / 5
            </span>
            <div className="pointer-events-none absolute right-0 top-full z-40 mt-2 hidden w-64 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl group-hover/rt:block">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {reviewed ? 'PM rating breakdown' : 'Self rating breakdown'}
                </p>
                <div className="space-y-1.5">
                    {params.length === 0 && <p className="text-xs text-slate-400">No parameter ratings</p>}
                    {params.map((p) => (
                        <div key={p.name} className="flex items-center justify-between gap-3">
                            <span className="truncate text-xs text-slate-600">{p.name}</span>
                            <StarRating value={Math.round((reviewed ? p.pm_rating : p.employee_rating) || 0)} readOnly showLabel={false} size="text-xs" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const AdminPerformancePage = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const { data: employees = [], isLoading: empLoading } = useQuery({ queryKey: ['employees'], queryFn: employeeApi.getAll });
    const { data: projects = [] } = useQuery({ queryKey: ['sub-projects'], queryFn: subProjectApi.getAll });
    const { data: mainProjects = [] } = useQuery({ queryKey: ['parent-projects'], queryFn: parentProjectApi.getAll, staleTime: 5 * 60 * 1000 });
    // Admin sees ALL evaluations (submitted + reviewed).
    const { data: evaluations = [], isLoading: evalLoading } = useQuery({
        queryKey: ['perf-evals', 'all'],
        queryFn: () => perfEvalApi.getAll(),
    });

    const [tab, setTab] = useState('employees'); // 'employees' | 'pm'
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [expandedEval, setExpandedEval] = useState(null);
    const [perfPage, setPerfPage] = useState(1);
    useEffect(() => { setPerfPage(1); }, [search, roleFilter, tab]);

    const empById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
    const empName = (id) => empById.get(id)?.name || `Employee #${id}`;
    const projName = (id) => projects.find((p) => p.id === id)?.name || `Project #${id}`;

    // Reporting manager(s) of an evaluation = PM(s) of the main project its sub-project
    // belongs to. Same join the Employees table uses: sub_project → main_project → PM.
    const subProjectById = useMemo(() => new Map(projects.map((sp) => [String(sp.id), sp])), [projects]);
    const mainProjectById = useMemo(() => new Map(mainProjects.map((mp) => [String(mp.id), mp])), [mainProjects]);

    const managersOfProject = (projectId) => {
        const sp = subProjectById.get(String(projectId));
        const mp = sp ? mainProjectById.get(String(sp.main_project_id)) : null;
        if (!mp) return [];
        if (Array.isArray(mp.program_manager_names) && mp.program_manager_names.length > 0) return mp.program_manager_names;
        if (mp.program_manager_name) return [mp.program_manager_name];
        const ids = mp.program_manager_ids?.length
            ? mp.program_manager_ids
            : (mp.program_manager_id ? [mp.program_manager_id] : []);
        return ids.map((id) => empById.get(Number(id))?.name).filter(Boolean);
    };

    // Employee summary excludes PM self-reports (project_id 0 — shown on the PM Approvals tab).
    const employeeEvals = useMemo(() => evaluations.filter((e) => e.project_id !== 0), [evaluations]);

    // PM self-reports (project_id 0) — admin reviews/approves these.
    const pmSelfEvals = useMemo(
        () => evaluations.filter((e) => e.project_id === 0).sort((a, b) => {
            if (a.status !== b.status) return a.status === 'submitted' ? -1 : 1;
            return (b.period || '').localeCompare(a.period || '');
        }),
        [evaluations],
    );
    const pmPendingCount = pmSelfEvals.filter((e) => e.status === 'submitted').length;

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        return employeeEvals
            .filter((e) => matchesRole(empById.get(e.employee_id), roleFilter))
            .filter((e) => !term || empName(e.employee_id).toLowerCase().includes(term))
            .sort((a, b) => (b.period || '').localeCompare(a.period || ''));
    }, [employeeEvals, search, roleFilter, empById]);

    const bonusEvals = useMemo(
        () => employeeEvals.filter((e) => e.bonus_suggested).sort((a, b) => (b.period || '').localeCompare(a.period || '')),
        [employeeEvals],
    );

    const avgAll = useMemo(() => {
        const vals = employeeEvals.map((e) => Number(e.overall_rating)).filter((n) => n >= 1);
        if (vals.length === 0) return null;
        return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
    }, [employeeEvals]);

    const isLoading = empLoading || evalLoading;

    const reviewColumns = [
        {
            key: 'employee', label: 'Employee', width: 'w-[18%]',
            render: (_, ev) => (
                <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-slate-100 text-[13px] font-bold text-indigo-700">
                        {(empName(ev.employee_id) || '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate font-medium text-slate-800">{empName(ev.employee_id)}</span>
                </div>
            ),
        },
        { key: 'project', label: 'Project', width: 'w-[22%]', render: (_, ev) => <span className="block truncate text-slate-600">{projName(ev.project_id)}</span> },
        { key: 'period', label: 'Period', width: 'w-[10%]', render: (_, ev) => <span className="whitespace-nowrap text-slate-500">{formatPeriod(ev.period)}</span> },
        {
            key: 'pm', label: 'Program Manager', width: 'w-[18%]',
            render: (_, ev) => {
                const managers = managersOfProject(ev.project_id);
                if (managers.length === 0) return <span className="text-slate-400">—</span>;

                const visibleRows = filtered.slice((perfPage - 1) * PAGE_SIZE, perfPage * PAGE_SIZE);
                const pageIndex = visibleRows.indexOf(ev);
                const isNearTop = visibleRows.length <= 2 ? pageIndex === 0 : pageIndex <= 1;
                const positionClass = isNearTop ? 'top-full mt-1.5' : 'bottom-full mb-1.5';
                const extra = managers.length - 1;

                return (
                    <div className="group/pm relative flex cursor-default items-center gap-1 whitespace-nowrap">
                        <span className="truncate text-slate-600" title={managers.join(', ')}>{managers[0]}</span>
                        {extra > 0 && (
                            <span className="inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 px-1 text-[10px] font-semibold text-slate-500">
                                +{extra}
                            </span>
                        )}
                        {managers.length > 1 && (
                            <div className={`pointer-events-none absolute left-0 ${positionClass} z-40 hidden min-w-[180px] max-w-[260px] flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 shadow-xl group-hover/pm:flex`}>
                                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Reporting Managers ({managers.length})
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {managers.map((name, idx) => (
                                        <span key={idx} className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
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
        { key: 'submitted', label: 'Submitted', width: 'w-[12%]', render: (_, ev) => <span className="whitespace-nowrap text-slate-500 tabular-nums">{fmtDate(ev.submitted_at || ev.created_at)}</span> },
        {
            key: 'status', label: 'Status', width: 'w-[12%]',
            render: (_, ev) => (
                <span className="inline-flex items-center gap-1.5">
                    <StatusPill status={ev.status} />
                    {ev.bonus_suggested && <Gift className="h-3.5 w-3.5 text-amber-500" title="Suggested for bonus" />}
                </span>
            ),
        },
        { key: 'rating', label: 'Rating', align: 'right', width: 'w-[8%]', render: (_, ev) => <RatingCell evaluation={ev} /> },
    ];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h1 className="text-lg font-semibold text-slate-900">Performance Summary</h1>
                <p className="text-slate-500 text-[13px] mt-0.5">
                    Read-only summary of monthly reviews — PM ratings per employee, project and month, plus bonus suggestions.
                </p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard title="Reviews" value={employeeEvals.length} icon={ClipboardList} tone="indigo" hint="submitted reviews" />
                <StatCard title="Avg Rating" value={avgAll != null ? avgAll.toFixed(2) : '—'} unit={avgAll != null ? '/ 5' : undefined} icon={Star} tone="amber" hint="across all reviews" />
                <StatCard title="Bonus Suggested" value={bonusEvals.length} icon={Gift} tone="violet" hint="flagged by PMs" />
            </div>

            {/* Tabs + (employee) controls on one row */}
            <div className="flex flex-col gap-3 border-b border-slate-200 sm:min-h-[44px] sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => setTab('employees')}
                        className={`-mb-px border-b-2 pb-2.5 text-[13px] font-semibold transition-colors ${tab === 'employees' ? 'border-indigo-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        Employees
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('pm')}
                        className={`-mb-px flex items-center gap-1.5 border-b-2 pb-2.5 text-[13px] font-semibold transition-colors ${tab === 'pm' ? 'border-indigo-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        PM Approvals
                        {pmPendingCount > 0 && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">{pmPendingCount}</span>
                        )}
                    </button>
                </div>

                {tab === 'employees' && !isLoading && employeeEvals.length > 0 && (
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
                                        className={`whitespace-nowrap rounded-md px-3 py-1 text-[13px] font-semibold transition-all ${active ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70' : 'text-slate-500 hover:text-slate-800'}`}
                                    >
                                        {r.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {tab === 'pm' ? (
                isLoading ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">Loading…</div>
                ) : pmSelfEvals.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
                        <UserCog className="mx-auto h-10 w-10 text-slate-300" />
                        <h2 className="mt-4 text-lg font-semibold text-slate-800">No PM self-evaluations yet</h2>
                        <p className="mt-2 text-sm text-slate-500">When a PM submits their monthly self-evaluation, it appears here for approval.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pmSelfEvals.map((ev) => (
                            <EvalReviewCard key={ev.id} evaluation={ev} personName={empName(ev.employee_id)} reviewerId={user.id} />
                        ))}
                    </div>
                )
            ) : (
            <>
            {/* Suggested for Bonus */}
            {!isLoading && bonusEvals.length > 0 && (
                <section className="rounded-3xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                        <Gift className="h-5 w-5 text-amber-600" />
                        <h2 className="text-base font-semibold text-slate-800">Suggested for Bonus</h2>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">{bonusEvals.length}</span>
                    </div>
                    <div className="space-y-2">
                        {bonusEvals.map((ev) => (
                            <div key={ev.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-100 bg-white px-4 py-3">
                                <div className="min-w-0">
                                    <p className="font-medium text-slate-800">{empName(ev.employee_id)}</p>
                                    <p className="text-xs text-slate-400">{projName(ev.project_id)} · {formatPeriod(ev.period)}{ev.bonus_note ? ` · ${ev.bonus_note}` : ''}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <StarRating value={Math.round(ev.overall_rating || 0)} readOnly showLabel={false} size="text-sm" />
                                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">{ev.overall_rating != null ? Number(ev.overall_rating).toFixed(1) : '—'} / 5</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {isLoading ? (
                <Table variant="untitled" columns={reviewColumns} data={[]} loading skeletonRows={8} />
            ) : employeeEvals.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
                    <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
                    <h2 className="mt-4 text-lg font-semibold text-slate-800">No evaluations yet</h2>
                    <p className="mt-2 text-sm text-slate-500">Once employees submit their monthly reviews, they appear here.</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
                    <Search className="mx-auto h-10 w-10 text-slate-300" />
                    <h2 className="mt-4 text-lg font-semibold text-slate-800">No results match your filters</h2>
                </div>
            ) : (
                <Table
                    variant="untitled"
                    allowOverflow
                    columns={reviewColumns}
                    data={filtered}
                    currentPage={perfPage}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPerfPage}
                    onRowClick={(row) => setExpandedEval((cur) => (cur === row.id ? null : row.id))}
                    expandedRowId={expandedEval}
                    getRowId={(row) => row.id}
                    renderExpandedRow={(row) => (
                        <div className="border-t border-slate-100 bg-slate-50/40 p-4">
                            <EvaluationDetail evaluation={row} />
                        </div>
                    )}
                    emptyState={{ title: 'No reviews', description: 'Nothing to show here.' }}
                />
            )}
            </>
            )}
        </div>
    );
};

export default AdminPerformancePage;
