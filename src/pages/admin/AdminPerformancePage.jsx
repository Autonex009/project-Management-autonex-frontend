import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { employeeApi, subProjectApi, perfEvalApi } from '../../services/api';
import { ChevronDown, ChevronUp, ClipboardList, Search, X, CheckCircle2, Lock, Gift } from 'lucide-react';
import StarRating, { formatPeriod } from '../../components/perf/StarRating';
import EvaluationDetail from '../../components/perf/EvaluationDetail';

const StatusPill = ({ status }) => (
    status === 'reviewed'
        ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Reviewed</span>
        : <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"><Lock className="h-3 w-3" /> Submitted</span>
);

// Admin view: read-only summary of all monthly evaluations + a bonus section.
const SummaryRow = ({ evaluation, employeeName, projectName }) => {
    const [open, setOpen] = useState(false);
    const rating = evaluation.overall_rating ?? evaluation.employee_overall_rating;
    return (
        <div className="rounded-2xl border border-slate-200 bg-white">
            <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-slate-50/60">
                <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{employeeName}</p>
                    <p className="truncate text-xs text-slate-400">{projectName} · {formatPeriod(evaluation.period)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {evaluation.bonus_suggested && <Gift className="h-4 w-4 text-amber-500" title="Suggested for bonus" />}
                    <StatusPill status={evaluation.status} />
                    <StarRating value={Math.round(rating || 0)} readOnly showLabel={false} size="text-base" />
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{rating != null ? Number(rating).toFixed(1) : '—'} / 5</span>
                    {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
            </button>
            {open && (
                <div className="border-t border-slate-100 p-4">
                    <EvaluationDetail evaluation={evaluation} />
                </div>
            )}
        </div>
    );
};

const AdminPerformancePage = () => {
    const { data: employees = [], isLoading: empLoading } = useQuery({ queryKey: ['employees'], queryFn: employeeApi.getAll });
    const { data: projects = [] } = useQuery({ queryKey: ['sub-projects'], queryFn: subProjectApi.getAll });
    // Admin sees ALL evaluations (submitted + reviewed).
    const { data: evaluations = [], isLoading: evalLoading } = useQuery({
        queryKey: ['perf-evals', 'all'],
        queryFn: () => perfEvalApi.getAll(),
    });

    const [search, setSearch] = useState('');
    const [projectFilter, setProjectFilter] = useState('all');

    const empName = (id) => employees.find((e) => e.id === id)?.name || `Employee #${id}`;
    const projName = (id) => projects.find((p) => p.id === id)?.name || `Project #${id}`;

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        return evaluations
            .filter((e) => projectFilter === 'all' || String(e.project_id) === projectFilter)
            .filter((e) => !term || empName(e.employee_id).toLowerCase().includes(term))
            .sort((a, b) => (b.period || '').localeCompare(a.period || ''));
    }, [evaluations, search, projectFilter, employees]);

    const bonusEvals = useMemo(
        () => evaluations.filter((e) => e.bonus_suggested).sort((a, b) => (b.period || '').localeCompare(a.period || '')),
        [evaluations],
    );

    const avgAll = useMemo(() => {
        const vals = evaluations.map((e) => Number(e.overall_rating)).filter((n) => n >= 1);
        if (vals.length === 0) return null;
        return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
    }, [evaluations]);

    const projectsWithEvals = useMemo(() => {
        const ids = new Set(evaluations.map((e) => e.project_id));
        return projects.filter((p) => ids.has(p.id));
    }, [projects, evaluations]);

    const isLoading = empLoading || evalLoading;

    return (
        <div className="space-y-8">
            <section className="overflow-hidden rounded-[28px] border border-indigo-100 bg-[linear-gradient(135deg,rgba(79,70,229,0.12),rgba(255,255,255,0.94)_42%,rgba(238,242,255,1))] p-6 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-[0.18em] text-indigo-700">Performance</p>
                        <h1 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">Performance Summary</h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-500">
                            Read-only summary of monthly reviews — PM ratings per employee, project, and month, plus bonus suggestions.
                        </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Reviews</p>
                            <p className="text-xl font-semibold text-slate-900">{evaluations.length}</p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Avg Rating</p>
                            <p className="text-xl font-semibold text-amber-500">{avgAll != null ? `${avgAll.toFixed(2)} / 5` : '—'}</p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Bonus Suggested</p>
                            <p className="text-xl font-semibold text-amber-600">{bonusEvals.length}</p>
                        </div>
                    </div>
                </div>
            </section>

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

            {!isLoading && evaluations.length > 0 && (
                <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by employee name..."
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                            />
                        </div>
                        <select
                            value={projectFilter}
                            onChange={(e) => setProjectFilter(e.target.value)}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                        >
                            <option value="all">All projects</option>
                            {projectsWithEvals.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                        </select>
                        {(search || projectFilter !== 'all') && (
                            <button type="button" onClick={() => { setSearch(''); setProjectFilter('all'); }} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                                <X className="h-4 w-4" /> Clear
                            </button>
                        )}
                    </div>
                    <p className="mt-3 text-xs font-medium text-slate-400">Showing {filtered.length} of {evaluations.length} reviews</p>
                </section>
            )}

            {isLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">Loading…</div>
            ) : evaluations.length === 0 ? (
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
                <div className="space-y-3">
                    {filtered.map((ev) => (
                        <SummaryRow key={ev.id} evaluation={ev} employeeName={empName(ev.employee_id)} projectName={projName(ev.project_id)} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminPerformancePage;
