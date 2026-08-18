import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import UserAvatar from "../components/ui/UserAvatar";
import {
  allocationApi,
  subProjectApi,
  employeeApi,
} from "../services/api";
import {
  Plus,
  Edit,
  Trash2,
  X,
  UserPlus,
  UserMinus,
  UserX,
  CheckSquare,
  AlertTriangle,
  Users,
  Search,
  Filter,
  Home,
  Building2,
} from "lucide-react";
import toast from "react-hot-toast";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { isProjectScopedRole } from "../utils/roleAccess";
import Table from "../components/ui/Table";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import AllocationPopover from "../components/AllocationPopover";
import Dropdown from "../components/ui/Dropdown";
import SearchBar from "../components/ui/SearchBar";
import { formatDisplayName } from "../utils/displayName";

// Stable color palette for avatars based on the employee name
const AVATAR_PALETTE = [
  "from-indigo-500 to-violet-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-sky-500 to-blue-500",
  "from-fuchsia-500 to-purple-500",
  "from-lime-500 to-green-500",
  "from-cyan-500 to-sky-500",
];

const getAvatarGradient = (name) => {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

// Marks an allocation as the project's team lead. Stored inside role_tags because that is
// already per-(employee, project). Kept identical to the backend's TEAM_LEAD_TAG constant.
export const TEAM_LEAD_TAG = "Team Lead";

// Role tag constants for time division
const ROLE_TAGS = [
  "Yutori Verifier",
  "Yutori Annotation",
  "Robotics Annotation",
  "Development",
  "Robotics Data Collection",
  "Data Labeling",
  "Quality Review",
  "Smart Factory Development",
];

const PAGE_SIZE = 10;

const AllocationsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasHandledLocationProject = useRef(false);
  const role = localStorage.getItem("role") || "admin";
  const isScoped = isProjectScopedRole(role);
  const prefix = isScoped ? "/pm" : "/admin";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [filterTab, setFilterTab] = useState("all");
  const [editingAllocation, setEditingAllocation] = useState(null); // { projectId, projectName }
  const [confirmState, setConfirmState] = useState(null);
  const [showAllAllocated, setShowAllAllocated] = useState(false);

  // Time division state
  const [selectedRoleTags, setSelectedRoleTags] = useState([]);
  const [isTeamLead, setIsTeamLead] = useState(false);
  const [timeDistribution, setTimeDistribution] = useState({});
  const [totalDailyHours, setTotalDailyHours] = useState(8);
  const [employeeSearch, setEmployeeSearch] = useState("");

  // ── CHANGED: one pre-aggregated page from the server, instead of
  // projects + allocations + employees + leaves + wfh + parentProjects all
  // joined and recomputed for every project in the browser. ─────────────
  const {
    data: pageData,
    isLoading: pageLoading,
    isFetching: pageFetching,
  } = useQuery({
    queryKey: ["allocations-page", currentPage, searchQuery],
    queryFn: () =>
      allocationApi.getPage({
        page: currentPage,
        pageSize: PAGE_SIZE,
        search: searchQuery,
      }),
    keepPreviousData: true,
  });

  const rows = pageData?.items || [];
  const totalPages = pageData?.total_pages || 0;
  const totalItems = pageData?.total_items || 0;

  // Lightweight list of every project, for the "Select Project" dropdown only.
  const { data: projects = [] } = useQuery({
    queryKey: ["sub-projects"],
    queryFn: () => subProjectApi.getAll(),
  });

  // ── CHANGED: full employee roster and the "who's on another project"
  // map are only fetched once the Create-Allocation modal is actually
  // open, instead of on every page load. ─────────────────────────────
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: employeeApi.getAll,
    enabled: isModalOpen,
  });

  const { data: employeeProjectsMap = {} } = useQuery({
    queryKey: ["allocations", "employee-projects"],
    queryFn: allocationApi.getEmployeeProjects,
    enabled: isModalOpen,
  });

  // ── CHANGED: full allocation detail for the CURRENTLY SELECTED project
  // only — this replaces deriving "on this project" / edit-modal rows from
  // a giant client-side `allocations` array. ─────────────────────────────
  const activeDetailProjectId = selectedProject?.id ?? editingAllocation?.projectId ?? null;
  const { data: projectDetail } = useQuery({
    queryKey: ["allocations", "project-detail", activeDetailProjectId],
    queryFn: () => allocationApi.getProjectDetail(activeDetailProjectId),
    enabled: !!activeDetailProjectId,
  });

  const createMutation = useMutation({
    mutationFn: allocationApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(["allocations-page"]);
      queryClient.invalidateQueries(["allocations", "project-detail"]);
      queryClient.invalidateQueries(["allocations", "employee-projects"]);
      queryClient.invalidateQueries(["sub-projects"]);
      setIsModalOpen(false);
      toast.success("Allocation created successfully!");
    },
    onError: (err) => {
      const message =
        err.response?.data?.detail?.message ||
        err.response?.data?.detail ||
        err.message ||
        "Failed to create allocation";
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: allocationApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(["allocations-page"]);
      queryClient.invalidateQueries(["allocations", "project-detail"]);
      queryClient.invalidateQueries(["allocations", "employee-projects"]);
      queryClient.invalidateQueries(["sub-projects"]);
      toast.success("Allocation removed successfully!");
    },
    onError: (err) => {
      const message =
        err.response?.data?.detail || err.message || "Failed to delete allocation";
      toast.error(message);
    },
  });

  const closeCreateModal = () => {
    setIsModalOpen(false);
    setSelectedProject(null);
    setSelectedEmployees([]);
    setSelectedRoleTags([]);
    setIsTeamLead(false);
    setTimeDistribution({});
    setTotalDailyHours(8);
    setFilterTab("all");
    setEmployeeSearch("");
    setShowAllAllocated(false);
  };

  // Handle incoming project selection from Projects page
  useEffect(() => {
    if (location.state?.projectId && !hasHandledLocationProject.current && projects.length) {
      const project = projects.find((p) => p.id === location.state.projectId);
      if (project) {
        hasHandledLocationProject.current = true;
        setSelectedProject(project);
        setIsModalOpen(true);
      }
    }
  }, [location.state, projects]);

  // ── Derive available / allocated-elsewhere employee lists for the modal
  // from the lazily-fetched roster + employee-projects map + this project's
  // own detail (instead of scanning the whole allocations array). ────────
  const { availableEmployees, allocatedEmployeesOther } = useMemo(() => {
    if (!selectedProject || !employees.length) {
      return { availableEmployees: [], allocatedEmployeesOther: [] };
    }
    const allocatedToCurrentProjectIds = new Set(
      (projectDetail?.project_id === selectedProject.id ? projectDetail.items : [])
        .filter((it) => !it.stale)
        .map((it) => it.employee_id),
    );

    const requiredSkills = selectedProject.required_expertise || [];
    const matching = employees
      .filter((emp) => emp.status !== "archived")
      .map((emp) => {
        const empSkills = emp.skills || [];
        const skillMatch =
          requiredSkills.length === 0 ||
          requiredSkills.some((skill) =>
            empSkills.some((empSkill) => empSkill.toLowerCase().includes(skill.toLowerCase())),
          );
        const alreadyInProject = allocatedToCurrentProjectIds.has(emp.id);
        const currentProjects = (employeeProjectsMap[String(emp.id)] || []).filter(
          (p) => p.project_id !== selectedProject.id,
        );
        return { ...emp, skillMatch, alreadyInProject, currentProjects: currentProjects.length ? currentProjects : null };
      })
      .sort((a, b) => {
        if (a.alreadyInProject !== b.alreadyInProject) return a.alreadyInProject ? 1 : -1;
        return b.skillMatch - a.skillMatch;
      });

    return {
      availableEmployees: matching.filter((e) => !e.currentProjects),
      allocatedEmployeesOther: matching.filter((e) => e.currentProjects),
    };
  }, [selectedProject, employees, employeeProjectsMap, projectDetail]);

  // Required/assigned stats for the selected project — comes straight from
  // its row in the current page when available, else from the lazy detail
  // fetch (covers the case where the project isn't on the visible page,
  // e.g. selected via the "Select Project" dropdown search).
  const selectedProjectStats = useMemo(() => {
    if (!selectedProject) return { required: 0, assigned: 0 };
    const row = rows.find((r) => r.project_id === selectedProject.id);
    if (row) return { required: row.required_manpower, assigned: row.assigned_manpower };
    return {
      required: projectDetail?.required_manpower || 0,
      assigned: (projectDetail?.items || []).filter((i) => !i.stale).length,
    };
  }, [selectedProject, rows, projectDetail]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const { required, assigned: currentAllocated } = selectedProjectStats;
    const newTotal = currentAllocated + selectedEmployees.length;

    if (newTotal > required) {
      setConfirmState({
        variant: "warning",
        title: "Over-allocation detected",
        message: `This allocation will exceed the required manpower by ${newTotal - required}. Do you want to proceed anyway?`,
        details: [
          { label: "Required manpower", value: required },
          { label: "Currently allocated", value: currentAllocated },
          { label: "You're adding", value: selectedEmployees.length },
          { label: "Total will be", value: newTotal, highlight: true },
        ],
        confirmText: "Proceed anyway",
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
    selectedEmployees.forEach((emp) => {
      const data = {
        employee_id: emp.id,
        sub_project_id: selectedProject.id,
        total_daily_hours: totalDailyHours,
        role_tags: isTeamLead ? [...selectedRoleTags, TEAM_LEAD_TAG] : selectedRoleTags,
        time_distribution: selectedRoleTags.length > 0 ? timeDistribution : {},
        weekly_hours_allocated: emp.weekly_availability || 40,
        weekly_tasks_allocated: 0,
        productivity_override: 1.0,
        effective_week: new Date().toISOString().split("T")[0],
        active_start_date: selectedProject.start_date,
        active_end_date: selectedProject.end_date,
        override_flag: emp.currentProjects ? true : false,
        override_reason: emp.currentProjects ? "PM Override - Dual allocation" : null,
      };
      createMutation.mutate(data);
    });
  };

  const handleEmployeeToggle = (employee) => {
    setSelectedEmployees((prev) => {
      const exists = prev.find((e) => e.id === employee.id);
      if (exists) return prev.filter((e) => e.id !== employee.id);
      return [...prev, employee];
    });
  };

  const handleSelectAll = () => {
    const displayEmployees =
      filterTab === "unallocated"
        ? availableEmployees
        : [...availableEmployees, ...allocatedEmployeesOther];

    if (selectedEmployees.length === displayEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(displayEmployees);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar — search (left) · create allocation (right) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SearchBar
          responsive
          value={searchQuery}
          onChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1); // CHANGED: search now re-queries the server, so reset to page 1
          }}
          placeholder="Search projects or employees..."
        />
        <button
          type="button"
          onClick={() => {
            setSelectedProject(null);
            setSelectedEmployees([]);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Allocation
        </button>
      </div>

      <Table
        variant="untitled"
        allowOverflow
        loading={pageLoading || pageFetching}
        columns={[
          {
            key: "project",
            label: "Project",
            width: "w-[24%]",
            render: (_, row) => (
              <button
                type="button"
                onClick={() => navigate(`${prefix}/sub-projects?focus=${row.project_id}`)}
                className="group/proj -mx-1 flex w-full min-w-0 items-center gap-3 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-slate-50"
              >
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-[13px] font-semibold ring-1 ring-slate-200 shrink-0">
                  {(row.project_name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="group/tip relative min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-slate-900 transition-colors group-hover/proj:text-indigo-600">
                    {row.project_name}
                  </div>
                  <div className="truncate text-[12px] text-slate-400">
                    {row.project_type || "—"}
                  </div>
                  <span className="pointer-events-none absolute left-0 top-full z-40 mt-1 hidden w-max max-w-[280px] whitespace-normal break-words rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-lg group-hover/tip:block">
                    {row.project_name}
                  </span>
                </div>
              </button>
            ),
          },
          {
            key: "allocations",
            label: "Allocated Employees",
            width: "w-[28%]",
            // CHANGED: renders the server-provided 6-avatar preview directly —
            // no client-side merge of allocations + PM ids + lead ids.
            render: (_, row) => (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5 overflow-hidden">
                  {row.allocated_preview.map((p) => (
                    <UserAvatar
                      key={p.allocation_id}
                      src={p.avatar_url}
                      name={formatDisplayName(p.name)}
                      size="sm"
                      className="w-8 h-8 border-2 border-white shadow-xs shrink-0"
                      fallbackClassName="w-8 h-8 text-[11px]"
                    />
                  ))}
                  {row.total_allocated_count > row.allocated_preview.length && (
                    <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white text-[10px] font-bold text-slate-500 flex items-center justify-center shadow-sm shrink-0">
                      +{row.total_allocated_count - row.allocated_preview.length}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedProject({ id: row.project_id, name: row.project_name });
                    setIsModalOpen(true);
                  }}
                  className="w-8 h-8 rounded-full border border-dashed border-slate-300 text-slate-400 hover:text-indigo-600 hover:border-indigo-500 hover:bg-indigo-50/50 flex items-center justify-center transition-all shrink-0"
                  title="Add employees"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                </button>
              </div>
            ),
          },
          {
            key: "required_manpower",
            label: "Required",
            align: "left",
            width: "w-[12%]",
            render: (_, row) => (
              <span
                className="text-[13px] font-medium text-slate-700 tabular-nums"
                title={
                  row.pm_slots > 0 || row.lead_slots > 0
                    ? `${row.requested_manpower} role slot(s) + ${row.pm_slots} manager(s) + ${row.lead_slots} lead(s)`
                    : undefined
                }
              >
                {row.required_manpower}
                {(row.pm_slots > 0 || row.lead_slots > 0) && (
                  <span className="ml-1 text-[11px] font-normal text-slate-400">
                    ({row.pm_slots} PM &middot; {row.lead_slots} Lead)
                  </span>
                )}
              </span>
            ),
          },
          {
            key: "_fill",
            label: "Current Team Status",
            width: "w-[26%]",
            // CHANGED: wfo/wfh/on-leave counts come straight from the row —
            // no per-employee leave/WFH scan in the browser.
            render: (_, row) => {
              const full = row.assigned_manpower >= row.required_manpower && row.required_manpower > 0;
              return (
                <div className="flex items-center gap-3">
                  <AllocationPopover
                    project={{ id: row.project_id, name: row.project_name }}
                    // Lazily loads full detail on open — see fetchDetail below.
                    fetchDetail={() => allocationApi.getProjectDetail(row.project_id)}
                    triggerClassName="inline-flex items-center rounded-md focus:outline-none"
                    badgeContent={
                      <div className="flex items-center gap-3 cursor-pointer select-none">
                        <span
                          className={`text-[13px] font-semibold tabular-nums ${full ? "text-emerald-600" : "text-slate-700"}`}
                          title={`${row.assigned_manpower} allocated of ${row.required_manpower} required`}
                        >
                          {row.assigned_manpower}
                          {(row.pm_slots > 0 || row.lead_slots > 0) && (
                            <span className="ml-1 text-[11px] font-normal text-slate-400">
                              ({row.pm_slots} PM &middot; {row.lead_slots} Lead)
                            </span>
                          )}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 text-[12px] text-slate-500"
                          title="Working from office today"
                        >
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {row.wfo_count} WFO
                        </span>
                        <span
                          className="inline-flex items-center gap-1 text-[12px] text-slate-500"
                          title="Working from home today"
                        >
                          <Home className="w-3.5 h-3.5 text-slate-400" />
                          {row.wfh_count} WFH
                        </span>
                      </div>
                    }
                    onOpenAllocations={() => {
                      setSelectedProject({ id: row.project_id, name: row.project_name });
                      setIsModalOpen(true);
                    }}
                  />
                  {row.on_leave_count > 0 && (
                    <span
                      className="inline-flex items-center gap-1.5 text-[12px] font-medium text-amber-600 shrink-0"
                      title={`${row.on_leave_count} on approved leave today`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {row.on_leave_count} on leave
                    </span>
                  )}
                </div>
              );
            },
          },
          {
            key: "_edit",
            label: "Actions",
            align: "right",
            width: "w-[10%]",
            render: (_, row) => (
              <button
                onClick={() =>
                  setEditingAllocation({ projectId: row.project_id, projectName: row.project_name })
                }
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Edit"
              >
                <Edit className="w-4 h-4" />
              </button>
            ),
          },
        ]}
        data={rows}
        // CHANGED: pagination is now server-driven. `rows` is already exactly
        // one page, so Table should render it as-is; page controls below.
        serverPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
        emptyState={{
          title: searchQuery ? "No matching allocations" : "No allocations yet",
          description: searchQuery
            ? "Try adjusting your search query."
            : "Create your first allocation to get started",
        }}
      />

      {/* Create Allocation Modal */}
      <Modal isOpen={isModalOpen} onClose={closeCreateModal} size="3xl" maxHeight="95vh">
        <Modal.Header onClose={closeCreateModal} className="!py-4">
          <h2 className="text-base font-semibold text-slate-900">Create Allocation</h2>
        </Modal.Header>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <Modal.Body className="space-y-3.5 !pt-3">
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
              <div className="flex-1 min-w-[240px]">
                <label className="block text-[13px] font-medium text-slate-700 mb-1">
                  Select Project <span className="text-red-500">*</span>
                </label>
                <Dropdown
                  options={projects.map((project) => {
                    const row = rows.find((r) => r.project_id === project.id);
                    const req = row ? row.required_manpower : project.required_manpower || 0;
                    return { value: project.id.toString(), label: `${project.name} - Required: ${req}` };
                  })}
                  value={selectedProject?.id?.toString() || ""}
                  onChange={(val) => {
                    const project = projects.find((p) => p.id === parseInt(val));
                    setSelectedProject(project);
                    setSelectedEmployees([]);
                  }}
                  placeholder="Choose a project..."
                />
              </div>
              {selectedProject &&
                (() => {
                  const { required, assigned: filled } = selectedProjectStats;
                  const skills = selectedProject.required_expertise || [];
                  return (
                    <div className="flex items-center gap-3 flex-wrap pb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                          Required
                        </span>
                        <span className="text-[13px] font-bold text-blue-700">{required}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                          Allocated
                        </span>
                        <span
                          className={`text-[13px] font-bold ${filled >= required ? "text-emerald-600" : "text-amber-600"}`}
                        >
                          {filled}/{required}
                        </span>
                      </div>
                      {skills.length > 0 && (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide shrink-0">
                            Skills
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {skills.slice(0, 3).map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-600 rounded"
                              >
                                {skill}
                              </span>
                            ))}
                            {skills.length > 3 && (
                              <span className="text-[11px] text-slate-400">+{skills.length - 3}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
            </div>

            {selectedProject && (
              <>
                {/* On this project — uses the lazily-fetched project detail */}
                {(() => {
                  const items = projectDetail?.project_id === selectedProject.id ? projectDetail.items : [];
                  const liveEmps = items.filter((x) => !x.stale);
                  const staleEmps = items.filter((x) => x.stale);
                  const distinctCount = new Set(liveEmps.map((x) => x.employee_id)).size;

                  return (
                    <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-blue-900/80 uppercase tracking-wide">
                          On this project
                        </span>
                        <span className="flex items-center gap-2">
                          {staleEmps.length > 0 && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700"
                              title="Allocations left behind by people no longer on the roster — not counted, remove them"
                            >
                              <UserX className="w-3 h-3" />
                              {staleEmps.length} archived
                            </span>
                          )}
                          <span className="text-[11px] text-blue-900/60">
                            {distinctCount} employee{distinctCount === 1 ? "" : "s"}
                          </span>
                        </span>
                      </div>
                      {items.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No one allocated yet</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {(showAllAllocated ? items : [...liveEmps.slice(0, 3), ...staleEmps]).map((it) => {
                            const name = formatDisplayName(it.name);
                            const initials =
                              (name || "").trim().split(/\s+/).map((p) => p.charAt(0).toUpperCase()).slice(0, 2).join("") || "?";
                            const isRemoving =
                              deleteMutation.isPending && deleteMutation.variables === it.allocation_id;
                            return (
                              <div
                                key={it.allocation_id}
                                title={
                                  it.stale
                                    ? `${it.name} — archived, not counted towards manpower`
                                    : `${it.name}${it.total_daily_hours ? ` · ${it.total_daily_hours}h/day` : ""}`
                                }
                                className={`group inline-flex items-center gap-1.5 pl-1 pr-1 py-0.5 rounded-full shadow-sm transition-opacity ${
                                  it.stale ? "border border-rose-300 bg-rose-50" : "border border-slate-200 bg-white"
                                } ${isRemoving ? "opacity-50" : ""}`}
                              >
                                <span
                                  className={`w-5 h-5 rounded-full text-[10px] font-semibold flex items-center justify-center ${
                                    it.stale ? "bg-rose-200 text-rose-700" : "bg-indigo-500 text-white"
                                  }`}
                                >
                                  {it.stale ? <UserX className="w-3 h-3" /> : initials}
                                </span>
                                <span
                                  className={`text-xs max-w-[120px] truncate ${it.stale ? "font-medium text-rose-700" : "text-slate-700"}`}
                                >
                                  {name}
                                </span>
                                {it.stale && (
                                  <span className="text-[9px] font-bold uppercase tracking-wide text-rose-500">
                                    archived
                                  </span>
                                )}
                                <button
                                  type="button"
                                  disabled={isRemoving}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setConfirmState({
                                      variant: "danger",
                                      title: it.stale ? "Remove stale allocation" : "Remove team member",
                                      message: it.stale
                                        ? `${name} is no longer on the roster. Remove their leftover allocation from "${selectedProject.name}"?`
                                        : `Remove ${name} from "${selectedProject.name}"?`,
                                      confirmText: "Remove",
                                      onConfirm: () => {
                                        deleteMutation.mutate(it.allocation_id);
                                        setConfirmState(null);
                                      },
                                    });
                                  }}
                                  className={`ml-0.5 w-4 h-4 rounded-full flex items-center justify-center transition-colors disabled:cursor-not-allowed ${
                                    it.stale
                                      ? "text-rose-500 hover:text-white hover:bg-rose-500"
                                      : "text-slate-400 hover:text-white hover:bg-rose-500"
                                  }`}
                                  title={`Remove ${name}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                          {liveEmps.length > 3 && (
                            <button
                              type="button"
                              onClick={() => setShowAllAllocated((v) => !v)}
                              className="inline-flex items-center px-2.5 py-1 rounded-full border border-blue-200 bg-white text-[11px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
                            >
                              {showAllAllocated ? "Show less" : `+${liveEmps.length - 3}`}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Employee Selection */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="block text-[13px] font-medium text-slate-700">
                      Allocate Employees <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="flex items-center gap-1 text-[13px] font-medium text-blue-600 hover:text-blue-800"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      {selectedEmployees.length ===
                      (filterTab === "unallocated"
                        ? availableEmployees
                        : [...availableEmployees, ...allocatedEmployeesOther]
                      ).length
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 shrink-0">
                      {[
                        { key: "all", label: `All (${availableEmployees.length + allocatedEmployeesOther.length})` },
                        { key: "unallocated", label: `Available (${availableEmployees.length})` },
                      ].map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => setFilterTab(t.key)}
                          className={`px-3 py-1.5 text-[13px] font-semibold rounded-md transition-all whitespace-nowrap ${
                            filterTab === t.key
                              ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <div className="relative flex-1 min-w-0">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        placeholder="Search employees by name or email..."
                        className="h-9 w-full pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      title="Filters (coming soon)"
                      className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                      <Filter className="w-4 h-4" />
                    </button>
                  </div>

                  {(() => {
                    const allTabEmployees =
                      filterTab === "unallocated" ? availableEmployees : [...availableEmployees, ...allocatedEmployeesOther];
                    const q = employeeSearch.trim().toLowerCase();
                    const displayEmployees = q
                      ? allTabEmployees.filter(
                          (emp) => emp.name.toLowerCase().includes(q) || (emp.email || "").toLowerCase().includes(q),
                        )
                      : allTabEmployees;

                    if (displayEmployees.length === 0) {
                      return (
                        <div className="border border-gray-200 rounded-md p-8 text-center">
                          <p className="text-gray-500">
                            {filterTab === "unallocated"
                              ? "No unallocated employees with matching skills"
                              : "No employees available with matching skills"}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="border border-slate-200 rounded-lg max-h-72 overflow-y-auto divide-y divide-slate-100">
                        {displayEmployees.map((employee) => {
                          const isSelected = !!selectedEmployees.find((e) => e.id === employee.id);
                          return (
                            <div
                              key={employee.id}
                              onClick={() => !employee.alreadyInProject && handleEmployeeToggle(employee)}
                              className={`px-3 py-2.5 ${
                                employee.alreadyInProject ? "opacity-50 cursor-not-allowed bg-slate-50" : "cursor-pointer hover:bg-slate-50"
                              } ${isSelected ? "bg-blue-50/70" : ""}`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={employee.alreadyInProject}
                                  onChange={() => {}}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40 shrink-0"
                                />
                                <span className="text-[13px] font-semibold text-slate-900 shrink-0">
                                  {formatDisplayName(employee.name)}
                                </span>
                                {employee.skillMatch && (
                                  <span className="px-1.5 py-0.5 text-[10px] bg-green-100 text-green-700 rounded-full font-semibold shrink-0">
                                    Skill Match
                                  </span>
                                )}
                                {employee.alreadyInProject && (
                                  <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-full font-semibold shrink-0">
                                    In This Project
                                  </span>
                                )}
                                {employee.currentProjects && !employee.alreadyInProject && (
                                  <span className="px-1.5 py-0.5 text-[10px] bg-orange-100 text-orange-700 rounded-full font-semibold shrink-0">
                                    Other Project
                                  </span>
                                )}
                                <div className="ml-auto flex items-center gap-1.5 shrink-0">
                                  {employee.skills?.slice(0, 3).map((skill, idx) => (
                                    <span key={idx} className="px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded">
                                      {skill}
                                    </span>
                                  ))}
                                  {employee.skills?.length > 3 && (
                                    <span className="text-[10px] text-slate-400">+{employee.skills.length - 3}</span>
                                  )}
                                  {isSelected && (
                                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {selectedEmployees.length > 0 && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-800">
                        <strong>{selectedEmployees.length}</strong> employee
                        {selectedEmployees.length !== 1 ? "s" : ""} selected
                      </p>
                    </div>
                  )}
                </div>

                {/* Time Division Section */}
                {selectedEmployees.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Time Division (Optional)</h4>
                    <p className="text-xs text-gray-500 mb-4">
                      Configure how allocated hours are distributed across roles. If no roles are selected,
                      employees work full hours without role distinction.
                    </p>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Daily Hours</label>
                      <Dropdown
                        options={["", ...["4 hours", "6 hours", "8 hours", "10 hours", "12 hours"]].map((h, i) =>
                          h ? { value: (4 + i * 2).toString(), label: h } : { value: "", label: "Not specified" },
                        )}
                        value={totalDailyHours.toString()}
                        onChange={(val) => {
                          const newHours = val === "" ? "" : parseInt(val);
                          setTotalDailyHours(newHours);
                          if (newHours !== "") {
                            const currentSum = Object.values(timeDistribution).reduce((a, b) => a + b, 0);
                            if (currentSum > newHours) setTimeDistribution({});
                          }
                        }}
                        placeholder="Not specified"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Role Tags</label>
                      <div className="flex flex-wrap gap-3">
                        {ROLE_TAGS.map((tag) => (
                          <label key={tag} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedRoleTags.includes(tag)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRoleTags([...selectedRoleTags, tag]);
                                  if (totalDailyHours !== "") {
                                    const newTags = [...selectedRoleTags, tag];
                                    const hoursPerRole = Math.floor(totalDailyHours / newTags.length);
                                    const newDist = {};
                                    newTags.forEach((t, idx) => {
                                      newDist[t] = idx === 0 ? totalDailyHours - hoursPerRole * (newTags.length - 1) : hoursPerRole;
                                    });
                                    setTimeDistribution(newDist);
                                  } else {
                                    setTimeDistribution((prev) => ({ ...prev, [tag]: 0 }));
                                  }
                                } else {
                                  setSelectedRoleTags(selectedRoleTags.filter((t) => t !== tag));
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

                    <div className="mb-4">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isTeamLead}
                          onChange={(e) => setIsTeamLead(e.target.checked)}
                          className="mt-0.5"
                        />
                        <span className="text-sm text-gray-700">
                          Team lead on this project
                          <span className="block text-xs text-gray-500">
                            Applies to this project only. Leads manage it like its PM; their own requests go to
                            the PM or an admin.
                          </span>
                        </span>
                      </label>
                    </div>

                    {selectedRoleTags.length > 0 && (
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">Hours per Role</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {selectedRoleTags.map((tag) => (
                            <div key={tag} className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 min-w-[60px] sm:min-w-[80px]">{tag}:</span>
                              <input
                                type="number"
                                min="0"
                                max={totalDailyHours}
                                value={timeDistribution[tag] || 0}
                                onChange={(e) => {
                                  const hours = parseInt(e.target.value) || 0;
                                  setTimeDistribution({ ...timeDistribution, [tag]: Math.min(hours, totalDailyHours) });
                                }}
                                onWheel={(e) => e.target.blur()}
                                className="input w-20 text-center"
                              />
                              <span className="text-xs text-gray-500">hrs</span>
                            </div>
                          ))}
                        </div>

                        {(() => {
                          const totalAssigned = Object.values(timeDistribution).reduce((a, b) => a + b, 0);
                          const isValid = totalAssigned === totalDailyHours;
                          return (
                            <div
                              className={`mt-2 p-2 rounded text-sm ${
                                isValid
                                  ? "bg-green-50 text-green-700 border border-green-200"
                                  : "bg-red-50 text-red-700 border border-red-200"
                              }`}
                            >
                              {isValid
                                ? `✓ Hours correctly distributed: ${totalAssigned}/${totalDailyHours}`
                                : `⚠ Hours mismatch: ${totalAssigned}/${totalDailyHours} (adjust to match)`}
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
            <Button type="button" variant="cancel" size="sm" onClick={closeCreateModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!selectedProject || selectedEmployees.length === 0 || createMutation.isPending}
              isLoading={createMutation.isPending}
            >
              {!createMutation.isPending &&
                `Allocate ${selectedEmployees.length} Employee${selectedEmployees.length !== 1 ? "s" : ""}`}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Edit Allocation Modal — uses the same lazy project-detail fetch */}
      {editingAllocation && (
        <Modal isOpen onClose={() => setEditingAllocation(null)} size="2xl" maxHeight="95vh">
          <Modal.Header onClose={() => setEditingAllocation(null)}>
            <h2 className="text-xl font-semibold text-gray-900">
              Manage Allocations - {editingAllocation.projectName}
            </h2>
          </Modal.Header>

          <Modal.Body className="space-y-4">
            {(projectDetail?.project_id === editingAllocation.projectId ? projectDetail.items : []).map((it) => {
              const name = formatDisplayName(it.name);
              return (
                <div
                  key={it.allocation_id}
                  className={`flex items-center justify-between p-4 border rounded-md ${
                    it.stale ? "border-rose-200 bg-rose-50" : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                        it.stale ? "bg-rose-200 text-rose-700" : "bg-blue-500 text-white"
                      }`}
                    >
                      {it.stale ? <UserX className="w-4 h-4" /> : name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className={`font-medium ${it.stale ? "text-rose-700" : "text-gray-900"}`} title={it.name}>
                        {name}
                        {it.stale && (
                          <span className="ml-2 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 align-middle">
                            Archived
                          </span>
                        )}
                      </p>
                      <p className={`text-sm ${it.stale ? "text-rose-500/90" : "text-gray-500"}`}>
                        {it.stale ? `${it.email ? `${it.email} · ` : ""}no longer on the roster — safe to remove` : it.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setConfirmState({
                        variant: "danger",
                        title: it.stale ? "Remove stale allocation" : "Remove team member",
                        message: it.stale
                          ? `${name} is no longer on the roster. Remove their leftover allocation from "${editingAllocation.projectName}"?`
                          : `Remove ${name} from this project?`,
                        confirmText: "Remove",
                        onConfirm: () => {
                          deleteMutation.mutate(it.allocation_id);
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
      />
    </div>
  );
};

export default AllocationsPage;
