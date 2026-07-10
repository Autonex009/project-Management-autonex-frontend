import React from 'react';

const LABELS = {
    1: 'Poor',
    2: 'Needs Improvement',
    3: 'Meets Expectations',
    4: 'Exceeds Expectations',
    5: 'Outstanding',
};

// Reusable 1–5 star rating. readOnly renders static stars.
const StarRating = ({ value, onChange, readOnly = false, showLabel = true, size = 'text-2xl' }) => (
    <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
            <button
                key={star}
                type="button"
                disabled={readOnly}
                title={LABELS[star]}
                onClick={() => !readOnly && onChange && onChange(star === value ? null : star)}
                className={`${size} leading-none transition-transform ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} ${star <= (value || 0) ? 'text-amber-400' : 'text-slate-200'}`}
            >
                ★
            </button>
        ))}
        {showLabel && (
            <span className="ml-2 text-xs font-medium text-slate-400">{value ? LABELS[value] : 'Not rated'}</span>
        )}
    </div>
);

export const RATING_LABELS = LABELS;

// Fixed reflection fields rendered separately — cannot be used as custom params.
export const RESERVED_PARAM_NAMES = [
    'overall contributions in last month',
    'areas that are your strengths',
    'areas to improve',
];

export const isReservedParam = (name) =>
    RESERVED_PARAM_NAMES.includes((name || '').trim().toLowerCase());

// Drop reserved names + de-duplicate (case-insensitive), preserving order.
export const cleanParamNames = (names = []) => {
    const seen = new Set();
    const out = [];
    for (const raw of names) {
        const name = (raw || '').trim();
        const key = name.toLowerCase();
        if (!name || isReservedParam(name) || seen.has(key)) continue;
        seen.add(key);
        out.push(name);
    }
    return out;
};

export const currentPeriod = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const formatPeriod = (period) => {
    if (!period) return '';
    const [y, m] = period.split('-').map(Number);
    if (!y || !m) return period;
    return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

export default StarRating;
