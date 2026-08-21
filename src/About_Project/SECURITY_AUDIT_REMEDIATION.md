# Security Audit Remediation & Access Control Log

This document serves as the persistent audit tracking log for security findings, authorization fixes, and privacy remediations implemented across the Autonex codebase. Fixes and verification records are appended sequentially to maintain a complete history of changes.

---

## Issue #1: Missing Access Control & Privacy Redaction in Leave/WFH Calendar

| Metadata | Details |
| :--- | :--- |
| **Application** | Autonex Backend |
| **Severity** | **HIGH (Data Exposure / Privacy Breach)** |
| **Target Endpoint** | `GET /api/leaves/calendar` |
| **Status** | **RESOLVED & VERIFIED** |
| **Source Files** | [`app/api/leaves.py`](file:///Users/abhijitk/Documents/project-Management-autonex-backend/app/api/leaves.py) |
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
* **Test Suite:** [`tests/test_project_scope.py`](file:///Users/abhijitk/Documents/project-Management-autonex-backend/tests/test_project_scope.py)

| Test Case | Condition Tested | Result |
| :--- | :--- | :--- |
| `test_calendar_unauthenticated` | Requests without authorization header return `401` | **PASS (HTTP 401)** |
| `test_calendar_employee_privacy_redaction` | Employee sees own reason; peer reasons are redacted | **PASS (Redacted)** |
| `test_calendar_pm_scoped_access` | PM sees reasons for managed staff; unmanaged staff redacted | **PASS (Scoped)** |
| `test_calendar_admin_full_access` | Admin has full company-wide unredacted access | **PASS (Full Access)** |

---

## Issue #2: Unscoped Read & Write Permissions on Employee Notes (HR History)

| Metadata | Details |
| :--- | :--- |
| **Application** | Autonex Fullstack (Backend & Frontend) |
| **Severity** | **HIGH (Authorization / Privacy)** |
| **Target Components** | `GET/POST/PUT/DELETE /api/employee-notes/*`, [`EmployeeDashboard.jsx`](file:///Users/abhijitk/Documents/project-Management-autonex-frontend/src/pages/employee/EmployeeDashboard.jsx) |
| **Status** | **RESOLVED & VERIFIED** |
| **Source Files** | [`app/api/employee_notes.py`](file:///Users/abhijitk/Documents/project-Management-autonex-backend/app/api/employee_notes.py), [`EmployeeDashboard.jsx`](file:///Users/abhijitk/Documents/project-Management-autonex-frontend/src/pages/employee/EmployeeDashboard.jsx), [`tests/test_employee_notes_access_control.py`](file:///Users/abhijitk/Documents/project-Management-autonex-backend/tests/test_employee_notes_access_control.py) |
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

#### A. Backend Changes ([`app/api/employee_notes.py`](file:///Users/abhijitk/Documents/project-Management-autonex-backend/app/api/employee_notes.py))
* Replaced `has_team_read` with `project_scope.can_manage_employee(db, current_user, employee_id)` in `_ensure_note_read_access_for_employee`, `list_employee_notes`, `list_notes_by_employee`, and `get_employee_note`.
* Enforced `project_scope.require_employee_scope(db, current_user, employee_id, action=...)` across all mutating endpoints:
  * `create_employee_note` (`POST /api/employee-notes`)
  * `update_employee_note` (`PUT /api/employee-notes/{note_id}`)
  * `resolve_employee_note` (`POST /api/employee-notes/{note_id}/resolve`)
  * `delete_employee_note` (`DELETE /api/employee-notes/{note_id}`)

#### B. Frontend Changes ([`src/pages/employee/EmployeeDashboard.jsx`](file:///Users/abhijitk/Documents/project-Management-autonex-frontend/src/pages/employee/EmployeeDashboard.jsx))
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
* **Test Suite:** [`tests/test_employee_notes_access_control.py`](file:///Users/abhijitk/Documents/project-Management-autonex-backend/tests/test_employee_notes_access_control.py)

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
