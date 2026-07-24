import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { employeeApi, skillApi, allocationApi } from '../services/api';
import { Plus, Edit, Trash2, X, User, ChevronDown, CheckCircle, AlertCircle, Clock, ArrowUpCircle, RotateCcw, MoreVertical, Users, UserCheck, Briefcase, Award, ShieldCheck } from 'lucide-react';
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

function EmployeeActionMenu({
  row,
  statusParam,
  setRestoreTarget,
  handleConvertToFulltime,
  setEditingEmployee,
  setFormDesignation,
  setFormEmployeeType,
  setFormWorkModel,
  setFormEmpStatus,
  setIsModalOpen,
  setArchiveTarget,
  convertPending,
  restorePending,
  archivePending,
  isNearBottom,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const positionClass = isNearBottom ? 'bottom-full mb-1.5' : 'top-full mt-1.5';

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors ${isOpen ? 'bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-zinc-200' : ''
          }`}
        title="More Actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 ${positionClass} z-50 w-44 bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-slate-200/80 dark:border-neutral-800 py-1 text-xs font-medium focus:outline-none`}
          onClick={(e) => e.stopPropagation()}
        >
          {statusParam === 'archived' ? (
            <button
              onClick={() => {
                setIsOpen(false);
                setRestoreTarget(row);
              }}
              disabled={restorePending}
              className="w-full text-left px-3 py-2 text-slate-700 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-500" />
              <span>Restore Employee</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setEditingEmployee(row);
                  setFormDesignation(row.designation || 'Annotator/ Reviewer');
                  setFormEmployeeType(row.employee_type || 'Full-time');
                  setFormWorkModel(row.work_model || 'WFO');
                  setFormEmpStatus(row.status || 'active');
                  setIsModalOpen(true);
                }}
                className="w-full text-left px-3 py-2 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-neutral-800/60 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 transition-colors"
              >
                <Edit className="w-3.5 h-3.5 text-slate-400" />
                <span>Edit Profile</span>
              </button>

              {row.employee_type === 'Intern' && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleConvertToFulltime(row);
                  }}
                  disabled={convertPending}
                  className="w-full text-left px-3 py-2 text-slate-700 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Promote to Full-time</span>
                </button>
              )}

              <div className="my-1 border-t border-slate-100 dark:border-neutral-800" />

              <button
                onClick={() => {
                  setIsOpen(false);
                  setArchiveTarget(row);
                }}
                disabled={archivePending}
                className="w-full text-left px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Archive</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [formWorkModel, setFormWorkModel] = useState('WFO');
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

  // Fetch all employees for organization KPI calculations
  const { data: allEmployeesData = [] } = useQuery({
    queryKey: ['all-employees-kpis'],
    queryFn: () => employeeApi.getAll({ include_archived: true }),
  });

  const allStaff = allEmployeesData.length > 0 ? allEmployeesData : employees;

  // Build employee_id -> Set<project_name> map (excluding inactive employees)
  const employeeProjectsMap = allocations.reduce((map, alloc) => {
    const emp = allStaff.find(e => String(e.id) === String(alloc.employee_id));
    if (emp && (emp.status || '').toLowerCase() === 'inactive') {
      return map;
    }
    const projectName = alloc.sub_project_name || alloc.project_name;
    if (!projectName) return map;
    if (!map[alloc.employee_id]) map[alloc.employee_id] = new Set();
    map[alloc.employee_id].add(projectName);
    return map;
  }, {});

  // Auto-cleanup: remove any existing database allocations for employees currently set to 'inactive'
  useEffect(() => {
    if (allocations.length > 0 && allStaff.length > 0) {
      const inactiveEmpIds = new Set(
        allStaff.filter(e => (e.status || '').toLowerCase() === 'inactive').map(e => String(e.id))
      );
      const staleAllocations = allocations.filter(a => inactiveEmpIds.has(String(a.employee_id)));
      if (staleAllocations.length > 0) {
        Promise.allSettled(staleAllocations.map(a => allocationApi.delete(a.id))).then(() => {
          queryClient.invalidateQueries(['allocations']);
        });
      }
    }
  }, [allocations, allStaff, queryClient]);

  // KPI Classification 1: Status (Active, Inactive, Idle)
  const activeCount = allStaff.filter(e => (e.status || 'active').toLowerCase() === 'active').length;
  const inactiveCount = allStaff.filter(e => (e.status || '').toLowerCase() === 'inactive').length;
  const idleCount = allStaff.filter(e => {
    const isActive = (e.status || 'active').toLowerCase() === 'active';
    const isIdle = !employeeProjectsMap[e.id] || employeeProjectsMap[e.id].size === 0;
    return isActive && isIdle;
  }).length;

  // KPI Classification 2: Type (Full-time, Intern, Contract)
  const fullTimeCount = allStaff.filter(e => {
    const t = (e.employee_type || '').toLowerCase();
    return t.includes('full') || t === 'fulltime';
  }).length;

  const internCount = allStaff.filter(e => {
    const t = (e.employee_type || '').toLowerCase();
    return t.includes('intern');
  }).length;

  const contractCount = allStaff.filter(e => {
    const t = (e.employee_type || '').toLowerCase();
    return t.includes('contract') || t.includes('part');
  }).length;

  // KPI Classification 3: Roles (Project Managers, Annotator/Reviewer, QC)
  const pmCount = allStaff.filter(e => {
    const d = (e.designation || '').toLowerCase();
    return d.includes('manager') || d.includes('pm') || d.includes('lead');
  }).length;

  const annotatorCount = allStaff.filter(e => {
    const d = (e.designation || '').toLowerCase();
    return d.includes('annotator') || d.includes('reviewer');
  }).length;

  const qcCount = allStaff.filter(e => {
    const d = (e.designation || '').toLowerCase();
    return d.includes('qc') || d.includes('quality');
  }).length;

  // KPI Classification 4: Work Model (WFO, WFH, Hybrid)
  const wfoCount = allStaff.filter(e => {
    const wm = (e.work_model || 'WFO').toUpperCase();
    return wm === 'WFO' || wm.includes('OFFICE');
  }).length;

  const wfhCount = allStaff.filter(e => {
    const wm = (e.work_model || '').toUpperCase();
    return wm === 'WFH' || wm.includes('HOME');
  }).length;

  const hybridCount = allStaff.filter(e => {
    const wm = (e.work_model || '').toUpperCase();
    return wm === 'HYBRID';
  }).length;

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
    mutationFn: async ({ id, data, previousStatus }) => {
      const res = await employeeApi.update(id, data);
      const newStatus = (data.status || '').toLowerCase();
      const oldStatus = (previousStatus || '').toLowerCase();

      // If status changed to 'inactive', automatically remove all assigned project allocations
      if (newStatus === 'inactive' && oldStatus !== 'inactive') {
        const empAllocations = allocations.filter(a => String(a.employee_id) === String(id));
        if (empAllocations.length > 0) {
          await Promise.allSettled(empAllocations.map(a => allocationApi.delete(a.id)));
        }
      }
      return res;
    },
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries(['employees']);
      queryClient.invalidateQueries(['all-employees-kpis']);
      queryClient.invalidateQueries(['allocations']);
      queryClient.invalidateQueries(['skills']);
      setIsModalOpen(false);
      setEditingEmployee(null);

      const newStatus = (variables?.data?.status || '').toLowerCase();
      const oldStatus = (variables?.previousStatus || '').toLowerCase();
      if (newStatus === 'inactive' && oldStatus !== 'inactive') {
        toast.success('Status updated to Inactive and assigned projects removed');
      } else {
        toast.success('Employee updated successfully');
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to update employee');
    }
  });

  const archiveMutation = useMutation({
    mutationFn: async (id) => {
      const res = await employeeApi.delete(id);
      const empAllocations = allocations.filter(a => String(a.employee_id) === String(id));
      if (empAllocations.length > 0) {
        await Promise.allSettled(empAllocations.map(a => allocationApi.delete(a.id)));
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      queryClient.invalidateQueries(['all-employees-kpis']);
      queryClient.invalidateQueries(['allocations']);
      toast.success('Employee archived and projects unassigned');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to archive employee');
    }
  });

  const restoreMutation = useMutation({
    mutationFn: employeeApi.restore,
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      queryClient.invalidateQueries(['all-employees-kpis']);
      queryClient.invalidateQueries(['allocations']);
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
      queryClient.invalidateQueries(['all-employees-kpis']);
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
    setFormWorkModel('WFO');
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
      employee_type: formData.get('employee_type'),
      work_model: formData.get('work_model') || 'WFO',
      designation: formData.get('designation') || 'Annotator/ Reviewer',
      working_hours_per_day: parseFloat(formData.get('working_hours_per_day')),
      weekly_availability: parseFloat(formData.get('weekly_availability')),
      skills,
      // productivity_baseline removed
      status: formData.get('status') || 'active',
    };

    if (editingEmployee) {
      updateMutation.mutate({
        id: editingEmployee.id,
        data,
        previousStatus: editingEmployee.status || 'active'
      });
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
    new Set(allStaff.map((employee) => employee.designation).filter(Boolean))
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
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Employees</h1>
              <p className="text-slate-500 dark:text-zinc-400 text-[13px] mt-0.5">Manage team members and their availability</p>
            </div>
          </div>
        </div>

        {/* KPI Overview Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-1 mb-1">
          {/* KPI 1: Total Employees */}
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200/60 dark:border-neutral-800 rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider truncate">
                  TOTAL EMPLOYEES
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-normal text-slate-800 dark:text-white tracking-tight flex-shrink-0">
                {allStaff.length}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between text-[11px] gap-1 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span className="text-slate-500 dark:text-zinc-400 font-normal">WFO:</span>
                <span className="font-normal text-indigo-600 dark:text-indigo-400">{wfoCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                <span className="text-slate-500 dark:text-zinc-400 font-normal">WFH:</span>
                <span className="font-normal text-cyan-600 dark:text-cyan-400">{wfhCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span className="text-slate-500 dark:text-zinc-400 font-normal">Hybrid:</span>
                <span className="font-normal text-purple-600 dark:text-purple-400">{hybridCount}</span>
              </div>
            </div>
          </div>

          {/* KPI 2: Workforce Status */}
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200/60 dark:border-neutral-800 rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider truncate">
                  WORKFORCE STATUS
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-normal text-slate-800 dark:text-white tracking-tight flex-shrink-0">
                {activeCount}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between text-[11px] gap-1 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-slate-500 dark:text-zinc-400 font-normal">Active:</span>
                <span className="font-normal text-emerald-600 dark:text-emerald-400">{activeCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span className="text-slate-500 dark:text-zinc-400 font-normal">Inactive:</span>
                <span className="font-normal text-slate-500 dark:text-slate-400">{inactiveCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="text-slate-500 dark:text-zinc-400 font-normal">Idle:</span>
                <span className="font-normal text-amber-600 dark:text-amber-400">{idleCount}</span>
              </div>
            </div>
          </div>

          {/* KPI 3: Employment Type */}
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200/60 dark:border-neutral-800 rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider truncate">
                  EMPLOYEE TYPES
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-normal text-slate-800 dark:text-white tracking-tight flex-shrink-0">
                {fullTimeCount}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between text-[11px] gap-1 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-slate-500 dark:text-zinc-400 font-normal">Full-time:</span>
                <span className="font-normal text-emerald-600 dark:text-emerald-400">{fullTimeCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="text-slate-500 dark:text-zinc-400 font-normal">Intern:</span>
                <span className="font-normal text-amber-600 dark:text-amber-400">{internCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                <span className="text-slate-500 dark:text-zinc-400 font-normal">Contract:</span>
                <span className="font-normal text-sky-500 dark:text-sky-400">{contractCount}</span>
              </div>
            </div>
          </div>

          {/* KPI 4: Role Designations */}
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200/60 dark:border-neutral-800 rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400 flex items-center justify-center flex-shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider truncate">
                  DESIGNATION ROLES
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-normal text-slate-800 dark:text-white tracking-tight flex-shrink-0">
                {annotatorCount}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between text-[11px] gap-1 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span className="text-slate-500 dark:text-zinc-400 font-normal">PMs:</span>
                <span className="font-normal text-slate-700 dark:text-zinc-300">{pmCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                <span className="text-slate-500 dark:text-zinc-400 font-normal">Annotators:</span>
                <span className="font-normal text-slate-700 dark:text-zinc-300">{annotatorCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span className="text-slate-500 dark:text-zinc-400 font-normal">QC:</span>
                <span className="font-normal text-slate-700 dark:text-zinc-300">{qcCount}</span>
              </div>
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
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${statusParam !== 'archived'
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
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${statusParam === 'archived'
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
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${isActive
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

          {/* Active filter chips — inline, just before the Add button */}
          {idleOnly && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
              Idle Only
              <button type="button" onClick={() => { const params = new URLSearchParams(searchParams); params.delete('idleOnly'); setSearchParams(params); }} className="hover:text-amber-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {statusParam === 'archived' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
              Status: Archived
              <button type="button" onClick={() => { const params = new URLSearchParams(searchParams); params.delete('status'); setSearchParams(params); }} className="hover:text-indigo-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <Button onClick={() => { setEditingEmployee(null); setFormDesignation('Annotator/ Reviewer'); setFormEmployeeType('Full-time'); setFormWorkModel('WFO'); setFormEmpStatus('active'); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4" />
            Add Employee
          </Button>
        </div>
      </div>

      <Table
        variant="untitled"
        loading={isLoading || skillsLoading || allocationsLoading}
        columns={[
          {
            key: 'name',
            label: 'Employee',
            width: 'w-[16%]',
            render: (value, row) => (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs font-bold bg-gradient-to-br from-indigo-500 to-purple-600">
                  {String(value || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0 max-w-[150px]">
                  <div className="font-semibold text-slate-800 truncate" title={value}>
                    {value}
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (row.email) {
                        navigator.clipboard.writeText(row.email);
                        toast.success('Email copied to clipboard');
                      }
                    }}
                    className="text-xs text-slate-400 truncate cursor-pointer hover:text-indigo-600 transition-colors"
                    title={`Click to copy: ${row.email}`}
                  >
                    {row.email}
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: 'designation',
            label: 'Designation',
            width: 'w-[11%]',
            render: (value) => (
              <span
                className="text-xs font-medium text-slate-600 whitespace-nowrap truncate max-w-[130px] inline-block align-middle"
                title={value || '—'}
              >
                {value || '—'}
              </span>
            ),
          },
          {
            key: 'employee_type',
            label: 'Type',
            align: 'left',
            width: 'w-[8%]',
            render: (value, row) => {
              const valStr = String(value || '').toLowerCase().replace('-', ' ').trim();
              const isFulltime = valStr.includes('full time') || valStr === 'fulltime';
              const isIntern = valStr.includes('intern');
              const isContract = valStr.includes('contractor') || valStr.includes('part time');
              const hasPromotion = Boolean(row.converted_to_fulltime_at);

              let textColorClass = 'text-slate-600 font-medium';
              let glowClass = '';

              if (isFulltime) {
                textColorClass = 'text-emerald-600 font-semibold';
                if (hasPromotion) glowClass = 'drop-shadow-[0_0_6px_rgba(16,185,129,0.75)]';
              } else if (isIntern) {
                textColorClass = 'text-amber-600 font-semibold';
                if (hasPromotion) glowClass = 'drop-shadow-[0_0_6px_rgba(245,158,11,0.75)]';
              } else if (isContract) {
                textColorClass = 'text-sky-500 font-semibold';
                if (hasPromotion) glowClass = 'drop-shadow-[0_0_6px_rgba(56,189,248,0.75)]';
              }

              const visibleRows = filteredEmployees.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
              const pageIndex = visibleRows.indexOf(row);
              const totalVisible = visibleRows.length;
              const isNearTop = totalVisible <= 2 ? pageIndex === 0 : pageIndex <= 1;
              const positionClass = isNearTop ? 'top-full mt-1.5' : 'bottom-full mb-1.5';

              return (
                <div className="group relative flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
                  <span className={`text-xs ${textColorClass} ${glowClass} transition-all duration-200`}>
                    {value || '—'}
                  </span>

                  {hasPromotion && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                  )}

                  {hasPromotion && (
                    <div className={`absolute left-0 ${positionClass} hidden group-hover:flex flex-col gap-1.5 z-30 p-2.5 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-700 min-w-[190px] max-w-[250px] pointer-events-none whitespace-normal`}>
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Promotion Details
                      </div>
                      <div className="text-xs text-slate-200 leading-relaxed">
                        Promoted from <span className="font-semibold text-emerald-400">{row.previous_employee_type || 'Intern'}</span> on <span className="font-semibold text-white">{formatDateDeterministic(row.converted_to_fulltime_at)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            },
          },
          {
            key: 'work_model',
            label: 'Work Model',
            align: 'left',
            width: 'w-[8%]',
            render: (value, row) => (
              <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
                {row.work_model || value || 'WFO'}
              </span>
            ),
          },
          {
            key: 'reporting_manager',
            label: 'Reporting Manager',
            align: 'left',
            width: 'w-[14%]',
            render: (_, row) => {
              const manager =
                row.reporting_manager_name ||
                row.reporting_manager ||
                row.manager_name ||
                row.manager ||
                (Array.isArray(row.reporting_managers) && row.reporting_managers.length > 0
                  ? row.reporting_managers.join(', ')
                  : Array.isArray(row.reporting_manager_names) && row.reporting_manager_names.length > 0
                    ? row.reporting_manager_names.join(', ')
                    : null);

              if (!manager) {
                return <span className="text-xs text-slate-400 font-medium">-</span>;
              }

              const managerText = typeof manager === 'object' ? (manager.name || manager.email) : String(manager);

              return (
                <span
                  className="text-xs font-medium text-slate-700 whitespace-nowrap truncate max-w-[150px] inline-block align-middle"
                  title={managerText}
                >
                  {managerText}
                </span>
              );
            },
          },
          {
            key: 'skills',
            label: 'Skills',
            width: 'w-[14%]',
            render: (value, row) => {
              const skillsList = Array.isArray(value) ? value : [];
              if (skillsList.length === 0) {
                return <span className="text-xs text-slate-400">—</span>;
              }

              const visibleRows = filteredEmployees.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
              const pageIndex = visibleRows.indexOf(row);
              const totalVisible = visibleRows.length;
              const isNearTop = totalVisible <= 2 ? pageIndex === 0 : pageIndex <= 1;
              const positionClass = isNearTop ? 'top-full mt-1.5' : 'bottom-full mb-1.5';
              const extra = skillsList.length - 1;

              return (
                <div className="group relative flex items-center gap-1 flex-nowrap whitespace-nowrap cursor-default">
                  <span className="inline-flex max-w-[120px] items-center truncate rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    {skillsList[0]}
                  </span>
                  {extra > 0 && (
                    <span className="inline-flex items-center flex-shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-semibold text-slate-500">
                      +{extra}
                    </span>
                  )}

                  {skillsList.length > 1 && (
                    <div className={`absolute left-0 ${positionClass} hidden group-hover:flex flex-col gap-1.5 z-30 p-2.5 bg-white text-slate-700 rounded-xl shadow-xl border border-slate-200 min-w-[180px] max-w-[260px] pointer-events-none`}>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        All Skills ({skillsList.length})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {skillsList.map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            },
          },
          {
            key: 'assigned_projects',
            label: 'Assigned Projects',
            width: 'w-[15%]',
            render: (_, row) => {
              if ((row.status || '').toLowerCase() === 'inactive') {
                return (
                  <span className="text-xs text-slate-400 font-medium">
                    —
                  </span>
                );
              }
              const projects = employeeProjectsMap[row.id];
              if (!projects || projects.size === 0) {
                return (
                  <span className="text-xs text-slate-600 font-medium">
                    Idle
                  </span>
                );
              }
              const list = [...projects];
              const visibleRows = filteredEmployees.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
              const pageIndex = visibleRows.indexOf(row);
              const totalVisible = visibleRows.length;
              const isNearTop = totalVisible <= 2 ? pageIndex === 0 : pageIndex <= 1;
              const positionClass = isNearTop ? 'top-full mt-1.5' : 'bottom-full mb-1.5';
              const extra = list.length - 1;

              return (
                <div className="group relative flex items-center gap-1 flex-nowrap whitespace-nowrap cursor-default">
                  <span className="inline-flex max-w-[130px] items-center truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {list[0]}
                  </span>
                  {extra > 0 && (
                    <span className="inline-flex items-center flex-shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-semibold text-slate-500">
                      +{extra}
                    </span>
                  )}

                  {list.length > 1 && (
                    <div className={`absolute left-0 ${positionClass} hidden group-hover:flex flex-col gap-1.5 z-30 p-2.5 bg-white text-slate-700 rounded-xl shadow-xl border border-slate-200 min-w-[200px] max-w-[280px] pointer-events-none whitespace-normal`}>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        All Assigned Projects ({list.length})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {list.map((name, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            },
          },
          {
            key: 'actions',
            label: 'Actions',
            align: 'center',
            width: 'w-[8%]',
            render: (_, row) => {
              const visibleRows = filteredEmployees.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
              const pageIndex = visibleRows.indexOf(row);
              const totalVisible = visibleRows.length;
              const isNearBottom = totalVisible <= 2 ? pageIndex === totalVisible - 1 : pageIndex >= totalVisible - 2;

              return (
                <div className="flex items-center justify-center">
                  <EmployeeActionMenu
                    row={row}
                    statusParam={statusParam}
                    setRestoreTarget={setRestoreTarget}
                    handleConvertToFulltime={handleConvertToFulltime}
                    setEditingEmployee={setEditingEmployee}
                    setFormDesignation={setFormDesignation}
                    setFormEmployeeType={setFormEmployeeType}
                    setFormWorkModel={setFormWorkModel}
                    setFormEmpStatus={setFormEmpStatus}
                    setIsModalOpen={setIsModalOpen}
                    setArchiveTarget={setArchiveTarget}
                    convertPending={convertMutation.isPending}
                    restorePending={restoreMutation.isPending}
                    archivePending={archiveMutation.isPending}
                    isNearBottom={isNearBottom}
                  />
                </div>
              );
            },
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work Model <span className="text-red-500">*</span>
                </label>
                <input type="hidden" name="work_model" value={formWorkModel} />
                <Dropdown
                  options={[
                    { value: 'WFO', label: 'WFO' },
                    { value: 'WFH', label: 'WFH' },
                    { value: 'Hybrid', label: 'Hybrid' },
                  ]}
                  value={formWorkModel}
                  onChange={setFormWorkModel}
                  placeholder="Select work model"
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
