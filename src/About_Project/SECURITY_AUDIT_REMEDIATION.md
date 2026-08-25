# Security Audit Remediation & Access Control Log

This document serves as the persistent audit tracking log for security findings, authorization fixes, data integrity improvements, and runtime remediations implemented across the Autonex codebase. Fixes and verification records are appended sequentially to maintain a complete history of changes.

---

## Issue #1 [Backend]: Missing Access Control & Privacy Redaction in Leave/WFH Calendar

| Metadata | Details |
| :--- | :--- |
| **Component Tier** | **Backend (Python / FastAPI)** |
| **Application** | Autonex Backend |
| **Severity** | **HIGH (Data Exposure / Privacy Breach)** |
| **Target Endpoint** | `GET /api/leaves/calendar` |
| **Status** | **RESOLVED & VERIFIED** |
| **Source Files** | `app/api/leaves.py` |
| **Date Resolved** | August 20, 2026 |

### 1. Issue Statement & Audit Remark
* **Audit Finding:**
  > *"The leave/WFH calendar has no access control at all — `app/api/leaves.py:507–524`'s `get_calendar` takes no `current_user` and skips the privacy filtering every other endpoint in the file enforces. Any employee can pull everyone's leave reasons and statuses for any month."*
* **Impact & Security Risk:**
  The calendar endpoint allowed unauthenticated access and returned sensitive medical notes, personal reasons (`reason`), and leave limit breach indicators (`flagged`) for all employees company-wide.

### 2. Root Cause Analysis
1. **Missing Authentication Dependency:** The FastAPI router function omitted the `current_user: User = Depends(get_current_user)` dependency parameter.
2. **Unsanitized Entity Serialization:** The output payload builder directly mapped database model attributes (`reason`, `flagged`) without evaluating the requester's role or project management scope relative to the subject employee.

### 3. Technical Remediation Applied
* Enforced authentication dependency (`Depends(get_current_user)`) on `GET /api/leaves/calendar`.
* Implemented per-row privacy filtering using `project_scope.can_manage_employee(db, current_user, item.employee_id)`.
* Redacted sensitive `reason` and `flagged` metadata for non-managers and peer employees while preserving company-wide schedule visibility.

#### Access Control Rules Matrix
| User Role / Scope | Calendar Schedule Visibility | Reason & Flagged Metadata |
| :--- | :--- | :--- |
| **Admin / HR** | All company leaves & WFH events | Full unredacted access |
| **PM / Team Lead** | All company leaves & WFH events | Full reasons for managed projects/staff; **REDACTED (`None`)** for unmanaged staff |
| **Regular Employee** | All company leaves & WFH events | Full reasons for **OWN** requests; **REDACTED (`None` / `False`)** for all colleagues |
| **Unauthenticated** | Blocked (`HTTP 401 Unauthorized`) | Blocked (`HTTP 401 Unauthorized`) |

### 4. Verification & Automated Test Results
* **Test Suite:** `tests/test_project_scope.py`

| Test Case | Condition Tested | Result |
| :--- | :--- | :--- |
| `test_calendar_unauthenticated` | Requests without authorization header return `401` | **PASS (HTTP 401)** |
| `test_calendar_employee_privacy_redaction` | Employee sees own reason; peer reasons are redacted | **PASS (Redacted)** |
| `test_calendar_pm_scoped_access` | PM sees reasons for managed staff; unmanaged staff redacted | **PASS (Scoped)** |
| `test_calendar_admin_full_access` | Admin has full company-wide unredacted access | **PASS (Full Access)** |

---

## Issue #2 [Fullstack - Backend & Frontend]: Unscoped Read & Write Permissions on Employee Notes (HR History)

| Metadata | Details |
| :--- | :--- |
| **Component Tier** | **Fullstack (Backend: FastAPI / Frontend: React)** |
| **Application** | Autonex Fullstack (Backend & Frontend) |
| **Severity** | **HIGH (Authorization / Privacy)** |
| **Target Components** | `GET/POST/PUT/DELETE /api/employee-notes/*`, `src/pages/employee/EmployeeDashboard.jsx` |
| **Status** | **RESOLVED & VERIFIED** |
| **Source Files** | `app/api/employee_notes.py`, `src/pages/employee/EmployeeDashboard.jsx`, `tests/test_employee_notes_access_control.py` |
| **Date Resolved** | August 20, 2026 |

