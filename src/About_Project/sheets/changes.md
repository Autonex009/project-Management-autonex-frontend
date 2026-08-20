**Date:** 20-08-2026
**Name:** Dhanashree S.
 **Excel Task No.:** 3, 5
------------------------------

# Side Projects API — Security Fix (IDOR)

**File:** `app/api/side_projects_api.py`  
**Severity:** Critical — Insecure Direct Object Reference (IDOR)  
**Status:** Resolved
**Excel Task No.:** 3
**Date:** 20-08-2026
**Name:** Dhanashree S. 
---

## What Was the Issue?

Any authenticated user could **create, update, or delete** any other employee’s side project.  
No ownership or role-based scope checks existed on write endpoints.

### Possible Impact
- Unauthorized modification/deletion of side projects
- Data integrity risk
- Privacy violation (employees seeing/changing others’ personal projects)
- Audit trail pollution / compliance exposure

---

## Why Was It Changed?

To enforce least-privilege access and prevent IDOR by restricting write operations and list visibility according to role and project management scope.

---

## What Changed?

| Area | Before | After |
|------|--------|-------|
| **Create / Update / Delete** | No access check | Role + scope validation via `_require_side_project_write_access` |
| **List** | Unrestricted (or weakly filtered) | Scoped by role |
| **New helpers** | — | `_has_full_access`, `_managed_employee_ids`, `_require_side_project_write_access` |

---

## Access Rules Implemented

### Write Access (Create / Update / Delete)
| Role | Allowed Scope |
|------|---------------|
| `admin`, `hr` | Any side project |
| `pm`, `team_lead` | Only side projects of employees allocated on projects they manage/lead |
| `employee` / others | **Denied** |

### List Access
| Role | Allowed Scope |
|------|---------------|
| `admin`, `hr` | All (optional `employee_id` filter) |
| `pm`, `team_lead` | Side projects of employees on managed projects |
| `employee` / others | Own side projects only |

---

## Key Implementation Details

- **`_managed_employee_ids`**  
  Resolves employees currently allocated on projects the caller manages/leads (reuses existing `project_scope` logic).

- **`_require_side_project_write_access`**  
  Central guard used by create, update, and delete. Raises `403` when the caller lacks permission for the target employee.

- Employees can no longer create or modify side projects (only view their own).

---

## Summary

The previous unrestricted write surface has been closed.  
Access is now role-scoped and aligned with existing project-management boundaries, eliminating the IDOR vulnerability.

==================================================================================================================================
##################################################################################################################################
==================================================================================================================================

# Performance Reviews API — Security Fix (Missing Scope Check)

**File:** `app/api/performance_reviews.py`  
**Severity:** Critical — Missing authorization / over-privileged access  
**Status:** Resolved
**Excel Task No.:** 5

---

## What Was the Issue?

Performance reviews were readable and editable **company-wide**.  
The router lacked the `project_scope` checks present in sibling APIs, so any PM could list, view, update, or delete reviews for any employee — not just their team.

### Possible Impact
- Cross-team exposure of sensitive performance data
- Unauthorized edit/delete of reviews outside managed scope
- Privacy & compliance risk
- Inconsistent authorization vs. rest of the app

---

## Why Was It Changed?

To align this router with the existing `project_scope` pattern used across sibling endpoints and enforce least-privilege access for PMs.

---

## What Changed?

| Endpoint | Before | After |
|----------|--------|-------|
| **List** | Returned all reviews (optional filters only) | Non-full-access users filtered to manageable employees only |
| **Get** | No scope check | `project_scope.require_employee_scope` |
| **Create** | No scope check | `project_scope.require_employee_scope` on target employee |
| **Update** | No scope check | `project_scope.require_employee_scope` |
| **Delete** | No scope check | `project_scope.require_employee_scope` |
| **reviewer_id** | Could be set from body | Forced from session (`current_user.id`) |

---

## Access Rules Implemented

| Role | Allowed Scope |
|------|---------------|
| Admin / HR (full access) | All reviews |
| PM | Only reviews for employees they can manage (`project_scope.can_manage_employee`) |
| Others | Blocked at router level (`require_role("admin", "pm")`) |

---

## Key Implementation Details

- **List** — For non-full-access users, reviews are post-filtered using a cache of `project_scope.can_manage_employee` results, then paginated.
- **Get / Create / Update / Delete** — All call `project_scope.require_employee_scope(...)` against the target employee; raises 403 when out of scope.
- **reviewer_id** — Always set from the authenticated user; no longer accepted from the request body.

---

## Summary

Missing scope checks have been added on every endpoint.  
PMs are now restricted to reviews of employees they manage; admins/HR retain full access. Authorization is consistent with the rest of the application.