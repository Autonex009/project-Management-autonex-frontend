import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { allocationApi, parentProjectApi, subProjectApi } from '../../services/api';
import { FolderKanban, Settings, Users, Clock } from 'lucide-react';
import Spinner from '../../components/ui/LoadingSpinner';
import { format } from 'date-fns';
import { getPmEmployeeId, getPmProjects, getPmSubProjects } from '../../utils/pmScope';
import Table, { ColumnTemplates } from '../../components/ui/Table';

const PMSubProjectsPage = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const pmEmployeeId = getPmEmployeeId(user);
    const [searchParams] = useSearchParams();
    const projectParam = searchParams.get('project');
    const filterMainProjectId = projectParam ? Number(projectParam) : null;

    const { data: subProjects = [], isLoading } = useQuery({
        queryKey: ['sub-projects'],
        queryFn: subProjectApi.getAll,
    });
    const { data: parentProjects = [] } = useQuery({
        queryKey: ['parent-projects'],
        queryFn: parentProjectApi.getAll,
    });
    const { data: allocations = [] } = useQuery({
        queryKey: ['allocations'],
        queryFn: allocationApi.getAll,
    });

    const scopedProjects = getPmProjects(parentProjects, pmEmployeeId);
    const scopedSubProjects = getPmSubProjects(subProjects, parentProjects, pmEmployeeId, allocations);
    const filteredSubProjects = filterMainProjectId == null || Number.isNaN(filterMainProjectId)
        ? scopedSubProjects
        : scopedSubProjects.filter((project) => project.main_project_id === filterMainProjectId);
    const currentProject = scopedProjects.find((project) => project.id === filterMainProjectId);


    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg font-semibold text-slate-900">
                        {currentProject ? `Sub-Projects for ${currentProject.name}` : 'Sub-Projects'}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Daily sheets belonging to your PM projects
                    </p>
                </div>
                <Link
                    to="/pm/projects"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium text-sm rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
                >
                    <Settings className="w-4 h-4" />
                    Projects
                </Link>
            </div>

            <Table
                loading={isLoading}
                columns={[
                    {
                        key: 'name',
                        label: 'Sub-Project',
                        render: (value, project) => {
                            const parent = scopedProjects.find(item => item.id === project.main_project_id);
                            return (
                                <div>
                                    <div className="font-semibold text-slate-800">{value}</div>
                                    <div className="text-xs text-slate-400 mt-1">{project.client || parent?.project_type || 'Sub-project'}</div>
                                </div>
                            );
                        },
                    },
                    {
                        key: 'main_project_id',
                        label: 'Project',
                        render: (value) => {
                            const parent = scopedProjects.find(item => item.id === value);
                            return <span className="text-slate-600">{parent?.name || 'Unlinked'}</span>;
                        },
                    },
                    {
                        key: 'required_manpower',
                        label: 'Manpower',
                        align: 'center',
                        render: (required, project) => {
                            const allocated = allocations.filter(a => a.sub_project_id === project.id).length;
                            return (
                                <div className="inline-flex items-center gap-1.5 text-slate-600">
                                    <Users className="w-3.5 h-3.5" />
                                    <span>{allocated}/{required || 0}</span>
                                </div>
                            );
                        },
                    },
                    {
                        key: 'total_tasks',
                        label: 'Tasks',
                        align: 'center',
                        render: (value) => <span className="text-slate-700">{value || 0}</span>,
                    },
                    {
                        key: 'start_date',
                        label: 'Timeline',
                        render: (_, project) => (
                            <div className="inline-flex items-center gap-1.5 text-slate-600">
                                <Clock className="w-3.5 h-3.5" />
                                <span>
                                    {project.start_date && project.end_date
                                        ? `${format(new Date(project.start_date), 'MMM d')} - ${format(new Date(project.end_date), 'MMM d')}`
                                        : '-'}
                                </span>
                            </div>
                        ),
                    },
                    ColumnTemplates.badge('project_status', 'Status', {
                        active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        completed: 'bg-blue-50 text-blue-700 border-blue-200',
                        inactive: 'bg-slate-100 text-slate-600 border-slate-200',
                    }),
                ]}
                data={filteredSubProjects}
                emptyState={{ title: 'No sub-projects found', description: 'Sub-projects from your projects will appear here.' }}
            />
        </div>
    );
};

export default PMSubProjectsPage;
