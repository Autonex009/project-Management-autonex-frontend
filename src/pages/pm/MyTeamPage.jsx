import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { allocationApi, employeeApi, parentProjectApi, subProjectApi } from '../../services/api';
import { Briefcase, Clock3, FolderKanban, Mail, Phone, Search, Users, X } from 'lucide-react';
import Button from '../../components/ui/Button';
import SlackIcon from '../../components/icons/SlackIcon';
import { getPmEmployeeId, getPmSubProjects } from '../../utils/pmScope';

const badgeTone = {
    active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    inactive: 'border-slate-200 bg-slate-100 text-slate-600',
    'on-leave': 'border-amber-200 bg-amber-50 text-amber-700',
};

const MyTeamPage = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = localStorage.getItem('role') || user.role || 'employee';
    const canMessageOnSlack = role === 'pm' || role === 'admin';
    const pmEmployeeId = getPmEmployeeId(user);

    const { data: parentProjects = [] } = useQuery({
        queryKey: ['parent-projects'],
        queryFn: parentProjectApi.getAll,
    });
    const { data: projects = [], isLoading: projectsLoading } = useQuery({
        queryKey: ['sub-projects'],
        queryFn: subProjectApi.getAll,
    });
    const { data: employees = [], isLoading: employeesLoading } = useQuery({
        queryKey: ['employees'],
        queryFn: employeeApi.getAll,
    });
    const { data: allocations = [], isLoading: allocationsLoading } = useQuery({
        queryKey: ['allocations'],
        queryFn: allocationApi.getAll,
    });

    const scopedProjects = getPmSubProjects(projects, parentProjects, pmEmployeeId, allocations);
    const scopedProjectIds = new Set(scopedProjects.map((project) => project.id));

    const scopedAllocations = allocations.filter((allocation) => scopedProjectIds.has(allocation.sub_project_id));
    const employeeProjectMap = new Map();

    scopedAllocations.forEach((allocation) => {
        const project = scopedProjects.find((item) => item.id === allocation.sub_project_id);
        if (!project) return;

        const current = employeeProjectMap.get(allocation.employee_id) || [];
        if (!current.some((entry) => entry.id === project.id)) {
            current.push({
                id: project.id,
                name: project.name,
                client: project.client,
                hours: allocation.total_daily_hours || 0,
                status: project.project_status,
            });
        }
        employeeProjectMap.set(allocation.employee_id, current);
    });

    const teamMembers = employees
        .filter((employee) => employeeProjectMap.has(employee.id))
        .map((employee) => {
            const memberProjects = employeeProjectMap.get(employee.id) || [];
            const totalDailyHours = memberProjects.reduce((sum, project) => sum + project.hours, 0);
            return {
                ...employee,
                memberProjects,
                totalDailyHours,
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

    const isLoading = projectsLoading || employeesLoading || allocationsLoading;

    const [searchTerm, setSearchTerm] = useState('');
    const [projectFilter, setProjectFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState('all');

    const roleOptions = useMemo(
        () =>
            Array.from(new Set(teamMembers.map((member) => member.designation).filter(Boolean))).sort((a, b) =>
                a.localeCompare(b),
            ),
        [teamMembers],
    );

    const filteredMembers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return teamMembers.filter((member) => {
            const matchesName = !term || (member.name || '').toLowerCase().includes(term);
            const matchesProject =
                projectFilter === 'all' ||
                member.memberProjects.some((project) => String(project.id) === projectFilter);
            const matchesRole = roleFilter === 'all' || member.designation === roleFilter;
            return matchesName && matchesProject && matchesRole;
        });
    }, [teamMembers, searchTerm, projectFilter, roleFilter]);

    const hasActiveFilters = searchTerm.trim() !== '' || projectFilter !== 'all' || roleFilter !== 'all';

    const clearFilters = () => {
        setSearchTerm('');
        setProjectFilter('all');
        setRoleFilter('all');
    };

    return (
        <div className="space-y-8">
            <section className="overflow-hidden rounded-[28px] border border-blue-100 bg-[linear-gradient(135deg,rgba(37,99,235,0.12),rgba(255,255,255,0.94)_42%,rgba(239,246,255,1))] p-6 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-700">My Team</p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Team members across your allocated projects</h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-500">
                            View your team’s profile details and the projects they are currently allocated to within your PM scope.
                        </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <SummaryCard icon={Users} label="Team Members" value={teamMembers.length} />
                        <SummaryCard icon={FolderKanban} label="Scoped Projects" value={scopedProjects.length} />
                        <SummaryCard
                            icon={Clock3}
                            label="Total Daily Hours"
                            value={teamMembers.reduce((sum, member) => sum + member.totalDailyHours, 0)}
                            suffix="h"
                        />
                    </div>
                </div>
            </section>

            {!isLoading && teamMembers.length > 0 && (
                <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Search team members by name..."
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <select
                                value={projectFilter}
                                onChange={(event) => setProjectFilter(event.target.value)}
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="all">All projects</option>
                                {scopedProjects.map((project) => (
                                    <option key={project.id} value={String(project.id)}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={roleFilter}
                                onChange={(event) => setRoleFilter(event.target.value)}
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="all">All roles</option>
                                {roleOptions.map((roleName) => (
                                    <option key={roleName} value={roleName}>
                                        {roleName}
                                    </option>
                                ))}
                            </select>
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                                >
                                    <X className="h-4 w-4" />
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>
                    <p className="mt-3 text-xs font-medium text-slate-400">
                        Showing {filteredMembers.length} of {teamMembers.length} team members
                    </p>
                </section>
            )}

            {isLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
                    Loading team details...
                </div>
            ) : teamMembers.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
                    <Users className="mx-auto h-10 w-10 text-slate-300" />
                    <h2 className="mt-4 text-lg font-semibold text-slate-800">No team members found yet</h2>
                    <p className="mt-2 text-sm text-slate-500">
                        Team members will appear here once employees are allocated to projects inside your PM scope.
                    </p>
                </div>
            ) : filteredMembers.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
                    <Search className="mx-auto h-10 w-10 text-slate-300" />
                    <h2 className="mt-4 text-lg font-semibold text-slate-800">No team members match your filters</h2>
                    <p className="mt-2 text-sm text-slate-500">Try adjusting your search or clearing the filters.</p>
                </div>
            ) : (
                <section className="grid gap-5 xl:grid-cols-2">
                    {filteredMembers.map((member) => (
                        <article key={member.id} className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-lg font-semibold text-blue-700">
                                        {(member.name || 'U').charAt(0)}
                                    </div>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-lg font-semibold text-slate-900">{member.name}</h2>
                                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeTone[member.status] || badgeTone.active}`}>
                                                {member.status || 'active'}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm text-slate-500">{member.designation || 'Team Member'}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-3">
                                    {canMessageOnSlack && <SlackDmButton employee={member} />}
                                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Daily Load</p>
                                        <p className="mt-1 text-lg font-semibold text-slate-900">{member.totalDailyHours}h</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 grid gap-3 md:grid-cols-2">
                                <InfoRow icon={Mail} label="Email" value={member.email} />
                                <InfoRow icon={Phone} label="Phone" value={member.phone || 'Not available'} />
                                <InfoRow icon={Briefcase} label="Employee Type" value={member.employee_type || 'Not available'} />
                                <InfoRow icon={Users} label="Skills" value={member.skills?.length ? member.skills.join(', ') : 'Not available'} />
                            </div>

                            <div className="mt-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Allocated Projects</h3>
                                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                                        {member.memberProjects.length}
                                    </span>
                                </div>
                                <div className="mt-3 space-y-3">
                                    {member.memberProjects.map((project) => (
                                        <div key={`${member.id}-${project.id}`} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="font-medium text-slate-800">{project.name}</p>
                                                    <p className="mt-1 text-xs text-slate-400">{project.client || 'No client specified'}</p>
                                                </div>
                                                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm">
                                                    {project.hours}h/day
                                                </span>
                                            </div>
                                            <div className="mt-3">
                                                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                                                    project.status === 'completed'
                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                        : project.status === 'on-hold'
                                                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                                                            : 'border-blue-200 bg-blue-50 text-blue-700'
                                                }`}>
                                                    {project.status || 'active'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </article>
                    ))}
                </section>
            )}
        </div>
    );
};

