import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { allocationApi, subProjectApi, leaveApi, employeeApi } from '../../services/api';
import { FolderKanban, Users, Calendar, CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { format, parseISO, isWithinInterval, isFuture } from 'date-fns';
import { parentProjectApi } from '../../services/api';
import { getPmEmployeeId, getPmSubProjects } from '../../utils/pmScope';

const PMDashboard = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const pmEmployeeId = getPmEmployeeId(user);

    // Fetch all data
    const { data: projects = [], isLoading: projLoading } = useQuery({
        queryKey: ['sub-projects'],
        queryFn: subProjectApi.getAll,
    });
    const { data: parentProjects = [] } = useQuery({
        queryKey: ['parent-projects'],
        queryFn: parentProjectApi.getAll,
    });
    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: employeeApi.getAll,
    });
    const { data: allocations = [] } = useQuery({
        queryKey: ['allocations'],
        queryFn: allocationApi.getAll,
    });
    const { startStr, endStr } = useMemo(() => {
        const today = new Date();
        const y = today.getFullYear();
        const m = today.getMonth();
        const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
        const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`;
        return { startStr: start, endStr: end };
    }, []);

    const { data: allLeaves = [] } = useQuery({
        queryKey: ['leaves', startStr, endStr],
        queryFn: () => leaveApi.getAll({ start_date: startStr, end_date: endStr }),
    });

    const today = new Date();

    // Projects managed by this PM (by assigned_employee_ids or all if PM)
    const scopedProjects = getPmSubProjects(projects, parentProjects, pmEmployeeId, allocations);
    const activeProjects = scopedProjects.filter(p => p.project_status === 'active');
    const completedProjects = scopedProjects.filter(p => p.project_status === 'completed');

    // Team members = employees who are allocated to any project
    const allocatedEmployeeIds = [...new Set(
        allocations
            .filter(a => scopedProjects.some(project => project.id === a.sub_project_id))
            .map(a => a.employee_id)
    )];
    const teamMembers = employees.filter(e => allocatedEmployeeIds.includes(e.id));

    // Leaves
    const pendingLeaves = allLeaves.filter(l => {
        try { return isFuture(parseISO(l.start_date)); } catch { return false; }
    }).filter(l => allocatedEmployeeIds.includes(l.employee_id));
    const currentLeaves = allLeaves.filter(l => {
        try {
            return isWithinInterval(today, { start: parseISO(l.start_date), end: parseISO(l.end_date) });
        } catch { return false; }
    }).filter(l => allocatedEmployeeIds.includes(l.employee_id));

    // At-risk projects (under-staffed)
    const atRiskProjects = activeProjects.filter(p => {
        const projAllocs = allocations.filter(a => a.sub_project_id === p.id);
        return p.required_manpower && projAllocs.length < p.required_manpower;
    });

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">
                    PM Dashboard — <span className="text-blue-600">{user.name?.split(' ')[0] || 'Manager'}</span>
                </h1>
                <p className="text-slate-500 text-sm mt-1">Project oversight & team management</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <KpiCard icon={FolderKanban} label="Active Projects" value={activeProjects.length} color="blue" sub={`${completedProjects.length} completed`} />
                <KpiCard icon={Users} label="Team Members" value={teamMembers.length} color="indigo" sub={`${currentLeaves.length} on leave`} />
                <KpiCard icon={AlertTriangle} label="At Risk" value={atRiskProjects.length} color="red" sub="Under-staffed" />
                <KpiCard icon={Calendar} label="Upcoming Leaves" value={pendingLeaves.length} color="amber" sub="Need attention" />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Projects Table (8 cols) */}
                <div className="xl:col-span-8">
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm">
                        <div className="flex items-center justify-between p-5 pb-3">
                            <div>
                                <h3 className="font-semibold text-slate-800">Project Overview</h3>
                                <p className="text-sm text-slate-400 mt-0.5">All daily sheets and their staffing</p>
                            </div>
                        </div>

                        {projLoading ? (
                            <div className="p-8 text-center text-slate-400 animate-pulse">Loading...</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Project</th>
                                            <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Staff</th>
                                            <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                                            <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Deadline</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {activeProjects.slice(0, 8).map(project => {
                                            const projAllocs = allocations.filter(a => a.sub_project_id === project.id);
                                            const isUnderStaffed = project.required_manpower && projAllocs.length < project.required_manpower;
                                            return (
                                                <tr key={project.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-5 py-3.5">
                                                        <div className="font-medium text-slate-800">{project.name}</div>
                                                        <div className="text-xs text-slate-400">{project.client}</div>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <span className={`text-sm font-semibold ${isUnderStaffed ? 'text-red-600' : 'text-slate-700'}`}>
                                                            {projAllocs.length}/{project.required_manpower || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${isUnderStaffed
                                                                ? 'bg-red-50 text-red-700 border-red-200'
                                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${isUnderStaffed ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                                            {isUnderStaffed ? 'Under-staffed' : 'On Track'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right text-sm text-slate-500 font-mono">
                                                        {project.end_date ? format(parseISO(project.end_date), 'MMM dd') : '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar (4 cols) */}
                <div className="xl:col-span-4 space-y-6">
                    {/* Team On Leave */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
                        <h3 className="font-semibold text-slate-800 mb-4">Team On Leave</h3>
                        {currentLeaves.length === 0 ? (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                                <p className="text-sm font-medium text-emerald-700">No one on leave today</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {currentLeaves.map(l => {
                                    const emp = employees.find(e => e.id === l.employee_id);
                                    return (
                                        <div key={l.id} className="flex items-center justify-between p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
                                            <div>
                                                <p className="text-sm font-medium text-slate-700">{emp?.name || `Employee #${l.employee_id}`}</p>
                                                <p className="text-xs text-slate-400 capitalize">{l.leave_type}</p>
                                            </div>
                                            <span className="text-xs text-amber-600 font-mono">
                                                till {format(parseISO(l.end_date), 'MMM dd')}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Upcoming Leaves */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
                        <h3 className="font-semibold text-slate-800 mb-4">Upcoming Leaves</h3>
                        {pendingLeaves.length === 0 ? (
                            <p className="text-sm text-slate-400">No upcoming leave requests.</p>
                        ) : (
                            <div className="space-y-2">
                                {pendingLeaves.slice(0, 5).map(l => {
                                    const emp = employees.find(e => e.id === l.employee_id);
                                    return (
                                        <div key={l.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                                            <div>
                                                <p className="text-sm font-medium text-slate-700">{emp?.name || `Employee #${l.employee_id}`}</p>
                                                <p className="text-xs text-slate-400 capitalize">{l.leave_type}</p>
                                            </div>
                                            <span className="text-xs text-slate-400 font-mono">
                                                {format(parseISO(l.start_date), 'MMM dd')}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const KpiCard = ({ icon: Icon, label, value, color, sub }) => (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
                {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
            </div>
            <div className={`p-2.5 rounded-xl bg-${color}-50`}>
                <Icon className={`w-5 h-5 text-${color}-600`} />
            </div>
        </div>
    </div>
);

export default PMDashboard;
