# Production-Grade Frontend Architecture & State Optimization Guide

> **Target Codebase:** Autonex Frontend (`@tanstack/react-query` v5, `zustand` v5, `axios`, `vite`, `express` SSR) & FastAPI Backend  
> **Document Purpose:** Complete architectural audit, root cause diagnosis, confirmed bug registry, and step-by-step implementation plan ready for execution.  
> **Audit Status:** Senior Staff Engineer Audit Completed (13-Nov-2026). Ready for execution tomorrow.

---

## 1. Executive Summary & Audit Verdict

### Current Verdict: **NEEDS TARGETED FIXES BEFORE PRODUCTION**

While the immediate symptom of the pending request KPI counter bug (`52 → 51`) was addressed via React Query focus re-sync and 15-second polling, **an exhaustive source-level audit reveals that previous claims of "100% COMPLETED" were premature**.

Key findings from the source code audit:
1. **The Query Key Factory (`src/services/queryKeys.js`) is 0% adopted:** The file exists as orphaned code. Across all 168 `useQuery` calls in the application, zero components import or use it. Brittle, inline string arrays remain everywhere.
2. **Active Stale Data Bugs in Core Pages:** In `EmployeesPage.jsx`, mutations invalidate `["employees"]`, but the paginated table listens to `["employees-paginated"]`. Because TanStack Query does hierarchical prefix matching, **the employee table is never invalidated after employee creation, updating, archiving, or conversion**, displaying stale data for up to 5 minutes. The same bug exists in `ProjectsPage.jsx` (`["sub-projects"]` vs `["sub-projects-paginated"]`).
3. **Flawed Backend Smart ETag Fingerprint:** In `backend/app/api/analytics.py`, the ETag fingerprint only hashes `Leave`, `WFHRequest`, and `Employee` tables. It **omits `Allocation` and `DailySheet` updates**, even though the endpoint calculates `idle_count`, active headcount, and project vendor breakdowns. When an allocation changes, the backend returns `304 Not Modified`, locking stale KPI metrics in client RAM indefinitely.
4. **TanStack Query v5 Syntax Regressions:** Multiple pages (`AllocationsPage.jsx`, `LeavesPage.jsx`, `GuidelinesPage.jsx`) still use `keepPreviousData: true`—an option completely removed in TanStack Query v5. This causes table components to unmount and flash loading spinners on every page transition. Furthermore, over 30 mutations use deprecated TanStack Query v4 array invalidation syntax (`invalidateQueries(["key"])`).
5. **AbortSignal is 98% Absent:** Only 3 out of 168 queries pass `signal`, and only 3 methods in `src/services/api.js` accept it.
6. **Redundant SSR Overhead:** The application is an internal enterprise dashboard. `ProtectedRoute.jsx` checks `!hasMounted` and unconditionally renders an empty spinner on the server, meaning SSR wastes Node.js CPU on Railway with zero user-perceived or SEO benefit.

---

## 2. Audit Verification Matrix: Claimed vs. Actual State

