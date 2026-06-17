/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parentProjectApi, employeeApi, subProjectApi, allocationApi } from '../services/api';
import { Plus, X, Edit, Trash2, FolderTree, Users, Calendar, Clock, ChevronRight, Layers, Search, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { getPmEmployeeId, getPmProjects } from '../utils/pmScope';

const ParentProjectsPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [selectedPmIds, setSelectedPmIds] = useState([]);
    const queryClient = useQueryClient();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = localStorage.getItem('role') || 'admin';
    const isPm = role === 'pm';
    const prefix = isPm ? '/pm' : '/admin';
    const pmEmployeeId = getPmEmployeeId(user);

    // Fetch parent projects
    const { data: parentProjects = [], isLoading } = useQuery({
        queryKey: ['parent-projects'],
        queryFn: parentProjectApi.getAll,
    });

    // Fetch employees for PM dropdown
    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: employeeApi.getAll,
    });

    // Fetch sub-projects and allocations for manpower stats
    const { data: subProjects = [] } = useQuery({
        queryKey: ['sub-projects'],
        queryFn: subProjectApi.getAll,
        staleTime: 2 * 60 * 1000,
    });
    const { data: allocations = [] } = useQuery({
        queryKey: ['allocations'],
        queryFn: allocationApi.getAll,
        staleTime: 2 * 60 * 1000,
    });

    // Build a lookup: parentProjectId → { required, assigned }
    const manpowerByParent = {};
    subProjects.forEach(sp => {
        const pid = sp.main_project_id;
        if (!pid) return;
        if (!manpowerByParent[pid]) manpowerByParent[pid] = { required: 0, assignedIds: new Set() };
        manpowerByParent[pid].required += sp.required_manpower || 0;
    });
    allocations.forEach(alloc => {
        const sp = subProjects.find(s => s.id === alloc.sub_project_id);
        if (!sp?.main_project_id) return;
        const pid = sp.main_project_id;
        if (manpowerByParent[pid]) manpowerByParent[pid].assignedIds.add(alloc.employee_id);
    });

    const [searchQuery, setSearchQuery] = useState('');

    const visibleParentProjects = (isPm ? getPmProjects(parentProjects, pmEmployeeId) : parentProjects)
        .filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.client || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => a.name.localeCompare(b.name));

    // Existing organization names (from the client field) for the dropdown
    const organizations = [...new Set(parentProjects.map(p => p.client).filter(Boolean))].sort((a, b) => a.localeCompare(b));

    // Group visible projects by organization
    const projectsByOrg = visibleParentProjects.reduce((acc, p) => {
        const org = p.client || 'No Organization';
        (acc[org] = acc[org] || []).push(p);
        return acc;
    }, {});
    const orgNames = Object.keys(projectsByOrg).sort((a, b) =>
        a === 'No Organization' ? 1 : b === 'No Organization' ? -1 : a.localeCompare(b)
    );

    // Initialize selected PMs when the modal opens
    useEffect(() => {
        if (!isModalOpen) return;
        const ids = editingProject?.program_manager_ids?.length
            ? editingProject.program_manager_ids
            : editingProject?.program_manager_id
                ? [editingProject.program_manager_id]
                : [];
        setSelectedPmIds(ids);
    }, [isModalOpen, editingProject]);

    // Mutations
    const createMutation = useMutation({
        mutationFn: parentProjectApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries(['parent-projects']);
            setIsModalOpen(false);
            toast.success('Project created successfully');
        },
        onError: (err) => toast.error(err.response?.data?.detail || err.message || 'Failed to create project'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => parentProjectApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['parent-projects']);
            setIsModalOpen(false);
            setEditingProject(null);
            toast.success('Project updated successfully');
        },
        onError: (err) => toast.error(err.response?.data?.detail || err.message || 'Failed to update project'),
    });

    const deleteMutation = useMutation({
        mutationFn: parentProjectApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries(['parent-projects']);
            toast.success('Project deleted successfully');
        },
        onError: (err) => toast.error(err.message || 'Failed to delete project'),
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const pmIds = isPm
            ? [...new Set([pmEmployeeId, ...selectedPmIds])].filter(Boolean)
            : selectedPmIds;

        if (pmIds.length === 0) {
            toast.error('Select at least one Program Manager');
            return;
        }

        const data = {
            name: formData.get('name'),
            client: formData.get('client') || null,
            project_type: formData.get('project_type') || 'Full',
            program_manager_id: pmIds[0],
            program_manager_ids: pmIds,
            description: formData.get('description') || null,
            global_start_date: formData.get('global_start_date'),
            tentative_duration_months: formData.get('tentative_duration_months') ? parseInt(formData.get('tentative_duration_months')) : null,
            status: formData.get('status') || 'active',
        };

        if (editingProject) {
            updateMutation.mutate({ id: editingProject.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleProjectTypeAction = async (nextProjectType) => {
        if (!editingProject) return;

        const actionConfig = {
            Full: {
                confirmMessage: `Convert "${editingProject.name}" from POC to Full?`,
                successMessage: 'Project converted to Full',
            },
            'POC Rejected': {
                confirmMessage: `Mark "${editingProject.name}" as POC Rejected and release allocated employees from all its sub-projects?`,
                successMessage: 'Project marked as POC Rejected and sub-project allocations released',
            },
        };

        const config = actionConfig[nextProjectType];
        if (!config) return;
        if (!window.confirm(config.confirmMessage)) return;

        try {
            await parentProjectApi.update(editingProject.id, { project_type: nextProjectType });
            queryClient.invalidateQueries(['parent-projects']);
            queryClient.invalidateQueries(['sub-projects']);
            queryClient.invalidateQueries(['allocations']);
            setIsModalOpen(false);
            setEditingProject(null);
            toast.success(config.successMessage);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to update project type');
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            active: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
            completed: 'bg-blue-100 text-blue-700 border border-blue-200',
            archived: 'bg-slate-100 text-slate-600 border border-slate-200',
        };
        return styles[status] || styles.active;
    };

    const getProjectTypeBadge = (projectType) => {
        const styles = {
            Full: 'bg-blue-50 text-blue-700 border border-blue-200',
            POC: 'bg-amber-50 text-amber-700 border border-amber-200',
            'POC Rejected': 'bg-rose-50 text-rose-700 border border-rose-200',
            Side: 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200',
        };
        return styles[projectType] || 'bg-slate-100 text-slate-600 border border-slate-200';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Session warning for PMs without a linked employee record */}
            {isPm && !pmEmployeeId && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
                    <span className="text-amber-500 text-lg">⚠️</span>
                    <p className="text-sm text-amber-800">
                        Your account is not yet linked to an employee profile.
                        Please <strong>sign out and log in again</strong> to activate full PM scoping.
                    </p>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                        Organizations
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Manage organizations and long-term initiatives
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search organizations..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 w-52 placeholder:text-slate-400"
                        />
                    </div>
                    <button
                        onClick={() => {
                            setEditingProject(null);
                            setIsModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transition-all duration-200 hover:-translate-y-0.5"
                    >
                        <Plus className="w-4 h-4" />
                        New Organization
                    </button>
                </div>
            </div>

            {/* Programs Grid */}
            {visibleParentProjects.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <Layers className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">{searchQuery ? 'No organizations match your search' : 'No Organizations Yet'}</h3>
                    <p className="text-slate-500 mb-6">{searchQuery ? `No results for "${searchQuery}". Try a different name.` : 'Create your first organization to group related projects.'}</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Create Organization
                    </button>
                </div>
            ) : (
                <div className="space-y-8">
                    {orgNames.map((orgName) => (
                        <div key={orgName}>
                            <div className="flex items-center gap-2 mb-4">
                                <Building2 className="w-5 h-5 text-slate-400" />
                                <h2 className="text-lg font-bold text-slate-800">{orgName}</h2>
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs font-medium">
                                    {projectsByOrg[orgName].length} {projectsByOrg[orgName].length === 1 ? 'project' : 'projects'}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projectsByOrg[orgName].map((program) => (
                        <div
                            key={program.id}
                            className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 group"
                        >
                            {/* Card Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                        <FolderTree className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                            {program.name}
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            {program.client || 'No client'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getProjectTypeBadge(program.project_type)}`}>
                                        {program.project_type || 'Full'}
                                    </span>
                                    {/* is_annotation badge removed and moved to sub-projects page */}
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(program.status)}`}>
                                        {program.status}
                                    </span>
                                </div>
                            </div>

                            {/* Description */}
                            {program.description && (
                                <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                                    {program.description}
                                </p>
                            )}

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
                                <div className="bg-slate-50 rounded-lg p-2 text-center">
                                    <FolderTree className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                                    <p className="text-lg font-bold text-slate-800">{program.sub_projects_count || 0}</p>
                                    <p className="text-xs text-slate-500">Projects</p>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-2 text-center">
                                    <Calendar className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                                    <p className="text-sm font-semibold text-slate-800">
                                        {program.global_start_date ? format(new Date(program.global_start_date), 'dd-MMM-yy') : '-'}
                                    </p>
                                    <p className="text-xs text-slate-500">Start</p>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-2 text-center">
                                    <Users className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                                    <p className="text-lg font-bold text-slate-800">
                                        <span className={manpowerByParent[program.id]?.assignedIds.size >= (manpowerByParent[program.id]?.required || 0) && (manpowerByParent[program.id]?.required || 0) > 0 ? 'text-emerald-600' : 'text-slate-800'}>
                                            {manpowerByParent[program.id]?.assignedIds.size ?? 0}
                                        </span>
                                        <span className="text-slate-400 font-normal mx-0.5">/</span>
                                        <span className="text-slate-500 text-base">{manpowerByParent[program.id]?.required || 0}</span>
                                    </p>
                                    <p className="text-xs text-slate-500">Assigned / Req'd</p>
                                </div>
                            </div>

                            {/* PM Info */}
                            {(program.program_manager_names?.length > 0 || program.program_manager_name) && (
                                <div className="flex items-center gap-2 mb-4 p-2 bg-indigo-50 rounded-lg">
                                    <Users className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                    <span className="text-sm text-indigo-700 font-medium truncate" title={(program.program_manager_names?.length ? program.program_manager_names : [program.program_manager_name]).join(', ')}>
                                        PM: {(program.program_manager_names?.length ? program.program_manager_names : [program.program_manager_name]).join(', ')}
                                    </span>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingProject(program);
                                            setIsModalOpen(true);
                                        }}
                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                        title="Edit"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm(`Delete "${program.name}"? Its projects will be unlinked.`)) {
                                                deleteMutation.mutate(program.id);
                                            }
                                        }}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <Link
                                    to={`${prefix}/sub-projects?project=${program.id}`}
                                    className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                                >
                                    View Projects
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-2 sm:p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-slate-900">
                                    {editingProject ? 'Edit Project' : 'Create Project'}
                                </h2>
                                <button
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setEditingProject(null);
                                    }}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Project Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    defaultValue={editingProject?.name || ''}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="e.g., Yutori"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Organization *
                                </label>
                                <input
                                    type="text"
                                    name="client"
                                    required
                                    list="organization-options"
                                    defaultValue={editingProject?.client || ''}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="Select existing or type a new organization"
                                />
                                <datalist id="organization-options">
                                    {organizations.map((org) => (
                                        <option key={org} value={org} />
                                    ))}
                                </datalist>
                                <p className="mt-1 text-xs text-slate-400">
                                    Pick an existing organization or type a new name to create one.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Project Type *
                                </label>
                                <select
                                    name="project_type"
                                    required
                                    defaultValue={editingProject?.project_type || 'Full'}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                >
                                    <option value="Full">Full</option>
                                    <option value="POC">POC</option>
                                    <option value="POC Rejected">POC Rejected</option>
                                    <option value="Side">Side</option>
                                </select>
                            </div>

                            {/* is_annotation checkbox removed and moved to sub-projects page */}

                            {editingProject?.project_type === 'POC' && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                                    <p className="text-sm font-medium text-amber-900">POC Actions</p>
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            type="button"
                                            onClick={() => handleProjectTypeAction('Full')}
                                            disabled={updateMutation.isPending}
                                            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            Convert to Full
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleProjectTypeAction('POC Rejected')}
                                            disabled={updateMutation.isPending}
                                            className="px-4 py-2 text-sm font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                                        >
                                            POC Rejected
                                        </button>
                                    </div>
                                    <p className="text-xs text-amber-700">
                                        Rejecting a POC will update its badge and release employees allocated to its sub-projects.
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Program Manager(s) *
                                </label>
                                {isPm && (
                                    <p className="mb-2 text-xs text-slate-400">
                                        You ({user.name || 'Current PM'}) are included automatically. You can add a co-manager below.
                                    </p>
                                )}
                                {/* Selected PM chips */}
                                {selectedPmIds.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {selectedPmIds.map((id) => {
                                            const emp = employees.find(e => e.id === id);
                                            if (!emp) return null;
                                            return (
                                                <span key={id} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
                                                    {emp.name}
                                                    {selectedPmIds[0] === id && (
                                                        <span className="text-[10px] uppercase tracking-wide text-indigo-400">primary</span>
                                                    )}
                                                    {!(isPm && id === pmEmployeeId) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedPmIds(prev => prev.filter(p => p !== id))}
                                                            className="p-0.5 hover:bg-indigo-100 rounded-full transition-colors"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                                <select
                                    value=""
                                    onChange={(e) => {
                                        const id = parseInt(e.target.value);
                                        if (id && !selectedPmIds.includes(id)) {
                                            setSelectedPmIds(prev => [...prev, id]);
                                        }
                                    }}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                >
                                    <option value="">+ Add Program Manager</option>
                                    {employees
                                        .filter(e => e.status === 'active' && !selectedPmIds.includes(e.id))
                                        .map((emp) => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.name}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    rows={3}
                                    defaultValue={editingProject?.description || ''}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all resize-none"
                                    placeholder="Scope of work and program objectives..."
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Start Date *
                                    </label>
                                    <input
                                        type="date"
                                        name="global_start_date"
                                        required
                                        defaultValue={editingProject?.global_start_date || ''}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Duration (weeks)
                                    </label>
                                    <input
                                        type="number"
                                        name="tentative_duration_months"
                                        min="1"
                                        defaultValue={editingProject?.tentative_duration_months || ''}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                        placeholder="12"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Status
                                </label>
                                <select
                                    name="status"
                                    defaultValue={editingProject?.status || 'active'}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                >
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>

                            </div>

                            {/* Submit Buttons */}
                            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-white flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setEditingProject(null);
                                    }}
                                    className="px-4 py-2.5 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl transition-all disabled:opacity-50"
                                >
                                    {createMutation.isPending || updateMutation.isPending
                                        ? 'Saving...'
                                        : editingProject
                                            ? 'Update Project'
                                            : 'Create Project'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParentProjectsPage;
