# Fix: Unmemoized Avatar Lookup Map

**File:** `AdminReportsPage.jsx`
**Functions:** `AdminReportsPage` (avatar join for table rows)
**Severity:** Low — Performance
**Excel Task No.:** 106
**Resolved Date:** 24-08-2026

---

## Bug

A lookup `Map` was constructed from the full employee list on every render:

```javascript
const avatarByEmployeeId = new Map(
  employees.map((e) => [e.id, e.avatar_url])
);
```

This calculation ran even when the `employees` data had not changed.

For example, the Map was recreated during frequent UI updates such as:

* Search input changes
* Row expand/collapse
* Pagination changes
* Other component re-renders

---

## Impact

* **Wasted work:** The same employee data was mapped repeatedly even when unchanged.
* **Extra interaction cost:** Search, expand/collapse, and pagination could trigger unnecessary iteration over the employee list.
* **Unstable reference:** A new `Map` instance was created on every render despite the underlying employee data remaining unchanged.

---

## Solution

### 1. Import `useMemo`

Update the React import to include `useMemo`:

```javascript
import React, { useState, useEffect, useMemo } from "react";
```

### 2. Memoize the Lookup Map

Replace the inline Map construction with:

```javascript
const avatarByEmployeeId = useMemo(
  () => new Map(employees.map((e) => [e.id, e.avatar_url])),
  [employees],
);
```

The lookup Map is now rebuilt **only when the `employees` array changes**, such as when new React Query data is received.

When other component state changes, the existing Map reference is reused.

---

## Resolution

| Before                                                    | After                                               |
| --------------------------------------------------------- | --------------------------------------------------- |
| New Map created on every render                           | Map rebuilt only when `employees` changes           |
| Extra work during search, expand/collapse, and pagination | Lookup Map remains stable across these interactions |
| Employee mapping recalculated during unrelated re-renders | Mapping calculation is memoized                     |
| Avatar join calculation contributes to every render       | Join cost is isolated behind `useMemo`              |

**Avatar join behaviour is unchanged. Only the unnecessary Map rebuild cost has been removed.**

---

## Behaviour Preserved

* The same `employeeId → avatar_url` lookup is used by `UserAvatar`.
* Fallback to `row.avatarUrl` / `row.avatar_url` remains unchanged when no employee match exists.
* The shared `["employees"]` React Query cache continues to be used with the rest of the admin portal.
* Search behaviour remains unchanged.
* Row expand/collapse behaviour remains unchanged.
* Pagination behaviour remains unchanged.
* CSV export behaviour remains unchanged.
* Reports data remains unchanged.
* Table columns remain unchanged.
* Expanded module breakdown remains unchanged.
* No API or payload behaviour is affected.

---

## Summary

The avatar lookup Map was previously rebuilt on every render, even when the employee data had not changed.

Using `useMemo` with `[employees]` as the dependency provides a **stable lookup Map** that is recalculated only when employee data changes.

No UI behaviour, avatar resolution, table functionality, or report data was changed. The fix only eliminates redundant work during frequent component re-renders.
