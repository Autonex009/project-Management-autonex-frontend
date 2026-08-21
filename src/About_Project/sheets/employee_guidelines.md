# Bugfix: Employee Guidelines Fetched and Filtered Client-Side

**File:** `EmployeeGuidelinesPage.jsx` (+ `app/api/guidelines.py`, `guidelineApi`)  
**Location:** Data loading for the employee guidelines view  
**Severity:** Medium / Redundancy & Performance  
**Excel Task No.:** 43
**Resolved Date:** 21-08-2026

---

## What was the bug?

The employee guidelines page loaded three full lists and filtered in the browser:

1. All guidelines (`guidelineApi.getAll()`)
2. All sub-projects (`subProjectApi.getAll()`)
3. The employee’s allocations (`allocationApi.getByEmployee`)

It then derived “my” project IDs and kept only matching guidelines.  
`GuidelinesPage` (admin/PM) had already moved to a server-paginated endpoint; the employee page still used the old pattern.

---

## What issue did it cause?

- Large payloads (every guideline + every project) for a small personal subset  
- Extra work on the client on every visit  
- Three round-trips instead of one scoped request  
- Same anti-pattern the admin guidelines page had already left behind  

---

## Solution implemented

Server-side scoping for the logged-in employee, plus a single frontend query.

### Where

| Place | Change |
|-------|--------|
| `app/api/guidelines.py` | New `GET /for-me` (registered before `/{guideline_id}`) |
| `guidelineApi` (services/api) | New `getForMe()` |
| `EmployeeGuidelinesPage.jsx` | One query; drop allocations / all projects / `getAll` + client filter |

**Backend (`/for-me`):** Resolves active allocations for `current_user.employee_id`, collects those sub-project (and related main-project) IDs, returns only matching guidelines.

**Frontend:**

```javascript
const { data: myGuidelines = [], isLoading } = useQuery({
  queryKey: ["guidelines-for-me"],
  queryFn: () => guidelineApi.getForMe(),
});
```

Import only `guidelineApi` (no `allocationApi` / `subProjectApi`).

---

## How it resolves the bug

| Before | After |
|--------|--------|
| 3 full list endpoints | 1 scoped endpoint |
| All guidelines + all projects over the wire | Only guidelines for this employee’s projects |
| Filter in the browser | Filter on the server |
| Diverged from admin guidelines pattern | Aligned with server-side approach |

UI (empty state, cards, download links) unchanged — only the data source changed.

---

## Notes

- Route must be registered **before** `/{guideline_id}` so `"for-me"` is not parsed as an id.  
- No change to admin/PM `GuidelinesPage` or `GET /page`.  
- Employees with no allocations get an empty list (same as before).  
- Auth uses the session user; the client does not pass `employee_id`.