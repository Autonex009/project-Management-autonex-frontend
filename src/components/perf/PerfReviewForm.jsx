import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { PERF_CRITERIA, PERF_CRITERIA_KEYS, RATING_SCALE, computeAverage, currentPeriod } from './perfCriteria';

const StarRow = ({ value, onChange }) => (
    <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
            <button
                key={star}
                type="button"
                title={RATING_SCALE[star]}
                onClick={() => onChange(star === value ? null : star)}
                className={`text-2xl leading-none transition-transform hover:scale-110 ${star <= (value || 0) ? 'text-amber-400' : 'text-slate-200'}`}
            >
                ★
            </button>
        ))}
        <span className="ml-2 text-xs font-medium text-slate-400">{value ? RATING_SCALE[value].split(' – ')[0] : 'Not rated'}</span>
    </div>
);

const EMPTY = () => ({ criteria: {}, comment: '', period: currentPeriod() });

const PerfReviewForm = ({ initial, onSubmit, onCancel, loading }) => {
    const [form, setForm] = useState(() =>
        initial
            ? { criteria: { ...initial.criteria_ratings }, comment: initial.comment || '', period: initial.period || currentPeriod() }
            : EMPTY(),
    );

    const setCriterion = (key, val) => setForm((p) => ({ ...p, criteria: { ...p.criteria, [key]: val } }));
    const average = computeAverage(form.criteria);

    const handleSubmit = (e) => {
        e.preventDefault();
        const missing = PERF_CRITERIA_KEYS.filter((k) => !form.criteria[k]);
        if (missing.length > 0) {
            toast.error('Please rate all 5 criteria');
            return;
        }
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(form.period)) {
            toast.error('Please choose a valid month');
            return;
        }
        onSubmit({
            criteria_ratings: PERF_CRITERIA_KEYS.reduce((acc, k) => ({ ...acc, [k]: Number(form.criteria[k]) }), {}),
            comment: form.comment.trim() || null,
            period: form.period,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Review Month</label>
                    <input
                        type="month"
                        value={form.period}
                        onChange={(e) => setForm((p) => ({ ...p, period: e.target.value }))}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        required
                    />
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-2 text-right">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Average</p>
                    <p className="text-lg font-bold text-amber-500">{average != null ? average.toFixed(2) : '—'}<span className="text-sm text-slate-300"> / 5</span></p>
                </div>
            </div>

            <div className="space-y-3">
                {PERF_CRITERIA.map((c) => (
                    <div key={c.key} className="rounded-2xl border border-slate-100 bg-white p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800">{c.label}</p>
                                <p className="mt-0.5 text-xs text-slate-400">{c.description}</p>
                            </div>
                            <StarRow value={form.criteria[c.key] || null} onChange={(v) => setCriterion(c.key, v)} />
                        </div>
                    </div>
                ))}
            </div>

            <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Overall Comment (optional)</label>
                <textarea
                    value={form.comment}
                    onChange={(e) => setForm((p) => ({ ...p, comment: e.target.value }))}
                    rows={3}
                    placeholder="Add any overall remarks…"
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
            </div>

            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
                    <X className="h-3.5 w-3.5" /> Cancel
                </button>
                <button type="submit" disabled={loading} className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
                    <Check className="h-3.5 w-3.5" /> {loading ? 'Saving…' : 'Save Review'}
                </button>
            </div>
        </form>
    );
};

export default PerfReviewForm;