| Optimization Item | Previous Claim | Verified Actual State | Exact Code Finding & Status |
| :--- | :--- | :--- | :--- |
| **Phase 1.1: App.jsx React Query Config** | `[✅] COMPLETED` | **APPLIED** | `refetchOnWindowFocus: true`, `refetchOnReconnect: true`, `retry: 1`, `staleTime: 30000` in `src/App.jsx:128-132`. |
| **Phase 1.2: Dashboard.jsx Polling** | `[✅] COMPLETED` | **APPLIED** | `refetchInterval: 15000` & `refetchIntervalInBackground: false` in `src/pages/Dashboard.jsx:217-222`. |
| **Phase 1.3: DailyCheckInModal Menu** | `[✅] COMPLETED` | **APPLIED** | `staleTime: 0`, date-partitioned key, and selection re-sync in `src/components/checkin/DailyCheckInModal.jsx:130-155`. |
| **Phase 1.4: Cross-Query Invalidation** | `[✅] COMPLETED` | **PARTIALLY APPLIED (WITH BUGS)** | All files invalidate `["dashboard-kpis"]`. But `EmployeesPage.jsx:1765` misses `["employees-paginated"]`, and `LeavesPage.jsx:420` misses `["leave-calendar"]`. |
| **Phase 1.5: Logout & 401 Cache Purge** | `[✅] COMPLETED` | **APPLIED** | `queryClient.clear()` wired on portal jump (`App.jsx:151`), `auth:unauthorized` (`App.jsx:159`), and in Layouts (`AdminLayout.jsx:102`, `EmployeeLayout.jsx:74`, `HRLayout.jsx:64`). |
| **Phase 2.1: Query Key Factory** | `[✅] COMPLETED` | **0% ADOPTED (ORPHANED)** | `src/services/queryKeys.js` exists, but is **imported in 0 files**. All 168 queries still use raw inline strings. |
| **Phase 2.2: Wire AbortSignal** | `[✅] COMPLETED` | **1.8% APPLIED (3 of 168 queries)** | Only 3 endpoints in `src/services/api.js:181, 865, 903` accept signal. 165 queries completely ignore cancellation. |
| **Phase 2.3: Smart ETag Preflight** | `[✅] COMPLETED` | **APPLIED WITH DATA BUG** | `backend/app/api/analytics.py:89` has preflight check, but omits `Allocation` & `DailySheet`, causing false 304s when allocations change. |
| **Phase 3.1: Optimistic Updates** | `[✅] COMPLETED` | **PARTIALLY APPLIED (2 of 25+ mutations)** | Only `approveMutation` and `rejectMutation` in `LeavesPage.jsx:403, 443` have `onMutate`. WFH, PM, and Signup mutations have none. |
| **Phase 3.2: Omit Hover Prefetch** | `[🛡️] GUARDRAIL` | **CONFIRMED OMITTED** | No hover prefetching exists on sidebar navigation links. |
| **Phase 3.3: Online/Focus Manager** | `[✅] COMPLETED` | **APPLIED** | Connected in `src/entry-client.jsx:10-16`. |
| **Section 3 Gap 4: URL State Sharing** | `Identified Gap` | **NOT IMPLEMENTED** | Filters and pagination remain trapped in `sessionStorage` via `usePageStateStore` and `useProjectsStore`. |

---

## 3. Confirmed Production Bugs Registry (Action Items for Tomorrow)

### [FE-001] Paginated Employee Table Never Invalidated on Mutations
- **Severity:** P1 (Production Data Integrity / Stale UI)
- **Location:** `src/pages/EmployeesPage.jsx:1601-1638` and `lines 1765, 1792, 1822, 1836, 1851`
- **Root Cause:** The table query key is `["employees-paginated", currentPage, PAGE_SIZE, ...]`. The mutations call `queryClient.invalidateQueries({ queryKey: ["employees"] })`. In TanStack Query, `["employees"]` does **not** match `["employees-paginated"]`.
- **User Impact:** After adding, updating, archiving, restoring, or converting an employee, the table displays stale data for up to 5 minutes (`staleTime: 300_000`) unless the user performs a hard browser refresh.
- **Fix:** Update all employee mutation handlers to invalidate `{ queryKey: ["employees-paginated"] }`.

---

### [FE-002] Backend Smart ETag Omits Allocations and Projects (False 304 Responses)
- **Severity:** P1 (Production Reliability / Stale KPI Metrics)
- **Location:** `backend/app/api/analytics.py:89-103`
- **Root Cause:** `etag_raw` only hashes `Leave.updated_at`, `WFHRequest.updated_at`, and active `Employee` count. It completely ignores `Allocation` updates and `DailySheet` project records.
- **User Impact:** `get_dashboard_kpis` computes `idle_count` and active workforce using `Allocation.is_active` (`lines 120, 135`), and active projects by vendor using `DailySheet` (`lines 227-252`). When an allocation changes, the backend returns `304 Not Modified`, locking the stale idle employee count on the Dashboard indefinitely.
- **Fix:** Include `Allocation` and `DailySheet` max timestamps and counts in `etag_raw`.

---

### [FE-003] Sub-Projects Table Not Invalidated on Mutation
- **Severity:** P1 (Production Data Integrity / Stale UI)
- **Location:** `src/pages/ProjectsPage.jsx:193-195` and `lines 457, 469, 862`
- **Root Cause:** The paginated sub-projects table uses `["sub-projects-paginated", ...]`. Update and delete handlers call `queryClient.invalidateQueries(["sub-projects"])`. In TanStack Query v5, `"sub-projects-paginated"` does not match `"sub-projects"`.
- **User Impact:** Creating, editing, or deleting a project fails to update the table without a manual page reload.
- **Fix:** Update mutation handlers to invalidate `{ queryKey: ["sub-projects-paginated"] }`.

---

