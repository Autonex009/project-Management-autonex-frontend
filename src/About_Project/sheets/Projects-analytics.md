# Bugfix: Wrong Allocation Lookup on Project Analytics Roster

**File:** `src/pages/ProjectAnalyticsPage.jsx`  
**Location:** `teamRosterData` useMemo (~lines 250–275)  
**Severity:** High  
**Excel Task No.:** 27
**Resolved Date:** 21-08-2026

---

## What was the bug?

The roster looked up each annotator’s allocation like this:

```javascript
const alloc = projectAllocations.find(
  (al) => al.employee_id === emp.id || String(al.sub_project_id) === String(mainProjectId)
);
```

`projectAllocations` was already filtered to the current project:

```javascript
const projectAllocations = allocations.filter(
  (a) => String(a.sub_project_id) === String(mainProjectId)
);
```

So the second OR-clause (`sub_project_id === mainProjectId`) was **always true** for every item in that array.  
`.find()` therefore returned the **first** allocation in the list for most roster rows.

---

## What issue did it cause?

- Most team members showed the **wrong role** and **wrong planned hours**
- Role/hours belonged to whichever allocation happened to be first in the list
- Utilization and planned-vs-actual numbers on the Team Roster tab were unreliable
- Only rows where `employee_id` matched by chance looked correct

---

## Solution implemented

Match allocations **only by employee**.  
Also use the real API field names (`total_daily_hours`, `role_tags`) instead of non-existent `role` / `hours_per_day`.

### Where

`src/pages/ProjectAnalyticsPage.jsx` → inside the `teamRosterData` `useMemo`.

### What changed

**Before:**
```javascript
const alloc = projectAllocations.find(
  (al) => al.employee_id === emp.id || String(al.sub_project_id) === String(mainProjectId)
);

return {
  // ...
  role: alloc?.role || "Annotator",
  planned_hours: alloc ? (alloc.hours_per_day || 0) * 20 : 80,
  // ...
};
```

**After:**
```javascript
// Match only by employee — projectAllocations is already scoped to this project,
// so an OR on sub_project_id was always true and returned the first row for everyone.
const alloc = projectAllocations.find(
  (al) => emp.id != null && al.employee_id === emp.id
);

const dailyHours = alloc?.total_daily_hours ?? alloc?.hours_per_day ?? 0;
const role =
  (Array.isArray(alloc?.role_tags) && alloc.role_tags[0]) ||
  alloc?.role ||
  "Annotator";

return {
  // ...
  role,
  planned_hours: alloc ? dailyHours * 20 : 80,
  // ...
};
```

---

## How it resolves the bug

| Scenario | Before | After |
|----------|--------|-------|
| Employee has an allocation on this project | Often got the **first** row’s role/hours | Gets **their own** allocation |
| Employee has no allocation | Still got first row’s data | Falls back to defaults correctly |
| Field names | Used missing `role` / `hours_per_day` | Uses `role_tags` / `total_daily_hours` |

Each roster row now maps to the correct allocation for that person. Role and planned hours are accurate.

---

## Notes

- No backend or API changes required.
- Only the `teamRosterData` memo is affected.
- Guard `emp.id != null` avoids matching `undefined === undefined` when the employee is not in the roster map.