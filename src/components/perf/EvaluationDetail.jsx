import React from 'react';
import StarRating, { formatPeriod, isReservedParam } from './StarRating';

const Field = ({ label, value }) => (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{value || <span className="text-slate-300">—</span>}</p>
    </div>
);

// Read-only rendering of a submitted evaluation.
const EvaluationDetail = ({ evaluation }) => {
    if (!evaluation) return null;
    const params = (Array.isArray(evaluation.parameter_values) ? evaluation.parameter_values : [])
        .filter((p) => !isReservedParam(p?.name));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{formatPeriod(evaluation.period)}</span>
                <StarRating value={Math.round(evaluation.overall_rating || 0)} readOnly showLabel={false} size="text-lg" />
            </div>

            {params.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                    {params.map((p, i) => (
                        <Field key={`${p.name}-${i}`} label={p.name} value={p.value} />
                    ))}
                </div>
            )}

            <Field label="Overall contributions in last month" value={evaluation.contributions} />
            <Field label="Areas that are your strengths" value={evaluation.strengths} />
            <Field label="Areas to improve" value={evaluation.improvements} />
        </div>
    );
};

export default EvaluationDetail;
