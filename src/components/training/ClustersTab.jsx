import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Archive,
  Bell,
  Calendar,
  Check,
  Clock,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Trash2,
  UserCheck,
  UserPlus,
  Users2,
  X,
  XCircle,
} from "lucide-react";
import { addDays, format } from "date-fns";
import toast from "react-hot-toast";
import { assessmentApi, assignmentApi, clusterApi } from "../../services/api";
import { formatDisplayName } from "../../utils/displayName";
import Modal from "../ui/Modal";
import ConfirmDialog from "../ui/ConfirmDialog";
import Button from "../ui/Button";
import DatePicker from "../ui/DatePicker";
import Dropdown from "../ui/Dropdown";
import SearchBar from "../ui/SearchBar";
import LoadingSpinner from "../ui/LoadingSpinner";
import Select from "./Select";
import {
  AUTO_CLUSTER_SCOPES,
  clusterScopeLabel,
  getClusterScopes,
  plural,
  ui,
} from "./trainingStyles";

/**
 * Reusable additive bulk member picker for Manual ('custom') clusters.
 * Lets admins filter by Daily Sheet (Allocation -> DailySheet), Idle/Unallocated,
 * Designation, Skill, or Employment Type, and add matching groups additively
 * (e.g., Idle employees + Project Ocean members).
 */
