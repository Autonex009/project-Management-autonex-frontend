export const STATUS_CONFIG = {
  pending: {
    label: "Pending Review",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
  },
  reviewing: {
    label: "Under Review",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  interview_scheduled: {
    label: "Interview Scheduled",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
  },
  hired: {
    label: "Hired",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Not Moving Forward",
    color: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-400",
  },
};

export const STATUS_OPTIONS = [
  { value: "pending", label: "Pending Review" },
  { value: "reviewing", label: "Under Review" },
  { value: "interview_scheduled", label: "Interview Scheduled" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Not Moving Forward" },
];