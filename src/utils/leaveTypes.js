export const LEAVE_TYPE_OPTIONS = [
  { value: "paid", label: "Paid Leave" },
  { value: "casual_sick", label: "Casual/Sick Leave" },
  { value: "floater", label: "Floater Leave" },
  { value: "first_half", label: "First Half-day Leave" },
  { value: "second_half", label: "Second Half-day Leave" },
];

const LEGACY_LEAVE_TYPE_ALIASES = {
  vacation: "paid",
  casual: "casual_sick",
  sick: "casual_sick",
  personal: "floater",
  emergency: "floater",
};

const LEAVE_TYPE_LABELS = Object.fromEntries(
  LEAVE_TYPE_OPTIONS.map((option) => [option.value, option.label]),
);

const LEAVE_TYPE_BADGES = {
  paid: "bg-blue-50 text-blue-700",
  casual_sick: "bg-emerald-50 text-emerald-700",
  floater: "bg-amber-50 text-amber-700",
  first_half: "bg-indigo-50 text-indigo-700",
  second_half: "bg-violet-50 text-violet-700",
};

// Annual paid-leave entitlement (working days/year), mirrors the backend
// ANNUAL_LEAVE_QUOTA in app/constants/leave_types.py. Used to show remaining
// balances; once a type's quota is exhausted further days become unpaid leave.
export const ANNUAL_LEAVE_QUOTA = {
  paid: 12,
  casual_sick: 6,
  floater: 2,
};

// Interns accrue paid leave monthly (1/month, resets each month) instead of the
// annual quota above. Mirrors INTERN_MONTHLY_PAID_QUOTA in the backend.
export const INTERN_MONTHLY_PAID_QUOTA = 1;

export function isIntern(employeeType) {
  const type = (employeeType || "").trim().toLowerCase();
  return type === "intern" || type === "contract" || type === "contractor";
}

export const FLOATER_DATES_2026 = [
  { date: "2026-01-14", label: "Pongal / Makar Sankranti" },
  { date: "2026-01-23", label: "Vasant Panchami" },
  { date: "2026-02-15", label: "Maha Shivratri" },
  { date: "2026-02-19", label: "Shivaji Jayanti" },
  { date: "2026-03-19", label: "Ugadi / Gudi Padwa" },
  { date: "2026-03-21", label: "Ramzan Eid" },
  { date: "2026-03-31", label: "Mahavir Jayanti" },
  { date: "2026-04-03", label: "Good Friday" },
  { date: "2026-04-14", label: "Ambedkar Jayanti" },
  { date: "2026-05-27", label: "Bakrid" },
  { date: "2026-08-15", label: "Independence Day" },
  { date: "2026-08-26", label: "Onam" },
  { date: "2026-08-28", label: "Raksha Bandhan" },
  { date: "2026-09-04", label: "Janmashtami" },
  { date: "2026-10-20", label: "Dussehra" },
  { date: "2026-11-08", label: "Diwali" },
  { date: "2026-11-11", label: "Bhai Duj" },
  { date: "2026-11-24", label: "Guru Nanak Jayanti" },
  { date: "2026-12-23", label: "Hazarat Ali's Birthday" },
];

const FLOATER_DATE_SET = new Set(FLOATER_DATES_2026.map((d) => d.date));

export function isValidFloaterDate(dateStr) {
  if (!dateStr) return false;
  return FLOATER_DATE_SET.has(dateStr);
}

export function getFloaterDateLabel(dateStr) {
  return FLOATER_DATES_2026.find((d) => d.date === dateStr)?.label || null;
}

export const FIXED_HOLIDAYS_2026 = [
  { date: "2026-01-01", label: "New Year's Day" },
  { date: "2026-01-26", label: "Republic Day" },
  { date: "2026-03-04", label: "Holi" },
  { date: "2026-05-01", label: "Maharashtra Day" },
  { date: "2026-06-26", label: "Muharram" },
  { date: "2026-09-14", label: "Ganesh Chaturthi" },
  { date: "2026-10-02", label: "Mahatma Gandhi Jayanti" },
  { date: "2026-11-09", label: "Govardhan Puja" },
  { date: "2026-12-25", label: "Christmas" },
];

const FIXED_HOLIDAY_SET = new Set(FIXED_HOLIDAYS_2026.map((d) => d.date));

export function isFixedHoliday(dateStr) {
  return FIXED_HOLIDAY_SET.has(dateStr);
}

export function getFixedHolidayLabel(dateStr) {
  return FIXED_HOLIDAYS_2026.find((d) => d.date === dateStr)?.label || null;
}

export function isWeekend(dateStr) {
  if (!dateStr) return false;
  const day = new Date(dateStr + "T00:00:00").getDay(); // 0=Sun, 6=Sat
  return day === 0 || day === 6;
}

export function isNonWorkingDay(dateStr) {
  return isWeekend(dateStr) || isFixedHoliday(dateStr);
}

