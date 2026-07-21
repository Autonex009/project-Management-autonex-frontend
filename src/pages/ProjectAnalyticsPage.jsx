import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../services/api';
import { MetricCard, Card, CardHeader, CardContent } from '../components/ui/Card';
import Spinner from '../components/ui/LoadingSpinner';
import { Clock, Users, Gauge, ChevronLeft, MessageSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

// Categorical palette (validated reference order — identity, fixed, never cycled)
const SERIES = ['#2a78d6', '#1baf7a', '#eda100', '#008300', '#4a3aa7', '#e34948', '#e87ba4', '#eb6834'];
const INK_MUTED = '#898781';
const GRID = '#e1e0d9';

const RANGES = [
    { key: 'week', label: 'Last 7 days' },
    { key: 'month', label: 'This month' },
    { key: 'custom', label: 'Custom' },
];

const iso = (d) => d.toISOString().slice(0, 10);

function computeRange(mode, custom) {
    const today = new Date();
    if (mode === 'week') {
        const from = new Date(today); from.setDate(today.getDate() - 6);
        return { date_from: iso(from), date_to: iso(today) };
    }
    if (mode === 'custom' && custom.from && custom.to) {
        return { date_from: custom.from, date_to: custom.to };
    }
    // month-to-date
    return { date_from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), date_to: iso(today) };
}

const shortDate = (s) => { try { return format(parseISO(s), 'MMM d'); } catch { return s; } };

// Dynamic annotator grouping. Encord bakes a cohort/vendor tag somewhere into
// each email — a fragment of the local part ("kappa" in annotator31_kappa@…,
// "epsilon" in epsilon_annotator6@…) or the domain ("picklerobot" in
// stanley@picklerobot.com). We discover those tags at runtime by tokenizing every
// email; any token shared by MORE THAN 2 annotators becomes its own filter, and
// anything rarer falls into "Other". No vendor list is hardcoded — see buildGroups().
// The only special-cased token is "theta": that's our own team, shown as "Autonex".
const STOP_TOKENS = new Set([
    'annotator', 'encord', 'gmail', 'outlook', 'yahoo', 'hotmail',
    'com', 'net', 'org', 'www', 'mail', 'test', 'user', 'team', 'admin',
]);
const GROUP_MIN = 3;          // token must appear in > 2 distinct annotators
const OURS_TOKEN = 'theta';   // our own team
const GROUP_LABELS = { theta: 'Autonex', picklerobot: 'PickleRobot', agilityrobotics: 'Agility Robotics' };
const groupLabel = (key) => GROUP_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);

// Pull candidate tag tokens from one email: alphabetic fragments of the local part
// (split on digits/dots/underscores) plus the second-level domain, minus generic
// stopwords and anything shorter than 3 chars.
const tokenizeEmail = (email) => {
    const [local = '', domain = ''] = (email || '').toLowerCase().split('@');
    const parts = local.split(/[^a-z]+/);
    const labels = domain.split('.').filter(Boolean);
    if (labels.length >= 2) parts.push(labels[labels.length - 2]); // SLD, e.g. "picklerobot"
    return [...new Set(parts)].filter((t) => t.length >= 3 && !STOP_TOKENS.has(t));
};

