/**
 * Date Calculation Utilities
 * Unified with leaveTypes for consistent holiday-aware capacity and duration planning
 */
import { getWorkingDayCount, toLocalISODate, isWeekend as isWeekendLeaveType, isNonWorkingDay } from "./leaveTypes";

/**
 * Calculate working days between two dates (excludes weekends and fixed company holidays)
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number} Number of working days
 */
export const getWorkingDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const startStr = startDate instanceof Date ? toLocalISODate(startDate) : String(startDate).split("T")[0];
  const endStr = endDate instanceof Date ? toLocalISODate(endDate) : String(endDate).split("T")[0];
  return getWorkingDayCount(startStr, endStr);
};

/**
 * Check if a date is a weekend
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if Saturday or Sunday
 */
export const isWeekend = (date) => {
  if (!date) return false;
  const dateStr = date instanceof Date ? toLocalISODate(date) : String(date).split("T")[0];
  return isWeekendLeaveType(dateStr);
};

export { isNonWorkingDay, getWorkingDayCount };
