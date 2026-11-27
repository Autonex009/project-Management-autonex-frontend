import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import UserAvatar from "../components/ui/UserAvatar";
import usePageStateStore from "../store/usePageStateStore";
import { usePageScroll } from "../hooks/usePageScroll";
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
  Mail,
  Clock,
  Briefcase,
  Check,
  Tag,
  CheckCircle2,
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
import DynamicTooltip from "../components/ui/DynamicTooltip";
import { formatDisplayName } from "../utils/displayName";


const PAGE_SIZE = 10;

// ── Allocation modal primitives ───────────────────────────────────────────
// Slate neutrals, one indigo accent. Colour only carries meaning:
// emerald = skill match / fully staffed, amber = short-staffed / busy elsewhere,
// rose = archived or removal.
const AL = {
  label: "block text-[13px] font-medium text-slate-700 mb-2",
  search:
    "h-9 w-full pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:outline-none focus:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-500/20 transition-colors",
  check:
    "h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer",
  list: "rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-y-auto",
  row: (selected) =>
    `flex items-center gap-3 px-4 min-h-[56px] py-2 cursor-pointer transition-colors ${
      selected ? "bg-indigo-50/60" : "hover:bg-slate-50"
    }`,
  textBtn: "text-[13px] font-medium text-indigo-700 hover:text-indigo-900 transition-colors",
  primary: "h-9 px-4 gap-2 rounded-lg text-[13px] font-medium shadow-none",
};

/** Required vs filled summary on one line with a quiet status marker. */
function StaffingMeter({ required, filled, adding = 0 }) {
  const total = filled + adding;
  const short = Math.max(0, required - total);
  const over = required > 0 && total > required;
  const status =
    required === 0
      ? { tone: "slate", label: "No target set" }
      : short > 0
        ? { tone: "amber", label: `${short} more needed` }
        : over
          ? { tone: "amber", label: `${total - required} over target` }
          : { tone: "emerald", label: "Fully staffed" };

  return (
    <div className="flex items-center gap-3">
      <p className="shrink-0 text-[13px] tabular-nums text-slate-500">
        <span className="font-medium text-slate-900">{filled}</span>
        {adding > 0 && <span className="font-medium text-indigo-600"> +{adding}</span>}
        <span className="text-slate-400"> / {required}</span> allocated
      </p>
      <Marker tone={status.tone}>{status.label}</Marker>
    </div>
  );
}

