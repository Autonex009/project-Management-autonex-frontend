import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { allocationApi, subProjectApi, perfEvalApi } from '../../services/api';
import { ClipboardList, ChevronDown, ChevronUp, CheckCircle2, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import StarRating, { currentPeriod, formatPeriod, cleanParamNames } from '../../components/perf/StarRating';
import EvaluationDetail from '../../components/perf/EvaluationDetail';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const StatusBadge = ({ status }) => {
    if (status === 'accepted') {
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Accepted</span>;
    }
    if (status === 'submitted') {
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"><Lock className="h-3 w-3" /> Submitted</span>;
    }
    return null;
};

const ProjectEvalPanel = ({ project, employeeId, submittedBy, existing }) => {
    const [expanded, setExpanded] = useState(false);
    const queryClient = useQueryClient();
    const period = currentPeriod();

    const { data: template } = useQuery({
        queryKey: ['perf-eval-params', project.id],
        queryFn: () => perfEvalApi.getParams(project.id),
        enabled: expanded,
    });
    const paramNames = cleanParamNames(template?.params || []);

    // existing evaluation for THIS period (locked once submitted)
    const currentEval = existing.find((e) => e.period === period) || null;

    const [values, setValues] = useState({});
    const [contributions, setContributions] = useState('');
    const [strengths, setStrengths] = useState('');
    const [improvements, setImprovements] = useState('');
    const [rating, setRating] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const submitMutation = useMutation({
        mutationFn: (data) => perfEvalApi.submit(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-perf-evals'] });
            toast.success('Self-evaluation submitted');
        },
        onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to submit'),
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!rating) {
            toast.error('Please give an overall rating');
            return;
        }
        setConfirmOpen(true);
    };

    const confirmSubmit = () => {
        submitMutation.mutate({
            project_id: project.id,
            employee_id: employeeId,
            period,
            parameter_values: paramNames.map((name) => ({ name, value: values[name] || '' })),
            contributions: contributions.trim() || null,
            strengths: strengths.trim() || null,
            improvements: improvements.trim() || null,
            overall_rating: rating,
            submitted_by: submittedBy,
        }, { onSuccess: () => setConfirmOpen(false) });
    };

    return (
        <article className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
            <button
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-slate-50/60"
            >
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-base font-bold text-emerald-700 shrink-0">
                        {(project.name || 'P').charAt(0)}
                    </div>
                    <div>
                        <p className="font-semibold text-slate-900">{project.name}</p>
                        <p className="text-xs text-slate-400">{project.client || 'No client'} · {formatPeriod(period)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {currentEval ? <StatusBadge status={currentEval.status} /> : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">Not submitted</span>}
                    {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
            </button>

            {expanded && (
                <div className="border-t border-slate-100 p-5">
                    {currentEval ? (
                        <div className="space-y-4">
                            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                                You've already submitted this month's evaluation. It's locked and pending your PM's review.
                            </p>
                            <EvaluationDetail evaluation={currentEval} />
                        </div>
                    ) : paramNames.length === 0 ? (
                        <p className="py-4 text-center text-sm text-slate-400">
                            Your PM hasn't set up evaluation parameters for this project yet.
                        </p>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-3">
                                {paramNames.map((name) => (
                                    <div key={name}>
                                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{name}</label>
                                        <textarea
                                            rows={2}
                                            value={values[name] || ''}
                                            onChange={(e) => setValues((p) => ({ ...p, [name]: e.target.value }))}
                                            placeholder={`Enter your ${name.toLowerCase()}…`}
                                            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3 border-t border-slate-100 pt-4">
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Overall contributions in last month</label>
                                    <textarea rows={2} value={contributions} onChange={(e) => setContributions(e.target.value)} className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Areas that are your strengths</label>
                                    <textarea rows={2} value={strengths} onChange={(e) => setStrengths(e.target.value)} className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Areas to improve</label>
                                    <textarea rows={2} value={improvements} onChange={(e) => setImprovements(e.target.value)} className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Overall Rating</p>
                                    <StarRating value={rating} onChange={setRating} />
                                </div>
                                <button
                                    type="submit"
                                    disabled={submitMutation.isPending}
                                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {submitMutation.isPending ? 'Submitting…' : 'Submit Evaluation'}
                                </button>
                            </div>
                            <p className="text-center text-xs text-slate-400">Once submitted, the evaluation is locked and cannot be edited.</p>
                        </form>
                    )}
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={confirmSubmit}
                title="Submit evaluation?"
                message={`Submit your ${formatPeriod(period)} self-evaluation for “${project.name}”? Once submitted it is locked and cannot be edited.`}
                confirmText="Submit"
                variant="info"
                isPending={submitMutation.isPending}
            />
        </article>
    );
};

const SelfEvaluationPage = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const employeeId = user.employee_id;

    const { data: allocations = [], isLoading: allocLoading } = useQuery({
        queryKey: ['my-allocations', employeeId],
        queryFn: () => allocationApi.getByEmployee(employeeId),
        enabled: !!employeeId,
    });
    const { data: projects = [] } = useQuery({ queryKey: ['sub-projects'], queryFn: subProjectApi.getAll });
    const { data: myEvals = [], isLoading: evalsLoading } = useQuery({
        queryKey: ['my-perf-evals', employeeId],
        queryFn: () => perfEvalApi.getAll({ employee_id: employeeId }),
        enabled: !!employeeId,
    });

    const myProjects = useMemo(() => {
        const ids = new Set(allocations.map((a) => a.sub_project_id));
        return projects.filter((p) => ids.has(p.id)).sort((a, b) => a.name.localeCompare(b.name));
    }, [allocations, projects]);

    const evalsByProject = (projectId) => myEvals.filter((e) => e.project_id === projectId);
    const isLoading = allocLoading || evalsLoading;

    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-[28px] border border-emerald-100 bg-[linear-gradient(135deg,rgba(5,150,105,0.12),rgba(255,255,255,0.94)_42%,rgba(236,253,245,1))] p-6 shadow-sm">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">Self Evaluation</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Monthly Self Evaluation</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-500">
                    Fill in your monthly self-evaluation for each project you're allocated to. Submissions are locked and reviewed by your PM.
                </p>
            </section>

            {isLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">Loading…</div>
            ) : myProjects.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
                    <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
                    <h2 className="mt-4 text-lg font-semibold text-slate-800">No projects allocated</h2>
                    <p className="mt-2 text-sm text-slate-500">You'll be able to submit evaluations once you're allocated to a project.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {myProjects.map((project) => (
                        <ProjectEvalPanel
                            key={project.id}
                            project={project}
                            employeeId={employeeId}
                            submittedBy={user.id}
                            existing={evalsByProject(project.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default SelfEvaluationPage;
