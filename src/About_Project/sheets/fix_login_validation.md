# Fix: Inconsistent Login Form Validation Across Portals

**Files:** `AdminLogin.jsx`, `PMLogin.jsx`, `EmployeeLogin.jsx`
**Helper:** `utils/loginValidation.js`
**Severity:** Low — Inconsistency
**Excel Task No.:** 101
**Resolved Date:** 24-08-2026

---

## Bug

The same login flow — **email + password → `authApi.login`** — used three different levels of client-side validation across the portals.

| Portal   | Validation                                                                       |
| -------- | -------------------------------------------------------------------------------- |
| Employee | Per-field validation: email required, email format validation, password required |
| Admin    | Only checks that both fields are non-empty                                       |
| PM       | Only checks that both fields are non-empty                                       |

The Admin and PM login forms did not validate email format and displayed a generic **"Please fill in all fields"** message.

---

## Impact

* **Inconsistent UX:** Validation behaviour differed depending on which portal the user accessed.
* **Weak client-side validation:** Admin and PM portals could submit invalid email addresses to the authentication API.
* **Validation drift risk:** The same login validation rules were implemented separately across three components.
* **Inconsistent error messages:** Employee provided specific validation errors, while Admin and PM displayed only a generic required-fields message.

---

## Solution

### 1. Extract Shared Login Validation

Create a shared utility:

```javascript id="3z0x8k"
validateLoginForm
```

in:

```text id="h0u7st"
utils/loginValidation.js
```

Also provide:

```javascript id="f7qj3m"
firstLoginError
```

for portals that use a single error banner.

### 2. Standardize Validation Rules

All three portals now follow the same validation order:

1. Email is required.
2. Email format is validated.
3. Password is required.

The validation rules match the existing Employee login behaviour.

### 3. Update Login Pages

Wire the shared validation helper into:

* `EmployeeLogin.jsx`
* `AdminLogin.jsx`
* `PMLogin.jsx`

The existing UI presentation is preserved:

* **Employee:** Continues showing individual under-field validation errors.
* **Admin:** Continues using a single error banner, displaying the first validation error.
* **PM:** Continues using a single error banner, displaying the first validation error.

---

## Resolution

| Before                                         | After                                                     |
| ---------------------------------------------- | --------------------------------------------------------- |
| Three different validation implementations     | One shared `validateLoginForm` validator                  |
| Admin/PM did not validate email format         | Admin/PM use the same email format validation as Employee |
| Generic "Please fill in all fields" message    | Specific email, format, or password validation messages   |
| Validation rules maintained independently      | Validation rules maintained in `utils/loginValidation.js` |
| Employee had stronger validation than Admin/PM | All portals use the same validation rules                 |

**The authentication API and server-side behaviour remain unchanged. This change only standardizes client-side form validation.**

---

## Behaviour Preserved

* Successful login continues to set the authenticated user and role.
* Users continue to be redirected according to the respective portal.
* Server-side authentication errors continue to be handled through `parseAuthError`.
* Employee under-field validation errors continue to work.
* Employee invalid fields continue to display the existing red-border styling.
* Admin continues to display validation errors through a single error banner.
* PM continues to display validation errors through a single error banner.
* Portal switcher links remain unchanged.
* Portal branding and overall login UI remain unchanged.

---

## Summary

Login validation was centralized into `utils/loginValidation.js` so that Admin, PM, and Employee portals now follow the same validation rules.

The change eliminates inconsistent client-side validation while preserving each portal's existing error-display style, authentication flow, redirects, branding, and server-side behaviour.