// Given the annotator list, returns a groupOf(email) classifier and the tab list.
const buildGroups = (annotators) => {
    const counts = {};
    const emailTokens = {};
    annotators.forEach((a) => {
        const toks = tokenizeEmail(a.user_email);
        emailTokens[a.user_email] = toks;
        toks.forEach((t) => { counts[t] = (counts[t] || 0) + 1; });
    });
    // A token qualifies once it's shared by > 2 annotators — except OURS_TOKEN
    // (Autonex), which always gets its own tab even with a single annotator.
    const qualifying = new Set(Object.keys(counts).filter((t) => counts[t] >= GROUP_MIN || t === OURS_TOKEN));
    // Each annotator joins the most-shared qualifying token it carries (its dominant
    // tag); if it carries none, it's "Other".
    const groupOf = (email) => {
        const toks = (emailTokens[email] || []).filter((t) => qualifying.has(t));
        if (!toks.length) return 'other';
        toks.sort((x, y) => counts[y] - counts[x] || x.localeCompare(y));
        return toks[0];
    };
    const groupCounts = {};
    annotators.forEach((a) => { const g = groupOf(a.user_email); groupCounts[g] = (groupCounts[g] || 0) + 1; });
    const groups = Object.keys(groupCounts)
        .filter((g) => g !== 'other')
        .map((key) => ({ key, label: groupLabel(key), count: groupCounts[key] }))
        // ours first, then largest group first
        .sort((a, b) => (b.key === OURS_TOKEN) - (a.key === OURS_TOKEN) || b.count - a.count || a.key.localeCompare(b.key));
    const tabs = [{ key: 'all', label: 'All', count: annotators.length }, ...groups];
    if (groupCounts.other) tabs.push({ key: 'other', label: 'Other', count: groupCounts.other });
    return { groupOf, tabs };
};

