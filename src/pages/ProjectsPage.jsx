import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/LoadingSpinner";
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
  Minus,
  Trash2,
  X,
  UserCheck,
  Users,
  ChevronDown,
  ArrowRight,
  Edit,
  Settings,
  UploadCloud,
  FileText,
  BarChart3,
  SlidersHorizontal,
  Check,
  Download,
  Clock,
  Smile,
  PauseCircle,
  CheckCircle2,
  XCircle,
  Eye,
} from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import toast from "react-hot-toast";
import SearchBar from "../components/ui/SearchBar";
import {
  getPmEmployeeId,
  getPmProjects,
  getPmSubProjects,
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
import AllocationPopover from "../components/AllocationPopover";
import {
  buildEmployeeIndex,
  manpowerEmployeeIds,
  totalRequiredManpower,
} from "../utils/workforce";
import Table, { ColumnTemplates } from "../components/ui/Table";
import Dropdown from "../components/ui/Dropdown";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Modal from "../components/ui/Modal";
import StatCard from "../components/dashboard/StatCard";
import useScrollStore from "../store/useScrollStore";
import useProjectsStore from "../store/useProjectsStore";
import { formatDisplayName } from "../utils/displayName";
import { getWorkingDayCount } from "../utils/leaveTypes";

import { 
  STATUS_CONFIG, 
  ARCHIVED_STATUSES, 
  isArchivedStatus, 
  getStatusBadgeConfig, 
  formatCreatedDate, 
  PROJECT_TYPE_CATEGORIES, 
  typeLabel, 
  DEVELOPER_TYPE_KEY, 
  isDeveloperProject 
} from "../utils/projectConstants";
import ProjectCard from "../components/projects/ProjectCard";
import { SkillMultiSelect, EmployeeMultiSelect, TeamLeadMultiSelect, PmMultiSelect } from "../components/projects/ProjectDropdowns";


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
  const [manpowerTrigger, setManpowerTrigger] = useState(0);

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
  // Inline (double-click) card editing + per-card docs popover
  const [editingCardId, setEditingCardId] = useState(null);
  const [cardDraft, setCardDraft] = useState(null);
  const [docsOpenId, setDocsOpenId] = useState(null);

  useEffect(() => {
    const form = document.getElementById("project-form");
    if (!form) return;
    const formData = new FormData(form);
    const ann = parseInt(formData.get("autonex_annotators")) || 0;
    const rev = parseInt(formData.get("autonex_reviewers")) || 0;
    const tl = selectedTeamLeadIds.length;
    const total = ann + rev + tl;
    let sugg = "P1";
    if (total === 0) sugg = "P3";
    else if (ann + rev === 0 && tl > 0) sugg = "P2";
    else if (total >= 5) sugg = "P0";
    setPrioritySuggestion(sugg);
  }, [manpowerTrigger, selectedTeamLeadIds, isModalOpen]);

  const { data: projectKpis } = useQuery({
    queryKey: ["sub-projects-kpi"],
    queryFn: () => subProjectApi.getKpi(),
    staleTime: 60000,
  });

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
        status: statusParam || (selectedStatus !== "all" ? selectedStatus : undefined),
        priority: selectedPriority !== "all" ? selectedPriority : undefined,
        organization: selectedOrganization !== "all" ? selectedOrganization : undefined,
        autonex_only: autonexOnly ? true : undefined,
        pm_id: selectedPm !== "all" ? selectedPm : undefined,
        team_lead_id: selectedTeamLead !== "all" ? selectedTeamLead : undefined,
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
    return employees.filter((e) =>
      (e.designation || "").toLowerCase().includes("program manager"),
    );
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
    employees.forEach((e) => {
      const wm = (e.work_model || "WFO").toUpperCase();
      const regularWfh = wm === "WFH" || wm.includes("HOME");
      m.set(e.id, regularWfh || wfhTodayIds.has(e.id) ? "WFH" : "WFO");
    });
    return m;
  }, [employees, wfhTodayIds]);

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

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["sub-projects"] }),
      queryClient.invalidateQueries({ queryKey: ["guidelines"] }),
      queryClient.invalidateQueries({ queryKey: ["allocations"] }),
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

  // Helper: count working days (exclude weekends and company holidays) between two dates.
  // Parse date-only strings as LOCAL midnight (never via Date.toISOString) so
  // counts don't shift by a day in timezones offset from UTC (e.g. IST).
  const getWorkingDays = (startStr, endStr) => {
    return getWorkingDayCount(startStr, endStr) || 1; // at least 1 to avoid division by zero
  };

  // Helper: count leave working days for an employee during a project period.
  // Clamp the overlap on the YYYY-MM-DD strings directly (lexicographic order =
  // chronological) to avoid UTC round-trips.
  const getEmployeeLeaveDays = (employeeId, projectStart, projectEnd) => {
    const empLeaves = leaves.filter((l) => l.employee_id === employeeId);
    let totalLeaveDays = 0;
    for (const leave of empLeaves) {
      if (!leave.start_date || !leave.end_date) continue;
      const leaveStart =
        leave.start_date > projectStart ? leave.start_date : projectStart;
      const leaveEnd =
        leave.end_date < projectEnd ? leave.end_date : projectEnd;
      if (leaveStart <= leaveEnd) {
        totalLeaveDays += getWorkingDayCount(leaveStart, leaveEnd, leave.is_half_day);
      }
    }
    return totalLeaveDays;
  };

  const getSystemRecommendation = (project) => {
    const projectAllocations = allocations.filter(
      (a) => a.sub_project_id === project.id,
    );
    const allocatedPersonnel = projectAllocations.length;
    const totalTasks = project.total_tasks || 0;
    const avgTimePerTask = project.estimated_time_per_task || 0; // in hours
    const totalEstimatedHours = totalTasks * avgTimePerTask;

    if (allocatedPersonnel === 0) {
      return {
        label: "Overburdened",
        dailyHours: 0,
        details: "No employees allocated",
      };
    }

    const workingDays = getWorkingDays(project.start_date, project.end_date);

    // Calculate effective capacity: subtract leave days per employee
    let totalEffectiveEmployeeDays = 0;
    for (const alloc of projectAllocations) {
      const leaveDays = getEmployeeLeaveDays(
        alloc.employee_id,
        project.start_date,
        project.end_date,
      );
      totalEffectiveEmployeeDays += workingDays - leaveDays;
    }

    // Per-employee average daily required hours
    const avgDailyHoursPerEmployee =
      totalEffectiveEmployeeDays > 0
        ? totalEstimatedHours / totalEffectiveEmployeeDays
        : 999;

    let label;
    if (avgDailyHoursPerEmployee > 8.5) {
      label = "Overburdened";
    } else if (avgDailyHoursPerEmployee >= 7.5) {
      label = "Balanced";
    } else {
      label = "Underutilized";
    }

    return {
      label,
      dailyHours: avgDailyHoursPerEmployee,
      workingDays,
      effectiveDays: totalEffectiveEmployeeDays,
    };
  };


  const [deleteConfirm, setDeleteConfirm] = useState(null);
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
      .filter((e) =>
        (e.designation || "").toLowerCase().includes("program manager"),
      )
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

  const currentMainProject = visibleMainProjects.find(
    (p) => p.id === parseInt(filterMainProjectId),
  );



  // Open the full create/edit modal, prefilled from a project. `copy` clones it.
  const openProjectModal = (project, { copy = false } = {}) => {
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
    setFormProjectStatus(project.project_status || "active");
    setFormSentiment(project.sentiment || "");
    setModalInfoTab("status");
    setModalBuildTab("types");
    // Prefill both rosters from the project. The PM list matters even though the field is
    // hidden for a PM: submit sends `assigned_employee_ids: selectedPmIds`, so leaving
    // stale state in place would rewrite this project's managers with the previous
    // modal's selection.
    //
    // Read the project's own column rather than resolvePmIds — the resolved value can come
    // from the organisation, and writing that back would pin an inheriting project to those
    // people, which switches organisation-level inheritance off for it (see pmScope.js).
    // Split the stored manager slot the same way the card does, so the modal cannot show a
    // different set from the project it was opened on. Reading the column raw put converted
    // managers in the Program Manager box and left Team Lead empty — and saving that would
    // have written them straight back as managers.
    const demoted = demotedToLeadIds(project, visibleMainProjects, employeeIndex);
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


      {/* Active / Archived / Development tabs — admin only. Archived = Completed /
 On Hold / Cancelled; Development = projects with the Developer type. */}
      {isAdmin && (
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
                    console.log("Tab clicked:", t.key);
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
      )}

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
              hint="currently active"
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
          {selectedStatus !== "all" && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700">
              Status:{" "}
              {selectedStatus === "active"
                ? "In Progress"
                : selectedStatus === "poc"
                  ? "POC"
                  : selectedStatus}
              <button
                type="button"
                onClick={() => setSelectedStatus("all")}
                className="hover:text-indigo-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedOrganization !== "all" && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700">
              {selectedOrganization}
              <button
                type="button"
                onClick={() => setSelectedOrganization("all")}
                className="hover:text-indigo-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedPm !== "all" && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700">
              {projectManagers.find((pm) => String(pm.id) === String(selectedPm))?.name || "Manager"}
              <button
                type="button"
                onClick={() => setSelectedPm("all")}
                className="hover:text-indigo-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {/* Emerald, matching the lead accents elsewhere, so it doesn't read as a
              second manager chip. */}
          {selectedTeamLead !== "all" && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700">
              Lead:{" "}
              {teamLeads.find((l) => String(l.id) === String(selectedTeamLead))
                ?.name || "Team lead"}
              <button
                type="button"
                onClick={() => setSelectedTeamLead("all")}
                className="hover:text-emerald-900"
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
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              Filters
              {[
                selectedOrganization,
                selectedPm,
                selectedTeamLead,
                selectedStatus,
                selectedPriority,
              ].some((v) => v !== "all") && (
                  <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-indigo-100 px-1.5 text-[10px] font-semibold text-indigo-700">
                    {
                      [
                        selectedOrganization,
                        selectedPm,
                        selectedTeamLead,
                        selectedStatus,
                        selectedPriority,
                      ].filter((v) => v !== "all").length
                    }
                  </span>
                )}
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
              />
            </button>

            {filtersOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Priority
                  </label>
                  <Dropdown
                    value={selectedPriority}
                    onChange={setSelectedPriority}
                    options={[
                      { value: "all", label: "All priorities" },
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
                  <Dropdown
                    value={selectedStatus}
                    onChange={setSelectedStatus}
                    options={
                      !isAdmin
                        ? [
                          { value: "all", label: "All statuses" },
                          { value: "active", label: "In Progress" },
                          { value: "poc", label: "POC" },
                          { value: "completed", label: "Completed" },
                          { value: "on-hold", label: "On Hold" },
                          { value: "cancelled", label: "Cancelled" },
                        ]
                        : projectView === "archived"
                          ? [
                            { value: "all", label: "All statuses" },
                            { value: "completed", label: "Completed" },
                            { value: "on-hold", label: "On Hold" },
                            { value: "cancelled", label: "Cancelled" },
                          ]
                          : [
                            { value: "all", label: "All statuses" },
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
                  <Dropdown
                    value={selectedOrganization}
                    onChange={setSelectedOrganization}
                    options={[
                      { value: "all", label: "All organizations" },
                      ...organizations.map((org) => ({
                        value: org,
                        label: org,
                      })),
                    ]}
                    className="w-full"
                  />
                </div>
                {isAdmin && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      Project Manager
                    </label>
                    <Dropdown
                      value={selectedPm}
                      onChange={setSelectedPm}
                      searchable
                      searchPlaceholder="Search managers..."
                      options={[
                        { value: "all", label: "All managers" },
                        ...projectManagers.map((pm) => ({
                          value: String(pm.id),
                          label: pm.name,
                        })),
                      ]}
                      className="w-full"
                    />
                  </div>
                )}
                {/* Offered to PMs and team leads too, not just admins: with several leads on
                    one project it is the quickest way to find your own. */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Team Lead
                  </label>
                  <Dropdown
                    value={selectedTeamLead}
                    onChange={setSelectedTeamLead}
                    searchable
                    searchPlaceholder="Search team leads..."
                    options={[
                      { value: "all", label: "All team leads" },
                      ...teamLeads.map((lead) => ({
                        value: String(lead.id),
                        label: lead.name,
                      })),
                    ]}
                    className="w-full"
                  />
                </div>
                {[
                  selectedOrganization,
                  selectedPm,
                  selectedTeamLead,
                  selectedStatus,
                  selectedPriority,
                ].some((v) => v !== "all") && (
                    <button
                      onClick={() => {
                        setSelectedOrganization("all");
                        setSelectedPm("all");
                        setSelectedTeamLead("all");
                        setSelectedStatus("all");
                      }}
                      className="w-full rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
                    >
                      Clear filters
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
              const allocatedManpower = getAllocatedManpower(project);

              return (
                <ProjectCard
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
                  requiredManpower={project.required_manpower || 0}
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
                    onDelete={() =>
                      setDeleteConfirm({ id: project.id, name: project.name })
                    }
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
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {editingProject
                  ? "Edit Project"
                  : copyingProject
                    ? "Copy Project"
                    : "Create New Project"}
              </h2>
              <p className="text-xs text-slate-500">
                Update project details and team allocation.
              </p>
            </div>
          </div>
        </Modal.Compact.Header>
        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col min-h-0"
          id="project-form"
        >
          <Modal.Compact.Body className="space-y-4">
            {/* Row 1: Project Name / Organisation Name / Program Manager */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={(editingProject || copyingProject)?.name}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 transition-colors hover:border-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  placeholder="Enter project name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Organisation Name <span className="text-red-500">*</span>
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
                  placeholder="Select or type an organization"
                  disabled={
                    !!filterMainProjectId && !editingProject && !copyingProject
                  }
                />
              </div>

              {/* Shown to PMs as well as admins: a project takes several managers, so a PM
                  needs this to add a co-manager to their own. They are still auto-assigned
                  on create (api/projects.py) and PmMultiSelect refuses to let them remove
                  themselves, so neither route can leave them without their own project. */}
              <div>
                <div className="mb-1 flex items-center gap-1.5">
                  <label className="block text-xs font-semibold text-slate-600">
                    Program Manager
                  </label>
                  {selectedPmIds.length > 0 && (
                    <span className="group relative inline-flex">
                      <span className="inline-flex h-4 min-w-[16px] cursor-default items-center justify-center rounded-full bg-indigo-100 px-1 text-[10px] font-bold text-indigo-700">
                        {selectedPmIds.length}
                      </span>
                      <span className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-max max-w-[220px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-lg group-hover:block">
                        {selectedPmIds.map((id, i) => {
                          const emp = employees.find((e) => e.id === id);
                          return (
                            <span
                              key={id}
                              className="flex items-center gap-1.5 whitespace-nowrap py-0.5"
                            >
                              {formatDisplayName(emp?.name) || "Unknown"}
                              {i === 0 && (
                                <span className="text-[9px] font-semibold uppercase tracking-wide text-indigo-400">
                                  primary
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </span>
                    </span>
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

              <div>
                <div className="mb-1 flex items-center gap-1.5">
                  <label className="block text-xs font-semibold text-slate-600">
                    Team Lead
                  </label>
                  {selectedTeamLeadIds.length > 0 && (
                    <span className="group relative inline-flex">
                      <span className="inline-flex h-4 min-w-[16px] cursor-default items-center justify-center rounded-full bg-emerald-100 px-1 text-[10px] font-bold text-emerald-700">
                        {selectedTeamLeadIds.length}
                      </span>
                      <span className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-max max-w-[240px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-lg group-hover:block">
                        {selectedTeamLeadIds.map((id) => {
                          const emp = employees.find((e) => e.id === id);
                          return (
                            <span
                              key={id}
                              className="flex items-center gap-1.5 whitespace-nowrap py-0.5"
                            >
                              {formatDisplayName(emp?.name) || "Unknown"}
                              {/* Still reachable: the picker offers Team Leads only, but a
                                  project may already carry a program manager tagged as a
                                  lead from the Allocations page, and prefill shows them. */}
                              {!isTeamLeadDesignation(emp?.designation) && (
                                <span className="text-[9px] font-semibold uppercase tracking-wide text-amber-500">
                                  temp
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </span>
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

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Priority <span className="font-normal text-slate-400">(Sugg: {prioritySuggestion})</span>
                </label>
                <Dropdown
                  value={formPriority}
                  onChange={setFormPriority}
                  options={[
                    { value: "auto", label: `Auto (${prioritySuggestion})` },
                    { value: "P0", label: "P0" },
                    { value: "P1", label: "P1" },
                    { value: "P2", label: "P2" },
                    { value: "P3", label: "P3" },
                    { value: "medium", label: "Medium (Legacy)" }
                  ]}
                  className="w-full min-h-[42px]"
                  optionsClassName="w-full"
                />
              </div>
            </div>

            {/* Status / Client Sentiment tabs + timings / gearing / date / guidelines */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: tabbed Status | Client Sentiment card */}
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="mb-3 flex items-center gap-4 border-b border-slate-200">
                  <button
                    type="button"
                    onClick={() => setModalInfoTab("status")}
                    className={`-mb-px flex items-center gap-1.5 border-b-2 pb-2 text-[13px] font-semibold transition-colors ${modalInfoTab === "status" ? "border-indigo-600 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                  >
                    <Clock className="h-3.5 w-3.5" /> Status
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalInfoTab("sentiment")}
                    className={`-mb-px flex items-center gap-1.5 border-b-2 pb-2 text-[13px] font-semibold transition-colors ${modalInfoTab === "sentiment" ? "border-indigo-600 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                  >
                    <Smile className="h-3.5 w-3.5" /> Client Sentiment
                  </button>
                </div>

                {/* Values are submitted via these hidden inputs regardless of the active tab */}
                <input
                  type="hidden"
                  name="project_status"
                  value={formProjectStatus}
                />
                <input type="hidden" name="sentiment" value={formSentiment} />

                {modalInfoTab === "status" ? (
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { value: "poc", label: "POC" },
                      { value: "on-hold", label: "On Hold" },
                      { value: "active", label: "In Progress" },
                      { value: "completed", label: "Completed" },
                      { value: "cancelled", label: "Cancelled" },
                    ].map((opt) => {
                      const on = formProjectStatus === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFormProjectStatus(opt.value)}
                          className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${on ? "border-indigo-300 bg-indigo-50 font-medium text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${on ? "bg-indigo-500" : "bg-slate-300"}`}
                          />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { value: "", label: "Not set", dot: "bg-slate-300" },
                      { value: "GOOD", label: "Good", dot: "bg-emerald-500" },
                      { value: "AVG", label: "Avg", dot: "bg-amber-500" },
                      { value: "Poor", label: "Poor", dot: "bg-red-500" },
                    ].map((opt) => {
                      const on = formSentiment === opt.value;
                      return (
                        <button
                          key={opt.value || "none"}
                          type="button"
                          onClick={() => setFormSentiment(opt.value)}
                          className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${on ? "border-indigo-300 bg-indigo-50 font-medium text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${opt.dot}`}
                          />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right: timings, gearing / date, guidelines */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Annotation Time / Task (min){" "}
                      <span className="text-red-500">*</span>
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
                            ).toFixed(1),
                          )
                          : ""
                      }
                      onWheel={(e) => e.target.blur()}
                      className="input [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Reviewer Time / Task (min)
                    </label>
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
                      className="input [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="15"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <label className="whitespace-nowrap text-xs font-semibold text-slate-600">
                      Gearing Ratio:
                    </label>
                    <input
                      type="number"
                      name="gearing_ratio"
                      min="0"
                      step="0.1"
                      defaultValue={
                        (editingProject || copyingProject)?.gearing_ratio ?? ""
                      }
                      onWheel={(e) => e.target.blur()}
                      className="input flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="e.g. 3.1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="whitespace-nowrap text-xs font-semibold text-slate-600">
                      Date:
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      required
                      defaultValue={
                        (editingProject || copyingProject)?.start_date
                      }
                      className="input flex-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
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
                    className={`flex items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-center cursor-pointer transition-colors ${isDragActive ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/60"}`}
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
                    <UploadCloud className="h-4 w-4 text-indigo-500" />
                    <p className="text-xs font-medium text-slate-600">
                      Drag documents here or click to browse
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
                            <FileText className="h-4 w-4 shrink-0 text-indigo-500" />
                            <p className="truncate text-xs font-medium text-slate-700">
                              {file.name}
                            </p>
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
              </div>
            </div>

            {/* Encord Project ID (full width) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Encord Project ID
              </label>
              <input
                type="text"
                name="encord_project_hash"
                defaultValue={
                  (editingProject || copyingProject)?.encord_project_hash || ""
                }
                className="input font-mono text-sm"
                placeholder="Encord project hash (enables analytics for this project)"
              />
            </div>

            {/* Project Types | Team Composition tabbed card. Both panels stay
 mounted (inactive one hidden via CSS) so the team-count inputs are
 always present in the submitted FormData. */}
            <div className="rounded-xl border border-slate-200">
              <div className="flex items-center gap-4 border-b border-slate-200 px-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalBuildTab("types")}
                  className={`-mb-px border-b-2 pb-2 text-[13px] font-semibold transition-colors ${modalBuildTab === "types" ? "border-indigo-600 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                >
                  Project Types
                </button>
                <button
                  type="button"
                  onClick={() => setModalBuildTab("team")}
                  className={`-mb-px border-b-2 pb-2 text-[13px] font-semibold transition-colors ${modalBuildTab === "team" ? "border-indigo-600 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                >
                  Team Composition
                </button>
              </div>

              <div className="p-3">
                {/* Project Types */}
                <div className={modalBuildTab === "types" ? "" : "hidden"}>
                  <div className="flex flex-wrap gap-2">
                    {PROJECT_TYPE_CATEGORIES.map((cat) => {
                      const isActive = activeTypeTab === cat.key;
                      const chosen = projectTypes[cat.key];
                      return (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => {
                            setActiveTypeTab(cat.key);
                            setTypeTabTouched(true);
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${isActive ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                        >
                          {cat.label || cat.key}
                          {chosen && (
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[10px] ${isActive ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-600"}`}
                            >
                              1
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {PROJECT_TYPE_CATEGORIES.filter(
                    (c) => c.key === activeTypeTab,
                  ).map((cat) => (
                    <div key={cat.key} className="mt-3">
                      <label className="mb-1 block text-[11px] font-medium text-slate-500">
                        {cat.label || cat.key} — Subtype
                      </label>
                      <Dropdown
                        defaultOpen={typeTabTouched}
                        options={[
                          { value: "", label: "Not set" },
                          ...cat.subtypes.map((s) => ({ value: s, label: s })),
                        ]}
                        value={projectTypes[cat.key] || ""}
                        onChange={(val) =>
                          setProjectTypes((prev) => {
                            const next = { ...prev };
                            if (val) next[cat.key] = val;
                            else delete next[cat.key];
                            return next;
                          })
                        }
                        placeholder="Select a subtype"
                      />
                    </div>
                  ))}

                  {Object.keys(projectTypes).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {Object.entries(projectTypes).map(([cat, sub]) => (
                        <span
                          key={cat}
                          className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
                        >
                          <span className="text-indigo-400">
                            {typeLabel(cat)}:
                          </span>{" "}
                          {sub}
                          <button
                            type="button"
                            onClick={() =>
                              setProjectTypes((prev) => {
                                const n = { ...prev };
                                delete n[cat];
                                return n;
                              })
                            }
                            className="text-indigo-400 hover:text-indigo-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Team Composition */}
                <div className={modalBuildTab === "team" ? "" : "hidden"}>
                  <div className="mb-3">
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Workforce Vendors
                    </label>
                    <Dropdown
                      editable={true}
                      allowCreate={true}
                      placeholder="Select or create a vendor"
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
                            className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
                          >
                            {name}
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedVendors((prev) =>
                                  prev.filter((v) => v !== name),
                                )
                              }
                              className="text-indigo-400 hover:text-indigo-700"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      ["annotators_total", "Total Annotators"],
                      ["autonex_annotators", "Autonex Annotators"],
                      ["autonex_reviewers", "Autonex Reviewers"],
                      ["others_count", "Others"],
                      // Only for development projects: they are staffed with
                      // engineers, not annotators, so the field would be dead
                      // weight on every other project type.
                      isDevelopmentSelected && ["developers_count", "Developers"],
                    ]
                      .filter(Boolean)
                      .map(([field, label]) => (
                        <div key={field}>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1 truncate">
                            {label}
                          </label>
                          <input
                            type="number"
                            name={field}
                            min="0"
                            defaultValue={
                              (editingProject || copyingProject)?.[field] ?? ""
                            }
                            onChange={() => setManpowerTrigger(v => v + 1)}
                            onWheel={(e) => e.target.blur()}
                            className="input"
                            placeholder="0"
                          />
                        </div>
                      ))}
                    {/* Derived from the two pickers above rather than typed. They were
                        editable numbers that could disagree with the people actually
                        chosen — a project could name three leads and claim one. */}
                    {[
                      ["Team Managers", selectedPmIds.length],
                      ["Team Leads", selectedTeamLeadIds.length],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <label className="mb-1 block truncate text-[11px] font-medium text-slate-500">
                          {label}
                        </label>
                        <div
                          className="input flex cursor-default items-center bg-slate-50 text-slate-500"
                          title={`From the ${label === "Team Leads" ? "Team Lead" : "Program Manager"} field above`}
                        >
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mirrors api/projects.py `_autonex_headcount`. "Total
                      Annotators" is informational and deliberately not in the sum
                      — it counts the vendor's people as well as ours. */}
                  <p className="mt-2 text-[11px] text-slate-400">
                    {`Required headcount = Autonex Annotators + Autonex Reviewers + Others + Team Leads + Team Managers${
                      isDevelopmentSelected ? " + Developers" : ""
                    }. Leads and managers are counted from the fields above, not typed.`}
                  </p>
                </div>
              </div>
            </div>
          </Modal.Compact.Body>
          <Modal.Compact.Footer>
            <Button type="button" variant="cancel" onClick={resetModalState}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="project-form"
              disabled={createMutation.isPending || updateMutation.isPending}
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {!(createMutation.isPending || updateMutation.isPending) &&
                (editingProject ? "Update Project" : "Create Project")}
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
    </div>
  );
};

export default ProjectsPage;
