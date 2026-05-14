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
