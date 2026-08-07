/**
 * Leave / WFH status as plain coloured text, keyed by status.
 *
 * Plain text rather than a pill: the pill border read as heavy against the rest
 * of the row, and colour alone separates the three states well enough here.
 *
 * Shared so the admin Leaves page and the PM Team Leaves page can't drift into
 * showing the same statuses two different ways.
 */
export const LEAVE_STATUS_TEXT = {
  pending: (
    <span className="text-[13px] font-medium text-amber-600">Pending</span>
  ),
  approved: (
    <span className="text-[13px] font-medium text-emerald-600">Approved</span>
  ),
  rejected: (
    <span className="text-[13px] font-medium text-red-600">Rejected</span>
  ),
};

export default LEAVE_STATUS_TEXT;
