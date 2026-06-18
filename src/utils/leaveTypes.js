export const LEAVE_TYPE_OPTIONS = [
  { value: 'paid', label: 'Paid Leave' },
  { value: 'casual_sick', label: 'Casual/Sick Leave' },
  { value: 'floater', label: 'Floater Leave' },
];

const LEGACY_LEAVE_TYPE_ALIASES = {
  vacation: 'paid',
  casual: 'casual_sick',
  sick: 'casual_sick',
  personal: 'floater',
  emergency: 'floater',
};

const LEAVE_TYPE_LABELS = Object.fromEntries(
  LEAVE_TYPE_OPTIONS.map((option) => [option.value, option.label])
);

const LEAVE_TYPE_BADGES = {
  paid: 'bg-blue-50 text-blue-700',
  casual_sick: 'bg-emerald-50 text-emerald-700',
  floater: 'bg-amber-50 text-amber-700',
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
  return (employeeType || '').trim().toLowerCase() === 'intern';
}

export const FLOATER_DATES_2026 = [
  { date: '2026-01-14', label: 'Pongal / Makar Sankranti' },
  { date: '2026-01-23', label: 'Vasant Panchami' },
  { date: '2026-02-15', label: 'Maha Shivratri' },
  { date: '2026-02-19', label: 'Shivaji Jayanti' },
  { date: '2026-03-19', label: 'Ugadi / Gudi Padwa' },
  { date: '2026-03-21', label: 'Ramzan Eid' },
  { date: '2026-03-31', label: 'Mahavir Jayanti' },
  { date: '2026-04-03', label: 'Good Friday' },
  { date: '2026-04-14', label: 'Ambedkar Jayanti' },
  { date: '2026-05-27', label: 'Bakrid' },
  { date: '2026-06-26', label: 'Muharram' },
  { date: '2026-08-15', label: 'Independence Day' },
  { date: '2026-08-26', label: 'Onam' },
  { date: '2026-08-28', label: 'Raksha Bandhan' },
  { date: '2026-09-04', label: 'Janmashtami' },
  { date: '2026-10-20', label: 'Dussehra' },
  { date: '2026-11-08', label: 'Diwali' },
  { date: '2026-11-11', label: 'Bhai Duj' },
  { date: '2026-11-24', label: 'Guru Nanak Jayanti' },
  { date: '2026-12-23', label: "Hazarat Ali's Birthday" },
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
  { date: '2026-01-01', label: "New Year's Day" },
  { date: '2026-01-26', label: 'Republic Day' },
  { date: '2026-03-04', label: 'Holi' },
  { date: '2026-05-01', label: 'Maharashtra Day' },
  { date: '2026-09-14', label: 'Ganesh Chaturthi' },
  { date: '2026-10-02', label: 'Mahatma Gandhi Jayanti' },
  { date: '2026-11-09', label: 'Govardhan Puja' },
  { date: '2026-12-25', label: 'Christmas' },
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
  const day = new Date(dateStr + 'T00:00:00').getDay(); // 0=Sun, 6=Sat
  return day === 0 || day === 6;
}

export function isNonWorkingDay(dateStr) {
  return isWeekend(dateStr) || isFixedHoliday(dateStr);
}

export function getNonWorkingDayLabel(dateStr) {
  if (isWeekend(dateStr)) {
    const day = new Date(dateStr + 'T00:00:00').getDay();
    return day === 6 ? 'Saturday' : 'Sunday';
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
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the first non-working day found in [startDateStr, endDateStr],
 * or null if all days are working days.
 */
export function findNonWorkingDayInRange(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return null;
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');
  const cur = new Date(start);
  while (cur <= end) {
    const ds = toLocalISODate(cur);
    if (isNonWorkingDay(ds)) return ds;
    cur.setDate(cur.getDate() + 1);
  }
  return null;
}

export function getWorkingDayCount(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');
  if (end < start) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (!isNonWorkingDay(toLocalISODate(cur))) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function countNonWorkingDaysInRange(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');
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
  'If your leave balance is exhausted, Razorpay may automatically convert this request to unpaid leave, which can affect payroll.';

export function normalizeLeaveType(value) {
  const normalized = (value || '').trim().toLowerCase().replace(/[- ]/g, '_');
  return LEGACY_LEAVE_TYPE_ALIASES[normalized] || normalized;
}

export function getLeaveTypeLabel(value) {
  const normalized = normalizeLeaveType(value);
  return LEAVE_TYPE_LABELS[normalized] || normalized.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getLeaveTypeBadgeClass(value) {
  return LEAVE_TYPE_BADGES[normalizeLeaveType(value)] || 'bg-slate-100 text-slate-600';
}