export function getNonWorkingDayLabel(dateStr) {
  if (isWeekend(dateStr)) {
    const day = new Date(dateStr + "T00:00:00").getDay();
    return day === 6 ? "Saturday" : "Sunday";
  }
  return getFixedHolidayLabel(dateStr) || null;
}

/**
 * Format a Date to a YYYY-MM-DD string using LOCAL calendar components.
 *
 * IMPORTANT: do not use Date.toISOString() for this — it converts to UTC, so in
 * any timezone ahead of UTC (e.g. IST, UTC+5:30) a local midnight rolls back to
 * the previous calendar day, shifting every day in a range by one and producing
 * wrong working-day counts (and wrongly blocking valid single-day leaves).
 */
export function toLocalISODate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns the first non-working day found in [startDateStr, endDateStr],
 * or null if all days are working days.
 */
export function findNonWorkingDayInRange(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return null;
  const start = new Date(startDateStr + "T00:00:00");
  const end = new Date(endDateStr + "T00:00:00");
  const cur = new Date(start);
  while (cur <= end) {
    const ds = toLocalISODate(cur);
    if (isNonWorkingDay(ds)) return ds;
    cur.setDate(cur.getDate() + 1);
  }
  return null;
}

export function getWorkingDayCount(
  startDateStr,
  endDateStr,
  isHalfDay = false,
) {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr + "T00:00:00");
  const end = new Date(endDateStr + "T00:00:00");
  if (end < start) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (!isNonWorkingDay(toLocalISODate(cur))) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return isHalfDay ? (count > 0 ? 0.5 : 0) : count;
}

export function countNonWorkingDaysInRange(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr + "T00:00:00");
  const end = new Date(endDateStr + "T00:00:00");
  if (end < start) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (isNonWorkingDay(toLocalISODate(cur))) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export const RAZORPAY_NEGATIVE_BALANCE_NOTE =
  "If your leave balance is exhausted, Razorpay may automatically convert this request to unpaid leave, which can affect payroll.";

export function normalizeLeaveType(value) {
  const normalized = (value || "").trim().toLowerCase().replace(/[- ]/g, "_");
  return LEGACY_LEAVE_TYPE_ALIASES[normalized] || normalized;
}

