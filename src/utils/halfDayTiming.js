/**
 * Client-side mirror of the backend's half-day cut-offs (api\leaves.py's
 * validate_half_day_timing), so a doomed request is caught before it is sent.
 *
 * Evaluated in IST regardless of the browser's timezone: the cut-offs are the
 * company's working hours, not the viewer's, and reading the local clock would
 * let someone abroad slip a second-half leave through after 2pm IST.
 */
const getISTDateTime = () => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const partMap = Object.fromEntries(
    formatter.formatToParts(new Date()).map((p) => [p.type, p.value]),
  );

  return {
    dateStr: `${partMap.year}-${partMap.month}-${partMap.day}`,
    hour: parseInt(partMap.hour),
    minute: parseInt(partMap.minute),
  };
};

/**
 * Returns an error message when a half-day leave misses its cut-off, else null.
 *
 * First half must be applied at least a day ahead; second half must be in
 * before 2:00 PM IST on the day itself.
 */
export function checkHalfDayTiming(startDate, leaveType, { skip = false } = {}) {
  if (skip) return null;

  const ist = getISTDateTime();
  const todayStr = ist.dateStr;
  const startDateStr = String(startDate).slice(0, 10); // ensure "YYYY-MM-DD"
  const slot = leaveType; // "first_half" | "second_half"

  if (slot === "first_half") {
    if (todayStr >= startDateStr) {
      return "First-half leaves must be applied at least one day in advance.";
    }
  } else if (slot === "second_half") {
    if (todayStr > startDateStr) {
      return "Cannot apply for a second-half leave after the request date has passed.";
    }
    if (todayStr === startDateStr && ist.hour >= 14) {
      return "Second-half leaves must be applied before 2:00 PM on the same day.";
    }
  }
  return null;
}
