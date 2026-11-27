import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "../components/ui/Button";
import {
  subProjectApi,
  parentProjectApi,
  employeeApi,
  allocationApi,
  skillApi,
  leaveApi,
  guidelineApi,
  vendorApi,
  wfhApi,
} from "../services/api";
import {
  Plus,
  X,
  UserCheck,
  Users,
  ChevronDown,
  Settings,
  UploadCloud,
  FileText,
  BarChart3,
  SlidersHorizontal,
  Clock,
  Smile,
  PauseCircle,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import SearchBar from "../components/ui/SearchBar";
import {
  getPmEmployeeId,
} from "../utils/pmScope";
import {
  TEAM_LEAD_TAG,
  demotedToLeadIds,
  isProjectScopedRole,
  resolveProjectPmIds,
  isTeamLeadAllocation,
  isTeamLeadDesignation,
} from "../utils/roleAccess";
import {
  getEndDateValidationMessage,
  isEndDateBeforeStartDate,
} from "../utils/dateValidation";
import {
  manpowerEmployeeIds,
  totalRequiredManpower,
} from "../utils/workforce";
import Dropdown from "../components/ui/Dropdown";
import MultiSelect from "../components/ui/MultiSelect";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Modal from "../components/ui/Modal";
import StatCard from "../components/dashboard/StatCard";
import useScrollStore from "../store/useScrollStore";
import useProjectsStore from "../store/useProjectsStore";
import { formatDisplayName } from "../utils/displayName";
import { useDynamicPopover } from "../hooks/useDynamicPopover";

import {
  STATUS_CONFIG,
  ARCHIVED_STATUSES,
  isArchivedStatus,
  getStatusBadgeConfig,
  formatCreatedDate,
  typeLabel,
  DEVELOPER_TYPE_KEY,
  isDeveloperProject,
  PROJECT_TYPE_CATEGORIES,
} from "../utils/projectConstants";
import ProjectCard from "../components/projects/ProjectCard";
import DynamicTooltip from "../components/ui/DynamicTooltip";
import DatePicker from "../components/ui/DatePicker";
import { TeamLeadMultiSelect, PmMultiSelect } from "../components/projects/ProjectDropdowns";


// ── Project form primitives ───────────────────────────────────────────────
// Slate neutrals, one indigo accent, colour only where it carries meaning.
const PF = {
  label: "mb-1.5 block text-[13px] font-medium text-slate-700",
  hint: "mt-1.5 text-xs text-slate-500",
  req: "text-rose-500",
  input:
    "w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors hover:border-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15",
  number:
    "tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
  suffix:
    "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400",
  // Brings the shared pickers (Dropdown, PM / lead selects) to the same 36px control height.
  control:
    "[&_.cursor-text]:min-h-9 [&_button.justify-between]:min-h-9",
};

/** A form section: title and one-line purpose on the left, fields on the right. */
function FormSection({ title, hint, aside, children }) {
  return (
    <section className="grid grid-cols-1 gap-4 py-6 md:grid-cols-[168px_minmax(0,1fr)] md:gap-8">
      <div>
        <h3 className="text-sm font-medium text-slate-900">{title}</h3>
        {hint && <p className="mt-1 text-xs leading-relaxed text-slate-500">{hint}</p>}
        {aside && <div className="mt-2">{aside}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** Single-choice segmented control with a meaning-carrying dot per option. */
function Segmented({ value, onChange, options }) {
  return (
    <div role="radiogroup" className="inline-flex max-w-full flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
      {options.map((opt) => {
        const on = value === opt.value;
        return (
          <button
            key={opt.value || "none"}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(opt.value)}
            className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-[13px] whitespace-nowrap transition-colors ${
              on
                ? "bg-white font-medium text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${opt.dot} ${on ? "" : "opacity-60"}`} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Start date through the app's DatePicker; still submits `start_date` and stays required. */
function StartDateField({ defaultValue }) {
  const [value, setValue] = useState(defaultValue || "");
  return (
    <div className="relative [&_button]:min-h-9">
      <DatePicker
        name="start_date"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        accentColor="indigo"
        placeholder="Choose a date"
      />
      {/* Keeps the browser's required check, which a hidden input skips */}
      <input
        tabIndex={-1}
        aria-hidden="true"
        required
        value={value}
        onChange={() => {}}
        className="pointer-events-none absolute bottom-0 left-4 h-px w-px opacity-0"
      />
    </div>
  );
}

const ProjectsPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterMainProjectId = searchParams.get("project");
  const statusParam = searchParams.get("status");
  const recommendationParam = searchParams.get("recommendation");
  const focusId = searchParams.get("focus"); // scroll to + highlight this sub-project (e.g. from Allocations)
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = localStorage.getItem("role") || "admin";
  // `isPm` means "owns projects" — it drives self-assignment as a project's manager, so a
  // team lead must never satisfy it. `isScoped` means "sees only their own projects", which
  // both roles do. Scoping with isPm alone would show a team lead every project in the org.
  const isPm = role === "pm";
  const isTeamLeadRole = role === "team_lead";
  const isScoped = isProjectScopedRole(role);
  const isAdmin = role === "admin";
  const prefix = isScoped ? "/pm" : "/admin";
  const pmEmployeeId = getPmEmployeeId(user);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [copyingProject, setCopyingProject] = useState(null);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [projectTypes, setProjectTypes] = useState({}); // { category: subtype }
  // Drives the Developers headcount field in the Team Composition tab. Reads the
  // live modal selection, not the saved project, so the field appears the moment
  // Development is picked rather than after a save.
  const isDevelopmentSelected = !!projectTypes[DEVELOPER_TYPE_KEY];
  const [activeTypeTab, setActiveTypeTab] = useState(
    PROJECT_TYPE_CATEGORIES[0].key,
  );
  const [typeTabTouched, setTypeTabTouched] = useState(false); // has the user clicked a type tab? (drives subtype auto-open)
  const [guidelineFiles, setGuidelineFiles] = useState([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const [formMainProjectId, setFormMainProjectId] = useState("");
  const [formOrg, setFormOrg] = useState("");
  const [formPriority, setFormPriority] = useState("auto");
  const [prioritySuggestion, setPrioritySuggestion] = useState("P1");
  // Controlled team-composition counts that drive the priority suggestion. Kept in
  // React state (not read from the live form DOM) so adding a new input that should
  // affect the suggestion is just another dependency — no FormData/getElementById
  // wiring required.
  const [formAutonexAnnotators, setFormAutonexAnnotators] = useState(0);
  const [formAutonexReviewers, setFormAutonexReviewers] = useState(0);

  const [formProjectStatus, setFormProjectStatus] = useState("active");
  const [formSentiment, setFormSentiment] = useState("");
  const [modalInfoTab, setModalInfoTab] = useState("status"); // Status | Client Sentiment
  const [modalBuildTab, setModalBuildTab] = useState("types"); // Project Types | Team Composition

  const {
    selectedOrganization,
    setSelectedOrganization,
    selectedPm,
    setSelectedPm,
    selectedTeamLead,
    setSelectedTeamLead,
    selectedStatus,
    setSelectedStatus,
    selectedPriority,
    setSelectedPriority,
    projectView,
    setProjectView,
    autonexOnly,
    setAutonexOnly,
    subProjectSearch,
    setSubProjectSearch,
    currentPage,
    setCurrentPage,
    filtersOpen,
    setFiltersOpen,
  } = useProjectsStore((state) => state);

  const [selectedPmIds, setSelectedPmIds] = useState([]);
  // Team leads chosen in the modal. Saved as allocations tagged "Team Lead" after the
  // project itself is saved — deliberately NOT merged into `assigned_employee_ids`, which
  // is the PM set and would grant them the approval rights the role exists to withhold.
  const [selectedTeamLeadIds, setSelectedTeamLeadIds] = useState([]);
  const filtersRef = useRef(null);
  const filterAlignClass = useDynamicPopover(filtersRef, filtersOpen, 320);
  // Inline (double-click) card editing + per-card docs popover
  const [editingCardId, setEditingCardId] = useState(null);
  const [cardDraft, setCardDraft] = useState(null);
  const [docsOpenId, setDocsOpenId] = useState(null);

  useEffect(() => {
    const ann = formAutonexAnnotators || 0;
    const rev = formAutonexReviewers || 0;
    const tl = selectedTeamLeadIds.length;
    const total = ann + rev + tl;
    let sugg = "P1";
    if (total === 0) sugg = "P3";
    else if (ann + rev === 0 && tl > 0) sugg = "P2";
    else if (total >= 5) sugg = "P0";
    setPrioritySuggestion(sugg);
  }, [formAutonexAnnotators, formAutonexReviewers, selectedTeamLeadIds]);

  const { data: projectKpis } = useQuery({
    queryKey: ["sub-projects-kpi"],
    queryFn: () => subProjectApi.getKpi(),
    staleTime: 60000,
  });

  const formatFilterVal = (val) => {
    if (Array.isArray(val)) {
      return val.length > 0 ? val.join(",") : undefined;
    }
    return val && val !== "all" ? val : undefined;
  };

  const { data: paginatedData, isLoading, isFetching } = useQuery({
    queryKey: [
      "sub-projects-paginated",
      currentPage,
      12,
      subProjectSearch,
      filterMainProjectId,
      statusParam,
      recommendationParam,
      selectedOrganization,
      selectedPm,
      selectedTeamLead,
      selectedStatus,
      selectedPriority,
      projectView,
      autonexOnly,
    ],
    queryFn: () =>
      subProjectApi.getPaginated({
        page: currentPage,
        limit: 12,
        search: subProjectSearch || undefined,
        main_project_id: filterMainProjectId || undefined,
        project_view: projectView,
        status: statusParam || formatFilterVal(selectedStatus),
        priority: formatFilterVal(selectedPriority),
        organization: formatFilterVal(selectedOrganization),
        autonex_only: autonexOnly ? true : undefined,
        pm_id: formatFilterVal(selectedPm),
        team_lead_id: formatFilterVal(selectedTeamLead),
        recommendation: recommendationParam || undefined,
      }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const projects = paginatedData?.items || [];
  const totalItems = paginatedData?.total || 0;
  const projectMetrics = projectKpis?.metrics || {
    totalProjects: 0,
    activeProjects: 0,
    overburdenedProjects: 0,
    balancedProjects: 0,
    onHoldProjects: 0,
    completedProjects: 0,
    cancelledProjects: 0,
  };
  const tabCounts = projectKpis?.tab_counts || {
    active: 0,
    archived: 0,
    development: 0,
  };

  const [hasAutoSwitched, setHasAutoSwitched] = useState(false);

  useEffect(() => {
    const searchParam = searchParams.get("search");
    const viewParam = searchParams.get("view");
    
    let shouldUpdateParams = false;
    const params = new URLSearchParams(searchParams);

    if (searchParam) {
      setSubProjectSearch(searchParam);
      params.delete("search");
      shouldUpdateParams = true;
    }
    
    if (viewParam) {
      setProjectView(viewParam);
      params.delete("view");
      shouldUpdateParams = true;
    }

    if (shouldUpdateParams) {
      setSearchParams(params, { replace: true });
    }
  }, [searchParams, setSearchParams, setSubProjectSearch, setProjectView]);

  useEffect(() => {
    if (projectKpis?.tab_counts && !hasAutoSwitched) {
      setHasAutoSwitched(true);
      const counts = projectKpis.tab_counts;
      if (counts[projectView] === 0) {
        const bestTab = Object.keys(counts).reduce((a, b) =>
          counts[a] > counts[b] ? a : b
        );
        if (counts[bestTab] > 0 && bestTab !== projectView) {
          setProjectView(bestTab);
        }
      }
    }
  }, [projectKpis, hasAutoSwitched, projectView, setProjectView]);

  const { data: parentProjects = [] } = useQuery({
    queryKey: ["parent-projects"],
    queryFn: () => parentProjectApi.getAll(),
  });

  // Lazy-load employees only when needed for add/edit modal? No, employeeIndex
  // is required for resolving PMs and Team Leads on the initial render of the
  // project cards, otherwise they show as 0 or empty until the modal opens.
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeeApi.getSlim(),
  });
  const { data: formerEmployees = [] } = useQuery({
    queryKey: ["employees", "archived"],
    queryFn: () => employeeApi.getSlim({ status: "archived" }),
  });
  const employeeIndex = useMemo(() => {
    return new Map(employees.map((e) => [String(e.id), e]));
  }, [employees]);
  const pmEmployees = useMemo(() => {
    return employees.filter((e) => {
      const d = (e.designation || "").toLowerCase();
      return (
        d.includes("program manager") ||
        d.includes("project manager") ||
        d.includes("pm") ||
        d.includes("admin") ||
        d.includes("manager") ||
        d.includes("hr")
      );
    });
  }, [employees]);
  const teamLeadEmployees = useMemo(() => {
    return employees.filter((e) =>
      (e.designation || "").toLowerCase().includes("team lead"),
    );
  }, [employees]);
  const createVendorMutation = useMutation({
    mutationFn: (name) => vendorApi.create({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
  const { data: skillsData = [] } = useQuery({
    queryKey: ["skills"],
    queryFn: () => skillApi.getAll(),
    enabled: isModalOpen || !!editingProject,
  });
  const { data: vendorsData = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => vendorApi.getAll(),
    enabled: isModalOpen || !!editingProject,
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ["allocations"],
    queryFn: () => allocationApi.getSlim(),
    staleTime: 5 * 60 * 1000,
  });

  // Guideline docs, filtered per-card by sub_project_id for the card "Docs" popover.
  // const { data: guidelinesData = [] } = useQuery({
  //   queryKey: ["guidelines", "cards"],
  //   queryFn: () => guidelineApi.getAll(),
  // });

  const { startStr, endStr } = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, "0")}`;
    return { startStr: start, endStr: end };
  }, []);

  const { data: leaves = [] } = useQuery({
    queryKey: ["leaves"],
    queryFn: () => leaveApi.getTodayIds(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: wfh = [] } = useQuery({
    queryKey: ["wfh"],
    queryFn: () => wfhApi.getTodayIds(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: guidelinesData = [] } = useQuery({
    queryKey: ["guidelines"],
    queryFn: () => guidelineApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  // Local calendar date — never via toISOString(), which is UTC and would report
  // yesterday for the first 5.5 hours of every IST day.
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  // Employees on approved leave today.
  const leaveEmployeeIds = useMemo(() => new Set(leaves || []), [leaves]);

  const wfhTodayIds = useMemo(() => new Set(wfh || []), [wfh]);

  // Where each employee is TODAY: WFH if that's their standing work model or they
  // have an approved WFH day; otherwise WFO.
  const locationByEmployeeId = useMemo(() => {
    const m = new Map();
    // Default fallback
    employees.forEach((e) => {
      const wm = (e.work_model || "WFO").toUpperCase();
      const regularWfh = wm === "WFH" || wm.includes("HOME");
      m.set(e.id, regularWfh || wfhTodayIds.has(e.id) ? "WFH" : "WFO");
    });
    // Override with actual data from backend
    projects.forEach((p) => {
      if (p.permanent_locations) {
        Object.entries(p.permanent_locations).forEach(([empId, loc]) => {
          m.set(Number(empId), loc);
          m.set(String(empId), loc);
        });
      }
    });
    return m;
  }, [employees, wfhTodayIds, projects]);

  // Scoped for both PMs and team leads. getPmSubProjects grants a project when you are its
  // PM *or* allocated to it, so a lead sees exactly the projects they lead — and nothing
  // else. Keyed on isScoped, not isPm: a lead failing an isPm test would fall through to
  // the unscoped admin branch and be shown every project in the organisation.
  const visibleProjects = projects;

  // Organisations to show: those the person manages, plus the parent of every project they
  // can see. The second half matters for a team lead, who manages no organisation at all —
  // without it `resolvePmIds` would find no parent to fall back to and a project whose PM is
  // recorded only at organisation level would render with no manager.
  const visibleMainProjects = parentProjects;

  // Organization → Project cascade for the create/edit modal. "Organization" is
  // the free-text `client` on a main project (same concept as the Organizations
  // page); a sub-project still attaches to a specific main project (main_project_id),
  // so the org selection just narrows which projects are offered.
  const NO_ORG = "— No Organization —";
  const clientOf = (mp) => mp?.client || NO_ORG;
  const organizations = [...new Set(visibleMainProjects.map(clientOf))].sort(
    (a, b) => (a === NO_ORG ? 1 : b === NO_ORG ? -1 : a.localeCompare(b)),
  );
  // The create/edit modal lets a PM pick ANY existing organization (not just their
  // own), so they reuse "Autonex" etc. instead of creating a duplicate. The top
  // filter above stays PM-scoped (organizations); this is modal-only.
  const allOrganizations = [...new Set(parentProjects.map(clientOf))].sort(
    (a, b) => (a === NO_ORG ? 1 : b === NO_ORG ? -1 : a.localeCompare(b)),
  );
  // The organization a given main-project id belongs to (used to prefill on edit/copy).
  const orgOfMainProject = (mpId) => {
    const mp = visibleMainProjects.find((p) => p.id === parseInt(mpId));
    return mp ? clientOf(mp) : "";
  };

  const createMutation = useMutation({
    mutationFn: subProjectApi.create,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => subProjectApi.update(id, data),
  });

  // Inline (double-click) card edit — persists the commonly-changed sub-project
  // fields shown on the card (name, status, team counts, annotation time,
  // vendor, sentiment). Advanced fields are edited via the full modal.
  const cardUpdateMutation = useMutation({
    mutationFn: ({ id, data }) => subProjectApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["sub-projects"]);
      toast.success("Project updated");
      setEditingCardId(null);
      setCardDraft(null);
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to update project"),
  });

  const deleteMutation = useMutation({
    mutationFn: subProjectApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(["sub-projects"]);
      toast.success("Project deleted successfully");
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to delete project"),
  });

  // Zero-Network Cache Surgery Archive Mutation
  const archiveMutation = useMutation({
    mutationFn: ({ id, status }) =>
      subProjectApi.update(id, { project_status: status }),
    onSuccess: (updatedProject, variables) => {
      // 1. Surgically update KPI tab counts in RAM
      queryClient.setQueryData(["sub-projects", "kpi"], (oldKpi) => {
        if (!oldKpi?.tab_counts) return oldKpi;
        const sourceTab = projectView;
        return {
          ...oldKpi,
          tab_counts: {
            ...oldKpi.tab_counts,
            [sourceTab]: Math.max(0, (oldKpi.tab_counts[sourceTab] || 0) - 1),
            archived: (oldKpi.tab_counts.archived || 0) + 1,
          },
        };
      });

      // 2. Surgically prune project from active list in RAM
      queryClient.setQueriesData(
        { queryKey: ["sub-projects", "paginated"] },
        (oldData) => {
          if (!oldData?.items) return oldData;
          return {
            ...oldData,
            total: Math.max(0, (oldData.total || 0) - 1),
            items: oldData.items.filter((item) => item.id !== variables.id),
          };
        }
      );

      // 3. Mark Archived tab as stale without immediate refetch (Zero-Network!)
      queryClient.invalidateQueries({
        queryKey: ["sub-projects", "paginated", { project_view: "archived" }],
        refetchType: "none",
      });

      toast.success(`Project archived as ${variables.status}`);
      setArchiveModalProject(null);
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to archive project"),
  });

  // Zero-Network Cache Surgery Restore Mutation
  const restoreMutation = useMutation({
    mutationFn: ({ id, status = "in progress" }) =>
      subProjectApi.update(id, { project_status: status }),
    onSuccess: (updatedProject, variables) => {
      const isDev = isDeveloperProject(updatedProject?.project_types);
      const targetTab = isDev ? "development" : "active";

      // 1. Surgically update KPI tab counts in RAM
      queryClient.setQueryData(["sub-projects", "kpi"], (oldKpi) => {
        if (!oldKpi?.tab_counts) return oldKpi;
        return {
          ...oldKpi,
          tab_counts: {
            ...oldKpi.tab_counts,
            archived: Math.max(0, (oldKpi.tab_counts.archived || 0) - 1),
            [targetTab]: (oldKpi.tab_counts[targetTab] || 0) + 1,
          },
        };
      });

      // 2. Surgically prune project from archived list in RAM
      queryClient.setQueriesData(
        { queryKey: ["sub-projects", "paginated"] },
        (oldData) => {
          if (!oldData?.items) return oldData;
          return {
            ...oldData,
            total: Math.max(0, (oldData.total || 0) - 1),
            items: oldData.items.filter((item) => item.id !== variables.id),
          };
        }
      );

      // 3. Mark target tab as stale without immediate refetch (Zero-Network!)
      queryClient.invalidateQueries({
        queryKey: ["sub-projects", "paginated", { project_view: targetTab }],
        refetchType: "none",
      });

      toast.success("Project restored to active operations");
      setRestoreConfirmProject(null);
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to restore project"),
  });

  const setScrollPosition = useScrollStore((state) => state.setScrollPosition);

  useEffect(() => {
    if (!isLoading) {
      const initialScroll =
        useScrollStore.getState().scrollPositions["projects-page"] || 0;
      const mainContainer = document.querySelector("main");
      if (mainContainer && initialScroll) {
        setTimeout(() => {
          mainContainer.scrollTop = initialScroll;
        }, 50);
      }
    }
  }, [isLoading]);

  useEffect(() => {
    const mainContainer = document.querySelector("main");
    let currentScroll =
      useScrollStore.getState().scrollPositions["projects-page"] || 0;

    const handleScroll = (e) => {
      currentScroll = e.target.scrollTop;
    };

    if (mainContainer) {
      mainContainer.addEventListener("scroll", handleScroll, { passive: true });
    }

    return () => {
      if (mainContainer) {
        mainContainer.removeEventListener("scroll", handleScroll);
      }
      // Always save scroll position on unmount
      setScrollPosition("projects-page", currentScroll);
    };
  }, [setScrollPosition]);

  const resetModalState = () => {
    setIsModalOpen(false);
    setEditingProject(null);
    setCopyingProject(null);
    setSelectedSkills([]);
    setSelectedVendors([]);
    setProjectTypes({});
    setActiveTypeTab(PROJECT_TYPE_CATEGORIES[0].key);
    setTypeTabTouched(false);
    setGuidelineFiles([]);
    setIsDragActive(false);
    setFormMainProjectId("");
    setFormOrg("");
    setFormPriority("auto");
    setFormAutonexAnnotators(0);
    setFormAutonexReviewers(0);
    setFormProjectStatus("active");
    setFormSentiment("");
    setModalInfoTab("status");
    setModalBuildTab("types");
    setSelectedTeamLeadIds([]);
  };

  const addGuidelineFiles = (files) => {
    const nextFiles = Array.from(files || []);
    if (nextFiles.length === 0) return;

    setGuidelineFiles((prev) => {
      const existingKeys = new Set(
        prev.map((file) => `${file.name}-${file.size}-${file.lastModified}`),
      );
      const deduped = nextFiles.filter(
        (file) =>
          !existingKeys.has(`${file.name}-${file.size}-${file.lastModified}`),
      );
      return [...prev, ...deduped];
    });
  };

  const removeGuidelineFile = (targetFile) => {
    setGuidelineFiles((prev) =>
      prev.filter(
        (file) =>
          `${file.name}-${file.size}-${file.lastModified}` !==
          `${targetFile.name}-${targetFile.size}-${targetFile.lastModified}`,
      ),
    );
  };

  /**
   * Make the project's team leads match `leadIds`.
   *
   * A lead is an allocation carrying the "Team Lead" tag, so this adds and removes
   * allocations rather than writing a field. Three rules it has to respect:
   *
   * - Never touch `assigned_employee_ids` — that is the manager set, and a lead placed there
   *   would gain rank over the project's other leads.
   * - Never delete an allocation that isn't a lead allocation. Someone can be a lead *and*
   *   an annotator on the same project; dropping them as lead must leave their real work
   *   allocation (and its hours) alone.
   * - Read the project's allocations back from the server first. The cached list is a
   *   snapshot from before the save, and on a *create* it cannot contain the row the backend
   *   adds for whoever created the project — so diffing against it produced a second,
   *   duplicate allocation for that person.
   */
  const syncTeamLeadAllocations = async (project, leadIds) => {
    const projectId = project.id;
    let existing;
    try {
      existing = await allocationApi.getByProject(projectId);
    } catch {
      // Fall back to the cache rather than skipping the sync entirely — a stale diff is
      // recoverable from the Allocations page, silently dropping the assignment is not.
      existing = allocations.filter((a) => a.sub_project_id === projectId);
    }
    const wanted = new Set(leadIds.map(Number));

    const currentLeads = existing.filter((a) =>
      isTeamLeadAllocation(a, employeeIndex.get(String(a.employee_id))),
    );
    const currentLeadIds = new Set(currentLeads.map((a) => Number(a.employee_id)));

    // Drop the lead tag from anyone no longer listed. Where the allocation exists only to
    // record leadership, remove it; where it also carries real work, just untag it.
    const removals = currentLeads
      .filter((a) => !wanted.has(Number(a.employee_id)))
      .map((a) => {
        const remainingTags = (a.role_tags || []).filter(
          (tag) => !isTeamLeadDesignation(tag),
        );
        return remainingTags.length > 0
          ? allocationApi.update(a.id, { role_tags: remainingTags })
          : allocationApi.delete(a.id);
      });

    const additions = leadIds
      .filter((id) => !currentLeadIds.has(Number(id)))
      .map((id) => {
        // Reuse an allocation they already hold on this project so one person never ends
        // up with two rows — which would double-count them against manpower.
        const held = existing.find((a) => Number(a.employee_id) === Number(id));
        if (held) {
          return allocationApi.update(held.id, {
            role_tags: [...(held.role_tags || []), TEAM_LEAD_TAG],
          });
        }
        return allocationApi.create({
          employee_id: id,
          sub_project_id: projectId,
          total_daily_hours: 8,
          // Leading is a position, not a workstream, so it claims no share of the day.
          role_tags: [TEAM_LEAD_TAG],
          time_distribution: {},
          // Bound to the project's own window, as the Allocations page does — an
          // open-ended allocation reads as indefinite in the capacity views.
          active_start_date: project.start_date || null,
          active_end_date: project.end_date || null,
          // Naming a lead is recording a position, not booking their day, so the capacity
          // guard must not veto it — it answers a different question. Left unset it returns
          // 409 for any lead already running a project, and also for a part-time lead with
          // no allocations at all, since the check compares against
          // employees.working_hours_per_day rather than 8. Always overridden, with the
          // reason recorded, so the behaviour has no edge cases and stays auditable.
          override_flag: true,
          override_reason: "Assigned as team lead from the project form",
        });
      });

    await Promise.all([...removals, ...additions]);
  };

  const uploadGuidelinesForProject = async (
    projectId,
    mainProjectId,
    files = guidelineFiles,
  ) => {
    if (files.length === 0) return;

    await Promise.all(
      files.map((file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", file.name.replace(/\.[^.]+$/, ""));
        formData.append("sub_project_id", String(projectId));
        formData.append("main_project_id", String(mainProjectId));
        if (user.id) {
          formData.append("uploaded_by", String(user.id));
        }
        return guidelineApi.upload(formData);
      }),
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Guard against double-submission (e.g. rapid double-clicks on Save)
    if (createMutation.isPending || updateMutation.isPending) return;
    const formData = new FormData(e.target);
    let selectedMainProjectId =
      parseInt(
        formData.get("main_project_id") || filterMainProjectId || "",
        10,
      ) || null;

    // "Organization" is just a name. Reuse an existing organization with the
    // same name if one exists; only create a new one when the typed name is
    // genuinely new (attaching the creating PM).
    if (!selectedMainProjectId) {
      const orgName = (formOrg || "").trim();
      if (!orgName || orgName === NO_ORG) {
        toast.error("Please enter an organization");
        return;
      }

      // Match against ALL organizations (not just the PM's own) so a PM reuses an
      // existing org like "Autonex" instead of silently creating a duplicate.
      const existingOrg =
        parentProjects.find(
          (p) => (p.name || "").trim().toLowerCase() === orgName.toLowerCase(),
        ) ||
        parentProjects.find(
          (p) => (p.client || "").trim().toLowerCase() === orgName.toLowerCase(),
        );

      if (existingOrg) {
        selectedMainProjectId = existingOrg.id;
      } else {
        try {
          const createdOrg = await parentProjectApi.create({
            name: orgName,
            client: orgName,
            program_manager_ids: isPm && pmEmployeeId ? [pmEmployeeId] : [],
          });
          selectedMainProjectId = createdOrg.id;
          queryClient.invalidateQueries({ queryKey: ["parent-projects"] });
        } catch (error) {
          toast.error(
            error.response?.data?.detail || "Failed to create organization",
          );
          return;
        }
      }
    }

    const startDate = formData.get("start_date");
    const endDate = formData.get("end_date") || null;

    if (endDate && isEndDateBeforeStartDate(startDate, endDate)) {
      toast.error(getEndDateValidationMessage());
      return;
    }

    const start = new Date(startDate);
    const durationDays = endDate
      ? Math.ceil((new Date(endDate) - start) / (1000 * 60 * 60 * 24)) + 1
      : 0;
    const durationWeeks = endDate ? Math.floor(durationDays / 7) : 0;

    const num = (name) => parseInt(formData.get(name)) || 0;

    const data = {
      name: formData.get("name"),
      main_project_id: selectedMainProjectId,
      total_tasks: parseInt(formData.get("total_tasks")) || 0,
      estimated_time_per_task:
        parseFloat(formData.get("estimated_time_per_task")) / 60, // annotation time; stored as hours, input in minutes
      review_time_per_task: formData.get("review_time_per_task")
        ? parseFloat(formData.get("review_time_per_task")) / 60 // stored as hours, input in minutes
        : null,
      gearing_ratio: formData.get("gearing_ratio")
        ? parseFloat(formData.get("gearing_ratio"))
        : null,
      start_date: startDate,
      end_date: endDate,
      daily_target: parseInt(formData.get("daily_target")) || 0,
      priority: formPriority === "auto" ? prioritySuggestion : formPriority,
      required_expertise: selectedSkills,
      // Team composition (required_manpower is auto-computed server-side from the Autonex counts)
      annotators_total: num("annotators_total"),
      workforce_vendors: selectedVendors,
      autonex_annotators: num("autonex_annotators"),
      autonex_reviewers: num("autonex_reviewers"),
      others_count: num("others_count"),
      // Counted from who is actually selected, so the headcount cannot contradict the
      // roster on the same screen.
      team_lead_count: selectedTeamLeadIds.length,
      team_manager_count: selectedPmIds.length,
      // Zero unless Development is selected — the input is not rendered otherwise,
      // so `num` reads nothing and the count is cleared rather than left stale
      // from a project whose type changed.
      developers_count: isDevelopmentSelected ? num("developers_count") : 0,
      // Assigned PMs / Employees
      assigned_employee_ids: selectedPmIds,
      pm_id: selectedPmIds[0] || null,
      team_lead_ids: selectedTeamLeadIds,
      // PMs and leads are added on top of this when the ratio is displayed
      // (see totalRequiredManpower) — they are not part of the stored figure.
      // Recomputed server-side by _autonex_headcount; sent so the optimistic UI
      // matches what comes back. Keep the two in step.
      required_manpower:
        num("autonex_annotators") +
        num("autonex_reviewers") +
        num("others_count") +
        selectedTeamLeadIds.length +
        selectedPmIds.length +
        (isDevelopmentSelected ? num("developers_count") : 0),
      project_duration_weeks: durationWeeks,
      project_duration_days: durationDays,
      project_status: formData.get("project_status") || "active",
      project_types: projectTypes,
      encord_project_hash:
        (formData.get("encord_project_hash") || "").trim() || null,
      sentiment: (formData.get("sentiment") || "").trim() || null,
    };

    let savedProject;
    try {
      if (editingProject) {
        savedProject = await updateMutation.mutateAsync({
          id: editingProject.id,
          data,
        });
      } else {
        savedProject = await createMutation.mutateAsync(data);
      }
    } catch (error) {
      const detail = error.response?.data?.detail;
      let message = "Failed to save project";
      if (typeof detail === "string") {
        message = detail;
      } else if (Array.isArray(detail)) {
        // FastAPI 422 returns an array of {loc, msg}; surface the field + reason
        message = detail
          .map((e) => {
            const field = Array.isArray(e.loc) ? e.loc[e.loc.length - 1] : "";
            return field ? `${field}: ${e.msg}` : e.msg;
          })
          .join("; ");
      }
      toast.error(message);
      return;
    }

    // Save succeeded — close the modal NOW so a failed follow-up step
    // (e.g. guideline upload) can't lead to duplicate re-submissions.
    const wasEditing = Boolean(editingProject);
    const filesToUpload = guidelineFiles;
    // Captured before the reset, for the same reason as the files above.
    const teamLeadsToSave = selectedTeamLeadIds;
    const pmsToSave = selectedPmIds;
    resetModalState();
    toast.success(
      wasEditing
        ? "Project updated successfully"
        : "Project created successfully",
    );

    try {
      if (filesToUpload.length > 0) {
        await uploadGuidelinesForProject(
          savedProject.id,
          selectedMainProjectId,
          filesToUpload,
        );
      }
    } catch (error) {
      toast.error(
        "Project saved, but guideline upload failed. You can re-upload from the Guidelines page.",
      );
    }

    try {
      await syncTeamLeadAllocations(savedProject, teamLeadsToSave);
    } catch (error) {
      // The project itself is saved, so don't imply otherwise. Repeat the server's reason
      // rather than a generic line — "failed, try the Allocations page" gives the reader
      // nothing to act on, and this step fails for knowable reasons (capacity conflicts,
      // scoping) that the message should name.
      const detail = error.response?.data?.detail;
      const reason =
        typeof detail === "string"
          ? detail
          : detail?.message ||
          (Array.isArray(detail) ? detail[0]?.msg : null) ||
          "the allocation was rejected";
      toast.error(
        `Project saved, but the team lead assignment failed: ${reason}`,
      );
    }

    // Zero-Network Cache Surgery: surgically patch the project in RAM across all paginated queries
    if (wasEditing && savedProject?.id) {
      queryClient.setQueriesData(
        { queryKey: ["sub-projects-paginated"] },
        (oldData) => {
          if (!oldData || !Array.isArray(oldData.items)) return oldData;
          return {
            ...oldData,
            items: oldData.items.map((item) =>
              item.id === savedProject.id ? { ...item, ...savedProject } : item
            ),
          };
        }
      );

      queryClient.setQueryData(["sub-projects-dropdown"], (oldList) => {
        if (!Array.isArray(oldList)) return oldList;
        return oldList.map((p) => (p.id === savedProject.id ? { ...p, ...savedProject } : p));
      });

      queryClient.setQueryData(["sub-projects", savedProject.id], savedProject);
    }

    // Zero-Network Cache Surgery: surgically update allocations in RAM (0ms visual latency)
    if (savedProject?.id) {
      const targetProjectId = savedProject.id;
      const targetPmIds = new Set((pmsToSave || []).map(Number));
      const targetLeadIds = new Set((teamLeadsToSave || []).map(Number));

      queryClient.setQueryData(["allocations"], (oldList) => {
        if (!Array.isArray(oldList)) return oldList;

        const updated = oldList
          .map((alloc) => {
            if (alloc.sub_project_id !== targetProjectId) return alloc;
            const empId = Number(alloc.employee_id);
            const emp = employeeIndex.get(String(empId));
            const isTl = isTeamLeadAllocation(alloc, emp);
            const roleTags = Array.isArray(alloc.role_tags) ? alloc.role_tags : [];
            const hasPmTag = roleTags.some((t) =>
              ["PM", "Project Manager", "Program Manager"].includes(t),
            );
            const empDesig = (emp?.designation || "").toLowerCase();
            const isMgrDesig =
              empDesig.includes("program manager") ||
              empDesig.includes("project manager") ||
              empDesig.includes("pm") ||
              empDesig.includes("admin") ||
              empDesig.includes("manager") ||
              empDesig.includes("hr");

            // Removed Team Lead
            if (isTl && !targetLeadIds.has(empId)) {
              const remainingTags = roleTags.filter(
                (t) => !isTeamLeadDesignation(t),
              );
              if (remainingTags.length === 0 && !targetPmIds.has(empId)) {
                return null;
              }
              return { ...alloc, role_tags: remainingTags };
            }

            // Removed PM
            if (!targetPmIds.has(empId) && (hasPmTag || isMgrDesig)) {
              const remainingTags = roleTags.filter(
                (t) =>
                  !["PM", "Project Manager", "Program Manager"].includes(t),
              );
              if (remainingTags.length === 0 && !targetLeadIds.has(empId)) {
                return null;
              }
              return { ...alloc, role_tags: remainingTags };
            }

            return alloc;
          })
          .filter(Boolean);

        // Add newly assigned leads if not present
        targetLeadIds.forEach((leadId) => {
          const existing = updated.find(
            (a) =>
              a.sub_project_id === targetProjectId &&
              Number(a.employee_id) === leadId,
          );
          if (existing) {
            const existingTags = Array.isArray(existing.role_tags)
              ? existing.role_tags
              : [];
            if (!existingTags.includes(TEAM_LEAD_TAG)) {
              existing.role_tags = [...existingTags, TEAM_LEAD_TAG];
            }
          } else {
            updated.push({
              id: `alloc-tl-${targetProjectId}-${leadId}`,
              employee_id: leadId,
              sub_project_id: targetProjectId,
              total_daily_hours: 8,
              role_tags: [TEAM_LEAD_TAG],
              is_active: true,
            });
          }
        });

        // Add newly assigned PMs if not present
        targetPmIds.forEach((pmId) => {
          const existing = updated.find(
            (a) =>
              a.sub_project_id === targetProjectId &&
              Number(a.employee_id) === pmId,
          );
          if (!existing) {
            updated.push({
              id: `alloc-pm-${targetProjectId}-${pmId}`,
              employee_id: pmId,
              sub_project_id: targetProjectId,
              total_daily_hours: 8,
              role_tags: ["PM"],
              is_active: true,
            });
          }
        });

        return updated;
      });
    }

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["sub-projects-paginated"],
        refetchType: wasEditing ? "none" : "active",
      }),
      queryClient.invalidateQueries({ queryKey: ["sub-projects"] }),
      queryClient.invalidateQueries({ queryKey: ["sub-projects-dropdown"] }),
      queryClient.invalidateQueries({ queryKey: ["guidelines"] }),
      queryClient.invalidateQueries({ queryKey: ["allocations"] }),
      queryClient.invalidateQueries({ queryKey: ["allocations-page"] }),
      queryClient.invalidateQueries({
        queryKey: ["allocations", "project-detail", savedProject?.id],
      }),
    ]);
  };

  const getMatchingEmployees = (project) => {
    if (
      !project.required_expertise ||
      project.required_expertise.length === 0
    ) {
      return employees.filter((emp) => emp.status === "active");
    }

    return employees.filter(
      (emp) =>
        emp.status === "active" &&
        project.required_expertise.some((skill) =>
          emp.skills?.some((empSkill) =>
            empSkill.toLowerCase().includes(skill.toLowerCase()),
          ),
        ),
    );
  };

  // A project's PMs are recorded on the project itself (`assigned_employee_ids`,
  // which only ever holds PM/admin ids) and fall back to the parent project's
  // managers. The card, the PM filter, the filter's option list, and the manpower
  // count must all resolve them through here — when the filter read only the
  // parent while the card read the project, filtering by a PM shown on screen
  // matched nothing.
  // Shared with the Allocations page. Passing the roster lets it drop anyone since
  // converted to Team Lead out of the manager list — they show under Team Lead instead,
  // without waiting for someone to re-save the project.
  const resolvePmIds = (project) =>
    resolveProjectPmIds(project, visibleMainProjects, employeeIndex);

  // Manpower counts PEOPLE, not allocation rows, and a PM running the project
  // occupies a slot just like an annotator. Union by employee id so someone with
  // two allocations — or a PM who is also allocated — is only counted once.
  //
  // Anyone off the roster is skipped: allocations outlive an archived employee,
  // and counting those ghosts reported projects as fully staffed by people who
  // had left.
  // Allocation-tagged leads plus anyone still holding the manager seat whose designation
  // says Team Lead. The second half matters: those people have no allocation row, so a
  // lead set built from allocations alone named them on the card while leaving them out of
  // the manpower count — the same project reporting two different teams.
  const getTeamLeadIds = (project) => [
    ...new Set([
      ...(teamLeadIdsByProject.get(project?.id) || new Set()),
      ...demotedToLeadIds(project, visibleMainProjects, employeeIndex),
    ]),
  ];

  const getManpowerEmployeeIds = (project) =>
    manpowerEmployeeIds({
      allocations: allocations.filter((a) => a.sub_project_id === project.id),
      pmIds: resolvePmIds(project),
      leadIds: getTeamLeadIds(project),
      employeeIndex,
    });

  const getAllocatedManpower = (project) =>
    getManpowerEmployeeIds(project).size;

  // Computed live rather than read from `required_manpower`.
  //
  // The stored total is only refreshed when someone saves the project, so it goes stale
  // the moment a designation changes — a project run by 5 managers and 3 leads still read
  // 0 required because it had not been re-saved since they were typed in. The role counts
  // come from the columns; the manager and lead counts come from the same resolvers the
  // card and the modal use, so all three agree without anyone re-saving anything.
  const getRequiredManpower = (project) =>
    totalRequiredManpower({
      project,
      pmIds: resolvePmIds(project),
      leadIds: getTeamLeadIds(project),
      employeeIndex,
    });

  // How many of those required slots are the managers' — shown next to the ratio.
  // Every on-roster manager, not only the ones lacking an allocation: the requirement now
  // counts them unconditionally, so an "extra" count would disagree with the ratio it is
  // meant to explain.
  // How many of the required slots each rank accounts for, shown beside the ratio on the
  // card. Counted live from the same resolvers, never from the stored team_manager_count /
  // team_lead_count columns: those are only refreshed when a project is saved, so on
  // anything untouched since they read 0 and the breakdown silently disappeared — one card
  // showed "2 (1 PM · 1 Lead)" while its neighbour showed a bare "2" with a manager and a
  // lead named directly above it.
  const getPmSlots = (project) =>
    resolvePmIds(project).filter((id) => employeeIndex.has(String(id))).length;

  // Team leads aren't recorded on the project (`assigned_employee_ids` only ever holds
  // PM/admin ids, and a lead placed there would outrank the project's other leads) —
  // they're whoever is allocated to it and qualifies as a lead: a "Team Lead" tag on the
  // allocation, which is what the picker writes, or the "Team Lead" designation as a
  // fallback for allocations made outside it.
  // Deduped by employee id so two allocations don't name the same person twice.
  const getTeamLeadNames = (project) => {
    const seen = new Set();
    const names = [];
    allocations
      .filter((a) => a.sub_project_id === project.id)
      .forEach((a) => {
        const key = String(a.employee_id);
        if (a.employee_id == null || seen.has(key)) return;
        seen.add(key);
        const emp = employeeIndex.get(key);
        if (!emp || !isTeamLeadAllocation(a, emp)) return;
        // The stored name — the card shortens it for the label and keeps this
        // for the hover. Formatting here would lose the middle name entirely.
        if (emp.name) names.push(emp.name);
      });
    // Plus anyone still holding the manager seat whose designation now says Team Lead, so
    // a conversion shows up without the project having to be re-saved first.
    demotedToLeadIds(project, visibleMainProjects, employeeIndex).forEach((id) => {
      const key = String(id);
      if (seen.has(key)) return;
      seen.add(key);
      const name = employeeIndex.get(key)?.name;
      if (name) names.push(name);
    });
    return names;
  };

  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [archiveModalProject, setArchiveModalProject] = useState(null);
  const [archiveStatusSelection, setArchiveStatusSelection] = useState("completed");
  const [restoreConfirmProject, setRestoreConfirmProject] = useState(null);
  const [highlightId, setHighlightId] = useState(null);

  const PAGE_SIZE = 12;

  // Options for the PM filter: every program manager on the roster, not only those
  // who currently hold a project — an admin should be able to pick any manager, and
  // "no projects" is a legitimate answer. Unioned with the PMs actually resolved off
  // the visible projects so anyone acting as a PM without the designation (a few
  // Admins do) is still selectable.
  const projectManagers = useMemo(() => {
    const nameById = new Map(employees.map((e) => [e.id, e.name]));
    const map = new Map();
    const add = (id) => {
      if (id == null || map.has(id)) return;
      map.set(id, formatDisplayName(nameById.get(id)) || `Manager #${id}`);
    };
    employees
      .filter((e) => {
        const d = (e.designation || "").toLowerCase();
        return (
          d.includes("program manager") ||
          d.includes("project manager") ||
          d.includes("pm") ||
          d.includes("admin") ||
          d.includes("manager") ||
          d.includes("hr")
        );
      })
      .forEach((e) => add(e.id));
    visibleProjects.forEach((project) => resolvePmIds(project).forEach(add));
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleProjects, visibleMainProjects, employees]);

  // Employee ids leading each visible project, so the filter and the card agree. Built from
  // allocations rather than a designation sweep: leadership is recorded per project, so a
  // roster-wide sweep would list leads who do not lead this one.
  const teamLeadIdsByProject = useMemo(() => {
    const byProject = new Map();
    allocations.forEach((allocation) => {
      const employee = employeeIndex.get(String(allocation.employee_id));
      if (!employee || !isTeamLeadAllocation(allocation, employee)) return;
      const ids = byProject.get(allocation.sub_project_id) || new Set();
      ids.add(Number(allocation.employee_id));
      byProject.set(allocation.sub_project_id, ids);
    });
    return byProject;
  }, [allocations, employeeIndex]);

  // Only leads actually on a visible project — an org-wide roster would offer options that
  // filter to nothing.
  const teamLeads = useMemo(() => {
    const map = new Map();
    visibleProjects.forEach((project) => {
      (teamLeadIdsByProject.get(project.id) || new Set()).forEach((id) => {
        if (map.has(id)) return;
        const employee = employeeIndex.get(String(id));
        map.set(id, formatDisplayName(employee?.name) || `Lead #${id}`);
      });
    });
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [visibleProjects, teamLeadIdsByProject, employeeIndex]);

  // Close the Filters popover on outside click
  useEffect(() => {
    const handler = (e) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target))
        setFiltersOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredProjects = projects;

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    subProjectSearch,
    filterMainProjectId,
    statusParam,
    recommendationParam,
    selectedOrganization,
    selectedPm,
    selectedStatus,
    selectedPriority,
    projectView,
    autonexOnly,
  ]);

  // Deep-link focus: jump to the page containing the target sub-project, scroll
  // it into view and highlight it briefly (used by the Allocations page links).
  useEffect(() => {
    if (!focusId || isLoading) return;
    const id = parseInt(focusId, 10);
    const idx = filteredProjects.findIndex((p) => p.id === id);
    if (idx === -1) return;
    setCurrentPage(Math.floor(idx / PAGE_SIZE) + 1);
    setHighlightId(id);
    // Wait for the page switch to render, then scroll the card into view. These
    // timers are intentionally NOT torn down in a cleanup: dropping the ?focus
    // param below re-runs this effect, and a cleanup would cancel the pending
    // scroll before it fires.
    setTimeout(() => {
      document
        .getElementById(`sub-project-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
    setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 2600);
    // Drop the param so re-clicking the same project later re-triggers focus.
    const params = new URLSearchParams(searchParams);
    params.delete("focus");
    setSearchParams(params, { replace: true });
  }, [focusId, isLoading, filteredProjects]);


  // Open the full create/edit modal, prefilled from a project. `copy` clones it.
  const openProjectModal = async (project, { copy = false } = {}) => {
    setEditingCardId(null);
    setCardDraft(null);
    if (copy) {
      setEditingProject(null);
      setCopyingProject({ ...project, name: `${project.name} (Copy)` });
    } else {
      setCopyingProject(null);
      setEditingProject(project);
    }
    setSelectedSkills(project.required_expertise || []);
    setSelectedVendors(project.workforce_vendors || []);
    setProjectTypes(project.project_types || {});
    setActiveTypeTab(PROJECT_TYPE_CATEGORIES[0].key);
    setTypeTabTouched(false);
    setGuidelineFiles([]);
    setFormMainProjectId(String(project.main_project_id || ""));
    setFormOrg(orgOfMainProject(project.main_project_id));
    setFormPriority(project.priority || "auto");
    setFormAutonexAnnotators(project.autonex_annotators ?? 0);
    setFormAutonexReviewers(project.autonex_reviewers ?? 0);
    setFormProjectStatus(project.project_status || "active");
    setFormSentiment(project.sentiment || "");
    setModalInfoTab("status");
    setModalBuildTab("types");

    // 1. Instant prefill from current data for 0ms visual open
    const demoted = demotedToLeadIds(project, null, employeeIndex);
    const demotedSet = new Set(demoted.map(Number));
    setSelectedPmIds(
      (project.assigned_employee_ids || []).filter(
        (id) => !demotedSet.has(Number(id)),
      ),
    );
    setSelectedTeamLeadIds([
      ...new Set([
        ...allocations
          .filter(
            (a) =>
              a.sub_project_id === project.id &&
              isTeamLeadAllocation(a, employeeIndex.get(String(a.employee_id))),
          )
          .map((a) => a.employee_id),
        ...demoted,
      ]),
    ]);
    setIsModalOpen(true);

    // 2. Live database hydration: guarantee 100% two-way sync with Allocations page
    if (project?.id) {
      try {
        const [freshAllocs, freshProj] = await Promise.all([
          allocationApi.getByProject(project.id).catch(() => null),
          subProjectApi.getOne(project.id).catch(() => null),
        ]);

        const liveProj = freshProj || project;
        const activeAllocs = (freshAllocs || []).filter((a) => a.is_active !== false);

        const liveDemoted = demotedToLeadIds(liveProj, null, employeeIndex);
        const liveDemotedSet = new Set(liveDemoted.map(Number));

        // Detect any active PM allocations made on the allocations page
        const allocatedPmIds = activeAllocs
          .filter((a) => {
            const emp = employeeIndex.get(String(a.employee_id));
            const desig = (emp?.designation || "").toLowerCase().trim();
            const tags = Array.isArray(a.role_tags) ? a.role_tags : [];
            return (
              tags.includes("Project Manager") ||
              tags.includes("Program Manager") ||
              tags.includes("PM") ||
              [
                "project manager",
                "program manager",
                "pm",
                "hr",
                "admin",
                "administrator",
              ].includes(desig) ||
              desig.includes("manager") ||
              desig.includes("admin") ||
              desig.includes("hr")
            );
          })
          .map((a) => a.employee_id);

        const resolvedPmIds = [
          ...new Set([
            ...(liveProj.assigned_employee_ids || []),
            ...allocatedPmIds,
          ]),
        ].filter((id) => !liveDemotedSet.has(Number(id)));

        // Detect all active Team Lead allocations on this project
        const liveLeadIds = [
          ...new Set([
            ...activeAllocs
              .filter((a) => isTeamLeadAllocation(a, employeeIndex.get(String(a.employee_id))))
              .map((a) => a.employee_id),
            ...liveDemoted,
          ]),
        ];

        setSelectedPmIds(resolvedPmIds);
        setSelectedTeamLeadIds(liveLeadIds);
        setEditingProject(liveProj);
      } catch (err) {
        console.warn("Live hydration of project edit modal:", err);
      }
    }
  };

  // Inline card editing (double-click to enter, Save/Cancel to exit)
  const startCardEdit = (project) => {
    setDocsOpenId(null);
    setEditingCardId(project.id);
    setCardDraft({
      name: project.name || "",
      project_status: project.project_status || "active",
      autonex_annotators: String(project.autonex_annotators ?? 0),
      autonex_reviewers: String(project.autonex_reviewers ?? 0),
      annotation_minutes: project.estimated_time_per_task
        ? String(Math.round(project.estimated_time_per_task * 60))
        : "",
      review_minutes: project.review_time_per_task
        ? String(Math.round(project.review_time_per_task * 60))
        : "",
      sentiment: project.sentiment || "",
      vendorsText: (project.workforce_vendors || []).join(", "),
    });
  };
  const cancelCardEdit = () => {
    setEditingCardId(null);
    setCardDraft(null);
  };
  const updateDraft = (field, value) =>
    setCardDraft((d) => ({ ...d, [field]: value }));
  const saveCardEdit = (project) => {
    if (!cardDraft || cardUpdateMutation.isPending) return;
    const ann = parseInt(cardDraft.autonex_annotators) || 0;
    const rev = parseInt(cardDraft.autonex_reviewers) || 0;
    cardUpdateMutation.mutate({
      id: project.id,
      data: {
        name: (cardDraft.name || "").trim() || project.name,
        project_status: cardDraft.project_status,
        autonex_annotators: ann,
        autonex_reviewers: rev,
        // The inline card only edits annotators and reviewers, so the rest of the
        // composition has to be carried over. Sending `ann + rev` alone silently zeroed
        // the others/leads/managers/developers a project asked for, dropping its required
        // headcount every time somebody double-clicked a card.
        required_manpower:
          ann +
          rev +
          (project.others_count || 0) +
          (project.team_lead_count || 0) +
          (project.team_manager_count || 0) +
          (project.developers_count || 0),
        estimated_time_per_task:
          cardDraft.annotation_minutes !== ""
            ? parseFloat(cardDraft.annotation_minutes) / 60
            : (project.estimated_time_per_task ?? null),
        // Same hours-on-the-wire, minutes-in-the-UI conversion as annotation time.
        review_time_per_task:
          cardDraft.review_minutes !== ""
            ? parseFloat(cardDraft.review_minutes) / 60
            : (project.review_time_per_task ?? null),
        sentiment: cardDraft.sentiment || null,
        workforce_vendors: cardDraft.vendorsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      },
    });
  };

  return (
    <div className="space-y-4">


      {/* Active / Archived / Development tabs. Archived = Completed /
 On Hold / Cancelled; Development = projects with the Developer type. */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center">
          {[
            {
              key: "active",
              label: "Active Projects",
              count: tabCounts.active,
            },
            { key: "archived", label: "Archived", count: tabCounts.archived },
            {
              key: "development",
              label: "Development",
              count: tabCounts.development,
            },
          ].map((t) => {
            const isActive = projectView === t.key;
            return (
              <button
                key={t.key}
                onClick={() => {
                  setProjectView(t.key);
                  setSelectedStatus("all");
                }}
                type="button"
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${isActive
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
              >
                {t.label}
                {t.key !== "active" && (
                  <span
                    className={`inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[11px] font-semibold ${isActive
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-slate-100 text-slate-500"
                      }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Projects"
          value={projectMetrics.totalProjects}
          icon={FileText}
          tone="indigo"
          hint="all projects"
        />
        {projectView === "archived" ? (
          <>
            <StatCard
              title="On Hold"
              value={projectMetrics.onHoldProjects}
              icon={PauseCircle}
              tone="amber"
              hint="paused"
            />
            <StatCard
              title="Completed"
              value={projectMetrics.completedProjects}
              icon={CheckCircle2}
              tone="emerald"
              hint="delivered"
            />
            <StatCard
              title="Cancelled"
              value={projectMetrics.cancelledProjects}
              icon={XCircle}
              tone="rose"
              hint="cancelled"
            />
          </>
        ) : (
          <>
            <StatCard
              title="Active Projects"
              value={projectMetrics.activeProjects}
              icon={UserCheck}
              tone="emerald"
              hint={
                tabCounts.development > 0
                  ? `(${tabCounts.development} development project${tabCounts.development !== 1 ? "s" : ""})`
                  : "currently active"
              }
            />
            <StatCard
              title="Overburdened"
              value={projectMetrics.overburdenedProjects}
              icon={BarChart3}
              tone="rose"
              hint="need staffing"
            />
            <StatCard
              title="Balanced"
              value={projectMetrics.balancedProjects}
              icon={Settings}
              tone="sky"
              hint="well staffed"
            />
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchBar
          responsive
          value={subProjectSearch}
          onChange={setSubProjectSearch}
          placeholder="Search projects..."
        />
        {isScoped && (
          <Link
            to={`${prefix}/projects`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Organizations
          </Link>
        )}
        <button
          type="button"
          onClick={() => {
            setEditingProject(null);
            setSelectedSkills([]);
            setSelectedVendors([]);
            setProjectTypes({});
            setActiveTypeTab(PROJECT_TYPE_CATEGORIES[0].key);
            setTypeTabTouched(false);
            setGuidelineFiles([]);
            setFormMainProjectId(filterMainProjectId || "");
            setFormOrg(
              filterMainProjectId ? orgOfMainProject(filterMainProjectId) : "",
            );
            setFormPriority("auto");
            setFormAutonexAnnotators(0);
            setFormAutonexReviewers(0);
            setFormProjectStatus("active");
            setFormSentiment("");
            setModalInfoTab("status");
            setModalBuildTab("types");
            setSelectedPmIds(isPm && pmEmployeeId ? [pmEmployeeId] : []);
            // A lead creating a project leads it — the server allocates them either way
            // (api/projects.py), so preselect it rather than letting the field imply
            // otherwise.
            setSelectedTeamLeadIds(
              isTeamLeadRole && pmEmployeeId ? [pmEmployeeId] : [],
            );
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Project
        </button>

        {/* Right side: active chips + Filters dropdown */}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {Array.isArray(selectedPriority) && selectedPriority.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700">
              Priority: {selectedPriority.join(", ")}
              <button
                type="button"
                onClick={() => setSelectedPriority([])}
                className="hover:text-indigo-900 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {Array.isArray(selectedStatus) && selectedStatus.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700">
              Status:{" "}
              {selectedStatus
                .map((s) => (s === "active" ? "In Progress" : s === "poc" ? "POC" : s))
                .join(", ")}
              <button
                type="button"
                onClick={() => setSelectedStatus([])}
                className="hover:text-indigo-900 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {Array.isArray(selectedOrganization) && selectedOrganization.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700">
              Org: {selectedOrganization.join(", ")}
              <button
                type="button"
                onClick={() => setSelectedOrganization([])}
                className="hover:text-indigo-900 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {Array.isArray(selectedPm) && selectedPm.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700">
              PM:{" "}
              {selectedPm
                .map(
                  (id) =>
                    projectManagers.find((pm) => String(pm.id) === String(id))?.name || id
                )
                .join(", ")}
              <button
                type="button"
                onClick={() => setSelectedPm([])}
                className="hover:text-indigo-900 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {Array.isArray(selectedTeamLead) && selectedTeamLead.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700">
              Lead:{" "}
              {selectedTeamLead
                .map(
                  (id) =>
                    teamLeads.find((l) => String(l.id) === String(id))?.name || id
                )
                .join(", ")}
              <button
                type="button"
                onClick={() => setSelectedTeamLead([])}
                className="hover:text-emerald-900 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={() => setAutonexOnly((v) => !v)}
            title="Show only projects staffed with an Autonex employee"
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-colors ${autonexOnly
              ? "border-indigo-600 bg-indigo-600 text-white"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
          >
            <Users className={`w-4 h-4 ${autonexOnly ? "text-white" : "text-slate-400"}`} />
            Autonex
          </button>

          <div className="relative" ref={filtersRef}>
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              Filters
              {(selectedOrganization.length > 0 ||
                selectedPm.length > 0 ||
                selectedTeamLead.length > 0 ||
                selectedStatus.length > 0 ||
                selectedPriority.length > 0) && (
                  <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-indigo-100 px-1.5 text-[10px] font-semibold text-indigo-700">
                    {
                      (selectedOrganization.length > 0 ? 1 : 0) +
                      (selectedPm.length > 0 ? 1 : 0) +
                      (selectedTeamLead.length > 0 ? 1 : 0) +
                      (selectedStatus.length > 0 ? 1 : 0) +
                      (selectedPriority.length > 0 ? 1 : 0)
                    }
                  </span>
                )}
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
              />
            </button>

            {filtersOpen && (
              <div className={`absolute ${filterAlignClass} top-full z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xl space-y-3.5`}>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Priority
                  </label>
                  <MultiSelect
                    value={Array.isArray(selectedPriority) ? selectedPriority : []}
                    onChange={setSelectedPriority}
                    placeholder="All Priorities"
                    options={[
                      { value: "P0", label: "P0" },
                      { value: "P1", label: "P1" },
                      { value: "P2", label: "P2" },
                      { value: "P3", label: "P3" },
                    ]}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Status
                  </label>
                  <MultiSelect
                    value={Array.isArray(selectedStatus) ? selectedStatus : []}
                    onChange={setSelectedStatus}
                    placeholder="All Statuses"
                    options={
                      !isAdmin
                        ? [
                          { value: "active", label: "In Progress" },
                          { value: "poc", label: "POC" },
                          { value: "completed", label: "Completed" },
                          { value: "on-hold", label: "On Hold" },
                          { value: "cancelled", label: "Cancelled" },
                        ]
                        : projectView === "archived"
                          ? [
                            { value: "completed", label: "Completed" },
                            { value: "on-hold", label: "On Hold" },
                            { value: "cancelled", label: "Cancelled" },
                          ]
                          : [
                            { value: "active", label: "In Progress" },
                            { value: "poc", label: "POC" },
                          ]
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Organization
                  </label>
                  <MultiSelect
                    value={Array.isArray(selectedOrganization) ? selectedOrganization : []}
                    onChange={setSelectedOrganization}
                    placeholder="All Organizations"
                    searchable
                    options={organizations.map((org) => ({
                      value: org,
                      label: org,
                    }))}
                    className="w-full"
                  />
                </div>
                {isAdmin && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      Project Manager
                    </label>
                    <MultiSelect
                      value={Array.isArray(selectedPm) ? selectedPm : []}
                      onChange={setSelectedPm}
                      placeholder="All Managers"
                      searchable
                      options={projectManagers.map((pm) => ({
                        value: String(pm.id),
                        label: pm.name,
                      }))}
                      className="w-full"
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Team Lead
                  </label>
                  <MultiSelect
                    value={Array.isArray(selectedTeamLead) ? selectedTeamLead : []}
                    onChange={setSelectedTeamLead}
                    placeholder="All Team Leads"
                    searchable
                    options={teamLeads.map((lead) => ({
                      value: String(lead.id),
                      label: lead.name,
                    }))}
                    className="w-full"
                  />
                </div>
                {(selectedOrganization.length > 0 ||
                  selectedPm.length > 0 ||
                  selectedTeamLead.length > 0 ||
                  selectedStatus.length > 0 ||
                  selectedPriority.length > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrganization([]);
                        setSelectedPm([]);
                        setSelectedTeamLead([]);
                        setSelectedStatus([]);
                        setSelectedPriority([]);
                      }}
                      className="w-full rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
                    >
                      Clear all filters
                    </button>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Filters Bar */}
      {(statusParam || recommendationParam) && (
        <div className="flex items-center gap-2 flex-wrap bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2.5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Active Filters:
          </span>
          {statusParam && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
              Status: {statusParam}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.delete("status");
                  setSearchParams(params);
                }}
                className="rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </Button>
            </span>
          )}
          {recommendationParam && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
              Recommendation: {recommendationParam}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.delete("recommendation");
                  setSearchParams(params);
                }}
                className="rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </Button>
            </span>
          )}
          <Button
            variant="link"
            onClick={() => {
              const params = new URLSearchParams(searchParams);
              params.delete("status");
              params.delete("recommendation");
              setSearchParams(params);
            }}
            className="ml-auto text-xs text-slate-500 hover:text-slate-800"
          >
            Clear all
          </Button>
        </div>
      )}

      {(isLoading || isFetching) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-xs min-h-[340px]"
            >
              {/* Header: Title Accent + Name/Org + Status Pills */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-2.5">
                  {/* Left accent bar */}
                  <span className="mt-0.5 h-9 w-1 shrink-0 rounded-full animate-shimmer" />
                  <div className="min-h-[3.9rem] min-w-0 flex-1 space-y-2">
                    {/* Project name placeholder */}
                    <div className="h-3.5 w-3/4 rounded animate-shimmer" />
                    {/* Parent org placeholder */}
                    <div className="h-2.5 w-1/3 rounded animate-shimmer" />
                  </div>
                </div>

                {/* Right side status / priority pills */}
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <div className="flex items-center gap-1">
                    <div className="h-4.5 w-7 rounded-full animate-shimmer" />
                    <div className="h-4.5 w-14 rounded-full animate-shimmer" />
                    <div className="h-4.5 w-9 rounded-full animate-shimmer" />
                  </div>
                  <div className="h-2.5 w-16 rounded animate-shimmer" />
                </div>
              </div>

              <div className="my-2 border-t border-slate-100" />

              {/* PM / Team lead / Type / Vendor (2x2 grid) */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                <div className="space-y-1">
                  <div className="h-2 w-16 rounded animate-shimmer" />
                  <div className="h-3 w-24 rounded animate-shimmer" />
                </div>
                <div className="space-y-1">
                  <div className="h-2 w-14 rounded animate-shimmer" />
                  <div className="h-3 w-8 rounded animate-shimmer" />
                </div>
                <div className="space-y-1">
                  <div className="h-2 w-10 rounded animate-shimmer" />
                  <div className="h-3 w-28 rounded animate-shimmer" />
                </div>
                <div className="space-y-1">
                  <div className="h-2 w-12 rounded animate-shimmer" />
                  <div className="h-3 w-20 rounded animate-shimmer" />
                </div>
              </div>

              {/* Delivery figures box */}
              <div className="mt-3 mb-3 rounded-md bg-slate-50/60 p-3.5 ring-1 ring-slate-200/60">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  <div className="space-y-1">
                    <div className="h-2 w-20 rounded animate-shimmer" />
                    <div className="h-3 w-14 rounded animate-shimmer" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 w-20 rounded animate-shimmer" />
                    <div className="h-3 w-14 rounded animate-shimmer" />
                  </div>
                </div>
              </div>

              {/* Footer bar */}
              <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-2.5">
                <div className="flex gap-1.5">
                  <div className="h-6.5 w-16 rounded-md animate-shimmer" />
                  <div className="h-6.5 w-14 rounded-md animate-shimmer" />
                </div>
                <div className="flex gap-1">
                  <div className="h-6 w-6 rounded-md animate-shimmer" />
                  <div className="h-6 w-6 rounded-md animate-shimmer" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : totalItems === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-slate-800">
            {filterMainProjectId
              ? "No projects under this organization"
              : "No projects yet"}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Create your first project to get started
          </p>
        </div>
      ) : (
        <>
          {/* Tighter gutter than the usual gap-4: every pixel taken back here
              goes to the cards, and the project name is the field that runs out
              of room first. */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {filteredProjects
              .map((project) => {
                const parentProject = visibleMainProjects.find(
                  (p) => p.id === project.main_project_id,
                );

                const pmIds = resolvePmIds(project);
                const pmNames = pmIds.map(id => employeeIndex.get(String(id))?.name).filter(Boolean);
                const tempCount = project.temp_count || 0;
                const allocatedManpower = getAllocatedManpower(project) + tempCount;

                return (
                  <ProjectCard
                    tempSlots={tempCount}
                    key={project.id}
                    id={`sub-project-${project.id}`}
                    highlighted={highlightId === project.id}
                    project={project}
                    parentProject={parentProject}
                    pmNames={pmNames}
                    teamLeadNames={getTeamLeadNames(project)}
                    pmIds={pmIds}
                    leadIds={getTeamLeadIds(project)}
                    onLeaveEmployeeIds={leaveEmployeeIds}
                    locationByEmployeeId={locationByEmployeeId}
                    allocatedManpower={allocatedManpower}
                    requiredManpower={getRequiredManpower(project)}
                    pmSlots={getPmSlots(project)}
                    leadSlots={getTeamLeadIds(project).filter(id => employeeIndex.has(String(id))).length}
                    allocations={allocations}
                    employees={employees}
                    formerEmployees={formerEmployees}
                    prefix={prefix}
                    navigate={navigate}
                    docs={guidelinesData.filter(
                      (g) => g.sub_project_id === project.id,
                    )}
                    isEditing={editingCardId === project.id}
                    draft={cardDraft}
                    onStartEdit={() => startCardEdit(project)}
                    onCancelEdit={cancelCardEdit}
                    onSaveEdit={() => saveCardEdit(project)}
                    onDraftChange={updateDraft}
                    saving={cardUpdateMutation.isPending}
                    docsOpen={docsOpenId === project.id}
                    onToggleDocs={() =>
                      setDocsOpenId(
                        docsOpenId === project.id ? null : project.id,
                      )
                    }
                    onCloseDocs={() => setDocsOpenId(null)}
                    onAdvanced={() => openProjectModal(project)}
                    isArchivedView={projectView === "archived"}
                    onArchive={() => {
                      setArchiveStatusSelection("completed");
                      setArchiveModalProject(project);
                    }}
                    onRestore={() => setRestoreConfirmProject(project)}
                  />
                );
              })}
          </div>

          {/* Pagination */}
          {totalItems > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 mt-4">
              <p className="text-sm text-slate-500">
                Showing{" "}
                {totalItems === 0
                  ? 0
                  : (currentPage - 1) * PAGE_SIZE + 1}
                –{Math.min(currentPage * PAGE_SIZE, totalItems)} of{" "}
                {totalItems} items
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
                    length: Math.ceil(totalItems / PAGE_SIZE),
                  },
                  (_, i) => i + 1,
                )
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === Math.ceil(totalItems / PAGE_SIZE) ||
                      Math.abs(p - currentPage) <= 1,
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
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${currentPage === p
                          ? "bg-indigo-600 border-indigo-600 text-white font-medium"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                      >
                        {p}
                      </button>
                    ),
                  )}

                <button
                  onClick={() =>
                    setCurrentPage(
                      Math.min(
                        Math.ceil(totalItems / PAGE_SIZE),
                        currentPage + 1,
                      ),
                    )
                  }
                  disabled={
                    currentPage ===
                    Math.ceil(totalItems / PAGE_SIZE)
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

      <Modal.Compact
        isOpen={isModalOpen}
        onClose={resetModalState}
        size="4xl"
        maxHeight="92vh"
      >
        <Modal.Compact.Header onClose={resetModalState}>
          <h2 className="text-base font-medium text-slate-900">
            {editingProject
              ? "Edit project"
              : copyingProject
                ? "Copy project"
                : "New project"}
          </h2>
          <p className="mt-0.5 truncate text-[13px] text-slate-500">
            {editingProject
              ? [editingProject.name, formOrg].filter(Boolean).join(" · ")
              : copyingProject
                ? `Copying ${copyingProject.name}`
                : "Set up the project, its people and its team"}
          </p>
        </Modal.Compact.Header>
        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col min-h-0"
          id="project-form"
        >
          <Modal.Compact.Body className="!px-6 !py-0">
            <div className="divide-y divide-slate-100">
              {/* ── Project ─────────────────────────────── */}
              <FormSection title="Project" hint="Name, client and where the data lives">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={PF.label}>
                      Name <span className={PF.req}>*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      defaultValue={(editingProject || copyingProject)?.name}
                      className={PF.input}
                      placeholder="Gen2 import v1"
                    />
                  </div>

                  <div className={PF.control}>
                    <label className={PF.label}>
                      Organisation <span className={PF.req}>*</span>
                    </label>
                    <input
                      type="hidden"
                      name="main_project_id"
                      value={
                        filterMainProjectId && !editingProject && !copyingProject
                          ? filterMainProjectId
                          : formMainProjectId
                      }
                    />
                    <Dropdown
                      editable={true}
                      options={allOrganizations.map((org) => ({
                        value: org,
                        label: org,
                      }))}
                      value={formOrg}
                      onChange={(val) => {
                        setFormOrg(val);
                        const projs = parentProjects.filter(
                          (p) => clientOf(p) === val,
                        );
                        setFormMainProjectId(
                          projs.length ? String(projs[projs.length - 1].id) : "",
                        );
                      }}
                      placeholder="Choose or type a name"
                      disabled={
                        !!filterMainProjectId && !editingProject && !copyingProject
                      }
                    />
                  </div>

                  <div>
                    <label className={PF.label}>
                      Start date <span className={PF.req}>*</span>
                    </label>
                    <StartDateField
                      defaultValue={(editingProject || copyingProject)?.start_date}
                    />
                  </div>

                  <div>
                    <label className={PF.label}>Encord project ID</label>
                    <input
                      type="text"
                      name="encord_project_hash"
                      defaultValue={
                        (editingProject || copyingProject)?.encord_project_hash || ""
                      }
                      className={`${PF.input} tabular-nums`}
                      placeholder="Paste the project hash"
                    />
                    <p className={PF.hint}>Turns on analytics for this project</p>
                  </div>
                </div>
              </FormSection>

              {/* ── Status ──────────────────────────────── */}
              <FormSection title="Status" hint="Where the project stands and how the client feels">
                {/* Submitted through these hidden inputs */}
                <input type="hidden" name="project_status" value={formProjectStatus} />
                <input type="hidden" name="sentiment" value={formSentiment} />

                <div className="space-y-4">
                  <div>
                    <span className={PF.label}>Stage</span>
                    <Segmented
                      value={formProjectStatus}
                      onChange={setFormProjectStatus}
                      options={[
                        { value: "poc", label: "POC", dot: "bg-sky-500" },
                        { value: "active", label: "In progress", dot: "bg-indigo-500" },
                        { value: "on-hold", label: "On hold", dot: "bg-amber-500" },
                        { value: "completed", label: "Completed", dot: "bg-emerald-500" },
                        { value: "cancelled", label: "Cancelled", dot: "bg-slate-400" },
                      ]}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_176px] gap-4">
                    <div>
                      <span className={PF.label}>Client sentiment</span>
                      <Segmented
                        value={formSentiment}
                        onChange={setFormSentiment}
                        options={[
                          { value: "", label: "Not set", dot: "bg-slate-300" },
                          { value: "GOOD", label: "Good", dot: "bg-emerald-500" },
                          { value: "AVG", label: "Average", dot: "bg-amber-500" },
                          { value: "Poor", label: "Poor", dot: "bg-rose-500" },
                        ]}
                      />
                    </div>

                    <div className={PF.control}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[13px] font-medium text-slate-700">Priority</label>
                          <DynamicTooltip
                            placement="top"
                            alwaysShow={true}
                            maxWidth={290}
                            tooltip={
                              <div className="space-y-2 py-0.5 text-left">
                                <div className="border-b border-slate-100 pb-1.5">
                                  <div className="text-xs font-semibold text-slate-800">Priority calculation</div>
                                  <div className="text-[11px] text-slate-500">
                                    Derived from total team size (annotators + reviewers + leads)
                                  </div>
                                </div>

                                <div className="space-y-1 font-normal">
                                  <div
                                    className={`flex items-center justify-between gap-3 rounded px-1.5 py-0.5 text-[11px] transition-colors ${
                                      prioritySuggestion === "P0" ? "bg-slate-100/90 font-medium text-slate-900" : "text-slate-600"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-rose-600">P0</span>
                                      <span>Critical / High headcount</span>
                                    </div>
                                    <span className="tabular-nums text-slate-500">≥ 5 members</span>
                                  </div>

                                  <div
                                    className={`flex items-center justify-between gap-3 rounded px-1.5 py-0.5 text-[11px] transition-colors ${
                                      prioritySuggestion === "P1" ? "bg-slate-100/90 font-medium text-slate-900" : "text-slate-600"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-indigo-600">P1</span>
                                      <span>Standard delivery</span>
                                    </div>
                                    <span className="tabular-nums text-slate-500">1–4 members</span>
                                  </div>

                                  <div
                                    className={`flex items-center justify-between gap-3 rounded px-1.5 py-0.5 text-[11px] transition-colors ${
                                      prioritySuggestion === "P2" ? "bg-slate-100/90 font-medium text-slate-900" : "text-slate-600"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-amber-600">P2</span>
                                      <span>Leads only</span>
                                    </div>
                                    <span className="text-slate-500">0 annotators/rev</span>
                                  </div>

                                  <div
                                    className={`flex items-center justify-between gap-3 rounded px-1.5 py-0.5 text-[11px] transition-colors ${
                                      prioritySuggestion === "P3" ? "bg-slate-100/90 font-medium text-slate-900" : "text-slate-600"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-slate-500">P3</span>
                                      <span>Unassigned</span>
                                    </div>
                                    <span className="tabular-nums text-slate-500">0 members</span>
                                  </div>
                                </div>

                                <div className="border-t border-slate-100 pt-1.5 text-[10.5px] text-slate-500">
                                  Current: <span className="tabular-nums font-medium text-slate-700">{(formAutonexAnnotators || 0) + (formAutonexReviewers || 0) + selectedTeamLeadIds.length}</span> members ({(formAutonexAnnotators || 0)} ann, {(formAutonexReviewers || 0)} rev, {selectedTeamLeadIds.length} leads) → Suggesting <span className="font-semibold text-indigo-700">{prioritySuggestion}</span>
                                </div>
                              </div>
                            }
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-400/50 transition-colors"
                              aria-label="How priority is calculated"
                            >
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </DynamicTooltip>
                        </div>
                      </div>
                      <Dropdown
                        value={formPriority}
                        onChange={setFormPriority}
                        options={[
                          { value: "auto", label: `Auto (${prioritySuggestion})` },
                          { value: "P0", label: "P0" },
                          { value: "P1", label: "P1" },
                          { value: "P2", label: "P2" },
                          { value: "P3", label: "P3" },
                          { value: "medium", label: "Medium (legacy)" },
                        ]}
                        className="w-full"
                        optionsClassName="w-full"
                      />
                      <p className={PF.hint}>
                        Suggested <span className="font-medium text-indigo-700">{prioritySuggestion}</span> from team size
                      </p>
                    </div>
                  </div>
                </div>
              </FormSection>

              {/* ── People ──────────────────────────────── */}
              {/* Shown to PMs as well as admins: a project takes several managers, so a PM
                  needs this to add a co-manager to their own. They are still auto-assigned
                  on create (api/projects.py) and PmMultiSelect refuses to let them remove
                  themselves, so neither route can leave them without their own project. */}
              <FormSection title="People" hint="Who manages and leads the work">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className={PF.control}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-[13px] font-medium text-slate-700">Program managers</label>
                      {selectedPmIds.length > 0 && (
                        <DynamicTooltip
                          placement="top"
                          alwaysShow={true}
                          tooltip={
                            <div className="space-y-1 py-0.5">
                              {selectedPmIds.map((id, i) => {
                                const emp = employees.find((e) => e.id === id);
                                return (
                                  <div key={id} className="flex items-center gap-2 whitespace-nowrap text-xs text-slate-700">
                                    <span>{formatDisplayName(emp?.name) || "Unknown"}</span>
                                    {i === 0 && <span className="text-slate-400">Primary</span>}
                                  </div>
                                );
                              })}
                            </div>
                          }
                        >
                          <span className="cursor-default text-xs tabular-nums text-slate-500">
                            {selectedPmIds.length} selected
                          </span>
                        </DynamicTooltip>
                      )}
                    </div>
                    <PmMultiSelect
                      employees={pmEmployees}
                      value={selectedPmIds}
                      onChange={setSelectedPmIds}
                      isPm={isPm}
                      pmEmployeeId={pmEmployeeId}
                    />
                  </div>

                  <div className={PF.control}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-[13px] font-medium text-slate-700">Team leads</label>
                      {selectedTeamLeadIds.length > 0 ? (
                        <DynamicTooltip
                          placement="top"
                          alwaysShow={true}
                          tooltip={
                            <div className="space-y-1 py-0.5">
                              {selectedTeamLeadIds.map((id) => {
                                const emp = employees.find((e) => e.id === id);
                                return (
                                  <div key={id} className="flex items-center gap-2 whitespace-nowrap text-xs text-slate-700">
                                    <span>{formatDisplayName(emp?.name) || "Unknown"}</span>
                                    {!isTeamLeadDesignation(emp?.designation) && (
                                      <span className="text-amber-600">Temporary</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          }
                        >
                          <span className="cursor-default text-xs tabular-nums text-slate-500">
                            {selectedTeamLeadIds.length} selected
                          </span>
                        </DynamicTooltip>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-amber-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          No lead yet
                        </span>
                      )}
                    </div>
                    <TeamLeadMultiSelect
                      employees={teamLeadEmployees}
                      value={selectedTeamLeadIds}
                      onChange={setSelectedTeamLeadIds}
                      excludeIds={selectedPmIds}
                      lockedId={isTeamLeadRole ? pmEmployeeId : null}
                    />
                  </div>
                </div>
              </FormSection>

              {/* ── Effort ──────────────────────────────── */}
              <FormSection title="Effort" hint="Time per task and the gearing ratio">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={PF.label}>
                      Annotation <span className={PF.req}>*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="estimated_time_per_task"
                        required
                        min="0.1"
                        step="0.1"
                        defaultValue={
                          (editingProject || copyingProject)?.estimated_time_per_task
                            ? parseFloat(
                              (
                                (editingProject || copyingProject)
                                  .estimated_time_per_task * 60
                              ).toFixed(1),
                            )
                            : ""
                        }
                        onWheel={(e) => e.target.blur()}
                        className={`${PF.input} ${PF.number} pr-20`}
                        placeholder="30"
                      />
                      <span className={PF.suffix}>min / task</span>
                    </div>
                  </div>
                  <div>
                    <label className={PF.label}>Review</label>
                    <div className="relative">
                      <input
                        type="number"
                        name="review_time_per_task"
                        min="0.1"
                        step="0.1"
                        defaultValue={
                          (editingProject || copyingProject)?.review_time_per_task
                            ? parseFloat(
                              (
                                (editingProject || copyingProject)
                                  .review_time_per_task * 60
                              ).toFixed(1),
                            )
                            : ""
                        }
                        onWheel={(e) => e.target.blur()}
                        className={`${PF.input} ${PF.number} pr-20`}
                        placeholder="15"
                      />
                      <span className={PF.suffix}>min / task</span>
                    </div>
                  </div>
                  <div>
                    <label className={PF.label}>Gearing ratio</label>
                    <input
                      type="number"
                      name="gearing_ratio"
                      min="0"
                      step="0.1"
                      defaultValue={
                        (editingProject || copyingProject)?.gearing_ratio ?? ""
                      }
                      onWheel={(e) => e.target.blur()}
                      className={`${PF.input} ${PF.number}`}
                      placeholder="3.1"
                    />
                  </div>
                </div>
              </FormSection>

              {/* ── Project type ────────────────────────── */}
              <FormSection
                title="Project type"
                hint="Pick a subtype in each category that applies"
                aside={
                  <span className="text-xs tabular-nums text-slate-500">
                    {Object.keys(projectTypes).length} of {PROJECT_TYPE_CATEGORIES.length} set
                  </span>
                }
              >
                <div className="overflow-visible rounded-lg border border-slate-200 divide-y divide-slate-100">
                  {PROJECT_TYPE_CATEGORIES.map((cat) => {
                    const chosen = projectTypes[cat.key];
                    return (
                      <div
                        key={cat.key}
                        className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_260px] items-center gap-2 px-3 py-2"
                      >
                        <span className="flex items-center gap-2 text-sm text-slate-700">
                          <span className={`h-1.5 w-1.5 rounded-full ${chosen ? "bg-indigo-500" : "bg-slate-200"}`} />
                          {cat.label || cat.key}
                        </span>
                        <div className={PF.control}>
                          <Dropdown
                            options={[
                              { value: "", label: "Not set" },
                              ...cat.subtypes.map((s) => ({ value: s, label: s })),
                            ]}
                            value={chosen || ""}
                            onChange={(val) =>
                              setProjectTypes((prev) => {
                                const next = { ...prev };
                                if (val) next[cat.key] = val;
                                else delete next[cat.key];
                                return next;
                              })
                            }
                            placeholder="Not set"
                            className="w-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </FormSection>

              {/* ── Team ────────────────────────────────── */}
              <FormSection title="Team" hint="Vendors and headcount by role">
                <div className="space-y-4">
                  <div className={PF.control}>
                    <label className={PF.label}>Workforce vendors</label>
                    <Dropdown
                      editable={true}
                      allowCreate={true}
                      placeholder="Choose or add a vendor"
                      value=""
                      options={vendorsData
                        .filter((v) => !selectedVendors.includes(v.name))
                        .map((v) => ({ value: v.name, label: v.name }))}
                      onChange={(val) => {
                        const name = (val || "").trim();
                        if (!name || selectedVendors.includes(name)) return;
                        setSelectedVendors((prev) => [...prev, name]);
                        if (
                          !vendorsData.some(
                            (v) => v.name.toLowerCase() === name.toLowerCase(),
                          )
                        ) {
                          createVendorMutation.mutate(name);
                        }
                      }}
                    />
                    {selectedVendors.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedVendors.map((name) => (
                          <span
                            key={name}
                            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-slate-200 bg-white pl-2.5 pr-1.5 text-[13px] text-slate-700"
                          >
                            {name}
                            <button
                              type="button"
                              aria-label={`Remove ${name}`}
                              onClick={() =>
                                setSelectedVendors((prev) =>
                                  prev.filter((v) => v !== name),
                                )
                              }
                              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4">
                    {[
                      ["annotators_total", "Total annotators"],
                      ["autonex_annotators", "Autonex annotators"],
                      ["autonex_reviewers", "Autonex reviewers"],
                      ["others_count", "Others"],
                      // Only for development projects: they are staffed with
                      // engineers, not annotators, so the field would be dead
                      // weight on every other project type.
                      isDevelopmentSelected && ["developers_count", "Developers"],
                    ]
                      .filter(Boolean)
                      .map(([field, label]) => {
                        const isPriorityDriver =
                          field === "autonex_annotators" ||
                          field === "autonex_reviewers";
                        return (
                          <div key={field}>
                            <label className={`${PF.label} truncate`}>{label}</label>
                            <input
                              type="number"
                              name={field}
                              min="0"
                              {...(isPriorityDriver
                                ? {
                                  value:
                                    field === "autonex_annotators"
                                      ? formAutonexAnnotators
                                      : formAutonexReviewers,
                                  onChange: (e) => {
                                    const n = parseInt(e.target.value, 10);
                                    const next = Number.isFinite(n) ? n : 0;
                                    if (field === "autonex_annotators") {
                                      setFormAutonexAnnotators(next);
                                    } else {
                                      setFormAutonexReviewers(next);
                                    }
                                  },
                                }
                                : {
                                  defaultValue:
                                    (editingProject || copyingProject)?.[field] ?? "",
                                })}
                              onWheel={(e) => e.target.blur()}
                              className={`${PF.input} ${PF.number}`}
                              placeholder="0"
                            />
                          </div>
                        );
                      })}
                    {/* Derived from the two pickers above rather than typed. They were
                        editable numbers that could disagree with the people actually
                        chosen — a project could name three leads and claim one. */}
                    {[
                      ["Managers", selectedPmIds.length, "Program managers"],
                      ["Team leads", selectedTeamLeadIds.length, "Team leads"],
                    ].map(([label, value, source]) => (
                      <div key={label}>
                        <span className={`${PF.label} truncate`}>{label}</span>
                        <div
                          className="flex h-9 items-center justify-between rounded-lg bg-slate-50 px-3 text-sm tabular-nums text-slate-700"
                          title={`Counted from ${source} above`}
                        >
                          {value}
                          <span className="text-xs text-slate-400">auto</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mirrors api/projects.py `_autonex_headcount`. "Total
                      Annotators" is informational and deliberately not in the sum
                      — it counts the vendor's people as well as ours. */}
                  <p className="text-xs leading-relaxed text-slate-500">
                    Required headcount counts Autonex annotators, reviewers, others, team leads and managers
                    {isDevelopmentSelected ? ", and developers" : ""}. Total annotators is for reference and
                    includes vendor staff.
                  </p>
                </div>
              </FormSection>

              {/* ── Guidelines ──────────────────────────── */}
              <FormSection title="Guidelines" hint="Documents the team works from">
                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
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
                  className={`flex h-16 items-center justify-center gap-2 rounded-lg border border-dashed text-center cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 ${isDragActive ? "border-indigo-500 bg-indigo-50/60" : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"}`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      addGuidelineFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <UploadCloud className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
                  <p className="text-[13px] text-slate-600">
                    Drop files here or <span className="font-medium text-indigo-700">browse</span>
                  </p>
                </div>
                {guidelineFiles.length > 0 && (
                  <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {guidelineFiles.map((file) => (
                      <li
                        key={`${file.name}-${file.size}-${file.lastModified}`}
                        className="flex h-10 items-center justify-between gap-3 px-3"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.5} />
                          <p className="truncate text-[13px] text-slate-700">{file.name}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeGuidelineFile(file);
                          }}
                          className="shrink-0 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </FormSection>
            </div>
          </Modal.Compact.Body>
          <Modal.Compact.Footer>
            <Button type="button" variant="cancel" onClick={resetModalState}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="project-form"
              className="h-9 px-4 rounded-lg text-sm font-medium shadow-none"
              disabled={createMutation.isPending || updateMutation.isPending}
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {!(createMutation.isPending || updateMutation.isPending) &&
                (editingProject ? "Save changes" : copyingProject ? "Create copy" : "Create project")}
            </Button>
          </Modal.Compact.Footer>
        </form>
      </Modal.Compact>
      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          deleteMutation.mutate(deleteConfirm.id);
          setDeleteConfirm(null);
        }}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        isPending={deleteMutation.isPending}
      />

      {/* Archive Project Modal */}
      {archiveModalProject && (
        <Modal.Compact
          isOpen={true}
          onClose={() => setArchiveModalProject(null)}
          size="md"
          title={`Archive "${archiveModalProject.name}"`}
        >
          <div className="p-4 space-y-4">
            <p className="text-xs text-slate-500">
              Archiving this project will release all worker allocations (annotators, reviewers) back to company availability. The assigned Project Manager and Team Lead will remain attached for reference.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
                Select Final Status
              </label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  {
                    value: "completed",
                    label: "Completed",
                    desc: "Project delivery has successfully finished.",
                  },
                  {
                    value: "on-hold",
                    label: "On Hold",
                    desc: "Project is temporarily paused by client.",
                  },
                  {
                    value: "cancelled",
                    label: "Cancelled",
                    desc: "Project trial was rejected or cancelled.",
                  },
                ].map((st) => (
                  <label
                    key={st.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      archiveStatusSelection === st.value
                        ? "border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="archiveStatus"
                      value={st.value}
                      checked={archiveStatusSelection === st.value}
                      onChange={() => setArchiveStatusSelection(st.value)}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-sm font-semibold text-slate-800">
                        {st.label}
                      </span>
                      <p className="text-xs text-slate-500">{st.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <Modal.Compact.Footer>
            <button
              type="button"
              onClick={() => setArchiveModalProject(null)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={archiveMutation.isPending}
              onClick={() => {
                archiveMutation.mutate({
                  id: archiveModalProject.id,
                  status: archiveStatusSelection,
                });
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {archiveMutation.isPending ? "Archiving..." : "Archive Project"}
            </button>
          </Modal.Compact.Footer>
        </Modal.Compact>
      )}

      {/* Restore Project Confirm Dialog */}
      <ConfirmDialog
        isOpen={restoreConfirmProject !== null}
        onClose={() => setRestoreConfirmProject(null)}
        onConfirm={() => {
          restoreMutation.mutate({
            id: restoreConfirmProject.id,
            status: "in progress",
          });
        }}
        title="Restore Project"
        message={`Are you sure you want to restore "${restoreConfirmProject?.name}" back to active operations? It will be moved to the Active tab with status "In Progress".`}
        isPending={restoreMutation.isPending}
      />
    </div>
  );
};

export default ProjectsPage;
