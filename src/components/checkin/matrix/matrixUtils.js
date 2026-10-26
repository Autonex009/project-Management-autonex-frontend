/**
 * Pure utility functions for the Check-in Matrix:
 * - Date string formatting
 * - Employee search matching
 * - Date-specific filters (Late check-in, No check-in, WFH, WFO)
 * - Business-day aware consecutive absence lookback algorithm
 * - Chronological time sorting on selected dates
 */

/**
 * Format a Date object or date-like value to 'YYYY-MM-DD'
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDateKey(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Checks if an employee row matches the search query.
 * Matches employee name and designation.
 * @param {object} row
 * @param {string} query
 * @returns {boolean}
 */
export function matchesSearch(row, query) {
  if (!query || !query.trim()) return true;
  const q = query.trim().toLowerCase();
  const nameMatch = row?.name?.toLowerCase().includes(q);
  const desigMatch = row?.designation?.toLowerCase().includes(q);
  return Boolean(nameMatch || desigMatch);
}

/**
 * Determines if an employee has missed check-ins for X consecutive business days
 * ending on (and including) the target date.
 *
 * Senior Engineering Detail:
 * Weekend days (Saturdays and Sundays) are non-working days by default and do not break
 * or contribute to missed attendance streaks unless skipWeekends is set to false.
 *
 * @param {object} row Employee row containing checkinsByDate
 * @param {string} targetDateKey 'YYYY-MM-DD'
 * @param {number} requiredStreak Number of consecutive days (e.g. 2)
 * @param {boolean} skipWeekends Whether to skip Saturday/Sunday
 * @returns {boolean}
 */
export function checkConsecutiveAbsences(
  row,
  targetDateKey,
  requiredStreak = 2,
  skipWeekends = true
) {
  if (!targetDateKey || requiredStreak < 1) return false;

  const targetDate = new Date(`${targetDateKey}T00:00:00`);
  if (isNaN(targetDate.getTime())) return false;

  // Rule 1: If checked in on target date, employee is present (streak = 0)
  const targetCell = row?.checkinsByDate?.[targetDateKey];
  if (targetCell?.time) {
    return false;
  }

  let streak = 0;
  const curr = new Date(targetDate);

  // Traverse backwards day-by-day (safety limit 45 days)
  for (let i = 0; i < 45; i++) {
    const dayOfWeek = curr.getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (skipWeekends && isWeekend) {
      // Non-working day: skip backwards without changing streak
      curr.setDate(curr.getDate() - 1);
      continue;
    }

    const currKey = formatDateKey(curr);
    const cell = row?.checkinsByDate?.[currKey];
    const hasCheckin = Boolean(cell?.time);

    if (hasCheckin) {
      // Streak broken by an attendance record
      break;
    } else {
      streak += 1;
      if (streak >= requiredStreak) {
        return true;
      }
    }

    curr.setDate(curr.getDate() - 1);
  }

  return streak >= requiredStreak;
}

/**
 * Evaluates whether an employee row matches the active date filter.
 *
 * @param {object} row Employee row
 * @param {string} targetDateKey 'YYYY-MM-DD'
 * @param {object} filterConfig Filter settings
 * @returns {boolean}
 */
export function matchesDateFilter(row, targetDateKey, filterConfig) {
  if (!targetDateKey || !filterConfig || filterConfig.type === "all") {
    return true;
  }

  const cell = row?.checkinsByDate?.[targetDateKey];
  const { type, lateThreshold = "11:00", consecutiveDays = 2, skipWeekends = true } = filterConfig;

  switch (type) {
    case "late":
      // Late check-in: checked in after lateThreshold (default 11:00 AM)
      return Boolean(cell?.time && cell.time > lateThreshold);

    case "no_checkin":
      // No check-in: absent on target date
      return !cell || !cell.time;

    case "wfo":
      // Checked in at Office
      return Boolean(cell?.time && cell.mode === "WFO");

    case "wfh":
      // Checked in from Home
      return Boolean(cell?.time && cell.mode === "WFH");

    case "consecutive":
      // Consecutive absences ending on targetDateKey
      return checkConsecutiveAbsences(row, targetDateKey, consecutiveDays, skipWeekends);

    default:
      return true;
  }
}

/**
 * Sorts employee rows based on the given sort configuration.
 * When sorted by a date column:
 * - 'asc': Earliest time to latest time (e.g. 09:15 -> 09:45 -> 11:05 -> 13:20).
 * - 'desc': Latest time to earliest time (e.g. 13:20 -> 11:05 -> 09:45 -> 09:15).
 * - Absentees (no checkin time) are always sorted to the bottom of the list.
 * - Secondary tie-breaker is employee name alphabetical.
 * - When sortConfig is null or has no direction: Defaults to alphabetical by name.
 *
 * @param {Array} rows
 * @param {object} sortConfig { columnDateKey: string|null, direction: 'asc'|'desc'|null }
 * @returns {Array} New sorted array
 */
export function sortMatrixRows(rows, sortConfig) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const { columnDateKey, direction } = sortConfig || {};

  if (!columnDateKey || !direction) {
    return [...rows].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  return [...rows].sort((a, b) => {
    const cellA = a?.checkinsByDate?.[columnDateKey];
    const cellB = b?.checkinsByDate?.[columnDateKey];

    const timeA = cellA?.time || null;
    const timeB = cellB?.time || null;

    // Both absent: sort alphabetically by name
    if (!timeA && !timeB) {
      return (a.name || "").localeCompare(b.name || "");
    }

    // Only one absent: present employee comes first, absent employee goes to bottom
    if (!timeA) return 1;
    if (!timeB) return -1;

    // Both present: compare times 'HH:MM'
    const cmp = timeA.localeCompare(timeB);
    if (cmp !== 0) {
      return direction === "asc" ? cmp : -cmp;
    }

    // Tie breaker on identical check-in time: name alphabetical
    return (a.name || "").localeCompare(b.name || "");
  });
}
