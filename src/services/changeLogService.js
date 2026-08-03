import { recordLeaveApplication } from "../utils/leaveTypes";

const STORAGE_KEY = "autonex_change_logs_v3";

const INITIAL_MOCK_LOGS = [
  {
    id: "log-100",
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    category: "Leaves",
    action: "Applied for Leave",
    actionType: "Applied",
    entity: "Leave",
    entityId: "leave-92",
    entityName: "Manish Thombre",
    performer: {
      name: "Manish Thombre",
      email: "manisht@autonexai360.onmicrosoft.com",
      avatar_url: null,
      role: "Program Manager",
    },
    details: [
      { field: "Leave Type", from: "—", to: "Sick Leave" },
      { field: "Applied On", from: "—", to: new Date().toLocaleDateString() },
      { field: "Duration", from: "—", to: "1 Day (Full Day)" },
      { field: "Status", from: "—", to: "Pending Approval" },
    ],
  },
  {
    id: "log-101",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    category: "Employees",
    action: "Promoted Employee",
    actionType: "Promoted",
    entity: "Employee",
    entityId: "emp-204",
    entityName: "Saloni Raul",
    performer: {
      name: "System Admin",
      email: "admin@autonex.ai",
      avatar_url: null,
      role: "Admin",
    },
    details: [
      { field: "Employee Type", from: "Intern", to: "Full-time" },
      { field: "Promotion Date", from: "—", to: new Date().toLocaleDateString() },
    ],
  },
  {
    id: "log-101b",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    category: "Leaves",
    action: "Applied for Leave",
    actionType: "Applied",
    entity: "Leave",
    entityId: "leave-91",
    entityName: "Bhairavi Deshmukh",
    performer: {
      name: "Bhairavi Deshmukh",
      email: "bhairavid1866@gmail.com",
      avatar_url: null,
      role: "Annotator",
    },
    details: [
      { field: "Leave Type", from: "—", to: "Casual Leave" },
      { field: "Applied On", from: "—", to: new Date().toLocaleDateString() },
      { field: "Duration", from: "—", to: "2 Days (30 Jul - 31 Jul)" },
      { field: "Status", from: "—", to: "Pending Approval" },
    ],
  },
  {
    id: "log-102",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    category: "Projects",
    action: "Updated Project Allocation",
    actionType: "Updated",
    entity: "Project",
    entityId: "proj-12",
    entityName: "Giga-structured Hand Manipulation",
    performer: {
      name: "Prathamesh Sawle",
      email: "prathamesh@autonex.ai",
      avatar_url: null,
      role: "Manager",
    },
    details: [
      { field: "Assigned Annotators", from: "14 Annotators", to: "16 Annotators" },
      { field: "Status", from: "In Progress", to: "Active" },
    ],
  },
  {
    id: "log-103",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    category: "Leaves",
    action: "Approved Leave Request",
    actionType: "Approved",
    entity: "Leave",
    entityId: "leave-89",
    entityName: "Shubham Chandrawanshi",
    performer: {
      name: "Eknath Niraj Agrawal",
      email: "eknath@autonex.ai",
      avatar_url: null,
      role: "Manager",
    },
    details: [
      { field: "Leave Status", from: "Pending", to: "Approved" },
      { field: "Applied On", from: "—", to: "Jul 28, 2026 09:30 AM" },
      { field: "Duration", from: "—", to: "2 Days (Casual)" },
    ],
  },
  {
    id: "log-104",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    category: "Employees",
    action: "Updated Work Model",
    actionType: "Updated",
    entity: "Employee",
    entityId: "emp-108",
    entityName: "Deepanshu Mathankar",
    performer: {
      name: "System Admin",
      email: "admin@autonex.ai",
      avatar_url: null,
      role: "Admin",
    },
    details: [
      { field: "Work Model", from: "WFO", to: "Hybrid" },
    ],
  },
  {
    id: "log-105",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(), // 1.5 days ago
    category: "Allocations",
    action: "Assigned New Skill",
    actionType: "Created",
    entity: "Skill",
    entityId: "skill-45",
    entityName: "Robotics Annotation",
    performer: {
      name: "System Admin",
      email: "admin@autonex.ai",
      avatar_url: null,
      role: "Admin",
    },
    details: [
      { field: "Target Employee", from: "—", to: "Sukrut Nivendkar" },
      { field: "Skill Level", from: "—", to: "Expert" },
    ],
  },
  {
    id: "log-106",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    category: "Employees",
    action: "Archived Employee",
    actionType: "Archived",
    entity: "Employee",
    entityId: "emp-050",
    entityName: "Rohan Varma",
    performer: {
      name: "System Admin",
      email: "admin@autonex.ai",
      avatar_url: null,
      role: "Admin",
    },
    details: [
      { field: "Status", from: "Active", to: "Archived" },
      { field: "Reason", from: "—", to: "Resigned" },
    ],
  },
];

export function getStoredLogs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_LOGS));
      return INITIAL_MOCK_LOGS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to load change logs from storage", err);
    return INITIAL_MOCK_LOGS;
  }
}

export function logChange({
  category = "System",
  action,
  actionType = "Updated",
  entity = "General",
  entityId = "",
  entityName = "",
  performer = null,
  details = [],
}) {
  try {
    const currentLogs = getStoredLogs();

    let currentUser = performer;
    if (!currentUser) {
      try {
        const saved = localStorage.getItem("user");
        if (saved) {
          const parsed = JSON.parse(saved);
          currentUser = {
            name: parsed.name || parsed.first_name || "Admin User",
            email: parsed.email || "admin@autonex.ai",
            avatar_url: parsed.avatar_url || null,
            role: parsed.role || "Admin",
          };
        }
      } catch (e) {
        // fallback
      }
    }

    if (!currentUser) {
      currentUser = {
        name: "Admin User",
        email: "admin@autonex.ai",
        avatar_url: null,
        role: "Admin",
      };
    }

    const newLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      category,
      action,
      actionType,
      entity,
      entityId,
      entityName,
      performer: currentUser,
      details,
    };

    const isAppliedAction =
      actionType === "Applied" ||
      action === "Applied for Leave" ||
      (action && action.toLowerCase().includes("applied"));

    if (category === "Leaves" && isAppliedAction) {
      try {
        const datesDetail = details?.find((d) => d.field === "Dates")?.to || "";
        const parts = datesDetail.split(" to ");
        const sDate = parts[0]?.trim() || "";
        const eDate = parts[1]?.trim() || sDate;
        recordLeaveApplication({
          id: entityId,
          leave_id: entityId,
          start_date: sDate,
          end_date: eDate,
          created_at: newLog.timestamp,
        });
      } catch (e) {}
    }

    const updated = [newLog, ...currentLogs];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Dispatch event so active components can update live
    window.dispatchEvent(new CustomEvent("autonex:changelog_updated", { detail: newLog }));
    return newLog;
  } catch (err) {
    console.error("Failed to append change log", err);
  }
}

export function clearLogs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
}