### 1. Issue Statement & Audit Remark
* **Audit Finding:**
  > *"Employee complaints, warnings, and recognition notes render with no read-time role check — `src/pages/employee/EmployeeDashboard.jsx:~1904–2200`. Only add/resolve/delete are gated; anyone who can open a profile can read its HR history."*
* **Impact & Security Risk:**
  * **Backend:** Blanket `has_team_read` permitted any PM or Team Lead (even from unrelated projects) to query and read confidential disciplinary records, client complaints, and warning notes. Write actions also lacked project-level scope checks.
  * **Frontend:** The Notes container rendered without read-time gating, allowing peers and unauthorized staff to view disciplinary history.

### 2. Root Cause Analysis
1. **Write-Only Gating Mindset in UI:** `canManageNotes` was checked only around action buttons (*Add Note*, *Resolve*, *Delete*). The container rendering historical complaints and warnings was rendered for anyone viewing the profile.
2. **Missing Scoped Privacy on API:** In `app/api/employee_notes.py`, `_ensure_note_access_for_employee` used `has_team_read(current_user)` instead of checking project-level hierarchy via `project_scope.can_manage_employee`.

### 3. Technical Remediation Applied

#### A. Backend Changes (`app/api/employee_notes.py`)
* Replaced `has_team_read` with `project_scope.can_manage_employee(db, current_user, employee_id)` in `_ensure_note_read_access_for_employee`, `list_employee_notes`, `list_notes_by_employee`, and `get_employee_note`.
* Enforced `project_scope.require_employee_scope(db, current_user, employee_id, action=...)` across all mutating endpoints:
  * `create_employee_note` (`POST /api/employee-notes`)
  * `update_employee_note` (`PUT /api/employee-notes/{note_id}`)
  * `resolve_employee_note` (`POST /api/employee-notes/{note_id}/resolve`)
  * `delete_employee_note` (`DELETE /api/employee-notes/{note_id}`)

#### B. Frontend Changes (`src/pages/employee/EmployeeDashboard.jsx`)
* Added scoped permission helpers:
  * `isAdminOrHr = userRole === 'admin' || userRole === 'hr'`
  * `isManagerOfEmployee` (checks if the logged-in PM/Lead manages any active sub-project the employee is allocated to)
  * `canViewNotes = isAdminOrHr || isSelf || isManagerOfEmployee`
  * `canManageNotes = isAdminOrHr || isManagerOfEmployee`
* Guarded the React Query hook to prevent unauthorized network requests:
  ```javascript
  enabled: !!employeeId && canViewNotes
  ```
* Conditionally rendered the **Notes** tab button and tab content only when `canViewNotes` is true, automatically defaulting unauthorized viewers to the **Performance History** tab.

#### Access Control Rules Matrix
| User Role / Context | Read Notes Permissions | Write Notes Permissions (Add / Edit / Resolve / Delete) |
| :--- | :--- | :--- |
| **Admin / HR** | Full access to all employees across the company | Full access across the entire company |
| **PM / Team Lead** | **Only actively managed employees** on their projects (+ own notes); others return **403 Forbidden** | **Only actively managed employees** on their projects; others return **403 Forbidden** |
| **Regular Employee** | **Only own notes**; peer notes return **403 Forbidden** | No write access (**403 Forbidden**) |
| **Unauthenticated** | Blocked (**401 Unauthorized**) | Blocked (**401 Unauthorized**) |

### 4. Verification & Automated Test Results
* **Test Suite:** `tests/test_employee_notes_access_control.py`

| Test Case | Condition Tested | Result |
| :--- | :--- | :--- |
| `test_admin_hr_full_read_access` | Admin and HR have complete read access to all notes | **PASS (200 OK)** |
| `test_employee_self_read_access` | Employee can fetch their own complaints/warnings/recognition | **PASS (200 OK)** |
| `test_employee_peer_read_denied` | Employee attempting to read peer notes receives 403 Forbidden | **PASS (403 Forbidden)** |
| `test_managing_pm_read_access` | PM can read notes for allocated team members on managed projects | **PASS (200 OK)** |
| `test_unrelated_pm_read_denied` | PM attempting to read unmanaged employee notes receives 403 Forbidden | **PASS (403 Forbidden)** |
| `test_managing_pm_write_scope` | PM write permitted for managed staff, rejected (403) for unmanaged staff | **PASS (Scoped 403)** |