### [FE-004] Leave Approval/Rejection Fails to Invalidate Calendar
- **Severity:** P2 (State Desynchronization)
- **Location:** `src/pages/LeavesPage.jsx:401-477`
- **Root Cause:** `approveMutation`, `rejectMutation`, `undoApproveMutation`, and `undoRejectMutation` invalidate `["dashboard-kpis"]` and update `["leaves-page"]`, but omit `queryClient.invalidateQueries({ queryKey: ["leave-calendar"] })`.
- **User Impact:** Approving or rejecting a leave from the list view leaves the Calendar view displaying the old state until a page reload.
- **Fix:** Add `queryClient.invalidateQueries({ queryKey: ["leave-calendar"] })` to `onSettled` in all leave approval/rejection mutations.

---

### [FE-005] Broken `keepPreviousData: true` Regressions in TanStack Query v5
- **Severity:** P2 (User Experience / Layout Flickering)
- **Location:** 
  - `src/pages/AllocationsPage.jsx:139`
  - `src/pages/LeavesPage.jsx:301, 344`
  - `src/pages/guidelines/GuidelinesPage.jsx:129`
  - `src/pages/pm/PMSubProjectsPage.jsx:40`
- **Root Cause:** `keepPreviousData: true` was removed in TanStack Query v5. In v5, it must be passed as `placeholderData: keepPreviousData`. Passing `true` is ignored.
- **User Impact:** Switching pagination pages causes the table to unmount completely and flash loading skeletons on every click.
- **Fix:** Replace `keepPreviousData: true` with `placeholderData: keepPreviousData` (importing `keepPreviousData` from `@tanstack/react-query`).

---

### [FE-006] Layout Chunk Bloat via Static Import in `EmployeeLayout.jsx`
- **Severity:** P2 (Bundle Size / Unnecessary Network Execution)
- **Location:** `src/layouts/EmployeeLayout.jsx:9, 165`
- **Root Cause:** `import CandidateConfirmationPage from "../pages/hr/CandidateConfirmationPage"` statically imports an HR confirmation page into the root employee layout shell.
- **User Impact:** Defeats Vite's route-level code splitting. `CandidateConfirmationPage` is downloaded on every employee and PM page load, where it continuously queries `/onboarding/pipeline/my-status`.
- **Fix:** Move the modal component into `src/components/` and load it conditionally, removing the static page import.

---

### [FE-007] Memory Leak in CSV Report Export
- **Severity:** P3 (Client Memory Retention)
- **Location:** `src/pages/admin/AdminReportsPage.jsx:50-57`
- **Root Cause:** `const url = window.URL.createObjectURL(blob)` is created and clicked, but never revoked via `window.URL.revokeObjectURL(url)`.
- **User Impact:** Pinned blob memory in the browser for the lifetime of the session.
- **Fix:** Revoke the object URL after triggering download: `setTimeout(() => window.URL.revokeObjectURL(url), 1000)`.

---

### [FE-008] Retrying 4xx Client Errors in Global QueryClient
- **Severity:** P3 (Unnecessary Network Calls)
- **Location:** `src/App.jsx:130`
- **Root Cause:** Global `retry: 1` retries all failing queries once, including 401, 403, and 404 responses.
- **User Impact:** Wastes requests and delays redirect on unrecoverable authentication or authorization errors.
- **Fix:** Configure retry to skip 4xx client errors:
```javascript
retry: (failureCount, error) => {
  if (error?.response?.status >= 400 && error?.response?.status < 500) return false;
  return failureCount < 1;
}
```

---

## 4. Architectural Analysis & Technical Realities

### 4.1. The Centralized Query Key Factory
The factory in `src/services/queryKeys.js` must be systematically adopted across all pages:
```javascript
// Example adoption pattern
import { queryKeys } from "../services/queryKeys";

// In useQuery:
useQuery({
  queryKey: queryKeys.employees.paginated(currentPage, PAGE_SIZE, filters),
  queryFn: ({ signal }) => employeeApi.getPaginated({ page: currentPage, ...filters }, signal),
});

// In mutations:
queryClient.invalidateQueries({ queryKey: queryKeys.employees.all }); // Invalidates list, paginated, and details!
```

### 4.2. Polling Coordination & Backend Pressure
The backend runs on **one single FastAPI worker on Railway**. The current frontend fires uncoordinated polling intervals from multiple widgets simultaneously:
- `Dashboard.jsx:220`: 15s poll (`dashboard-kpis`)
- `CheckinPulseWidget.jsx:47`: 45s poll (`pulse-overview` - No ETag, full SQL)
- `AttentionTab.jsx:16`: 45s poll (`pulse-attention` - No ETag, full SQL)
- `TimingTab.jsx:12`: 45s poll (`pulse-timing` - No ETag, full SQL)
- `PMLeavesPage.jsx:158`: 60s poll (`leaves` - No ETag, full table dump)
- `SignupRequestsPage.jsx:104, 110`: 30s poll (`signup-requests` - No ETag, full SQL)

