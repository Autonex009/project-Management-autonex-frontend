/**
 * Date Calculation Utilities
 * Senior-level functions for accurate capacity planning
 */

/**
 * Calculate working days between two dates (excludes weekends)
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number} Number of working days (Mon-Fri)
 */
export const getWorkingDays = (startDate, endDate) => {
    let count = 0;
    let curDate = new Date(startDate);
    const end = new Date(endDate);

    // Validate dates
    if (isNaN(curDate.getTime()) || isNaN(end.getTime())) {
        return 0;
    }

    while (curDate <= end) {
        const dayOfWeek = curDate.getDay();
        // 0 = Sunday, 6 = Saturday. Only count 1-5 (Mon-Fri)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            count++;
        }
        curDate.setDate(curDate.getDate() + 1);
    }
    return count;
};

/**
 * Check if a date is a weekend
 * @param {Date} date - Date to check
 * @returns {boolean} True if Saturday or Sunday
 */
export const isWeekend = (date) => {
    const day = new Date(date).getDay();
    return day === 0 || day === 6;
};