---

## Full Regression Test Suite Status

```bash
./venv/bin/pytest
```
* **Total Tests Executed:** 170 passed
* **Failures / Errors:** 0
* **Status:** **100% PASSING**

---

## Issue #3 [Frontend]: Runtime Crash on Employee Detail Drawer (Missing date-fns Imports)

| Metadata | Details |
| :--- | :--- |
| **Component Tier** | **Frontend (React / Vite)** |
| **Application** | Autonex Frontend |
| **Severity** | **MEDIUM (Client-side Crash / Availability)** |
| **Target Component** | `src/components/EmployeeKPIPanel.jsx` |
| **Status** | **RESOLVED & VERIFIED** |
| **Source Files** | `src/components/EmployeeKPIPanel.jsx` |
| **Date Resolved** | August 21, 2026 |

### 1. Issue Statement & Audit Remark
* **Audit Finding:**
  > *"Runtime crash on the employee detail drawer — `src/components/EmployeeKPIPanel.jsx:809–1071` uses `format`/`parseISO` from `date-fns` without ever importing them."*
* **Impact:**
  Opening the employee detail drawer / KPI slideout triggered an uncaught `ReferenceError: format is not defined`, crashing the drawer UI for end users when viewing attendance and WFH log dates.

### 2. Root Cause Analysis
* `format` and `parseISO` functions were invoked at lines 809, 991, 1003, 1008, and 1071 to parse ISO timestamp strings and format leave/WFH dates into human-readable strings, but the top-level import statement from `date-fns` was missing.

### 3. Technical Remediation Applied
* Added `import { format, parseISO } from "date-fns";` to `src/components/EmployeeKPIPanel.jsx`.
* Verified frontend build bundle passes cleanly without reference errors.

### 4. Verification & Automated Test Results
* Executed `npm run build`: Zero errors, client and SSR bundles built successfully.

---

## Issue #4 [Frontend]: Incorrect User Attribution & Rank Collision in Leaderboard

| Metadata | Details |
| :--- | :--- |
| **Component Tier** | **Frontend (React / Vite)** |
| **Application** | Autonex Frontend |
| **Severity** | **HIGH (Data Integrity / Identity Collision)** |
| **Target Component** | `src/pages/admin/LeaderboardPage.jsx` |
| **Status** | **RESOLVED & VERIFIED** |
| **Source Files** | `src/pages/admin/LeaderboardPage.jsx` |
| **Date Resolved** | August 21, 2026 |

### 1. Issue Statement & Audit Remark
* **Audit Finding:**
  > *"LeaderboardPage.jsx (e.g. ~787–796, repeated for week/day) — 'which row is me' uses a substring match (includes) on email and name, which can attribute another employee's rank and hours to the logged-in user."*
* **Impact & Risk:**
  Using `.includes()` substring matching allowed employees with shorter names or email prefixes (e.g., `"Dan"`, `"Roy"`, `"alex@autonex.ai"`) to erroneously match colleagues with longer names or email addresses containing that substring (e.g., `"Daniel"`, `"Troy"`, `"alexander@autonex.ai"`). This resulted in showing incorrect ranks, platform hours, and badge attributions for the logged-in user.

### 2. Root Cause Analysis
* The row-matching predicates in monthly (`userMonthRankItem`), daily (`userDailyRankItem`), and weekly (`userWeekRankItem`) rank calculation memos performed bi-directional substring checks:
  ```javascript
  // Problematic loose matching:
  itemEmail && (itemEmail === currentUserEmail || currentUserEmail.includes(itemEmail) || itemEmail.includes(currentUserEmail))
  itemObjName && (itemObjName === currentUserName || currentUserName.includes(itemObjName) || itemObjName.includes(currentUserName))
  ```

