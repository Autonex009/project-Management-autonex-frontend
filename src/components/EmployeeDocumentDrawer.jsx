/**
 * EmployeeDocumentDrawer
 *
 * Slide-in right drawer that lists all HR documents for a single employee.
 * Features:
 *   - Completeness progress ring (present / total required docs)
 *   - Per-document status chip (present / missing)
 *   - Generate PDF button for auto-generatable docs
 *   - Upload button for manual docs (org policy, etc.)
 *   - Download via signed URL
 *   - Soft-delete
 */
import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  FileText,
  Download,
  Trash2,
  Wand2,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
  History,
  Eye,
} from "lucide-react";
import toast from "react-hot-toast";
import { employeeDocumentApi } from "../services/api";
import ConfirmDialog from "./ui/ConfirmDialog";

// ── Constants ────────────────────────────────────────────────────────────────

const DOC_LABELS = {
  internship_offer_letter: "Internship Offer Letter",
  fulltime_offer_letter: "Full-time Offer Letter",
  internship_completion_certificate: "Internship Completion Certificate",
  experience_letter: "Experience Letter",
  salary_structure: "Salary Structure",
  org_policy: "Organisation Policy",
};

const GENERATABLE = new Set([
  "internship_offer_letter",
  "fulltime_offer_letter",
  "internship_completion_certificate",
  "experience_letter",
  "salary_structure",
]);

// ── Progress Ring ────────────────────────────────────────────────────────────

