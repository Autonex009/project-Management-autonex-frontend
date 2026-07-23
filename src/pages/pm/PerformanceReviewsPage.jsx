import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi, allocationApi, parentProjectApi, subProjectApi, perfEvalApi } from '../../services/api';
import { getPmEmployeeId, getPmSubProjects } from '../../utils/pmScope';
import { ChevronDown, ChevronUp, ClipboardList, CheckCircle2, Pencil, Trash2, Gift } from 'lucide-react';
import toast from 'react-hot-toast';
import StarRating, { formatPeriod } from '../../components/perf/StarRating';
import { averageOf, normalizeParamValues } from '../../components/perf/perfParams';
import EvaluationDetail from '../../components/perf/EvaluationDetail';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

// ── PM reviews a single submitted evaluation ─────────────────────────────────
const EvalReviewCard = ({ evaluation, employeeName, reviewerId }) => {
    const queryClient = useQueryClient();
    const reviewed = evaluation.status === 'reviewed';
    const [editing, setEditing] = useState(!reviewed);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Per-parameter review state, seeded from the submission (defaults: approve,
    // PM rating pre-filled with the employee's rating as a starting point).
    const [rows, setRows] = useState(() =>
        normalizeParamValues(evaluation.parameter_values).map((p) => ({
            name: p.name,
            employee_rating: p.employee_rating,
            pm_rating: p.pm_rating ?? p.employee_rating ?? null,
            approved: p.approved ?? true,
            feedback: p.feedback || '',
        })),
    );
    const [bonus, setBonus] = useState(!!evaluation.bonus_suggested);
    const [bonusNote, setBonusNote] = useState(evaluation.bonus_note || '');

    const setRow = (name, patch) => setRows((rs) => rs.map((r) => (r.name === name ? { ...r, ...patch } : r)));
    const pmAvg = averageOf(rows.map((r) => r.pm_rating));

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['perf-evals'] });

    const deleteMutation = useMutation({
        mutationFn: () => perfEvalApi.delete(evaluation.id),
        onSuccess: () => { invalidate(); setConfirmDelete(false); toast.success('Evaluation deleted'); },
        onError: () => toast.error('Failed to delete'),
    });

    const reviewMutation = useMutation({
        mutationFn: (data) => perfEvalApi.review(evaluation.id, data),
        onSuccess: () => { invalidate(); setEditing(false); toast.success('Review submitted'); },
        onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to submit review'),
    });

    const submitReview = () => {
        if (rows.some((r) => !r.pm_rating)) {
            toast.error('Please give your rating on all parameters');
            return;
        }
        const missingFeedback = rows.find((r) => !r.approved && !r.feedback.trim());
        if (missingFeedback) {
            toast.error(`Add feedback for the rejected parameter “${missingFeedback.name}”`);
            return;
        }
        reviewMutation.mutate({
            parameter_values: rows.map((r) => ({
                name: r.name,
                pm_rating: r.pm_rating,
                approved: r.approved,
                feedback: r.approved ? null : r.feedback.trim(),
            })),
            bonus_suggested: bonus,
            bonus_note: bonus ? (bonusNote.trim() || null) : null,
            reviewed_by: reviewerId,
        });
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-800">{employeeName}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{formatPeriod(evaluation.period)}</span>
                    {reviewed
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Reviewed</span>
                        : <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Pending review</span>}
                    {reviewed && evaluation.bonus_suggested && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"><Gift className="h-3 w-3" /> Bonus</span>
                    )}
                </div>
                {!editing && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                            <Pencil className="h-3 w-3" /> Edit review
                        </button>
                        <button onClick={() => setConfirmDelete(true)} title="Delete" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600">
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </div>
                )}
            </div>

            {editing ? (
                <div className="space-y-3">
                    {rows.map((r) => (
                        <div key={r.name} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-medium text-slate-800">{r.name}</p>
                                    <div className="mt-1 flex items-center gap-1.5">
                                        <span className="text-[10px] uppercase tracking-wide text-slate-400">Employee</span>
                                        <StarRating value={r.employee_rating || 0} readOnly showLabel={false} size="text-sm" />
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase tracking-wide text-amber-500">Your rating</span>
                                        <StarRating value={r.pm_rating || null} onChange={(v) => setRow(r.name, { pm_rating: v })} showLabel={false} size="text-lg" />
                                    </div>
                                    <div className="flex items-center gap-4 text-xs">
                                        <label className="inline-flex cursor-pointer items-center gap-1.5">
                                            <input type="radio" name={`decision-${evaluation.id}-${r.name}`} checked={r.approved} onChange={() => setRow(r.name, { approved: true })} className="accent-emerald-600" />
                                            <span className={r.approved ? 'font-medium text-emerald-700' : 'text-slate-500'}>Approve</span>
                                        </label>
                                        <label className="inline-flex cursor-pointer items-center gap-1.5">
                                            <input type="radio" name={`decision-${evaluation.id}-${r.name}`} checked={!r.approved} onChange={() => setRow(r.name, { approved: false })} className="accent-rose-600" />
                                            <span className={!r.approved ? 'font-medium text-rose-700' : 'text-slate-500'}>Reject</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            {!r.approved && (
                                <textarea
                                    rows={2}
                                    value={r.feedback}
                                    onChange={(e) => setRow(r.name, { feedback: e.target.value })}
                                    placeholder="Feedback for the employee (required)…"
                                    className="mt-2 w-full resize-none rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                                />
                            )}
                        </div>
                    ))}

                    {evaluation.overall_comment && (
                        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Employee's overall comment</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{evaluation.overall_comment}</p>
                        </div>
                    )}

                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                        <label className="flex items-center justify-between gap-3">
                            <span className="inline-flex items-center gap-2 text-sm font-medium text-amber-800"><Gift className="h-4 w-4" /> Suggest this employee for a bonus</span>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={bonus}
                                onClick={() => setBonus((v) => !v)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${bonus ? 'bg-amber-500' : 'bg-slate-300'}`}
                            >
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${bonus ? 'translate-x-5' : 'translate-x-0.5'}`} />
                            </button>
                        </label>
                        {bonus && (
                            <textarea
                                rows={2}
                                value={bonusNote}
                                onChange={(e) => setBonusNote(e.target.value)}
                                placeholder="Reason for the bonus (optional)…"
                                className="mt-2 w-full resize-none rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                            />
                        )}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <p className="text-sm text-slate-500">Your average: <span className="font-semibold text-amber-600">{pmAvg != null ? `${pmAvg.toFixed(1)} / 5` : '—'}</span></p>
                        <div className="flex gap-2">
                            {reviewed && <button onClick={() => setEditing(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>}
                            <button onClick={submitReview} disabled={reviewMutation.isPending} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                                {reviewMutation.isPending ? 'Saving…' : 'Submit Review'}
                            </button>
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
