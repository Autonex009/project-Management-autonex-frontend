import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { allocationApi, subProjectApi, employeeApi, leaveApi, parentProjectApi } from '../services/api';
import { Plus, Edit, Trash2, X, UserPlus, UserMinus, CheckSquare, AlertTriangle, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { getPmEmployeeId, getPmSubProjects } from '../utils/pmScope';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import AllocationPopover from '../components/AllocationPopover';
import Dropdown from '../components/ui/Dropdown';
import SearchBar from '../components/ui/SearchBar';

// Stable color palette for avatars based on the employee name
const AVATAR_PALETTE = [
  'from-indigo-500 to-violet-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-sky-500 to-blue-500',
  'from-fuchsia-500 to-purple-500',
  'from-lime-500 to-green-500',
  'from-cyan-500 to-sky-500',
];

const getAvatarGradient = (name) => {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

// Role tag constants for time division
const ROLE_TAGS = [
  'Yutori Verifier',
  'Yutori Annotation',
  'Robotics Annotation',
  'Development',
  'Robotics Data Collection',
  'Data Labeling',
  'Quality Review',
  'Smart Factory Development',
];

const AllocationsPage = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const hasHandledLocationProject = useRef(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = localStorage.getItem('role') || 'admin';
  const isPm = role === 'pm';
  const pmEmployeeId = getPmEmployeeId(user);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [allocatedEmployeesOther, setAllocatedEmployeesOther] = useState([]);
  const [filterTab, setFilterTab] = useState('unallocated');
  const [editingAllocation, setEditingAllocation] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  // Time division state
  const [selectedRoleTags, setSelectedRoleTags] = useState([]);
  const [timeDistribution, setTimeDistribution] = useState({});
  const [totalDailyHours, setTotalDailyHours] = useState(8);
  const [employeeSearch, setEmployeeSearch] = useState('');

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['sub-projects'],
    queryFn: subProjectApi.getAll,
  });

  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: employeeApi.getAll,
  });

  const { data: allocations = [], isLoading: allocationsLoading } = useQuery({
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
  const { data: parentProjects = [] } = useQuery({
    queryKey: ['parent-projects'],
    queryFn: parentProjectApi.getAll,
  });

  const isDataLoading = projectsLoading || employeesLoading || allocationsLoading;
  const visibleProjects = isPm ? getPmSubProjects(projects, parentProjects, pmEmployeeId, allocations) : projects;
  const visibleProjectIds = new Set(visibleProjects.map((project) => project.id));
  const visibleAllocations = isPm
    ? allocations.filter((allocation) => visibleProjectIds.has(allocation.sub_project_id))
    : allocations;




  const createMutation = useMutation({
    mutationFn: allocationApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['allocations']);
      queryClient.invalidateQueries(['sub-projects']);
      setIsModalOpen(false);
      // setSuccessMessage removed
      toast.success('Allocation created successfully!');
    },
    onError: (err) => {
      const message = err.response?.data?.detail?.message || err.response?.data?.detail || err.message || 'Failed to create allocation';
      toast.error(message);
    },
  });

  const closeCreateModal = () => {
    setIsModalOpen(false);
    setSelectedProject(null);
    setSelectedEmployees([]);
    setSelectedRoleTags([]);
    setTimeDistribution({});
    setTotalDailyHours(8);
    setFilterTab('unallocated');
  };

  const deleteMutation = useMutation({
    mutationFn: allocationApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['allocations']);
      queryClient.invalidateQueries(['sub-projects']);
      toast.success('Allocation removed successfully!');
    },
    onError: (err) => {
      const message = err.response?.data?.detail || err.message || 'Failed to delete allocation';
      toast.error(message);
    },
  });

  // Handle incoming project selection from Projects page
  useEffect(() => {
    if (location.state?.projectId && !hasHandledLocationProject.current) {
      const project = visibleProjects.find(p => p.id === location.state.projectId);
      if (project) {
        hasHandledLocationProject.current = true;
        setSelectedProject(project);
        setIsModalOpen(true);
      }
    }
  }, [location.state, visibleProjects]);

  useEffect(() => {
    if (selectedProject) {
      const allocatedToCurrentProject = allocations
        .filter(a => a.sub_project_id === selectedProject.id)
        .map(a => a.employee_id);



      // Find which employees are allocated to OTHER projects (not current)
      const allocatedToOtherProjects = {};
      allocations.forEach(alloc => {
        if (alloc.sub_project_id !== selectedProject.id) {
          if (!allocatedToOtherProjects[alloc.employee_id]) {
            allocatedToOtherProjects[alloc.employee_id] = [];
          }
          const proj = projects.find(p => p.id === alloc.sub_project_id);
          if (proj) {
            allocatedToOtherProjects[alloc.employee_id].push({
              projectId: proj.id,
              projectName: proj.name,
              hours: alloc.total_daily_hours || 8,
            });
          }
        }
      });

      // Get all active employees (including those already in this project so the list is never empty)
      const requiredSkills = selectedProject.required_expertise || [];
      const matchingEmployees = employees
        .filter(emp => emp.status !== 'active' ? false : true)
        .map(emp => {
          const empSkills = emp.skills || [];
          const skillMatch = requiredSkills.length === 0 || requiredSkills.some(skill =>
            empSkills.some(empSkill =>
              empSkill.toLowerCase().includes(skill.toLowerCase())
            )
          );
          const alreadyInProject = allocatedToCurrentProject.includes(emp.id);
          return { ...emp, skillMatch, alreadyInProject };
        })
        .sort((a, b) => {
          // Sort: skill-matched first, then unallocated, then already-in-project
          if (a.alreadyInProject !== b.alreadyInProject) return a.alreadyInProject ? 1 : -1;
          return b.skillMatch - a.skillMatch;
        });

      // Split into unallocated and allocated-to-other-projects
      const unallocatedList = matchingEmployees
        .filter(emp => !allocatedToOtherProjects[emp.id])
        .map(emp => ({
          ...emp,
          currentProjects: allocatedToOtherProjects[emp.id] || null,
        }));

      const allocatedOtherList = matchingEmployees
        .filter(emp => allocatedToOtherProjects[emp.id])
        .map(emp => ({
          ...emp,
          currentProjects: allocatedToOtherProjects[emp.id],
        }));

      setAvailableEmployees(unallocatedList);
      setAllocatedEmployeesOther(allocatedOtherList);
    }
  }, [selectedProject, employees, allocations, leaves, projects]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Check for over-allocation
    const currentAllocated = allocations.filter(a => a.sub_project_id === selectedProject.id).length;
    const newTotal = currentAllocated + selectedEmployees.length;
    const required = selectedProject.required_manpower || 0;

    if (newTotal > required) {
      setConfirmState({
        variant: 'warning',
        title: 'Over-allocation detected',
        message: `This allocation will exceed the required manpower by ${newTotal - required}. Do you want to proceed anyway?`,
        details: [
          { label: 'Required manpower', value: required },
          { label: 'Currently allocated', value: currentAllocated },
          { label: "You're adding", value: selectedEmployees.length },
          { label: 'Total will be', value: newTotal, highlight: true },
        ],
        confirmText: 'Proceed anyway',
        onConfirm: () => {
          setConfirmState(null);
          performAllocation();
        },
      });
      return;
    }

    performAllocation();
  };

  const performAllocation = () => {
    // Create allocations for all selected employees
    selectedEmployees.forEach(emp => {
      const data = {
        employee_id: emp.id,
        sub_project_id: selectedProject.id,
        total_daily_hours: totalDailyHours,
        role_tags: selectedRoleTags.length > 0 ? selectedRoleTags : [],
        time_distribution: selectedRoleTags.length > 0 ? timeDistribution : {},
        weekly_hours_allocated: emp.weekly_availability || 40,
        weekly_tasks_allocated: 0,
        productivity_override: 1.0,
        effective_week: new Date().toISOString().split('T')[0],
        active_start_date: selectedProject.start_date,
        active_end_date: selectedProject.end_date,
        override_flag: emp.currentProjects ? true : false,  // Mark as override if already allocated
        override_reason: emp.currentProjects ? 'PM Override - Dual allocation' : null,
      };

      createMutation.mutate(data);
    });
  };

  const handleEmployeeToggle = (employee) => {
    setSelectedEmployees(prev => {
      const exists = prev.find(e => e.id === employee.id);
      if (exists) {
        return prev.filter(e => e.id !== employee.id);
      } else {
        return [...prev, employee];
      }
    });
  };

  const handleSelectAll = () => {
    const displayEmployees = filterTab === 'unallocated'
      ? availableEmployees
      : filterTab === 'allocated'
        ? allocatedEmployeesOther
        : [...availableEmployees, ...allocatedEmployeesOther];

    if (selectedEmployees.length === displayEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(displayEmployees);
    }
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? emp.name : 'Unknown';
  };

  const getProjectName = (projectId) => {
    const proj = visibleProjects.find(p => p.id === projectId);
    return proj ? proj.name : 'Unknown';
  };

  const getRequiredManpower = (projectId) => {
    const proj = visibleProjects.find(p => p.id === projectId);
    return proj ? proj.required_manpower : 0;
  };

  const getAllocatedEmployees = (projectId) => {
    return visibleAllocations.filter(a => a.sub_project_id === projectId);
  };

  // Group allocations by project
  const projectAllocations = visibleProjects.map(project => ({
    project,
    allocations: visibleAllocations.filter(a => a.sub_project_id === project.id),
    requiredManpower: project.required_manpower || 0,
  })).filter(pa => pa.allocations.length > 0 || pa.requiredManpower > 0);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjectAllocations = useMemo(() => {
    if (!searchQuery.trim()) return projectAllocations;
    const q = searchQuery.toLowerCase();
    return projectAllocations.filter(({ project, allocations: projectAllocs }) => {
      if (project.name.toLowerCase().includes(q)) return true;
      return projectAllocs.some(a => {
        const empName = getEmployeeName(a.employee_id).toLowerCase();
        return empName.includes(q);
      });
    });
  }, [projectAllocations, searchQuery, employees]);


  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Allocations</h1>
          <p className="mt-1 text-sm text-slate-500">Assign employees to projects</p>
        </div>
        <Button onClick={() => { setSelectedProject(null); setSelectedEmployees([]); setIsModalOpen(true); }}>
          <Plus className="w-4 h-4" />
          Create Allocation
        </Button>
      </div>



      {/* Search Filter */}
      <div className="flex justify-between items-center mb-4">
        <SearchBar responsive
          value={searchQuery}
          onChange={(val) => { setSearchQuery(val); setCurrentPage(1); }}
          placeholder="Search projects or employees..."
        />
      </div>

      <Table
        loading={isDataLoading}
        columns={[
          {
            key: 'project',
            label: 'Project Name',
            render: (project) => (
              <div>
                <div className="font-semibold text-slate-800">{project.name}</div>
                <div className="text-xs text-slate-400">{project.project_type}</div>
              </div>
            ),
          },
          {
            key: 'requiredManpower',
            label: 'Required',
            align: 'center',
            render: (value) => (
              <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-semibold text-sm">
                {value}
              </span>
            ),
          },
          {
            key: 'allocations',
            label: 'Allocated Employees',
            render: (projectAllocs, row) => {
              const project = row.project;
              const requiredManpower = row.requiredManpower;
              return (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {projectAllocs.slice(0, 3).map(alloc => {
                        const emp = employees.find(e => e.id === alloc.employee_id);
                        const name = emp?.name || 'Unknown';
                        const initials = name.split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
                        const gradient = getAvatarGradient(name);
                        return (
                          <div key={alloc.id} className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} text-white flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm ring-1 ring-slate-100/50 shrink-0`} title={name}>
                            {initials}
                          </div>
                        );
                      })}
                      {projectAllocs.length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white text-[10px] font-bold text-slate-500 flex items-center justify-center shadow-sm ring-1 ring-slate-100/50 shrink-0">
                          +{projectAllocs.length - 3}
                        </div>
                      )}
                    </div>
                    <button onClick={() => { setSelectedProject(project); setIsModalOpen(true); }} className="w-8 h-8 rounded-full border border-dashed border-slate-300 text-slate-400 hover:text-indigo-600 hover:border-indigo-500 hover:bg-indigo-50/50 flex items-center justify-center transition-all shrink-0" title="Add employees">
                      <UserPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const assignedCount = projectAllocs.length;
                      const todayStr = new Date().toISOString().slice(0, 10);
                      const onLeaveToday = projectAllocs.filter(a =>
                        leaves.some(l =>
                          l.employee_id === a.employee_id &&
                          l.status === 'approved' &&
                          String(l.start_date).slice(0, 10) <= todayStr &&
                          String(l.end_date).slice(0, 10) >= todayStr
                        )
                      ).length;
                      return (
                        <>
                          {onLeaveToday > 0 && (
                            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200/50 rounded-full text-xs font-semibold flex items-center gap-1 shrink-0" title={`${onLeaveToday} employee${onLeaveToday > 1 ? 's' : ''} on approved leave today`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <span>{onLeaveToday} Leave</span>
                            </span>
                          )}
                          <AllocationPopover
                            project={project}
                            allocations={projectAllocs}
                            employees={employees}
                            badgeContent={(
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer select-none ${assignedCount >= requiredManpower ? 'bg-emerald-50/40 text-emerald-700 border-emerald-100/70 hover:bg-emerald-100/40' : 'bg-amber-50/40 text-amber-700 border-amber-100/70 hover:bg-amber-100/40'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${assignedCount >= requiredManpower ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                <span>{assignedCount} / {requiredManpower}</span>
                              </span>
                            )}
                            onOpenAllocations={() => { setSelectedProject(project); setIsModalOpen(true); }}
                          />
                        </>
                      );
                    })()}
                  </div>
                </div>
              );
            },
          },
          {
            key: '_edit',
            label: 'Actions',
            align: 'right',
            render: (_, row) => (
              <button
                onClick={() => setEditingAllocation({ project: row.project, allocations: row.allocations })}
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Edit"
              >
                <Edit className="w-4 h-4" />
              </button>
            ),
          },
        ]}
        data={filteredProjectAllocations}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
        emptyState={{
          title: searchQuery ? 'No matching allocations' : 'No allocations yet',
          description: searchQuery ? 'Try adjusting your search query.' : 'Create your first allocation to get started',
        }}
      />

      {/* Create Allocation Modal */}
      <Modal isOpen={isModalOpen} onClose={closeCreateModal} size="3xl" maxHeight="95vh">
        <Modal.Header onClose={closeCreateModal}>
          <h2 className="text-xl font-semibold text-gray-900">
            Create Allocation
          </h2>
        </Modal.Header>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <Modal.Body className="space-y-5">
              {/* Project Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Project <span className="text-red-500">*</span>
                </label>
                <Dropdown
                  options={visibleProjects.map(project => ({
                    value: project.id.toString(),
                    label: `${project.name} - Required: ${project.required_manpower || 0}`
                  }))}
                  value={selectedProject?.id.toString() || ''}
                  onChange={(val) => {
                    const project = visibleProjects.find(p => p.id === parseInt(val));
                    setSelectedProject(project);
                    setSelectedEmployees([]);
                  }}
                  placeholder="Choose a project..."
                />
              </div>

              {selectedProject && (
                <>
                  {/* Compact project summary */}
                  {(() => {
                    const projectAllocs = allocations.filter(a => a.sub_project_id === selectedProject.id);
                    const allocatedEmps = projectAllocs
                      .map(a => ({ alloc: a, emp: employees.find(e => e.id === a.employee_id) }))
                      .filter(x => x.emp);
                    const required = selectedProject.required_manpower || 0;
                    const filled = projectAllocs.length;
                    const skills = selectedProject.required_expertise || [];

                    return (
                      <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-3 space-y-3">
                        {/* Compact stats row */}
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-blue-900/70 uppercase tracking-wide">Required</span>
                              <span className="text-sm font-bold text-blue-700 bg-white border border-blue-200 rounded-md px-2 py-0.5">{required}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-blue-900/70 uppercase tracking-wide">Allocated</span>
                              <span className={`text-sm font-bold rounded-md px-2 py-0.5 border ${
                                filled >= required
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>{filled}/{required}</span>
                            </div>
                          </div>
                          {skills.length > 0 && (
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-medium text-blue-900/70 uppercase tracking-wide shrink-0">Skills</span>
                              <div className="flex flex-wrap gap-1">
                                {skills.slice(0, 4).map((skill, idx) => (
                                  <span key={idx} className="px-1.5 py-0.5 text-[11px] font-medium bg-white text-blue-700 border border-blue-200 rounded">
                                    {skill}
                                  </span>
                                ))}
                                {skills.length > 4 && (
                                  <span className="text-[11px] text-blue-700/70">+{skills.length - 4}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Employees on this project */}
                        <div className="pt-2 border-t border-blue-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-blue-900/80 uppercase tracking-wide">
                              On this project
                            </span>
                            <span className="text-[11px] text-blue-900/60">{allocatedEmps.length} employee{allocatedEmps.length === 1 ? '' : 's'}</span>
                          </div>
                          {allocatedEmps.length === 0 ? (
                            <p className="text-xs text-slate-500 italic">No one allocated yet</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {allocatedEmps.map(({ alloc, emp }) => {
                                const initials = (emp.name || '')
                                  .trim()
                                  .split(/\s+/)
                                  .map(p => p.charAt(0).toUpperCase())
                                  .slice(0, 2)
                                  .join('') || '?';
                                const isRemoving = deleteMutation.isPending && deleteMutation.variables === alloc.id;
                                return (
                                  <div
                                    key={alloc.id}
                                    title={`${emp.name}${alloc.total_daily_hours ? ` Â· ${alloc.total_daily_hours}h/day` : ''}`}
                                    className={`group inline-flex items-center gap-1.5 pl-1 pr-1 py-0.5 bg-white border border-slate-200 rounded-full shadow-sm transition-opacity ${isRemoving ? 'opacity-50' : ''}`}
                                  >
                                    <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-semibold flex items-center justify-center">
                                      {initials}
                                    </span>
                                    <span className="text-xs text-slate-700 max-w-[120px] truncate">{emp.name}</span>
                                    <button
                                      type="button"
                                      disabled={isRemoving}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setConfirmState({
                                          variant: 'danger',
                                          title: 'Remove team member',
                                          message: `Remove ${emp.name} from "${selectedProject.name}"?`,
                                          confirmText: 'Remove',
                                          onConfirm: () => {
                                            deleteMutation.mutate(alloc.id);
                                            setConfirmState(null);
                                          },
                                        });
                                      }}
                                      className="ml-0.5 w-4 h-4 rounded-full text-slate-400 hover:text-white hover:bg-rose-500 flex items-center justify-center transition-colors disabled:cursor-not-allowed"
                                      title={`Remove ${emp.name}`}
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Employee Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Allocate Employees <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <CheckSquare className="w-4 h-4" />
                        {selectedEmployees.length === (filterTab === 'unallocated' ? availableEmployees : filterTab === 'allocated' ? allocatedEmployeesOther : [...availableEmployees, ...allocatedEmployeesOther]).length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-1 mb-3 p-1 bg-gray-100 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setFilterTab('unallocated')}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${filterTab === 'unallocated'
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                          }`}
                      >
                        Available ({availableEmployees.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterTab('allocated')}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${filterTab === 'allocated'
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                          }`}
                      >
                        On Other Projects ({allocatedEmployeesOther.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterTab('all')}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${filterTab === 'all'
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                          }`}
                      >
                        All ({availableEmployees.length + allocatedEmployeesOther.length})
                      </button>
                    </div>

                    {/* Employee Search */}
                    <div className="mb-3">
                      <SearchBar
                        placeholder="Search employees by name or email..."
                        value={employeeSearch}
                        onChange={setEmployeeSearch}
                        className="w-full"
                      />
                    </div>



                    {/* Employee List */}
                    {(() => {
                      const allTabEmployees = filterTab === 'unallocated'
                        ? availableEmployees
                        : filterTab === 'allocated'
                          ? allocatedEmployeesOther
                          : [...availableEmployees, ...allocatedEmployeesOther];
                      const q = employeeSearch.trim().toLowerCase();
                      const displayEmployees = q
                        ? allTabEmployees.filter(emp =>
                            emp.name.toLowerCase().includes(q) ||
                            (emp.email || '').toLowerCase().includes(q)
                          )
                        : allTabEmployees;

                      if (displayEmployees.length === 0) {
                        return (
                          <div className="border border-gray-200 rounded-md p-8 text-center">
                            <p className="text-gray-500">
                              {filterTab === 'unallocated'
                                ? 'No unallocated employees with matching skills'
                                : filterTab === 'allocated'
                                  ? 'No allocated employees available'
                                  : 'No employees available with matching skills'}
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="border border-gray-200 rounded-md max-h-64 overflow-y-auto">
                          {displayEmployees.map(employee => (
                            <div
                              key={employee.id}
                              onClick={() => !employee.alreadyInProject && handleEmployeeToggle(employee)}
                              className={`p-3 border-b border-gray-100 last:border-b-0 ${employee.alreadyInProject ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:bg-gray-50'} ${selectedEmployees.find(e => e.id === employee.id) ? 'bg-blue-50' : ''
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={!!selectedEmployees.find(e => e.id === employee.id)}
                                  disabled={employee.alreadyInProject}
                                  onChange={() => { }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-gray-900">{employee.name}</p>
                                    {employee.skillMatch && (
                                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                                        Skill Match
                                      </span>
                                    )}
                                    {employee.alreadyInProject && (
                                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-medium">
                                        In This Project
                                      </span>
                                    )}
                                    {employee.currentProjects && !employee.alreadyInProject && (
                                      <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full font-medium">
                                        Other Project
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-500">{employee.email}</span>
                                    <span className="text-xs text-gray-400">â€¢</span>
                                    <span className="text-xs text-gray-500">{employee.weekly_availability}h/week</span>
                                  </div>
                                  {/* Show current projects if allocated */}
                                  {employee.currentProjects && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {employee.currentProjects.map((proj, idx) => (
                                        <span key={idx} className="px-2 py-0.5 text-xs bg-slate-200 text-slate-700 rounded">
                                          {proj.projectName} ({proj.hours}h/day)
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {employee.skills?.slice(0, 3).map((skill, idx) => (
                                      <span key={idx} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                        {skill}
                                      </span>
                                    ))}
                                    {employee.skills?.length > 3 && (
                                      <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-500 rounded">
                                        +{employee.skills.length - 3}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {selectedEmployees.find(e => e.id === employee.id) && (
                                  <div className="text-green-600">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {selectedEmployees.length > 0 && (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-sm text-green-800">
                          <strong>{selectedEmployees.length}</strong> employee{selectedEmployees.length !== 1 ? 's' : ''} selected
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Time Division Section - shown when employees are selected */}
                  {selectedEmployees.length > 0 && (
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        Time Division (Optional)
                      </h4>
                      <p className="text-xs text-gray-500 mb-4">
                        Configure how allocated hours are distributed across roles. If no roles are selected, employees work full hours without role distinction.
                      </p>

                      {/* Total Daily Hours */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Total Daily Hours
                        </label>
                        <Dropdown
                          options={['', ...['4 hours', '6 hours', '8 hours', '10 hours', '12 hours']].map((h, i) =>
                            h ? { value: (4 + i * 2).toString(), label: h } : { value: '', label: 'Not specified' }
                          )}
                          value={totalDailyHours.toString()}
                          onChange={(val) => {
                            const newHours = val === '' ? '' : parseInt(val);
                            setTotalDailyHours(newHours);
                            if (newHours !== '') {
                              const currentSum = Object.values(timeDistribution).reduce((a, b) => a + b, 0);
                              if (currentSum > newHours) {
                                setTimeDistribution({});
                              }
                            }
                          }}
                          placeholder="Not specified"
                        />
                      </div>

                      {/* Role Tags Selection */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Role Tags
                        </label>
                        <div className="flex flex-wrap gap-3">
                          {ROLE_TAGS.map(tag => (
                            <label key={tag} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedRoleTags.includes(tag)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedRoleTags([...selectedRoleTags, tag]);
                                    if (totalDailyHours !== '') {
                                      const newTags = [...selectedRoleTags, tag];
                                      const hoursPerRole = Math.floor(totalDailyHours / newTags.length);
                                      const newDist = {};
                                      newTags.forEach((t, idx) => {
                                        newDist[t] = idx === 0
                                          ? totalDailyHours - (hoursPerRole * (newTags.length - 1))
                                          : hoursPerRole;
                                      });
                                      setTimeDistribution(newDist);
                                    } else {
                                      setTimeDistribution(prev => ({ ...prev, [tag]: 0 }));
                                    }
                                  } else {
                                    setSelectedRoleTags(selectedRoleTags.filter(t => t !== tag));
                                    const newDist = { ...timeDistribution };
                                    delete newDist[tag];
                                    setTimeDistribution(newDist);
                                  }
                                }}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-sm text-gray-700">{tag}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Hours Distribution */}
                      {selectedRoleTags.length > 0 && (
                        <div className="space-y-3">
                          <label className="block text-sm font-medium text-gray-700">
                            Hours per Role
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {selectedRoleTags.map(tag => (
                              <div key={tag} className="flex items-center gap-2">
                                <span className="text-sm text-gray-600 min-w-[60px] sm:min-w-[80px]">{tag}:</span>
                                <input
                                  type="number"
                                  min="0"
                                  max={totalDailyHours}
                                  value={timeDistribution[tag] || 0}
                                  onChange={(e) => {
                                    const hours = parseInt(e.target.value) || 0;
                                    setTimeDistribution({
                                      ...timeDistribution,
                                      [tag]: Math.min(hours, totalDailyHours)
                                    });
                                  }}
                                  className="input w-20 text-center"
                                />
                                <span className="text-xs text-gray-500">hrs</span>
                              </div>
                            ))}
                          </div>

                          {/* Validation */}
                          {(() => {
                            const totalAssigned = Object.values(timeDistribution).reduce((a, b) => a + b, 0);
                            const isValid = totalAssigned === totalDailyHours;
                            return (
                              <div className={`mt-2 p-2 rounded text-sm ${isValid
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                                }`}>
                                {isValid
                                  ? `âœ“ Hours correctly distributed: ${totalAssigned}/${totalDailyHours}`
                                  : `âš  Hours mismatch: ${totalAssigned}/${totalDailyHours} (adjust to match)`
                                }
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="cancel" onClick={closeCreateModal}>Cancel</Button>
            <Button
              type="submit"
              disabled={!selectedProject || selectedEmployees.length === 0 || createMutation.isPending}
              isLoading={createMutation.isPending}
            >
              {!createMutation.isPending && `Allocate ${selectedEmployees.length} Employee${selectedEmployees.length !== 1 ? 's' : ''}`}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Edit Allocation Modal */}
      {editingAllocation && (
        <Modal isOpen onClose={() => setEditingAllocation(null)} size="2xl" maxHeight="95vh">
          <Modal.Header onClose={() => setEditingAllocation(null)}>
            <h2 className="text-xl font-semibold text-gray-900">
              Manage Allocations - {editingAllocation.project.name}
            </h2>
          </Modal.Header>

          <Modal.Body className="space-y-4">
              {editingAllocation.allocations.map(alloc => {
                const emp = employees.find(e => e.id === alloc.employee_id);
                return (
                  <div key={alloc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-md hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-medium">
                        {emp?.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{emp?.name}</p>
                        <p className="text-sm text-gray-500">{emp?.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setConfirmState({
                          variant: 'danger',
                          title: 'Remove team member',
                          message: `Remove ${emp?.name} from this project?`,
                          confirmText: 'Remove',
                          onConfirm: () => {
                            deleteMutation.mutate(alloc.id);
                            setEditingAllocation(null);
                            setConfirmState(null);
                          },
                        });
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Remove"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="cancel" onClick={() => setEditingAllocation(null)} className="w-full">
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={confirmState?.onConfirm}
        title={confirmState?.title}
        message={confirmState?.message}
        details={confirmState?.details}
        variant={confirmState?.variant}
        confirmText={confirmState?.confirmText}
      />    </div>
  );
};

export default AllocationsPage;