function ProgressRing({ present, total, size = 56 }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = total === 0 ? 0 : Math.min(present / total, 1);
  const dash = pct * circumference;
  const color =
    pct === 1
      ? "#10b981"
      : pct >= 0.5
        ? "#f59e0b"
        : "#ef4444";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={5}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeDasharray={`${dash} ${circumference}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.5s ease" }}
      />
    </svg>
  );
}

// ── Mini progress badge (used in table column) ────────────────────────────────

export function DocProgressBadge({ present, total, onClick }) {
  const pct = total === 0 ? 0 : Math.round((present / total) * 100);
  const color =
    pct === 100
      ? "text-emerald-600"
      : pct >= 50
        ? "text-amber-600"
        : "text-red-500";

  return (
    <button
      onClick={onClick}
      className="relative inline-flex items-center justify-center focus:outline-none group"
      title={`${present}/${total} docs — click to manage`}
    >
      <ProgressRing present={present} total={total} size={40} />
      <span className={`absolute text-[10px] font-bold rotate-[90deg] ${color}`}>
        {pct}%
      </span>
      <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] bg-slate-800 text-white rounded px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {present}/{total} docs
      </span>
    </button>
  );
}

// ── Main Drawer ───────────────────────────────────────────────────────────────

// Keys that represent Indian Rupee amounts
const MONEY_KEYS = new Set(["stipend", "annual_ctc", "performance_variable", "retention_bonus"]);

// Mirror of the backend Indian lakh formatter (commas only, for input display)
function fmtWithCommas(raw) {
  const digits = String(raw).replace(/[^0-9]/g, "");
  if (!digits) return "";
  const n = parseInt(digits, 10);
  const s = String(n);
  if (s.length <= 3) return s;
  let result = s.slice(-3);
  let rest = s.slice(0, -3);
  while (rest.length > 2) {
    result = rest.slice(-2) + "," + result;
    rest = rest.slice(0, -2);
  }
  if (rest) result = rest + "," + result;
  return result;
}

// Define which fields to ask HR for each doc type
const DYNAMIC_FIELDS = {
  internship_offer_letter: [
    { key: "stipend", label: "Monthly Stipend (₹)", placeholder: "e.g. 15000", type: "text" },
    { key: "performance_variable", label: "Performance Variable (₹)", placeholder: "e.g. 5000 (optional)", type: "text" },
    {
      key: "duration_months",
      label: "Internship Duration",
      type: "radio",
      options: [
        { label: "3 Months", value: "3" },
        { label: "6 Months", value: "6" }
      ]
    },
    {
      key: "role_responsibilities",
      label: "Role & Responsibilities",
      type: "radio",
      options: [
        { label: "AI/ML Annotator", value: "assisting in developing, training, evaluating, and deploying AI/ML models while contributing to data preprocessing, experimentation, model optimization, and real-world AI solutions." },
        { label: "Robotics Annotator", value: "accurately annotating robotics sensor data (e.g., images, video, LiDAR) to support the training, testing, and improvement of robotic perception and control systems." }
      ]
    }
  ],
  fulltime_offer_letter: [
    { key: "annual_ctc", label: "Base (₹)", placeholder: "e.g. 600000", type: "text" },
    { key: "performance_variable", label: "Performance Bonus (₹)", placeholder: "e.g. 50000 (optional)", type: "text" },
    { key: "retention_bonus", label: "Retention Bonus (₹)", placeholder: "e.g. 50000 (optional)", type: "text" },
  ],
};

export default function EmployeeDocumentDrawer({ employee, onClose }) {
  const queryClient = useQueryClient();
  const uploadRef = useRef({});

  // Modal state for HR dynamic inputs
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [pendingDocType, setPendingDocType] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [generateForm, setGenerateForm] = useState({});

  const qKey = ["employee-docs", employee?.id];

  const { data: docs = [], isLoading } = useQuery({
    queryKey: qKey,
    queryFn: () => employeeDocumentApi.list(employee.id),
    select: (res) => res?.documents ?? res ?? [],
    enabled: !!employee?.id,
  });

  // Build a map: doc_type → latest active document
  const docMap = {};
  (docs || []).forEach((d) => {
    if (d.is_active) docMap[d.doc_type] = d;
  });

  const presentCount = Object.keys(docMap).length;
  const totalCount = Object.keys(DOC_LABELS).length;

  // Mutations
  const generateMutation = useMutation({
    mutationFn: ({ docType, dynamicData }) =>
      employeeDocumentApi.generate(employee.id, docType, dynamicData),
    onSuccess: (_, { docType }) => {
      toast.success(`${DOC_LABELS[docType]} generated`);
      queryClient.invalidateQueries({ queryKey: qKey });
      queryClient.invalidateQueries({ queryKey: ["employee-docs-summary", employee.id] });
    },
    onError: (err, { docType }) => {
      toast.error(`Failed to generate ${DOC_LABELS[docType]}: ${err?.response?.data?.detail || err.message}`);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ docType, file }) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("doc_type", docType);
      return employeeDocumentApi.upload(employee.id, fd);
    },
    onSuccess: (_, { docType }) => {
      toast.success(`${DOC_LABELS[docType]} uploaded`);
      queryClient.invalidateQueries({ queryKey: qKey });
      queryClient.invalidateQueries({ queryKey: ["employee-docs-summary", employee.id] });
    },
    onError: (err) => {
      toast.error(`Upload failed: ${err?.response?.data?.detail || err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ docId }) => employeeDocumentApi.remove(employee.id, docId),
    onSuccess: () => {
      setDeleteTarget(null);
      toast.success("Document removed");
      queryClient.invalidateQueries({ queryKey: qKey });
      queryClient.invalidateQueries({ queryKey: ["employee-docs-summary", employee.id] });
    },
    onError: (err) => {
      setDeleteTarget(null);
      // 503 means the API is saturated, not that the document is undeletable —
      // the record is untouched, so say "try again" rather than "failed".
      if (err?.response?.status === 503) {
        toast.error("Server is busy right now. Nothing was deleted — please try again shortly.");
        return;
      }
      toast.error(`Delete failed: ${err?.response?.data?.detail || err.message}`);
    },
  });

  const bulkGenerateMutation = useMutation({
    mutationFn: () => employeeDocumentApi.bulkGenerate(employee.id),
    onSuccess: (data) => {
      const ok = (data.results || []).filter((r) => r.status === "ok").length;
      const fail = (data.results || []).filter((r) => r.status === "error").length;
      if (fail === 0) {
        toast.success(`All ${ok} documents generated successfully`);
      } else {
        toast.error(`${ok} generated, ${fail} failed — check console`);
        console.error("Bulk generate errors:", data.results.filter((r) => r.status === "error"));
      }
      queryClient.invalidateQueries({ queryKey: qKey });
      queryClient.invalidateQueries({ queryKey: ["employee-docs-summary", employee.id] });
    },
    onError: (err) => {
      toast.error(`Bulk generate failed: ${err?.response?.data?.detail || err.message}`);
    },
  });

  const handlePreview = async (docId) => {
    try {
      const { download_url: url } = await employeeDocumentApi.download(employee.id, docId);
      window.open(url, "_blank");
    } catch {
      toast.error("Could not generate preview link");
    }
  };

  const handleDownload = async (docId, fileName) => {
    try {
      const { download_url: url } = await employeeDocumentApi.download(employee.id, docId);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || "document.pdf";
      a.target = "_blank";
      a.click();
    } catch {
      toast.error("Could not generate download link");
    }
  };

  const handleFileSelect = (docType, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate({ docType, file });
    e.target.value = "";
  };

  // Open the HR inputs modal before generating
  const handleGenerateClick = (docType) => {
    const fields = DYNAMIC_FIELDS[docType];
    if (fields && fields.length > 0) {
      // Reset form and open modal
      setGenerateForm({});
      setPendingDocType(docType);
      setShowGenerateModal(true);
    } else {
      // No dynamic fields needed — generate immediately
      generateMutation.mutate({ docType, dynamicData: {} });
    }
  };

  // Confirm: fire the generate mutation with HR-entered data
  const handleGenerateConfirm = () => {
    setShowGenerateModal(false);
    // Strip commas from money fields before sending to backend
    const cleaned = { ...generateForm };
    MONEY_KEYS.forEach((key) => {
      if (cleaned[key]) cleaned[key] = cleaned[key].replace(/,/g, "");
    });
    generateMutation.mutate({ docType: pendingDocType, dynamicData: cleaned });
  };

  if (!employee) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="fixed right-0 top-0 h-full w-[460px] max-w-full bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-slate-800 truncate">
              {employee.name}
            </h2>
            <p className="text-xs text-slate-500">
              {presentCount === totalCount
                ? "All documents complete ✓"
                : `${totalCount - presentCount} document${totalCount - presentCount !== 1 ? "s" : ""} missing`}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : (
            Object.entries(DOC_LABELS).map(([docType, label]) => {
              const doc = docMap[docType];
              const isPresent = Boolean(doc);
              const isGenerating =
                generateMutation.isPending &&
                generateMutation.variables?.docType === docType;
              const isUploading =
                uploadMutation.isPending &&
                uploadMutation.variables?.docType === docType;
              const isDeleting =
                deleteMutation.isPending &&
                deleteMutation.variables?.docId === doc?.id;
              const canGenerate = GENERATABLE.has(docType);

              return (
                <div key={docType} className="space-y-1">
                  <div
                    className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-all ${isPresent
                      ? "border-emerald-200 bg-emerald-50/60"
                      : "border-slate-200 bg-slate-50/60"
                      }`}
                  >
                    {isPresent ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-slate-800 truncate">
                        {label}
                      </p>
                      {isPresent ? (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          v{doc.version} · {doc.source === "generated" ? "Auto-generated" : "Uploaded"} · {doc.file_name}
                        </p>
                      ) : (
                        <p className="text-[11px] text-red-400 mt-0.5">Missing</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isPresent && (
                        <button
                          onClick={() => handlePreview(doc.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Preview"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {isPresent && (
                        <button
                          onClick={() => handleDownload(doc.id, doc.file_name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {canGenerate && (
                        <button
                          onClick={() => handleGenerateClick(docType)}
                          disabled={isGenerating}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors disabled:opacity-40"
                          title={isPresent ? "Regenerate PDF" : "Generate PDF"}
                        >
                          {isGenerating ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isPresent ? (
                            <RefreshCw className="w-3.5 h-3.5" />
                          ) : (
                            <Wand2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}

                      <label
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                        title="Upload PDF"
                      >
                        {isUploading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <input
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={(e) => handleFileSelect(docType, e)}
                        />
                      </label>

                      {isPresent && (
                        <button
                          onClick={() => setDeleteTarget({ docId: doc.id, docType })}
                          disabled={isDeleting}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                          title="Remove"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── HR Dynamic Inputs Modal ──────────────────────────────────────────── */}
      {showGenerateModal && pendingDocType && (
        <>
          {/* Overlay (above drawer backdrop) */}
          <div
            className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center"
            onClick={() => setShowGenerateModal(false)}
          />
          <div className="fixed z-[70] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] max-w-[90vw] bg-white rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-slate-800">
                  Generate {DOC_LABELS[pendingDocType]}
                </h3>
                <p className="text-[12px] text-slate-500 mt-0.5">
                  Enter the details to include in this document.
                </p>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dynamic Fields */}
            <div className="flex flex-col gap-3">
              {(DYNAMIC_FIELDS[pendingDocType] || []).map((field) => (
                <div key={field.key}>
                  <label className="block text-[12px] font-medium text-slate-600 mb-1">
                    {field.label}
                  </label>
                  {field.type === "radio" ? (
                    <div className="flex gap-4 mt-1">
                      {field.options.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`gen-field-${field.key}`}
                            value={opt.value}
                            checked={generateForm[field.key] === opt.value}
                            onChange={(e) =>
                              setGenerateForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                            }
                            className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-slate-300"
                          />
                          <span className="text-[13px] text-slate-700">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <input
                      id={`gen-field-${field.key}`}
                      type={field.type}
                      placeholder={field.placeholder}
                      value={generateForm[field.key] || ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const formatted = MONEY_KEYS.has(field.key)
                          ? fmtWithCommas(raw)
                          : raw;
                        setGenerateForm((prev) => ({ ...prev, [field.key]: formatted }));
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                id="generate-confirm-btn"
                onClick={handleGenerateConfirm}
                disabled={generateMutation.isPending}
                className="px-4 py-2 rounded-lg text-[13px] font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5" />
                )}
                Generate PDF
              </button>
            </div>
          </div>
        </>
      )}

      {/* Deleting a document also removes the underlying file from storage, so it
          cannot be undone by re-activating the record. That became true only once
          the API started clearing the storage object on delete, so the action now
          asks first instead of firing on a single click. */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate({ docId: deleteTarget.docId })}
        title="Remove document"
        message={`Remove the ${DOC_LABELS[deleteTarget?.docType] || "document"} for ${employee?.name || "this employee"}? The stored file is deleted permanently and cannot be restored.`}
        confirmText="Remove"
        variant="danger"
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
