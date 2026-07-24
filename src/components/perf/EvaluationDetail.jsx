import React from 'react';
import StarRating, { formatPeriod } from './StarRating';
import { averageOf, normalizeParamValues } from './perfParams';
import { CheckCircle2, XCircle, Gift } from 'lucide-react';

// Read-only rendering of a monthly performance evaluation (new star-rating shape).
// Shows the employee's self-rating per parameter and, once the PM has reviewed,
// the PM's rating, an approved/rejected badge, and per-parameter feedback.
const EvaluationDetail = ({ evaluation, showBonus }) => {
    if (!evaluation) return null;
    const role = localStorage.getItem('role') || 'employee';
    const isAdmin = role === 'admin';
    const canSeeBonus = showBonus !== undefined ? showBonus : isAdmin;
    const params = normalizeParamValues(evaluation.parameter_values);
    const reviewed = evaluation.status === 'reviewed';
    const empAvg = evaluation.employee_overall_rating ?? averageOf(params.map((p) => p.employee_rating));
    const pmAvg = evaluation.overall_rating ?? averageOf(params.map((p) => p.pm_rating));

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{formatPeriod(evaluation.period)}</span>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Self avg</p>
                        <p className="text-sm font-semibold text-slate-600">{empAvg != null ? `${empAvg.toFixed(1)} / 5` : '—'}</p>
                    </div>
                    {reviewed && (
                        <div className="text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-500">PM avg</p>
                            <p className="text-sm font-semibold text-amber-600">{pmAvg != null ? `${pmAvg.toFixed(1)} / 5` : '—'}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                {params.map((p) => (
                    <div key={p.name} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-800">{p.name}</span>
                                {reviewed && (
                                    p.approved
                                        ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Approved</span>
                                        : <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700"><XCircle className="h-3 w-3" /> Rejected</span>
                                )}
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] uppercase tracking-wide text-slate-400">Self</span>
                                    <StarRating value={p.employee_rating || 0} readOnly showLabel={false} size="text-sm" />
                                </div>
                                {reviewed && (
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] uppercase tracking-wide text-amber-500">PM</span>
                                        <StarRating value={p.pm_rating || 0} readOnly showLabel={false} size="text-sm" />
                                    </div>
                                )}
                            </div>
                        </div>
                        {reviewed && !p.approved && p.feedback && (
                            <p className="mt-2 rounded-lg bg-rose-50/70 px-2.5 py-1.5 text-xs text-rose-700"><span className="font-semibold">PM feedback:</span> {p.feedback}</p>
                        )}
                    </div>
                ))}
            </div>

            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Overall comment</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{evaluation.overall_comment || <span className="text-slate-300">—</span>}</p>
            </div>

            {canSeeBonus && reviewed && evaluation.bonus_suggested && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <Gift className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div>
                        <p className="text-sm font-semibold text-amber-800">Suggested for bonus</p>
                        {evaluation.bonus_note && <p className="mt-0.5 text-xs text-amber-700">{evaluation.bonus_note}</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EvaluationDetail;
