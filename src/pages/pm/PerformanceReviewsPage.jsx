import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { employeeApi, allocationApi, parentProjectApi, subProjectApi, perfEvalApi } from '../../services/api';
import { getPmEmployeeId, getPmSubProjects } from '../../utils/pmScope';
import { ChevronDown, ChevronUp, ClipboardList } from 'lucide-react';
import EvalReviewCard from '../../components/perf/EvalReviewCard';

const ProjectPanel = ({ project, employees, evaluations, reviewerId }) => {
    const [expanded, setExpanded] = useState(false);
    const projectEvals = evaluations.filter((e) => e.project_id === project.id);
    const pending = projectEvals.filter((e) => e.status === 'submitted').length;
    const empName = (id) => employees.find((e) => e.id === id)?.name || `Employee #${id}`;

    return (
        <article className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
            <button
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-slate-50/60"
            >
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-base font-bold text-blue-700 shrink-0">
                        {(project.name || 'P').charAt(0)}
                    </div>
                    <div>
                        <p className="font-semibold text-slate-900">{project.name}</p>
                        <p className="text-xs text-slate-400">{project.client || 'No client'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {pending > 0 && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">{pending} pending</span>}
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                        {projectEvals.length} {projectEvals.length === 1 ? 'submission' : 'submissions'}
                    </span>
                    {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
            </button>

            {expanded && (
                <div className="space-y-5 border-t border-slate-100 p-5">
                    <div>
                        <h4 className="mb-3 text-sm font-semibold text-slate-700">Submitted Evaluations</h4>
                        {projectEvals.length === 0 ? (
                            <p className="py-4 text-center text-sm text-slate-400">No employee submissions yet for this project.</p>
                        ) : (
                            <div className="space-y-3">
                                {projectEvals.map((ev) => (
                                    <EvalReviewCard key={ev.id} evaluation={ev} personName={empName(ev.employee_id)} reviewerId={reviewerId} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </article>
    );
};

const PerformanceReviewsPage = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const pmEmployeeId = getPmEmployeeId(user);

    const { data: parentProjects = [] } = useQuery({ queryKey: ['parent-projects'], queryFn: parentProjectApi.getAll });
    const { data: projects = [] } = useQuery({ queryKey: ['sub-projects'], queryFn: subProjectApi.getAll });
    const { data: employees = [], isLoading: empLoading } = useQuery({ queryKey: ['employees'], queryFn: employeeApi.getAll });
    const { data: allocations = [] } = useQuery({ queryKey: ['allocations'], queryFn: allocationApi.getAll });
    const { data: evaluations = [], isLoading: evalLoading } = useQuery({ queryKey: ['perf-evals'], queryFn: () => perfEvalApi.getAll() });

    const scopedProjects = useMemo(
        () => getPmSubProjects(projects, parentProjects, pmEmployeeId, allocations).sort((a, b) => a.name.localeCompare(b.name)),
        [projects, parentProjects, pmEmployeeId, allocations],
    );

    const pendingCount = evaluations.filter((e) => e.status === 'submitted' && scopedProjects.some((p) => p.id === e.project_id)).length;
    const isLoading = empLoading || evalLoading;

    return (
        <div className="space-y-8">
            <section className="overflow-hidden rounded-[28px] border border-blue-100 bg-[linear-gradient(135deg,rgba(37,99,235,0.12),rgba(255,255,255,0.94)_42%,rgba(239,246,255,1))] p-6 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-700">Performance</p>
                        <h1 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">Monthly Performance Reviews</h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-500">
                            Review your team's monthly self-ratings — approve or reject each parameter, add your own rating, and suggest bonuses.
                        </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Projects</p>
                            <p className="text-xl font-semibold text-slate-900">{scopedProjects.length}</p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Pending Review</p>
                            <p className="text-xl font-semibold text-slate-900">{pendingCount}</p>
                        </div>
                    </div>
                </div>
            </section>

            {isLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">Loading…</div>
            ) : scopedProjects.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
                    <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
                    <h2 className="mt-4 text-lg font-semibold text-slate-800">No projects in your scope</h2>
                    <p className="mt-2 text-sm text-slate-500">Projects appear here once they're assigned to you.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {scopedProjects.map((project) => (
                        <ProjectPanel
                            key={project.id}
                            project={project}
                            employees={employees}
                            evaluations={evaluations}
                            reviewerId={user.id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default PerformanceReviewsPage;
