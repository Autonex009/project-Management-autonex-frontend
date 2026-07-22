import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { analyticsApi } from '../services/api';
import { MetricCard } from '../components/ui/Card';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import { FolderKanban, Clock, Users, RefreshCw, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

const sentimentStyle = (s) => {
    const v = (s || '').toLowerCase();
    if (/(green|positive|good|on track)/.test(v)) return 'bg-emerald-50 text-emerald-700';
    if (/(red|risk|at-risk|bad|blocked|critical)/.test(v)) return 'bg-red-50 text-red-700';
    if (/(amber|yellow|neutral|watch)/.test(v)) return 'bg-amber-50 text-amber-700';
    return 'bg-slate-100 text-slate-600';
};

const AnalyticsDashboard = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: rows = [], isLoading } = useQuery({
        queryKey: ['analytics-summary'],
        queryFn: analyticsApi.getSummary,
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Project Analytics</h1>
                    <p className="text-slate-500 text-sm mt-1">Encord platform activity across all mapped projects (this month).</p>
                </div>
                <Button variant="secondary" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                    <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                    {syncMutation.isPending ? 'Syncing…' : 'Sync now'}
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MetricCard title="Live Projects" value={totals.live} icon={FolderKanban} loading={isLoading} />
                <MetricCard title="Platform Hours (this month)" value={Math.round(totals.hours)} icon={Clock} loading={isLoading} />
                <MetricCard title="Active Annotators" value={totals.annotators} icon={Users} loading={isLoading} />
            </div>

            <Table
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
