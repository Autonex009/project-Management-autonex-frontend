import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  getEndDateValidationMessage,
  isEndDateBeforeStartDate,
} from "../utils/dateValidation";
import AllocationPopover from "../components/AllocationPopover";
import {
  buildEmployeeIndex,
  extraPmIds,
  manpowerEmployeeIds,
  totalRequiredManpower,
} from "../utils/workforce";
import Table, { ColumnTemplates } from "../components/ui/Table";
import Dropdown from "../components/ui/Dropdown";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Modal from "../components/ui/Modal";
import StatCard from "../components/dashboard/StatCard";
import useScrollStore from "../store/useScrollStore";
import { formatDisplayName } from "../utils/displayName";

const STATUS_CONFIG = {
  poc: {
    label: "POC",
    style: "bg-purple-50 text-purple-700 border border-purple-200",
  },
  active: {
    label: "In Progress",
    style: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  "in-progress": {
    label: "In Progress",
    style: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  "in progress": {
    label: "In Progress",
    style: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  completed: {
    label: "Completed",
    style: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  "on-hold": {
    label: "On Hold",
    style: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  cancelled: {
    label: "Cancelled",
    style: "bg-red-50 text-red-700 border border-red-200",
  },
};

// Projects with these statuses live under the "Archived" tab; everything else
// (active, in-progress, poc, blank) is treated as an active project.
const ARCHIVED_STATUSES = ["completed", "on-hold", "cancelled"];
const isArchivedStatus = (statusRaw) =>
  ARCHIVED_STATUSES.includes((statusRaw || "active").toLowerCase().trim());

const getStatusBadgeConfig = (statusRaw) => {
  const key = (statusRaw || "active").toLowerCase().trim();
  return (
    STATUS_CONFIG[key] || {
      label: statusRaw || "In Progress",
      style: "bg-slate-100 text-slate-600 border border-slate-200",
    }
  );
};

const formatCreatedDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    const parsed = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
    if (!parsed || isNaN(parsed.getTime())) return null;
    return format(parsed, "MMM dd, yyyy");
  } catch {
    return null;
  }
};

// Project type classification: category → available subtypes. One subtype may be
// selected per category (stored as { category: subtype }).
const PROJECT_TYPE_CATEGORIES = [
  {
    key: "Data Modalities",
    subtypes: [
      "Image (RGB)",
      "Video",
      "Medical Imaging",
      "3D & Point Cloud",
      "Multimodal Data (e.g., RGB + 3D Cloud)",
      "Audio",
      "Text & Documents",
      "Time Series & Signals",
    ],
  },
  {
    key: "Annotation Types (By Data)",
    subtypes: [
      "VLA Captions",
      "Image Segmentation",
      "Video Segmentation",
      "Video Segmentation + Tracking",
      "Classification",
      "3D Point Cloud Segmentation",
      "Text Segmentation",
    ],
  },
  {
    key: "Object Segmentation Types",
    subtypes: ["2D Bounding Box"],
  },
  {
    key: "Developer",
    subtypes: ["Coding"],
  },
];

// The project-type category that marks a project as a development/coding project.
// Such projects are surfaced under the dedicated "Development" tab.
const DEVELOPER_TYPE_KEY = "Developer";
const isDeveloperProject = (project) => {
  const t = project?.project_types;
  return !!(t && typeof t === "object" && t[DEVELOPER_TYPE_KEY]);
};

const SkillMultiSelect = ({ options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSkill = (skill) => {
    if (skill === "Any Skill") {
      onChange([]);
      setIsOpen(false);
      return;
    }
    onChange(
      value.includes(skill)
        ? value.filter((item) => item !== skill)
        : [...value, skill],
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
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {/* Any Skill option — clears all skill filters */}
          <label className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-100">
            <input
              type="radio"
              checked={value.length === 0}
              onChange={() => toggleSkill("Any Skill")}
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
const EmployeeMultiSelect = ({
  name,
  defaultValue = [],
  employees,
  requiredSkills,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(defaultValue);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter employees by matching skills
  const matchingEmployees = employees.filter((emp) => {
    if (emp.status !== "active") return false;
    if (!requiredSkills || requiredSkills.length === 0) return true;

    return requiredSkills.some((skill) =>
      emp.skills?.some((empSkill) =>
        empSkill.toLowerCase().includes(skill.toLowerCase()),
      ),
    );
  });

  // Get employees that don't match skills
  const otherEmployees = employees.filter(
    (emp) => emp.status === "active" && !matchingEmployees.includes(emp),
  );

  const toggleEmployee = (empId) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(empId)
        ? prev.filter((id) => id !== empId)
        : [...prev, empId],
    );
  };

  const selectedEmployees = employees.filter((emp) =>
    selectedEmployeeIds.includes(emp.id),
  );

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
                {formatDisplayName(emp.name)}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm">Select employees...</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {selectedEmployeeIds.length} selected
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
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
                      <div className="text-sm font-medium text-gray-900">
                        {formatDisplayName(emp.name)}
                      </div>
                      <div className="text-xs text-gray-500">{emp.email}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {emp.skills?.slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                          >
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
                      <div className="text-sm font-medium text-gray-900">
                        {formatDisplayName(emp.name)}
                      </div>
                      <div className="text-xs text-gray-500">{emp.email}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {emp.skills?.slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                          >
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

// Field label above a value/input inside the card (small uppercase caption).
const CardField = ({ label, children, className = "" }) => (
  <div className={`min-w-0 ${className}`}>
    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
      {label}
    </span>
    {children}
  </div>
);

const cardInputClass =
  "w-full rounded-md border border-slate-200 px-2 py-1 text-[13px] text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";

// Status: label + a colored dot rendered inside a soft pill.
const STATUS_STYLE = {
  active: {
    label: "In Progress",
    dot: "bg-indigo-500",
    pill: "bg-indigo-50 text-indigo-700",
  },
  poc: {
    label: "POC",
    dot: "bg-purple-500",
    pill: "bg-purple-50 text-purple-700",
  },
  completed: {
    label: "Completed",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700",
  },
  "on-hold": {
    label: "On Hold",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-rose-500",
    pill: "bg-rose-50 text-rose-700",
  },
};

// Client sentiment: friendly label + dot + pill colors.
const SENTIMENT_STYLE = {
  GOOD: {
    label: "Good",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700",
  },
  AVG: {
    label: "Avg",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700",
  },
  Poor: { label: "Poor", dot: "bg-red-500", pill: "bg-red-50 text-red-600" },
};

// Small title accent bar — a different gradient per project (picked by id).
const CARD_ACCENTS = [
  "from-indigo-500 to-violet-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-sky-500 to-blue-500",
  "from-fuchsia-500 to-purple-500",
  "from-lime-500 to-green-500",
  "from-cyan-500 to-sky-500",
];

// Truncated text that reveals its full value in a light (white) tooltip on hover.
const TruncTip = ({ text, className = "" }) => (
  <div className="group/tip relative min-w-0">
    <div className={`truncate ${className}`}>{text}</div>
    <span className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-max max-w-[240px] whitespace-normal break-words rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-lg group-hover/tip:block">
      {text}
    </span>
  </div>
);

// A single project card. In "view" mode it shows the project at a glance; a
// double-click flips it into inline "edit" mode where the common fields become
// editable and Save / Cancel replace Copy / Delete.
const ProjectCard = ({
  id,
  highlighted,
  project,
  parentProject,
  pmNames,
  pmIds = [],
  onLeaveEmployeeIds,
  locationByEmployeeId,
  allocatedManpower,
  requiredManpower,
  pmSlots = 0,
  allocations,
  employees,
  formerEmployees,
  prefix,
  navigate,
  docs,
  isEditing,
  draft,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDraftChange,
  saving,
  docsOpen,
  onToggleDocs,
  onCloseDocs,
  onAdvanced,
  onDelete,
}) => {
  const typeText =
    project.project_types && Object.keys(project.project_types).length
      ? Object.values(project.project_types).join(", ")
      : "—";
  const vendorText = (project.workforce_vendors || []).join(", ");
  const hasEncord = !!project.encord_project_hash?.trim();
  const stop = (e) => e.stopPropagation();

  const status = STATUS_STYLE[project.project_status] || {
    label: project.project_status,
    dot: "bg-slate-400",
    pill: "bg-slate-100 text-slate-600",
  };
  const sentiment = SENTIMENT_STYLE[project.sentiment];
  const accent = CARD_ACCENTS[(project.id || 0) % CARD_ACCENTS.length];
  const goToAllocations = (e) => {
    stop(e);
    navigate(`${prefix}/allocations`, { state: { projectId: project.id } });
  };

  return (
    <div
      id={id}
      onDoubleClick={() => !isEditing && onStartEdit()}
      className={`group flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200 ${
        isEditing
          ? "border-indigo-300 ring-2 ring-indigo-100"
          : "border-slate-200 hover:shadow-md"
      } ${highlighted ? "ring-2 ring-indigo-400 ring-offset-2" : ""}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          {/* Small title accent — gradient varies per project */}
          <span
            className={`mt-0.5 h-9 w-1.5 shrink-0 rounded-full bg-gradient-to-b ${accent}`}
          />
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <input
                value={draft.name}
                onChange={(e) => onDraftChange("name", e.target.value)}
                onClick={stop}
                className="w-full rounded-md border border-slate-200 px-2 py-1 text-[15px] font-bold text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            ) : (
              <div className="group/tip relative">
                <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-slate-900">
                  {project.name}
                </h3>
                <span className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-max max-w-[240px] whitespace-normal break-words rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-lg group-hover/tip:block">
                  {project.name}
                </span>
              </div>
            )}
            <p className="mt-1 truncate text-xs text-slate-500">
              {parentProject?.client || "—"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {isEditing ? (
            <div onClick={stop} className="w-36">
              <Dropdown
                value={draft.project_status}
                onChange={(val) => onDraftChange("project_status", val)}
                options={[
                  { value: "active", label: "In Progress" },
                  { value: "poc", label: "POC" },
                  { value: "completed", label: "Completed" },
                  { value: "on-hold", label: "On Hold" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
                className="w-full"
                optionsClassName="w-full"
              />
            </div>
          ) : (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.pill}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          )}
          {project.created_at && (
            <span className="text-right text-[11px] text-slate-400">
              Created {format(new Date(project.created_at), "MMM d, yyyy")}
            </span>
          )}
        </div>
      </div>

      <div className="my-4 border-t border-slate-100" />

      {/* PM / Sentiment / Type / Vendor */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <CardField label="PM">
          <TruncTip
            text={pmNames.length ? pmNames.join(", ") : "—"}
            className="text-sm font-semibold text-slate-800"
          />
        </CardField>

        <CardField label="Client sentiment">
          {isEditing ? (
            <div className="flex gap-1" onClick={stop}>
              {[
                ["GOOD", "Good"],
                ["AVG", "Avg"],
                ["Poor", "Poor"],
              ].map(([val, label]) => {
                const on = draft.sentiment === val;
                const active =
                  val === "GOOD"
                    ? "bg-emerald-500 ring-emerald-500"
                    : val === "AVG"
                      ? "bg-amber-500 ring-amber-500"
                      : "bg-red-500 ring-red-500";
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onDraftChange("sentiment", on ? "" : val)}
                    className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                      on
                        ? `${active} text-white`
                        : "bg-slate-50 text-slate-500 ring-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : sentiment ? (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${sentiment.pill}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${sentiment.dot}`} />
              {sentiment.label}
            </span>
          ) : (
            <span className="text-sm font-medium text-slate-400">Not set</span>
          )}
        </CardField>

        <CardField label="Type">
          <TruncTip
            text={typeText}
            className="text-sm font-semibold text-slate-800"
          />
        </CardField>

        <CardField label="Vendor">
          {isEditing ? (
            <input
              value={draft.vendorsText}
              onChange={(e) => onDraftChange("vendorsText", e.target.value)}
              onClick={stop}
              placeholder="Comma separated"
              className={cardInputClass}
            />
          ) : (
            <TruncTip
              text={vendorText || "—"}
              className="text-sm font-semibold text-slate-800"
            />
          )}
        </CardField>
      </div>

      {/* Manpower — boxed stepper; the count keeps the hover popover (req 3) */}
      <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Manpower
        </span>
        <div className="flex items-center rounded-lg border border-slate-200 bg-white">
          <button
            type="button"
            title="Manage allocations"
            aria-label="Manage allocations"
            onClick={goToAllocations}
            className="rounded-l-lg px-2.5 py-1.5 text-slate-500 hover:bg-slate-50"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="h-5 w-px bg-slate-200" />
          <AllocationPopover
            project={project}
            allocations={allocations}
            employees={employees}
            formerEmployees={formerEmployees}
            pmIds={pmIds}
            onLeaveEmployeeIds={onLeaveEmployeeIds}
            locationByEmployeeId={locationByEmployeeId}
            onOpenAllocations={() =>
              navigate(`${prefix}/allocations`, {
                state: { projectId: project.id },
              })
            }
            triggerClassName="px-3 py-1.5 text-sm font-bold text-slate-800 tabular-nums hover:text-indigo-600 transition-colors cursor-pointer"
            badgeContent={
              // The PM count is spelled out because required now includes it —
              // otherwise "1/3" on a project asking for 2 workers looks wrong.
              <span className="inline-flex items-baseline gap-1">
                <span>
                  {allocatedManpower} / {requiredManpower}
                </span>
                {pmSlots > 0 && (
                  <span className="text-[11px] font-normal text-slate-400">
                    ({pmSlots} PM)
                  </span>
                )}
              </span>
            }
          />
          <span className="h-5 w-px bg-slate-200" />
          <button
            type="button"
            title="Allocate employees"
            aria-label="Allocate employees"
            onClick={goToAllocations}
            className="rounded-r-lg px-2.5 py-1.5 text-indigo-600 hover:bg-indigo-50"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Team counts + annotation time */}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        {[
          ["Annotators", "autonex_annotators"],
          ["Quality checker", "qc_count"],
          ["Reviewers", "autonex_reviewers"],
        ].map(([label, field]) => (
          <CardField key={field} label={label}>
            {isEditing ? (
              <input
                type="number"
                min="0"
                value={draft[field]}
                onChange={(e) => onDraftChange(field, e.target.value)}
                onClick={stop}
                onWheel={(e) => e.target.blur()}
                className={cardInputClass}
              />
            ) : (
              <p className="text-sm font-bold text-slate-800 tabular-nums">
                {project[field] ?? 0}
              </p>
            )}
          </CardField>
        ))}

        <CardField label="Annotation time / task">
          {isEditing ? (
            <div className="flex items-center gap-1" onClick={stop}>
              <input
                type="number"
                min="0"
                step="0.1"
                value={draft.annotation_minutes}
                onChange={(e) =>
                  onDraftChange("annotation_minutes", e.target.value)
                }
                onWheel={(e) => e.target.blur()}
                className={cardInputClass}
              />
              <span className="text-[11px] text-slate-400">min</span>
            </div>
          ) : (
            <p className="text-sm font-bold text-slate-800">
              {project.estimated_time_per_task ? (
                <>
                  {Math.round(project.estimated_time_per_task * 60)}{" "}
                  <span className="text-[11px] font-medium text-slate-400">
                    min
                  </span>
                </>
              ) : (
                "—"
              )}
            </p>
          )}
        </CardField>
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2">
          {/* Analytics */}
          <div className="group/an relative inline-block">
            <button
              type="button"
              disabled={!hasEncord}
              onClick={(e) => {
                stop(e);
                navigate(`/admin/analytics/${project.id}`);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                hasEncord
                  ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
              }`}
            >
              <BarChart3 className="h-4 w-4" /> Analytics
            </button>
            {!hasEncord && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 opacity-0 shadow-lg transition-opacity duration-200 group-hover/an:opacity-100">
                Encord Project ID is not configured.
              </div>
            )}
          </div>

          {/* Docs — project guideline documents (req 4) */}
          <div className="relative inline-block">
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                onToggleDocs();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <FileText className="h-4 w-4" /> Docs
              {docs.length > 0 && (
                <span className="rounded-full bg-indigo-100 px-1.5 text-[10px] font-bold text-indigo-700">
                  {docs.length}
                </span>
              )}
            </button>
            {docsOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={(e) => {
                    stop(e);
                    onCloseDocs();
                  }}
                />
                <div
                  className="absolute bottom-full left-0 z-40 mb-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
                  onClick={stop}
                >
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Project guidelines
                  </p>
                  {docs.length === 0 ? (
                    <p className="px-2 py-3 text-center text-xs text-slate-400">
                      No documents uploaded
                    </p>
                  ) : (
                    <ul className="max-h-48 overflow-y-auto">
                      {docs.map((g) => (
                        <li key={g.id}>
                          {g.file_url ? (
                            <div className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                              <span className="flex-1 flex items-center gap-2 text-left min-w-0">
                                <FileText className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                                <span className="truncate">
                                  {g.title || g.file_name || "Document"}
                                </span>
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <a
                                  href={g.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  download
                                  className="p-1 hover:bg-indigo-100 hover:text-indigo-600 rounded text-slate-400 transition-colors"
                                  title="Download"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs cursor-default text-slate-400">
                              <FileText className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                              <span className="truncate">
                                {g.title || g.file_name || "Document"}
                              </span>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: tick / cross while editing, else edit / delete (req 5) */}
        <div className="flex items-center gap-0.5" onClick={stop}>
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={onCancelEdit}
                title="Cancel"
                aria-label="Cancel"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onSaveEdit}
                disabled={saving}
                title="Save"
                aria-label="Save"
                className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onAdvanced}
                title="Edit"
                aria-label="Edit"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                title="Delete"
                aria-label="Delete"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Program-manager multi-select styled like Dropdown. Selected managers stay in
// the list with a tick (and "primary" on the first); clicking one toggles it.
const PmMultiSelect = ({ employees, value, onChange, isPm, pmEmployeeId }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const q = search.trim().toLowerCase();
  const list = employees
    .filter((e) => e.status === "active")
    .filter((e) => !q || (e.name || "").toLowerCase().includes(q));

  const toggle = (id) => {
    if (value.includes(id)) {
      if (isPm && id === pmEmployeeId) return; // a PM can't remove themselves
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div ref={ref} className="relative">
      <div className="flex w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm transition-colors hover:border-slate-300">
        <input
          type="text"
          value={search}
          placeholder={value.length ? "Add another" : "Add manager"}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="min-w-0 flex-1 bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
        />
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </div>
      {open && (
        <div className="absolute left-0 top-full z-[9999] mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {list.length ? (
            list.map((emp) => {
              const selected = value.includes(emp.id);
              const isPrimary = value[0] === emp.id;
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => toggle(emp.id)}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${selected ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                >
                  <span className="flex w-4 shrink-0 justify-center">
                    {selected && (
                      <Check className="h-3.5 w-3.5 text-indigo-600" />
                    )}
                  </span>
                  <span className="flex-1 truncate">{formatDisplayName(emp.name)}</span>
                  {isPrimary && (
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-indigo-400">
                      primary
                    </span>
                  )}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-sm text-slate-400">
              No matches found
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
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = localStorage.getItem("role") || "admin";
  const isPm = role === "pm";
  const isAdmin = role === "admin";
  const prefix = isPm ? "/pm" : "/admin";
  const pmEmployeeId = getPmEmployeeId(user);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [copyingProject, setCopyingProject] = useState(null);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [projectTypes, setProjectTypes] = useState({}); // { category: subtype }
  const [activeTypeTab, setActiveTypeTab] = useState(
    PROJECT_TYPE_CATEGORIES[0].key,
  );
  const [typeTabTouched, setTypeTabTouched] = useState(false); // has the user clicked a type tab? (drives subtype auto-open)
  const [guidelineFiles, setGuidelineFiles] = useState([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const [formMainProjectId, setFormMainProjectId] = useState("");
  const [formOrg, setFormOrg] = useState("");
  const [formPriority, setFormPriority] = useState("medium");
  const [formProjectStatus, setFormProjectStatus] = useState("active");
  const [formSentiment, setFormSentiment] = useState("");
  const [modalInfoTab, setModalInfoTab] = useState("status"); // Status | Client Sentiment
  const [modalBuildTab, setModalBuildTab] = useState("types"); // Project Types | Team Composition
  const pageMemory = useScrollStore.getState().memory["projects-page"] || {};
  const [selectedOrganization, setSelectedOrganization] = useState(
    pageMemory.selectedOrganization || "all",
  );
  const [selectedPm, setSelectedPm] = useState(pageMemory.selectedPm || "all");
  const [selectedStatus, setSelectedStatus] = useState(
    pageMemory.selectedStatus || "all",
  );
  const [projectView, setProjectView] = useState(
    pageMemory.projectView || "active",
  ); // 'active' | 'archived' | 'development'
  const [selectedPmIds, setSelectedPmIds] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef(null);
  // Inline (double-click) card editing + per-card docs popover
  const [editingCardId, setEditingCardId] = useState(null);
  const [cardDraft, setCardDraft] = useState(null);
  const [docsOpenId, setDocsOpenId] = useState(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["sub-projects"],
    queryFn: subProjectApi.getAll,
  });

  const { data: mainProjects = [] } = useQuery({
    queryKey: ["parent-projects"],
    queryFn: parentProjectApi.getAll,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: employeeApi.getAll,
  });

  // Roster lookup — also the test for a stale allocation, since `GET /employees`
  // omits archived staff that `GET /allocations` still references.
  const employeeIndex = useMemo(
    () => buildEmployeeIndex(employees),
    [employees],
  );

  // Archived staff, so a stale allocation names who left instead of reading
  // "Former employee". Naming only — never counted towards manpower.
  const { data: formerEmployees = [] } = useQuery({
    queryKey: ["employees", "archived"],
    queryFn: () => employeeApi.getAll({ status: "archived" }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: skillsData = [] } = useQuery({
    queryKey: ["skills"],
    queryFn: skillApi.getAll,
  });

  const { data: vendorsData = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: vendorApi.getAll,
  });

  const createVendorMutation = useMutation({
    mutationFn: (name) => vendorApi.create(name),
    onSuccess: () => queryClient.invalidateQueries(["vendors"]),
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ["allocations"],
    queryFn: allocationApi.getAll,
  });

  // Guideline docs, filtered per-card by sub_project_id for the card "Docs" popover.
  const { data: guidelinesData = [] } = useQuery({
    queryKey: ["guidelines", "cards"],
    queryFn: () => guidelineApi.getAll(),
  });

  const { startStr, endStr } = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, "0")}`;
    return { startStr: start, endStr: end };
  }, []);

  const { data: leaves = [] } = useQuery({
    queryKey: ["leaves", startStr, endStr],
    queryFn: () => leaveApi.getAll({ start_date: startStr, end_date: endStr }),
  });

  // Approved WFH-for-a-day requests, so the allocation popover can say where
  // each person actually is today.
  const { data: wfh = [] } = useQuery({
    queryKey: ["wfh"],
    queryFn: () => wfhApi.getAll(),
  });

  // Local calendar date — never via toISOString(), which is UTC and would report
  // yesterday for the first 5.5 hours of every IST day.
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  // Employees on approved leave today.
  const leaveEmployeeIds = useMemo(() => {
    const ids = new Set();
    leaves.forEach((l) => {
      if (
        (l.status || "").toLowerCase() === "approved" &&
        String(l.start_date).slice(0, 10) <= todayStr &&
        String(l.end_date).slice(0, 10) >= todayStr
      ) {
        ids.add(l.employee_id);
      }
    });
    return ids;
  }, [leaves, todayStr]);

  const wfhTodayIds = useMemo(() => {
    const ids = new Set();
    wfh.forEach((w) => {
      if (
        (w.status || "").toLowerCase() === "approved" &&
        String(w.wfh_date).slice(0, 10) === todayStr
      ) {
        ids.add(w.employee_id);
      }
    });
    return ids;
  }, [wfh, todayStr]);

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

  const visibleMainProjects = isPm
    ? getPmProjects(mainProjects, pmEmployeeId)
    : mainProjects;
  const visibleProjects = isPm
    ? getPmSubProjects(projects, mainProjects, pmEmployeeId, allocations)
    : projects;

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
  const allOrganizations = [...new Set(mainProjects.map(clientOf))].sort(
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

  const filterStateRef = useRef({
    selectedOrganization,
    selectedPm,
    selectedStatus,
    subProjectSearch: "",
  });
  useEffect(() => {
    filterStateRef.current = {
      ...filterStateRef.current,
      selectedOrganization,
      selectedPm,
      selectedStatus,
    };
  }, [selectedOrganization, selectedPm, selectedStatus]);

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

      const nextPath = window.location.pathname;
      const isRelatedPage =
        nextPath.includes("/analytics/") || nextPath.includes("/allocation");

      if (isRelatedPage) {
        setScrollPosition("projects-page", currentScroll);
        useScrollStore
          .getState()
          .setMemory("projects-page", filterStateRef.current);
      } else {
        useScrollStore.getState().clearMemory("projects-page");
        setScrollPosition("projects-page", 0);
      }
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
    setFormPriority("medium");
    setFormProjectStatus("active");
    setFormSentiment("");
    setModalInfoTab("status");
    setModalBuildTab("types");
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
        mainProjects.find(
          (p) => (p.name || "").trim().toLowerCase() === orgName.toLowerCase(),
        ) ||
        mainProjects.find(
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
      priority: formData.get("priority") || "medium",
      required_expertise: selectedSkills,
      // Team composition (required_manpower is auto-computed server-side from the Autonex counts)
      annotators_total: num("annotators_total"),
      workforce_vendors: selectedVendors,
      autonex_annotators: num("autonex_annotators"),
      autonex_reviewers: num("autonex_reviewers"),
      qc_count: num("qc_count"),
      // Assigned PMs / Employees
      assigned_employee_ids: selectedPmIds,
      pm_id: selectedPmIds[0] || null,
      required_manpower:
        num("autonex_annotators") + num("autonex_reviewers") + num("qc_count"),
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

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["sub-projects"] }),
      queryClient.invalidateQueries({ queryKey: ["guidelines"] }),
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

  const pmIdsOf = (mp) =>
    mp?.program_manager_ids?.length
      ? mp.program_manager_ids
      : mp?.program_manager_id
        ? [mp.program_manager_id]
        : [];

  // A project's PMs are recorded on the project itself (`assigned_employee_ids`,
  // which only ever holds PM/admin ids) and fall back to the parent project's
  // managers. The card, the PM filter, the filter's option list, and the manpower
  // count must all resolve them through here — when the filter read only the
  // parent while the card read the project, filtering by a PM shown on screen
  // matched nothing.
  const resolvePmIds = (project) => {
    if (project?.assigned_employee_ids?.length)
      return project.assigned_employee_ids;
    if (project?.pm_id) return [project.pm_id];
    return pmIdsOf(
      visibleMainProjects.find((p) => p.id === project?.main_project_id),
    );
  };

  // Manpower counts PEOPLE, not allocation rows, and a PM running the project
  // occupies a slot just like an annotator. Union by employee id so someone with
  // two allocations — or a PM who is also allocated — is only counted once.
  //
  // Anyone off the roster is skipped: allocations outlive an archived employee,
  // and counting those ghosts reported projects as fully staffed by people who
  // had left.
  const getManpowerEmployeeIds = (project) =>
    manpowerEmployeeIds({
      allocations: allocations.filter((a) => a.sub_project_id === project.id),
      pmIds: resolvePmIds(project),
      employeeIndex,
    });

  const getAllocatedManpower = (project) =>
    getManpowerEmployeeIds(project).size;

  // Required counts those same PMs. The server computes required_manpower as
  // annotators + reviewers + QC, so a project asking for 2 QC and run by 1 PM
  // showed 1/2 with only the PM on it — the manager filled a slot the required
  // side didn't know about.
  const getRequiredManpower = (project) =>
    totalRequiredManpower({
      required: project?.required_manpower || 0,
      allocations: allocations.filter((a) => a.sub_project_id === project?.id),
      pmIds: resolvePmIds(project),
      employeeIndex,
    });

  // How many of those required slots are the managers' — shown next to the ratio.
  const getPmSlots = (project) =>
    extraPmIds({
      allocations: allocations.filter((a) => a.sub_project_id === project?.id),
      pmIds: resolvePmIds(project),
      employeeIndex,
    }).size;

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
    const start = new Date(startStr + "T00:00:00");
    const end = new Date(endStr + "T00:00:00");
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
    const empLeaves = leaves.filter((l) => l.employee_id === employeeId);
    let totalLeaveDays = 0;
    for (const leave of empLeaves) {
      if (!leave.start_date || !leave.end_date) continue;
      const leaveStart =
        leave.start_date > projectStart ? leave.start_date : projectStart;
      const leaveEnd =
        leave.end_date < projectEnd ? leave.end_date : projectEnd;
      if (leaveStart <= leaveEnd) {
        totalLeaveDays += getWorkingDays(leaveStart, leaveEnd);
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

  const [searchParams, setSearchParams] = useSearchParams();
  const filterMainProjectId = searchParams.get("project");
  const statusParam = searchParams.get("status");
  const recommendationParam = searchParams.get("recommendation");
  const focusId = searchParams.get("focus"); // scroll to + highlight this sub-project (e.g. from Allocations)
  const [subProjectSearch, setSubProjectSearch] = useState(
    pageMemory.subProjectSearch || "",
  );

  useEffect(() => {
    filterStateRef.current.subProjectSearch = subProjectSearch;
  }, [subProjectSearch]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
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

  // Close the Filters popover on outside click
  useEffect(() => {
    const handler = (e) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target))
        setFiltersOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredProjects = (
    filterMainProjectId
      ? visibleProjects.filter(
          (p) => p.main_project_id === parseInt(filterMainProjectId),
        )
      : visibleProjects
  )
    .filter((project) => {
      // Tabs are admin-only. PMs have no tabs and see every project together.
      if (!isAdmin) return true;
      // Top-level tabs. Development is a separate bucket (by project type); Active vs
      // Archived split the rest by status (Completed / On Hold / Cancelled = archived).
      const dev = isDeveloperProject(project);
      if (projectView === "development") return dev;
      if (dev) return false; // developer projects live only under the Development tab
      return projectView === "archived"
        ? isArchivedStatus(project.project_status)
        : !isArchivedStatus(project.project_status);
    })
    .filter((project) => {
      if (selectedOrganization === "all") return true;

      const parentProject = visibleMainProjects.find(
        (p) => p.id === project.main_project_id,
      );

      return (parentProject?.client || NO_ORG) === selectedOrganization;
    })
    .filter((project) => {
      if (selectedPm === "all") return true;
      return resolvePmIds(project).includes(Number(selectedPm));
    })
    .filter((project) => {
      if (selectedStatus === "all") return true;
      const status = (project.project_status || "active").toLowerCase().trim();
      if (selectedStatus === "active") {
        return (
          status === "active" ||
          status === "in-progress" ||
          status === "in progress"
        );
      }
      if (selectedStatus === "poc") {
        return status === "poc";
      }
      return status === selectedStatus.toLowerCase();
    })
    .filter((p) => {
      if (statusParam && p.project_status !== statusParam) return false;

      if (recommendationParam) {
        const recResult = getSystemRecommendation(p);

        if (recResult.label.toLowerCase() !== recommendationParam.toLowerCase())
          return false;
      }

      return p.name.toLowerCase().includes(subProjectSearch.toLowerCase());
    })
    .sort((a, b) => a.name.localeCompare(b.name));

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
    projectView,
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

  const projectMetrics = useMemo(() => {
    const totalProjects = filteredProjects.length;

    const activeProjects = filteredProjects.filter(
      (p) => p.project_status === "active",
    ).length;

    const overburdenedProjects = filteredProjects.filter((p) => {
      const required = getRequiredManpower(p);
      const allocated = getAllocatedManpower(p);
      return required > 0 ? allocated < required : false;
    }).length;

    const balancedProjects = filteredProjects.filter((p) => {
      const required = getRequiredManpower(p);
      const allocated = getAllocatedManpower(p);
      return required > 0 ? allocated >= required : allocated > 0;
    }).length;

    // Archived-tab breakdown by status.
    const statusOf = (p) => (p.project_status || "active").toLowerCase().trim();
    const onHoldProjects = filteredProjects.filter(
      (p) => statusOf(p) === "on-hold",
    ).length;
    const completedProjects = filteredProjects.filter(
      (p) => statusOf(p) === "completed",
    ).length;
    const cancelledProjects = filteredProjects.filter(
      (p) => statusOf(p) === "cancelled",
    ).length;

    return {
      totalProjects,
      activeProjects,
      overburdenedProjects,
      balancedProjects,
      onHoldProjects,
      completedProjects,
      cancelledProjects,
    };
  }, [filteredProjects, allocations, employees, leaves]);

  // Per-tab totals shown as badges next to each tab label (independent of the
  // currently selected tab, but respecting the org/project scope filter).
  const tabCounts = useMemo(() => {
    const base = filterMainProjectId
      ? visibleProjects.filter(
          (p) => p.main_project_id === parseInt(filterMainProjectId),
        )
      : visibleProjects;
    let active = 0,
      archived = 0,
      development = 0;
    base.forEach((project) => {
      if (isDeveloperProject(project)) {
        development += 1;
        return;
      }
      if (isArchivedStatus(project.project_status)) archived += 1;
      else active += 1;
    });
    return { active, archived, development };
  }, [visibleProjects, filterMainProjectId]);

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
    setFormPriority(project.priority || "medium");
    setFormProjectStatus(project.project_status || "active");
    setFormSentiment(project.sentiment || "");
    setModalInfoTab("status");
    setModalBuildTab("types");
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
      qc_count: String(project.qc_count ?? 0),
      autonex_reviewers: String(project.autonex_reviewers ?? 0),
      annotation_minutes: project.estimated_time_per_task
        ? String(Math.round(project.estimated_time_per_task * 60))
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
    const qc = parseInt(cardDraft.qc_count) || 0;
    cardUpdateMutation.mutate({
      id: project.id,
      data: {
        name: (cardDraft.name || "").trim() || project.name,
        project_status: cardDraft.project_status,
        autonex_annotators: ann,
        autonex_reviewers: rev,
        qc_count: qc,
        required_manpower: ann + rev + qc,
        estimated_time_per_task:
          cardDraft.annotation_minutes !== ""
            ? parseFloat(cardDraft.annotation_minutes) / 60
            : (project.estimated_time_per_task ?? null),
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            {currentMainProject
              ? `Projects for ${currentMainProject.name}`
              : "All Projects"}
          </h1>
          <p className="text-slate-500 text-[13px] mt-0.5">
            {currentMainProject
              ? `Manage tasks and resource allocation for ${currentMainProject.name}`
              : "Manage tasks and resource allocation across all projects"}
          </p>
        </div>
      </div>

      {/* Active / Archived / Development tabs — admin only. Archived = Completed /
 On Hold / Cancelled; Development = projects with the Developer type. */}
      {isAdmin && (
        <div className="flex border-b border-slate-200">
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
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                  isActive
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label}
                {t.key !== "active" && (
                  <span
                    className={`inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[11px] font-semibold ${
                      isActive
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
        {isPm && (
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
            setFormPriority("medium");
            setFormProjectStatus("active");
            setFormSentiment("");
            setModalInfoTab("status");
            setModalBuildTab("types");
            setSelectedPmIds(isPm && pmEmployeeId ? [pmEmployeeId] : []);
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

          <div className="relative" ref={filtersRef}>
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              Filters
              {[selectedOrganization, selectedPm, selectedStatus].some(
                (v) => v !== "all",
              ) && (
                <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-indigo-100 px-1.5 text-[10px] font-semibold text-indigo-700">
                  {
                    [selectedOrganization, selectedPm, selectedStatus].filter(
                      (v) => v !== "all",
                    ).length
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
                {[selectedOrganization, selectedPm, selectedStatus].some(
                  (v) => v !== "all",
                ) && (
                  <button
                    onClick={() => {
                      setSelectedOrganization("all");
                      setSelectedPm("all");
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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="h-72 rounded-2xl border border-slate-200 bg-white animate-pulse"
            />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProjects
              .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
              .map((project) => {
                const parentProject = visibleMainProjects.find(
                  (p) => p.id === project.main_project_id,
                );

                const pmIds = resolvePmIds(project);
                const pmNames = pmIds
                  .map((id) => formatDisplayName(employees.find((e) => e.id === id)?.name))
                  .filter(Boolean);

                const allocatedManpower = getAllocatedManpower(project);

                return (
                  <ProjectCard
                    key={project.id}
                    id={`sub-project-${project.id}`}
                    highlighted={highlightId === project.id}
                    project={project}
                    parentProject={parentProject}
                    pmNames={pmNames}
                    pmIds={pmIds}
                    onLeaveEmployeeIds={leaveEmployeeIds}
                    locationByEmployeeId={locationByEmployeeId}
                    allocatedManpower={allocatedManpower}
                    requiredManpower={getRequiredManpower(project)}
                    pmSlots={getPmSlots(project)}
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
          {filteredProjects.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 mt-4">
              <p className="text-sm text-slate-500">
                Showing{" "}
                {filteredProjects.length === 0
                  ? 0
                  : (currentPage - 1) * PAGE_SIZE + 1}
                –{Math.min(currentPage * PAGE_SIZE, filteredProjects.length)} of{" "}
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
                  (_, i) => i + 1,
                )
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === Math.ceil(filteredProjects.length / PAGE_SIZE) ||
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
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          currentPage === p
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
                        Math.ceil(filteredProjects.length / PAGE_SIZE),
                        currentPage + 1,
                      ),
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
                    const projs = mainProjects.filter(
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
                  employees={employees}
                  value={selectedPmIds}
                  onChange={setSelectedPmIds}
                  isPm={isPm}
                  pmEmployeeId={pmEmployeeId}
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
                          {cat.key}
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
                        {cat.key} — Subtype
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
                          <span className="text-indigo-400">{cat}:</span> {sub}
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
                      ["qc_count", "QC"],
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
                            (editingProject || copyingProject)?.[field] ?? ""
                          }
                          onWheel={(e) => e.target.blur()}
                          className="input"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>

                  <p className="mt-2 text-[11px] text-slate-400">
                    Required headcount = Autonex Annotators + Autonex Reviewers
                    + QC.
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
