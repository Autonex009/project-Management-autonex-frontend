import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { allocationApi, subProjectApi, leaveApi, authApi } from '../../services/api';
import { FolderKanban, Clock, Calendar, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getLeaveTypeLabel } from '../../utils/leaveTypes';

const EmployeeDashboard = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const employeeId = user.employee_id;

    // Fetch allocated projects for this employee
    const { data: allocations = [], isLoading: allocLoading } = useQuery({
        queryKey: ['my-allocations', employeeId],
        queryFn: () => allocationApi.getByEmployee(employeeId),
        enabled: !!employeeId,
    });

    // Fetch all daily sheets to get project names
    const { data: projects = [] } = useQuery({
        queryKey: ['sub-projects'],
        queryFn: subProjectApi.getAll,
    });

    const { startStr, endStr } = useMemo(() => {
        const today = new Date();
        const y = today.getFullYear();
        const m = today.getMonth();
        const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
        const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`;
        return { startStr: start, endStr: end };
    }, []);

    // Fetch leaves for this employee for the current month
    const { data: myLeaves = [] } = useQuery({
        queryKey: ['my-leaves', employeeId, startStr, endStr],
        queryFn: () => leaveApi.getAll({ employee_id: employeeId, start_date: startStr, end_date: endStr }),
        enabled: !!employeeId,
    });
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    // Map allocations to project data
    const myProjects = allocations.map(alloc => {
        const project = projects.find(p => p.id === alloc.sub_project_id);
        return { ...alloc, project };
    }).filter(a => a.project);

    const activeProjects = myProjects.filter(p => p.project?.project_status === 'active');
    const totalHours = activeProjects.reduce((sum, p) => sum + (p.total_daily_hours || 0), 0);

    const currentLeave = myLeaves.find(l => {
        if (!l.start_date || !l.end_date || l.status === 'rejected') return false;
        return l.start_date <= todayStr && l.end_date >= todayStr;
    });

    const upcomingLeaves = myLeaves.filter(l => {
        if (!l.start_date || l.status === 'rejected') return false;
        return l.start_date > todayStr;
    });

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <div>
                <h1 className="text-lg font-semibold text-slate-900">
                    Welcome back, <span className="text-emerald-600">{user.name?.split(' ')[0] || 'there'}</span> 👋
                </h1>
                <p className="text-slate-500 text-sm mt-1">Here&apos;s your work overview for today.</p>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <KpiCard icon={FolderKanban} label="Active Projects" value={activeProjects.length} color="indigo" />
                <KpiCard icon={Clock} label="Daily Hours" value={`${totalHours}h`} color="blue" />
                <KpiCard icon={Calendar} label="Upcoming Leaves" value={upcomingLeaves.length} color="amber" />
                <KpiCard
                    icon={currentLeave ? AlertCircle : CheckCircle2}
                    label="Status"
                    value={currentLeave ? 'On Leave' : 'Active'}
                    color={currentLeave ? 'red' : 'emerald'}
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* My Projects (8 cols) */}
                <div className="xl:col-span-8">
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm">
                        <div className="flex items-center justify-between p-5 pb-3">
                            <div>
                                <h3 className="font-semibold text-slate-800">Allocated Projects</h3>
                                <p className="text-sm text-slate-400 mt-0.5">Daily sheets you&apos;re assigned to</p>
                            </div>
                            <span className="px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-600 rounded-full">{activeProjects.length}</span>
                        </div>

                        {allocLoading ? (
                            <div className="p-8 text-center text-slate-400 animate-pulse">Loading projects...</div>
                        ) : activeProjects.length === 0 ? (
                            <div className="p-8 text-center">
                                <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">No active allocations</p>
                                <p className="text-sm text-slate-400 mt-1">Contact your PM for project assignments.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {activeProjects.map(({ project, ...alloc }) => (
                                    <div key={alloc.id} className="px-5 py-4 hover:bg-slate-50/50 transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h4 className="font-medium text-slate-800">{project.name}</h4>
                                                <p className="text-xs text-slate-400 mt-0.5">{project.client} • {project.project_type}</p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    {(alloc.role_tags || []).map(tag => (
                                                        <span key={tag} className="px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-600 rounded-full">{tag}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-lg font-bold text-slate-800">{alloc.total_daily_hours || 8}h</span>
                                                <p className="text-xs text-slate-400">/day</p>
                                            </div>
                                        </div>
                                        {/* Timeline bar */}
                                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                                            <span>{alloc.active_start_date ? format(parseISO(alloc.active_start_date), 'MMM dd') : '—'}</span>
                                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${getProgress(alloc.active_start_date, alloc.active_end_date)}%` }} />
                                            </div>
                                            <span>{alloc.active_end_date ? format(parseISO(alloc.active_end_date), 'MMM dd') : '—'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar (4 cols) */}
                <div className="xl:col-span-4 space-y-6">
                    {/* Leave Summary */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
                        <h3 className="font-semibold text-slate-800 mb-4">Leave Status</h3>
                        {currentLeave ? (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl mb-3">
                                <p className="text-sm font-medium text-red-700">Currently on leave</p>
                                <p className="text-xs text-red-500 mt-0.5">
                                    {format(parseISO(currentLeave.start_date), 'MMM dd')} — {format(parseISO(currentLeave.end_date), 'MMM dd')}
                                </p>
                            </div>
                        ) : (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-3">
                                <p className="text-sm font-medium text-emerald-700">Active & working</p>
                            </div>
                        )}

                        {upcomingLeaves.length > 0 && (
                            <div className="space-y-2 mt-3">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Upcoming</p>
                                {upcomingLeaves.map(l => (
                                    <div key={l.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                                        <span className="text-sm text-slate-600">{getLeaveTypeLabel(l.leave_type)}</span>
                                        <span className="text-xs text-slate-400 font-mono">
                                            {format(parseISO(l.start_date), 'MMM dd')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Time Distribution */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
                        <h3 className="font-semibold text-slate-800 mb-4">Time Distribution</h3>
                        <div className="space-y-3">
                            {activeProjects.length > 0 ? activeProjects.map(({ project, ...alloc }) => {
                                const pct = totalHours > 0 ? Math.round((alloc.total_daily_hours / totalHours) * 100) : 0;
                                return (
                                    <div key={alloc.id}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-slate-600 truncate max-w-[70%]">{project.name}</span>
                                            <span className="text-slate-400 font-mono text-xs">{pct}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            }) : (
                                <p className="text-sm text-slate-400">No active allocations</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper: Calculate progress percentage
function getProgress(start, end) {
    if (!start || !end) return 0;
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const now = Date.now();
    if (now >= e) return 100;
    if (now <= s) return 0;
    return Math.round(((now - s) / (e - s)) * 100);
}

// KPI Card component
const KpiCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
            </div>
            <div className={`p-2.5 rounded-xl bg-${color}-50`}>
                <Icon className={`w-5 h-5 text-${color}-600`} />
            </div>
        </div>
    </div>
);

export default EmployeeDashboard;
