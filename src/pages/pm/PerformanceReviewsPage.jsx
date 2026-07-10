import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi, allocationApi, parentProjectApi, subProjectApi, perfEvalApi } from '../../services/api';
import { getPmEmployeeId, getPmSubProjects } from '../../utils/pmScope';
import { ChevronDown, ChevronUp, ClipboardList, Plus, X, Settings2, CheckCircle2, Pencil, Check, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import StarRating, { currentPeriod, formatPeriod, cleanParamNames, isReservedParam } from '../../components/perf/StarRating';
import EvaluationDetail from '../../components/perf/EvaluationDetail';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

// ── PM edits the per-project parameter template ──────────────────────────────
const ParamsEditor = ({ projectId }) => {
    const queryClient = useQueryClient();
    const { data: template } = useQuery({
        queryKey: ['perf-eval-params', projectId],
        queryFn: () => perfEvalApi.getParams(projectId),
    });
    const [params, setParams] = useState(null);
    const [draft, setDraft] = useState('');
    const list = cleanParamNames(params ?? template?.params ?? []);

    const saveMutation = useMutation({
        mutationFn: (next) => perfEvalApi.setParams({ project_id: projectId, params: next }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['perf-eval-params', projectId] }); toast.success('Parameters saved'); },
        onError: () => toast.error('Failed to save parameters'),
    });

    const add = () => {
        const v = draft.trim();
        if (!v) return;
        if (isReservedParam(v)) { toast.error('That is a reserved field and is already included'); return; }
        if (list.some((p) => p.toLowerCase() === v.toLowerCase())) { toast.error('Parameter already exists'); return; }
        const next = [...list, v];
        setParams(next);
        setDraft('');
    };
    const remove = (name) => setParams(list.filter((p) => p !== name));

    return (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
            <div className="mb-3 flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-blue-600" />
                <h4 className="text-sm font-semibold text-slate-700">Evaluation Parameters</h4>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
                {list.length === 0 && <p className="text-xs text-slate-400">No parameters yet. Add ones like “Time per task”, “Quality”, “Rejection Rate”.</p>}
                {list.map((name) => (
                    <span key={name} className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                        {name}
                        <button type="button" onClick={() => remove(name)} className="text-slate-400 hover:text-rose-500"><X className="h-3 w-3" /></button>
                    </span>
                ))}
            </div>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
                    placeholder="Add a parameter…"
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <button type="button" onClick={add} className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                    <Plus className="h-3.5 w-3.5" /> Add
                </button>
                <button
                    type="button"
                    onClick={() => saveMutation.mutate(list)}
                    disabled={saveMutation.isPending || params === null}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    {saveMutation.isPending ? 'Saving…' : 'Save'}
                </button>
            </div>
        </div>
    );
};

