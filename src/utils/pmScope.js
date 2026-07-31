export function getPmEmployeeId(user = {}) {
  // Only use employee_id — user.id is a User table PK, not an Employee table PK
  return user.employee_id ?? null;
}

export function getPmProjectIds(parentProjects = [], pmEmployeeId) {
  if (!pmEmployeeId) return new Set();

  return new Set(
    parentProjects
      .filter(
        (project) =>
          project.program_manager_id === pmEmployeeId ||
          (Array.isArray(project.program_manager_ids) &&
            project.program_manager_ids.includes(pmEmployeeId)),
      )
      .map((project) => project.id),
  );
}

export function getPmProjects(parentProjects = [], pmEmployeeId) {
  const projectIds = getPmProjectIds(parentProjects, pmEmployeeId);
  return parentProjects.filter((project) => projectIds.has(project.id));
}

// Organizations a PM should see: ones they manage PLUS any that contain a project
// they own (assigned to them). This lets a PM reach their own projects that live
// under a shared organization they don't manage (e.g. "Autonex" owned by another PM).
export function getPmVisibleOrgs(
  parentProjects = [],
  subProjects = [],
  pmEmployeeId,
) {
  if (!pmEmployeeId) return [];
  const managed = getPmProjectIds(parentProjects, pmEmployeeId);
  const orgsWithOwnedProject = new Set(
    subProjects
      .filter(
        (sp) =>
          Array.isArray(sp.assigned_employee_ids) &&
          sp.assigned_employee_ids.includes(pmEmployeeId),
      )
      .map((sp) => sp.main_project_id)
      .filter(Boolean),
  );
  return parentProjects.filter(
    (p) => managed.has(p.id) || orgsWithOwnedProject.has(p.id),
  );
}

export function getPmSubProjects(
  subProjects = [],
  parentProjects = [],
  pmEmployeeId,
  allocations = [],
) {
  if (!pmEmployeeId) return [];
  const projectIds = getPmProjectIds(parentProjects, pmEmployeeId);
  const allocatedSubProjectIds = new Set(
    allocations
      .filter((allocation) => allocation.employee_id === pmEmployeeId)
      .map((allocation) => allocation.sub_project_id),
  );

  return subProjects.filter((subProject) => {
    const projectPms = Array.isArray(subProject.assigned_employee_ids)
      ? subProject.assigned_employee_ids
      : [];
    const directlyAssigned = projectPms.includes(pmEmployeeId);
    const directlyAllocated = allocatedSubProjectIds.has(subProject.id);

    // Organization-level inheritance applies ONLY to projects that have no explicit
    // project-level PM. Once a project lists its own PM(s), it is scoped to them — so
    // when several PMs share an organization (e.g. "AMAZON") each sees only the
    // projects they own, while unowned/legacy projects still surface to the org's PMs.
    const hasProjectPm = projectPms.length > 0;
    const orgFallback =
      !hasProjectPm &&
      subProject.main_project_id &&
      projectIds.has(subProject.main_project_id);

    return directlyAssigned || directlyAllocated || orgFallback;
  });
}
