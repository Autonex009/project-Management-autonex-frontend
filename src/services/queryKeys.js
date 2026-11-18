/**
 * Centralized Query Key Factory
 *
 * Production-grade query key management following TanStack Query best practices.
 * Hierarchical key structures allow granular query targeting as well as
 * broad category invalidation (e.g. invalidating queryKeys.leaves.all invalidates
 * lists, calendars, and employee details in one call).
 */

export const queryKeys = {
  // === Dashboard & KPIs ===
  kpis: {
    all: ["kpis"],
    dashboard: () => ["dashboard-kpis"], // Kept backward-compatible with Phase 1
    autonexOverview: () => ["autonex-overview"],
    autonexDaily: (days = "30") => ["autonex-kpis", String(days)],
    analyticsSummary: () => ["analytics-summary"],
  },

  // === Leaves ===
  leaves: {
    all: ["leaves"],
    lists: () => ["leaves-page"],
    list: (params) => ["leaves-page", params],
    calendar: (month) => (month ? ["leave-calendar", month] : ["leave-calendar"]),
    allDetails: () => ["leaves-all-details"],
    myLeaves: (employeeId) => (employeeId ? ["my-leaves", employeeId] : ["my-leaves"]),
    balances: (employeeId) => (employeeId ? ["leave-balances", employeeId] : ["leave-balances"]),
  },

  // === Work From Home (WFH) ===
  wfh: {
    all: ["wfh"],
    lists: () => ["wfh-page"],
    list: (params) => ["wfh-page", params],
    allDetails: () => ["wfh-all-details"],
    myWfh: (employeeId) => (employeeId ? ["my-wfh", employeeId] : ["my-wfh"]),
  },

  // === Canteen Menu ===
  canteen: {
    all: ["canteenMenu"],
    menu: (date) => (date ? ["canteenMenu", date] : ["canteenMenu"]),
  },

  // === Check-in System ===
  checkin: {
    all: ["checkin"],
    today: (date) => (date ? ["checkin-today", date] : ["checkin-today"]),
    pulse: () => ["checkin-pulse"],
    adminToday: () => ["checkins-admin-today"],
    teamToday: () => ["checkins-team-today"],
  },

  // === Employees ===
  employees: {
    all: ["employees"],
    list: (filters) => (filters ? ["employees", { filters }] : ["employees"]),
    kpis: () => ["all-employees-kpis"],
    docsSummary: (employeeId) => ["employee-docs-summary", employeeId],
  },

  // === Signup Requests ===
  signupRequests: {
    all: ["signup-requests"],
    list: () => ["signup-requests"],
    counts: () => ["signup-requests-counts"],
  },

  // === Projects & Sub-Projects ===
  projects: {
    all: ["projects"],
    parentProjects: () => ["parent-projects"],
    subProjects: () => ["sub-projects"],
    paginated: (page, limit) => ["sub-projects-paginated", page, limit],
    myProjects: () => ["my-projects"],
  },

  // === Allocations ===
  allocations: {
    all: ["allocations"],
    list: () => ["allocations"],
  },
};

export default queryKeys;
