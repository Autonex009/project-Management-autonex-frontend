import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { PERF_CRITERIA, RATING_SCALE, formatPeriod } from './perfCriteria';

const MiniStars = ({ value }) => (
    <span className="text-sm" title={RATING_SCALE[value]}>
        {[1, 2, 3, 4, 5].map((s) => (
            <span key={s} className={s <= (value || 0) ? 'text-amber-400' : 'text-slate-200'}>★</span>
        ))}
    </span>
);

const PerfReviewCard = ({ review, onEdit, onDelete, canEdit = true }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{formatPeriod(review.period)}</span>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600">
                    Avg {review.average != null ? Number(review.average).toFixed(2) : '—'} / 5
                </span>
            </div>
            {canEdit && (
                <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => onEdit(review)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600">
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => onDelete(review.id)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {PERF_CRITERIA.map((c) => (
                <div key={c.key} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                    <span className="text-xs font-medium text-slate-600">{c.label}</span>
                    <MiniStars value={review.criteria_ratings?.[c.key]} />
                </div>
            ))}
        </div>

        {review.comment && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{review.comment}</p>
        )}

        <p className="mt-3 text-xs text-slate-400">
            {new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
    </div>
);

export default PerfReviewCard;
