import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { allocationApi, subProjectApi, leaveApi, employeeApi } from '../../services/api';
import { FolderKanban, Users, Calendar, CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { format, parseISO, isWithinInterval, isFuture } from 'date-fns';
import { parentProjectApi } from '../../services/api';
import { getPmEmployeeId, getPmSubProjects } from '../../utils/pmScope';
import Table from '../../components/ui/Table';
import StatCard from '../../components/dashboard/StatCard';

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
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h1 className="text-lg font-semibold text-slate-900">
                    PM Dashboard — <span className="text-blue-600">{user.name?.split(' ')[0] || 'Manager'}</span>
                </h1>
                <p className="text-slate-500 text-[13px] mt-0.5">Project oversight & team management</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={FolderKanban} title="Active Projects" value={activeProjects.length} tone="emerald" hint={`${completedProjects.length} completed`} />
                <StatCard icon={Users} title="Team Members" value={teamMembers.length} tone="violet" hint={`${currentLeaves.length} on leave`} />
                <StatCard icon={AlertTriangle} title="At Risk" value={atRiskProjects.length} tone="rose" hint="under-staffed" />
                <StatCard icon={Calendar} title="Upcoming Leaves" value={pendingLeaves.length} tone="amber" hint="need attention" />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                {/* Projects Table (8 cols) */}
                <div className="xl:col-span-8">
                    <Table
                            variant="v1"
                            title="Project Overview"
                            count={`${activeProjects.length} active`}
                            loading={projLoading}
                            columns={[
                                {
                                    key: 'name',
                                    label: 'Project',
                                    render: (value, project) => (
                                        <div>
                                            <div className="font-medium text-slate-800">{value}</div>
                                            <div className="text-xs text-slate-400">{project.client}</div>
                                        </div>
                                    ),
                                },
                                {
                                    key: 'id',
                                    label: 'Staff',
                                    align: 'center',
                                    render: (id, project) => {
                                        const projAllocs = allocations.filter(a => a.sub_project_id === id);
                                        const isUnder = project.required_manpower && projAllocs.length < project.required_manpower;
                                        return (
                                            <span className={`text-sm font-semibold ${isUnder ? 'text-red-600' : 'text-slate-700'}`}>
                                                {projAllocs.length}/{project.required_manpower || '—'}
                                            </span>
                                        );
                                    },
                                },
                                {
                                    key: '_status',
                                    label: 'Status',
                                    align: 'center',
                                    render: (_, project) => {
                                        const projAllocs = allocations.filter(a => a.sub_project_id === project.id);
                                        const isUnder = project.required_manpower && projAllocs.length < project.required_manpower;
                                        return (
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${isUnder ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${isUnder ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                                {isUnder ? 'Under-staffed' : 'On Track'}
                                            </span>
                                        );
                                    },
                                },
                                {
                                    key: 'end_date',
                                    label: 'Deadline',
                                    align: 'right',
                                    render: (value) => (
                                        <span className="text-sm text-slate-500 font-mono">
                                            {value ? format(parseISO(value), 'MMM dd') : '—'}
                                        </span>
                                    ),
                                },
                            ]}
                            data={activeProjects.slice(0, 8)}
                            emptyState={{ title: 'No active projects', description: 'Active projects will appear here' }}
                        />
                </div>

                {/* Sidebar (4 cols) */}
                <div className="xl:col-span-4 space-y-4">
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

export default PMDashboard;