### 3. Technical Remediation Applied
* Added `currentUserEmpId` extractor and implemented a centralized, strict `findCurrentUserIndex(list)` matching function:
  1. **Primary Check:** Exact `employee_id` equality (`String(item.employee_id) === String(currentUserEmpId)`).
  2. **Secondary Check:** Exact normalized email equality (`itemEmail === currentUserEmail`).
  3. **Fallback Check:** Exact normalized full-name equality (`itemObjName === currentUserName`).
* Removed all loose `.includes()` substring matching across monthly, daily, and weekly calculations.

### 4. Verification & Automated Test Results
* Executed `npm run build`: Zero errors, client and SSR bundles built successfully.

---

## Issue #5 [Frontend]: Discrepancy in Working Days Calculation (Holidays vs Weekend-only)

| Metadata | Details |
| :--- | :--- |
| **Component Tier** | **Frontend (React / Vite)** |
| **Application** | Autonex Frontend |
| **Severity** | **MEDIUM (Calculation Discrepancy / Capacity Accuracy)** |
| **Target Components** | `src/utils/dateCalculations.js`, `src/pages/ProjectsPage.jsx`, `src/pages/Dashboard.jsx` |
| **Status** | **RESOLVED & VERIFIED** |
| **Source Files** | `src/utils/dateCalculations.js`, `src/utils/leaveTypes.js`, `src/pages/ProjectsPage.jsx`, `src/pages/Dashboard.jsx` |
| **Date Resolved** | August 21, 2026 |

### 1. Issue Statement & Audit Remark
* **Audit Finding:**
  > *"src/utils/dateCalculations.js:12–31 (used by Dashboard.jsx) vs src/utils/leaveTypes.js:152–168 — two 'working days' implementations exist; one excludes only weekends, the other also excludes holidays, so capacity and day-count numbers can disagree for the same date range."*
* **Impact & Inconsistency:**
  * Dates spanning public holidays (e.g. Independence Day Aug 15 or Republic Day Jan 26) were calculated as working days by `dateCalculations.js` and `ProjectsPage.jsx`, but excluded by `leaveTypes.js` (used by `LeavesPage`, `MyLeavesPanel`, and `EmployeeDashboard`).
  * In `ProjectsPage.jsx`, employee leave days during project schedules were subtracted without holiday or half-day awareness, causing project capacity figures to disagree with employee leave balances.

### 2. Root Cause Analysis
* Duplicate date utility functions evolved independently:
  1. `src/utils/dateCalculations.js:getWorkingDays` only checked `day !== 0 && day !== 6` (weekends only).
  2. `src/pages/ProjectsPage.jsx:getWorkingDays` locally duplicated the weekend-only loop.
  3. `src/utils/leaveTypes.js:getWorkingDayCount` correctly checked `!isNonWorkingDay()` (weekends + fixed company holidays).

### 3. Technical Remediation Applied
* **Unified `src/utils/dateCalculations.js`**: Updated `getWorkingDays` to delegate to `getWorkingDayCount` from `src/utils/leaveTypes.js`, ensuring holiday exclusion and timezone safety for both `Date` objects and ISO strings.
* **Updated `src/pages/ProjectsPage.jsx`**: Replaced local weekend-only calculations with `getWorkingDayCount` and added half-day (`leave.is_half_day`) support for project leave deductions.
* **Cleaned up `src/pages/Dashboard.jsx`**: Removed unused import of `getWorkingDays`.

### 4. Verification & Automated Test Results
* Executed `npm run build`: Zero errors, client and SSR bundles built successfully.

---

## Issue #6 [Fullstack]: Elimination of Hardcoded Default Password in Favor of Cryptographic Temporary Credentials & Forced Reset

| Metadata | Details |
| :--- | :--- |
| **Component Tier** | **Fullstack (FastAPI Backend + React Frontend)** |
| **Application** | Autonex Backend & Autonex Frontend |
| **Severity** | **HIGH (Credential Security / Access Vulnerability)** |
| **Target Components** | `app/api/employees.py`, `app/api/signup_requests.py`, `app/api/auth.py`, `app/models/user.py`, `src/pages/EmployeesPage.jsx`, `src/components/ForcePasswordChangeModal.jsx`, `src/services/api.js` |
| **Status** | **RESOLVED & VERIFIED** |
| **Source Files** | `app/api/employees.py`, `app/api/signup_requests.py`, `app/api/auth.py`, `app/models/user.py`, `app/schemas/employee.py`, `app/main.py`, `src/services/api.js`, `src/App.jsx`, `src/pages/EmployeesPage.jsx`, `src/components/ForcePasswordChangeModal.jsx`, `tests/test_employee_password_security.py` |
| **Date Resolved** | August 21, 2026 |

