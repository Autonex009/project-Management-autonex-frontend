import React from 'react';

// Clean metric KPI card (reference design): a small icon tile + title on top,
// a big tabular number (with optional unit), and a delta / hint line below
// e.g. "+5% vs last month".
const ICON_TONES = {
    slate: 'bg-slate-100 text-slate-700',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    violet: 'bg-violet-50 text-violet-600',
    sky: 'bg-sky-50 text-sky-600',
    amber: 'bg-amber-50 text-amber-600',
    indigo: 'bg-indigo-50 text-indigo-600',
};

const StatCard = ({ title, value, unit, icon: Icon, tone = 'slate', delta, hint, breakdown, onClick }) => {
    const iconTone = ICON_TONES[tone] || ICON_TONES.slate;
    return (
        <div
            onClick={onClick}
            className={`group relative rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors hover:border-slate-300 ${onClick ? 'cursor-pointer' : ''}`}
        >
            <div className="flex items-center gap-2.5">
                {Icon && (
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconTone}`}>
                        <Icon className="h-[18px] w-[18px]" />
                    </span>
                )}
                <span className="truncate text-[13px] font-medium text-slate-600">{title}</span>
            </div>

            <div className="mt-3 flex items-baseline gap-1">
                <span className="text-[26px] font-bold leading-none tracking-tight text-slate-900 tabular-nums">{value}</span>
                {unit && <span className="text-sm font-medium text-slate-400">{unit}</span>}
            </div>

            {(delta || hint) && (
                <div className="mt-2 flex items-center gap-1.5 text-xs">
                    {delta && (
                        <span className={`font-semibold tabular-nums ${delta.positive ? 'text-emerald-600' : 'text-red-500'}`}>
                            {delta.positive ? '+' : ''}{delta.value}
                        </span>
                    )}
                    {hint && <span className="text-slate-400">{hint}</span>}
                </div>
            )}

            {breakdown && breakdown.length > 0 && (
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-52 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 opacity-0 shadow-xl ring-1 ring-slate-900/5 transition-opacity duration-150 group-hover:opacity-100">
                    <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-slate-200 bg-white" />
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title} breakdown</p>
                    <div className="space-y-1.5">
                        {breakdown.map((row) => (
                            <div key={row.label} className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">{row.label}</span>
                                <span className="font-semibold text-slate-800">{row.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatCard;
