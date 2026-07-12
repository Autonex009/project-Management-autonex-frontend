import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/LoadingSpinner';
import { subProjectApi, parentProjectApi, employeeApi, allocationApi, skillApi, leaveApi, guidelineApi } from '../services/api';
import { Plus, Edit, Trash2, X, UserCheck, Users, ChevronDown, ArrowRight, Copy, Settings, UploadCloud, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import SearchBar from '../components/ui/SearchBar';
import { getPmEmployeeId, getPmProjects, getPmSubProjects } from '../utils/pmScope';
import { getEndDateValidationMessage, isEndDateBeforeStartDate } from '../utils/dateValidation';
import AllocationPopover from '../components/AllocationPopover';
import Table, { ColumnTemplates } from '../components/ui/Table';
import Dropdown from '../components/ui/Dropdown';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';

const SkillMultiSelect = ({ options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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
    if (skill === 'Any Skill') {
      onChange([]);
      setIsOpen(false);
      return;
    }
    onChange(
      value.includes(skill)
        ? value.filter((item) => item !== skill)
        : [...value, skill]
    );
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white flex items-center justify-between min-h-[42px]"
      >
        <div className="flex flex-wrap gap-1 flex-1 text-left">
          {value.length > 0 ? (
            value.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700 border border-indigo-200"
              >
                {skill}
              </span>
            ))
          ) : (
            <span className="text-gray-500 text-sm font-medium">Any Skill</span>
          )}
        </div>
        <div className="flex items-center gap-2 pl-2">
          <span className="text-xs text-gray-500">{value.length} selected</span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {/* Any Skill option — clears all skill filters */}
          <label className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-100">
            <input
              type="radio"
              checked={value.length === 0}
              onChange={() => toggleSkill('Any Skill')}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-gray-700 font-medium">Any Skill</span>
          </label>
          {options.length > 0 ? (
            options.map((skill) => (
              <label
                key={skill}
                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={value.includes(skill)}
                  onChange={() => toggleSkill(skill)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-gray-700">{skill}</span>
              </label>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500">
              No skills available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Employee Multi-Select Dropdown Component
const EmployeeMultiSelect = ({ name, defaultValue = [], employees, requiredSkills }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(defaultValue);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter employees by matching skills
  const matchingEmployees = employees.filter(emp => {
    if (emp.status !== 'active') return false;
    if (!requiredSkills || requiredSkills.length === 0) return true;

    return requiredSkills.some(skill =>
      emp.skills?.some(empSkill =>
        empSkill.toLowerCase().includes(skill.toLowerCase())
      )
    );
  });

  // Get employees that don't match skills
  const otherEmployees = employees.filter(emp =>
    emp.status === 'active' && !matchingEmployees.includes(emp)
  );

  const toggleEmployee = (empId) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(empId)
        ? prev.filter(id => id !== empId)
        : [...prev, empId]
    );
  };

  const selectedEmployees = employees.filter(emp => selectedEmployeeIds.includes(emp.id));

  return (
    <div ref={dropdownRef} className="relative">
      <input
        type="hidden"
        name={name}
        value={JSON.stringify(selectedEmployeeIds)}
      />

      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white cursor-pointer flex items-center justify-between min-h-[42px]"
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {selectedEmployees.length > 0 ? (
            selectedEmployees.map((emp) => (
              <span
                key={emp.id}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 border border-blue-200"
              >
                {emp.name}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm">Select employees...</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{selectedEmployeeIds.length} selected</span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden">
          {matchingEmployees.length > 0 && (
            <>
              <div className="px-3 py-2 bg-green-50 border-b border-green-200">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">
                    Matching Skills ({matchingEmployees.length})
                  </span>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {matchingEmployees.map((emp) => (
                  <label
                    key={emp.id}
                    className="flex items-start px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors border-l-2 border-green-500"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmployeeIds.includes(emp.id)}
                      onChange={() => toggleEmployee(emp.id)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-0.5"
                    />
                    <div className="ml-3 flex-1">
                      <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                      <div className="text-xs text-gray-500">{emp.email}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {emp.skills?.slice(0, 3).map((skill, idx) => (
                          <span key={idx} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}

          {otherEmployees.length > 0 && (
            <>
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                <span className="text-xs font-semibold text-gray-600">
                  Other Available Employees ({otherEmployees.length})
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {otherEmployees.map((emp) => (
                  <label
                    key={emp.id}
                    className="flex items-start px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmployeeIds.includes(emp.id)}
                      onChange={() => toggleEmployee(emp.id)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-0.5"
                    />
                    <div className="ml-3 flex-1">
                      <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                      <div className="text-xs text-gray-500">{emp.email}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {emp.skills?.slice(0, 3).map((skill, idx) => (
                          <span key={idx} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}

          {matchingEmployees.length === 0 && otherEmployees.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              No active employees available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ProjectsPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = localStorage.getItem('role') || 'admin';
  const isPm = role === 'pm';
  const prefix = isPm ? '/pm' : '/admin';
  const pmEmployeeId = getPmEmployeeId(user);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [copyingProject, setCopyingProject] = useState(null);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [guidelineFiles, setGuidelineFiles] = useState([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const [formMainProjectId, setFormMainProjectId] = useState('');
  const [formPriority, setFormPriority] = useState('medium');
  const [formProjectStatus, setFormProjectStatus] = useState('active');

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['sub-projects'],
    queryFn: subProjectApi.getAll,
  });

  const { data: mainProjects = [] } = useQuery({
    queryKey: ['parent-projects'],
    queryFn: parentProjectApi.getAll,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: employeeApi.getAll,
  });

  const { data: skillsData = [] } = useQuery({
    queryKey: ['skills'],
    queryFn: skillApi.getAll,
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['allocations'],
    queryFn: allocationApi.getAll,
  });

  const { startStr, endStr } = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`;
    return { startStr: start, endStr: end };
  }, []);

  const { data: leaves = [] } = useQuery({
    queryKey: ['leaves', startStr, endStr],
    queryFn: () => leaveApi.getAll({ start_date: startStr, end_date: endStr }),
  });

  const visibleMainProjects = isPm ? getPmProjects(mainProjects, pmEmployeeId) : mainProjects;
  const visibleProjects = isPm ? getPmSubProjects(projects, mainProjects, pmEmployeeId, allocations) : projects;

  const createMutation = useMutation({
    mutationFn: subProjectApi.create,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => subProjectApi.update(id, data),
  });

  const deleteMutation = useMutation({
    mutationFn: subProjectApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['sub-projects']);
      toast.success('Project deleted successfully');
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to delete project'),
  });

  const resetModalState = () => {
    setIsModalOpen(false);
    setEditingProject(null);
    setCopyingProject(null);
    setSelectedSkills([]);
    setGuidelineFiles([]);
    setIsDragActive(false);
    setFormMainProjectId('');
    setFormPriority('medium');
    setFormProjectStatus('active');
  };

  const addGuidelineFiles = (files) => {
    const nextFiles = Array.from(files || []);
    if (nextFiles.length === 0) return;

    setGuidelineFiles((prev) => {
      const existingKeys = new Set(prev.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
      const deduped = nextFiles.filter((file) => !existingKeys.has(`${file.name}-${file.size}-${file.lastModified}`));
      return [...prev, ...deduped];
    });
  };

  const removeGuidelineFile = (targetFile) => {
    setGuidelineFiles((prev) =>
      prev.filter((file) => `${file.name}-${file.size}-${file.lastModified}` !== `${targetFile.name}-${targetFile.size}-${targetFile.lastModified}`)
    );
  };

  const uploadGuidelinesForProject = async (projectId, mainProjectId, files = guidelineFiles) => {
    if (files.length === 0) return;

    await Promise.all(files.map((file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name.replace(/\.[^.]+$/, ''));
      formData.append('sub_project_id', String(projectId));
      formData.append('main_project_id', String(mainProjectId));
      if (user.id) {
        formData.append('uploaded_by', String(user.id));
      }
      return guidelineApi.upload(formData);
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Guard against double-submission (e.g. rapid double-clicks on Save)
    if (createMutation.isPending || updateMutation.isPending) return;
    const formData = new FormData(e.target);
    const selectedMainProjectId = parseInt(formData.get('main_project_id') || filterMainProjectId || '', 10) || null;


    if (!selectedMainProjectId) {
      toast.error('Please select a parent project');
      return;
    }

    const startDate = formData.get('start_date');
    const endDate = formData.get('end_date') || null;

    if (endDate && isEndDateBeforeStartDate(startDate, endDate)) {
      toast.error(getEndDateValidationMessage());
      return;
    }

    const start = new Date(startDate);
    const durationDays = endDate ? Math.ceil((new Date(endDate) - start) / (1000 * 60 * 60 * 24)) + 1 : 0;
    const durationWeeks = endDate ? Math.floor(durationDays / 7) : 0;

    const employeesRequired = parseInt(formData.get('employees_required')) || 0;

    const data = {
      name: formData.get('name'),
      main_project_id: selectedMainProjectId,
      total_tasks: parseInt(formData.get('total_tasks')),
      estimated_time_per_task: parseFloat(formData.get('estimated_time_per_task')) / 60, // Store as hours, input is minutes
      start_date: startDate,
      end_date: endDate,
      daily_target: parseInt(formData.get('daily_target')) || 0,
      priority: formData.get('priority'),
      required_expertise: selectedSkills,
      assigned_employee_ids: [],
      required_manpower: employeesRequired,
      project_duration_weeks: durationWeeks,
      project_duration_days: durationDays,
      project_status: formData.get('project_status') || 'active',
      is_annotation: formData.get('is_annotation') === 'true',
    };

    let savedProject;
    try {
      if (editingProject) {
        savedProject = await updateMutation.mutateAsync({ id: editingProject.id, data });
      } else {
        savedProject = await createMutation.mutateAsync(data);
      }
    } catch (error) {
      const detail = error.response?.data?.detail;
      let message = 'Failed to save project';
      if (typeof detail === 'string') {
        message = detail;
      } else if (Array.isArray(detail)) {
        // FastAPI 422 returns an array of {loc, msg}; surface the field + reason
        message = detail
          .map((e) => {
            const field = Array.isArray(e.loc) ? e.loc[e.loc.length - 1] : '';
            return field ? `${field}: ${e.msg}` : e.msg;
          })
          .join('; ');
      }
      toast.error(message);
      return;
    }

    // Save succeeded — close the modal NOW so a failed follow-up step
    // (e.g. guideline upload) can't lead to duplicate re-submissions.
    const wasEditing = Boolean(editingProject);
    const filesToUpload = guidelineFiles;
    resetModalState();
toast.success(wasEditing ? 'Project updated successfully' : 'Project created successfully');

    try {
      if (filesToUpload.length > 0) {
        await uploadGuidelinesForProject(savedProject.id, selectedMainProjectId, filesToUpload);
      }
    } catch (error) {
      toast.error('Project saved, but guideline upload failed. You can re-upload from the Guidelines page.');
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['sub-projects'] }),
      queryClient.invalidateQueries({ queryKey: ['guidelines'] }),
    ]);
  };

  const getMatchingEmployees = (project) => {
    if (!project.required_expertise || project.required_expertise.length === 0) {
      return employees.filter(emp => emp.status === 'active');
    }

    return employees.filter(emp =>
      emp.status === 'active' &&
      project.required_expertise.some(skill =>
        emp.skills?.some(empSkill =>
          empSkill.toLowerCase().includes(skill.toLowerCase())
        )
      )
    );
  };

  const getAllocatedManpower = (project) => {
    return allocations.filter(a => a.sub_project_id === project.id).length;
  };

  const calculateManpowerBalance = (project) => {
    const matchingTotal = getMatchingEmployees(project).length;
    const allocatedCount = getAllocatedManpower(project);
    return matchingTotal - allocatedCount;
  };

  const calculateTasksPerEmployee = (project) => {
    const manpower = getAllocatedManpower(project);
    if (manpower === 0) return 0;
    return Math.round(project.total_tasks / manpower);
  };

  // Helper: count working days (exclude weekends) between two dates.
  // Parse date-only strings as LOCAL midnight (never via Date.toISOString) so
  // counts don't shift by a day in timezones offset from UTC (e.g. IST).
  const getWorkingDays = (startStr, endStr) => {
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
      const day = current.getDay(); // 0=Sun, 6=Sat
      if (day !== 0 && day !== 6) count++;
      current.setDate(current.getDate() + 1);
    }
    return count || 1; // at least 1 to avoid division by zero
  };

  // Helper: count leave working days for an employee during a project period.
  // Clamp the overlap on the YYYY-MM-DD strings directly (lexicographic order =
  // chronological) to avoid UTC round-trips.
  const getEmployeeLeaveDays = (employeeId, projectStart, projectEnd) => {
    const empLeaves = leaves.filter(l => l.employee_id === employeeId);
    let totalLeaveDays = 0;
    for (const leave of empLeaves) {
      if (!leave.start_date || !leave.end_date) continue;
      const leaveStart = leave.start_date > projectStart ? leave.start_date : projectStart;
      const leaveEnd = leave.end_date < projectEnd ? leave.end_date : projectEnd;
      if (leaveStart <= leaveEnd) {
        totalLeaveDays += getWorkingDays(leaveStart, leaveEnd);
      }
    }
    return totalLeaveDays;
  };

  const getSystemRecommendation = (project) => {
    const projectAllocations = allocations.filter(a => a.sub_project_id === project.id);
    const allocatedPersonnel = projectAllocations.length;
    const totalTasks = project.total_tasks || 0;
    const avgTimePerTask = project.estimated_time_per_task || 0; // in hours
    const totalEstimatedHours = totalTasks * avgTimePerTask;

    if (allocatedPersonnel === 0) {
      return { label: 'Overburdened', dailyHours: 0, details: 'No employees allocated' };
    }

    const workingDays = getWorkingDays(project.start_date, project.end_date);

    // Calculate effective capacity: subtract leave days per employee
    let totalEffectiveEmployeeDays = 0;
    for (const alloc of projectAllocations) {
      const leaveDays = getEmployeeLeaveDays(alloc.employee_id, project.start_date, project.end_date);
      totalEffectiveEmployeeDays += (workingDays - leaveDays);
    }

    // Per-employee average daily required hours
    const avgDailyHoursPerEmployee = totalEffectiveEmployeeDays > 0
      ? totalEstimatedHours / totalEffectiveEmployeeDays
      : 999;

    let label;
    if (avgDailyHoursPerEmployee > 8.5) {
      label = 'Overburdened';
    } else if (avgDailyHoursPerEmployee >= 7.5) {
      label = 'Balanced';
    } else {
      label = 'Underutilized';
    }

    return { label, dailyHours: avgDailyHoursPerEmployee, workingDays, effectiveDays: totalEffectiveEmployeeDays };
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const filterMainProjectId = searchParams.get('project');
  const statusParam = searchParams.get('status');
  const recommendationParam = searchParams.get('recommendation');
  const [subProjectSearch, setSubProjectSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const filteredProjects = (filterMainProjectId
    ? visibleProjects.filter(p => p.main_project_id === parseInt(filterMainProjectId))
    : visibleProjects
  )
    .filter(p => {
      if (statusParam && p.project_status !== statusParam) return false;
      if (recommendationParam) {
        const recResult = getSystemRecommendation(p);
        if (recResult.label.toLowerCase() !== recommendationParam.toLowerCase()) return false;
      }
      return p.name.toLowerCase().includes(subProjectSearch.toLowerCase());
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [subProjectSearch, filterMainProjectId, statusParam, recommendationParam]);


  const currentMainProject = visibleMainProjects.find(p => p.id === parseInt(filterMainProjectId));


  return (
    <div className="space-y-6 p-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {currentMainProject ? `Projects for ${currentMainProject.name}` : 'All Projects'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {currentMainProject
              ? `Manage tasks and resource allocation for ${currentMainProject.name}`
              : 'Manage tasks and resource allocation across all projects'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SearchBar responsive
            value={subProjectSearch}
            onChange={setSubProjectSearch}
            placeholder="Search projects..."
          />
          <Link
            to={`${prefix}/projects`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium text-sm rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Organizations
          </Link>
          <Button onClick={() => { setEditingProject(null); setSelectedSkills([]); setGuidelineFiles([]); setFormMainProjectId(filterMainProjectId || ''); setFormPriority('medium'); setFormProjectStatus('active'); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4" />
            Add Project
          </Button>
        </div>
      </div>

      {/* Active Filters Bar */}
      {(statusParam || recommendationParam) && (
        <div className="flex items-center gap-2 flex-wrap bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2.5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Filters:</span>
          {statusParam && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
              Status: {statusParam}
              <Button variant="ghost" size="icon" onClick={() => { const params = new URLSearchParams(searchParams); params.delete('status'); setSearchParams(params); }} className="rounded-full p-0.5">
                <X className="w-3 h-3" />
              </Button>
            </span>
          )}
          {recommendationParam && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
              Recommendation: {recommendationParam}
              <Button variant="ghost" size="icon" onClick={() => { const params = new URLSearchParams(searchParams); params.delete('recommendation'); setSearchParams(params); }} className="rounded-full p-0.5">
                <X className="w-3 h-3" />
              </Button>
            </span>
          )}
          <Button variant="link" onClick={() => { const params = new URLSearchParams(searchParams); params.delete('status'); params.delete('recommendation'); setSearchParams(params); }} className="ml-auto text-xs text-slate-500 hover:text-slate-800">
            Clear all
          </Button>
        </div>
      )}

      <Table
        loading={isLoading}
        columns={[
          {
            key: 'name',
            label: 'Project & Org',
            render: (value, project) => {
              const parentProject = visibleMainProjects.find(p => p.id === project.main_project_id);
              return (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 font-semibold whitespace-nowrap">{value}</span>
                    {project.is_annotation && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                        Annotation
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 whitespace-nowrap">
                    {parentProject?.name || '—'} • {parentProject?.project_type || '—'}
                  </div>
                </div>
              );
            },
          },
          {
            key: 'main_project_id',
            label: 'Project Manager',
            render: (_, project) => {
              const mainProject = visibleMainProjects.find(p => p.id === project.main_project_id);
              const pmIds = mainProject?.program_manager_ids?.length
                ? mainProject.program_manager_ids
                : mainProject?.program_manager_id ? [mainProject.program_manager_id] : [];
              if (pmIds.length === 0) return <span className="text-sm text-slate-600">—</span>;
              const names = pmIds.map(id => employees.find(e => e.id === id)?.name).filter(Boolean);
              return <span className="text-sm text-slate-600 whitespace-nowrap">{names.length ? names.join(', ') : '—'}</span>;
            },
          },
          {
            key: 'required_expertise',
            label: 'Skills',
            render: (value) => (
              <div className="text-xs text-slate-600 font-medium whitespace-nowrap">
                {value && value.length > 0 ? (
                  <>
                    <span>{value.slice(0, 2).join(', ')}</span>
                    {value.length > 2 && <span className="text-slate-400"> +{value.length - 2}</span>}
                  </>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
            ),
          },
          {
            key: 'required_manpower',
            label: 'Allocated / Req.',
            align: 'center',
            render: (_, project) => {
              const matchingTotal = getMatchingEmployees(project).length;
              const allocatedManpower = getAllocatedManpower(project);
              return allocatedManpower > 0 ? (
                <div className="inline-flex items-center justify-center">
                  <AllocationPopover
                    project={project}
                    allocations={allocations}
                    employees={employees}
                    badgeContent={(
                      <div className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 transition-colors">
                        <span className="font-bold text-slate-800">{allocatedManpower}</span>
                        <span className="text-slate-400">/</span>
                        <span className="font-semibold text-slate-500">{project.required_manpower || '0'}</span>
                        <span className="text-xs text-slate-400 ml-1 font-normal">allocated</span>
                      </div>
                    )}
                    onOpenAllocations={() => navigate(`${prefix}/allocations`, { state: { projectId: project.id } })}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-0.5">
                  <button
                    onClick={() => navigate(`${prefix}/allocations`, { state: { projectId: project.id } })}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-medium text-xs transition-colors border border-amber-200"
                  >
                    <span className="font-bold">{matchingTotal}</span>
                    <span>available</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <span className="text-[10px] text-slate-400 font-medium">Req: {project.required_manpower || '0'}</span>
                </div>
              );
            },
          },
          {
            key: 'start_date',
            label: 'Timeline',
            render: (_, project) => (
              <div className="whitespace-nowrap">
                <div className="text-sm text-slate-700">
                  {format(new Date(project.start_date), 'MMM d')} — {format(new Date(project.end_date), 'MMM d')}
                </div>
                <div className="text-xs text-slate-400">
                  {project.project_duration_days < 7
                    ? `${project.project_duration_days}d`
                    : `${Math.floor(project.project_duration_days / 7)}w ${project.project_duration_days % 7}d`}
                </div>
              </div>
            ),
          },
          {
            key: 'priority',
            label: 'Priority',
            align: 'center',
            render: (value) => (
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                value === 'High' ? 'bg-red-50 text-red-700' :
                value === 'Medium' ? 'bg-amber-50 text-amber-700' :
                value === 'critical' ? 'bg-red-100 text-red-800' :
                'bg-slate-100 text-slate-600'
              }`}>
                {value}
              </span>
            ),
          },
          {
            key: 'estimated_time_per_task',
            label: 'Avg Time',
            align: 'center',
            render: (value) => (
              <div className="font-medium text-slate-700 whitespace-nowrap">
                {parseFloat(((value || 0) * 60).toFixed(1))}m
              </div>
            ),
          },
          {
            key: '_recommendation',
            label: 'Recommendation',
            render: (_, project) => {
              const allocatedManpower = getAllocatedManpower(project);
              const recResult = getSystemRecommendation(project);
              const recommendation = recResult.label;
              return (
                <div className="space-y-1">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                    recommendation === 'Overburdened' ? 'bg-red-50 text-red-700' :
                    recommendation === 'Balanced' ? 'bg-emerald-50 text-emerald-700' :
                    recommendation === 'Underutilized' ? 'bg-amber-50 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {recommendation}
                  </span>
                  {allocatedManpower > 0 && (
                    <div className="text-xs text-slate-500 whitespace-nowrap">
                      {recResult.dailyHours < 999 ? `${recResult.dailyHours.toFixed(1)}h` : '—'} / 8h per day
                      {recResult.workingDays && <span className="text-slate-400"> ({recResult.workingDays}wd)</span>}
                    </div>
                  )}
                </div>
              );
            },
          },
          {
            key: 'project_status',
            label: 'Status',
            align: 'center',
            sticky: 'right',
            stickyOffset: 'right-[112px]',
            render: (value) => (
              <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                <span className={`w-2 h-2 rounded-full ${
                  value === 'active' ? 'bg-emerald-500' :
                  value === 'completed' ? 'bg-blue-500' :
                  'bg-slate-400'
                }`}></span>
                <span className="text-sm text-slate-600 capitalize">{value}</span>
              </div>
            ),
          },
          {
            key: '_actions',
            label: 'Actions',
            align: 'right',
            sticky: 'right',
            render: (_, project) => (
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => {
                    setEditingProject(project);
                    setSelectedSkills(project.required_expertise || []);
                    setGuidelineFiles([]);
                    setFormMainProjectId(String(project.main_project_id || ''));
                    setFormPriority(project.priority || 'medium');
                    setFormProjectStatus(project.project_status || 'active');
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setCopyingProject({ ...project, name: `${project.name} (Copy)` });
                    setSelectedSkills(project.required_expertise || []);
                    setGuidelineFiles([]);
                    setFormMainProjectId(String(project.main_project_id || ''));
                    setFormPriority(project.priority || 'medium');
                    setFormProjectStatus(project.project_status || 'active');
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  title="Copy"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirm({ id: project.id, name: project.name })}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ),
          },
        ]}
        data={filteredProjects}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
        emptyState={{
          title: filterMainProjectId ? 'No projects under this organization' : 'No projects yet',
          description: 'Create your first project to get started',
        }}
      />

      <Modal isOpen={isModalOpen} onClose={resetModalState} size="3xl" maxHeight="95vh">
        <Modal.Header onClose={resetModalState}>
          <h2 className="text-xl font-semibold text-gray-900">
            {editingProject ? 'Edit Project' : copyingProject ? 'Copy Project' : 'Create New Project'}
          </h2>
        </Modal.Header>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0" id="project-form">
          <Modal.Body className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      defaultValue={(editingProject || copyingProject)?.name}
                      className="input"
                      placeholder="Enter project name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organization <span className="text-red-500">*</span>
                    </label>
                    <input type="hidden" name="main_project_id" value={filterMainProjectId && !editingProject && !copyingProject ? filterMainProjectId : formMainProjectId} />
                    <Dropdown
                      options={[{ value: '', label: 'Select a Project' }, ...visibleMainProjects.map(p => ({ value: String(p.id), label: p.name }))]}
                      value={filterMainProjectId && !editingProject && !copyingProject ? String(filterMainProjectId) : formMainProjectId}
                      onChange={setFormMainProjectId}
                      placeholder="Select a Project"
                      disabled={!!filterMainProjectId && !editingProject && !copyingProject}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority <span className="text-red-500">*</span>
                    </label>
                    <input type="hidden" name="priority" value={formPriority} />
                    <Dropdown
                      options={[
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' },
                        { value: 'critical', label: 'Critical' },
                      ]}
                      value={formPriority}
                      onChange={setFormPriority}
                      placeholder="Select priority"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <input type="hidden" name="project_status" value={formProjectStatus} />
                    <Dropdown
                      options={[
                        { value: 'active', label: 'In Progress' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'on-hold', label: 'On Hold' },
                        { value: 'cancelled', label: 'Cancelled' },
                      ]}
                      value={formProjectStatus}
                      onChange={setFormProjectStatus}
                      placeholder="Select status"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-indigo-50/40 border border-indigo-100/60 rounded-xl p-3">
                  <input
                    type="checkbox"
                    name="is_annotation"
                    id="is_annotation"
                    value="true"
                    defaultChecked={(editingProject || copyingProject)?.is_annotation || false}
                    className="h-4.5 w-4.5 text-indigo-650 border-slate-300 rounded focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                  />
                  <label htmlFor="is_annotation" className="text-sm font-semibold text-slate-700 select-none cursor-pointer">
                    Is Annotation Project (links allocated candidates to PM for Onboarding tracking)
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Tasks <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="total_tasks"
                      required
                      min="1"
                      defaultValue={(editingProject || copyingProject)?.total_tasks || ''}
                      className="input"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time per Task (Minutes) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="estimated_time_per_task"
                      required
                      min="0.1"
                      step="0.1"
                      defaultValue={(editingProject || copyingProject)?.estimated_time_per_task ? parseFloat(((editingProject || copyingProject).estimated_time_per_task * 60).toFixed(1)) : ''}
                      className="input"
                      placeholder="30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Daily Target
                    </label>
                    <input
                      type="number"
                      name="daily_target"
                      min="0"
                      defaultValue={(editingProject || copyingProject)?.daily_target || ''}
                      className="input"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      required
                      defaultValue={(editingProject || copyingProject)?.start_date}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      defaultValue={(editingProject || copyingProject)?.end_date}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Required Skills
                  </label>
                  <SkillMultiSelect
                    options={skillsData.map((skill) => skill.name)}
                    value={selectedSkills}
                    onChange={setSelectedSkills}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Select skills to see available employees count below
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Employees Required <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="employees_required"
                    required
                    min="1"
                    defaultValue={(editingProject || copyingProject)?.required_manpower || ''}
                    className="input"
                    placeholder="Enter number of employees needed"
                  />

                  {(() => {
                    const matchingCount = selectedSkills.length > 0
                      ? employees.filter(emp =>
                          emp.status === 'active' &&
                          selectedSkills.some(skill =>
                            emp.skills?.some(empSkill =>
                              empSkill.toLowerCase().includes(skill.toLowerCase())
                            )
                          )
                        ).length
                      : employees.filter(emp => emp.status === 'active').length;

                    return (
                      <div className={`mt-2 p-3 rounded border ${matchingCount > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center gap-2">
                          <UserCheck className={`w-4 h-4 ${matchingCount > 0 ? 'text-green-600' : 'text-red-600'}`} />
                          <span className={`text-sm font-medium ${matchingCount > 0 ? 'text-green-800' : 'text-red-800'}`}>
                            {matchingCount} employee{matchingCount !== 1 ? 's' : ''} available{selectedSkills.length > 0 ? ' with matching skills' : ''}
                          </span>
                        </div>
                        {matchingCount === 0 && (
                          <p className="text-xs text-red-600 mt-1 ml-6">
                            {selectedSkills.length > 0 ? 'No employees found with the specified skills' : 'No active employees found'}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Guidelines
                  </label>
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
                      addGuidelineFiles(e.dataTransfer.files);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/60'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        addGuidelineFiles(e.target.files);
                        e.target.value = '';
                      }}
                    />
                    <UploadCloud className="w-8 h-8 text-indigo-500 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-700">
                      Drag guideline documents here or click to browse
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Uploaded files will appear in the Guidelines tab after this sub-project is saved.
                    </p>
                  </div>

                  {guidelineFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {guidelineFiles.map((file) => (
                        <div
                          key={`${file.name}-${file.size}-${file.lastModified}`}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                              <p className="text-xs text-slate-400">{Math.max(1, Math.round(file.size / 1024))} KB</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeGuidelineFile(file);
                            }}
                            className="text-sm text-red-500 hover:text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="cancel" onClick={resetModalState}>Cancel</Button>
            <Button
              type="submit"
              form="project-form"
              disabled={createMutation.isPending || updateMutation.isPending}
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {!(createMutation.isPending || updateMutation.isPending) && (editingProject ? 'Update Sub-Project' : 'Create Sub-Project')}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => { deleteMutation.mutate(deleteConfirm.id); setDeleteConfirm(null); }}
        title="Delete Sub-Project"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
};

export default ProjectsPage;