### 1. Issue Statement & Audit Remark
* **Audit Finding:**
  > *"app/api/employees.py:105 — DEFAULT_EMPLOYEE_PASSWORD is a fixed, identical login password assigned to every new employee with no visible forced-reset flow."*
* **Impact & Security Risk:**
  Assigning a static hardcoded password (`"emp123"`) to all newly created employees meant that any actor who knew or guessed an employee's work email address could log into their account prior to the employee logging in, accessing private project allocations, personal documents, and internal portals without authorization.

### 2. Root Cause Analysis
* `app/api/employees.py` defined `DEFAULT_EMPLOYEE_PASSWORD = "emp123"` and passed it into `hash_password(DEFAULT_EMPLOYEE_PASSWORD)` whenever an admin or PM created an employee.
* The `User` database model had no flag indicating whether an account was operating on a temporary initial credential versus a permanent employee-defined password.
* There was no endpoint allowing authenticated users to change their password and dismiss a forced first-time reset requirement.

### 3. Technical Remediation Applied

#### A. Backend Architecture & Database Synchronization
1. **Schema & Model Update (`app/models/user.py` & `app/main.py`)**:
   - Added `must_change_password = Column(Boolean, default=False, nullable=False)` to the `User` model.
   - Updated startup schema synchronizer `sync_user_password_reset_schema()` to automatically execute `ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE` on existing databases.
2. **Cryptographic Temporary Password Generation (`app/api/employees.py`)**:
   - Eliminated `DEFAULT_EMPLOYEE_PASSWORD = "emp123"`.
   - Implemented `_gen_temp_password()` utilizing Python's `secrets.token_urlsafe(8)` for high-entropy random credentials.
   - Set `must_change_password = True` on newly created `User` instances.
   - Dispatched the automated welcome credentials email using `try_send_signup_approved_email` via Brevo API.
   - Returned `EmployeeCreateResponse` containing `temp_password` and `portal_url` for on-screen admin confirmation.
3. **Signup Approval Sync (`app/api/signup_requests.py`)**:
   - Configured `approve_signup_request` to ensure `must_change_password = True` on new or reactivated accounts.
4. **Auth & Change Password API (`app/api/auth.py`)**:
   - Extended `UserResponse` and JWT login tokens with `must_change_password`.
   - Added `POST /api/auth/change-password` endpoint allowing authenticated users to set a permanent password, verifying current password if `must_change_password` is false, and setting `must_change_password = False`.

#### B. Frontend Implementation & UI Controls
1. **API Integration (`src/services/api.js`)**:
   - Added `authApi.changePassword` method for `POST /api/auth/change-password`.
2. **First-Login Forced Reset Modal (`src/components/ForcePasswordChangeModal.jsx` & `src/App.jsx`)**:
   - Created a non-dismissible modal that activates whenever `user.must_change_password === true`.
   - Features password complexity checks, show/hide toggles, confirmation validation, and automatic session persistence updates upon submission.
3. **Admin Temporary Credentials Confirmation Modal (`src/pages/EmployeesPage.jsx`)**:
   - Created `EmployeeCredentialsModal` displaying employee name, email, generated temporary password, portal link, and a "Copy Credentials" clipboard button upon successful employee creation.

### 4. Verification & Automated Test Results
* **Backend Automated Tests**:
  - Authored `tests/test_employee_password_security.py` verifying random password generation, rejection of legacy `"emp123"`, successful temporary login, forced password change endpoint, and subsequent permanent password logins.
  - Executed full test suite: **166 passed, 0 failures**.
* **Frontend Verification**:
  - Executed `npm run build`: Zero errors, client and SSR bundles built successfully.


## Issue #7 [Frontend]: Insecure Email Editing Flow (OTP Bypass)

