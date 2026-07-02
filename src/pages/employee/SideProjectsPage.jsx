import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../../components/ui/Button';
import { sideProjectApi } from '../../services/api';
import { Rocket, Plus, X, Trash2, Edit3, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { getEndDateValidationMessage, isEndDateBeforeStartDate } from '../../utils/dateValidation';
import Dropdown from '../../components/ui/Dropdown';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const SideProjectsPage = () => {
    const queryClient = useQueryClient();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const employeeId = user.employee_id;
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ name: '', description: '', status: 'active', start_date: '', end_date: '' });
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const { data: sideProjects = [], isLoading } = useQuery({
        queryKey: ['side-projects', employeeId],
        queryFn: () => sideProjectApi.getAll({ employee_id: employeeId }),
        enabled: !!employeeId,
    });

    const createMutation = useMutation({
        mutationFn: (data) => sideProjectApi.create({ ...data, employee_id: employeeId }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['side-projects'] }); toast.success('Side project created!'); resetForm(); },
        onError: (err) => toast.error(err.response?.data?.detail || 'Failed to create side project'),
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => sideProjectApi.update(id, data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['side-projects'] }); toast.success('Updated!'); resetForm(); },
        onError: (err) => toast.error(err.response?.data?.detail || 'Failed to update side project'),
    });
    const deleteMutation = useMutation({
        mutationFn: (id) => sideProjectApi.delete(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['side-projects'] }); toast.success('Deleted'); },
        onError: (err) => toast.error(err.response?.data?.detail || 'Failed to delete side project'),
    });

    const resetForm = () => { setForm({ name: '', description: '', status: 'active', start_date: '', end_date: '' }); setShowForm(false); setEditingId(null); };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEndDateBeforeStartDate(form.start_date, form.end_date)) {
            toast.error(getEndDateValidationMessage());
            return;
        }
        const payload = { name: form.name, description: form.description, status: form.status, start_date: form.start_date || null, end_date: form.end_date || null };
        editingId ? updateMutation.mutate({ id: editingId, data: payload }) : createMutation.mutate(payload);
    };

    const startEdit = (sp) => {
        setForm({ name: sp.name, description: sp.description || '', status: sp.status, start_date: sp.start_date || '', end_date: sp.end_date || '' });
        setEditingId(sp.id);
        setShowForm(true);
    };

    const statusColors = { active: 'bg-emerald-50 text-emerald-700 border-emerald-200', completed: 'bg-blue-50 text-blue-700 border-blue-200', paused: 'bg-amber-50 text-amber-700 border-amber-200' };

    return (
        <>
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Side Projects</h1>
                    <p className="text-slate-500 text-sm mt-1">Personal projects and learning initiatives</p>
                </div>
                <Button onClick={() => { resetForm(); setShowForm(true); }}>
                    <Plus className="w-4 h-4" /> Add Project
                </Button>
            </div>

            {showForm && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-800">{editingId ? 'Edit' : 'New'} Side Project</h3>
                        <button onClick={resetForm} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                            <Dropdown
                                className="w-full"
                                options={[
                                    { value: 'active', label: 'Active' },
                                    { value: 'completed', label: 'Completed' },
                                    { value: 'paused', label: 'Paused' }
                                ]}
                                value={form.status}
                                onChange={(value) => setForm({ ...form, status: value })}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                            <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                            <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                            <Button type="submit"><Save className="w-4 h-4" /> {editingId ? 'Update' : 'Create'}</Button>
                        </div>
                    </form>
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-12 text-slate-400 animate-pulse">Loading...</div>
            ) : sideProjects.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <Rocket className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">No side projects yet</p>
                    <p className="text-sm text-slate-400 mt-1">Click "Add Project" to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sideProjects.map(sp => (
                        <div key={sp.id} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <h3 className="font-semibold text-slate-800">{sp.name}</h3>
                                    {sp.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{sp.description}</p>}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => startEdit(sp)} className="p-1 text-slate-400 hover:text-blue-600"><Edit3 className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => setDeleteConfirm({ id: sp.id, name: sp.name })} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border capitalize ${statusColors[sp.status] || statusColors.active}`}>{sp.status}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
        <ConfirmDialog
            isOpen={deleteConfirm !== null}
            onClose={() => setDeleteConfirm(null)}
            onConfirm={() => { deleteMutation.mutate(deleteConfirm.id); setDeleteConfirm(null); }}
            title="Delete Side Project"
            message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
            isPending={deleteMutation.isPending}
        />
        </>
    );
};

export default SideProjectsPage;
