import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../../components/ui/Button';
import { guidelineApi, projectApi, subProjectApi } from '../../services/api';
import { FileText, Plus, Trash2, Edit3, Save, Download, FolderOpen, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import { getPmEmployeeId, getPmProjects, getPmSubProjects } from '../../utils/pmScope';
import SearchBar from '../../components/ui/SearchBar';
import Dropdown from '../../components/ui/Dropdown';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const GuidelinesPage = () => {
    const queryClient = useQueryClient();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = localStorage.getItem('role') || 'employee';
    const isPm = role === 'pm';
    const canEdit = role === 'pm' || role === 'admin';
    const pmEmployeeId = getPmEmployeeId(user);

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ title: '', main_project_id: '', sub_project_id: '' });
    const [filterProject, setFilterProject] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragActive, setIsDragActive] = useState(false);
    const fileInputRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Fetch guidelines
    const params = {};
    if (filterProject) params.main_project_id = filterProject;
    if (role === 'pm' && user.id) params.uploaded_by = user.id;
    const { data: guidelines = [], isLoading } = useQuery({
        queryKey: ['guidelines', filterProject, role, user.id],
        queryFn: () => guidelineApi.getAll(params),
    });

    // Fetch main projects for filter/selector
    const { data: mainProjects = [] } = useQuery({
        queryKey: ['main-projects'],
        queryFn: projectApi.getAll,
    });

    const { data: subProjects = [] } = useQuery({
        queryKey: ['sub-projects'],
        queryFn: subProjectApi.getAll,
    });

    const visibleMainProjects = isPm ? getPmProjects(mainProjects, pmEmployeeId) : mainProjects;
    const visibleSubProjectsForRole = isPm
        ? getPmSubProjects(subProjects, mainProjects, pmEmployeeId, [])
        : subProjects;

    const filteredGuidelines = guidelines.filter(g => {
        const title = (g.title || '').toLowerCase();
        const content = (g.content || '').toLowerCase();
        const fileName = (g.file_name || '').toLowerCase();
        const q = searchQuery.toLowerCase();
        return title.includes(q) || content.includes(q) || fileName.includes(q);
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: (formData) => guidelineApi.upload(formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['guidelines'] });
            toast.success('Guideline created!');
            resetForm();
        },
        onError: () => toast.error('Failed to create guideline'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => guidelineApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['guidelines'] });
            toast.success('Guideline updated!');
            resetForm();
        },
        onError: () => toast.error('Failed to update'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => guidelineApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['guidelines'] });
            toast.success('Guideline deleted');
            setDeleteTarget(null);
        },
        onError: () => toast.error('Failed to delete'),
    });

    const resetForm = () => {
        setForm({ title: '', main_project_id: '', sub_project_id: '' });
        setSelectedFile(null);
        setIsDragActive(false);
        setShowForm(false);
        setEditingId(null);
    };

    const addGuidelineFile = (file) => {
        if (!file) return;
        setSelectedFile(file);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingId) {
            updateMutation.mutate({ id: editingId, data: { title: form.title } });
        } else {
            if (!selectedFile) {
                toast.error('Please upload a guideline file');
                return;
            }

            const payload = new FormData();
            payload.append('file', selectedFile);
            if (form.title.trim()) {
                payload.append('title', form.title.trim());
            }
            if (form.main_project_id) {
                payload.append('main_project_id', form.main_project_id);
            }
            if (form.sub_project_id) {
                payload.append('sub_project_id', form.sub_project_id);
            }
            if (user.id) {
                payload.append('uploaded_by', String(user.id));
            }
            createMutation.mutate(payload);
        }
    };

    const startEdit = (g) => {
        setForm({ title: g.title, main_project_id: g.main_project_id || '', sub_project_id: g.sub_project_id || '' });
        setEditingId(g.id);
        setSelectedFile(null);
        setShowForm(true);
    };

    const visibleSubProjects = form.main_project_id
        ? visibleSubProjectsForRole.filter((project) => String(project.main_project_id) === String(form.main_project_id))
        : visibleSubProjectsForRole;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold text-slate-900">Project Guidelines</h1>
                    <p className="text-slate-500 text-sm mt-1">Reference documents and instructions for projects</p>
                </div>
                {canEdit && (
                    <Button variant="blue" onClick={() => { resetForm(); setShowForm(true); }}>
                        <Plus className="w-4 h-4" /> Add Guideline
                    </Button>
                )}
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Dropdown
                        options={[{ value: '', label: 'All Projects' }, ...visibleMainProjects.map(p => ({ value: String(p.id), label: p.name }))]}
                        value={filterProject}
                        onChange={(val) => { setFilterProject(val); setSearchQuery(''); }}
                        placeholder="All Projects"
                    />
                    <span className="text-sm text-slate-400">{filteredGuidelines.length} guideline{filteredGuidelines.length !== 1 ? 's' : ''}</span>
                </div>

                <SearchBar responsive
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search guidelines..."
                />
            </div>

            {/* Create/Edit Modal */}
            <Modal isOpen={showForm && canEdit} onClose={resetForm} size="lg">
                <Modal.Header onClose={resetForm}>
                    <h3 className="font-semibold text-slate-800">{editingId ? 'Edit Guideline' : 'New Guideline'}</h3>
                </Modal.Header>
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                    <Modal.Body className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Optional. Defaults to file name"
                                    required={!!editingId}
                                />
                            </div>
                            {!editingId && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Main Project</label>
                                    <Dropdown
                                        options={[{ value: '', label: 'None (General)' }, ...visibleMainProjects.map(p => ({ value: String(p.id), label: p.name }))]}
                                        value={form.main_project_id}
                                        onChange={(val) => setForm({ ...form, main_project_id: val, sub_project_id: '' })}
                                        placeholder="None (General)"
                                    />
                                </div>
                            )}
                        </div>
                        {!editingId && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Sub-Project</label>
                                    <Dropdown
                                        options={[{ value: '', label: 'All Sub-Projects' }, ...visibleSubProjects.map(p => ({ value: String(p.id), label: p.name }))]}
                                        value={form.sub_project_id}
                                        onChange={(val) => setForm({ ...form, sub_project_id: val })}
                                        placeholder="All Sub-Projects"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Guideline File</label>
                                    <div
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setIsDragActive(true);
                                        }}
                                        onDragLeave={(e) => {
                                            e.preventDefault();
                                            setIsDragActive(false);
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setIsDragActive(false);
                                            addGuidelineFile(e.dataTransfer.files?.[0]);
                                        }}
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                                            isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/60'
                                        }`}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            className="hidden"
                                            onChange={(e) => {
                                                addGuidelineFile(e.target.files?.[0]);
                                                e.target.value = '';
                                            }}
                                        />
                                        <UploadCloud className="w-8 h-8 text-indigo-500 mx-auto mb-3" />
                                        <p className="text-sm font-medium text-slate-700">
                                            Drag guideline file here or click to browse
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Uploaded files will be visible in the related Guidelines tabs.
                                        </p>
                                    </div>

                                    {selectedFile && (
                                        <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-slate-700 truncate">{selectedFile.name}</p>
                                                    <p className="text-xs text-slate-400">{Math.max(1, Math.round(selectedFile.size / 1024))} KB</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedFile(null);
                                                }}
                                                className="text-sm text-red-500 hover:text-red-600"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button type="button" variant="cancel" onClick={resetForm}>Cancel</Button>
                        <Button type="submit" variant="blue"><Save className="w-4 h-4" /> {editingId ? 'Update' : 'Upload'}</Button>
                    </Modal.Footer>
                </form>
            </Modal>

            {/* Guidelines List */}
            {isLoading ? (
                <div className="text-center py-12 text-slate-400 animate-pulse">Loading guidelines...</div>
            ) : filteredGuidelines.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="font-medium text-slate-600 mb-1">No guidelines found</h3>
                    <p className="text-sm text-slate-400">Try adjusting your search or filters.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredGuidelines.map(g => {
                        const project = mainProjects.find(p => p.id === g.main_project_id);
                        const subProject = subProjects.find(p => p.id === g.sub_project_id);
                        return (
                            <div key={g.id} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                                <div className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <FileText className="w-4 h-4 text-blue-500" />
                                                <h3 className="font-semibold text-slate-800">{g.title}</h3>
                                            </div>
                                            {project && (
                                                <span className="inline-block px-2 py-0.5 text-[11px] font-medium bg-indigo-50 text-indigo-600 rounded-full mb-2">
                                                    {project.name}
                                                </span>
                                            )}
                                            {subProject && (
                                                <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                                                    <FolderOpen className="w-3.5 h-3.5" />
                                                    <span>{subProject.name}</span>
                                                </div>
                                            )}
                                        </div>
                                        {canEdit && (
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => startEdit(g)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setDeleteTarget(g)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {g.content && (
                                        <div className="mt-3 p-4 bg-slate-50 rounded-xl text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-mono max-h-64 overflow-y-auto">
                                            {g.content}
                                        </div>
                                    )}
                                    {g.file_url && (
                                        <a
                                            href={g.file_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            {g.file_name || 'Open guideline file'}
                                        </a>
                                    )}
                                    <p className="text-xs text-slate-400 mt-3">
                                        Created {new Date(g.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
                isPending={deleteMutation.isPending}
                variant="danger"
                title="Delete Guideline"
                message={`Are you sure you want to delete "${deleteTarget?.title || 'this guideline'}"? This action cannot be undone.`}
            />
        </div>
    );
};

export default GuidelinesPage;
