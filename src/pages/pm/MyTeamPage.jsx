import React, { useMemo, useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  allocationApi,
  employeeApi,
  parentProjectApi,
  subProjectApi,
  leaveApi,
  perfEvalApi,
} from "../../services/api";
import {
  Clock3,
  FolderKanban,
  CalendarCheck,
  Award,
  Search,
  X,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Phone,
  MoreVertical,
  UserX,
  PlusCircle,
  Star,
} from "lucide-react";
import Table from "../../components/ui/Table";
import UserAvatar from "../../components/ui/UserAvatar";
import SlackIcon from "../../components/icons/SlackIcon";
import Button from "../../components/ui/Button";
import { getPmEmployeeId, getPmSubProjects } from "../../utils/pmScope";
import { formatDisplayName } from "../../utils/displayName";
import { todayLocalISO, getOnLeaveTodayIds } from "../../utils/workforce";
import toast from "react-hot-toast";

const PAGE_SIZE = 10;

/* Vertical Ellipsis Actions Menu for Slack DM, Assign, Performance Note & Remove */
const RowActionsMenu = ({
  employee,
  scopedAllocations,
  scopedProjects,
  onOpenRemoveModal,
  onOpenAssignModal,
  onOpenPerfNoteModal,
}) => {
  const [open, setOpen] = useState(false);
  const [loadingSlack, setLoadingSlack] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleSlackClick = async (e) => {
    e.stopPropagation();
    setOpen(false);
    setLoadingSlack(true);
    try {
      const { url } = await employeeApi.getSlackLink(employee.id);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        toast.error("Slack account not found for this employee");
      }
    } catch (err) {
      const status = err?.response?.status;
      toast.error(status === 404 ? "Slack account not found" : "Slack unavailable");
    } finally {
      setLoadingSlack(false);
    }
  };

  const handleAssignClick = (e) => {
    e.stopPropagation();
    setOpen(false);
    onOpenAssignModal(employee);
  };

  const handlePerfNoteClick = (e) => {
    e.stopPropagation();
    setOpen(false);
    onOpenPerfNoteModal(employee);
  };

  const handleRemoveClick = (e) => {
    e.stopPropagation();
    setOpen(false);

    // Find active project allocations for this employee in PM scope
    const empAllocations = scopedAllocations
      .filter((a) => a.employee_id === employee.id)
      .map((a) => {
        const proj = scopedProjects.find((p) => p.id === a.sub_project_id);
        return {
          allocationId: a.id,
          project: proj,
          hours: a.total_daily_hours || 0,
        };
      })
      .filter((item) => Boolean(item.project));

    if (empAllocations.length === 0) {
      toast.error("This employee is not currently assigned to any project.");
      return;
    }

    onOpenRemoveModal({ employee, allocs: empAllocations });
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        title="More actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 bottom-full mb-1 sm:bottom-auto sm:top-full sm:mt-1 z-50 w-52 rounded-xl bg-white shadow-lg border border-slate-200 py-1 text-xs text-slate-700 divide-y divide-slate-100">
          <div className="py-1">
            <button
              type="button"
              onClick={handleSlackClick}
              disabled={loadingSlack}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 hover:text-indigo-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              <SlackIcon size={15} />
              <span>{loadingSlack ? "Opening Slack…" : "Slack DM"}</span>
            </button>
            <button
              type="button"
              onClick={handleAssignClick}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>Assign / Edit Hours</span>
            </button>
            <button
              type="button"
              onClick={handlePerfNoteClick}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 hover:text-amber-600 transition-colors cursor-pointer"
            >
              <Star className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Add Performance Note</span>
            </button>
          </div>
          <div className="py-1">
            <button
              type="button"
              onClick={handleRemoveClick}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer font-medium"
            >
              <UserX className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Remove from project</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* Modal 1: Assign to Project or Edit Daily Hours */
const AssignProjectModal = ({ employee, scopedProjects, scopedAllocations, onClose }) => {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState(scopedProjects[0]?.id || "");
  const [hours, setHours] = useState("8");

  const existingAlloc = useMemo(() => {
    return scopedAllocations.find(
      (a) => a.employee_id === employee.id && String(a.sub_project_id) === String(selectedProjectId)
    );
  }, [scopedAllocations, employee.id, selectedProjectId]);

  useEffect(() => {
    if (existingAlloc) {
      setHours(String(existingAlloc.total_daily_hours || 8));
    } else {
      setHours("8");
    }
  }, [existingAlloc]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const numHours = parseFloat(hours) || 8;
      if (existingAlloc) {
        return allocationApi.update(existingAlloc.id, {
          total_daily_hours: numHours,
        });
      } else {
        return allocationApi.create({
          employee_id: employee.id,
          sub_project_id: Number(selectedProjectId),
          total_daily_hours: numHours,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["allocations"]);
      toast.success(
        existingAlloc ? "Allocation updated successfully" : "Assigned to project successfully"
      );
      onClose();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || "Failed to save project allocation");
    },
  });

  if (!employee) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {existingAlloc ? "Edit Project Allocation" : "Assign to Project"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Staff member: <span className="font-semibold text-slate-800">{employee.name}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Project
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
            >
              {scopedProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.client ? `(${p.client})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Daily Allocated Hours (hrs/day)
            </label>
            <input
              type="number"
              min="0.5"
              max="16"
              step="0.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="e.g. 8"
              className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="secondary" size="sm" onClick={onClose} className="h-9">
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            className="h-9"
          >
            {existingAlloc ? "Update Allocation" : "Assign Project"}
          </Button>
        </div>
      </div>
    </div>
  );
};

/* Modal 3: Add Performance Note / Review */
const PerformanceNoteModal = ({ employee, scopedProjects, onClose }) => {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState(scopedProjects[0]?.id || "");
  const [rating, setRating] = useState(5);
  const [note, setNote] = useState("");

  const todayYearMonth = new Date().toISOString().slice(0, 7);

  const submitMutation = useMutation({
    mutationFn: async () => {
      return perfEvalApi.submit({
        project_id: Number(selectedProjectId),
        employee_id: employee.id,
        period: todayYearMonth,
        parameter_values: [
          { name: "Quality & Delivery", employee_rating: rating },
        ],
        overall_comment: note.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["perf-evals"]);
      toast.success("Performance note saved successfully");
      onClose();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || "Failed to save performance note");
    },
  });

  if (!employee) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Performance Review Note</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Staff member: <span className="font-semibold text-slate-800">{employee.name}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Project Context
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
            >
              {scopedProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Performance Score (1 - 5 Stars)
            </label>
            <div className="flex items-center gap-1.5 pt-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 rounded-md hover:bg-amber-50 transition-colors cursor-pointer"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= rating
                        ? "text-amber-400 fill-amber-400"
                        : "text-slate-300 fill-slate-100"
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs font-bold text-slate-700 ml-2 font-mono">{rating} / 5</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Review Note / Milestone Feedback
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter quality feedback, milestone completion notes, or work performance summary..."
              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="secondary" size="sm" onClick={onClose} className="h-9">
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => submitMutation.mutate()}
            loading={submitMutation.isPending}
            className="h-9"
          >
            Submit Note
          </Button>
        </div>
      </div>
    </div>
  );
};

/* Confirmation & Selection Modal for Removing from Project */
const RemoveFromProjectModal = ({ data, onClose }) => {
  const queryClient = useQueryClient();

  const removeMutation = useMutation({
    mutationFn: (allocationId) => allocationApi.delete(allocationId),
    onSuccess: () => {
      queryClient.invalidateQueries(["allocations"]);
      toast.success("Employee removed from project");
      onClose();
    },
    onError: () => {
      toast.error("Failed to remove employee from project");
    },
  });

  if (!data) return null;
  const { employee, allocs } = data;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Remove from Project</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Select project to remove <span className="font-semibold text-slate-800">{employee.name}</span> from:
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {allocs.map(({ allocationId, project, hours }) => (
            <div
              key={allocationId}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors"
            >
              <div>
                <div className="text-xs font-semibold text-slate-800">{project.name}</div>
                {project.client && (
                  <div className="text-[11px] text-slate-400">{project.client}</div>
                )}
                <div className="text-[11px] text-indigo-600 font-medium mt-0.5">
                  Allocation: {hours}h/day
                </div>
              </div>

              <Button
                variant="danger"
                size="sm"
                onClick={() => removeMutation.mutate(allocationId)}
                loading={removeMutation.isPending && removeMutation.variables === allocationId}
                disabled={removeMutation.isPending}
                className="h-8 text-xs px-3"
              >
                Remove
              </Button>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button variant="secondary" size="sm" onClick={onClose} className="h-9">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

const MyTeamPage = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = localStorage.getItem("role") || user.role || "employee";
  const canManageTeam = role === "pm" || role === "admin";
  const pmEmployeeId = getPmEmployeeId(user);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  
  // Interactive KPI tile filters
  const [capacityFilter, setCapacityFilter] = useState(""); // '' | 'optimal' | 'over' | 'unassigned'
  const [projectStatusFilter, setProjectStatusFilter] = useState(""); // '' | 'active' | 'on-hold' | 'completed'
  const [attendanceFilter, setAttendanceFilter] = useState(""); // '' | 'wfo' | 'wfh' | 'leave'
  const [roleFilterKey, setRoleFilterKey] = useState(""); // '' | 'TL' | 'Annotator'
  const [sortBy, setSortBy] = useState(""); // '' | 'name-asc' | 'name-desc'

  const [removeModalData, setRemoveModalData] = useState(null);
  const [assignModalEmployee, setAssignModalEmployee] = useState(null);
  const [perfNoteEmployee, setPerfNoteEmployee] = useState(null);

  const { data: parentProjects = [], isLoading: parentLoading } = useQuery({
    queryKey: ["parent-projects"],
    queryFn: parentProjectApi.getAll,
  });
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["sub-projects"],
    queryFn: subProjectApi.getAll,
  });
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: employeeApi.getAll,
  });
  const { data: allocations = [], isLoading: allocationsLoading } = useQuery({
    queryKey: ["allocations"],
    queryFn: allocationApi.getAll,
  });

  const todayStr = todayLocalISO();
  const { data: leavesToday = [], isLoading: leavesLoading } = useQuery({
    queryKey: ["leaves", "today", todayStr],
    queryFn: () => leaveApi.getAll({ start_date: todayStr, end_date: todayStr }),
  });

  const isLoading =
    projectsLoading || employeesLoading || allocationsLoading || parentLoading || leavesLoading;

  // Resolve PM scoped projects & allocations
  const scopedProjects = useMemo(
    () => getPmSubProjects(projects, parentProjects, pmEmployeeId, allocations),
    [projects, parentProjects, pmEmployeeId, allocations]
  );
  const scopedProjectIds = useMemo(
    () => new Set(scopedProjects.map((p) => p.id)),
    [scopedProjects]
  );

  const scopedAllocations = useMemo(
    () => allocations.filter((a) => scopedProjectIds.has(a.sub_project_id)),
    [allocations, scopedProjectIds]
  );

  // Map employee -> projects inside PM scope
  const employeeProjectMap = useMemo(() => {
    const map = new Map();
    scopedAllocations.forEach((allocation) => {
      const project = scopedProjects.find((p) => p.id === allocation.sub_project_id);
      if (!project) return;
      const current = map.get(allocation.employee_id) || [];
      if (!current.some((p) => p.id === project.id)) {
        current.push({
          id: project.id,
          name: project.name,
          client: project.client,
          hours: allocation.total_daily_hours || 0,
          status: project.project_status || "active",
        });
      }
      map.set(allocation.employee_id, current);
    });
    return map;
  }, [scopedAllocations, scopedProjects]);

  // Base Team Members list
  const teamMembers = useMemo(() => {
    const isPmRole = role === "pm";
    const baseEmployees = isPmRole
      ? employees.filter((emp) => employeeProjectMap.has(emp.id))
      : employees;

    return baseEmployees
      .map((employee) => {
        const memberProjects = employeeProjectMap.get(employee.id) || [];
        const totalDailyHours = memberProjects.reduce((sum, p) => sum + p.hours, 0);
        return {
          ...employee,
          memberProjects,
          totalDailyHours,
        };
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [employees, employeeProjectMap, role]);

  // Workforce Bucketing
  const onLeaveTodayIds = useMemo(
    () => getOnLeaveTodayIds(leavesToday, todayStr),
    [leavesToday, todayStr]
  );

  // --- KPI Card 1: Capacity & Workload Metrics ---
  const optimalCount = useMemo(
    () => teamMembers.filter((m) => m.totalDailyHours >= 6 && m.totalDailyHours <= 8).length,
    [teamMembers]
  );
  const overAllocatedCount = useMemo(
    () => teamMembers.filter((m) => m.totalDailyHours > 8).length,
    [teamMembers]
  );
  const unassignedCount = useMemo(
    () => teamMembers.filter((m) => m.totalDailyHours === 0).length,
    [teamMembers]
  );

  // --- KPI Card 2: Project Delivery Health Metrics ---
  const activeProjectsCount = useMemo(
    () => scopedProjects.filter((p) => (p.project_status || "active") === "active").length,
    [scopedProjects]
  );
  const onHoldProjectsCount = useMemo(
    () => scopedProjects.filter((p) => p.project_status === "on-hold").length,
    [scopedProjects]
  );
  const completedProjectsCount = useMemo(
    () => scopedProjects.filter((p) => p.project_status === "completed").length,
    [scopedProjects]
  );

  // --- KPI Card 3: Daily Availability Metrics ---
  const wfoCount = useMemo(
    () =>
      teamMembers.filter((m) => {
        const isLeave = onLeaveTodayIds.has(String(m.id));
        const wm = (m.work_model || "WFO").toUpperCase();
        return !isLeave && (wm === "WFO" || wm.includes("OFFICE"));
      }).length,
    [teamMembers, onLeaveTodayIds]
  );

  const wfhCount = useMemo(
    () =>
      teamMembers.filter((m) => {
        const isLeave = onLeaveTodayIds.has(String(m.id));
        const wm = (m.work_model || "").toUpperCase();
        return !isLeave && (wm === "WFH" || wm.includes("HOME"));
      }).length,
    [teamMembers, onLeaveTodayIds]
  );

  const onLeaveCount = useMemo(
    () => teamMembers.filter((m) => onLeaveTodayIds.has(String(m.id))).length,
    [teamMembers, onLeaveTodayIds]
  );

  // --- KPI Card 4: Role Balance Metrics ---
  const tlCount = useMemo(
    () =>
      teamMembers.filter((m) => {
        const d = (m.designation || "").toLowerCase();
        return d.includes("lead") || d.includes("tl");
      }).length,
    [teamMembers]
  );

  const annotatorReviewerCount = useMemo(
    () =>
      teamMembers.filter((m) => {
        const d = (m.designation || "").toLowerCase();
        return (
          d.includes("annotator") ||
          d.includes("reviewer") ||
          d.includes("senior") ||
          d.includes("associate")
        );
      }).length,
    [teamMembers]
  );

  // Counts for Project Classification Quick Tabs
  const projectMemberCounts = useMemo(() => {
    const counts = new Map();
    scopedProjects.forEach((p) => {
      const cnt = teamMembers.filter((m) =>
        m.memberProjects.some((mp) => mp.id === p.id)
      ).length;
      counts.set(String(p.id), cnt);
    });
    const unassigned = teamMembers.filter((m) => m.memberProjects.length === 0).length;
    counts.set("unassigned", unassigned);
    return counts;
  }, [scopedProjects, teamMembers]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    projectFilter,
    capacityFilter,
    projectStatusFilter,
    attendanceFilter,
    roleFilterKey,
    sortBy,
  ]);

  // Filtering team members
  const filteredTeamMembers = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();

    return teamMembers.filter((member) => {
      // Search term matching (name, email, phone, designation, skills)
      const matchesSearch =
        !term ||
        (member.name || "").toLowerCase().includes(term) ||
        (member.email || "").toLowerCase().includes(term) ||
        (member.phone || member.contact_number || "").toLowerCase().includes(term) ||
        (member.designation || "").toLowerCase().includes(term) ||
        (member.skills || []).some((s) => s.toLowerCase().includes(term));

      // Project filter (tabs & dropdown)
      let matchesProject = true;
      if (projectFilter === "all") {
        matchesProject = true;
      } else if (projectFilter === "unassigned") {
        matchesProject = member.memberProjects.length === 0;
      } else {
        matchesProject = member.memberProjects.some(
          (p) => String(p.id) === String(projectFilter)
        );
      }

      // 1. Capacity Tile Filter
      let matchesCapacity = true;
      if (capacityFilter === "optimal") {
        matchesCapacity = member.totalDailyHours >= 6 && member.totalDailyHours <= 8;
      } else if (capacityFilter === "over") {
        matchesCapacity = member.totalDailyHours > 8;
      } else if (capacityFilter === "unassigned") {
        matchesCapacity = member.totalDailyHours === 0;
      }

      // 2. Project Status Tile Filter
      let matchesProjectStatus = true;
      if (projectStatusFilter !== "") {
        matchesProjectStatus = member.memberProjects.some(
          (p) => (p.status || "active") === projectStatusFilter
        );
      }

      // 3. Attendance Tile Filter
      const isLeave = onLeaveTodayIds.has(String(member.id));
      const wm = (member.work_model || "WFO").toUpperCase();
      let matchesAttendance = true;
      if (attendanceFilter === "wfo") {
        matchesAttendance = !isLeave && (wm === "WFO" || wm.includes("OFFICE"));
      } else if (attendanceFilter === "wfh") {
        matchesAttendance = !isLeave && (wm === "WFH" || wm.includes("HOME"));
      } else if (attendanceFilter === "leave") {
        matchesAttendance = isLeave;
      }

      // 4. Role Tile Filter
      const d = (member.designation || "").toLowerCase();
      let matchesRole = true;
      if (roleFilterKey === "TL") {
        matchesRole = d.includes("lead") || d.includes("tl");
      } else if (roleFilterKey === "Annotator") {
        matchesRole =
          d.includes("annotator") ||
          d.includes("reviewer") ||
          d.includes("senior") ||
          d.includes("associate");
      }

      return (
        matchesSearch &&
        matchesProject &&
        matchesCapacity &&
        matchesProjectStatus &&
        matchesAttendance &&
        matchesRole
      );
    }).sort((a, b) => {
      if (sortBy === "name-asc") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "name-desc") return (b.name || "").localeCompare(a.name || "");
      return 0;
    });
  }, [
    teamMembers,
    searchQuery,
    projectFilter,
    capacityFilter,
    projectStatusFilter,
    attendanceFilter,
    roleFilterKey,
    sortBy,
    onLeaveTodayIds,
  ]);

  const paginatedTeamMembers = useMemo(() => {
    return filteredTeamMembers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [filteredTeamMembers, currentPage]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    projectFilter !== "all" ||
    capacityFilter !== "" ||
    projectStatusFilter !== "" ||
    attendanceFilter !== "" ||
    roleFilterKey !== "";

  const clearFilters = () => {
    setSearchQuery("");
    setProjectFilter("all");
    setCapacityFilter("");
    setProjectStatusFilter("");
    setAttendanceFilter("");
    setRoleFilterKey("");
    setSortBy("");
  };

  const cycleNameSort = () => {
    if (sortBy === "") setSortBy("name-asc");
    else if (sortBy === "name-asc") setSortBy("name-desc");
    else setSortBy("");
  };

  return (
    <div className="space-y-2.5">
      {/* 4 PM-tailored KPI Overview Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        
        {/* KPI 1: TEAM SIZE & WORKLOAD */}
        <div className="bg-white border border-slate-200/70 rounded-xl p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <Clock3 className="w-3.5 h-3.5" />
              </div>
              <div className="text-[11.5px] font-bold text-slate-800 uppercase tracking-wider truncate">
                TEAM SIZE
              </div>
            </div>
            <div className="text-lg font-bold text-slate-900 tracking-tight font-mono flex-shrink-0">
              {teamMembers.length}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCapacityFilter((prev) => (prev === "optimal" ? "" : "optimal"))}
              className={`py-1 px-1 rounded-lg text-center border transition-all hover:scale-[1.02] cursor-pointer ${
                capacityFilter === "optimal"
                  ? "bg-emerald-100/90 border-emerald-300 ring-1 ring-emerald-500/30"
                  : "bg-emerald-50/60 border-emerald-100/80 hover:bg-emerald-100/60"
              }`}
            >
              <div className="text-xs sm:text-sm font-extrabold text-emerald-700 font-mono leading-none">
                {optimalCount}
              </div>
              <div className="text-[9.5px] font-bold text-emerald-600 uppercase tracking-wider mt-0.5 truncate">
                Optimal
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCapacityFilter((prev) => (prev === "over" ? "" : "over"))}
              className={`py-1 px-1 rounded-lg text-center border transition-all hover:scale-[1.02] cursor-pointer ${
                capacityFilter === "over"
                  ? "bg-rose-100/90 border-rose-300 ring-1 ring-rose-500/30"
                  : "bg-rose-50/60 border-rose-100/80 hover:bg-rose-100/60"
              }`}
            >
              <div className="text-xs sm:text-sm font-extrabold text-rose-700 font-mono leading-none">
                {overAllocatedCount}
              </div>
              <div className="text-[9.5px] font-bold text-rose-600 uppercase tracking-wider mt-0.5 truncate">
                Over-loaded
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCapacityFilter((prev) => (prev === "unassigned" ? "" : "unassigned"))}
              className={`py-1 px-1 rounded-lg text-center border transition-all hover:scale-[1.02] cursor-pointer ${
                capacityFilter === "unassigned"
                  ? "bg-amber-100/90 border-amber-300 ring-1 ring-amber-500/30"
                  : "bg-amber-50/60 border-amber-100/80 hover:bg-amber-100/60"
              }`}
            >
              <div className="text-xs sm:text-sm font-extrabold text-amber-700 font-mono leading-none">
                {unassignedCount}
              </div>
              <div className="text-[9.5px] font-bold text-amber-600 uppercase tracking-wider mt-0.5 truncate">
                Unassigned
              </div>
            </button>
          </div>
        </div>

        {/* KPI 2: PROJECT DELIVERY HEALTH */}
        <div className="bg-white border border-slate-200/70 rounded-xl p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-2 mb-1.5 min-h-[24px]">
            <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <FolderKanban className="w-3.5 h-3.5" />
            </div>
            <div className="text-[11.5px] font-bold text-slate-800 uppercase tracking-wider truncate">
              PROJECT HEALTH
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setProjectStatusFilter((prev) => (prev === "active" ? "" : "active"))}
              className={`py-1 px-1 rounded-lg text-center border transition-all hover:scale-[1.02] cursor-pointer ${
                projectStatusFilter === "active"
                  ? "bg-blue-100/90 border-blue-300 ring-1 ring-blue-500/30"
                  : "bg-blue-50/60 border-blue-100/80 hover:bg-blue-100/60"
              }`}
            >
              <div className="text-xs sm:text-sm font-extrabold text-blue-700 font-mono leading-none">
                {activeProjectsCount}
              </div>
              <div className="text-[9.5px] font-bold text-blue-600 uppercase tracking-wider mt-0.5 truncate">
                Active
              </div>
            </button>

            <button
              type="button"
              onClick={() => setProjectStatusFilter((prev) => (prev === "on-hold" ? "" : "on-hold"))}
              className={`py-1 px-1 rounded-lg text-center border transition-all hover:scale-[1.02] cursor-pointer ${
                projectStatusFilter === "on-hold"
                  ? "bg-amber-100/90 border-amber-300 ring-1 ring-amber-500/30"
                  : "bg-amber-50/60 border-amber-100/80 hover:bg-amber-100/60"
              }`}
            >
              <div className="text-xs sm:text-sm font-extrabold text-amber-700 font-mono leading-none">
                {onHoldProjectsCount}
              </div>
              <div className="text-[9.5px] font-bold text-amber-600 uppercase tracking-wider mt-0.5 truncate">
                On Hold
              </div>
            </button>

            <button
              type="button"
              onClick={() => setProjectStatusFilter((prev) => (prev === "completed" ? "" : "completed"))}
              className={`py-1 px-1 rounded-lg text-center border transition-all hover:scale-[1.02] cursor-pointer ${
                projectStatusFilter === "completed"
                  ? "bg-indigo-100/90 border-indigo-300 ring-1 ring-indigo-500/30"
                  : "bg-indigo-50/60 border-indigo-100/80 hover:bg-indigo-100/60"
              }`}
            >
              <div className="text-xs sm:text-sm font-extrabold text-indigo-700 font-mono leading-none">
                {completedProjectsCount}
              </div>
              <div className="text-[9.5px] font-bold text-indigo-600 uppercase tracking-wider mt-0.5 truncate">
                Done
              </div>
            </button>
          </div>
        </div>

        {/* KPI 3: DAILY AVAILABILITY */}
        <div className="bg-white border border-slate-200/70 rounded-xl p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-2 mb-1.5 min-h-[24px]">
            <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <CalendarCheck className="w-3.5 h-3.5" />
            </div>
            <div className="text-[11.5px] font-bold text-slate-800 uppercase tracking-wider truncate">
              AVAILABILITY
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAttendanceFilter((prev) => (prev === "wfo" ? "" : "wfo"))}
              className={`py-1 px-1 rounded-lg text-center border transition-all hover:scale-[1.02] cursor-pointer ${
                attendanceFilter === "wfo"
                  ? "bg-emerald-100/90 border-emerald-300 ring-1 ring-emerald-500/30"
                  : "bg-emerald-50/60 border-emerald-100/80 hover:bg-emerald-100/60"
              }`}
            >
              <div className="text-xs sm:text-sm font-extrabold text-emerald-700 font-mono leading-none">
                {wfoCount}
              </div>
              <div className="text-[9.5px] font-bold text-emerald-600 uppercase tracking-wider mt-0.5 truncate">
                WFO
              </div>
            </button>

            <button
              type="button"
              onClick={() => setAttendanceFilter((prev) => (prev === "wfh" ? "" : "wfh"))}
              className={`py-1 px-1 rounded-lg text-center border transition-all hover:scale-[1.02] cursor-pointer ${
                attendanceFilter === "wfh"
                  ? "bg-cyan-100/90 border-cyan-300 ring-1 ring-cyan-500/30"
                  : "bg-cyan-50/60 border-cyan-100/80 hover:bg-cyan-100/60"
              }`}
            >
              <div className="text-xs sm:text-sm font-extrabold text-cyan-700 font-mono leading-none">
                {wfhCount}
              </div>
              <div className="text-[9.5px] font-bold text-cyan-600 uppercase tracking-wider mt-0.5 truncate">
                WFH
              </div>
            </button>

            <button
              type="button"
              onClick={() => setAttendanceFilter((prev) => (prev === "leave" ? "" : "leave"))}
              className={`py-1 px-1 rounded-lg text-center border transition-all hover:scale-[1.02] cursor-pointer ${
                attendanceFilter === "leave"
                  ? "bg-amber-100/90 border-amber-300 ring-1 ring-amber-500/30"
                  : "bg-amber-50/60 border-amber-100/80 hover:bg-amber-100/60"
              }`}
            >
              <div className="text-xs sm:text-sm font-extrabold text-amber-700 font-mono leading-none">
                {onLeaveCount}
              </div>
              <div className="text-[9.5px] font-bold text-amber-600 uppercase tracking-wider mt-0.5 truncate">
                On Leave
              </div>
            </button>
          </div>
        </div>

        {/* KPI 4: ROLE BALANCE */}
        <div className="bg-white border border-slate-200/70 rounded-xl p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-2 mb-1.5 min-h-[24px]">
            <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Award className="w-3.5 h-3.5" />
            </div>
            <div className="text-[11.5px] font-bold text-slate-800 uppercase tracking-wider truncate">
              ROLE BALANCE
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 pt-1.5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setRoleFilterKey((prev) => (prev === "TL" ? "" : "TL"))}
              className={`py-1 px-1 rounded-lg text-center border transition-all hover:scale-[1.02] cursor-pointer ${
                roleFilterKey === "TL"
                  ? "bg-purple-100/90 border-purple-300 ring-1 ring-purple-500/30"
                  : "bg-purple-50/60 border-purple-100/80 hover:bg-purple-100/60"
              }`}
            >
              <div className="text-xs sm:text-sm font-extrabold text-purple-700 font-mono leading-none">
                {tlCount}
              </div>
              <div className="text-[9.5px] font-bold text-purple-600 uppercase tracking-wider mt-0.5 truncate">
                Team Leads (TL)
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRoleFilterKey((prev) => (prev === "Annotator" ? "" : "Annotator"))}
              className={`py-1 px-1 rounded-lg text-center border transition-all hover:scale-[1.02] cursor-pointer ${
                roleFilterKey === "Annotator"
                  ? "bg-sky-100/90 border-sky-300 ring-1 ring-sky-500/30"
                  : "bg-sky-50/60 border-sky-100/80 hover:bg-sky-100/60"
              }`}
            >
              <div className="text-xs sm:text-sm font-extrabold text-sky-700 font-mono leading-none">
                {annotatorReviewerCount}
              </div>
              <div className="text-[9.5px] font-bold text-sky-600 uppercase tracking-wider mt-0.5 truncate">
                Annotators / Reviewers
              </div>
            </button>
          </div>
        </div>

      </div>

      {/* Project Tabs + Search Bar on the SAME line */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Project Tabs Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <button
            type="button"
            onClick={() => setProjectFilter("all")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              projectFilter === "all"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100/90 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
            }`}
          >
            <span>All Projects</span>
          </button>

          {scopedProjects.map((p) => {
            const count = projectMemberCounts.get(String(p.id)) || 0;
            const isActive = String(projectFilter) === String(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setProjectFilter(String(p.id))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20"
                    : "bg-white text-slate-700 border border-slate-200/80 hover:bg-indigo-50/70 hover:border-indigo-200 hover:text-indigo-700"
                }`}
              >
                <span>{p.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isActive
                      ? "bg-indigo-500 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {(projectMemberCounts.get("unassigned") || 0) > 0 && (
            <button
              type="button"
              onClick={() => setProjectFilter("unassigned")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                projectFilter === "unassigned"
                  ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/20"
                  : "bg-amber-50/90 text-amber-800 border border-amber-200/80 hover:bg-amber-100/80"
              }`}
            >
              <span>Unassigned / Bench</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  projectFilter === "unassigned"
                    ? "bg-amber-700 text-white"
                    : "bg-amber-200/80 text-amber-900"
                }`}
              >
                {projectMemberCounts.get("unassigned")}
              </span>
            </button>
          )}
        </div>

        {/* Search Bar & Clear Filters on the right side of the same row */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email or skill..."
              className="h-9 w-52 sm:w-64 pl-9 pr-8 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <Button variant="secondary" size="sm" onClick={clearFilters} className="h-9">
              <X className="h-3.5 w-3.5 text-slate-500" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Main Untitled-UI Table Component */}
      <Table
        variant="untitled"
        allowOverflow
        loading={isLoading}
        skeletonRows={10}
        columns={[
          {
            key: "name",
            label: (
              <button
                type="button"
                onClick={cycleNameSort}
                className="inline-flex items-center gap-1 hover:text-slate-900"
              >
                Employee
                {sortBy === "name-asc" ? (
                  <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                ) : sortBy === "name-desc" ? (
                  <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                ) : (
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            ),
            width: "w-[24%] min-w-[210px]",
            render: (value, row) => {
              const visibleRows = paginatedTeamMembers;
              const pageIndex = visibleRows.indexOf(row);
              const isNearTop = pageIndex < 4;
              const positionClass = isNearTop ? "top-full mt-1.5" : "bottom-full mb-1.5";
              const shortName = formatDisplayName(value) || value;
              return (
                <div className="flex items-center gap-3">
                  <UserAvatar src={row.avatar_url} name={value || "?"} size="md" />
                  <div className="group relative min-w-0 flex-1">
                    <div
                      className="text-[13.5px] font-semibold text-slate-900 truncate leading-tight"
                      title={value}
                    >
                      {shortName}
                    </div>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (row.email) {
                          navigator.clipboard.writeText(row.email);
                          toast.success("Email copied to clipboard");
                        }
                      }}
                      className="text-[12px] text-slate-400 cursor-pointer hover:text-indigo-600 transition-colors leading-tight mt-0.5 min-w-0"
                    >
                      <span className="pointer-events-none block truncate">{row.email}</span>
                    </div>

                    {/* Hover Card — full name + email */}
                    <div
                      className={`absolute left-0 ${positionClass} hidden group-hover:block z-40 p-2.5 bg-white rounded-xl shadow-xl border border-slate-200 min-w-[180px] max-w-[280px] pointer-events-none`}
                    >
                      <div className="text-[13px] font-semibold text-slate-800 break-words">
                        {value}
                      </div>
                      <div className="text-[12px] text-slate-500 break-words mt-0.5">
                        {row.email}
                      </div>
                      {row.encord_id && (
                        <div className="text-[11.5px] text-slate-400 break-words mt-1 pt-1 border-t border-slate-100">
                          Encord: {String(row.encord_id).trim()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            },
          },
          {
            key: "phone",
            label: "Contact No.",
            width: "w-[14%] min-w-[130px]",
            render: (_, row) => {
              const phoneNum = row.phone || row.contact_number || row.mobile;
              if (!phoneNum) {
                return <span className="text-[13px] text-slate-400">—</span>;
              }
              return (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(phoneNum);
                    toast.success("Contact number copied to clipboard");
                  }}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-700 hover:text-indigo-600 cursor-pointer transition-colors whitespace-nowrap"
                  title="Click to copy contact number"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{phoneNum}</span>
                </div>
              );
            },
          },
          {
            key: "designation",
            label: "Designation",
            width: "w-[16%] min-w-[140px]",
            render: (value) => (
              <span className="pointer-events-none text-[13px] font-medium text-slate-600 whitespace-nowrap truncate max-w-[160px] inline-block align-middle">
                {value || "—"}
              </span>
            ),
          },
          {
            key: "employee_type",
            label: "Type",
            align: "left",
            width: "w-[10%] min-w-[90px]",
            render: (value, row) => {
              const valStr = String(value || "")
                .toLowerCase()
                .replace("-", " ")
                .trim();
              const isFulltime = valStr.includes("full time") || valStr === "fulltime";
              const isIntern = valStr.includes("intern");
              const isContract = valStr.includes("contractor") || valStr.includes("part time");
              const hasPromotion = Boolean(row.converted_to_fulltime_at);

              let textColorClass = "text-slate-600 font-medium";
              let glowClass = "";

              if (isFulltime) {
                textColorClass = "text-emerald-600 font-semibold";
                if (hasPromotion) glowClass = "drop-shadow-[0_0_6px_rgba(16,185,129,0.75)]";
              } else if (isIntern) {
                textColorClass = "text-amber-600 font-semibold";
                if (hasPromotion) glowClass = "drop-shadow-[0_0_6px_rgba(245,158,11,0.75)]";
              } else if (isContract) {
                textColorClass = "text-sky-500 font-semibold";
                if (hasPromotion) glowClass = "drop-shadow-[0_0_6px_rgba(56,189,248,0.75)]";
              }

              const visibleRows = paginatedTeamMembers;
              const pageIndex = visibleRows.indexOf(row);
              const isNearTop = pageIndex < 4;
              const positionClass = isNearTop ? "top-full mt-1.5" : "bottom-full mb-1.5";

              return (
                <div className="group relative flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
                  <span className={`text-[13px] ${textColorClass} ${glowClass} transition-all duration-200`}>
                    {value || "—"}
                  </span>

                  {hasPromotion && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                  )}

                  {hasPromotion && (
                    <div
                      className={`absolute left-0 ${positionClass} hidden group-hover:flex flex-col gap-1.5 z-30 p-2.5 bg-white text-slate-700 rounded-xl shadow-xl border border-slate-200 min-w-[190px] max-w-[250px] pointer-events-none whitespace-normal`}
                    >
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Promotion Details
                      </div>
                      <div className="text-xs text-slate-600 leading-relaxed">
                        Promoted from{" "}
                        <span className="font-semibold text-emerald-600">
                          {row.previous_employee_type || "Intern"}
                        </span>{" "}
                        on{" "}
                        <span className="font-semibold text-slate-900">
                          {new Date(row.converted_to_fulltime_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            },
          },
          {
            key: "skills",
            label: "Skills",
            width: "w-[14%] min-w-[120px]",
            render: (value, row) => {
              const skillsList = Array.isArray(value) ? value : [];
              if (skillsList.length === 0) {
                return <span className="text-xs text-slate-400">—</span>;
              }

              const visibleRows = paginatedTeamMembers;
              const pageIndex = visibleRows.indexOf(row);
              const isNearTop = pageIndex < 4;
              const positionClass = isNearTop ? "top-full mt-1.5" : "bottom-full mb-1.5";
              const extra = skillsList.length - 1;

              return (
                <div className="group relative flex items-center gap-1 flex-nowrap whitespace-nowrap cursor-default">
                  <span className="pointer-events-none min-w-0 truncate max-w-[130px] inline-block rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[12px] font-medium text-indigo-700">
                    {skillsList[0]}
                  </span>
                  {extra > 0 && (
                    <span className="inline-flex items-center justify-center flex-shrink-0 h-5 min-w-5 rounded-full bg-slate-100 px-1 text-[10px] font-semibold text-slate-500">
                      +{extra}
                    </span>
                  )}

                  {(extra > 0 || (skillsList[0] || "").length > 18) && (
                    <div
                      className={`absolute left-0 ${positionClass} hidden group-hover:flex flex-col gap-1.5 z-30 p-2.5 bg-white text-slate-700 rounded-xl shadow-xl border border-slate-200 min-w-[180px] max-w-[260px] pointer-events-none`}
                    >
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
            key: "assigned_projects",
            label: "Assigned Projects",
            width: "w-[17%] min-w-[150px]",
            render: (_, row) => {
              const projects = row.memberProjects || [];
              if (projects.length === 0) {
                return (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[12px] font-medium text-amber-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Idle
                  </span>
                );
              }
              const visibleRows = paginatedTeamMembers;
              const pageIndex = visibleRows.indexOf(row);
              const isNearTop = pageIndex < 4;
              const positionClass = isNearTop ? "top-full mt-1.5" : "bottom-full mb-1.5";
              const extra = projects.length - 1;
              const mainProj = projects[0];

              return (
                <div className="group relative flex items-center gap-1 flex-nowrap whitespace-nowrap cursor-default">
                  <span className="pointer-events-none min-w-0 truncate max-w-[170px] inline-block rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[12px] font-medium text-slate-700">
                    {mainProj.name}
                  </span>
                  {extra > 0 && (
                    <span className="inline-flex items-center justify-center flex-shrink-0 h-5 min-w-5 rounded-full bg-slate-100 px-1 text-[10px] font-semibold text-slate-500">
                      +{extra}
                    </span>
                  )}

                  {(extra > 0 || (mainProj.name || "").length > 20) && (
                    <div
                      className={`absolute right-0 ${positionClass} hidden group-hover:flex flex-col gap-1.5 z-40 p-3 bg-white text-slate-700 rounded-xl shadow-xl border border-slate-200 min-w-[220px] max-w-[300px] pointer-events-none whitespace-normal`}
                    >
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100 flex items-center justify-between">
                        <span>Assigned Projects</span>
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          {projects.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {projects.map((p, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 break-words max-w-full"
                          >
                            {p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            },
          },
          ...(canManageTeam
            ? [
                {
                  key: "actions",
                  label: "Actions",
                  align: "center",
                  width: "w-[6%]",
                  render: (_, row) => (
                    <div className="flex items-center justify-center">
                      <RowActionsMenu
                        employee={row}
                        scopedAllocations={scopedAllocations}
                        scopedProjects={scopedProjects}
                        onOpenRemoveModal={setRemoveModalData}
                        onOpenAssignModal={setAssignModalEmployee}
                        onOpenPerfNoteModal={setPerfNoteEmployee}
                      />
                    </div>
                  ),
                },
              ]
            : []),
        ]}
        data={paginatedTeamMembers}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        totalItems={filteredTeamMembers.length}
        onPageChange={setCurrentPage}
        emptyState={{
          title: "No team members found",
          description: "Try adjusting your search query or tile filters.",
        }}
      />

      {/* Modal for Assigning Project / Editing Hours */}
      {assignModalEmployee && (
        <AssignProjectModal
          employee={assignModalEmployee}
          scopedProjects={scopedProjects}
          scopedAllocations={scopedAllocations}
          onClose={() => setAssignModalEmployee(null)}
        />
      )}

      {/* Modal for Performance Review Notes */}
      {perfNoteEmployee && (
        <PerformanceNoteModal
          employee={perfNoteEmployee}
          scopedProjects={scopedProjects}
          onClose={() => setPerfNoteEmployee(null)}
        />
      )}

      {/* Modal for Project Removal Selection */}
      {removeModalData && (
        <RemoveFromProjectModal
          data={removeModalData}
          onClose={() => setRemoveModalData(null)}
        />
      )}
    </div>
  );
};

export default MyTeamPage;
