import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/LoadingSpinner';
import { subProjectApi, parentProjectApi, employeeApi, allocationApi, skillApi, leaveApi, guidelineApi } from '../services/api';
import { Plus, Edit, Trash2, X, UserCheck, Users, ChevronDown, ArrowRight, Copy, Settings, UploadCloud, FileText, BarChart3 } from 'lucide-react';
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
import StatCard from '../components/dashboard/StatCard';

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
  const [formOrg, setFormOrg] = useState('');
  const [formPriority, setFormPriority] = useState('medium');
  const [formProjectStatus, setFormProjectStatus] = useState('active');
  const [selectedOrganization, setSelectedOrganization] = useState("all");

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

  // Organization → Project cascade for the create/edit modal. "Organization" is
  // the free-text `client` on a main project (same concept as the Organizations
  // page); a sub-project still attaches to a specific main project (main_project_id),
  // so the org selection just narrows which projects are offered.
  const NO_ORG = '— No Organization —';
  const clientOf = (mp) => (mp?.client || NO_ORG);
  const organizations = [...new Set(visibleMainProjects.map(clientOf))]
    .sort((a, b) => (a === NO_ORG ? 1 : b === NO_ORG ? -1 : a.localeCompare(b)));
  // The organization a given main-project id belongs to (used to prefill on edit/copy).
  const orgOfMainProject = (mpId) => {
    const mp = visibleMainProjects.find((p) => p.id === parseInt(mpId));
    return mp ? clientOf(mp) : '';
  };

  const createMutation = useMutation({
    mutationFn: subProjectApi.create,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => subProjectApi.update(id, data),
  });

  // Inline PM/admin update of a project's sentiment directly from the card.
  const sentimentMutation = useMutation({
    mutationFn: ({ id, sentiment }) => subProjectApi.update(id, { sentiment: sentiment || null }),
    onSuccess: () => {
      queryClient.invalidateQueries(['sub-projects']);
      toast.success('Sentiment updated');
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to update sentiment'),
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
    setFormOrg('');
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

    const num = (name) => parseInt(formData.get(name)) || 0;

    const data = {
      name: formData.get('name'),
      main_project_id: selectedMainProjectId,
      total_tasks: parseInt(formData.get('total_tasks')) || 0,
      estimated_time_per_task: parseFloat(formData.get('estimated_time_per_task')) / 60, // Store as hours, input is minutes
      start_date: startDate,
      end_date: endDate,
      daily_target: parseInt(formData.get('daily_target')) || 0,
      priority: formData.get('priority') || 'medium',
      required_expertise: selectedSkills,
      assigned_employee_ids: [],
      // Team composition (required_manpower is auto-computed server-side from the Autonex counts)
      annotators_total: num('annotators_total'),
      workforce_annotators: num('workforce_annotators'),
      autonex_annotators: num('autonex_annotators'),
      autonex_reviewers: num('autonex_reviewers'),
      workforce_reviewers: num('workforce_reviewers'),
      qc_count: num('qc_count'),
      project_duration_weeks: durationWeeks,
      project_duration_days: durationDays,
      project_status: formData.get('project_status') || 'active',
      is_annotation: formData.get('is_annotation') === 'true',
      encord_project_hash: (formData.get('encord_project_hash') || '').trim() || null,
      sentiment: (formData.get('sentiment') || '').trim() || null,
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

  const filteredProjects = (
    filterMainProjectId
      ? visibleProjects.filter(
          p => p.main_project_id === parseInt(filterMainProjectId)
        )
      : visibleProjects
  )
  .filter(project => {
    if (selectedOrganization === "all") return true;

    const parentProject = visibleMainProjects.find(
      p => p.id === project.main_project_id
    );

    return (parentProject?.client || NO_ORG) === selectedOrganization;
  })
  .filter(p => {
    if (statusParam && p.project_status !== statusParam) return false;

    if (recommendationParam) {
      const recResult = getSystemRecommendation(p);

      if (
        recResult.label.toLowerCase() !==
        recommendationParam.toLowerCase()
      )
        return false;
    }

    return p.name.toLowerCase().includes(subProjectSearch.toLowerCase());
  })
  .sort((a, b) => a.name.localeCompare(b.name));

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [subProjectSearch, filterMainProjectId, statusParam, recommendationParam]);


  const currentMainProject = visibleMainProjects.find(p => p.id === parseInt(filterMainProjectId));

  const projectMetrics = useMemo(() => {
  const totalProjects = filteredProjects.length;

  const activeProjects = filteredProjects.filter(
    p => p.project_status === "active"
  ).length;

  const overburdenedProjects = filteredProjects.filter(
    p => getSystemRecommendation(p).label === "Overburdened"
  ).length;

  const unstaffedProjects = filteredProjects.filter(
    p => getAllocatedManpower(p) === 0
  ).length;

  const balancedProjects = filteredProjects.filter(
    p => getSystemRecommendation(p).label === "Balanced"
  ).length;

  return {
    totalProjects,
    activeProjects,
    overburdenedProjects,
    unstaffedProjects,
    balancedProjects,
  };
}, [filteredProjects, allocations, employees, leaves]);

  return (
    <div className="space-y-6 p-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            {currentMainProject ? `Projects for ${currentMainProject.name}` : 'All Projects'}
          </h1>
          <p className="text-slate-500 text-[13px] mt-0.5">
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
          {isPm && (
            <Link
              to={`${prefix}/projects`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium text-sm rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Organizations
            </Link>
          )}
          <Button onClick={() => { setEditingProject(null); setSelectedSkills([]); setGuidelineFiles([]); setFormMainProjectId(filterMainProjectId || ''); setFormOrg(filterMainProjectId ? orgOfMainProject(filterMainProjectId) : ''); setFormPriority('medium'); setFormProjectStatus('active'); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4" />
            Add Project
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        <StatCard title="Total Projects" value={projectMetrics.totalProjects} icon={FileText} tone="indigo" hint="all projects" />
        <StatCard title="Active Projects" value={projectMetrics.activeProjects} icon={UserCheck} tone="emerald" hint="currently active" />
        <StatCard title="Overburdened" value={projectMetrics.overburdenedProjects} icon={BarChart3} tone="rose" hint="need staffing" />
        <StatCard title="Unstaffed" value={projectMetrics.unstaffedProjects} icon={Users} tone="amber" hint="no one allocated" />
        <StatCard title="Balanced" value={projectMetrics.balancedProjects} icon={Settings} tone="sky" hint="well staffed" />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">

          <div className="flex flex-col w-72 relative z-50">
            <Dropdown
              value={selectedOrganization}
              onChange={(val) => setSelectedOrganization(val)}
              options={[
                { value: 'all', label: 'Organizations' },
                ...organizations.map(org => ({ value: org, label: org }))
              ]}
              editable={true}
              allowCreate={false}
              className="w-full"
            />
          </div>

          {selectedOrganization !== "all" && (
            <button
              onClick={() => setSelectedOrganization("all")}
              className="text-sm text-indigo-600 hover:underline mt-6"
            >
              Clear Filter
            </button>
          )}

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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="h-96 rounded-2xl border border-slate-200 bg-white animate-pulse"
            />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-slate-800">
            {filterMainProjectId
              ? 'No projects under this organization'
              : 'No projects yet'}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Create your first project to get started
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredProjects
              .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
              .map((project) => {
                const parentProject = visibleMainProjects.find(
                  (p) => p.id === project.main_project_id
                );

                const mainProject = parentProject;

                const pmIds = mainProject?.program_manager_ids?.length
                  ? mainProject.program_manager_ids
                  : mainProject?.program_manager_id
                    ? [mainProject.program_manager_id]
                    : [];

                const pmNames = pmIds
                  .map((id) => employees.find((e) => e.id === id)?.name)
                  .filter(Boolean);

                const allocatedManpower = getAllocatedManpower(project);
                const matchingEmployees = getMatchingEmployees(project).length;

                return (
                  <div
                    key={project.id}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                          <FileText className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-slate-900 truncate">
                            {project.name}
                          </h3>

                          <p className="mt-1 text-xs text-slate-500 truncate">
                            {parentProject?.client || '—'}
                            {' • '}
                            {parentProject?.project_type || '—'}
                          </p>
                        </div>
                      </div>

                      {/* Status */}
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          project.project_status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : project.project_status === 'completed'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {project.project_status}
                      </span>
                    </div>

                    {/* Annotation badge */}
                    {project.is_annotation && (
                      <div className="mt-4">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 border border-indigo-200">
                          Annotation Project
                        </span>
                      </div>
                    )}

                    {/* Project details */}
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Project Manager</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800 truncate">
                          {pmNames.length ? pmNames.join(', ') : '—'}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500 mb-1">Manpower</p>

                        <AllocationPopover
                          project={project}
                          allocations={allocations}
                          employees={employees}
                          triggerClassName="inline-flex text-sm font-semibold text-slate-800 hover:text-indigo-600 transition-colors cursor-pointer"
                          badgeContent={
                            <span>
                              {allocatedManpower} / {project.required_manpower || 0}
                            </span>
                          }
                        />
                      </div>
                    </div>

                    {/* Skills */}
                    {project.required_expertise?.length > 0 && (
                      <div className="mt-4">
                        <p className="mb-2 text-xs font-medium text-slate-500">
                          Required Skills
                        </p>

                        <div className="flex flex-wrap gap-1.5">
                          {project.required_expertise.slice(0, 3).map((skill) => (
                            <span
                              key={skill}
                              className="rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700"
                            >
                              {skill}
                            </span>
                          ))}

                          {project.required_expertise.length > 3 && (
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-500">
                              +{project.required_expertise.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Project Sentiment (PM/admin can update inline) */}
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5">
                      <span className="text-xs font-medium text-slate-500">
                        Project Sentiment
                      </span>

                      <select
                        value={project.sentiment || ''}
                        onChange={(e) => sentimentMutation.mutate({ id: project.id, sentiment: e.target.value })}
                        disabled={sentimentMutation.isPending}
                        className={`rounded-lg border px-2 py-1 text-xs font-bold outline-none transition focus:ring-2 disabled:opacity-60 ${
                          project.sentiment === 'GOOD'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 focus:ring-emerald-100'
                            : project.sentiment === 'AVG'
                              ? 'border-amber-200 bg-amber-50 text-amber-700 focus:ring-amber-100'
                              : project.sentiment === 'Poor'
                                ? 'border-red-200 bg-red-50 text-red-600 focus:ring-red-100'
                                : 'border-slate-200 bg-white text-slate-500 focus:ring-slate-100'
                        }`}
                      >
                        <option value="">Not set</option>
                        <option value="GOOD">GOOD</option>
                        <option value="AVG">AVG</option>
                        <option value="Poor">Poor</option>
                      </select>
                    </div>

                    {/* Actions */}
                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                      <button
                        onClick={() =>
                          navigate(`${prefix}/allocations`, {
                            state: { projectId: project.id },
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                      >
                        <Users className="h-4 w-4" />
                        Allocations
                      </button>

                      <div className="relative inline-block group">
                        <button
                          disabled={!project.encord_project_hash?.trim()}
                          onClick={() => navigate(`/admin/analytics/${project.id}`)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                            project.encord_project_hash?.trim()
                              ? "bg-slate-50 text-slate-700 hover:bg-slate-100"
                              : "bg-slate-100 text-slate-400 cursor-not-allowed"
                          }`}
                        >
                          <BarChart3 className="h-4 w-4" />
                          Analytics
                        </button>

                        {!project.encord_project_hash?.trim() && (
                          <div
                            className="
                              pointer-events-none
                              absolute left-1/2 top-full z-20
                              mt-2 -translate-x-1/2
                              whitespace-nowrap
                              rounded-md bg-slate-900 px-3 py-2
                              text-xs text-white
                              opacity-0 shadow-lg
                              transition-opacity duration-200
                              group-hover:opacity-100
                            "
                          >
                            Encord Project ID is not configured.
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingProject(project);
                            setSelectedSkills(project.required_expertise || []);
                            setGuidelineFiles([]);
                            setFormMainProjectId(String(project.main_project_id || ''));
                            setFormOrg(orgOfMainProject(project.main_project_id));
                            setFormPriority(project.priority || 'medium');
                            setFormProjectStatus(project.project_status || 'active');
                            setIsModalOpen(true);
                          }}
                          className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => {
                            setCopyingProject({
                              ...project,
                              name: `${project.name} (Copy)`,
                            });
                            setSelectedSkills(project.required_expertise || []);
                            setGuidelineFiles([]);
                            setFormMainProjectId(String(project.main_project_id || ''));
                            setFormOrg(orgOfMainProject(project.main_project_id));
                            setFormPriority(project.priority || 'medium');
                            setFormProjectStatus(project.project_status || 'active');
                            setIsModalOpen(true);
                          }}
                          className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
                          title="Copy"
                        >
                          <Copy className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() =>
                            setDeleteConfirm({
                              id: project.id,
                              name: project.name,
                            })
                          }
                          className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Pagination */}
          {filteredProjects.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 mt-6">

              <p className="text-sm text-slate-500">
                Showing{" "}
                {filteredProjects.length === 0
                  ? 0
                  : (currentPage - 1) * PAGE_SIZE + 1}
                –
                {Math.min(currentPage * PAGE_SIZE, filteredProjects.length)} of{" "}
                {filteredProjects.length} items
              </p>

              <div className="flex items-center gap-1">

                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                {Array.from(
                  {
                    length: Math.ceil(filteredProjects.length / PAGE_SIZE),
                  },
                  (_, i) => i + 1
                )
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === Math.ceil(filteredProjects.length / PAGE_SIZE) ||
                      Math.abs(p - currentPage) <= 1
                  )
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) {
                      acc.push("...");
                    }

                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === "..." ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="px-2 text-slate-400 text-sm"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          currentPage === p
                            ? "bg-indigo-600 border-indigo-600 text-white font-medium"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                <button
                  onClick={() =>
                    setCurrentPage(
                      Math.min(
                        Math.ceil(filteredProjects.length / PAGE_SIZE),
                        currentPage + 1
                      )
                    )
                  }
                  disabled={
                    currentPage ===
                    Math.ceil(filteredProjects.length / PAGE_SIZE)
                  }
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>

              </div>
            </div>
          )}
        </>
      )}

      <Modal.Compact isOpen={isModalOpen} onClose={resetModalState} size="4xl" maxHeight="92vh">
        <Modal.Compact.Header onClose={resetModalState}>
          <h2 className="text-xl font-semibold text-gray-900">
            {editingProject ? 'Edit Project' : copyingProject ? 'Copy Project' : 'Create New Project'}
          </h2>
        </Modal.Compact.Header>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0" id="project-form">
          <Modal.Compact.Body className="space-y-4">

            {/* Project Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

              {/* Project Name */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
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

              {/* Organization */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Organization <span className="text-red-500">*</span>
                </label>

                <input
                  type="hidden"
                  name="main_project_id"
                  value={
                    filterMainProjectId &&
                    !editingProject &&
                    !copyingProject
                      ? filterMainProjectId
                      : formMainProjectId
                  }
                />

                <Dropdown
                  editable={true}
                  options={organizations.map(org => ({
                    value: org,
                    label: org,
                  }))}
                  value={formOrg}
                  onChange={(val) => {
                    setFormOrg(val);

                    const projs = visibleMainProjects.filter(
                      p => clientOf(p) === val
                    );

                    setFormMainProjectId(
                      projs.length
                        ? String(projs[projs.length - 1].id)
                        : ''
                    );
                  }}
                  placeholder="Select or type an organization"
                  disabled={
                    !!filterMainProjectId &&
                    !editingProject &&
                    !copyingProject
                  }
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>

                <input
                  type="hidden"
                  name="project_status"
                  value={formProjectStatus}
                />

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

              {/* Time per Task */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Time per Task (Minutes) <span className="text-red-500">*</span>
                </label>

                <input
                  type="number"
                  name="estimated_time_per_task"
                  required
                  min="0.1"
                  step="0.1"
                  defaultValue={
                    (editingProject || copyingProject)
                      ?.estimated_time_per_task
                      ? parseFloat(
                          (
                            (editingProject || copyingProject)
                              .estimated_time_per_task * 60
                          ).toFixed(1)
                        )
                      : ''
                  }
                  className="input"
                  placeholder="30"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
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

              {/* Encord Project ID */}
              <div className="sm:col-span-2 lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Encord Project ID
                </label>

                <input
                  type="text"
                  name="encord_project_hash"
                  defaultValue={
                    (editingProject || copyingProject)?.encord_project_hash || ''
                  }
                  className="input font-mono text-sm"
                  placeholder="Encord project hash (enables analytics for this project)"
                />
              </div>

              {/* Project Sentiment */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Project Sentiment
                </label>

                <select
                  name="sentiment"
                  defaultValue={
                    (editingProject || copyingProject)?.sentiment || ''
                  }
                  className="input"
                >
                  <option value="">Not set</option>
                  <option value="GOOD">GOOD</option>
                  <option value="AVG">AVG</option>
                  <option value="Poor">Poor</option>
                </select>
              </div>

            </div>


            {/* Annotation Project */}
            <label className="flex items-center gap-2.5 rounded-lg border border-indigo-100 bg-indigo-50/40 px-3 py-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_annotation"
                id="is_annotation"
                value="true"
                defaultChecked={
                  (editingProject || copyingProject)?.is_annotation || false
                }
                className="h-4 w-4 border-slate-300 rounded accent-indigo-600 cursor-pointer"
              />

              <span className="text-xs font-semibold text-slate-700">
                Is Annotation Project
                <span className="ml-1 font-normal text-slate-500">
                  (links allocated candidates to PM for Onboarding tracking)
                </span>
              </span>
            </label>


            {/* Team Composition */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3">

              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700">
                  Team Composition
                </label>

                <span className="text-[11px] text-slate-400">
                  Required headcount is calculated automatically
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">

                {[
                  ['annotators_total', 'Total Annotators'],
                  ['workforce_annotators', 'Workforce'],
                  ['autonex_annotators', 'Autonex Annotators'],
                  ['autonex_reviewers', 'Autonex Reviewers'],
                  ['workforce_reviewers', 'Workforce Reviewers'],
                  ['qc_count', 'QC'],
                ].map(([field, label]) => (
                  <div key={field}>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1 truncate">
                      {label}
                    </label>

                    <input
                      type="number"
                      name={field}
                      min="0"
                      defaultValue={
                        (editingProject || copyingProject)?.[field] ?? ''
                      }
                      className="input"
                      placeholder="0"
                    />
                  </div>
                ))}

              </div>

              <p className="mt-2 text-[11px] text-slate-400">
                Required headcount = Autonex Annotators + Autonex Reviewers + QC.
              </p>

            </div>


            {/* Project Guidelines */}
            <div>

              <label className="block text-xs font-semibold text-slate-700 mb-2">
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
                className={`
                  border border-dashed rounded-lg
                  px-4 py-3
                  text-center cursor-pointer
                  transition-colors
                  ${
                    isDragActive
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/60'
                  }
                `}
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

                <div className="flex items-center justify-center gap-2">
                  <UploadCloud className="w-5 h-5 text-indigo-500" />

                  <p className="text-xs font-medium text-slate-700">
                    Drag documents here or click to browse
                  </p>
                </div>

                <p className="text-[11px] text-slate-500 mt-1">
                  Uploaded files will appear in the Guidelines tab after saving.
                </p>

              </div>

              {guidelineFiles.length > 0 && (
                <div className="mt-2 space-y-1.5">

                  {guidelineFiles.map((file) => (
                    <div
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-1.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">

                        <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />

                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">
                            {file.name}
                          </p>

                          <p className="text-[10px] text-slate-400">
                            {Math.max(1, Math.round(file.size / 1024))} KB
                          </p>
                        </div>

                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeGuidelineFile(file);
                        }}
                        className="text-xs text-red-500 hover:text-red-600"
                      >
                        Remove
                      </button>

                    </div>
                  ))}

                </div>
              )}

            </div>

          </Modal.Compact.Body>
          <Modal.Compact.Footer>
            <Button type="button" variant="cancel" onClick={resetModalState}>Cancel</Button>
            <Button
              type="submit"
              form="project-form"
              disabled={createMutation.isPending || updateMutation.isPending}
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {!(createMutation.isPending || updateMutation.isPending) && (editingProject ? 'Update Sub-Project' : 'Create Sub-Project')}
            </Button>
          </Modal.Compact.Footer>
        </form>
      </Modal.Compact>
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
