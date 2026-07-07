import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { parentProjectApi } from '../../services/api';
import { Calendar, FolderTree, Layers, ChevronRight } from 'lucide-react';
import Spinner from '../../components/ui/LoadingSpinner';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { getPmEmployeeId, getPmProjects } from '../../utils/pmScope';

const getProjectTypeBadge = (projectType) => {
    const styles = {
        Full: 'bg-blue-50 text-blue-700 border border-blue-200',
        POC: 'bg-amber-50 text-amber-700 border border-amber-200',
        'POC Rejected': 'bg-rose-50 text-rose-700 border border-rose-200',
        Side: 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200',
    };
    return styles[projectType] || 'bg-slate-100 text-slate-600 border border-slate-200';
};

const PMProjectsPage = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const pmEmployeeId = getPmEmployeeId(user);

    const { data: parentProjects = [], isLoading } = useQuery({
        queryKey: ['parent-projects'],
        queryFn: parentProjectApi.getAll,
    });

    const scopedProjects = getPmProjects(parentProjects, pmEmployeeId);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Spinner size="lg" color="indigo" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
                <p className="text-slate-500 text-sm mt-1">Main projects owned by you as project manager</p>
            </div>

            {scopedProjects.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <Layers className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No Projects Assigned</h3>
                    <p className="text-slate-500">Projects linked to your PM account will appear here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {scopedProjects.map((project) => (
                        <div
                            key={project.id}
                            className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:shadow-slate-200/60 transition-all duration-200"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                                        <FolderTree className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{project.name}</h3>
                                        <p className="text-xs text-slate-500">
                                            {project.client || 'No client'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getProjectTypeBadge(project.project_type)}`}>
                                        {project.project_type || 'Full'}
                                    </span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${project.status === 'active'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : project.status === 'completed'
                                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                : 'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}>
                                        {project.status}
                                    </span>
                                </div>
                            </div>

                            {project.description && (
                                <p className="text-sm text-slate-600 mb-4 line-clamp-2">{project.description}</p>
                            )}

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-slate-50 rounded-lg p-3">
                                    <p className="text-xs text-slate-500 mb-1">Sub-Projects</p>
                                    <p className="text-lg font-bold text-slate-900">{project.sub_projects_count || 0}</p>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-3">
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        Start
                                    </div>
                                    <p className="text-sm font-semibold text-slate-900">
                                        {project.global_start_date ? format(new Date(project.global_start_date), 'MMM yyyy') : '-'}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <Link
                                    to={`/pm/sub-projects?project=${project.id}`}
                                    className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                                >
                                    View Sub-Projects
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PMProjectsPage;
