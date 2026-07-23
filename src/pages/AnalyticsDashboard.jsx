import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { analyticsApi } from '../services/api';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import { FolderKanban, Clock, Users, RefreshCw, BarChart3, Timer, ClipboardCheck } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

const AUTONEX_RANGES = [
    { key: '1', label: 'Last day' },
    { key: '7', label: 'Last 7 days' },
    { key: '30', label: 'Last 30 days' },
];

const shortDate = (s) => { try { return format(parseISO(s), 'MMM d'); } catch { return s; } };

const AutonexKpiCard = ({ icon: Icon, label, value, tone = 'indigo' }) => {
    const tones = { indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500', sky: 'bg-sky-500', violet: 'bg-violet-500', rose: 'bg-rose-500' };
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-white ${tones[tone]}`}>
                {Icon && <Icon className="h-[18px] w-[18px]" />}
            </div>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
    );
};

const sentimentStyle = (s) => {
    const v = (s || '').toLowerCase();
    if (/(green|positive|good|on track)/.test(v)) return 'bg-emerald-50 text-emerald-700';
    if (/(red|risk|at-risk|bad|blocked|critical|poor)/.test(v)) return 'bg-red-50 text-red-700';
    if (/(amber|yellow|neutral|watch|avg|average)/.test(v)) return 'bg-amber-50 text-amber-700';
    return 'bg-slate-100 text-slate-600';
};

const AnalyticsDashboard = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: rows = [], isLoading } = useQuery({
        queryKey: ['analytics-summary'],
        queryFn: analyticsApi.getSummary,
        refetchInterval: 10 * 60 * 1000,   // auto-refresh every 10 min
        refetchOnWindowFocus: true,
    });

    const syncMutation = useMutation({
        // Manual sync backfills the current month so freshly-mapped projects populate
        // immediately (the daily scheduled job only pulls the previous day).
        mutationFn: () => {
            const now = new Date();
            const date_from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
            const date_to = now.toISOString().slice(0, 10);
            return analyticsApi.runSync({ date_from, date_to });
        },
        onSuccess: (res) => {
            toast.success(`Encord sync: ${res.inserted + res.updated} rows from ${res.projects} project(s)`);
            queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
        },
        onError: (e) => toast.error(e?.response?.data?.detail || 'Sync failed'),
    });

    const totals = useMemo(() => ({
        live: rows.filter((r) => r.status === 'active').length,
        hours: rows.reduce((a, r) => a + (r.month_platform_hours || 0), 0),
        annotators: rows.reduce((a, r) => a + (r.active_annotators || 0), 0),
    }), [rows]);

    // Autonex-only KPIs across all mapped projects, with its own range filter.
    const [autonexRange, setAutonexRange] = useState('7');
    const { data: autonex } = useQuery({
        queryKey: ['autonex-kpis', autonexRange],
        queryFn: () => analyticsApi.getAutonexKpis(autonexRange),
        refetchInterval: 10 * 60 * 1000,
    });
    const k = autonex?.kpis;

    // Autonex total hours this month (for the top summary row).
    const { data: autonexOverview } = useQuery({
        queryKey: ['autonex-overview'],
        queryFn: analyticsApi.getAutonexOverview,
        refetchInterval: 10 * 60 * 1000,
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-lg font-semibold text-slate-900">Project Analytics</h1>
                    <p className="text-slate-500 text-[13px] mt-0.5">Encord platform activity across all mapped projects (this month).</p>
                </div>
                <Button variant="secondary" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                    <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                    {syncMutation.isPending ? 'Syncing…' : 'Sync now'}
                </Button>
            </div>

            {/* Overview KPIs (this month) */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <AutonexKpiCard icon={FolderKanban} label="Live Projects" value={totals.live} tone="indigo" />
                <AutonexKpiCard icon={Clock} label="Platform Hours (month)" value={`${Math.round(totals.hours)}h`} tone="emerald" />
                <AutonexKpiCard icon={Users} label="Active Annotators" value={totals.annotators} tone="sky" />
                <AutonexKpiCard icon={Timer} label="Autonex Hours (month)" value={`${autonexOverview?.autonex_total_hours ?? 0}h`} tone="violet" />
            </div>

            {/* Autonex-employee KPIs (range-filtered) — same card style, no boxed section */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-800">Autonex Employees</h2>
                    <p className="text-xs text-slate-500">Metrics for Autonex team members only, across all projects</p>
                </div>
                <div className="flex items-center gap-2">
                    {AUTONEX_RANGES.map((r) => (
                        <button
                            key={r.key}
                            onClick={() => setAutonexRange(r.key)}
                            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${autonexRange === r.key ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <AutonexKpiCard icon={Clock} label="Time Spent" value={`${k?.total_hours ?? 0}h`} tone="emerald" />
                <AutonexKpiCard icon={Timer} label="Annotation Time" value={`${k?.annotation_hours ?? 0}h`} tone="sky" />
                <AutonexKpiCard icon={ClipboardCheck} label="Review Time" value={`${k?.review_hours ?? 0}h`} tone="rose" />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-2 text-sm font-semibold text-slate-700">Daily platform hours (Autonex)</p>
                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={autonex?.daily || []} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
                            <CartesianGrid stroke="#e1e0d9" vertical={false} />
                            <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: '#898781', fontSize: 12 }} axisLine={{ stroke: '#e1e0d9' }} tickLine={false} minTickGap={24} />
                            <YAxis tick={{ fill: '#898781', fontSize: 12 }} axisLine={false} tickLine={false} width={40} unit="h" />
                            <Tooltip labelFormatter={shortDate} formatter={(v) => [`${v}h`, 'Hours']} />
                            <Bar dataKey="hours" name="Hours" fill="#2a78d6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <Table
                variant="untitled"
                loading={isLoading}
                onRowClick={(row) => navigate(`/admin/analytics/${row.project_id}`)}
                columns={[
                    {
                        key: 'name',
                        label: 'Project',
                        render: (value, row) => (
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${row.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                <div>
                                    <div className="font-medium text-slate-800">{value}</div>
                                    {row.client && <div className="text-xs text-slate-400">{row.client}</div>}
                                </div>
                            </div>
                        ),
                    },
                    { key: 'month_platform_hours', label: 'Platform Hours', align: 'center', render: (v) => <span className="font-mono text-slate-700">{v ?? 0}h</span> },
                    { key: 'active_annotators', label: 'Active Annotators', align: 'center', render: (v) => <span className="text-slate-700">{v ?? 0}</span> },
                    { key: 'people_involved', label: 'People Involved', align: 'center', render: (v) => <span className="text-slate-700">{v ?? 0}</span> },
                    {
                        key: 'sentiment',
                        label: 'Sentiment',
                        render: (v) => v
                            ? <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${sentimentStyle(v)}`}>{v.length > 40 ? v.slice(0, 40) + '…' : v}</span>
                            : <span className="text-slate-300">—</span>,
                    },
                ]}
                data={rows}
                emptyState={{
                    title: 'No Encord-mapped projects yet',
                    description: 'Set an Encord Project ID on a project (Projects → Edit Project), then run a sync.',
                    icon: BarChart3,
                }}
            />
        </div>
    );
};

export default AnalyticsDashboard;
