import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { employeeApi, skillApi, allocationApi } from '../services/api';
import { Plus, Edit, Trash2, X, User, ChevronDown, CheckCircle, AlertCircle, Clock, ArrowUpCircle, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import SearchBar from '../components/ui/SearchBar';
import Table, { ColumnTemplates, formatDateDeterministic } from '../components/ui/Table';
import Dropdown from '../components/ui/Dropdown';
import Spinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

const LEAVE_TYPE_LABELS = {
  paid: 'Paid Leave',
  casual_sick: 'Casual/Sick',
  floater: 'Floater',
};

const LEAVE_TYPE_COLORS = {
  paid: 'bg-blue-100 text-blue-700',
  casual_sick: 'bg-emerald-100 text-emerald-700',
  floater: 'bg-amber-100 text-amber-700',
};

const STATUS_COLORS = {
  approved: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
};

function formatDateRange(start, end) {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const fmt = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return start === end ? fmt(s) : `${fmt(s)} â€“ ${fmt(e)}`;
}

function EmployeeAvailabilityModal({ employee, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['employee-availability', employee.id],
    queryFn: () => employeeApi.getAvailability(employee.id),
    staleTime: 30_000,
  });

  return (
    <Modal isOpen onClose={onClose} size="lg" maxHeight="90vh">
      <Modal.Header onClose={onClose}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">{employee.name}</h2>
            <p className="text-sm text-slate-400">{employee.designation || 'Employee'}</p>
          </div>
        </div>
      </Modal.Header>

      {isLoading ? (
        <Modal.Body>
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Loading availability...</div>
        </Modal.Body>
      ) : data ? (
        <Modal.Body className="space-y-6">
            {/* Availability Banner */}
            <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${data.available_next_30_days ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'}`}>
              {data.available_next_30_days
                ? <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                : <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              }
              <div>
                <p className={`text-sm font-semibold ${data.available_next_30_days ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {data.available_next_30_days ? 'Available for the next 30 days' : 'Has leave/WFH in the next 30 days'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">As of {new Date(data.today + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>

            {/* Upcoming Leaves */}
            {(data.upcoming_leaves.length > 0 || data.upcoming_wfh.length > 0) && (
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Upcoming (Next 30 Days)</h3>
                <div className="space-y-2">
                  {data.upcoming_leaves.map((leave) => (
                    <div key={leave.leave_id} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                      <div className="mt-0.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${LEAVE_TYPE_COLORS[leave.leave_type] || 'bg-slate-100 text-slate-600'}`}>
                          {LEAVE_TYPE_LABELS[leave.leave_type] || leave.leave_type}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700">{formatDateRange(leave.start_date, leave.end_date)}</p>
                        {leave.reason && <p className="text-xs text-slate-400 mt-0.5 truncate">{leave.reason}</p>}
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[leave.status] || 'bg-slate-100 text-slate-500'}`}>
                        {leave.status}
                      </span>
                    </div>
                  ))}
                  {data.upcoming_wfh.map((wfh) => (
                    <div key={wfh.id} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                      <div className="mt-0.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700">
                          ðŸ  WFH
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700">{new Date(wfh.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })}</p>
                        {wfh.reason && <p className="text-xs text-slate-400 mt-0.5 truncate">{wfh.reason}</p>}
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[wfh.status] || 'bg-slate-100 text-slate-500'}`}>
                        {wfh.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Past Leaves */}
            {(data.past_leaves.length > 0 || data.past_wfh.length > 0) && (
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Past 30 Days
                </h3>
                <div className="space-y-2">
                  {data.past_leaves.map((leave) => (
                    <div key={leave.leave_id} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="mt-0.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${LEAVE_TYPE_COLORS[leave.leave_type] || 'bg-slate-100 text-slate-600'}`}>
                          {LEAVE_TYPE_LABELS[leave.leave_type] || leave.leave_type}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-600">{formatDateRange(leave.start_date, leave.end_date)}</p>
                        {leave.reason && <p className="text-xs text-slate-400 mt-0.5 truncate">{leave.reason}</p>}
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[leave.status] || 'bg-slate-100 text-slate-500'}`}>
                        {leave.status}
                      </span>
                    </div>
                  ))}
                  {data.past_wfh.map((wfh) => (
                    <div key={wfh.id} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="mt-0.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700">
                          ðŸ  WFH
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-600">{new Date(wfh.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })}</p>
                        {wfh.reason && <p className="text-xs text-slate-400 mt-0.5 truncate">{wfh.reason}</p>}
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[wfh.status] || 'bg-slate-100 text-slate-500'}`}>
                        {wfh.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {data.upcoming_leaves.length === 0 && data.upcoming_wfh.length === 0 &&
             data.past_leaves.length === 0 && data.past_wfh.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">No leave or WFH records in the past or next 30 days.</p>
            )}
        </Modal.Body>
      ) : null}
    </Modal>
  );
}

function EmployeeArchiveModal({ employee, onClose, onConfirm, isPending }) {
  const { data: allocations, isLoading } = useQuery({
    queryKey: ['employee-allocations-archive', employee.id],
    queryFn: () => allocationApi.getByEmployee(employee.id),
    staleTime: 0,
  });

  const hasAllocations = allocations && allocations.length > 0;

  return (
    <Modal isOpen onClose={onClose} size="md" maxHeight="90vh">
      <Modal.Header onClose={onClose}>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${hasAllocations ? 'bg-amber-50 text-amber-500' : 'bg-red-50 text-red-500'}`}>
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              {hasAllocations ? 'Cannot Archive Employee' : 'Archive Employee'}
            </h2>
            <p className="text-sm text-slate-400">{employee.name}</p>
          </div>
        </div>
      </Modal.Header>

      {isLoading ? (
        <Modal.Body>
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
            <Spinner size="sm" color="indigo" text="Checking allocations..." />
          </div>
        </Modal.Body>
      ) : (
        <>
          <Modal.Body className="space-y-4">
            {hasAllocations ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600 leading-relaxed">
                  <strong>{employee.name}</strong> cannot be archived because they are currently allocated to the following projects. Please remove their allocations first:
                </p>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto">
                  {allocations.map((alloc) => (
                    <div key={alloc.id} className="flex justify-between items-center text-xs text-slate-700 font-medium">
                      <span>{alloc.sub_project_name || alloc.project_name || `Project (ID: ${alloc.sub_project_id})`}</span>
                      <span className="text-slate-400 font-normal">{alloc.total_daily_hours}h/day ({alloc.allocation_percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  Are you sure you want to archive <strong>{employee.name}</strong>?
                </p>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2.5">
                  <div className="flex gap-2.5 text-xs text-amber-850 leading-relaxed">
                    <span className="flex-shrink-0">ðŸ”’</span>
                    <span>System access to the portal will be immediately revoked.</span>
                  </div>
                  <div className="flex gap-2.5 text-xs text-amber-850 leading-relaxed">
                    <span className="flex-shrink-0">ðŸ“</span>
                    <span>All historical data (leaves, project allocations history) will be preserved for records.</span>
                  </div>
                  <div className="flex gap-2.5 text-xs text-amber-850 leading-relaxed">
                    <span className="flex-shrink-0">ðŸ”„</span>
                    <span>You can restore this employee at any time from the "Archived / Former" tab.</span>
                  </div>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            {hasAllocations ? (
              <Button variant="cancel" onClick={onClose}>Close</Button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <Button variant="warning" onClick={onConfirm} disabled={isPending} isLoading={isPending}>
                  {!isPending && 'Archive'}
                </Button>
              </>
            )}
          </Modal.Footer>
        </>
      )}
    </Modal>
  );
}

function EmployeeRestoreModal({ employee, onClose, onConfirm, isPending }) {
  return (
    <Modal isOpen onClose={onClose} size="md" maxHeight="90vh">
      <Modal.Header onClose={onClose}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center flex-shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">Restore Employee</h2>
            <p className="text-sm text-slate-400">{employee.name}</p>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="space-y-4">
        <p className="text-sm text-slate-600 leading-relaxed">
          Are you sure you want to restore <strong>{employee.name}</strong> as an active employee?
        </p>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-2.5">
          <div className="flex gap-2.5 text-xs text-emerald-850 leading-relaxed">
            <span className="flex-shrink-0">ðŸ”‘</span>
            <span>Their portal account will be reactivated, allowing them to log in again.</span>
          </div>
          <div className="flex gap-2.5 text-xs text-emerald-850 leading-relaxed">
            <span className="flex-shrink-0">ðŸ‘¥</span>
            <span>They will show up in the active employee list.</span>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="cancel" onClick={onClose}>Cancel</Button>
        <Button variant="success" onClick={onConfirm} disabled={isPending} isLoading={isPending}>
          {!isPending && 'Restore'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function EmployeeConvertToFulltimeModal({ employee, onClose, onConfirm, isPending }) {
  return (
    <Modal isOpen onClose={onClose} size="md" maxHeight="90vh">
      <Modal.Header onClose={onClose}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center flex-shrink-0">
            <ArrowUpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">Convert to Full-time</h2>
            <p className="text-sm text-slate-400">{employee.name}</p>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="space-y-4">
        <p className="text-sm text-slate-600 leading-relaxed">
          Convert <strong>{employee.name}</strong> from Intern to Full-time employee?
        </p>
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-2.5">
          <div className="flex gap-2.5 text-xs text-indigo-850 leading-relaxed">
            <span className="flex-shrink-0">ðŸ“</span>
            <span>This updates the existing record in place â€” all leave, payroll, performance and other history is preserved.</span>
          </div>
          <div className="flex gap-2.5 text-xs text-indigo-850 leading-relaxed">
            <span className="flex-shrink-0">ðŸï¸</span>
            <span>Full-time leave entitlements will apply going forward.</span>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="cancel" onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} disabled={isPending} isLoading={isPending}>
          {!isPending && 'Convert'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

const ALLOWED_DESIGNATIONS = ['Admin', 'Annotator/ Reviewer', 'Program Manager', 'Developer'];

// Custom Multi-Select Dropdown Component
const MultiSelectDropdown = ({ name, defaultValue = [], predefinedSkills, queryClient, required = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState(defaultValue);
  const [customSkill, setCustomSkill] = useState('');
  const [allSkills, setAllSkills] = useState(predefinedSkills);
  const dropdownRef = useRef(null);

  // Update allSkills when predefinedSkills changes
  useEffect(() => {
    setAllSkills(predefinedSkills);
  }, [predefinedSkills]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSkill = (skill) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const addCustomSkill = async () => {
    const skill = customSkill.trim();
    if (skill && !allSkills.includes(skill)) {
      // Add to local state immediately
      setAllSkills(prev => [...prev, skill]);
      setSelectedSkills(prev => [...prev, skill]);
      setCustomSkill('');

      // Create skill in backend and refresh the list
      try {
        await skillApi.create({ name: skill });
        queryClient.invalidateQueries(['skills']);
      } catch (error) {
        console.error('Failed to create skill:', error);
        toast.error('Failed to create custom skill');
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomSkill();
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Hidden input to submit form data */}
      <input
        type="hidden"
        name={name}
        value={selectedSkills.join(',')}
      />

      {/* Dropdown trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white cursor-pointer flex items-center justify-between min-h-[42px]"
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {selectedSkills.length > 0 ? (
            selectedSkills.map((skill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 border border-blue-200"
              >
                {skill}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleSkill(skill); }}
                  className="hover:text-red-600 transition-colors"
                  title="Remove skill"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm">Select skills...</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-350 rounded-lg shadow-xl max-h-80 flex flex-col overflow-hidden">
          <div className="overflow-y-auto flex-1">
            {allSkills.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No skills available. Add one below!
              </div>
            ) : (
              allSkills.map((skill) => (
                <div
                  key={skill}
                  className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors group"
                >
                  <label className="flex items-center flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSkills.includes(skill)}
                      onChange={() => toggleSkill(skill)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-900">{skill}</span>
                  </label>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const skillObj = (queryClient.getQueryData(['skills']) || []).find(s => s.name === skill);
                        if (skillObj) {
                          await skillApi.delete(skillObj.id);
                          queryClient.invalidateQueries(['skills']);
                        }
                        setAllSkills(prev => prev.filter(s => s !== skill));
                        setSelectedSkills(prev => prev.filter(s => s !== skill));
                        toast.success(`Skill "${skill}" deleted`);
                      } catch (err) {
                        toast.error('Failed to delete skill');
                      }
                    }}
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 transition-opacity"
                    title="Delete skill"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add custom skill section */}
          <div className="border-t border-slate-200 p-3 bg-slate-50 flex-shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add custom skill..."
                className="flex-1 px-3 py-1.5 text-sm border border-slate-350 rounded-md focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
              />
              <Button type="button" variant="blue" size="sm" onClick={addCustomSkill}>Add</Button>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400 font-medium">Press Enter or click Add</p>
          </div>
        </div>
      )}
    </div>
  );
};

const DesignationMultiSelect = ({ options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (opt) => {
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-100 outline-none min-w-[160px] justify-between"
      >
        <span className={value.length === 0 ? 'text-slate-500' : 'text-slate-800 font-medium'}>
          {value.length === 0 ? 'All Designations' : value.length === 1 ? value[0] : `${value.length} selected`}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] bg-white border border-slate-200 rounded-lg shadow-lg py-1">
          {value.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="w-full text-left px-4 py-1.5 text-xs text-slate-400 hover:text-slate-600 border-b border-slate-100 mb-1"
            >
              Clear all
            </button>
          )}
          {options.map(opt => (
            <label key={opt} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={value.includes(opt)}
                onChange={() => toggle(opt)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <span className="text-slate-700">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

const EmployeesPage = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const idleOnly = searchParams.get('idleOnly') === 'true';
  const statusParam = searchParams.get('status');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [availabilityEmployee, setAvailabilityEmployee] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [convertToFulltimeTarget, setConvertToFulltimeTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [formDesignation, setFormDesignation] = useState('Annotator/ Reviewer');
  const [formEmployeeType, setFormEmployeeType] = useState('Full-time');
  const [formEmpStatus, setFormEmpStatus] = useState('active');
  const PAGE_SIZE = 10;

  // Fetch employees
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees', statusParam],
    queryFn: () => {
      if (statusParam === 'active') {
        return employeeApi.getActive();
      } else if (statusParam === 'inactive') {
        return employeeApi.getInactive();
      } else if (statusParam === 'idle') {
        return employeeApi.getIdle();
      } else {
        return employeeApi.getAll(statusParam ? { status: statusParam } : {});
      }
    },
  });

  // Fetch all allocations so we can show assigned projects per employee
  const { data: allocations = [], isLoading: allocationsLoading } = useQuery({
    queryKey: ['allocations'],
    queryFn: allocationApi.getAll,
  });

  // Build employee_id â†’ Set<project_name> map
  const employeeProjectsMap = allocations.reduce((map, alloc) => {
    const projectName = alloc.sub_project_name || alloc.project_name;
    if (!projectName) return map;
    if (!map[alloc.employee_id]) map[alloc.employee_id] = new Set();
    map[alloc.employee_id].add(projectName);
    return map;
  }, {});

  // Fetch skills from API
  const { data: skillsData = [], isLoading: skillsLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: skillApi.getAll,
  });

  // Extract skill names from the API response
  const predefinedSkills = skillsData.map(skill => skill.name);

  const createMutation = useMutation({
    mutationFn: employeeApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      queryClient.invalidateQueries(['skills']); // Refresh skills in case new ones were added
      setIsModalOpen(false);
      toast.success('Employee created successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to create employee');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => employeeApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      queryClient.invalidateQueries(['skills']); // Refresh skills in case new ones were added
      setIsModalOpen(false);
      setEditingEmployee(null);
      toast.success('Employee updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to update employee');
    }
  });

  const archiveMutation = useMutation({
    mutationFn: employeeApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      toast.success('Employee archived successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to archive employee');
    }
  });

  const restoreMutation = useMutation({
    mutationFn: employeeApi.restore,
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      toast.success('Employee restored successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to restore employee');
    }
  });

  const convertMutation = useMutation({
    mutationFn: ({ id, converted_by }) => employeeApi.convertToFulltime(id, { converted_by }),
    onSuccess: (emp) => {
      queryClient.invalidateQueries(['employees']);
      toast.success(`${emp.name} converted to Full-time`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to convert employee');
    },
  });

  const handleConvertToFulltime = (employee) => {
    setConvertToFulltimeTarget(employee);
  };

  const closeEmployeeModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    setFormDesignation('Annotator/ Reviewer');
    setFormEmployeeType('Full-time');
    setFormEmpStatus('active');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const skillsRaw = formData.get('skills');
    const skills = skillsRaw ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    if (skills.length === 0) {
      toast.error('Please select at least one skill');
      return;
    }

    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      razorpay_email: formData.get('razorpay_email') || null,
      encord_id: formData.get('encord_id') || null,
      employee_type: formData.get('employee_type'),
      designation: formData.get('designation') || 'Annotator/ Reviewer',
      working_hours_per_day: parseFloat(formData.get('working_hours_per_day')),
      weekly_availability: parseFloat(formData.get('weekly_availability')),
      skills,
      // productivity_baseline removed
      status: formData.get('status') || 'active',
    };

    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'active': 'badge-green',
      'inactive': 'badge-gray',
      'on-leave': 'badge-yellow',
    };
    return badges[status?.toLowerCase()] || 'badge-blue';
  };

  const getTypeBadge = (type) => {
    const badges = {
      'Full-time': 'badge-blue',
      'Part-time': 'badge-purple',
      'Intern': 'badge-orange',
      'Contract': 'badge-gray',
    };
    return badges[type] || 'badge-gray';
  };

  const designationOptions = Array.from(
    new Set(employees.map((employee) => employee.designation).filter(Boolean))
  ).sort();

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch = employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (employee.designation && employee.designation.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSkill = !skillFilter || (employee.skills && employee.skills.includes(skillFilter));
    const matchesDesignation = designationFilter.length === 0 || designationFilter.includes(employee.designation);
    const isIdle = !employeeProjectsMap[employee.id];
    const matchesIdle = !idleOnly || isIdle;
    const matchesStatus = (() => {
      if (!statusParam) {
        return employee.status?.toLowerCase() !== 'archived';
      }
      if (statusParam === 'archived') {
        return employee.status?.toLowerCase() === 'archived';
      }
      if (statusParam === 'active') {
        return employee.status?.toLowerCase() === 'active';
      }
      if (statusParam === 'inactive') {
        return employee.status?.toLowerCase() === 'inactive';
      }
      if (statusParam === 'idle') {
        return employee.status?.toLowerCase() === 'active' && isIdle;
      }
      return employee.status?.toLowerCase() === statusParam.toLowerCase();
    })();
    return matchesSearch && matchesSkill && matchesDesignation && matchesIdle && matchesStatus;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, skillFilter, designationFilter, idleOnly, statusParam]);



  return (
    <div className="space-y-6 p-2">
      {/* Page Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
              <p className="text-slate-500 text-sm mt-0.5">Manage team members and their availability</p>
            </div>
            <div className="flex flex-col items-center px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
              <span className="text-2xl font-bold text-indigo-700 leading-none">{filteredEmployees.length}</span>
              <span className="text-xs text-indigo-500 mt-0.5">{filteredEmployees.length === employees.length ? 'employees' : `of ${employees.length}`}</span>
            </div>
          </div>
        </div>
        {/* Tabs for Active Team vs Archived */}
        <div className="flex border-b border-slate-200 mt-2 mb-1">
          <button
            onClick={() => {
              const params = new URLSearchParams(searchParams);
              params.delete('status');
              setSearchParams(params);
            }}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              statusParam !== 'archived'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Active Team
          </button>
          <button
            onClick={() => {
              const params = new URLSearchParams(searchParams);
              params.set('status', 'archived');
              setSearchParams(params);
            }}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              statusParam === 'archived'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Archived / Former
          </button>
        </div>
        {/* Filters + Search + Add button on one row */}
        <div className="flex flex-wrap items-center gap-2">
          <Dropdown
            options={[{ value: '', label: 'All Skills' }, ...predefinedSkills.map(s => ({ value: s, label: s }))]}
            value={skillFilter}
            onChange={(val) => { setSkillFilter(val); setCurrentPage(1); }}
            placeholder="All Skills"
            optionsClassName='w-40'
          />

          <DesignationMultiSelect
            options={designationOptions}
            value={designationFilter}
            onChange={(val) => { setDesignationFilter(val); setCurrentPage(1); }}
          />

          {statusParam !== 'archived' && (
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200/50">
              {['all', 'active', 'inactive', 'idle'].map((s) => {
                const label = s.charAt(0).toUpperCase() + s.slice(1);
                const isActive = (s === 'all' && !statusParam) || statusParam === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      const params = new URLSearchParams(searchParams);
                      if (s === 'all') {
                        params.delete('status');
                      } else {
                        params.set('status', s);
                      }
                      setSearchParams(params);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      isActive
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          <SearchBar responsive
            value={searchQuery}
            onChange={(val) => { setSearchQuery(val); setCurrentPage(1); }}
            placeholder="Search employees..."
          />

          <Button onClick={() => { setEditingEmployee(null); setFormDesignation('Annotator/ Reviewer'); setFormEmployeeType('Full-time'); setFormEmpStatus('active'); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Active Filters Bar */}
      {(idleOnly || statusParam) && (
        <div className="flex items-center gap-2 flex-wrap bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2.5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Filters:</span>
          {idleOnly && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
              Idle Only
              <Button variant="ghost" size="icon" onClick={() => { const params = new URLSearchParams(searchParams); params.delete('idleOnly'); setSearchParams(params); }} className="rounded-full !p-0 w-4 h-4">
                <X className="w-3 h-3" />
              </Button>
            </span>
          )}
          {statusParam && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
              Status: {statusParam}
              <Button variant="ghost" size="icon" onClick={() => { const params = new URLSearchParams(searchParams); params.delete('status'); setSearchParams(params); }} className="rounded-full !p-0 w-4 h-4">
                <X className="w-3 h-3" />
              </Button>
            </span>
          )}
          <Button variant="link" onClick={() => { const params = new URLSearchParams(searchParams); params.delete('idleOnly'); params.delete('status'); setSearchParams(params); }} className="ml-auto text-xs text-slate-500 hover:text-slate-800">
            Clear all
          </Button>
        </div>
      )}

      <Table
        loading={isLoading || skillsLoading || allocationsLoading}
        columns={[
          ColumnTemplates.avatarInfo('name', 'Employee', 'email'),
          ColumnTemplates.text('designation', 'Designation'),
          {
            key: 'employee_type',
            label: 'Type',
            align: 'center',
            render: (value, row) => (
              <div className="flex flex-col items-center gap-1">
                <span className={`inline-flex px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide min-w-[95px] justify-center ${
                  value === 'Full-time' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  value === 'Part-time' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                  'bg-slate-50 text-slate-600 border border-slate-200'
                }`}>
                  {value}
                </span>
                {row.converted_to_fulltime_at && (
                  <p className="text-[10px] text-slate-400 font-medium" title={`Promoted from ${row.previous_employee_type || 'Intern'} on ${formatDateDeterministic(row.converted_to_fulltime_at)}`}>
                    promoted {formatDateDeterministic(row.converted_to_fulltime_at)}
                  </p>
                )}
              </div>
            ),
          },
          {
            key: 'working_hours_per_day',
            label: 'Hours/Day',
            align: 'center',
            render: (value) => <span className="font-semibold text-slate-800">{value}h</span>,
          },
          {
            key: 'skills',
            label: 'Skills',
            render: (value) => (
              <div className="text-xs text-slate-600 font-medium">
                {value && value.length > 0 ? (
                  <>
                    <span>{value.slice(0, 3).join(', ')}</span>
                    {value.length > 3 && <span className="text-slate-400"> +{value.length - 3}</span>}
                  </>
                ) : (
                  <span className="text-slate-400">â€”</span>
                )}
              </div>
            ),
          },
          {
            key: 'assigned_projects',
            label: 'Assigned Projects',
            render: (_, row) => {
              const projects = employeeProjectsMap[row.id];
              if (!projects || projects.size === 0) {
                return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Idle</span>;
              }
              const list = [...projects];
              return (
                <div className="flex flex-wrap gap-1">
                  {list.slice(0, 2).map((name, idx) => (
                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 max-w-[140px] truncate" title={name}>
                      {name}
                    </span>
                  ))}
                  {list.length > 2 && (
                    <span className="text-xs text-slate-400 self-center" title={list.slice(2).join(', ')}>
                      +{list.length - 2}
                    </span>
                  )}
                </div>
              );
            },
          },
          {
            key: 'status',
            label: 'Status',
            align: 'center',
            render: (value) => (
              <div className="flex items-center justify-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  value === 'active' ? 'bg-emerald-500' :
                  value === 'on-leave' ? 'bg-amber-500' :
                  'bg-slate-400'
                }`}></span>
                <span className="text-sm text-slate-600 capitalize">{value}</span>
              </div>
            ),
          },
          {
            key: 'actions',
            label: 'Actions',
            align: 'right',
            render: (_, row) => (
              <div className="flex items-center justify-end gap-1">
                {statusParam === 'archived' ? (
                  <button
                    onClick={() => setRestoreTarget(row)}
                    disabled={restoreMutation.isPending}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Restore Employee"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                ) : (
                  <>
                    {row.employee_type === 'Intern' && (
                      <button
                        onClick={() => handleConvertToFulltime(row)}
                        disabled={convertMutation.isPending}
                        className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Convert to Full-time employee"
                      >
                        <ArrowUpCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingEmployee(row);
                        setFormDesignation(row.designation || 'Annotator/ Reviewer');
                        setFormEmployeeType(row.employee_type || 'Full-time');
                        setFormEmpStatus(row.status || 'active');
                        setIsModalOpen(true);
                      }}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setArchiveTarget(row)}
                      disabled={archiveMutation.isPending}
                      className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Archive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            ),
          },
        ]}
        data={filteredEmployees}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
        emptyState={{ title: 'No employees found', description: 'Try adjusting your search query' }}
      />

      {/* Availability Modal */}
      {availabilityEmployee && (
        <EmployeeAvailabilityModal
          employee={availabilityEmployee}
          onClose={() => setAvailabilityEmployee(null)}
        />
      )}

      {/* Archive Modal */}
      {archiveTarget && (
        <EmployeeArchiveModal
          employee={archiveTarget}
          onClose={() => setArchiveTarget(null)}
          onConfirm={() => {
            archiveMutation.mutate(archiveTarget.id);
            setArchiveTarget(null);
          }}
          isPending={archiveMutation.isPending}
        />
      )}

      {/* Restore Modal */}
      {restoreTarget && (
        <EmployeeRestoreModal
          employee={restoreTarget}
          onClose={() => setRestoreTarget(null)}
          onConfirm={() => {
            restoreMutation.mutate(restoreTarget.id);
            setRestoreTarget(null);
          }}
          isPending={restoreMutation.isPending}
        />
      )}

      {/* Convert to Full-time Modal */}
      {convertToFulltimeTarget && (
        <EmployeeConvertToFulltimeModal
          employee={convertToFulltimeTarget}
          onClose={() => setConvertToFulltimeTarget(null)}
          onConfirm={() => {
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            convertMutation.mutate({ id: convertToFulltimeTarget.id, converted_by: currentUser.id || null });
            setConvertToFulltimeTarget(null);
          }}
          isPending={convertMutation.isPending}
        />
      )}

      <Modal isOpen={isModalOpen} onClose={closeEmployeeModal} size="2xl" maxHeight="95vh">
        <Modal.Header onClose={closeEmployeeModal}>
          <h2 className="text-xl font-semibold text-gray-900">
            {editingEmployee ? 'Edit Employee' : 'Add Employee'}
          </h2>
        </Modal.Header>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0" id="employee-form">
          <Modal.Body className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        defaultValue={editingEmployee?.name}
                        className="input"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Slack Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        defaultValue={editingEmployee?.email}
                        className="input"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Razorpay Email
                      </label>
                      <input
                        type="email"
                        name="razorpay_email"
                        defaultValue={editingEmployee?.razorpay_email}
                        className="input"
                        placeholder="john.razorpay@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Encord ID / Email
                      </label>
                      <input
                        type="text"
                        name="encord_id"
                        defaultValue={editingEmployee?.encord_id}
                        className="input"
                        placeholder="john.encord@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Designation <span className="text-red-500">*</span>
                      </label>
                      <input type="hidden" name="designation" value={formDesignation} />
                      <Dropdown
                        options={ALLOWED_DESIGNATIONS.map(d => ({ value: d, label: d }))}
                        value={formDesignation}
                        onChange={setFormDesignation}
                        placeholder="Select designation"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type <span className="text-red-500">*</span>
                      </label>
                      <input type="hidden" name="employee_type" value={formEmployeeType} />
                      <Dropdown
                        options={[
                          { value: 'Full-time', label: 'Full-time' },
                          { value: 'Part-time', label: 'Part-time' },
                          { value: 'Intern', label: 'Intern' },
                          { value: 'Contract', label: 'Contract' },
                        ]}
                        value={formEmployeeType}
                        onChange={setFormEmployeeType}
                        placeholder="Select type"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hours/Day <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="working_hours_per_day"
                        required
                        step="0.5"
                        min="1"
                        max="24"
                        defaultValue={editingEmployee?.working_hours_per_day || 8}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hours/Week <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="weekly_availability"
                        required
                        step="0.5"
                        min="1"
                        max="168"
                        defaultValue={editingEmployee?.weekly_availability || 40}
                        className="input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <input type="hidden" name="status" value={formEmpStatus} />
                      <Dropdown
                        options={[
                          { value: 'active', label: 'Active' },
                          { value: 'inactive', label: 'Inactive' },
                          { value: 'on-leave', label: 'On Leave' },
                        ]}
                        value={formEmpStatus}
                        onChange={setFormEmpStatus}
                        placeholder="Select status"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Skills <span className="text-red-500">*</span>
                    </label>
                    <MultiSelectDropdown
                      name="skills"
                      defaultValue={editingEmployee?.skills || []}
                      predefinedSkills={predefinedSkills}
                      queryClient={queryClient}
                    />
                  </div>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="cancel" onClick={closeEmployeeModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="employee-form"
              disabled={createMutation.isPending || updateMutation.isPending}
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {!(createMutation.isPending || updateMutation.isPending) && (editingEmployee ? 'Update Employee' : 'Create Employee')}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
};

export default EmployeesPage;
