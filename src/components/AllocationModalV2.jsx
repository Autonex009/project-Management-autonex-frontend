import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, Users, CalendarRange, Target, CheckCircle2, Activity } from 'lucide-react';
import Button from './ui/Button';
import Dropdown from './ui/Dropdown';
import Modal from './ui/Modal';
import { recommendationsApi } from '../services/api';

const capacityPill = (status) => {
    if (status === 'overburdened') return { cls: 'bg-red-50 text-red-700 border-red-200', label: 'Overburdened' };
    if (status === 'underutilized') return { cls: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Underutilized' };
    if (status === 'balanced') return { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Balanced' };
    return { cls: 'bg-slate-100 text-slate-500 border-slate-200', label: status || 'Unknown' };
};

const AllocationModalV2 = ({
    isOpen,
    onClose,
    onSubmit,
    employees = [],
    projects = [],
    editingAllocation = null,
    presetEmployeeId = null,
    presetEmployeeName = '',
    hideOverride = false,
    hideRoleTags = false,
    projectInsights = false,
    allocations = [],
    candidateSkills = [],
    excludeProjectIds = []
}) => {
    const [formData, setFormData] = useState({
        employee_id: presetEmployeeId || '',
        project_id: '',
        total_daily_hours: 8,
        active_start_date: new Date().toISOString().split('T')[0],
        active_end_date: '',
        role_tags: [],
        time_distribution: {},
        override_flag: false,
        override_reason: ''
    });

    const [newRole, setNewRole] = useState('');
    const [validationErrors, setValidationErrors] = useState([]);

    // Common role suggestions
    const roleSuggestions = ['Annotation', 'Review', 'QA', 'Training', 'Management'];

    // Project-fit insights (pool flow)
    const [capacity, setCapacity] = useState(null);
    const [capacityLoading, setCapacityLoading] = useState(false);
    const [capacityError, setCapacityError] = useState(false);

    const selectedProject = projects.find(p => String(p.id) === String(formData.project_id)) || null;

    useEffect(() => {
        if (!projectInsights || !formData.project_id) {
            setCapacity(null);
            setCapacityError(false);
            return;
        }
        let cancelled = false;
        setCapacityLoading(true);
        setCapacityError(false);
        recommendationsApi.getByProject(formData.project_id)
            .then(data => { if (!cancelled) setCapacity(data); })
            .catch(() => { if (!cancelled) { setCapacity(null); setCapacityError(true); } })
            .finally(() => { if (!cancelled) setCapacityLoading(false); });
        return () => { cancelled = true; };
    }, [projectInsights, formData.project_id]);

    useEffect(() => {
        if (presetEmployeeId) {
            setFormData(prev => ({ ...prev, employee_id: presetEmployeeId }));
        }
    }, [presetEmployeeId, isOpen]);

    useEffect(() => {
        if (editingAllocation) {
            setFormData({
                employee_id: editingAllocation.employee_id,
                project_id: editingAllocation.project_id,
                total_daily_hours: editingAllocation.total_daily_hours || 8,
                active_start_date: editingAllocation.active_start_date || new Date().toISOString().split('T')[0],
                active_end_date: editingAllocation.active_end_date || '',
                role_tags: editingAllocation.role_tags || [],
                time_distribution: editingAllocation.time_distribution || {},
                override_flag: editingAllocation.override_flag || false,
                override_reason: editingAllocation.override_reason || ''
            });
        }
    }, [editingAllocation]);

    const handleAddRole = () => {
        if (newRole.trim() && !formData.role_tags.includes(newRole.trim())) {
            const updated = [...formData.role_tags, newRole.trim()];
            setFormData(prev => ({
                ...prev,
                role_tags: updated,
                time_distribution: {
                    ...prev.time_distribution,
                    [newRole.trim()]: 0
                }
            }));
            setNewRole('');
        }
    };

    const handleRemoveRole = (role) => {
        const { [role]: _, ...remainingDistribution } = formData.time_distribution;
        setFormData(prev => ({
            ...prev,
            role_tags: prev.role_tags.filter(r => r !== role),
            time_distribution: remainingDistribution
        }));
    };

    const handleDistributionChange = (role, hours) => {
        setFormData(prev => ({
            ...prev,
            time_distribution: {
                ...prev.time_distribution,
                [role]: parseInt(hours) || 0
            }
        }));
    };

    const validateForm = () => {
        const errors = [];

        if (!formData.employee_id) errors.push('Employee is required');
        if (!formData.project_id) errors.push('Project is required');
        if (!formData.active_start_date) errors.push('Start date is required');

        // Validate time distribution
        if (formData.role_tags.length > 0) {
            const totalDistributed = Object.values(formData.time_distribution).reduce((sum, h) => sum + h, 0);
            if (totalDistributed !== formData.total_daily_hours) {
                errors.push(`Time distribution (${totalDistributed}h) must equal total daily hours (${formData.total_daily_hours}h)`);
            }
        }

        // Validate date range
        if (formData.active_end_date && formData.active_end_date < formData.active_start_date) {
            errors.push('End date must be after start date');
        }

        setValidationErrors(errors);
        return errors.length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            onSubmit(formData);
        }
    };

    const totalDistributed = Object.values(formData.time_distribution).reduce((sum, h) => sum + h, 0);
    const isBalanced = totalDistributed === formData.total_daily_hours;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="4xl" maxHeight="95vh">
            <Modal.Header onClose={onClose}>
                <h2 className="text-xl font-semibold text-gray-900">
                    {editingAllocation ? 'Edit Allocation' : 'Create Allocation'}
                </h2>
            </Modal.Header>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                <Modal.Body className="space-y-6">
                    {/* Validation Errors */}
                    {validationErrors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-4">
                            <div className="flex gap-2">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-red-800">Validation Errors:</p>
                                    <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                                        {validationErrors.map((error, idx) => (
                                            <li key={idx}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Basic Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Employee <span className="text-red-500">*</span>
                            </label>
                            {presetEmployeeId ? (
                                <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm font-medium text-gray-800">
                                    {presetEmployeeName || 'Selected candidate'}
                                </div>
                            ) : (
                                <Dropdown
                                    options={employees.filter(e => e.status === 'active').map(emp => ({
                                        value: emp.id.toString(),
                                        label: `${emp.name} - ${emp.employee_type}`
                                    }))}
                                    value={formData.employee_id.toString()}
                                    onChange={(val) => setFormData(prev => ({ ...prev, employee_id: parseInt(val) || '' }))}
                                    placeholder="Select employee"
                                />
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Project <span className="text-red-500">*</span>
                            </label>
                            <Dropdown
                                options={projects
                                    .filter(p => p.project_status === 'active' && !excludeProjectIds.map(String).includes(String(p.id)))
                                    .map(proj => ({
                                        value: proj.id.toString(),
                                        label: proj.name
                                    }))}
                                value={formData.project_id.toString()}
                                onChange={(val) => setFormData(prev => ({ ...prev, project_id: parseInt(val) || '' }))}
                                placeholder="Select project"
                            />
                        </div>
                    </div>

                    {/* Project-fit insights */}
                    {projectInsights && selectedProject && (() => {
                        const required = selectedProject.required_manpower || 0;
                        const allocated = allocations.filter(a => String(a.sub_project_id) === String(selectedProject.id)).length;
                        const remaining = required - allocated;
                        const req = Array.isArray(selectedProject.required_expertise) ? selectedProject.required_expertise : [];
                        const have = (candidateSkills || []).map(s => String(s).trim().toLowerCase());
                        const matched = req.filter(s => have.includes(String(s).trim().toLowerCase())).length;
                        const cap = capacity ? capacityPill(capacity.status) : null;
                        return (
                            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-slate-800 truncate">{selectedProject.name}</p>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase rounded border ${selectedProject.is_annotation ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                            {selectedProject.is_annotation ? 'Annotation' : 'Non-annotation'}
                                        </span>
                                        {selectedProject.priority && (
                                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded border bg-white text-slate-600 border-slate-200">{selectedProject.priority}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Manpower */}
                                <div>
                                    <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="flex items-center gap-1 text-slate-500 font-medium"><Users className="w-3.5 h-3.5" /> Manpower</span>
                                        <span className="font-bold text-slate-700">
                                            {allocated}{required ? ` / ${required}` : ''} allocated
                                            {required ? (remaining > 0 ? ` · needs ${remaining} more` : remaining === 0 ? ' · fully staffed' : ` · over by ${-remaining}`) : ''}
                                        </span>
                                    </div>
                                    {required > 0 && (
                                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${allocated >= required ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(100, (allocated / required) * 100)}%` }} />
                                        </div>
                                    )}
                                </div>

                                {/* Skill match */}
                                <div>
                                    <div className="flex items-center justify-between text-xs mb-1.5">
                                        <span className="flex items-center gap-1 text-slate-500 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Skill match</span>
                                        {req.length > 0 && <span className="font-bold text-slate-700">{matched} of {req.length} matched</span>}
                                    </div>
                                    {req.length === 0 ? (
                                        <p className="text-[11px] text-slate-400 italic">No specific skills required</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-1">
                                            {req.map(s => {
                                                const ok = have.includes(String(s).trim().toLowerCase());
                                                return <span key={s} className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border ${ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>{ok ? '✓ ' : ''}{s}</span>;
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Timeline & workload */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                                    <div className="flex items-center gap-1"><CalendarRange className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {selectedProject.start_date || '—'} → {selectedProject.end_date || 'open-ended'}</div>
                                    <div className="flex items-center gap-1"><Target className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {selectedProject.daily_target || 0}/day · {selectedProject.total_tasks || 0} tasks</div>
                                </div>

                                {/* Capacity status */}
                                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-1 text-slate-500 font-medium"><Activity className="w-3.5 h-3.5" /> Capacity</span>
                                    {capacityLoading ? (
                                        <span className="text-[11px] text-slate-400">Loading…</span>
                                    ) : capacityError ? (
                                        <span className="text-[11px] text-slate-400 italic">Couldn't load capacity</span>
                                    ) : cap ? (
                                        <span className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${cap.cls}`}>{cap.label}</span>
                                            <span className="text-[11px] text-slate-500">team {capacity.team_size ?? 0} · {Math.round(capacity.avg_daily_hours_per_employee ?? 0)}h/day</span>
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Date Range */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Start Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.active_start_date}
                                onChange={(e) => setFormData(prev => ({ ...prev, active_start_date: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                End Date (optional)
                            </label>
                            <input
                                type="date"
                                value={formData.active_end_date}
                                onChange={(e) => setFormData(prev => ({ ...prev, active_end_date: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Daily Hours */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Total Daily Hours (1-12)
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="12"
                            value={formData.total_daily_hours}
                            onChange={(e) => setFormData(prev => ({ ...prev, total_daily_hours: parseInt(e.target.value) || 8 }))}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="mt-1 text-xs text-gray-500">Hours per day for this allocation</p>
                    </div>

                    {/* Role Tagging */}
                    {!hideRoleTags && (
                    <div className="border border-gray-200 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Role Tags & Time Distribution</h3>

                        {/* Add Role */}
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRole())}
                                placeholder="Enter role (e.g., Annotation)"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                            <Button type="button" variant="blue" size="sm" onClick={handleAddRole}>
                                <Plus className="w-4 h-4" /> Add Role
                            </Button>
                        </div>

                        {/* Role Suggestions */}
                        {formData.role_tags.length === 0 && (
                            <div className="mb-4">
                                <p className="text-xs text-gray-500 mb-2">Suggestions:</p>
                                <div className="flex flex-wrap gap-2">
                                    {roleSuggestions.map(role => (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => {
                                                setNewRole(role);
                                                setTimeout(() => handleAddRole(), 0);
                                            }}
                                            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Time Distribution */}
                        {formData.role_tags.length > 0 && (
                            <div className="space-y-3">
                                {formData.role_tags.map(role => (
                                    <div key={role} className="flex items-center gap-3 bg-gray-50 p-3 rounded-md">
                                        <div className="flex-1">
                                            <label className="text-sm font-medium text-gray-700">{role}</label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                max={formData.total_daily_hours}
                                                value={formData.time_distribution[role] || 0}
                                                onChange={(e) => handleDistributionChange(role, e.target.value)}
                                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                                            />
                                            <span className="text-sm text-gray-500">hours</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveRole(role)}
                                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {/* Balance Indicator */}
                                <div className={`p-3 rounded-md ${isBalanced ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className={isBalanced ? 'text-green-800 font-medium' : 'text-yellow-800 font-medium'}>
                                            {isBalanced ? '✓ Balanced' : '⚠ Unbalanced'}
                                        </span>
                                        <span className={isBalanced ? 'text-green-700' : 'text-yellow-700'}>
                                            {totalDistributed} / {formData.total_daily_hours} hours allocated
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    )}

                    {/* Override Controls */}
                    {!hideOverride && (
                        <div className="border border-gray-200 rounded-lg p-4">
                            <label className="flex items-center gap-2 mb-3">
                                <input
                                    type="checkbox"
                                    checked={formData.override_flag}
                                    onChange={(e) => setFormData(prev => ({ ...prev, override_flag: e.target.checked }))}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700">Force Override (ignore warnings)</span>
                            </label>

                            {formData.override_flag && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Override Reason <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={formData.override_reason}
                                        onChange={(e) => setFormData(prev => ({ ...prev, override_reason: e.target.value }))}
                                        placeholder="Explain why this override is necessary..."
                                        rows="3"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        required={formData.override_flag}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                </Modal.Body>
                <Modal.Footer>
                    <Button type="button" variant="cancel" onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="blue">
                        {editingAllocation ? 'Update Allocation' : 'Create Allocation'}
                    </Button>
                </Modal.Footer>
            </form>
        </Modal>
    );
};

export default AllocationModalV2;
