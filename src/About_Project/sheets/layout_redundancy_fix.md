# Fix: Duplicated Admin / Employee Layout Shell

**Files:** `AdminLayout.jsx`, `EmployeeLayout.jsx`
**Sidebars:** Unchanged in this pass
**Functions:** Layout shell — collapse, resize, peek, mobile drawer, header, outlet
**Severity:** Medium — Redundancy
**Excel Task No.:** 39
**Resolved Date:** 24-08-2026

---

## Bug

`AdminLayout` and `EmployeeLayout` each contained approximately 150 lines of duplicated layout-shell code covering:

* Sidebar collapse / expand.
* Drag-to-resize and click-to-collapse.
* Collapsed edge-peek panel.
* Mobile off-canvas drawer.
* Header with menu toggle.
* Breadcrumbs.
* `PortalSwitcher`.
* `NotificationBell`.
* Main content panel.
* `<Outlet />`.
* `ChatWidget`.

The same structure was copy-pasted across both layouts.

Over time, some intentional behaviour had already **drifted** between the two implementations:

* **Admin:** Removes the dark-mode class and clears all `localStorage` on logout.
* **Employee:** Does not remove the dark-mode class and selectively removes only specific `localStorage` keys.

`AdminSidebar` and `EmployeeSidebar` also share common chrome patterns but intentionally differ in navigation, themes, and bottom actions. These differences remain portal-specific and were therefore not consolidated in this change.

---

## Impact

* **Double maintenance:** Any shell-level fix, such as resize, peek, or header changes, had to be implemented in two files.
* **Drift risk:** Existing differences in logout and light-mode handling demonstrated that the duplicated implementations could silently diverge further.
* **Harder code reviews:** Large near-duplicate layout components made it difficult to distinguish intentional portal differences from accidental inconsistencies.
* **Higher maintenance cost:** Common layout behaviour had to be understood and maintained separately for each portal.

---

## Solution

### 1. Create a Shared Shell Component

Create:

```text
components/layout/AppShellLayout.jsx
```

`AppShellLayout` owns only the duplicated layout-shell behaviour.

Portal-specific differences are provided through props.

| Prop                                   | Purpose                                                          |
| -------------------------------------- | ---------------------------------------------------------------- |
| `storageKeyPrefix`                     | `"admin"` / `"employee"` for portal-specific `localStorage` keys |
| `SidebarComponent`                     | `AdminSidebar` or `EmployeeSidebar`                              |
| `sidebarProps`                         | Portal-specific data such as user, logout handler, counts, etc.  |
| `breadcrumbTrail` / `homeHref`         | Portal-specific breadcrumb configuration                         |
| `normalizeLightMode`                   | Admin only (`true`)                                              |
| `chatRole`                             | Admin uses `"admin"`; Employee omits the prop as before          |
| `outerBgClass` / `contentWrapperClass` | Preserves the existing visual layout for each portal             |

The shared component owns the common mechanics while remaining configurable for intentional portal differences.

---

### 2. Make Portal Layouts Thin

#### `AdminLayout`

`AdminLayout` continues to own:

* Breadcrumb resolution.
* Signup request counts.
* Admin-specific data and queries.
* Admin logout behaviour:

  * `localStorage.clear()`
  * Redirect to `/login/admin`.

It then renders `AppShellLayout` with the appropriate Admin-specific props.

#### `EmployeeLayout`

`EmployeeLayout` continues to own:

* Auth/me synchronization.
* PM vs Employee breadcrumb resolution.
* Employee-specific data.
* Employee logout behaviour:

  * Remove token.
  * Remove user.
  * Remove role.
  * Redirect to `/login/pm` or `/login/employee`.

It then renders `AppShellLayout` with the appropriate Employee-specific props.

---

### 3. Keep Sidebars Portal-Specific

No changes are made to:

* `AdminSidebar`
* `EmployeeSidebar`

Their navigation data, themes, bottom actions, badges, profile controls, and settings links remain in their respective components.

This keeps portal-specific sidebar behaviour separate from the shared layout-shell mechanics.

---

## Resolution

| Before                                                     | After                                                            |
| ---------------------------------------------------------- | ---------------------------------------------------------------- |
| ~150 lines of shell duplicated in two layouts              | One shared `AppShellLayout`                                      |
| Shell fixes required changes in two files                  | Shell fixes are made in one place                                |
| Portal-specific logout and dark-mode behaviour could drift | Existing differences are preserved through props                 |
| Shell and portal-specific concerns mixed together          | Common shell extracted while portal logic remains in each layout |
| Sidebars contained portal-specific behaviour               | Sidebars remain unchanged and portal-specific                    |

**UI and existing portal behaviour remain unchanged. Only the duplicated layout shell has been consolidated.**

---

## Behaviour Preserved

### Common Shell

* Sidebar collapse / expand.
* Drag-to-resize.
* Click-to-collapse.
* Collapsed edge-peek behaviour.
* Mobile off-canvas drawer.
* Portal-specific `localStorage` keys.
* Header menu toggle.
* Breadcrumb rendering.
* `PortalSwitcher`.
* `NotificationBell`.
* Main content panel.
* `<Outlet />`.
* `ChatWidget`.

### Admin

* Removes the dark-mode class during logout.
* Uses `localStorage.clear()` on logout.
* Redirects to `/login/admin`.
* Uses `ChatWidget` with `role="admin"`.
* Preserves Admin-specific background and content-wrapper classes.
* Preserves Admin breadcrumb resolution and detail-title injection.
* Preserves signup request counts.

### Employee

* Does not perform Admin's dark-mode normalization.
* Removes only token, user, and role from `localStorage`.
* Redirects to `/login/pm` or `/login/employee`.
* Uses `ChatWidget` without a `role` prop.
* Preserves Employee-specific background and content-wrapper classes.
* Preserves auth-me synchronization.
* Preserves PM vs Employee breadcrumb resolution.

### Portal-Specific UI

* Sidebar navigation remains unchanged.
* Sidebar badges remain unchanged.
* Profile links remain unchanged.
* Settings links remain unchanged.
* Admin and Employee sidebar themes remain unchanged.
* Bottom sidebar actions remain unchanged.

---

## Summary

The duplicated Admin/Employee layout shell was extracted into the shared `AppShellLayout` component.

`AdminLayout` and `EmployeeLayout` now remain focused on their portal-specific responsibilities — such as authentication, breadcrumbs, data queries, and logout behaviour — while the shared component handles common shell functionality.

Existing Admin vs Employee differences are preserved through props, ensuring **no intentional UI or behavioural changes**.

The fix removes layout redundancy, reduces future maintenance effort, and prevents further shell-level implementation drift.