**Rule:** Polling intervals must be staggered, pause in the background (`refetchIntervalInBackground: false`), and only run when their respective tabs or widgets are actively visible.

### 4.3. The AbortSignal Reality in FastAPI
- Passing `signal` from `useQuery` through Axios ensures the browser terminates the TCP socket when a user switches tabs or changes filters.
- **Important Backend Note:** In FastAPI, synchronous `def` endpoints (like `get_dashboard_kpis`) run in a Starlette worker thread pool (`anyio.to_thread.run_sync`). When a client disconnects, the thread continues executing `db.query(...)` until the SQL query completes. Client-side cancellation saves network bandwidth and prevents client state corruption, but does **not** instantly terminate running backend SQL execution.

### 4.4. Bundle Size & Asset Optimization
- **3.7 MB of Badge PNGs:** `src/pages/employee/EmployeeDashboard.jsx:76-86` statically imports 11 high-resolution raster PNG images (`yearly.png`, `50hrs.png`, `6months.png`, etc.), representing **60.4% of the entire client bundle assets**. Converting these to WebP will drop payload size from 3.7 MB to ~200 kB.
- **SSR Evaluation:** `server.js` runs Express 5 with `renderToPipeableStream`. But because `ProtectedRoute.jsx` checks `!hasMounted`, every protected page streams an empty loading spinner on SSR. Transitioning to a pure SPA (served via Vite static build / Nginx) eliminates Node SSR memory and CPU overhead on Railway.

---

## 5. Concrete Code Fixes (To Apply Tomorrow)

### Fix 1: `src/pages/EmployeesPage.jsx`
Update mutations to invalidate `["employees-paginated"]`:
```javascript
// In createMutation, updateMutation, archiveMutation, restoreMutation, convertMutation:
queryClient.invalidateQueries({ queryKey: ["employees-paginated"] });
queryClient.invalidateQueries({ queryKey: ["employees"] });
queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
```

### Fix 2: `backend/app/api/analytics.py`
Patch the Smart ETag preflight to include `Allocation` and `DailySheet` changes:
```python
# In backend/app/api/analytics.py around line 91:
leave_meta = db.query(func.max(Leave.updated_at), func.count(Leave.id)).first()
wfh_meta = db.query(func.max(WFHRequest.updated_at), func.count(WFHRequest.id)).first()
emp_meta = db.query(func.count(Employee.id)).filter(Employee.status != "archived").scalar() or 0
alloc_meta = db.query(func.max(Allocation.updated_at), func.count(Allocation.id)).first()
project_meta = db.query(func.max(DailySheet.updated_at), func.count(DailySheet.id)).first()
role_scope = f"{current_user.id}:{','.join(map(str, allowed_ids)) if allowed_ids else 'all'}"

etag_raw = f"{role_scope}:{today}:{leave_meta}:{wfh_meta}:{emp_meta}:{alloc_meta}:{project_meta}"
current_etag = f'"{hashlib.md5(etag_raw.encode()).hexdigest()}"'
```

### Fix 3: `src/pages/ProjectsPage.jsx`
Fix invalidation for paginated sub-projects:
```javascript
// Replace deprecated queryClient.invalidateQueries(["sub-projects"]) with:
queryClient.invalidateQueries({ queryKey: ["sub-projects-paginated"] });
queryClient.invalidateQueries({ queryKey: ["sub-projects"] });
queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
```

### Fix 4: `src/pages/LeavesPage.jsx`
Fix Calendar invalidation and TanStack Query v5 `placeholderData`:
```javascript
// 1. Add keepPreviousData import:
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";

// 2. Replace keepPreviousData: true on lines 301 and 344:
placeholderData: keepPreviousData,

// 3. Add calendar invalidation to leave approval/rejection mutations (lines 437, 475):
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
  queryClient.invalidateQueries({ queryKey: ["leave-calendar"] });
},
```

### Fix 5: `src/pages/AllocationsPage.jsx` & `src/pages/guidelines/GuidelinesPage.jsx`
Replace broken `keepPreviousData: true` with TanStack Query v5 `placeholderData`:
```javascript
import { keepPreviousData } from "@tanstack/react-query";

// Replace keepPreviousData: true with:
placeholderData: keepPreviousData,
```

