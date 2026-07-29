// Single source of truth for "who is working today".
//
// The Employees page and the Dashboard both answer this question, and when each
// carried its own copy they disagreed: the Dashboard required status === "active"
// (dropping stored-"inactive" staff) and treated any non-rejected leave as being
// away, while the Employees page counted everyone not archived and only approved
// leave. That produced 199 on one screen and 204 on the other. Both now derive
// their numbers from here.
//
// The model has two independent axes:
//   employment — STORED on employee.status; only "archived" is meaningful now
//   engagement — DERIVED per day, never stored:
//        Inactive → on approved leave today
//        Idle     → here today but holding no project
//        Active   → here today and holding a project

/**
 * Today's local calendar date as YYYY-MM-DD.
 *
 * Deliberately not `toISOString().slice(0, 10)`, which is UTC and therefore
 * reports yesterday for the first 5.5 hours of every IST day.
 */
export const todayLocalISO = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;

export const isArchived = (employee) =>
  (employee?.status || "").toLowerCase() === "archived";

/**
 * employee id -> employee, keyed as a string so a caller may look up with
 * either a number or a string without knowing which the API handed back.
 */
export const buildEmployeeIndex = (employees = []) => {
  const index = new Map();
  employees.forEach((e) => {
    if (e?.id != null) index.set(String(e.id), e);
  });
  return index;
};

/**
 * True when an allocation points at somebody the roster no longer contains.
 *
 * `GET /allocations` returns every row whatever the employee's status, while
 * `GET /employees` hides archived staff. Archiving somebody through the archive
 * endpoint clears their allocations, but any other route to the same state — an
 * HR sync, a direct status edit — leaves them behind. Those rows are not
 * staffing the project: they must never fill a manpower slot, and the UI has to
 * name them for what they are instead of rendering a nameless "Unknown".
 */
export const isStaleAllocation = (alloc, employeeIndex) =>
  !employeeIndex?.has?.(String(alloc?.employee_id));

/**
 * Label for a stale allocation, in falling order of usefulness: the name the
 * allocations payload embeds (`GET /allocations` looks employees up without a
 * status filter, so archived staff are still named there), then the employee id.
 *
 * Never a bare "Former employee" when there is an id to show: several of these
 * rows on one project were indistinguishable, and you cannot delete a row you
 * cannot tell apart.
 */
export const staleAllocationName = (alloc) =>
  alloc?.employee_name ||
  (alloc?.employee_id != null
    ? `Former employee #${alloc.employee_id}`
    : "Former employee");

/**
 * Ids of the people a project's manpower is made of: everyone allocated plus
 * the PMs running it, deduped so a PM who is also allocated — or anyone holding
 * two allocations here — fills one slot, and narrowed to people still on the
 * roster so stale allocations don't inflate the count.
 *
 * Pass no index to skip the roster check.
 */
export const manpowerEmployeeIds = ({
  allocations = [],
  pmIds = [],
  employeeIndex,
} = {}) => {
  const onRoster = (id) => !employeeIndex || employeeIndex.has(String(id));
  const ids = new Set();
  allocations.forEach((a) => {
    if (a?.employee_id != null && onRoster(a.employee_id))
      ids.add(String(a.employee_id));
  });
  (pmIds || []).forEach((id) => {
    if (id != null && onRoster(id)) ids.add(String(id));
  });
  return ids;
};

/**
 * The PMs who occupy a slot of their own: on the roster, and not already holding
 * an allocation here — counting one of those would be the same person twice.
 */
export const extraPmIds = ({
  allocations = [],
  pmIds = [],
  employeeIndex,
} = {}) => {
  const allocated = new Set(
    allocations
      .filter((a) => a?.employee_id != null)
      .map((a) => String(a.employee_id)),
  );
  const ids = new Set();
  (pmIds || []).forEach((id) => {
    if (id == null) return;
    const key = String(id);
    if (allocated.has(key)) return;
    if (employeeIndex && !employeeIndex.has(key)) return;
    ids.add(key);
  });
  return ids;
};

/**
 * Required headcount as the UI must show it: the requested workers plus the PMs
 * running the project.
 *
 * The server computes `required_manpower` as annotators + reviewers + QC (see
 * `_autonex_headcount`) — PMs excluded — while `manpowerEmployeeIds` counts PMs
 * as assigned. The two sides were measuring different things, so a project with
 * 2 QC slots and 1 PM read 1/2 when the PM alone was on it, and a fully staffed
 * project read 12/10. PMs now count on both sides.
 */
