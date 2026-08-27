# Fix: Dead Code in AnalyticsDashboard

**File:** `AnalyticsDashboard.jsx`  
**Items:** Unused chart imports + 3 useMemo blocks  
**Severity:** Low / Dead code  
**Excel Task No.:** 69  
**Resolved Date:** 25-08-2026

---

## Bug

Three chart components were imported and three related `useMemo`s were computed, but none were referenced in the JSX.

- Imports: `StageDistributionChart`, `PlannedVsActualChart`, `ProjectTeamRosterTable`
- Memos: `activeStageData`, `activeVelocityData`, `plannedVsActualData`

---

## Impact

- Extra bundle weight from unused chart modules  
- Unnecessary computation on every render / dependency change  
- Noise for maintainers and static analysis  

---

## Solution

Removed the three unused imports and the three unused `useMemo` blocks.  
(Optionally also removed the now-unused `allocations` query and `allocationApi` import.)

---

## Resolution

| Before                         | After                    |
|--------------------------------|--------------------------|
| 3 unused chart imports         | Removed                  |
| 3 unused memos                 | Removed                  |
| Dead computation every render  | None                     |
| UI / data flow                 | Unchanged                |

No behaviour change — only dead code removed.

==================================================================================================================================

# Fix: Hardcoded Demo Fallbacks in WorkforceSplitAreaChart

**File:** `WorkforceSplitAreaChart.jsx`  
**Lines:** 37–38  
**Severity:** Low / Data smell  
**Excel Task No.:** 70  
**Resolved Date:** 25-08-2026

---

## Bug

When `totalAnnotationHours` or `totalReviewHours` were missing, the chart fell back to hardcoded demo values:

- `9480` (annotation)  
- `3767` (review)

These numbers were leftover sample data and had no relation to the real dataset.

---

## Impact

- Chart could show inflated / incorrect split ratios  
- Misleading totals in empty or partial-data states  
- Demo numbers leaked into production UI  

---

## Solution

Replaced the hardcoded fallbacks with `0`:

```js
const annTotal = totalAnnotationHours ?? 0;
const revTotal = totalReviewHours ?? 0;

==================================================================================================================================

# Fix: Unused Lucide Icons in PMDashboard

**File:** `PMDashboard.jsx`  
**Lines:** 14–18  
**Severity:** Low / Dead code  
**Excel Task No.:** 73 
**Resolved Date:** 25-08-2026

---

## Bug

Three lucide-react icons were imported but never used in the component:

- `CheckCircle2`
- `Clock`
- `TrendingUp`

---

## Impact

- Unnecessary import weight  
- Noise for maintainers and static analysis  

---

## Solution

Removed the three unused icons from the import list. Kept only the icons actually referenced (`FolderKanban`, `Users`, `Calendar`, `AlertTriangle`, `Siren`).

---

## Resolution

| Before              | After                |
|---------------------|----------------------|
| 8 icon imports      | 5 icon imports       |
| 3 unused            | 0 unused             |
| UI / behaviour      | Unchanged            |

No functional change — only dead imports removed.

==================================================================================================================================

# Fix: Unused Imports in EmployeeKPIPanel

**File:** `EmployeeKPIPanel.jsx`  
**Lines:** 21, 8, 26  
**Severity:** Low / Dead code  
**Excel Task No.:** —  
**Resolved Date:** 25-08-2026

---

## Bug

Three imports were present but never used:

- `getNameInitials` (from `../utils/displayName`)
- `TrendingUp` (from `lucide-react`)
- `toLocalISODate` (from `../utils/leaveTypes`)

---

## Impact

- Unnecessary import weight  
- Noise for maintainers and static analysis  

---

## Solution

Removed the three unused imports. Kept only symbols that are referenced in the component.

---

## Resolution

| Before                    | After                  |
|---------------------------|------------------------|
| 3 unused imports          | 0 unused               |
| UI / behaviour            | Unchanged              |

No functional change — only dead imports removed.

=================================================================================================================================

Fix: LeaderboardPage.jsx — Pointless aliases

File: LeaderboardPage.jsx
Lines: 1242–1244
Severity: Low / Dead code
Excel Task No.: 76
Resolved Date: 25-08-2026

Bug

Three redundant aliases were created:

top3Month_ = top3Month
canGoPrevMonth_ = canGoPrevMonth
canGoNextMonth_ = canGoNextMonth
Solution

Removed the aliases and replaced their usages with the original variable names.

Result

No functional change — only unnecessary indirection and dead code were removed.

=================================================================================================================================

# Fix: Shared StatusBadge & Status Config for Referrals

**Files:** `ReferralsPage.jsx`, `EmployeeReferralsPage.jsx`  
**New:** `components/referrals/statusConfig.js`, `components/referrals/StatusBadge.jsx`  
**Severity:** Low / Redundancy  
**Excel Task No.:** 77
**Resolved Date:** 25-08-2026

---

## Bug

`STATUS_CONFIG` and `StatusBadge` were copy-pasted in both the admin and employee referral pages, with only cosmetic differences (dot, padding, font size).

---

## Impact

- Duplicate maintenance for labels, colours, and badge UI  
- Risk of drift when one page is updated and the other is not  

---

## Solution

1. Extracted `STATUS_CONFIG` + `STATUS_OPTIONS` into `statusConfig.js`.  
2. Extracted `StatusBadge` into a shared component with optional `showDot`.  
3. Admin: `<StatusBadge status={...} showDot />`  
4. Employee: `<StatusBadge status={...} />` (no dot)

Candidate row markup left in each page to avoid any UI/workflow change.

---

## Resolution

| Before                         | After                          |
|--------------------------------|--------------------------------|
| 2× STATUS_CONFIG + StatusBadge | 1 shared module                |
| Cosmetic drift risk            | Single source of truth         |
| UI / workflow                  | Unchanged                      |

================================================================================================================================

Fix: ReferralsPage.jsx & EmployeeReferralsPage.jsx — Null-safe candidate name monogram

File: ReferralsPage.jsx, EmployeeReferralsPage.jsx
Lines: ~265 (ReferralsPage), ~258 (EmployeeReferralsPage)
Severity: Low
Excel Task No.: 78
Resolved Date: 25-08-2026

Bug

`ref.candidate_name.charAt(0)` throws when `candidate_name` is `null`, `undefined`, or empty.

Solution

```jsx
// Before
{ref.candidate_name.charAt(0).toUpperCase()}

