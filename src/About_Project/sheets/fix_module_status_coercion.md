# Fix: Silent Module Status Coercion to Published

**File:** `AdminModulesBuilder.jsx`
**Location:** Load path, ~lines 34–36 (status mapping on edit)
**Severity:** Low — Bug
**Excel Task No.:** 105
**Resolved Date:** 24-08-2026

---

## Bug

When loading a module for editing, the status was mapped using:

```javascript
data.status?.toLowerCase() === "draft" ? "draft" : "published"
```

This logic treated **any value other than `"draft"`** (case-insensitive) as `"published"`.

As a result, unknown, empty, invalid, or future backend statuses were silently converted to `"published"`.

---

## Impact

* **Unexpected backend statuses were hidden:** Administrators could not see that the API returned an unsupported status.
* **Risk of accidental publishing:** Editing and saving a module could overwrite an unknown/non-published status as `PUBLISHED`.
* **Data/API issues were harder to detect:** Invalid or unexpected status values were silently normalized instead of surfaced.
* **Unsafe default behaviour:** An unknown status was effectively treated as an affirmative publish state.

---

## Solution

### 1. Accept Only Known Statuses

Only the following values are treated as valid:

* `"draft"`
* `"published"`

Status comparison remains case-insensitive.

### 2. Safely Handle Unknown Values

For any other value, default the UI state to:

```javascript
"draft"
```

Draft is the safer fallback because it prevents an unexpected status from being implicitly promoted to Published.

### 3. Surface Unexpected Statuses

When an unknown or invalid status is encountered:

* Log a warning to the console.
* Display a toast notification to make the anomaly visible to the administrator.

This ensures unexpected backend data is not silently ignored.

### 4. Preserve Save Behaviour

The save path remains controlled exclusively by the UI's Draft/Published toggle.

The API continues receiving:

```text
DRAFT
```

or

```text
PUBLISHED
```

as before.

---

## Resolution

| Before                                   | After                                          |
| ---------------------------------------- | ---------------------------------------------- |
| Unknown status → silently `"published"`  | Unknown status → `"draft"` with warning/toast  |
| Risk of accidental publish on save       | User must explicitly select Published          |
| Unexpected API values hidden             | Unexpected values surfaced in console and UI   |
| Any non-draft value treated as Published | Only known Draft/Published values are accepted |

**The fix prevents silent status promotion while preserving the existing Draft/Published workflow.**

---

## Behaviour Preserved

* `"draft"` loads as **Draft**.
* `"DRAFT"` loads as **Draft**.
* `"published"` loads as **Published**.
* `"PUBLISHED"` loads as **Published**.
* Status toggle continues to support only **Draft** and **Published**.
* Create flow default remains unchanged.
* Save payload continues to use uppercase `DRAFT` / `PUBLISHED` status values.
* Existing save behaviour for valid statuses remains unchanged.

---

## Summary

The module status mapping was updated to avoid silently converting unknown backend values into `Published`.

Only recognized `draft` and `published` statuses are accepted. Unexpected values now safely default to Draft and are surfaced through both console warnings and a toast, ensuring that administrators are aware of potential API or data inconsistencies before saving.
