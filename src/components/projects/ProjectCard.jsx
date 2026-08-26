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
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { formatDisplayName } from "../../utils/displayName";
import Dropdown from "../ui/Dropdown";
import AllocationPopover from "../AllocationPopover";
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
} from "../../utils/projectConstants";


// "(2 PM · 1 Lead)" after a manpower count, or nothing when the project has
// neither. Both the required and the current figure carry it, so they stay
// comparable at a glance.
const SlotBreakdown = ({ pmSlots = 0, leadSlots = 0 }) => {
  if (pmSlots <= 0 && leadSlots <= 0) return null;
  return (
    <span className="ml-1 text-[11px] font-normal text-slate-400">
      ({pmSlots || 0} PM &middot; {leadSlots || 0} Lead)
    </span>
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

// Status: label inside a soft pill. No leading dot — the pill is already
// colour-coded, so the bullet repeated that in miniature and cost width the
// project name needs.
const STATUS_STYLE = {
  active: { label: "In Progress", pill: "bg-indigo-50 text-indigo-700" },
  poc: { label: "POC", pill: "bg-purple-50 text-purple-700" },
  completed: { label: "Completed", pill: "bg-emerald-50 text-emerald-700" },
  "on-hold": { label: "On Hold", pill: "bg-amber-50 text-amber-700" },
  cancelled: { label: "Cancelled", pill: "bg-rose-50 text-rose-700" },
};

// Client sentiment: friendly label + pill colors.
const SENTIMENT_STYLE = {
  GOOD: { label: "Good", pill: "bg-emerald-50 text-emerald-700" },
  AVG: { label: "Avg", pill: "bg-amber-50 text-amber-700" },
  Poor: { label: "Poor", pill: "bg-red-50 text-red-600" },
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
/** "Eknath Niraj Agrawal, Kisan Kumar Jena" -> "Eknath Agrawal, Kisan Jena". */
const shortenNames = (names = []) =>
  names.map((n) => formatDisplayName(n) || n).filter(Boolean).join(", ") || "—";

// `title` lets the hover card carry something the label does not — for people,
// the full stored name behind a first-and-last-only label.
const TruncTip = ({ text, title, className = "" }) => (
  <div className="group/tip relative min-w-0">
    <div className={`truncate ${className}`}>{text}</div>
    <span className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-max max-w-[240px] whitespace-normal break-words rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-lg group-hover/tip:block">
      {title || text}
    </span>
  </div>
);

// A single project card. It shows the project at a glance; editing happens
// through the pencil in the footer, which opens the full editor modal. The
// inline "edit" mode below is kept for that state but is no longer triggered by
// double-clicking the card — stray double-clicks put cards into edit by accident.


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
      className={`group flex flex-col rounded-lg border bg-white p-5 shadow-sm transition-all duration-200 ${isEditing
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
          {/* Name + org reserve the height of a two-line name TOGETHER, not
              individually. Reserving it on the name alone pushed the org down a
              blank line on every single-line card; reserving it here keeps the
              org tight under the name and still lands the divider — and every
              row below it — at the same height across the row. */}
          <div className="min-h-[3.9rem] min-w-0 flex-1">
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
            <p className="mt-0.5 truncate text-[13px] font-medium text-slate-600">
              {parentProject?.client || "—"}
            </p>
          </div>
        </div>

        {/* Project status, with the client sentiment badge sitting right of it */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {isEditing ? (
            <>
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
                      className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${on
                        ? `${active} text-white`
                        : "bg-slate-50 text-slate-500 ring-slate-200 hover:bg-slate-100"
                        }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              {project.priority && (
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${project.priority === "P0"
                    ? "bg-red-50 text-red-700"
                    : project.priority === "P1"
                      ? "bg-orange-50 text-orange-700"
                      : project.priority === "P2"
                        ? "bg-blue-50 text-blue-700"
                        : project.priority === "P3"
                          ? "bg-purple-50 text-purple-700"
                          : "bg-slate-50 text-slate-700"
                    }`}
                >
                  {project.priority}
                </span>
              )}
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${status.pill}`}
              >
                {status.label}
              </span>
              {sentiment && (
                <span
                  title="Client sentiment"
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${sentiment.pill}`}
                >
                  {sentiment.label}
                </span>
              )}
            </div>
          )}
          {project.created_at && (
            <span className="text-right text-[11px] text-slate-400">
              Created {format(new Date(project.created_at), "MMM d, yyyy")}
            </span>
          )}
        </div>
      </div>

      <div className="my-3 border-t border-slate-100" />

      {/* PM / Team lead / Type / Vendor */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {/* Both carry stored names: shortened for the label, full in the hover. */}
        <CardField label="Project Manager">
          <TruncTip
            text={shortenNames(pmNames)}
            title={pmNames.join(", ")}
            className="text-sm font-semibold text-slate-800"
          />
        </CardField>

        <CardField label="Team lead">
          <TruncTip
            text={shortenNames(teamLeadNames)}
            title={teamLeadNames.join(", ")}
            className="text-sm font-semibold text-slate-800"
          />
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

      {/* Delivery figures — how the project is staffed and how long a task
          takes. Boxed as one block so they read apart from the identity fields
          above (who runs it, what it is, who supplies it), and paired down the
          rows: required beside current, annotators beside reviewers, their two
          per-task times beside each other.

          This replaced a boxed "10 / 12" ratio, which made the reader work out
          which side was which and framed a derived, read-only figure as though
          it were editable. */}
      <div className="mt-3.5 mb-4 rounded-md bg-slate-50/40 p-3.5 ring-1 ring-slate-200">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <CardField label="Manpower required">
            {/* Both counts spell out their manager and lead slots, because the
                requirement includes them — otherwise 2 against a project asking
                for one reviewer reads as wrong. */}
            <p className="text-sm font-semibold text-slate-800 tabular-nums">
              {requiredManpower}
              <SlotBreakdown pmSlots={pmSlots} leadSlots={leadSlots} />
            </p>
          </CardField>

          <CardField label="Manpower current">
            {/* Hovering the count opens the roster popover — who is on the
                project, and the way through to Allocations. */}
            <AllocationPopover
              project={project}
              allocations={allocations}
              employees={employees}
              formerEmployees={formerEmployees}
              onLeaveEmployeeIds={onLeaveEmployeeIds}
              locationByEmployeeId={locationByEmployeeId}
              onOpenAllocations={() =>
                navigate(`${prefix}/allocations`, {
                  state: { projectId: project.id },
                })
              }
              triggerClassName="text-sm font-semibold tabular-nums hover:text-indigo-600 transition-colors cursor-pointer"
              badgeContent={
                <span
                  className={
                    allocatedManpower >= requiredManpower &&
                      requiredManpower > 0
                      ? "text-emerald-600"
                      : "text-slate-800"
                  }
                >
                  {allocatedManpower}
                  <SlotBreakdown pmSlots={pmSlots} leadSlots={leadSlots} />
                </span>
              }
            />
          </CardField>

          {[
            ["Annotators", "autonex_annotators"],
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
                <p className="text-sm font-semibold text-slate-800 tabular-nums">
                  {project[field] ?? 0}
                </p>
              )}
            </CardField>
          ))}

          {/* Both times are stored in hours and shown in minutes — the figures
              people quote are "30 min a task", not "0.5 h". */}
          {[
            [
              "Annotation time / task",
              "annotation_minutes",
              project.estimated_time_per_task,
            ],
            [
              "Review time / task",
              "review_minutes",
              project.review_time_per_task,
            ],
          ].map(([label, draftKey, hours]) => (
            <CardField key={draftKey} label={label}>
              {isEditing ? (
                <div className="flex items-center gap-1" onClick={stop}>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={draft[draftKey]}
                    onChange={(e) => onDraftChange(draftKey, e.target.value)}
                    onWheel={(e) => e.target.blur()}
                    className={cardInputClass}
                  />
                  <span className="text-[11px] text-slate-400">min</span>
                </div>
              ) : (
                <p className="text-sm font-semibold text-slate-800 tabular-nums">
                  {hours ? (
                    <>
                      {Math.round(hours * 60)}{" "}
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
          ))}
        </div>
      </div>

      {/* Footer — mt-auto pins it to the bottom edge. Cards in a row stretch to
          the tallest, and any slack belongs in one place at the bottom rather
          than opening a gap above the actions on every short card. */}
      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3.5">
        <div className="flex items-center gap-2">
          {/* Analytics */}
          <div className="group/an relative inline-block">
            <button
              type="button"
              disabled={!hasEncord}
              onClick={(e) => {
                stop(e);
                navigate(`${prefix}/analytics/${project.id}`);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${hasEncord
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
            // A missing handler means the viewer may not perform that action, so the
            // control is omitted rather than rendered inert — a button that silently does
            // nothing reads as a bug.
            <>
              {onAdvanced && (
                <button
                  type="button"
                  onClick={onAdvanced}
                  title="Edit"
                  aria-label="Edit"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  title="Delete"
                  aria-label="Delete"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};


export default ProjectCard;
