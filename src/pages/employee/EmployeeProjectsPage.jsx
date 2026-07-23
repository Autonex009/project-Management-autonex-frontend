import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { allocationApi, subProjectApi } from '../../services/api';
import { FolderKanban, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const EmployeeProjectsPage = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const employeeId = user.employee_id;

    const { data: allocations = [], isLoading } = useQuery({
        queryKey: ['my-allocations', employeeId],
        queryFn: () => allocationApi.getByEmployee(employeeId),
        enabled: !!employeeId,
    });
    const { data: projects = [] } = useQuery({ queryKey: ['sub-projects'], queryFn: subProjectApi.getAll });

    const myProjects = allocations.map(alloc => {
        const project = projects.find(p => p.id === alloc.sub_project_id);
        return { ...alloc, project };
    }).filter(a => a.project);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-lg font-semibold text-slate-900">My Projects</h1>
                <p className="text-slate-500 text-sm mt-1">Daily sheets you're allocated to</p>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-slate-400 animate-pulse">Loading...</div>
            ) : myProjects.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">No projects allocated</p>
                    <p className="text-sm text-slate-400 mt-1">Contact your PM for assignments.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myProjects.map(({ project, ...alloc }) => (
                        <div key={alloc.id} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow p-5">
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <h3 className="font-semibold text-slate-800">{project.name}</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">{project.client} • {project.project_type}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-bold text-slate-800">{alloc.total_daily_hours || 8}h</span>
                                    <p className="text-[10px] text-slate-400">/day</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                {(alloc.role_tags || []).map(tag => (
                                    <span key={tag} className="px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-600 rounded-full">{tag}</span>
                                ))}
                            </div>
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
    );
};

function getProgress(start, end) {
    if (!start || !end) return 0;
    const s = new Date(start).getTime(), e = new Date(end).getTime(), now = Date.now();
    if (now >= e) return 100;
    if (now <= s) return 0;
    return Math.round(((now - s) / (e - s)) * 100);
}

export default EmployeeProjectsPage;
