// Who may act on what.
//
// A team lead has the same powers as a program manager and is scoped the same way — to the
// projects they run. The hierarchy shows up only in whose *own* requests they may decide,
// which the server settles (see backend/app/services/project_scope.py). Keep these in step
// with that module, or the UI hides a control the API allows.

// Roles that bypass project scoping altogether.
export const FULL_ACCESS_ROLES = ["admin", "hr"];

export const hasFullAccess = (role) => FULL_ACCESS_ROLES.includes(role);

/**
 * Roles whose lists are narrowed to their own projects.
 *
 * Distinct from "is a program manager", and the distinction is load-bearing. A page that
 * scopes with `role === "pm"` shows a team lead **everything**, because they fail the test
 * and fall through to the admin path — the opposite of the intent. But a page that decides
 * "assign me as this project's manager" must NOT treat a lead as a PM, or creating a project
 * would silently give them a manager's rank over its other leads.
 *
 * So: use this for filtering what is visible; use an explicit `role === "pm"` for anything
 * that confers rank.
 */
export const PROJECT_SCOPED_ROLES = ["pm", "team_lead"];

export const isProjectScopedRole = (role) =>
  PROJECT_SCOPED_ROLES.includes(role);

/**
 * Roles that may act on leave / WFH / evaluation requests at all.
 *
 * A coarse gate for showing the controls; the server decides the actual outcome per request
 * (`project_scope.can_manage_employee`), since whether a given row is yours to decide
 * depends on the subject's tier and which projects you run — neither of which a role check
 * can answer.
 *
 * Exported so pages import it instead of re-declaring a literal list. A hand-written
 * `["pm","admin","hr"]` has silently omitted team leads twice now, and the failure is
 * invisible: the rows render, the Actions column just shows a dash.
 */
export const REQUEST_ACTION_ROLES = ["admin", "hr", "pm", "team_lead"];

export const canRoleActOnRequests = (role) =>
  REQUEST_ACTION_ROLES.includes(role);

// PMs recorded at the organisation level, newest column first.
const mainProjectPmIds = (mainProject) => {
  if (!mainProject) return [];
  if (mainProject.program_manager_ids?.length)
    return mainProject.program_manager_ids;
  if (mainProject.program_manager_id) return [mainProject.program_manager_id];
  return [];
};

/**
 * The employee ids that manage `project` (a daily sheet).
 *
 * Project-level assignment wins; an organisation's PMs apply only to projects that name
 * no PM of their own. That ordering is what lets several PMs share one client while each
 * owns distinct projects under it.
 */
export const resolveProjectPmIds = (project, mainProjects = []) => {
  if (project?.assigned_employee_ids?.length)
    return project.assigned_employee_ids;
  return mainProjectPmIds(
    mainProjects.find((p) => p.id === project?.main_project_id),
  );
};

/**
 * Whether `user` may act on `project` — its program manager or one of its leads.
 *
 * Compares `employee_id`, never `id` — `user.id` is a User primary key while every PM id
 * here is an Employee primary key, so comparing them silently matches the wrong person.
 *
 * `leadIds` is optional because most callers already have the project's leads to hand from
 * their allocations; omit it and the check falls back to the PM set alone.
 */
export const canActOnProject = (
  user = {},
  project,
  mainProjects = [],
  leadIds = [],
) => {
  if (hasFullAccess(user.role)) return true;
  const employeeId = user.employee_id;
  if (!employeeId) return false;
  const actorIds = [
    ...resolveProjectPmIds(project, mainProjects),
    ...leadIds,
  ].map(Number);
  return actorIds.includes(Number(employeeId));
};

// The value written into `allocations.role_tags` to mark a lead. Not a workstream, so it
// never takes a share of the working day in the hours split.
export const TEAM_LEAD_TAG = "Team Lead";

export const isTeamLeadDesignation = (designation) =>
  (designation || "").toLowerCase().includes("team lead");

/**
 * Whether `allocation` makes its employee a lead of that project.
 *
 * Two ways to qualify, and both are needed:
 *
 * 1. **`role_tags` carrying "Team Lead"** on this specific allocation — what the Team Lead
 *    picker writes, and the only per-project record of leadership.
 * 2. **Designation** "Team Lead" — a fallback, so allocations made before the tag existed,
 *    or from the Allocations page, still resolve rather than showing no lead at all.
 *
 * Being a lead confers a manager's powers over that project. What it does not confer is
 * rank over other leads on it — see backend `app/services/project_scope.py`.
 */
export const isTeamLeadAllocation = (allocation, employee) =>
  isTeamLeadDesignation(employee?.designation) ||
  (Array.isArray(allocation?.role_tags) &&
    allocation.role_tags.some((tag) => isTeamLeadDesignation(tag)));

// ── Request tiers ───────────────────────────────────────────────────
// Mirrors ADMIN_ONLY_SUBJECT_DESIGNATIONS / PM_ONLY_SUBJECT_DESIGNATIONS in
// backend/app/services/project_scope.py, including the exact-match-after-normalising
// behaviour and both spellings of "program/project manager". Divergence here shows up as a
// row you can see but not action.

const ADMIN_ONLY_SUBJECT_DESIGNATIONS = [
  "program manager",
  "project manager",
  "hr",
];

const normalise = (value) => (value || "").trim().toLowerCase();

/** Their own requests are an admin's call — no manager decides for a peer manager. */
export const subjectIsAdminOnly = (employee) =>
  ADMIN_ONLY_SUBJECT_DESIGNATIONS.includes(normalise(employee?.designation));

/**
 * Whether the signed-in viewer may decide requests belonging to `employee`.
 *
 * Intended for the pages that are *already* scoped to the viewer's own projects, so the
 * project half of the question is answered by the caller and only the tier is left:
 *
 *   yourself                  → no, nobody signs off their own
 *   a manager (PM / HR)       → no, admin only
 *   a team lead               → only a program manager
 *   anyone else               → yes
 *
 * Used to filter *what is listed*, not only what is clickable: showing a request the viewer
 * cannot act on is worse than hiding it — it reads as their responsibility and the action
 * silently 403s.
 */
export const canDecideForEmployee = ({
  viewerRole,
  viewerEmployeeId,
  employee,
} = {}) => {
  if (hasFullAccess(viewerRole)) return true;
  if (!employee) return false;
  if (
    viewerEmployeeId != null &&
    Number(employee.id) === Number(viewerEmployeeId)
  )
    return false;
  if (subjectIsAdminOnly(employee)) return false;
  if (isTeamLeadDesignation(employee.designation)) return viewerRole === "pm";
  return true;
};