const ProjectAnalyticsPage = () => {
    const { mainProjectId } = useParams();
    const navigate = useNavigate();

    const [rangeMode, setRangeMode] = useState('month');
    const [custom, setCustom] = useState({ from: '', to: '' });
    const [selected, setSelected] = useState(null); // null = default to top 3
    const [orgFilter, setOrgFilter] = useState('all'); // 'all' | org key

    const params = useMemo(() => computeRange(rangeMode, custom), [rangeMode, custom]);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['project-analytics', mainProjectId, params.date_from, params.date_to],
        queryFn: () => analyticsApi.getProjectAnalytics(mainProjectId, params),
        enabled: !!mainProjectId,
    });

    const annotators = data?.annotators || [];
    // default selection: top 3 by hours
    const activeSel = selected ?? annotators.slice(0, 3).map((a) => a.user_email);
    const colorFor = (email) => SERIES[annotators.findIndex((a) => a.user_email === email) % SERIES.length];

    const toggle = (email) => {
        const base = selected ?? annotators.slice(0, 3).map((a) => a.user_email);
        setSelected(base.includes(email) ? base.filter((e) => e !== email) : [...base, email]);
    };

    // Groups + tabs are derived from the data itself (see buildGroups). Recomputed
    // whenever the annotator set changes (range / project switch).
    const { groupOf, tabs: orgTabs } = useMemo(() => buildGroups(annotators), [annotators]);

    // If the active tab vanished after a data change, fall back to "All" without
    // needing an effect to reset state.
    const effectiveFilter = orgTabs.some((t) => t.key === orgFilter) ? orgFilter : 'all';

    const visibleAnnotators = effectiveFilter === 'all'
        ? annotators
        : annotators.filter((a) => groupOf(a.user_email) === effectiveFilter);

    const comparisonData = useMemo(() => {
        if (!data) return [];
        const lookup = {};
        annotators.forEach((a) => { lookup[a.user_email] = Object.fromEntries(a.daily.map((p) => [p.date, p.hours])); });
        return data.daily.map((d) => {
            const row = { date: d.date };
            activeSel.forEach((e) => { row[e] = lookup[e]?.[d.date] ?? 0; });
            return row;
        });
    }, [data, annotators, activeSel]);

    if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" color="indigo" /></div>;
    if (isError || !data) return <div className="p-8 text-center text-slate-500">Could not load analytics.</div>;

    return (
        <div className="space-y-6">
            <div>
                <button onClick={() => navigate('/admin/analytics')} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2">
                    <ChevronLeft className="w-4 h-4" /> Analytics
                </button>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{data.name}</h1>
                        <p className="text-slate-500 text-sm mt-1">{data.client ? `${data.client} · ` : ''}Encord platform activity · {data.range.from} → {data.range.to}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {RANGES.map((r) => (
                            <button
                                key={r.key}
                                onClick={() => setRangeMode(r.key)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${rangeMode === r.key ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>
                {rangeMode === 'custom' && (
                    <div className="flex items-center gap-2 mt-3">
                        <input type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className="input" />
                        <span className="text-slate-400">→</span>
                        <input type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className="input" />
                    </div>
                )}
            </div>

            {/* KPI tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MetricCard title="Platform Hours" value={`${data.month.platform_hours}h`} subtitle="selected range" icon={Clock} />
                <MetricCard title="Avg Hours / Annotator" value={`${data.month.avg_hours_per_annotator}h`} icon={Gauge} />
                <MetricCard title="Peak Active Annotators / day" value={data.month.active_annotators_peak} subtitle=">1h platform time" icon={Users} />
            </div>

            {/* Overview: single series (blue), no legend — title names it */}
            <Card>
                <CardHeader title="Platform hours per day" subtitle="Total active editor time across the project" />
                <CardContent>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.daily} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
                                <CartesianGrid stroke={GRID} vertical={false} />
                                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: INK_MUTED, fontSize: 12 }} axisLine={{ stroke: GRID }} tickLine={false} minTickGap={24} />
                                <YAxis tick={{ fill: INK_MUTED, fontSize: 12 }} axisLine={false} tickLine={false} width={40} unit="h" />
                                <Tooltip labelFormatter={shortDate} formatter={(v) => [`${v}h`, 'Platform hours']} />
                                <Line type="monotone" dataKey="platform_hours" name="Platform hours" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Annotator comparison: multi-series with legend */}
            <Card>
                <CardHeader title="Annotator comparison" subtitle="Daily platform hours per annotator — select who to compare" />
                <CardContent>
                    {annotators.length === 0 ? (
                        <p className="py-8 text-center text-sm text-slate-400">No annotator activity in this range.</p>
                    ) : (
                        <>
                            {/* Org filter — narrows the annotator list by vendor (theta = Autonex) */}
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                {orgTabs.map((t) => (
                                    <button
                                        key={t.key}
                                        onClick={() => setOrgFilter(t.key)}
                                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${effectiveFilter === t.key ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        {t.label}
                                        <span className={`ml-1.5 ${effectiveFilter === t.key ? 'text-indigo-100' : 'text-slate-400'}`}>{t.count}</span>
                                    </button>
                                ))}
                            </div>
                            {visibleAnnotators.length === 0 ? (
                                <p className="py-4 text-sm text-slate-400">No annotators in this group.</p>
                            ) : (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {visibleAnnotators.map((a) => {
                                    const on = activeSel.includes(a.user_email);
                                    return (
                                        <button
                                            key={a.user_email}
                                            onClick={() => toggle(a.user_email)}
                                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${on ? 'border-transparent text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                                            style={on ? { backgroundColor: colorFor(a.user_email) } : undefined}
                                        >
                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colorFor(a.user_email) }} />
                                            {a.employee_name || a.user_email} · {a.total_hours}h
                                        </button>
                                    );
                                })}
                            </div>
                            )}
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={comparisonData} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
                                        <CartesianGrid stroke={GRID} vertical={false} />
                                        <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: INK_MUTED, fontSize: 12 }} axisLine={{ stroke: GRID }} tickLine={false} minTickGap={24} />
                                        <YAxis tick={{ fill: INK_MUTED, fontSize: 12 }} axisLine={false} tickLine={false} width={40} unit="h" />
                                        <Tooltip labelFormatter={shortDate} formatter={(v, n) => [`${v}h`, n]} />
                                        {activeSel.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
                                        {activeSel.map((email) => (
                                            <Line key={email} type="monotone" dataKey={email} name={annotators.find(a => a.user_email === email)?.employee_name || email} stroke={colorFor(email)} strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Sentiment (read-only for admin; PM edits on Organizations) */}
            <Card>
                <CardHeader title="Project Sentiment" subtitle="Maintained by the project's PM" />
                <CardContent>
                    <div className="flex items-start gap-3">
                        <MessageSquare className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {data.sentiment || <span className="text-slate-400">No sentiment set yet.</span>}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ProjectAnalyticsPage;