| Metadata | Details |
| :--- | :--- |
| **Component Tier** | **Frontend (React / Vite)** |
| **Application** | Autonex Frontend |
| **Severity** | **MEDIUM (Security / Inconsistent Validation)** |
| **Target Component** | `src/pages/employee/EmployeeDashboard.jsx` |
| **Status** | **RESOLVED & VERIFIED** |
| **Source Files** | `src/pages/employee/EmployeeDashboard.jsx` |
| **Date Resolved** | August 24, 2026 |

### 1. Issue Statement & Audit Remark
* **Audit Finding:**
  > *"EmployeeDashboard.jsx:628–684 vs ProfilePage.jsx:429–461 — two different code paths for the same feature: one requires OTP verification for an email change, the other changes it directly with only a domain-suffix check."*
* **Impact:**
  Leaving legacy email change logic on the Dashboard bypassed the secure two-step OTP validation implemented in `ProfilePage.jsx`. Furthermore, the legacy endpoint `employeeApi.changeEmail` was deprecated, which would cause an application crash if invoked.

### 2. Root Cause Analysis
* When the secure OTP email change flow was introduced to `ProfilePage.jsx`, the corresponding legacy form inputs and API bindings were erroneously left intact in `EmployeeDashboard.jsx`.

### 3. Technical Remediation Applied
* Completely stripped out all email editing states, API mutations (`changeEmailMutation`), and UI inputs from the `EmployeeDashboard.jsx` modal.
* Centralized all email change requests to the secure OTP-gated flow in `ProfilePage.jsx` as the single source of truth.

### 4. Verification & Automated Test Results
* Verified UI: The email input field no longer appears in the Dashboard edit modal.
* Executed `npm run build`: Zero errors, client and SSR bundles built successfully.

---

## Issue #8 [Backend]: Unauthorized Cross-Manager Employee Note Tampering

| Metadata | Details |
| :--- | :--- |
| **Component Tier** | **Backend (Python / FastAPI)** |
| **Application** | Autonex Backend |
| **Severity** | **HIGH (Authorization / Tampering)** |
| **Target Component** | `/api/employee-notes/*` |
| **Status** | **RESOLVED & VERIFIED** |
| **Source Files** | `app/api/employee_notes.py` |
| **Date Resolved** | August 24, 2026 |

### 1. Issue Statement & Audit Remark
* **Audit Finding:**
  > *"app/api/employee_notes.py:187–325 — note update/resolve/delete only check role, not project scope; a team lead can edit an HR note about an employee on an unrelated project."*
* **Impact & Security Risk:**
  Any Team Lead or PM who managed an employee on any project could edit, resolve, or delete a severe HR disciplinary note or a note authored by another manager on a different project. The system only checked if they managed the employee, not if they had ownership of the note.

### 2. Root Cause Analysis
* **Missing Ownership Verification:** The mutation endpoints relied solely on `project_scope.require_employee_scope`, which acts as a broad check for employee management status, but lacked a strict authorship (`note.issued_by`) verification.

### 3. Technical Remediation Applied
* Retained `require_employee_scope` as a baseline prerequisite check.
* Added explicit 403 Forbidden checks in `update_employee_note`, `resolve_employee_note`, and `delete_employee_note` to ensure the caller is either an Admin/HR, or the exact author (`note.issued_by == current_user.id`).

### 4. Verification & Automated Test Results
* Executed full backend `pytest` regression suite across all modules.
* **Status:** 166 tests passed successfully.

---

## Issue #9 [Frontend]: React Rules of Hooks Violation in PlannedVsActualChart

| Metadata | Details |
| :--- | :--- |
| **Component Tier** | **Frontend (React / Vite)** |
| **Application** | Autonex Frontend |
| **Severity** | **HIGH (Client-side Crash / UI Failure)** |
| **Target Component** | `PlannedVsActualChart.jsx` |
| **Status** | **RESOLVED & VERIFIED** |
| **Source Files** | `src/components/analytics/PlannedVsActualChart.jsx` |
| **Date Resolved** | August 24, 2026 |

### 1. Issue Statement & Audit Remark
* **Audit Finding:**
  > *"PlannedVsActualChart.jsx:26–38 — useMemo is called after a conditional early return, a Rules-of-Hooks violation."*
* **Impact & Usability Risk:**
  If the chart's `data` prop changed from a populated array to an empty array across renders, React would encounter an inconsistent hook call order. This conditionally skipped the `useMemo` hook, causing an immediate, unrecoverable crash of the entire React tree.