// After
{(ref.candidate_name || "?").charAt(0).toUpperCase()}```

=================================================================================================================================

Fix: LeaveCalendar.jsx — Unused constants (dead code)

File: LeaveCalendar.jsx
Lines: 54–66 (approx.)
Severity: Low / Dead code
Excel Task No.: —
Resolved Date: 25-08-2026

Bug

`WFH_COLOR` and `PENDING_OPACITY` are defined but never referenced.  
(Note: the reported “second set of keys inside `HOLIDAYS` that duplicates `LEAVE_COLORS`” does not exist in the current file — `HOLIDAYS` only contains date keys.)

Solution

Remove the unused declarations:

```js
// Remove
const WFH_COLOR = {
  bg: "#ede9fe",
  text: "#5b21b6",
  dot: "#8b5cf6",
  label: "WFH",
};

const PENDING_OPACITY = 0.65;```

================================================================================================================================

Fix: MyLeavesPanel.jsx — Unused getISTDateTime & todayStr

File: MyLeavesPanel.jsx
Lines: 60–87 (getISTDateTime); ~496, ~555, ~593, ~670 (todayStr)
Severity: Low / Dead code
Excel Task No.: 80, 81
Resolved Date: 25-08-2026

Bug

1. `getISTDateTime` is defined but never called (half-day timing stub always returns `null`).
2. `todayStr` is declared in four handlers and never used.

Solution

- Remove the entire `getISTDateTime` helper.
- Remove the unused `const todayStr = format(...)` lines from the four handlers.

Result

No functional change — only dead code removed.

=================================================================================================================================

Fix: PayTab.jsx & PayrollPage.jsx — Unused imports & handleLock

File: PayTab.jsx, PayrollPage.jsx
Lines: PayTab.jsx:25, PayrollPage.jsx:33 (getNameInitials); PayrollPage.jsx:~391–394 (handleLock)
Severity: Low / Dead code
Excel Task No.: 82, 83
Resolved Date: 25-08-2026

Bug

1. Both files import `getNameInitials` and never use it.
2. `handleLock` in PayrollPage is defined but never attached to any UI (leftover from pre-tabs shell).

Solution

- Drop `getNameInitials` from both import statements.
- Remove the unused `handleLock` function from PayrollPage.

Result

No functional change — only unused import and dead code removed.

=================================================================================================================================

Fix: app/api/slack.py — Hardcoded approved_by=0

File: app/api/slack.py
Lines: 91, 94, 99, 102
Severity: Low / Dead / confusing
Excel Task No.: 109
Resolved Date: 25-08-2026

Bug

1. On every approve/reject call for WFH and leave, `approved_by=0` was hardcoded.
2. The real approver is already resolved as `current_user` (the Autonex user mapped from the Slack user), so the hardcoded value was incorrect and confusing.

Solution

- Replace `approved_by=0` with `approved_by=user.id` on all four call sites:
  - `approve_wfh`
  - `reject_wfh`
  - `approve_leave`
  - `reject_leave`

Result

Approvals and rejections triggered from Slack now correctly record the actual approver instead of a hardcoded zero. No other behavioral change.

=================================================================================================================================

Fix: EmployeesPage.jsx — Duplicate success toast on convert to full-time

File: EmployeesPage.jsx
Lines: 1430–1431
Severity: Low / Bug
Excel Task No.: 118
Resolved Date: 25-08-2026

Bug

1. On successful convert-to-full-time, `toast.success` was called twice in `convertMutation.onSuccess`.
2. The second call used `emp.name` without optional chaining, which can throw if the response record is falsy.

Solution

- Keep a single success toast that safely resolves the display name:
  `toast.success(\`${formatDisplayName(emp?.name) || emp?.name || "Employee"} converted to Full-time\`);`
- Remove the duplicate `toast.success` line.

Result

One success toast is shown after converting an employee to full-time. No crash risk from a missing response payload. No other behavioral change.

=================================================================================================================================

Fix: EmployeeDashboard.jsx — Attendance modal header uses non-existent full_name

File: EmployeeDashboard.jsx
Lines: 2776
Severity: Low / Bug
Excel Task No.: 120
Resolved Date: 25-08-2026

Bug

1. The attendance / leave details modal header reads `employee?.full_name`.
2. The employee object used elsewhere in this file exposes `name` (see profile useMemo and other UI). `full_name` is never set, so the header always falls back to the literal string "Employee".

Solution

- Replace `employee?.full_name` with `employee?.name` (or `profile.name` for consistency with the rest of the page).

Result

The modal header shows the employee’s actual name. No other behavioral change.

==================================================================================================================================

Fix: ProfilePage.jsx — OTP countdown effect recreates interval every second

File: ProfilePage.jsx
Lines: 62–68
Severity: Low / Perf
Excel Task No.: 123
Resolved Date: 25-08-2026

Bug

1. The OTP countdown `useEffect` in `EmailCard` listed both `step` and `timeLeft` in its dependency array.
2. Because `timeLeft` changes every second, the effect tore down and recreated its interval on every tick instead of running a single stable interval for the duration of the OTP step.

Solution

- Depend only on `step`.
- Keep the functional update (`setTimeLeft((prev) => …)`) so `timeLeft` is not needed as a dependency.
- Clear the interval when the countdown reaches zero or when leaving step 2.

Result

One interval runs for the OTP countdown instead of being recreated every second. No functional change to the countdown behavior.

==================================================================================================================================

Fix: EmployeesPage.jsx — four near-identical KPI card + toggle stat-tiles blocks

File: EmployeesPage.jsx
Lines: ~1670–1941
Severity: Low / Redundancy
Excel Task No.: 125
Resolved Date: 26-08-2026

Bug

1. The KPI overview grid rendered four almost identical “card + 3 clickable stat-tiles” blocks (Total Employees, Work Model, Employee Types, Designation Roles).
2. The blocks differed only in icon, title, colour tokens, count values, and click handlers, producing ~270 lines of duplicated markup that was hard to maintain and easy to drift.

Solution

- Extracted two small presentational components:
  - `StatTile` — single clickable metric tile (label, value, active state, colours, onClick).
  - `KpiCard` — shared card shell (icon, title, 3-column tile grid).
- Replaced the four duplicated blocks with one special-cased Total Employees card (keeps the large total on the right) plus three `KpiCard` + `StatTile` compositions.
- All original colours, active rings, toggle behaviour, and URL / filter side-effects are preserved.

Result

Duplicated markup removed. Adding or changing a KPI card is now a few lines of declarative config instead of another copy-paste block. Visual appearance and interaction behaviour are unchanged.

=================================================================================================================================

Fix: onboarding.py — N+1 queries in analytics dashboard, full analytics, and mentees endpoints

File: app/api/onboarding.py
Lines: ~846–903 (analytics) + get_mentees loop
Severity: Low / Perf (N+1)
Excel Task No.: —
Resolved Date: 26-08-2026

Bug

1. `get_analytics_dashboard` recomputed a constant `total_sections` query inside a per-candidate loop and ran one extra COUNT per candidate.
2. `get_full_analytics` similarly issued per-candidate progress COUNTs and per-candidate quiz-attempt queries.
3. `get_mentees` ran three queries (progress, attempts, employee) for every mentee instead of batching.
4. This matched the classic N+1 pattern that `fetch_onboarding_reports_data` had already avoided.

Solution

- Hoist the constant `total_sections` query outside any loop.
- Replace per-candidate COUNTs with a single grouped query (`group_by(user_id)` + `func.count`).
- Batch-load all quiz attempts (and employees for mentees) with `.in_(candidate_ids)` / `.in_(user_ids)` and group in Python.
- Apply the same batching pattern already used by `fetch_onboarding_reports_data` to the three endpoints.

Result

Query count drops from O(N) to a small constant number of queries regardless of candidate/mentee count. Response JSON shape and field semantics are unchanged; frontend consumers require no updates.

===============================================================================================================================

Fix: leaves.py — dead `_leave_to_schema` helper; duplicated LeaveSchema field mapping

File: app/api/leaves.py
Lines: ~406–424 (`_leave_to_schema`) + get_all_leaves, get_leave, create_leave, update_leave returns
Severity: Low / Dead code
Excel Task No.: 128
Resolved Date: 26-08-2026

Bug

1. `_leave_to_schema` was defined but never called.
2. `get_all_leaves`, `get_leave`, `create_leave`, and `update_leave` each hand-built `LeaveSchema(...)` inline, duplicating the same field list 4+ times.
3. `get_leave`’s inline mapping omitted `flagged` and `approval_remark` relative to the other endpoints.
4. Any future field addition or default change required editing multiple call sites, risking drift between list, detail, create, and update responses.

Solution

- Extend `_leave_to_schema` with an optional `approver_name` argument and map the full field set once (including `approved_by_name`, `flagged`, `approval_remark`, half-day fields, and ISO `created_at`/`updated_at`).
- Route all `LeaveSchema` returns through the helper:
  - `get_all_leaves` → `_leave_to_schema(leave, approver_name=approver_names.get(...))`
  - `get_leave` → `_leave_to_schema(leave)`
  - `create_leave` → `_leave_to_schema(leave)`
  - `update_leave` → `_leave_to_schema(leave)`
- Keep `_leave_to_schema_with_name` and `GET /page` unchanged (dict shape with `employee_name`).
- Leave calendar, KPI, approve/reject/undo, Razorpay, Slack, and audit paths untouched.

Result

`_leave_to_schema` is no longer dead code. The LeaveSchema field list lives in one place. Response JSON shape and semantics stay compatible with the existing frontend; no client changes required. `get_leave` now consistently includes `flagged` and `approval_remark`.

================================================================================================================================

Fix: leaves.py — duplicated import block and redundant WFHRequest import

File: app/api/leaves.py
Lines: ~1–113 (duplicate imports) + get_calendar local import
Severity: Low / Dead code
Excel Task No.: 129
Resolved Date: 26-08-2026

Bug

1. The entire import block (FastAPI, SQLAlchemy, models, schemas, services, HTTPRequest alias) was duplicated verbatim after `validate_half_day_timing`.
2. `get_calendar` re-imported `WFHRequest` locally even though it is already imported at module scope.
3. No functional impact, but the duplication triggered dead-code / maintainability lint and made the module harder to read.

Solution

- Remove the second, identical import block; keep a single set of imports at the top of the file (including `Request as HTTPRequest` and `WFHRequest`).
- Remove the local `from app.models.wfh import WFHRequest` inside `get_calendar`.

Result

Module has one import section only. Lint for duplicated imports / redundant local import is resolved. Runtime behavior and API contracts are unchanged.

==================================================================================================================================

Fix: ProjectsPage.jsx — unused SkillMultiSelect and EmployeeMultiSelect imports

File: src/pages/ProjectsPage.jsx (or equivalent path)
Lines: import from ProjectDropdowns
Severity: Low / Dead code
Excel Task No.: 133
Resolved Date: 26-08-2026

Bug

`SkillMultiSelect` and `EmployeeMultiSelect` were imported into ProjectsPage but never rendered. Only `TeamLeadMultiSelect` and `PmMultiSelect` are used in the project modal.

Solution

Drop `SkillMultiSelect` and `EmployeeMultiSelect` from the ProjectDropdowns import. Leave the shared components in ProjectDropdowns until a repo-wide usage check confirms they are unused elsewhere.

Result

Unused-import / dead-code lint on ProjectsPage is resolved. UI and project create/edit flow unchanged.

===============================================================================================================================

Fix: ProjectsPage.jsx — unused helpers, icons, and debug log

File: ProjectsPage.jsx
Lines: ~2108–2194 (calc cluster), goToAllocations / manpower helpers, icon imports, ~2466 console.log
Severity: Low / Dead code
Excel Task No.: 134, 135, 136
Resolved Date: 26-08-2026

Bug

1. `getWorkingDays`, `getEmployeeLeaveDays`, and `getSystemRecommendation` were defined but never called.
2. `goToAllocations`, `calculateManpowerBalance`, `calculateTasksPerEmployee`, and `currentMainProject` were unused.
3. Lucide icons `Minus`, `ArrowRight`, and `Eye` were imported but not rendered.
4. A leftover `console.log("Tab clicked:", t.key)` remained in production UI code.

Solution

- Delete the unused calculation cluster and other unused helpers/values.
- Trim unused lucide-react imports.
- Remove the debug `console.log`.
- Drop any imports (e.g. `getWorkingDayCount`) that only served the deleted code.

Result

Dead-code lint cleared. Project list, modal create/edit, and allocation flows unchanged.

=================================================================================================================================

Fix: PMSubProjectsPage.jsx — unused currentProject; page not reset on project filter change

File: PMSubProjectsPage.jsx
Severity: Low / Dead code + Bug
Excel Task No.: 138, 139
Resolved Date: 26-08-2026

Bug

1. `currentProject` was computed every render and never read.
2. Changing `?project=` while `page` was > 1 left the old page in the URL, so the API could be asked for an out-of-range page (empty table).
3. Pagination used `setSearchParams` while only `searchParams` was destructured from `useSearchParams`.

Solution

- Remove the unused `currentProject` computation.
- Destructure `setSearchParams` from `useSearchParams`.
- On `filterMainProjectId` change, reset `page` to `1` when it is greater than 1.

Result

No dead `currentProject`. Switching projects always starts at page 1. Pagination continues to work.

=================================================================================================================================

Fix: AllocationsPage.jsx — remove duplicated avatar palette helper

File: AllocationsPage.jsx
Lines: ~38–55
Severity: Low / Redundancy
Excel Task No.: 140
Resolved Date: 26-08-2026

Bug

`AVATAR_PALETTE` and `getAvatarGradient` were copied verbatim from AllocationPopover and unused on AllocationsPage (avatars use UserAvatar).

Solution

Delete the unused palette + hash helper from AllocationsPage. Keep the implementation in AllocationPopover (or later extract to a shared util if multiple call sites need it).

Result

Redundancy lint cleared. Allocation UI unchanged.

================================================================================================================================

Fix: ProjectDropdowns + Dropdown — shared useClickOutside

File: hooks/useClickOutside.js, components/ui/Dropdown.jsx, components/projects/ProjectDropdowns.jsx, ProjectsPage.jsx
Severity: Low / Redundancy
Excel Task No.: 141
Resolved Date: 26-08-2026

Bug

Outside-click dismiss was copy-pasted in SkillMultiSelect, EmployeeMultiSelect, TeamLeadMultiSelect, PmMultiSelect, and the shared Dropdown.

Solution

- Centralize in `useClickOutside(ref, onOutside, enabled)`.
- Wire all five UIs to the hook (enabled only while open).
- Drop unused `useClickOutside` import from ProjectsPage.

Result

One outside-click implementation. Dropdown behavior unchanged.