export const totalRequiredManpower = ({
  required = 0,
  allocations = [],
  pmIds = [],
  employeeIndex,
} = {}) =>
  (required || 0) + extraPmIds({ allocations, pmIds, employeeIndex }).size;

/**
 * Ids of employees on leave today. Only APPROVED leave counts — a pending
 * request is not yet time off, and counting it marked people absent who were
 * at their desks.
 *
 * Accepts any leave list whose rows cover today, so a caller may pass a
 * today-only fetch or a whole month.
 */
export const getOnLeaveTodayIds = (leaves = [], todayStr = todayLocalISO()) => {
  const ids = new Set();
  leaves.forEach((leave) => {
    if ((leave?.status || "").toLowerCase() !== "approved") return;
    if (!leave.start_date || !leave.end_date) return;
    const from = String(leave.start_date).slice(0, 10);
    const to = String(leave.end_date).slice(0, 10);
    if (from <= todayStr && to >= todayStr) ids.add(String(leave.employee_id));
  });
  return ids;
};

/**
 * Ids of employees working from home today, from approved WFH requests.
 *
 * A WFH request is a RANGE (`wfh_date` .. `end_date`, the latter defaulting to
 * `wfh_date` for single-day requests), so this is an overlap test. Comparing
 * `wfh_date === today` would silently miss the middle of every multi-day
 * request.
 */
export const getWfhTodayIds = (
  wfhRequests = [],
  todayStr = todayLocalISO(),
) => {
  const ids = new Set();
  wfhRequests.forEach((req) => {
    if ((req?.status || "").toLowerCase() !== "approved") return;
    if (!req.wfh_date) return;
    const from = String(req.wfh_date).slice(0, 10);
    const to = String(req.end_date || req.wfh_date).slice(0, 10);
    if (from <= todayStr && to >= todayStr) ids.add(String(req.employee_id));
  });
  return ids;
};

/**
 * employee id -> Set of project names they hold.
 *
 * Worker allocations, plus the projects a program manager runs: a PM is working
 * even with no allocation of their own. That assignment is recorded in two
 * different places depending on how the project was set up — on the main project
 * (`program_manager_ids`) or directly on the sub-project
 * (`assigned_employee_ids`, which only ever holds PM/admin ids) — and missing
 * either one made managers show up as Idle.
 *
 * Keys are stringified so callers can look up with a number or a string.
 */
export const buildAssignedProjectsMap = ({
  allocations = [],
  mainProjects = [],
  subProjects = [],
} = {}) => {
  const map = {};
  const add = (employeeId, projectName) => {
    if (employeeId == null || !projectName) return;
    const key = String(employeeId);
    if (!map[key]) map[key] = new Set();
    map[key].add(projectName);
  };

  allocations.forEach((alloc) =>
    add(alloc.employee_id, alloc.sub_project_name || alloc.project_name),
  );

  const pmIdsOfMain = (mp) =>
    mp?.program_manager_ids?.length
      ? mp.program_manager_ids
      : mp?.program_manager_id
        ? [mp.program_manager_id]
        : [];

  mainProjects.forEach((mp) => {
    if (!mp?.id) return;
    const pmIds = pmIdsOfMain(mp);
    if (pmIds.length === 0) return;
    subProjects
      .filter((sp) => String(sp.main_project_id) === String(mp.id))
      .forEach((sp) => pmIds.forEach((pmId) => add(pmId, sp.name)));
  });

  subProjects.forEach((sp) => {
    const pmIds = sp?.assigned_employee_ids?.length
      ? sp.assigned_employee_ids
      : sp?.pm_id
        ? [sp.pm_id]
        : [];
    pmIds.forEach((pmId) => add(pmId, sp.name));
  });

  return map;
};

export const hasAssignedProject = (projectsMap, employeeId) => {
  const held = projectsMap?.[String(employeeId)];
  return !!held && held.size > 0;
};

/**
 * Split a roster into the three engagement buckets.
 *
 * Every non-archived employee lands in exactly one bucket, so the counts always
 * sum to the on-roster headcount rather than overlapping the way Active and Idle
 * used to.
 *
 * @returns {{onRoster: object[], active: object[], inactive: object[], idle: object[]}}
 */
export const bucketWorkforce = ({
  employees = [],
  onLeaveIds = new Set(),
  projectsMap = {},
} = {}) => {
  const onRoster = employees.filter((e) => !isArchived(e));
  const active = [];
  const inactive = [];
  const idle = [];

  onRoster.forEach((e) => {
    if (onLeaveIds.has(String(e.id))) inactive.push(e);
    else if (hasAssignedProject(projectsMap, e.id)) active.push(e);
    else idle.push(e);
  });

  return { onRoster, active, inactive, idle };
};
