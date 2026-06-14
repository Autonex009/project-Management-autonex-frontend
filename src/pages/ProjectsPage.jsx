import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { subProjectApi, parentProjectApi, employeeApi, allocationApi, skillApi, leaveApi, guidelineApi } from '../services/api';
import { Plus, Edit, Trash2, X, UserCheck, Users, ChevronDown, ArrowRight, Copy, Settings, UploadCloud, FileText, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { getPmEmployeeId, getPmProjects, getPmSubProjects } from '../utils/pmScope';
import { getEndDateValidationMessage, isEndDateBeforeStartDate } from '../utils/dateValidation';
import AllocationPopover from '../components/AllocationPopover';

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

  const { data: leaves = [] } = useQuery({
    queryKey: ['leaves'],
    queryFn: leaveApi.getAll,
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
      toast.success('Sub-project deleted successfully');
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to delete sub-project'),
  });

  const resetModalState = () => {
    setIsModalOpen(false);
    setEditingProject(null);
    setCopyingProject(null);
    setSelectedSkills([]);
    setGuidelineFiles([]);
    setIsDragActive(false);
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
      let message = 'Failed to save sub-project';
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
    toast.success(wasEditing ? 'Sub-project updated successfully' : 'Sub-project created successfully');

    try {
      if (filesToUpload.length > 0) {
        await uploadGuidelinesForProject(savedProject.id, selectedMainProjectId, filesToUpload);
      }
    } catch (error) {
      toast.error('Sub-project saved, but guideline upload failed. You can re-upload from the Guidelines page.');
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

  const [searchParams] = useSearchParams();
  const filterMainProjectId = searchParams.get('project');
  const [subProjectSearch, setSubProjectSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const filteredProjects = (filterMainProjectId
    ? visibleProjects.filter(p => p.main_project_id === parseInt(filterMainProjectId))
    : visibleProjects
  )
    .filter(p => p.name.toLowerCase().includes(subProjectSearch.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [subProjectSearch, filterMainProjectId]);

  const totalPages = Math.ceil(filteredProjects.length / PAGE_SIZE);
  const paginatedProjects = filteredProjects.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const currentMainProject = visibleMainProjects.find(p => p.id === parseInt(filterMainProjectId));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {currentMainProject ? `Sub-Projects for ${currentMainProject.name}` : 'All Sub-Projects'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {currentMainProject
              ? `Manage tasks and resource allocation for ${currentMainProject.name}`
              : 'Manage tasks and resource allocation across all projects'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search sub-projects..."
              value={subProjectSearch}
              onChange={e => setSubProjectSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 w-52 placeholder:text-slate-400"
            />
          </div>
          <Link
            to={`${prefix}/projects`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium text-sm rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Projects
          </Link>
          <button
            onClick={() => {
              setEditingProject(null);
              setSelectedSkills([]);
              setGuidelineFiles([]);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Sub-Project
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">Parent</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">Sub-Project</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">Project Manager</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">Skills</th>
                <th className="px-5 py-4 text-center text-xs font-bold text-slate-800 uppercase tracking-wider">Required</th>
                <th className="px-5 py-4 text-center text-xs font-bold text-slate-800 uppercase tracking-wider">Allocated</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">Timeline</th>
                <th className="px-5 py-4 text-center text-xs font-bold text-slate-800 uppercase tracking-wider">Priority</th>
                <th className="px-5 py-4 text-center text-xs font-bold text-slate-800 uppercase tracking-wider">Avg Time</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">Recommendation</th>
                <th className="px-5 py-4 text-center text-xs font-bold text-slate-800 uppercase tracking-wider">Status</th>
                <th className="px-5 py-4 text-right text-xs font-bold text-slate-800 uppercase tracking-wider sticky right-0 bg-slate-50 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.1)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan="15" className="text-center py-16 text-slate-400">
                    <div className="text-lg font-medium">
                      {filterMainProjectId ? 'No sub-projects for this project' : 'No sub-projects yet'}
                    </div>
                    <p className="text-sm mt-1">Create your first sub-project to get started</p>
                  </td>
                </tr>
              ) : (
                paginatedProjects.map((project) => {
                  const parentProject = visibleMainProjects.find(p => p.id === project.main_project_id);
                  const matchingTotal = getMatchingEmployees(project).length;
                  const allocatedManpower = getAllocatedManpower(project);
                  const remainingManpower = matchingTotal - allocatedManpower;
                  const tasksPerEmp = allocatedManpower > 0 ? Math.round(project.total_tasks / allocatedManpower) : 0;
                  const recResult = getSystemRecommendation(project);
                  const recommendation = recResult.label;

                  return (
                    <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">{parentProject?.name || '—'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-slate-600">{project.name}</div>
                        <div className="text-xs text-slate-400">{parentProject?.project_type || '—'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-600">
                          {(() => {
                            const mainProject = visibleMainProjects.find(p => p.id === project.main_project_id);
                            const pmIds = mainProject?.program_manager_ids?.length
                              ? mainProject.program_manager_ids
                              : mainProject?.program_manager_id
                                ? [mainProject.program_manager_id]
                                : [];
                            if (pmIds.length === 0) return '—';
                            const names = pmIds
                              .map(id => employees.find(e => e.id === id)?.name)
                              .filter(Boolean);
                            return names.length ? names.join(', ') : '—';
                          })()}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {project.required_expertise?.slice(0, 2).map((skill, idx) => (
                            <span key={idx} className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {skill}
                            </span>
                          ))}
                          {project.required_expertise?.length > 2 && (
                            <span className="text-xs text-slate-400">+{project.required_expertise.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="font-semibold text-slate-800">{project.required_manpower || '—'}</div>
                        <div className="text-xs text-slate-400">needed</div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {allocatedManpower > 0 ? (
                          <AllocationPopover
                            project={project}
                            allocations={allocations}
                            employees={employees}
                            badgeContent={(
                              <>
                                <span>Allocated</span>
                                <span className="font-bold">{allocatedManpower}</span>
                              </>
                            )}
                            onOpenAllocations={() => navigate(`${prefix}/allocations`, { state: { projectId: project.id } })}
                          />
                        ) : (
                          <button
                            onClick={() => navigate(`${prefix}/allocations`, { state: { projectId: project.id } })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-medium text-sm transition-colors border border-amber-200"
                            title={`${matchingTotal} employees available with matching skills - Click to allocate`}
                          >
                            <span className="font-bold">{matchingTotal}</span>
                            <span>available</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-slate-700">
                          {format(new Date(project.start_date), 'MMM d')} — {format(new Date(project.end_date), 'MMM d')}
                        </div>
                        <div className="text-xs text-slate-400">
                          {project.project_duration_days < 7 ? `${project.project_duration_days}d` : `${Math.floor(project.project_duration_days / 7)}w ${project.project_duration_days % 7}d`}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${project.priority === 'High' ? 'bg-red-50 text-red-700' :
                          project.priority === 'Medium' ? 'bg-amber-50 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                          {project.priority}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="font-medium text-slate-700">{parseFloat(((project.estimated_time_per_task || 0) * 60).toFixed(1))}m</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${recommendation === 'Overburdened' ? 'bg-red-50 text-red-700' :
                            recommendation === 'Balanced' ? 'bg-emerald-50 text-emerald-700' :
                              recommendation === 'Underutilized' ? 'bg-amber-50 text-amber-700' :
                                'bg-slate-100 text-slate-600'
                            }`}>
                            {recommendation}
                          </span>
                          {allocatedManpower > 0 && (
                            <div className="text-xs text-slate-500">
                              {recResult.dailyHours < 999 ? `${recResult.dailyHours.toFixed(1)}h` : '—'}  / 8h per day
                              {recResult.workingDays && <span className="text-slate-400"> ({recResult.workingDays}wd)</span>}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${project.project_status === 'active' ? 'bg-emerald-500' :
                            project.project_status === 'completed' ? 'bg-blue-500' :
                              'bg-slate-400'
                            }`}></span>
                          <span className="text-sm text-slate-600 capitalize">{project.project_status}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right sticky right-0 bg-white shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingProject(project);
                              setSelectedSkills(project.required_expertise || []);
                              setGuidelineFiles([]);
                              setIsModalOpen(true);
                            }}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setCopyingProject({
                                ...project,
                                name: `${project.name} (Copy)`,
                              });
                              setSelectedSkills(project.required_expertise || []);
                              setGuidelineFiles([]);
                              setIsModalOpen(true);
                            }}
                            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Copy"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete "${project.name}"?`)) {
                                deleteMutation.mutate(project.id);
                              }
                            }}
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredProjects.length)} of {filteredProjects.length} items
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 text-sm">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        currentPage === p
                          ? 'bg-indigo-600 border-indigo-600 text-white font-medium'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-full sm:max-w-3xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingProject ? 'Edit Sub-Project' : copyingProject ? 'Copy Sub-Project' : 'Create New Sub-Project'}
                </h2>
                <button
                  onClick={resetModalState}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5" id="project-form">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sub-Project Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      defaultValue={(editingProject || copyingProject)?.name}
                      className="input"
                      placeholder="Enter sub-project name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parent Project <span className="text-red-500">*</span>
                    </label>
                    {filterMainProjectId && !editingProject && !copyingProject && (
                      <input type="hidden" name="main_project_id" value={filterMainProjectId} />
                    )}
                    <select
                      name="main_project_id"
                      required
                      defaultValue={(editingProject || copyingProject)?.main_project_id || filterMainProjectId || ''}
                      disabled={!!filterMainProjectId && !editingProject && !copyingProject}
                      className={`input ${filterMainProjectId && !editingProject && !copyingProject ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                    >
                      <option value="">Select a Project</option>
                      {visibleMainProjects.map((proj) => (
                        <option key={proj.id} value={proj.id}>
                          {proj.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="priority"
                      required
                      defaultValue={(editingProject || copyingProject)?.priority || 'medium'}
                      className="input"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="project_status"
                      required
                      defaultValue={(editingProject || copyingProject)?.project_status || 'active'}
                      className="input"
                    >
                      <option value="active">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="on-hold">On Hold</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
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
              </form>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
              <button
                type="button"
                onClick={resetModalState}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="project-form"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn btn-primary"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editingProject
                    ? 'Update Sub-Project'
                    : 'Create Sub-Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