### 2. Root Cause Analysis
* **Hook Call Order:** `totals = useMemo(...)` was placed at line 38, while an early return `if (!data || data.length === 0)` was placed at line 26.

### 3. Technical Remediation Applied
* Moved the `useMemo` hook call to the absolute top of the component, above all conditional return blocks.
* Guarded the internal `data.reduce` computations with a `safeData = data || []` fallback to prevent null pointer exceptions when data is undefined during the initial hook execution.

### 4. Verification & Automated Test Results
* Executed `npm run build`: Zero errors, client and SSR bundles built successfully.

---

## Issue #10 [Frontend]: Inconsistent KPI and Table Manpower Calculations

| Metadata | Details |
| :--- | :--- |
| **Component Tier** | **Frontend (React / Vite)** |
| **Application** | Autonex Frontend |
| **Severity** | **MEDIUM (Logic / UI Consistency)** |
| **Target Component** | `PMDashboard.jsx` |
| **Status** | **RESOLVED & VERIFIED** |
| **Source Files** | `src/pages/pm/PMDashboard.jsx` |
| **Date Resolved** | August 24, 2026 |

### 1. Issue Statement & Audit Remark
* **Audit Finding:**
  > *"PMDashboard.jsx:144–147 vs :252–266 — the 'At Risk' KPI uses a deduped manpower count while the project table's staffing column uses a raw, non-deduped count."*
* **Impact & Usability Risk:**
  Because the top-level 'At Risk' KPI widget used a deduplicated set of employees (including PMs and Team Leads) and the project table used a raw count of allocation records, the same project could appear fully staffed in the table but at-risk in the KPI, or vice-versa. This broke trust in the PM dashboard data.

### 2. Root Cause Analysis
* **Inconsistent Data Sources:** The KPI correctly utilized the centralized `getAllocatedManpower(project)` utility, but the inline project table render method incorrectly calculated staffing by directly counting `projAllocs.length`.

### 3. Technical Remediation Applied
* Replaced the raw `projAllocs.length` count in the project table's 'Staff' column renderer with the centralized `getAllocatedManpower(project)` utility, aligning both the KPI and the table to exactly the same logic.

### 4. Verification & Automated Test Results
* Executed `npm run build`: Zero errors, client and SSR bundles built successfully.

---

## Issue #11 [Frontend]: Leaderboard Triplicated Logic Refactor

**Component Tier:** Frontend (React / Vite)
**Severity:** LOW (Code Quality / Maintainability)
**Status:** RESOLVED & VERIFIED
**Date:** August 24, 2026
**Target Component:** `LeaderboardPage.jsx`
**Source Files:** `src/pages/admin/LeaderboardPage.jsx`

### 1. Issue Statement & Audit Remark
* **Audit Finding:** *"LeaderboardPage.jsx — the month/week/day ranking computation and 'find me' logic are triplicated as near-identical 30–40 line blocks instead of one parameterized helper."*
* **Impact & Usability Risk:** The exact same multi-step mapping, sorting, and user fallback logic was independently written and maintained three times. This bloated the file size and created a significant maintenance burden.

### 2. Root Cause Analysis
* **Code Duplication:** `filteredMonthLeaderboard`, `filteredWeekLeaderboard`, and `filteredDailyLeaderboard` all performed the exact same data transformations and rank determinations using the same React hooks and mapping procedures.

### 3. Technical Remediation Applied
* Extracted all sorting, limit processing, hours-calculation, and array reduction into a pure, generic `calculateRankings(data, limit)` helper function.
* Extracted the current-user ranking logic into a generic `calculateUserRankItem` function.
* Replaced the six bulky internal logic blocks with unified helper calls, drastically reducing the file size and maintaining consistency.

### 4. Verification & Automated Test Results
* Executed `npm run build`: Zero errors, client and SSR bundles built successfully.

---

## Issue #12 [Frontend]: Extracted Chart Tooltips & Gradients into ChartWrapper

**Component Tier:** Frontend (React / Vite)
**Severity:** LOW (Code Quality / Maintainability)
**Status:** RESOLVED & VERIFIED
**Date:** August 24, 2026
**Target Component:** `ChartWrapper.jsx` and Analytics Charts
**Source Files:** `src/components/analytics/*`