const SlackDmButton = ({ employee }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleClick = async () => {
        setError('');
        setLoading(true);
        try {
            const { url } = await employeeApi.getSlackLink(employee.id);
            if (url) {
                window.open(url, '_blank', 'noopener,noreferrer');
            } else {
                setError('Slack account not found');
            }
        } catch (err) {
            const status = err?.response?.status;
            setError(status === 404 ? 'Slack account not found' : 'Slack unavailable');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-end gap-1">
            <Button type="button" variant="secondary" size="sm" onClick={handleClick} disabled={loading} isLoading={loading}>
                {!loading && <SlackIcon size={16} />}
                {loading ? 'Opening…' : 'Slack DM'}
            </Button>
            {error && <span className="text-xs font-medium text-amber-600">{error}</span>}
        </div>
    );
};

const SummaryCard = ({ icon: Icon, label, value, suffix = '' }) => (
    <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2">
                <Icon className="h-4 w-4 text-blue-600" />
            </div>
            <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{label}</p>
                <p className="text-lg font-semibold text-slate-900">{value}{suffix}</p>
            </div>
        </div>
    </div>
);

const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
        <div className="flex items-start gap-3">
            <Icon className="mt-0.5 h-4 w-4 text-blue-600" />
            <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{label}</p>
                <p className="mt-1 break-words text-sm font-medium text-slate-700">{value}</p>
            </div>
        </div>
    </div>
);

export default MyTeamPage;