function SmartMemberPicker({
  pickerData,
  isLoading,
  selectedIds,
  onChangeSelectedIds,
  excludeEmployeeIds = null,
  maxHeightClass = "max-h-56",
  listClassName = "",
  compact = false,
}) {
  const [searchText, setSearchText] = useState("");
  const [onlyIdle, setOnlyIdle] = useState(false);
  const [sheetFilter, setSheetFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [empTypeFilter, setEmpTypeFilter] = useState("");

  const allEmployees = pickerData?.employees || [];
  const dailySheets = pickerData?.daily_sheets || [];
  const designations = pickerData?.designations || [];
  const skills = pickerData?.skills || [];
  const empTypes = pickerData?.employee_types || [];

  const sheetNameById = useMemo(() => {
    const map = new Map();
    dailySheets.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [dailySheets]);

  const employeeById = useMemo(() => {
    const map = new Map();
    allEmployees.forEach((e) => map.set(e.id, e));
    return map;
  }, [allEmployees]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const availableEmployees = useMemo(() => {
    if (!excludeEmployeeIds || excludeEmployeeIds.size === 0) return allEmployees;
    return allEmployees.filter((e) => !excludeEmployeeIds.has(e.id));
  }, [allEmployees, excludeEmployeeIds]);

  const hasFilters = Boolean(
    searchText.trim() ||
      onlyIdle ||
      sheetFilter ||
      designationFilter ||
      skillFilter ||
      empTypeFilter
  );

  const filteredEmployees = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const targetSheetId = sheetFilter ? Number(sheetFilter) : null;

    return availableEmployees.filter((emp) => {
      if (onlyIdle && !emp.is_idle) return false;
      if (targetSheetId !== null && !(emp.daily_sheet_ids || []).includes(targetSheetId)) {
        return false;
      }
      if (designationFilter && emp.designation !== designationFilter) return false;
      if (empTypeFilter && emp.employee_type !== empTypeFilter) return false;
      if (skillFilter && !(emp.skills || []).includes(skillFilter)) return false;

      if (!q) return true;
      return (
        String(emp.name || "").toLowerCase().includes(q) ||
        String(emp.email || "").toLowerCase().includes(q) ||
        String(emp.designation || "").toLowerCase().includes(q) ||
        (emp.skills || []).some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [
    availableEmployees,
    searchText,
    onlyIdle,
    sheetFilter,
    designationFilter,
    skillFilter,
    empTypeFilter,
  ]);

  const matchingUnselectedIds = useMemo(
    () => filteredEmployees.filter((e) => !selectedSet.has(e.id)).map((e) => e.id),
    [filteredEmployees, selectedSet]
  );

  const handleAddAllMatching = () => {
    if (matchingUnselectedIds.length === 0) return;
    const next = Array.from(new Set([...selectedIds, ...matchingUnselectedIds]));
    onChangeSelectedIds(next);
  };

  const handleRemoveMatching = () => {
    const matchingSet = new Set(filteredEmployees.map((e) => e.id));
    onChangeSelectedIds(selectedIds.filter((id) => !matchingSet.has(id)));
  };

  const resetFilters = () => {
    setSearchText("");
    setOnlyIdle(false);
    setSheetFilter("");
    setDesignationFilter("");
    setSkillFilter("");
    setEmpTypeFilter("");
  };

  const idleAvailableCount = useMemo(
    () => availableEmployees.filter((e) => e.is_idle).length,
    [availableEmployees]
  );

  return (
    <div className="space-y-2.5">
      {/* Smart filter controls */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <SearchBar
            placeholder="Name, role or skill"
            value={searchText}
            onChange={setSearchText}
            size="sm"
            clearable
            className="w-full"
          />

          <Dropdown
            value={sheetFilter}
            onChange={setSheetFilter}
            searchable
            searchPlaceholder="Search daily sheets"
            placeholder="All daily sheets"
            className="w-full [&>button]:h-9"
            optionsClassName="w-72"
            options={[
              { value: "", label: "All daily sheets" },
              ...dailySheets.map((sh) => ({
                value: String(sh.id),
                label: `${sh.name}${sh.main_project_name ? ` (${sh.main_project_name})` : ""} · ${sh.active_member_count || 0}`,
              })),
            ]}
          />

          <Dropdown
            value={designationFilter}
            onChange={setDesignationFilter}
            searchable
            searchPlaceholder="Search designations"
            placeholder="All designations"
            className="w-full [&>button]:h-9"
            optionsClassName="w-64"
            options={[
              { value: "", label: "All designations" },
              ...designations.map((d) => ({ value: d, label: d })),
            ]}
          />

          <Dropdown
            value={skillFilter}
            onChange={setSkillFilter}
            searchable
            searchPlaceholder="Search skills"
            placeholder="All skills"
            className="w-full [&>button]:h-9"
            optionsClassName="w-64"
            options={[
              { value: "", label: "All skills" },
              ...skills.map((sk) => ({ value: sk, label: sk })),
            ]}
          />

          <Dropdown
            value={empTypeFilter}
            onChange={setEmpTypeFilter}
            searchable
            searchPlaceholder="Search types"
            placeholder="All employment types"
            className="w-full [&>button]:h-9"
            optionsClassName="w-64"
            options={[
              { value: "", label: "All employment types" },
              ...empTypes.map((et) => ({ value: et, label: et })),
            ]}
          />

          <button
            type="button"
            onClick={() => setOnlyIdle((v) => !v)}
            aria-pressed={onlyIdle}
            className={`h-9 px-3 rounded-lg border text-sm flex items-center justify-between gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 ${
              onlyIdle
                ? "bg-indigo-50 border-indigo-300 text-indigo-800 font-medium"
                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
            }`}
          >
            <span>Idle only</span>
            <span className={`text-xs tabular-nums ${onlyIdle ? "text-indigo-600" : "text-slate-400"}`}>
              {idleAvailableCount}
            </span>
          </button>
        </div>

        {/* Additive Bulk Selection Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-200 text-[13px]">
          <span className="text-slate-600 tabular-nums">
            <span className="font-medium text-slate-900">{filteredEmployees.length}</span> matching
            <span className="mx-1.5 text-slate-300">/</span>
            <span className="font-medium text-indigo-700">{selectedIds.length}</span> selected
          </span>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-[13px] font-medium text-indigo-600 hover:text-indigo-700"
              >
                Clear filters
              </button>
            )}
            {compact && selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => onChangeSelectedIds([])}
                className="text-[13px] text-slate-500 hover:text-rose-600 font-medium"
              >
                Clear selection
              </button>
            )}
            {filteredEmployees.some((e) => selectedSet.has(e.id)) && (
              <button
                type="button"
                onClick={handleRemoveMatching}
                className="text-[13px] text-slate-500 hover:text-rose-600 font-medium"
              >
                Unselect matching
              </button>
            )}
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={matchingUnselectedIds.length === 0}
              onClick={handleAddAllMatching}
              className="h-8 px-3 gap-1.5 text-[13px] font-medium shadow-none"
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              Add {matchingUnselectedIds.length} to selection
            </Button>
          </div>
        </div>
      </div>

      {/* Filtered Staff List */}
      <div className={`${maxHeightClass} ${listClassName} overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100`}>
        {isLoading ? (
          <div className="py-6 flex justify-center">
            <LoadingSpinner size="sm" text="Loading staff" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-slate-500">
            No active staff match these filters
          </p>
        ) : (
          filteredEmployees.map((emp) => {
            const checked = selectedSet.has(emp.id);
            const sheets = (emp.daily_sheet_ids || []).map((sid) => sheetNameById.get(sid)).filter(Boolean);

            return (
              <label
                key={emp.id}
                className={`flex items-center justify-between gap-3 px-3 py-2 text-[13px] cursor-pointer transition-colors ${
                  checked ? "bg-indigo-50/40" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const on = e.target.checked;
                      onChangeSelectedIds(
                        on
                          ? Array.from(new Set([...selectedIds, emp.id]))
                          : selectedIds.filter((id) => id !== emp.id)
                      );
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800 truncate" title={emp.name}>
                      {formatDisplayName(emp.name) || emp.name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {[emp.designation || emp.employee_type || "Employee", ...(emp.skills || []).slice(0, 2)].join(" · ")}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 min-w-0 max-w-[45%]">
                  {emp.is_idle ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Idle
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 truncate" title={sheets.join(", ")}>
                      {sheets[0]}
                      {sheets.length > 1 && (
                        <span className="ml-1 tabular-nums text-slate-400">+{sheets.length - 1}</span>
                      )}
                    </span>
                  )}
                </div>
              </label>
            );
          })
        )}
      </div>

      {/* Selected Summary Chips */}
      {!compact && selectedIds.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 space-y-1.5">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-medium text-slate-700 tabular-nums">
              Selected roster ({selectedIds.length})
            </span>
            <button
              type="button"
              onClick={() => onChangeSelectedIds([])}
              className="text-[11px] font-medium text-slate-500 hover:text-rose-600"
            >
              Clear selection
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
            {selectedIds.map((eid) => {
              const emp = employeeById.get(eid);
              return (
                <span
                  key={eid}
                  className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-md bg-white border border-slate-200 text-[11px] font-medium text-slate-700"
                  title={emp?.name}
                >
                  {formatDisplayName(emp?.name) || `#${eid}`}
                  <button
                    type="button"
                    onClick={() => onChangeSelectedIds(selectedIds.filter((id) => id !== eid))}
                    className="p-0.5 text-slate-400 hover:text-rose-600"
                    aria-label={`Remove ${emp?.name || eid} from selection`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClustersTab({
  clusters = [],
  isLoading = false,
  assessments = [],
  assignments = [],
  toolsSlot,
}) {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");

  // Create / Edit Cluster Modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingCluster, setEditingCluster] = useState(null);
  const [clusterForm, setClusterForm] = useState({
    name: "",
    description: "",
    mode: "manual", // "manual" | "auto"
    dynamic_scopes: ["full_time"],
    joined_on_or_after: format(new Date(), "yyyy-MM-dd"),
    employee_ids: [],
  });

  // Manage Cluster (Roster + Assignments) Modal
  const [managingCluster, setManagingCluster] = useState(null);
  const [selectedToAdd, setSelectedToAdd] = useState([]);
  const [extendingAssignment, setExtendingAssignment] = useState(null);
  const [extendDeadlineDate, setExtendDeadlineDate] = useState(
    format(addDays(new Date(), 7), "yyyy-MM-dd")
  );

  // Quick Assign Modal from Cluster Card
  const [assigningCluster, setAssigningCluster] = useState(null);
  const [assignAssessmentId, setAssignAssessmentId] = useState("");
  const [deadlineMode, setDeadlineMode] = useState("fixed");
  const [deadlineDate, setDeadlineDate] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [relativeDays, setRelativeDays] = useState(7);

  // Archive Confirmation & Restore Modal
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoreName, setRestoreName] = useState("");
  const [restoreAssignments, setRestoreAssignments] = useState(true);
  const [restoreError, setRestoreError] = useState("");

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Lazy-fetch archived clusters ONLY when the Archived filter is selected
  const { data: archivedClusters = [], isLoading: archivedLoading } = useQuery({
    queryKey: ["archivedClusters"],
    queryFn: async () => {
      const all = await clusterApi.list(true);
      return Array.isArray(all) ? all.filter((c) => c.is_archived) : [];
    },
    enabled: scopeFilter === "archived",
    staleTime: 30 * 1000,
  });

  // Single pooled fetch ONLY when Manual member picker is visible
  const needsPickerData =
    (formOpen && !editingCluster && clusterForm.mode === "manual") ||
    Boolean(managingCluster && !managingCluster.is_dynamic);

  const { data: pickerData, isLoading: pickerLoading } = useQuery({
    queryKey: ["clusterMemberPickerOptions"],
    queryFn: () => clusterApi.getPickerOptions(),
    enabled: needsPickerData,
    staleTime: 2 * 60 * 1000,
  });

  const { data: clusterMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ["clusterMembers", managingCluster?.id],
    queryFn: () => clusterApi.getMembers(managingCluster.id),
    enabled: Boolean(managingCluster?.id),
    staleTime: 30 * 1000,
  });

  const publishedAssessments = useMemo(
    () => assessments.filter((a) => a.status === "published"),
    [assessments]
  );

  const assignmentsByCluster = useMemo(() => {
    const map = new Map();
    assignments.forEach((asg) => {
      if (!asg.is_active) return;
      const list = map.get(asg.cluster_id) || [];
      list.push(asg);
      map.set(asg.cluster_id, list);
    });
    return map;
  }, [assignments]);

  const filteredClusters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const source = scopeFilter === "archived" ? archivedClusters : clusters;
    return source.filter((c) => {
      if (scopeFilter === "dynamic" && !c.is_dynamic) return false;
      if (scopeFilter === "custom" && c.is_dynamic) return false;
      if (!q) return true;
      const scopeNames = getClusterScopes(c).map(clusterScopeLabel).join(" ").toLowerCase();
      return (
        String(c.name || "").toLowerCase().includes(q) ||
        String(c.description || "").toLowerCase().includes(q) ||
        clusterScopeLabel(c.dynamic_scope).toLowerCase().includes(q) ||
        scopeNames.includes(q)
      );
    });
  }, [clusters, archivedClusters, searchQuery, scopeFilter]);

  const memberIdsSet = useMemo(
    () => new Set(clusterMembers.map((m) => m.employee_id)),
    [clusterMembers]
  );

  const createOrUpdateMutation = useMutation({
    mutationFn: ({ id, payload }) => (id ? clusterApi.update(id, payload) : clusterApi.create(payload)),
    onSuccess: (saved, vars) => {
      queryClient.setQueryData(["clusters"], (old) => {
        if (!Array.isArray(old)) return [saved];
        return vars.id ? old.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...old];
      });
      if (managingCluster?.id === saved.id) {
        setManagingCluster(saved);
        queryClient.invalidateQueries({ queryKey: ["clusterMembers", saved.id] });
      }
      queryClient.invalidateQueries({ queryKey: ["adminEnrollments"] });
      toast.success(vars.id ? "Cluster updated" : "Cluster created");
      setFormOpen(false);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || "Could not save cluster.");
    },
  });

  const addMembersMutation = useMutation({
    mutationFn: ({ clusterId, employeeIds }) => clusterApi.addMembers(clusterId, employeeIds),
    onSuccess: (res, vars) => {
      if (res?.cluster) {
        queryClient.setQueryData(["clusters"], (old) =>
          Array.isArray(old) ? old.map((c) => (c.id === res.cluster.id ? res.cluster : c)) : old
        );
        setManagingCluster(res.cluster);
      }
      queryClient.invalidateQueries({ queryKey: ["clusterMembers", vars.clusterId] });
      queryClient.invalidateQueries({ queryKey: ["adminEnrollments"] });
      setSelectedToAdd([]);
      toast.success(res?.detail || "Members added");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || "Could not add members.");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ clusterId, employeeId }) => clusterApi.removeMember(clusterId, employeeId),
    onSuccess: (res, vars) => {
      if (res?.cluster) {
        queryClient.setQueryData(["clusters"], (old) =>
          Array.isArray(old) ? old.map((c) => (c.id === res.cluster.id ? res.cluster : c)) : old
        );
        setManagingCluster(res.cluster);
      }
      queryClient.setQueryData(["clusterMembers", vars.clusterId], (old) =>
        Array.isArray(old) ? old.filter((m) => m.employee_id !== vars.employeeId) : old
      );
      queryClient.invalidateQueries({ queryKey: ["adminEnrollments"] });
      toast.success("Member removed");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || "Could not remove member.");
    },
  });

  const extendAssignmentMutation = useMutation({
    mutationFn: ({ assignmentId, newDeadline }) =>
      assignmentApi.updateDeadline(assignmentId, newDeadline),
    onSuccess: (updatedAsg) => {
      queryClient.setQueriesData({ queryKey: ["assignments"] }, (old) =>
        Array.isArray(old) ? old.map((a) => (a.id === updatedAsg.id ? updatedAsg : a)) : old
      );
      queryClient.invalidateQueries({ queryKey: ["adminEnrollments"] });
      toast.success("Cohort deadline updated");
      setExtendingAssignment(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || "Could not extend cohort deadline.");
    },
  });

  const deactivateAssignmentMutation = useMutation({
    mutationFn: (assignmentId) => assignmentApi.deactivate(assignmentId),
    onSuccess: (_, assignmentId) => {
      let targetClusterId = null;
      queryClient.setQueriesData({ queryKey: ["assignments"] }, (old) => {
        if (!Array.isArray(old)) return old;
        const found = old.find((a) => a.id === assignmentId);
        targetClusterId = found?.cluster_id;
        return old.filter((a) => a.id !== assignmentId);
      });
      if (targetClusterId) {
        queryClient.setQueryData(["clusters"], (old) =>
          Array.isArray(old)
            ? old.map((c) =>
                c.id === targetClusterId
                  ? { ...c, active_assignments_count: Math.max(0, Number(c.active_assignments_count || 1) - 1) }
                  : c
              )
            : old
        );
      }
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      queryClient.invalidateQueries({ queryKey: ["adminEnrollments"] });
      toast.success("Assignment deactivated");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || "Could not deactivate assignment.");
    },
  });

  const assignMutation = useMutation({
    mutationFn: (payload) => assignmentApi.create(payload),
    onSuccess: (createdAsg) => {
      queryClient.setQueriesData({ queryKey: ["assignments"] }, (old) =>
        Array.isArray(old) ? [createdAsg, ...old] : [createdAsg]
      );
      queryClient.setQueryData(["clusters"], (old) =>
        Array.isArray(old)
          ? old.map((c) =>
              c.id === createdAsg.cluster_id
                ? { ...c, active_assignments_count: Number(c.active_assignments_count || 0) + 1 }
                : c
            )
          : old
      );
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      queryClient.invalidateQueries({ queryKey: ["adminEnrollments"] });
      toast.success(`Assigned (${createdAsg.total_enrolled || 0} enrolled)`);
      setAssigningCluster(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || "Assignment failed.");
    },
  });

  const remindClusterMutation = useMutation({
    mutationFn: (clusterId) => assessmentApi.sendReminders({ cluster_id: clusterId }),
    onSuccess: (res) => {
      toast.success(res?.detail || "Reminders queued");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || "Could not send reminders.");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => clusterApi.archive(id),
    onSuccess: (_, archivedId) => {
      let archivedItem = null;
      queryClient.setQueryData(["clusters"], (old) => {
        if (!Array.isArray(old)) return old;
        archivedItem = old.find((c) => c.id === archivedId) || null;
        return old.filter((c) => c.id !== archivedId);
      });
      if (archivedItem) {
        queryClient.setQueryData(["archivedClusters"], (old) =>
          Array.isArray(old)
            ? [{ ...archivedItem, is_archived: true, active_assignments_count: 0 }, ...old]
            : old
        );
      }
      queryClient.setQueriesData({ queryKey: ["assignments"] }, (old) =>
        Array.isArray(old) ? old.filter((a) => a.cluster_id !== archivedId) : old
      );
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      queryClient.invalidateQueries({ queryKey: ["adminEnrollments"] });
      toast.success("Cluster archived");
      setArchiveTarget(null);
      if (managingCluster?.id === archivedId) setManagingCluster(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || "Could not archive cluster.");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: ({ id, name, restore_assignments }) =>
      clusterApi.restore(id, { ...(name ? { name } : {}), restore_assignments }),
    onSuccess: (restored, vars) => {
      queryClient.setQueryData(["archivedClusters"], (old) =>
        Array.isArray(old) ? old.filter((c) => c.id !== restored.id) : old
      );
      queryClient.setQueryData(["clusters"], (old) =>
        Array.isArray(old)
          ? [...old.filter((c) => c.id !== restored.id), restored].sort((a, b) =>
              String(a.name || "").localeCompare(String(b.name || ""))
            )
          : [restored]
      );
      if (vars.restore_assignments) {
        queryClient.invalidateQueries({ queryKey: ["assignments"] });
        queryClient.invalidateQueries({ queryKey: ["assessments"] });
        queryClient.invalidateQueries({ queryKey: ["adminEnrollments"] });
      }
      toast.success(`Cluster "${restored.name}" restored`);
      setRestoreTarget(null);
      setRestoreName("");
      setRestoreError("");
    },
    onError: (err) => {
      setRestoreError(err?.response?.data?.detail || "Could not restore cluster.");
    },
  });

  const openRestoreModal = (cluster) => {
    setRestoreTarget(cluster);
    setRestoreName(cluster.name || "");
    setRestoreAssignments(true);
    setRestoreError("");
  };

  const restoreOriginalConflict = Boolean(
    restoreTarget &&
      clusters.some(
        (c) => c.name.trim().toLowerCase() === String(restoreTarget.name || "").trim().toLowerCase()
      )
  );
  const restoreCurrentConflict = Boolean(
    restoreTarget &&
      restoreName.trim() &&
      clusters.some((c) => c.name.trim().toLowerCase() === restoreName.trim().toLowerCase())
  );

  const openCreateModal = () => {
    setEditingCluster(null);
    setClusterForm({
      name: "",
      description: "",
      mode: "manual",
      dynamic_scopes: ["full_time"],
      joined_on_or_after: format(new Date(), "yyyy-MM-dd"),
      employee_ids: [],
    });
    setFormOpen(true);
  };

  const openEditModal = (cluster) => {
    const activeScopes = getClusterScopes(cluster);
    setEditingCluster(cluster);
    setClusterForm({
      name: cluster.name || "",
      description: cluster.description || "",
      mode: activeScopes.length > 0 ? "auto" : "manual",
      dynamic_scopes: activeScopes.length > 0 ? activeScopes : ["full_time"],
      joined_on_or_after: cluster.joined_on_or_after || format(new Date(), "yyyy-MM-dd"),
      employee_ids: [],
    });
    setFormOpen(true);
  };

  const toggleAutoScope = (scopeVal) => {
    setClusterForm((prev) => {
      const current = prev.dynamic_scopes || [];
      const exists = current.includes(scopeVal);
      if (scopeVal === "everyone") {
        return { ...prev, dynamic_scopes: exists ? [] : ["everyone"] };
      }
      const withoutEveryone = current.filter((s) => s !== "everyone");
      const next = exists
        ? withoutEveryone.filter((s) => s !== scopeVal)
        : [...withoutEveryone, scopeVal];
      return { ...prev, dynamic_scopes: next };
    });
  };

  const handleClusterSubmit = (e) => {
    e.preventDefault();
    if (!clusterForm.name.trim()) {
      toast.error("Cluster name is required.");
      return;
    }

    const isAuto = clusterForm.mode === "auto";
    if (isAuto && clusterForm.dynamic_scopes.length === 0) {
      toast.error("Select at least one auto-membership rule or switch to Manual roster.");
      return;
    }
    const hasNewJoiners = isAuto && clusterForm.dynamic_scopes.includes("new_joiners");
    if (hasNewJoiners && !clusterForm.joined_on_or_after) {
      toast.error("Select a joining cut-off date for New Joiners.");
      return;
    }

    const payload = isAuto
      ? {
          name: clusterForm.name.trim(),
          description: clusterForm.description.trim() || null,
          dynamic_scopes: clusterForm.dynamic_scopes,
          joined_on_or_after: hasNewJoiners ? clusterForm.joined_on_or_after : null,
        }
      : {
          name: clusterForm.name.trim(),
          description: clusterForm.description.trim() || null,
          dynamic_scope: "custom",
          dynamic_scopes: [],
          joined_on_or_after: null,
        };

    if (!editingCluster && !isAuto && clusterForm.employee_ids.length > 0) {
      payload.employee_ids = clusterForm.employee_ids;
    }

    createOrUpdateMutation.mutate({ id: editingCluster?.id, payload });
  };

  const openAssignModal = (cluster) => {
    const activeIds = new Set((assignmentsByCluster.get(cluster.id) || []).map((a) => a.assessment_id));
    const available = publishedAssessments.filter((a) => !activeIds.has(a.id));
    setAssignAssessmentId(available[0] ? String(available[0].id) : "");
    setDeadlineMode("fixed");
    setDeadlineDate(format(addDays(new Date(), 7), "yyyy-MM-dd"));
    setRelativeDays(7);
    setAssigningCluster(cluster);
  };

  const handleAssignSubmit = (e) => {
    e.preventDefault();
    if (!assigningCluster || !assignAssessmentId) {
      toast.error("Select a published assessment.");
      return;
    }
    const payload = {
      cluster_id: assigningCluster.id,
      assessment_id: Number(assignAssessmentId),
    };
    if (deadlineMode === "fixed") {
      const dl = new Date(`${deadlineDate}T23:59:59`);
      if (dl <= new Date()) {
        toast.error("Deadline must be in the future.");
        return;
      }
      payload.deadline = dl.toISOString();
    } else {
      payload.relative_due_days = Math.max(1, Math.min(365, Number(relativeDays) || 7));
    }
    assignMutation.mutate(payload);
  };

  const toolbarControls = (
    <>
      <SearchBar
        placeholder="Search clusters or rules"
        value={searchQuery}
        onChange={setSearchQuery}
        size="sm"
        width="w-56"
      />
      <Select
        value={scopeFilter}
        onChange={setScopeFilter}
        ariaLabel="Filter cluster type"
        align="right"
        className="w-44"
        options={[
          { value: "all", label: "All clusters", hint: String(clusters.length) },
          {
            value: "dynamic",
            label: "Auto-membership",
            dot: "bg-indigo-500",
            hint: String(clusters.filter((c) => c.is_dynamic).length),
          },
          {
            value: "custom",
            label: "Manual rosters",
            dot: "bg-slate-400",
            hint: String(clusters.filter((c) => !c.is_dynamic).length),
          },
          {
            value: "archived",
            label: "Archived",
            dot: "bg-rose-400",
          },
        ]}
      />
      <Button onClick={openCreateModal} className={`${ui.btnPrimary} whitespace-nowrap`}>
        <Plus className="h-4 w-4" strokeWidth={1.75} /> New cluster
      </Button>
    </>
  );

  const effectiveLoading = scopeFilter === "archived" ? archivedLoading : isLoading;

  if (effectiveLoading) {
    return (
      <>
        {toolsSlot && createPortal(toolbarControls, toolsSlot)}
        <div className={`${ui.panel} py-16 flex items-center justify-center`}>
          <LoadingSpinner size="md" text="Loading clusters..." />
        </div>
      </>
    );
  }

  return (
    <div className="space-y-4">
      {toolsSlot ? (
        createPortal(toolbarControls, toolsSlot)
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {toolbarControls}
        </div>
      )}

      {/* Cluster Grid */}
      {filteredClusters.length === 0 ? (
        <div className={`${ui.panel} py-16 px-6 text-center`}>
          <div className="mx-auto w-11 h-11 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <Users2 className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <h3 className={ui.heading}>
            {scopeFilter === "archived"
              ? "No archived clusters"
              : clusters.length === 0
                ? "No clusters created yet"
                : "No clusters match your search"}
          </h3>
          <p className={`${ui.muted} mt-1 max-w-md mx-auto`}>
            {scopeFilter === "archived"
              ? "Archived cohorts appear here with their member rosters preserved."
              : "Create manual rosters (filter & bulk-add by Daily Sheet, Idle, Designation, or Skills) or set multi-rule auto-membership cohorts."}
          </p>
          {clusters.length === 0 && scopeFilter !== "archived" && (
            <Button onClick={openCreateModal} className={`${ui.btnPrimary} mt-4`}>
              <Plus className="h-4 w-4" /> Create first cluster
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredClusters.map((cluster) => {
            const clusterAsgs = assignmentsByCluster.get(cluster.id) || [];
            const availableForAssign = publishedAssessments.filter(
              (a) => !clusterAsgs.some((ca) => ca.assessment_id === a.id)
            );
            const activeScopes = getClusterScopes(cluster);
            const now = new Date();

            return (
              <div key={cluster.id} className={`${ui.panel} p-5 flex flex-col justify-between gap-4`}>
                <div className="space-y-4">
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[16px] font-semibold text-slate-900 leading-snug">
                          {cluster.name}
                        </h3>
                        {activeScopes.length > 0 ? (
                          activeScopes.map((sc) => (
                            <span
                              key={sc}
                              className="inline-flex items-center gap-1 h-5 px-2 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/80"
                            >
                              <RefreshCw className="h-3 w-3 text-indigo-500" strokeWidth={1.75} />
                              {clusterScopeLabel(sc)}
                            </span>
                          ))
                        ) : (
                          <span className="inline-flex items-center gap-1 h-5 px-2 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/80">
                            <Users2 className="h-3 w-3 text-slate-500" strokeWidth={1.75} />
                            Manual roster
                          </span>
                        )}
                        {activeScopes.includes("new_joiners") && cluster.joined_on_or_after && (
                          <span className="text-[11px] text-slate-500 tabular-nums">
                            Joined &ge; {cluster.joined_on_or_after}
                          </span>
                        )}
                        {cluster.is_archived && (
                          <span className="inline-flex items-center h-5 px-2 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            Archived
                          </span>
                        )}
                      </div>
                      {cluster.description &&
                        cluster.description.trim().toLowerCase() !== cluster.name.trim().toLowerCase() && (
                          <p className="text-[13px] text-slate-500 mt-1 line-clamp-2">
                            {cluster.description}
                          </p>
                        )}
                    </div>

                    {!cluster.is_archived && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditModal(cluster)}
                          className={ui.iconBtn}
                          title="Edit cluster settings"
                          aria-label="Edit cluster settings"
                        >
                          <Pencil className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setArchiveTarget(cluster)}
                          className={`${ui.iconBtn} hover:text-rose-600 hover:bg-rose-50`}
                          title="Archive cluster"
                          aria-label="Archive cluster"
                        >
                          <Archive className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Cohort metrics strip */}
                  <div className="flex flex-wrap items-center gap-4 text-[13px] text-slate-600 tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      <Users2 className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
                      <span className="font-semibold text-slate-900">{cluster.member_count || 0}</span>
                      <span>{(cluster.member_count || 0) === 1 ? "member" : "members"}</span>
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="inline-flex items-center gap-1.5">
                      <Layers
                        className={`h-4 w-4 ${clusterAsgs.length > 0 ? "text-indigo-500" : "text-slate-400"}`}
                        strokeWidth={1.5}
                      />
                      <span
                        className={`font-semibold ${
                          clusterAsgs.length > 0 ? "text-indigo-600" : "text-slate-900"
                        }`}
                      >
                        {clusterAsgs.length}
                      </span>
                      <span>{clusterAsgs.length === 1 ? "active assignment" : "active assignments"}</span>
                    </span>
                  </div>

                  {/* Assigned assessments */}
                  {clusterAsgs.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                        <span>Assigned assessments</span>
                        <span className="tabular-nums text-slate-400">{clusterAsgs.length}</span>
                      </div>
                      <div className="space-y-2">
                        {clusterAsgs.map((asg) => {
                          const totalEnrolled = Number(asg.total_enrolled || 0);
                          const completed = Number(asg.completed_count || 0);
                          const passedCount = Number(asg.passed_count || 0);
                          const inProgressCount = Number(asg.in_progress_count || 0);
                          const pct =
                            totalEnrolled > 0 ? Math.min(100, Math.round((completed / totalEnrolled) * 100)) : 0;
                          const dlDate = asg.deadline ? new Date(asg.deadline) : null;
                          const isOverdue = Boolean(dlDate && dlDate < now && completed < totalEnrolled);
                          const isDueSoon = Boolean(
                            dlDate &&
                              !isOverdue &&
                              dlDate.getTime() - now.getTime() <= 72 * 60 * 60 * 1000 &&
                              completed < totalEnrolled
                          );

                          return (
                            <div
                              key={asg.id}
                              className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3 space-y-2.5"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-[13.5px] font-medium text-slate-900 leading-snug">
                                  {asg.assessment_title || `Assessment #${asg.assessment_id}`}
                                </span>
                                {asg.relative_due_days ? (
                                  <span className="inline-flex items-center gap-1 h-5 px-2 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-[11px] font-medium shrink-0 tabular-nums">
                                    <Clock className="h-3 w-3" strokeWidth={1.75} />
                                    Rolling +{asg.relative_due_days}d
                                  </span>
                                ) : dlDate ? (
                                  <span
                                    className={`inline-flex items-center gap-1 h-5 px-2 rounded-md border text-[11px] font-medium shrink-0 tabular-nums ${
                                      isOverdue
                                        ? "bg-rose-50 text-rose-700 border-rose-200"
                                        : isDueSoon
                                          ? "bg-amber-50 text-amber-700 border-amber-200"
                                          : "bg-white text-slate-600 border-slate-200"
                                    }`}
                                    title={`Deadline: ${format(dlDate, "d MMM yyyy, HH:mm")}`}
                                  >
                                    <Calendar className="h-3 w-3" strokeWidth={1.75} />
                                    {isOverdue ? "Overdue · " : "Due "}
                                    {format(dlDate, "d MMM yyyy")}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-400 shrink-0">No deadline</span>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                <div
                                  className="flex-1 h-1.5 rounded-full bg-slate-200/80 overflow-hidden"
                                  role="progressbar"
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-valuenow={pct}
                                >
                                  <div
                                    className={`h-full rounded-full transition-[width] duration-300 ${
                                      pct === 100 ? "bg-emerald-500" : "bg-indigo-500"
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <div className="flex items-center gap-1.5 text-xs tabular-nums shrink-0">
                                  <span
                                    className={
                                      completed > 0
                                        ? "font-semibold text-indigo-600"
                                        : "font-medium text-slate-700"
                                    }
                                  >
                                    {completed}/{totalEnrolled}
                                  </span>
                                  <span className="text-slate-500">attempted</span>
                                  {passedCount > 0 && (
                                    <>
                                      <span className="text-slate-300">·</span>
                                      <span className="font-medium text-emerald-600">
                                        {passedCount} passed
                                      </span>
                                    </>
                                  )}
                                  {inProgressCount > 0 && (
                                    <>
                                      <span className="text-slate-300">·</span>
                                      <span className="font-medium text-sky-600">
                                        {inProgressCount} live
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-xs text-slate-400">
                      No assessments assigned to this cluster yet
                    </div>
                  )}
                </div>

                {/* Card actions */}
                {cluster.is_archived ? (
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                    <span className="text-[12px] text-slate-500">
                      Roster preserved · assignments deactivated
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className={ui.btnQuiet}
                      onClick={() => openRestoreModal(cluster)}
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-indigo-600" /> Restore cluster
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className={ui.btnQuiet}
                        onClick={() => {
                          setSelectedToAdd([]);
                          setManagingCluster(cluster);
                        }}
                      >
                        <UserCheck className="h-3.5 w-3.5 text-slate-500" />
                        Roster &amp; schedules
                      </Button>
                      {clusterAsgs.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className={ui.btnQuiet}
                          disabled={remindClusterMutation.isPending}
                          onClick={() => remindClusterMutation.mutate(cluster.id)}
                          title="Send in-app and Slack reminders to pending candidates in this cluster"
                        >
                          <Bell className="h-3.5 w-3.5 text-amber-600" /> Remind pending
                        </Button>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className={
                        availableForAssign.length > 0
                          ? "h-8 px-3 gap-1.5 rounded-lg text-[13px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 shadow-none transition-colors"
                          : ui.btnQuiet
                      }
                      disabled={availableForAssign.length === 0}
                      title={
                        publishedAssessments.length === 0
                          ? "Publish an assessment first"
                          : availableForAssign.length === 0
                            ? "All published assessments are already assigned to this cluster"
                            : "Assign assessment to cluster"
                      }
                      onClick={() => openAssignModal(cluster)}
                    >
                      <Send className="h-3.5 w-3.5" /> Assign
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Cluster Modal */}
      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} size="2xl" maxHeight="94vh">
        <Modal.Header onClose={() => setFormOpen(false)}>
          <h3 className="text-base font-medium text-slate-900">
            {editingCluster ? "Edit cluster" : "New cluster"}
          </h3>
          <p className="text-[13px] text-slate-500 mt-1">
            Group staff to assign trainings and assessments together
          </p>
        </Modal.Header>
        <form onSubmit={handleClusterSubmit} className="flex min-h-0 flex-1 flex-col">
          <Modal.Body className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={ui.label}>Cluster name</label>
                <input
                  type="text"
                  required
                  value={clusterForm.name}
                  onChange={(e) => setClusterForm((p) => ({ ...p, name: e.target.value }))}
                  className={ui.input}
                  placeholder="e.g., Pre-test for Walden"
                />
              </div>
              <div>
                <label className={ui.label}>Description (optional)</label>
                <input
                  type="text"
                  value={clusterForm.description}
                  onChange={(e) => setClusterForm((p) => ({ ...p, description: e.target.value }))}
                  className={ui.input}
                  placeholder="What this cohort is for"
                />
              </div>
            </div>

            {/* Membership Mode Selector */}
            <div>
              <label className={ui.label}>Membership rule</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Membership rule">
                {[
                  {
                    value: "manual",
                    title: "Manual roster",
                    hint: "Pick people by sheet, idle status, skill or role",
                  },
                  {
                    value: "auto",
                    title: "Auto membership",
                    hint: "Rules match staff now and as they join",
                  },
                ].map((opt) => {
                  const on = clusterForm.mode === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setClusterForm((p) => ({ ...p, mode: opt.value }))}
                      className={`flex items-start gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 ${
                        on
                          ? "bg-white border-indigo-500 ring-1 ring-indigo-500"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span
                        className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border flex items-center justify-center ${
                          on ? "border-indigo-600" : "border-slate-300"
                        }`}
                      >
                        {on && <span className="h-2 w-2 rounded-full bg-indigo-600" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-900">{opt.title}</span>
                        <span className="block text-xs text-slate-500 mt-0.5">{opt.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {clusterForm.mode === "auto" ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
                <div className="text-[13px] text-slate-600">
                  Staff matching <span className="font-medium text-slate-900">any</span> selected rule join now and in future
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AUTO_CLUSTER_SCOPES.map((sc) => {
                    const checked = clusterForm.dynamic_scopes.includes(sc.value);
                    return (
                      <button
                        key={sc.value}
                        type="button"
                        onClick={() => toggleAutoScope(sc.value)}
                        className={`px-3 py-2 rounded-lg border text-left flex items-center justify-between gap-2 transition-colors ${
                          checked
                            ? "bg-white border-indigo-400 ring-1 ring-indigo-200 text-slate-900"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium">{sc.label}</div>
                          <div className="text-xs text-slate-500">{sc.hint}</div>
                        </div>
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                            checked
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {checked && <Check className="h-3 w-3" strokeWidth={2.5} />}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {clusterForm.dynamic_scopes.includes("new_joiners") && (
                  <div className="pt-2 border-t border-slate-200">
                    <label className={ui.label}>Joined on or after</label>
                    <DatePicker
                      value={clusterForm.joined_on_or_after}
                      onChange={(e) =>
                        setClusterForm((p) => ({ ...p, joined_on_or_after: e.target.value }))
                      }
                      accentColor="indigo"
                    />
                    <p className={ui.hint}>
                      Active staff who joined on or after this date are added automatically
                    </p>
                  </div>
                )}
              </div>
            ) : !editingCluster ? (
              <SmartMemberPicker
                compact
                maxHeightClass="max-h-none"
                listClassName="h-72 shrink-0"
                pickerData={pickerData}
                isLoading={pickerLoading}
                selectedIds={clusterForm.employee_ids}
                onChangeSelectedIds={(next) =>
                  setClusterForm((p) => ({ ...p, employee_ids: next }))
                }
              />
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[12px] text-slate-600">
                Manual roster edits (add/remove by Daily Sheet, Idle, Designation, or Skills) are managed under{" "}
                <strong>Roster &amp; schedules</strong> on the cluster card.
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="cancel" size="sm" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={createOrUpdateMutation.isPending}
              loadingText="Saving"
            >
              {editingCluster ? "Save cluster" : "Create cluster"}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Manage Cluster Roster & Schedules Modal */}
      <Modal isOpen={Boolean(managingCluster)} onClose={() => setManagingCluster(null)} size="4xl">
        <Modal.Header onClose={() => setManagingCluster(null)}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[16px] font-semibold text-slate-900">
              {managingCluster?.name}
            </h3>
            {getClusterScopes(managingCluster).length > 0 ? (
              getClusterScopes(managingCluster).map((sc) => (
                <span key={sc} className={ui.tag}>
                  {clusterScopeLabel(sc)}
                </span>
              ))
            ) : (
              <span className={ui.tag}>Manual roster</span>
            )}
          </div>
          <p className="text-[12px] text-slate-500 mt-0.5">
            {managingCluster?.is_dynamic
              ? "Auto-synced roster matching any active rule above; future matching joiners are added automatically."
              : "Add or remove manual members using Daily Sheet, Idle, Skills, or Designation helpers."}
          </p>
        </Modal.Header>
        <Modal.Body className="space-y-6">
          {/* Active Assignments Schedule Section */}
          <div className="space-y-2.5">
            <h4 className="text-[13px] font-semibold text-slate-800">Active assignments</h4>
            {(assignmentsByCluster.get(managingCluster?.id) || []).length === 0 ? (
              <p className={ui.muted}>No active assessments assigned to this cluster yet.</p>
            ) : (
              <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                {(assignmentsByCluster.get(managingCluster?.id) || []).map((asg) => (
                  <div
                    key={asg.id}
                    className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[13px]"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">
                        {asg.assessment_title}
                      </div>
                      <div className="text-[12px] text-slate-500 tabular-nums mt-0.5">
                        <span className="font-medium text-indigo-600">{asg.completed_count || 0}/{asg.total_enrolled || 0}</span> attempted
                        {(asg.passed_count || 0) > 0 && (
                          <>
                            {" · "}
                            <span className="font-medium text-emerald-600">{asg.passed_count} passed</span>
                          </>
                        )}
                        {" · "}
                        {asg.relative_due_days
                          ? `Rolling +${asg.relative_due_days} days`
                          : asg.deadline
                            ? `Cohort deadline: ${format(new Date(asg.deadline), "d MMM yyyy, HH:mm")}`
                            : "No deadline"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!asg.relative_due_days && (
                        <Button
                          variant="outline"
                          size="sm"
                          className={ui.btnQuiet}
                          onClick={() => {
                            setExtendingAssignment(asg);
                            setExtendDeadlineDate(
                              asg.deadline
                                ? format(addDays(new Date(asg.deadline), 3), "yyyy-MM-dd")
                                : format(addDays(new Date(), 7), "yyyy-MM-dd")
                            );
                          }}
                        >
                          <Calendar className="h-3.5 w-3.5" /> Extend cohort
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-[12px] text-rose-600 border-rose-200 hover:bg-rose-50"
                        disabled={deactivateAssignmentMutation.isPending}
                        onClick={() => deactivateAssignmentMutation.mutate(asg.id)}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Deactivate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Members Panel (Custom Clusters only) */}
          {managingCluster && !managingCluster.is_dynamic && (
            <div className="space-y-3 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-slate-800 flex items-center gap-1.5">
                  <UserPlus className="h-4 w-4 text-indigo-600" /> Add members to roster
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={selectedToAdd.length === 0}
                  isLoading={addMembersMutation.isPending}
                  loadingText="Adding..."
                  onClick={() =>
                    addMembersMutation.mutate({
                      clusterId: managingCluster.id,
                      employeeIds: selectedToAdd,
                    })
                  }
                >
                  Add {selectedToAdd.length} selected to cluster
                </Button>
              </div>
              <SmartMemberPicker
                pickerData={pickerData}
                isLoading={pickerLoading}
                selectedIds={selectedToAdd}
                onChangeSelectedIds={setSelectedToAdd}
                excludeEmployeeIds={memberIdsSet}
                maxHeightClass="max-h-48"
              />
            </div>
          )}

          {/* Current Members List */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <h4 className="text-[13px] font-semibold text-slate-800 tabular-nums">
              Current roster ({clusterMembers.length})
            </h4>
            {membersLoading ? (
              <div className="py-8 flex justify-center">
                <LoadingSpinner size="sm" text="Loading members..." />
              </div>
            ) : clusterMembers.length === 0 ? (
              <p className={ui.muted}>No active members in this cluster.</p>
            ) : (
              <div className="rounded-lg border border-slate-200 max-h-60 overflow-y-auto divide-y divide-slate-100">
                {clusterMembers.map((m) => (
                  <div
                    key={m.employee_id}
                    className="px-3.5 py-2 flex items-center justify-between gap-3 text-[13px]"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-slate-900" title={m.name}>
                        {formatDisplayName(m.name) || m.name}
                      </span>
                      <span className="text-slate-400 ml-2 text-[12px]">{m.email}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] text-slate-500">
                        {m.designation || m.employee_type || "Employee"}
                      </span>
                      {!managingCluster?.is_dynamic && (
                        <button
                          type="button"
                          onClick={() =>
                            removeMemberMutation.mutate({
                              clusterId: managingCluster.id,
                              employeeId: m.employee_id,
                            })
                          }
                          disabled={removeMemberMutation.isPending}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Remove from roster"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="cancel" size="sm" onClick={() => setManagingCluster(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Extend Cohort Deadline Modal */}
      <Modal
        isOpen={Boolean(extendingAssignment)}
        onClose={() => setExtendingAssignment(null)}
        size="sm"
      >
        <Modal.Header onClose={() => setExtendingAssignment(null)}>
          <h3 className="text-[15px] font-semibold text-slate-900">Extend cohort deadline</h3>
          <p className="text-[12px] text-slate-500 mt-0.5 truncate">
            {extendingAssignment?.assessment_title}
          </p>
        </Modal.Header>
        <Modal.Body className="space-y-3">
          <DatePicker
            value={extendDeadlineDate}
            minDate={todayStr}
            onChange={(e) => setExtendDeadlineDate(e.target.value)}
            accentColor="indigo"
          />
          <p className={ui.hint}>
            Updates cohort baseline and preserves longer individual extensions automatically.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="cancel" size="sm" onClick={() => setExtendingAssignment(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={extendAssignmentMutation.isPending}
            loadingText="Updating..."
            onClick={() => {
              const dl = new Date(`${extendDeadlineDate}T23:59:59`);
              if (dl <= new Date()) {
                toast.error("Deadline must be in the future.");
                return;
              }
              extendAssignmentMutation.mutate({
                assignmentId: extendingAssignment.id,
                newDeadline: dl.toISOString(),
              });
            }}
          >
            Update deadline
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Quick Assign Assessment Modal */}
      <Modal isOpen={Boolean(assigningCluster)} onClose={() => setAssigningCluster(null)} size="md">
        <Modal.Header onClose={() => setAssigningCluster(null)}>
          <h3 className="text-[16px] font-semibold text-slate-900">
            Assign assessment to {assigningCluster?.name}
          </h3>
        </Modal.Header>
        <form onSubmit={handleAssignSubmit} className="flex min-h-0 flex-1 flex-col">
          <Modal.Body className="space-y-4">
            <div>
              <label className={ui.label}>Published assessment</label>
              <Select
                value={assignAssessmentId}
                onChange={setAssignAssessmentId}
                ariaLabel="Published assessment"
                className="w-full"
                options={publishedAssessments
                  .filter(
                    (a) =>
                      !(assignmentsByCluster.get(assigningCluster?.id) || []).some(
                        (ca) => ca.assessment_id === a.id
                      )
                  )
                  .map((a) => ({
                    value: String(a.id),
                    label: a.title,
                    hint: `${a.duration_minutes}m`,
                  }))}
              />
            </div>

            <div className="space-y-2">
              <label className={ui.label}>Deadline mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeadlineMode("fixed")}
                  className={`h-9 px-3 rounded-lg border text-[13px] font-medium flex items-center justify-center gap-1.5 ${
                    deadlineMode === "fixed"
                      ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                      : "bg-white border-slate-200 text-slate-600"
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5" /> Fixed date
                </button>
                <button
                  type="button"
                  onClick={() => setDeadlineMode("rolling")}
                  className={`h-9 px-3 rounded-lg border text-[13px] font-medium flex items-center justify-center gap-1.5 ${
                    deadlineMode === "rolling"
                      ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                      : "bg-white border-slate-200 text-slate-600"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" /> Rolling days
                </button>
              </div>
              {deadlineMode === "fixed" ? (
                <DatePicker
                  value={deadlineDate}
                  minDate={todayStr}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  accentColor="indigo"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={relativeDays}
                    onChange={(e) => setRelativeDays(e.target.value)}
                    className={`${ui.input} w-28 tabular-nums`}
                  />
                  <span className="text-[13px] text-slate-600">days after candidate enrollment</span>
                </div>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="cancel" size="sm" onClick={() => setAssigningCluster(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={assignMutation.isPending}
              loadingText="Enrolling..."
            >
              Assign &amp; enroll
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => archiveTarget && archiveMutation.mutate(archiveTarget.id)}
        isPending={archiveMutation.isPending}
        variant="danger"
        title="Archive cluster?"
        message={`"${archiveTarget?.name || ""}" will be archived and all active cluster assignments will be deactivated.`}
        details="Pending unstarted enrollments unique to this cluster will be cancelled; completed scorecards stay preserved."
        confirmText="Archive cluster"
      />

      {/* Restore / Unarchive Cluster Modal (with active-name collision guard) */}
      <Modal
        isOpen={Boolean(restoreTarget)}
        onClose={() => {
          setRestoreTarget(null);
          setRestoreName("");
          setRestoreError("");
        }}
        size="md"
      >
        <Modal.Header
          onClose={() => {
            setRestoreTarget(null);
            setRestoreName("");
            setRestoreError("");
          }}
        >
          <h3 className="text-base font-semibold text-slate-900">Restore archived cluster</h3>
          <p className="text-[13px] text-slate-500 mt-1">
            Restores the cluster and its preserved roster ({restoreTarget?.member_count || 0}{" "}
            {(restoreTarget?.member_count || 0) === 1 ? "member" : "members"}).{" "}
            {restoreAssignments
              ? "Eligible non-expired test assignments will also be re-activated."
              : "Old deactivated assignments remain inactive until re-assigned."}
          </p>
        </Modal.Header>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!restoreTarget || !restoreName.trim() || restoreCurrentConflict) return;
            setRestoreError("");
            restoreMutation.mutate({
              id: restoreTarget.id,
              name: restoreName.trim(),
              restore_assignments: restoreAssignments,
            });
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <Modal.Body className="space-y-4">
            {restoreOriginalConflict && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2.5 text-[13px] text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Name conflict:</span> An active cluster named{" "}
                  <span className="font-semibold">&ldquo;{restoreTarget?.name}&rdquo;</span> already
                  exists. Enter a different unique name below to restore this cluster without
                  clashing rosters.
                </div>
              </div>
            )}

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Cluster name
              </label>
              <input
                type="text"
                required
                maxLength={255}
                value={restoreName}
                onChange={(e) => {
                  setRestoreName(e.target.value);
                  setRestoreError("");
                }}
                placeholder="Enter a unique active cluster name"
                className={ui.input}
              />
              {restoreCurrentConflict && (
                <p className="text-[12px] text-rose-600 mt-1.5">
                  An active cluster with this name already exists. Please choose a different name.
                </p>
              )}
              {restoreError && !restoreCurrentConflict && (
                <p className="text-[12px] text-rose-600 mt-1.5">{restoreError}</p>
              )}
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50/70 cursor-pointer text-[13px]">
              <input
                type="checkbox"
                checked={restoreAssignments}
                onChange={(e) => setRestoreAssignments(e.target.checked)}
                className="mt-0.5 rounded accent-indigo-600"
              />
              <div>
                <div className="font-medium text-slate-800">
                  Also re-activate previous non-expired test assignments
                </div>
                <div className="text-[12px] text-slate-500 mt-0.5">
                  Restores published test schedules on this cluster whose deadline has not passed.
                </div>
              </div>
            </label>
          </Modal.Body>
          <Modal.Footer>
            <Button
              type="button"
              variant="cancel"
              size="sm"
              onClick={() => {
                setRestoreTarget(null);
                setRestoreName("");
                setRestoreError("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!restoreName.trim() || restoreCurrentConflict}
              isLoading={restoreMutation.isPending}
              loadingText="Restoring..."
            >
              Restore cluster
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
}
