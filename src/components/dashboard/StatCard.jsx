import React from 'react';

// Modern KPI card with a colored icon tile, an optional pill, a mini bar strip,
// and an optional hover breakdown (e.g. Full-time / Intern / Contract).
const TONES = {
    emerald: { tile: 'bg-emerald-500', bar: 'bg-emerald-400/70', barLast: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-600', ring: 'hover:border-emerald-200' },
    violet: { tile: 'bg-violet-500', bar: 'bg-violet-400/70', barLast: 'bg-violet-500', pill: 'bg-violet-50 text-violet-600', ring: 'hover:border-violet-200' },
    amber: { tile: 'bg-amber-500', bar: 'bg-amber-400/70', barLast: 'bg-amber-500', pill: 'bg-amber-50 text-amber-600', ring: 'hover:border-amber-200' },
    sky: { tile: 'bg-sky-500', bar: 'bg-sky-400/70', barLast: 'bg-sky-500', pill: 'bg-sky-50 text-sky-600', ring: 'hover:border-sky-200' },
    rose: { tile: 'bg-rose-500', bar: 'bg-rose-400/70', barLast: 'bg-rose-500', pill: 'bg-rose-50 text-rose-600', ring: 'hover:border-rose-200' },
    indigo: { tile: 'bg-indigo-500', bar: 'bg-indigo-400/70', barLast: 'bg-indigo-500', pill: 'bg-indigo-50 text-indigo-600', ring: 'hover:border-indigo-200' },
};

const MiniBars = ({ tone }) => {
    const t = TONES[tone] || TONES.indigo;
    const heights = ['h-2', 'h-3', 'h-1.5', 'h-3.5', 'h-4'];
    return (
        <div className="mt-2.5 flex items-end gap-1">
            {heights.map((h, i) => (
                <span key={i} className={`w-3.5 rounded-sm ${h} ${i === heights.length - 1 ? t.barLast : t.bar}`} />
            ))}
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon, tone = 'indigo', pill, breakdown, onClick }) => {
    const t = TONES[tone] || TONES.indigo;
    return (
        <div
            onClick={onClick}
            className={`group relative rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${t.ring} ${onClick ? 'cursor-pointer' : ''}`}
        >
            <div className="flex items-start justify-between">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-sm ${t.tile}`}>
                    {Icon && <Icon className="h-[18px] w-[18px]" />}
                </div>
                {pill && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.pill}`}>{pill}</span>
                )}
            </div>

            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</p>
            <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">{value}</p>

            <MiniBars tone={tone} />

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
