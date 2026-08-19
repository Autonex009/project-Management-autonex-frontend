import React, { useState } from "react";
import {
  Edit,
  Trash2,
  Users,
  UserCheck,
  Check,
  X,
  UploadCloud,
  FileText,
  BarChart3,
  SlidersHorizontal,
  Clock,
  Smile,
  CheckCircle2,
  XCircle,
  Eye,
  PauseCircle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { formatDisplayName } from "../../utils/displayName";
import Dropdown from "../ui/Dropdown";
import AllocationPopover from "../AllocationPopover";

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

const ARCHIVED_STATUSES = ["completed", "on-hold", "cancelled"];

const isArchivedStatus = (statusRaw) =>
  ARCHIVED_STATUSES.includes((statusRaw || "active").toLowerCase().trim());

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
    key: "Development",
    subtypes: ["Coding"],
  },
];

const typeLabel = (key) =>
  PROJECT_TYPE_CATEGORIES.find((c) => c.key === key)?.key || key;

const DEVELOPER_TYPE_KEY = "Development";

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

const STATUS_STYLE = {
  active: { label: "In Progress", pill: "bg-indigo-50 text-indigo-700" },
  poc: { label: "POC", pill: "bg-purple-50 text-purple-700" },
  completed: { label: "Completed", pill: "bg-emerald-50 text-emerald-700" },
  "on-hold": { label: "On Hold", pill: "bg-amber-50 text-amber-700" },
  cancelled: { label: "Cancelled", pill: "bg-rose-50 text-rose-700" },
};

const SENTIMENT_STYLE = {
  GOOD: { label: "Good", pill: "bg-emerald-50 text-emerald-700" },
  AVG: { label: "Avg", pill: "bg-amber-50 text-amber-700" },
  Poor: { label: "Poor", pill: "bg-red-50 text-red-600" },
};

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

const shortenNames = (names = []) =>
  names.map((n) => formatDisplayName(n) || n).filter(Boolean).join(", ") || "—";

const TruncTip = ({ text, title, className = "" }) => (
  <div className="group/tip relative min-w-0">
    <div className={`truncate ${className}`}>{text}</div>
    <span className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-max max-w-[240px] whitespace-normal break-words rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-lg group-hover/tip:block">
      {title || text}
    </span>
  </div>
);



const ProjectCard = ({
  id,
  highlighted,
  project,
  parentProject,
  pmNames,
  teamLeadNames = [],
  pmIds = [],
  // Passed straight through to the popover so its headcount matches the ratio printed on
  // the card — a lead recorded on the project but holding no allocation belongs in both.
  leadIds = [],
  onLeaveEmployeeIds,
  locationByEmployeeId,
  allocatedManpower,
  requiredManpower,
  pmSlots = 0,
  leadSlots = 0,
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
}

export default ProjectCard;