### 1. Issue Statement & Audit Remark
* **Audit Finding:** *"At least five chart components each hand-roll their own tooltip style, empty-state markup, and gradient <defs> instead of sharing one wrapper."*
* **Impact & Usability Risk:** Inconsistent styling, risk of design drift, and massive code duplication for boilerplate Recharts components and empty states.

### 2. Root Cause Analysis
* **Code Duplication:** Developers were copying and pasting identical inline `contentStyle` dictionaries for `<Tooltip>`, identical `<defs>` SVGs, and identical `if (!data) return <div...>` blocks.

### 3. Technical Remediation Applied
* Created a central `ChartWrapper.jsx` component exposing `<ChartWrapper>`, `<ChartTooltip>`, and `<ChartDefs>`.
* Wrapped 5 charting widgets with `<ChartWrapper>` to centrally handle `data` null-checking and empty state rendering.
* Swapped boilerplate `<Tooltip>` with `<ChartTooltip>` and unified SVG gradients inside `<ChartDefs>`.

### 4. Verification & Automated Test Results
* Executed `npm run build`: Zero errors, client and SSR bundles built successfully.

---

## Issue #13 [Backend]: Secure OTP Key Fallback

**Component Tier:** Backend (FastAPI / Employees API)
**Severity:** HIGH (Cryptographic Insecurity)
**Status:** RESOLVED & VERIFIED
**Date:** August 24, 2026
**Target Component:** `app/api/employees.py`
**Source Files:** `app/api/employees.py`

### 1. Issue Statement & Audit Remark
* **Audit Finding:** *"app/api/employees.py:907,944 — OTP_SECRET_KEY falls back to a hardcoded constant used as the HMAC key gating email-change OTPs."*
* **Impact & Usability Risk:** If the environment does not explicitly export an OTP secret, the system silently uses the public fallback. An attacker could compute valid HMACs for arbitrary OTPs, completely bypassing the email verification security check.

### 2. Root Cause Analysis
* **Code Defect:** The `os.getenv` call utilized a default fallback string (`"fallback_dev_secret"`) which guaranteed execution even without a secure cryptographic key.

### 3. Technical Remediation Applied
* Removed the insecure default from `os.getenv("OTP_SECRET_KEY")`.
* Added a rigid pre-flight validation to explicitly raise a `500 Server Error` if the secret key is unset, refusing to hash any data securely.

### 4. Verification & Automated Test Results
* Verified that triggering an email change without the environment variable correctly aborts execution and throws a 500 status.

---

## Issue #14 [Frontend]: Coordinated Save Mutations

**Component Tier:** Frontend (React / Vite)
**Severity:** MEDIUM (Usability / Silent Errors)
**Status:** RESOLVED & VERIFIED
**Date:** August 24, 2026
**Target Component:** `src/pages/employee/EmployeeDashboard.jsx`
**Source Files:** `EmployeeDashboard.jsx`

### 1. Issue Statement & Audit Remark
* **Audit Finding:** *"EmployeeDashboard.jsx:666–685 — handleSave closes the edit modal as soon as the profile save succeeds, even if a concurrent email-change mutation is still pending or later fails; the user never sees the error."*
* **Impact & Usability Risk:** The user is dumped back to the dashboard assuming their email change succeeded, but it may have failed in the background without displaying the associated error message.

### 2. Root Cause Analysis
* **Code Defect:** The `saveMutation`'s `onSuccess` handler explicitly executed `setIsEditing(false)` blindly. The email mutation was missing from the modal's save pipeline, meaning email state changes were never dispatched or awaited.

### 3. Technical Remediation Applied
* Disconnected modal closure (`setIsEditing(false)`) from `saveMutation.onSuccess`.
* Integrated `requestEmailChangeMutation` directly into the dashboard.
* Refactored `handleSave` to execute both mutations concurrently via `Promise.all()`. The modal now awaits both responses, rendering `emailError` or `saveError` inline if any network failure occurs, and only closing on unanimous success.

### 4. Verification & Automated Test Results
* Executed `npm run build`: Zero errors, client and SSR bundles built successfully.