// ── PM reviews a single submitted evaluation (accept / edit) ─────────────────
const EvalReviewCard = ({ evaluation, employeeName, reviewerId }) => {
    const queryClient = useQueryClient();
    const [editing, setEditing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [rating, setRating] = useState(evaluation.overall_rating || null);
    const editableParams = (evaluation.parameter_values || []).filter((p) => !isReservedParam(p?.name));
    const [values, setValues] = useState(() => {
        const m = {};
        editableParams.forEach((p) => { m[p.name] = p.value || ''; });
        return m;
    });
    const [contributions, setContributions] = useState(evaluation.contributions || '');
    const [strengths, setStrengths] = useState(evaluation.strengths || '');
    const [improvements, setImprovements] = useState(evaluation.improvements || '');

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['perf-evals'] });

    const deleteMutation = useMutation({
        mutationFn: () => perfEvalApi.delete(evaluation.id),
        onSuccess: () => { invalidate(); setConfirmDelete(false); toast.success('Evaluation deleted'); },
        onError: () => toast.error('Failed to delete'),
    });

    const acceptMutation = useMutation({
        mutationFn: () => perfEvalApi.accept(evaluation.id, reviewerId),
        onSuccess: () => { invalidate(); toast.success('Evaluation accepted'); },
        onError: () => toast.error('Failed to accept'),
    });

    const saveMutation = useMutation({
        mutationFn: (data) => perfEvalApi.update(evaluation.id, data),
        onSuccess: () => { invalidate(); setEditing(false); toast.success('Evaluation updated'); },
        onError: () => toast.error('Failed to update'),
    });

    const saveEdits = () => {
        saveMutation.mutate({
            parameter_values: editableParams.map((p) => ({ name: p.name, value: values[p.name] || '' })),
            contributions: contributions.trim() || null,
            strengths: strengths.trim() || null,
            improvements: improvements.trim() || null,
            overall_rating: rating,
            reviewed_by: reviewerId,
        });
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">{employeeName}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{formatPeriod(evaluation.period)}</span>
                    {evaluation.status === 'accepted'
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Accepted</span>
                        : <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Pending review</span>}
                </div>
                {!editing && (
                    <div className="flex items-center gap-2">
                        {evaluation.status !== 'accepted' && (
                            <>
                                <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                                    <Pencil className="h-3 w-3" /> Edit
                                </button>
                                <button onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                                    <Check className="h-3 w-3" /> Accept
                                </button>
                            </>
                        )}
                        <button onClick={() => setConfirmDelete(true)} title="Delete" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600">
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </div>
                )}
            </div>

            {editing ? (
                <div className="space-y-3">
                    {editableParams.map((p) => (
                        <div key={p.name}>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{p.name}</label>
                            <textarea rows={2} value={values[p.name] || ''} onChange={(e) => setValues((m) => ({ ...m, [p.name]: e.target.value }))} className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                        </div>
                    ))}
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Overall contributions in last month</label>
                        <textarea rows={2} value={contributions} onChange={(e) => setContributions(e.target.value)} className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Areas that are your strengths</label>
                        <textarea rows={2} value={strengths} onChange={(e) => setStrengths(e.target.value)} className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Areas to improve</label>
                        <textarea rows={2} value={improvements} onChange={(e) => setImprovements(e.target.value)} className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <StarRating value={rating} onChange={setRating} />
                        <div className="flex gap-2">
                            <button onClick={() => setEditing(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
                            <button onClick={saveEdits} disabled={saveMutation.isPending} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saveMutation.isPending ? 'Saving…' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            ) : (
                <EvaluationDetail evaluation={evaluation} />
            )}

            <ConfirmDialog
                isOpen={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                onConfirm={() => deleteMutation.mutate()}
                title="Delete evaluation"
                message={`Delete ${employeeName}'s evaluation for ${formatPeriod(evaluation.period)}? This cannot be undone.`}
                confirmText="Delete"
                isPending={deleteMutation.isPending}
            />
        </div>
    );
};

const ProjectPanel = ({ project, employees, evaluations, reviewerId }) => {
    const [expanded, setExpanded] = useState(false);
    const projectEvals = evaluations.filter((e) => e.project_id === project.id);
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
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                        {projectEvals.length} {projectEvals.length === 1 ? 'submission' : 'submissions'}
                    </span>
                    {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
            </button>

            {expanded && (
                <div className="space-y-5 border-t border-slate-100 p-5">
                    <ParamsEditor projectId={project.id} />

                    <div>
                        <h4 className="mb-3 text-sm font-semibold text-slate-700">Submitted Evaluations</h4>
                        {projectEvals.length === 0 ? (
                            <p className="py-4 text-center text-sm text-slate-400">No employee submissions yet for this project.</p>
                        ) : (
                            <div className="space-y-3">
                                {projectEvals.map((ev) => (
                                    <EvalReviewCard key={ev.id} evaluation={ev} employeeName={empName(ev.employee_id)} reviewerId={reviewerId} />
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
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Project Performance Evaluations</h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-500">
                            Define evaluation parameters per project and review your team's monthly self-evaluations.
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