### Fix 6: `src/App.jsx`
Filter out 4xx errors from global query retries:
```javascript
// In src/App.jsx:126-133:
defaultOptions: {
  queries: {
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      // Do not retry 4xx client errors (401, 403, 404, etc.)
      if (error?.response?.status >= 400 && error?.response?.status < 500) return false;
      return failureCount < 1;
    },
    staleTime: 1000 * 30,
  },
},
```

### Fix 7: `src/layouts/EmployeeLayout.jsx`
Remove static import of `CandidateConfirmationPage` to restore route chunking:
```javascript
// Remove static import:
// import CandidateConfirmationPage from "../pages/hr/CandidateConfirmationPage";

// Lazy load or mount only when user is in onboarding pipeline
```

### Fix 8: `src/pages/admin/AdminReportsPage.jsx`
Fix CSV export memory leak:
```javascript
// In handleExportCSV:
const url = window.URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = `autonex_candidates_report.csv`;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
setTimeout(() => window.URL.revokeObjectURL(url), 1000); // ✅ Clean up blob memory
```

---

## 6. Step-by-Step Execution Plan for Tomorrow

```
STEP 1: Critical Bug Fixes (Cache & Data Integrity)
├── [ ] 1. EmployeesPage.jsx: Invalidate ["employees-paginated"] on mutations (Fixes FE-001)
├── [ ] 2. backend/app/api/analytics.py: Patch Smart ETag to include Allocation & DailySheet (Fixes FE-002)
├── [ ] 3. ProjectsPage.jsx: Invalidate ["sub-projects-paginated"] on mutations (Fixes FE-003)
├── [ ] 4. LeavesPage.jsx: Invalidate ["leave-calendar"] on approvals/rejections (Fixes FE-004)
└── [ ] 5. AllocationsPage, LeavesPage, GuidelinesPage: Replace keepPreviousData: true with placeholderData: keepPreviousData (Fixes FE-005)

STEP 2: Bundle & Memory Fixes
├── [ ] 1. EmployeeLayout.jsx: Decouple CandidateConfirmationPage static import (Fixes FE-006)
├── [ ] 2. AdminReportsPage.jsx: Add URL.revokeObjectURL cleanup (Fixes FE-007)
└── [ ] 3. App.jsx: Add 4xx bypass to global QueryClient retry (Fixes FE-008)

STEP 3: Query Key Factory Adoption
├── [ ] 1. Import queryKeys in Dashboard.jsx, EmployeesPage.jsx, LeavesPage.jsx, ProjectsPage.jsx
└── [ ] 2. Normalize 30+ deprecated queryClient.invalidateQueries(["key"]) calls to object syntax

STEP 4: Asset Compression & Network Tuning
├── [ ] 1. Convert 11 badge PNGs (3.7 MB) in src/components/badges/ to WebP (~200 kB)
└── [ ] 2. Add refetchIntervalInBackground: false to all polling widgets in Dashboard
```

---

## 7. Master Comparison Matrix

| Capability | Original Baseline | Current State (Audited) | Target State (After Tomorrow's Fixes) |
| :--- | :--- | :--- | :--- |
| **KPI Counter (`52 → 51`)** | Stale until F5 | Refetches on focus / 15s poll | Fast 15s Smart ETag poll + Optimistic update |
| **Employee Table Updates** | Stale for 5 minutes | **Stale for 5 minutes (Bug FE-001)** | **Instant Invalidation on Mutation** |
| **Project Table Updates** | Stale for 5 minutes | **Stale for 5 minutes (Bug FE-003)** | **Instant Invalidation on Mutation** |
| **Backend ETag Precision** | Heavy SQL every poll | **False 304 on Allocations (Bug FE-002)**| **100% Accurate Preflight Hash (< 2ms)** |
| **Pagination Transitions** | Smooth (TanStack v4) | **Layout Flashing (Bug FE-005)** | **Zero-Flicker (`placeholderData`)** |
| **Query Key Safety** | Raw strings (260+) | Raw strings (Factory orphaned) | **Centralized Factory (`queryKeys.js`)** |
| **Client Bundle Assets** | ~6.2 MB | ~6.2 MB (3.7 MB PNG badges) | **~2.7 MB (93% badge payload reduction)** |
| **Layout Chunk Splitting** | Code-split | **Leaked via static import (Bug FE-006)**| **Clean Route-Level Code Splitting** |
| **CSV Export Memory** | Leaked blob URL | **Leaked blob URL (Bug FE-007)** | **Auto-Revoked Object URLs** |
| **4xx Error Retries** | Retried blindly | Retried blindly (Bug FE-008) | **4xx Bypassed Immediately** |
