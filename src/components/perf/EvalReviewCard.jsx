import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Pencil, Trash2, Gift } from 'lucide-react';
import toast from 'react-hot-toast';
import StarRating, { formatPeriod } from './StarRating';
import { averageOf, normalizeParamValues } from './perfParams';
import EvaluationDetail from './EvaluationDetail';
import ConfirmDialog from '../ui/ConfirmDialog';
import { perfEvalApi } from '../../services/api';

// Reusable review card. Used by PMs (reviewing employees) and admins (reviewing
// PM self-reports). `personName` is whoever the evaluation belongs to.
const EvalReviewCard = ({ evaluation, personName, reviewerId }) => {
    const queryClient = useQueryClient();
    const reviewed = evaluation.status === 'reviewed';
    const [editing, setEditing] = useState(!reviewed);
    const [confirmDelete, setConfirmDelete] = useState(false);

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
                    <span className="font-medium text-slate-800">{personName}</span>
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
                                        <span className="text-[10px] uppercase tracking-wide text-slate-400">Self</span>
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
                                    placeholder="Feedback (required)…"
                                    className="mt-2 w-full resize-none rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                                />
                            )}
                        </div>
                    ))}

                    {evaluation.overall_comment && (
                        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Overall comment</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{evaluation.overall_comment}</p>
                        </div>
                    )}

                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                        <label className="flex items-center justify-between gap-3">
                            <span className="inline-flex items-center gap-2 text-sm font-medium text-amber-800"><Gift className="h-4 w-4" /> Suggest for a bonus</span>
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
                message={`Delete ${personName}'s evaluation for ${formatPeriod(evaluation.period)}? This cannot be undone.`}
                confirmText="Delete"
                isPending={deleteMutation.isPending}
            />
        </div>
    );
};

export default EvalReviewCard;
