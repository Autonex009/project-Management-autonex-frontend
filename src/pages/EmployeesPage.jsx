import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import usePageStateStore from "../store/usePageStateStore";
import { usePageScroll } from "../hooks/usePageScroll";
import {
  employeeApi,
  skillApi,
  allocationApi,
  subProjectApi,
  parentProjectApi,
  leaveApi,
} from "../services/api";
import {
  Plus,
  Edit,
  Trash2,
  X,
  User,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowUpCircle,
  RotateCcw,
  MoreVertical,
  Users,
  UserCheck,
  Briefcase,
  Award,
  ShieldCheck,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  Lock,
  Archive,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import UserAvatar from "../components/ui/UserAvatar";
import MetricDots from "../components/ui/MetricDots";
import {
  todayLocalISO,
  isArchived,
  getOnLeaveTodayIds,
  buildAssignedProjectsMap,
  hasAssignedProject,
  bucketWorkforce,
} from "../utils/workforce";
import { formatDisplayName, getNameInitials } from "../utils/displayName";
import Table, {
  ColumnTemplates,
  formatDateDeterministic,
} from "../components/ui/Table";
import Dropdown from "../components/ui/Dropdown";
import Spinner from "../components/ui/LoadingSpinner";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";

const LEAVE_TYPE_LABELS = {
  paid: "Paid Leave",
  casual_sick: "Casual/Sick",
  floater: "Floater",
};

const LEAVE_TYPE_COLORS = {
  paid: "bg-blue-100 text-blue-700",
  casual_sick: "bg-emerald-100 text-emerald-700",
  floater: "bg-amber-100 text-amber-700",
};

const STATUS_COLORS = {
  approved: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
};

// One definition of "does this employee match what was typed", used both to filter
// the loaded roster and to decide whether the term is unknown client-side and worth
// asking the server about. Encord IDs are included because that is the only place
// they can be searched — see the ``search`` param on GET /api/employees.
// Stored Encord IDs are trimmed here: a few carry leading whitespace from import.
const matchesSearchTerm = (employee, term) => {
  if (!term) return true;
  
  // Split search term by spaces to match individual words
  const searchParts = term.trim().split(/\s+/);
  
  // Combine all searchable fields into one big string
  const fieldsText = [
    employee.name,
    employee.email,
    employee.designation,
    employee.encord_id,
  ]
    .map((field) => String(field || "").trim().toLowerCase())
    .join(" ");

  // Check if every word typed by the user exists somewhere in the employee's data
  return searchParts.every((part) => fieldsText.includes(part));
};

function formatDateRange(start, end) {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const fmt = (d) =>
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return start === end ? fmt(s) : `${fmt(s)} â€“ ${fmt(e)}`;
}

function EmployeeAvailabilityModal({ employee, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ["employee-availability", employee.id],
    queryFn: () => employeeApi.getAvailability(employee.id),
    staleTime: 30_000,
  });

  return (
    <Modal isOpen onClose={onClose} size="lg" maxHeight="90vh">
      <Modal.Header onClose={onClose}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              {formatDisplayName(employee.name)}
            </h2>
            <p className="text-sm text-slate-400">
              {employee.designation || "Employee"}
            </p>
          </div>
        </div>
      </Modal.Header>

      {isLoading ? (
        <Modal.Body>
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
            Loading availability...
          </div>
        </Modal.Body>
      ) : data ? (
        <Modal.Body className="space-y-6">
          {/* Availability Banner */}
          <div
            className={`flex items-center gap-3 rounded-xl px-4 py-3 ${data.available_next_30_days ? "bg-emerald-50 border border-emerald-100" : "bg-amber-50 border border-amber-100"}`}
          >
            {data.available_next_30_days ? (
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            )}
            <div>
              <p
                className={`text-sm font-semibold ${data.available_next_30_days ? "text-emerald-700" : "text-amber-700"}`}
              >
                {data.available_next_30_days
                  ? "Available for the next 30 days"
                  : "Has leave/WFH in the next 30 days"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                As of{" "}
                {new Date(data.today + "T00:00:00").toLocaleDateString(
                  "en-IN",
                  { day: "numeric", month: "long", year: "numeric" },
                )}
              </p>
            </div>
          </div>

          {/* Upcoming Leaves */}
          {(data.upcoming_leaves.length > 0 ||
            data.upcoming_wfh.length > 0) && (
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Upcoming (Next 30 Days)
                </h3>
                <div className="space-y-2">
                  {data.upcoming_leaves.map((leave) => (
                    <div
                      key={leave.leave_id}
                      className="flex items-start gap-3 rounded-xl border border-slate-100 p-3"
                    >
                      <div className="mt-0.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${LEAVE_TYPE_COLORS[leave.leave_type] || "bg-slate-100 text-slate-600"}`}
                        >
                          {LEAVE_TYPE_LABELS[leave.leave_type] ||
                            leave.leave_type}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700">
                          {formatDateRange(leave.start_date, leave.end_date)}
                        </p>
                        {leave.reason && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            {leave.reason}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[leave.status] || "bg-slate-100 text-slate-500"}`}
                      >
                        {leave.status}
                      </span>
                    </div>
                  ))}
                  {data.upcoming_wfh.map((wfh) => (
                    <div
                      key={wfh.id}
                      className="flex items-start gap-3 rounded-xl border border-slate-100 p-3"
                    >
                      <div className="mt-0.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700">
                          ðŸ  WFH
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700">
                          {new Date(wfh.date + "T00:00:00").toLocaleDateString(
                            "en-IN",
                            { day: "numeric", month: "short", weekday: "short" },
                          )}
                        </p>
                        {wfh.reason && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            {wfh.reason}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[wfh.status] || "bg-slate-100 text-slate-500"}`}
                      >
                        {wfh.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

          {/* Past Leaves */}
          {(data.past_leaves.length > 0 || data.past_wfh.length > 0) && (
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Past 30 Days
              </h3>
              <div className="space-y-2">
                {data.past_leaves.map((leave) => (
                  <div
                    key={leave.leave_id}
                    className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <div className="mt-0.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${LEAVE_TYPE_COLORS[leave.leave_type] || "bg-slate-100 text-slate-600"}`}
                      >
                        {LEAVE_TYPE_LABELS[leave.leave_type] ||
                          leave.leave_type}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-600">
                        {formatDateRange(leave.start_date, leave.end_date)}
                      </p>
                      {leave.reason && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {leave.reason}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[leave.status] || "bg-slate-100 text-slate-500"}`}
                    >
                      {leave.status}
                    </span>
                  </div>
                ))}
                {data.past_wfh.map((wfh) => (
                  <div
                    key={wfh.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <div className="mt-0.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700">
                        ðŸ  WFH
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-600">
                        {new Date(wfh.date + "T00:00:00").toLocaleDateString(
                          "en-IN",
                          { day: "numeric", month: "short", weekday: "short" },
                        )}
                      </p>
                      {wfh.reason && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {wfh.reason}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[wfh.status] || "bg-slate-100 text-slate-500"}`}
                    >
                      {wfh.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.upcoming_leaves.length === 0 &&
            data.upcoming_wfh.length === 0 &&
            data.past_leaves.length === 0 &&
            data.past_wfh.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">
                No leave or WFH records in the past or next 30 days.
              </p>
            )}
        </Modal.Body>
      ) : null}
    </Modal>
  );
}

function EmployeeArchiveModal({ employee, onClose, onConfirm, isPending }) {
  const { data: allocations, isLoading } = useQuery({
    queryKey: ["employee-allocations-archive", employee.id],
    queryFn: () => allocationApi.getByEmployee(employee.id),
    staleTime: 0,
  });

  const hasAllocations = allocations && allocations.length > 0;

  return (
    <Modal isOpen onClose={onClose} size="md" maxHeight="90vh">
      <Modal.Header onClose={onClose}>
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${hasAllocations ? "bg-amber-50 text-amber-500" : "bg-red-50 text-red-500"}`}
          >
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              {hasAllocations ? "Cannot Archive Employee" : "Archive Employee"}
            </h2>
            <p className="text-sm text-slate-400">{formatDisplayName(employee.name)}</p>
          </div>
        </div>
      </Modal.Header>

      {isLoading ? (
        <Modal.Body>
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
            <Spinner size="sm" color="indigo" text="Checking allocations..." />
          </div>
        </Modal.Body>
      ) : (
        <>
          <Modal.Body className="space-y-4">
            {hasAllocations ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600 leading-relaxed">
                  <strong>{formatDisplayName(employee.name)}</strong> cannot be archived because
                  they are currently allocated to the following projects. Please
                  remove their allocations first:
                </p>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto">
                  {allocations.map((alloc) => (
                    <div
                      key={alloc.id}
                      className="flex justify-between items-center text-xs text-slate-700 font-medium"
                    >
                      <span>
                        {alloc.sub_project_name ||
                          alloc.project_name ||
                          `Project (ID: ${alloc.sub_project_id})`}
                      </span>
                      <span className="text-slate-400 font-normal">
                        {alloc.total_daily_hours}h/day (
                        {alloc.allocation_percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  Are you sure you want to archive{" "}
                  <strong>{formatDisplayName(employee.name)}</strong>?
                </p>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2.5">
                  <div className="flex gap-2.5 text-xs text-amber-850 leading-relaxed">
                    <span className="flex-shrink-0"><Lock className="w-4 h-4 text-amber-500" /></span>
                    <span>
                      System access to the portal will be immediately revoked.
                    </span>
                  </div>
                  <div className="flex gap-2.5 text-xs text-amber-850 leading-relaxed">
                    <span className="flex-shrink-0"><Archive className="w-4 h-4 text-amber-500" /></span>
                    <span>
                      All historical data (leaves, project allocations history)
                      will be preserved for records.
                    </span>
                  </div>
                  <div className="flex gap-2.5 text-xs text-amber-850 leading-relaxed">
                    <span className="flex-shrink-0"><RotateCcw className="w-4 h-4 text-amber-500" /></span>
                    <span>
                      You can restore this employee at any time from the
                      "Archived / Former" tab.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            {hasAllocations ? (
              <Button variant="cancel" onClick={onClose}>
                Close
              </Button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <Button
                  variant="warning"
                  onClick={onConfirm}
                  disabled={isPending}
                  isLoading={isPending}
                >
                  {!isPending && "Archive"}
                </Button>
              </>
            )}
          </Modal.Footer>
        </>
      )}
    </Modal>
  );
}

function EmployeeRestoreModal({ employee, onClose, onConfirm, isPending }) {
  return (
    <Modal isOpen onClose={onClose} size="md" maxHeight="90vh">
      <Modal.Header onClose={onClose}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center flex-shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              Restore Employee
            </h2>
            <p className="text-sm text-slate-400">{formatDisplayName(employee.name)}</p>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="space-y-4">
        <p className="text-sm text-slate-600 leading-relaxed">
          Are you sure you want to restore <strong>{formatDisplayName(employee.name)}</strong> as
          an active employee?
        </p>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-2.5">
          <div className="flex gap-2.5 text-xs text-emerald-850 leading-relaxed">
            <span className="flex-shrink-0"><KeyRound className="w-4 h-4 text-emerald-500" /></span>
            <span>
              Their portal account will be reactivated, allowing them to log in
              again.
            </span>
          </div>
          <div className="flex gap-2.5 text-xs text-emerald-850 leading-relaxed">
            <span className="flex-shrink-0"><Users className="w-4 h-4 text-emerald-500" /></span>
            <span>They will show up in the active employee list.</span>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="cancel" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="success"
          onClick={onConfirm}
          disabled={isPending}
          isLoading={isPending}
        >
          {!isPending && "Restore"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function EmployeeConvertToFulltimeModal({
  employee,
  onClose,
  onConfirm,
  isPending,
}) {
  return (
    <Modal isOpen onClose={onClose} size="md" maxHeight="90vh">
      <Modal.Header onClose={onClose}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center flex-shrink-0">
            <ArrowUpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              Convert to Full-time
            </h2>
            <p className="text-sm text-slate-400">{formatDisplayName(employee.name)}</p>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="space-y-4">
        <p className="text-sm text-slate-600 leading-relaxed">
          Convert <strong>{formatDisplayName(employee.name)}</strong> from Intern to Full-time
          employee?
        </p>
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-2.5">
          <div className="flex gap-2.5 text-xs text-indigo-850 leading-relaxed">
            <span className="flex-shrink-0"><FileText className="w-4 h-4 text-indigo-500" /></span>
            <span>
              This updates the existing record in place — all leave, payroll,
              performance and other history is preserved.
            </span>
          </div>
          <div className="flex gap-2.5 text-xs text-indigo-850 leading-relaxed">
            <span className="flex-shrink-0"><Briefcase className="w-4 h-4 text-indigo-500" /></span>
            <span>Full-time leave entitlements will apply going forward.</span>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="cancel" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={isPending} isLoading={isPending}>
          {!isPending && "Convert"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function EmployeeCredentialsModal({ credentials, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!credentials) return null;

  const handleCopy = () => {
    const text = `PM Portal Login Credentials\n---------------------------\nName: ${credentials.name}\nEmail: ${credentials.email}\nTemporary Password: ${credentials.temp_password}\nPortal Link: ${credentials.portal_url}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Credentials copied to clipboard!");
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <Modal isOpen onClose={onClose} size="md" maxHeight="90vh">
      <Modal.Header onClose={onClose}>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Employee Created — Login Credentials
            </h3>
            <p className="text-xs text-gray-500">
              Temporary access key generated for first-time sign-in
            </p>
          </div>
        </div>
      </Modal.Header>
      <Modal.Body className="space-y-4">
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 text-xs text-emerald-800 flex items-start gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Welcome email dispatched:</span> A welcome notification with these temporary credentials has been automatically sent to <strong>{credentials.email}</strong>.
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
            <span className="text-gray-500 font-medium">Employee Name</span>
            <span className="font-semibold text-gray-900">{credentials.name}</span>
          </div>
          <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
            <span className="text-gray-500 font-medium">Email / Username</span>
            <span className="font-mono text-gray-900">{credentials.email}</span>
          </div>
          <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
            <span className="text-gray-500 font-medium">Temporary Password</span>
            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 select-all">
              {credentials.temp_password}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 font-medium">Portal URL</span>
            <a
              href={credentials.portal_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-600 hover:text-indigo-800 underline truncate max-w-[220px]"
            >
              {credentials.portal_url}
            </a>
          </div>
        </div>

        <p className="text-xs text-gray-500 italic">
          * The employee will be prompted to choose a permanent, private password immediately upon their first login.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button
          type="button"
          variant="secondary"
          onClick={handleCopy}
          className="flex items-center gap-1.5"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? "Copied" : "Copy Credentials"}</span>
        </Button>
        <Button type="button" onClick={onClose}>
          Done
        </Button>
      </Modal.Footer>
    </Modal>
  );
}


// Order matters only for the dropdown. "Team Lead" grants the PM portal in read-only
// form — the mapping that makes that happen lives in DESIGNATION_ROLE_MAP
// (backend/app/api/employees.py) and DESIGNATION_ACCESS (backend/app/api/auth.py).
const ALLOWED_DESIGNATIONS = [
  "Admin",
  "HR",
  "Annotator/ Reviewer",
  "Program Manager",
  "Team Lead",
  "Developer",
];

// Custom Multi-Select Dropdown Component
const MultiSelectDropdown = ({
  name,
  defaultValue = [],
  predefinedSkills,
  queryClient,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState(defaultValue);
  const [customSkill, setCustomSkill] = useState("");
  const [allSkills, setAllSkills] = useState(predefinedSkills);
  const dropdownRef = useRef(null);

  // Update allSkills when predefinedSkills changes
  useEffect(() => {
    setAllSkills(predefinedSkills);
  }, [predefinedSkills]);

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
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  };

  const addCustomSkill = async () => {
    const skill = customSkill.trim();
    if (skill && !allSkills.includes(skill)) {
      // Add to local state immediately
      setAllSkills((prev) => [...prev, skill]);
      setSelectedSkills((prev) => [...prev, skill]);
      setCustomSkill("");

      // Create skill in backend and refresh the list
      try {
        await skillApi.create({ name: skill });
        queryClient.invalidateQueries(["skills"]);
      } catch (error) {
        console.error("Failed to create skill:", error);
        toast.error("Failed to create custom skill");
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomSkill();
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Hidden input to submit form data */}
      <input type="hidden" name={name} value={selectedSkills.join(",")} />

      {/* Dropdown trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white cursor-pointer flex items-center justify-between min-h-[42px]"
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {selectedSkills.length > 0 ? (
            selectedSkills.map((skill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 border border-blue-200"
              >
                {skill}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSkill(skill);
                  }}
                  className="hover:text-red-600 transition-colors"
                  title="Remove skill"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm">Select skills...</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-350 rounded-lg shadow-xl max-h-80 flex flex-col overflow-hidden">
          <div className="overflow-y-auto flex-1">
            {allSkills.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No skills available. Add one below!
              </div>
            ) : (
              allSkills.map((skill) => (
                <div
                  key={skill}
                  className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors group"
                >
                  <label className="flex items-center flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSkills.includes(skill)}
                      onChange={() => toggleSkill(skill)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-900">{skill}</span>
                  </label>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const skillObj = (
                          queryClient.getQueryData(["skills"]) || []
                        ).find((s) => s.name === skill);
                        if (skillObj) {
                          await skillApi.delete(skillObj.id);
                          queryClient.invalidateQueries(["skills"]);
                        }
                        setAllSkills((prev) => prev.filter((s) => s !== skill));
                        setSelectedSkills((prev) =>
                          prev.filter((s) => s !== skill),
                        );
                        toast.success(`Skill "${skill}" deleted`);
                      } catch (err) {
                        toast.error("Failed to delete skill");
                      }
                    }}
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 transition-opacity"
                    title="Delete skill"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add custom skill section */}
          <div className="border-t border-slate-200 p-3 bg-slate-50 flex-shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add custom skill..."
                className="flex-1 px-3 py-1.5 text-sm border border-slate-350 rounded-md focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
              />
              <Button
                type="button"
                variant="blue"
                size="sm"
                onClick={addCustomSkill}
              >
                Add
              </Button>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400 font-medium">
              Press Enter or click Add
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const DesignationMultiSelect = ({ options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (opt) => {
    onChange(
      value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt],
    );
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-100 outline-none w-full justify-between"
      >
        <span
          className={`truncate ${value.length === 0 ? "text-slate-500" : "text-slate-800 font-medium"}`}
        >
          {value.length === 0
            ? "Designation"
            : value.length === 1
              ? value[0]
              : `${value.length} selected`}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] bg-white border border-slate-200 rounded-lg shadow-lg py-1">
          {value.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="w-full text-left px-4 py-1.5 text-xs text-slate-400 hover:text-slate-600 border-b border-slate-100 mb-1"
            >
              Clear all
            </button>
          )}
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm"
            >
              <input
                type="checkbox"
                checked={value.includes(opt)}
                onChange={() => toggle(opt)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <span className="text-slate-700">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

const SORT_OPTIONS = [
  { value: "", label: "Default" },
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
];

// Toolbar "Filter" button — collapses Skills + Designation filters into a popover (Untitled-UI style).
const FilterButton = ({
  predefinedSkills,
  skillFilter,
  setSkillFilter,
  designationOptions,
  designationFilter,
  setDesignationFilter,
  typeFilter,
  setTypeFilter,
  typeOptions,
  workModelFilter,
  setWorkModelFilter,
  workModelOptions,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeCount =
    (skillFilter ? 1 : 0) +
    (designationFilter.length > 0 ? 1 : 0) +
    (typeFilter ? 1 : 0) +
    (workModelFilter ? 1 : 0);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <Filter className="w-4 h-4 text-slate-500" />
        Filters
        {activeCount > 0 && (
          <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-indigo-600 text-white text-[10px] font-semibold">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 z-40 w-[22rem] bg-white rounded-xl shadow-xl border border-slate-200 p-3">
          <div className="grid grid-cols-2 gap-x-2.5 gap-y-2.5">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Skills
              </label>
              <Dropdown
                options={[
                  { value: "", label: "Skills" },
                  ...predefinedSkills.map((s) => ({ value: s, label: s })),
                ]}
                value={skillFilter}
                onChange={(val) => {
                  setSkillFilter(val);
                  onChange?.();
                }}
                placeholder="Skills"
                optionsClassName="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Designation
              </label>
              <DesignationMultiSelect
                options={designationOptions}
                value={designationFilter}
                onChange={(val) => {
                  setDesignationFilter(val);
                  onChange?.();
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Type
              </label>
              <Dropdown
                options={[
                  { value: "", label: "Types" },
                  ...typeOptions.map((t) => ({ value: t, label: t })),
                ]}
                value={typeFilter}
                onChange={(val) => {
                  setTypeFilter(val);
                  onChange?.();
                }}
                placeholder="Types"
                optionsClassName="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Work Model
              </label>
              <Dropdown
                options={[
                  { value: "", label: "Work Models" },
                  ...workModelOptions.map((w) => ({ value: w, label: w })),
                ]}
                value={workModelFilter}
                onChange={(val) => {
                  setWorkModelFilter(val);
                  onChange?.();
                }}
                placeholder="Work Models"
                optionsClassName="w-full"
              />
            </div>
          </div>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setSkillFilter("");
                setDesignationFilter([]);
                setTypeFilter("");
                setWorkModelFilter("");
                onChange?.();
              }}
              className="w-full text-center mt-2.5 pt-2.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 border-t border-slate-100"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Toolbar "Sort by" menu (Untitled-UI style).
const SortMenu = ({ sortBy, setSortBy }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = SORT_OPTIONS.find((o) => o.value === sortBy);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <ArrowUpDown className="w-4 h-4 text-slate-500" />
        <span className="hidden sm:inline">
          Sort by{current?.value ? `: ${current.label}` : ""}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 z-40 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value || "default"}
              type="button"
              onClick={() => {
                setSortBy(opt.value);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {opt.label}
              {sortBy === opt.value && (
                <Check className="w-4 h-4 text-indigo-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/** Single clickable metric tile used inside KPI cards */
const StatTile = ({
  label,
  value,
  active,
  onClick,
  activeBg,
  idleBg,
  textClass,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-2 rounded-xl text-center border transition-all hover:scale-[1.02] ${
      active ? activeBg : idleBg
    }`}
  >
    <div
      className={`text-base sm:text-lg font-extrabold font-mono leading-none ${textClass}`}
    >
      {value}
    </div>
    <div
      className={`text-[10px] font-bold uppercase tracking-wider mt-1 truncate ${textClass}`}
    >
      {label}
    </div>
  </button>
);

/** Shared KPI card shell (icon + title + 3-tile grid) */
const KpiCard = ({ icon: Icon, iconBg, title, children }) => (
  <div className="bg-white border border-slate-200/70 rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:shadow-md transition-all duration-200">
    <div className="flex items-center justify-between gap-2 mb-2.5 min-h-[32px]">
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="text-[12.5px] font-bold text-slate-800 uppercase tracking-wider truncate">
          {title}
        </div>
      </div>
      {/* Optional right-side total can be passed as children header if needed */}
    </div>
    <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
      {children}
    </div>
  </div>
);

function EmployeeActionMenu({
  row,
  statusParam,
  setRestoreTarget,
  handleConvertToFulltime,
  setEditingEmployee,
  setFormDesignation,
  setFormEmployeeType,
  setFormWorkModel,
  setIsModalOpen,
  setArchiveTarget,
  convertPending,
  restorePending,
  archivePending,
  isNearBottom,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const positionClass = isNearBottom ? "bottom-full mb-1.5" : "top-full mt-1.5";

  return (
    <div
      className={`relative inline-block text-left ${isOpen ? "z-[100]" : ""}`}
      ref={menuRef}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ${isOpen ? "bg-slate-100 text-slate-700 " : ""
          }`}
        title="More Actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 ${positionClass} z-50 w-44 bg-white rounded-xl shadow-xl border border-slate-200/80 py-1 text-xs font-medium focus:outline-none`}
          onClick={(e) => e.stopPropagation()}
        >
          {statusParam === "archived" ? (
            <button
              onClick={() => {
                setIsOpen(false);
                setRestoreTarget(row);
              }}
              disabled={restorePending}
              className="w-full text-left px-3 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-500" />
              <span>Restore Employee</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setEditingEmployee(row);
                  setFormDesignation(row.designation || "Annotator/ Reviewer");
                  setFormEmployeeType(row.employee_type || "Full-time");
                  setFormWorkModel(row.work_model || "WFO");
                  setIsModalOpen(true);
                }}
                className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
              >
                <Edit className="w-3.5 h-3.5 text-slate-400" />
                <span>Edit Profile</span>
              </button>

              {row.employee_type === "Intern" && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleConvertToFulltime(row);
                  }}
                  disabled={convertPending}
                  className="w-full text-left px-3 py-2 text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Promote to Full-time</span>
                </button>
              )}

              <div className="my-1 border-t border-slate-100 " />

              <button
                onClick={() => {
                  setIsOpen(false);
                  setArchiveTarget(row);
                }}
                disabled={archivePending}
                className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Archive</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const EmployeesPage = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const idleOnly = searchParams.get("idleOnly") === "true";
  const statusParam = searchParams.get("status");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [availabilityEmployee, setAvailabilityEmployee] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [convertToFulltimeTarget, setConvertToFulltimeTarget] = useState(null);
  const [newlyCreatedCredentials, setNewlyCreatedCredentials] = useState(null);
  const [formDesignation, setFormDesignation] = useState("Annotator/ Reviewer");
  const [formEmployeeType, setFormEmployeeType] = useState("Full-time");
  const [formWorkModel, setFormWorkModel] = useState("WFO");
    const PAGE_SIZE = 10;

  // ============================================================
  // PERSISTENCE KEYS
  // ============================================================
  // Root key  → remembers which tab the user was on
  //             (Active Team + All/Active/Inactive/Idle, or Archived)
  // Tab key   → remembers filters / search / page / scroll per top-level tab
  // ============================================================

  const PAGE_KEY = "employees";

  const tabKey = statusParam === "archived" ? "archived" : "active";
  const TAB_PAGE_KEY = `${PAGE_KEY}:${tabKey}`;

  const setPageState = usePageStateStore((s) => s.setPageState);

  // Root: last status (null = Active Team → All)
  const rootSaved = usePageStateStore((s) => s.pages[PAGE_KEY] || {});

  // Per-tab: filters, search, page
  const saved = usePageStateStore((s) => s.pages[TAB_PAGE_KEY] || {});

  // ============================================================
  // LOCAL STATE (hydrated from store)
  // ============================================================

  const [searchQuery, setSearchQuery] = useState(saved.searchQuery ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(saved.searchQuery ?? "");
  const [skillFilter, setSkillFilter] = useState(saved.skillFilter ?? "");
  const [designationFilter, setDesignationFilter] = useState(
    saved.designationFilter ?? [],
  );
  const [sortBy, setSortBy] = useState(saved.sortBy ?? "");
  const [colDesignation, setColDesignation] = useState(
    saved.colDesignation ?? "",
  );
  const [colType, setColType] = useState(saved.colType ?? "");
  const [colWorkModel, setColWorkModel] = useState(saved.colWorkModel ?? "");
  const [currentPage, setCurrentPage] = useState(saved.currentPage ?? 1);

  // ============================================================
  // 1. Restore status tab into the URL (runs once on mount)
  // ============================================================
  useEffect(() => {
    // Nothing stored yet → leave URL as-is
    if (!("statusParam" in rootSaved)) return;

    const lastStatus = rootSaved.statusParam; // string | null
    const params = new URLSearchParams(searchParams);
    const current = params.get("status");

    if (lastStatus === null || lastStatus === "") {
      // User was on Active Team → All
      if (current !== null) {
        params.delete("status");
        setSearchParams(params, { replace: true });
      }
    } else if (current !== lastStatus) {
      // User was on Active / Inactive / Idle / Archived
      params.set("status", lastStatus);
      setSearchParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally only on mount

  // ============================================================
  // 2. Persist the status tab whenever it changes
  // ============================================================
  useEffect(() => {
    setPageState(PAGE_KEY, {
      statusParam: statusParam || null, // null = "All"
    });
  }, [statusParam, setPageState]);

  // ============================================================
  // 3. Re-hydrate filters / page when switching Active ↔ Archived
  //    (component stays mounted, so useState initial values are ignored)
  // ============================================================
  useEffect(() => {
    const next = usePageStateStore.getState().pages[TAB_PAGE_KEY] || {};
    setSearchQuery(next.searchQuery ?? "");
    setDebouncedSearch(next.searchQuery ?? "");
    setSkillFilter(next.skillFilter ?? "");
    setDesignationFilter(next.designationFilter ?? []);
    setSortBy(next.sortBy ?? "");
    setColDesignation(next.colDesignation ?? "");
    setColType(next.colType ?? "");
    setColWorkModel(next.colWorkModel ?? "");
    setCurrentPage(next.currentPage ?? 1);
  }, [TAB_PAGE_KEY]);

  // ============================================================
  // 4. Persist filters / search / page for the current tab
  // ============================================================
  useEffect(() => {
    setPageState(TAB_PAGE_KEY, {
      searchQuery,
      skillFilter,
      designationFilter,
      sortBy,
      colDesignation,
      colType,
      colWorkModel,
      currentPage,
    });
  }, [
    TAB_PAGE_KEY,
    searchQuery,
    skillFilter,
    designationFilter,
    sortBy,
    colDesignation,
    colType,
    colWorkModel,
    currentPage,
    setPageState,
  ]);

  // ============================================================
  // 5. Scroll position
  // ============================================================
  usePageScroll(TAB_PAGE_KEY);

  // Fetch employee stats for KPI cards
  const { data: employeeStats } = useQuery({
    queryKey: ["employee-stats"],
    queryFn: () => employeeApi.getStats(),
  });

  // Fetch paginated employees for the grid
  const { data: paginatedEmployeesData, isLoading, isFetching } = useQuery({
    queryKey: [
      "employees-paginated",
      currentPage,
      PAGE_SIZE,
      statusParam,
      debouncedSearch,
      skillFilter,
      designationFilter,
      colDesignation,
      colType,
      sortBy
    ],
    queryFn: () =>
      employeeApi.getPaginated({
        page: currentPage,
        limit: PAGE_SIZE,
        status: statusParam || undefined,
        include_archived: statusParam === "archived",
        search: debouncedSearch || undefined,
        skill: skillFilter || undefined,
        designation: designationFilter.length > 0 ? designationFilter[0] : undefined,
        col_designation: colDesignation || undefined,
        col_type: colType || undefined,
        sort_by: sortBy || undefined,
      }),
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const employees = paginatedEmployeesData?.items || [];

  // Allocations, SubProjects, and MainProjects are now efficiently JOINed on the backend
  // and returned within the paginated `employees` items. No global fetch needed!


  // Who is away today drives the Inactive bucket. GET /leaves filters by
  // overlap (end_date >= start param AND start_date <= end param), so asking
  // for today..today returns every leave that covers today — including
  // multi-day ones that started earlier.
  const todayStr = todayLocalISO();
  const { data: leavesToday = [] } = useQuery({
    queryKey: ["leaves", "today", todayStr],
    queryFn: () =>
      leaveApi.getAll({ start_date: todayStr, end_date: todayStr }),
  });


  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Client-first, server-second search. The loaded roster is checked before any
  // request goes out; only a term that matches nobody here is worth asking the
  // server about, which is the case that matters for Encord IDs — the ID may
  // belong to someone outside the current view (archived, or a roster the client
  // has not loaded). Both lists are consulted because `allStaff` spans archived
  // employees while `employees` is the current tab's scope.
  const serverSearchTerm = debouncedSearch.trim();
  const clientKnowsTerm =
    serverSearchTerm.length === 0 ||
    (() => {
      const term = serverSearchTerm.toLowerCase();
      return employees.some((e) => matchesSearchTerm(e, term));
    })();
  // Two characters is the floor: shorter terms match half the roster and the
  // answer would be useless even if the request were cheap.
  const shouldSearchServer = serverSearchTerm.length >= 2 && !clientKnowsTerm;

  const { data: serverMatches = [], isFetching: serverSearching } = useQuery({
    queryKey: ["employees", "search", serverSearchTerm],
    queryFn: () =>
      employeeApi.getAll({ search: serverSearchTerm, include_archived: true }),
    enabled: shouldSearchServer,
    staleTime: 60_000,
  });

  // employee id -> Set<project name>. Shared with the Dashboard via
  // utils/workforce so both pages credit program managers the same way — a PM
  // running projects is working even with no allocation of their own, whether
  // that assignment sits on the main project or directly on the sub-project.
  // Stored status is deliberately not consulted: hiding a stored-"inactive"
  // person's real allocations would have filed them as Idle regardless of what
  // they are actually working on.
  const onLeaveTodayIds = getOnLeaveTodayIds(leavesToday, todayStr);
  const isOnLeaveToday = (e) => onLeaveTodayIds.has(String(e.id));
  const hasProject = (e) => e.assigned_projects && e.assigned_projects.length > 0;

  const onRosterCount = employeeStats?.total || 0;
  const activeCount = employeeStats?.by_status?.active || 0;
  const inactiveCount = employeeStats?.by_status?.inactive || 0;
  const idleCount = employeeStats?.by_status?.idle || 0;

  // Tab totals read from the include_archived query so both tabs show a count
  // no matter which one is currently loaded. While that query is still in
  // flight the counts are hidden rather than rendering a misleading 0.
  const archivedTeamCount = employeeStats?.by_status?.archived || 0;
  const activeTeamCount = employeeStats?.total || 0;
  const hasTeamCounts = !!employeeStats;

  // Everything below counts the ON-ROSTER population, matching the headline on
  // each card. These previously ran over allStaff, which includes the archived /
  // former staff — that is why Work Model showed WFO 229 beneath a 204 total.
  // KPI Classification 2: Type (Full-time, Intern, Contract)
  const fullTimeCount = Object.entries(employeeStats?.by_type_active || {}).reduce((sum, [type, count]) => {
    const t = (type || "").toLowerCase();
    return (t.includes("full") || t === "fulltime") ? sum + count : sum;
  }, 0);

  const internCount = Object.entries(employeeStats?.by_type_active || {}).reduce((sum, [type, count]) => {
    const t = (type || "").toLowerCase();
    return t.includes("intern") ? sum + count : sum;
  }, 0);

  const contractCount = Object.entries(employeeStats?.by_type_active || {}).reduce((sum, [type, count]) => {
    const t = (type || "").toLowerCase();
    return (t.includes("contract") || t.includes("part")) ? sum + count : sum;
  }, 0);

  // KPI Classification 3: Roles (Project Managers, Annotator/Reviewer, Team Leads / TL)
  const pmCount =
    Object.entries(employeeStats?.by_designation || {})
      .filter(([d]) => d.toLowerCase().includes("manager") || d.toLowerCase().includes("pm"))
      .reduce((sum, [_, count]) => sum + count, 0);

  const annotatorCount =
    Object.entries(employeeStats?.by_designation || {})
      .filter(([d]) => d.toLowerCase().includes("annotator") || d.toLowerCase().includes("reviewer"))
      .reduce((sum, [_, count]) => sum + count, 0);

  const tlCount =
    Object.entries(employeeStats?.by_designation || {})
      .filter(([d]) => d.toLowerCase().includes("team lead") || d.toLowerCase() === "tl")
      .reduce((sum, [_, count]) => sum + count, 0);

  // KPI Classification 4: Work Model (WFO, WFH, Hybrid)
  // The backend Employee model does not track work_model, so the old client-side
  // code defaulted everyone to WFO. We preserve that behavior here by
  // placing the entire active roster into WFO.
  const wfoCount = employeeStats?.total || 0;
  const wfhCount = 0;
  const hybridCount = 0;

  // Fetch skills from API
  const { data: skillsData = [], isLoading: skillsLoading } = useQuery({
    queryKey: ["skills"],
    queryFn: () => skillApi.getAll(),
  });

  // Extract skill names from the API response
  const predefinedSkills = skillsData.map((skill) => skill.name);

  const createMutation = useMutation({
    mutationFn: employeeApi.create,
    onSuccess: (res) => {
      queryClient.invalidateQueries(["employees"]);
      queryClient.invalidateQueries(["skills"]); // Refresh skills in case new ones were added
      setIsModalOpen(false);
      if (res && res.temp_password) {
        setNewlyCreatedCredentials({
          name: res.name,
          email: res.email,
          designation: res.designation,
          temp_password: res.temp_password,
          portal_url: res.portal_url || "https://pmportal.autonexai360.com/login/employee",
        });
      } else {
        toast.success("Employee created successfully");
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || "Failed to create employee");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, previousStatus }) => {
      const res = await employeeApi.update(id, data);
      return res;
    },
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries(["employees"]);
      queryClient.invalidateQueries(["all-employees-kpis"]);
      queryClient.invalidateQueries(["allocations"]);
      queryClient.invalidateQueries(["skills"]);
      setIsModalOpen(false);
      setEditingEmployee(null);

      const newStatus = (variables?.data?.status || "").toLowerCase();
      const oldStatus = (variables?.previousStatus || "").toLowerCase();
      if (newStatus === "inactive" && oldStatus !== "inactive") {
        toast.success(
          "Status updated to Inactive and assigned projects removed",
        );
      } else {
        toast.success("Employee updated successfully");
      }

    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || "Failed to update employee");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id) => {
      const res = await employeeApi.delete(id);
      return res;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries(["employees"]);
      queryClient.invalidateQueries(["all-employees-kpis"]);
      queryClient.invalidateQueries(["allocations"]);
      toast.success("Employee archived and projects unassigned");
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || "Failed to archive employee");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: employeeApi.restore,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries(["employees"]);
      queryClient.invalidateQueries(["all-employees-kpis"]);
      queryClient.invalidateQueries(["allocations"]);
      toast.success("Employee restored successfully");
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || "Failed to restore employee");
    },
  });

  const convertMutation = useMutation({
    mutationFn: ({ id, converted_by }) =>
      employeeApi.convertToFulltime(id, { converted_by }),
    onSuccess: (emp) => {
      queryClient.invalidateQueries(["employees"]);
      queryClient.invalidateQueries(["all-employees-kpis"]);
      toast.success(
        `${formatDisplayName(emp?.name) || emp?.name || "Employee"} converted to Full-time`,
      );
      logChange({
        category: "Employees",
        action: "Promoted Employee to Full-time",
        actionType: "Promoted",
        entity: "Employee",
        entityId: emp?.id || "",
        entityName: emp?.name || "Employee",
        details: [
          { field: "Employee Type", from: emp?.previous_employee_type || "Intern", to: "Full-time" },
          { field: "Promotion Date", from: "—", to: new Date().toLocaleDateString() },
        ],
      });
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || "Failed to convert employee");
    },
  });

  const handleConvertToFulltime = (employee) => {
    setConvertToFulltimeTarget(employee);
  };

  const closeEmployeeModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    setFormDesignation("Annotator/ Reviewer");
    setFormEmployeeType("Full-time");
    setFormWorkModel("WFO");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const skillsRaw = formData.get("skills");
    const skills = skillsRaw
      ? skillsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      : [];

    if (skills.length === 0) {
      toast.error("Please select at least one skill");
      return;
    }

    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      razorpay_email: formData.get("razorpay_email") || null,
      employee_type: formData.get("employee_type"),
      work_model: formData.get("work_model") || "WFO",
      designation: formData.get("designation") || "Annotator/ Reviewer",
      working_hours_per_day: parseFloat(formData.get("working_hours_per_day")),
      weekly_availability: parseFloat(formData.get("weekly_availability")),
      skills,
      // productivity_baseline removed
      // `status` is deliberately not sent. Active/Inactive is derived from
      // leave + allocations now, and status only carries the archived flag.
      // The create schema defaults it to "active" and the update endpoint uses
      // exclude_unset, so omitting it preserves whatever is stored.
    };

    if (editingEmployee) {
      updateMutation.mutate({
        id: editingEmployee.id,
        data,
        previousStatus: editingEmployee.status || "active",
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const designationOptions = Array.from(
    new Set(Object.keys(employeeStats?.by_designation || {}).filter(Boolean)),
  ).sort();

  // Distinct values for the clickable column header filters.
  const designationValues = [
    ...new Set(employees.map((e) => e.designation).filter(Boolean)),
  ].sort();
  const typeValues = [
    ...new Set(employees.map((e) => e.employee_type).filter(Boolean)),
  ].sort();
  const workModelValues = ["WFO", "WFH", "Hybrid"];
  // Advance a header filter through [All, ...values] on each click.
  const cycleValue = (current, values) => {
    const list = ["", ...values];
    return list[(list.indexOf(current) + 1) % list.length];
  };
  // Employee header: cycle name sort default → A→Z → Z→A → default.
  const cycleNameSort = () =>
    setSortBy((s) =>
      s === "name-asc" ? "name-desc" : s === "name-desc" ? "" : "name-asc",
    );

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch = matchesSearchTerm(
      employee,
      searchQuery.trim().toLowerCase(),
    );
    const matchesSkill =
      !skillFilter ||
      (employee.skills && employee.skills.includes(skillFilter));
    const matchesDesignation =
      designationFilter.length === 0 ||
      designationFilter.includes(employee.designation);
    const matchesColDesignation = (() => {
      if (!colDesignation) return true;
      const d = (employee.designation || "").toLowerCase();
      if (colDesignation === "Manager") {
        return d.includes("manager") || d.includes("pm");
      }
      if (colDesignation === "Annotator") {
        return d.includes("annotator") || d.includes("reviewer");
      }
      if (colDesignation === "TL") {
        return d.includes("lead") || d.includes("tl");
      }
      return d === colDesignation.toLowerCase();
    })();
    const matchesColType = (() => {
      if (!colType) return true;
      const t = (employee.employee_type || "").toLowerCase();
      if (colType === "Full-time") return t.includes("full");
      if (colType === "Intern") return t.includes("intern");
      if (colType === "Contract") return t.includes("contract") || t.includes("part");
      return t === colType.toLowerCase();
    })();
    const matchesColWorkModel = (() => {
      if (!colWorkModel) return true;
      const wm = (employee.work_model || "WFO").toUpperCase();
      if (colWorkModel === "WFO") return wm === "WFO" || wm.includes("OFFICE");
      if (colWorkModel === "WFH") return wm === "WFH" || wm.includes("HOME");
      if (colWorkModel === "Hybrid") return wm === "HYBRID";
      return wm === colWorkModel.toUpperCase();
    })();
    const isIdle = !isOnLeaveToday(employee) && !hasProject(employee);
    const matchesIdle = !idleOnly || isIdle;
    return (
      matchesSearch &&
      matchesSkill &&
      matchesDesignation &&
      matchesColDesignation &&
      matchesColType &&
      matchesColWorkModel &&
      matchesIdle
    );
  });

  // Apply client-side sort (Sort by menu). Empty sortBy keeps API order.
  const sortedEmployees = (() => {
    if (!sortBy) return filteredEmployees;
    const cmp = (a, b, key) =>
      String(a[key] || "").localeCompare(String(b[key] || ""));
    const arr = [...filteredEmployees];
    switch (sortBy) {
      case "name-asc":
        arr.sort((a, b) => cmp(a, b, "name"));
        break;
      case "name-desc":
        arr.sort((a, b) => cmp(b, a, "name"));
        break;
      default:
        break;
    }
    return arr;
  })();

  // Server hits are shown only when the loaded roster genuinely had nothing —
  // never merged into the client results, so the list stays one coherent answer.
  // They deliberately bypass the chips and column filters: those describe the
  // current view, and a row the view excludes is exactly what was searched for.
  const usingServerResults =
    shouldSearchServer && sortedEmployees.length === 0 && serverMatches.length > 0;
  const displayedEmployees = usingServerResults ? serverMatches : sortedEmployees;

  // useEffect(() => {
  //   setCurrentPage(1);
  // }, [
  //   searchQuery,
  //   usingServerResults,
  //   skillFilter,
  //   designationFilter,
  //   idleOnly,
  //   statusParam,
  //   sortBy,
  //   colDesignation,
  //   colType,
  //   colWorkModel,
  // ]);

  
  const handleSelectColDesignation = (roleKey) => {
    if (colDesignation === roleKey) {
      setColDesignation("");
      setDesignationFilter([]);
    } else {
      setColDesignation(roleKey);
      const matches = designationOptions.filter((dStr) => {
        const d = (dStr || "").toLowerCase();
        if (roleKey === "Manager") {
          return d.includes("manager") || d.includes("pm") || d.includes("lead");
        }
        if (roleKey === "Annotator") {
          return d.includes("annotator") || d.includes("reviewer");
        }
        if (roleKey === "Quality") {
          return d.includes("qc") || d.includes("quality");
        }
        return false;
      });
      setDesignationFilter(matches);
    }
  };

  return (
    <div className="space-y-3">
      {/* KPI Overview Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Total Employees (keeps the big total on the right) */}
        <div className="bg-white border border-slate-200/70 rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="text-[12.5px] font-bold text-slate-800 uppercase tracking-wider truncate">
                TOTAL EMPLOYEES
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-mono flex-shrink-0">
              {onRosterCount}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
            <StatTile
              label="Active"
              value={activeCount}
              active={statusParam === "active"}
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                if (statusParam === "active") params.delete("status");
                else params.set("status", "active");
                setSearchParams(params);
              }}
              activeBg="bg-emerald-100/90 border-emerald-300 ring-2 ring-emerald-500/20"
              idleBg="bg-emerald-50/60 border-emerald-100/80 hover:bg-emerald-100/60"
              textClass="text-emerald-700"
            />
            <StatTile
              label="Inactive"
              value={inactiveCount}
              active={statusParam === "inactive"}
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                if (statusParam === "inactive") params.delete("status");
                else params.set("status", "inactive");
                setSearchParams(params);
              }}
              activeBg="bg-slate-200 border-slate-400 ring-2 ring-slate-500/20"
              idleBg="bg-slate-50 border-slate-100 hover:bg-slate-100"
              textClass="text-slate-700"
            />
            <StatTile
              label="Idle"
              value={idleCount}
              active={statusParam === "idle"}
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                if (statusParam === "idle") params.delete("status");
                else params.set("status", "idle");
                setSearchParams(params);
              }}
              activeBg="bg-amber-100/90 border-amber-300 ring-2 ring-amber-500/20"
              idleBg="bg-amber-50/60 border-amber-100/80 hover:bg-amber-100/60"
              textClass="text-amber-700"
            />
          </div>
        </div>

        {/* KPI 2: Work Model */}
        <KpiCard
          icon={UserCheck}
          iconBg="bg-emerald-50 text-emerald-600"
          title="WORK MODEL"
        >
          <StatTile
            label="WFO"
            value={wfoCount}
            active={colWorkModel === "WFO"}
            onClick={() => setColWorkModel((prev) => (prev === "WFO" ? "" : "WFO"))}
            activeBg="bg-indigo-100/90 border-indigo-300 ring-2 ring-indigo-500/20"
            idleBg="bg-indigo-50/60 border-indigo-100/80 hover:bg-indigo-100/60"
            textClass="text-indigo-700"
          />
          <StatTile
            label="WFH"
            value={wfhCount}
            active={colWorkModel === "WFH"}
            onClick={() => setColWorkModel((prev) => (prev === "WFH" ? "" : "WFH"))}
            activeBg="bg-cyan-100/90 border-cyan-300 ring-2 ring-cyan-500/20"
            idleBg="bg-cyan-50/60 border-cyan-100/80 hover:bg-cyan-100/60"
            textClass="text-cyan-700"
          />
          <StatTile
            label="Hybrid"
            value={hybridCount}
            active={colWorkModel === "Hybrid"}
            onClick={() =>
              setColWorkModel((prev) => (prev === "Hybrid" ? "" : "Hybrid"))
            }
            activeBg="bg-purple-100/90 border-purple-300 ring-2 ring-purple-500/20"
            idleBg="bg-purple-50/60 border-purple-100/80 hover:bg-purple-100/60"
            textClass="text-purple-700"
          />
        </KpiCard>

        {/* KPI 3: Employment Type */}
        <KpiCard
          icon={Briefcase}
          iconBg="bg-purple-50 text-purple-600"
          title="EMPLOYEE TYPES"
        >
          <StatTile
            label="Full-time"
            value={fullTimeCount}
            active={colType === "Full-time"}
            onClick={() =>
              setColType((prev) => (prev === "Full-time" ? "" : "Full-time"))
            }
            activeBg="bg-emerald-100/90 border-emerald-300 ring-2 ring-emerald-500/20"
            idleBg="bg-emerald-50/60 border-emerald-100/80 hover:bg-emerald-100/60"
            textClass="text-emerald-700"
          />
          <StatTile
            label="Intern"
            value={internCount}
            active={colType === "Intern"}
            onClick={() => setColType((prev) => (prev === "Intern" ? "" : "Intern"))}
            activeBg="bg-amber-100/90 border-amber-300 ring-2 ring-amber-500/20"
            idleBg="bg-amber-50/60 border-amber-100/80 hover:bg-amber-100/60"
            textClass="text-amber-700"
          />
          <StatTile
            label="Contract"
            value={contractCount}
            active={colType === "Contract"}
            onClick={() =>
              setColType((prev) => (prev === "Contract" ? "" : "Contract"))
            }
            activeBg="bg-sky-100/90 border-sky-300 ring-2 ring-sky-500/20"
            idleBg="bg-sky-50/60 border-sky-100/80 hover:bg-sky-100/60"
            textClass="text-sky-700"
          />
        </KpiCard>

        {/* KPI 4: Role Designations */}
        <KpiCard
          icon={Award}
          iconBg="bg-sky-50 text-sky-600"
          title="DESIGNATION ROLES"
        >
          <StatTile
            label="PMs"
            value={pmCount}
            active={colDesignation === "Manager"}
            onClick={() => handleSelectColDesignation("Manager")}
            activeBg="bg-indigo-100/90 border-indigo-300 ring-2 ring-indigo-500/20"
            idleBg="bg-indigo-50/60 border-indigo-100/80 hover:bg-indigo-100/60"
            textClass="text-indigo-700"
          />
          <StatTile
            label="TL"
            value={tlCount}
            active={colDesignation === "TL"}
            onClick={() => handleSelectColDesignation("TL")}
            activeBg="bg-purple-100/90 border-purple-300 ring-2 ring-purple-500/20"
            idleBg="bg-purple-50/60 border-purple-100/80 hover:bg-purple-100/60"
            textClass="text-purple-700"
          />
          <StatTile
            label="Annotators"
            value={annotatorCount}
            active={colDesignation === "Annotator"}
            onClick={() => handleSelectColDesignation("Annotator")}
            activeBg="bg-sky-100/90 border-sky-300 ring-2 ring-sky-500/20"
            idleBg="bg-sky-50/60 border-sky-100/80 hover:bg-sky-100/60"
            textClass="text-sky-700"
          />
        </KpiCard>
      </div>
        {/* Tabs and Toolbar Row */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200">
          {/* Tabs for Active Team vs Archived */}
          <div className="flex">
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.delete("status");
                setSearchParams(params);
              }}
              className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${statusParam !== "archived"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
            >
              <span className="inline-flex items-center gap-2">
                Active Team
                {hasTeamCounts && (
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ${statusParam !== "archived"
                      ? "bg-indigo-50 text-indigo-600"
                      : "bg-slate-100 text-slate-500"
                      }`}
                  >
                    {activeTeamCount}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.set("status", "archived");
                setSearchParams(params);
              }}
              className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${statusParam === "archived"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
            >
              <span className="inline-flex items-center gap-2">
                Archived / Former
                {hasTeamCounts && (
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ${statusParam === "archived"
                      ? "bg-indigo-50 text-indigo-600"
                      : "bg-slate-100 text-slate-500"
                      }`}
                  >
                    {archivedTeamCount}
                  </span>
                )}
              </span>
            </button>
          </div>

          {/* Right cluster: chips · search · filter · sort · add */}
          <div className="flex flex-wrap items-center gap-2 pb-2">
            {idleOnly && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                Idle Only
                <button
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.delete("idleOnly");
                    setSearchParams(params);
                  }}
                  className="hover:text-amber-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {statusParam === "archived" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                Status: Archived
                <button
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.delete("status");
                    setSearchParams(params);
                  }}
                  className="hover:text-indigo-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <FilterButton
              predefinedSkills={predefinedSkills}
              skillFilter={skillFilter}
              setSkillFilter={setSkillFilter}
              designationOptions={designationOptions}
              designationFilter={designationFilter}
              setDesignationFilter={(val) => {
                setDesignationFilter(val);
                if (!val || val.length === 0) setColDesignation("");
              }}
              typeFilter={colType}
              setTypeFilter={setColType}
              typeOptions={typeValues}
              workModelFilter={colWorkModel}
              setWorkModelFilter={setColWorkModel}
              workModelOptions={workModelValues}
              onChange={() => setCurrentPage(1)}
            />

            <SortMenu sortBy={sortBy} setSortBy={setSortBy} />

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search name, email or Encord ID..."
                title="Searches the loaded roster first, then the server by Encord ID"
                className="h-9 w-52 sm:w-64 pl-9 pr-9 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center h-5 px-1.5 rounded border border-slate-200 bg-slate-50 text-[10px] font-medium text-slate-400 pointer-events-none">
                  ⌘1
                </kbd>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingEmployee(null);
                setFormDesignation("Annotator/ Reviewer");
                setFormEmployeeType("Full-time");
                setFormWorkModel("WFO");
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Employee
            </button>
          </div>
        </div>

      {/* Server-search notice. Shown only when the rows below did not come from
          the current view, so an archived person appearing is explained rather
          than surprising. */}
      {usingServerResults && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-[12.5px] text-indigo-800">
          <Search className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>
            No match on this page — showing{" "}
            <strong>{serverMatches.length}</strong>{" "}
            {serverMatches.length === 1 ? "result" : "results"} found on the
            server for &ldquo;{serverSearchTerm}&rdquo;, across the whole roster
            including archived employees. Filters and chips do not apply to these
            rows.
          </span>
        </div>
      )}

      <Table
        variant="untitled"
        allowOverflow
        loading={isFetching || skillsLoading}
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
            width: "w-[19%]",
            render: (value, row) => {
              const visibleRows = displayedEmployees.slice(
                (currentPage - 1) * PAGE_SIZE,
                currentPage * PAGE_SIZE,
              );
              const pageIndex = visibleRows.indexOf(row);
              const isNearTop = pageIndex < 4;
              const positionClass = isNearTop
                ? "top-full mt-1.5"
                : "bottom-full mb-1.5";
              // Display only: middle names dropped and CAPS-LOCK names cased, so
              // the column reads evenly. The stored name is untouched — the hover
              // card below still shows it in full, and search/sort use it.
              const shortName = formatDisplayName(value) || value;
              return (
                <div className="flex items-center gap-3">
                  <UserAvatar
                    src={row.avatar_url}
                    name={value || "?"}
                    size="md"
                  />
                  <div className="group relative min-w-0">
                    <Link
                      to={`/admin/employees/${row.id}`}
                      className="text-[13.5px] font-semibold text-slate-900 truncate leading-tight hover:text-indigo-600 hover:underline cursor-pointer"
                      title={value}
                    >
                      {shortName}
                    </Link>
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
                    {/* Light hover card — full name + email */}
                    <div
                      className={`absolute left-0 ${positionClass} hidden group-hover:block z-40 p-2.5 bg-white rounded-xl shadow-xl border border-slate-200 min-w-[180px] max-w-[280px] pointer-events-none`}
                    >
                      <div className="text-[13px] font-semibold text-slate-800 break-words">
                        {value}
                      </div>
                      <div className="text-[12px] text-slate-500 break-words mt-0.5">
                        {row.email}
                      </div>
                      {/* Encord ID is searchable, so it is worth being able to
                          read the value a search matched on. */}
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
            key: "designation",
            label: "Designation",
            width: "w-[14%]",
            render: (value) => (
              <span className="pointer-events-none text-[13px] font-medium text-slate-600 whitespace-nowrap truncate max-w-[140px] inline-block align-middle">
                {value || "—"}
              </span>
            ),
          },
          {
            key: "employee_type",
            label: "Type",
            align: "left",
            width: "w-[7%]",
            render: (value, row) => {
              const valStr = String(value || "")
                .toLowerCase()
                .replace("-", " ")
                .trim();
              const isFulltime =
                valStr.includes("full time") || valStr === "fulltime";
              const isIntern = valStr.includes("intern");
              const isContract =
                valStr.includes("contractor") || valStr.includes("part time");
              const hasPromotion = Boolean(row.converted_to_fulltime_at);

              let textColorClass = "text-slate-600 font-medium";
              let glowClass = "";

              if (isFulltime) {
                textColorClass = "text-emerald-600 font-semibold";
                if (hasPromotion)
                  glowClass = "drop-shadow-[0_0_6px_rgba(16,185,129,0.75)]";
              } else if (isIntern) {
                textColorClass = "text-amber-600 font-semibold";
                if (hasPromotion)
                  glowClass = "drop-shadow-[0_0_6px_rgba(245,158,11,0.75)]";
              } else if (isContract) {
                textColorClass = "text-sky-500 font-semibold";
                if (hasPromotion)
                  glowClass = "drop-shadow-[0_0_6px_rgba(56,189,248,0.75)]";
              }

              const visibleRows = displayedEmployees.slice(
                (currentPage - 1) * PAGE_SIZE,
                currentPage * PAGE_SIZE,
              );
              const pageIndex = visibleRows.indexOf(row);
              const isNearTop = pageIndex < 4;
              const positionClass = isNearTop
                ? "top-full mt-1.5"
                : "bottom-full mb-1.5";

              return (
                <div className="group relative flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
                  <span
                    className={`text-[13px] ${textColorClass} ${glowClass} transition-all duration-200`}
                  >
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
                          {formatDateDeterministic(
                            row.converted_to_fulltime_at,
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            },
          },
          {
            key: "work_model",
            label: "Work Model",
            align: "left",
            width: "w-[8%]",
            render: (value, row) => (
              <span className="text-[13px] font-medium text-slate-600 whitespace-nowrap">
                {row.work_model || value || "WFO"}
              </span>
            ),
          },
          {
            key: "reporting_manager",
            label: "Reporting Manager",
            align: "left",
            width: "w-[13%]",
            render: (_, row) => {
              const managers = row.managers || [];
              if (managers.length === 0) {
                return (
                  <span className="text-[13px] text-slate-400 font-medium">
                    —
                  </span>
                );
              }

              const visibleRows = displayedEmployees.slice(
                (currentPage - 1) * PAGE_SIZE,
                currentPage * PAGE_SIZE,
              );
              const pageIndex = visibleRows.indexOf(row);
              const isNearTop = pageIndex < 4;
              const positionClass = isNearTop
                ? "top-full mt-1.5"
                : "bottom-full mb-1.5";
              const extra = managers.length - 1;

              return (
                <div
                  className="group relative flex items-center gap-1 flex-nowrap whitespace-nowrap cursor-default"
                  title={managers.join(", ")}
                >
                  {/* Shortened here, full in the hover card below — a manager's
                      middle name is what tells two of them apart. */}
                  <span className="pointer-events-none text-[13px] font-medium text-slate-700 truncate max-w-[150px] inline-block">
                    {formatDisplayName(managers[0]) || managers[0]}
                  </span>
                  {extra > 0 && (
                    <span className="inline-flex items-center justify-center flex-shrink-0 h-4 min-w-4 rounded-full bg-slate-100 px-1 text-[10px] font-semibold text-slate-500">
                      +{extra}
                    </span>
                  )}

                  {/* Also opens when the name was shortened, not just when it is
                      long or there are several — otherwise the dropped middle
                      name would be unreachable. */}
                  {(extra > 0 ||
                    (managers[0] || "").length > 18 ||
                    formatDisplayName(managers[0]) !== managers[0]) && (
                    <div
                      className={`absolute left-0 ${positionClass} hidden group-hover:flex flex-col gap-1.5 z-30 p-2.5 bg-white text-slate-700 rounded-xl shadow-xl border border-slate-200 min-w-[180px] max-w-[260px] pointer-events-none`}
                    >
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Reporting Manager{managers.length > 1 ? "s" : ""} (
                        {managers.length})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {managers.map((name, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"
                          >
                            {name}
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
            key: "skills",
            label: "Skills",
            width: "w-[16%]",
            render: (value, row) => {
              const skillsList = Array.isArray(value) ? value : [];
              if (skillsList.length === 0) {
                return <span className="text-xs text-slate-400">—</span>;
              }

              const visibleRows = displayedEmployees.slice(
                (currentPage - 1) * PAGE_SIZE,
                currentPage * PAGE_SIZE,
              );
              const pageIndex = visibleRows.indexOf(row);
              const isNearTop = pageIndex < 4;
              const positionClass = isNearTop
                ? "top-full mt-1.5"
                : "bottom-full mb-1.5";
              const extra = skillsList.length - 1;

              return (
                <div className="group relative flex items-center gap-1 flex-nowrap whitespace-nowrap cursor-default">
                  <span className="pointer-events-none min-w-0 truncate max-w-[140px] inline-block rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[12px] font-medium text-indigo-700">
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
            width: "w-[17%]",
            render: (_, row) => {
              if ((row.status || "").toLowerCase() === "inactive") {
                return (
                  <span className="text-[13px] text-slate-400 font-medium">
                    —
                  </span>
                );
              }
              const list = row.assigned_projects || [];
              if (list.length === 0) {
                return (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[12px] font-medium text-amber-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Idle
                  </span>
                );
              }
              const visibleRows = displayedEmployees.slice(
                (currentPage - 1) * PAGE_SIZE,
                currentPage * PAGE_SIZE,
              );
              const pageIndex = visibleRows.indexOf(row);
              const isNearTop = pageIndex < 4;
              const positionClass = isNearTop
                ? "top-full mt-1.5"
                : "bottom-full mb-1.5";
              const extra = list.length - 1;

              return (
                <div className="group relative flex items-center gap-1 flex-nowrap whitespace-nowrap cursor-default">
                  <span className="pointer-events-none min-w-0 truncate max-w-[170px] inline-block rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[12px] font-medium text-slate-700">
                    {list[0]}
                  </span>
                  {extra > 0 && (
                    <span className="inline-flex items-center justify-center flex-shrink-0 h-5 min-w-5 rounded-full bg-slate-100 px-1 text-[10px] font-semibold text-slate-500">
                      +{extra}
                    </span>
                  )}

                  {(extra > 0 || (list[0] || "").length > 20) && (
                    <div
                      className={`absolute right-0 ${positionClass} hidden group-hover:flex flex-col gap-1.5 z-40 p-3 bg-white text-slate-700 rounded-xl shadow-xl border border-slate-200 min-w-[220px] max-w-[300px] pointer-events-none whitespace-normal`}
                    >
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100 flex items-center justify-between">
                        <span>Assigned Projects</span>
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          {list.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {list.map((name, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 break-words max-w-full"
                          >
                            {name}
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
            key: "actions",
            label: "Actions",
            align: "center",
            width: "w-[6%]",
            render: (_, row) => {
              const visibleRows = displayedEmployees.slice(
                (currentPage - 1) * PAGE_SIZE,
                currentPage * PAGE_SIZE,
              );
              const pageIndex = visibleRows.indexOf(row);
              const totalVisible = visibleRows.length;
              const isNearBottom =
                totalVisible <= 2
                  ? pageIndex === totalVisible - 1
                  : pageIndex >= totalVisible - 2;

              return (
                <div className="flex items-center justify-center">
                  <EmployeeActionMenu
                    row={row}
                    statusParam={statusParam}
                    setRestoreTarget={setRestoreTarget}
                    handleConvertToFulltime={handleConvertToFulltime}
                    setEditingEmployee={setEditingEmployee}
                    setFormDesignation={setFormDesignation}
                    setFormEmployeeType={setFormEmployeeType}
                    setFormWorkModel={setFormWorkModel}
                    setIsModalOpen={setIsModalOpen}
                    setArchiveTarget={setArchiveTarget}
                    convertPending={convertMutation.isPending}
                    restorePending={restoreMutation.isPending}
                    archivePending={archiveMutation.isPending}
                    isNearBottom={isNearBottom}
                  />
                </div>
              );
            },
          },
        ]}
        data={employees}
        totalItems={paginatedEmployeesData?.total || 0}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
        emptyState={{
          title: serverSearching ? "Searching…" : "No employees found",
          description: serverSearching
            ? "Checking the full roster on the server for this ID"
            : shouldSearchServer
              ? "No name, email or Encord ID matches that, on this page or the server"
              : "Try adjusting your search query",
        }}
      />

      {/* Availability Modal */}
      {availabilityEmployee && (
        <EmployeeAvailabilityModal
          employee={availabilityEmployee}
          onClose={() => setAvailabilityEmployee(null)}
        />
      )}

      {/* Archive Modal */}
      {archiveTarget && (
        <EmployeeArchiveModal
          employee={archiveTarget}
          onClose={() => setArchiveTarget(null)}
          onConfirm={() => {
            archiveMutation.mutate(archiveTarget.id);
            setArchiveTarget(null);
          }}
          isPending={archiveMutation.isPending}
        />
      )}

      {/* Restore Modal */}
      {restoreTarget && (
        <EmployeeRestoreModal
          employee={restoreTarget}
          onClose={() => setRestoreTarget(null)}
          onConfirm={() => {
            restoreMutation.mutate(restoreTarget.id);
            setRestoreTarget(null);
          }}
          isPending={restoreMutation.isPending}
        />
      )}

      {/* Convert to Full-time Modal */}
      {convertToFulltimeTarget && (
        <EmployeeConvertToFulltimeModal
          employee={convertToFulltimeTarget}
          onClose={() => setConvertToFulltimeTarget(null)}
          onConfirm={() => {
            const currentUser = JSON.parse(
              localStorage.getItem("user") || "{}",
            );
            convertMutation.mutate({
              id: convertToFulltimeTarget.id,
              converted_by: currentUser.id || null,
            });
            setConvertToFulltimeTarget(null);
          }}
          isPending={convertMutation.isPending}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeEmployeeModal}
        size="2xl"
        maxHeight="95vh"
      >
        <Modal.Header onClose={closeEmployeeModal}>
          <h2 className="text-xl font-semibold text-gray-900">
            {editingEmployee ? "Edit Employee" : "Add Employee"}
          </h2>
        </Modal.Header>
        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col min-h-0"
          id="employee-form"
        >
          <Modal.Body className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingEmployee?.name}
                  className="input"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slack Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  defaultValue={editingEmployee?.email}
                  className="input"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Razorpay Email
                </label>
                <input
                  type="email"
                  name="razorpay_email"
                  defaultValue={editingEmployee?.razorpay_email}
                  className="input"
                  placeholder="john.razorpay@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Designation <span className="text-red-500">*</span>
                </label>
                <input
                  type="hidden"
                  name="designation"
                  value={formDesignation}
                />
                <Dropdown
                  options={ALLOWED_DESIGNATIONS.map((d) => ({
                    value: d,
                    label: d,
                  }))}
                  value={formDesignation}
                  onChange={setFormDesignation}
                  placeholder="Select designation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type <span className="text-red-500">*</span>
                </label>
                <input
                  type="hidden"
                  name="employee_type"
                  value={formEmployeeType}
                />
                <Dropdown
                  options={[
                    { value: "Full-time", label: "Full-time" },
                    { value: "Part-time", label: "Part-time" },
                    { value: "Intern", label: "Intern" },
                    { value: "Contract", label: "Contract" },
                  ]}
                  value={formEmployeeType}
                  onChange={setFormEmployeeType}
                  placeholder="Select type"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work Model <span className="text-red-500">*</span>
                </label>
                <input type="hidden" name="work_model" value={formWorkModel} />
                <Dropdown
                  options={[
                    { value: "WFO", label: "WFO" },
                    { value: "WFH", label: "WFH" },
                    { value: "Hybrid", label: "Hybrid" },
                  ]}
                  value={formWorkModel}
                  onChange={setFormWorkModel}
                  placeholder="Select work model"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hours/Day <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="working_hours_per_day"
                  required
                  step="0.5"
                  min="1"
                  max="24"
                  defaultValue={editingEmployee?.working_hours_per_day || 8}
                  onWheel={(e) => e.target.blur()}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hours/Week <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="weekly_availability"
                  required
                  step="0.5"
                  min="1"
                  max="168"
                  defaultValue={editingEmployee?.weekly_availability || 40}
                  onWheel={(e) => e.target.blur()}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Skills <span className="text-red-500">*</span>
              </label>
              <MultiSelectDropdown
                name="skills"
                defaultValue={editingEmployee?.skills || []}
                predefinedSkills={predefinedSkills}
                queryClient={queryClient}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="cancel" onClick={closeEmployeeModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="employee-form"
              disabled={createMutation.isPending || updateMutation.isPending}
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {!(createMutation.isPending || updateMutation.isPending) &&
                (editingEmployee ? "Update Employee" : "Create Employee")}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Temporary Credentials Delivery Confirmation Modal */}
      <EmployeeCredentialsModal
        credentials={newlyCreatedCredentials}
        onClose={() => setNewlyCreatedCredentials(null)}
      />
    </div>
  );
};

export default EmployeesPage;
