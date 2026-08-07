import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
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
  const fields = [
    employee.name,
    employee.email,
    employee.designation,
    employee.encord_id,
  ];
  return fields.some((field) =>
    String(field || "")
      .trim()
      .toLowerCase()
      .includes(term),
  );
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
                    <span className="flex-shrink-0">ðŸ”’</span>
                    <span>
                      System access to the portal will be immediately revoked.
                    </span>
                  </div>
                  <div className="flex gap-2.5 text-xs text-amber-850 leading-relaxed">
                    <span className="flex-shrink-0">ðŸ“</span>
                    <span>
                      All historical data (leaves, project allocations history)
                      will be preserved for records.
                    </span>
                  </div>
                  <div className="flex gap-2.5 text-xs text-amber-850 leading-relaxed">
                    <span className="flex-shrink-0">ðŸ”„</span>
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
            <span className="flex-shrink-0">ðŸ”‘</span>
            <span>
              Their portal account will be reactivated, allowing them to log in
              again.
            </span>
          </div>
          <div className="flex gap-2.5 text-xs text-emerald-850 leading-relaxed">
            <span className="flex-shrink-0">ðŸ‘¥</span>
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
            <span className="flex-shrink-0">📝</span>
            <span>
              This updates the existing record in place — all leave, payroll,
              performance and other history is preserved.
            </span>
          </div>
          <div className="flex gap-2.5 text-xs text-indigo-850 leading-relaxed">
            <span className="flex-shrink-0">💼</span>
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
  const [searchQuery, setSearchQuery] = useState("");
  // Only the server round-trip is debounced; the client-side filter runs on every
  // keystroke off `searchQuery` so typing stays responsive.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState([]);
  const [sortBy, setSortBy] = useState("");
  const [colDesignation, setColDesignation] = useState(""); // header cycle-filter
  const [colType, setColType] = useState("");
  const [colWorkModel, setColWorkModel] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [formDesignation, setFormDesignation] = useState("Annotator/ Reviewer");
  const [formEmployeeType, setFormEmployeeType] = useState("Full-time");
  const [formWorkModel, setFormWorkModel] = useState("WFO");
  const PAGE_SIZE = 10;

  // Fetch employees
  const { data: employees = [], isLoading } = useQuery({
    // Active / Inactive / Idle are derived from leave + allocations, not from
    // the stored status column, so the /status/* endpoints are no longer used —
    // they would answer a different question. Fetch the whole roster and let the
    // chips narrow it client-side. Archived stays a server-side filter because
    // it IS the stored column.
    queryKey: ["employees", statusParam === "archived" ? "archived" : "roster"],
    queryFn: () =>
      statusParam === "archived"
        ? employeeApi.getAll({ status: "archived" })
        : employeeApi.getAll(),
  });

  // Fetch all allocations so we can show assigned projects per employee
  const { data: allocations = [], isLoading: allocationsLoading } = useQuery({
    queryKey: ["allocations"],
    queryFn: allocationApi.getAll,
  });

  // Sub-projects + main projects are needed to resolve each employee's reporting
  // manager: allocation.sub_project_id → subProject.main_project_id → mainProject PM.
  const { data: subProjects = [] } = useQuery({
    queryKey: ["sub-projects"],
    queryFn: subProjectApi.getAll,
    staleTime: 5 * 60 * 1000,
  });
  const { data: mainProjects = [] } = useQuery({
    queryKey: ["parent-projects"],
    queryFn: parentProjectApi.getAll,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all employees for organization KPI calculations
  const { data: allEmployeesData = [] } = useQuery({
    queryKey: ["all-employees-kpis"],
    queryFn: () => employeeApi.getAll({ include_archived: true }),
  });

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

  const allStaff = allEmployeesData.length > 0 ? allEmployeesData : employees;

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
      return (
        employees.some((e) => matchesSearchTerm(e, term)) ||
        allStaff.some((e) => matchesSearchTerm(e, term))
      );
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
  const employeeProjectsMap = buildAssignedProjectsMap({
    allocations,
    mainProjects,
    subProjects,
  });

  // Resolve reporting manager(s) per employee = PM(s) of the main project(s) they're
  // allocated to. Join path: allocation.sub_project_id → subProject.main_project_id → mainProject PM.
  const subProjectById = new Map(subProjects.map((sp) => [String(sp.id), sp]));
  const mainProjectById = new Map(
    mainProjects.map((mp) => [String(mp.id), mp]),
  );
  const employeeIdToName = new Map(allStaff.map((e) => [String(e.id), e.name]));

  const pmNamesOfMainProject = (mp) => {
    if (!mp) return [];
    if (
      Array.isArray(mp.program_manager_names) &&
      mp.program_manager_names.length > 0
    ) {
      return mp.program_manager_names;
    }
    if (mp.program_manager_name) return [mp.program_manager_name];
    const ids = mp.program_manager_ids?.length
      ? mp.program_manager_ids
      : mp.program_manager_id
        ? [mp.program_manager_id]
        : [];
    return ids.map((id) => employeeIdToName.get(String(id))).filter(Boolean);
  };

  const employeeManagersMap = allocations.reduce((map, alloc) => {
    const sp = subProjectById.get(String(alloc.sub_project_id));
    if (!sp) return map;
    const mp = mainProjectById.get(String(sp.main_project_id));
    const names = pmNamesOfMainProject(mp);
    if (names.length === 0) return map;
    if (!map[alloc.employee_id]) map[alloc.employee_id] = new Set();
    names.forEach((n) => map[alloc.employee_id].add(n));
    return map;
  }, {});

  // Auto-cleanup: remove any existing database allocations for employees currently set to 'inactive'
  useEffect(() => {
    if (allocations.length > 0 && allStaff.length > 0) {
      const inactiveEmpIds = new Set(
        allStaff
          .filter((e) => (e.status || "").toLowerCase() === "inactive")
          .map((e) => String(e.id)),
      );
      const staleAllocations = allocations.filter((a) =>
        inactiveEmpIds.has(String(a.employee_id)),
      );
      if (staleAllocations.length > 0) {
        Promise.allSettled(
          staleAllocations.map((a) => allocationApi.delete(a.id)),
        ).then(() => {
          queryClient.invalidateQueries(["allocations"]);
        });
      }
    }
  }, [allocations, allStaff, queryClient]);

  // KPI Classification 1: today's engagement (Active, Inactive, Idle).
  //
  // Derived by utils/workforce, which the Dashboard shares — when each page
  // carried its own copy of these rules they disagreed (199 vs 204).
  const onLeaveTodayIds = getOnLeaveTodayIds(leavesToday, todayStr);
  const isOnLeaveToday = (e) => onLeaveTodayIds.has(String(e.id));
  const hasProject = (e) => hasAssignedProject(employeeProjectsMap, e.id);

  const {
    onRoster: onRosterStaff,
    active: activeStaff,
    inactive: inactiveStaff,
    idle: idleStaff,
  } = bucketWorkforce({
    employees: allStaff,
    onLeaveIds: onLeaveTodayIds,
    projectsMap: employeeProjectsMap,
  });

  const onRosterCount = onRosterStaff.length;
  const activeCount = activeStaff.length;
  const inactiveCount = inactiveStaff.length;
  const idleCount = idleStaff.length;

  // Tab totals read from the include_archived query so both tabs show a count
  // no matter which one is currently loaded. While that query is still in
  // flight the counts are hidden rather than rendering a misleading 0.
  const archivedTeamCount = allEmployeesData.filter(
    (e) => (e.status || "").toLowerCase() === "archived",
  ).length;
  const activeTeamCount = allEmployeesData.length - archivedTeamCount;
  const hasTeamCounts = allEmployeesData.length > 0;

  // Everything below counts the ON-ROSTER population, matching the headline on
  // each card. These previously ran over allStaff, which includes the archived /
  // former staff — that is why Work Model showed WFO 229 beneath a 204 total.
  // KPI Classification 2: Type (Full-time, Intern, Contract)
  const fullTimeCount = onRosterStaff.filter((e) => {
    const t = (e.employee_type || "").toLowerCase();
    return t.includes("full") || t === "fulltime";
  }).length;

  const internCount = onRosterStaff.filter((e) => {
    const t = (e.employee_type || "").toLowerCase();
    return t.includes("intern");
  }).length;

  const contractCount = onRosterStaff.filter((e) => {
    const t = (e.employee_type || "").toLowerCase();
    return t.includes("contract") || t.includes("part");
  }).length;

  // KPI Classification 3: Roles (Project Managers, Annotator/Reviewer, QC)
  const pmCount = onRosterStaff.filter((e) => {
    const d = (e.designation || "").toLowerCase();
    return d.includes("manager") || d.includes("pm") || d.includes("lead");
  }).length;

  const annotatorCount = onRosterStaff.filter((e) => {
    const d = (e.designation || "").toLowerCase();
    return d.includes("annotator") || d.includes("reviewer");
  }).length;

  const qcCount = onRosterStaff.filter((e) => {
    const d = (e.designation || "").toLowerCase();
    return d.includes("qc") || d.includes("quality");
  }).length;

  // KPI Classification 4: Work Model (WFO, WFH, Hybrid)
  const wfoCount = onRosterStaff.filter((e) => {
    const wm = (e.work_model || "WFO").toUpperCase();
    return wm === "WFO" || wm.includes("OFFICE");
  }).length;

  const wfhCount = onRosterStaff.filter((e) => {
    const wm = (e.work_model || "").toUpperCase();
    return wm === "WFH" || wm.includes("HOME");
  }).length;

  const hybridCount = onRosterStaff.filter((e) => {
    const wm = (e.work_model || "").toUpperCase();
    return wm === "HYBRID";
  }).length;

  // Fetch skills from API
  const { data: skillsData = [], isLoading: skillsLoading } = useQuery({
    queryKey: ["skills"],
    queryFn: skillApi.getAll,
  });

  // Extract skill names from the API response
  const predefinedSkills = skillsData.map((skill) => skill.name);

  const createMutation = useMutation({
    mutationFn: employeeApi.create,
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries(["employees"]);
      queryClient.invalidateQueries(["skills"]); // Refresh skills in case new ones were added
      setIsModalOpen(false);
      toast.success("Employee created successfully");
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || "Failed to create employee");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, previousStatus }) => {
      const res = await employeeApi.update(id, data);
      const newStatus = (data.status || "").toLowerCase();
      const oldStatus = (previousStatus || "").toLowerCase();

      // If status changed to 'inactive', automatically remove all assigned project allocations
      if (newStatus === "inactive" && oldStatus !== "inactive") {
        const empAllocations = allocations.filter(
          (a) => String(a.employee_id) === String(id),
        );
        if (empAllocations.length > 0) {
          await Promise.allSettled(
            empAllocations.map((a) => allocationApi.delete(a.id)),
          );
        }
      }
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
      const empAllocations = allocations.filter(
        (a) => String(a.employee_id) === String(id),
      );
      if (empAllocations.length > 0) {
        await Promise.allSettled(
          empAllocations.map((a) => allocationApi.delete(a.id)),
        );
      }
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
      toast.success(`${formatDisplayName(emp?.name) || emp?.name || "Employee"} converted to Full-time`);
      toast.success(`${formatDisplayName(emp.name || "Employee")} converted to Full-time`);
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

  const getStatusBadge = (status) => {
    const badges = {
      active: "badge-green",
      inactive: "badge-gray",
      "on-leave": "badge-yellow",
    };
    return badges[status?.toLowerCase()] || "badge-blue";
  };

  const getTypeBadge = (type) => {
    const badges = {
      "Full-time": "badge-blue",
      "Part-time": "badge-purple",
      Intern: "badge-orange",
      Contract: "badge-gray",
    };
    return badges[type] || "badge-gray";
  };

  const designationOptions = Array.from(
    new Set(allStaff.map((employee) => employee.designation).filter(Boolean)),
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
        return d.includes("manager") || d.includes("pm") || d.includes("lead");
      }
      if (colDesignation === "Annotator") {
        return d.includes("annotator") || d.includes("reviewer");
      }
      if (colDesignation === "Quality") {
        return d.includes("qc") || d.includes("quality");
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
    // Same three derived buckets the KPI card counts, so clicking a chip lists
    // exactly the people that card totalled.
    const matchesStatus = (() => {
      if (statusParam === "archived") return isArchived(employee);
      if (isArchived(employee)) return false;
      if (statusParam === "active") {
        return !isOnLeaveToday(employee) && hasProject(employee);
      }
      if (statusParam === "inactive") return isOnLeaveToday(employee);
      if (statusParam === "idle") return isIdle;
      return true; // "all" / no chip → the whole on-roster list
    })();
    return (
      matchesSearch &&
      matchesSkill &&
      matchesDesignation &&
      matchesColDesignation &&
      matchesColType &&
      matchesColWorkModel &&
      matchesIdle &&
      matchesStatus
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
    shouldSearchServer && filteredEmployees.length === 0 && serverMatches.length > 0;
  const displayedEmployees = usingServerResults ? serverMatches : sortedEmployees;

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    usingServerResults,
    skillFilter,
    designationFilter,
    idleOnly,
    statusParam,
    sortBy,
    colDesignation,
    colType,
    colWorkModel,
  ]);

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
      {/* Page Header */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-semibold text-slate-900 ">
                Employees
              </h1>
              <p className="text-slate-500 text-[13px] mt-0.5">
                Manage team members and their availability
              </p>
            </div>
          </div>
        </div>

        {/* KPI Overview Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* KPI 1: Total Employees */}
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

            {/* Highlighted Metric Stat Tiles */}
            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  if (statusParam === "active") params.delete("status");
                  else params.set("status", "active");
                  setSearchParams(params);
                }}
                className={`p-2 rounded-xl text-center border transition-all hover:scale-[1.02] ${statusParam === "active"
                  ? "bg-emerald-100/90 border-emerald-300 ring-2 ring-emerald-500/20"
                  : "bg-emerald-50/60 border-emerald-100/80 hover:bg-emerald-100/60"
                  }`}
              >
                <div className="text-base sm:text-lg font-extrabold text-emerald-700 font-mono leading-none">
                  {activeCount}
                </div>
                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-1 truncate">
                  Active
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  if (statusParam === "inactive") params.delete("status");
                  else params.set("status", "inactive");
                  setSearchParams(params);
                }}
                className={`p-2 rounded-xl text-center border transition-all hover:scale-[1.02] ${statusParam === "inactive"
                  ? "bg-slate-200 border-slate-400 ring-2 ring-slate-500/20"
                  : "bg-slate-50 border-slate-100 hover:bg-slate-100"
                  }`}
              >
                <div className="text-base sm:text-lg font-extrabold text-slate-700 font-mono leading-none">
                  {inactiveCount}
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1 truncate">
                  Inactive
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  if (statusParam === "idle") params.delete("status");
                  else params.set("status", "idle");
                  setSearchParams(params);
                }}
                className={`p-2 rounded-xl text-center border transition-all hover:scale-[1.02] ${statusParam === "idle"
                  ? "bg-amber-100/90 border-amber-300 ring-2 ring-amber-500/20"
                  : "bg-amber-50/60 border-amber-100/80 hover:bg-amber-100/60"
                  }`}
              >
                <div className="text-base sm:text-lg font-extrabold text-amber-700 font-mono leading-none">
                  {idleCount}
                </div>
                <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-1 truncate">
                  Idle
                </div>
              </button>
            </div>
          </div>

          {/* KPI 2: Work Model */}
          <div className="bg-white border border-slate-200/70 rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-2.5 mb-2.5 min-h-[32px]">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="text-[12.5px] font-bold text-slate-800 uppercase tracking-wider truncate">
                WORK MODEL
              </div>
            </div>

            {/* Highlighted Metric Stat Tiles */}
            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setColWorkModel((prev) => (prev === "WFO" ? "" : "WFO"))}
                className={`p-2 rounded-xl text-center border transition-all hover:scale-[1.02] ${colWorkModel === "WFO"
                  ? "bg-indigo-100/90 border-indigo-300 ring-2 ring-indigo-500/20"
                  : "bg-indigo-50/60 border-indigo-100/80 hover:bg-indigo-100/60"
                  }`}
              >
                <div className="text-base sm:text-lg font-extrabold text-indigo-700 font-mono leading-none">
                  {wfoCount}
                </div>
                <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mt-1 truncate">
                  WFO
                </div>
              </button>

              <button
                type="button"
                onClick={() => setColWorkModel((prev) => (prev === "WFH" ? "" : "WFH"))}
                className={`p-2 rounded-xl text-center border transition-all hover:scale-[1.02] ${colWorkModel === "WFH"
                  ? "bg-cyan-100/90 border-cyan-300 ring-2 ring-cyan-500/20"
                  : "bg-cyan-50/60 border-cyan-100/80 hover:bg-cyan-100/60"
                  }`}
              >
                <div className="text-base sm:text-lg font-extrabold text-cyan-700 font-mono leading-none">
                  {wfhCount}
                </div>
                <div className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider mt-1 truncate">
                  WFH
                </div>
              </button>

              <button
                type="button"
                onClick={() => setColWorkModel((prev) => (prev === "Hybrid" ? "" : "Hybrid"))}
                className={`p-2 rounded-xl text-center border transition-all hover:scale-[1.02] ${colWorkModel === "Hybrid"
                  ? "bg-purple-100/90 border-purple-300 ring-2 ring-purple-500/20"
                  : "bg-purple-50/60 border-purple-100/80 hover:bg-purple-100/60"
                  }`}
              >
                <div className="text-base sm:text-lg font-extrabold text-purple-700 font-mono leading-none">
                  {hybridCount}
                </div>
                <div className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mt-1 truncate">
                  Hybrid
                </div>
              </button>
            </div>
          </div>

          {/* KPI 3: Employment Type */}
          <div className="bg-white border border-slate-200/70 rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-2.5 mb-2.5 min-h-[32px]">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-4 h-4" />
              </div>
              <div className="text-[12.5px] font-bold text-slate-800 uppercase tracking-wider truncate">
                EMPLOYEE TYPES
              </div>
            </div>

            {/* Highlighted Metric Stat Tiles */}
            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setColType((prev) => (prev === "Full-time" ? "" : "Full-time"))}
                className={`p-2 rounded-xl text-center border transition-all hover:scale-[1.02] ${colType === "Full-time"
                  ? "bg-emerald-100/90 border-emerald-300 ring-2 ring-emerald-500/20"
                  : "bg-emerald-50/60 border-emerald-100/80 hover:bg-emerald-100/60"
                  }`}
              >
                <div className="text-base sm:text-lg font-extrabold text-emerald-700 font-mono leading-none">
                  {fullTimeCount}
                </div>
                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-1 truncate">
                  Full-time
                </div>
              </button>

              <button
                type="button"
                onClick={() => setColType((prev) => (prev === "Intern" ? "" : "Intern"))}
                className={`p-2 rounded-xl text-center border transition-all hover:scale-[1.02] ${colType === "Intern"
                  ? "bg-amber-100/90 border-amber-300 ring-2 ring-amber-500/20"
                  : "bg-amber-50/60 border-amber-100/80 hover:bg-amber-100/60"
                  }`}
              >
                <div className="text-base sm:text-lg font-extrabold text-amber-700 font-mono leading-none">
                  {internCount}
                </div>
                <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-1 truncate">
                  Intern
                </div>
              </button>

              <button
                type="button"
                onClick={() => setColType((prev) => (prev === "Contract" ? "" : "Contract"))}
                className={`p-2 rounded-xl text-center border transition-all hover:scale-[1.02] ${colType === "Contract"
                  ? "bg-sky-100/90 border-sky-300 ring-2 ring-sky-500/20"
                  : "bg-sky-50/60 border-sky-100/80 hover:bg-sky-100/60"
                  }`}
              >
                <div className="text-base sm:text-lg font-extrabold text-sky-700 font-mono leading-none">
                  {contractCount}
                </div>
                <div className="text-[10px] font-bold text-sky-600 uppercase tracking-wider mt-1 truncate">
                  Contract
                </div>
              </button>
            </div>
          </div>

          {/* KPI 4: Role Designations */}
          <div className="bg-white border border-slate-200/70 rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-2.5 mb-2.5 min-h-[32px]">
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div className="text-[12.5px] font-bold text-slate-800 uppercase tracking-wider truncate">
                DESIGNATION ROLES
              </div>
            </div>

            {/* Highlighted Metric Stat Tiles */}
            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleSelectColDesignation("Manager")}
                className={`p-2 rounded-xl text-center border transition-all hover:scale-[1.02] ${colDesignation === "Manager"
                  ? "bg-indigo-100/90 border-indigo-300 ring-2 ring-indigo-500/20"
                  : "bg-indigo-50/60 border-indigo-100/80 hover:bg-indigo-100/60"
                  }`}
              >
                <div className="text-base sm:text-lg font-extrabold text-indigo-700 font-mono leading-none">
                  {pmCount}
                </div>
                <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mt-1 truncate">
                  PMs
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectColDesignation("Annotator")}
                className={`p-2 rounded-xl text-center border transition-all hover:scale-[1.02] ${colDesignation === "Annotator"
                  ? "bg-sky-100/90 border-sky-300 ring-2 ring-sky-500/20"
                  : "bg-sky-50/60 border-sky-100/80 hover:bg-sky-100/60"
                  }`}
              >
                <div className="text-base sm:text-lg font-extrabold text-sky-700 font-mono leading-none">
                  {annotatorCount}
                </div>
                <div className="text-[10px] font-bold text-sky-600 uppercase tracking-wider mt-1 truncate">
                  Annotators
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectColDesignation("Quality")}
                className={`p-2 rounded-xl text-center border transition-all hover:scale-[1.02] ${colDesignation === "Quality"
                  ? "bg-purple-100/90 border-purple-300 ring-2 ring-purple-500/20"
                  : "bg-purple-50/60 border-purple-100/80 hover:bg-purple-100/60"
                  }`}
              >
                <div className="text-base sm:text-lg font-extrabold text-purple-700 font-mono leading-none">
                  {qcCount}
                </div>
                <div className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mt-1 truncate">
                  QC
                </div>
              </button>
            </div>
          </div>
        </div>
        {/* Tabs for Active Team vs Archived */}
        <div className="flex border-b border-slate-200">
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
        {/* Toolbar — Untitled-UI style: status segment on the left · search / filter / sort on the right */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Status segmented control */}
          {statusParam !== "archived" ? (
            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {["all", "active", "inactive", "idle"].map((s) => {
                const label = s.charAt(0).toUpperCase() + s.slice(1);
                const isActive =
                  (s === "all" && !statusParam) || statusParam === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      const params = new URLSearchParams(searchParams);
                      if (s === "all") {
                        params.delete("status");
                      } else {
                        params.set("status", s);
                      }
                      setSearchParams(params);
                    }}
                    className={`px-3.5 py-1.5 text-[13px] font-semibold rounded-md transition-all ${isActive
                      ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70"
                      : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : (
            <div />
          )}

          {/* Right cluster: chips · search · filter · sort · add */}
          <div className="flex flex-wrap items-center gap-2">
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
        loading={isLoading || skillsLoading || allocationsLoading}
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
                    <div className="text-[13.5px] font-semibold text-slate-900 truncate leading-tight">
                      {value}
                    </div>
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
              const managers = employeeManagersMap[row.id]
                ? [...employeeManagersMap[row.id]]
                : [];
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
                <div className="group relative flex items-center gap-1 flex-nowrap whitespace-nowrap cursor-default">
                  <span className="pointer-events-none text-[13px] font-medium text-slate-700 truncate max-w-[150px] inline-block">
                    {managers[0]}
                  </span>
                  {extra > 0 && (
                    <span className="inline-flex items-center justify-center flex-shrink-0 h-4 min-w-4 rounded-full bg-slate-100 px-1 text-[10px] font-semibold text-slate-500">
                      +{extra}
                    </span>
                  )}

                  {(extra > 0 || (managers[0] || "").length > 18) && (
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
              const projects = employeeProjectsMap[row.id];
              if (!projects || projects.size === 0) {
                return (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[12px] font-medium text-amber-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Idle
                  </span>
                );
              }
              const list = [...projects];
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
        data={displayedEmployees}
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
    </div>
  );
};

export default EmployeesPage;