export function getLeaveTypeLabel(value) {
  const normalized = normalizeLeaveType(value);
  return (
    LEAVE_TYPE_LABELS[normalized] ||
    normalized.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

export function getLeaveTypeBadgeClass(value) {
  return (
    LEAVE_TYPE_BADGES[normalizeLeaveType(value)] ||
    "bg-slate-100 text-slate-600"
  );
}

export function validateConsecutiveLeaves(
  startDateStr,
  endDateStr,
  leavesList,
  excludeLeaveId = null,
  isHalfDay = false,
) {
  if (isHalfDay) return true;
  if (!startDateStr || !endDateStr) return true;

  const start = new Date(startDateStr + "T00:00:00");
  const end = new Date(endDateStr + "T00:00:00");

  const windowStart = new Date(start);
  windowStart.setDate(windowStart.getDate() - 10);
  const windowEnd = new Date(end);
  windowEnd.setDate(windowEnd.getDate() + 10);

  const leaveDates = new Set();

  // Add new leave's working days
  let cur = new Date(start);
  while (cur <= end) {
    const ds = toLocalISODate(cur);
    if (!isNonWorkingDay(ds)) {
      leaveDates.add(ds);
    }
    cur.setDate(cur.getDate() + 1);
  }

  // Add existing non-rejected leaves' working days
  leavesList.forEach((l) => {
    if (l.status === "rejected" || l.leave_id === excludeLeaveId) return;
    if (
      l.is_half_day ||
      l.leave_type === "first_half" ||
      l.leave_type === "second_half"
    )
      return;

    let lStart = new Date(l.start_date + "T00:00:00");
    let lEnd = new Date(l.end_date + "T00:00:00");

    let c = new Date(lStart < windowStart ? windowStart : lStart);
    let actualEnd = lEnd > windowEnd ? windowEnd : lEnd;

    while (c <= actualEnd) {
      const ds = toLocalISODate(c);
      if (!isNonWorkingDay(ds)) {
        leaveDates.add(ds);
      }
      c.setDate(c.getDate() + 1);
    }
  });

  // Scan the window day-by-day and track consecutive run
  let consecutiveRun = 0;
  cur = new Date(windowStart);
  while (cur <= windowEnd) {
    const ds = toLocalISODate(cur);
    if (!isNonWorkingDay(ds)) {
      if (leaveDates.has(ds)) {
        consecutiveRun++;
        if (consecutiveRun >= 5) {
          return false; // Safely blocked!
        }
      } else {
        consecutiveRun = 0;
      }
    }
    cur.setDate(cur.getDate() + 1);
  }
  return true;
}

export function getLeaveOverLimitInfo(leave, allLeaves = []) {
  if (!leave || !leave.start_date) {
    return { overDays: 1, overDaysText: "1 day", totalMonthDays: 3, limit: 2 };
  }

  const startDate = new Date(leave.start_date + "T00:00:00");
  const month = startDate.getMonth();
  const year = startDate.getFullYear();

  const empId = leave.employee_id;
  const monthLeaves = (allLeaves || []).filter((l) => {
    if (l.employee_id !== empId) return false;
    if (!l.start_date) return false;
    if (l.status === "rejected" || l.status === "cancelled") return false;
    const d = new Date(l.start_date + "T00:00:00");
    return d.getMonth() === month && d.getFullYear() === year;
  });

  let totalMonthDays = 0;
  monthLeaves.forEach((l) => {
    totalMonthDays += getWorkingDayCount(l.start_date, l.end_date, l.is_half_day);
  });

  const limit = 2;
  const currentDuration = getWorkingDayCount(leave.start_date, leave.end_date, leave.is_half_day) || 1;
  const calculatedOver = totalMonthDays > limit
    ? totalMonthDays - limit
    : currentDuration;

  const overDays = Math.max(0.5, Math.round(calculatedOver * 10) / 10);
  const overDaysText = `${overDays} ${overDays === 1 ? "day" : "days"}`;

  return {
    overDays,
    overDaysText,
    totalMonthDays: totalMonthDays || (limit + currentDuration),
    limit,
  };
}

const memoryAppliedMap = new Map();
const APPLIED_MAP_KEY = "autonex_applied_dates_map_v1";

export function recordLeaveApplication(data) {
  if (!data) return;
  try {
    const raw = localStorage.getItem(APPLIED_MAP_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const timestamp = data.created_at || data.applied_on || new Date().toISOString();

    const empId = String(data.employee_id || data.emp_id || data.user_id || "");
    const sDate = (data.start_date || "").slice(0, 10);
    const eDate = (data.end_date || sDate).slice(0, 10);

    const keysToSet = [];
    if (data.id) keysToSet.push(String(data.id));
    if (data.leave_id) keysToSet.push(String(data.leave_id));
    if (sDate) {
      if (empId) keysToSet.push(`${empId}_${sDate}_${eDate}`);
      keysToSet.push(`${sDate}_${eDate}`);
      keysToSet.push(sDate);
    }

    keysToSet.forEach((key) => {
      if (key && !memoryAppliedMap.has(key)) {
        memoryAppliedMap.set(key, timestamp);
      }
      if (key && !map[key]) {
        map[key] = timestamp;
      }
    });

    localStorage.setItem(APPLIED_MAP_KEY, JSON.stringify(map));
  } catch (err) {
    console.error("Failed to record leave application date", err);
  }
}

export function resolveLeaveAppliedDate(leave) {
  if (!leave) return null;

  // 1. Direct object properties from API (any casing / variations)
  const direct =
    leave.applied_on ||
    leave.applied_at ||
    leave.created_at ||
    leave.submitted_at ||
    leave.created_on ||
    leave.date_applied ||
    leave.appliedDate ||
    leave.createdAt ||
    leave.submittedAt ||
    leave.date_created ||
    leave.creation_date;
  if (direct) return direct;

  const sDate = (leave.start_date || "").slice(0, 10);
  const eDate = (leave.end_date || sDate).slice(0, 10);
  const empId = String(leave.employee_id || leave.emp_id || leave.user_id || "");
  const targetId = String(leave.id || leave.leave_id || "");

  const keysToCheck = [
    targetId,
    empId && sDate ? `${empId}_${sDate}_${eDate}` : null,
    sDate ? `${sDate}_${eDate}` : null,
    sDate ? sDate : null,
  ].filter(Boolean);

  // 2. Memory cache check
  for (const key of keysToCheck) {
    if (memoryAppliedMap.has(key)) {
      return memoryAppliedMap.get(key);
    }
  }

  // 3. Client-side localStorage map check
  try {
    const raw = localStorage.getItem(APPLIED_MAP_KEY);
    if (raw) {
      const map = JSON.parse(raw);
      for (const key of keysToCheck) {
        if (map[key]) {
          memoryAppliedMap.set(key, map[key]);
          return map[key];
        }
      }
    }
  } catch (e) {}

  // NOTE: a previous step here mined the browser's "autonex_change_logs_v3" key —
  // the old client-side change log — for an applied-on timestamp. That log has been
  // replaced by the server-side audit trail, so the key is never written anymore and
  // reading it would only surface stale (originally mock) data.

  // 4. Persistent Fallback for active leave records without backend timestamp
  if (sDate) {
    const nowIso = new Date().toISOString();
    recordLeaveApplication({ ...leave, created_at: nowIso });
    return nowIso;
  }

  return null;
}

