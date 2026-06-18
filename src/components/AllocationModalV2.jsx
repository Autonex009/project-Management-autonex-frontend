import { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertCircle } from 'lucide-react';

const AllocationModalV2 = ({
    isOpen,
    onClose,
    onSubmit,
    employees = [],
    projects = [],
    editingAllocation = null
}) => {
    const [formData, setFormData] = useState({
        employee_id: '',
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

    if (!isOpen) return null;

    const totalDistributed = Object.values(formData.time_distribution).reduce((sum, h) => sum + h, 0);
    const isBalanced = totalDistributed === formData.total_daily_hours;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-full sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {editingAllocation ? 'Edit Allocation' : 'Create Allocation'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                            <select
                                value={formData.employee_id}
                                onChange={(e) => setFormData(prev => ({ ...prev, employee_id: parseInt(e.target.value) }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Select employee</option>
                                {employees.filter(e => e.status === 'active').map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.name} - {emp.employee_type}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Project <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.project_id}
                                onChange={(e) => setFormData(prev => ({ ...prev, project_id: parseInt(e.target.value) }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Select project</option>
                                {projects.filter(p => p.project_status === 'active').map(proj => (
                                    <option key={proj.id} value={proj.id}>
                                        {proj.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

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
                            <button
                                type="button"
                                onClick={handleAddRole}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                            >
                                <Plus className="w-4 h-4" /> Add Role
                            </button>
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

                    {/* Override Controls */}
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

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                        >
                            {editingAllocation ? 'Update Allocation' : 'Create Allocation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AllocationModalV2;
