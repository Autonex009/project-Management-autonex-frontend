import { format, parseISO } from "date-fns";

export const STATUS_CONFIG = {
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

export const ARCHIVED_STATUSES = ["completed", "on-hold", "cancelled"];

export const isArchivedStatus = (statusRaw) =>
  ARCHIVED_STATUSES.includes((statusRaw || "active").toLowerCase().trim());

export const getStatusBadgeConfig = (statusRaw) => {
  const key = (statusRaw || "active").toLowerCase().trim();
  return (
    STATUS_CONFIG[key] || {
      label: statusRaw || "In Progress",
      style: "bg-slate-100 text-slate-600 border border-slate-200",
    }
  );
};

export const formatCreatedDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    const parsed = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
    if (!parsed || isNaN(parsed.getTime())) return null;
    return format(parsed, "MMM dd, yyyy");
  } catch {
    return null;
  }
};

export const PROJECT_TYPE_CATEGORIES = [
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

export const typeLabel = (key) =>
  PROJECT_TYPE_CATEGORIES.find((c) => c.key === key)?.key || key;

export const DEVELOPER_TYPE_KEY = "Development";

export const isDeveloperProject = (project) => {
  const t = project?.project_types;
  return !!(t && typeof t === "object" && t[DEVELOPER_TYPE_KEY]);
};