/** Marks the part of a string that matches the search query. */
function Highlight({ text, query }) {
  const q = (query || "").trim();
  if (!q || !text) return text || null;
  const i = String(text).toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-indigo-100 px-0.5 text-indigo-900">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

/** Segmented filter with counts. */
function SegmentFilter({ value, onChange, options }) {
  return (
    <div className="inline-flex shrink-0 items-center rounded-lg bg-slate-100 p-1" role="tablist">
      {options.map((o) => {
        const on = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.key)}
            className={`inline-flex h-7 items-center gap-2 rounded-md px-3 text-[13px] whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 transition-colors ${
              on
                ? "bg-white font-medium text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {o.icon && <o.icon className={`h-4 w-4 ${on ? "text-slate-700" : "text-slate-400"}`} strokeWidth={1.5} />}
            {o.label}
            {o.count !== undefined && (
              <span className={`text-[12px] tabular-nums ${on ? "text-indigo-600" : "text-slate-400"}`}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Quiet text marker with a dot, used instead of filled pills. */
function Marker({ tone = "slate", children, title }) {
  const tones = {
    emerald: ["bg-emerald-500", "text-emerald-700"],
    amber: ["bg-amber-500", "text-amber-700"],
    indigo: ["bg-indigo-500", "text-indigo-700"],
    rose: ["bg-rose-500", "text-rose-700"],
    slate: ["bg-slate-300", "text-slate-500"],
  };
  const [dot, text] = tones[tone] || tones.slate;
  return (
    <span title={title} className={`inline-flex shrink-0 items-center gap-1.5 text-xs ${text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {children}
    </span>
  );
}

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const AllocationsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasHandledLocationProject = useRef(false);
  const role = localStorage.getItem("role") || "admin";
  const isScoped = isProjectScopedRole(role);
  const prefix = isScoped ? "/pm" : "/admin";
  const [projectView, setProjectView] = useState("active"); // "active" | "archived"

  // ── Unified Team Management Modal State ───────────────────
  const [teamModalProject, setTeamModalProject] = useState(null); // { id, name, project_type, required_manpower, required_expertise }
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamModalTab, setTeamModalTab] = useState("current"); // "current" | "add"
  const [isSwitchingProject, setIsSwitchingProject] = useState(false);

  // Filters & selection for "Add people" tab
  const [addSearch, setAddSearch] = useState("");
  const [addFilterTab, setAddFilterTab] = useState("all"); // "all" | "unallocated" | "allocated"
  const [selectedDesignation, setSelectedDesignation] = useState("all");
  const [selectedSkill, setSelectedSkill] = useState("all");
  const [selectedAddIds, setSelectedAddIds] = useState(new Set());
  const [addRoleTag, setAddRoleTag] = useState("");
  const [addDailyHours, setAddDailyHours] = useState(8);

  // Filters & selection for "Current team" tab
  const [manageSearch, setManageSearch] = useState("");
  const [selectedRemovalIds, setSelectedRemovalIds] = useState(new Set());

  // Confirm dialog state
  const [confirmState, setConfirmState] = useState(null);

  const openTeamModal = (row = null, initialTab = "current") => {
    if (row) {
      setTeamModalProject({
        id: row.project_id || row.id,
        name: row.project_name || row.name,
        project_type: row.project_type,
        required_manpower: row.required_manpower || 0,
        required_expertise: row.required_expertise || [],
      });
      setIsSwitchingProject(false);
    } else {
      setTeamModalProject(null);
      setIsSwitchingProject(true);
    }
    setTeamModalTab(initialTab);
    setIsTeamModalOpen(true);
    // Reset filters and selection
    setManageSearch("");
    setSelectedRemovalIds(new Set());
    setAddSearch("");
    setSelectedAddIds(new Set());
    setAddFilterTab("all");
    setSelectedDesignation("all");
    setSelectedSkill("all");
    setAddRoleTag("");
    setAddDailyHours(8);
  };

  const closeTeamModal = () => {
    setIsTeamModalOpen(false);
    setTeamModalProject(null);
    setIsSwitchingProject(false);
    setSelectedRemovalIds(new Set());
    setSelectedAddIds(new Set());
  };

  // ── Persist search + page + scroll ─────────────────────────
  const PAGE_KEY = "allocations";
  const saved = usePageStateStore((s) => s.getPageState(PAGE_KEY));
  const setPageState = usePageStateStore((s) => s.setPageState);

  const [currentPage, setCurrentPage] = useState(saved.currentPage ?? 1);
  const [searchQuery, setSearchQuery] = useState(saved.searchQuery ?? "");

  useEffect(() => {
    setPageState(PAGE_KEY, { searchQuery, currentPage });
  }, [searchQuery, currentPage, setPageState]);

  usePageScroll(PAGE_KEY);

  const [selectedProject, setSelectedProject] = useState(null);

  // ── CHANGED: one pre-aggregated page from the server, instead of
  // projects + allocations + employees + leaves + wfh + parentProjects all
  // joined and recomputed for every project in the browser. ─────────────
    const {
      data: pageData,
      isLoading: pageLoading,
      isFetching: pageFetching,
    } = useQuery({
      queryKey: ["allocations-page", currentPage, searchQuery, projectView],
      queryFn: () =>
        allocationApi.getPage({
          page: currentPage,
          pageSize: PAGE_SIZE,
          search: searchQuery,
          projectView,
        }),
      keepPreviousData: true,
    });

  const rows = pageData?.items || [];
  const totalPages = pageData?.total_pages || 0;
  const totalItems = pageData?.total_items || 0;

  // Lightweight list of every project, for the "Select Project" dropdown only.
  // Fetched lazily on modal open in 70ms (replacing the old 72s subProjectApi.getAll() on page load).
  const { data: projects = [] } = useQuery({
    queryKey: ["sub-projects-dropdown"],
    queryFn: () => subProjectApi.getDropdown(),
    enabled: isTeamModalOpen || Boolean(location.state?.projectId),
    staleTime: 60 * 1000,
  });

  const selectableProjects = useMemo(() => {
    const ARCHIVED = new Set(["completed", "on-hold", "cancelled"]);
    return projects.filter(
      (p) => !ARCHIVED.has((p.project_status || "active").toLowerCase().trim()),
    );
  }, [projects]);

  // ── Lightweight employee roster fetched lazily when modal is open
  const { data: employees = [] } = useQuery({
    queryKey: ["employees", "slim"],
    queryFn: () => employeeApi.getSlim(),
    enabled: isTeamModalOpen,
    staleTime: 60 * 1000,
  });

  const { data: employeeProjectsMap = {} } = useQuery({
    queryKey: ["allocations", "employee-projects"],
    queryFn: allocationApi.getEmployeeProjects,
    enabled: isTeamModalOpen,
  });

  // ── Full allocation detail for the currently selected project in team modal
  const activeProjectId = teamModalProject?.id || null;
  const { data: projectDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ["allocations", "project-detail", activeProjectId],
    queryFn: () => allocationApi.getProjectDetail(activeProjectId),
    enabled: !!activeProjectId && isTeamModalOpen,
  });

  // ── Cache Surgery: Fetch single updated row in ~15ms and patch it into table cache in 0ms
  const updateProjectRowSurgically = async (projectId) => {
    if (!projectId) return;
    try {
      const updatedRow = await allocationApi.getProjectRow(projectId);
      queryClient.setQueriesData({ queryKey: ["allocations-page"], type: "active" }, (old) => {
        if (!old || !old.items) return old;
        return {
          ...old,
          items: old.items.map((row) =>
            row.project_id === projectId ? updatedRow : row
          ),
        };
      });
    } catch {
      // Graceful fallback if single-row surgical fetch fails
      queryClient.invalidateQueries({ queryKey: ["allocations-page"] });
    }
  };

  const createMutation = useMutation({
    mutationFn: allocationApi.create,
    onSuccess: (_, variables) => {
      const targetProjectId = variables?.sub_project_id || activeProjectId;
      if (targetProjectId) {
        updateProjectRowSurgically(targetProjectId);
        queryClient.invalidateQueries({ queryKey: ["allocations", "project-detail", targetProjectId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["allocations-page"] });
      }
      queryClient.invalidateQueries({ queryKey: ["allocations", "employee-projects"] });
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      queryClient.invalidateQueries({ queryKey: ["sub-projects"] });
      queryClient.invalidateQueries({ queryKey: ["sub-projects-paginated"] });
      closeTeamModal();
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
    mutationFn: (allocationIdOrPayload) => {
      const id = typeof allocationIdOrPayload === "object" ? allocationIdOrPayload.id : allocationIdOrPayload;
      return allocationApi.delete(id);
    },
    onSuccess: (_, variables) => {
      const targetProjectId = typeof variables === "object" ? variables.projectId : activeProjectId;
      const deletedId = typeof variables === "object" ? variables.id : variables;
      if (targetProjectId) {
        if (deletedId) {
          queryClient.setQueryData(["allocations", "project-detail", targetProjectId], (old) => {
            if (!old || !old.items) return old;
            return {
              ...old,
              items: old.items.filter((it) => it.allocation_id !== deletedId),
            };
          });
        }
        updateProjectRowSurgically(targetProjectId);
      } else {
        queryClient.invalidateQueries({ queryKey: ["allocations-page"] });
      }
      queryClient.invalidateQueries({ queryKey: ["allocations", "employee-projects"] });
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      queryClient.invalidateQueries({ queryKey: ["sub-projects"] });
      queryClient.invalidateQueries({ queryKey: ["sub-projects-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding_pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding_newly_onboarded"] });
      toast.success("Allocation removed successfully!");
    },
    onError: (err) => {
      const message =
        err.response?.data?.detail || err.message || "Failed to delete allocation";
      toast.error(message);
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: allocationApi.bulkCreate,
    onSuccess: (res, variables) => {
      const { project_id, row } = res;
      const targetProjectId = project_id || variables?.project_id || activeProjectId;

      // 1. In-Memory Cache Surgery for table row using returned row (0 extra network requests)
      if (row) {
        queryClient.setQueriesData({ queryKey: ["allocations-page"], type: "active" }, (old) => {
          if (!old || !old.items) return old;
          return {
            ...old,
            items: old.items.map((r) => (r.project_id === row.project_id ? row : r)),
          };
        });
      } else if (targetProjectId) {
        updateProjectRowSurgically(targetProjectId);
      }

      // 2. In-Memory Cache Surgery for project detail modal
      if (targetProjectId) {
        const addedEmpIds = new Set(variables?.employee_ids || []);
        queryClient.setQueryData(["allocations", "project-detail", targetProjectId], (old) => {
          if (!old || !old.items) return old;
          const newlyAddedItems = (employees || [])
            .filter((e) => addedEmpIds.has(e.id))
            .map((e) => ({
              allocation_id: Date.now() + e.id,
              employee_id: e.id,
              name: e.name,
              email: e.email,
              avatar_url: e.avatar_url,
              designation: e.designation,
              role_tags: variables?.role_tags || [],
              total_daily_hours: variables?.daily_hours || 8,
              stale: false,
            }));
          return {
            ...old,
            items: [...old.items, ...newlyAddedItems],
          };
        });
      }

      // 3. In-Memory Cache Surgery for employee-projects mapping
      if (variables?.employee_ids && targetProjectId) {
        queryClient.setQueryData(["allocations", "employee-projects"], (oldMap = {}) => {
          const nextMap = { ...oldMap };
          variables.employee_ids.forEach((eid) => {
            const list = nextMap[eid] || [];
            if (!list.includes(targetProjectId)) {
              nextMap[eid] = [...list, targetProjectId];
            }
          });
          return nextMap;
        });
      }

      // Invalidate projects & slim allocations cache to ensure 100% two-way sync with Project modal
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      queryClient.invalidateQueries({ queryKey: ["sub-projects"] });
      queryClient.invalidateQueries({ queryKey: ["sub-projects-paginated"] });
      toast.success("Allocations added successfully!");
    },
    onError: (err) => {
      const message =
        err.response?.data?.detail?.message ||
        err.response?.data?.detail ||
        err.message ||
        "Failed to add allocations";
      toast.error(message);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: allocationApi.bulkDelete,
    onSuccess: (res, variables) => {
      const { project_id, deleted_allocation_ids = [], row } = res;
      const targetProjectId = project_id || variables?.project_id || activeProjectId;
      const deletedIds = new Set(
        deleted_allocation_ids.length ? deleted_allocation_ids : (variables?.allocation_ids || [])
      );

      // 1. In-Memory Cache Surgery for table row using returned row (0 extra network requests)
      if (row) {
        queryClient.setQueriesData({ queryKey: ["allocations-page"], type: "active" }, (old) => {
          if (!old || !old.items) return old;
          return {
            ...old,
            items: old.items.map((r) => (r.project_id === row.project_id ? row : r)),
          };
        });
      } else if (targetProjectId) {
        updateProjectRowSurgically(targetProjectId);
      }

      // 2. In-Memory Cache Surgery for project detail modal
      if (targetProjectId) {
        queryClient.setQueryData(["allocations", "project-detail", targetProjectId], (old) => {
          if (!old || !old.items) return old;
          return {
            ...old,
            items: old.items.filter((it) => !deletedIds.has(it.allocation_id)),
          };
        });
      }

      // 3. In-Memory Cache Surgery for employee-projects mapping
      if (targetProjectId) {
        queryClient.setQueryData(["allocations", "employee-projects"], (oldMap = {}) => {
          const nextMap = { ...oldMap };
          Object.keys(nextMap).forEach((eid) => {
            nextMap[eid] = (nextMap[eid] || []).filter((pid) => pid !== targetProjectId);
          });
          return nextMap;
        });
      }

      // Invalidate projects & slim allocations cache to ensure 100% two-way sync with Project modal
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      queryClient.invalidateQueries({ queryKey: ["sub-projects"] });
      queryClient.invalidateQueries({ queryKey: ["sub-projects-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding_pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding_newly_onboarded"] });
      toast.success("Allocations removed successfully!");
    },
    onError: (err) => {
      const message =
        err.response?.data?.detail || err.message || "Failed to remove allocations";
      toast.error(message);
    },
  });

  // Handle incoming project selection from Projects page
  useEffect(() => {
    if (location.state?.projectId && !hasHandledLocationProject.current && projects.length) {
      const project = projects.find((p) => p.id === location.state.projectId);
      if (project) {
        hasHandledLocationProject.current = true;
        openTeamModal(project, "add");
      }
    }
  }, [location.state, projects]);

  useEffect(() => {
    setCurrentPage(1);
  }, [projectView]);

  // ── Required/assigned stats for the selected team project ────────────────
  const teamModalStats = useMemo(() => {
    if (!activeProjectId) return { required: 0, assigned: 0 };
    const row = rows.find((r) => r.project_id === activeProjectId);
    const required = row
      ? row.required_manpower
      : teamModalProject?.required_manpower || projectDetail?.required_manpower || 0;
    const detailItems =
      projectDetail?.project_id === activeProjectId ? projectDetail.items || [] : [];
    const assigned = detailItems.filter((i) => !i.stale).length;
    return { required, assigned };
  }, [activeProjectId, rows, teamModalProject, projectDetail]);

  // ── Single Authoritative Candidate Data Derivation ───────────────────────
  // Resolves the 26 vs 28 discrepancy by strictly excluding employees
  // already allocated to this project from the available candidate pool.
  const candidateData = useMemo(() => {
    if (!activeProjectId || !employees.length) {
      return {
        all: [],
        available: [],
        allocatedOther: [],
        designations: [],
        skills: [],
      };
    }

    const currentAllocatedEmpIds = new Set(
      (projectDetail?.project_id === activeProjectId ? projectDetail.items || [] : [])
        .filter((it) => !it.stale)
        .map((it) => it.employee_id)
    );

    const designationSet = new Set();
    const skillSet = new Set();

    const candidates = employees
      .filter((emp) => emp.status !== "archived")
      .map((emp) => {
        if (emp.designation && emp.designation.trim()) {
          designationSet.add(emp.designation.trim());
        }
        (emp.skills || []).forEach((s) => {
          if (s && s.trim()) skillSet.add(s.trim());
        });

        const alreadyInThisProject = currentAllocatedEmpIds.has(emp.id);
        const otherProjects = (employeeProjectsMap[String(emp.id)] || []).filter(
          (p) => p.project_id !== activeProjectId
        );

        return {
          ...emp,
          alreadyInThisProject,
          otherProjects: otherProjects.length ? otherProjects : null,
        };
      })
      .filter((e) => !e.alreadyInThisProject)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    const available = candidates.filter((e) => !e.otherProjects);
    const allocatedOther = candidates.filter((e) => e.otherProjects);

    return {
      all: candidates,
      available,
      allocatedOther,
      designations: Array.from(designationSet).sort(),
      skills: Array.from(skillSet).sort(),
    };
  }, [activeProjectId, employees, employeeProjectsMap, projectDetail]);

  // ── Candidate Filtering by Designation, Skills, Tab, and Search ──────────
  const filteredCandidates = useMemo(() => {
    let list =
      addFilterTab === "unallocated"
        ? candidateData.available
        : addFilterTab === "allocated"
        ? candidateData.allocatedOther
        : candidateData.all;

    // Filter by designation
    if (selectedDesignation && selectedDesignation !== "all") {
      list = list.filter(
        (emp) =>
          (emp.designation || "").trim().toLowerCase() ===
          selectedDesignation.trim().toLowerCase()
      );
    }

    // Filter by skill
    if (selectedSkill && selectedSkill !== "all") {
      list = list.filter((emp) =>
        (emp.skills || []).some(
          (s) => (s || "").trim().toLowerCase() === selectedSkill.trim().toLowerCase()
        )
      );
    }

    // Search by text
    const q = addSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (emp) =>
          (emp.name || "").toLowerCase().includes(q) ||
          (emp.email || "").toLowerCase().includes(q) ||
          (emp.designation || "").toLowerCase().includes(q) ||
          (emp.skills || []).some((s) => (s || "").toLowerCase().includes(q))
      );
    }

    return list;
  }, [candidateData, addFilterTab, selectedDesignation, selectedSkill, addSearch]);

  const designationOptions = useMemo(
    () => [
      { value: "all", label: "All designations" },
      ...candidateData.designations.map((d) => ({ value: d, label: d })),
    ],
    [candidateData.designations]
  );

  const skillOptions = useMemo(
    () => [
      { value: "all", label: "All skills" },
      ...candidateData.skills.map((s) => ({ value: s, label: s })),
    ],
    [candidateData.skills]
  );

  const handleAddPeopleSubmit = () => {
    if (!activeProjectId || selectedAddIds.size === 0) return;

    const { required, assigned } = teamModalStats;
    const countToAdd = selectedAddIds.size;
    const newTotal = assigned + countToAdd;

    if (required > 0 && newTotal > required) {
      setConfirmState({
        variant: "warning",
        title: "Over-allocation detected",
        message: `This allocation will exceed the required manpower by ${newTotal - required}. Do you want to proceed anyway?`,
        details: [
          { label: "Required manpower", value: required },
          { label: "Currently allocated", value: assigned },
          { label: "Selected count", value: countToAdd },
          { label: "Total will be", value: newTotal, highlight: true },
        ],
        confirmText: "Proceed anyway",
        onConfirm: () => {
          setConfirmState(null);
          executeBulkAdd();
        },
      });
      return;
    }

    executeBulkAdd();
  };

  const executeBulkAdd = () => {
    bulkCreateMutation.mutate(
      {
        project_id: activeProjectId,
        employee_ids: Array.from(selectedAddIds),
        role_tags: addRoleTag ? [addRoleTag] : [],
        daily_hours: Number(addDailyHours) || 8.0,
      },
      {
        onSuccess: () => {
          setSelectedAddIds(new Set());
          setTeamModalTab("current");
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar — search (left) · create allocation (right) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        {/* Active / Archived tabs */}
        <div className="flex items-center shrink-0">
          {[
            { key: "active", label: "Active" },
            { key: "archived", label: "Archived" },
          ].map((t) => {
            const isActive = projectView === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setProjectView(t.key)}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                  isActive
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Search grows to fill middle */}
        <div className="flex-1 min-w-[200px]">
          <SearchBar
            responsive
            value={searchQuery}
            onChange={(val) => {
              setSearchQuery(val);
              setCurrentPage(1);
            }}
            placeholder="Search projects or employees..."
          />
        </div>

        {/* Create only on Active tab */}
        {projectView === "active" && (
          <button
            type="button"
            onClick={() => openTeamModal(null, "add")}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700 shadow-sm transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create Allocation
          </button>
        )}
      </div>

      <Table
        variant="untitled"
        allowOverflow
        loading={pageLoading || pageFetching}
        columns={[
          {
            key: "project",
            label: "Project",
            width: "w-[16%]",
            render: (_, row) => (
              <button
                type="button"
                onClick={() => navigate(`${prefix}/sub-projects?focus=${row.project_id}&search=${encodeURIComponent(row.project_name)}&view=${projectView}`)}
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
            width: "w-[20%]",
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
                  onClick={() => openTeamModal(row, "add")}
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
            width: "w-[32%]",
            // CHANGED: wfo/wfh/on-leave counts come straight from the row —
            // no per-employee leave/WFH scan in the browser.
            render: (_, row) => {
              const full = row.assigned_manpower >= row.required_manpower && row.required_manpower > 0;
              return (
                <div className="flex items-center gap-3">
                  <AllocationPopover
                    project={{ id: row.project_id, name: row.project_name }}
                      tempRoster={row.temp_roster || []}
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
                    onOpenAllocations={() => openTeamModal(row, "current")}
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
              key: "daily_presence",
              label: "Today's Temp Status",
              width: "w-[12%]",
              render: (_, row) => (
                <AllocationPopover
                  project={{ id: row.project_id, name: row.project_name }}
                      tempRoster={row.temp_roster || []}
                    tempOnly={true}
                  fetchDetail={() => allocationApi.getProjectDetail(row.project_id)}
                  triggerClassName="inline-flex items-center rounded-md focus:outline-none"
                  badgeContent={
                    <span className="text-[13px] font-medium text-slate-700 tabular-nums hover:text-indigo-600 cursor-pointer">
                  {row.daily_presence_total || 0} ({(row.daily_presence_wfo || 0)} WFO &middot; {(row.daily_presence_wfh || 0)} WFH)
                </span>
                  }
                />
              ),
            },
          {
            key: "_edit",
            label: "Actions",
            align: "right",
            width: "w-[8%]",
            render: (_, row) => (
              <button
                onClick={() => openTeamModal(row, "current")}
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Manage Allocations"
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
          title: searchQuery
            ? "No matching allocations"
            : projectView === "archived"
              ? "No archived projects"
              : "No allocations yet",
          description: searchQuery
            ? "Try adjusting your search query."
            : projectView === "archived"
              ? "Completed, on-hold, or cancelled projects with allocations will appear here."
              : "Create your first allocation to get started",
        }}
      />

      {/* ── Unified Team Management Modal ── */}
      <Modal
        isOpen={isTeamModalOpen}
        onClose={closeTeamModal}
        size="3xl"
        maxHeight="92vh"
        className="h-[min(86vh,720px)]"
      >
        <Modal.Header onClose={closeTeamModal} className="!px-4 !py-3">
          <div className="flex items-center gap-3 pr-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Users className="h-4 w-4" strokeWidth={1.5} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-medium text-slate-900">
                  {teamModalProject ? "Manage Team" : "Create Allocation"}
                </h2>
                {teamModalProject?.project_type && (
                  <span className="inline-flex items-center rounded-md border border-slate-200/80 bg-slate-50 px-2 py-0.5 text-[12px] font-normal text-slate-600">
                    {teamModalProject.project_type}
                  </span>
                )}
              </div>
              <p className="truncate text-[12px] text-slate-500">
                {teamModalProject ? (
                  <span className="font-medium text-slate-700">{teamModalProject.name}</span>
                ) : (
                  "Choose a project to manage staffing and allocations"
                )}
              </p>
            </div>
          </div>
        </Modal.Header>

        {/* Project Selector (when no project is chosen, or user chooses to switch project) */}
        {(!teamModalProject || isSwitchingProject) && (
          <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[13px] font-medium text-slate-700">
                Select Project <span className="text-rose-500">*</span>
              </label>
              {teamModalProject && isSwitchingProject && (
                <button
                  type="button"
                  onClick={() => setIsSwitchingProject(false)}
                  className="text-[12px] text-slate-500 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
            <Dropdown
              searchable
              searchPlaceholder="Search projects"
              options={selectableProjects.map((p) => {
                const row = rows.find((r) => r.project_id === p.id);
                const req = row ? row.required_manpower : p.required_manpower || 0;
                const ass = row ? row.assigned_manpower : 0;
                return {
                  value: p.id.toString(),
                  label: `${p.name} · ${ass}/${req} allocated`,
                };
              })}
              value={teamModalProject?.id?.toString() || ""}
              onChange={(val) => {
                const p = selectableProjects.find((x) => x.id === parseInt(val));
                if (p) {
                  setTeamModalProject({
                    id: p.id,
                    name: p.name,
                    project_type: p.project_type,
                    required_manpower: p.required_manpower || 0,
                    required_expertise: p.required_expertise || [],
                  });
                  setIsSwitchingProject(false);
                  setSelectedAddIds(new Set());
                  setSelectedRemovalIds(new Set());
                }
              }}
              placeholder="Choose a project"
            />
          </div>
        )}

        {/* View Tabs + Staffing Summary Bar */}
        {teamModalProject && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <SegmentFilter
              value={teamModalTab}
              onChange={setTeamModalTab}
              options={[
                {
                  key: "current",
                  label: "Current team",
                  icon: Users,
                  count: teamModalStats.assigned,
                },
                {
                  key: "add",
                  label: "Add people",
                  icon: UserPlus,
                  count: candidateData.available.length,
                },
              ]}
            />
            <div className="flex flex-wrap items-center gap-4">
              {teamModalStats.required > 0 && (
                <StaffingMeter
                  required={teamModalStats.required}
                  filled={teamModalStats.assigned}
                  adding={teamModalTab === "add" ? selectedAddIds.size : 0}
                />
              )}
              {selectableProjects.length > 1 && !isSwitchingProject && (
                <button
                  type="button"
                  onClick={() => setIsSwitchingProject(true)}
                  className="text-[13px] font-medium text-slate-500 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 rounded px-1 -mx-1 transition-colors"
                >
                  Switch project
                </button>
              )}
            </div>
          </div>
        )}

        <Modal.Body className="flex min-h-0 flex-col !overflow-hidden !p-4">
          {!teamModalProject ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Users className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">No project selected</h3>
              <p className="mt-1 max-w-sm text-[13px] text-slate-500">
                Please select a project from the dropdown above to view its team and allocate members.
              </p>
            </div>
          ) : isDetailLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              <p className="text-[13px] text-slate-500">Loading project team...</p>
            </div>
          ) : teamModalTab === "current" ? (
            /* ── Current Team View ── */
            (() => {
              const detailReady = projectDetail?.project_id === activeProjectId;
              const teamItems = detailReady ? projectDetail.items || [] : [];
              const staleItems = teamItems.filter((it) => it.stale);

              const q = manageSearch.trim().toLowerCase();
              const filteredItems = q
                ? teamItems.filter(
                    (it) =>
                      (it.name || "").toLowerCase().includes(q) ||
                      (it.email || "").toLowerCase().includes(q) ||
                      (it.designation || "").toLowerCase().includes(q)
                  )
                : teamItems;

              const allSelected =
                filteredItems.length > 0 &&
                filteredItems.every((it) => selectedRemovalIds.has(it.allocation_id));
              const someSelected = filteredItems.some((it) =>
                selectedRemovalIds.has(it.allocation_id)
              );

              const toggleAll = () =>
                setSelectedRemovalIds((prev) => {
                  const next = new Set(prev);
                  if (allSelected) filteredItems.forEach((it) => next.delete(it.allocation_id));
                  else filteredItems.forEach((it) => next.add(it.allocation_id));
                  return next;
                });

              return (
                <div className="flex min-h-0 flex-1 flex-col gap-3">
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      strokeWidth={1.5}
                    />
                    <input
                      type="text"
                      value={manageSearch}
                      onChange={(e) => setManageSearch(e.target.value)}
                      placeholder="Search team members"
                      className={AL.search}
                    />
                  </div>

                  {staleItems.length > 0 && (
                    <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50/50 px-4 py-3">
                      <div className="flex items-center gap-2 text-[12px] text-rose-700">
                        <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" strokeWidth={1.5} />
                        <span>
                          <span className="font-medium tabular-nums">{staleItems.length}</span> archived team member(s) left on this project
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmState({
                            variant: "danger",
                            title: "Clean up archived allocations",
                            message: `Remove all ${staleItems.length} leftover allocations from former staff on "${teamModalProject.name}"?`,
                            confirmText: "Clean up all",
                            onConfirm: () => {
                              bulkDeleteMutation.mutate(
                                {
                                  project_id: activeProjectId,
                                  allocation_ids: staleItems.map((x) => x.allocation_id),
                                },
                                {
                                  onSuccess: () => setConfirmState(null),
                                }
                              );
                            },
                          });
                        }}
                        className="text-[12px] font-medium text-rose-700 hover:text-rose-900 underline"
                      >
                        Clean up
                      </button>
                    </div>
                  )}

                  {filteredItems.length === 0 ? (
                    <div className="rounded-lg border border-slate-200 px-6 py-10 text-center">
                      <p className="text-[14px] text-slate-700">
                        {q
                          ? "No team member matches that search"
                          : "No one is allocated to this project yet"}
                      </p>
                      {!q && (
                        <Button
                          type="button"
                          onClick={() => setTeamModalTab("add")}
                          className={`${AL.primary} mt-3`}
                        >
                          <UserPlus className="h-4 w-4" strokeWidth={1.5} /> Add people
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-slate-200">
                      <div
                        className={`flex h-10 shrink-0 items-center gap-3 border-b px-4 transition-colors ${
                          selectedRemovalIds.size > 0
                            ? "border-rose-100 bg-rose-50/60"
                            : "border-slate-100 bg-slate-50/60"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected && !allSelected;
                          }}
                          onChange={toggleAll}
                          aria-label="Select everyone shown"
                          className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                        {selectedRemovalIds.size > 0 ? (
                          <>
                            <span className="text-[13px] font-medium tabular-nums text-rose-700">
                              {selectedRemovalIds.size} selected
                            </span>
                            <button
                              type="button"
                              disabled={bulkDeleteMutation.isPending}
                              onClick={() => {
                                const n = selectedRemovalIds.size;
                                setConfirmState({
                                  variant: "danger",
                                  title: `Remove ${plural(n, "person", "people")}`,
                                  message: `Remove the ${plural(n, "selected person", "selected people")} from "${teamModalProject.name}"?`,
                                  confirmText: `Remove ${n}`,
                                  onConfirm: () => {
                                    bulkDeleteMutation.mutate(
                                      {
                                        project_id: activeProjectId,
                                        allocation_ids: Array.from(selectedRemovalIds),
                                      },
                                      {
                                        onSuccess: () => {
                                          setSelectedRemovalIds(new Set());
                                          setConfirmState(null);
                                        },
                                      }
                                    );
                                  },
                                });
                              }}
                              className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-md bg-rose-600 px-3 text-[13px] font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-60"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                              Remove
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-[12px] tabular-nums text-slate-500">
                              {plural(filteredItems.length, "member")}
                            </span>
                            {staleItems.length > 0 && (
                              <span className="ml-auto">
                                <Marker tone="rose">{staleItems.length} archived to clean up</Marker>
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
                        {filteredItems.map((it) => {
                          const name = formatDisplayName(it.name);
                          const isSelected = selectedRemovalIds.has(it.allocation_id);
                          const toggle = () =>
                            setSelectedRemovalIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(it.allocation_id)) next.delete(it.allocation_id);
                              else next.add(it.allocation_id);
                              return next;
                            });
                          const isLead =
                            (it.is_lead || (it.role_tags || []).includes("Team Lead")) &&
                            (it.designation || "").toLowerCase() !== "team lead";

                          return (
                            <div
                              key={it.allocation_id}
                              onClick={toggle}
                              className={`group flex min-h-[56px] cursor-pointer items-center gap-3 px-4 py-2 transition-colors ${
                                isSelected
                                  ? "bg-rose-50/50"
                                  : it.stale
                                  ? "bg-rose-50/30"
                                  : "hover:bg-slate-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                aria-label={`Select ${name}`}
                                className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                              />
                              {it.stale ? (
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                                  <UserX className="h-4 w-4" strokeWidth={1.5} />
                                </span>
                              ) : (
                                <UserAvatar src={it.avatar_url} name={it.name} size="sm" className="shrink-0" />
                              )}

                              <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 items-center gap-2">
                                  <span
                                    title={it.name}
                                    className={`truncate text-[14px] font-medium ${
                                      it.stale ? "text-rose-700" : "text-slate-900"
                                    }`}
                                  >
                                    <Highlight text={name} query={manageSearch} />
                                  </span>
                                  {it.designation && (
                                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[12px] font-normal text-slate-600">
                                      <Highlight text={it.designation} query={manageSearch} />
                                    </span>
                                  )}
                                  {it.stale ? (
                                    <Marker tone="rose">Archived</Marker>
                                  ) : (
                                    <>
                                      {it.is_pm && <Marker tone="indigo">PM</Marker>}
                                      {isLead && <Marker tone="indigo">Team lead</Marker>}
                                    </>
                                  )}
                                </div>
                                {it.stale ? (
                                  <p className="mt-0.5 truncate text-[12px] text-rose-600/80">
                                    {it.email ? `${it.email} · ` : ""}no longer on the roster, safe to remove
                                  </p>
                                ) : (
                                  <div className="mt-0.5 flex min-w-0 items-center gap-3 text-[12px] text-slate-500">
                                    {it.email && (
                                      <span className="min-w-0 truncate">
                                        <Highlight text={it.email} query={manageSearch} />
                                      </span>
                                    )}
                                    {it.total_daily_hours ? (
                                      <span className="inline-flex shrink-0 items-center gap-1 tabular-nums text-slate-500">
                                        <Clock className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.5} />
                                        <span className="font-medium text-slate-700">{it.total_daily_hours}h/day</span>
                                      </span>
                                    ) : null}
                                    {(it.role_tags || []).length > 0 && (
                                      <span className="inline-flex min-w-0 items-center gap-1">
                                        <Tag className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={1.5} />
                                        <span className="truncate">{(it.role_tags || []).join(", ")}</span>
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const isTrainingProject =
                                    (teamModalProject?.project_type || "").toLowerCase() === "training" ||
                                    (teamModalProject?.name || "").toLowerCase().includes("week 1 training") ||
                                    (it.role_tags || []).includes("Trainee");
                                  setConfirmState({
                                    variant: "danger",
                                    title: it.stale
                                      ? "Remove archived allocation"
                                      : isTrainingProject
                                      ? "Cancel training and remove trainee"
                                      : "Remove team member",
                                    message: it.stale
                                      ? `${name} is no longer on the roster. Remove their leftover allocation from "${teamModalProject.name}"?`
                                      : isTrainingProject
                                      ? `${name} is in the 5-day onboarding training. Removing them cancels that training and returns them to the unassigned pool.`
                                      : `Remove ${name} from "${teamModalProject.name}"?`,
                                    confirmText: isTrainingProject ? "Cancel training and remove" : "Remove",
                                    onConfirm: () => {
                                      deleteMutation.mutate(
                                        { id: it.allocation_id, projectId: activeProjectId },
                                        {
                                          onSuccess: () => {
                                            setSelectedRemovalIds((prev) => {
                                              const next = new Set(prev);
                                              next.delete(it.allocation_id);
                                              return next;
                                            });
                                            setConfirmState(null);
                                          },
                                        }
                                      );
                                    },
                                  });
                                }}
                                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-slate-500 opacity-100 transition-colors hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                                title="Remove from project"
                                aria-label={`Remove ${name} from project`}
                              >
                                <UserMinus className="h-4 w-4" strokeWidth={1.5} />
                                <span className="hidden sm:inline">Remove</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            /* ── Add People View ── */
            (() => {
              const allSelected =
                filteredCandidates.length > 0 &&
                filteredCandidates.every((e) => selectedAddIds.has(e.id));
              const someSelected = filteredCandidates.some((e) => selectedAddIds.has(e.id));
              const requiredSkills = (teamModalProject?.required_expertise || []).map((x) =>
                String(x).trim().toLowerCase()
              );
              const hasActiveFilters =
                addSearch.trim() !== "" ||
                selectedDesignation !== "all" ||
                selectedSkill !== "all" ||
                addFilterTab !== "all";

              return (
                <div className="flex min-h-0 flex-1 flex-col gap-3">
                  {/* Filter Bar Row 1: Search + Availability Tabs */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative min-w-0 flex-1">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        strokeWidth={1.5}
                      />
                      <input
                        type="text"
                        value={addSearch}
                        onChange={(e) => setAddSearch(e.target.value)}
                        placeholder="Search candidates"
                        className={AL.search}
                      />
                    </div>
                    <SegmentFilter
                      value={addFilterTab}
                      onChange={setAddFilterTab}
                      options={[
                        { key: "all", label: "All", count: candidateData.all.length },
                        { key: "unallocated", label: "Available", count: candidateData.available.length },
                        { key: "allocated", label: "Elsewhere", count: candidateData.allocatedOther.length },
                      ]}
                    />
                  </div>

                  {/* Filter Bar Row 2: Designation Filter + Skill Filter + Reset Button */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="w-48">
                      <Dropdown
                        options={designationOptions}
                        value={selectedDesignation}
                        onChange={setSelectedDesignation}
                        placeholder="All designations"
                        searchable
                        searchPlaceholder="Filter designation"
                      />
                    </div>
                    <div className="w-48">
                      <Dropdown
                        options={skillOptions}
                        value={selectedSkill}
                        onChange={setSelectedSkill}
                        placeholder="All skills"
                        searchable
                        searchPlaceholder="Filter skills"
                      />
                    </div>
                    {hasActiveFilters && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setAddSearch("");
                            setSelectedDesignation("all");
                            setSelectedSkill("all");
                            setAddFilterTab("all");
                          }}
                          className="h-8 px-3 text-[12px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          Reset filters
                        </button>
                        <span className="ml-auto text-[12px] text-slate-500 tabular-nums">
                          {filteredCandidates.length} of {candidateData.all.length} matching
                        </span>
                      </>
                    )}
                  </div>

                  {filteredCandidates.length === 0 ? (
                    <div className="rounded-lg border border-slate-200 px-6 py-10 text-center">
                      <p className="text-[14px] text-slate-700">No candidates match the selected filters</p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={() => {
                            setAddSearch("");
                            setSelectedDesignation("all");
                            setSelectedSkill("all");
                            setAddFilterTab("all");
                          }}
                          className={`mt-2 ${AL.textBtn}`}
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-slate-200">
                      <div className="flex h-10 shrink-0 items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-4">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected && !allSelected;
                          }}
                          onChange={() =>
                            setSelectedAddIds((prev) => {
                              const next = new Set(prev);
                              if (allSelected) filteredCandidates.forEach((e) => next.delete(e.id));
                              else filteredCandidates.forEach((e) => next.add(e.id));
                              return next;
                            })
                          }
                          aria-label="Select everyone shown"
                          className={AL.check}
                        />
                        <span className="text-[12px] tabular-nums text-slate-500">
                          {selectedAddIds.size > 0
                            ? `${selectedAddIds.size} of ${filteredCandidates.length} selected`
                            : plural(filteredCandidates.length, "candidate")}
                        </span>
                      </div>

                      <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
                        {filteredCandidates.map((emp) => {
                          const isSelected = selectedAddIds.has(emp.id);
                          const others = emp.otherProjects || [];
                          return (
                            <div
                              key={emp.id}
                              onClick={() => {
                                setSelectedAddIds((prev) => {
                                  const next = new Set(prev);
                                  if (isSelected) next.delete(emp.id);
                                  else next.add(emp.id);
                                  return next;
                                });
                              }}
                              className={AL.row(isSelected)}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                aria-label={`Select ${emp.name}`}
                                className={AL.check}
                              />
                              <UserAvatar src={emp.avatar_url} name={emp.name} size="sm" className="shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 items-center gap-2">
                                  <span title={emp.name} className="truncate text-[14px] font-medium text-slate-900">
                                    <Highlight text={formatDisplayName(emp.name)} query={addSearch} />
                                  </span>
                                  {emp.designation && (
                                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[12px] font-normal text-slate-600">
                                      {emp.designation}
                                    </span>
                                  )}
                                  {others.length > 0 ? (
                                    <DynamicTooltip
                                      alwaysShow={true}
                                      placement="top"
                                      className="shrink-0"
                                      tooltip={
                                        <div className="space-y-1 py-0.5 text-left">
                                          {others.map((p, idx) => (
                                            <div key={idx} className="whitespace-nowrap text-[12px] text-slate-700">
                                              {p.project_name}
                                            </div>
                                          ))}
                                        </div>
                                      }
                                    >
                                      <Marker tone="amber">{`On ${plural(others.length, "project")}`}</Marker>
                                    </DynamicTooltip>
                                  ) : (
                                    <Marker tone="emerald">Available</Marker>
                                  )}
                                </div>
                                <div className="mt-0.5 flex min-w-0 items-center gap-3 text-[12px] text-slate-500">
                                  {emp.email && (
                                    <span className="min-w-0 truncate">
                                      <Highlight text={emp.email} query={addSearch} />
                                    </span>
                                  )}
                                  {emp.skills?.length > 0 && (
                                    <div className="flex shrink-0 items-center gap-1">
                                      {emp.skills.slice(0, 3).map((sk, idx) => {
                                        const hit = requiredSkills.includes(String(sk).trim().toLowerCase());
                                        return (
                                          <span
                                            key={idx}
                                            title={hit ? "Matches a required skill" : undefined}
                                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] ${
                                              hit
                                                ? "bg-emerald-50 font-medium text-emerald-700"
                                                : "bg-slate-100 text-slate-600"
                                            }`}
                                          >
                                            {hit && <Check className="h-3.5 w-3.5" strokeWidth={1.5} />}
                                            <Highlight text={sk} query={addSearch} />
                                          </span>
                                        );
                                      })}
                                      {emp.skills.length > 3 && (
                                        <span className="text-[12px] tabular-nums text-slate-400">+{emp.skills.length - 3}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </Modal.Body>

        <Modal.Footer className="!justify-between !px-4 !py-3">
          <div className="flex items-center gap-3">
            {teamModalTab === "add" && selectedAddIds.size > 0 ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[13px] font-medium tabular-nums text-slate-700">
                  {plural(selectedAddIds.size, "person", "people")} selected
                </span>
                <div className="w-36">
                  <Dropdown
                    options={[
                      { value: "", label: "Default Role" },
                      { value: "Annotator", label: "Annotator" },
                      { value: "Reviewer", label: "Reviewer" },
                      { value: "Quality Analyst", label: "Quality Analyst" },
                      { value: "Team Lead", label: "Team Lead" },
                      { value: "Trainee", label: "Trainee" },
                    ]}
                    value={addRoleTag}
                    onChange={setAddRoleTag}
                    placeholder="Assign Role"
                  />
                </div>
                <div className="flex items-center gap-1 text-[12px] text-slate-600">
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={addDailyHours}
                    onChange={(e) => setAddDailyHours(Math.max(1, parseInt(e.target.value) || 8))}
                    className="h-9 w-14 rounded-lg border border-slate-200 px-2 text-center text-[13px] tabular-nums text-slate-900 focus:border-indigo-400 focus:outline-none"
                  />
                  <span>h/day</span>
                </div>
              </div>
            ) : (
              <span className="text-[13px] tabular-nums text-slate-500">
                {teamModalProject && teamModalStats.assigned > 0
                  ? plural(teamModalStats.assigned, "active member")
                  : ""}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="cancel" onClick={closeTeamModal}>
              {teamModalTab === "add" && selectedAddIds.size > 0 ? "Cancel" : "Done"}
            </Button>

            {teamModalTab === "add" && selectedAddIds.size > 0 && (
              <Button
                type="button"
                disabled={bulkCreateMutation.isPending}
                isLoading={bulkCreateMutation.isPending}
                onClick={handleAddPeopleSubmit}
                className={AL.primary}
              >
                {!bulkCreateMutation.isPending &&
                  `Add ${plural(selectedAddIds.size, "person", "people")} to team`}
              </Button>
            )}
          </div>
        </Modal.Footer>
      </Modal>

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
