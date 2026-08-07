/**
 * Builds the `openUpward` test for popovers and row menus inside a paged table.
 *
 * A menu or popover on one of the last rows would otherwise overflow the card,
 * so the last couple of rows on the visible page flip their card upward.
 *
 * Returned as a closure over the current page rather than taking it as an
 * argument, so call sites stay `opensUpward(rows, row)` — they read as a
 * question about the row, not about pagination.
 *
 *   const opensUpward = makeOpensUpward(currentPage, PAGE_SIZE);
 *   <ReasonPopover openUpward={opensUpward(filteredLeaves, leave)} />
 */
export const makeOpensUpward = (currentPage, pageSize) => (rows, row) => {
  const pageStart = (currentPage - 1) * pageSize;
  const visible = rows.slice(pageStart, pageStart + pageSize);
  const idx = visible.indexOf(row);
  return visible.length <= 2
    ? idx === visible.length - 1
    : idx >= visible.length - 2;
};
